import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { BOARD_SIZE, DEFENSE_CELLS } from '../config'
import { createVanguardBoard } from '../createBoard'
import { cellKey, hexNeighbors, isWithinBoard } from '../hexGrid'
import { connectedNetwork } from '../network'
import { VanguardCellKind } from '../types'

describe('createVanguardBoard', () => {
  const board = createVanguardBoard()
  const centerColumn = Math.floor(BOARD_SIZE / 2)

  it('sizes the board per BOARD_SIZE', () => {
    expect(board.size).toBe(BOARD_SIZE)
  })

  it('places each base at the horizontal center of its own home row, owned by that side', () => {
    expect(board.bases[PlayerSide.Player]).toEqual({ q: centerColumn, r: 0 })
    expect(board.bases[PlayerSide.Cpu]).toEqual({ q: centerColumn, r: BOARD_SIZE - 1 })
    expect(board.cells[cellKey(board.bases[PlayerSide.Player])]).toEqual({
      kind: VanguardCellKind.Token,
      owner: PlayerSide.Player,
      reinforced: 0,
    })
  })

  it('seeds each side with the base plus every on-board hex touching it — count derived from geometry', () => {
    const expectedSize = (base: { q: number; r: number }) =>
      1 + hexNeighbors(base).filter((c) => isWithinBoard(c, BOARD_SIZE)).length
    expect(connectedNetwork(board, PlayerSide.Player)).toHaveLength(
      expectedSize(board.bases[PlayerSide.Player]),
    )
    expect(connectedNetwork(board, PlayerSide.Cpu)).toHaveLength(
      expectedSize(board.bases[PlayerSide.Cpu]),
    )
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

  it('builds a symmetric opening position for both sides — SCRUM-42', () => {
    expect(connectedNetwork(board, PlayerSide.Player)).toHaveLength(
      connectedNetwork(board, PlayerSide.Cpu).length,
    )
  })
})
