Part of [War Council](README.md).

# Applying damage — the cash-out the player chooses

`voluntaryCashOut.ts` (DLR-94) is the third kind of cash-out this game has, and the only one triggered
by a decision rather than by an event. It spends the current streak into the Quarry **in full**, resets
both counters, and costs the player no health.

> **DLR-109 changed what pressing it actually does, though nothing in this file's own rule moved.**
> `cashBankNow` and `incomingFromCashOut` below are unchanged — they still compute the full figure and
> the seat crossing exactly as DLR-94 shipped them. What changed is what the reducer does with the
> result: the committing press now **queues** `cashBankNow`'s output on `EncounterState.pendingApplyPayout`
> instead of dealing it through `applyDamage` in the same transition, and costs `APPLY_DAMAGE_AP_COST`
> action points to do so. This file gained the availability half of that change — two new refusal
> codes and two new `ApplyDamageStock` fields, documented below — but the landing itself, the delay,
> and the wipe-on-damage rule live in
> [the delayed Apply Damage payout](../hunt/delayed-apply-damage-payout.md).

> **DLR-143 (2026-08-25) replaced the gate itself: leader-only, not Timebomb-blocked.** `TimebombPending`
> (design decision D6, 2026-08-19) is deleted from the reason vocabulary, not renamed — a pending
> Timebomb no longer refuses the press at all, and the two systems are now allowed to **stack**,
> settling together in the same trick's resolution fold via `commitHandlers.ts`'s existing four-step
> order (unchanged). In its place: `TrickInProgress`, which refuses whenever
> `state.round.currentTrick.length > 0` — the press is **leader-only**, unpressable once any card,
> including the Quarry's own lead, is on the table. This is a genuinely new gate, not a renamed one:
> the old rule blocked on a Timebomb's state; the new one blocks on the trick's state, and the two
> conditions are independent. Both `ApplyDamageStock` and `APPLY_DAMAGE_REFUSAL_MESSAGE` (a total
> `Record`) enforce that the rename moves everywhere at once — a stray `TimebombPending` reference is a
> compile error, not a runtime gap.

It exists as its own small module rather than as a branch of `bank.ts` because it is not a trick
outcome — see [why it is not a fifth `TrickOutcome`](#why-it-is-not-a-fifth-trickoutcome) below, which
is the part worth reading before changing anything here.

It imports only `DuelSide` / `IncomingDamage` from `src/hunt/`, `cashValue` from `./bank`, and
`RoundState` from `./types`. No React, no DOM, no global.

## The three exports, and what each is for

```ts
applyDamageRefusalFor(stock: ApplyDamageStock): ApplyDamageRefusal | null
cashBankNow(state: RoundState): VoluntaryCashOut   // { state, cashOut }
incomingFromCashOut(cashOut: number): IncomingDamage
```

### Availability is one predicate, read twice

`applyDamageRefusalFor` is **the** single statement of whether the control is live. The reducer asks it
before it commits anything, and the plate asks it to disable itself and print the reason. Two readings of
one rule, never two rules — a greyed control and a reducer branch that decide availability separately is
exactly how the two drift apart, which is the same reason `cheatArmed` and `timebombArmed` are exported
from `roundUiState.ts` rather than recomputed in the component.

It returns a reason **code**, not a sentence: this module holds no user-facing copy, and
`src/app/warCouncil/labels.ts` maps the codes to words through a total `Record`, so a fourth reason
becomes a compile error there rather than an `undefined` sentence under a disabled button. The shape is
`src/hunt/flask.ts`'s `FlaskRefusal` and `src/hunt/shop.ts`'s `PurchaseRefusal` exactly.

| Reason | Means |
| --- | --- |
| `NotYourMove` | The felt is not waiting on the player's card — a reveal is held, a prompt is open, the engine faulted, the hand or the fight is over, or it is the Quarry's turn. |
| `TrickInProgress` | **DLR-143.** The current trick already has a card on the table — Apply Damage is leader-only. Replaces `TimebombPending` (design decision D6, 2026-08-19 — reversed). |
| `PayoutPending` | A pressed cash-out is already queued and undelivered — one at a time (DLR-109). |
| `InsufficientAp` | The hand's AP pool does not cover `APPLY_DAMAGE_AP_COST` (DLR-109 AC1). **UNREACHABLE since DLR-145** — `AP_ENABLED` is `false`, so the cost is 0 and the clause never fires. It stays in the union, and in the order below, so `APPLY_DAMAGE_REFUSAL_MESSAGE` stays a total `Record`. |
| `EmptyBank` | Nothing banked, so there is nothing to cash. |

**The order is deliberate and is tested — five clauses since DLR-109, `TrickInProgress` taking
`TimebombPending`'s exact ordinal slot since DLR-143.**
`NotYourMove → TrickInProgress → PayoutPending → InsufficientAp → EmptyBank`. `NotYourMove` first
because it is true of the whole felt rather than of this control; `TrickInProgress` before
`PayoutPending` before `InsufficientAp` before `EmptyBank` for the same stated reason —
report the reason that will still be true after the next trick banks. Telling a primed player with an
empty bank to go and take a trick would be actively wrong. **`EmptyBank` stays last of the five**
because it is the one reason that stops being true after the next trick banks; **`InsufficientAp`
precedes it** because AP refreshes only per hand and therefore outlives a trick — a player who cannot
afford the press now still cannot afford it once the bank climbs. (That last reasoning was already
weakened by the move to a per-trick refresh, and is moot since DLR-145 turned action points off — the
clause is now unreachable, and the ordering is preserved rather than justified.)

A non-integer or non-positive bank or multiplier refuses rather than passing the comparison. `NaN > 0` is
already `false`, but a fractional bank would otherwise present a fractional cash-out as applicable — and
that figure would reach a heart row that renders whole hearts. The check routes through `cashValue`, so
the guard is stated once.

### `ApplyDamageStock` takes plain values, on purpose

```ts
interface ApplyDamageStock {
  readonly bank: number
  readonly multiplier: number
  readonly trickInFlight: boolean   // DLR-143 — was `timebombPending`
  readonly payoutPending: boolean   // DLR-109
  readonly apPool: ActionPoints     // DLR-109 AC1
  readonly canAct: boolean
}
```

Six plain values, never an `EncounterState` or a `RoundUiState`. This module owns the rule and must not
learn the shape of the layer that calls it — the same discipline `FlaskStock` and `ShopStock` document.
`src/app/warCouncil/roundUiState.ts`'s `applyDamageStock` is the single place the app's shape is
translated into this one, which is where `state.round.currentTrick.length > 0` (**DLR-143**,
replacing `hasPendingTimebomb(encounter)`), `hasPendingApplyPayout(encounter)`
(DLR-109), and `canAct(state)` are read. **`payoutPending` and `apPool` were added as required fields**,
which made every construction site — the interface, the predicate, this one builder, and the test
factory — a compile error until all four moved together. **This interface was untouched by DLR-114**;
only where the builder reads the pool from moved, from `state.apPool` to
`state.buffActivation.apPool`, which is exactly the insulation the plain-values shape buys.
**DLR-143 swapped the field's meaning outright** (`timebombPending` → `trickInFlight`, a read off
`RoundState.currentTrick` rather than off the Timebomb queue) — the same total-`Record`/required-field
discipline made every construction site a compile error until the swap was made everywhere at once.

### `cashBankNow` — and what it deliberately does not touch

Returns `{ state, cashOut }` where `state` is the round with **only** `bank` and `multiplier` zeroed.
Everything else — `lastResolution`, `currentTrick`, `phase`, `leader`, both hands, `tricksPlayed`,
`tricksWon` — is carried through untouched, and it never mutates the round it was given.

**That is what makes "the trick proceeds normally" a no-op rather than a rule.** The trick is mid-flight
and stays mid-flight, so the player's next tap plays their card through the ordinary `playCard` path,
against a freshly zeroed bank. There is no code enforcing the continuation because there is no code
interrupting it.

**It does not write `lastResolution`.** That field is trick-scoped — `BankMeter` and `TrickWell` both read
it as "what the last trick did" — and writing a non-trick event into it would make the felt announce a
trick outcome that never happened.

`cashOut` is `cashValue(bank, multiplier)`: the **full** product, not a forced hit's reduced share.
Choosing the moment is what buys the difference.

### `incomingFromCashOut` — the seat crossing, once

```ts
{ [DuelSide.Player]: 0, [DuelSide.Quarry]: cashOut }
```

The `PlayerSide` → `DuelSide` crossing for a voluntary cash-out, in one named place for the reason
`incomingFrom`'s own docblock gives: a caller assembling this record by hand is one transposition away
from depleting the wrong bar forever. The player's entry is a hard `0` — "deals no damage to the player"
is literally this line.

## Why it is not a fifth `TrickOutcome`

Modelling it as an outcome was the obvious alternative and is worse in three specific ways:

- `trickOutcomeFor` would have to become **partial** — there is no pair of `(playerWon, skullTrick)`
  facts that produces it, because no trick was played.
- Every `isTaken` consumer gains a case that is **not a trick**.
- It would produce a `TrickResolution` describing a trick that did not happen, and both `BankMeter` and
  `TrickWell` read that as "what the last trick did".

Instead it shares `cashValue` with `resolveTrickBank` and nothing else — which is precisely what the
ticket asked for: a distinct resolution path over the same arithmetic.

## Where it is called

`src/app/warCouncil/roundReducer.ts` — `handleTapApplyDamage`, the only caller. See
[interaction and state](../war-council-ui/interaction-and-state.md) for the two-tap grammar and
[Apply Damage — the two-tap cash-out](../war-council-ui/apply-damage-plate.md) for the control, which
since DLR-114 is the fourth button on the felt's
[action bar](../war-council-ui/action-bar-and-loadout.md) rather than a felt-rail plate.

## What the tests pin

`src/warCouncil/__tests__/voluntaryCashOut.test.ts` covers the refusal ordering (including the
leader-only lock-out — DLR-143's `TrickInProgress`, replacing the pending-Timebomb lock-out it
reverses — and, since DLR-109, the queued-payout lock-out and the AP-shortfall case,
walked down the full five-clause order from every reason true at once), the degenerate bank, the full
payout, the zeroed counters, the zero player damage, the untouched trick/phase/leader/hands, the
untouched `lastResolution` in both the null and carried cases, non-mutation of the input round, and
that calling it on an empty bank is safe rather than an error. The queueing behaviour itself — that a
committing press no longer deals damage in the same transition — is pinned in
`src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts` and
`roundReducer.delayedApply.test.ts`, not here: this file's own rule (the figure, the seat crossing,
the untouched trick) is unchanged by DLR-109. **DLR-143 added a stacked-fold test in
`roundReducer.applyDamage.test.ts`** proving a Timebomb queued before the press and a payout queued by
the press both settle in the same trick resolution — the scenario the old D6 refusal made
unreachable, since it never let both states coexist.
