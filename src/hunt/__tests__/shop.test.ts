import { describe, expect, it } from 'vitest'
import { CHEAT_PRICE, CHEAT_SLOT_COUNT, HEAL_PRICE } from '../config'
import {
  canBuyAnything,
  priceOf,
  PurchaseRefusal,
  refusalFor,
  SHOP_ITEMS,
  ShopItem,
  type ShopStock,
} from '../shop'

const stock = (over: Partial<ShopStock> = {}): ShopStock => ({
  coins: 5,
  cheatCount: 0,
  playerHealth: 6,
  maxPlayerHealth: 10,
  ...over,
})

describe('SHOP_ITEMS', () => {
  it('holds exactly the two members', () => {
    expect(SHOP_ITEMS).toEqual([ShopItem.Cheat, ShopItem.Heal])
  })
})

describe('priceOf', () => {
  it('reads CHEAT_PRICE for the Cheat', () => {
    expect(priceOf(ShopItem.Cheat)).toBe(CHEAT_PRICE)
  })

  it('reads HEAL_PRICE for the Heal', () => {
    expect(priceOf(ShopItem.Heal)).toBe(HEAL_PRICE)
  })
})

describe('refusalFor', () => {
  it('returns null when affordable and available', () => {
    expect(refusalFor(stock(), ShopItem.Cheat)).toBeNull()
    expect(refusalFor(stock(), ShopItem.Heal)).toBeNull()
  })

  it('refuses a Cheat with SlotsFull when the slots are full', () => {
    expect(refusalFor(stock({ cheatCount: CHEAT_SLOT_COUNT }), ShopItem.Cheat)).toBe(
      PurchaseRefusal.SlotsFull,
    )
  })

  it('refuses a Heal with AlreadyFullHealth at or above the maximum', () => {
    expect(
      refusalFor(stock({ playerHealth: 10, maxPlayerHealth: 10 }), ShopItem.Heal),
    ).toBe(PurchaseRefusal.AlreadyFullHealth)
  })

  it('refuses with NotEnoughCoins when the balance is under the price', () => {
    expect(refusalFor(stock({ coins: 0 }), ShopItem.Cheat)).toBe(PurchaseRefusal.NotEnoughCoins)
  })

  it('names the slots before the coins when both refuse (the durable reason wins)', () => {
    expect(refusalFor(stock({ coins: 0, cheatCount: CHEAT_SLOT_COUNT }), ShopItem.Cheat)).toBe(
      PurchaseRefusal.SlotsFull,
    )
  })

  it('names full health before the coins when both refuse', () => {
    expect(
      refusalFor(stock({ coins: 0, playerHealth: 10, maxPlayerHealth: 10 }), ShopItem.Heal),
    ).toBe(PurchaseRefusal.AlreadyFullHealth)
  })

  it('refuses a NaN coin balance as NotEnoughCoins rather than passing the comparison', () => {
    expect(refusalFor(stock({ coins: Number.NaN }), ShopItem.Cheat)).toBe(
      PurchaseRefusal.NotEnoughCoins,
    )
  })
})

describe('canBuyAnything', () => {
  it('is true when at least one item is purchasable', () => {
    expect(canBuyAnything(stock())).toBe(true)
  })

  it('is false only when both items refuse', () => {
    expect(
      canBuyAnything(
        stock({ cheatCount: CHEAT_SLOT_COUNT, playerHealth: 10, maxPlayerHealth: 10 }),
      ),
    ).toBe(false)
  })

  it('is true when only one item refuses', () => {
    expect(canBuyAnything(stock({ cheatCount: CHEAT_SLOT_COUNT }))).toBe(true)
  })
})
