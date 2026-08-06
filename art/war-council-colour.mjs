// art/war-council-colour.mjs — The Colour: what replaces a War Council card.
// projection: orthographic side-on · base res: 480x270 · light: top-left
// palette + art bible: ./palette.mjs
//
// Concept for .docs/design/reskin.md. That document settles the piece — "a
// regimental banner, fabric coloured per arm, icon and value on the fabric
// face" — and this file is that decision drawn. Nothing here proposes a rule.
//
// The seven jobs a physical card does, and where each one lands on the banner:
//   suit    -> the fabric ramp AND the icon AND the cut of the fly, three
//              encodings of one fact, so the arm survives colour-blindness,
//              a greyscale screenshot, and the stack being closed.
//   rank    -> the numeral, top of the fabric, nearest the hoist. That corner
//              is the sliver still visible when Colours overlap in a stack,
//              which is why the number lives there and the icon does not.
//   ability -> a gold tassel knotted to the staff on the odd ranks. It is ON
//              THE STAFF, not on the fabric, so it can never collide with the
//              numeral or the device, and it changes the SILHOUETTE — a
//              battle honour reads before you have read anything.
//   hidden hand / depletion -> the stack (below): five staves edge-on is a
//              count you can see without a number on it.
//
// Column ruler:
//   0         1         2         3
//   01234567890123456789012345678901
//
// ONE BANNER IS AUTHORED, THIRTY-THREE ARE COMPOSED. The staff, finial and
// drape are stated once, in the oxblood ramp. Each face then stamps a numeral
// and a device over that base, cuts the fly, and recolours the fabric ramp for
// its arm. A change to the drape is one edit, not thirty-three.

import {
  sprite,
  recolour,
  writeSheet,
  writeSpritePng,
  writeSpriteSvg,
} from '../.claude/skills/pixel-artist/scripts/pixelart.mjs'
import { pal, SILHOUETTE } from './palette.mjs'

const W = 32
const H = 40

// ---------------------------------------------------------------- helpers

/** Overwrite art onto rows at (y0,x0). '.' in the patch leaves what is under it. */
function paste(rows, y0, x0, art) {
  const out = rows.slice()
  art.forEach((line, i) => {
    const row = out[y0 + i].split('')
    for (let j = 0; j < line.length; j++) {
      if (line[j] !== '.') row[x0 + j] = line[j]
    }
    out[y0 + i] = row.join('')
  })
  return out
}

/**
 * Cut the fly (the free edge) inward by `depthFor(y)` columns, carrying the
 * outline in with it. This is the ONLY thing that differs structurally between
 * the three arms, and it is what makes them separable as pure black cutouts.
 */
function cutFly(rows, depthFor) {
  return rows.map((row, y) => {
    const d = depthFor(y)
    if (!d) return row
    return row.slice(0, 30 - d) + 'K' + '.'.repeat(d + 1)
  })
}

/** Composite grids onto a transparent canvas — used only for the stack. */
function overlay(width, height, pieces) {
  const canvas = Array.from({ length: height }, () => '.'.repeat(width).split(''))
  for (const { rows, x: ox, y: oy } of pieces) {
    rows.forEach((line, y) => {
      for (let x = 0; x < line.length; x++) {
        if (line[x] !== '.') canvas[oy + y][ox + x] = line[x]
      }
    })
  }
  return canvas.map((r) => r.join(''))
}

// ---------------------------------------------------------------- the staff

// Spearhead finial, gold ferrule, then the staff: silver W/w and the armour
// ramp's 'a' as the staff's shaded side. Light is top-left, so the finial's
// upper-left face is bare W and the outline only appears where the light stops.
const HEAD = [
  '...W............................', // 0
  '..WWK...........................', // 1
  '.WWwwK..........................', // 2
  '.KWwwK..........................', // 3
  '..KwwK..........................', // 4
  '..KGgK..........................', // 5  ferrule — gold, 1px, an accent
  '..KgaK..........................', // 6
]

// The drape. The lit face sweeps down from the top-left corner and the shadow
// sweeps up from the bottom-right, so the two boundaries are NOT parallel —
// two parallel colour edges is banding, and the eye reads the seam not the
// cloth. x5 is 'r' on every row: that is the sleeve rolling round the staff,
// in shadow, which is what makes the fabric look attached rather than pasted on.
const DRAPE = [
  'PPPPPPPPPPPPPPPPPPPPPPPP', //  7
  'PPPPPPPPPPPPPPPPPPRRRRRR', //  8
  'PPPPPPPPPRRRRRRRRRRRRRRR', //  9
  'PPPPPRRRRRRRRRRRRRRRRRRr', // 10
  'PPPRRRRRRRRRRRRRRRRRRRrr', // 11
  'PPRRRRRRRRRRRRRRRRRRRRrr', // 12
  'PPRRRRRRRRRRRRRRRRRRRRrr', // 13
  'PPRRRRRRRRRRRRRRRRRRRrrr', // 14
  'PPRRRRRRRRRRRRRRRRRRRrrr', // 15
  'PRRRRRRRRRRRRRRRRRRRRrrr', // 16
  'PRRRRRRRRRRRRRRRRRRRRrrr', // 17
  'PRRRRRRRRRRRRRRRRRRRrrrr', // 18
  'PRRRRRRRRRRRRRRRRRRRrrrr', // 19
  'RRRRRRRRRRRRRRRRRRRRrrrr', // 20
  'RRRRRRRRRRRRRRRRRRRRrrrr', // 21
  'RRRRRRRRRRRRRRRRRRRrrrrr', // 22
  'RRRRRRRRRRRRRRRRRRRrrrrr', // 23
  'RRRRRRRRRRRRRRRRRRrrrrrr', // 24
  'RRRRRRRRRRRRRRRRRRrrrrrr', // 25
  'RRRRRRRRRRRRRRRRRrrrrrrr', // 26
  'RRRRRRRRRRRRRRRRRrrrrrrr', // 27
  'RRRRRRRRRRRRRRRRrrrrrrrr', // 28
  'RRRRRRRRRRRRRRRrrrrrrrrr', // 29
  'RRRRRRRRRRRRRRrrrrrrrrrr', // 30
  'RRRRRRRRRRRRRrrrrrrrrrrr', // 31
  'RRRRRRRRRRRrrrrrrrrrrrrr', // 32
  'RRRRRRRRrrrrrrrrrrrrrrrr', // 33
  'RRRRrrrrrrrrrrrrrrrrrrrr', // 34
  'rrrrrrrrrrrrrrrrrrrrrrrr', // 35
]

const HEM = '..Kga' + 'K'.repeat(26) + '.' //             36  bottom edge
const BUTT = [
  '..KgaK..........................', // 37
  '..KgaK..........................', // 38
  '..KKKK..........................', // 39
]

const BLANK = [...HEAD, ...DRAPE.map((f) => '..Kgar' + f + 'K.'), HEM, ...BUTT]

// ---------------------------------------------------------------- the numeral

// 5x7 digits, 4-wide K, 5-wide M. Sized so the widest label — 100K, 22px —
// still clears the 24px of fabric with a margin, and the shortest — 1M —
// stays optically centred rather than drifting to the hoist.
const D = {
  0: ['.WWW.', 'W...W', 'W...W', 'W...W', 'W...W', 'W...W', '.WWW.'],
  1: ['..W..', '.WW..', '..W..', '..W..', '..W..', '..W..', '.WWW.'],
  2: ['.WWW.', 'W...W', '....W', '...W.', '..W..', '.W...', 'WWWWW'],
  3: ['WWWW.', '....W', '....W', '.WWW.', '....W', '....W', 'WWWW.'],
  4: ['...W.', '..WW.', '.W.W.', 'W..W.', 'WWWWW', '...W.', '...W.'],
  5: ['WWWWW', 'W....', 'WWWW.', '....W', '....W', 'W...W', '.WWW.'],
  6: ['..WW.', '.W...', 'W....', 'WWWW.', 'W...W', 'W...W', '.WWW.'],
  7: ['WWWWW', '....W', '...W.', '..W..', '.W...', '.W...', '.W...'],
  8: ['.WWW.', 'W...W', 'W...W', '.WWW.', 'W...W', 'W...W', '.WWW.'],
  9: ['.WWW.', 'W...W', 'W...W', '.WWWW', '....W', '...W.', '.WW..'],
  K: ['W..W', 'W.W.', 'WW..', 'WW..', 'W.W.', 'W..W', 'W..W'],
  M: ['W...W', 'WW.WW', 'W.W.W', 'W.W.W', 'W...W', 'W...W', 'W...W'],
}

/** Lay out a label as 7 rows, 1px between glyphs. */
function label(text) {
  const glyphs = [...text].map((c) => D[c])
  return Array.from({ length: 7 }, (_, y) => glyphs.map((g) => g[y]).join('.'))
}

/** 10K, 20K … 100K, then the deliberate break at the top: 1M, not 110K. */
const LABEL = (rank) => (rank === 11 ? '1M' : `${rank}0K`)

// ---------------------------------------------------------------- the devices

// 14x14, drawn in the silver ramp so one device set serves every fabric colour.
// Three deliberately unlike silhouettes: a broad taper, a tall curve, and a
// wide-based diagonal. That is what has to carry the arm when the piece is
// small, greyscale, or half-covered by the next Colour in the stack.

// FOOT — a heater shield, divided per pale: lit face left, shadowed face right,
// the same top-left light as everything else. A first pass put a chevron across
// it and the shield read as damaged rather than decorated — the flat area is
// better broken by the light than by an ornament.
const SHIELD = [
  'WWWWWWWWWwwwww',
  'WWWWWWWWWwwwww',
  'WWWWWWWWWwwwww',
  'WWWWWWWWWwwwww',
  '.WWWWWWWWwwww.',
  '.WWWWWWWWwwww.',
  '..WWWWWWWwww..',
  '..WWWWWWWwww..',
  '...WWWWWWww...',
  '...WWWWWWww...',
  '....WWWWWw....',
  '....WWWWWw....',
  '.....WWWW.....',
  '......WW......',
]

// HORSE — a head in profile, nose to the fly. Three passes to get here, and
// the one thing that fixed it was the ABRUPT throat notch at row 10: the jaw
// line jumps back five columns in a single row. A gradual pull-back reads as a
// cat, and a muzzle as tall as it is long reads as a duck. One ear, not two —
// a spread pair on a round head is what made it feline.
const HORSE = [
  '..WW..........',
  '..WWW.........',
  '.WWWWW........',
  '.WWWWWW.......',
  '.WWWWWWW......',
  'WWWWwWWWWW....',
  'WWWWWWWWWWWW..',
  'WWWWWWWWWWWWWW',
  'WWWWWWWWWWWWwW',
  '.WWWWWWWWWwww.',
  '..WWWWWW......',
  '..WWWWW.......',
  '.wWWWWWW......',
  'wWWWWWWWWW....',
]

// SIEGE ENGINES — a mangonel. Arm three pixels thick on a clean 1-step
// diagonal, an open bucket wide enough to read, legs with daylight between
// them and wheels under the beam. A first pass drew the arm 2px on a bare
// A-frame and the device read as the letter A.
const ENGINE = [
  '.........WWWW.',
  '........WWWWWW',
  '........WWWWW.',
  '........WWW...',
  '.......WWW....',
  '......WWW.....',
  '.....WWW......',
  '....WWW.......',
  '...WWWW.......',
  '..WWWWWW......',
  '.WWWWWWWW.....',
  'WWWW..WWWW....',
  'WWWWWWWWWWWWWW',
  '.WW.......WW..',
]

// The battle honour on the odd ranks: a cord down the staff into a gold knot.
// Dark cord first, so the knot separates from the gold ferrule five rows above
// it by value rather than by being a second gold blob next to the first.
const HONOUR = ['.g', '.g', '.g', 'GG', 'GG', 'Gg', '.g']

// ---------------------------------------------------------------- the arms

// Each arm's fly cut, as columns removed from the free edge per row. Both are
// even-run staircases (2 rows per step, 4 rows per block) — a 2-1-3 rhythm is
// a jaggy and reads as a mistake at any size. Both stay clear of the numeral
// (y<=16) and the device (x<=24) by construction.
const straight = () => 0
const swallowtail = (y) => [0, 1, 1, 2, 2, 3, 3, 4, 4, 3, 3, 2, 2, 1, 1, 0][y - 17] ?? 0
const crenellated = (y) => (y < 18 || y > 33 ? 0 : Math.floor((y - 18) / 4) % 2 === 1 ? 3 : 0)

// The fabric ramps come from the shipped screen's own suit hues (see
// ./palette.mjs) — the reskin renames the suits, it does not repaint them.
const ARMS = [
  { name: 'foot', device: SHIELD, cut: straight, tint: { P: 'M', R: 'J', r: 'j' } },
  { name: 'horse', device: HORSE, cut: swallowtail, tint: { P: 'Q', R: 'D', r: 'd' } },
  { name: 'siege', device: ENGINE, cut: crenellated, tint: { P: 'U', R: 'T', r: 't' } },
]

/** One face, in the authored oxblood ramp — tinting is a separate, later step. */
function face(arm, rank) {
  const text = label(LABEL(rank))
  const x = 6 + Math.floor((24 - text[0].length) / 2) // optically centred on the fabric
  let rows = paste(BLANK, 10, x, text)
  rows = paste(rows, 19, 11, arm.device)
  if (rank % 2 === 1) rows = paste(rows, 6, 0, HONOUR) // odd ranks carry an ability
  rows = cutFly(rows, arm.cut)
  // Foot alone keeps a square banner, so it gets the gold fringe as its own
  // structural tell rather than being "the one with no feature".
  if (arm.name === 'foot') rows = paste(rows, 37, 6, ['G.G.G.G.G.G.G.G.G.G.G.G.'])
  return rows
}

const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
export const BASE = ARMS.map((arm) => RANKS.map((r) => ({ arm, rank: r, rows: face(arm, r) })))
export { ARMS }

export const spr = (b, suffix, tint) =>
  recolour(sprite(b.rows, pal, `${b.arm.name}-${b.rank}`), tint, `${b.arm.name}-${b.rank}${suffix}`)

// ---------------------------------------------------------------- furled

// A Colour still in hand, rolled and tied to its staff. This is the hidden
// hand: it deliberately shows NO device, NO numeral and NO fly cut, because
// every one of those would leak the arm. What it does show is the fabric ramp
// — which is why a furled Colour is the sharpest argument in the whole
// fabric-per-arm vs fabric-per-faction question: rolled up, the only thing a
// hidden piece CAN say is whose it is.
const FURLED = [
  ...HEAD.map((r) => r.slice(0, 6).padEnd(16, '.')),
  '..KgaK..........', //  7
  '..KgaK..........', //  8
  '.KKKKKKKKK......', //  9  the roll begins
  ...Array(3).fill('.KPPRRRrrK......'), // 10-12
  ...Array(2).fill('.KGGGGGggK......'), // 13-14  cord
  ...Array(12).fill('.KPPRRRrrK......'), // 15-26
  ...Array(2).fill('.KGGGGGggK......'), // 27-28  cord
  ...Array(3).fill('.KPPRRRrrK......'), // 29-31
  '.KKKKKKKKK......', // 32
  ...Array(6).fill('..KgaK..........'), // 33-38
  '..KKKK..........', // 39
]

export const furled = sprite(FURLED, pal, 'furled')

// ---------------------------------------------------------------- output

// 1. The deck as drawn: 3 arms x 11 ranks = the 33 faces createDeck() produces.
const meta = writeSheet(
  ARMS.map((arm, i) => ({
    name: arm.name,
    frames: BASE[i].map((b) => spr(b, '', arm.tint)),
  })),
  {
    cell: [W, H],
    path: 'public/art/war-council-colours.png',
    jsonPath: 'public/art/war-council-colours.json',
  },
)

// 2. The same 33 in ONE ramp. This is the real test of the reskin: if the arm
//    is still readable here, then fabric colour is reinforcement rather than
//    the only carrier, and a colour-blind player loses nothing.
writeSheet(
  ARMS.map((arm, i) => ({
    name: arm.name,
    frames: BASE[i].map((b) => spr(b, '-mono', {})),
  })),
  {
    cell: [W, H],
    path: 'public/art/war-council-colours-mono.png',
    jsonPath: 'public/art/war-council-colours-mono.json',
  },
)

// 3. The cutout test — nameable as pure black, or the design does not work.
writeSheet(
  [
    {
      name: 'cutout',
      frames: ARMS.map((arm, i) => spr(BASE[i][8], '-cutout', SILHOUETTE)),
    },
  ],
  {
    cell: [W, H],
    path: 'public/art/war-council-colour-silhouette.png',
    jsonPath: 'public/art/war-council-colour-silhouette.json',
  },
)

// 4. A closed stack. Depletion is meant to read as physical thickness, so the
//    back Colours step one ramp step darker — five staves edge-on is a count
//    without a number on it, and an empty arm is an absent stack.
const DEPTH = { P: 'R', R: 'r' }
function stack(armIndex, n) {
  const step = 5
  const pieces = Array.from({ length: n }, (_, i) => ({
    x: i * step,
    y: 0,
    rows:
      i === n - 1
        ? BASE[armIndex][8].rows
        : BASE[armIndex][8].rows.map((row) => [...row].map((c) => DEPTH[c] ?? c).join('')),
  }))
  const rows = overlay(W + (n - 1) * step, H, pieces)
  const b = { arm: ARMS[armIndex], rank: `stack${n}`, rows }
  return spr(b, '', ARMS[armIndex].tint)
}

// Furled, in the two FACTION ramps rather than the three arm ramps — yours and
// theirs, which is the only distinction a hidden piece is allowed to make.
writeSheet(
  [
    {
      name: 'furled',
      frames: [furled, recolour(furled, { P: 'N', R: 'B', r: 'b' }, 'furled-azure')],
    },
  ],
  {
    cell: [16, H],
    path: 'public/art/war-council-furled.png',
    jsonPath: 'public/art/war-council-furled.json',
  },
)

export const stack5 = stack(0, 5)
export const stack2 = stack(0, 2)
writeSpritePng(stack5, 'public/art/war-council-stack-5.png')
writeSpritePng(stack2, 'public/art/war-council-stack-2.png')

// SVG proofs — these open in a browser and scale without a filter. PNG ships.
const proof = (s, name) => writeSpriteSvg(s, `public/art/${name}.svg`, { scale: 10 })
proof(spr(BASE[0][2], '', ARMS[0].tint), 'proof-foot-30k')
proof(spr(BASE[1][9], '', ARMS[1].tint), 'proof-horse-100k')
proof(spr(BASE[2][10], '', ARMS[2].tint), 'proof-siege-1m')
proof(spr(BASE[0][8], '-mono', {}), 'proof-mono-foot-90k')
proof(spr(BASE[1][8], '-mono', {}), 'proof-mono-horse-90k')
proof(spr(BASE[2][8], '-mono', {}), 'proof-mono-siege-90k')
proof(stack5, 'proof-stack-5')

console.log('sheet', meta.size, 'cell', meta.cell, 'tags', Object.keys(meta.tags).join(' '))
console.log('stack5', stack5.width + 'x' + stack5.height)
