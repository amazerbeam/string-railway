import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { EXPAND_COST } from '../config'
import { applyExpand } from '../expand'
import { IllegalActionReason, VanguardCellKind } from '../types'
import { boardWith } from './testBoard'

const NETWORK_BOARD = boardWith({
  '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
})

describe('applyExpand', () => {
  it('is legal exactly 2 hex-spaces from the network (a 1-cell gap)', () => {
    const result = applyExpand(NETWORK_BOARD, PlayerSide.Player, { q: 2, r: 0 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.cost).toBe(EXPAND_COST)
      expect(result.board.cells['2,0']).toEqual({
        kind: VanguardCellKind.Token,
        owner: PlayerSide.Player,
        reinforced: 0,
      })
    }
  })

  it('is illegal exactly 3 hex-spaces from the network', () => {
    const result = applyExpand(NETWORK_BOARD, PlayerSide.Player, { q: 3, r: 0 })
    expect(result).toEqual({ ok: false, reason: IllegalActionReason.OutOfExpandRange })
  })

  it('is illegal onto an already-occupied cell', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    expect(applyExpand(board, PlayerSide.Player, { q: 1, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.CellOccupied,
    })
  })

  it('is illegal onto a defense cell', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Defense },
    })
    expect(applyExpand(board, PlayerSide.Player, { q: 1, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.CellIsDefense,
    })
  })

  it('is illegal outside the board', () => {
    expect(applyExpand(NETWORK_BOARD, PlayerSide.Player, { q: -1, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.CellOutOfBounds,
    })
  })

  it('never mutates the input board', () => {
    const before = JSON.stringify(NETWORK_BOARD)
    applyExpand(NETWORK_BOARD, PlayerSide.Player, { q: 1, r: 0 })
    expect(JSON.stringify(NETWORK_BOARD)).toBe(before)
  })
})
