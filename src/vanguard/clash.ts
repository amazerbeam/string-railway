import { PlayerSide, otherSide } from '../warCouncil'
import { applyVanguardAction } from './applyVanguardAction'
import { hasReachedBreach } from './breach'
import { ClashRejectionReason, ClashStatus } from './types'
import type { ClashActionResult, ClashState, Muster, VanguardAction, VanguardBoard } from './types'

export function startClash(
  board: VanguardBoard,
  muster: Muster,
  openingSide: PlayerSide,
): ClashState {
  return { status: ClashStatus.InProgress, board, muster, turn: openingSide }
}

export function applyClashAction(
  state: ClashState,
  side: PlayerSide,
  action: VanguardAction,
): ClashActionResult {
  if (state.status !== ClashStatus.InProgress) {
    return { ok: false, reason: ClashRejectionReason.ClashAlreadyResolved }
  }
  if (side !== state.turn) {
    return { ok: false, reason: ClashRejectionReason.NotYourTurn }
  }

  const result = applyVanguardAction(state.board, side, action)
  if (!result.ok) {
    return { ok: false, reason: result.reason }
  }
  if (!Number.isFinite(state.muster[side]) || result.cost > state.muster[side]) {
    return { ok: false, reason: ClashRejectionReason.InsufficientMuster }
  }

  const muster: Muster = { ...state.muster, [side]: state.muster[side] - result.cost }
  const board = result.board

  if (hasReachedBreach(board, side)) {
    return { ok: true, state: { status: ClashStatus.Breached, board, muster, winner: side } }
  }

  const playerHasMoves = muster.player > 0
  const cpuHasMoves = muster.cpu > 0

  if (playerHasMoves && cpuHasMoves) {
    return {
      ok: true,
      state: { status: ClashStatus.InProgress, board, muster, turn: otherSide(side) },
    }
  }
  if (!playerHasMoves && !cpuHasMoves) {
    return { ok: true, state: { status: ClashStatus.Complete, board, muster } }
  }

  const leftoverSide = playerHasMoves ? PlayerSide.Player : PlayerSide.Cpu
  return { ok: true, state: { status: ClashStatus.InProgress, board, muster, turn: leftoverSide } }
}
