import { describe, expect, it } from 'vitest'
import {
  cardBaseValue,
  cardValueFor,
  HuntDeclaration,
  invertedCardValue,
  PaidPile,
} from '../../hunt'
import { spoils } from '../spoils'
import {
  CardRank,
  PlayerSide,
  RoundPhase,
  type Card,
  type DeclarationState,
  type RoundState,
} from '../types'

function stateWithCaptured(
  capturedCards: Record<'player' | 'cpu', Card[]>,
  tricksWon: Record<'player' | 'cpu', number>,
  declaration?: DeclarationState,
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
    declaration,
  }
}

describe('spoils — the flat-value identity survives (§3)', () => {
  it('equals 2 × tricksWon under a flat card value of 1', () => {
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
    expect(spoils(state, 'player', { value: () => 1, paidPile: PaidPile.Own })).toBe(
      2 * state.tricksWon.player,
    )
  })

  it('returns 0 for a side with no captured cards', () => {
    const state = stateWithCaptured({ player: [], cpu: [] }, { player: 0, cpu: 0 })
    expect(spoils(state, 'player')).toBe(0)
    expect(spoils(state, 'cpu')).toBe(0)
  })
})

describe('spoils — no modifier of any kind is applied (§1, DLR-67)', () => {
  it('scores a Treasure and a Poison at their bare configured value, with no ±1', () => {
    const captured = {
      player: [
        { suit: 'keys' as const, rank: CardRank.Treasure },
        { suit: 'moons' as const, rank: CardRank.Poison },
      ],
      cpu: [],
    }
    const state = stateWithCaptured(captured, { player: 1, cpu: 0 })
    const value = cardValueFor(HuntDeclaration.Win)
    expect(spoils(state, 'player')).toBe(value(CardRank.Treasure) + value(CardRank.Poison))
  })
})

describe('spoils — the declaration decides WHOSE pile a side is paid for (DLR-69 AC1, AC2)', () => {
  // The two ranks must NOT sum to RANK_INVERSION_PIVOT (12). A mirror pair under the pivot —
  // e.g. rank 1 and rank 11, since 12 − 11 = 1 and 12 − 1 = 11 — makes own-pile-at-printed-rank
  // (Win) and other-pile-at-inverted (Lose) produce the identical two numbers on both sides,
  // so both tests below would pass under either scheme and prove nothing. Rank 2 against rank 11
  // sums to 13, not 12, so Win and Lose are numerically distinguishable, which is the failure
  // mode this ticket exists to close.
  const captured = {
    player: [{ suit: 'bells' as const, rank: 2 }],
    cpu: [{ suit: 'keys' as const, rank: 11 }],
  }
  const declared = (path: HuntDeclaration): RoundState => ({
    ...stateWithCaptured(captured, { player: 1, cpu: 1 }),
    declaration: { path },
  })

  it('pays each side for its OWN pile at printed rank on Win (AC1)', () => {
    const state = declared(HuntDeclaration.Win)
    expect(spoils(state, 'player')).toBe(cardBaseValue(2))
    expect(spoils(state, 'cpu')).toBe(cardBaseValue(11))
  })

  it('pays each side for the OTHER side’s pile at 12 − r on Lose (AC2)', () => {
    const state = declared(HuntDeclaration.Lose)
    // The player is paid for the Quarry's rank-11 card: 12 − 11 = 1.
    expect(spoils(state, 'player')).toBe(invertedCardValue(11))
    // The Quarry is paid for the player's rank-2 card: 12 − 2 = 10.
    expect(spoils(state, 'cpu')).toBe(invertedCardValue(2))
  })

  it('counts each pile exactly once across the two sides on Lose (AC2)', () => {
    // hybrid-design.md:208-214's discarded branch — both sides counting the Quarry's pile —
    // would make this sum 2 × invertedCardValue(11), paying one pile out twice.
    const state = declared(HuntDeclaration.Lose)
    expect(spoils(state, 'player') + spoils(state, 'cpu')).toBe(
      invertedCardValue(2) + invertedCardValue(11),
    )
  })

  it('reads an undeclared round as Win, identically to a declared one', () => {
    // Covers spoils's default `scheme` parameter on BOTH axes it resolves — the value
    // function and the paid pile — not just the value function alone. This is the test
    // DLR-69's Task 2 Step 1 asked to preserve when the surrounding describe block was
    // rewritten for AC1/AC2.
    const undeclared = stateWithCaptured(captured, { player: 1, cpu: 1 })
    const winDeclared = declared(HuntDeclaration.Win)
    expect(spoils(undeclared, 'player')).toBe(spoils(winDeclared, 'player'))
    expect(spoils(undeclared, 'cpu')).toBe(spoils(winDeclared, 'cpu'))
  })
})
