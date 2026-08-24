# Headless run simulator — `src/sim/`

**Status:** implemented
**Built by:** DLR-130

## Responsibility

Plays complete hands and complete runs of the game **without a browser**, by calling the shipped
engine and the shipped felt reducer directly, and reports what happened as measurable numbers. It
exists so the game's tuning can be *measured* rather than reasoned about on paper — every AP cost,
per-hand cap and price in the V5 buff work was chosen without ever being played.

It is separate from its neighbours because it **decides nothing about the game**. `src/hunt/` and
`src/warCouncil/` own the rules; `src/app/warCouncil/` owns how a hand is played out; this module
owns only *who is at the controls* and *what gets counted*. It is a consumer of all three and is
imported by none of them.

## Key types & exports

| Export                                                                     | Purpose                                                                                  | File                |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------- |
| `SimPolicy`                                                                | The simulated player: four pure decision points the driver asks and never trusts blindly | `types.ts`          |
| `CardChoice`                                                               | A card plus its Fox/Woodcutter ability choice — `CpuMove`'s shape, so `chooseCpuMove` satisfies it | `types.ts`  |
| `ShopAction`                                                               | One between-fights action a policy wants: `buy` / `pull` / `flask`                       | `types.ts`          |
| `HandReport` / `RunReport` / `SimSummary` / `SimOptions`                   | What one hand, one run and one batch measured                                            | `types.ts`          |
| `RunEnding`                                                                | `Won` / `Lost` / `Stalled` — `Stalled` is a driver bug, deliberately not a game outcome  | `types.ts`          |
| `baselinePolicy`, `POLICIES`, `BASELINE_CASH_AT_MULTIPLIER`                | The one shipped player, the name registry `--policy` resolves against, and its one knob  | `baselinePolicy.ts` |
| `playHand`, `HandOutcome`                                                  | Drives one hand through `roundReducer` and returns the felt's own `WarCouncilRoundResult` | `playHand.ts`       |
| `playRun`                                                                  | Drives one whole run: hands, `recordEncounter`, the shop visit, `advanceRun`             | `playRun.ts`        |
| `simulate`                                                                 | The batch loop over N seeded runs                                                        | `simulate.ts`       |
| `formatSummary`                                                            | Turns a `SimSummary` into the printed report — returns a string, prints nothing          | `report.ts`         |
| `fixtureRunAfterFirstFight`, `fixtureHandWithPrimedTimebomb`, `fixtureHandWithStackedBuffs` | Deterministic deep states for component specs                           | `fixtures.ts`       |
| `MAX_ACTIONS_PER_HAND`, `MAX_HANDS_PER_FIGHT`, `MAX_SHOP_ACTIONS_PER_VISIT` | The three caps that make the process terminate                                          | `simConfig.ts`      |

The command-line entry is **`scripts/sim.ts`**, deliberately outside `src/`: it is the only file
that touches `process`, and `src/` is typed with `types: ["vite/client"]` and no `@types/node`.
`tsconfig.scripts.json` covers it.

## How it works

### Running it

```
npm run sim -- --runs 200 --seed 7 --policy baseline
```

Defaults are `--runs 200`, `--seed 1`, `--policy baseline`. The script `vite build --ssr`s
`scripts/sim.ts` into `dist-ssr/` and runs the result under node — there is **no TypeScript loader
dependency**, because node's native type-stripping cannot resolve this repo's extensionless
imports and `tsx` / `vite-node` would each be a new dependency. It always terminates.

`parseArgs` rejects an unknown flag, a missing value, a non-integer or non-finite `--seed`, and a
`--runs` below 1, exiting 1 and naming the bad argument. The `--seed` guard is not cosmetic:
`createSeededRng` (`src/hunt/seededRng.ts`) documents that `NaN` and `Infinity` both collapse onto
seed `0`'s sequence, so a silently accepted bad seed would make two "different" seeds produce
identical runs — the one failure a determinism tool must not have. An unknown `--policy` likewise
exits 1 naming the known policies rather than falling back to the baseline, because a silent
fallback would attribute one policy's numbers to another.

### The three loops

`simulate` (`simulate.ts`) maps each run index to `playRun(mixSeed(baseSeed, runIndex), policy)`.
`playRun` (`playRun.ts`) is a headless transcription of `App.tsx`'s `handleComplete` /
`leaveForNextFight`: play a hand, `recordEncounter`, then either carry `closeHand`'s deck into the
next hand of the same fight, or run the shop visit and `advanceRun`. `playHand` (`playHand.ts`)
drives one hand.

Nothing here re-implements a rule. `applyResolution`'s four-step damage/Timebomb/payout fold and
`handleTapBuff`'s activation-plus-consumable-spend live in `src/app/warCouncil/`, so the driver
**dispatches actions at the real reducer** rather than calling `playCard` directly — a driver that
skipped them would measure a game nobody plays. That is why this module imports `src/app/warCouncil/`
even though it is otherwise pure: those files are React-free TypeScript despite their folder, and
the coupling runs one way only.

### How a hand is driven

`playHand` builds the felt's seed through a single helper, `seedFor(run, dealt)`, carrying every
field `App.tsx`'s mount passes (`bankClimbBonusFor`, `playerRankTiersFor`, `apCapacityFor`, the
run's coins, cheats, charges, discards and buff pile). One helper rather than an inline literal per
call site: 44 places in `src/` build a seed of this shape, and a divergent 45th is how a field gets
forgotten.

It then loops, picking exactly **one** action per iteration in a fixed priority order read off
`roundReducer.ts`'s own guards: a `cpuFault` aborts; a resolved encounter or a complete round ends
the hand; a held trick reveal dispatches `CarryOn`; an open ability prompt dispatches
`ChooseAbility`; a between-tricks window (`discardWindowOpen`, run once per `tricksPlayed`) offers
the policy its buff activations and its Apply Damage press; `canAct` plays a card as two `TapCard`
dispatches — arm, then commit, the real two-tap interaction; a Quarry-to-lead gap dispatches
`CarryOn`; and anything else breaks as `stalled`. At the end it assembles the same
`WarCouncilRoundResult` `WarCouncilRound.tsx`'s `handleCarryOn` reports upward.

### The policy seam, and why every number depends on it

`SimPolicy` has four methods — `chooseCard`, `wantsApplyDamage`, `chooseBuffs`, `nextShopAction` —
each pure, each returning a decision. The driver treats every answer as **advisory**: it re-asks
the engine's own refusal predicate (`applyDamageRefusalFor`, `loadoutRefusalFor`, `refusalFor`,
`slotPullRefusalFor`, `flaskRefusalFor`) before dispatching and silently skips a refused action. A
policy therefore cannot make the driver throw, so a carelessly written future policy cannot crash a
measurement batch.

`baselinePolicy` (`baselinePolicy.ts`) is the one shipped implementation and its module docblock
states its behaviour in full — read that file before reading any number this tool prints. In brief:
cards come from `chooseCpuMove` seated on the player's side (the engine's own opponent heuristic);
buffs are activated cheapest-AP-first at every between-tricks window while the pool would still
cover `APPLY_DAMAGE_AP_COST`; Apply Damage is pressed when the multiplier reaches
`BASELINE_CASH_AT_MULTIPLIER` (3) or on the hand's last window with a non-empty bank; it never
discards, marks a Timebomb or arms a Cheat, because none of the three is on `SHOP_ITEMS`' shelf;
and at the shop it takes the free pulls, then buys Heal → AP capacity → Swan tier → Witch tier
while affordable, then drinks the flask.

`BASELINE_CASH_AT_MULTIPLIER` is a **policy** parameter, not a game tunable — it deliberately does
not live in `src/hunt/config.ts`, and it is the single knob with the most leverage over the printed
damage figures.

### What it prints

`formatSummary` groups the batch into outcomes (won / lost / stalled and the win rate), fights
reached and won, hands per encounter, damage distribution per hand to each side (mean, median, p90,
max), the economy (coins earned and spent, slot pulls, buffs owned at the end), buff and AP usage
per hand, and faults. Every division guards its divisor and prints `n/a` on an empty sample rather
than emitting `NaN`; percentiles read a sorted array by index and never interpolate.

`Stalled` is reported separately from `Lost` throughout, so a driver bug can never be read as a
balance finding.

### The fixtures

`fixtures.ts` reuses the drivers to reach states browser QA has never been able to reach, because
coins only arrive once a fight is finished: `fixtureRunAfterFirstFight` (a `RunState` holding real
coins, a health delta and a quick-kill payout), `fixtureHandWithPrimedTimebomb` (a card marked and
the detonation booked on `encounter.pendingTimebomb`), and `fixtureHandWithStackedBuffs` (two or
more buffs activated in one trick). Each is deterministic and returns the same value every call, so
a `.test.tsx` component spec can import one and assert what that state *renders*.

`fixtureHandWithPrimedTimebomb` buys its charge through `buyFromShop(run, ShopItem.Timebomb)`
directly. That is legitimate rather than a back door: `buyFromShop` is total over `ShopItem` and
still prices Timebomb — DLR-116 pared it off the `SHOP_ITEMS` shelf, not out of the game.

## Rules & invariants enforced

- **Purity.** `src/sim/**` was added to `eslint.config.js`'s pure-core override alongside
  `src/warCouncil/**`, `src/hunt/**` and `src/vault/**` — no React import, no DOM global. It was
  added to the *later* block's `ignores` list in the same change, because ESLint flat config
  **replaces, never merges** same-key rule options: without that entry the narrower storage-only
  list would silently overwrite the full DOM ban with `npm run lint` still exiting 0. That exact
  regression shipped once, on DLR-106.
- **Determinism.** No `Math.random()` anywhere in `src/sim/**` or `scripts/`. Every seed is folded
  by an existing helper — `mixSeed` for the run, `dealSeedFor` (via `dealHand`) for the deal,
  `slotSeedFor` / `spinSeedFor` for the strip and the spin. `chooseBuffs`' sort tiebreaks on
  `buff.id`, which is monotonic and never reused, so the ordering is total.
- **Termination.** Every loop is bounded by one of `simConfig.ts`'s three caps, and hitting one is
  reported as `stalled` rather than absorbed. The run-level loop is structurally finite because
  `RunOutcome` leaves `InProgress` after a fixed encounter count or any loss.
- **Refusal before commit.** Every engine call that throws by design on a refused action is
  preceded by its matching refusal predicate. Nothing in this module catches an exception to return
  a success shape.
- **No game state is written.** The module reads configuration and calls transitions; it changes no
  rule, no tuning value and no persisted data. It never imports `src/vault/vaultStore.ts`, so it
  cannot reach the persistence tree even transitively — a simulated run plays with an empty Vault.

## Deferred / not yet implemented

- **Only one policy exists.** `POLICIES` holds `baseline` alone. A stronger player — one that
  discards, uses a Cheat, or times its cash-out well — is a later ticket dropped in behind the same
  interface; nothing in the driver needs to change to accept one.
- **No balancing was done here, and none should be read out of this module.** DLR-130 shipped the
  instrument, not the readings. The developer's balance pass is a separate exercise, and the
  first observation this tool recorded is in `../run-winnability-simulation.md`.
- **No export format but plain text.** No CSV, no JSON, no charting, no parallel or multi-process
  batching. `--runs` has a lower bound but no upper one, so a very large batch is simply slow.
- **The Vault is not simulated.** Starting grants and Vault-adjusted slot odds
  (`drawVaultReelPool`) are out of the loop; the driver calls `drawReelPool` directly.
