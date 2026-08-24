import {
  AP_CAPACITY_PRICE,
  CHEAT_PRICE,
  CHEAT_SLOT_COUNT,
  TIMEBOMB_PRICE,
  HEAL_PRICE,
  BLAST_GUARD_PRICE,
  WHETSTONE_PRICE,
} from './config'
import type { Coins, Health } from './types'

export const ShopItem = {
  Cheat: 'cheat',
  Timebomb: 'timebomb',
  BlastGuard: 'blastGuard',
  Whetstone: 'whetstone',
  Heal: 'heal',
  ApCapacity: 'apCapacity', // DLR-116 AC2
} as const
export type ShopItem = (typeof ShopItem)[keyof typeof ShopItem]

/** DLR-116 AC2/AC3 — what the shop OFFERS, pared to the two fixed, always-purchasable items.
 *  The `ShopItem` union above keeps every member and `priceOf` / `categoryOf` / `refusalFor` /
 *  `buyFromShop` stay TOTAL over it, so no mechanic is deleted — only this list changed. Cheat,
 *  Timebomb, Blast Guard and Whetstone are still priced, still buyable by a caller, and still
 *  tested; they are simply not on the shelf while this pared-down version is played. */
export const SHOP_ITEMS: readonly ShopItem[] = [ShopItem.ApCapacity, ShopItem.Heal]

/** The persistence-length ladder (version-4-scope.md §1) — named after the design doc's own rungs
 *  rather than Balatro's deck / Joker / consumable, since this game has no deck-building layer for
 *  those names to mean anything against. An `as const` map, not an `enum`: `erasableSyntaxOnly`. */
export const ShopCategory = {
  OneTimeUse: 'oneTimeUse',
  FightLong: 'fightLong',
  RunPermanent: 'runPermanent',
  GamePermanent: 'gamePermanent',
} as const
export type ShopCategory = (typeof ShopCategory)[keyof typeof ShopCategory]

/** AC3 — the four rungs in the order the screen renders them. THE statement of tab order: a
 *  screen maps this, it never lists the categories itself. */
export const SHOP_CATEGORIES: readonly ShopCategory[] = [
  ShopCategory.OneTimeUse,
  ShopCategory.FightLong,
  ShopCategory.RunPermanent,
  ShopCategory.GamePermanent,
]

/** Why a purchase cannot be made. A reason CODE, not a sentence — `src/hunt/` holds no
 *  user-facing copy; `src/app/run/shopLabels.ts` maps these to words. */
export const PurchaseRefusal = {
  SlotsFull: 'slotsFull',
  AlreadyFullHealth: 'alreadyFullHealth',
  GuardAlreadyActive: 'guardAlreadyActive',
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
  /** DLR-91 AC3 — a bought-but-unspent Guard is already held. Only one can be active at a time. */
  readonly blastGuardHeld: boolean
}

/** Total over `ShopItem`, so adding a third item is a compile error here rather than an
 *  `undefined` price at runtime. */
export function priceOf(item: ShopItem): Coins {
  switch (item) {
    case ShopItem.Cheat:
      return CHEAT_PRICE
    case ShopItem.Timebomb:
      return TIMEBOMB_PRICE
    case ShopItem.BlastGuard:
      return BLAST_GUARD_PRICE
    case ShopItem.Whetstone:
      return WHETSTONE_PRICE
    case ShopItem.Heal:
      return HEAL_PRICE
    case ShopItem.ApCapacity:
      return AP_CAPACITY_PRICE
  }
}

/**
 * AC2 — which rung an item sits on. Total over `ShopItem` like `priceOf`, so a new item is a
 * compile error here rather than an item that quietly appears in no tab.
 *
 * `null` is the Heal's REAL answer, not a missing one: it is an instant transfer with no duration,
 * so it sits outside the ladder entirely rather than being forced onto a rung (design doc §1,
 * "What isn't touched"). Its one caller handles the `null` explicitly.
 */
export function categoryOf(item: ShopItem): ShopCategory | null {
  switch (item) {
    case ShopItem.Cheat:
      return ShopCategory.OneTimeUse
    // DLR-90 AC1: the one-time-use rung, which DLR-89 built for exactly this.
    case ShopItem.Timebomb:
      return ShopCategory.OneTimeUse
    // DLR-91 AC1 — the fight-long rung, which DLR-89 built and left empty for exactly this.
    case ShopItem.BlastGuard:
      return ShopCategory.FightLong
    // DLR-92 AC1 — the run-permanent rung, which DLR-89 built and left empty for exactly this.
    case ShopItem.Whetstone:
      return ShopCategory.RunPermanent
    case ShopItem.Heal:
      return null
    // DLR-116 AC2 — the raise lasts the run, exactly as Whetstone's does.
    case ShopItem.ApCapacity:
      return ShopCategory.RunPermanent
  }
}

/**
 * Whether a rung can be sold from at all. `GamePermanent` is shown and REFUSED rather than hidden,
 * so the shape of the full ladder reads before every rung is filled (design doc §1).
 *
 * Deliberately NOT "is this rung empty": fight-long and run-permanent are both empty today and
 * both perfectly selectable. Reading refusal off a zero-length array would start refusing them too,
 * and would silently stop refusing game-permanent the moment its first item shipped.
 */
export function isShopCategoryAvailable(category: ShopCategory): boolean {
  return category !== ShopCategory.GamePermanent
}

/** Derived once, at module load, from `SHOP_ITEMS` + `categoryOf` — so the catalogue is still
 *  stated exactly once, adding an item needs no UI edit, and switching tabs never re-scans a
 *  catalogue that is expected to get long. Total over `ShopCategory`, so a fifth rung is a compile
 *  error rather than an `undefined` a tab would render as nothing. */
export const SHOP_ITEMS_BY_CATEGORY: Readonly<Record<ShopCategory, readonly ShopItem[]>> = {
  [ShopCategory.OneTimeUse]: itemsOnRung(ShopCategory.OneTimeUse),
  [ShopCategory.FightLong]: itemsOnRung(ShopCategory.FightLong),
  [ShopCategory.RunPermanent]: itemsOnRung(ShopCategory.RunPermanent),
  [ShopCategory.GamePermanent]: itemsOnRung(ShopCategory.GamePermanent),
}

/** The items on no rung — `[Heal]` today. Rendered outside the tabs (AC2/AC3). */
export const UNCATEGORISED_SHOP_ITEMS: readonly ShopItem[] = SHOP_ITEMS.filter(
  (item) => categoryOf(item) === null,
)

/**
 * THE single statement of whether a purchase is available (AC6/AC7), read by `buyFromShop`
 * (which throws on a non-null result) and by the screen (which disables the control and prints
 * the reason). Two readings of one rule, never two rules.
 *
 * Item-specific reasons come BEFORE the coin check deliberately: with full slots and no coins,
 * the slots are the reason that will still be true when the coin arrives.
 *
 * A non-finite balance refuses rather than passing the comparison — `NaN >= 1` is `false`, which
 * would otherwise read as "not enough coins" by accident and hide a corrupted figure.
 */
export function refusalFor(stock: ShopStock, item: ShopItem): PurchaseRefusal | null {
  if (item === ShopItem.Cheat && stock.cheatCount >= CHEAT_SLOT_COUNT) {
    return PurchaseRefusal.SlotsFull
  }
  if (item === ShopItem.Heal && stock.playerHealth >= stock.maxPlayerHealth) {
    return PurchaseRefusal.AlreadyFullHealth
  }
  if (item === ShopItem.BlastGuard && stock.blastGuardHeld) {
    return PurchaseRefusal.GuardAlreadyActive
  }
  if (!Number.isFinite(stock.coins) || stock.coins < priceOf(item)) {
    return PurchaseRefusal.NotEnoughCoins
  }
  return null
}

/**
 * Whether ANY item is purchasable right now — `some()` over `refusalFor`, never a second reading
 * of the rules. THE predicate the verdict's `Continue` warning fires on: a player holding a coin
 * at full health has nothing to stop for (AP capacity has no cap, so a coin always buys it), and a
 * warning they cannot act on is noise. (`SHOP_ITEMS` above is `ApCapacity` and `Heal` only —
 * DLR-116 pared `Cheat` out of the fixed shelf, so "full slots" no longer participates in this
 * predicate at all.)
 */
export function canBuyAnything(stock: ShopStock): boolean {
  return SHOP_ITEMS.some((item) => refusalFor(stock, item) === null)
}

function itemsOnRung(category: ShopCategory): readonly ShopItem[] {
  return SHOP_ITEMS.filter((item) => categoryOf(item) === category)
}
