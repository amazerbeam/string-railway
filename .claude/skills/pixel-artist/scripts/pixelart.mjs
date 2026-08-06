// Dependency-free pixel-art renderer: character-grid sprites -> PNG / SVG / sheet.
// Uses only Node built-ins (node:zlib, node:fs, node:path). No third-party packages,
// so no dependency approval is needed and nothing here drifts with a package major.
// Written against Node 24 (see package.json "engines"); the APIs used are long-stable.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ---------------------------------------------------------------- palette

/** Parse "#rgb" / "#rrggbb" / "#rrggbbaa" into [r,g,b,a]. */
export function parseHex(hex) {
  const s = hex.trim().replace(/^#/, '');
  const full =
    s.length === 3
      ? s
          .split('')
          .map((c) => c + c)
          .join('')
      : s;
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(full)) {
    throw new Error(`Bad hex colour: ${hex}`);
  }
  const n = parseInt(full.slice(0, 6), 16);
  const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) : 255;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

/**
 * A palette maps single grid characters to colours.
 * `.` and ` ` are always transparent and cannot be reassigned.
 * @param {Record<string,string>} map e.g. { K: '#1a1c2c', S: '#f4b41b' }
 */
export function palette(map) {
  const out = new Map([
    ['.', [0, 0, 0, 0]],
    [' ', [0, 0, 0, 0]],
  ]);
  for (const [key, hex] of Object.entries(map)) {
    if (key.length !== 1) throw new Error(`Palette key must be 1 char: "${key}"`);
    if (key === '.' || key === ' ') throw new Error(`"${key}" is reserved for transparent`);
    out.set(key, parseHex(hex));
  }
  return out;
}

// ---------------------------------------------------------------- sprite

/**
 * A sprite is an array of equal-length strings, one character per pixel.
 * Every character must exist in the palette — an unknown key is an error, not
 * a silent transparent pixel, because a typo would otherwise punch a hole.
 */
export function sprite(rows, pal, name = 'sprite') {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`${name}: no rows`);
  const w = rows[0].length;
  rows.forEach((row, y) => {
    if (row.length !== w) {
      throw new Error(`${name}: row ${y} is ${row.length} wide, expected ${w}`);
    }
    for (const ch of row) {
      if (!pal.has(ch)) throw new Error(`${name}: row ${y} uses "${ch}", not in palette`);
    }
  });
  return { name, rows, pal, width: w, height: rows.length };
}

/** Mirror horizontally — how a left-facing row is made from a right-facing one. */
export function flipX(spr, name = `${spr.name}-flipX`) {
  return sprite(
    spr.rows.map((r) => [...r].reverse().join('')),
    spr.pal,
    name,
  );
}

/** Recolour by remapping palette keys, e.g. { R: 'B' } for a team-colour variant. */
export function recolour(spr, keyMap, name = `${spr.name}-recolour`) {
  return sprite(
    spr.rows.map((r) => [...r].map((c) => keyMap[c] ?? c).join('')),
    spr.pal,
    name,
  );
}

// ---------------------------------------------------------------- raster

/** Flat RGBA buffer, 4 bytes per pixel, row-major. */
function raster(width, height) {
  return { width, height, data: new Uint8Array(width * height * 4) };
}

function blit(target, spr, ox, oy) {
  for (let y = 0; y < spr.height; y++) {
    const row = spr.rows[y];
    for (let x = 0; x < spr.width; x++) {
      const [r, g, b, a] = spr.pal.get(row[x]);
      if (a === 0) continue; // transparent source never overwrites
      const px = ox + x;
      const py = oy + y;
      if (px < 0 || py < 0 || px >= target.width || py >= target.height) continue;
      const i = (py * target.width + px) * 4;
      target.data[i] = r;
      target.data[i + 1] = g;
      target.data[i + 2] = b;
      target.data[i + 3] = a;
    }
  }
}

// ---------------------------------------------------------------- PNG

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** Encode a raster as an 8-bit RGBA PNG. Filter type 0 (None) on every scanline. */
export function encodePng({ width, height, data }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: truecolour + alpha
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  const stride = width * 4;
  const rawLen = height * (stride + 1);
  const raw = Buffer.alloc(rawLen);
  for (let y = 0; y < height; y++) {
    const at = y * (stride + 1);
    raw[at] = 0; // filter: None — keeps flat colour areas compressing well
    Buffer.from(data.buffer, data.byteOffset + y * stride, stride).copy(raw, at + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function write(path, buf) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
}

/** Write one sprite as its own PNG at native resolution. */
export function writeSpritePng(spr, path) {
  const r = raster(spr.width, spr.height);
  blit(r, spr, 0, 0);
  write(path, encodePng(r));
  return { path, width: spr.width, height: spr.height };
}

// ---------------------------------------------------------------- sheet

/**
 * Pack frames into a uniform grid — every cell identical, which stays trivial to
 * slice and to hand-edit. `pad` transparent pixels sit between cells so no
 * neighbouring pixel can bleed in when the sheet is filtered or upscaled.
 *
 * Each frame keeps the cell's top-left as its origin, so every frame of one
 * animation shares a pivot and the sprite cannot hop between frames.
 *
 * @param {{name:string, frames:object[]}[]} rows one row per animation/direction
 */
export function writeSheet(rows, { cell, pad = 2, path, jsonPath }) {
  const [cw, ch] = Array.isArray(cell) ? cell : [cell, cell];
  const cols = Math.max(...rows.map((r) => r.frames.length));
  const width = cols * cw + (cols + 1) * pad;
  const height = rows.length * ch + (rows.length + 1) * pad;
  const sheet = raster(width, height);

  const frames = {};
  rows.forEach((row, ry) => {
    row.frames.forEach((frame, cx) => {
      if (frame.width > cw || frame.height > ch) {
        throw new Error(
          `${frame.name}: ${frame.width}x${frame.height} exceeds cell ${cw}x${ch}`,
        );
      }
      const x = pad + cx * (cw + pad);
      const y = pad + ry * (ch + pad);
      // Bottom-align inside the cell: a character's feet are its contact point,
      // so aligning bottoms keeps it planted when frame heights differ.
      blit(sheet, frame, x, y + (ch - frame.height));
      frames[`${row.name}_${cx}`] = { x, y, w: cw, h: ch };
    });
  });

  write(path, encodePng(sheet));

  const meta = {
    image: path.split(/[\\/]/).pop(),
    size: { w: width, h: height },
    cell: { w: cw, h: ch },
    pad,
    tags: Object.fromEntries(rows.map((r) => [r.name, { frames: r.frames.length }])),
    frames,
  };
  if (jsonPath) write(jsonPath, Buffer.from(JSON.stringify(meta, null, 2) + '\n'));
  return meta;
}

// ---------------------------------------------------------------- SVG proof

/**
 * Emit the sprite as an SVG of one <rect> per horizontal run of same-coloured
 * pixels. Run-merging keeps the file small and makes clusters visible in the
 * markup. Use this for a mockup or a review page — PNG is the shippable asset.
 */
export function writeSpriteSvg(spr, path, { scale = 8 } = {}) {
  const parts = [];
  for (let y = 0; y < spr.height; y++) {
    const row = spr.rows[y];
    let x = 0;
    while (x < spr.width) {
      const ch = row[x];
      let run = 1;
      while (x + run < spr.width && row[x + run] === ch) run++;
      const [r, g, b, a] = spr.pal.get(ch);
      if (a !== 0) {
        const fill = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        const op = a === 255 ? '' : ` fill-opacity="${(a / 255).toFixed(3)}"`;
        parts.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${fill}"${op}/>`);
      }
      x += run;
    }
  }
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${spr.width * scale}" height="${spr.height * scale}"`,
    ` viewBox="0 0 ${spr.width} ${spr.height}" shape-rendering="crispEdges">`,
    parts.join(''),
    `</svg>`,
  ].join('');
  write(path, Buffer.from(svg + '\n'));
  return { path, rects: parts.length };
}
