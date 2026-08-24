import { describe, expect, it } from 'vitest'
import { BuffKind, BuffRewardAxis, BuffTier } from '../buffs'
import { BUFF_TEMPLATES, mintFromTemplate, templateById } from '../buffTemplates'
import { CHEAT_DURATION_TRICKS, TIMEBOMB_DAMAGE } from '../buffCatalog'
import { apCostOf } from '../buffCosts'

describe('the activated templates', () => {
  it('puts exactly two activated templates in the pool', () => {
    expect(BUFF_TEMPLATES.filter((t) => t.form === 'activated')).toHaveLength(2)
  })

  it('resolves both by their frozen persisted ids', () => {
    expect(templateById('cheat')?.kind).toBe(BuffKind.Cheat)
    expect(templateById('timebomb')?.kind).toBe(BuffKind.Timebomb)
  })

  it('mints a Cheat whose reward is that tier of no-follow-suit duration', () => {
    const buff = mintFromTemplate(templateById('cheat')!, BuffTier.Silver, 42)
    expect(buff).toMatchObject({
      id: 42,
      kind: BuffKind.Cheat,
      tier: BuffTier.Silver,
      reward: {
        axis: BuffRewardAxis.DurationTricks,
        value: CHEAT_DURATION_TRICKS[BuffTier.Silver],
      },
    })
  })

  it('mints a Timebomb carrying that tier of Quarry-side damage', () => {
    const buff = mintFromTemplate(templateById('timebomb')!, BuffTier.Gold, 7)
    expect(buff.reward.value).toBe(TIMEBOMB_DAMAGE[BuffTier.Gold].quarry)
  })

  it('prices every activated template at every tier without throwing', () => {
    for (const template of BUFF_TEMPLATES.filter((t) => t.form === 'activated')) {
      for (const tier of [BuffTier.Bronze, BuffTier.Silver, BuffTier.Gold]) {
        expect(apCostOf(mintFromTemplate(template, tier, 1))).toBeGreaterThan(0)
      }
    }
  })
})
