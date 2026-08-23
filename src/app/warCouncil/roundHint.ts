import {
  APPLY_DAMAGE_POISED_HINT,
  cardAccessibleName,
  CHEAT_ARMED_HINT,
  CHEAT_POISED_HINT,
  DISCARD_READY_HINT,
  DISCARD_SELECT_HINT,
  TIMEBOMB_ARMED_HINT,
  TIMEBOMB_POISED_HINT,
  ILLEGAL_MOVE_MESSAGE,
} from './labels'
import { CheatStage, TimebombStage, type RoundUiState } from './roundUiState'

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
  if (quarryToLead) return 'They are choosing their lead'
  // Above `ui.armed` deliberately: a poised plate is the more specific thing to say, and unlike
  // the Cheat and Timebomb selections it can legitimately coexist with an armed card, because it
  // does not reinterpret the next hand-card tap.
  if (ui.applyPoised) return APPLY_DAMAGE_POISED_HINT
  if (ui.armed) return `Tap ${cardAccessibleName(ui.armed)} again to play it`
  if (ui.timebombStage) {
    return ui.timebombStage === TimebombStage.Armed ? TIMEBOMB_ARMED_HINT : TIMEBOMB_POISED_HINT
  }
  if (ui.cheatSelection) {
    return ui.cheatSelection.stage === CheatStage.Armed ? CHEAT_ARMED_HINT : CHEAT_POISED_HINT
  }
  if (interactive) return ui.round.currentTrick.length > 0 ? 'Follow their lead' : 'Your lead'
  return ''
}
