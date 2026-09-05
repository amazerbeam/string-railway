Part of [Hunt](README.md).

# The roster, the configured run sequence, and the derived path

DLR-85 changed where the run's shape is stated. Before it, the run was a **health array**:
`QUARRY_ENCOUNTER_HEALTH = [10, 14, 18]`, three numbers and nothing else, with `ENCOUNTERS_PER_RUN`
derived from its length. Opponents had no names, and there was nothing to draw a map from.

After it, the run is a **sequence of described encounters** — `RUN_ENCOUNTERS` — and the health array
is a projection of that sequence. Everything a screen needs to draw the whole run is now reachable
from one export, and `src/hunt/runPath.ts` turns it into stages of tagged nodes without any component
doing arithmetic.

## `RUN_ENCOUNTERS` is the source; `QUARRY_ENCOUNTER_HEALTH` is a projection of it

```ts
export interface RunEncounterConfig {
  readonly name: string
  readonly kind: OpponentKind // 'ordinary' | 'boss'
  readonly health: Health
}

export const RUN_ENCOUNTERS: readonly RunEncounterConfig[] = buildRunEncounters()
export const QUARRY_ENCOUNTER_HEALTH: readonly Health[] = RUN_ENCOUNTERS.map((e) => e.health)
```

This is the ticket's load-bearing decision, and the reason it was cheap. `QUARRY_ENCOUNTER_HEALTH`
kept its **name** and its **`readonly Health[]` type**, so all twenty-eight of its existing
references — `startEncounter`, `startRun`'s `encounterCount`, three spec files, a CSS comment —
compile and pass untouched. What changed underneath them is its length (3 → 25) and its values. The
run's shape and the run's health are now provably the same fact rather than two facts that happen to
agree.

The rejected alternative was a second array of names sitting beside the health array. It was rejected
for the reason `config.ts` already gives about `ENCOUNTERS_PER_RUN`: two arrays that must stay the
same length is the source that drifts, and here the drift would have been **silent in the worst
direction** — a twenty-sixth name beside twenty-five healths renders a twenty-sixth node on the map
for a fight that throws `RangeError` out of `quarryHealthForEncounter` the moment the player reaches
it.

> **The one real trap this creates: declaration order.** `QUARRY_ENCOUNTER_HEALTH` reads
> `RUN_ENCOUNTERS` at **module-evaluation time**, and module-level `const` initialisation runs in
> declaration order. Move `RUN_ENCOUNTERS` below the projection and it evaluates as `undefined`, and
> `.map` throws at import — which means the app fails to load rather than mis-rendering. `config.ts`
> carries a comment saying so on both declarations. There is no lint rule for this; the full suite
> catches it immediately, because every spec imports the module.

### One range guard, in one place

`runEncounterAt(index)` is now **the** guard, and `quarryHealthForEncounter`'s body is
`runEncounterAt(index).health`. Its signature, its behaviour and its `RangeError` message shape are
unchanged, so no caller of the older function changed. The guard exists once instead of twice, for
the reason `config.ts` already stated: an out-of-range index returned as `undefined` becomes `NaN` on
the first subtraction and vanishes from a health bar with nothing logged anywhere.

## The health curve is generated from three tunables, not written out

The run is twenty-five fights, and twenty-five hand-written health figures would have been
twenty-five tuning decisions nobody had made. So the **shape** is in code and the **numbers** are
three keys:

| Key                     | Value | Unit                              |
| ----------------------- | ----- | --------------------------------- |
| `ORDINARY_HEALTH_BASE`  | `10`  | health points                     |
| `ORDINARY_HEALTH_STEP`  | `4`   | health points per ordinary step   |
| `BOSS_HEALTH_MULTIPLIER`| `1.5` | unitless multiplier               |
| `ORDINARY_PER_STAGE`    | `4`   | ordinary opponents per stage      |

`buildRunEncounters` walks `STAGE_BOSS_NAMES`, emitting `ORDINARY_PER_STAGE` ordinary opponents from
`ORDINARY_OPPONENT_NAMES` before each boss, and **stops when either name list runs out** — so the two
rosters are the run's length ceiling and no index can go out of range. An ordinary opponent's health
is `BASE + STEP × (ordinary opponents before it)`; a boss's is that same running figure times the
multiplier, `Math.round`ed so no fractional health can reach a heart row that draws whole hearts.

**`BASE` and `STEP` are reverse-engineered from the curve that already shipped**, not chosen: at
indices 0–2 the formula reproduces `10, 14, 18` exactly, so PT-002's measured entry-0 figure and
DLR-82's curve survive the change untouched. A spec pins that
(`config.test.ts` → "preserves DLR-82's measured opening curve"). `BOSS_HEALTH_MULTIPLIER` is the
only genuinely new number in the ticket.

The curve it produces:

| #  | Opponent    | Kind     | Health | #  | Opponent    | Kind     | Health |
| -- | ----------- | -------- | ------ | -- | ----------- | -------- | ------ |
| 0  | Aoife       | ordinary | 10     | 13 | Pádraig     | ordinary | 54     |
| 1  | Cillian     | ordinary | 14     | 14 | Conchobhar  | **boss** | **87** |
| 2  | Niamh       | ordinary | 18     | 15 | Bríd        | ordinary | 58     |
| 3  | Eoin        | ordinary | 22     | 16 | Lorcán      | ordinary | 62     |
| 4  | Bréanainn   | **boss** | **39** | 17 | Clodagh     | ordinary | 66     |
| 5  | Saoirse     | ordinary | 26     | 18 | Tadhg       | ordinary | 70     |
| 6  | Rónán       | ordinary | 30     | 19 | Gráinne     | **boss** | **111**|
| 7  | Maeve       | ordinary | 34     | 20 | Róisín      | ordinary | 74     |
| 8  | Fergus      | ordinary | 38     | 21 | Cormac      | ordinary | 78     |
| 9  | Muireann    | **boss** | **63** | 22 | Aisling     | ordinary | 82     |
| 10 | Órla        | ordinary | 42     | 23 | Oisín       | ordinary | 86     |
| 11 | Declan      | ordinary | 46     | 24 | **Diarmuid**| **boss** | **135**|
| 12 | Sinéad      | ordinary | 50     |    |             |          |        |

> **Diarmuid holds 135, not the 129 DLR-85's plan predicted.** The plan's risk note multiplied the
> *last ordinary's* 86; the builder multiplies the **next step's** 90, because `ordinariesUsed` has
> already advanced past the stage's four ordinaries by the time the boss is pushed. The shipped figure
> is 135 and the arithmetic is deliberate — the boss sits one step beyond the last opponent of its
> stage, not level with it. Recorded here because the plan's number is the one a reader is likely to
> have seen.

**The run is not expected to be winnable on these values, and that is not a defect.** The player
starts on 10 health, earns 1 coin a fight, and can buy 4 health for a coin. DLR-82 already recorded
the ruling that the answer to a run you lose is the shop and later stories, **not** raising
`PLAYER_START_HEALTH`. `YOU WIN` is therefore effectively unreachable in play; checking that screen's
copy needs the run temporarily shortened.

`RUN_ENCOUNTERS` stays a **plain array**, so replacing the builder with twenty-five explicit literals
later is a local edit with no consumer change at all.

## The two rosters

```ts
export const ORDINARY_OPPONENT_NAMES = ['Aoife', 'Cillian', …, 'Oisín'] as const // twenty
export const STAGE_BOSS_NAMES = ['Bréanainn', 'Muireann', 'Conchobhar', 'Gráinne', 'Diarmuid'] as const
```

Both are `as const`, so an index read is a string literal rather than a possibly-`undefined` element.
Fadas are ordinary Unicode and need **no** special handling — no escaping, no transliteration layer,
and none was built.

These names replace the deck-rank framing (Swan, Fox, Woodcutter, Witch, Monarch) for every
**run-level** surface. They do not replace it on the fight screen: `QUARRY_CHARACTERS` and
`QuarryCharacter` are untouched, so `QuarryDossier` still names "The Monarch" and the health bar still
reads "The Quarry's health". **Two rosters therefore coexist deliberately** — see the README's
Deferred section, where the follow-on is recorded.

## `runPath` — stages derived from where the bosses sit

`src/hunt/runPath.ts` is a new pure module and the answer to the ticket's sharpest constraint: the
path must render three ticks and no boss just as happily as it renders five stages, so **no stage
count and no opponents-per-stage figure appears in it at all**.

```ts
export function runPath(
  beatenCount: number,
  encounters: readonly RunEncounterConfig[] = RUN_ENCOUNTERS,
): readonly PathStage[]
```

One pass over the encounter list. Each entry becomes a `PathNode` carrying its index (0-based, stable,
and therefore the React key), its name, its kind and its status; a `PathStage` closes **every time
the pass walks over a `Boss`**, and any trailing group of ordinary opponents with no boss after it
forms a final stage with `closedByBoss: false`.

That is the whole of the derivation. Fed the shipped twenty-five it returns five stages, all
boss-closed. Fed three ordinary opponents it returns one stage of three nodes, `closedByBoss: false`.
`ORDINARY_PER_STAGE` reshapes the run **without this module reading it** — the stage structure follows
from boss position, so changing the tunable changes the map with no change here.

The flat three-opponent case lives as a **unit test** rather than as the shipped configuration
(`runPath.test.ts` → "groups a flat run of ordinary opponents into ONE stage with no boss"). That is
the stronger of the two available proofs: the shipped config demonstrates twenty-five works while the
test demonstrates three does, where shipping three would only ever have proved the second.

### Status tagging collapses to one integer

```ts
status: index < beatenCount ? Beaten : index === beatenCount ? Current : Upcoming
```

There is **at most one `Current` node**, and a fully beaten run has none — which is why a consumer
reads `node.status` rather than comparing indices itself.

### `beatenCount` is where the off-by-one lives

```ts
export function beatenCount(run: RunState): number {
  return run.encounterIndex + (run.encounter.winner === DuelSide.Player ? 1 : 0)
}
```

Exported from `run.ts` beside `canAdvanceRun` and for the same stated reason: the screen drawing the
path and the transition advancing the run must not each do their own arithmetic.

**`encounterIndex` alone is wrong**, and this is the subtlety the function exists to hide. A
won-but-not-yet-advanced run sits at index *n* with `encounter.winner === Player` — `recordEncounter`
does not advance the index — so without the `+ 1` the map would mark the opponent you just beat as the
one you are about to fight. One statement, one spec, one reader.

On a **won** run the value equals `encounterCount`, which is exactly the top of `runPath`'s accepted
range: `beatenCount > length` throws, `=== length` does not. So the map of a completed run renders
every node `Beaten` and no node `Current`, rather than throwing.

### Three guards, all throwing

| Condition                                              | Result       |
| ------------------------------------------------------ | ------------ |
| `encounters.length === 0`                              | `RangeError` |
| `beatenCount` not an integer (incl. `NaN`)             | `RangeError` |
| `beatenCount < 0` or `> encounters.length`             | `RangeError` |

All three are caller or configuration bugs, and all three throw rather than returning a
plausible-looking value — an empty path in particular would render **nothing at all** and log nothing
at all, which is the failure mode that survives longest. Every reachable state is guarded upstream
instead: the verdict's forward controls only render when `canContinue`, and `nextName` is `undefined`
precisely when there is no next fight.

## Purity and cost

`runPath.ts` imports only `./config` and holds no JSX, no DOM global and no `Math.random` — it sits
inside the lint-enforced `src/hunt/**` boundary (`eslint.config.js`'s existing
`no-restricted-imports` / `no-restricted-globals` block covers it with no config change) and DLR-85's
final verification re-grepped the tree for zero React/DOM hits. There is **no division anywhere in
it**, so there is no divisor to guard and no route for a `NaN` to reach a rendered value; every
comparison is between integers, so no epsilon is needed.

It is one O(n) pass with no nested scan, called on a phase change — a click, never a pointer-move or a
frame. At n = 25 that is twenty-five node objects and five stage objects per map render, well inside
the budget for a click-driven surface, so **nothing is memoised**: `react-frontend` forbids `useMemo`
without profiling evidence and there is none.

It is unit-tested with plain function-in/value-out assertions under the `node` Vitest project
(`src/hunt/__tests__/runPath.test.ts`, 13 specs) with no renderer — stage derivation at both run
shapes, boss-first, boss-last, the trailing unclosed group, the default parameter, status tagging
across fresh / partial / fully-beaten runs, field carry-through, and all three guards.
