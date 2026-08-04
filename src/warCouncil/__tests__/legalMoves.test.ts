import { describe, expect, it } from 'vitest'
import { legalMoves } from '../legalMoves'
import { PlayerSide, RoundPhase, type Card, type RoundState } from '../types'

function stateWith(
  hands: Record<'player' | 'cpu', Card[]>,
  currentTrick: RoundState['currentTrick'],
): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands,
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
    currentTrick,
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
  }
}

describe('legalMoves', () => {
  it('the leader may play any card in hand', () => {
    const hand: Card[] = [
      { suit: 'bells', rank: 4 },
      { suit: 'keys', rank: 7 },
    ]
    const state = stateWith({ player: hand, cpu: [] }, [])
    expect(legalMoves(state, 'player')).toEqual(hand)
  })

  it('the follower must play the lead suit if they hold one', () => {
    const cpuHand: Card[] = [
      { suit: 'keys', rank: 3 },
      { suit: 'bells', rank: 8 },
      { suit: 'moons', rank: 1 },
    ]
    const state = stateWith({ player: [], cpu: cpuHand }, [
      { side: 'player', card: { suit: 'keys', rank: 9 } },
    ])
    expect(legalMoves(state, 'cpu')).toEqual([{ suit: 'keys', rank: 3 }])
  })

  it('the follower may play any card if they hold none of the lead suit', () => {
    const cpuHand: Card[] = [
      { suit: 'bells', rank: 8 },
      { suit: 'moons', rank: 1 },
    ]
    const state = stateWith({ player: [], cpu: cpuHand }, [
      { side: 'player', card: { suit: 'keys', rank: 9 } },
    ])
    expect(legalMoves(state, 'cpu')).toEqual(cpuHand)
  })

  it('Monarch led: follower holding the suit must play its Swan and/or its highest card of that suit', () => {
    const cpuHand: Card[] = [
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 6 },
      { suit: 'bells', rank: 10 },
    ]
    const state = stateWith({ player: [], cpu: cpuHand }, [
      { side: 'player', card: { suit: 'keys', rank: 11 } },
    ])
    expect(legalMoves(state, 'cpu')).toEqual([
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 6 },
    ])
  })

  it('Monarch led: when the Swan of that suit is also the highest, the set has one card, not a duplicate', () => {
    const cpuHand: Card[] = [
      { suit: 'keys', rank: 1 },
      { suit: 'bells', rank: 10 },
    ]
    const state = stateWith({ player: [], cpu: cpuHand }, [
      { side: 'player', card: { suit: 'keys', rank: 11 } },
    ])
    expect(legalMoves(state, 'cpu')).toEqual([{ suit: 'keys', rank: 1 }])
  })

  it('Monarch led: follower with none of that suit may play any card', () => {
    const cpuHand: Card[] = [
      { suit: 'bells', rank: 10 },
      { suit: 'moons', rank: 3 },
    ]
    const state = stateWith({ player: [], cpu: cpuHand }, [
      { side: 'player', card: { suit: 'keys', rank: 11 } },
    ])
    expect(legalMoves(state, 'cpu')).toEqual(cpuHand)
  })
})
