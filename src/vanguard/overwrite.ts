import type { PlayerSide } from '../warCouncil'
import { OVERWRITE_COST, OVERWRITE_COST_REINFORCED } from './config'
import { cellKey, isWithinBoard } from './hexGrid'
import { connectedNetwork, minDistanceToNetwork } from './network'
import { IllegalActionReason, VanguardCellKind } from './types'
import type { HexCoord, VanguardActionResult, VanguardBoard } from './types'

// The Overwrite Muster cost for a token with the given reinforced stack —
// the single source of truth for the tiered cost, shared with any caller
// (e.g. the CPU heuristic) that needs to price a target before attempting
// the action itself.
export function overwriteCostFor(reinforced: number): number {
  return reinforced > 0 ? OVERWRITE_COST_REINFORCED : OVERWRITE_COST
}

export function applyOverwrite(
  board: VanguardBoard,
  side: PlayerSide,
  target: HexCoord,
): VanguardActionResult {
  if (!isWithinBoard(target, board.size)) {
    return { ok: false, reason: IllegalActionReason.CellOutOfBounds }
  }

  const existing = board.cells[cellKey(target)]
  if (existing?.kind !== VanguardCellKind.Token || existing.owner === side) {
    return { ok: false, reason: IllegalActionReason.TargetNotEnemyToken }
  }

  const network = connectedNetwork(board, side)
  if (minDistanceToNetwork(target, network) > 1) {
    return { ok: false, reason: IllegalActionReason.NotAdjacentToNetwork }
  }

  const cost = overwriteCostFor(existing.reinforced)
  return {
    ok: true,
    cost,
    board: {
      ...board,
      cells: {
        ...board.cells,
        [cellKey(target)]: { kind: VanguardCellKind.Token, owner: side, reinforced: 0 },
      },
    },
  }
}
