import {
  AP_CAPACITY_STEP,
  TIMEBOMB_PLAYER_DAMAGE,
  TIMEBOMB_QUARRY_DAMAGE,
  FlaskRefusal,
  HEAL_HEALTH_RESTORED,
  priceOf,
  PurchaseRefusal,
  ShopItem,
  type Health,
} from '../../hunt'

/**
 * Every user-visible string on the shop screen (DLR-84, pared to Health plus the slot machine on
 * DLR-116; the AP-capacity purchase left the shelf on DLR-145, though it keeps its name and blurb
 * below — `SHOP_ITEM_NAME`/`SHOP_ITEM_BLURB` stay total over the whole `ShopItem` union).
 *
 * ALL PLACEHOLDER COPY — the wording is the developer's, exactly as `runLabels.ts` and
 * `warCouncil/labels.ts` mark their own. Prices and the heal figure are always interpolated from
 * `src/hunt/config.ts` rather than quoted, so re-tuning a key cannot leave the screen reading a
 * number the engine no longer uses.
 */

export const SHOP_TITLE = 'Between fights'
export const SHOP_COINS_LABEL = 'Coins'
export const SHOP_HEALTH_LABEL = 'Health'
export const SHOP_NOTHING_TO_BUY_HINT = 'Buy nothing and carry the coin if you would rather.'
export const SHOP_PURSE_GROUP_LABEL = 'Your purse and health'

/** Total over the WHOLE `ShopItem` union, not over `SHOP_ITEMS` — Cheat, Timebomb, Blast Guard and
 *  Whetstone still get a name even though DLR-116 took them off this screen's offered list. AC3's
 *  "not deleted from the codebase" stated in copy. */
export const SHOP_ITEM_NAME: Readonly<Record<ShopItem, string>> = {
  [ShopItem.Cheat]: 'Cheat',
  [ShopItem.Timebomb]: 'Timebomb',
  [ShopItem.BlastGuard]: 'Blast Guard', // PLACEHOLDER copy — the developer's call.
  [ShopItem.Whetstone]: 'Whetstone', // PLACEHOLDER copy — the developer's call
  [ShopItem.Heal]: 'Heal',
  [ShopItem.ApCapacity]: 'Action points',
  [ShopItem.SwanTier]: 'Swan', // PLACEHOLDER copy — the developer's call.
  [ShopItem.WitchTier]: 'Witch', // PLACEHOLDER copy — the developer's call.
}

/** Built FROM the configuration keys, never from a literal, so re-pricing or re-tuning the heal
 *  does not leave the screen quoting a number the engine no longer uses. Total over the whole
 *  `ShopItem` union, same reason as `SHOP_ITEM_NAME`. */
export const SHOP_ITEM_BLURB: Readonly<Record<ShopItem, string>> = {
  [ShopItem.Cheat]: 'A card for a slot. Play it later to ignore follow-suit.',
  [ShopItem.Timebomb]: `Prime a card in your hand. The winner of the trick it is played into takes the blast at the next trick — ${TIMEBOMB_QUARRY_DAMAGE} for the Quarry, ${TIMEBOMB_PLAYER_DAMAGE} for you, and yours cashes out your streak.`,
  [ShopItem.BlastGuard]: `Insurance for one fight. The next time your own Timebomb detonates on you, you still take the ${TIMEBOMB_PLAYER_DAMAGE} but your streak survives.`, // PLACEHOLDER copy
  [ShopItem.Whetstone]:
    'Every trick you take banks one more, for the rest of the run. Buy it again to stack it.', // PLACEHOLDER copy
  [ShopItem.Heal]: `Restore ${HEAL_HEALTH_RESTORED} health, now. Anything over your maximum is lost.`,
  [ShopItem.ApCapacity]: `+${AP_CAPACITY_STEP} action points a hand, for the rest of the run. Buy it again to stack it.`,
  // DLR-122 — PLACEHOLDER copy. Deliberately says WHICH rung the next coin buys rather than
  // printing the whole ladder: the screen shows the price beside it, and the rungs already read
  // as bronze/silver/gold from the buff cards.
  [ShopItem.SwanTier]:
    'Upgrade the Swan, for the rest of the run. At silver, losing a trick cleanly with a Swan no longer breaks your streak. At gold, it does not cash your bank either. Your Swans only — the Quarry keeps the printed card.',
  [ShopItem.WitchTier]:
    'Upgrade the Witch, for the rest of the run. At silver, two Witches no longer cancel — yours still counts as trump. At gold, yours also beats every trump. Your Witches only — the Quarry keeps the printed card.',
}

/** AC6 — the reason, in words. Total over `PurchaseRefusal`, so a FIFTH reason code is a
 *  compile error here rather than a blank sentence on screen. */
export const PURCHASE_REFUSAL_MESSAGE: Readonly<Record<PurchaseRefusal, string>> = {
  [PurchaseRefusal.SlotsFull]: 'Both Cheat slots are full.',
  [PurchaseRefusal.AlreadyFullHealth]: 'You are already at full health.',
  [PurchaseRefusal.GuardAlreadyActive]: 'You are already holding a Blast Guard.',
  [PurchaseRefusal.RankAtMaxTier]: 'That rank is already at gold.',
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

/* ── DLR-93, the flask. ALL PLACEHOLDER COPY, exactly as everything above it. The heal figure and
   the charge count are always INTERPOLATED from the engine, never quoted, so re-tuning
   `FLASK_HEAL_PERCENT` or `FLASK_STARTING_CHARGES` cannot leave the screen reading a number the
   engine no longer uses. ─────────────────────────────────────────────────────────────────────── */

/** The block's accessible group label — `game-ux` puts the group label on the container. */
export const SHOP_FLASK_GROUP_LABEL = 'Your flask'

/** The control's own name. PLACEHOLDER copy — and "Flask" itself is on `version-4-scope.md`'s
 *  open-names list beside Timebomb, Blast Guard and Whetstone. */
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
