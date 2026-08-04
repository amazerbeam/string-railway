import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { OVERWRITE_COST, OVERWRITE_COST_REINFORCED } from '../config'
import { applyOverwrite } from '../overwrite'
import { IllegalActionReason, VanguardCellKind } from '../types'
import { boardWith } from './testBoard'

describe('applyOverwrite', () => {
  it('is legal adjacent to the network, costs OVERWRITE_COST against an unreinforced token', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    const result = applyOverwrite(board, PlayerSide.Player, { q: 1, r: 0 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.cost).toBe(OVERWRITE_COST)
      expect(result.board.cells['1,0']).toEqual({
        kind: VanguardCellKind.Token,
        owner: PlayerSide.Player,
        reinforced: 0,
      })
    }
  })

  it('costs OVERWRITE_COST_REINFORCED against a reinforced enemy token', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 1 },
    })
    const result = applyOverwrite(board, PlayerSide.Player, { q: 1, r: 0 })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.cost).toBe(OVERWRITE_COST_REINFORCED)
  })

  it('is illegal across a 1-cell gap (distance 2) — no gap allowed for Overwrite', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '2,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    expect(applyOverwrite(board, PlayerSide.Player, { q: 2, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.NotAdjacentToNetwork,
    })
  })

  it('is illegal against an empty cell or one already owned by the acting side', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    expect(applyOverwrite(board, PlayerSide.Player, { q: 0, r: 1 })).toEqual({
      ok: false,
      reason: IllegalActionReason.TargetNotEnemyToken,
    })
    expect(applyOverwrite(board, PlayerSide.Player, { q: 1, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.TargetNotEnemyToken,
    })
  })

  it('is illegal outside the board', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    expect(applyOverwrite(board, PlayerSide.Player, { q: -1, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.CellOutOfBounds,
    })
  })
})
