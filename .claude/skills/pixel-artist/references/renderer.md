# The renderer

**Scope.** The API below is **structural and owned by this skill** — `scripts/pixelart.mjs` lives in this folder, so its signatures change only when this skill changes them. Keep this file in step with that module.

**Owned elsewhere:** Node's own `node:zlib` / `node:fs` behaviour, and the PNG specification (frozen since 1996). Neither is versioned in a way that drifts, so **no live documentation lookup belongs in this skill's workflow.** The module is written against the Node version pinned in `package.json` `engines` (24.x at time of writing) and uses only long-stable built-ins. Do not add a dependency to draw, encode, or pack an image — approving one is a developer-owned pause condition.

---

## Why it is built this way

An 8-bit RGBA PNG is a signature, an `IHDR`, one deflated `IDAT` of filter-prefixed scanlines, and an `IEND`. That is about 60 lines of code against `node:zlib`, which is cheaper than a dependency and immune to a package major bumping under the project. Filter type 0 (None) is used on every scanline because pixel art is large flat colour areas, which deflate well without predictive filtering.

## Import

Definition files live in `art/` and import by **relative path**:

```js
import { palette, sprite, flipX, writeSpritePng, writeSheet }
  from '../.claude/skills/pixel-artist/scripts/pixelart.mjs';
```

An absolute Windows path throws `ERR_UNSUPPORTED_ESM_URL_SCHEME`. A script outside the repo needs a URL: `file:///E:/Game%20Dev/StringsAndStations/…`.

## API

### `palette(map) -> Map`

Maps single characters to `[r,g,b,a]`. Accepts `#rgb`, `#rrggbb`, `#rrggbbaa`.

```js
const pal = palette({ K: '#1a1c2c', S: '#ffcd75', s: '#ef7d57', R: '#b13e53' });
```

`.` and a space are pre-bound to transparent and cannot be reassigned — reassigning one throws. Keys are case-sensitive, which is the convention that makes a ramp readable: **uppercase for the lit step, lowercase for its shadow** (`R`/`r`, `S`/`s`).

A bad hex throws rather than silently rendering black.

### `sprite(rows, pal, name?) -> Sprite`

`rows` is an array of equal-length strings, one character per pixel. Throws on a ragged row (reporting the row index and both widths) and on any character absent from the palette. That second check is deliberate: a typo would otherwise punch an invisible transparent hole that survives review.

Returns `{ name, rows, pal, width, height }`.

### `flipX(spr, name?) -> Sprite`

Mirrors horizontally. This is how a left-facing row is made from a right-facing one — never redraw a mirror.

### `recolour(spr, keyMap, name?) -> Sprite`

Remaps palette keys, e.g. `recolour(unit, { R: 'B', r: 'b' }, 'unit-blue')` for a team colour. Keys absent from the map pass through. Prefer this over a second definition for any variant.

### `writeSpritePng(spr, path) -> { path, width, height }`

One sprite, one PNG, at native resolution. Creates parent directories.

### `writeSpriteSvg(spr, path, { scale = 8 }) -> { path, rects }`

Emits one `<rect>` per horizontal run of same-coloured pixels, with `shape-rendering="crispEdges"` and a `viewBox` at native size scaled up by `scale`. Run-merging keeps the file small and makes clusters visible in the markup.

This is the **review proof**, not the shippable asset — it opens in a browser and in a `mockup.html`, and it scales without a filter. PNG is what the game loads.

### `writeSheet(rows, { cell, pad = 2, path, jsonPath }) -> meta`

```js
writeSheet(
  [
    { name: 'idle_down', frames: [d0, d1] },
    { name: 'walk_down', frames: [w0, w1, w2, w3] },
    { name: 'walk_side', frames: [s0, s1, s2, s3] },
  ],
  { cell: [24, 24], pad: 2, path: 'public/art/unit.png', jsonPath: 'public/art/unit.json' },
);
```

- `cell` is `size` or `[w, h]`. A frame larger than the cell throws — it is not silently cropped.
- Uniform grid: one row per animation or direction, `pad` transparent pixels between every cell and around the edge.
- **Frames are bottom-aligned within the cell.** A character's feet are its contact point, so bottom-alignment keeps it planted when frame heights differ. This is the pivot guarantee — every frame of one animation shares an origin, so the sprite cannot hop.
- Sheet width is `cols * cw + (cols + 1) * pad`; height follows the same shape.

The `meta` written to `jsonPath`:

```json
{
  "image": "unit.png",
  "size": { "w": 106, "h": 80 },
  "cell": { "w": 24, "h": 24 },
  "pad": 2,
  "tags": { "walk_down": { "frames": 4 } },
  "frames": { "walk_down_0": { "x": 2, "y": 28, "w": 24, "h": 24 } }
}
```

Ship it with the sheet. Without it the consumer hardcodes offsets and breaks on the next edit.

## Definition file shape

```js
// art/vanguard-unit.mjs — projection: 2:1 dimetric · base res: 480x270 · light: top-left
import { palette, sprite, flipX, writeSheet, writeSpriteSvg }
  from '../.claude/skills/pixel-artist/scripts/pixelart.mjs';

const pal = palette({ /* … or import from ./palette.mjs */ });

const idle0 = sprite([ /* … */ ], pal, 'idle0');
const idle1 = sprite([ /* … */ ], pal, 'idle1');

const meta = writeSheet(
  [{ name: 'idle', frames: [idle0, idle1] }],
  { cell: 24, path: 'public/art/vanguard-unit.png', jsonPath: 'public/art/vanguard-unit.json' },
);
writeSpriteSvg(idle0, 'public/art/vanguard-unit-proof.svg', { scale: 12 });
console.log(meta.size, Object.keys(meta.frames));
```

Run from the repo root — the output paths above are relative to the working directory:

```
node art\vanguard-unit.mjs
```

Header comment carries the art-bible values the file assumes. One line, stated once per file.

## Verifying output

```powershell
node -e "const b=require('fs').readFileSync('public/art/unit.png');console.log(b.subarray(1,4).toString(), b.readUInt32BE(16)+'x'+b.readUInt32BE(20), 'depth', b[24], 'colour', b[25])"
```

Expect `PNG <w>x<h> depth 8 colour 6`. Then **read the PNG back and look at it** — a valid encode is not a correct sprite.

## Known limits

- 8-bit RGBA only. No indexed-colour output, no `tRNS`, no `pHYs`. Fine for a Vite-served asset; if an indexed PNG is ever needed, that is a change to the module, not a dependency.
- No alpha blending. A transparent source pixel skips rather than compositing, so overlapping semi-transparent sprites in one sheet will not blend. Sprites are opaque in practice.
- No trimming or rect-packing. Uniform grid only, deliberately — it stays trivial to slice and to hand-edit, and it sidesteps the trimmed-atlas offset bugs that make animations jitter.
- No animation timing. Frame durations belong to the consumer, not the sheet.
