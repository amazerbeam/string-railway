import { PlayerSide } from '../warCouncil'
import { DEFENSE_CELLS, BOARD_SIZE } from './config'
import { cellKey, hexNeighbors, isWithinBoard } from './hexGrid'
import { VanguardCellKind } from './types'
import type { CellKey, HexCoord, VanguardBoard, VanguardCell } from './types'

export function createVanguardBoard(): VanguardBoard {
  const centerColumn = Math.floor(BOARD_SIZE / 2)
  const bases: Record<PlayerSide, HexCoord> = {
    [PlayerSide.Player]: { q: centerColumn, r: 0 },
    [PlayerSide.Cpu]: { q: centerColumn, r: BOARD_SIZE - 1 },
  }

  const cells: Record<CellKey, VanguardCell> = {}
  for (const coord of DEFENSE_CELLS) {
    cells[cellKey(coord)] = { kind: VanguardCellKind.Defense }
  }

  for (const side of [PlayerSide.Player, PlayerSide.Cpu] as const) {
    const base = bases[side]
    // The starting cluster is definitionally the base plus every on-board hex
    // touching it — derived from hex geometry and the base's own position,
    // never a chosen size (SCRUM-42). The occupied-cell filter mirrors the
    // guard the removed hexBfs's own canEnter predicate provided, so a
    // cluster can never overlap a defense cell or the other side's cluster.
    const cluster = [base, ...hexNeighbors(base)].filter(
      (coord) => isWithinBoard(coord, BOARD_SIZE) && cells[cellKey(coord)] === undefined,
    )

    for (const coord of cluster) {
      cells[cellKey(coord)] = { kind: VanguardCellKind.Token, owner: side, reinforced: 0 }
    }
  }

  return { size: BOARD_SIZE, bases, cells }
}
