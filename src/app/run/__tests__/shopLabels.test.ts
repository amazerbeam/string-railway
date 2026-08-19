import { describe, expect, it } from 'vitest'
import {
  ENVENOM_PLAYER_DAMAGE,
  ENVENOM_QUARRY_DAMAGE,
  HEAL_HEALTH_RESTORED,
  PurchaseRefusal,
  SHOP_CATEGORIES,
  SHOP_ITEMS,
  ShopCategory,
  ShopItem,
} from '../../../hunt'
import {
  nextOpponentText,
  priceText,
  PURCHASE_REFUSAL_MESSAGE,
  SHOP_ASIDE_LABEL,
  SHOP_CATEGORY_COMING_SOON,
  SHOP_CATEGORY_EMPTY,
  SHOP_CATEGORY_LABEL,
  SHOP_GUARD_HELD,
  SHOP_GUARD_LABEL,
  SHOP_GUARD_NONE,
  SHOP_ITEM_BLURB,
  SHOP_ITEM_NAME,
  SHOP_TABLIST_LABEL,
  shopCategoryAccessibleName,
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

  it('interpolates both Envenom figures into the blurb rather than quoting a literal', () => {
    expect(SHOP_ITEM_BLURB[ShopItem.Envenom]).toContain(String(ENVENOM_QUARRY_DAMAGE))
    expect(SHOP_ITEM_BLURB[ShopItem.Envenom]).toContain(String(ENVENOM_PLAYER_DAMAGE))
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

  it('labels every ShopCategory member, with no duplicate labels', () => {
    const labels = SHOP_CATEGORIES.map((category) => SHOP_CATEGORY_LABEL[category])
    expect(labels).toHaveLength(SHOP_CATEGORIES.length)
    expect(new Set(labels).size).toBe(labels.length)
    for (const label of labels) {
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('states the tablist label, the aside label, the coming-soon reason and the empty shelf', () => {
    for (const copy of [
      SHOP_TABLIST_LABEL,
      SHOP_ASIDE_LABEL,
      SHOP_CATEGORY_COMING_SOON,
      SHOP_CATEGORY_EMPTY,
      SHOP_GUARD_LABEL,
      SHOP_GUARD_HELD,
      SHOP_GUARD_NONE,
    ]) {
      expect(typeof copy).toBe('string')
      expect(copy.length).toBeGreaterThan(0)
    }
  })

  it('folds the coming-soon reason into a refused tab’s accessible name (AC4)', () => {
    const open = shopCategoryAccessibleName(ShopCategory.GamePermanent, true)
    const refused = shopCategoryAccessibleName(ShopCategory.GamePermanent, false)
    expect(refused).not.toBe(open)
    expect(refused).toContain(SHOP_CATEGORY_COMING_SOON)
    expect(open).not.toContain(SHOP_CATEGORY_COMING_SOON)
  })
})
