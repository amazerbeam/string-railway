import { describe, expect, it } from 'vitest'
import { chooseCpuClashAction } from '../cpuPlayer'
import { applyVanguardAction } from '../applyVanguardAction'
import { createVanguardBoard } from '../createBoard'
import { applyClashAction, startClash } from '../clash'
import { EXPAND_RANGE, MUSTER_BASELINE } from '../config'
import { hexDistance } from '../hexGrid'
import { VanguardActionKind, VanguardCellKind, ClashStatus } from '../types'
import type { CellKey, VanguardBoard, VanguardCell, ClashState } from '../types'
import { PlayerSide } from '../../warCouncil'

const BASES = {
  [PlayerSide.Player]: { q: 0, r: 0 },
  [PlayerSide.Cpu]: { q: 10, r: 10 },
}

function boardWith(cells: Record<CellKey, VanguardCell>): VanguardBoard {
  return { size: 11, bases: BASES, cells }
}

describe('chooseCpuClashAction — prefers a blocking Overwrite over a farther tier-1 Expand', () => {
  it('overwrites the adjacent enemy token directly toward the opponent base', () => {
    // Player network is the single cell (2,2); opponent base is far away at
    // (10,2), directly along the (1,0) hex axis. The enemy token at (3,2) is
    // the one neighbor of (2,2) that sits on that straight line, so it has
    // the lowest hex-distance to (10,2) (7) of any tier-1 candidate — the
    // other five neighbors of (2,2) are all farther (8 or 9). This is worked
    // by hand against hexGrid.ts's actual hexDistance/hexNeighbors, not
    // assumed: a flat (non-tiered) distance ranking would instead pick a
    // distance-2 Expand gap-jump past this token, which is exactly the bug
    // the two-tier design fixes (see plan.md Part 1 -> Assumptions made).
    const board: VanguardBoard = {
      size: 11,
      bases: { [PlayerSide.Player]: { q: 2, r: 2 }, [PlayerSide.Cpu]: { q: 10, r: 2 } },
      cells: {
        '2,2': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '3,2': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      },
    }
    const action = chooseCpuClashAction(board, PlayerSide.Player, 5)
    expect(action).toEqual({ kind: VanguardActionKind.Overwrite, target: { q: 3, r: 2 } })
    const result = applyVanguardAction(board, PlayerSide.Player, action)
    expect(result.ok).toBe(true)
  })
})

describe('chooseCpuClashAction — Expands toward the opponent base when nothing blocks it', () => {
  it('picks a legal tier-1 Expand cell among the network\'s own neighbors', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const action = chooseCpuClashAction(board, PlayerSide.Player, 5)
    expect(action.kind).toBe(VanguardActionKind.Expand)
    const result = applyVanguardAction(board, PlayerSide.Player, action)
    expect(result.ok).toBe(true)
  })
})

describe('chooseCpuClashAction — respects an unaffordable Overwrite', () => {
  it('falls through to Expand when the only blocking Overwrite costs more than the Muster available', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      // (1,0) is a genuine neighbor of (0,0) — distance 1, so it's the sole
      // Overwrite candidate; reinforced:1 makes it cost OVERWRITE_COST_REINFORCED (3).
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 1 },
    })
    const action = chooseCpuClashAction(board, PlayerSide.Player, 2) // can't afford cost-3 Overwrite
    expect(action.kind).toBe(VanguardActionKind.Expand)
  })
})

describe('chooseCpuClashAction — falls back to Reinforce when no advance validates', () => {
  it('reinforces the lowest-cellKey unreinforced own token when Expand/Overwrite are unavailable', () => {
    // A tiny board (size 2) with no room to Expand and no adjacent enemy token.
    const board: VanguardBoard = {
      size: 2,
      bases: { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 1, r: 1 } },
      cells: {
        '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '1,0': { kind: VanguardCellKind.Defense },
        '0,1': { kind: VanguardCellKind.Defense },
        '1,1': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      },
    }
    const action = chooseCpuClashAction(board, PlayerSide.Player, 5)
    expect(action).toEqual({ kind: VanguardActionKind.Reinforce, target: { q: 0, r: 0 } })
  })
})

describe('chooseCpuClashAction — throws on a true dead end', () => {
  it('throws when no Expand, Overwrite, or Reinforce candidate validates', () => {
    const board: VanguardBoard = {
      size: 1,
      bases: { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 0, r: 0 } },
      cells: {
        '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 1 },
      },
    }
    expect(() => chooseCpuClashAction(board, PlayerSide.Player, 5)).toThrow(
      'chooseCpuClashAction: no legal action available for player',
    )
  })
})

describe('chooseCpuClashAction — SCRUM-40: candidates key off every owned cell, not just the connected chain', () => {
  it('expands from a gapped owned island the base-connected chain alone would miss', () => {
    const board: VanguardBoard = {
      size: 11,
      bases: { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 10, r: 10 } },
      cells: {
        '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '5,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      },
    }
    const action = chooseCpuClashAction(board, PlayerSide.Player, 5)
    expect(action.kind).toBe(VanguardActionKind.Expand)
    expect(hexDistance(action.target, { q: 5, r: 0 })).toBeLessThanOrEqual(EXPAND_RANGE)
  })
})

function claimedCellCount(board: VanguardBoard): number {
  return Object.values(board.cells).filter((cell) => cell?.kind === VanguardCellKind.Token).length
}

function runClashRound(board: VanguardBoard, opener: PlayerSide, muster: number): ClashState {
  let state: ClashState = startClash(board, { player: muster, cpu: muster }, opener)
  let guard = 0
  while (state.status === ClashStatus.InProgress) {
    guard += 1
    if (guard > 500) throw new Error('runaway loop — clash round never resolved')
    const side = state.turn
    const action = chooseCpuClashAction(state.board, side, state.muster[side])
    const result = applyClashAction(state, side, action)
    if (!result.ok) throw new Error(`illegal action for ${side}: ${result.reason}`)
    state = result.state
  }
  return state
}

describe('chooseCpuClashAction — seeded multi-round battle simulations (AC4)', () => {
  const seeds = Array.from({ length: 25 }, (_, i) => i + 1)

  it.each(seeds)('runs several Clash rounds with zero illegal actions (seed %i)', (seed) => {
    let board = createVanguardBoard()
    const startingCount = claimedCellCount(board)
    let opener = seed % 2 === 0 ? PlayerSide.Player : PlayerSide.Cpu
    let round = 0

    while (round < 6) {
      round += 1
      const result = runClashRound(board, opener, MUSTER_BASELINE)
      board = result.board
      if (result.status === ClashStatus.Breached) break
      opener = opener === PlayerSide.Player ? PlayerSide.Cpu : PlayerSide.Player
    }

    expect(claimedCellCount(board)).toBeGreaterThan(startingCount)
  })
})
