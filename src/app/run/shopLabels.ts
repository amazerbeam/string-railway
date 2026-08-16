import {
  HEAL_HEALTH_RESTORED,
  priceOf,
  PurchaseRefusal,
  ShopItem,
  type Coins,
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
export const SHOP_NOTHING_TO_BUY_HINT = 'Buy nothing and carry the coin if you would rather.'
export const SHOP_PURSE_GROUP_LABEL = 'Your purse and health'

export const SHOP_ITEM_NAME: Readonly<Record<ShopItem, string>> = {
  [ShopItem.Cheat]: 'Cheat',
  [ShopItem.Heal]: 'Heal',
}

/** Built FROM the configuration keys, never from a literal, so re-pricing or re-tuning the heal
 *  does not leave the screen quoting a number the engine no longer uses. */
export const SHOP_ITEM_BLURB: Readonly<Record<ShopItem, string>> = {
  [ShopItem.Cheat]: 'A card for a slot. Play it later to ignore follow-suit.',
  [ShopItem.Heal]: `Restore ${HEAL_HEALTH_RESTORED} health, now. Anything over your maximum is lost.`,
}

/** AC6 — the reason, in words. Total over `PurchaseRefusal`, so a fourth reason code is a
 *  compile error here rather than a blank sentence on screen. */
export const PURCHASE_REFUSAL_MESSAGE: Readonly<Record<PurchaseRefusal, string>> = {
  [PurchaseRefusal.SlotsFull]: 'Both Cheat slots are full.',
  [PurchaseRefusal.AlreadyFullHealth]: 'You are already at full health.',
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

/** The purse row's own sentence, for a reader who sees neither the row nor its layout —
 *  `game-ux`: no state may depend on colour or position alone. */
export function purseText(coins: Coins, health: Health, maxHealth: Health): string {
  return `${SHOP_COINS_LABEL} — ${coins}. ${SHOP_HEALTH_LABEL} — ${health} of ${maxHealth}.`
}
