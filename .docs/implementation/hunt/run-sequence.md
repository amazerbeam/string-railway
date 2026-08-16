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
}
```

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

## The four transitions

| Function                      | Does                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `startRun(playerHealth?)`     | Builds fight 0 at `PLAYER_START_HEALTH`, `outcome: InProgress`                                        |
| `recordEncounter(run, enc)`   | Adopts the encounter a hand reported upward and **re-derives the outcome** — the AC4/AC5 decision point |
| `canAdvanceRun(run)`          | `outcome === InProgress && encounter.winner === Player` — "the Quarry is down and another fight remains" |
| `advanceRun(run)`             | Opens the next fight on the carried health, or throws                                                 |

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
verification confirms the constant still has no production consumer.

## Run length has exactly one source of truth

`QUARRY_ENCOUNTER_HEALTH` is now `[10, 14, 18]` — three entries, rising, not all equal — and
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
raising `PLAYER_START_HEALTH`**, which DLR-82 explicitly forbids as a response.

## Purity

`run.ts` sits inside the lint-enforced `src/hunt/**` boundary and stays there: it imports only
`./config`, `./encounter` and `./types`, holds no JSX, and touches no DOM global. It is unit-tested
with plain function-in/value-out assertions under the `node` Vitest project
(`src/hunt/__tests__/run.test.ts`), with no renderer — including a spec that drives a whole run to
`Won` through `advanceRun`/`recordEncounter`, and one that pins immutability by `JSON.stringify`
comparison across a transition.
