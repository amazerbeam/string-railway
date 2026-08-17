Part of [Hunt](README.md).

# The run — sequencing encounters on one carried health bar

`src/hunt/run.ts` (DLR-82) is the second piece of state in this codebase that outlives a
`RoundState`, and it sits one level above the first. `encounter.ts` owns **one fight**;
`run.ts` owns **the sequence of fights** and the health carried through them. It is the module
that turned the app from "one encounter, then a dead end" into a run a player can lose.

## What a run is

```ts
export interface RunState {
  readonly encounterIndex: number // 0-based index into QUARRY_ENCOUNTER_HEALTH
  readonly encounterCount: number // QUARRY_ENCOUNTER_HEALTH.length
  readonly encounter: EncounterState
  readonly outcome: RunOutcome // 'inProgress' | 'won' | 'lost'
  readonly cheats: readonly CheatCard[] // DLR-83
  readonly nextCheatId: CheatCardId // DLR-83
  readonly coins: Coins // DLR-84
}
```

The last three fields arrived after the original four, and all three are carried across a fight
boundary by the `...run` spread `advanceRun` already had — neither ticket needed a line for the
carry. See [Cheats](cheats-and-slots.md) and [Coins and the shop](coins-and-the-shop.md).

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
| `startRun(playerHealth?)`             | Builds fight 0 at `PLAYER_START_HEALTH`, `outcome: InProgress`, **0 coins**, and the configured Cheat grant |
| `recordEncounter(run, enc, cheats)`   | Adopts the encounter a hand reported upward, **credits `COINS_PER_ENCOUNTER_WIN` on a player win**, and **re-derives the outcome** — the AC4/AC5 decision point |
| `canAdvanceRun(run)`                  | `outcome === InProgress && encounter.winner === Player` — "the Quarry is down and another fight remains" |
| `beatenCount(run)`                    | How many fights are behind the player, as one integer — `encounterIndex + (winner === Player ? 1 : 0)` (DLR-85) |
| `advanceRun(run)`                     | Opens the next fight on the carried health, or throws                                                 |
| `shopStockFor(run, maxPlayerHealth?)` | Projects the run into the four figures the shop's rules need (DLR-84)                                 |
| `buyFromShop(run, item, max?)`        | Deducts a price and mints a Cheat or heals with a clamp, or throws (DLR-84)                           |

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
the run wherever it happens — including on the final fight, and including the simultaneous-depletion
tie that `applyDamage` has already resolved to the Quarry through
`SIMULTANEOUS_DEPLETION_WINNER`. Winning the last fight is the only path to `Won`; winning any
other leaves the run `InProgress` with the next fight waiting on the player.

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
here** — DLR-82 forbids wiring it in, and the flask stories own it. A grep in that contract's final
verification confirms the constant still has no production consumer, and DLR-84's did the same.

**DLR-84's heal is not an exception to that.** It restores health *between* fights, but it does so
by writing into the resolved encounter's `health[Player]` at the moment of purchase — which is the
figure this carry then reads — rather than by adding a restore step to `advanceRun`. The carry
itself is untouched: it still takes whatever the last fight ended on, whether or not a coin was
spent on the way.

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
shop half of that answer and deliberately left the curve alone**, so whether 4 health a fight
actually closes the gap is now a question a play session can answer.

**DLR-85 widened that placeholder rather than resolving it.** The curve is now twenty-five entries
generated from three tunables instead of three literals, and the run is expected to be lost in stage
one or two — Oisín holds 86 and Diarmuid 135. The ruling is unchanged: the answer is the shop and later
stories, not a bigger starting bar.

## Purity

`run.ts` sits inside the lint-enforced `src/hunt/**` boundary and stays there: it imports only
`./config`, `./encounter`, `./types` and — since DLR-83 and DLR-84 — `./cheats` and `./shop`, every
one of them already inside the pure tree. It holds no JSX and touches no DOM global. It is unit-tested
with plain function-in/value-out assertions under the `node` Vitest project
(`src/hunt/__tests__/run.test.ts`), with no renderer — including a spec that drives a whole run to
`Won` through `advanceRun`/`recordEncounter`, and one that pins immutability by `JSON.stringify`
comparison across a transition.
