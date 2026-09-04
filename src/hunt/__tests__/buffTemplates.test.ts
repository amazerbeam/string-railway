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
import { wildcardBuff } from '../buffCatalog'
import { apCostOf, isConditionFamily } from '../buffCosts'

describe('BUFF_TEMPLATES', () => {
  // DLR-167 — 19: 6 Suit High + 6 Suit Low + 2 Skull Low + 1 Skull Helmet + 1 Skull Tether, plus the
  // three activated cards Cheat, the wildcard and Curse. (DLR-166 deleted a fourth outright.)
  it('holds exactly the 19 templates DLR-167 leaves', () => {
    expect(BUFF_TEMPLATES).toHaveLength(19)
    expect(BUFF_TEMPLATE_COUNT).toBe(19)
    expect(BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.SuitHigh)).toHaveLength(6)
    expect(BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.SuitLow)).toHaveLength(6)
    expect(BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.SkullLow)).toHaveLength(2)
    expect(BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.SkullHelmet)).toHaveLength(1)
    expect(BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.SkullTether)).toHaveLength(1)
    expect(BUFF_TEMPLATES.filter((t) => t.form === 'activated')).toHaveLength(3)
  })

  it('DLR-161 — resolves both new template ids through templateById', () => {
    expect(templateById('skullHelmet:protection')).toBeDefined()
    expect(templateById('skullTether:protection')).toBeDefined()
  })

  it('resolves the three Momentum Suit Low ids DLR-150 restored, persisted by the Vault', () => {
    expect(templateById('suitLow:bells:multiplier')).toBeDefined()
    expect(templateById('suitLow:keys:multiplier')).toBeDefined()
    expect(templateById('suitLow:moons:multiplier')).toBeDefined()
  })

  it('composes template ids from the current BuffKind values, which are PERSISTED', () => {
    // DLR-165 — a rename of any of these values orphans every Vault entry keyed on the old id.
    // If this test fails, the fix is a SAVE_SCHEMA_VERSION bump in the same change, not a new
    // expectation string. See `.claude/rules/save-data-versioning.md`.
    const ids = BUFF_TEMPLATES.map((t) => t.id)
    expect(ids).toContain('suitHigh:bells:magnitude')
    expect(ids).toContain('suitLow:bells:multiplier')
    expect(ids).toContain('skullLow:magnitude')
    expect(ids.some((id) => /^(taker|feeder|sidestep)[:$]/.test(id))).toBe(false)
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

  it('every Suit Low card pays on Blade or Momentum', () => {
    const suitLows = BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.SuitLow)
    expect(
      suitLows.every(
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

  it('parameterises exactly the suit-carrying Suit High and Suit Low templates', () => {
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
    const template = templatesForFamily(BuffKind.SuitHigh)[0]
    if (template.form !== 'condition') throw new Error('SuitHigh is a condition family')
    const buff = mintFromTemplate(template, BuffTier.Silver, 42)
    expect(buff.id).toBe(42)
    expect(buff.kind).toBe(BuffKind.SuitHigh)
    expect(buff.tier).toBe(BuffTier.Silver)
    expect(buff.condition.kind).toBe(BuffKind.SuitHigh)
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
    const suitHigh = templatesForFamily(BuffKind.SuitHigh).find(
      (t) => t.form === 'condition' && t.target?.suit !== undefined,
    )
    expect(suitHigh).toBeDefined()
    expect(mintFromTemplate(suitHigh!, BuffTier.Gold, 1).condition.target?.suit).toBeDefined()
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
    const suitHigh = templatesForFamily(BuffKind.SuitHigh)[0]
    expect(conditionThresholdOf(mintFromTemplate(suitHigh, BuffTier.Bronze, 1))).toBeNull()
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

describe('the wildcard template (DLR-162 AC1)', () => {
  // DLR-167 added a third ACTIVATED template on the same terms; the point this pins is that
  // neither ticket added a CONDITION template, so `FAMILY_AXIS_TOTAL` is untouched.
  it('takes the pool to 19 - one more ACTIVATED template, no new condition template', () => {
    expect(BUFF_TEMPLATE_COUNT).toBe(19)
    expect(BUFF_TEMPLATES.filter((t) => t.form === 'condition')).toHaveLength(16)
    expect(BUFF_TEMPLATES.filter((t) => t.form === 'activated')).toHaveLength(3)
  })

  it('is resolvable by its frozen bare-kind id', () => {
    const template = templateById('wildcard')
    expect(template).toEqual({ form: 'activated', id: 'wildcard', kind: BuffKind.Wildcard })
  })

  it('mints a Wildcard and NOT a Cheat - the activated branch is total, not a binary', () => {
    const template = templateById('wildcard')!
    const minted = mintFromTemplate(template, BuffTier.Gold, 5)
    expect(minted.kind).toBe(BuffKind.Wildcard)
    expect(minted.tier).toBe(BuffTier.Gold)
  })

  it('recomposes its own template id from a minted card', () => {
    expect(templateIdForBuff(wildcardBuff(BuffTier.Bronze, 1))).toBe('wildcard')
  })
})
