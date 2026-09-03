import { describe, expect, it } from 'vitest'
import { cheatBuff, shieldBuff, timebombBuff } from '../buffCatalog'
import {
  AP_COST_MAX,
  AP_COST_MIN,
  CONSUMABLE_AP_COST,
  apCostOf,
  buffApCost,
  isConditionFamily,
  isConsumableKind,
  isProtectiveAxis,
  narrowToMintedAxis,
} from '../buffCosts'
import { BuffKind, BuffRewardAxis, BuffTier } from '../buffs'

const { Bronze, Silver, Gold } = BuffTier
const { Magnitude, Coins, ApRefund, Multiplier, Protection, HeartCount } = BuffRewardAxis

// DLR-111 → *AP costs, per family and reward*, transcribed cell for cell. `Blade` = magnitude,
// `Purse` = coins, `Second Wind` = apRefund, `Momentum` = multiplier. `undefined` marks a cell the
// document leaves blank — that family does not cross with that reward.
const AP_COSTS_PER_FAMILY_AND_REWARD: Readonly<
  Record<
    string,
    {
      readonly kind: (typeof BuffKind)[keyof typeof BuffKind]
      readonly Blade?: readonly [number, number, number]
      readonly Purse?: readonly [number, number, number]
      readonly SecondWind?: readonly [number, number, number]
      readonly Momentum?: readonly [number, number, number]
    }
  >
> = {
  Taker: {
    kind: BuffKind.Taker,
    Blade: [1, 2, 3],
    Purse: [2, 3, 4],
    SecondWind: [1, 1, 1],
    Momentum: [2, 3, 5],
  },
  Feeder: {
    kind: BuffKind.Feeder,
    Blade: [2, 3, 4],
    Purse: [3, 4, 5],
    SecondWind: [2, 2, 2],
    Momentum: [3, 4, 6],
  },
  MarkOfRank: { kind: BuffKind.MarkOfRank, Blade: [1, 1, 2], Momentum: [1, 2, 4] },
  Sidestep: { kind: BuffKind.Sidestep, Blade: [1, 1, 2], Momentum: [1, 2, 4] },
  Glutton: {
    kind: BuffKind.Glutton,
    Blade: [1, 2, 3],
    Purse: [2, 3, 4],
    SecondWind: [1, 1, 1],
    Momentum: [2, 3, 5],
  },
  Hoarder: {
    kind: BuffKind.Hoarder,
    Blade: [1, 2, 3],
    Purse: [2, 3, 4],
    SecondWind: [1, 1, 1],
    Momentum: [2, 3, 5],
  },
  Unbloodied: {
    kind: BuffKind.Unbloodied,
    Blade: [1, 2, 3],
    Purse: [2, 3, 4],
    SecondWind: [1, 1, 1],
    Momentum: [2, 3, 5],
  },
  DebtCollector: {
    kind: BuffKind.DebtCollector,
    Blade: [2, 3, 4],
    Purse: [3, 4, 5],
    SecondWind: [2, 2, 2],
    Momentum: [3, 4, 6],
  },
  Keepsake: { kind: BuffKind.Keepsake, Purse: [2, 3, 4] },
  Miser: { kind: BuffKind.Miser, Blade: [1, 1, 2], Momentum: [1, 2, 4] },
  Cornered: { kind: BuffKind.Cornered, Blade: [1, 1, 2], Momentum: [1, 2, 4] },
}

const REWARD_AXIS_BY_COLUMN = {
  Blade: Magnitude,
  Purse: Coins,
  SecondWind: ApRefund,
  Momentum: Multiplier,
} as const

const TIERS: readonly [BuffTier, BuffTier, BuffTier] = [Bronze, Silver, Gold]

describe('buffApCost — DLR-111 AP costs, per family and reward, cell for cell', () => {
  for (const [familyName, family] of Object.entries(AP_COSTS_PER_FAMILY_AND_REWARD)) {
    describe(familyName, () => {
      for (const column of Object.keys(REWARD_AXIS_BY_COLUMN) as Array<
        keyof typeof REWARD_AXIS_BY_COLUMN
      >) {
        const row = family[column]
        if (!row) continue
        const axis = REWARD_AXIS_BY_COLUMN[column]
        it(`prices the ${column} crossing bronze/silver/gold as documented`, () => {
          TIERS.forEach((tier, i) => {
            expect(buffApCost(family.kind, axis, tier)).toBe(row[i])
          })
        })
      }
    })
  }
})

describe('the four worked examples DLR-111 publishes', () => {
  it('Bell-Taker (Blade) bronze costs 1 AP', () => {
    expect(buffApCost(BuffKind.Taker, Magnitude, Bronze)).toBe(1)
  })

  it('Key-Feeder (Blade) silver costs 3 AP', () => {
    expect(buffApCost(BuffKind.Feeder, Magnitude, Silver)).toBe(3)
  })

  it('Mark of the 9 (Momentum) gold costs 4 AP', () => {
    expect(buffApCost(BuffKind.MarkOfRank, Multiplier, Gold)).toBe(4)
  })

  it('Moon-Keepsake (Purse) silver costs 3 AP', () => {
    expect(buffApCost(BuffKind.Keepsake, Coins, Silver)).toBe(3)
  })
})

describe('the clamp bites at both ends', () => {
  it('no computed cost is below AP_COST_MIN or above AP_COST_MAX, across every documented cell', () => {
    for (const family of Object.values(AP_COSTS_PER_FAMILY_AND_REWARD)) {
      for (const column of Object.keys(REWARD_AXIS_BY_COLUMN) as Array<
        keyof typeof REWARD_AXIS_BY_COLUMN
      >) {
        const row = family[column]
        if (!row) continue
        for (const cost of row) {
          expect(cost).toBeGreaterThanOrEqual(AP_COST_MIN)
          expect(cost).toBeLessThanOrEqual(AP_COST_MAX)
        }
      }
    }
  })
})

describe('CONSUMABLE_AP_COST — the eight off-curve prices', () => {
  it('ward is flat at 2', () => {
    expect(CONSUMABLE_AP_COST[BuffKind.Ward]).toEqual({ bronze: 2, silver: 2, gold: 2 })
  })

  it('puppeteer is flat at 4 (single tier only in the source)', () => {
    expect(CONSUMABLE_AP_COST[BuffKind.Puppeteer]).toEqual({ bronze: 4, silver: 4, gold: 4 })
  })

  it('secondThoughts is 2/3/4', () => {
    expect(CONSUMABLE_AP_COST[BuffKind.SecondThoughts]).toEqual({ bronze: 2, silver: 3, gold: 4 })
  })

  it('foresight is 1/2/3', () => {
    expect(CONSUMABLE_AP_COST[BuffKind.Foresight]).toEqual({ bronze: 1, silver: 2, gold: 3 })
  })

  it('spyglass is 2/3/4', () => {
    expect(CONSUMABLE_AP_COST[BuffKind.Spyglass]).toEqual({ bronze: 2, silver: 3, gold: 4 })
  })

  it('cheat is 3/5/7 — gold deliberately above STARTING_AP', () => {
    expect(CONSUMABLE_AP_COST[BuffKind.Cheat]).toEqual({ bronze: 3, silver: 5, gold: 7 })
  })

  it('timebomb is flat at 2', () => {
    expect(CONSUMABLE_AP_COST[BuffKind.Timebomb]).toEqual({ bronze: 2, silver: 2, gold: 2 })
  })

  // DLR-110 — 2/3/4 is a DEVELOPER DECISION nobody has made; no source document prices Shield.
  // Pinned so the placeholder cannot drift silently, not because the figures are settled.
  it('shield is 2/3/4 — a placeholder ladder, see the table’s own comment', () => {
    expect(CONSUMABLE_AP_COST[BuffKind.Shield]).toEqual({ bronze: 2, silver: 3, gold: 4 })
  })

  it('DLR-110 — Shield is a consumable kind, so apCostOf can price it', () => {
    expect(isConsumableKind(BuffKind.Shield)).toBe(true)
  })

  it('DLR-110 — apCostOf prices a Shield buff rather than throwing on an unpriced kind', () => {
    expect(apCostOf(shieldBuff(Silver, 3))).toBe(3)
  })
})

describe('apCostOf reads through the real buffCatalog.ts minters', () => {
  it('a gold Cheat costs 7', () => {
    expect(apCostOf(cheatBuff(Gold, 1))).toBe(7)
  })

  it('a gold Timebomb costs 2', () => {
    expect(apCostOf(timebombBuff(Gold, 2))).toBe(2)
  })
})

describe('apCostOf throws on placeholder content', () => {
  it('throws RangeError on a buff of kind Unassigned', () => {
    const placeholder = {
      id: 1,
      kind: BuffKind.Unassigned,
      tier: Bronze,
      condition: { kind: 'unassigned' },
      reward: { axis: Magnitude, value: 0 },
    }
    expect(() => apCostOf(placeholder)).toThrow(RangeError)
  })
})

describe('DLR-161 — the two protective families price on the Protection axis', () => {
  it('buffApCost prices SkullHelmet at the clamped REWARD_BASE + CONDITION_MODIFIER (0) at all three tiers', () => {
    expect(buffApCost(BuffKind.SkullHelmet, Protection, Bronze)).toBe(2)
    expect(buffApCost(BuffKind.SkullHelmet, Protection, Silver)).toBe(3)
    expect(buffApCost(BuffKind.SkullHelmet, Protection, Gold)).toBe(4)
  })

  it('buffApCost prices SkullTether identically', () => {
    expect(buffApCost(BuffKind.SkullTether, Protection, Bronze)).toBe(2)
    expect(buffApCost(BuffKind.SkullTether, Protection, Silver)).toBe(3)
    expect(buffApCost(BuffKind.SkullTether, Protection, Gold)).toBe(4)
  })

  it('isConditionFamily is true for both new kinds', () => {
    expect(isConditionFamily(BuffKind.SkullHelmet)).toBe(true)
    expect(isConditionFamily(BuffKind.SkullTether)).toBe(true)
  })

  it('isProtectiveAxis is true only for Protection', () => {
    expect(isProtectiveAxis(Protection)).toBe(true)
    expect(isProtectiveAxis(Magnitude)).toBe(false)
    expect(isProtectiveAxis(Coins)).toBe(false)
  })

  it('narrowToMintedAxis accepts Protection and every BuffCostAxis, and still throws on HeartCount', () => {
    expect(narrowToMintedAxis(Protection, 'Reward axis')).toBe(Protection)
    expect(narrowToMintedAxis(Magnitude, 'Reward axis')).toBe(Magnitude)
    expect(() => narrowToMintedAxis(HeartCount, 'Reward axis')).toThrow(RangeError)
  })
})

describe('every returned cost is an integer', () => {
  it('holds across every documented family/axis/tier combination', () => {
    for (const family of Object.values(AP_COSTS_PER_FAMILY_AND_REWARD)) {
      for (const column of Object.keys(REWARD_AXIS_BY_COLUMN) as Array<
        keyof typeof REWARD_AXIS_BY_COLUMN
      >) {
        const axis = REWARD_AXIS_BY_COLUMN[column]
        if (!family[column]) continue
        for (const tier of TIERS) {
          expect(Number.isInteger(buffApCost(family.kind, axis, tier))).toBe(true)
        }
      }
    }
  })
})
