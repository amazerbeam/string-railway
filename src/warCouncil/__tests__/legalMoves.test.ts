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
    skulledCards: [],
    bank: 0,
    multiplier: 0,
    lastResolution: null,
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

describe('the Cheat bypass (DLR-83)', () => {
  const playerHand: Card[] = [
    { suit: 'keys', rank: 9 },
    { suit: 'bells', rank: 2 },
  ]
  const stateWithLedSuitInHand = stateWith({ player: playerHand, cpu: [] }, [
    { side: 'cpu', card: { suit: 'keys', rank: 4 } },
  ])

  const monarchHand: Card[] = [
    { suit: 'keys', rank: 1 },
    { suit: 'keys', rank: 6 },
    { suit: 'keys', rank: 9 },
  ]
  const stateWithMonarchLed = stateWith({ player: monarchHand, cpu: [] }, [
    { side: 'cpu', card: { suit: 'keys', rank: 11 } },
  ])

  const emptyTrickState = stateWith({ player: playerHand, cpu: [] }, [])

  it('returns the whole hand when follow-suit would otherwise narrow it (AC5)', () => {
    const narrowed = legalMoves(stateWithLedSuitInHand, PlayerSide.Player)
    const widened = legalMoves(stateWithLedSuitInHand, PlayerSide.Player, {
      ignoreFollowSuit: true,
    })
    expect(narrowed.length).toBeLessThan(widened.length)
    expect(widened).toEqual(stateWithLedSuitInHand.hands[PlayerSide.Player])
  })

  it('leaves the led-Monarch narrowing binding (AC8)', () => {
    const withBypass = legalMoves(stateWithMonarchLed, PlayerSide.Player, {
      ignoreFollowSuit: true,
    })
    expect(withBypass).toEqual(legalMoves(stateWithMonarchLed, PlayerSide.Player))
  })

  it('changes nothing on a lead, where nothing narrows anyway', () => {
    expect(legalMoves(emptyTrickState, PlayerSide.Player, { ignoreFollowSuit: true })).toEqual(
      legalMoves(emptyTrickState, PlayerSide.Player),
    )
  })

  it('is off by default, so today is unchanged (AC9)', () => {
    expect(legalMoves(stateWithLedSuitInHand, PlayerSide.Player, {})).toEqual(
      legalMoves(stateWithLedSuitInHand, PlayerSide.Player),
    )
  })
})
