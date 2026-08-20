Part of [War Council](README.md).

# Applying damage — the cash-out the player chooses

`voluntaryCashOut.ts` (DLR-94) is the third kind of cash-out this game has, and the only one triggered
by a decision rather than by an event. It spends the current streak into the Quarry **in full**, resets
both counters, and costs the player no health.

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
exactly how the two drift apart, which is the same reason `cheatArmed` and `envenomArmed` are exported
from `roundUiState.ts` rather than recomputed in the component.

It returns a reason **code**, not a sentence: this module holds no user-facing copy, and
`src/app/warCouncil/labels.ts` maps the codes to words through a total `Record`, so a fourth reason
becomes a compile error there rather than an `undefined` sentence under a disabled button. The shape is
`src/hunt/flask.ts`'s `FlaskRefusal` and `src/hunt/shop.ts`'s `PurchaseRefusal` exactly.

| Reason | Means |
| --- | --- |
| `NotYourMove` | The felt is not waiting on the player's card — a reveal is held, a prompt is open, the engine faulted, the hand or the fight is over, or it is the Quarry's turn. |
| `PoisonPending` | A booked poison hit has not landed yet (design decision D6). |
| `EmptyBank` | Nothing banked, so there is nothing to cash. |

**The order is deliberate and is tested.** `NotYourMove` first because it is true of the whole felt
rather than of this control; `PoisonPending` before `EmptyBank` for `flaskRefusalFor`'s stated reason —
report the reason that will still be true after the next trick banks. Telling a poisoned player with an
empty bank to go and take a trick would be actively wrong.

A non-integer or non-positive bank or multiplier refuses rather than passing the comparison. `NaN > 0` is
already `false`, but a fractional bank would otherwise present a fractional cash-out as applicable — and
that figure would reach a heart row that renders whole hearts. The check routes through `cashValue`, so
the guard is stated once.

### `ApplyDamageStock` takes plain values, on purpose

```ts
interface ApplyDamageStock {
  readonly bank: number
  readonly multiplier: number
  readonly poisonPending: boolean
  readonly canAct: boolean
}
```

Four plain values, never an `EncounterState` or a `RoundUiState`. This module owns the rule and must not
learn the shape of the layer that calls it — the same discipline `FlaskStock` and `ShopStock` document.
`src/app/warCouncil/roundUiState.ts`'s `applyDamageStock` is the single place the app's shape is
translated into this one, which is where `hasPendingEnvenom(encounter)` and `canAct(state)` are read.

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
[the Apply Damage plate](../war-council-ui/apply-damage-plate.md) for the control.

## What the tests pin

`src/warCouncil/__tests__/voluntaryCashOut.test.ts` — 13 specs covering the refusal ordering (including
the three-way case where all three reasons are true at once), the pending-poison lock-out, the degenerate
bank, the full payout, the zeroed counters, the zero player damage, the untouched trick/phase/leader/hands,
the untouched `lastResolution` in both the null and carried cases, non-mutation of the input round, and
that calling it on an empty bank is safe rather than an error.
