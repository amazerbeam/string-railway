import { describe, expect, it } from 'vitest'
import { currentTurn, PlayerSide, RoundPhase, type RoundState } from '../types'

function baseState(overrides: Partial<RoundState> = {}): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
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
