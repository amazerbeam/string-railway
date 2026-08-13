import { describe, expect, it } from 'vitest'
import { QuarryCharacter } from '../../hunt'
import { monarchFollowApplies, monarchFollowSet, QUARRY_SIDE } from '../quarryRuleBreak'
import { PlayerSide, RoundPhase, type Card, type RoundState } from '../types'

function stateWith(overrides: Partial<RoundState>): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
    skulledCards: [],
    bank: 0,
    multiplier: 0,
    lastResolution: null,
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

const hand: Card[] = [
  { suit: 'keys', rank: 1 },
  { suit: 'keys', rank: 6 },
  { suit: 'keys', rank: 9 },
  { suit: 'moons', rank: 2 },
]

describe('monarchFollowSet', () => {
  it('narrows to the Swan then the highest card of the suit, in that order', () => {
    expect(monarchFollowSet(hand, 'keys')).toEqual([
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 9 },
    ])
  })

  it('returns one card, not a duplicate, when the Swan is also the highest of the suit', () => {
    expect(monarchFollowSet([{ suit: 'keys', rank: 1 }], 'keys')).toEqual([
      { suit: 'keys', rank: 1 },
    ])
  })

  it('returns the highest alone when the hand holds no Swan of the suit', () => {
    expect(monarchFollowSet(hand, 'moons')).toEqual([{ suit: 'moons', rank: 2 }])
  })

  it('returns empty when the hand holds none of the suit — unconstrained, not stuck', () => {
    expect(monarchFollowSet(hand, 'bells')).toEqual([])
  })
})

describe('monarchFollowApplies', () => {
  // Annotated, not inferred: a bare array literal widens `suit` to `string`, which is not
  // assignable to `Suit` once it leaves the contextually-typed argument position.
  const quarryLed: RoundState['currentTrick'] = [
    { side: QUARRY_SIDE, card: { suit: 'keys', rank: 4 } },
  ]

  it('fires for the player when the Monarch is active and the Quarry led', () => {
    const state = stateWith({
      quarryCharacter: QuarryCharacter.Monarch,
      leader: QUARRY_SIDE,
      currentTrick: quarryLed,
    })
    expect(monarchFollowApplies(state, PlayerSide.Player)).toBe(true)
  })

  it('does not fire when no character is active', () => {
    const state = stateWith({ leader: QUARRY_SIDE, currentTrick: quarryLed })
    expect(monarchFollowApplies(state, PlayerSide.Player)).toBe(false)
  })

  it('does not constrain the Quarry itself', () => {
    const state = stateWith({
      quarryCharacter: QuarryCharacter.Monarch,
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 4 } }],
    })
    expect(monarchFollowApplies(state, QUARRY_SIDE)).toBe(false)
  })

  it('does not fire when the player led the trick', () => {
    const state = stateWith({
      quarryCharacter: QuarryCharacter.Monarch,
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 4 } }],
    })
    expect(monarchFollowApplies(state, PlayerSide.Player)).toBe(false)
  })

  it('does not fire before a card has been led', () => {
    const state = stateWith({ quarryCharacter: QuarryCharacter.Monarch, currentTrick: [] })
    expect(monarchFollowApplies(state, PlayerSide.Player)).toBe(false)
  })

  it('does not fire for a character whose rule-break is not the Monarch', () => {
    const state = stateWith({
      quarryCharacter: QuarryCharacter.Witch,
      leader: QUARRY_SIDE,
      currentTrick: quarryLed,
    })
    expect(monarchFollowApplies(state, PlayerSide.Player)).toBe(false)
  })
})
