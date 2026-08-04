import { dealRound, otherSide } from '../warCouncil'
import type { PlayerSide } from '../warCouncil'
import { applyClashAction, ClashStatus } from '../vanguard'
import type { VanguardAction } from '../vanguard'
import { BattlePhase } from './battlePhase'
import { BattleRejectionReason } from './battleAction'
import type { BattleActionResult } from './battleAction'
import type { BattleState } from './battleState'

export function submitClashAction(
  state: BattleState,
  side: PlayerSide,
  action: VanguardAction,
  rng: () => number,
): BattleActionResult {
  if (state.phase !== BattlePhase.Clash) {
    return { ok: false, reason: BattleRejectionReason.NotClashPhase }
  }

  const result = applyClashAction(state.clash, side, action)
  if (!result.ok) {
    return { ok: false, reason: result.reason }
  }

  if (result.state.status === ClashStatus.Breached) {
    return {
      ok: true,
      state: {
        phase: BattlePhase.Resolved,
        round: state.round,
        vanguard: result.state.board,
        winner: result.state.winner,
      },
    }
  }

  if (result.state.status === ClashStatus.Complete) {
    const round = state.round + 1
    const dealer = otherSide(state.dealer)
    return {
      ok: true,
      state: {
        phase: BattlePhase.WarCouncilRound,
        round,
        dealer,
        vanguard: result.state.board,
        warCouncil: dealRound(dealer, rng),
      },
    }
  }

  return { ok: true, state: { ...state, clash: result.state } }
}
