import { playCard, RoundPhase } from '../warCouncil'
import type { AbilityChoice, Card, PlayerSide } from '../warCouncil'
import { BattlePhase } from './battlePhase'
import { BattleRejectionReason } from './battleAction'
import type { BattleActionResult } from './battleAction'
import type { BattleState } from './battleState'

export function submitWarCouncilCard(
  state: BattleState,
  side: PlayerSide,
  card: Card,
  choice?: AbilityChoice,
): BattleActionResult {
  if (state.phase !== BattlePhase.WarCouncilRound) {
    return { ok: false, reason: BattleRejectionReason.NotWarCouncilPhase }
  }

  const result = playCard(state.warCouncil, side, card, choice)
  if (!result.ok) {
    return { ok: false, reason: result.reason }
  }

  if (result.state.phase === RoundPhase.Complete) {
    return {
      ok: true,
      state: { ...state, phase: BattlePhase.MusterConversion, warCouncil: result.state },
    }
  }

  return { ok: true, state: { ...state, warCouncil: result.state } }
}
