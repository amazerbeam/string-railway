import { otherSide, type PlayerSide } from '../warCouncil'
import { OVERWRITE_COST, OVERWRITE_COST_REINFORCED } from './config'
import { cellKey, isWithinBoard } from './hexGrid'
import { connectedNetwork, minDistanceToNetwork, ownedCells } from './network'
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

  // Capturing the enemy base is an ordinary Overwrite target, but must come from
  // the mover's chain-connected network, not merely any owned cell. ownedCells
  // (SCRUM-40's broader, gap-tolerant set, used for every other target) would let
  // a single disconnected outpost capture a base for a fraction of the Muster a
  // real Breach costs — connectedNetwork's own BFS starts at the base and returns
  // [] outright the instant that cell stops being owned by its side (hexGrid's
  // hexBfs gates entry on the start cell itself), so a captured base would zero
  // the victim's entire connectivity query regardless of how much of the rest of
  // the board they still hold. Every other Overwrite target keeps the original,
  // gap-tolerant ownedCells reach.
  const isEnemyBase = cellKey(target) === cellKey(board.bases[otherSide(side)])
  const owned = isEnemyBase ? connectedNetwork(board, side) : ownedCells(board, side)
  if (minDistanceToNetwork(target, owned) > 1) {
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
