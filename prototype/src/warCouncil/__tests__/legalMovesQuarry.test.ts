import { describe, expect, it } from 'vitest'
import { legalMoves, monarchFollowSet } from '../legalMoves'
import { PlayerSide, RoundPhase, type Card, type RoundState } from '../types'

function playerFacing(playerHand: Card[], led: Card): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: playerHand, cpu: [] },
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
    skulledCards: [],
    cursedCards: [],
    spentPile: [],
    reshuffled: false,
    drawSeed: 0,
    total: 0,
    roll: 0,
    lastResolution: null,
    currentTrick: [{ side: PlayerSide.Cpu, card: led }],
    leader: PlayerSide.Cpu,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingFollow,
  }
}

const ordinaryLead: Card = { suit: 'keys', rank: 4 }

const keysHand: Card[] = [
  { suit: 'keys', rank: 1 },
  { suit: 'keys', rank: 6 },
  { suit: 'keys', rank: 9 },
  { suit: 'moons', rank: 2 },
]

// DLR-81 deleted the round-long Monarch narrowing. These are the regression guards: the Quarry
// plays by the player's rules, so its ordinary lead constrains the player to follow suit and
// NOTHING more. The whole-suit narrowing must only ever come from a led rank 11.
describe('legalMoves — the Quarry has no rule-break', () => {
  it('narrows the player to follow suit only, on an ordinary Quarry lead', () => {
    const state = playerFacing(keysHand, ordinaryLead)
    expect(legalMoves(state, PlayerSide.Player)).toEqual([
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 6 },
      { suit: 'keys', rank: 9 },
    ])
  })

  it('leaves the middle card of the suit legal — the Swan-or-highest set is NOT in force', () => {
    const state = playerFacing(keysHand, ordinaryLead)
    const legal = legalMoves(state, PlayerSide.Player)
    expect(legal).toContainEqual({ suit: 'keys', rank: 6 })
  })

  it('frees the player entirely once they hold none of the led suit', () => {
    const hand: Card[] = [
      { suit: 'moons', rank: 2 },
      { suit: 'bells', rank: 7 },
    ]
    const state = playerFacing(hand, ordinaryLead)
    expect(legalMoves(state, PlayerSide.Player)).toEqual(hand)
  })

  it('still narrows both sides when the led card is itself a Monarch — the printed rule survives', () => {
    const state = playerFacing(keysHand, { suit: 'keys', rank: 11 })
    expect(legalMoves(state, PlayerSide.Player)).toEqual([
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 9 },
    ])
  })

  it('applies the printed Monarch rule to the Quarry too, when the player leads one', () => {
    const cpuHand: Card[] = [
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 6 },
      { suit: 'keys', rank: 9 },
    ]
    const state: RoundState = {
      ...playerFacing([], ordinaryLead),
      hands: { player: [], cpu: cpuHand },
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 11 } }],
      leader: PlayerSide.Player,
    }
    expect(legalMoves(state, PlayerSide.Cpu)).toEqual([
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 9 },
    ])
  })

  it('does not constrain the Quarry when the player leads an ordinary card', () => {
    const cpuHand: Card[] = [
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 6 },
      { suit: 'keys', rank: 9 },
    ]
    const state: RoundState = {
      ...playerFacing([], ordinaryLead),
      hands: { player: [], cpu: cpuHand },
      currentTrick: [{ side: PlayerSide.Player, card: ordinaryLead }],
      leader: PlayerSide.Player,
    }
    expect(legalMoves(state, PlayerSide.Cpu)).toEqual(cpuHand)
  })
})

// Ported from the deleted quarryRuleBreak.test.ts — the helper survives as the printed rank-11
// rule, so its unit coverage moves here with it rather than being lost.
describe('monarchFollowSet', () => {
  it('narrows to the Swan then the highest card of the suit, in that order', () => {
    expect(monarchFollowSet(keysHand, 'keys')).toEqual([
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
    expect(monarchFollowSet(keysHand, 'moons')).toEqual([{ suit: 'moons', rank: 2 }])
  })

  it('returns empty when the hand holds none of the suit — unconstrained, not stuck', () => {
    expect(monarchFollowSet(keysHand, 'bells')).toEqual([])
  })

  it('recomputes the highest from the current hand rather than fixing it at deal time', () => {
    const shed: Card[] = [
      { suit: 'keys', rank: 4 },
      { suit: 'keys', rank: 6 },
    ]
    expect(monarchFollowSet(shed, 'keys')).toEqual([{ suit: 'keys', rank: 6 }])
  })
})
