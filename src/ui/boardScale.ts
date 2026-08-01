import type { RulesConfig } from '../rules/config'

/**
 * Render sizes for the SVG board, derived from the M2 geometry tunables (§3)
 * rather than pinned to world units.
 *
 * The board's viewBox is boardBounds (src/rules/setup.ts), which grows with
 * borderPerimeter, and preserveAspectRatio fits that box to the element — so a
 * mark given a fixed world size renders thinner as the board grows and fatter
 * as it shrinks, and card text pinned to a pixel size overflows a smaller card.
 * Every size here is therefore a fraction: card sizes of the card's own
 * footprint, board marks of borderPerimeter. Retuning rules.json rescales the
 * render instead of breaking it (SCRUM-15).
 *
 * The fractions themselves are presentation defaults, NOT tunables — the same
 * category as src/constants/setup.ts's MOUNTAIN_OFFSET_FRACTION. They never
 * belong in rules.json, which owns difficulty levers, not typography.
 */

/** Fractions of a station card's own width. §7.2 bonus pair, §7.1 pawn row. */
const BODY_STROKE = 0.025
const TYPE_Y = 0.24
const TYPE_SIZE = 0.15
const BONUS_FIRST_Y = 0.56
const BONUS_FIRST_SIZE = 0.26
const BONUS_LATER_Y = 0.75
const BONUS_LATER_SIZE = 0.155
const PAWN_Y = 0.9
const PAWN_RADIUS = 0.055
const PAWN_STROKE = 0.0125

/** Fractions of borderPerimeter. Each reproduces the pre-SCRUM-15 world unit
 *  exactly at the shipped default perimeter, so today's board is unchanged —
 *  only its behaviour under retuning is. */
const BORDER_STROKE = 0.002
const MOUNTAIN_STROKE = 0.0015
const RIVER_STROKE = 0.00175
const MOUNTAIN_DASH_ON = 0.0045
const MOUNTAIN_DASH_OFF = 0.0025
const VERTEX_RADIUS = 0.001
const CROSSING_RADIUS = 0.00175
const CROSSING_STROKE = 0.00075
const RECT_STROKE = 0.0005
const RECT_DASH_ON = 0.0015
const RECT_DASH_OFF = 0.001

/** World-unit render sizes for one station card. Every `*Y` is an offset from
 *  the card's own rect.y, not an absolute coordinate. */
export interface CardMetrics {
  readonly bodyStroke: number
  readonly typeY: number
  readonly typeSize: number
  readonly bonusFirstY: number
  readonly bonusFirstSize: number
  readonly bonusLaterY: number
  readonly bonusLaterSize: number
  readonly pawnY: number
  readonly pawnRadius: number
  readonly pawnStroke: number
}

/** World-unit stroke sizes for the three terrain paths. */
export interface TerrainStrokes {
  readonly border: number
  readonly mountain: number
  readonly river: number
  /** Ready-to-use strokeDasharray value, e.g. "18 10". */
  readonly mountainDash: string
}

/** World-unit sizes for the debug overlay layer. */
export interface OverlayMarks {
  readonly vertexRadius: number
  readonly crossingRadius: number
  readonly crossingStroke: number
  readonly rectStroke: number
  /** Ready-to-use strokeDasharray value, e.g. "6 4". */
  readonly rectDash: string
}

/** Card face sizes from the card's own footprint (AC5 — "the element's own
 *  dimensions"), so a ghost or preview card at any size stays consistent. */
export function cardMetrics(size: number): CardMetrics {
  return {
    bodyStroke: size * BODY_STROKE,
    typeY: size * TYPE_Y,
    typeSize: size * TYPE_SIZE,
    bonusFirstY: size * BONUS_FIRST_Y,
    bonusFirstSize: size * BONUS_FIRST_SIZE,
    bonusLaterY: size * BONUS_LATER_Y,
    bonusLaterSize: size * BONUS_LATER_SIZE,
    pawnY: size * PAWN_Y,
    pawnRadius: size * PAWN_RADIUS,
    pawnStroke: size * PAWN_STROKE,
  }
}

export function terrainStrokes(config: RulesConfig): TerrainStrokes {
  const span = config.borderPerimeter
  return {
    border: span * BORDER_STROKE,
    mountain: span * MOUNTAIN_STROKE,
    river: span * RIVER_STROKE,
    mountainDash: `${span * MOUNTAIN_DASH_ON} ${span * MOUNTAIN_DASH_OFF}`,
  }
}

export function overlayMarks(config: RulesConfig): OverlayMarks {
  const span = config.borderPerimeter
  return {
    vertexRadius: span * VERTEX_RADIUS,
    crossingRadius: span * CROSSING_RADIUS,
    crossingStroke: span * CROSSING_STROKE,
    rectStroke: span * RECT_STROKE,
    rectDash: `${span * RECT_DASH_ON} ${span * RECT_DASH_OFF}`,
  }
}
