import { describe, expect, it } from 'vitest'
import {
  BUFF_TEMPLATES,
  BUFF_TEMPLATE_COUNT,
  CONDITION_THRESHOLD,
  REWARD_TIER_VALUE,
  conditionThresholdOf,
  mintFromTemplate,
  templateById,
  templateForBuff,
  templateIdForBuff,
  templatesForFamily,
} from '../buffTemplates'
import { BuffKind, BuffRewardAxis, BuffTier, type Buff } from '../buffs'
import { apCostOf, isConditionFamily } from '../buffCosts'

describe('BUFF_TEMPLATES', () => {
  // DLR-166 — 17, not DLR-161's 18: 6 Taker + 6 Feeder + 2 Sidestep + 1 Skull Helmet +
  // 1 Skull Tether + 1 Cheat. The second activated card was deleted outright.
  it('holds exactly the 17 templates DLR-166 leaves', () => {
    expect(BUFF_TEMPLATES).toHaveLength(17)
    expect(BUFF_TEMPLATE_COUNT).toBe(17)
    expect(BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.Taker)).toHaveLength(6)
    expect(BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.Feeder)).toHaveLength(6)
    expect(BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.Sidestep)).toHaveLength(2)
    expect(BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.SkullHelmet)).toHaveLength(1)
    expect(BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.SkullTether)).toHaveLength(1)
    expect(BUFF_TEMPLATES.filter((t) => t.form === 'activated')).toHaveLength(1)
  })

  it('DLR-161 — resolves both new template ids through templateById', () => {
    expect(templateById('skullHelmet:protection')).toBeDefined()
    expect(templateById('skullTether:protection')).toBeDefined()
  })

  it('resolves the three Momentum Feeder ids DLR-150 restored, persisted by the Vault', () => {
    expect(templateById('feeder:bells:multiplier')).toBeDefined()
    expect(templateById('feeder:keys:multiplier')).toBeDefined()
    expect(templateById('feeder:moons:multiplier')).toBeDefined()
  })

  it('mints no card on a cut reward axis', () => {
    for (const template of BUFF_TEMPLATES) {
      if (template.form !== 'condition') continue
      expect([
        BuffRewardAxis.Magnitude,
        BuffRewardAxis.Multiplier,
        BuffRewardAxis.Protection,
      ]).toContain(template.axis)
    }
  })

  it('every Feeder pays on Blade or Momentum', () => {
    const feeders = BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.Feeder)
    expect(
      feeders.every(
        (t) =>
          t.form === 'condition' &&
          (t.axis === BuffRewardAxis.Magnitude || t.axis === BuffRewardAxis.Multiplier),
      ),
    ).toBe(true)
  })

  it('gives every template a unique id', () => {
    expect(new Set(BUFF_TEMPLATES.map((t) => t.id)).size).toBe(BUFF_TEMPLATES.length)
  })

  it('holds no consumable and no cut-family card', () => {
    for (const template of BUFF_TEMPLATES) {
      if (template.form !== 'condition') continue
      expect(isConditionFamily(template.kind)).toBe(true)
    }
  })

  it('parameterises exactly the suit-carrying Taker and Feeder templates', () => {
    expect(
      BUFF_TEMPLATES.filter((t) => t.form === 'condition' && t.target !== undefined),
    ).toHaveLength(6 + 6)
  })
})

describe('REWARD_TIER_VALUE', () => {
  it('transcribes DLR-111s reward master tier list — including the two cut, still-declared axes', () => {
    expect(REWARD_TIER_VALUE[BuffRewardAxis.Magnitude]).toEqual({ bronze: 1, silver: 3, gold: 5 })
    expect(REWARD_TIER_VALUE[BuffRewardAxis.Coins]).toEqual({ bronze: 2, silver: 5, gold: 10 })
    expect(REWARD_TIER_VALUE[BuffRewardAxis.ApRefund]).toEqual({ bronze: 1, silver: 2, gold: 3 })
    expect(REWARD_TIER_VALUE[BuffRewardAxis.Multiplier]).toEqual({ bronze: 2, silver: 3, gold: 5 })
  })

  it('DLR-161 AC6 — Protection is 0/0/1', () => {
    expect(REWARD_TIER_VALUE[BuffRewardAxis.Protection]).toEqual({ bronze: 0, silver: 0, gold: 1 })
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

  it('carries the suit onto the minted conditions target', () => {
    const taker = templatesForFamily(BuffKind.Taker).find(
      (t) => t.form === 'condition' && t.target?.suit !== undefined,
    )
    expect(taker).toBeDefined()
    expect(mintFromTemplate(taker!, BuffTier.Gold, 1).condition.target?.suit).toBeDefined()
  })
})

describe('conditionThresholdOf', () => {
  it('reads the tier-parameterised threshold for a threshold family — still declared, no longer mintable', () => {
    // Hoarder has no surviving template (DLR-145), so this constructs the Buff directly rather
    // than minting one — `CONDITION_THRESHOLD` and `BuffThresholdFamily` are unchanged by the
    // pruning and must still answer for a card a save or a future TEMPLATE_FAMILIES row could name.
    const hoarder: Buff = {
      id: 1,
      kind: BuffKind.Hoarder,
      tier: BuffTier.Gold,
      condition: { kind: BuffKind.Hoarder },
      reward: { axis: BuffRewardAxis.Magnitude, value: 0 },
    }
    expect(conditionThresholdOf(hoarder)).toBe(CONDITION_THRESHOLD[BuffKind.Hoarder][BuffTier.Gold])
  })

  it('returns null — a real answer — for a family with no threshold', () => {
    const taker = templatesForFamily(BuffKind.Taker)[0]
    expect(conditionThresholdOf(mintFromTemplate(taker, BuffTier.Bronze, 1))).toBeNull()
  })
})

describe('templateIdForBuff', () => {
  it('round-trips every template in the pool at every tier', () => {
    for (const template of BUFF_TEMPLATES) {
      for (const tier of [BuffTier.Bronze, BuffTier.Silver, BuffTier.Gold]) {
        const minted = mintFromTemplate(template, tier, 1)
        expect(templateIdForBuff(minted)).toBe(template.id)
        expect(templateForBuff(minted)).toBe(template)
      }
    }
  })
})
