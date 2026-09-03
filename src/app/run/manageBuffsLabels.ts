import { BuffTier, CombineRefusal, WildRefusal, type Buff } from '../../hunt'
import { buffName, buffPayoff } from '../warCouncil/buffLabels'

/** Total over `BuffTier`, so a new tier fails to compile here rather than rendering blank —
 *  matches `COMBINE_REFUSAL_MESSAGE` below. */
const TIER_WORD: Readonly<Record<BuffTier, string>> = {
  [BuffTier.Bronze]: 'Bronze',
  [BuffTier.Silver]: 'Silver',
  [BuffTier.Gold]: 'Gold',
}

export const MANAGE_BUFFS_TITLE = 'Manage Buffs'
export const MANAGE_BUFFS_OPEN_LABEL = 'Manage Buffs'
export const MANAGE_BUFFS_BACK_LABEL = 'Back to the shop'
export const MANAGE_BUFFS_HELD_LABEL = 'cards held'
export const MANAGE_BUFFS_READY_LABEL = 'piles ready'
export const MANAGE_BUFFS_EMPTY = 'You are carrying no cards.'
/** AC4 — free, and what it actually costs, said once at the top rather than on every tile. */
export const MANAGE_BUFFS_RULE =
  'Two of the same card at the same tier become one of the next tier. It costs no coins — it costs a card.'
export const MANAGE_BUFFS_SPEND = 'Every combine spends 2 cards and returns 1.'
export const MANAGE_BUFFS_READY_BAND = 'Ready to combine'
export const MANAGE_BUFFS_REFUSED_BAND = 'Nothing to combine'
export const MANAGE_BUFFS_DESTROY_LABEL = 'Destroy'
export const MANAGE_BUFFS_MAKE_LABEL = 'Make'
export const MANAGE_BUFFS_COMMIT_LABEL = 'Combine'
export const MANAGE_BUFFS_CANCEL_LABEL = 'Cancel'
export const MANAGE_BUFFS_JUST_MADE = 'Just made'

/** Total over the union, so a third refusal code fails to compile here rather than rendering
 *  blank on the face of a card. */
export const COMBINE_REFUSAL_MESSAGE: Readonly<Record<CombineRefusal, string>> = {
  [CombineRefusal.AtMaxTier]: 'Already gold — nothing above it',
  [CombineRefusal.NoPair]: 'Only one — nothing to pair it with',
  // DLR-162 — PLACEHOLDER copy. Says why it would be a LOSS, not merely that it is refused.
  [CombineRefusal.Untiered]: 'Every wildcard is the same — combining one would waste it',
}

/** `Bronze Moon-Feeder (Blade)` — the card named the way every other surface names it. */
export function combineCardText(buff: Buff): string {
  return `${TIER_WORD[buff.tier]} ${buffName(buff)}`
}

/** `+3 damage` / `+8 damage, −4 to you` — the full unabbreviated sentence, not the card face's
 *  clipped numeral. */
export function combinePayoffText(buff: Buff): string {
  const payoff = buffPayoff(buff)
  return payoff.risk === null ? payoff.gain : `${payoff.gain}, ${payoff.risk}`
}

/** AC7 — what a combine destroys and what it produces, in the cards' own terms. */
export function combineConfirmDestroyText(buff: Buff): string {
  return `2 × ${combineCardText(buff)}`
}

/** DLR-162 — the same sentence, when the second card a combine eats is NOT another copy of the
 *  first: a wild pile eats a SUITED card of the same family. `2 × <card>` when `partner` is null,
 *  `1 × <card> + 1 × <partner>` when it is not — so the confirm face never says "2 ×" of a card the
 *  player owns one of. */
export function combineConfirmDestroyPairText(buff: Buff, partner: Buff | null): string {
  if (partner === null) return combineConfirmDestroyText(buff)
  return `1 × ${combineCardText(buff)} + 1 × ${combineCardText(partner)}`
}

export function combineConfirmMakeText(made: Buff): string {
  return `1 × ${combineCardText(made)} — ${combinePayoffText(made)}`
}

/** `21 → 20 cards` — the cost of the combine, stated as the resource it actually spends. */
export function combineCostText(held: number): string {
  return `${held} → ${held - 1} cards`
}

/** The `role="status"` sentence after a combine commits, so the produced card announces itself
 *  rather than the player being expected to spot that something changed. */
export function combineDoneText(spent: Buff, made: Buff): string {
  return `Two ${combineCardText(spent)} became one ${combineCardText(made)} — ${combinePayoffText(made)}.`
}

// ---------------------------------------------------------------------------------------------
// DLR-162 — the wildcard band and its target grid. EVERY string below is PLACEHOLDER copy, exactly
// as every other string on this screen is, and is the developer's to change.
// ---------------------------------------------------------------------------------------------

/** Total over the union, so a third wild refusal fails to compile here rather than rendering blank
 *  on a card face. */
export const WILD_REFUSAL_MESSAGE: Readonly<Record<WildRefusal, string>> = {
  [WildRefusal.NoSuit]: 'No suit to take off',
  [WildRefusal.AlreadyWild]: 'Already wild',
}

export const MANAGE_BUFFS_WILD_BAND = 'Wildcards'
export const MANAGE_BUFFS_WILD_RULE =
  'Spend a wildcard on a suited card to take its suit off. It then pays on any trick.'
export const MANAGE_BUFFS_WILD_SPEND_LABEL = 'Spend a wildcard'
export const MANAGE_BUFFS_WILD_TARGET_BAND = 'Pick a card to make wild'
export const MANAGE_BUFFS_WILD_REFUSED_BAND = 'Cannot be made wild'
export const MANAGE_BUFFS_WILD_COMMIT_LABEL = 'Make wild'

/** `1 × Bronze Wildcard` — what the spend destroys. */
export function wildConfirmDestroyText(tier: BuffTier): string {
  return `1 × ${TIER_WORD[tier]} Wildcard`
}

/** `1 × Bronze Wild Taker (Blade) — +1 damage` — what the spend makes. */
export function wildConfirmMakeText(made: Buff): string {
  return `1 × ${combineCardText(made)} — ${combinePayoffText(made)}`
}

/** The `role="status"` sentence after a spend commits, so the converted card announces itself. */
export function wildDoneText(spent: Buff, made: Buff): string {
  return `One ${combineCardText(spent)} became ${combineCardText(made)} — ${combinePayoffText(made)}.`
}

/** One string for the tile, so what a sighted player reads and what a screen reader announces
 *  cannot drift. `produces` is non-null exactly when `refusal` is null. */
export function wildTargetTileAccessibleName(
  buff: Buff,
  count: number,
  produces: Buff | null,
  refusal: WildRefusal | null,
): string {
  const head = `${combineCardText(buff)}, ${count} held.`
  if (refusal !== null || produces === null) {
    return `${head} ${WILD_REFUSAL_MESSAGE[refusal ?? WildRefusal.NoSuit]}`
  }
  return `${head} Make it ${combineCardText(produces)}, ${combinePayoffText(produces)}`
}

/** The tile's own accessible name for a REFUSED pile — one string, so what a sighted player reads
 *  and what a screen reader announces cannot drift. */
export function combineRefusedTileAccessibleName(
  buff: Buff,
  count: number,
  refusal: CombineRefusal,
): string {
  return `${combineCardText(buff)}, ${count} held. ${COMBINE_REFUSAL_MESSAGE[refusal]}`
}

/** The tile's own accessible name for a READY pile. `made` is required rather than nullable —
 *  callers narrow `produces` before reaching this function (`manageBuffsView` only ever pairs a
 *  null refusal with a non-null preview), so there is no case here for a `!` to paper over. */
export function combineReadyTileAccessibleName(buff: Buff, count: number, made: Buff): string {
  const head = `${combineCardText(buff)}, ${count} held.`
  return `${head} Combine two into one ${combineCardText(made)}, ${combinePayoffText(made)}`
}
