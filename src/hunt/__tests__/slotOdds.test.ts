import { describe, expect, it } from 'vitest'
import { resolvePull, SlotOutcome, slotSeedFor, drawReelPool, spinSeedFor } from '../slotMachine'
import { createSeededRng } from '../seededRng'
import { awardCountFor, expectedCardsPerPull, slotOutcomeOdds } from '../slotOdds'
import { BUFF_TEMPLATES } from '../buffTemplates'
import { SlotMachineId } from '../slotConfig'

const EPSILON = 1e-12

describe('slotOutcomeOdds', () => {
  it('gives ThreeMatch = 1/64 against the shipped REEL_COUNT/REEL_POOL_SIZE', () => {
    expect(slotOutcomeOdds()[SlotOutcome.ThreeMatch]).toBeCloseTo(1 / 64, 12)
    expect(slotOutcomeOdds()[SlotOutcome.ThreeMatch]).toBe(0.015625)
  })

  it('gives TwoMatch = 168/512', () => {
    expect(slotOutcomeOdds()[SlotOutcome.TwoMatch]).toBe(168 / 512)
    expect(slotOutcomeOdds()[SlotOutcome.TwoMatch]).toBe(0.328125)
  })

  it('gives AllDifferent = 336/512', () => {
    expect(slotOutcomeOdds()[SlotOutcome.AllDifferent]).toBe(336 / 512)
    expect(slotOutcomeOdds()[SlotOutcome.AllDifferent]).toBe(0.65625)
  })

  it('sums to 1 within a named epsilon, not exact float equality', () => {
    const odds = slotOutcomeOdds()
    const sum =
      odds[SlotOutcome.ThreeMatch] + odds[SlotOutcome.TwoMatch] + odds[SlotOutcome.AllDifferent]
    expect(Math.abs(sum - 1)).toBeLessThan(EPSILON)
  })
})

describe('expectedCardsPerPull', () => {
  it('is 2.640625 cards on average', () => {
    expect(expectedCardsPerPull()).toBe(2.640625)
  })
})

describe('awardCountFor', () => {
  it('returns 1 / 2 / 3 for ThreeMatch / TwoMatch / AllDifferent', () => {
    expect(awardCountFor(SlotOutcome.ThreeMatch)).toBe(1)
    expect(awardCountFor(SlotOutcome.TwoMatch)).toBe(2)
    expect(awardCountFor(SlotOutcome.AllDifferent)).toBe(3)
  })

  it('cannot drift from resolvePull — each count equals the actual awards.length for that shape', () => {
    const [a, b, c] = BUFF_TEMPLATES

    const threeMatch = resolvePull([a, a, a])
    expect(awardCountFor(threeMatch.outcome)).toBe(threeMatch.awards.length)

    const twoMatch = resolvePull([a, a, b])
    expect(awardCountFor(twoMatch.outcome)).toBe(twoMatch.awards.length)

    const allDifferent = resolvePull([a, b, c])
    expect(awardCountFor(allDifferent.outcome)).toBe(allDifferent.awards.length)
  })
})

describe('spinSeedFor', () => {
  it('gives the same seed twice for the same (stripSeed, pullIndex)', () => {
    expect(spinSeedFor(7, 2)).toBe(spinSeedFor(7, 2))
  })

  it('gives different seeds for different pullIndex values', () => {
    expect(spinSeedFor(7, 0)).not.toBe(spinSeedFor(7, 1))
  })

  it('never redraws the strip — a reroll only changes the spin, not drawReelPool', () => {
    const stripSeed = slotSeedFor(7, SlotMachineId.Skirmisher, 0)
    // Re-derive the strip identically regardless of how many spins have happened.
    const stripBefore = drawReelPool(SlotMachineId.Skirmisher, createSeededRng(stripSeed))
    spinSeedFor(stripSeed, 0)
    spinSeedFor(stripSeed, 1)
    spinSeedFor(stripSeed, 5)
    const stripAfter = drawReelPool(SlotMachineId.Skirmisher, createSeededRng(stripSeed))
    expect(stripAfter.reel.map((t) => t.id)).toEqual(stripBefore.reel.map((t) => t.id))
  })
})
