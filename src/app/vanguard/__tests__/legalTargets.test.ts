import { describe, expect, it } from 'vitest'
import {
  VanguardActionKind,
  VanguardCellKind,
  allBoardCoords,
  applyVanguardAction,
  cellKey,
} from '../../../vanguard'
import { PlayerSide } from '../../../warCouncil'
import { allLegalTargets, inferActionKind, legalTargetsFor } from '../legalTargets'
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
    expect(targets.has(cellKey({ q: 1, r: 2 }))).toBe(true)
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

describe('inferActionKind', () => {
  it('infers Expand for an empty cell', () => {
    expect(inferActionKind(undefined, PlayerSide.Player)).toBe(VanguardActionKind.Expand)
  })

  it('infers Expand for a defense cell, so the engine reports CellIsDefense rather than a client guess', () => {
    expect(inferActionKind({ kind: VanguardCellKind.Defense }, PlayerSide.Player)).toBe(
      VanguardActionKind.Expand,
    )
  })

  it('infers Reinforce for the side’s own token, even at the reinforcement cap', () => {
    const cell = { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 1 } as const
    expect(inferActionKind(cell, PlayerSide.Player)).toBe(VanguardActionKind.Reinforce)
  })

  it('infers Overwrite for an enemy token', () => {
    const cell = { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 } as const
    expect(inferActionKind(cell, PlayerSide.Player)).toBe(VanguardActionKind.Overwrite)
  })
})

describe('allLegalTargets', () => {
  it('unions every action kind’s legal targets with no duplication', () => {
    const byAction = {
      [VanguardActionKind.Expand]: new Set(['2,0']),
      [VanguardActionKind.Overwrite]: new Set(['2,1']),
      [VanguardActionKind.Reinforce]: new Set(['0,0', '2,0']),
    }
    expect(allLegalTargets(byAction)).toEqual(new Set(['2,0', '2,1', '0,0']))
  })

  it('agrees with the union of legalTargetsFor’s own per-kind sets on a real board — SCRUM-41', () => {
    const muster = 9
    const byAction = {
      [VanguardActionKind.Expand]: legalTargetsFor(
        board,
        PlayerSide.Player,
        VanguardActionKind.Expand,
        muster,
      ),
      [VanguardActionKind.Overwrite]: legalTargetsFor(
        board,
        PlayerSide.Player,
        VanguardActionKind.Overwrite,
        muster,
      ),
      [VanguardActionKind.Reinforce]: legalTargetsFor(
        board,
        PlayerSide.Player,
        VanguardActionKind.Reinforce,
        muster,
      ),
    }
    const union = allLegalTargets(byAction)
    for (const target of allBoardCoords(board.size)) {
      const inferred = inferActionKind(board.cells[cellKey(target)], PlayerSide.Player)
      const engine = applyVanguardAction(board, PlayerSide.Player, { kind: inferred, target })
      const engineAllows = engine.ok && engine.cost <= muster
      expect(union.has(cellKey(target))).toBe(engineAllows)
    }
  })
})
