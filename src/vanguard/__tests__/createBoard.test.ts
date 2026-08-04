import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { BOARD_SIZE, DEFENSE_CELLS, STARTING_CLUSTER_SIZE } from '../config'
import { createVanguardBoard } from '../createBoard'
import { cellKey } from '../hexGrid'
import { connectedNetwork } from '../network'
import { VanguardCellKind } from '../types'

describe('createVanguardBoard', () => {
  const board = createVanguardBoard()

  it('sizes the board per BOARD_SIZE', () => {
    expect(board.size).toBe(BOARD_SIZE)
  })

  it('places each base in its configured corner, owned by that side', () => {
    expect(board.bases[PlayerSide.Player]).toEqual({ q: 0, r: 0 })
    expect(board.bases[PlayerSide.Cpu]).toEqual({ q: BOARD_SIZE - 1, r: BOARD_SIZE - 1 })
    expect(board.cells[cellKey(board.bases[PlayerSide.Player])]).toEqual({
      kind: VanguardCellKind.Token,
      owner: PlayerSide.Player,
      reinforced: 0,
    })
  })

  it('seeds each side with exactly STARTING_CLUSTER_SIZE chain-connected tokens', () => {
    expect(connectedNetwork(board, PlayerSide.Player)).toHaveLength(STARTING_CLUSTER_SIZE)
    expect(connectedNetwork(board, PlayerSide.Cpu)).toHaveLength(STARTING_CLUSTER_SIZE)
  })

  it('marks every configured defense cell', () => {
    for (const coord of DEFENSE_CELLS) {
      expect(board.cells[cellKey(coord)]).toEqual({ kind: VanguardCellKind.Defense })
    }
  })

  it('never overlaps a defense cell with either starting cluster', () => {
    const playerNetwork = connectedNetwork(board, PlayerSide.Player).map(cellKey)
    const cpuNetwork = connectedNetwork(board, PlayerSide.Cpu).map(cellKey)
    const defenseKeys = DEFENSE_CELLS.map(cellKey)
    for (const key of [...playerNetwork, ...cpuNetwork]) {
      expect(defenseKeys).not.toContain(key)
    }
  })
})
