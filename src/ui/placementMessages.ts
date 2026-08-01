import { DRAW_EVENT, STATION_REJECTION_REASON } from '../constants/game'
import { MAX_STATION_STEP_FAILURES } from '../rules/turn'
import type { DrawEvent, StationRejectionReason, StationType } from '../rules/types'

/**
 * §5.2's three constraints in player-facing words (AC3 — the specific reason,
 * never a generic rejection). Typed as a total Record so a new code cannot ship
 * without copy.
 */
export const REJECTION_COPY: Readonly<Record<StationRejectionReason, string>> = {
  [STATION_REJECTION_REASON.TOUCHES_STRING]:
    'Touches a string — the border, the river, the mountain or a railway.',
  [STATION_REJECTION_REASON.TOUCHES_STATION]: 'Touches another station.',
  [STATION_REJECTION_REASON.NOT_INSIDE_BORDER]: 'Not fully inside the border string.',
}

/** Names the blocking station's type where the engine reported one. */
export function describeRejection(
  reason: StationRejectionReason,
  blockingStationType: StationType | null,
): string {
  const base = REJECTION_COPY[reason]
  return blockingStationType === null ? base : `${base} (${blockingStationType})`
}

/**
 * One sentence per §5.2 draw event, so AC7's marker bounce and AC8's failed
 * draws are shown rather than happening invisibly. The M4 ceiling is read from
 * turn.ts — a literal here would be a hard-coded rulebook constant in copy.
 */
export function describeDrawEvent(event: DrawEvent): string {
  const type = event.stationType ?? 'The card'
  switch (event.kind) {
    case DRAW_EVENT.DREW:
      return `Drew ${type}.`
    case DRAW_EVENT.RECYCLED_NEEDS_MARKER:
      return `${type} needs a player marker and both of yours are already placed — returned to the bottom of the deck (§7.3). Drawing again.`
    case DRAW_EVENT.RECYCLED_NO_LEGAL_PLACEMENT:
      return `${type} has no legal position anywhere on this board — returned to the bottom of the deck. Failed draw ${event.failures} of ${MAX_STATION_STEP_FAILURES}.`
    case DRAW_EVENT.SKIPPED_NO_LEGAL_PLACEMENT:
      return `${MAX_STATION_STEP_FAILURES} cards in a row had nowhere to go — skipping the station step this turn (M4).`
    case DRAW_EVENT.SKIPPED_DECK_EMPTY:
      return 'The deck is empty, and nothing is ever reshuffled — skipping the station step (M5).'
    case DRAW_EVENT.EXTRA_DRAW_FROM_RURAL:
      return `${type} is a Draw Station — draw and place a second station this turn (§7.3).`
    case DRAW_EVENT.RURAL_CHAIN_CAPPED:
      return `${type} is a Draw Station, but the extra draw does not chain — never a third (§7.3).`
  }
}
