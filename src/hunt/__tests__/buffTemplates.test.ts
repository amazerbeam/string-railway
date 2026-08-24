import { describe, expect, it } from 'vitest'
import {
  BUFF_TEMPLATES,
  BUFF_TEMPLATE_COUNT,
  CONDITION_THRESHOLD,
  REWARD_TIER_VALUE,
  conditionThresholdOf,
  mintFromTemplate,
  templatesForFamily,
} from '../buffTemplates'
import { BuffKind, BuffRewardAxis, BuffTier } from '../buffs'
import { apCostOf, isConditionFamily } from '../buffCosts'

const EXPECTED_COUNTS: ReadonlyArray<readonly [string, number]> = [
  [BuffKind.Taker, 12],
  [BuffKind.Feeder, 12],
  [BuffKind.MarkOfRank, 22],
  [BuffKind.Sidestep, 2],
  [BuffKind.Glutton, 4],
  [BuffKind.Hoarder, 4],
  [BuffKind.Unbloodied, 4],
  [BuffKind.DebtCollector, 4],
  [BuffKind.Keepsake, 3],
  [BuffKind.Miser, 2],
  [BuffKind.Cornered, 2],
]

describe('BUFF_TEMPLATES', () => {
  it('holds exactly the 71 condition templates DLR-111 decided, plus the 2 DLR-132 activated ones', () => {
    expect(BUFF_TEMPLATES).toHaveLength(73)
    expect(BUFF_TEMPLATE_COUNT).toBe(73)
  })

  it.each(EXPECTED_COUNTS)('crosses %s into %i templates', (kind, count) => {
    expect(templatesForFamily(kind as never)).toHaveLength(count)
  })

  it('gives every template a unique id', () => {
    expect(new Set(BUFF_TEMPLATES.map((t) => t.id)).size).toBe(BUFF_TEMPLATES.length)
  })

  it('holds no consumable card — AC6 is DLR-126s (DLR-132 added Cheat and Timebomb only)', () => {
    for (const template of BUFF_TEMPLATES) {
      if (template.form !== 'condition') continue
      expect(isConditionFamily(template.kind)).toBe(true)
    }
  })

  it('parameterises exactly the 49 suit- or rank-carrying templates', () => {
    expect(
      BUFF_TEMPLATES.filter((t) => t.form === 'condition' && t.target !== undefined),
    ).toHaveLength(12 + 12 + 22 + 3)
  })

  it('pays Keepsake on coins alone', () => {
    for (const template of templatesForFamily(BuffKind.Keepsake)) {
      if (template.form !== 'condition') continue
      expect(template.axis).toBe(BuffRewardAxis.Coins)
    }
  })
})

describe('REWARD_TIER_VALUE', () => {
  it('transcribes DLR-111s reward master tier list', () => {
    expect(REWARD_TIER_VALUE[BuffRewardAxis.Magnitude]).toEqual({ bronze: 1, silver: 3, gold: 5 })
    expect(REWARD_TIER_VALUE[BuffRewardAxis.Coins]).toEqual({ bronze: 2, silver: 5, gold: 10 })
    expect(REWARD_TIER_VALUE[BuffRewardAxis.ApRefund]).toEqual({ bronze: 1, silver: 2, gold: 3 })
    expect(REWARD_TIER_VALUE[BuffRewardAxis.Multiplier]).toEqual({ bronze: 2, silver: 3, gold: 5 })
  })
})

describe('mintFromTemplate', () => {
  it('mints a priceable Buff carrying the callers id and the tiers reward value', () => {
    const template = templatesForFamily(BuffKind.Taker)[0]
    if (template.form !== 'condition') throw new Error('Taker is a condition family')
    const buff = mintFromTemplate(template, BuffTier.Silver, 42)
    expect(buff.id).toBe(42)
    expect(buff.kind).toBe(BuffKind.Taker)
    expect(buff.tier).toBe(BuffTier.Silver)
    expect(buff.condition.kind).toBe(BuffKind.Taker)
    expect(buff.reward.value).toBe(REWARD_TIER_VALUE[template.axis][BuffTier.Silver])
    expect(() => apCostOf(buff)).not.toThrow()
  })

  it('prices every CONDITION template at every tier within the AP_COST_MIN..AP_COST_MAX clamp', () => {
    // DLR-132 — the two ACTIVATED templates are priced off `CONSUMABLE_AP_COST`, not this clamp
    // (gold Cheat is deliberately 7, above the clamp's ceiling — `buffTemplates.activated.test.ts`
    // covers those two without asserting the condition-only bound).
    for (const template of BUFF_TEMPLATES) {
      if (template.form !== 'condition') continue
      for (const tier of [BuffTier.Bronze, BuffTier.Silver, BuffTier.Gold]) {
        const cost = apCostOf(mintFromTemplate(template, tier, 1))
        expect(cost).toBeGreaterThanOrEqual(1)
        expect(cost).toBeLessThanOrEqual(6)
      }
    }
  })

  it('carries the suit or rank onto the minted conditions target', () => {
    const mark = templatesForFamily(BuffKind.MarkOfRank).find(
      (t) => t.form === 'condition' && t.target?.rank === 9,
    )
    expect(mark).toBeDefined()
    expect(mintFromTemplate(mark!, BuffTier.Gold, 1).condition.target?.rank).toBe(9)
  })
})

describe('conditionThresholdOf', () => {
  it('reads the tier-parameterised threshold for a threshold family', () => {
    const hoarder = templatesForFamily(BuffKind.Hoarder)[0]
    expect(conditionThresholdOf(mintFromTemplate(hoarder, BuffTier.Gold, 1))).toBe(
      CONDITION_THRESHOLD[BuffKind.Hoarder][BuffTier.Gold],
    )
  })

  it('returns null — a real answer — for a family with no threshold', () => {
    const taker = templatesForFamily(BuffKind.Taker)[0]
    expect(conditionThresholdOf(mintFromTemplate(taker, BuffTier.Bronze, 1))).toBeNull()
  })
})
