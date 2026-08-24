import { describe, expect, it } from 'vitest'
import { BuffTier, seedStartingBuffPile } from '../buffs'
import { cheatBuff, shieldBuff, timebombBuff } from '../buffCatalog'
import { apCostOf } from '../buffCosts'
import { activatableBuffs, isPricedBuff } from '../buffActivation'
import { BUFF_TEMPLATES, mintGrants } from '../buffTemplates'

describe('isPricedBuff / activatableBuffs — the Unassigned placeholder trap', () => {
  it('rejects every buff seedStartingBuffPile mints, because apCostOf throws on them', () => {
    for (const placeholder of seedStartingBuffPile(4, 1)) {
      expect(isPricedBuff(placeholder)).toBe(false)
      expect(() => apCostOf(placeholder)).toThrow(RangeError)
    }
  })

  it('accepts the three activated cards the catalog mints', () => {
    expect(isPricedBuff(cheatBuff(BuffTier.Bronze, 1))).toBe(true)
    expect(isPricedBuff(timebombBuff(BuffTier.Silver, 2))).toBe(true)
    expect(isPricedBuff(shieldBuff(BuffTier.Gold, 3))).toBe(true)
  })

  it('accepts every condition-family buff a template can mint', () => {
    const minted = mintGrants(
      BUFF_TEMPLATES.slice(0, 8).map((t) => ({ templateId: t.id, tier: BuffTier.Bronze })),
      1,
    )
    expect(minted.length).toBeGreaterThan(0)
    for (const buff of minted) expect(isPricedBuff(buff)).toBe(true)
  })

  it('activatableBuffs drops the placeholders and keeps the rest, in order', () => {
    const cheat = cheatBuff(BuffTier.Bronze, 10)
    const pile = [...seedStartingBuffPile(2, 1), cheat, ...seedStartingBuffPile(1, 20)]
    expect(activatableBuffs(pile)).toEqual([cheat])
  })

  it('every buff activatableBuffs keeps can be priced without throwing', () => {
    const pile = [...seedStartingBuffPile(4, 1), cheatBuff(BuffTier.Gold, 9)]
    for (const buff of activatableBuffs(pile)) {
      expect(() => apCostOf(buff)).not.toThrow()
    }
  })
})
