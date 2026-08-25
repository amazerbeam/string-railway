/**
 * DLR-119/DLR-141 — the felt's copy for a queued Apply Damage payout: the risk it carries while
 * it is in the air, and what happened to it when a trick settled it. PLACEHOLDER copy, as every
 * string on this screen is; the wording is the developer's.
 *
 * A total function over `PayoutOutcome` — a fourth fate added to that union is a compile error
 * here rather than an `undefined` sentence on the felt, the same discipline
 * `APPLY_DAMAGE_REFUSAL_MESSAGE` already uses.
 */
import { APPLY_DAMAGE_HIT_RETENTION, PayoutOutcome, type TrickPayoutEvent } from '../../hunt'

/** Appended to the queued-payout note on the action bar. DLR-141's rule, stated at the one moment
 *  it can still change what the player does — derived from the retention constant so the copy
 *  cannot state a percentage the rule does not. */
export const PAYOUT_QUEUE_RISK_HINT = `Damage to you cuts it to ${Math.round(APPLY_DAMAGE_HIT_RETENTION * 100)}%.`

const PAYOUT_OUTCOME_TEXT: Readonly<Record<PayoutOutcome, (event: TrickPayoutEvent) => string>> = {
  [PayoutOutcome.Paid]: (event) => `Your queued ${event.cashOut} lands.`,
  [PayoutOutcome.Reduced]: (event) =>
    `The hit cut your queued ${event.cashOut} to ${event.remaining}.`,
  [PayoutOutcome.Evaporated]: (event) =>
    `The fight ended before your queued ${event.cashOut} could land.`,
}

/** The one sentence a resolved trick adds about the payout queue. `null` when this trick reported
 *  no payout event, so the felt renders no element at all rather than an empty line. */
export function payoutEventText(event: TrickPayoutEvent | null): string | null {
  if (event === null) return null
  return PAYOUT_OUTCOME_TEXT[event.outcome](event)
}
