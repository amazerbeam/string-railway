import {
  APPLY_DAMAGE_POISED_HINT,
  cardAccessibleName,
  CHEAT_ARMED_HINT,
  CHEAT_POISED_HINT,
  ENVENOM_ARMED_HINT,
  ENVENOM_POISED_HINT,
  ILLEGAL_MOVE_MESSAGE,
} from './labels'
import { CheatStage, EnvenomStage, type RoundUiState } from './roundUiState'

/** Priority mirrors the mockup's hint cascade: a rejection or an armed card
 * always says the most specific thing; otherwise the hint names whose turn
 * it is to lead or follow.
 *
 * Extracted from `WarCouncilRound.tsx` on DLR-90. It was always a pure function of committed
 * state, but as a private helper inside a component it could only be exercised through a renderer
 * — so a cascade with six branches had no direct test. It has one now.
 */
export function deriveHint(ui: RoundUiState, interactive: boolean, quarryToLead: boolean): string {
  if (ui.rejection) return ILLEGAL_MOVE_MESSAGE[ui.rejection]
  if (ui.prompt) return 'Choose what the card does'
  if (ui.resolvedTrick) return 'Trick resolved'
  if (quarryToLead) return 'They are choosing their lead'
  // Above `ui.armed` deliberately: a poised plate is the more specific thing to say, and unlike
  // the Cheat and Envenom selections it can legitimately coexist with an armed card, because it
  // does not reinterpret the next hand-card tap.
  if (ui.applyPoised) return APPLY_DAMAGE_POISED_HINT
  if (ui.armed) return `Tap ${cardAccessibleName(ui.armed)} again to play it`
  if (ui.envenomStage) {
    return ui.envenomStage === EnvenomStage.Armed ? ENVENOM_ARMED_HINT : ENVENOM_POISED_HINT
  }
  if (ui.cheatSelection) {
    return ui.cheatSelection.stage === CheatStage.Armed ? CHEAT_ARMED_HINT : CHEAT_POISED_HINT
  }
  if (interactive) return ui.round.currentTrick.length > 0 ? 'Follow their lead' : 'Your lead'
  return ''
}
