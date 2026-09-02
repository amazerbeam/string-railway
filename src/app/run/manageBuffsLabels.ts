import { BuffTier, CombineRefusal, type Buff } from '../../hunt'
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
