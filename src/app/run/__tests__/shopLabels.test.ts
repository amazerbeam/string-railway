import { describe, expect, it } from 'vitest'
import { HEAL_HEALTH_RESTORED, PurchaseRefusal, SHOP_ITEMS, ShopItem } from '../../../hunt'
import {
  nextOpponentText,
  priceText,
  PURCHASE_REFUSAL_MESSAGE,
  SHOP_ITEM_BLURB,
  SHOP_ITEM_NAME,
  shopItemAccessibleName,
} from '../shopLabels'

describe('shopLabels', () => {
  it('has a distinct refusal sentence for every PurchaseRefusal member', () => {
    const values = Object.values(PurchaseRefusal).map(
      (refusal) => PURCHASE_REFUSAL_MESSAGE[refusal],
    )
    expect(values).toHaveLength(Object.values(PurchaseRefusal).length)
    expect(new Set(values).size).toBe(values.length)
    for (const message of values) {
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    }
  })

  it('names every SHOP_ITEMS member, and the two names differ', () => {
    for (const item of SHOP_ITEMS) {
      expect(SHOP_ITEM_NAME[item]).toBeTruthy()
    }
    expect(SHOP_ITEM_NAME[ShopItem.Cheat]).not.toBe(SHOP_ITEM_NAME[ShopItem.Heal])
  })

  it('interpolates HEAL_HEALTH_RESTORED into the Heal blurb rather than quoting a literal', () => {
    expect(SHOP_ITEM_BLURB[ShopItem.Heal]).toContain(String(HEAL_HEALTH_RESTORED))
  })

  it('gives an item a different accessible name when it carries a refusal', () => {
    const available = shopItemAccessibleName(ShopItem.Heal, null)
    const refused = shopItemAccessibleName(ShopItem.Heal, PurchaseRefusal.NotEnoughCoins)
    expect(refused).not.toBe(available)
  })

  it('still reads sensibly when the next opponent has no configured name', () => {
    const text = nextOpponentText(undefined, 'Fight 2 of 3.')
    expect(typeof text).toBe('string')
    expect(text.length).toBeGreaterThan(0)
    expect(text).toContain('Fight 2 of 3.')
  })

  it('names the coming opponent when one is given', () => {
    const text = nextOpponentText('The Monarch', 'Fight 2 of 3.')
    expect(text).toContain('The Monarch')
  })

  it('prices an item from configuration', () => {
    expect(priceText(ShopItem.Cheat)).toBeTruthy()
    expect(priceText(ShopItem.Heal)).toBeTruthy()
  })
})
