import { describe, expect, it } from 'vitest'
import {
  BuffTier,
  CombineRefusal,
  WildRefusal,
  mintFromTemplate,
  templateById,
  wildenedBuff,
  type Buff,
  type BuffId,
} from '../../../hunt'
import {
  COMBINE_REFUSAL_MESSAGE,
  WILD_REFUSAL_MESSAGE,
  combineConfirmDestroyPairText,
  combineConfirmDestroyText,
  wildConfirmDestroyText,
  wildConfirmMakeText,
  wildDoneText,
  wildTargetTileAccessibleName,
} from '../manageBuffsLabels'

/**
 * DLR-162 — this spec is NEW. The plan named it as an existing file to modify; it did not exist on
 * disk, so the wildcard's copy helpers get their first coverage here alongside the two refusal
 * tables they sit beside.
 */
function fromTemplate(id: string, tier: BuffTier, buffId: BuffId): Buff {
  const template = templateById(id)
  if (template === undefined) throw new Error(`No template for id '${id}'`)
  return mintFromTemplate(template, tier, buffId)
}

const bellTaker = (tier: BuffTier, id: BuffId) => fromTemplate('taker:bells:magnitude', tier, id)

describe('the refusal tables are total', () => {
  it('words every combine refusal, including the wildcard one', () => {
    for (const refusal of Object.values(CombineRefusal)) {
      expect(COMBINE_REFUSAL_MESSAGE[refusal]).toBeTruthy()
    }
  })

  it('words both wild refusals', () => {
    expect(WILD_REFUSAL_MESSAGE[WildRefusal.NoSuit]).toBeTruthy()
    expect(WILD_REFUSAL_MESSAGE[WildRefusal.AlreadyWild]).toBeTruthy()
    expect(Object.keys(WILD_REFUSAL_MESSAGE)).toHaveLength(Object.values(WildRefusal).length)
  })
})

describe('combineConfirmDestroyPairText (DLR-162)', () => {
  it('says "2 ×" for an ordinary same-card combine', () => {
    const card = bellTaker(BuffTier.Bronze, 1)
    expect(combineConfirmDestroyPairText(card, null)).toBe(combineConfirmDestroyText(card))
    expect(combineConfirmDestroyPairText(card, null)).toBe('2 × Bronze Bell-Taker (Blade)')
  })

  it('names BOTH cards when a wild pile eats a suited one', () => {
    const wild = wildenedBuff(bellTaker(BuffTier.Bronze, 1))
    const suited = bellTaker(BuffTier.Bronze, 2)
    expect(combineConfirmDestroyPairText(wild, suited)).toBe(
      '1 × Bronze Wild Taker (Blade) + 1 × Bronze Bell-Taker (Blade)',
    )
  })
})

describe('the wildcard spend confirmation (DLR-162)', () => {
  const suited = bellTaker(BuffTier.Silver, 3)
  const made = wildenedBuff(suited)

  it('names the wildcard destroyed, at its own tier', () => {
    expect(wildConfirmDestroyText(BuffTier.Bronze)).toBe('1 × Bronze Wildcard')
    expect(wildConfirmDestroyText(BuffTier.Gold)).toBe('1 × Gold Wildcard')
  })

  it('names the produced card with its payoff', () => {
    expect(wildConfirmMakeText(made)).toBe('1 × Silver Wild Taker (Blade) — +3 damage')
  })

  it('announces the spend in the cards own terms', () => {
    expect(wildDoneText(suited, made)).toContain('Silver Wild Taker (Blade)')
  })
})

describe('wildTargetTileAccessibleName (DLR-162)', () => {
  it('states what a selectable target would become', () => {
    const suited = bellTaker(BuffTier.Bronze, 1)
    const name = wildTargetTileAccessibleName(suited, 2, wildenedBuff(suited), null)
    expect(name).toContain('Bronze Bell-Taker (Blade), 2 held.')
    expect(name).toContain('Bronze Wild Taker (Blade)')
  })

  it('carries the reason on a refused target', () => {
    const wild = wildenedBuff(bellTaker(BuffTier.Bronze, 1))
    expect(wildTargetTileAccessibleName(wild, 1, null, WildRefusal.AlreadyWild)).toContain(
      WILD_REFUSAL_MESSAGE[WildRefusal.AlreadyWild],
    )
  })
})
