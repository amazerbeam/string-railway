import { describe, expect, it } from 'vitest'
import { currentTurn, declaredPath, PlayerSide, RoundPhase, type RoundState } from '../types'
import { HuntDeclaration } from '../../hunt'

function baseState(overrides: Partial<RoundState> = {}): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
    capturedCards: { player: [], cpu: [] },
    currentTrick: [],
    leader: PlayerSide.Cpu,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

describe('currentTurn', () => {
  it('is the leader when no card has been played to the trick yet', () => {
    expect(currentTurn(baseState({ leader: PlayerSide.Cpu, currentTrick: [] }))).toBe('cpu')
  })

  it('is the other side once the lead card has been played', () => {
    const state = baseState({
      leader: PlayerSide.Player,
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'bells', rank: 4 } }],
    })
    expect(currentTurn(state)).toBe('cpu')
  })
})

describe('declaredPath', () => {
  it('reads Win on an undeclared round, so the readouts have a table before the player declares', () => {
    expect(declaredPath(baseState())).toBe(HuntDeclaration.Win)
  })

  it('reads the declared path once one is written', () => {
    for (const path of [HuntDeclaration.Win, HuntDeclaration.Lose]) {
      expect(declaredPath(baseState({ declaration: { path } }))).toBe(path)
    }
  })
})
