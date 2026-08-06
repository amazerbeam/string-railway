// art/karvann-side.mjs — Karvann in profile: walk, jump, sword attack.
// projection: orthographic side-on · base res: 480x270 · light: top-left
// palette + art bible: ./palette.mjs · front-facing idle: ./karvann.mjs
//
// WHY A SECOND FACING. The front pose in karvann.mjs is a portrait — it holds
// still and shows his face. Walking, jumping and swinging a saber are all
// motions that happen along the axis you cannot see head-on: a sword arc
// front-on is a few pixels changing colour. So these three are drawn in
// profile, facing right. Mirror with flipX for left; never redraw a mirror.
//
// Column ruler:
//   0         1         2         3
//   01234567890123456789012345678901
//
// FRAMES ARE COMPOSED, NOT REDRAWN. The body above the hem is one grid, stated
// once. Each frame stamps a leg pose and (for the attack) a sword arm over it.
// That is how sprite animation actually works, and it means a change to the
// coat is one edit instead of thirteen.
//
// The saber is only drawn when it is out. Sheathed, it sits behind the coat on
// his far hip and is genuinely not visible in profile — drawing it there would
// be inventing a detail the pose does not show.

import {
  sprite,
  flipX,
  writeSheet,
  writeSpriteSvg,
} from '../.claude/skills/pixel-artist/scripts/pixelart.mjs'
import { pal } from './palette.mjs'

const W = 32
const H = 32
const BLANK = '.'.repeat(W)

/** Overwrite a run of pixels at (y, x). A '.' in the patch erases. */
function stamp(rows, patches) {
  const out = rows.slice()
  for (const [y, x, run] of patches) {
    if (y < 0 || y >= out.length) continue
    out[y] = out[y].slice(0, x) + run + out[y].slice(x + run.length)
  }
  return out
}

/** Move the whole frame up by n rows, padding the bottom — this is airborne. */
function lift(rows, n) {
  return [...rows.slice(n), ...Array(n).fill(BLANK)]
}

/** Move the body down by n rows — this is a crouch, feet staying put. */
function sink(rows, n) {
  return [...Array(n).fill(BLANK), ...rows.slice(0, rows.length - n)]
}

// ---------------------------------------------------------------- the body
// Head through the coat hem: rows 0-25. Facing right. In profile you see one
// eye, so the one you see is the amber one — the whole character in one pixel.

// Hair takes the back two thirds of the skull and skin only the front third —
// the first draft had that ratio inverted, which turned the profile into a
// brown blob with a beak. The face line runs forehead (col 21) -> nose tip
// (col 21) -> back in for the mouth -> chin (col 19).
const BODY = [
  '................................', //  0
  '................................', //  1
  '..............KKKK..............', //  2  crown rounds off — a straight top
  '.............KWWWWwK............', //  3    edge read as a helmet
  '............KWWWWwwSK...........', //  4  hair is the whole back of the
  '............KWWwwwSSK...........', //  5    skull; skin is a NARROW vertical
  '.........KPPKWwwwSYSK...........', //  6    strip down the front. Face edge
  '.........KPPKwwwwSSSSK..........', //  7    runs 19,19,19,20,19,18 — ONE
  '.........KGGKwwsSSsSK...........', //  8    pixel of nose and nothing else.
  '.........KPPKwwssSSK............', //  9    Bulging it on the eye row too
  '.........KPPPKKssK..............', // 10    turned the whole head into a
  '.........KPPPPRRRK..............', // 11    snout. The collar comes up to
  //                                           the jaw and there is no bare
  //                                           neck — four brown pixels under
  //                                           the chin read as a beard, and
  //                                           the popped collar is his anyway.
  '..........KPRRRRRrK.............', // 12  the shoulder SLOPES — a flat top
  '.........KPRRRRRRRRrrK..........', // 13    edge is what made the pauldron
  '........KPRRRRRRRRRrrK..........', // 14    look bolted to a plank
  '........KPRRRRRRRRRrrK..........', // 15
  '........KPRRRRRRRRrrrK..........', // 16
  '........KPRRRRRRRRrrrK..........', // 17
  '........KaAAAAAAAAGAaK..........', // 18  belt, gold buckle on the front
  '.......KPRRRRRRRRRrrK...........', // 19  the coat flares from here
  '......KPRRRRRRRRRRrrK...........', // 20
  '.....KPRRRRRRRRRRRrrK...........', // 21
  '....KPRRRRRRRRRRRRrrK...........', // 22
  '...KPRRRRRRRRRRRRRrrK...........', // 23
  '..KPRRRRRRRRRRRRRRrrK...........', // 24
  '..KPRRRRRRRRRRRRRrrrK...........', // 25  hem
]

// The pauldron is a DOME over the near shoulder, rising above the shoulder
// line and bulging a pixel past the chest so it registers in the silhouette.
// Drawn flat it read as a serving tray both times I tried it.
const PAULDRON = [
  [11, 17, 'KGGK'],
  [12, 16, 'KGGGGK'],
  [13, 16, 'KGgggaK'],
  [14, 17, 'KgaaK'],
  [15, 18, 'KaK'],
]

// The coat tail trailing behind him — stamped after the legs so it sits over
// them, which is what a tail hanging behind the leg actually does.
const TAIL_REST = [
  [26, 3, 'KPRRrrK'],
  [27, 4, 'KPRrK'],
  [28, 5, 'KrK'],
]

// Tail kicked out further back — used on the passing frames of the walk and
// at the top of the jump, where the coat has momentum behind it.
const TAIL_FLICK = [
  [26, 1, 'KPRRRrrK'],
  [27, 2, 'KPRRrK'],
  [28, 3, 'KPrK'],
  [29, 4, 'KK'],
]

// ---------------------------------------------------------------- leg poses
// Rows 26-31. Six rows is all the coat leaves visible, so a stride reads
// through horizontal travel and boot angle, not through knee articulation.

const LEG = {
  // Both feet under him.
  stand: [
    '............KaaAAK..............',
    '............KaaAAK..............',
    '............KaaAAK..............',
    '............KaaAAK..............',
    '...........KAAAAAaK.............',
    '...........KAAAAAaaK............',
  ],
  // Contact: front foot forward and planted, back foot trailing behind.
  contactA: [
    '..........KaaK.KAAK.............',
    '..........KaaK.KAAK.............',
    '.........KaaK...KAAK............',
    '.........KaaK...KAAK............',
    '........KAAaK...KAAAK...........',
    '........KAAaK...KAAAaK..........',
  ],
  // Passing: legs together, one boot lifting clear of the ground.
  passing: [
    '...........KaaAAK...............',
    '...........KaaAAK...............',
    '...........KaaAAK...............',
    '...........KaaAAK...............',
    '..........KAAAAAaK..............',
    '..........KAAAAAaaK.............',
  ],
  // Contact, opposite foot leading.
  contactB: [
    '...........KAAK.KaaK............',
    '...........KAAK.KaaK............',
    '..........KAAK...KaaK...........',
    '..........KAAK...KaaK...........',
    '.........KAAAK...KaaaK..........',
    '.........KAAAaK..KaaaK..........',
  ],
  // Crouched: knees bent, boots wide and flat.
  crouch: [
    '................................',
    '................................',
    '..........KaaK..KAAK............',
    '..........KaaK..KAAK............',
    '.........KAAaaK.KAAAK...........',
    '.........KAAaaK.KAAAaK..........',
  ],
  // Driving down off the ground — legs straight, toes pointed.
  extend: [
    '...........KaaAAK...............',
    '...........KaaAAK...............',
    '...........KaaAAK...............',
    '............KaAAK...............',
    '............KaAAK...............',
    '............KAAK................',
  ],
  // Airborne: knees tucked up under the coat, one boot trailing.
  tuck: [
    '..........KaaK.KAAK.............',
    '.........KaaaK.KAAK.............',
    '.........KAAaK.KAAK.............',
    '..........KAAK..KK..............',
    '................................',
    '................................',
  ],
  // Braced for a swing: front foot forward, weight on the back leg.
  lunge: [
    '.........KaaK...KAAK............',
    '.........KaaK...KAAK............',
    '........KaaK.....KAAK...........',
    '........KaaK.....KAAK...........',
    '.......KAAaK.....KAAAK..........',
    '.......KAAaK.....KAAAaK.........',
  ],
}

// ------------------------------------------------------------- the saber
// Drawn only while it is out. The blade is a 2-step diagonal wherever it can
// be — one column per two rows — with the guard in gold so the swing reads as
// a flash of his own colour and not a generic silver streak.

// The near arm, hanging down the front of the coat. Without it the profile is
// a red slab — the arm is what tells you which way he is built.
const armAt = (x) => [
  [16, x, 'KPRrK'],
  [17, x, 'KPRrK'],
  [18, x, 'KPRrK'],
  [19, x, 'KPRrK'],
  [20, x + 1, 'KSSK'], // the hand
]

const ARM = {
  rest: armAt(17),
  forward: armAt(19),
  back: armAt(15),
  // Thrown up as he leaves the ground.
  up: [
    [13, 20, 'KPK'],
    [14, 19, 'KPRK'],
    [15, 18, 'KPRrK'],
    [16, 18, 'KSSK'],
  ],
}

// ---------------------------------------------------------------- the saber
// Drawn only while it is out. Sheathed, it hangs on his far hip and is
// genuinely hidden by his body in profile — drawing it there would be
// inventing a detail the pose does not show.
//
// Every blade below is a clean 45-degree or 2-step run with the outline
// carried alongside it. A blade that wanders off its rhythm reads as a smear.

const SABER = {
  // Wound back: hand behind the head, blade angled up and back over his
  // shoulder. Two frames of wind-up buy one frame of hit.
  wind: [
    [6, 5, 'KwK'],
    [7, 6, 'KWK'],
    [8, 7, 'KWK'],
    [9, 8, 'KWK'],
    [10, 9, 'KWK'],
    [11, 10, 'KGK'],
    [12, 11, 'KSK'], // the hand
    [13, 12, 'KrRK'],
    [14, 14, 'KPRK'],
  ],
  // Overhead: blade vertical and forward of the head, the top of the arc.
  raise: [
    [2, 21, 'KWK'],
    [3, 21, 'KWK'],
    [4, 21, 'KWK'],
    [5, 21, 'KWK'],
    [6, 21, 'KWK'],
    [7, 21, 'KWK'],
    [8, 21, 'KWK'],
    [9, 21, 'KGK'],
    [10, 20, 'KSSK'],
    [11, 19, 'KrRK'],
    [12, 18, 'KPRK'],
  ],
  // THE STRIKE. The only frame with white on the blade — that flash is what
  // sells the speed, and it is why it must not appear anywhere else.
  strike: [
    [13, 16, 'KSSK'],
    [14, 18, 'KGWK'],
    [15, 20, 'KWK'],
    [16, 21, 'KWK'],
    [17, 22, 'KWK'],
    [18, 23, 'KWK'],
    [19, 24, 'KwK'],
    [20, 25, 'KwK'],
  ],
  // Follow-through: the arc is spent, blade low and shallow.
  follow: [
    [17, 15, 'KSSK'],
    [18, 17, 'KGwK'],
    [19, 19, 'KwwK'],
    [20, 21, 'KwwK'],
    [21, 23, 'KwK'],
  ],
  // Back to guard: blade angled up in front of him, ready to go again.
  recover: [
    [13, 21, 'KwK'],
    [14, 20, 'KWK'],
    [15, 19, 'KWK'],
    [16, 18, 'KGK'],
    [17, 16, 'KSSK'],
    [18, 15, 'KrRK'],
    [19, 14, 'KPRK'],
  ],
}

// ---------------------------------------------------------------- compose

// Stamp order IS draw order: the pauldron goes down first, then the tail, the
// arm and the saber over it — so a raised sword hand is never swallowed by the
// shoulder plate.
const frame = (name, legs, patches = [], transform = (r) => r) =>
  sprite(transform(stamp([...BODY, ...legs], [...PAULDRON, ...patches])), pal, name)

// Idle: a 2-frame breath. A board of perfectly still sprites reads as dead.
const idle0 = frame('side-idle0', LEG.stand, [...TAIL_REST, ...ARM.rest])
const idle1 = frame('side-idle1', LEG.stand, [...TAIL_FLICK, ...ARM.rest])

// Walk: contact -> passing -> contact -> passing, the four key poses. The arm
// swings opposite the leading leg, and the tail flicks on the passing frames
// where the body carries the most travel.
const walk0 = frame('walk0', LEG.contactA, [...TAIL_REST, ...ARM.back])
const walk1 = frame('walk1', LEG.passing, [...TAIL_FLICK, ...ARM.rest])
const walk2 = frame('walk2', LEG.contactB, [...TAIL_REST, ...ARM.forward])
const walk3 = frame('walk3', LEG.passing, [...TAIL_FLICK, ...ARM.rest])

// Jump: crouch -> drive -> airborne -> land. The airborne frame is the whole
// sprite lifted three rows, so the gap under his boots is real daylight.
const jump0 = frame('jump0', LEG.crouch, [...TAIL_REST, ...ARM.back], (r) => sink(r, 1))
const jump1 = frame('jump1', LEG.extend, [...TAIL_REST, ...ARM.up])
const jump2 = frame('jump2', LEG.tuck, [...TAIL_FLICK, ...ARM.up], (r) => lift(r, 3))
const jump3 = frame('jump3', LEG.crouch, [...TAIL_FLICK, ...ARM.forward], (r) => sink(r, 1))

// Attack: anticipation -> raise -> STRIKE -> follow-through -> recover.
// Weighted the way a swing actually is: two frames of wind-up buying one
// frame of hit, then two of recovery.
const atk0 = frame('atk0', LEG.lunge, [...TAIL_FLICK, ...SABER.wind])
const atk1 = frame('atk1', LEG.lunge, [...TAIL_FLICK, ...SABER.raise])
const atk2 = frame('atk2', LEG.lunge, [...TAIL_REST, ...SABER.strike])
const atk3 = frame('atk3', LEG.lunge, [...TAIL_REST, ...SABER.follow])
const atk4 = frame('atk4', LEG.stand, [...TAIL_REST, ...SABER.recover])

const meta = writeSheet(
  [
    { name: 'idle', frames: [idle0, idle1] },
    { name: 'walk', frames: [walk0, walk1, walk2, walk3] },
    { name: 'jump', frames: [jump0, jump1, jump2, jump3] },
    { name: 'attack', frames: [atk0, atk1, atk2, atk3, atk4] },
  ],
  { cell: 32, path: 'public/art/karvann-side.png', jsonPath: 'public/art/karvann-side.json' },
)

// One left-facing proof, to show the mirror is a function call and not a redraw.
writeSpriteSvg(flipX(walk0, 'walk0-left'), 'public/art/karvann-side-left.svg', { scale: 12 })
writeSpriteSvg(atk2, 'public/art/karvann-strike.svg', { scale: 12 })

export const ROWS = {
  idle: [idle0, idle1],
  walk: [walk0, walk1, walk2, walk3],
  jump: [jump0, jump1, jump2, jump3],
  attack: [atk0, atk1, atk2, atk3, atk4],
}

console.log('side sheet', meta.size, Object.keys(meta.tags).join(' '))
