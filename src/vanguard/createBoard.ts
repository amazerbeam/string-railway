import { PlayerSide } from '../warCouncil'
import { DEFENSE_CELLS, BOARD_SIZE, STARTING_CLUSTER_SIZE } from './config'
import { cellKey, hexBfs } from './hexGrid'
import { VanguardCellKind } from './types'
import type { CellKey, HexCoord, VanguardBoard, VanguardCell } from './types'

export function createVanguardBoard(): VanguardBoard {
  const bases: Record<PlayerSide, HexCoord> = {
    [PlayerSide.Player]: { q: 0, r: 0 },
    [PlayerSide.Cpu]: { q: BOARD_SIZE - 1, r: BOARD_SIZE - 1 },
  }

  const cells: Record<CellKey, VanguardCell> = {}
  for (const coord of DEFENSE_CELLS) {
    cells[cellKey(coord)] = { kind: VanguardCellKind.Defense }
  }

  for (const side of [PlayerSide.Player, PlayerSide.Cpu] as const) {
    const cluster = hexBfs(
      bases[side],
      BOARD_SIZE,
      (coord) => cells[cellKey(coord)] === undefined,
    ).slice(0, STARTING_CLUSTER_SIZE)

    for (const coord of cluster) {
      cells[cellKey(coord)] = { kind: VanguardCellKind.Token, owner: side, reinforced: 0 }
    }
  }

  return { size: BOARD_SIZE, bases, cells }
}
