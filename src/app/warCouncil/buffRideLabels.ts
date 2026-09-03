/**
 * DLR-153 — every sentence "riding this trick" and the per-card breakdown print. Follows
 * `buffLabels.ts`'s shape: frozen `Record` tables plus small functions, reusing `buffName`,
 * `buffConditionSentence` and `buffPayoff` from it rather than authoring second copies of the
 * same wording. No React, no DOM.
 *
 * `BreakdownBranch` and `CardBuffLight` are imported TYPE-ONLY, from `buffBreakdownModel.ts` and
 * `buffRideModel.ts` respectively — a type-only import erases at build time, so this module can
 * cite both without either of them importing anything back from here at the type level. Both DO
 * import VALUES from here (`buffReachText`, `deadRowReasonText`, …), so the runtime dependency
 * graph has exactly one edge, into this file, and no cycle.
 */
import { buffTargetSuitOf, type Buff } from '../../hunt'
import type { Card } from '../../warCouncil'
import type { BreakdownBranch } from './buffBreakdownModel'
import { buffName } from './buffLabels'
import { SUIT_NAME } from './labels'
import type { CardBuffLight, RidingBuffRow } from './buffRideModel'

export { buffConditionSentence, buffName, buffPayoff } from './buffLabels'

export const RIDING_LIST_LABEL = 'Riding this trick'
export const BREAKDOWN_LABEL = 'What this card is worth'

/** `BuffTargetSuit`'s three members are the same string literals as `Suit`'s (pinned by a test
 *  in `buffs.test.ts`), so `SUIT_NAME` — keyed by `Suit` — reads a `BuffTargetSuit` value with no
 *  second table and no cast. */
function suitWord(suit: Card['suit']): string {
  return SUIT_NAME[suit]
}

/** Named on the MECHANICAL axis (`BreakdownBranch.Took` / `.DidNotTake`), because that is the axis
 *  every buff condition reads — `CLAUDE.md` → "Win and lose mean two different things". Neither
 *  branch is emphasised (AC11): both headings are stated the same way, as a question the player is
 *  answering, not as a verdict. */
export const BRANCH_HEADING: Readonly<Record<BreakdownBranch, string>> = {
  took: 'If you take this trick',
  didNotTake: 'If you do not take this trick',
}

export const TOTALS_LABEL: Readonly<Record<BreakdownBranch, string>> = {
  took: 'Take it',
  didNotTake: "Don't take it",
}

/** AC9. The zero case is stated explicitly and NOT as "0 cards" — a buff that reaches nothing is
 *  dead GLOBALLY, not dead on one card, and that is the real dead case. */
export function buffReachText(reach: number): string {
  if (reach === 0) return 'no card in your hand can fire it'
  return `lights up ${reach} of your ${reach === 1 ? 'card' : 'cards'}`
}

/** DLR-154 AC12 — a riding row's status sentence. ONE function so `BuffRidingList` reads one
 *  string per slot and branches on nothing. PLACEHOLDER copy, as this file's rest is. */
export function ridingRowText(row: RidingBuffRow): string {
  return buffReachText(row.reach)
}

/** AC10. Says the buff comes off the TRICK and names what else goes dark, so nobody reads it as
 *  unloading a single card. */
export function removeBuffLabel(buff: Buff, reach: number): string {
  const tail =
    reach === 0 ? 'nothing goes dark' : `${reach} ${reach === 1 ? 'card goes' : 'cards go'} dark`
  return `Take ${buffName(buff)} off the trick — ${tail}`
}

/** "Needs Bells — this card is Keys." A suitless buff (Sidestep) is never dead for a SUIT reason,
 *  so it gets a suit-neutral reading instead of a fabricated suit clash. */
export function deadRowReasonText(buff: Buff, card: Card): string {
  const suit = buffTargetSuitOf(buff)
  if (suit === null) return `${buffName(buff)} will not fire on this card.`
  return `Needs ${suitWord(suit)} — this card is ${suitWord(card.suit)}.`
}

/** " It is lighting your 2 Bells cards instead." — or the zero-reach sentence when reach is 0. */
export function deadRowElsewhereText(buff: Buff, reach: number): string {
  if (reach === 0) return ` ${capitalize(buffReachText(0))}.`
  const suit = buffTargetSuitOf(buff)
  const suitPhrase = suit !== null ? `${suitWord(suit)} ` : ''
  const cards = reach === 1 ? 'card' : 'cards'
  return ` It is lighting ${reach} of your ${suitPhrase}${cards} instead.`
}

/** AC9/Assumption 2 — the riding list's status line for a non-revocable (Activated) buff, which
 *  draws NO remove control. States plainly why: it has no condition to reach because its whole
 *  effect already happened at the spend, so there is nothing left to take back. */
export function nonRevocableStatusText(buff: Buff): string {
  return `${buffName(buff)} has no condition to reach — already spent.`
}

/** AC10's confirmation, announced through the hand's existing `aria-live="polite"` hint region. */
export function buffRemovedText(buff: Buff, wentDark: number): string {
  const tail =
    wentDark === 0
      ? 'nothing went dark'
      : `${wentDark} ${wentDark === 1 ? 'card' : 'cards'} went dark`
  return `${buffName(buff)} taken off the trick — ${tail}.`
}

/** The badge's accessible text — "2 buffs could fire on this card" / the `~` estimate wording.
 *  Takes only the two fields it reads (`Pick`, not the full `CardBuffLight`) so `PlayingCard.tsx`
 *  — which only ever holds `buffCount`/`buffEstimate`, never a projection — can call this without
 *  fabricating one. `CardBuffLight` itself satisfies the narrower type with no cast, so every
 *  existing caller is unaffected. */
export function buffBadgeText(light: Pick<CardBuffLight, 'count' | 'estimate'>): string {
  const plural = light.count === 1 ? 'buff' : 'buffs'
  const prefix = light.estimate ? 'up to ' : ''
  return `${prefix}${light.count} ${plural} could fire on this card`
}

/** DLR-153 Fix 3 — appended to a totals row when `BreakdownTotals.estimate` is true: the trick's
 *  skull status is not yet knowable (the Quarry's card is still face down), so this row's figures
 *  assume ONE of two still-possible readings rather than a settled fact. Reuses the qualifier idea
 *  `buffBadgeText`'s `'up to '` prefix already carries for the same reason — a stated assumption,
 *  not a fabricated certainty. */
export function totalsEstimateNote(): string {
  return 'assumes the trick is not skulled — not yet known'
}

function capitalize(text: string): string {
  return text.length === 0 ? text : `${text[0].toUpperCase()}${text.slice(1)}`
}
