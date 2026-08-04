import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { REINFORCE_COST } from '../config'
import { applyReinforce } from '../reinforce'
import { IllegalActionReason, VanguardCellKind } from '../types'
import { boardWith } from './testBoard'

describe('applyReinforce', () => {
  it('reinforces an unreinforced own token for REINFORCE_COST', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const result = applyReinforce(board, PlayerSide.Player, { q: 0, r: 0 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.cost).toBe(REINFORCE_COST)
      expect(result.board.cells['0,0']).toEqual({
        kind: VanguardCellKind.Token,
        owner: PlayerSide.Player,
        reinforced: 1,
      })
    }
  })

  it('does not stack past the +1 cap', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 1 },
    })
    expect(applyReinforce(board, PlayerSide.Player, { q: 0, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.ReinforcementCapReached,
    })
  })

  it('is illegal on a cell the acting side does not own', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    expect(applyReinforce(board, PlayerSide.Player, { q: 0, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.TargetNotOwnToken,
    })
  })

  it('is illegal on an empty cell', () => {
    expect(applyReinforce(boardWith({}), PlayerSide.Player, { q: 0, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.TargetNotOwnToken,
    })
  })

  it('is illegal outside the board', () => {
    expect(applyReinforce(boardWith({}), PlayerSide.Player, { q: -1, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.CellOutOfBounds,
    })
  })
})
