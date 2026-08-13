import { describe, expect, it } from 'vitest'
import { QuarryCharacter } from '../../hunt'
import { legalMoves } from '../legalMoves'
import { PlayerSide, RoundPhase, type Card, type RoundState } from '../types'

function playerFacing(
  playerHand: Card[],
  led: Card,
  quarryCharacter?: QuarryCharacter,
): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: playerHand, cpu: [] },
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
    skulledCards: [],
    bank: 0,
    multiplier: 0,
    lastResolution: null,
    currentTrick: [{ side: PlayerSide.Cpu, card: led }],
    leader: PlayerSide.Cpu,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingFollow,
    quarryCharacter,
  }
}

const ordinaryLead: Card = { suit: 'keys', rank: 4 }

describe('legalMoves — the Monarch as a round-long rule-break', () => {
  it('narrows the player to the Swan and the highest of the suit on an ordinary Quarry lead', () => {
    const hand: Card[] = [
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 6 },
      { suit: 'keys', rank: 9 },
      { suit: 'moons', rank: 2 },
    ]
    const state = playerFacing(hand, ordinaryLead, QuarryCharacter.Monarch)
    expect(legalMoves(state, PlayerSide.Player)).toEqual([
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 9 },
    ])
  })

  it('frees the player entirely once they hold none of the led suit', () => {
    const hand: Card[] = [
      { suit: 'moons', rank: 2 },
      { suit: 'bells', rank: 7 },
    ]
    const state = playerFacing(hand, ordinaryLead, QuarryCharacter.Monarch)
    expect(legalMoves(state, PlayerSide.Player)).toEqual(hand)
  })

  it('recomputes the highest from the current hand rather than fixing it at deal time', () => {
    // Having shed the keys Swan and the keys 9, the player is constrained to their new
    // highest of the suit — not freed in it. plan.md → Risks, bullet 1.
    const hand: Card[] = [
      { suit: 'keys', rank: 4 },
      { suit: 'keys', rank: 6 },
      { suit: 'moons', rank: 2 },
    ]
    const state = playerFacing(hand, ordinaryLead, QuarryCharacter.Monarch)
    expect(legalMoves(state, PlayerSide.Player)).toEqual([{ suit: 'keys', rank: 6 }])
  })

  it('leaves the same position unconstrained when no character is active (AC5)', () => {
    const hand: Card[] = [
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 6 },
      { suit: 'keys', rank: 9 },
      { suit: 'moons', rank: 2 },
    ]
    const state = playerFacing(hand, ordinaryLead)
    expect(legalMoves(state, PlayerSide.Player)).toEqual([
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 6 },
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
      ...playerFacing([], ordinaryLead, QuarryCharacter.Monarch),
      hands: { player: [], cpu: cpuHand },
      currentTrick: [{ side: PlayerSide.Player, card: ordinaryLead }],
      leader: PlayerSide.Player,
    }
    expect(legalMoves(state, PlayerSide.Cpu)).toEqual(cpuHand)
  })

  it('still applies the single-card Monarch ability to the Quarry when the player leads one', () => {
    const cpuHand: Card[] = [
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 6 },
      { suit: 'keys', rank: 9 },
    ]
    const state: RoundState = {
      ...playerFacing([], ordinaryLead, QuarryCharacter.Monarch),
      hands: { player: [], cpu: cpuHand },
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 11 } }],
      leader: PlayerSide.Player,
    }
    expect(legalMoves(state, PlayerSide.Cpu)).toEqual([
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 9 },
    ])
  })
})
