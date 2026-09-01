import { describe, expect, it } from 'vitest'
import {
  AP_CAPACITY_STEP,
  TIMEBOMB_PLAYER_DAMAGE,
  TIMEBOMB_QUARRY_DAMAGE,
  FlaskRefusal,
  flaskHealAmount,
  HEAL_HEALTH_RESTORED,
  priceOf,
  PurchaseRefusal,
  ShopItem,
  WHETSTONE_PRICE,
  type ShopStock,
} from '../../../hunt'
import { ALL_BRONZE } from '../../../hunt/rankTiers'

const stock = (over: Partial<ShopStock> = {}): ShopStock => ({
  coins: 5,
  playerHealth: 6,
  maxPlayerHealth: 10,
  blastGuardHeld: false,
  rankTiers: ALL_BRONZE,
  maxHealthPurchases: 0,
  ...over,
})
import {
  flaskAccessibleName,
  flaskBlurbText,
  flaskChargesText,
  FLASK_REFUSAL_MESSAGE,
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

  // AC3 — every ShopItem member keeps a name, whether or not it is on SHOP_ITEMS today. Total
  // over the whole union, not over SHOP_ITEMS, so "not deleted from the codebase" is proved
  // directly rather than by proxy.
  it('names every ShopItem member, whole union, no duplicate blank', () => {
    for (const item of Object.values(ShopItem)) {
      expect(SHOP_ITEM_NAME[item]).toBeTruthy()
    }
    expect(SHOP_ITEM_NAME[ShopItem.Cheat]).not.toBe(SHOP_ITEM_NAME[ShopItem.Heal])
  })

  it('interpolates HEAL_HEALTH_RESTORED into the Heal blurb rather than quoting a literal', () => {
    expect(SHOP_ITEM_BLURB[ShopItem.Heal]).toContain(String(HEAL_HEALTH_RESTORED))
  })

  it('interpolates both Timebomb figures into the blurb rather than quoting a literal', () => {
    expect(SHOP_ITEM_BLURB[ShopItem.Timebomb]).toContain(String(TIMEBOMB_QUARRY_DAMAGE))
    expect(SHOP_ITEM_BLURB[ShopItem.Timebomb]).toContain(String(TIMEBOMB_PLAYER_DAMAGE))
  })

  it('DLR-92 — blurbs the Whetstone as stacking, without quoting a price', () => {
    expect(SHOP_ITEM_BLURB[ShopItem.Whetstone]).toContain('stack')
    expect(SHOP_ITEM_BLURB[ShopItem.Whetstone]).not.toContain(String(WHETSTONE_PRICE))
  })

  it('DLR-116 — interpolates AP_CAPACITY_STEP into the AP-capacity blurb, never a literal', () => {
    expect(SHOP_ITEM_BLURB[ShopItem.ApCapacity]).toContain(String(AP_CAPACITY_STEP))
  })

  it('gives an item a different accessible name when it carries a refusal', () => {
    const price = priceOf(ShopItem.Heal, stock())
    const available = shopItemAccessibleName(ShopItem.Heal, price, null)
    const refused = shopItemAccessibleName(ShopItem.Heal, price, PurchaseRefusal.NotEnoughCoins)
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
    const s = stock()
    expect(priceText(priceOf(ShopItem.Cheat, s))).toBeTruthy()
    expect(priceText(priceOf(ShopItem.Heal, s))).toBeTruthy()
    expect(priceText(priceOf(ShopItem.ApCapacity, s))).toBeTruthy()
  })
})

describe("DLR-93 — the flask's copy", () => {
  it('names a sentence for every refusal code, so none renders blank', () => {
    for (const refusal of Object.values(FlaskRefusal)) {
      expect(FLASK_REFUSAL_MESSAGE[refusal].length).toBeGreaterThan(0)
    }
    expect(Object.keys(FLASK_REFUSAL_MESSAGE)).toHaveLength(Object.values(FlaskRefusal).length)
  })

  it('interpolates the computed heal figure rather than quoting a number', () => {
    expect(flaskBlurbText(flaskHealAmount(10))).toContain('6')
    expect(flaskBlurbText(flaskHealAmount(20))).toContain('12')
  })

  it('words the charge count singularly and plurally', () => {
    expect(flaskChargesText(1)).toContain('1')
    expect(flaskChargesText(1)).not.toMatch(/charges/)
    expect(flaskChargesText(0)).toMatch(/charges/)
    expect(flaskChargesText(2)).toMatch(/charges/)
  })

  it('folds the refusal into the accessible name, and omits it when available', () => {
    const available = flaskAccessibleName(1, 6, null)
    expect(available).not.toContain(FLASK_REFUSAL_MESSAGE[FlaskRefusal.NoCharges])
    expect(flaskAccessibleName(0, 6, FlaskRefusal.NoCharges)).toContain(
      FLASK_REFUSAL_MESSAGE[FlaskRefusal.NoCharges],
    )
  })

  it('says free in the accessible name, so it is never heard as a purchase', () => {
    expect(flaskAccessibleName(1, 6, null).toLowerCase()).toContain('free')
  })
})
