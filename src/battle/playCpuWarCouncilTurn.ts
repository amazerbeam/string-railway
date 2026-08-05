import { currentTurn, PlayerSide, chooseCpuMove } from '../warCouncil'
import { BattlePhase } from './battlePhase'
import { BattleRejectionReason } from './battleAction'
import type { BattleActionResult } from './battleAction'
import type { BattleState } from './battleState'
import { submitWarCouncilCard } from './submitWarCouncilCard'

export function playCpuWarCouncilTurn(state: BattleState): BattleActionResult {
  if (state.phase !== BattlePhase.WarCouncilRound) {
    return { ok: false, reason: BattleRejectionReason.NotWarCouncilPhase }
  }
  if (currentTurn(state.warCouncil) !== PlayerSide.Cpu) {
    return { ok: false, reason: BattleRejectionReason.NotCpuTurn }
  }
  const move = chooseCpuMove(state.warCouncil, PlayerSide.Cpu)
  return submitWarCouncilCard(state, PlayerSide.Cpu, move.card, move.choice)
}
