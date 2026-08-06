// art/karvann.mjs — Captain Aurelio "The Gilded Wolf" Karvann, 32x32.
// projection: orthographic side-on · base res: 480x270 · light: top-left
// palette + art bible: ./palette.mjs
//
// The brief in three lines, because everything below is downstream of it:
//   SILHOUETTE — flared pointed coat tails, popped collar, one oversized
//     pauldron breaking the symmetry, saber hanging clear off the right hip.
//   SIGNAL COLOURS — oxblood is his colour; gold is a rare accent, never a
//     surface; one amber pixel is the artificial eye and the only orange here.
//   CUT — beard, coat lining, hilt wrap, gold veining. Invisible at 32px.
//
// Column ruler for reading the grids:
//   0         1         2         3
//   01234567890123456789012345678901
//
// Three silhouette decisions, all made against the black-cutout test:
//
//   1. The body holds one width from shoulder to belt and then flares HARD at
//      row 19. A coat that widens steadily from the neck reads as a cone or a
//      hooded monk; the hard break is what makes it read as shoulders over a
//      skirt. (First draft was the cone. It failed the cutout test outright.)
//   2. The hem swings to his left — left edge reaches col 2, right edge stops
//      at col 24. That asymmetry is what leaves the saber in open space.
//   3. The saber hangs DETACHED from the coat, 1-3px of transparency between
//      blade and hem, so it is a line off the body in the cutout and not a
//      silver detail swallowed by the silhouette.
//
// Light is top-left, so highlight P sits on the left edge and shadow r fills
// the right. The lit/shadow boundary is staggered row to row rather than held
// on one column — two colour edges running parallel is banding, and it makes
// the eye read the seam instead of the form.
//
// The saber steps one column per two rows (25,25 / 26,26 / 27,27 / 28,28) —
// the house 2:1 rhythm. Even runs only; a 2-1-3 rhythm reads as a mistake.

import {
  sprite,
  recolour,
  writeSheet,
  writeSpritePng,
  writeSpriteSvg,
} from '../.claude/skills/pixel-artist/scripts/pixelart.mjs'
import { pal, SILHOUETTE } from './palette.mjs'

// Head down to the hip — identical in every frame, so the body is stated once
// and only the hem swings.
const UPPER = [
  '................................', //  0
  '................................', //  1
  '.............KKKKKK.............', //  2  hair crown
  '............KWWWWWWK............', //  3
  '...........KWWWWwwwK............', //  4  silver — old money, not a rookie
  '...........KwWWWwwwK............', //  5
  '........KPPKSSSSsssKRRK.........', //  6  collar flares wide at the top —
  '.........KPKSKSSsYsKRK..........', //  7  its lit face is the brightest red
  '.........KPKSSSssssKRK..........', //  8  on the sprite, which pulls the eye
  '.........KGKSSSssssKgK..........', //  9  to the head. Gold trim, 1px a side.
  '.....KGGgKPKKSSSssKKRK..........', // 10  the pauldron rises to jaw height
  '...KGGGgKPPKKsssssKKRRK.........', // 11    beside the collar — gold rim on
  '...KGGGGggKRRRRRRRrrrrrrK.......', // 12    plate is SOLID gold, not a gold
  '...KggggaaKRRRRRRRrrrrrrK.......', // 13    rim over dark armour — armour A
  '....KaaaaKKPRRRRGRrrrrrK........', // 14    sits too close to outline K to
  '......KaaKKPRRRRGRrrrrrK........', // 15    separate from it at this size.
  '.......KPRRRRRRRGRrrrrrK........', // 16  G = the gold chest seam, splitting
  '.......KPPRRRRRRGRrrrrrK........', // 17    the red mass down the middle.
  '.......KaAAAAAAAGAaaaaaKGGK.....', // 18  belt: dark plate, gold buckle, and
]
// Shoulders (rows 12-13) are the WIDEST part of the upper body and the belt is
// narrower. The first draft had that backwards, which read as sloped shoulders
// and no shape at all — and it left the pauldron looking bolted on.

// Shoulder-to-hip is over; from here the coat flares and the frames diverge.
// The lit/shadow boundary walks right as it descends — 17,17,18,18,19,19,20 —
// so it is a 2-step diagonal reading as the coat's front panel, not a vertical
// seam splitting the sprite in half. A single crease of r at col 9 breaks the
// lit side, which would otherwise be the largest flat area on the sprite.
const SKIRT = [
  '......KPRRRRRRRRRRrrrrrrKWK.....', // 19
  '.....KPRRRRRRRRRRRrrrrrrKWK.....', // 20
  '....KPRRRRRRRRRRRRrrrrrrK.WK....', // 21
  '....KPPRRRRRRRRRRRrrrrrrK.wK....', // 22
  '...KPRRRRrRRRRRRRRRrrrrrK..wK...', // 23
]

// Hem at rest: tails flared, front hem clearing the boots at row 26.
const HEM_REST = [
  '...KPPRRRrRRRRRRRRRrrrrrK..wK...', // 24
  '..KPRRRRRrRRRRRRRRRRrrrrK...wK..', // 25
  '..KPRRrrK...KAAKKaaK.KrrK...wK..', // 26  coat splits; boots appear between
  '...KPRrK....KGGKKggK.KrK.....wK.', // 27  gold boot cuffs anchor the bottom
  '....KrK.....KAAKKaaK............', // 28  the tail ends in a point
  '............KAAKKaaK............', // 29
  '............KAAKKaaK............', // 30
  '...........KAAAKKaaaK...........', // 31  soles flare — he is planted
]

// Hem swung one pixel further to his left: the unhurried weight shift. The
// belt and the saber do not move, so the coat visibly swings off the blade.
const HEM_SWAY = [
  '..KPPRRRrRRRRRRRRRrrrrrK...wK...', // 24
  '.KPRRRRRrRRRRRRRRRRrrrrK....wK..', // 25
  '.KPRRrrK....KAAKKaaK.KrK....wK..', // 26
  '..KPRrK.....KGGKKggK.........wK.', // 27
  '...KrK......KAAKKaaK............', // 28
  '............KAAKKaaK............', // 29
  '............KAAKKaaK............', // 30
  '...........KAAAKKaaaK...........', // 31
]

// The slow head-turn that catches the light: the amber eye widens to 2px for
// one frame. Cheaper than a turn, reads as one, keeps the pivot identical.
const UPPER_GLINT = UPPER.map((row, y) => (y === 7 ? '.........KPKSKSSYYsKRK..........' : row))

export const idle0 = sprite([...UPPER, ...SKIRT, ...HEM_REST], pal, 'karvann-idle0')
export const idle1 = sprite([...UPPER, ...SKIRT, ...HEM_SWAY], pal, 'karvann-idle1')
export const idle2 = sprite([...UPPER_GLINT, ...SKIRT, ...HEM_REST], pal, 'karvann-idle2')

const IDLE = [idle0, idle1, idle2]

// Faction swap: only the oxblood ramp is remapped, so the silhouette, the gold,
// the silver and the amber eye all survive and he stays recognisable. Every
// frame swaps, so the variant animates identically — that is the whole point of
// a swap over a redraw.
const AZURE = IDLE.map((f) => recolour(f, { P: 'N', R: 'B', r: 'b' }, `${f.name}-azure`))

// The recognition test: if he is nameable as a black cutout, the design works.
const CUTOUT = IDLE.map((f) => recolour(f, SILHOUETTE, `${f.name}-silhouette`))

const sheet = (frames, name) =>
  writeSheet([{ name: 'idle', frames }], {
    cell: 32,
    path: `public/art/${name}.png`,
    jsonPath: `public/art/${name}.json`,
  })

const meta = sheet(IDLE, 'karvann')
sheet(AZURE, 'karvann-azure')
sheet(CUTOUT, 'karvann-silhouette')

writeSpritePng(idle0, 'public/art/karvann-idle.png')
writeSpriteSvg(idle0, 'public/art/karvann-proof.svg', { scale: 12 })
writeSpriteSvg(CUTOUT[0], 'public/art/karvann-silhouette.svg', { scale: 12 })

console.log('sheet', meta.size, Object.keys(meta.frames).join(' '))
