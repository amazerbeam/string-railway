// art/palette.mjs — the art bible in code.
//
// Projection : orthographic side-on (character / War Council art)
// Base res   : 480x270  (x4 = 1080p, x8 = 4K)
// Light      : single source, top-left, no deviation across the set
// Outline    : selective — dark on shadowed edges, dropped where the light lands
//
// Convention: UPPERCASE is the lit step, lowercase is its shadow. Every ramp
// hue-shifts (shadows rotate toward blue/purple, highlights toward orange) —
// never darkened by dropping lightness alone.
//
// Ramps are deliberately shared across materials. Silver does hair AND steel;
// the armour ramp does boots, belts and buckles. Reuse is what makes a set read
// as one world, and it is why one <32 colour table can carry a whole game.

import { palette } from '../.claude/skills/pixel-artist/scripts/pixelart.mjs'

export const COLOURS = {
  // Reserved globally: one near-black used by every outline and contact shadow.
  K: '#12101c',

  // Oxblood — Karvann's signature coat. #c76057 -> #8c2b40 -> #4a1a38 rotates
  // warm (h~5) to cool (h~318) as it darkens.
  P: '#c76057',
  R: '#8c2b40',
  r: '#4a1a38',

  // Gold — accent only, never a whole surface. Rare is what makes it read rich.
  G: '#f2c14e',
  g: '#94571f',

  // Blackened armour: boots, belt, buckle plate. Purple-shifted, not grey.
  A: '#34293f',
  a: '#1a1524',

  // Silver — hair and steel share this ramp on purpose.
  W: '#e2e6f0',
  w: '#8790a8',

  // Skin.
  S: '#d9a077',
  s: '#8c5334',

  // Amber — the artificial eye. The ONLY orange in the table. Do not reuse it
  // for anything else; its whole job is being the single warm glow point.
  Y: '#ff8f1f',

  // Azure — the faction-swap ramp for oxblood. Applied with
  // recolour(spr, { P: 'N', R: 'B', r: 'b' }), never by redrawing.
  N: '#5b83d0',
  B: '#2b4c8c',
  b: '#16294f',

  // ---- the three ARM fabrics, for the War Council's Colours ----------------
  //
  // These are NOT invented. Each ramp's LIT step is the suit hue the shipped
  // app already uses (`--wc-bells`, `--wc-keys`, `--wc-moons` in
  // src/app/warCouncil/warCouncil.css), which is already proven to read
  // against that screen's dark green felt. The reskin renames the suits; it
  // has no business repainting them. Base and shadow are darkened beneath
  // each so a near-white numeral (W) still reads on the fabric.
  //
  // An earlier draft used a green ramp for the third arm. On the actual felt
  // (#16241f) that was green on green — the reason to look at the running app
  // before choosing a colour.
  //
  // Foot  <- Bells  #c9873f
  M: '#c9873f',
  J: '#8a4a24',
  j: '#40201f',
  // Horse <- Keys   #5f93a8
  Q: '#5f93a8',
  D: '#35617a',
  d: '#16303f',
  // Siege <- Moons  #9c7cb8
  U: '#9c7cb8',
  T: '#6b4d87',
  t: '#2b1f47',
}

export const pal = palette(COLOURS)

/** Every visible key -> outline black. Used for the silhouette read test. */
export const SILHOUETTE = Object.fromEntries(
  Object.keys(COLOURS)
    .filter((k) => k !== 'K')
    .map((k) => [k, 'K']),
)
