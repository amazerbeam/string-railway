import { describe, expect, it } from 'vitest'
import { createSeededRng, MAX_CARDS_PER_DISCARD } from '../../hunt'
import { cardsOfSuit } from '../cardUtils'
import { dealRound } from '../deal'
import { FRESH_ENCOUNTER_DECK } from '../encounterDeck'
import { legalMoves } from '../legalMoves'
import { PlayerSide, RoundPhase, Suit, type RoundState } from '../types'
import { applyDiscard, DiscardRefusal, discardRefusalFor, type DiscardStock } from '../discard'

function baseState(overrides: Partial<RoundState> = {}): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: {
      player: [
        { suit: Suit.Keys, rank: 3 },
        { suit: Suit.Moons, rank: 6 },
        { suit: Suit.Bells, rank: 2 },
      ],
      cpu: [{ suit: Suit.Bells, rank: 8 }],
    },
    drawPile: [
      { suit: Suit.Moons, rank: 2 },
      { suit: Suit.Keys, rank: 5 },
      { suit: Suit.Bells, rank: 7 },
      { suit: Suit.Moons, rank: 9 },
    ],
    decree: { suit: Suit.Bells, rank: 4 },
    trumpSuit: Suit.Bells,
    tricksWon: { player: 0, cpu: 0 },
    skulledCards: [],
    primedCards: [],
    spentPile: [],
    reshuffled: false,
    drawSeed: 0,
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

const stock = (over: Partial<DiscardStock> = {}): DiscardStock => ({
  discardsRemaining: 1,
  selecting: false,
  selectionSize: 0,
  windowOpen: true,
  ...over,
})

describe('applyDiscard', () => {
  it('AC2/AC10 — swaps cards preserving hand size, drawing from the top of drawPile', () => {
    const state = baseState()
    const discarded = [
      { suit: Suit.Keys, rank: 3 },
      { suit: Suit.Moons, rank: 6 },
    ]
    const before = state.hands.player
    const result = applyDiscard(state, PlayerSide.Player, discarded)

    expect(result.hands.player).toHaveLength(before.length)
    expect(result.hands.player).toEqual([
      { suit: Suit.Bells, rank: 2 },
      { suit: Suit.Moons, rank: 2 },
      { suit: Suit.Keys, rank: 5 },
    ])
  })

  it('AC3/AC10 — discards land at the bottom of drawPile, in the order discarded, length unchanged', () => {
    const state = baseState()
    const discarded = [
      { suit: Suit.Keys, rank: 3 },
      { suit: Suit.Moons, rank: 6 },
    ]
    const result = applyDiscard(state, PlayerSide.Player, discarded)

    expect(result.drawPile).toHaveLength(state.drawPile.length)
    expect(result.drawPile.slice(-2)).toEqual(discarded)
  })

  it('throws a RangeError when discarding zero cards', () => {
    const state = baseState()
    expect(() => applyDiscard(state, PlayerSide.Player, [])).toThrow(RangeError)
  })

  it('throws a RangeError when discarding more than MAX_CARDS_PER_DISCARD', () => {
    const state = baseState()
    const tooMany = Array.from({ length: MAX_CARDS_PER_DISCARD + 1 }, (_, i) => ({
      suit: Suit.Bells,
      rank: i + 1,
    }))
    expect(() => applyDiscard(state, PlayerSide.Player, tooMany)).toThrow(RangeError)
  })

  it('throws a RangeError when a discarded card is not in the hand', () => {
    const state = baseState()
    expect(() => applyDiscard(state, PlayerSide.Player, [{ suit: Suit.Moons, rank: 11 }])).toThrow(
      RangeError,
    )
  })

  it('throws a RangeError when discarding more cards than remain in the draw pile', () => {
    const state = baseState({
      drawPile: [{ suit: Suit.Moons, rank: 2 }],
    })
    const discarded = [
      { suit: Suit.Keys, rank: 3 },
      { suit: Suit.Moons, rank: 6 },
    ]
    expect(() => applyDiscard(state, PlayerSide.Player, discarded)).toThrow(RangeError)
  })

  it('AC10 void-in-suit — discarding every card of a suit lets legalMoves widen a later trick', () => {
    const state = baseState({
      hands: {
        player: [
          { suit: Suit.Bells, rank: 2 },
          { suit: Suit.Bells, rank: 6 },
          { suit: Suit.Keys, rank: 3 },
        ],
        cpu: [{ suit: Suit.Moons, rank: 8 }],
      },
      drawPile: [
        { suit: Suit.Moons, rank: 2 },
        { suit: Suit.Moons, rank: 5 },
      ],
    })
    const discardedSuitCards = cardsOfSuit(state.hands.player, Suit.Bells)
    const result = applyDiscard(state, PlayerSide.Player, discardedSuitCards)

    expect(cardsOfSuit(result.hands.player, Suit.Bells)).toHaveLength(0)

    const laterTrick: RoundState = {
      ...result,
      currentTrick: [{ side: PlayerSide.Cpu, card: { suit: Suit.Bells, rank: 4 } }],
      leader: PlayerSide.Cpu,
    }
    const legal = legalMoves(laterTrick, PlayerSide.Player)
    expect(legal).toEqual(result.hands.player)
  })

  it('DLR-146 — a swap the draw pile cannot cover reshuffles the spent pile in rather than throwing', () => {
    const dealt = dealRound(PlayerSide.Cpu, createSeededRng(5), FRESH_ENCOUNTER_DECK)
    const short = { ...dealt, drawPile: dealt.drawPile.slice(0, 1), spentPile: dealt.drawPile.slice(1) }
    const thrown = short.hands[PlayerSide.Player].slice(0, 3)
    const result = applyDiscard(short, PlayerSide.Player, thrown)
    expect(result.hands[PlayerSide.Player]).toHaveLength(short.hands[PlayerSide.Player].length)
    expect(result.spentPile).toEqual([])
    expect(result.drawPile.slice(-thrown.length)).toEqual(thrown)
  })
})

describe('discardRefusalFor', () => {
  it('NotAvailable when the window is closed, regardless of other fields', () => {
    expect(
      discardRefusalFor(
        stock({ windowOpen: false, discardsRemaining: 0, selecting: true, selectionSize: 0 }),
      ),
    ).toBe(DiscardRefusal.NotAvailable)
  })

  it('NoDiscardsRemaining when the window is open but the budget is spent', () => {
    expect(discardRefusalFor(stock({ windowOpen: true, discardsRemaining: 0 }))).toBe(
      DiscardRefusal.NoDiscardsRemaining,
    )
  })

  it('EmptySelection when selecting with nothing chosen', () => {
    expect(
      discardRefusalFor(
        stock({ windowOpen: true, discardsRemaining: 1, selecting: true, selectionSize: 0 }),
      ),
    ).toBe(DiscardRefusal.EmptySelection)
  })

  it('null when not selecting, window open, budget available', () => {
    expect(
      discardRefusalFor(
        stock({ windowOpen: true, discardsRemaining: 1, selecting: false, selectionSize: 0 }),
      ),
    ).toBeNull()
  })

  it('null when selecting with a non-empty selection, window open, budget available', () => {
    expect(
      discardRefusalFor(
        stock({ windowOpen: true, discardsRemaining: 1, selecting: true, selectionSize: 2 }),
      ),
    ).toBeNull()
  })
})
