import { describe, expect, it } from 'vitest'
import { Suit, type Card } from '../../../warCouncil'
import { sortHandForDisplay } from '../handOrder'

const c = (suit: Suit, rank: number): Card => ({ suit, rank })

describe('sortHandForDisplay — AC6', () => {
  it('puts the longest suit leftmost', () => {
    const hand = [c(Suit.Bells, 4), c(Suit.Moons, 9), c(Suit.Moons, 2), c(Suit.Moons, 7)]
    expect(sortHandForDisplay(hand).map((card) => card.suit)).toEqual([
      Suit.Moons,
      Suit.Moons,
      Suit.Moons,
      Suit.Bells,
    ])
  })

  it('breaks a holding-size tie on ALL_SUITS order, so the comparator is total', () => {
    const hand = [c(Suit.Moons, 5), c(Suit.Keys, 3), c(Suit.Bells, 8)]
    expect(sortHandForDisplay(hand).map((card) => card.suit)).toEqual([
      Suit.Bells,
      Suit.Keys,
      Suit.Moons,
    ])
  })

  it('orders ascending by rank within a suit', () => {
    const hand = [c(Suit.Keys, 11), c(Suit.Keys, 1), c(Suit.Keys, 6)]
    expect(sortHandForDisplay(hand).map((card) => card.rank)).toEqual([1, 6, 11])
  })

  it('applies all three keys together on a full 13-card hand', () => {
    const hand = [
      c(Suit.Moons, 9),
      c(Suit.Bells, 4),
      c(Suit.Keys, 11),
      c(Suit.Moons, 5),
      c(Suit.Bells, 10),
      c(Suit.Keys, 3),
      c(Suit.Moons, 11),
      c(Suit.Bells, 2),
      c(Suit.Keys, 8),
      c(Suit.Moons, 6),
      c(Suit.Bells, 7),
      c(Suit.Keys, 1),
      c(Suit.Moons, 10),
    ]
    // Moons holds 5, Bells and Keys hold 4 each -> Moons, then Bells before Keys.
    expect(sortHandForDisplay(hand)).toEqual([
      c(Suit.Moons, 5),
      c(Suit.Moons, 6),
      c(Suit.Moons, 9),
      c(Suit.Moons, 10),
      c(Suit.Moons, 11),
      c(Suit.Bells, 2),
      c(Suit.Bells, 4),
      c(Suit.Bells, 7),
      c(Suit.Bells, 10),
      c(Suit.Keys, 1),
      c(Suit.Keys, 3),
      c(Suit.Keys, 8),
      c(Suit.Keys, 11),
    ])
  })

  it('re-derives the order as the hand shrinks — holding size is read from the argument', () => {
    const hand = [c(Suit.Bells, 4), c(Suit.Bells, 9), c(Suit.Keys, 2)]
    expect(sortHandForDisplay(hand)[0].suit).toBe(Suit.Bells)
    // Bells drops to one card, so Keys and Bells tie and ALL_SUITS order applies.
    const shrunk = [c(Suit.Bells, 9), c(Suit.Keys, 2)]
    expect(sortHandForDisplay(shrunk).map((card) => card.suit)).toEqual([Suit.Bells, Suit.Keys])
  })

  it('never mutates its argument', () => {
    const hand = [c(Suit.Moons, 5), c(Suit.Bells, 2), c(Suit.Bells, 9)]
    const snapshot = structuredClone(hand)
    sortHandForDisplay(hand)
    expect(hand).toEqual(snapshot)
  })

  it('returns an empty array for an empty hand', () => {
    expect(sortHandForDisplay([])).toEqual([])
  })
})
