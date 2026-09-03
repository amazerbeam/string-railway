import { describe, expect, it } from 'vitest'
import { BuffKind, BuffRewardAxis, BuffTier } from '../buffs'
import { BUFF_TEMPLATES, mintFromTemplate, templateById } from '../buffTemplates'
import { CHEAT_DURATION_TRICKS } from '../buffCatalog'
import { apCostOf } from '../buffCosts'

describe('the activated templates', () => {
  // DLR-162 added the wildcard and DLR-167 adds Curse; this count was left at 1 by DLR-162.
  it('puts exactly three activated templates in the pool', () => {
    expect(BUFF_TEMPLATES.filter((t) => t.form === 'activated')).toHaveLength(3)
  })

  it('DLR-167 — resolves Curse by its frozen persisted id', () => {
    expect(templateById('curse')?.kind).toBe(BuffKind.Curse)
  })

  it('resolves it by its frozen persisted id', () => {
    expect(templateById('cheat')?.kind).toBe(BuffKind.Cheat)
  })

  it('DLR-166 — the deleted activated card no longer resolves by its persisted id', () => {
    expect(templateById('timebomb')).toBeUndefined()
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

  // The assertion is `>= 0`, not `> 0`: DLR-162 prices the wildcard at 0 AP DELIBERATELY (it is
  // refused on the felt by `ShopOnly` before AP is ever consulted), which left this spec's original
  // `> 0` failing. What is being pinned is that every activated template PRICES rather than throws.
  it('prices every activated template at every tier without throwing', () => {
    for (const template of BUFF_TEMPLATES.filter((t) => t.form === 'activated')) {
      for (const tier of [BuffTier.Bronze, BuffTier.Silver, BuffTier.Gold]) {
        expect(apCostOf(mintFromTemplate(template, tier, 1))).toBeGreaterThanOrEqual(0)
      }
    }
  })
})