import type { Suit } from '../../warCouncil'

/** A rectangle in the NORMALISED card box: 0 is the card's left/top edge, 1 its right/bottom.
 *  Aspect-ratio independent on purpose — the card is `2 / 3` today and the reference sheet is
 *  `5 / 7`, and which one ships is the developer's call. */
export interface FaceRect {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

/** Which of the three faces a rank wears. `act` and `inert` both paint; only `plain` mirrors
 *  its corner index into the bottom-right (AC6). */
export const RankFaceClass = {
  Act: 'act',
  Inert: 'inert',
  Plain: 'plain',
} as const
export type RankFaceClass = (typeof RankFaceClass)[keyof typeof RankFaceClass]

/** One figure symbol's id suffix — the `<symbol id="wc-fig-…">` bodies in `CardArtSheet.tsx`. */
export type FigureKey = 'swan' | 'fox' | 'axe' | 'witch' | 'crown' | 'harp' | 'chalice' | 'sword'

export interface RankFace {
  readonly faceClass: RankFaceClass
  /** Printed in the corner index (AC6). `null` for every rank with no settled name — which is
   *  rank 8 and every plain even rank. Naming rank 8 is explicitly out of scope. */
  readonly name: string | null
  /** One figure for the five acting ranks; three for the Treasure, whose treasure differs by
   *  suit (AC1). `null` for a rank that prints pips instead. */
  readonly figure: FigureKey | Readonly<Record<Suit, FigureKey>> | null
}

/** Total over `RANKS` (1–11). The six named ranks and the five plain ones. Rank 8 is `Plain`
 *  with no name: AC3 keeps it on pips because it has no settled name, explicitly NOT because it
 *  is inert. The reference sheet classes it inert and this deliberately differs — see `plan.md`
 *  Part 1 → Assumptions made. */
export const RANK_FACE: Readonly<Record<number, RankFace>> = {
  1: { faceClass: RankFaceClass.Act, name: 'Swan', figure: 'swan' },
  2: { faceClass: RankFaceClass.Plain, name: null, figure: null },
  3: { faceClass: RankFaceClass.Act, name: 'Fox', figure: 'fox' },
  4: { faceClass: RankFaceClass.Plain, name: null, figure: null },
  5: { faceClass: RankFaceClass.Act, name: 'Woodcutter', figure: 'axe' },
  6: { faceClass: RankFaceClass.Plain, name: null, figure: null },
  7: {
    faceClass: RankFaceClass.Inert,
    name: 'Treasure',
    figure: { bells: 'harp', keys: 'chalice', moons: 'sword' },
  },
  8: { faceClass: RankFaceClass.Plain, name: null, figure: null },
  9: { faceClass: RankFaceClass.Act, name: 'Witch', figure: 'witch' },
  10: { faceClass: RankFaceClass.Plain, name: null, figure: null },
  11: { faceClass: RankFaceClass.Act, name: 'Monarch', figure: 'crown' },
}

/** A pip's cell on the fixed 3×7 lattice. 1-indexed to match CSS grid lines directly. */
export interface PipSpot {
  readonly row: number
  readonly column: number
}

export const PIP_LATTICE_ROWS = 7
export const PIP_LATTICE_COLUMNS = 3
export const PIP_MID_ROW = 4

/** AC4 — the fixed lattice per rank, transcribed from `reference-sheet.html`'s `PIP_LAYOUT`.
 *  Keys are exactly the pip-bearing ranks: 2, 4, 6, 8, 10. 1-indexed so a spot maps straight
 *  onto a CSS grid line. */
export const PIP_LAYOUT: Readonly<Record<number, readonly PipSpot[]>> = {
  2: [
    { row: 1, column: 2 },
    { row: 7, column: 2 },
  ],
  4: [
    { row: 1, column: 1 },
    { row: 1, column: 3 },
    { row: 7, column: 1 },
    { row: 7, column: 3 },
  ],
  6: [
    { row: 1, column: 1 },
    { row: 1, column: 3 },
    { row: 4, column: 1 },
    { row: 4, column: 3 },
    { row: 7, column: 1 },
    { row: 7, column: 3 },
  ],
  8: [
    { row: 1, column: 1 },
    { row: 1, column: 3 },
    { row: 3, column: 1 },
    { row: 3, column: 3 },
    { row: 5, column: 1 },
    { row: 5, column: 3 },
    { row: 7, column: 1 },
    { row: 7, column: 3 },
  ],
  10: [
    { row: 1, column: 1 },
    { row: 1, column: 3 },
    { row: 3, column: 1 },
    { row: 3, column: 3 },
    { row: 5, column: 1 },
    { row: 5, column: 3 },
    { row: 7, column: 1 },
    { row: 7, column: 3 },
    { row: 2, column: 2 },
    { row: 6, column: 2 },
  ],
}

/** `.wc-primed-mark` (`warCouncilCardFace.css`) sizes and positions itself in units of the
 *  card's WIDTH on BOTH axes — `--wc-card-w * 0.08` from the left edge, `--wc-card-w * 0.24`
 *  square, `--wc-card-w * 0.07` up from the bottom edge — unlike every other rectangle in this
 *  module, which this file's own y-axis normalises against the card's HEIGHT. That box shipped
 *  and was visually approved on DLR-148/DLR-90; QA (DLR-149 fix loop) found this module's own
 *  number for it did not match. Rather than re-guess a replacement, this converts the shipped
 *  width-relative numbers into this module's height-normalised y-axis via the card's own fixed
 *  `2 / 3` (width / height) aspect ratio, so the two stay byte-identical. If that aspect ratio is
 *  ever retuned (a developer's call — see `FaceRect`'s own docblock above), this conversion and
 *  the CSS it mirrors both need revisiting; nothing else in this module depends on it. */
const CARD_ASPECT_RATIO = 2 / 3 // --wc-card-w's aspect-ratio: 2 / 3, width / height
const PRIMED_MARK_LEFT = 0.08
const PRIMED_MARK_SIZE = 0.24
const PRIMED_MARK_BOTTOM = 0.07
const PRIMED_MARK_BOTTOM_FRACTION = PRIMED_MARK_BOTTOM * CARD_ASPECT_RATIO
const PRIMED_MARK_HEIGHT_FRACTION = PRIMED_MARK_SIZE * CARD_ASPECT_RATIO

/** The declared boxes. Every number here has a `--wc-face-*` twin in `warCouncilCards.css`, and
 *  `cardFaceCss.test.ts` fails if the two drift. The corner heights are derived from the type
 *  sizes below rather than guessed: a box shorter than its own numeral clips it. */
export const CARD_FACE_GEOMETRY = {
  cornerTopLeftNamed: { x0: 0.06, y0: 0.04, x1: 0.52, y1: 0.3 },
  cornerTopLeftPlain: { x0: 0.06, y0: 0.04, x1: 0.52, y1: 0.25 },
  cornerBottomRight: { x0: 0.48, y0: 0.75, x1: 0.94, y1: 0.96 },
  artWindow: { x0: 0.07, y0: 0.32, x1: 0.93, y1: 0.94 },
  pipField: { x0: 0.25, y0: 0.27, x1: 0.75, y1: 0.73 },
  noRuleMark: { x0: 0.16, y0: 0.8, x1: 0.84, y1: 0.94 },
  /** A skull REPLACES the art (DLR-148), so it occupies the identical window. */
  skullFace: { x0: 0.07, y0: 0.32, x1: 0.93, y1: 0.94 },
  primedMark: {
    x0: PRIMED_MARK_LEFT,
    y0: 1 - PRIMED_MARK_BOTTOM_FRACTION - PRIMED_MARK_HEIGHT_FRACTION,
    x1: PRIMED_MARK_LEFT + PRIMED_MARK_SIZE,
    y1: 1 - PRIMED_MARK_BOTTOM_FRACTION,
  },
  discardMark: { x0: 0.35, y0: 0.4, x1: 0.65, y1: 0.6 },
} as const satisfies Readonly<Record<string, FaceRect>>

/** Type and glyph sizes, as fractions of the card WIDTH. Mirrored in the stylesheet and pinned
 *  by the same drift spec — the corner boxes above are sized to contain these. */
export const CARD_FACE_TYPE = {
  rankSize: 0.24,
  nameSize: 0.075,
  cornerGlyph: 0.15,
} as const

/** AC1/AC2 — true only for the five ranks that change what happens. NOT `Boolean(RANK_NAME[r])`
 *  any more: the Treasure is named and does not act, which is the whole point of this ticket. */
export function cardActs(rank: number): boolean {
  return RANK_FACE[rank]?.faceClass === RankFaceClass.Act
}

/** AC4 — a spot below the lattice's mid-row prints rotated 180°. */
export function pipIsInverted(spot: PipSpot): boolean {
  return spot.row > PIP_MID_ROW
}

/** A strict comparison with no epsilon: every coordinate is an exactly-representable decimal
 *  literal from one shared module. Touching edges count as NOT overlapping, which is the
 *  correct reading of "does not overlap" for adjacent printed regions. */
export function rectsOverlap(a: FaceRect, b: FaceRect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

/** One pip cell's rectangle, derived from the rank's lattice box and its 3×7 division. Both
 *  divisors are compile-time constants and cannot be zero, so no `NaN` is reachable here. */
export function pipCellRect(_rank: number, spot: PipSpot): FaceRect {
  const field = CARD_FACE_GEOMETRY.pipField
  const cellW = (field.x1 - field.x0) / PIP_LATTICE_COLUMNS
  const cellH = (field.y1 - field.y0) / PIP_LATTICE_ROWS
  const x0 = field.x0 + (spot.column - 1) * cellW
  const y0 = field.y0 + (spot.row - 1) * cellH
  return { x0, y0, x1: x0 + cellW, y1: y0 + cellH }
}

/** A skull REPLACES this rank's own content, so it inherits that content's footprint rather
 *  than always the named ranks' (wider) art window: an Act/Inert rank has only the single
 *  top-left corner and clears `CARD_FACE_GEOMETRY.skullFace` (== `artWindow`) with room to
 *  spare, but a Plain rank also carries the mirrored bottom-right corner, which the wide
 *  art-sized window would run straight into. `CARD_FACE_GEOMETRY.pipField` is the box a Plain
 *  rank already reserves and is already proven clear of both its corners, so the skull uses that
 *  footprint there instead — no new rectangle invented, and no dedicated `--wc-face-skull-*`
 *  custom property is declared for exactly this reason: `warCouncilCardFace.css`'s
 *  `.wc-card.wc-face-plain .wc-card-skull-face` rule routes the Plain branch through the SAME
 *  `--wc-face-pip-*` properties `.wc-card-pips` already uses, drift-checked by
 *  `cardFaceCss.test.ts`. Exported (not inlined into `printedRects`) so `cardFace.test.ts` can
 *  assert each branch by name rather than only through the overlap relation, which is suit- and
 *  footprint-shape-blind. */
export function skullFootprintFor(rank: number): FaceRect {
  const face = RANK_FACE[rank]
  return face.figure !== null ? CARD_FACE_GEOMETRY.skullFace : CARD_FACE_GEOMETRY.pipField
}

/** AC5 — every rectangle this rank ACTUALLY prints, split so the spec can assert the one
 *  relation that matters: nothing in `printed` may intersect anything in `corners`. Overlays
 *  are excluded from the corner set deliberately — a badge sitting over a painting or a pip is
 *  intended, and every overlay's own rectangle is separately proven clear of both corners by
 *  being included in `printed`. */
export function printedRects(rank: number): {
  readonly corners: readonly FaceRect[]
  readonly printed: readonly FaceRect[]
} {
  const face = RANK_FACE[rank]
  const geometry = CARD_FACE_GEOMETRY
  const corners: FaceRect[] = [
    face.name === null ? geometry.cornerTopLeftPlain : geometry.cornerTopLeftNamed,
  ]
  // AC6 — the mirrored index prints only where nothing else is printed there.
  if (face.faceClass === RankFaceClass.Plain) corners.push(geometry.cornerBottomRight)

  const skullFootprint = skullFootprintFor(rank)
  const printed: FaceRect[] = [skullFootprint, geometry.primedMark, geometry.discardMark]
  if (face.figure !== null) printed.push(geometry.artWindow)
  else for (const spot of PIP_LAYOUT[rank]) printed.push(pipCellRect(rank, spot))
  if (face.faceClass === RankFaceClass.Inert) printed.push(geometry.noRuleMark)

  return { corners, printed }
}
