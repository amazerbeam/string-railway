import { describe, expect, it } from 'vitest'
import { VanguardActionKind, allBoardCoords, applyVanguardAction, cellKey } from '../../../vanguard'
import { PlayerSide } from '../../../warCouncil'
import { legalTargetsFor } from '../legalTargets'
import { makeBoard } from './boardFixture'

const board = makeBoard()

describe('legalTargetsFor', () => {
  it('offers no target when nothing is affordable', () => {
    expect(legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Expand, 0).size).toBe(0)
  })

  it('offers no target for a non-finite Muster', () => {
    expect(
      legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Expand, Number.NaN).size,
    ).toBe(0)
  })

  it('never offers a defense cell to Expand', () => {
    const targets = legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Expand, 9)
    expect(targets.has(cellKey({ q: 2, r: 2 }))).toBe(false)
  })

  it('offers the adjacent enemy token to Overwrite', () => {
    const targets = legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Overwrite, 9)
    expect(targets.has(cellKey({ q: 2, r: 1 }))).toBe(true)
  })

  it('offers only unreinforced own tokens to Reinforce', () => {
    const targets = legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Reinforce, 9)
    expect(targets.has(cellKey({ q: 0, r: 0 }))).toBe(true)
    expect(targets.has(cellKey({ q: 1, r: 1 }))).toBe(false)
  })

  it('agrees with the engine on every coordinate, for every action kind', () => {
    const muster = 9
    for (const kind of Object.values(VanguardActionKind)) {
      const targets = legalTargetsFor(board, PlayerSide.Player, kind, muster)
      for (const target of allBoardCoords(board.size)) {
        const engine = applyVanguardAction(board, PlayerSide.Player, { kind, target })
        const engineAllows = engine.ok && engine.cost <= muster
        expect(targets.has(cellKey(target))).toBe(engineAllows)
      }
    }
  })
})
