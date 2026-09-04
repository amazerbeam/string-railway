Part of [Hunt](README.md).

# The run — sequencing encounters on one carried health bar

`src/hunt/run.ts` (DLR-82) is the second piece of state in this codebase that outlives a
`RoundState`, and it sits one level above the first. `encounter.ts` owns **one fight**;
`run.ts` owns **the sequence of fights** and the health carried through them. It is the module
that turned the app from "one encounter, then a dead end" into a run a player can lose.

**Since DLR-93 it is two files, not one** — `run.ts` holds the run's *shape*, `runTransitions.ts`
holds its *transitions*. The split has its own section at the foot of this file; everything before it
describes the run regardless of which of the two a name sits in.

## What a run is

```ts
export interface RunState {
  readonly encounterIndex: number // 0-based index into QUARRY_ENCOUNTER_HEALTH
  readonly encounterCount: number // QUARRY_ENCOUNTER_HEALTH.length
  readonly encounter: EncounterState
  readonly outcome: RunOutcome // 'inProgress' | 'won' | 'lost'
  readonly coins: Coins // DLR-84
  readonly whetstones: number // DLR-92
  readonly maxPlayerHealth: Health // DLR-158
  readonly maxHealthPurchases: number // DLR-158
  readonly flaskCharges: number // DLR-93
  readonly handOfFight: number // DLR-95
  readonly discardsRemaining: number // DLR-100
  readonly discardCapBonus: number // DLR-163 — Swaps this fight's Woodcutters added
  readonly treasureDamageBonus: number // DLR-163 — base damage this fight's Treasures earned
  readonly lastQuickKillPayout: Coins // DLR-95
  readonly buffs: readonly Buff[] // DLR-105 — every held card, activated ones included
  readonly nextBuffId: BuffId // DLR-105
  readonly runSeed: number
  readonly apCapacityBonus: number // DLR-116
  readonly slotPullsThisVisit: number
  readonly rankTiers: RankTierTable // DLR-122
  readonly lowCarry: BuffCarry // DLR-150
  readonly streak: StreakState // DLR-156
}
```

> Four fields have been **deleted** since this page was written and are worth knowing about, because
> a reader who remembers the old shape will look for them. `cheats`, `nextCheatId` and
> `timebombCharges` went on DLR-132 — a Cheat is an ordinary member of `buffs` now, carried and
> returned exactly as any other card is. `blastGuardHeld` went on DLR-166 with the mechanic it
> tracked.

Every field is carried across a fight boundary by the `...run` spread `advanceRun` already had — no
ticket needed a line for the carry. See [Coins and the shop](coins-and-the-shop.md) and
[the flask](the-flask.md).

**Some of them are handed back by a hand at the end of a fight, and some are not.** `whetstones`,
`flaskCharges` and `buffs` are not handed back as a parameter: a hand cannot spend a Whetstone or
drink the flask, and a hand's buff spend never removes anything from the pile either, so there is
nothing for `recordEncounter` to adopt — it reads all three off the run it was given.

**A field that a hand owns and a fight ends is a distinct third shape**, and it is now the most
common one. Such a field has to be run-level to survive the `advanceRun` that opens the fight, and it
has to end when that fight does — so `recordEncounter` passes it through a named `*After` rule in
`runCarry.ts` rather than adopting it verbatim. That pairing is what makes "fight-long" a duration
rather than a label. `lowCarry` and `streak` take that shape.

**DLR-163 added two more per-fight figures**, both seeded `0` by `startRun`, both reset to `0` by
`advanceRun` at the fight boundary, and **neither persisted**:

- **`discardCapBonus`** — Swaps added to *this fight's* cap by Woodcutters the player played. A
  **count of steps**, not a total: `swapCapFor(discardCapBonus)` owns the addition to
  `DISCARDS_PER_FIGHT`, so the control's readout and any future refusal cannot disagree about what
  "full" means.
- **`treasureDamageBonus`** — base damage earned *this fight* by banking tricks that carried a
  Treasure. **Summed with `baseDamageBonusFor`'s run-permanent Whetstone figure at `playOptions`,
  never merged into it**: a Whetstone is run-permanent and this dies at the fight boundary.

Both reach `recordEncounter` as optional trailing parameters, defaulted to the run's own value, so
existing call sites are unchanged.

**`lowCarry` is a `BuffCarry`** (`{ multiplierBonus, flatDamageBonus }`), seeded empty by `startRun`,
owned by the hand for its lifetime, handed back through `WarCouncilRoundResult.lowCarry`, and passed
through `lowCarryAfter`: a carry compounds hand to hand **within** a fight and is wiped at the fight
boundary, won or lost. The wipe lives there rather than in `advanceRun` precisely because a lost
fight ends the run and never reaches `advanceRun` at all. Like `coins`, it is **never persisted**.
See [The low carry](the-low-carry.md).

**It holds no separate player-health field, and that is the design decision worth knowing.** The
health a player carries is `encounter.health[DuelSide.Player]` — read out of the encounter that
just ended and handed to the next one. A `playerHealth` field sitting beside the encounter would
be a second copy of one number, and it would drift the first time one was written without the
other. Nothing reads a carried figure from anywhere else.

`encounterCount` is carried on the state rather than looked up, so a renderer showing "Fight 2 of
3" needs no `config.ts` import — which is what keeps `src/app/run/` from reaching into
configuration for a display string.

`RunOutcome.InProgress` deliberately covers **two** player-visible situations: the fight is still
being played, and the fight is won with the next one waiting. The difference is
`encounter.winner`, read through `canAdvanceRun` — not a fourth outcome. One statement of "the run
is over" is what stops a screen and a transition disagreeing about it.

## The transitions

| Function                              | Does                                                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `startRun(playerHealth?, grants?, runSeed?)` | Builds fight 0 at `PLAYER_START_HEALTH`, `outcome: InProgress`, **0 coins**, and the configured Cheat grant. **Since DLR-158 the same `playerHealth` argument also seeds `maxPlayerHealth`, the run's live ceiling** |
| `recordEncounter(run, enc, discardsRemaining, unplayedCards, …)` | Adopts the encounter a hand reported upward, **credits `COINS_PER_ENCOUNTER_WIN` on a player win**, **refills the flask through `flaskAfter` if the opponent just beaten was a stage boss** (DLR-93), and **re-derives the outcome** — the AC4/AC5 decision point. Everything after `unplayedCards` is an optional, defaulted figure a hand may hand back: `buffCoinsEarned`, `buffs`, `lowCarry`, `streak`, `discardCapBonus`, `treasureDamageBonus`. `lowCarry` and `streak` go through their `*After` rules, not straight onto the run |
| `canAdvanceRun(run)`                  | `outcome === InProgress && encounter.winner === Player` — "the Quarry is down and another fight remains" |
| `beatenCount(run)`                    | How many fights are behind the player, as one integer — `encounterIndex + (winner === Player ? 1 : 0)` (DLR-85) |
| `advanceRun(run)`                     | Opens the next fight on the carried health, or throws                                                 |
| `shopStockFor(run)`                   | Projects the run into the figures the shop's rules need (DLR-84). **DLR-158 deleted the `maxPlayerHealth` parameter** — the ceiling and the purchase count are read off the run   |
| `buyFromShop(run, item)`              | Deducts a price and acts by item, healing through the shared `healedBy` clamp, or throws (DLR-84). **DLR-158 deleted the `maxPlayerHealth` parameter and added the `MaxHealth` arm** |
| `flaskStockFor(run)`                  | Projects the run into the three figures the flask's rules need — `shopStockFor`'s sibling (DLR-93). **DLR-158 deleted the `maxPlayerHealth` parameter** |
| `drinkFlask(run)`                     | Spends one flask charge and restores through the same `healedBy` clamp, or throws — twice over (DLR-93). **DLR-158 deleted the `maxPlayerHealth` parameter** |
| `baseDamageBonusFor(run)`             | `run.whetstones` — the one statement of "+1 to a banked trick's base damage per copy owned" (DLR-92, renamed DLR-156) |

**`recordEncounter` is the run's single payout point as well as its single outcome point**, and for
the same reason: it is already the one place a fight is known to have been won, and the driver stops
feeding it hands once an encounter resolves, so the credit lands exactly once by construction. The
two alternatives both fail — crediting in the driver puts a rule in a component, and crediting in
`advanceRun` never pays for the final fight of a won run. See
[Coins and the shop](coins-and-the-shop.md).

`startRun` takes `playerHealth` as a **defaulted parameter** rather than closing over the
constant, matching `startEncounter`'s own injectable pattern — a spec varies it without mutating
module state. It has no guard of its own: `startEncounter` already refuses a non-positive or
non-finite value, and `startRun` lets that `RangeError` surface rather than catching it, so a
mis-configured curve fails loudly at startup instead of rendering an empty bar.

### Where the run's end is decided

One private function, and it is the whole of AC4 and AC5:

```ts
function outcomeFor(encounterIndex, encounterCount, encounter): RunOutcome {
  if (!isEncounterResolved(encounter)) return RunOutcome.InProgress
  if (encounter.winner === DuelSide.Quarry) return RunOutcome.Lost
  return encounterIndex === encounterCount - 1 ? RunOutcome.Won : RunOutcome.InProgress
}
```

**The Quarry check comes before the last-fight check, deliberately.** The player going down ends
the run wherever it happens, including on the final fight. Winning the last fight is the only path to
`Won`; winning any other leaves the run `InProgress` with the next fight waiting on the player.

**There is no longer a simultaneous case for this function to inherit.** DLR-70 through DLR-90 relied on
`applyDamage` having already resolved a mutual kill to the Quarry through
`SIMULTANEOUS_DEPLETION_WINNER`; DLR-91 deleted that constant and made `applyDamage` spare the player
whenever the Quarry goes down, so a mutual kill arrives here as a **player win** and this ordering
simply never sees the case. See
[the encounter state and the end conditions](encounter-state-and-end-conditions.md).

### Both refusals throw rather than returning the run unchanged

`advanceRun` on a run that cannot advance, and `recordEncounter` onto a run that has already
ended, both throw a `RangeError` naming the index and the outcome. Returning the run as-is would
present a stuck screen as a success and leave nothing in the console to find it by — the same
reasoning `applyDamage` and `quarryHealthForEncounter` already use. `recordEncounter`'s refusal
exists because recording onto a finished run would silently resurrect it, and there is no
legitimate caller: the driver stops handing hands to a finished run.

## The carry is nearly free, and that is not an accident

`startEncounter(encounterIndex, playerHealth)` has taken player health as an injectable parameter
since DLR-70, and until DLR-82 it had **never had a second caller** — every production call passed
the default. `advanceRun` is that second caller:

```ts
encounter: startEncounter(encounterIndex, run.encounter.health[DuelSide.Player])
```

Nothing is restored on the way through. `ENCOUNTER_PLAYER_RESTORE` is **deliberately not read
here** — DLR-82 forbade wiring it in until the flask was designed. **The flask has since been designed
and built (DLR-93), and the constant is still read by nothing**: the two are different mechanics, an
automatic restore being something the game does to you and the flask something you choose to spend.
A grep in DLR-82's, DLR-84's and DLR-93's final verifications each confirmed the constant has no
production consumer.

**Neither DLR-84's paid heal nor DLR-93's flask is an exception to that.** Both restore health
*between* fights, and both do it by writing into the resolved encounter's `health[Player]` — the
figure this carry then reads — rather than by adding a restore step to `advanceRun`. Since DLR-93 they
share one private writer, `healedBy`, so the clamp and the discarded overheal are stated once for both
(see [the flask](the-flask.md)). The carry itself is untouched: it still takes whatever the last fight
ended on, whether or not a coin was spent or a charge drunk on the way.

## Run length has exactly one source of truth

**Since DLR-85 that source is `RUN_ENCOUNTERS`, and it holds twenty-five entries.**
`QUARRY_ENCOUNTER_HEALTH` is a projection of it (`RUN_ENCOUNTERS.map((e) => e.health)`) and
`ENCOUNTERS_PER_RUN` is still that array's length — so the chain is
`RUN_ENCOUNTERS.length → QUARRY_ENCOUNTER_HEALTH.length → ENCOUNTERS_PER_RUN`, one fact stated once and
projected twice. The run is **four ordinary opponents then a stage boss, five times over**, closing on
Diarmuid. See [the roster and the derived path](run-path-and-the-roster.md).

Nothing in `run.ts` changed for that. `startRun` reads `QUARRY_ENCOUNTER_HEALTH.length` exactly as it
did, and every length-coupled spec in `run.test.ts` was already written relative to
`encounterCount` rather than to a literal `3` — the loop at `run.test.ts:78` now iterates twenty-four
times instead of two and passes unchanged. **Zero test edits were required by the length increase**,
which is what made shipping the full run nearly free.

The history below is DLR-82's and still worth knowing, because it is why the derivation exists at all.

`QUARRY_ENCOUNTER_HEALTH` was `[10, 14, 18]` — three entries, rising, not all equal — and
`ENCOUNTERS_PER_RUN` was redefined as `QUARRY_ENCOUNTER_HEALTH.length` rather than remaining a
free-standing `5`.

That `5` had sat beside a one-entry array. Any code that had trusted it would have thrown a
`RangeError` out of `quarryHealthForEncounter(1)` on the second fight — a second source of truth
for one fact, waiting to disagree. Deriving it keeps the name the epic references without the
drift. TypeScript widens the inferred type from the literal `5` to `number`; no consumer depended
on the literal, because there were no consumers at all.

**The three values are a documented placeholder, not a decision.** The shape is the ticket's (AC1
requires at least three entries, rising, not all the same); the numbers are the developer's. The
contract's own risk note predicts the player losing around fight three at these numbers and states
that this is the arithmetic working — the answer is the shop and the flask in later stories, **not
raising `PLAYER_START_HEALTH`**, which DLR-82 explicitly forbids as a response. **DLR-84 built the
shop half of that answer and DLR-93 the flask half, and both deliberately left the curve alone**, so
whether 4 health a fight plus a free 6 per stage boss actually closes the gap is now a question a play
session can answer. Nothing was retuned in response to either.

**DLR-85 widened that placeholder rather than resolving it.** The curve is now twenty-five entries
generated from three tunables instead of three literals, and the run is expected to be lost in stage
one or two — Oisín holds 86 and Diarmuid 135. The ruling is unchanged: the answer is the shop and later
stories, not a bigger starting bar.

### DLR-91 deleted a transition rather than adding one

`beginNextHand` used to sit in the table above — DLR-90's payment point for a queued Timebomb hit,
and the only total, throw-free transition in this module. **DLR-91 deleted it** when the payment
moved to the resolution of the next trick, one layer up in `roundReducer.ts`. (DLR-166 has since
removed the whole delayed-hit mechanic: **all damage lands at the trick that caused it.**) The
consequence worth knowing outlived both: `recordEncounter` is the **only** transition here that
adopts a hand's end state, which is why each carry rule is a named function rather than an inline
ternary.

## The split into `run.ts` and `runTransitions.ts` — DLR-93

**This was a mid-run remediation, not a planned refactor.** DLR-93's plan predicted `run.ts` growing
from 299 lines to roughly 360 and named the contingency in writing: *"if a later flask story pushes it
over, the split is `run.ts` → a run-transitions module, not a suppression."* It went over inside the
same contract. The developer approved the split, it ran as its own Phase 2.5, and the result is the
two files on disk today.

| File                 | Holds                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `run.ts`             | The run's **shape** and its projections — `RunState`, `RunOutcome`, `startRun`, `canAdvanceRun`, `beatenCount`, `shopStockFor`, `flaskStockFor`, `baseDamageBonusFor` |
| `runTransitions.ts`  | The run's **transitions** — `recordEncounter`, `advanceRun`, `buyFromShop`, `drinkFlask`, `pullSlotMachine`, and the private helpers only they use: `outcomeFor`, `healedBy`, `fullyHealed` |
| `runCarry.ts`        | **DLR-158.** The fight-boundary **carry** helpers — `lowCarryAfter`, `streakAfter`, `handOfFightAfter`, `flaskAfter` — answering one question, "what survives the end of a fight". `guardAfter` sits with them, still exported, with **no caller** since DLR-166 removed the Blast Guard it cleared |

The line drawn is **a function that produces a new `RunState` versus one that only reads an existing
one.** `canAdvanceRun` and `beatenCount` stayed with the shape despite being logic, because they answer
questions about a run rather than advancing it.

> **`runCarry.ts` is a second split of the same kind, DLR-158.** `runTransitions.ts` reached 396
> lines against the same 400-line budget, and the max-health branch plus its helper would have
> breached it. The five carry helpers are a coherent group answering one question, so they moved
> before any feature work, in their own phase. **Also a pure move**, with one narrowing:
> `handOfFightAfter` and `flaskAfter` take the figures they read rather than the whole `RunState`,
> so `runCarry.ts` does not import `run.ts` and no new cycle is created. `healedBy` deliberately
> stayed in `runTransitions.ts` — it is the health writer two transitions there call, and DLR-158's
> `fullyHealed` belongs beside it.

**It was a pure move.** No expression, name or signature differs from what `run.ts` held before, and
no test was edited: `run.ts` re-exports all four transitions on its last line, so every existing
importer — `src/hunt/index.ts`, the `run.*.test.ts` specs, `src/App.tsx` through the barrel — kept
working untouched.

### The circular import is real, inert, and was verified rather than assumed

`run.ts` re-exports from `./runTransitions`, and `runTransitions.ts` imports `RunState`,
`RunOutcome`, `canAdvanceRun`, `shopStockFor` and `flaskStockFor` back from `./run`. That is a genuine
cycle in the module graph.

**It is sound because nothing crosses it at module-evaluation time.** Every one of those names is
either a type (erased entirely) or read **inside a function body**, which does not run until a
transition is called — by which point both modules are fully evaluated. There is no module-level
`const` in either file initialised from the other. Two reviewers checked this independently on the
final round; the failure it would otherwise produce is a `TDZ`/`undefined` at import time, which is
loud rather than silent.

**The rule this creates for future edits:** a top-level expression in `runTransitions.ts` that reads
anything from `./run` — a derived constant, a frozen lookup table built at load — turns an inert cycle
into a crash. Keep the cross-module reads inside function bodies.

## Purity

`run.ts` sits inside the lint-enforced `src/hunt/**` boundary and stays there: it imports only
`./config`, `./encounter`, `./types` and — since DLR-83 and DLR-84 — `./cheats` and `./shop`, every
one of them already inside the pure tree. `runTransitions.ts` is inside the same boundary and adds
`./flask` (DLR-93) to that list. It holds no JSX and touches no DOM global. It is unit-tested
with plain function-in/value-out assertions under the `node` Vitest project
(`src/hunt/__tests__/run.test.ts`), with no renderer — including a spec that drives a whole run to
`Won` through `advanceRun`/`recordEncounter`, and one that pins immutability by `JSON.stringify`
comparison across a transition. Where a mechanic's specs would push `run.test.ts` past its length
budget they live in their own file beside it — `run.flask.test.ts`, `run.quickKill.test.ts`,
`run.lowCarry.test.ts` and the rest.
