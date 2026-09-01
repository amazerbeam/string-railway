import { DuelSide } from '../../hunt'
import type { RoundUiState } from './roundUiState'

/**
 * DLR-155 — extracted from `WarCouncilRound.tsx` (it stood at 402 of its 400-line budget) so the
 * round mount stays under budget without losing the derivation's own reasoning.
 *
 * This hand's own tally, as the delta against the encounter the round component was mounted with.
 * Both sides of the subtraction come from the reducer: `ui.openingEncounter` is frozen at mount,
 * `ui.encounter` moves on every trick that cashes or hits — so the difference is exactly what this
 * hand did.
 *
 * The baseline is deliberately NOT the `encounter` prop. On the hand that ends the encounter,
 * `handleCarryOn` calls `onComplete`, and `App` sets its own encounter and returns early without
 * changing the `key` that would remount this component — so the prop turns into the live value
 * while the terminal panel is still on screen, and a prop-based delta reads 0 for a hand that
 * plainly did damage.
 */
export function handSummaryFor(ui: RoundUiState) {
  return {
    healthLost: ui.openingEncounter.health[DuelSide.Player] - ui.encounter.health[DuelSide.Player],
    dealtToQuarry:
      ui.openingEncounter.health[DuelSide.Quarry] - ui.encounter.health[DuelSide.Quarry],
  }
}
