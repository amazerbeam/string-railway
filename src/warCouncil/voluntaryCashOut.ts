import {
  APPLY_DAMAGE_AP_COST,
  canAffordAp,
  DuelSide,
  type ActionPoints,
  type IncomingDamage,
} from '../hunt'
import { cashValue } from './bank'
import type { RoundState } from './types'

/**
 * DLR-94 AC1 — why Apply Damage cannot be pressed. A reason CODE, not a sentence: `src/warCouncil/`
 * holds no user-facing copy, and `src/app/warCouncil/labels.ts` maps these to words. Exactly
 * `src/hunt/flask.ts`'s `FlaskRefusal` and `src/hunt/shop.ts`'s `PurchaseRefusal`.
 */
export const ApplyDamageRefusal = {
  /** AC1 — nothing banked, so there is nothing to cash. */
  EmptyBank: 'emptyBank',
  /** D6 (version-4-scope §3, decided 2026-08-19) — a booked Timebomb hit has not landed yet, and a
   *  player able to cash out on demand could otherwise dodge the interaction between the two
   *  systems entirely. */
  TimebombPending: 'timebombPending',
  /** DLR-109 — a pressed cash-out is still in the air. One at a time. */
  PayoutPending: 'payoutPending',
  /** DLR-109 AC1 — the hand's AP pool does not cover `APPLY_DAMAGE_AP_COST`. */
  InsufficientAp: 'insufficientAp',
  /** The felt is not waiting on the player's card — a trick reveal is held, an ability prompt is
   *  open, the Quarry is to move, or the hand is over. */
  NotYourMove: 'notYourMove',
} as const
export type ApplyDamageRefusal = (typeof ApplyDamageRefusal)[keyof typeof ApplyDamageRefusal]

/**
 * Everything the rule needs and nothing else — PLAIN VALUES, never an `EncounterState` or a
 * `RoundUiState`. `FlaskStock` and `ShopStock` state the same discipline: this module owns the
 * rule and must not learn the shape of the layer that calls it. `roundUiState.ts`'s
 * `applyDamageStock` builds it.
 */
export interface ApplyDamageStock {
  readonly bank: number
  readonly multiplier: number
  /** A Timebomb is owed to either side and has not been paid. */
  readonly timebombPending: boolean
  /** DLR-109 — a cash-out is already queued and undelivered. */
  readonly payoutPending: boolean
  /** DLR-109 AC1 — the hand's remaining action points. */
  readonly apPool: ActionPoints
  /** The player's own card is the next thing to be committed. */
  readonly canAct: boolean
}

/**
 * THE single statement of whether Apply Damage is available — read by the reducer before it
 * commits anything, and by the plate to disable itself and print the reason. Two readings of one
 * rule, never two rules: a greyed control and a reducer branch that decide availability separately
 * is exactly how the two drift apart, which is why `cheatArmed` and `timebombArmed` are exported
 * from `roundUiState.ts` rather than recomputed in the component.
 *
 * `NotYourMove` comes FIRST because it is true of the whole felt rather than of this control, and
 * `TimebombPending` before `PayoutPending` before `InsufficientAp` before `EmptyBank` for
 * `flaskRefusalFor`'s stated reason: report the reason that will still be true after the next
 * trick banks. Telling a primed player with an empty bank to go and take a trick would be
 * actively wrong. `EmptyBank` stays LAST of the five because it is the one reason that stops
 * being true after the next trick banks; `InsufficientAp` precedes it because AP refreshes only
 * per hand and therefore outlives a trick — a player who cannot afford the press now still cannot
 * afford it once the bank climbs.
 *
 * A non-integer or non-positive bank or multiplier refuses rather than passing the comparison.
 * `NaN > 0` is `false`, but a fractional bank would otherwise present a fractional cash-out as
 * applicable — and that figure would reach a heart row that renders whole hearts.
 */
export function applyDamageRefusalFor(stock: ApplyDamageStock): ApplyDamageRefusal | null {
  if (!stock.canAct) return ApplyDamageRefusal.NotYourMove
  if (stock.timebombPending) return ApplyDamageRefusal.TimebombPending
  if (stock.payoutPending) return ApplyDamageRefusal.PayoutPending
  if (!canAffordAp(stock.apPool, APPLY_DAMAGE_AP_COST)) return ApplyDamageRefusal.InsufficientAp
  if (cashValue(stock.bank, stock.multiplier) <= 0) return ApplyDamageRefusal.EmptyBank
  return null
}

/** AC2 — the round with the streak spent, and what spending it cost the Quarry. */
export interface VoluntaryCashOut {
  /** Bank and multiplier zeroed. EVERYTHING else — `lastResolution`, `currentTrick`, `phase`,
   *  `leader`, both hands — is carried through untouched. */
  readonly state: RoundState
  /** The FULL `cashValue`, not a forced hit's reduced share: choosing is what buys the difference. */
  readonly cashOut: number
}

/**
 * AC2 — cash the current streak into the Quarry by choice, at no cost in health.
 *
 * NOT a fifth `TrickOutcome` and not a synthetic trick, deliberately. Making it one would force
 * `trickOutcomeFor` to become partial, give every `isTaken` consumer a case that is not a trick,
 * and produce a `TrickResolution` describing a trick that never happened — which `BankMeter` and
 * `TrickWell` both read as "what the last trick did". It shares `cashValue` with `resolveTrickBank`
 * and nothing else, which is precisely what AC2 asks for.
 *
 * AC3 is a consequence of what this does NOT touch rather than a rule it enforces: the trick is
 * mid-flight and stays mid-flight, so the player's next tap plays their card through the ordinary
 * `playCard` path, against a freshly zeroed bank.
 */
export function cashBankNow(state: RoundState): VoluntaryCashOut {
  return {
    state: { ...state, bank: 0, multiplier: 0 },
    cashOut: cashValue(state.bank, state.multiplier),
  }
}

/**
 * The `PlayerSide` -> `DuelSide` crossing for a voluntary cash-out, in one named place for the
 * reason `incomingFrom`'s docblock gives: a caller assembling this record by hand is one
 * transposition away from depleting the wrong bar forever.
 *
 * The player's entry is a hard 0 — AC2's "deals no damage to the player" is this line.
 */
export function incomingFromCashOut(cashOut: number): IncomingDamage {
  return {
    [DuelSide.Player]: 0,
    [DuelSide.Quarry]: cashOut,
  }
}
