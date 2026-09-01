import {
  cardAccessibleName,
  DISCARD_READY_HINT,
  DISCARD_SELECT_HINT,
  TIMEBOMB_ARMED_HINT,
  ILLEGAL_MOVE_MESSAGE,
} from './labels'
import { type RoundUiState } from './roundUiState'

/** Priority mirrors the mockup's hint cascade: a rejection or an armed card
 * always says the most specific thing; otherwise the hint names whose turn
 * it is to lead or follow.
 *
 * Extracted from `WarCouncilRound.tsx` on DLR-90. It was always a pure function of committed
 * state, but as a private helper inside a component it could only be exercised through a renderer
 * — so a cascade with six branches had no direct test. It has one now.
 *
 * DLR-100's discard branch sits ahead of `quarryToLead` deliberately: a discard selection in
 * progress is the more specific, more actionable thing to tell the player, and per AC1 the two
 * states can genuinely coexist — a selection open during the Quarry-to-lead gap.
 */
export function deriveHint(ui: RoundUiState, interactive: boolean, quarryToLead: boolean): string {
  if (ui.rejection) return ILLEGAL_MOVE_MESSAGE[ui.rejection]
  if (ui.prompt) return 'Choose what the card does'
  if (ui.resolvedTrick) return 'Trick resolved'
  if (ui.discardSelection !== null) {
    return ui.discardSelection.length > 0 ? DISCARD_READY_HINT : DISCARD_SELECT_HINT
  }
  // DLR-154 — the armed-Timebomb prompt joins the discard branch ABOVE `quarryToLead`, and for
  // the same reason: the Quarry-to-lead gap spans exactly the between-tricks window a Timebomb is
  // activatable in, so beneath it the prompt was unreachable throughout its own lifetime. An
  // armed Timebomb reinterprets the next hand-card tap — the most specific, most actionable thing
  // there is to say — and AC1 requires it to be said out loud.
  if (ui.timebombArmedDamage !== null) return TIMEBOMB_ARMED_HINT
  if (quarryToLead) return 'They are choosing their lead'
  if (ui.armed) return `Tap ${cardAccessibleName(ui.armed)} again to play it`
  // DLR-132 — a live Cheat needs no hint of its own: it is visible in the fan's widened legal set.
  if (interactive) return ui.round.currentTrick.length > 0 ? 'Follow their lead' : 'Your lead'
  return ''
}
