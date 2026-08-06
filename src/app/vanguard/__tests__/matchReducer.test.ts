import { describe, expect, it } from 'vitest'
import { ClashStatus, IllegalActionReason, VanguardActionKind, cellKey } from '../../../vanguard'
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
  it('starts at round 1 with no clash and nothing armed', () => {
    const ui = start()
    expect(ui.round).toBe(1)
    expect(ui.clash).toBeNull()
    expect(ui.selectedAction).toBeNull()
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

describe('the player’s turn', () => {
  const armed = () => {
    const ui = matchReducer(start(), musterReady(9))
    return matchReducer(ui, {
      kind: MatchActionKind.SelectAction,
      action: VanguardActionKind.Reinforce,
    })
  }

  it('ignores a tap with no action selected', () => {
    const ui = matchReducer(start(), musterReady(9))
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 0, r: 0 } })
    expect(next).toBe(ui)
  })

  it('commits a legal action and spends Muster', () => {
    const ui = armed()
    const before = ui.clash?.muster[PlayerSide.Player] ?? 0
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 0, r: 0 } })
    expect(next.rejection).toBeNull()
    expect(next.clash?.muster[PlayerSide.Player]).toBeLessThan(before)
    expect(next.clash?.board.cells[cellKey({ q: 0, r: 0 })]).toMatchObject({ reinforced: 1 })
  })

  it('names the engine’s own reason on an illegal target and leaves the board untouched', () => {
    const ui = armed()
    const boardBefore = ui.clash?.board
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 2, r: 2 } })
    expect(next.rejection).toBe(IllegalActionReason.TargetNotOwnToken)
    expect(next.clash?.board).toBe(boardBefore)
  })

  it('clears a rejection when a new action is selected', () => {
    const ui = armed()
    const rejected = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 2, r: 2 } })
    expect(rejected.rejection).not.toBeNull()
    const reselected = matchReducer(rejected, {
      kind: MatchActionKind.SelectAction,
      action: VanguardActionKind.Expand,
    })
    expect(reselected.rejection).toBeNull()
  })

  it('keeps the action armed after a successful submission', () => {
    const ui = armed()
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 0, r: 0 } })
    expect(next.selectedAction).toBe(VanguardActionKind.Reinforce)
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
