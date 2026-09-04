import type { WarCouncilRoundResult } from '../warCouncilMount'
import type { RoundUiState } from './roundUiState'

/** THE statement of what a finished hand hands back. Extracted from `WarCouncilRound.tsx`'s two
 *  identical literals (DLR-150 — that file stood at 415 of its 400-line budget) and adopted by
 *  `src/sim/playHand.ts`, which held a third hand-built copy. Three construction sites become one,
 *  so a field added to the result can no longer reach the felt and miss the simulator. */
export function roundResultFor(ui: RoundUiState): WarCouncilRoundResult {
  return {
    finalState: ui.round,
    encounter: ui.encounter,
    discardsRemaining: ui.discardsRemaining,
    buffs: ui.buffs,
    unplayedAtResolve: ui.unplayedAtResolve,
    coinsEarned: ui.buffHand.coinsEarned,
    lowCarry: ui.buffHand.accrual.carryOut,
    // DLR-156 AC8 — the streak after this hand, read straight off the felt's own running figures.
    streak: { total: ui.round.total, roll: ui.round.roll },
    // DLR-163 AC5/AC8 — the two per-fight figures, handed back so the run carries them into the
    // next hand of this fight and `advanceRun` wipes them at the fight boundary.
    discardCapBonus: ui.discardCapBonus,
    treasureDamageBonus: ui.treasureDamageBonus,
  }
}
