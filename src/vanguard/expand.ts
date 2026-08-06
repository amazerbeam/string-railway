import type { PlayerSide } from '../warCouncil'
import { EXPAND_COST, EXPAND_RANGE } from './config'
import { cellKey, isWithinBoard } from './hexGrid'
import { minDistanceToNetwork, ownedCells } from './network'
import { IllegalActionReason, VanguardCellKind } from './types'
import type { HexCoord, VanguardActionResult, VanguardBoard } from './types'

export function applyExpand(
  board: VanguardBoard,
  side: PlayerSide,
  target: HexCoord,
): VanguardActionResult {
  if (!isWithinBoard(target, board.size)) {
    return { ok: false, reason: IllegalActionReason.CellOutOfBounds }
  }

  const existing = board.cells[cellKey(target)]
  if (existing?.kind === VanguardCellKind.Defense) {
    return { ok: false, reason: IllegalActionReason.CellIsDefense }
  }
  if (existing?.kind === VanguardCellKind.Token) {
    return { ok: false, reason: IllegalActionReason.CellOccupied }
  }

  const owned = ownedCells(board, side)
  if (minDistanceToNetwork(target, owned) > EXPAND_RANGE) {
    return { ok: false, reason: IllegalActionReason.OutOfExpandRange }
  }

  return {
    ok: true,
    cost: EXPAND_COST,
    board: {
      ...board,
      cells: {
        ...board.cells,
        [cellKey(target)]: { kind: VanguardCellKind.Token, owner: side, reinforced: 0 },
      },
    },
  }
}
