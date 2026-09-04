import { describe, expect, it } from 'vitest'
import {
  SlotOutcome,
  SlotPullRefusal,
  drawReelPool,
  mintPullAwards,
  pullMachine,
  pullPriceFor,
  resolvePull,
  slotPullRefusalFor,
  slotSeedFor,
  spinReels,
} from '../slotMachine'
import {
  REEL_COUNT,
  REEL_POOL_SIZE,
  SLOT_FREE_PULLS_PER_VISIT,
  SLOT_MACHINE_IDS,
  SLOT_REROLL_PRICE,
  SlotMachineId,
} from '../slotConfig'
import { BUFF_TEMPLATES } from '../buffTemplates'
import { templateWeightFor } from '../slotWeights'
import { createSeededRng } from '../seededRng'
import { BuffTier } from '../buffs'
import { apCostOf } from '../buffCosts'

const A = BUFF_TEMPLATES[0]
const B = BUFF_TEMPLATES[1]
const C = BUFF_TEMPLATES[2]

describe('drawReelPool', () => {
  it.each(SLOT_MACHINE_IDS)('puts REEL_POOL_SIZE distinct templates on %s', (machineId) => {
    const machine = drawReelPool(machineId, createSeededRng(4))
    expect(machine.id).toBe(machineId)
    expect(machine.reel).toHaveLength(REEL_POOL_SIZE)
    expect(new Set(machine.reel.map((t) => t.id)).size).toBe(REEL_POOL_SIZE)
  })

  it('draws the same strip from the same seed and a different one from another', () => {
    const strip = (seed: number) =>
      drawReelPool(SlotMachineId.Skirmisher, createSeededRng(seed)).reel.map((t) => t.id)
    expect(strip(77)).toEqual(strip(77))
    expect(strip(77)).not.toEqual(strip(78))
  })

  it('gives the two machines different strips from the same seed', () => {
    const skirmisher = drawReelPool(SlotMachineId.Skirmisher, createSeededRng(3)).reel
    const strongbox = drawReelPool(SlotMachineId.Strongbox, createSeededRng(3)).reel
    expect(skirmisher.map((t) => t.id)).not.toEqual(strongbox.map((t) => t.id))
  })

  it('throws on an all-zero weight table rather than building a short strip', () => {
    expect(() => drawReelPool(SlotMachineId.Skirmisher, createSeededRng(1), () => 0)).toThrow(
      RangeError,
    )
  })

  it('throws when the weights admit fewer than REEL_POOL_SIZE templates', () => {
    const onlyThree = new Set(BUFF_TEMPLATES.slice(0, 3).map((t) => t.id))
    expect(() =>
      drawReelPool(SlotMachineId.Strongbox, createSeededRng(1), (t) =>
        onlyThree.has(t.id) ? 1 : 0,
      ),
    ).toThrow(RangeError)
  })

  it('keeps the shipped weight tables clear of the short-strip guard', () => {
    for (const machineId of SLOT_MACHINE_IDS) {
      const positive = BUFF_TEMPLATES.filter((t) => templateWeightFor(machineId, t) > 0)
      expect(positive.length).toBeGreaterThanOrEqual(REEL_POOL_SIZE)
    }
  })
})

describe('spinReels', () => {
  it('picks REEL_COUNT symbols, all from the strip, reproducibly', () => {
    const machine = drawReelPool(SlotMachineId.Strongbox, createSeededRng(9))
    const spin = (seed: number) => spinReels(machine, createSeededRng(seed)).map((t) => t.id)
    expect(spin(21)).toHaveLength(REEL_COUNT)
    expect(spin(21)).toEqual(spin(21))
    for (const symbol of spinReels(machine, createSeededRng(21))) {
      expect(machine.reel).toContain(symbol)
    }
  })

  it('can land the same symbol on more than one reel', () => {
    const machine = drawReelPool(SlotMachineId.Skirmisher, createSeededRng(1))
    const anyRepeat = Array.from({ length: 400 }, (_, i) =>
      spinReels(machine, createSeededRng(i)).map((t) => t.id),
    ).some((ids) => new Set(ids).size < REEL_COUNT)
    expect(anyRepeat).toBe(true)
  })
})

describe('resolvePull', () => {
  it('pays three bronze when all three reels differ', () => {
    const pull = resolvePull([A, B, C])
    expect(pull.outcome).toBe(SlotOutcome.AllDifferent)
    expect(pull.awards).toHaveLength(3)
    expect(pull.awards.every((a) => a.tier === BuffTier.Bronze)).toBe(true)
  })

  it('pays one silver on the matched template plus one bronze on the odd reel', () => {
    const pull = resolvePull([A, C, A])
    expect(pull.outcome).toBe(SlotOutcome.TwoMatch)
    expect(pull.awards).toHaveLength(2)
    expect(pull.awards[0]).toEqual({ template: A, tier: BuffTier.Silver })
    expect(pull.awards[1]).toEqual({ template: C, tier: BuffTier.Bronze })
  })

  it('pays one gold when all three reels match', () => {
    const pull = resolvePull([B, B, B])
    expect(pull.outcome).toBe(SlotOutcome.ThreeMatch)
    expect(pull.awards).toEqual([{ template: B, tier: BuffTier.Gold }])
  })

  it('throws rather than inventing a fourth outcome for the wrong reel count', () => {
    expect(() => resolvePull([A, B])).toThrow(RangeError)
  })
})

describe('mintPullAwards', () => {
  it('mints consecutive ids from firstId and every buff is priceable', () => {
    const buffs = mintPullAwards(resolvePull([A, B, C]), 10)
    expect(buffs.map((b) => b.id)).toEqual([10, 11, 12])
    for (const buff of buffs) expect(() => apCostOf(buff)).not.toThrow()
  })
})

describe('pullMachine', () => {
  it('produces an identical pull from an identical seed', () => {
    const machine = drawReelPool(SlotMachineId.Skirmisher, createSeededRng(2))
    const run = () => pullMachine(machine, createSeededRng(64))
    expect(run()).toEqual(run())
  })
})

describe('pullPriceFor and slotPullRefusalFor', () => {
  it('makes the first SLOT_FREE_PULLS_PER_VISIT pulls free and charges after', () => {
    expect(pullPriceFor(0)).toBe(0)
    expect(pullPriceFor(SLOT_FREE_PULLS_PER_VISIT)).toBe(SLOT_REROLL_PRICE)
    expect(pullPriceFor(SLOT_FREE_PULLS_PER_VISIT + 4)).toBe(SLOT_REROLL_PRICE)
  })

  it('allows a broke player their free pull and refuses the next', () => {
    expect(slotPullRefusalFor({ coins: 0, pullsThisVisit: 0 })).toBeNull()
    expect(slotPullRefusalFor({ coins: 0, pullsThisVisit: 1 })).toBe(SlotPullRefusal.NotEnoughCoins)
    expect(slotPullRefusalFor({ coins: 1, pullsThisVisit: 1 })).toBeNull()
  })

  it('refuses a non-finite balance instead of letting the comparison pass', () => {
    expect(slotPullRefusalFor({ coins: Number.NaN, pullsThisVisit: 1 })).toBe(
      SlotPullRefusal.NotEnoughCoins,
    )
  })
})

describe('slotSeedFor', () => {
  it('is pure and separates machine and visit', () => {
    expect(slotSeedFor(1, SlotMachineId.Skirmisher, 0)).toBe(
      slotSeedFor(1, SlotMachineId.Skirmisher, 0),
    )
    expect(slotSeedFor(1, SlotMachineId.Skirmisher, 0)).not.toBe(
      slotSeedFor(1, SlotMachineId.Skirmisher, 1),
    )
    expect(slotSeedFor(1, SlotMachineId.Skirmisher, 0)).not.toBe(
      slotSeedFor(1, SlotMachineId.Strongbox, 0),
    )
  })
})
