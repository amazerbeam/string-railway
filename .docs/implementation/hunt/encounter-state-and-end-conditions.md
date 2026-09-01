_Part of [Hunt](README.md)._

**DLR-70** built this, and it is the ticket where the duel stopped being inert configuration and
became arithmetic that resolves. `src/hunt/encounter.ts` is the first thing in the codebase holding
state that **outlives a single `RoundState`** — before it, nothing in the program remembered anything
about a finished Hunt.

It shipped with **no caller at all** — complete, tested, and reachable only from Vitest. **DLR-71
wired it up**, **DLR-80 changed when it fires and who owns it**, and **DLR-91 changed the order in
which it settles the two bars.**

Damage used to land once per Hunt, on a confirmation press, with `App.tsx` holding the
`EncounterState` and the reducer holding a nullable applied copy. Since DLR-80 the **reducer owns the
live state**: `createRoundUiState` seeds it from the mount's prop, and `applyDamage` is called on
**every trick resolution that carries a non-zero figure** — so the encounter can resolve mid-hand,
and `onComplete` hands the final state back to `App.tsx`. The rejected alternative, keeping the
encounter in `App.tsx` and calling up on every trick, would have put a second write path beside the
reducer's own.

The **sequence** of encounters is still unbuilt — one encounter index, nothing advancing it — and so
is `ENCOUNTER_PLAYER_RESTORE`, which still has no consumer.

### The state — `EncounterState`

An **encounter** is a sequence of Hunts fought until one bar empties (§5). `EncounterState` in
`types.ts` holds exactly four fields and nothing else — three since DLR-70, and `pendingTimebomb`
since DLR-90:

```ts
export interface EncounterState {
  readonly health: Readonly<Record<DuelSide, Health>>
  readonly damageEventsApplied: number
  readonly winner: DuelSide | null
  readonly pendingTimebomb: IncomingDamage // DLR-90
}
```

It is **immutable** — `applyDamage` returns a new one and never touches its input, which a spec asserts
directly. That is not decoration: it is what lets DLR-71 preview a Hunt by applying it to a copy
rather than writing a second projection routine that could drift from this one.

**`damageEventsApplied` is a counter, not a cap.** There is deliberately no maximum number of Hunts per
encounter — see [No Hunt cap](#no-hunt-cap) below.

**`winner` is `DuelSide | null`, not a three-value outcome union.** `null` while the encounter is
live; `Player` means the encounter is won; `Quarry` means the run ends. The shape was originally chosen because
`SIMULTANEOUS_DEPLETION_WINNER` was *already* typed `DuelSide` and *already* named winner, so the tie
case was a direct read of the constant rather than a translation onto a second vocabulary. **DLR-91
deleted that constant and the tie with it, and the shape is unchanged** — two reachable values and a
`null` is what `resolveWinner` still returns. A
`'won' | 'lost' | 'live'` union would read more directly at a render call site, which is DLR-71's
concern and not yet written; if it turns out awkward there, adding a derived helper is cheaper than
changing this type, and nothing serialises it.

`IncomingDamage` beside it is `Readonly<Record<DuelSide, Damage>>` — one Hunt's damage **keyed by the
side it is applied to**, never by the side that dealt it. That is `HuntOutcome.incoming`'s convention
carried deliberately across the module boundary, so the crossing is performed exactly once and on
the other side of it (see [`incomingFrom`](../war-council/the-streak-and-the-pot.md)).

**`pendingTimebomb` reuses that exact type** rather than inventing a parallel one — damage owed to each
side at the resolution of the **next trick** (DLR-91 D1; DLR-90 paid it at the next hand's deal),
keyed the same way. `startEncounter` seeds it to zeros and
`applyDamage` carries it through untouched, because a trick's own damage neither pays nor cancels a
booking — the clearing is `roundReducer.ts`'s `applyResolution`, one level up. Everything about the queue, its payment and why it lives here rather than on `RunState` is in
[Timebomb — the held charge, the delayed-hit queue, and where it is paid](timebomb-and-the-delayed-hit.md);
the one thing worth knowing while reading *this* file is that **the encounter boundary is what discards
a queued hit**, and it does so through `startEncounter`'s seed rather than through any explicit clear
step.

### Starting one — `startEncounter`

`startEncounter(encounterIndex, playerHealth = PLAYER_START_HEALTH)` reads **both** bars from
DLR-66's configured totals rather than from literals: the player's from `PLAYER_START_HEALTH`, the
Quarry's from `quarryHealthForEncounter(encounterIndex)`. No `1350` and no `1600` appears anywhere in
`encounter.ts`, and DLR-70's own closing checks grep for exactly those two literals to prove it.

**`encounterIndex` selects a bar; it sequences nothing.** Running the encounters in order is
[`run.ts`'s](run-sequence.md) (DLR-82), which calls `startEncounter` once per fight and passes the
health the player carried out of the last one. Any **automatic** restore between them
(`ENCOUNTER_PLAYER_RESTORE`) remains **deliberately unread** by both modules — DLR-82 forbade wiring
it in until the flask was designed, and **DLR-93 designed and built the flask without touching it**.
The flask is a player-triggered between-fights heal, not that tunable finally being wired in; see
[the flask](the-flask.md).

`playerHealth` is a **defaulted parameter** rather than something the function closes over — the same
injectable pattern this codebase uses for every tunable — and which `assignSkulls`'s `density` and
`weights` followed (DLR-80, the latter renamed from `minRank` by PT-001) — so a spec varies it
without mutating module state.

### Applying one — `applyDamage`

`applyDamage(encounter, incoming)` is the whole transition, and three things happen in a **fixed
order**:

1. **Refuse an already-resolved encounter**, and refuse damage that is not a finite non-negative
   number — **both sides' figures, always**, including on the path that will not subtract the
   player's (both `RangeError` — see [Four refusals](#four-refusals)).
2. **Deplete the Quarry's bar.**
3. **Deplete the player's bar only if the Quarry survived.**
4. **Resolve the winner** from the resulting pair.

**Steps 2 and 3 are ordered, and the order is the rule** (DLR-91, decision D7). A Quarry that goes
down to this event ends the encounter, and the player takes **nothing** from it — the killing blow is
its own protection, so a cash-out that empties the Quarry's bar spares the player the hit that would
have landed alongside it.

That replaced DLR-70's deplete-both-then-inspect, which existed for the opposite reason: it kept the
simultaneous case reachable so §9's dated tie ruling stayed live code. **The developer overturned that
ruling on 2026-08-19**, and the tie is now unreachable by construction rather than decided by a
constant — so `SIMULTANEOUS_DEPLETION_WINNER` was deleted rather than pointed at the new winner. A
config key nothing reads is a tunable that silently does nothing, which is worse than having none.

Note the guard that did **not** move: `assertApplicable` still runs on the player's incoming figure
even when the Quarry goes down and that figure is never subtracted. Skipping it would let a
primed `NaN` pass unexamined on exactly the branch that ignores it.

Damage arrives as two plain numbers keyed by `DuelSide`, already pointed at the bar each depletes, so
this function **does not invert anything and cannot get it backwards**. That is the whole reason
`IncomingDamage` exists rather than `HuntOutcome` being passed in: `HuntOutcome` is keyed by
`PlayerSide`, a `src/warCouncil/` type, and **`src/hunt/` cannot import `src/warCouncil/` without a
cycle** — warCouncil already imports hunt. The alternative considered and rejected was moving the
encounter module into `src/warCouncil/` where it could accept a `HuntOutcome` directly; rejected
because health, `DuelSide`, and every configured total already live here, and moving the module would
drag the domain vocabulary across the boundary in the wrong direction.

### The single clamp — `deplete`

```ts
function deplete(current: Health, damage: Damage): Health {
  return Math.max(0, current - damage)
}
```

Module-private, one line, and the **only place in this module that writes a health value.** Two
separate rules are the same line of code seen from two directions:

- **Health never goes negative.** There is exactly one clamp point, so there is no second writer that
  could bypass it.
- **Surplus damage past a depleted bar is discarded** — not carried, not converted (§9 records the
  overkill question Deferred).

The discard is **asserted rather than merely allowed**, which is what makes it a chosen rule instead
of an accident of arithmetic. The spec applies 5,000 damage to a 1,350 bar and asserts the resulting
state is **deep-equal** to the one produced by applying exactly 1,350. Because `EncounterState` has
only three fields and `deplete` is the sole writer to `health`, there is nowhere in the returned shape
for a carried surplus to live — so the equality is a structural proof, not a spot check. When overkill
conversion is eventually designed, `deplete` is the one function that changes.

### The two end conditions — `resolveWinner`

Module-private, reading the bars `applyDamage` has already depleted Quarry-first:

| State of the bars          | `winner`          | Means                   |
| -------------------------- | ----------------- | ----------------------- |
| The Quarry's is empty      | `DuelSide.Player` | the encounter is won    |
| The player's is empty      | `DuelSide.Quarry` | the run ends            |
| Neither                    | `null`            | the encounter continues |

**There is no tie branch, and there is no constant to read.** Because `applyDamage` leaves the
player's health untouched whenever the Quarry goes down, both-bars-empty is not a state this function
can be handed — so the Quarry's row is tested first and a mutual kill resolves as a **player win**.
§9's dated ruling that the player loses the tie (2026-08-11) was overturned on 2026-08-19, and
`SIMULTANEOUS_DEPLETION_WINNER` — the constant it had been implemented as — was deleted with it.

The specs moved the same way: `__tests__/encounter.test.ts` now pins the rule directly (a Quarry
killed by an event spares the player its damage; a Quarry that survives does not; a non-finite figure
aimed at the player is still refused on the Quarry-down path), and `__tests__/config.test.ts` no
longer has a value to assert.

The comparison is `<= 0` rather than `=== 0`, deliberately. `deplete` makes zero the only reachable
floor today, so the two are equivalent right now; the inequality is what survives a future path that
does not clamp.

`isEncounterResolved(encounter)` is exported as `winner !== null` rather than left to callers, so
every reader agrees on what "resolved" means. Since DLR-82 there are three: `App.tsx` reads it to
switch from the felt to the run verdict, `run.ts`'s `outcomeFor` reads it to decide whether the run
has ended, and the reducer's `canAct` guard reads it to refuse further taps. **`RoundOverPanel` is
no longer one of them** — DLR-82 deleted its terminal branch along with the panel's `winner` prop;
a resolved encounter now renders the run verdict instead of a tally table.

### Four refusals

All four are bare `RangeError`, matching `src/hunt/config.ts`'s existing posture for a caller bug
(`quarryHealthForEncounter`):

| Refused                                       | Why not a plausible value instead                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| A non-finite or non-positive `playerHealth`   | seeding a broken bar produces a game that cannot be played and reports nothing          |
| Applying damage to a **resolved** encounter   | a silent no-op lets a caller's loop spin forever with `damageEventsApplied` frozen             |
| Non-finite damage (`NaN`, `Infinity`)         | `NaN - x` is `NaN`, `Math.max(0, NaN)` is `NaN` — a `NaN` bar renders empty and logs nothing |
| Negative damage                               | it would *heal* the side it was pointed at                                              |

An out-of-range `encounterIndex` is refused too, one level removed: `quarryHealthForEncounter`'s own
`RangeError` propagates through `startEncounter` uncaught, which is exactly the failure mode DLR-66
shipped that guard for.

**Damage is guarded finite and non-negative, but not integral.** That guard predates DLR-80, when
a ×0.5 multiplier band could legitimately produce a half-point total. **Since DLR-80 every figure
reaching it is an integer by construction** — the bank is a sum of integer ranks, the multiplier an
integer count, and there is no division anywhere in the new arithmetic — so the non-integral case is
no longer producible. The guard is kept as a backstop against a bad caller rather than a supported
configuration. No epsilon is needed anywhere: the clamp compares against exact `0`.

> **`applyDamage` throwing on a resolved encounter is a design reading, not a documented rule.** No
> design section says what happens if you fight on after a bar empties, because nothing should. The
> throw survived DLR-80, and it now matters more than it did: damage lands per trick, so the resolved
> state is reachable **mid-hand** rather than only between Hunts. `roundReducer`'s `applyResolution`
> helper therefore **guards ahead of it** — it returns the encounter unchanged if
> `isEncounterResolved` is already true, and skips the `applyDamage` call when the whole
> `incomingFrom` record is zero (an all-zero event would otherwise bump `damageEventsApplied` for
> nothing). **Since DLR-91 that record sums the Timebomb paid at this trick as well as the trick's own
> damage**, so it is the one place to look for what a resolution actually costs. Guarding rather
> than catching is deliberate: a throw escaping a reducer during an event handler unmounts the tree.
> `canAct` carries the same check, so play stops rather than queueing taps into a finished fight.

### No Hunt cap

There is **deliberately no maximum number of Hunts per encounter**, and no cap key exists to read.
§11 records the position: the stall is the evidence a cap is needed, so the game runs as many Hunts
as it takes and the cap is added only if playing proves one necessary. The spec states this as the
rule it is — a 23-Hunt encounter runs to completion without refusing, well past §9's derived
candidate range of 3–5.

### How long an encounter actually runs

> **The table below is DLR-70's, computed against a retired health regime.** It reasons from a
> 1,350-point player bar and Quarry bars in the hundreds; `PLAYER_START_HEALTH` is **10** today and
> `QUARRY_ENCOUNTER_HEALTH[0]` is **10** (PT-002). Read it for the *shape* of the distribution and for
> the `P = H` boundary argument, not for any figure in it — and note that its "both bars deplete
> simultaneously" premise no longer holds either (DLR-91). The specs that replaced it derive every
> figure from the configured totals rather than from literals.

DLR-70's spec pins the shape of the distribution with hand-computed damage constants rather than
simulated tricks — which is what turns the slowest case into 23 integer subtractions instead of 299
played tricks, and retires the ticket's own "long-running simulation" risk.

The fixture convention is the one `../war-council/__tests__/huntEnumeration.test.ts` already uses:
every captured card is **rank 6**, the exact mean of ranks 1–11 and the fixed point of the Lose
inversion, so a trick is worth 12 and `k` tricks is `12k`. Both sides read the one declared table and
the two trick counts sum to 13.

| Player tricks a Hunt | Player deals | Quarry deals | Resolves on | Player's bar at the end |
| -------------------- | ------------ | ------------ | ----------- | ----------------------- |
| 9                    | 540          | 96           | Hunt 3, won | 1062                    |
| 8                    | 480          | 180          | Hunt 3, won | 810                     |
| 7                    | 420          | 288          | Hunt 4, won | 198                     |
| 6                    | 288          | 420          | Hunt 4, **lost** | 0                  |
| 10                   | 60           | 36           | Hunt 23, won | 522                    |
| 13                   | 78           | 0            | Hunt 18, won | 1350 (untouched)        |

Two properties worth reading off it:

**The win/lose boundary sits exactly on the 6/7 line the declaration commits to** — 7 tricks a Hunt
wins on Hunt 4, 6 tricks loses on Hunt 4, an exact mirror. That is `P = H` doing its work (see
[the health constants](hand-and-skull-tunables.md)), not a coincidence of the multipliers.

**The tail is long.** Playing for the Greedy band at ×0.5 stretches an encounter to 18–23 Hunts. That
is the stall §11 is watching for, and it is now measurable rather than predicted.

> **One figure in the acceptance criteria needed a reading, and the spec pins both.** §9's "wins on
> Hunt 4 with 486 left" is the player's health **entering** Hunt 4 (`1350 − 3 × 288`). Under DLR-70's
> deplete-both rule the player was on **198** at the moment the Quarry's bar emptied, and the spec
> asserted both instants. **DLR-91's Quarry-first sequencing collapses the two into one figure**: the
> Hunt that empties the Quarry's bar no longer touches the player, so the player finishes on the 486
> they entered it with, and §9's wording is now simply correct. The distinction this note was written
> to draw is gone, and the spec no longer asserts 198.

### What this module deliberately does not do

- **Sequence anything.** One encounter, in isolation. Running them in order is
  [`run.ts`'s](run-sequence.md) (DLR-82), a separate module one level up — this file's functions are
  unchanged by it and still know nothing of a run. `ENCOUNTER_PLAYER_RESTORE` is read by neither.
- **Render anything.** No `.tsx` file and no CSS live here, and none ever will. The health bars DLR-71
  built read this module's output from `src/app/warCouncil/` — see
  [../war-council-ui/duel-health-bars.md](../war-council-ui/duel-health-bars.md).
- **Cap the Hunt count.** By choice, above.
- **Convert overkill** into cash or anything else. §9 records it Deferred; DLR-70's job was to assert
  the discard, not to design past it.
- **Distinguish `Health` from `Damage` at the type level.** Both are bare `number` aliases, so nothing
  stops a caller passing one where the other belongs. Branding them would catch it at compile time and
  would churn every existing `HuntDamage` consumer — flagged as a known soft spot, not fixed.

**`EncounterState` itself is still not persisted, and that window is currently open at zero cost.**
DLR-106 added a generic save module, [`src/persistence/`](../persistence/README.md), but nothing in
it names `EncounterState` or reads/writes through it — no field of this module's state round-trips
through `JSON.parse`/`JSON.stringify` today, so its shape can still change freely. **The first thing
that serialises it closes that window** — this note is what a later change should look for.
