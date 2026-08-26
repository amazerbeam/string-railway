/**
 * DLR-114 — the action bar's own copy: the bar's static labels and the four composed accessible
 * names, one per button. All PLACEHOLDER copy, as this project's rest is; the polish ticket owns
 * the wording. Reuses `./labels`'s existing `APPLY_DAMAGE_RAIL_LABEL`, `APPLY_DAMAGE_POISED_HINT`,
 * `APPLY_DAMAGE_REFUSAL_MESSAGE`, `DISCARD_REFUSAL_MESSAGE` and `cardAccessibleName` rather than
 * restating any of them.
 */
import type { PendingApplyPayout } from '../../hunt'
import type { ApplyDamageRefusal, Card } from '../../warCouncil'
import {
  APPLY_DAMAGE_POISED_HINT,
  APPLY_DAMAGE_REFUSAL_MESSAGE,
  cardAccessibleName,
} from './labels'
import { PAYOUT_QUEUE_RISK_HINT } from './payoutLabels'

export const ACTION_BAR_LABEL = 'Actions'
export const APPLY_BUFF_LABEL = 'Apply Buff'
export const CARDS_LABEL = 'Cards'
export const SWAP_LABEL = 'Swap'
export const APPLY_DAMAGE_BAR_LABEL = 'Apply Damage'
export const LOADOUT_PANEL_LABEL = 'Your buffs'
export const LOADOUT_EMPTY_MESSAGE = 'Nothing left to spend.'
export const CARDS_NO_SELECTION_HINT = 'No card selected'

/** `Apply Buff — 3 buffs held.` — appends "panel open" or "not between tricks" when either is
 *  true. DLR-145 AC2 — the action-point clause is gone. */
export function applyBuffAccessibleName(
  offeredCount: number,
  open: boolean,
  windowOpen: boolean,
): string {
  const base = `${APPLY_BUFF_LABEL} — ${offeredCount} ${offeredCount === 1 ? 'buff' : 'buffs'} held.`
  if (!windowOpen) return `${base} Not between tricks.`
  return open ? `${base} Panel open.` : base
}

/** `Cards — no card selected` / `Cards — play the 7 of Bells`. */
export function cardsAccessibleName(armed: Card | null): string {
  if (armed === null) return `${CARDS_LABEL} — ${CARDS_NO_SELECTION_HINT}`
  return `${CARDS_LABEL} — play the ${cardAccessibleName(armed)}`
}

/** `Payout queued: 12 damage, 2 tricks to go. Damage to you destroys it.` — AC5's indicator, plus
 *  DLR-119's risk clause: the queue's whole hazard is that a hit wipes it, and saying so only
 *  after it has happened is too late to change a decision. `null` when nothing is queued. */
export function queuedPayoutText(pending: PendingApplyPayout | null): string | null {
  if (pending === null) return null
  const tricks = pending.resolutionsOwed === 1 ? 'trick' : 'tricks'
  return `Payout queued: ${pending.cashOut} damage, ${pending.resolutionsOwed} ${tricks} to go. ${PAYOUT_QUEUE_RISK_HINT}`
}

/** `Apply Damage — cash 12.` — plus the poise hint, the refusal reason, and the queued-payout
 *  sentence when one applies. DLR-145 AC2 — the "for N action points" clause is gone. */
export function applyDamageBarAccessibleName(
  cashValue: number,
  poised: boolean,
  refusal: ApplyDamageRefusal | null,
  pending: PendingApplyPayout | null,
): string {
  const base = `${APPLY_DAMAGE_BAR_LABEL} — cash ${cashValue}.`
  const poise = poised ? ` ${APPLY_DAMAGE_POISED_HINT}` : ''
  const refusalText = refusal !== null ? ` ${APPLY_DAMAGE_REFUSAL_MESSAGE[refusal]}` : ''
  const queued = queuedPayoutText(pending)
  return `${base}${poise}${refusalText}${queued !== null ? ` ${queued}` : ''}`
}
