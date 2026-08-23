Part of [Hunt](README.md).

# Delayed Apply Damage payout — the press that costs AP and pays later

`src/hunt/applyDamagePayout.ts` (DLR-109) is the module's **second** effect that resolves later than
the thing that caused it — the first being [Timebomb](timebomb-and-the-delayed-hit.md), which this
mechanic deliberately reuses the shape of rather than inventing a second one. **It is not a
Timebomb**, and the two must not be described with the same words: a Timebomb hit is *primed*,
*ticks*, and *detonates*; an Apply Damage payout is *queued*, sits *in the air*, and *lands*. Keeping
the two vocabularies apart is a correctness requirement for this file, not a style note.

Before DLR-109, pressing Apply Damage cashed the bank into the Quarry **instantly**, in the same
reducer transition as the press, at no cost. It now costs `APPLY_DAMAGE_AP_COST` action points and
**queues** the payout instead of dealing it — the cash-out lands at a later trick resolution, and
taking damage in the meantime wipes it to nothing.

## Three pieces of state, and their lifetimes

| Piece | Lives on | Lifetime | Written by |
| --- | --- | --- | --- |
| `pendingApplyPayout` | `EncounterState` | one fight, until it lands or is wiped | `queueApplyDamagePayout`; settled and cleared by `applyResolution` |
| `apPool` | `RoundUiState` | one hand | `refreshActionPointsForNewHand` at mount; spent by `spendAp` |
| `PendingApplyPayout`'s three fields (`cashOut`, `resolutionsOwed`, `unplayedAtPress`) | frozen inside the queued object itself | from the press to the landing | `queueApplyPayout`, never recomputed |

`pendingApplyPayout` sits beside `pendingTimebomb` on `EncounterState` for the same reason
`pendingTimebomb` sits there: `startEncounter` seeds it `null`, so a fight or run boundary discards
it with no explicit clear step to forget, and the field is reachable from `applyDamage`, the one
function every damage path in this codebase funnels through — which is what lets the wipe rule live
in exactly one place.

## The queued shape — everything frozen at the press

```ts
interface PendingApplyPayout {
  readonly cashOut: number          // the full cashValue at the press, never recomputed
  readonly resolutionsOwed: number  // trick resolutions still to survive; > 0 while queued
  readonly unplayedAtPress: number  // AC4 — the player's hand size at the press
}
```

`queueApplyPayout(cashOut, unplayedAtPress, modifiers?)` constructs one, throwing `RangeError` on a
non-finite or non-positive `cashOut` or a non-finite or negative `unplayedAtPress` — the
`quickKillPayout` / `flaskHealAmount` guard discipline, because a `NaN` payout would reach a rendered
heart row and vanish with nothing logged. `resolutionsOwed` is seeded to
`applyDamageDelayTricks(modifiers) + 1`.

## How long the delay is — `applyDamageDelayTricks`, never a literal

`APPLY_DAMAGE_DELAY_TRICKS` (`1`, `src/hunt/apConfig.ts`) is **the number of whole tricks beyond the
trick the press happened in** that a queued payout must survive — AC2's "the current trick plus the
next trick" restated as a count. A press therefore queues `APPLY_DAMAGE_DELAY_TRICKS + 1` trick
resolutions: the trick in flight at the press is the first one, and the constant adds to that floor
rather than replacing it, so "no delay at all" stays inexpressible as a trick count while a future
buff's `removeDelay` can still mean "the earliest possible landing".

```ts
function applyDamageDelayTricks(modifiers?: ApplyDamageDelayModifiers): number
```

Every future consumer reads the delay through this function — never a bare `1` at a call site.
`ApplyDamageDelayModifiers` is the buff hook AC5 asks for: `shortenBy` (summed by the caller, clamped
at `0` here) and `removeDelay` (wins over `shortenBy` outright, returns `0`). **Both fields are
optional and every caller today passes nothing** — the two delay-modifying buffs themselves are out
of this ticket's scope, authored elsewhere against this same hook.

## The tick — `tickApplyPayout`, one trick resolution's effect on the queue

```ts
interface ApplyPayoutTick {
  readonly pending: PendingApplyPayout | null
  readonly due: PendingApplyPayout | null
}
function tickApplyPayout(pending: PendingApplyPayout | null, handEnding: boolean): ApplyPayoutTick
```

Decrements `resolutionsOwed`. Reports the payout as `due` — the payment half, not the storage
half — when the decremented count is `<= 0` (not `=== 0`, so a corrupted counter still terminates
rather than queueing forever) **or** when `handEnding` is `true`. **Never throws**: it runs inside a
reducer during an event handler, where a throw would unmount the tree. `null` in gives
`{ pending: null, due: null }`, and exactly one of `pending`/`due` is non-null whenever the input was
non-null.

### The hand-end flush — an outstanding payout lands rather than being lost

`handEnding` is what makes a payout still owed at the resolution of a hand's **final** trick land on
that resolution instead of vanishing at the hand boundary. This is a design reading, not a
transcription: the alternative — dropping it — turns a trick-6 press into a pure loss of bank and AP
with no counterplay, at exactly the moment the bank is biggest, and carrying it into the next hand
would contradict the hand-scoped bank/multiplier reset the ticket asks this to mirror. **It never
crosses a hand or encounter boundary** — it either lands inside the hand it was pressed in, or it is
wiped first.

## Where it lives, and the single wipe point — AC3

`hasPendingApplyPayout(encounter)` and `queueApplyDamagePayout(encounter, payout)` sit in
`src/hunt/encounter.ts` beside their Timebomb equivalents. `queueApplyDamagePayout` returns the
encounter **unchanged** — never throws — when the encounter is already resolved, or when a payout is
already queued (the one-at-a-time rule below).

**AC3's wipe is enforced inside `applyDamage`, the module's single clamp point**, deliberately rather
than at a call site:

```ts
const playerLostHealth = playerHealth < encounter.health[DuelSide.Player]
// …
pendingApplyPayout: playerLostHealth || winner !== null ? null : encounter.pendingApplyPayout,
```

Every damage path in this codebase funnels through `applyDamage`, so a queued payout cannot survive a
hit by taking a route that forgot to check. "Taking damage" means the player's health **actually
decreased** — a zero-damage event does not wipe, and a Blast-Guard-suppressed streak reset does not
wipe unless health still fell. A resolved encounter also drops the payout: a dead Quarry needs no
further damage, and a dead player has already triggered the wipe on the same line.

## One at a time

`queueApplyDamagePayout` refuses a second press while one is outstanding by returning the encounter
unchanged, and `applyDamageRefusalFor` (below) refuses the press itself with `PayoutPending` before
it can reach the queue. This is a design reading: a second press would need a second countdown and a
second press-time card snapshot, which would make AC4's snapshot ambiguous — one queued payout keeps
the field a single value, mirroring `pendingTimebomb` being settled before it is re-booked. The
player can still bank again during the delay window; only the Apply Damage press itself is refused.

## The four-step order inside `applyResolution` — and why step 4 is last

`applyResolution` in `src/app/warCouncil/commitHandlers.ts` is one trick's whole effect on the
encounter, stated as four steps, in this order:

1. the trick's own damage — which already folds in any Timebomb detonating this trick, via
   `playOptions` — is applied;
2. the paid Timebomb queue is cleared;
3. this trick's own prime is booked for the next trick;
4. the queued Apply Damage payout ticks, and lands if it is due.

**Step 4 is last, and that is the whole ordering rule when a payout and a ticking Timebomb are both
outstanding on the same trick resolution.** Because AC3's wipe lives inside `applyDamage`, step 1 has
already set `pendingApplyPayout` to `null` on any trick that cost the player health by the time step 4
runs — so **a Timebomb detonating against the player on the trick a payout was due destroys that
payout.** This is a consequence of the wipe rule and the order, not a fifth rule stated separately:
putting the tick anywhere earlier would let a player dodge AC3 by timing, which is the one thing the
criterion exists to prevent. The reverse case cannot arise — a ticking Timebomb already refuses a new
Apply Damage press via `TimebombPending`, so a payout can never be queued while a Timebomb is
outstanding against the player in a way that would need the ordering to run the other way.

The settlement itself is `settleApplyPayout(encounter, handEnding)`, split out of `applyResolution` so
the four-step order reads as four steps:

- calls `tickApplyPayout(encounter.pendingApplyPayout, handEnding)`;
- when nothing is due, returns the encounter with `pendingApplyPayout` set to the ticked value — the
  same input object, untouched, when the value did not change, so a no-payout trick allocates
  nothing;
- when a payout is due, clears the field first, then — guarding `isEncounterResolved` for the reason
  `applyResolution` already guards it — deals it through `applyDamage(cleared,
  incomingFromCashOut(due.cashOut))`. `incomingFromCashOut` (`src/warCouncil/voluntaryCashOut.ts`) is
  the one sanctioned `PlayerSide → DuelSide` crossing for this figure, reused rather than duplicated —
  `src/hunt/` cannot import `src/warCouncil/` without a cycle, so the crossing happens in
  `commitHandlers.ts`, which already imports both sides, rather than inside this module.

`applyResolution` widened its return type from `EncounterState` to a small `FoldedResolution` record
(`{ encounter, unplayedAtPress: number | null }`) so it can also report the press-time unplayed count
on the one path where a **delayed** payout is what killed the Quarry — see the quick-kill note below.

## The AP cost and the widened refusal — AC1

`APPLY_DAMAGE_AP_COST` (`3`, `src/hunt/apConfig.ts`) is spent through `spendAp` — the only subtraction
path — on the committing press, and is **not refunded** if the payout is later wiped. Availability
extends `src/warCouncil/voluntaryCashOut.ts`'s existing `applyDamageRefusalFor` rather than adding a
second refusal path, per the ticket's own named risk. The predicate is now five ordered clauses:

```
NotYourMove → TimebombPending → PayoutPending → InsufficientAp → EmptyBank
```

`PayoutPending` and `InsufficientAp` are the two DLR-109 adds. `EmptyBank` stays last because it is
the one reason that stops being true after the next trick banks; `InsufficientAp` precedes it because
AP refreshes only per hand and therefore outlives a trick — a player who cannot afford the press now
still cannot afford it once the bank climbs. `ApplyDamageStock` gained `payoutPending: boolean` and
`apPool: ActionPoints`, both required, so every construction site (the interface, the predicate, the
single builder in `roundUiState.ts`'s `applyDamageStock`, and the test factory) was a compile error
until updated together. See [the voluntary cash-out](../war-council/voluntary-cash-out.md) for the
predicate's full shape and its own history.

`apPool` lives on `RoundUiState`, seeded per hand through `refreshActionPointsForNewHand` at mount —
`App.tsx` remounts the felt per hand (`key={hand}`), so a mount **is** the per-hand refresh — not on
`RunState`. That placement is right under today's `AP_REFRESH_CADENCE = PerHand`, and wrong the day
the cadence becomes per-fight or per-run; DLR-114/DLR-116 may move it when the buff rail needs the
same pool.

## What the reducer does now — `handleTapApplyDamage`

The committing (second) tap no longer applies damage or resolves the encounter. It spends AP, freezes
the press-time hand size, and hands both to the encounter's queue:

```ts
const payout = queueApplyPayout(cashOut, state.round.hands[PlayerSide.Player].length)
return {
  ...state,
  round,
  encounter: queueApplyDamagePayout(state.encounter, payout),
  apPool: spendAp(state.apPool, APPLY_DAMAGE_AP_COST),
  applyPoised: false,
}
```

`captureUnplayed` no longer fires on this transition, because the press no longer resolves the
encounter — the quick-kill count for a **delayed** kill comes from `unplayedAtPress` instead, threaded
by `commit` into `RoundUiState.unplayedAtResolve` only when that field is still `null`, so the two
writers can never fight over it. See
[the quick-kill payout](quick-kill-payout.md#two-sources-of-the-unplayed-count-since-dlr-109) for the
two-source read.

## Both tunables are transcribed, and never played

| Key | Value | Unit | Where it came from |
| --- | --- | --- | --- |
| `APPLY_DAMAGE_AP_COST` | `3` | action points per press | Transcribed from the ticket, which flags it OPEN per `hybrid-design.md` §2 — **never played** |
| `APPLY_DAMAGE_DELAY_TRICKS` | `1` | tricks, beyond the press's own | AC2's "the current trick plus the next trick" — **never played** |

Both live in `src/hunt/apConfig.ts` beside `APPLY_DAMAGE_AP_COST` under their own labelled comment
block, re-exported through `config.ts` (which was at 372 of its 400-line budget) exactly as
`AP_ENABLED`/`STARTING_AP` already are.

## What was taken as a design reading, not chosen by the developer

Three readings behind this mechanic were taken by an agent under an unattended sprint run, not
played or developer-approved: the hand-end flush, the one-at-a-time rule, and the Timebomb-wins
ordering (all documented above, with their rationale). `.docs/game_rules/the-hunt.md` marks the whole
Apply Damage rule `[provisional]` for exactly this reason, alongside both unplayed tunables.

**Nothing on screen tells the player a payout is in the air.** The ticket scopes out any UI change —
no new component, no change to `ApplyDamagePlate.tsx` or `WarCouncilRound.tsx` — so a player presses
Apply, sees the bank zero, sees the Quarry's health not move, and is told nothing until they either
wait for the payout to land or press again and read the `PayoutPending` refusal sentence. `apPool`
is likewise invisible: nothing renders it, so an `InsufficientAp` refusal will read as the button
dying for no visible reason. Both are recorded as the single thing most worth a developer looking at
in the running app; a follow-up UI ticket is likely.

## Purity

`applyDamagePayout.ts` imports only `./config` and `./types` — no React, no DOM global, no
`Math.random()`, no division. `encounter.ts`'s new code imports only `./applyDamagePayout`. The
app-layer contribution (`commitHandlers.ts`) is ordering and threading only: it decides *when* the
tick happens, never *what* it means. Inside the lint-enforced no-React, no-DOM boundary on
`src/hunt/**` and `src/warCouncil/**`.
