import type { HexCoord } from '../../vanguard'

/** A pointy-top hex row advances three quarters of a hex height. Geometry, not a tunable. */
const ROW_HEIGHT_RATIO = 0.75
/** A pointy-top hex is 2/√3 as tall as it is wide. Geometry, not a tunable. */
const HEX_HEIGHT_TO_WIDTH = 2 / Math.sqrt(3)

export interface HexPlacement {
  readonly xFraction: number
  readonly yFraction: number
}

export interface HexBoardMetrics {
  readonly widthUnits: number
  readonly heightUnits: number
  readonly aspectRatio: number // widthUnits / heightUnits — never 0, never NaN
  readonly cellWidthFraction: number
}

export function hexBoardMetrics(size: number): HexBoardMetrics {
  // A degenerate size must not produce a zero divisor: aspectRatio feeds a CSS
  // `aspect-ratio` and cellWidthFraction feeds a `%` width, and a NaN in either
  // is dropped silently by the browser with no error anywhere.
  const span = size > 0 ? size : 1
  const widthUnits = span + (span - 1) / 2 + 1
  const heightUnits = (span - 1) * ROW_HEIGHT_RATIO + HEX_HEIGHT_TO_WIDTH

  return {
    widthUnits,
    heightUnits,
    aspectRatio: widthUnits / heightUnits,
    cellWidthFraction: 1 / widthUnits,
  }
}

/**
 * Axial coordinate to a fractional position inside the rhombus bounding box.
 *
 * The r axis is FLIPPED for screen space — increasing r climbs the screen — so the
 * engine's fixed `bases.player` at {0,0} renders bottom-left (lowest and leftmost)
 * and `bases.cpu` at {size-1,size-1} renders top-right, leaning the rhombus
 * left-to-right off its bottom-left corner. Developer-confirmed at SCRUM-29's
 * approval gate. This function is the ONLY place orientation is decided: no
 * coordinate is rewritten and nothing in src/vanguard/ changes, so re-orienting
 * the board later is a one-line change here rather than a sweep of every consumer.
 */
export function hexPlacement(coord: HexCoord, size: number): HexPlacement {
  const { widthUnits, heightUnits } = hexBoardMetrics(size)
  const span = size > 0 ? size : 1

  return {
    xFraction: (coord.q + coord.r / 2 + 0.5) / widthUnits,
    yFraction: ((span - 1 - coord.r) * ROW_HEIGHT_RATIO + HEX_HEIGHT_TO_WIDTH / 2) / heightUnits,
  }
}
