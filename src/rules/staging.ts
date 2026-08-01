/**
 * Pure derivations behind §10.4 step 1's player-facing surface. src/ui/ owns
 * turning a PointerEvent into world coordinates (getScreenCTM is a DOM call and
 * lives there); this module owns everything downstream of that point, so the
 * footprint rule and the stage machine are both unit-testable with no DOM.
 *
 * Adjudicates nothing: legality is validateStationPlacement's, and this module
 * never re-decides it.
 */
import { DRAW_EVENT, STATION_STEP_STAGE, TURN_PHASE } from '../constants/game'
import type { DrawEventKind, GameState, Point, Rect, StationStepStage } from './types'

/**
 * The pending card's footprint while it is being positioned, centred on
 * `centre`. Every station card is the same config.cardSize square (M2), which
 * is why the card itself is not a parameter — the same reasoning search.ts's
 * hasLegalStationPlacement records for its own unread `card`.
 */
export function cardRectAt(centre: Point, cardSize: number): Rect {
  const half = cardSize / 2
  return { x: centre.x - half, y: centre.y - half, width: cardSize, height: cardSize }
}

/** The two terminal events: the draw-and-recycle sequence ended with no card. */
const SKIP_EVENT_KINDS: ReadonlySet<DrawEventKind> = new Set([
  DRAW_EVENT.SKIPPED_DECK_EMPTY,
  DRAW_EVENT.SKIPPED_NO_LEGAL_PLACEMENT,
])

/**
 * Which stage of step 1 `state` is in. AWAITING_DRAW and SKIPPED both present
 * as phase STATION with no pendingCard and differ only in whether the last
 * draw attempt terminated in a skip — exactly the distinction a component
 * re-deriving this from three fields gets subtly wrong, which is why it is a
 * tested function.
 */
export function stationStepStage(state: GameState): StationStepStage {
  if (state.status === 'ENDED' || state.phase !== TURN_PHASE.STATION) {
    return STATION_STEP_STAGE.DONE
  }
  if (state.pendingCard !== null) {
    return STATION_STEP_STAGE.PLACING
  }
  const last = state.lastDraw[state.lastDraw.length - 1]
  return last !== undefined && SKIP_EVENT_KINDS.has(last.kind)
    ? STATION_STEP_STAGE.SKIPPED
    : STATION_STEP_STAGE.AWAITING_DRAW
}
