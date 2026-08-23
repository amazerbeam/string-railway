import {
  TIMEBOMB_PLAYER_DAMAGE,
  TIMEBOMB_QUARRY_DAMAGE,
  FlaskRefusal,
  HEAL_HEALTH_RESTORED,
  priceOf,
  PurchaseRefusal,
  ShopCategory,
  ShopItem,
  type Health,
} from '../../hunt'

/**
 * Every user-visible string on the shop screen (DLR-84).
 *
 * ALL PLACEHOLDER COPY — the wording is the developer's, exactly as `runLabels.ts` and
 * `warCouncil/labels.ts` mark their own. Prices and the heal figure are always interpolated from
 * `src/hunt/config.ts` rather than quoted, so re-tuning a key cannot leave the screen reading a
 * number the engine no longer uses.
 */

export const SHOP_TITLE = 'Between fights'
export const SHOP_COINS_LABEL = 'Coins'
export const SHOP_HEALTH_LABEL = 'Health'
export const SHOP_SLOTS_LABEL = 'Cheat slots'
/** DLR-90 — the purse cell for held Timebomb charges. PLACEHOLDER copy. */
export const SHOP_TIMEBOMB_LABEL = 'Timebomb held'
/** DLR-91 AC3 — the purse cell for a held Guard, so the refusal on a second purchase has a visible
 *  cause. PLACEHOLDER copy. Words rather than a colour or a glyph alone, per `game-ux`'s "state
 *  reads without motion or colour alone" — a static screenshot still says which it is. */
export const SHOP_GUARD_LABEL = 'Poison Guard'
/** DLR-92 — the purse cell for Whetstones owned, so a player deciding on another copy can see what
 *  they already hold. A count with no denominator, exactly as `SHOP_TIMEBOMB_LABEL`: there is no cap.
 *  PLACEHOLDER copy. */
export const SHOP_WHETSTONE_LABEL = 'Whetstones held'
export const SHOP_GUARD_HELD = 'Held'
export const SHOP_GUARD_NONE = 'None'
export const SHOP_NOTHING_TO_BUY_HINT = 'Buy nothing and carry the coin if you would rather.'
export const SHOP_PURSE_GROUP_LABEL = 'Your purse and health'

export const SHOP_ITEM_NAME: Readonly<Record<ShopItem, string>> = {
  [ShopItem.Cheat]: 'Cheat',
  [ShopItem.Timebomb]: 'Timebomb',
  [ShopItem.PoisonGuard]: 'Poison Guard', // PLACEHOLDER copy — the developer's call.
  [ShopItem.Whetstone]: 'Whetstone', // PLACEHOLDER copy — the developer's call
  [ShopItem.Heal]: 'Heal',
}

/** Built FROM the configuration keys, never from a literal, so re-pricing or re-tuning the heal
 *  does not leave the screen quoting a number the engine no longer uses. */
export const SHOP_ITEM_BLURB: Readonly<Record<ShopItem, string>> = {
  [ShopItem.Cheat]: 'A card for a slot. Play it later to ignore follow-suit.',
  [ShopItem.Timebomb]: `Poison a card in your hand. The winner of the trick it is played into takes damage at the next trick — ${TIMEBOMB_QUARRY_DAMAGE} for the Quarry, ${TIMEBOMB_PLAYER_DAMAGE} for you, and yours cashes out your streak.`,
  [ShopItem.PoisonGuard]: `Insurance for one fight. The next time your own poison lands on you, you still take the ${TIMEBOMB_PLAYER_DAMAGE} but your streak survives.`, // PLACEHOLDER copy
  [ShopItem.Whetstone]:
    'Every trick you take banks one more, for the rest of the run. Buy it again to stack it.', // PLACEHOLDER copy
  [ShopItem.Heal]: `Restore ${HEAL_HEALTH_RESTORED} health, now. Anything over your maximum is lost.`,
}

/** AC6 — the reason, in words. Total over `PurchaseRefusal`, so a fourth reason code is a
 *  compile error here rather than a blank sentence on screen. */
export const PURCHASE_REFUSAL_MESSAGE: Readonly<Record<PurchaseRefusal, string>> = {
  [PurchaseRefusal.SlotsFull]: 'Both Cheat slots are full.',
  [PurchaseRefusal.AlreadyFullHealth]: 'You are already at full health.',
  [PurchaseRefusal.GuardAlreadyActive]: 'You are already holding a Poison Guard.',
  [PurchaseRefusal.NotEnoughCoins]: 'You do not have the coins for this.',
}

/** A price, in words — always read from `priceOf`, never a quoted number. */
export function priceText(item: ShopItem): string {
  const price = priceOf(item)
  return `${price} coin${price === 1 ? '' : 's'}`
}

/** The purchase control's accessible name — folds in the refusal so a screen-reader user hears
 *  why a control is disabled without having to find the sentence beside it (AC6). */
export function shopItemAccessibleName(item: ShopItem, refusal: PurchaseRefusal | null): string {
  const base = `${SHOP_ITEM_NAME[item]} — ${priceText(item)}`
  return refusal === null ? base : `${base} — ${PURCHASE_REFUSAL_MESSAGE[refusal]}`
}

/** AC10 — who is coming next. `name` is `undefined` while the roster has no entry (single-entry
 *  `QUARRY_CHARACTERS` today, DLR-85 lands the rest) — reads sensibly either way. */
export function nextOpponentText(name: string | undefined, progressText: string): string {
  return name === undefined ? `Next up. ${progressText}` : `Next up — ${name}. ${progressText}`
}

/** AC1/AC3 — the tab labels, named after the design doc's rungs. Total over `ShopCategory`, so a
 *  fifth rung is a compile error here rather than a blank tab on screen — the same guarantee
 *  `PURCHASE_REFUSAL_MESSAGE` gives the refusal sentences. */
export const SHOP_CATEGORY_LABEL: Readonly<Record<ShopCategory, string>> = {
  [ShopCategory.OneTimeUse]: 'One-time use',
  [ShopCategory.FightLong]: 'Fight-long',
  [ShopCategory.RunPermanent]: 'Run-permanent',
  [ShopCategory.GamePermanent]: 'Game-permanent',
}

/** The tablist's accessible group label — `game-ux` puts the group label on the container. */
export const SHOP_TABLIST_LABEL = 'What lasts how long'

/** AC4 — the refused rung's stated reason. Nothing is designed for game-permanent yet. */
export const SHOP_CATEGORY_COMING_SOON =
  'Locked for now — game-permanent items are still being designed.'

/** AC5 — a rung whose items have not shipped yet. Stated, so an empty shelf cannot be mistaken
 *  for a broken one. */
export const SHOP_CATEGORY_EMPTY = 'Nothing on this shelf yet.'

/** Heads the block outside the ladder — the Heal today. Needed because an unlabelled second grid
 *  under a tabbed one reads as part of the open shelf. */
export const SHOP_ASIDE_LABEL = 'Also for sale'

/** A tab's accessible name, folding in the refusal so a screen-reader user hears WHY on focus
 *  rather than meeting a control that silently does nothing — mirrors `shopItemAccessibleName`. */
export function shopCategoryAccessibleName(category: ShopCategory, available: boolean): string {
  const base = SHOP_CATEGORY_LABEL[category]
  return available ? base : `${base} — ${SHOP_CATEGORY_COMING_SOON}`
}

/** These `id`s pair each tab with its panel — `ShopCategoryTabs` sets them on its tabs,
 *  `ShopPanel` names the same two on its tabpanel. Homed here rather than in `ShopCategoryTabs.tsx`
 *  because `react-refresh/only-export-components` forbids a component file exporting a
 *  non-component value; a hand-written `shop-tab-${category}` at either call site would be a
 *  string-bound duplicate no compiler can check — the exact trap `web-project.md` names. */
export const shopTabId = (category: ShopCategory) => `shop-tab-${category}`
export const shopPanelId = (category: ShopCategory) => `shop-panel-${category}`

/* ── DLR-93, the flask. ALL PLACEHOLDER COPY, exactly as everything above it. The heal figure and
   the charge count are always INTERPOLATED from the engine, never quoted, so re-tuning
   `FLASK_HEAL_PERCENT` or `FLASK_STARTING_CHARGES` cannot leave the screen reading a number the
   engine no longer uses. ─────────────────────────────────────────────────────────────────────── */

/** The block's accessible group label — `game-ux` puts the group label on the container. */
export const SHOP_FLASK_GROUP_LABEL = 'Your flask'

/** The control's own name. PLACEHOLDER copy — and "Flask" itself is on `version-4-scope.md`'s
 *  open-names list beside Timebomb, Poison Guard and Whetstone. */
export const SHOP_FLASK_LABEL = 'Drink the flask'

/** AC6 — the flask's answer to every shop card's price line. Words, not a colour or a glyph alone,
 *  so a static screenshot still says free-and-limited rather than paid-and-unlimited. */
export const SHOP_FLASK_FREE_TAG = 'Free'
export const SHOP_FLASK_NO_COIN = 'No coin'

/** AC2/AC5 — what the flask does, from the COMPUTED figure. PLACEHOLDER copy. */
export function flaskBlurbText(healAmount: Health): string {
  return `Restore ${healAmount} health, now. Anything over your maximum is lost. Refills when you beat a stage boss.`
}

/** The charge count, in words. Reads sensibly at 0, 1, and any deferred higher ceiling. */
export function flaskChargesText(charges: number): string {
  return `${charges} charge${charges === 1 ? '' : 's'}`
}

/** AC3 — the reason, in words. Total over `FlaskRefusal`, so a third reason code is a compile
 *  error here rather than a blank sentence on screen — exactly what `PURCHASE_REFUSAL_MESSAGE`
 *  guarantees for a purchase. */
export const FLASK_REFUSAL_MESSAGE: Readonly<Record<FlaskRefusal, string>> = {
  [FlaskRefusal.NoCharges]: 'Your flask is empty. Beat a stage boss to refill it.',
  [FlaskRefusal.AlreadyFullHealth]: 'You are already at full health.',
}

/** The control's accessible name — folds in the refusal so a screen-reader user hears WHY it is
 *  disabled without hunting for the sentence beside it, and states FREE so it is never heard as a
 *  purchase (AC6). Mirrors `shopItemAccessibleName`. */
export function flaskAccessibleName(
  charges: number,
  healAmount: Health,
  refusal: FlaskRefusal | null,
): string {
  const base = `${SHOP_FLASK_LABEL} — ${SHOP_FLASK_FREE_TAG} — ${flaskChargesText(charges)}, restores ${healAmount}`
  return refusal === null ? base : `${base} — ${FLASK_REFUSAL_MESSAGE[refusal]}`
}
