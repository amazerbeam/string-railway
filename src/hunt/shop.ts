import { CHEAT_PRICE, CHEAT_SLOT_COUNT, HEAL_PRICE } from './config'
import type { Coins, Health } from './types'

export const ShopItem = {
  Cheat: 'cheat',
  Heal: 'heal',
} as const
export type ShopItem = (typeof ShopItem)[keyof typeof ShopItem]

/** AC3 — exactly two, in the order the screen renders them. THE statement of the catalogue: a
 *  screen maps this, it never lists the two items itself. */
export const SHOP_ITEMS: readonly ShopItem[] = [ShopItem.Cheat, ShopItem.Heal]

/** Why a purchase cannot be made. A reason CODE, not a sentence — `src/hunt/` holds no
 *  user-facing copy; `src/app/run/shopLabels.ts` maps these to words. */
export const PurchaseRefusal = {
  SlotsFull: 'slotsFull',
  AlreadyFullHealth: 'alreadyFullHealth',
  NotEnoughCoins: 'notEnoughCoins',
} as const
export type PurchaseRefusal = (typeof PurchaseRefusal)[keyof typeof PurchaseRefusal]

/** Everything the refusal rules need, and nothing else. Deliberately NOT `RunState`: this module
 *  states the shop's rules and must not learn the run's shape. `run.ts`'s `shopStockFor` builds it. */
export interface ShopStock {
  readonly coins: Coins
  readonly cheatCount: number
  readonly playerHealth: Health
  readonly maxPlayerHealth: Health
}

/** Total over `ShopItem`, so adding a third item is a compile error here rather than an
 *  `undefined` price at runtime. */
export function priceOf(item: ShopItem): Coins {
  switch (item) {
    case ShopItem.Cheat:
      return CHEAT_PRICE
    case ShopItem.Heal:
      return HEAL_PRICE
  }
}

/**
 * THE single statement of whether a purchase is available (AC6/AC7), read by `buyFromShop`
 * (which throws on a non-null result) and by the screen (which disables the control and prints
 * the reason). Two readings of one rule, never two rules.
 *
 * Item-specific reasons come BEFORE the coin check deliberately: with full slots and no coins,
 * the slots are the reason that will still be true when the coin arrives.
 *
 * A non-finite balance refuses rather than passing the comparison — `NaN >= 1` is `false`, which
 * would otherwise read as "not enough coins" by accident and hide a poisoned figure.
 */
export function refusalFor(stock: ShopStock, item: ShopItem): PurchaseRefusal | null {
  if (item === ShopItem.Cheat && stock.cheatCount >= CHEAT_SLOT_COUNT) {
    return PurchaseRefusal.SlotsFull
  }
  if (item === ShopItem.Heal && stock.playerHealth >= stock.maxPlayerHealth) {
    return PurchaseRefusal.AlreadyFullHealth
  }
  if (!Number.isFinite(stock.coins) || stock.coins < priceOf(item)) {
    return PurchaseRefusal.NotEnoughCoins
  }
  return null
}

/**
 * Whether ANY item is purchasable right now — `some()` over `refusalFor`, never a second reading
 * of the rules. THE predicate the verdict's `Continue` warning fires on: a player holding a coin
 * with full slots and full health has nothing to stop for, and a warning they cannot act on is
 * noise.
 */
export function canBuyAnything(stock: ShopStock): boolean {
  return SHOP_ITEMS.some((item) => refusalFor(stock, item) === null)
}
