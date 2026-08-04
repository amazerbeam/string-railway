import { describe, expect, it } from 'vitest'
import { cardsOfSuit, containsCard, highestOfSuit, removeCard, sameCard } from '../cardUtils'
import type { Card } from '../types'

const bells4: Card = { suit: 'bells', rank: 4 }
const bells9: Card = { suit: 'bells', rank: 9 }
const keys2: Card = { suit: 'keys', rank: 2 }
const hand: Card[] = [bells4, bells9, keys2]

describe('cardUtils', () => {
  it('sameCard compares by suit and rank', () => {
    expect(sameCard(bells4, { suit: 'bells', rank: 4 })).toBe(true)
    expect(sameCard(bells4, bells9)).toBe(false)
  })

  it('containsCard finds a structurally equal card', () => {
    expect(containsCard(hand, { suit: 'keys', rank: 2 })).toBe(true)
    expect(containsCard(hand, { suit: 'moons', rank: 2 })).toBe(false)
  })

  it('removeCard returns a new array without mutating the original', () => {
    const result = removeCard(hand, bells9)
    expect(result).toEqual([bells4, keys2])
    expect(hand).toEqual([bells4, bells9, keys2])
  })

  it('removeCard is a no-op copy when the card is absent', () => {
    expect(removeCard(hand, { suit: 'moons', rank: 11 })).toEqual(hand)
  })

  it('cardsOfSuit filters by suit', () => {
    expect(cardsOfSuit(hand, 'bells')).toEqual([bells4, bells9])
  })

  it('highestOfSuit returns the highest rank of that suit, or undefined', () => {
    expect(highestOfSuit(hand, 'bells')).toEqual(bells9)
    expect(highestOfSuit(hand, 'moons')).toBeUndefined()
  })
})
