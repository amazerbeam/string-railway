import { describe, expect, it } from 'vitest'
import {
  AP_CAPACITY_PRICE,
  CHEAT_PRICE,
  TIMEBOMB_PRICE,
  HEAL_PRICE,
  BLAST_GUARD_PRICE,
  WHETSTONE_PRICE,
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
  tieredRankOf,
} from '../shop'
import { ALL_BRONZE, AbilityTier, RANK_TIER_STEP_PRICE, TieredRank, steppedTo } from '../rankTiers'
import { maxHealthPriceFor } from '../maxHealth'

const baseStock = (over: Partial<ShopStock> = {}): ShopStock => ({
  coins: 5,
  playerHealth: 6,
  maxPlayerHealth: 10,
  blastGuardHeld: false,
  rankTiers: ALL_BRONZE,
  maxHealthPurchases: 0,
  ...over,
})
const stock = baseStock

describe('SHOP_ITEMS', () => {
  it('sells Heal and the max-health raise — the two rank ladders left the shelf, as ApCapacity did before them', () => {
    expect(SHOP_ITEMS).toEqual([ShopItem.Heal, ShopItem.MaxHealth])
    expect(SHOP_ITEMS).not.toContain(ShopItem.ApCapacity)
    expect(SHOP_ITEMS).not.toContain(ShopItem.SwanTier)
    expect(SHOP_ITEMS).not.toContain(ShopItem.WitchTier)
  })

  it('keeps both rank ladders PRICED though they left the shelf, so restoring one is a list row', () => {
    expect(priceOf(ShopItem.SwanTier, baseStock())).toBe(RANK_TIER_STEP_PRICE)
    expect(priceOf(ShopItem.WitchTier, baseStock())).toBe(RANK_TIER_STEP_PRICE)
  })

  it('DLR-145 AC3 — ApCapacity is still priced even though it left the shelf, exactly as Cheat/Timebomb/Blast Guard/Whetstone stayed priced on DLR-116', () => {
    expect(priceOf(ShopItem.ApCapacity, baseStock())).toBe(AP_CAPACITY_PRICE)
  })
})

describe('the refilled run-permanent shelf (DLR-122 AC2)', () => {
  const goldSwan = steppedTo(steppedTo(ALL_BRONZE, TieredRank.Swan), TieredRank.Swan)

  it('keeps both tier items CATEGORISED on the run-permanent rung though neither is on the shelf', () => {
    expect(categoryOf(ShopItem.SwanTier)).toBe(ShopCategory.RunPermanent)
    expect(categoryOf(ShopItem.WitchTier)).toBe(ShopCategory.RunPermanent)
    // `SHOP_ITEMS_BY_CATEGORY` derives from `SHOP_ITEMS`, so an item off the shelf is off every
    // rung — the categorisation above is what survives, and it is what makes restoring one a row.
    // DLR-158 put `MaxHealth` ON the shelf and ON this rung, so it is the one entry here now.
    expect(SHOP_ITEMS_BY_CATEGORY[ShopCategory.RunPermanent]).toEqual([ShopItem.MaxHealth])
  })

  it('prices both from the one configuration point (AC7)', () => {
    expect(priceOf(ShopItem.SwanTier, baseStock())).toBe(RANK_TIER_STEP_PRICE)
    expect(priceOf(ShopItem.WitchTier, baseStock())).toBe(RANK_TIER_STEP_PRICE)
  })

  it('maps each tier item to exactly one rank, and every other item to none', () => {
    expect(tieredRankOf(ShopItem.SwanTier)).toBe(TieredRank.Swan)
    expect(tieredRankOf(ShopItem.WitchTier)).toBe(TieredRank.Witch)
    expect(tieredRankOf(ShopItem.Heal)).toBeNull()
    expect(tieredRankOf(ShopItem.ApCapacity)).toBeNull()
    expect(tieredRankOf(ShopItem.Whetstone)).toBeNull()
    expect(tieredRankOf(ShopItem.MaxHealth)).toBeNull()
  })

  it('sells a step at bronze and at silver', () => {
    expect(refusalFor(stock({ coins: RANK_TIER_STEP_PRICE }), ShopItem.SwanTier)).toBeNull()
    const silver = steppedTo(ALL_BRONZE, TieredRank.Swan)
    expect(
      refusalFor(stock({ coins: RANK_TIER_STEP_PRICE, rankTiers: silver }), ShopItem.SwanTier),
    ).toBeNull()
  })

  it('refuses on coins when the purse is one short', () => {
    expect(refusalFor(stock({ coins: RANK_TIER_STEP_PRICE - 1 }), ShopItem.SwanTier)).toBe(
      PurchaseRefusal.NotEnoughCoins,
    )
  })

  it('refuses a rank already at gold, and does so before the coin check', () => {
    expect(refusalFor(stock({ coins: 99, rankTiers: goldSwan }), ShopItem.SwanTier)).toBe(
      PurchaseRefusal.RankAtMaxTier,
    )
    expect(refusalFor(stock({ coins: 0, rankTiers: goldSwan }), ShopItem.SwanTier)).toBe(
      PurchaseRefusal.RankAtMaxTier,
    )
  })

  it('upgrades one rank without touching the other', () => {
    expect(goldSwan[TieredRank.Witch]).toBe(AbilityTier.Bronze)
    expect(refusalFor(stock({ coins: 99, rankTiers: goldSwan }), ShopItem.WitchTier)).toBeNull()
  })
})

describe('priceOf', () => {
  it('reads CHEAT_PRICE for the Cheat', () => {
    expect(priceOf(ShopItem.Cheat, baseStock())).toBe(CHEAT_PRICE)
  })

  it('reads HEAL_PRICE for the Heal', () => {
    expect(priceOf(ShopItem.Heal, baseStock())).toBe(HEAL_PRICE)
  })

  it('reads TIMEBOMB_PRICE for Timebomb', () => {
    expect(priceOf(ShopItem.Timebomb, baseStock())).toBe(TIMEBOMB_PRICE)
  })

  it('reads BLAST_GUARD_PRICE for the Blast Guard', () => {
    expect(priceOf(ShopItem.BlastGuard, baseStock())).toBe(BLAST_GUARD_PRICE)
  })

  it('DLR-92 AC1 — prices the Whetstone from WHETSTONE_PRICE', () => {
    expect(priceOf(ShopItem.Whetstone, baseStock())).toBe(WHETSTONE_PRICE)
  })

  it('DLR-116 AC2 — prices AP capacity from AP_CAPACITY_PRICE', () => {
    expect(priceOf(ShopItem.ApCapacity, baseStock())).toBe(AP_CAPACITY_PRICE)
  })

  it('DLR-158 AC4 — prices the max-health raise from the escalating formula, keyed off purchases already made', () => {
    expect(priceOf(ShopItem.MaxHealth, baseStock({ maxHealthPurchases: 2 }))).toBe(
      maxHealthPriceFor(2),
    )
  })

  it('DLR-116 AC3 / DLR-122 — still answers for every ShopItem member, proving no mechanic is deleted', () => {
    for (const item of Object.values(ShopItem)) {
      expect(typeof priceOf(item, baseStock())).toBe('number')
    }
  })
})

describe('refusalFor', () => {
  it('returns null when affordable and available', () => {
    expect(refusalFor(stock(), ShopItem.Cheat)).toBeNull()
    expect(refusalFor(stock(), ShopItem.Heal)).toBeNull()
  })

  it('DLR-132 — never refuses a Cheat with SlotsFull; the pile has no cap', () => {
    expect(refusalFor(stock(), ShopItem.Cheat)).not.toBe(PurchaseRefusal.SlotsFull)
  })

  it('refuses a Heal with AlreadyFullHealth at or above the maximum', () => {
    expect(refusalFor(stock({ playerHealth: 10, maxPlayerHealth: 10 }), ShopItem.Heal)).toBe(
      PurchaseRefusal.AlreadyFullHealth,
    )
  })

  it('refuses with NotEnoughCoins when the balance is under the price', () => {
    expect(refusalFor(stock({ coins: 0 }), ShopItem.Cheat)).toBe(PurchaseRefusal.NotEnoughCoins)
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

describe('refusalFor — MaxHealth (DLR-158 AC6)', () => {
  it('does NOT refuse at full health — unlike Heal, being full is not a reason', () => {
    const full = stock({ playerHealth: 10, maxPlayerHealth: 10 })
    expect(refusalFor(full, ShopItem.MaxHealth)).toBeNull()
    expect(refusalFor(full, ShopItem.Heal)).toBe(PurchaseRefusal.AlreadyFullHealth)
  })

  it('refuses only with NotEnoughCoins when the purse is short', () => {
    expect(refusalFor(stock({ coins: 0 }), ShopItem.MaxHealth)).toBe(PurchaseRefusal.NotEnoughCoins)
  })
})

describe('refusalFor — Timebomb (DLR-90)', () => {
  it('refuses only for coins: there is no cap on charges held', () => {
    expect(refusalFor(stock({ coins: TIMEBOMB_PRICE }), ShopItem.Timebomb)).toBeNull()
    expect(refusalFor(stock({ coins: TIMEBOMB_PRICE - 1 }), ShopItem.Timebomb)).toBe(
      PurchaseRefusal.NotEnoughCoins,
    )
  })
})

describe('refusalFor — Blast Guard (DLR-91 AC1/AC3)', () => {
  it('AC3 — refuses a Guard while one is held, and says which reason', () => {
    const held = { ...baseStock(), coins: 9, blastGuardHeld: true }
    expect(refusalFor(held, ShopItem.BlastGuard)).toBe(PurchaseRefusal.GuardAlreadyActive)
  })

  it('AC3 — the held Guard outranks the coin check, so the reason survives the coin arriving', () => {
    const broke = { ...baseStock(), coins: 0, blastGuardHeld: true }
    expect(refusalFor(broke, ShopItem.BlastGuard)).toBe(PurchaseRefusal.GuardAlreadyActive)
  })

  it('AC1 — sells a Guard when none is held and the coins are there', () => {
    const ready = { ...baseStock(), coins: BLAST_GUARD_PRICE, blastGuardHeld: false }
    expect(refusalFor(ready, ShopItem.BlastGuard)).toBeNull()
  })
})

describe('canBuyAnything', () => {
  it('is true when at least one item is purchasable', () => {
    expect(canBuyAnything(stock())).toBe(true)
  })

  it('is false only when every offered item refuses', () => {
    expect(
      canBuyAnything(
        stock({
          coins: 0,
          playerHealth: 10,
          maxPlayerHealth: 10,
        }),
      ),
    ).toBe(false)
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

  it('shelves Timebomb on the one-time-use rung (AC1)', () => {
    expect(categoryOf(ShopItem.Timebomb)).toBe(ShopCategory.OneTimeUse)
  })

  it('shelves the Blast Guard on the fight-long rung (DLR-91 AC1)', () => {
    expect(categoryOf(ShopItem.BlastGuard)).toBe(ShopCategory.FightLong)
  })

  it('DLR-92 AC1 — puts the Whetstone on the run-permanent rung', () => {
    expect(categoryOf(ShopItem.Whetstone)).toBe(ShopCategory.RunPermanent)
  })

  it('DLR-116 AC2 — puts AP capacity on the run-permanent rung', () => {
    expect(categoryOf(ShopItem.ApCapacity)).toBe(ShopCategory.RunPermanent)
  })

  it('DLR-158 AC1 — puts the max-health raise on the run-permanent rung, alongside Whetstone', () => {
    expect(categoryOf(ShopItem.MaxHealth)).toBe(ShopCategory.RunPermanent)
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

  it('DLR-116 — the one-time-use and fight-long rungs are empty; those items are off the pared shelf', () => {
    expect(SHOP_ITEMS_BY_CATEGORY[ShopCategory.OneTimeUse]).toEqual([])
    expect(SHOP_ITEMS_BY_CATEGORY[ShopCategory.FightLong]).toEqual([])
  })

  it('DLR-158 — the run-permanent rung now holds the max-health raise; game-permanent stays empty', () => {
    expect(SHOP_ITEMS_BY_CATEGORY[ShopCategory.RunPermanent]).toEqual([ShopItem.MaxHealth])
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
