import { describe, expect, it } from 'vitest'
import { isRevocableBuff } from '../buffActivation'
import { CURSE_REWARD, cheatBuff, curseBuff, curseRewardOf } from '../buffCatalog'
import { apCostOf, CONSUMABLE_AP_COST } from '../buffCosts'
import { BuffKind, BuffRewardAxis, BuffTier } from '../buffs'
import { isConsumableItem } from '../consumables'
import {
  BUFF_TEMPLATE_COUNT,
  mintFromTemplate,
  templateById,
  templateIdForBuff,
} from '../buffTemplates'

describe('CURSE_REWARD', () => {
  it('pays AC6 figures at each tier', () => {
    expect(CURSE_REWARD.bronze).toEqual({ damage: 1, multiplier: 0 })
    expect(CURSE_REWARD.silver).toEqual({ damage: 2, multiplier: 0 })
    expect(CURSE_REWARD.gold).toEqual({ damage: 2, multiplier: 1 })
  })
})

describe('curseBuff', () => {
  it('carries the damage half as the minted reward value', () => {
    const gold = curseBuff(BuffTier.Gold, 7)
    expect(gold.kind).toBe(BuffKind.Curse)
    expect(gold.reward.axis).toBe(BuffRewardAxis.Magnitude)
    expect(gold.reward.value).toBe(2)
  })

  it('takes the id it is handed rather than inventing one', () => {
    expect(curseBuff(BuffTier.Bronze, 41).id).toBe(41)
  })
})

describe('curseRewardOf', () => {
  it('returns BOTH figures for the card`s own tier', () => {
    expect(curseRewardOf(curseBuff(BuffTier.Gold, 4))).toEqual({ damage: 2, multiplier: 1 })
  })

  it('throws on a buff that is not a Curse', () => {
    expect(() => curseRewardOf(cheatBuff(BuffTier.Bronze, 1))).toThrow(RangeError)
  })
})

describe('the Curse template (AC1)', () => {
  it('mints Curse from its activated template', () => {
    const template = templateById('curse')
    expect(template).toBeDefined()
    expect(mintFromTemplate(template!, BuffTier.Silver, 3).kind).toBe(BuffKind.Curse)
  })

  it('mints it at the tier it is asked for', () => {
    const template = templateById('curse')!
    expect(mintFromTemplate(template, BuffTier.Gold, 3).reward.value).toBe(2)
  })

  it('takes the pool to 19 templates', () => {
    expect(BUFF_TEMPLATE_COUNT).toBe(19)
  })

  it('round-trips a minted Curse back to its template id', () => {
    expect(templateIdForBuff(curseBuff(BuffTier.Gold, 4))).toBe('curse')
  })
})

describe('Curse`s price and its single use', () => {
  it('is priced through the existing consumable table (AC2)', () => {
    expect(apCostOf(curseBuff(BuffTier.Silver, 1))).toBe(CONSUMABLE_AP_COST.curse.silver)
  })

  it('is priced at every tier', () => {
    for (const tier of [BuffTier.Bronze, BuffTier.Silver, BuffTier.Gold]) {
      expect(() => apCostOf(curseBuff(tier, 1))).not.toThrow()
    }
  })

  it('is spent on use (AC8)', () => {
    expect(isConsumableItem(curseBuff(BuffTier.Bronze, 1))).toBe(true)
  })

  it('cannot be taken back off the trick (AC8)', () => {
    expect(isRevocableBuff(curseBuff(BuffTier.Bronze, 1))).toBe(false)
  })
})
