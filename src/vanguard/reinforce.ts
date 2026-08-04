import type { PlayerSide } from '../warCouncil'
import { REINFORCE_COST, REINFORCE_MAX_STACK } from './config'
import { cellKey, isWithinBoard } from './hexGrid'
import { IllegalActionReason, VanguardCellKind } from './types'
import type { HexCoord, VanguardActionResult, VanguardBoard } from './types'

export function applyReinforce(
  board: VanguardBoard,
  side: PlayerSide,
  target: HexCoord,
): VanguardActionResult {
  if (!isWithinBoard(target, board.size)) {
    return { ok: false, reason: IllegalActionReason.CellOutOfBounds }
  }

  const existing = board.cells[cellKey(target)]
  if (existing?.kind !== VanguardCellKind.Token || existing.owner !== side) {
    return { ok: false, reason: IllegalActionReason.TargetNotOwnToken }
  }
  if (existing.reinforced >= REINFORCE_MAX_STACK) {
    return { ok: false, reason: IllegalActionReason.ReinforcementCapReached }
  }

  return {
    ok: true,
    cost: REINFORCE_COST,
    board: {
      ...board,
      cells: {
        ...board.cells,
        [cellKey(target)]: { ...existing, reinforced: existing.reinforced + 1 },
      },
    },
  }
}
