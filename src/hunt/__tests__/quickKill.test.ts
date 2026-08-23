import { describe, expect, it } from 'vitest'
import { quickKillPayout, quickKillTierMultiplier } from '../quickKill'
import { HAND_SIZE, QUICK_KILL_TIER_MULTIPLIERS } from '../config'

describe('quickKillTierMultiplier (AC2, AC5)', () => {
  it('doubles in the first hand of the fight', () => {
    expect(quickKillTierMultiplier(1)).toBe(2)
  })

  it('pays the base rate in the second', () => {
    expect(quickKillTierMultiplier(2)).toBe(1)
  })

  it('halves in the third', () => {
    expect(quickKillTierMultiplier(3)).toBe(0.5)
  })

  it('pays nothing from the fourth hand on — the taper, not a bug (AC5)', () => {
    expect(quickKillTierMultiplier(4)).toBe(0)
    expect(quickKillTierMultiplier(9)).toBe(0)
  })

  it('reads its curve from configuration rather than a literal', () => {
    QUICK_KILL_TIER_MULTIPLIERS.forEach((multiplier, index) => {
      expect(quickKillTierMultiplier(index + 1)).toBe(multiplier)
    })
  })

  it('refuses a hand number that is not a positive integer rather than returning NaN', () => {
    expect(() => quickKillTierMultiplier(0)).toThrow(RangeError)
    expect(() => quickKillTierMultiplier(-1)).toThrow(RangeError)
    expect(() => quickKillTierMultiplier(1.5)).toThrow(RangeError)
    expect(() => quickKillTierMultiplier(Number.NaN)).toThrow(RangeError)
  })
})

describe('quickKillPayout (AC2, AC4, AC7)', () => {
  // THE pinned regression test. version-4-scope.md §4: "a first-hand, one-trick kill with five
  // cards left pays 10 coins, which is the figure Whetstone's price above is sized against."
  it('pays the design doc’s own worked example: first hand, five cards left → 10 coins', () => {
    expect(quickKillPayout({ unplayedCards: 5, handOfFight: 1 })).toBe(10)
  })

  it('pays one coin per card in the second hand', () => {
    expect(quickKillPayout({ unplayedCards: 4, handOfFight: 2 })).toBe(4)
  })

  it('floors a fractional third-hand payout rather than crediting half a coin (AC4)', () => {
    expect(quickKillPayout({ unplayedCards: 5, handOfFight: 3 })).toBe(2)
    expect(quickKillPayout({ unplayedCards: 3, handOfFight: 3 })).toBe(1)
    expect(quickKillPayout({ unplayedCards: 1, handOfFight: 3 })).toBe(0)
  })

  it('pays exactly nothing on a fourth-hand kill, however full the hand (AC5)', () => {
    expect(quickKillPayout({ unplayedCards: HAND_SIZE, handOfFight: 4 })).toBe(0)
  })

  it('pays nothing for a kill on the last trick, with nothing left in hand', () => {
    expect(quickKillPayout({ unplayedCards: 0, handOfFight: 1 })).toBe(0)
  })

  it('never returns a fractional value for any tier and any hand size', () => {
    for (let hand = 1; hand <= QUICK_KILL_TIER_MULTIPLIERS.length + 1; hand += 1) {
      for (let cards = 0; cards <= HAND_SIZE; cards += 1) {
        expect(Number.isInteger(quickKillPayout({ unplayedCards: cards, handOfFight: hand }))).toBe(
          true,
        )
      }
    }
  })

  it('refuses a negative or non-finite card count rather than corrupting the purse', () => {
    expect(() => quickKillPayout({ unplayedCards: -1, handOfFight: 1 })).toThrow(RangeError)
    expect(() => quickKillPayout({ unplayedCards: Number.NaN, handOfFight: 1 })).toThrow(RangeError)
    expect(() =>
      quickKillPayout({ unplayedCards: Number.POSITIVE_INFINITY, handOfFight: 1 }),
    ).toThrow(RangeError)
  })
})
