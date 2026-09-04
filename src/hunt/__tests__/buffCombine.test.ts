import { describe, expect, it } from 'vitest'
import {
  AbilityTier,
  BuffRewardAxis,
  BuffTargetSuit,
  BuffTier,
  BUFF_TEMPLATES,
  CombineRefusal,
  buffCombineKey,
  buffIsWild,
  buffTargetSuitOf,
  combineBuffs,
  combinePairFor,
  combineProductFor,
  combineRefusalFor,
  mintFromTemplate,
  nextBuffTierAfter,
  startRun,
  templateById,
  wildcardBuff,
  wildenedBuff,
  type Buff,
} from '../index'
import { PLAYER_START_HEALTH } from '../config'

const MOON_LOW_BLADE = templateById('suitLow:moons:magnitude')!
const BELL_LOW_BLADE = templateById('suitLow:bells:magnitude')!

function card(template = MOON_LOW_BLADE, tier: BuffTier = BuffTier.Bronze, id = 1): Buff {
  return mintFromTemplate(template, tier, id)
}

function runHolding(buffs: readonly Buff[]) {
  const base = startRun(PLAYER_START_HEALTH, [], 1)
  return { ...base, buffs, nextBuffId: 900 }
}

describe('the combine rule', () => {
  it('turns two identical bronzes into one silver of the same card', () => {
    const run = runHolding([
      card(MOON_LOW_BLADE, BuffTier.Bronze, 1),
      card(MOON_LOW_BLADE, BuffTier.Bronze, 2),
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
      card(MOON_LOW_BLADE, BuffTier.Silver, 1),
      card(MOON_LOW_BLADE, BuffTier.Silver, 2),
    ])
    const next = combineBuffs(run, buffCombineKey(run.buffs[0]))
    expect(next.buffs[0].tier).toBe(BuffTier.Gold)
  })

  it('drops the pile count by exactly one per combine', () => {
    const run = runHolding([
      card(MOON_LOW_BLADE, BuffTier.Bronze, 1),
      card(MOON_LOW_BLADE, BuffTier.Bronze, 2),
      card(MOON_LOW_BLADE, BuffTier.Bronze, 3),
      card(BELL_LOW_BLADE, BuffTier.Bronze, 4),
    ])
    const next = combineBuffs(run, buffCombineKey(run.buffs[0]))
    expect(next.buffs).toHaveLength(3)
  })

  it('refuses a gold pile — there is no rung above it', () => {
    const gold = [
      card(MOON_LOW_BLADE, BuffTier.Gold, 1),
      card(MOON_LOW_BLADE, BuffTier.Gold, 2),
    ]
    expect(combineRefusalFor(gold, buffCombineKey(gold[0]))).toBe(CombineRefusal.AtMaxTier)
    expect(() => combineBuffs(runHolding(gold), buffCombineKey(gold[0]))).toThrow(RangeError)
  })

  it('refuses two copies of the same card at different tiers', () => {
    const mixed = [
      card(MOON_LOW_BLADE, BuffTier.Bronze, 1),
      card(MOON_LOW_BLADE, BuffTier.Silver, 2),
    ]
    expect(combineRefusalFor(mixed, buffCombineKey(mixed[0]))).toBe(CombineRefusal.NoPair)
  })

  it('refuses two different cards at the same tier', () => {
    const different = [
      card(MOON_LOW_BLADE, BuffTier.Bronze, 1),
      card(BELL_LOW_BLADE, BuffTier.Bronze, 2),
    ]
    expect(buffCombineKey(different[0])).not.toBe(buffCombineKey(different[1]))
    expect(combineRefusalFor(different, buffCombineKey(different[0]))).toBe(CombineRefusal.NoPair)
  })

  it('consumes the two lowest ids and leaves the rest', () => {
    const three = [
      card(MOON_LOW_BLADE, BuffTier.Bronze, 5),
      card(MOON_LOW_BLADE, BuffTier.Bronze, 1),
      card(MOON_LOW_BLADE, BuffTier.Bronze, 3),
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
      card(MOON_LOW_BLADE, BuffTier.Bronze, 1),
      card(MOON_LOW_BLADE, BuffTier.Bronze, 2),
    ]
    const dealt = mintFromTemplate(MOON_LOW_BLADE, BuffTier.Silver, 77)
    const next = combineBuffs(runHolding(pair), buffCombineKey(pair[0]))
    expect(buffCombineKey(next.buffs[0])).toBe(buffCombineKey(dealt))
  })

  it('every template in the pool is combinable from bronze — except the wildcard', () => {
    for (const template of BUFF_TEMPLATES) {
      // DLR-162 — the wildcard is DELIBERATELY uncombinable: every tier converts exactly one card,
      // so merging two would halve the player's supply for nothing. `CombineRefusal.Untiered`, and
      // the case below asserts it rather than this loop quietly excusing it.
      if (template.id === 'wildcard') continue
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

const BELL_HIGH_BLADE = templateById('suitHigh:bells:magnitude')!
const KEYS_HIGH_BLADE = templateById('suitHigh:keys:magnitude')!
const MOONS_HIGH_BLADE = templateById('suitHigh:moons:magnitude')!
const BELL_HIGH_MOMENTUM = templateById('suitHigh:bells:multiplier')!
const SKULL_LOW_BLADE = templateById('skullLow:magnitude')!

function wildBronzeSuitHigh(id: number): Buff {
  return wildenedBuff(mintFromTemplate(BELL_HIGH_BLADE, BuffTier.Bronze, id))
}

describe('the widened rule (DLR-162 AC6, AC8)', () => {
  it('pairs a wild card with a suited card of the same family, axis and tier', () => {
    const pile = [wildBronzeSuitHigh(1), mintFromTemplate(BELL_HIGH_BLADE, BuffTier.Bronze, 2)]
    expect(combineRefusalFor(pile, buffCombineKey(pile[0]))).toBeNull()
    expect(combinePairFor(pile, buffCombineKey(pile[0]))?.map((b) => b.id)).toEqual([1, 2])
  })

  it('produces a card that is still wild, one tier up, paying what that tier pays (AC6)', () => {
    const pile = [wildBronzeSuitHigh(1), mintFromTemplate(BELL_HIGH_BLADE, BuffTier.Bronze, 2)]
    const next = combineBuffs(runHolding(pile), buffCombineKey(pile[0]))
    expect(next.buffs).toHaveLength(1)
    expect(buffIsWild(next.buffs[0])).toBe(true)
    expect(next.buffs[0].tier).toBe(BuffTier.Silver)
    expect(next.buffs[0].reward).toEqual({ axis: BuffRewardAxis.Magnitude, value: 3 })
    expect(next.nextBuffId).toBe(901)
  })

  it('refuses across families, across axes and across tiers even when one side is wild (AC8)', () => {
    const wild = wildBronzeSuitHigh(1)
    for (const other of [
      mintFromTemplate(BELL_LOW_BLADE, BuffTier.Bronze, 2),
      mintFromTemplate(BELL_HIGH_MOMENTUM, BuffTier.Bronze, 3),
      mintFromTemplate(BELL_HIGH_BLADE, BuffTier.Silver, 4),
    ]) {
      expect(combineRefusalFor([wild, other], buffCombineKey(wild))).toBe(CombineRefusal.NoPair)
    }
  })

  it('does NOT offer the combine from the suited pile - the wild pile owns it', () => {
    const pile = [wildBronzeSuitHigh(1), mintFromTemplate(BELL_HIGH_BLADE, BuffTier.Bronze, 2)]
    expect(combineRefusalFor(pile, buffCombineKey(pile[1]))).toBe(CombineRefusal.NoPair)
  })

  it('prefers a suited partner over a second wild copy, so the player keeps more wild cards', () => {
    const pile = [
      wildBronzeSuitHigh(1),
      wildBronzeSuitHigh(2),
      mintFromTemplate(BELL_HIGH_BLADE, BuffTier.Bronze, 3),
    ]
    expect(combinePairFor(pile, buffCombineKey(pile[0]))?.map((b) => b.id)).toEqual([1, 3])
  })

  it('still combines two wild copies when there is no suited partner', () => {
    const pile = [wildBronzeSuitHigh(1), wildBronzeSuitHigh(2)]
    expect(combinePairFor(pile, buffCombineKey(pile[0]))?.map((b) => b.id)).toEqual([1, 2])
  })

  it('leaves the ordinary same-card rule exactly as DLR-159 shipped it', () => {
    const pile = [
      mintFromTemplate(BELL_HIGH_BLADE, BuffTier.Bronze, 1),
      mintFromTemplate(BELL_HIGH_BLADE, BuffTier.Bronze, 2),
    ]
    const next = combineBuffs(runHolding(pile), buffCombineKey(pile[0]))
    expect(buffIsWild(next.buffs[0])).toBe(false)
    expect(buffTargetSuitOf(next.buffs[0])).toBe(BuffTargetSuit.Bells)
  })
})

describe('wildness is absorbing (DLR-162 AC7)', () => {
  // The PROPERTY, not the two cases: for every pile drawn from a mixed set, whatever any pair of
  // cards a combine would consume produces is wild if either of its inputs was.
  it('holds over every pair in a mixed pile', () => {
    const pile = [
      wildBronzeSuitHigh(1),
      wildBronzeSuitHigh(2),
      mintFromTemplate(BELL_HIGH_BLADE, BuffTier.Bronze, 3),
      mintFromTemplate(KEYS_HIGH_BLADE, BuffTier.Bronze, 4),
      mintFromTemplate(MOONS_HIGH_BLADE, BuffTier.Bronze, 5),
      mintFromTemplate(BELL_LOW_BLADE, BuffTier.Bronze, 6),
    ]
    let checked = 0
    for (const key of new Set(pile.map(buffCombineKey))) {
      const pair = combinePairFor(pile, key)
      if (pair === null) continue
      const product = combineProductFor(pair[0], pair[1], BuffTier.Silver, 999)
      expect(product).not.toBeNull()
      expect(buffIsWild(product!)).toBe(buffIsWild(pair[0]) || buffIsWild(pair[1]))
      checked += 1
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('never lets a repeated combine walk a wild card back to a suit', () => {
    let run = runHolding([
      wildBronzeSuitHigh(1),
      mintFromTemplate(BELL_HIGH_BLADE, BuffTier.Bronze, 2),
      mintFromTemplate(KEYS_HIGH_BLADE, BuffTier.Bronze, 3),
    ])
    run = combineBuffs(run, buffCombineKey(run.buffs[0]))
    expect(run.buffs.filter((b) => buffIsWild(b))).toHaveLength(1)
    expect(run.buffs.some((b) => buffIsWild(b) && buffTargetSuitOf(b) !== null)).toBe(false)
    // And again, against the remaining suited card - still wild, still suitless.
    const wild = run.buffs.find((b) => buffIsWild(b))!
    expect(combineRefusalFor(run.buffs, buffCombineKey(wild))).toBe(CombineRefusal.NoPair)
  })
})

describe('a wildcard cannot be combined (DLR-162)', () => {
  it('refuses a wildcard pile with its own reason, so a supply cannot be halved for nothing', () => {
    const pile = [wildcardBuff(BuffTier.Bronze, 1), wildcardBuff(BuffTier.Bronze, 2)]
    expect(combineRefusalFor(pile, buffCombineKey(pile[0]))).toBe(CombineRefusal.Untiered)
    expect(() => combineBuffs(runHolding(pile), buffCombineKey(pile[0]))).toThrow(RangeError)
  })
})

describe('buffCombineKey (DLR-162)', () => {
  it('tells a wild card apart from a suitless one', () => {
    expect(buffCombineKey(wildBronzeSuitHigh(1))).not.toBe(
      buffCombineKey(mintFromTemplate(SKULL_LOW_BLADE, BuffTier.Bronze, 2)),
    )
  })
})
