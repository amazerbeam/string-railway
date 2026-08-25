import { describe, expect, it } from 'vitest'
import {
  absorbWithWard,
  CONSUMABLE_EFFECT_LIVE,
  CONSUMABLE_TIMING,
  consumableEffectIsLive,
  consumableEffectOf,
  consumableStacks,
  consumableTimingOf,
  ConsumableTiming,
  extraDiscardCharges,
  FORESIGHT_CARDS,
  isConsumableItem,
  isConsumableItemKind,
  PUPPETEER_FORCED_CARDS,
  SECOND_THOUGHTS_CHARGES,
  spendConsumable,
  SPYGLASS_CANDIDATES,
  WARD_ABSORPTION,
  wardAbsorptionForTier,
  type ConsumableItemKind,
} from '../consumables'
import {
  ACTIVATED_BUFF_CONDITION,
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  UNASSIGNED_BUFF_CONDITION,
  UNASSIGNED_BUFF_REWARD,
  type Buff,
} from '../buffs'
import { apCostOf } from '../buffCosts'

/** The five one-shot items, as the union itself lists them. */
const ITEM_KINDS: readonly ConsumableItemKind[] = [
  BuffKind.Ward,
  BuffKind.Puppeteer,
  BuffKind.SecondThoughts,
  BuffKind.Foresight,
  BuffKind.Spyglass,
]

const TIERS: readonly BuffTier[] = [BuffTier.Bronze, BuffTier.Silver, BuffTier.Gold]

/** A consumable buff, built inline rather than through a minting function: nothing in `src/hunt/`
 *  mints one yet, and inventing a mint here would be a second construction site to keep in step. */
function itemBuff(kind: ConsumableItemKind, tier: BuffTier, id = 1): Buff {
  return {
    id,
    kind,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.None, value: 0 },
  }
}

/** A Cheat — an Activated card that is NOT a consumable item, which is the distinction most of
 *  this file exists to pin. */
function cheat(id = 90): Buff {
  return {
    id,
    kind: BuffKind.Cheat,
    tier: BuffTier.Bronze,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.DurationTricks, value: 1 },
  }
}

/** The unpriced-kind sentinel — nothing mints it as of DLR-135. */
function unassigned(id = 91): Buff {
  return {
    id,
    kind: BuffKind.Unassigned,
    tier: BuffTier.Bronze,
    condition: UNASSIGNED_BUFF_CONDITION,
    reward: UNASSIGNED_BUFF_REWARD,
  }
}

describe('isConsumableItemKind — the five one-shot items, and nothing else', () => {
  it('is true for exactly the five DLR-111 consumables across every BuffKind', () => {
    for (const kind of Object.values(BuffKind)) {
      expect({ kind, item: isConsumableItemKind(kind) }).toEqual({
        kind,
        item: (ITEM_KINDS as readonly BuffKind[]).includes(kind),
      })
    }
  })

  it('excludes Cheat, Timebomb and Shield — Activated cards with their own live mechanics', () => {
    expect(isConsumableItemKind(BuffKind.Cheat)).toBe(false)
    expect(isConsumableItemKind(BuffKind.Timebomb)).toBe(false)
    expect(isConsumableItemKind(BuffKind.Shield)).toBe(false)
  })

  it('excludes Unassigned placeholder content', () => {
    expect(isConsumableItem(unassigned())).toBe(false)
  })

  it('is true through isConsumableItem for a whole buff', () => {
    expect(isConsumableItem(itemBuff(BuffKind.Ward, BuffTier.Bronze))).toBe(true)
    expect(isConsumableItem(cheat())).toBe(false)
  })
})

describe('CONSUMABLE_TIMING — AC2, and the one card that needs a different window', () => {
  it('puts Puppeteer before the player’s own card and the other four between tricks', () => {
    expect(CONSUMABLE_TIMING[BuffKind.Puppeteer]).toBe(ConsumableTiming.BeforeOwnCard)
    expect(CONSUMABLE_TIMING[BuffKind.Ward]).toBe(ConsumableTiming.BetweenTricks)
    expect(CONSUMABLE_TIMING[BuffKind.SecondThoughts]).toBe(ConsumableTiming.BetweenTricks)
    expect(CONSUMABLE_TIMING[BuffKind.Foresight]).toBe(ConsumableTiming.BetweenTricks)
    expect(CONSUMABLE_TIMING[BuffKind.Spyglass]).toBe(ConsumableTiming.BetweenTricks)
  })

  it('reads a window off a whole buff through consumableTimingOf', () => {
    expect(consumableTimingOf(itemBuff(BuffKind.Puppeteer, BuffTier.Bronze))).toBe(
      ConsumableTiming.BeforeOwnCard,
    )
  })

  it('throws rather than defaulting for a Cheat, whose window is DLR-108’s business', () => {
    expect(() => consumableTimingOf(cheat())).toThrow(RangeError)
  })
})

describe('consumableEffectOf — AC4, every ladder transcribed from v1-buff-card-list.md', () => {
  it('gives Ward 1 / 3 / 5 absorbed', () => {
    expect(TIERS.map((t) => consumableEffectOf(itemBuff(BuffKind.Ward, t)))).toEqual([
      { kind: BuffKind.Ward, absorbs: 1 },
      { kind: BuffKind.Ward, absorbs: 3 },
      { kind: BuffKind.Ward, absorbs: 5 },
    ])
  })

  it('gives Second Thoughts +1 / +2 / +3 discard charges', () => {
    expect(TIERS.map((t) => consumableEffectOf(itemBuff(BuffKind.SecondThoughts, t)))).toEqual([
      { kind: BuffKind.SecondThoughts, discardCharges: 1 },
      { kind: BuffKind.SecondThoughts, discardCharges: 2 },
      { kind: BuffKind.SecondThoughts, discardCharges: 3 },
    ])
  })

  it('gives Foresight 1 / 3 / 5 cards revealed', () => {
    expect(TIERS.map((t) => consumableEffectOf(itemBuff(BuffKind.Foresight, t)))).toEqual([
      { kind: BuffKind.Foresight, cardsRevealed: 1 },
      { kind: BuffKind.Foresight, cardsRevealed: 3 },
      { kind: BuffKind.Foresight, cardsRevealed: 5 },
    ])
  })

  it('gives Spyglass 1 / 2 / 3 candidates eliminated', () => {
    expect(TIERS.map((t) => consumableEffectOf(itemBuff(BuffKind.Spyglass, t)))).toEqual([
      { kind: BuffKind.Spyglass, candidatesEliminated: 1 },
      { kind: BuffKind.Spyglass, candidatesEliminated: 2 },
      { kind: BuffKind.Spyglass, candidatesEliminated: 3 },
    ])
  })

  it('gives Puppeteer one forced card at every tier — it is single-tier in the source', () => {
    for (const tier of TIERS) {
      expect(consumableEffectOf(itemBuff(BuffKind.Puppeteer, tier))).toEqual({
        kind: BuffKind.Puppeteer,
        forcedCards: PUPPETEER_FORCED_CARDS,
      })
    }
  })

  it('reads every figure from its ladder constant rather than a second copy', () => {
    expect(WARD_ABSORPTION[BuffTier.Gold]).toBe(5)
    expect(SECOND_THOUGHTS_CHARGES[BuffTier.Gold]).toBe(3)
    expect(FORESIGHT_CARDS[BuffTier.Gold]).toBe(5)
    expect(SPYGLASS_CANDIDATES[BuffTier.Gold]).toBe(3)
    expect(wardAbsorptionForTier(BuffTier.Silver)).toBe(WARD_ABSORPTION[BuffTier.Silver])
  })

  it('throws on a Cheat rather than reading its duration as an absorption', () => {
    expect(() => consumableEffectOf(cheat())).toThrow(RangeError)
    expect(() => consumableEffectOf(unassigned())).toThrow(RangeError)
  })
})

describe('CONSUMABLE_EFFECT_LIVE — the three consumables that cannot be spent yet', () => {
  it('is true only for Ward and Second Thoughts', () => {
    expect(CONSUMABLE_EFFECT_LIVE[BuffKind.Ward]).toBe(true)
    expect(CONSUMABLE_EFFECT_LIVE[BuffKind.SecondThoughts]).toBe(true)
    expect(CONSUMABLE_EFFECT_LIVE[BuffKind.Puppeteer]).toBe(false)
    expect(CONSUMABLE_EFFECT_LIVE[BuffKind.Foresight]).toBe(false)
    expect(CONSUMABLE_EFFECT_LIVE[BuffKind.Spyglass]).toBe(false)
  })

  it('reports every NON-consumable as live — NoEffectYet is about unbuilt consumable surfaces', () => {
    expect(consumableEffectIsLive(cheat())).toBe(true)
    expect(consumableEffectIsLive(unassigned())).toBe(true)
    expect(consumableEffectIsLive(itemBuff(BuffKind.Foresight, BuffTier.Bronze))).toBe(false)
  })
})

describe('every consumable is priced — this module and buffCosts.ts cannot drift apart', () => {
  it('apCostOf answers for all five kinds at all three tiers', () => {
    for (const kind of ITEM_KINDS) {
      for (const tier of TIERS) {
        expect(apCostOf(itemBuff(kind, tier))).toBeGreaterThan(0)
      }
    }
  })
})

describe('consumableStacks — AC1, the counted inventory derived from the pile', () => {
  it('counts two bronze Wards as one stack of 2, and drops non-consumables', () => {
    const pile = [
      unassigned(1),
      itemBuff(BuffKind.Ward, BuffTier.Bronze, 2),
      cheat(3),
      itemBuff(BuffKind.Ward, BuffTier.Bronze, 4),
    ]
    expect(consumableStacks(pile)).toEqual([
      { kind: BuffKind.Ward, tier: BuffTier.Bronze, count: 2, ids: [2, 4] },
    ])
  })

  it('keeps a bronze and a gold Ward as two stacks — tier is what the count is of', () => {
    const pile = [
      itemBuff(BuffKind.Ward, BuffTier.Bronze, 1),
      itemBuff(BuffKind.Ward, BuffTier.Gold, 2),
    ]
    expect(consumableStacks(pile).map((s) => [s.tier, s.count])).toEqual([
      [BuffTier.Bronze, 1],
      [BuffTier.Gold, 1],
    ])
  })

  it('preserves pile order by first appearance — the pile’s order is the player’s', () => {
    const pile = [
      itemBuff(BuffKind.Spyglass, BuffTier.Silver, 1),
      itemBuff(BuffKind.Ward, BuffTier.Bronze, 2),
      itemBuff(BuffKind.Spyglass, BuffTier.Silver, 3),
    ]
    expect(consumableStacks(pile).map((s) => s.kind)).toEqual([BuffKind.Spyglass, BuffKind.Ward])
  })

  it('returns nothing for a pile of only placeholder content', () => {
    expect(consumableStacks([unassigned(1), unassigned(2)])).toEqual([])
    expect(consumableStacks([])).toEqual([])
  })
})

describe('spendConsumable — AC3, exactly one card leaves the pile', () => {
  it('turns a 2-count stack into a 1-count stack and leaves everything else alone', () => {
    const pile = [
      unassigned(1),
      itemBuff(BuffKind.Ward, BuffTier.Bronze, 2),
      cheat(3),
      itemBuff(BuffKind.Ward, BuffTier.Bronze, 4),
    ]
    const after = spendConsumable(pile, 2)

    expect(after).toHaveLength(3)
    expect(consumableStacks(after)).toEqual([
      { kind: BuffKind.Ward, tier: BuffTier.Bronze, count: 1, ids: [4] },
    ])
    expect(after.map((b) => b.id)).toEqual([1, 3, 4])
    // The original pile is untouched — every transition in `src/hunt/` is pure.
    expect(pile).toHaveLength(4)
  })

  it('removes by identity, so the other card of the same (kind, tier) survives', () => {
    const pile = [
      itemBuff(BuffKind.Foresight, BuffTier.Gold, 7),
      itemBuff(BuffKind.Foresight, BuffTier.Gold, 8),
    ]
    expect(spendConsumable(pile, 8).map((b) => b.id)).toEqual([7])
  })

  it('throws for an id that is not in the pile rather than silently doing nothing', () => {
    expect(() => spendConsumable([itemBuff(BuffKind.Ward, BuffTier.Bronze, 2)], 99)).toThrow(
      RangeError,
    )
  })

  it('throws for an id naming a Cheat — a Cheat is not spent from the pile', () => {
    expect(() => spendConsumable([cheat(3)], 3)).toThrow(RangeError)
  })
})

describe('extraDiscardCharges — Second Thoughts stacks onto the fight’s budget', () => {
  it('gives 1 / 2 / 3 by tier', () => {
    expect(TIERS.map((t) => extraDiscardCharges(itemBuff(BuffKind.SecondThoughts, t)))).toEqual([
      1, 2, 3,
    ])
  })

  it('gives 0 for anything that is not a Second Thoughts, so a caller adds unconditionally', () => {
    expect(extraDiscardCharges(itemBuff(BuffKind.Ward, BuffTier.Gold))).toBe(0)
    expect(extraDiscardCharges(cheat())).toBe(0)
    expect(extraDiscardCharges(unassigned())).toBe(0)
  })
})

describe('absorbWithWard — up to N of one hit, and no remainder to carry', () => {
  it('absorbs the whole of a hit at or below N', () => {
    expect(absorbWithWard(3, 1)).toEqual({ absorbed: 1, throughToHealth: 0 })
    expect(absorbWithWard(3, 3)).toEqual({ absorbed: 3, throughToHealth: 0 })
  })

  it('lets the remainder through on a hit above N', () => {
    expect(absorbWithWard(1, 3)).toEqual({ absorbed: 1, throughToHealth: 2 })
    expect(absorbWithWard(0, 4)).toEqual({ absorbed: 0, throughToHealth: 4 })
  })

  it('absorbs nothing from a zero hit', () => {
    expect(absorbWithWard(3, 0)).toEqual({ absorbed: 0, throughToHealth: 0 })
  })

  it('survives a half-point band, which DAMAGE_ROUNDING = None legitimately produces', () => {
    expect(absorbWithWard(1, 2.5)).toEqual({ absorbed: 1, throughToHealth: 1.5 })
  })

  it('throws rather than minting NaN on a non-finite or negative Ward', () => {
    expect(() => absorbWithWard(Number.NaN, 1)).toThrow(RangeError)
    expect(() => absorbWithWard(-1, 1)).toThrow(RangeError)
  })

  it('throws rather than minting NaN on a non-finite or negative hit', () => {
    expect(() => absorbWithWard(1, Number.NaN)).toThrow(RangeError)
    expect(() => absorbWithWard(1, -1)).toThrow(RangeError)
  })
})
