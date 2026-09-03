import { describe, expect, it } from 'vitest'
import { BuffKind, BuffTier } from '../buffs'
import { isPricedBuff } from '../buffActivation'
import { apCostOf } from '../buffCosts'
import { createSeededRng } from '../seededRng'
import { BUFF_TEMPLATES } from '../buffTemplates'
import { SLOT_MACHINE_IDS } from '../slotConfig'
import { templateWeightFor } from '../slotWeights'
import {
  openingPileWeightOf,
  seedStartingBuffPile,
  startingBuffPileFor,
  startingPileSeedFor,
} from '../startingPile'

describe('seedStartingBuffPile', () => {
  it('mints `count` buffs with consecutive ids from `firstId`, all bronze', () => {
    const pile = seedStartingBuffPile(4, 1, createSeededRng(startingPileSeedFor(1)))
    expect(pile).toHaveLength(4)
    expect(pile.map((b) => b.id)).toEqual([1, 2, 3, 4])
    expect(pile.every((b) => b.tier === BuffTier.Bronze)).toBe(true)
  })

  it('mints REAL cards — never BuffKind.Unassigned — and every one is priceable', () => {
    const pile = seedStartingBuffPile(4, 1, createSeededRng(startingPileSeedFor(7)))
    for (const buff of pile) {
      expect(buff.kind).not.toBe(BuffKind.Unassigned)
      expect(isPricedBuff(buff)).toBe(true)
      expect(() => apCostOf(buff)).not.toThrow()
    }
  })

  it('starts ids at `firstId`, not always 1', () => {
    const pile = seedStartingBuffPile(2, 7, createSeededRng(startingPileSeedFor(1)))
    expect(pile.map((b) => b.id)).toEqual([7, 8])
  })

  it('seeds nothing for 0 rather than throwing', () => {
    expect(seedStartingBuffPile(0, 1, createSeededRng(1))).toEqual([])
  })

  it('throws RangeError when the weight table cannot supply `count` templates', () => {
    expect(() => seedStartingBuffPile(4, 1, createSeededRng(1), () => 0)).toThrow(RangeError)
  })

  it('draws more cards than there are templates, with duplicates (DLR-145 AC6)', () => {
    const pile = seedStartingBuffPile(20, 1, createSeededRng(startingPileSeedFor(1)))
    expect(pile).toHaveLength(20)
    expect(pile.every((buff) => buff.tier === BuffTier.Bronze)).toBe(true)
    expect(pile.map((buff) => buff.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
    // DLR-161 widened MintableConditionKind from 5 to 7 members (Skull Helmet, Skull Tether).
    expect(new Set(pile.map((buff) => buff.kind)).size).toBeLessThanOrEqual(7)
  })

  it('is reproducible from the same seed', () => {
    const first = seedStartingBuffPile(20, 1, createSeededRng(startingPileSeedFor(42)))
    const second = seedStartingBuffPile(20, 1, createSeededRng(startingPileSeedFor(42)))
    expect(first.map((b) => b.kind + b.reward.axis)).toEqual(
      second.map((b) => b.kind + b.reward.axis),
    )
  })

  it('still throws on an all-zero weight table', () => {
    expect(() => seedStartingBuffPile(20, 1, createSeededRng(1), () => 0)).toThrow(RangeError)
  })
})

describe('determinism — the constraint DLR-130 depends on', () => {
  it('the same runSeed yields the identical opening pile', () => {
    expect(startingBuffPileFor(4, 1, 42)).toEqual(startingBuffPileFor(4, 1, 42))
  })

  it('two different runSeeds yield different opening piles', () => {
    const a = startingBuffPileFor(4, 1, 1).map((b) => b.kind + b.reward.axis)
    const b = startingBuffPileFor(4, 1, 999).map((b) => b.kind + b.reward.axis)
    expect(a).not.toEqual(b)
  })

  it('startingPileSeedFor is pure and returns a non-negative 32-bit integer', () => {
    const seed = startingPileSeedFor(12345)
    expect(seed).toBe(startingPileSeedFor(12345))
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThan(2 ** 32)
  })
})

describe('openingPileWeightOf', () => {
  it('is the sum of templateWeightFor across every machine — no number of its own', () => {
    for (const template of BUFF_TEMPLATES) {
      const expected = SLOT_MACHINE_IDS.reduce(
        (total, machineId) => total + templateWeightFor(machineId, template),
        0,
      )
      expect(openingPileWeightOf(template)).toBeCloseTo(expected)
    }
  })

  it('weights every shipped template above zero, so no card is unreachable at run start', () => {
    expect(BUFF_TEMPLATES.every((t) => openingPileWeightOf(t) > 0)).toBe(true)
  })

  it('leaves Cheat and Timebomb eligible (DLR-132 — ordinary pool members)', () => {
    const activated = BUFF_TEMPLATES.filter((t) => t.form === 'activated')
    expect(activated).toHaveLength(2)
    expect(activated.every((t) => openingPileWeightOf(t) > 0)).toBe(true)
  })
})
