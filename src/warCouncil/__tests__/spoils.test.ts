import { describe, expect, it } from 'vitest'
import { spoils } from '../spoils'
import { PlayerSide, RoundPhase, type Card, type RoundState } from '../types'

function stateWithCaptured(
  capturedCards: Record<'player' | 'cpu', Card[]>,
  tricksWon: Record<'player' | 'cpu', number>,
): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon,
    capturedCards,
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: tricksWon.player + tricksWon.cpu,
    phase: RoundPhase.AwaitingLead,
  }
}

describe('spoils — §3 flat-value identity (AC6)', () => {
  it('equals 2 × tricksWon under a flat card value of 1, with no Poison/Treasure in the capture set', () => {
    const captured = {
      player: [
        { suit: 'bells' as const, rank: 2 },
        { suit: 'keys' as const, rank: 3 },
        { suit: 'moons' as const, rank: 4 },
        { suit: 'bells' as const, rank: 5 },
      ],
      cpu: [],
    }
    const state = stateWithCaptured(captured, { player: 2, cpu: 0 })
    expect(spoils(state, 'player', () => 1)).toBe(2 * state.tricksWon.player)
  })
})

describe('spoils — rank-weighted default with Poison/Treasure (AC7)', () => {
  it('sums printed rank and folds in Poison(-1)/Treasure(+1) per capture', () => {
    const captured = {
      player: [
        { suit: 'bells' as const, rank: 4 }, // 4
        { suit: 'keys' as const, rank: 7 }, // Treasure: 7 + 1 = 8
        { suit: 'moons' as const, rank: 8 }, // Poison: 8 - 1 = 7
        { suit: 'bells' as const, rank: 11 }, // 11
      ],
      cpu: [],
    }
    const state = stateWithCaptured(captured, { player: 2, cpu: 0 })
    // hand-computed: 4 + (7+1) + (8-1) + 11 = 30
    expect(spoils(state, 'player')).toBe(30)
  })

  it('returns 0 for a side with no captured cards', () => {
    const state = stateWithCaptured({ player: [], cpu: [] }, { player: 0, cpu: 0 })
    expect(spoils(state, 'player')).toBe(0)
    expect(spoils(state, 'cpu')).toBe(0)
  })
})
