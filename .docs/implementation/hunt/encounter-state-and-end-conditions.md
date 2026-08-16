_Part of [Hunt](README.md)._

**DLR-70** built this, and it is the ticket where the duel stopped being inert configuration and
became arithmetic that resolves. `src/hunt/encounter.ts` is the first thing in the codebase holding
state that **outlives a single `RoundState`** — before it, nothing in the program remembered anything
about a finished Hunt.

It shipped with **no caller at all** — complete, tested, and reachable only from Vitest. **DLR-71
wired it up**, and **DLR-80 changed when it fires and who owns it.**

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
`types.ts` holds exactly three fields and nothing else:

```ts
export interface EncounterState {
  readonly health: Readonly<Record<DuelSide, Health>>
  readonly damageEventsApplied: number
  readonly winner: DuelSide | null
}
```

It is **immutable** — `applyDamage` returns a new one and never touches its input, which a spec asserts
directly. That is not decoration: it is what lets DLR-71 preview a Hunt by applying it to a copy
rather than writing a second projection routine that could drift from this one.

**`damageEventsApplied` is a counter, not a cap.** There is deliberately no maximum number of Hunts per
encounter — see [No Hunt cap](#no-hunt-cap) below.

**`winner` is `DuelSide | null`, not a three-value outcome union.** `null` while the encounter is
live; `Player` means the encounter is won; `Quarry` means the run ends. The shape was chosen because
`SIMULTANEOUS_DEPLETION_WINNER` is *already* typed `DuelSide` and *already* named winner — so the
tie case is a direct read of the constant rather than a translation onto a second vocabulary. A
`'won' | 'lost' | 'live'` union would read more directly at a render call site, which is DLR-71's
concern and not yet written; if it turns out awkward there, adding a derived helper is cheaper than
changing this type, and nothing serialises it.

`IncomingDamage` beside it is `Readonly<Record<DuelSide, Damage>>` — one Hunt's damage **keyed by the
side it is applied to**, never by the side that dealt it. That is `HuntOutcome.incoming`'s convention
carried deliberately across the module boundary, so the crossing is performed exactly once and on
the other side of it (see [`incomingFrom`](../war-council/bank-and-cash-out.md)).

### Starting one — `startEncounter`

`startEncounter(encounterIndex, playerHealth = PLAYER_START_HEALTH)` reads **both** bars from
DLR-66's configured totals rather than from literals: the player's from `PLAYER_START_HEALTH`, the
Quarry's from `quarryHealthForEncounter(encounterIndex)`. No `1350` and no `1600` appears anywhere in
`encounter.ts`, and DLR-70's own closing checks grep for exactly those two literals to prove it.

**`encounterIndex` selects a bar; it sequences nothing.** Running the encounters in order is
[`run.ts`'s](run-sequence.md) (DLR-82), which calls `startEncounter` once per fight and passes the
health the player carried out of the last one. Any restore between them
(`ENCOUNTER_PLAYER_RESTORE`) remains **deliberately unread** by both modules — DLR-82 forbids
wiring it in, and the flask stories own it.

`playerHealth` is a **defaulted parameter** rather than something the function closes over — the same
injectable pattern this codebase uses for every tunable — and which `assignSkulls`'s `density` and
`weights` followed (DLR-80, the latter renamed from `minRank` by PT-001) — so a spec varies it
without mutating module state.

### Applying one — `applyDamage`

`applyDamage(encounter, incoming)` is the whole transition, and three things happen in a **fixed
order**:

1. **Refuse an already-resolved encounter**, and refuse damage that is not a finite non-negative
   number (both `RangeError` — see [Four refusals](#four-refusals)).
2. **Deplete both bars.**
3. **Resolve the winner** from the depleted pair.

**Both bars are depleted before either is inspected**, and that ordering is load-bearing rather than
tidy. Inspecting after the first subtraction would end the encounter early and make the
simultaneous-depletion case **unreachable** — §9's dated tie ruling would be dead code that no test
could reach.

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

### The three end conditions — `resolveWinner`

Module-private, reading both already-depleted bars:

| State of the bars                  | `winner`                        | Means                  |
| ---------------------------------- | ------------------------------- | ---------------------- |
| Only the Quarry's is empty         | `DuelSide.Player`               | the encounter is won   |
| Only the player's is empty         | `DuelSide.Quarry`               | the run ends           |
| **Both, on the same Hunt**         | `SIMULTANEOUS_DEPLETION_WINNER` | the player loses (§5, §9) |
| Neither                            | `null`                          | the encounter continues |

**The tie reads the config constant rather than returning `DuelSide.Quarry` directly.** That keeps
§9's dated ruling (2026-08-11 — the player loses) attributable from the code, and means overturning it
is an edit to `config.ts` alone. The spec asserts the *rule* by comparing against the constant, while
`__tests__/config.test.ts` remains the single assertion of its *value* — so the two cannot drift into
agreeing about different things.

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
> `isEncounterResolved` is already true, and also if the resolution carries neither a cash-out nor a
> hit (an all-zero event would otherwise bump `damageEventsApplied` for nothing). Guarding rather
> than catching is deliberate: a throw escaping a reducer during an event handler unmounts the tree.
> `canAct` carries the same check, so play stops rather than queueing taps into a finished fight.

### No Hunt cap

There is **deliberately no maximum number of Hunts per encounter**, and no cap key exists to read.
§11 records the position: the stall is the evidence a cap is needed, so the game runs as many Hunts
as it takes and the cap is added only if playing proves one necessary. The spec states this as the
rule it is — a 23-Hunt encounter runs to completion without refusing, well past §9's derived
candidate range of 3–5.

### How long an encounter actually runs

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
> Hunt 4 with 486 left" is the player's health **entering** Hunt 4 (`1350 − 3 × 288`). Because both
> bars deplete simultaneously, the player is on **198** at the moment the Quarry's bar empties on Hunt
> 4. Both numbers are correct about different instants, and the spec asserts both — 486 after three
> applications, 198 and `winner === Player` after the fourth. If 486 was meant as the post-victory
> figure, it is `hybrid-design.md` §9's wording that wants amending, not the code. **The developer's
> to settle.**

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

**Nothing is persisted, and that window is currently open at zero cost.** There is no `localStorage`,
no `JSON.parse`/`JSON.stringify`, and no save file anywhere in `src/`, so `EncounterState`'s shape can
change freely today. **The first thing that serialises it closes that window** — this note is what a
later change should look for.
