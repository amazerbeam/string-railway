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
~~taking damage in the meantime wipes it to nothing~~ — true until **DLR-141, 2026-08-25**, and no
longer: a hit that costs the player red health now cuts the queued payout to
`APPLY_DAMAGE_HIT_RETENTION` of its frozen value, rounded down, rather than wiping it outright (see
[the reduce/evaporate split](#where-it-lives-and-the-three-fates--ac3--dlr-141) below).

## Three pieces of state, and their lifetimes

| Piece | Lives on | Lifetime | Written by |
| --- | --- | --- | --- |
| `pendingApplyPayout` | `EncounterState` | one fight, until it lands or is wiped | `queueApplyDamagePayout`; settled and cleared by `applyResolution` |
| the AP pool — `RoundUiState.apPool` on DLR-109, **`RoundUiState.buffActivation.apPool` since DLR-114** | `RoundUiState` | one hand | seeded at mount (`refreshActionPointsForNewHand` on DLR-109, `startBuffActivation` since DLR-114); spent by `spendAp` |
| `PendingApplyPayout`'s three fields (`cashOut`, `resolutionsOwed`, `unplayedAtPress`) | frozen inside the queued object itself | from the press to the landing | `queueApplyPayout`, never recomputed |

`pendingApplyPayout` sits beside `pendingTimebomb` on `EncounterState` for the same reason
`pendingTimebomb` sits there: `startEncounter` seeds it `null`, so a fight or run boundary discards
it with no explicit clear step to forget, and the field is reachable from `applyDamage`, the one
function every damage path in this codebase funnels through — which is what lets the on-hit rule
(below) live in exactly one place.

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

## Where it lives, and the three fates — AC3 / DLR-141

`hasPendingApplyPayout(encounter)` and `queueApplyDamagePayout(encounter, payout)` sit in
`src/hunt/encounter.ts` beside their Timebomb equivalents. `queueApplyDamagePayout` returns the
encounter **unchanged** — never throws — when the encounter is already resolved, or when a payout is
already queued (the one-at-a-time rule below).

**The on-hit rule is enforced inside `applyDamage`, the module's single clamp point**, deliberately
rather than at a call site. DLR-109 originally wiped the payout to `null` on either condition below;
**DLR-141 (2026-08-25) split that into a reduce/evaporate pair**, per the developer's confirmed
three-outcome table:

| Situation | Queued payout |
| --- | --- |
| Player loses health from a hit | **`APPLY_DAMAGE_HIT_RETENTION` (60%) of its value, rounded down** |
| Hit fully absorbed by blue hearts | **100% — untouched** (unchanged since DLR-110) |
| Encounter ends (either side) | **0 — evaporates** (unchanged since DLR-109) |

```ts
const playerLostHealth = playerHealth < encounter.health[DuelSide.Player]
// …
pendingApplyPayout:
  winner !== null
    ? null
    : playerLostHealth
      ? reduceApplyPayoutOnHit(encounter.pendingApplyPayout)
      : encounter.pendingApplyPayout,
```

`winner !== null` is checked **first**, so a killing blow that also costs the player health
evaporates the payout rather than reducing it — a resolved encounter has no target left to pay,
regardless of what a hit's own retention math would have produced. Every damage path in this
codebase funnels through `applyDamage`, so a queued payout cannot dodge the rule by taking a route
that forgot to check. "The player lost health" means health **actually decreased** — a zero-damage
event leaves the payout untouched, and a hit blue hearts absorb **entirely** leaves it untouched too,
at 100%, because `playerLostHealth` stays `false` by construction: no second predicate was added for
the fully-absorbed case, the existing `playerHealth < encounter.health[...]` check already covers it.

`reduceApplyPayoutOnHit` (`src/hunt/applyDamagePayout.ts`) is the pure reducer: `null` in gives
`null` out; otherwise it floors `cashOut` to `APPLY_DAMAGE_HIT_RETENTION` of its value, and returns
`null` — rather than a payout of `0` — when that floored value is `<= 0`, because `PendingApplyPayout`
is documented strictly positive and `queueApplyPayout` itself refuses to mint a non-positive one.
It never throws, matching `tickApplyPayout`'s discipline: it runs inside a reducer during an event
handler, where a throw would unmount the tree.

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
outstanding on the same trick resolution.** Because the on-hit rule lives inside `applyDamage`, step 1
has already run `reduceApplyPayoutOnHit` on any trick that cost the player health by the time step 4
runs — so ~~a Timebomb detonating against the player on the trick a payout was due destroys that
payout~~ — true until **DLR-141, 2026-08-25**: it now **reduces** that payout to
`APPLY_DAMAGE_HIT_RETENTION` of its value (floored, `null` only when the floor reaches zero) rather
than destroying it outright, and it is this reduced figure — not the original — that lands if step 4
also settles the payout the same trick. This is a consequence of the on-hit rule and the order, not a
fifth rule stated separately: putting the tick anywhere earlier would let a player dodge the
reduction by timing, which is the one thing the criterion exists to prevent. The reverse case cannot
arise — a ticking Timebomb already refuses a new Apply Damage press via `TimebombPending`, so a
payout can never be queued while a Timebomb is outstanding against the player in a way that would
need the ordering to run the other way.

### Reporting the fate — `PayoutOutcome`, `TrickPayoutEvent`, and why the check is by reference

**DLR-141** widened `PayoutOutcome` (`src/hunt/applyDamagePayout.ts`) from a two-member union
(`Paid` / `Destroyed`) to three: `Paid`, `Reduced`, `Evaporated` — `Destroyed` was deleted, not
aliased. `TrickPayoutEvent` gained a required `remaining: number | null` field: `null` for the two
terminal outcomes (`Paid`, `Evaporated`), a number for the non-terminal `Reduced` (which the payout
survives, still queued). Nothing branches on `PayoutOutcome` — it exists purely so the felt can
narrate an outcome the engine already decided.

`applyResolution` in `commitHandlers.ts` derives which fate occurred by comparing
`encounter.pendingApplyPayout` (`queued`) against the same field after `applyDamage` runs (`paid`) —
the ONLY place the difference between the fates is visible, since a reduction-to-zero and an
evaporation both leave the field `null` afterwards. Gone with a winner is `Evaporated`; gone with no
winner is a reduction that floored to zero (`Reduced`, `remaining: 0`); a smaller `cashOut` still
standing is `Reduced` with `remaining` set to the survivor's value; unchanged is no event at all.

**That last branch is decided by REFERENCE inequality (`paid.pendingApplyPayout !== queued`), not a
`cashOut` value comparison — deliberately.** `reduceApplyPayoutOnHit` always returns a freshly spread
object (`{ ...pending, cashOut }`) when it reduces, and returns the *same reference* untouched when
no hit landed. A value comparison (`paid.pendingApplyPayout.cashOut < queued.cashOut`) would only
happen to work while `APPLY_DAMAGE_HIT_RETENTION` is `< 1` — retuning it to `1.0` would leave
`cashOut` numerically unchanged on a genuine reduction, and a value check would silently stop
reporting `Reduced` even though a hit landed. Reference inequality detects "a reduction happened"
independent of what fraction the reduction produced.

A trick that **both** reduces and settles a payout in the same fold (a payout due the same trick a
hit lands) reports it `Paid` at the reduced figure: `tick.due.cashOut` inside `settleApplyPayout`
(below) is already the post-reduction value, so the number the player is told is the number that
actually landed — the intermediate `Reduced` event that fold may have produced is overwritten, not
composed with it.

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

`APPLY_DAMAGE_AP_COST` (`1`, `src/hunt/apConfig.ts`) is spent through `spendAp` — the only subtraction
path — on the committing press, and is **not refunded** if the payout is later wiped. Availability
extends `src/warCouncil/voluntaryCashOut.ts`'s existing `applyDamageRefusalFor` rather than adding a
second refusal path, per the ticket's own named risk. The predicate is now five ordered clauses:

```
NotYourMove → TimebombPending → PayoutPending → InsufficientAp → EmptyBank
```

`PayoutPending` and `InsufficientAp` are the two DLR-109 adds. `EmptyBank` stays last because it is
the one reason that stops being true after the next trick banks. `InsufficientAp` precedes it for a
different reason since 2026-08-25: under `AP_REFRESH_CADENCE = PerTrick` the pool refills every trick
(see below), so a refusal here is a **same-trick** fact, not one that outlives a trick the way it did
under the retired `PerHand` cadence — a player refused now may still be able to afford the press
after `openBuffWindow`'s next refill, without the bank needing to climb at all. `ApplyDamageStock`
gained `payoutPending: boolean` and `apPool: ActionPoints`, both required, so every construction site
(the interface, the predicate, the single builder in `roundUiState.ts`'s `applyDamageStock`, and the
test factory) was a compile error until updated together. See
[the voluntary cash-out](../war-council/voluntary-cash-out.md) for the predicate's full shape and its
own history.

The pool lives on `RoundUiState`, seeded at mount — `App.tsx` remounts the felt per hand
(`key={hand}`), so a mount **is** the per-hand refresh — not on `RunState`. That placement is right
regardless of cadence: `startBuffActivation` still seeds `capacity` once per hand, and `AP_REFRESH_CADENCE`
only decides whether `openBuffWindow` also refills mid-hand (see
[buff activation and the tiered AP costs](buff-activation-and-ap-costs.md) for what changed there
under 2026-08-25).

> **DLR-114 moved the field but not the placement.** The prediction above was half right: the buff
> loadout did need the same pool, and rather than a second field it **deleted** `RoundUiState.apPool`
> and replaced it with `buffActivation: BuffActivationState`, whose own `apPool` is now the one pool
> both spenders draw on. `applyDamageStock` reads `state.buffActivation.apPool` and
> `handleTapApplyDamage` writes `spendAp`'s result back into it. Still hand-lifetime, still on
> `RoundUiState`, still not persisted — and now seeded by `startBuffActivation()` rather than
> `refreshActionPointsForNewHand`, which is the same figure by a different route.

## What the reducer does now — `handleTapApplyDamage`

The committing (second) tap no longer applies damage or resolves the encounter. It spends AP, freezes
the press-time hand size, and hands both to the encounter's queue:

```ts
const payout = queueApplyPayout(cashOut, state.round.hands[PlayerSide.Player].length)
return {
  ...state,
  round,
  encounter: queueApplyDamagePayout(state.encounter, payout),
  apPool: spendAp(state.apPool, APPLY_DAMAGE_AP_COST),  // now buffActivation.apPool — see above
  applyPoised: false,
}
```

`captureUnplayed` no longer fires on this transition, because the press no longer resolves the
encounter — the quick-kill count for a **delayed** kill comes from `unplayedAtPress` instead, threaded
by `commit` into `RoundUiState.unplayedAtResolve` only when that field is still `null`, so the two
writers can never fight over it. See
[the quick-kill payout](quick-kill-payout.md#two-sources-of-the-unplayed-count-since-dlr-109) for the
two-source read.

## The three tunables

| Key | Value | Unit | Where it came from |
| --- | --- | --- | --- |
| `APPLY_DAMAGE_AP_COST` | `1` | action points per press | **DEVELOPER-SET on 2026-08-25** (2026-08-25), replacing the transcribed-from-ticket default of `3` that `hybrid-design.md` §2 had flagged OPEN |
| `APPLY_DAMAGE_DELAY_TRICKS` | `1` | tricks, beyond the press's own | AC2's "the current trick plus the next trick" — **never played** |
| `APPLY_DAMAGE_HIT_RETENTION` | `0.6` | dimensionless fraction of the frozen `cashOut`, 0..1 | **DEVELOPER-SET on the DLR-141 ticket** — 60%, rounded down at the point of use (`reduceApplyPayoutOnHit`). Read at exactly one call site. |

All three live in `src/hunt/apConfig.ts` under their own labelled comment blocks, re-exported through
`config.ts` exactly as `AP_ENABLED`/`STARTING_AP` already are. No copy states the 60% figure as a
literal either — `payoutLabels.ts`'s risk hint derives its percentage from the same constant.

## What was taken as a design reading, not chosen by the developer

Three readings behind this mechanic were taken by an agent under an unattended sprint run, not
played or developer-approved: the hand-end flush, the one-at-a-time rule, and the **order** of the
Timebomb-vs-payout resolution (all documented above, with their rationale) — the ORDER remains
`[provisional]`. **The on-hit rule's figure is no longer one of these** — DLR-141 settled it against
a developer-confirmed table (quoted at the top of the "three fates" section above), so
`.docs/game_rules/the-hunt.md` marks that specific reading `[settled]` while the AP cost, the delay
figure, and the Timebomb-ordering reading stay `[provisional]`/unplayed.

~~**Nothing on screen tells the player a payout is in the air.**~~ **True as DLR-109 shipped it,
closed by DLR-114.** DLR-109 scoped out any UI change — no new component, no `.tsx` file touched — so
a player pressed Apply, saw the bank zero, saw the Quarry's health not move, and was told nothing
until either the payout landed or a second press was refused. DLR-114's action bar states both:
`queuedPayoutText` renders `Payout queued: 12 damage, 2 tricks to go.` under the Apply Damage button
whenever `pendingApplyPayout` is non-null, and the AP pool is on the Apply Buff button's face and in
the loadout panel, so an `InsufficientAp` refusal no longer reads as a button dying for no reason.
**Neither readout has been looked at by a human** — the contract that added them ran unattended with
its browser pass off. Both are recorded as the single thing most worth a developer looking at
in the running app; a follow-up UI ticket is likely.

## Purity

`applyDamagePayout.ts` imports only `./config` and `./types` — no React, no DOM global, no
`Math.random()`, no division. `encounter.ts`'s new code imports only `./applyDamagePayout`. The
app-layer contribution (`commitHandlers.ts`) is ordering and threading only: it decides *when* the
tick happens, never *what* it means. Inside the lint-enforced no-React, no-DOM boundary on
`src/hunt/**` and `src/warCouncil/**`.
