import { chooseCpuClashAction, ClashStatus } from '../vanguard'
import { PlayerSide } from '../warCouncil'
import { BattlePhase } from './battlePhase'
import { BattleRejectionReason } from './battleAction'
import type { BattleActionResult } from './battleAction'
import type { BattleState } from './battleState'
import { submitClashAction } from './submitClashAction'

export function playCpuClashTurn(state: BattleState, rng: () => number): BattleActionResult {
  if (state.phase !== BattlePhase.Clash) {
    return { ok: false, reason: BattleRejectionReason.NotClashPhase }
  }
  if (state.clash.status !== ClashStatus.InProgress || state.clash.turn !== PlayerSide.Cpu) {
    return { ok: false, reason: BattleRejectionReason.NotCpuTurn }
  }
  const action = chooseCpuClashAction(state.clash.board, PlayerSide.Cpu, state.clash.muster[PlayerSide.Cpu])
  return submitClashAction(state, PlayerSide.Cpu, action, rng)
}
