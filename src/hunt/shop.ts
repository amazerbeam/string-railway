import {
  AP_CAPACITY_PRICE,
  CHEAT_PRICE,
  HEAL_PRICE,
  WHETSTONE_PRICE,
} from './config'
import { isAtMaxTier, RANK_TIER_STEP_PRICE, TieredRank, type RankTierTable } from './rankTiers'
import { maxHealthPriceFor } from './maxHealth'
import type { Coins, Health } from './types'

export const ShopItem = {
  Cheat: 'cheat',
  Whetstone: 'whetstone',
  Heal: 'heal',
  ApCapacity: 'apCapacity', // DLR-116 AC2
  SwanTier: 'swanTier', // DLR-122 AC2
  WitchTier: 'witchTier', // DLR-122 AC2
  /** DLR-158 AC1 — raises the run's maximum health and refills to the new top. */
  MaxHealth: 'maxHealth',
} as const
export type ShopItem = (typeof ShopItem)[keyof typeof ShopItem]

/** DLR-116 AC2/AC3 — what the shop OFFERS, pared to the two fixed, always-purchasable items.
 *  The `ShopItem` union above keeps every member and `priceOf` / `categoryOf` / `refusalFor` /
 *  `buyFromShop` stay TOTAL over it, so no mechanic is deleted — only this list changed. Cheat
 *  and Whetstone are still priced, still buyable by a caller, and still
 *  tested; they are simply not on the shelf while this pared-down version is played.
 *
 *  DLR-122 AC2 REFILLS the run-permanent rung with `SwanTier` and `WitchTier`. Nothing DLR-116
 *  removed comes back: those two are NEW items, and the five ranks whose ladders this shelf does
 *  not yet offer stay off `TIERED_RANKS` (`rankTiers.ts`) for exactly the reason Cheat and
 *  Whetstone stay off this list. */
/** DLR-145 AC3 — the action-point purchase leaves the shelf: with `AP_ENABLED` false it has
 *  nothing to sell. It keeps its `ShopItem` member, its `priceOf` row, its `categoryOf` rung and
 *  its `refusalFor` handling, exactly as DLR-116 kept Cheat and Whetstone —
 *  no mechanic is deleted, only this list changed. */
/** 2026-09-01 — the Swan and Witch rank upgrades leave the shelf (developer decision): their rules
 *  are not settled yet, and each printed a forty-word blurb that was most of what made the shop
 *  read as a wall of text. They keep their `ShopItem` member, their `priceOf` row, their
 *  `categoryOf` rung and their `refusalFor` handling, exactly as DLR-145 left the action-point
 *  purchase and DLR-116 left Cheat and Whetstone — no mechanic is deleted,
 *  only this list changed, and putting either back is one row here. */
/** DLR-158 AC1 — the shelf gains a second item, the first addition since the 2026-09-01 pass
 *  pared it to Heal alone. Nothing that left comes back: this is a NEW item, and every card off
 *  the shelf stays off it for the reasons the notes above give. */
export const SHOP_ITEMS: readonly ShopItem[] = [ShopItem.Heal, ShopItem.MaxHealth]

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
  // DLR-132 — a Cheat is a pile member now and the pile has no capacity cap, so `refusalFor`
  // below never produces this code any more. Kept, not deleted: `PURCHASE_REFUSAL_MESSAGE` in
  // `src/app/run/shopLabels.ts` stays a total `Record<PurchaseRefusal, string>`, and removing the
  // code would ripple into that copy map for no rule this ticket owns.
  SlotsFull: 'slotsFull',
  AlreadyFullHealth: 'alreadyFullHealth',
  /** DLR-122 AC2 — the rank is already at gold, so there is no rung left to buy. A rank is a
   *  RUNG, not a counter: unlike Whetstone and AP capacity it cannot be stacked, so this is the
   *  ceiling and it is stated once. */
  RankAtMaxTier: 'rankAtMaxTier',
  NotEnoughCoins: 'notEnoughCoins',
} as const
export type PurchaseRefusal = (typeof PurchaseRefusal)[keyof typeof PurchaseRefusal]

/** Everything the refusal rules need, and nothing else. Deliberately NOT `RunState`: this module
 *  states the shop's rules and must not learn the run's shape. `run.ts`'s `shopStockFor` builds it. */
export interface ShopStock {
  readonly coins: Coins
  readonly playerHealth: Health
  readonly maxPlayerHealth: Health
  /** DLR-122 AC2 — where every tierable rank currently stands, so the ceiling is a rule this
   *  module can state rather than something the caller has to remember to check. */
  readonly rankTiers: RankTierTable
  /** DLR-158 AC4 — copies of the max-health raise bought this run, so this module can price the
   *  NEXT one without learning the run's shape. The discipline `ShopStock`'s own docblock states:
   *  everything the shop's rules need, and nothing else. */
  readonly maxHealthPurchases: number
}

/**
 * Total over `ShopItem`, so adding a third item is a compile error here rather than an
 * `undefined` price at runtime.
 *
 * DLR-158 — takes the STOCK, required, because `MaxHealth`'s price climbs with the number already
 * bought. Required rather than defaulted for the reason this ticket removed four defaulted
 * `maxPlayerHealth` parameters: a default is a silently-wrong answer waiting for a caller who
 * forgets. One function rather than a `currentPriceOf` beside this one, so the tile, the refusal
 * and the coin deduction cannot disagree about what a thing costs.
 */
export function priceOf(item: ShopItem, stock: ShopStock): Coins {
  switch (item) {
    case ShopItem.Cheat:
      return CHEAT_PRICE
    case ShopItem.Whetstone:
      return WHETSTONE_PRICE
    case ShopItem.Heal:
      return HEAL_PRICE
    case ShopItem.ApCapacity:
      return AP_CAPACITY_PRICE
    // DLR-122 AC7 — both tier items read the SAME single configuration point. One key rather
    // than one per rank or one per step: retuning the shelf is one edit in `rankTiers.ts`.
    case ShopItem.SwanTier:
    case ShopItem.WitchTier:
      return RANK_TIER_STEP_PRICE
    case ShopItem.MaxHealth:
      return maxHealthPriceFor(stock.maxHealthPurchases)
  }
}

/**
 * DLR-122 — the rank a tier item upgrades, or `null` for an item that is not a tier purchase.
 * Total over `ShopItem` like `priceOf` and `categoryOf` above, so a third tier item is a compile
 * error here rather than an item that silently upgrades nothing.
 *
 * THE single mapping from item to rank: `refusalFor` below and `buyFromShop` in
 * `runTransitions.ts` both read it, rather than each carrying a second `switch` that could
 * disagree about which rank a card sells.
 */
export function tieredRankOf(item: ShopItem): TieredRank | null {
  switch (item) {
    case ShopItem.SwanTier:
      return TieredRank.Swan
    case ShopItem.WitchTier:
      return TieredRank.Witch
    case ShopItem.Cheat:
    case ShopItem.Whetstone:
    case ShopItem.Heal:
    case ShopItem.ApCapacity:
    case ShopItem.MaxHealth:
      return null
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
    // DLR-92 AC1 — the run-permanent rung, which DLR-89 built and left empty for exactly this.
    case ShopItem.Whetstone:
      return ShopCategory.RunPermanent
    case ShopItem.Heal:
      return null
    // DLR-116 AC2 — the raise lasts the run, exactly as Whetstone's does.
    case ShopItem.ApCapacity:
      return ShopCategory.RunPermanent
    // DLR-122 AC2 — the shelf this ticket exists to refill. A bought tier lasts the run, exactly
    // as Whetstone's climb and the AP raise do.
    case ShopItem.SwanTier:
    case ShopItem.WitchTier:
      return ShopCategory.RunPermanent
    // DLR-158 AC1 — the raise lasts the run, exactly as Whetstone's climb and the AP raise do.
    case ShopItem.MaxHealth:
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
 * Item-specific reasons come BEFORE the coin check deliberately: with a rank already at gold and
 * no coins, the ceiling is the reason that will still be true when the coin arrives.
 *
 * A non-finite balance refuses rather than passing the comparison — `NaN >= 1` is `false`, which
 * would otherwise read as "not enough coins" by accident and hide a corrupted figure.
 */
export function refusalFor(stock: ShopStock, item: ShopItem): PurchaseRefusal | null {
  if (item === ShopItem.Heal && stock.playerHealth >= stock.maxPlayerHealth) {
    return PurchaseRefusal.AlreadyFullHealth
  }
  // DLR-122 AC2 — above the coin check, matching this docblock's stated order: with a rank at
  // gold and no coins, the ceiling is the reason that will still be true when the coin arrives.
  const tieredRank = tieredRankOf(item)
  if (tieredRank !== null && isAtMaxTier(stock.rankTiers, tieredRank)) {
    return PurchaseRefusal.RankAtMaxTier
  }
  // DLR-158 AC6 — `MaxHealth` gets NO item-specific branch, deliberately: being at full health
  // must NOT refuse this purchase, since the raise fills the bar to the new top regardless of how
  // hurt the player was. It falls straight through to the coin check below, so `NotEnoughCoins` is
  // the only reason it can ever produce. Do not "fix" this by adding an `AlreadyFullHealth` branch.
  if (!Number.isFinite(stock.coins) || stock.coins < priceOf(item, stock)) {
    return PurchaseRefusal.NotEnoughCoins
  }
  return null
}

/**
 * Whether ANY item is purchasable right now — `some()` over `refusalFor`, never a second reading
 * of the rules. THE predicate the verdict's `Continue` warning fires on: a player holding a coin
 * at full health with both tiers maxed has nothing left to buy, and a warning they cannot act on
 * is noise. (`SHOP_ITEMS` above is `SwanTier`, `WitchTier` and `Heal` — DLR-116 pared `Cheat` out
 * of the fixed shelf and DLR-145 pared `ApCapacity` out too, so neither "full slots" nor a bought
 * AP raise participates in this predicate any more, and DLR-122's two tier items participate
 * through `RankAtMaxTier`.)
 */
export function canBuyAnything(stock: ShopStock): boolean {
  return SHOP_ITEMS.some((item) => refusalFor(stock, item) === null)
}

function itemsOnRung(category: ShopCategory): readonly ShopItem[] {
  return SHOP_ITEMS.filter((item) => categoryOf(item) === category)
}
