import type { PlayerSide } from '../warCouncil'
import { allBoardCoords, cellKey, hexBfs, hexDistance } from './hexGrid'
import { VanguardCellKind } from './types'
import type { HexCoord, VanguardBoard } from './types'

export function connectedNetwork(board: VanguardBoard, side: PlayerSide): readonly HexCoord[] {
  const base = board.bases[side]
  return hexBfs(base, board.size, (coord) => {
    const cell = board.cells[cellKey(coord)]
    return cell?.kind === VanguardCellKind.Token && cell.owner === side
  })
}

// Every cell `side` currently owns, regardless of whether it's chain-connected
// to the base — SCRUM-40's reference set for Expand and Overwrite legality.
// connectedNetwork stays the Breach's own, narrower reference set (breach.ts
// is unchanged) — this is a deliberately separate, broader query.
export function ownedCells(board: VanguardBoard, side: PlayerSide): readonly HexCoord[] {
  return allBoardCoords(board.size).filter((coord) => {
    const cell = board.cells[cellKey(coord)]
    return cell?.kind === VanguardCellKind.Token && cell.owner === side
  })
}

export function minDistanceToNetwork(target: HexCoord, network: readonly HexCoord[]): number {
  if (network.length === 0) return Infinity
  return Math.min(...network.map((coord) => hexDistance(target, coord)))
}
