import { describe, expect, it } from 'vitest'
import { createDeck } from '../deck'

describe('createDeck', () => {
  it('has exactly 33 cards: 3 suits x ranks 1-11', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(33)
  })

  it('has no duplicate suit+rank pairs', () => {
    const keys = createDeck().map((c) => `${c.suit}-${c.rank}`)
    expect(new Set(keys).size).toBe(33)
  })

  it('has every rank 1-11 in every suit', () => {
    const deck = createDeck()
    for (const suit of ['bells', 'keys', 'moons'] as const) {
      const ranks = deck
        .filter((c) => c.suit === suit)
        .map((c) => c.rank)
        .sort((a, b) => a - b)
      expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    }
  })
})
