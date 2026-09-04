import { describe, expect, it } from 'vitest'
import {
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  BuffTier,
  mintFromTemplate,
  templateById,
  type Buff,
} from '../../../hunt'
import { buffFiredText, firedBuffNames, overlapBonusText } from '../buffFiredLabels'

// Same construction idiom as `buffRoundState.test.ts`'s own `buff` helper.
const buff = (id: string, tier: BuffTier, buffId: number): Buff =>
  mintFromTemplate(templateById(id)!, tier, buffId)

// Three suit/family variants, all on the Momentum axis at Bronze (+2), so the fired-text cases
// below can add the Overlap Bonus (also Momentum) without a second axis in the mix.
const bellHigh = buff('suitHigh:bells:multiplier', BuffTier.Bronze, 1)
// Suit Low is Blade-only in the pared pool (DLR-145) — `suitLow:keys:multiplier` has no surviving
// template (`TEMPLATE_FAMILIES` lists only `[BuffRewardAxis.Magnitude]` for Suit Low). The
// Multiplier version is still declared on `BuffKind`/`buffFires`, just off the shelf — see
// `buffTemplates.ts`'s own comment on restoring it — so it is built directly as a `Buff` literal.
const keyLow: Buff = {
  id: 2,
  kind: BuffKind.SuitLow,
  tier: BuffTier.Bronze,
  condition: { kind: BuffKind.SuitLow, target: { suit: BuffTargetSuit.Keys } },
  reward: { axis: BuffRewardAxis.Multiplier, value: 2 },
}
// Hoarder has no surviving template (DLR-145) — still declared on `BuffKind`, so built directly
// as a `Buff` literal, same idiom as `buffRoundState.test.ts`'s `hoarder`.
const hoarder: Buff = {
  id: 3,
  kind: BuffKind.Hoarder,
  tier: BuffTier.Bronze,
  condition: { kind: BuffKind.Hoarder },
  reward: { axis: BuffRewardAxis.Multiplier, value: 2 },
}

describe('overlapBonusText', () => {
  it('says nothing below two fired buffs, because the bonus is zero there', () => {
    expect(overlapBonusText(0)).toBeNull()
    expect(overlapBonusText(1)).toBeNull()
  })

  it('names the bonus and its figure, taken from overlapBonusFor', () => {
    expect(overlapBonusText(3)).toBe('Overlap Bonus +2 Momentum.')
  })
})

describe('firedBuffNames', () => {
  it('resolves ids against the offered pile, in fired order', () => {
    expect(firedBuffNames([keyLow.id, bellHigh.id], [bellHigh, keyLow])).toEqual([
      'Key Low (Momentum)',
      'Bell High (Momentum)',
    ])
  })

  it('drops an id with no match rather than rendering undefined into a sentence', () => {
    expect(firedBuffNames([999], [bellHigh])).toEqual([])
  })
})

describe('buffFiredText', () => {
  it('says nothing when nothing fired', () => {
    expect(buffFiredText([], [])).toBeNull()
  })

  it('names one fired buff and its reward', () => {
    expect(buffFiredText([bellHigh.id], [bellHigh])).toBe('Bell High (Momentum): +2 multiplier.')
  })

  it('names several, and the Overlap Bonus after them', () => {
    expect(buffFiredText([bellHigh.id, keyLow.id, hoarder.id], [bellHigh, keyLow, hoarder])).toBe(
      'Bell High (Momentum): +2 multiplier. Key Low (Momentum): +2 multiplier. ' +
        'Hoarder (Momentum): +2 multiplier. Overlap Bonus +2 Momentum.',
    )
  })
})
