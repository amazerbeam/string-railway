import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { applyVanguardAction } from '../applyVanguardAction'
import { EXPAND_COST, OVERWRITE_COST, REINFORCE_COST } from '../config'
import { VanguardActionKind, VanguardCellKind } from '../types'
import { boardWith } from './testBoard'

describe('applyVanguardAction', () => {
  it('dispatches an Expand action to applyExpand', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const result = applyVanguardAction(board, PlayerSide.Player, {
      kind: VanguardActionKind.Expand,
      target: { q: 1, r: 0 },
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.cost).toBe(EXPAND_COST)
  })

  it('dispatches an Overwrite action to applyOverwrite', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    const result = applyVanguardAction(board, PlayerSide.Player, {
      kind: VanguardActionKind.Overwrite,
      target: { q: 1, r: 0 },
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.cost).toBe(OVERWRITE_COST)
  })

  it('dispatches a Reinforce action to applyReinforce', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const result = applyVanguardAction(board, PlayerSide.Player, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 0, r: 0 },
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.cost).toBe(REINFORCE_COST)
  })
})
