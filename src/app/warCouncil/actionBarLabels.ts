/**
 * DLR-114 — the action bar's own copy: the bar's static labels and the composed accessible
 * names, one per button. All PLACEHOLDER copy, as this project's rest is; the polish ticket owns
 * the wording. Reuses `./labels`'s existing `cardAccessibleName` rather than restating it.
 */
import type { Card } from '../../warCouncil'
import { cardAccessibleName } from './labels'

export const ACTION_BAR_LABEL = 'Actions'
export const APPLY_BUFF_LABEL = 'Apply Buff'
export const CARDS_LABEL = 'Cards'
export const SWAP_LABEL = 'Swap'
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
