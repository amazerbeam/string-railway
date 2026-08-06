import { describe, expect, it } from 'vitest'
import { ClashStatus, IllegalActionReason, cellKey } from '../../../vanguard'
import { PlayerSide } from '../../../warCouncil'
import { createMatchUiState, matchReducer, MatchActionKind } from '../matchReducer'
import { makeBoard } from './boardFixture'

const start = () => createMatchUiState(makeBoard())
// 9 tricks scores 6 points against 4 tricks' 1 point, so the player takes the
// bonus. Do NOT use 10 here: tricksToPoints returns 0 for 10+ ("winning too
// much loses"), which hands the bonus to the CPU instead.
const musterReady = (player: number) =>
  ({
    kind: MatchActionKind.MusterReady,
    tricks: { [PlayerSide.Player]: player, [PlayerSide.Cpu]: 13 - player },
  }) as const

describe('createMatchUiState', () => {
  it('starts at round 1 with no clash and nothing at fault', () => {
    const ui = start()
    expect(ui.round).toBe(1)
    expect(ui.clash).toBeNull()
    expect(ui.fault).toBeNull()
  })
})

describe('MusterReady', () => {
  it('rejects an impossible trick split as a fault rather than scoring it', () => {
    const ui = matchReducer(start(), {
      kind: MatchActionKind.MusterReady,
      tricks: { [PlayerSide.Player]: 10, [PlayerSide.Cpu]: 10 },
    })
    expect(ui.fault).toEqual({ kind: 'invalidTricks' })
    expect(ui.clash).toBeNull()
  })

  it('opens the clash with a Muster for both sides', () => {
    const ui = matchReducer(start(), musterReady(9))
    expect(ui.clash).not.toBeNull()
    expect(ui.clash?.muster[PlayerSide.Player]).toBeGreaterThan(0)
    expect(ui.clash?.muster[PlayerSide.Cpu]).toBeGreaterThan(0)
  })

  it('hands the turn back to the player after the opening side has moved', () => {
    const ui = matchReducer(start(), musterReady(9))
    expect(ui.clash?.status).toBe(ClashStatus.InProgress)
    if (ui.clash?.status === ClashStatus.InProgress) {
      expect(ui.clash.turn).toBe(PlayerSide.Player)
    }
  })
})

describe('TapCell — SCRUM-41: the action is inferred from the tapped cell, no arming step', () => {
  const started = () => matchReducer(start(), musterReady(9))

  it('infers Reinforce for the player’s own unreinforced token and commits it', () => {
    const ui = started()
    const before = ui.clash?.muster[PlayerSide.Player] ?? 0
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 0, r: 0 } })
    expect(next.rejection).toBeNull()
    expect(next.clash?.muster[PlayerSide.Player]).toBeLessThan(before)
    expect(next.clash?.board.cells[cellKey({ q: 0, r: 0 })]).toMatchObject({ reinforced: 1 })
  })

  it('infers Overwrite for an adjacent enemy token and commits it', () => {
    const ui = started()
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 1, r: 2 } })
    expect(next.rejection).toBeNull()
    expect(next.clash?.board.cells[cellKey({ q: 1, r: 2 })]).toMatchObject({
      owner: PlayerSide.Player,
    })
  })

  it('infers Expand for an empty cell in range and commits it', () => {
    const ui = started()
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 2, r: 0 } })
    expect(next.rejection).toBeNull()
    expect(next.clash?.board.cells[cellKey({ q: 2, r: 0 })]).toMatchObject({
      owner: PlayerSide.Player,
    })
  })

  it('names the engine’s own reason on an illegal target and leaves the board untouched', () => {
    const ui = started()
    const boardBefore = ui.clash?.board
    // (2,2) is a permanent defense — inferActionKind infers Expand, and
    // applyExpand's own CellIsDefense check is what rejects it.
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 2, r: 2 } })
    expect(next.rejection).toBe(IllegalActionReason.CellIsDefense)
    expect(next.clash?.board).toBe(boardBefore)
  })

  it('rejects a tap on an already-reinforced own token with the engine’s own cap reason', () => {
    const ui = started()
    // (1,1) is the fixture's already-reinforced player token.
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 1, r: 1 } })
    expect(next.rejection).toBe(IllegalActionReason.ReinforcementCapReached)
  })

  it('ignores a tap when there is no clash in progress', () => {
    const noClash = start()
    const next = matchReducer(noClash, { kind: MatchActionKind.TapCell, target: { q: 0, r: 0 } })
    expect(next).toBe(noClash)
  })
})

describe('ClearRejection', () => {
  it('clears a rejection without touching the clash', () => {
    const ui = matchReducer(start(), musterReady(9))
    const rejected = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 2, r: 2 } })
    expect(rejected.rejection).not.toBeNull()
    const cleared = matchReducer(rejected, { kind: MatchActionKind.ClearRejection })
    expect(cleared.rejection).toBeNull()
    expect(cleared.clash).toBe(rejected.clash)
  })
})

describe('rounds', () => {
  it('carries the board forward and clears the clash on NextRound', () => {
    const ui = matchReducer(start(), musterReady(9))
    const board = ui.clash?.board
    const next = matchReducer(ui, { kind: MatchActionKind.NextRound })
    expect(next.round).toBe(2)
    expect(next.clash).toBeNull()
    expect(next.board).toBe(board)
  })
})
