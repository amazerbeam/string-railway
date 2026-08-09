// src/app/vanguard/__tests__/clashHud.test.ts
import { describe, expect, it } from 'vitest'
import { ClashStatus, IllegalActionReason, type ClashState } from '../../../vanguard'
import { PlayerSide } from '../../../warCouncil'
import { createMatchUiState } from '../matchReducer'
import { REJECTION_MESSAGE } from '../labels'
import { makeBoard } from './boardFixture'
import { deriveClashHud, deriveHint, TurnIndicator } from '../clashHud'

const inProgress = (turn: PlayerSide, playerMuster: number, cpuMuster: number): ClashState => ({
  status: ClashStatus.InProgress,
  board: {
    size: 5,
    bases: { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 4, r: 4 } },
    cells: {},
  },
  muster: { [PlayerSide.Player]: playerMuster, [PlayerSide.Cpu]: cpuMuster },
  turn,
})

describe('deriveClashHud', () => {
  it('reports AwaitingMuster with no counts when there is no clash yet', () => {
    const hud = deriveClashHud(null)
    expect(hud).toEqual({
      playerMuster: null,
      cpuMuster: null,
      indicator: TurnIndicator.AwaitingMuster,
      uncontested: false,
    })
  })

  it('reports PlayerTurn, not uncontested, when both sides still have Muster', () => {
    const hud = deriveClashHud(inProgress(PlayerSide.Player, 5, 3))
    expect(hud).toEqual({
      playerMuster: 5,
      cpuMuster: 3,
      indicator: TurnIndicator.PlayerTurn,
      uncontested: false,
    })
  })

  it('reports PlayerTurn as uncontested once the CPU is exhausted', () => {
    const hud = deriveClashHud(inProgress(PlayerSide.Player, 3, 0))
    expect(hud.indicator).toBe(TurnIndicator.PlayerTurn)
    expect(hud.uncontested).toBe(true)
  })

  it('reports CpuTurn, not uncontested, when both sides still have Muster — a state this mount never stores, kept for completeness', () => {
    const hud = deriveClashHud(inProgress(PlayerSide.Cpu, 5, 3))
    expect(hud).toEqual({
      playerMuster: 5,
      cpuMuster: 3,
      indicator: TurnIndicator.CpuTurn,
      uncontested: false,
    })
  })

  it('reports CpuTurn as uncontested once the player is exhausted — same defensive coverage', () => {
    const hud = deriveClashHud(inProgress(PlayerSide.Cpu, 0, 4))
    expect(hud.indicator).toBe(TurnIndicator.CpuTurn)
    expect(hud.uncontested).toBe(true)
  })

  it('reports Resolved with the final tallies on Breach, never uncontested', () => {
    const hud = deriveClashHud({
      status: ClashStatus.Breached,
      board: {
        size: 5,
        bases: { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 4, r: 4 } },
        cells: {},
      },
      muster: { [PlayerSide.Player]: 2, [PlayerSide.Cpu]: 1 },
      winner: PlayerSide.Player,
    })
    expect(hud).toEqual({
      playerMuster: 2,
      cpuMuster: 1,
      indicator: TurnIndicator.Resolved,
      uncontested: false,
    })
  })

  it('reports Resolved with zero tallies on a natural Complete', () => {
    const hud = deriveClashHud({
      status: ClashStatus.Complete,
      board: {
        size: 5,
        bases: { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 4, r: 4 } },
        cells: {},
      },
      muster: { [PlayerSide.Player]: 0, [PlayerSide.Cpu]: 0 },
    })
    expect(hud.indicator).toBe(TurnIndicator.Resolved)
    expect(hud.playerMuster).toBe(0)
    expect(hud.cpuMuster).toBe(0)
  })
})

describe('deriveHint', () => {
  const baseUi = createMatchUiState(makeBoard())

  it('names the rejection first, above every other case', () => {
    const ui = { ...baseUi, rejection: IllegalActionReason.CellOccupied }
    const hud = deriveClashHud(null)
    expect(deriveHint(ui, hud)).toBe(REJECTION_MESSAGE[IllegalActionReason.CellOccupied])
  })

  it('names the War Council when no clash has started', () => {
    const hud = deriveClashHud(null)
    expect(deriveHint(baseUi, hud)).toBe('The War Council is deciding this round’s Muster')
  })

  it('invites a tap on a normal, contested player turn', () => {
    const hud = deriveClashHud(inProgress(PlayerSide.Player, 5, 3))
    expect(deriveHint(baseUi, hud)).toBe('Tap a cell to act')
  })

  it('names the uncontested reason and the exact remaining count on the player’s side — matches the ticket’s own example', () => {
    const hud = deriveClashHud(inProgress(PlayerSide.Player, 3, 0))
    expect(deriveHint(baseUi, hud)).toBe(
      'CPU is out of moves — you’re spending your remaining 3 moves',
    )
  })

  it('names the uncontested reason symmetrically for the CPU side — defensive, unreachable via VanguardMatch', () => {
    const hud = deriveClashHud(inProgress(PlayerSide.Cpu, 0, 4))
    expect(deriveHint(baseUi, hud)).toBe(
      'You’re out of moves — CPU is spending its remaining 4 moves',
    )
  })

  it('goes blank once the exchange is resolved, leaving the outcome panel to speak', () => {
    const hud = deriveClashHud({
      status: ClashStatus.Breached,
      board: {
        size: 5,
        bases: { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 4, r: 4 } },
        cells: {},
      },
      muster: { [PlayerSide.Player]: 2, [PlayerSide.Cpu]: 1 },
      winner: PlayerSide.Player,
    })
    expect(deriveHint(baseUi, hud)).toBe('')
  })
})
