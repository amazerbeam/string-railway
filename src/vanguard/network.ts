import type { PlayerSide } from '../warCouncil'
import { cellKey, hexBfs, hexDistance } from './hexGrid'
import { VanguardCellKind } from './types'
import type { HexCoord, VanguardBoard } from './types'

export function connectedNetwork(board: VanguardBoard, side: PlayerSide): readonly HexCoord[] {
  const base = board.bases[side]
  return hexBfs(base, board.size, (coord) => {
    const cell = board.cells[cellKey(coord)]
    return cell?.kind === VanguardCellKind.Token && cell.owner === side
  })
}

export function minDistanceToNetwork(target: HexCoord, network: readonly HexCoord[]): number {
  if (network.length === 0) return Infinity
  return Math.min(...network.map((coord) => hexDistance(target, coord)))
}
