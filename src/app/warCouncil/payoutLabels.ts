/**
 * DLR-119 — the felt's copy for a queued Apply Damage payout: the risk it carries while it is in
 * the air, and what happened to it when a trick settled it. PLACEHOLDER copy, as every string on
 * this screen is; the wording is the developer's.
 *
 * A total function over `PayoutOutcome` — a third fate added to that union is a compile error
 * here rather than an `undefined` sentence on the felt, the same discipline
 * `APPLY_DAMAGE_REFUSAL_MESSAGE` already uses.
 */
import { PayoutOutcome, type TrickPayoutEvent } from '../../hunt'

/** Appended to the queued-payout note on the action bar. DLR-109's rule, stated at the one moment
 *  it can still change what the player does. */
export const PAYOUT_QUEUE_RISK_HINT = 'Damage to you destroys it.'

const PAYOUT_OUTCOME_TEXT: Readonly<Record<PayoutOutcome, (cashOut: number) => string>> = {
  [PayoutOutcome.Paid]: (cashOut) => `Your queued ${cashOut} lands.`,
  [PayoutOutcome.Destroyed]: (cashOut) => `The hit destroyed your queued ${cashOut}.`,
}

/** The one sentence a resolved trick adds about the payout queue. `null` when this trick neither
 *  settled nor destroyed one, so the felt renders no element at all rather than an empty line. */
export function payoutEventText(event: TrickPayoutEvent | null): string | null {
  if (event === null) return null
  return PAYOUT_OUTCOME_TEXT[event.outcome](event.cashOut)
}
