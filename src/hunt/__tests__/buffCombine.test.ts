import { describe, expect, it } from 'vitest'
import {
  AbilityTier,
  BuffTier,
  BUFF_TEMPLATES,
  CombineRefusal,
  buffCombineKey,
  combineBuffs,
  combineRefusalFor,
  mintFromTemplate,
  nextBuffTierAfter,
  startRun,
  templateById,
  type Buff,
} from '../index'
import { PLAYER_START_HEALTH } from '../config'

const MOON_FEEDER_BLADE = templateById('feeder:moons:magnitude')!
const BELL_FEEDER_BLADE = templateById('feeder:bells:magnitude')!

function card(template = MOON_FEEDER_BLADE, tier: BuffTier = BuffTier.Bronze, id = 1): Buff {
  return mintFromTemplate(template, tier, id)
}

function runHolding(buffs: readonly Buff[]) {
  const base = startRun(PLAYER_START_HEALTH, [], 1)
  return { ...base, buffs, nextBuffId: 900 }
}

describe('the combine rule', () => {
  it('turns two identical bronzes into one silver of the same card', () => {
    const run = runHolding([
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 1),
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 2),
    ])
    const next = combineBuffs(run, buffCombineKey(run.buffs[0]))
    expect(next.buffs).toHaveLength(1)
    expect(next.buffs[0].tier).toBe(BuffTier.Silver)
    expect(next.buffs[0].kind).toBe(run.buffs[0].kind)
    expect(next.buffs[0].condition).toEqual(run.buffs[0].condition)
    expect(next.buffs[0].id).toBe(900)
    expect(next.nextBuffId).toBe(901)
  })

  it('turns two identical silvers into one gold', () => {
    const run = runHolding([
      card(MOON_FEEDER_BLADE, BuffTier.Silver, 1),
      card(MOON_FEEDER_BLADE, BuffTier.Silver, 2),
    ])
    const next = combineBuffs(run, buffCombineKey(run.buffs[0]))
    expect(next.buffs[0].tier).toBe(BuffTier.Gold)
  })

  it('drops the pile count by exactly one per combine', () => {
    const run = runHolding([
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 1),
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 2),
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 3),
      card(BELL_FEEDER_BLADE, BuffTier.Bronze, 4),
    ])
    const next = combineBuffs(run, buffCombineKey(run.buffs[0]))
    expect(next.buffs).toHaveLength(3)
  })

  it('refuses a gold pile — there is no rung above it', () => {
    const gold = [
      card(MOON_FEEDER_BLADE, BuffTier.Gold, 1),
      card(MOON_FEEDER_BLADE, BuffTier.Gold, 2),
    ]
    expect(combineRefusalFor(gold, buffCombineKey(gold[0]))).toBe(CombineRefusal.AtMaxTier)
    expect(() => combineBuffs(runHolding(gold), buffCombineKey(gold[0]))).toThrow(RangeError)
  })

  it('refuses two copies of the same card at different tiers', () => {
    const mixed = [
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 1),
      card(MOON_FEEDER_BLADE, BuffTier.Silver, 2),
    ]
    expect(combineRefusalFor(mixed, buffCombineKey(mixed[0]))).toBe(CombineRefusal.NoPair)
  })

  it('refuses two different cards at the same tier', () => {
    const different = [
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 1),
      card(BELL_FEEDER_BLADE, BuffTier.Bronze, 2),
    ]
    expect(buffCombineKey(different[0])).not.toBe(buffCombineKey(different[1]))
    expect(combineRefusalFor(different, buffCombineKey(different[0]))).toBe(CombineRefusal.NoPair)
  })

  it('consumes the two lowest ids and leaves the rest', () => {
    const three = [
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 5),
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 1),
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 3),
    ]
    const next = combineBuffs(runHolding(three), buffCombineKey(three[0]))
    expect(next.buffs.map((b) => b.id).sort((a, b) => a - b)).toEqual([5, 900])
  })

  it('steps the tier ladder and stops at gold', () => {
    expect(nextBuffTierAfter(BuffTier.Bronze)).toBe(BuffTier.Silver)
    expect(nextBuffTierAfter(BuffTier.Silver)).toBe(BuffTier.Gold)
    expect(nextBuffTierAfter(BuffTier.Gold)).toBeNull()
  })

  it('combines an activated card on the same rule, and its own ladder moves', () => {
    const cheat = templateById('cheat')!
    const pair = [
      mintFromTemplate(cheat, BuffTier.Bronze, 1),
      mintFromTemplate(cheat, BuffTier.Bronze, 2),
    ]
    const next = combineBuffs(runHolding(pair), buffCombineKey(pair[0]))
    expect(next.buffs[0].tier).toBe(BuffTier.Silver)
    expect(next.buffs[0].reward.value).toBeGreaterThan(pair[0].reward.value)
  })

  it('produces a card that stacks with one the pool could already have dealt', () => {
    const pair = [
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 1),
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 2),
    ]
    const dealt = mintFromTemplate(MOON_FEEDER_BLADE, BuffTier.Silver, 77)
    const next = combineBuffs(runHolding(pair), buffCombineKey(pair[0]))
    expect(buffCombineKey(next.buffs[0])).toBe(buffCombineKey(dealt))
  })

  it('every template in the pool is combinable from bronze', () => {
    for (const template of BUFF_TEMPLATES) {
      const pair = [
        mintFromTemplate(template, BuffTier.Bronze, 1),
        mintFromTemplate(template, BuffTier.Bronze, 2),
      ]
      expect(combineRefusalFor(pair, buffCombineKey(pair[0]))).toBeNull()
    }
  })
})

describe('BuffTier and AbilityTier', () => {
  it('are the same three rungs, member for member', () => {
    expect(Object.values(BuffTier).sort()).toEqual(Object.values(AbilityTier).sort())
  })
})
