import { describe, expect, it } from 'vitest'
import {
  CHEAT_PRICE,
  CHEAT_SLOT_COUNT,
  ENVENOM_PRICE,
  HEAL_PRICE,
  POISON_GUARD_PRICE,
} from '../config'
import {
  canBuyAnything,
  categoryOf,
  isShopCategoryAvailable,
  priceOf,
  PurchaseRefusal,
  refusalFor,
  SHOP_CATEGORIES,
  SHOP_ITEMS,
  SHOP_ITEMS_BY_CATEGORY,
  ShopCategory,
  ShopItem,
  type ShopStock,
  UNCATEGORISED_SHOP_ITEMS,
} from '../shop'

const baseStock = (over: Partial<ShopStock> = {}): ShopStock => ({
  coins: 5,
  cheatCount: 0,
  playerHealth: 6,
  maxPlayerHealth: 10,
  poisonGuardHeld: false,
  ...over,
})
const stock = baseStock

describe('SHOP_ITEMS', () => {
  it('holds exactly the four members, one-time use first', () => {
    expect(SHOP_ITEMS).toEqual([
      ShopItem.Cheat,
      ShopItem.Envenom,
      ShopItem.PoisonGuard,
      ShopItem.Heal,
    ])
  })
})

describe('priceOf', () => {
  it('reads CHEAT_PRICE for the Cheat', () => {
    expect(priceOf(ShopItem.Cheat)).toBe(CHEAT_PRICE)
  })

  it('reads HEAL_PRICE for the Heal', () => {
    expect(priceOf(ShopItem.Heal)).toBe(HEAL_PRICE)
  })

  it('reads ENVENOM_PRICE for Envenom', () => {
    expect(priceOf(ShopItem.Envenom)).toBe(ENVENOM_PRICE)
  })

  it('reads POISON_GUARD_PRICE for the Poison Guard', () => {
    expect(priceOf(ShopItem.PoisonGuard)).toBe(POISON_GUARD_PRICE)
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
    expect(refusalFor(stock({ playerHealth: 10, maxPlayerHealth: 10 }), ShopItem.Heal)).toBe(
      PurchaseRefusal.AlreadyFullHealth,
    )
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

describe('refusalFor — Envenom (DLR-90)', () => {
  it('refuses only for coins: there is no cap on charges held', () => {
    expect(refusalFor(stock({ coins: ENVENOM_PRICE }), ShopItem.Envenom)).toBeNull()
    expect(refusalFor(stock({ coins: ENVENOM_PRICE - 1 }), ShopItem.Envenom)).toBe(
      PurchaseRefusal.NotEnoughCoins,
    )
  })

  it('is unaffected by full Cheat slots, which are the Cheat’s cap and not a shared one', () => {
    expect(refusalFor(stock({ cheatCount: CHEAT_SLOT_COUNT }), ShopItem.Envenom)).toBeNull()
  })
})

describe('refusalFor — Poison Guard (DLR-91 AC1/AC3)', () => {
  it('AC3 — refuses a Guard while one is held, and says which reason', () => {
    const held = { ...baseStock(), coins: 9, poisonGuardHeld: true }
    expect(refusalFor(held, ShopItem.PoisonGuard)).toBe(PurchaseRefusal.GuardAlreadyActive)
  })

  it('AC3 — the held Guard outranks the coin check, so the reason survives the coin arriving', () => {
    const broke = { ...baseStock(), coins: 0, poisonGuardHeld: true }
    expect(refusalFor(broke, ShopItem.PoisonGuard)).toBe(PurchaseRefusal.GuardAlreadyActive)
  })

  it('AC1 — sells a Guard when none is held and the coins are there', () => {
    const ready = { ...baseStock(), coins: POISON_GUARD_PRICE, poisonGuardHeld: false }
    expect(refusalFor(ready, ShopItem.PoisonGuard)).toBeNull()
  })
})

describe('canBuyAnything', () => {
  it('is true when at least one item is purchasable', () => {
    expect(canBuyAnything(stock())).toBe(true)
  })

  it('is false only when all four items refuse', () => {
    expect(
      canBuyAnything(
        stock({
          coins: 0,
          cheatCount: CHEAT_SLOT_COUNT,
          playerHealth: 10,
          maxPlayerHealth: 10,
        }),
      ),
    ).toBe(false)
  })

  it('is true when only one item refuses', () => {
    expect(canBuyAnything(stock({ cheatCount: CHEAT_SLOT_COUNT }))).toBe(true)
  })
})

describe('ShopCategory', () => {
  it('holds the four design-doc rungs, and SHOP_CATEGORIES fixes the render order (AC1/AC3)', () => {
    expect(SHOP_CATEGORIES).toEqual([
      ShopCategory.OneTimeUse,
      ShopCategory.FightLong,
      ShopCategory.RunPermanent,
      ShopCategory.GamePermanent,
    ])
  })

  it('lists every ShopCategory member exactly once', () => {
    expect([...SHOP_CATEGORIES].sort()).toEqual(Object.values(ShopCategory).sort())
  })
})

describe('categoryOf', () => {
  it('puts the Cheat on the one-time-use rung (AC2)', () => {
    expect(categoryOf(ShopItem.Cheat)).toBe(ShopCategory.OneTimeUse)
  })

  it('gives the Heal no category at all — an instant transfer has no duration (AC2)', () => {
    expect(categoryOf(ShopItem.Heal)).toBeNull()
  })

  it('shelves Envenom on the one-time-use rung (AC1)', () => {
    expect(categoryOf(ShopItem.Envenom)).toBe(ShopCategory.OneTimeUse)
  })

  it('shelves the Poison Guard on the fight-long rung (DLR-91 AC1)', () => {
    expect(categoryOf(ShopItem.PoisonGuard)).toBe(ShopCategory.FightLong)
  })

  it('answers for every SHOP_ITEMS member, so no item is silently unassigned', () => {
    for (const item of SHOP_ITEMS) {
      const category = categoryOf(item)
      expect(category === null || SHOP_CATEGORIES.includes(category)).toBe(true)
    }
  })
})

describe('SHOP_ITEMS_BY_CATEGORY', () => {
  it('has an entry for every category, so a tab can never read undefined', () => {
    for (const category of SHOP_CATEGORIES) {
      expect(Array.isArray(SHOP_ITEMS_BY_CATEGORY[category])).toBe(true)
    }
  })

  it('puts both one-time-use items on that rung, in catalogue order', () => {
    expect(SHOP_ITEMS_BY_CATEGORY[ShopCategory.OneTimeUse]).toEqual([
      ShopItem.Cheat,
      ShopItem.Envenom,
    ])
  })

  it('puts the Poison Guard alone on the fight-long rung (DLR-91 AC1)', () => {
    expect(SHOP_ITEMS_BY_CATEGORY[ShopCategory.FightLong]).toEqual([ShopItem.PoisonGuard])
  })

  it('leaves run-permanent and game-permanent empty until their items ship (AC5)', () => {
    expect(SHOP_ITEMS_BY_CATEGORY[ShopCategory.RunPermanent]).toEqual([])
    expect(SHOP_ITEMS_BY_CATEGORY[ShopCategory.GamePermanent]).toEqual([])
  })

  it('never places an uncategorised item on a rung', () => {
    const onRungs = SHOP_CATEGORIES.flatMap((category) => SHOP_ITEMS_BY_CATEGORY[category])
    expect(onRungs).not.toContain(ShopItem.Heal)
  })

  it('accounts for every catalogue item exactly once across the rungs and the uncategorised set', () => {
    const placed = [
      ...SHOP_CATEGORIES.flatMap((category) => SHOP_ITEMS_BY_CATEGORY[category]),
      ...UNCATEGORISED_SHOP_ITEMS,
    ]
    expect([...placed].sort()).toEqual([...SHOP_ITEMS].sort())
  })
})

describe('UNCATEGORISED_SHOP_ITEMS', () => {
  it('is exactly the Heal today (AC2)', () => {
    expect(UNCATEGORISED_SHOP_ITEMS).toEqual([ShopItem.Heal])
  })
})

describe('isShopCategoryAvailable', () => {
  it('refuses only the game-permanent rung — nothing is designed for it yet (AC4)', () => {
    expect(isShopCategoryAvailable(ShopCategory.GamePermanent)).toBe(false)
  })

  it('allows the other three, including the two that are merely empty (AC5)', () => {
    expect(isShopCategoryAvailable(ShopCategory.OneTimeUse)).toBe(true)
    expect(isShopCategoryAvailable(ShopCategory.FightLong)).toBe(true)
    expect(isShopCategoryAvailable(ShopCategory.RunPermanent)).toBe(true)
  })
})
