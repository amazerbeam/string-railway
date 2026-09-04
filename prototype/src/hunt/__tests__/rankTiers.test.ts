import { describe, expect, it } from 'vitest'
import {
  ALL_BRONZE,
  AbilityTier,
  isAtMaxTier,
  nextTierAfter,
  RANK_TIER_STEP_PRICE,
  steppedTo,
  TIER_LADDER,
  TIERED_RANKS,
  TieredRank,
  tierAtLeast,
  tierIndexOf,
} from '../rankTiers'

const ALL_RANKS = Object.values(TieredRank)

describe('the opening table', () => {
  it('holds every tierable rank at bronze, so a run that buys nothing plays as it does now', () => {
    for (const rank of ALL_RANKS) {
      expect(ALL_BRONZE[rank]).toBe(AbilityTier.Bronze)
    }
    expect(Object.keys(ALL_BRONZE)).toHaveLength(ALL_RANKS.length)
  })
})

describe('the ladder', () => {
  it('orders the three rungs low to high', () => {
    expect(tierIndexOf(AbilityTier.Bronze)).toBeLessThan(tierIndexOf(AbilityTier.Silver))
    expect(tierIndexOf(AbilityTier.Silver)).toBeLessThan(tierIndexOf(AbilityTier.Gold))
    expect(TIER_LADDER).toHaveLength(3)
  })

  it('reads a floor rather than an equality', () => {
    expect(tierAtLeast(AbilityTier.Gold, AbilityTier.Silver)).toBe(true)
    expect(tierAtLeast(AbilityTier.Silver, AbilityTier.Silver)).toBe(true)
    expect(tierAtLeast(AbilityTier.Bronze, AbilityTier.Silver)).toBe(false)
    for (const tier of TIER_LADDER) {
      expect(tierAtLeast(tier, tier)).toBe(true)
      expect(tierAtLeast(tier, AbilityTier.Bronze)).toBe(true)
    }
  })

  it('climbs bronze to silver to gold and then stops', () => {
    expect(nextTierAfter(AbilityTier.Bronze)).toBe(AbilityTier.Silver)
    expect(nextTierAfter(AbilityTier.Silver)).toBe(AbilityTier.Gold)
    expect(nextTierAfter(AbilityTier.Gold)).toBeNull()
  })
})

describe('stepping one rank', () => {
  it('raises only the named rank', () => {
    const stepped = steppedTo(ALL_BRONZE, TieredRank.Swan)
    expect(stepped[TieredRank.Swan]).toBe(AbilityTier.Silver)
    for (const rank of ALL_RANKS.filter((r) => r !== TieredRank.Swan)) {
      expect(stepped[rank]).toBe(AbilityTier.Bronze)
    }
  })

  it('returns a new table and never mutates the one handed in', () => {
    const stepped = steppedTo(ALL_BRONZE, TieredRank.Witch)
    expect(stepped).not.toBe(ALL_BRONZE)
    expect(ALL_BRONZE[TieredRank.Witch]).toBe(AbilityTier.Bronze)
  })

  it('reaches gold in two steps and refuses a third', () => {
    const silver = steppedTo(ALL_BRONZE, TieredRank.Swan)
    const gold = steppedTo(silver, TieredRank.Swan)
    expect(gold[TieredRank.Swan]).toBe(AbilityTier.Gold)
    expect(() => steppedTo(gold, TieredRank.Swan)).toThrow(RangeError)
    expect(() => steppedTo(gold, TieredRank.Swan)).toThrow(/swan/)
    expect(() => steppedTo(gold, TieredRank.Swan)).toThrow(/gold/)
  })

  it('reports the ceiling only at gold', () => {
    expect(isAtMaxTier(ALL_BRONZE, TieredRank.Swan)).toBe(false)
    const silver = steppedTo(ALL_BRONZE, TieredRank.Swan)
    expect(isAtMaxTier(silver, TieredRank.Swan)).toBe(false)
    expect(isAtMaxTier(steppedTo(silver, TieredRank.Swan), TieredRank.Swan)).toBe(true)
  })
})

describe('the offered shelf', () => {
  it('is a subset of what the game can tier', () => {
    expect(TIERED_RANKS.length).toBeGreaterThan(0)
    for (const rank of TIERED_RANKS) {
      expect(ALL_RANKS).toContain(rank)
    }
    expect(new Set(TIERED_RANKS).size).toBe(TIERED_RANKS.length)
  })

  it('prices a step as a positive whole number of coins', () => {
    expect(Number.isInteger(RANK_TIER_STEP_PRICE)).toBe(true)
    expect(RANK_TIER_STEP_PRICE).toBeGreaterThan(0)
  })
})
