import { describe, expect, it } from 'vitest'
import { BuffTier, mintFromTemplate, templateById, type Buff } from '../../../hunt'
import { buffFiredText, firedBuffNames, overlapBonusText } from '../buffFiredLabels'

// Same construction idiom as `buffRoundState.test.ts`'s own `buff` helper.
const buff = (id: string, tier: BuffTier, buffId: number): Buff =>
  mintFromTemplate(templateById(id)!, tier, buffId)

// Three suit/family variants, all on the Momentum axis at Bronze (+2), so the fired-text cases
// below can add the Overlap Bonus (also Momentum) without a second axis in the mix.
const taker = buff('taker:bells:multiplier', BuffTier.Bronze, 1)
const feeder = buff('feeder:keys:multiplier', BuffTier.Bronze, 2)
const hoarder = buff('hoarder:multiplier', BuffTier.Bronze, 3)

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
    expect(firedBuffNames([feeder.id, taker.id], [taker, feeder])).toEqual([
      'Key-Feeder (Momentum)',
      'Bell-Taker (Momentum)',
    ])
  })

  it('drops an id with no match rather than rendering undefined into a sentence', () => {
    expect(firedBuffNames([999], [taker])).toEqual([])
  })
})

describe('buffFiredText', () => {
  it('says nothing when nothing fired', () => {
    expect(buffFiredText([], [])).toBeNull()
  })

  it('names one fired buff and its reward', () => {
    expect(buffFiredText([taker.id], [taker])).toBe('Bell-Taker (Momentum): +2 multiplier.')
  })

  it('names several, and the Overlap Bonus after them', () => {
    expect(buffFiredText([taker.id, feeder.id, hoarder.id], [taker, feeder, hoarder])).toBe(
      'Bell-Taker (Momentum): +2 multiplier. Key-Feeder (Momentum): +2 multiplier. ' +
        'Hoarder (Momentum): +2 multiplier. Overlap Bonus +2 Momentum.',
    )
  })
})
