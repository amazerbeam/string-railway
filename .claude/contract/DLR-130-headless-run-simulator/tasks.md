# Tasks: Headless run simulator — play the game without a browser, for balance measurement

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Note:** `plan.md` was **not** developer-confirmed at an `AskUserQuestion` gate. This contract was planned and executed inside the 2026-08-23 unattended sprint run, which auto-approves the plan gate and logs each default taken to `.claude/sprint-runs/2026-08-23-sprint/log.md`. Every assumption in `plan.md` Part 1 stands as the plan's stated default.

Status: COMPLETE
Started: 2026-08-24

**Goal:** Ship a runnable, terminating `npm run sim` that plays N fully seeded runs by driving the existing pure engine and the existing felt reducer with no browser, prints a plain-text balance report, exposes a swappable policy seam with one fully documented baseline, and exports deterministic deep-state fixtures for component specs — changing no game rule and no tuning value.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**

- `src/sim/simConfig.ts` — the three termination caps that guarantee the simulator exits.
- `src/sim/types.ts` — `SimPolicy`, `CardChoice`, `ShopAction`, `HandReport`, `RunReport`, `SimSummary`, `SimOptions`, `RunEnding`.
- `src/sim/baselinePolicy.ts` — the one shipped policy, plus the `POLICIES` registry.
- `src/sim/playHand.ts` — drives one hand through `roundReducer` and returns a `WarCouncilRoundResult` + `HandReport`.
- `src/sim/playRun.ts` — drives one whole run: hands, `recordEncounter`, the shop visit, `advanceRun`.
- `src/sim/simulate.ts` — the batch loop over N seeded runs.
- `src/sim/report.ts` — formats a `SimSummary` into the plain-text report string (prints nothing).
- `src/sim/fixtures.ts` — deterministic deep-state fixtures for component specs.
- `src/sim/index.ts` — the module barrel.
- `src/sim/__tests__/baselinePolicy.test.ts` — the baseline actually activates buffs and presses Apply Damage.
- `src/sim/__tests__/playHand.test.ts` — a hand plays out, terminates, and reports what it did.
- `src/sim/__tests__/simulate.test.ts` — determinism, termination, and report formatting.
- `src/sim/__tests__/fixtures.test.ts` — each fixture reaches the deep state it claims.
- `scripts/sim.ts` — the node CLI entry: argument parsing, `simulate`, `formatSummary`, stdout.
- `tsconfig.scripts.json` — the third TypeScript project, covering `scripts/` with `@types/node`.

**Modified:**

- `package.json` — add the `sim` script. **This is a `package.json` change.** No dependency is added.
- `tsconfig.json` — add `./tsconfig.scripts.json` to `references`.
- `eslint.config.js` — add `src/sim/**/*.{ts,tsx}` to the pure-core override's `files` **and** to the second block's `ignores`.

**Deleted:** (none)

**Developer decides or observes:**

- **Run `npm run sim` and read the output.** That is the deliverable; no agent can judge whether the report tells the developer what they need while tuning.
- **Whether `baselinePolicy` is the player they want measured** — its full behaviour is in `plan.md` Part 2 → Risks and judgement calls, in the module's docblock, and in `.docs/implementation/`. Every printed number is conditional on it.
- **`BASELINE_CASH_AT_MULTIPLIER`** (`src/sim/baselinePolicy.ts`, documented default `3`) — a policy parameter, not a game tunable. It has the most leverage of any knob over the printed damage distribution; the developer may want a different cash-out discipline.
- **Whether to approve `tsx` as a devDependency later** so `npm run sim` starts instantly instead of rebuilding (a few seconds) each invocation. Not requested by this contract, which adds no dependency.

---

## Phase 1 — The module seam and the toolchain

This phase makes `npm run sim` a real, runnable, terminating command before any game logic exists behind it: the tsconfig project, the lint boundary, the npm script, the shared types and the termination caps. It is a safe stopping point because everything type-checks, lints and runs — the CLI simply reports its parsed arguments and exits. Nothing in `src/` outside the new folder changes behaviour.

### Task 1: Create the sim module's constants and types ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/sim/simConfig.ts`
- Create: `src/sim/types.ts`

- [x] **Step 1: Write `src/sim/simConfig.ts` with the three termination caps**

These are safety rails that guarantee the process exits, not game tuning values. Each carries its unit and the fact that hitting it is a bug signal.

```ts
/**
 * DLR-130 — the caps that make the simulator TERMINATE. None of these is a game tuning value:
 * they exist so a driver bug, an engine change, or a badly written policy produces a reported
 * `stalled` run instead of a process that never exits — this project's `npm run dev` trap in a
 * new costume. Every one is set an order of magnitude above anything a real game reaches.
 */

/** Reducer dispatches allowed for ONE hand. A six-trick hand costs roughly 20-40. UNIT: dispatches. */
export const MAX_ACTIONS_PER_HAND = 400

/** Hands allowed in ONE fight. A fight is normally decided in 1-6. UNIT: hands. */
export const MAX_HANDS_PER_FIGHT = 40

/** Policy shop actions allowed at ONE visit before the driver stops asking. UNIT: actions. */
export const MAX_SHOP_ACTIONS_PER_VISIT = 40
```

- [x] **Step 2: Write `src/sim/types.ts` exactly as `plan.md` Part 2 → Data shapes specifies**

Copy the `CardChoice`, `ShopAction`, `SimPolicy`, `HandReport`, `RunEnding`, `RunReport`, `SimSummary` and `SimOptions` declarations from `plan.md` Part 2 → Data shapes → `src/sim/types.ts`, docblocks included. `RunEnding` is an `as const` object map, never an `enum` (`erasableSyntaxOnly` is on). Import types only — this file declares shapes and no behaviour.

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Add the `scripts/` TypeScript project and the lint boundary ✓

- Skill: `react-frontend`

**Files:**

- Create: `tsconfig.scripts.json`
- Modify: `tsconfig.json`
- Modify: `eslint.config.js`
- Config: `tsconfig.json` — add a third project reference; `eslint.config.js` — extend the pure-core `files` list and the second block's `ignores`

- [x] **Step 1: Create `tsconfig.scripts.json`**

Exactly the JSON in `plan.md` Part 2 → Data shapes → `tsconfig.scripts.json`. Its `lib` and `types` are a deliberate superset of `tsconfig.app.json`'s so files pulled in transitively from `src/` type-check identically under both projects.

- [x] **Step 2: Reference it from `tsconfig.json`**

Replace:

```json
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
```

with:

```json
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.scripts.json" }
  ]
```

- [x] **Step 3: Extend the pure-core ESLint override to cover `src/sim/**` — both halves, in this one step**

In `eslint.config.js`, the block whose `files` is currently

```js
    files: ['src/warCouncil/**/*.{ts,tsx}', 'src/hunt/**/*.{ts,tsx}', 'src/vault/**/*.{ts,tsx}'],
```

becomes

```js
    files: [
      'src/warCouncil/**/*.{ts,tsx}',
      'src/hunt/**/*.{ts,tsx}',
      'src/vault/**/*.{ts,tsx}',
      // DLR-130 — the headless simulator is pure TypeScript: it drives the engine and the felt's
      // reducer with no React and no DOM, and it must stay that way to keep running under node.
      'src/sim/**/*.{ts,tsx}',
    ],
```

and in the SAME step, the later block's `ignores` array gains `'src/sim/**'`:

```js
    ignores: [
      'src/persistence/browserStorage.ts',
      'src/warCouncil/**',
      'src/hunt/**',
      'src/vault/**',
      // DLR-130 — flat config REPLACES, never merges, same-key rule options. Without this entry
      // the narrow storage-only `no-restricted-globals` list below would silently overwrite the
      // pure-core block's full DOM ban for `src/sim/**`, and `npm run lint` would still exit 0.
      // That regression was shipped once already, on DLR-106.
      'src/sim/**',
    ],
```

Extend the block's existing explanatory comment to name `src/sim/**` alongside the other three entries. Both edits are in this one step deliberately: applying only the first silently disables the DOM ban it was meant to add.

- [x] **Step 4: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

### Task 3: Add the `sim` npm script and a runnable CLI entry ✓

- Skill: `react-frontend`

**Files:**

- Create: `scripts/sim.ts`
- Modify: `package.json`
- Config: `package.json` — add the `sim` script (no dependency change)

- [x] **Step 1: Write `scripts/sim.ts` with real argument parsing and a placeholder body**

Argument parsing is final here; Task 9 replaces only the placeholder body. `--seed` rejects a non-finite or non-integer value, because `createSeededRng` documents that `NaN` and `Infinity` both collapse onto seed `0`'s sequence — two "different" seeds silently producing identical runs is the one failure a determinism tool must not have.

```ts
/**
 * DLR-130 — the headless simulator's command line. `npm run sim -- --runs 200 --seed 7`.
 *
 * Lives OUTSIDE `src/` deliberately: `src/` is typed with `types: ["vite/client"]` and no
 * `@types/node`, and adding node's globals there would change typings for the whole app tree.
 * `tsconfig.scripts.json` covers this file instead. Everything below the argument parse is a call
 * into `src/sim/`, which is pure and node-free.
 *
 * Writes through `process.stdout.write`, never `console.log`: a CLI's stdout IS its output, and
 * `console.log` is banned in shipped code (`CLAUDE.md` → Code conventions).
 */
const DEFAULT_RUNS = 200
const DEFAULT_SEED = 1
const DEFAULT_POLICY = 'baseline'

interface CliArgs {
  readonly runs: number
  readonly baseSeed: number
  readonly policyName: string
}

/** Parses `--runs`, `--seed` and `--policy`. Returns a message instead of args when anything is
 *  wrong, so `main` can exit 1 naming the bad argument rather than guessing a default. */
function parseArgs(argv: readonly string[]): CliArgs | string {
  // …positive-integer checks on --runs and --seed via Number.isInteger; unknown flag => message…
}

function main(): number {
  // …placeholder until Task 9: print the parsed arguments and return 0…
}

process.exitCode = main()
```

Implement `parseArgs` fully: it walks `process.argv.slice(2)` in `--flag value` pairs, returns a string message for an unknown flag, a missing value, a non-integer `--runs`/`--seed`, a `--runs` below 1, or a non-finite value; otherwise returns the three parsed fields with the defaults above. The placeholder `main` writes one line naming the parsed runs, seed and policy, and returns `0`.

- [x] **Step 2: Add the `sim` script to `package.json`**

Add, after `"test:watch"`:

```json
    "sim": "vite build --ssr scripts/sim.ts --outDir dist-ssr --logLevel error && node dist-ssr/sim.js",
```

No dependency is added — `vite` is already a devDependency and `dist-ssr` is already in `.gitignore`. `&&` is correct inside a `package.json` script (npm runs it through `cmd.exe` on Windows); the project's `;`-not-`&&` rule governs commands an agent types into PowerShell.

- [x] **Step 3: Run the script end-to-end and confirm it terminates**

Run: `npm run sim -- --runs 3 --seed 7`
Expected: exits 0 within a few seconds, printing one line naming runs 3, seed 7, policy baseline. It must return to the prompt — a command still running after a minute is a defect in this task, not a slow build.

- [x] **Step 4: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

---

## Phase 2 — The baseline policy

The simulated player, behind the interface every later phase calls. This phase is a safe stopping point because the policy is a pure function of state that nothing yet calls: it type-checks, it is unit-tested against hand-built states, and no driver depends on it existing in a particular shape beyond `SimPolicy`.

### Task 4: Write `baselinePolicy` and the `POLICIES` registry ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/sim/baselinePolicy.ts`
- Test: `src/sim/__tests__/baselinePolicy.test.ts`

- [x] **Step 1: Write `src/sim/baselinePolicy.ts`**

The module docblock must state the policy's behaviour **in full** — it is the reference the ticket asks for, and every number the simulator prints is conditional on it. Behaviour, exactly as `plan.md` Part 2 → Risks and judgement calls records it:

```ts
/**
 * DLR-130 — THE baseline simulated player. Every figure `npm run sim` prints is conditional on
 * this file, so its behaviour is written out here in full rather than left to be read off the
 * code. Swap it by passing `--policy <name>`; add a policy by putting it in `POLICIES` below.
 *
 * CARDS — delegates to `chooseCpuMove(round, PlayerSide.Player)`, the engine's own shipped
 * heuristic, seated on the player's side: lead the lowest legal card; when following, the lowest
 * legal card that would LOSE the trick and carries a skull, else the lowest legal card that would
 * WIN, else the lowest legal card at all. Fox and Woodcutter choices come from the same call, so
 * the card and its ability choice can never disagree.
 *
 * BUFFS — at every between-tricks window, activates every offered buff whose refusal is `null`,
 * CHEAPEST AP FIRST, while the pool would still cover `APPLY_DAMAGE_AP_COST` afterwards. A policy
 * that never activated a buff would report the game unwinnable and be technically correct and
 * completely useless, which is why the reserve is the only thing that stops it.
 *
 * APPLY DAMAGE — presses when `applyDamageRefusalFor` returns `null` AND either the multiplier has
 * reached `BASELINE_CASH_AT_MULTIPLIER` or this is the hand's last window with a non-empty bank
 * (an unbanked bank is lost at the deal, so the last window is use-it-or-lose-it).
 *
 * NEVER — discards, marks a Timebomb, or arms a Cheat. None is on the shop's shelf
 * (`SHOP_ITEMS`), so a baseline that used them would be measuring cards a player cannot buy.
 *
 * SHOP — takes the free slot pulls first, then buys in the fixed order Heal (only below maximum
 * health) -> AP capacity -> Swan tier -> Witch tier while each is affordable, then drinks the
 * flask if below maximum health with a charge in hand.
 */
export const BASELINE_CASH_AT_MULTIPLIER = 3
export const baselinePolicy: SimPolicy = { /* … */ }
export const POLICIES: Readonly<Record<string, SimPolicy>> = { baseline: baselinePolicy }
```

Implementation notes the reviewer will check:

- `chooseCard(round)` returns `chooseCpuMove(round, PlayerSide.Player)` unchanged — it already satisfies `CardChoice`.
- `chooseBuffs(ui)` reads `offeredBuffs(ui)`, filters to those whose `loadoutRefusalFor(ui, buff)` is `null`, sorts by `apCostOf(buff)` ascending then by `buff.id` ascending (so the order is total and the run is reproducible), then walks the sorted list accumulating cost and stops before the running total would leave the pool under `APPLY_DAMAGE_AP_COST`. Returns the ids.
- `wantsApplyDamage(ui)` returns `false` when `applyDamageRefusalFor(applyDamageStock(ui)) !== null`; otherwise `ui.round.multiplier >= BASELINE_CASH_AT_MULTIPLIER || (ui.round.hands[PlayerSide.Player].length <= 1 && ui.round.bank > 0)`.
- `nextShopAction(run)` returns, in order, the first that applies: a `pull` on `SLOT_MACHINE_IDS[0]` while `run.slotPullsThisVisit < SLOT_FREE_PULLS_PER_VISIT`; a `buy` for the first item of `[Heal, ApCapacity, SwanTier, WitchTier]` whose `refusalFor(shopStockFor(run), item)` is `null`; a `flask` when `flaskRefusalFor(flaskStockFor(run))` is `null`; otherwise `null`.
- No `Math.random()`. No module-level mutable state — the exported objects are stateless.

- [x] **Step 2: Write the failing spec `src/sim/__tests__/baselinePolicy.test.ts`**

Four tests, each building its state from real engine calls (`startRun`, `dealHand`, `createRoundUiState`) rather than hand-rolled literals:

1. `chooseCard` returns a card that is a member of `legalMoves(round, PlayerSide.Player)`.
2. `chooseBuffs` returns a non-empty list for an opening hand whose pile has activatable buffs, and the summed `apCostOf` of the returned ids leaves at least `APPLY_DAMAGE_AP_COST` in the pool.
3. `wantsApplyDamage` is `false` on a freshly dealt hand (bank 0, multiplier 0, refusal non-null).
4. `nextShopAction` on a fresh `RunState` at a shop visit returns a `pull` action, and returns `null` once every branch is exhausted (a run with no coins, no free pull left and full health).

- [x] **Step 3: Run the spec**

Run: `npx vitest run src/sim/__tests__/baselinePolicy.test.ts`
Expected: 4 passed, 0 failed.

- [x] **Step 4: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

---

## Phase 3 — The drivers and the report

The three loops — hand, run, batch — plus the report formatter and the real CLI body. This is the phase that makes the ticket's primary deliverable real. It ends with `npm run sim` printing a full report, every loop bounded, and every driver unit-tested.

### Task 5: Drive one hand through the reducer ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/sim/playHand.ts`
- Test: `src/sim/__tests__/playHand.test.ts`

- [x] **Step 1: Write `src/sim/playHand.ts`**

`playHand(run, handNumber, carried, policy): HandOutcome`. Structure:

1. `const dealt = dealHand(run, handNumber, carried)` — the same seeded deal `App.tsx` uses; never a fresh `dealRound`.
2. Build the seed through **one** private helper, `seedFor(run, dealt)`, returning a `RoundUiSeed` with every field `App.tsx`'s mount passes: `round`, `encounter: run.encounter`, `cheats`, `timebombCharges`, `blastGuardHeld`, `discardsRemaining`, `buffs`, `bankClimbBonus: bankClimbBonusFor(run)`, `rankTiers: playerRankTiersFor(run)`, `apCapacity: apCapacityFor(run.apCapacityBonus)`, `coins: run.coins`. One helper, not three inline literals — `plan.md`'s construction-site audit counts 44 sites of this shape and a fourth divergent one is how a field gets forgotten.
3. Loop at most `MAX_ACTIONS_PER_HAND` times, picking exactly ONE action per iteration, in this priority order — read off `roundReducer.ts`'s own guards, not invented:
   - `ui.cpuFault !== null` → record the fault, break.
   - `isEncounterResolved(ui.encounter)` → break (the hand is over; `App.tsx`'s `handleCarryOn` reports upward at exactly this point).
   - `ui.round.phase === RoundPhase.Complete && ui.resolvedTrick === null` → break.
   - `ui.resolvedTrick !== null` → dispatch `CarryOn`.
   - `ui.prompt !== null` → dispatch `ChooseAbility` with the choice the policy returned alongside the card that opened the prompt (held in a local; if none is held, fall back to `chooseCpuMove(ui.round, PlayerSide.Player).choice`, and if that is `undefined` dispatch `CancelSelection` so the loop cannot wedge).
   - `discardWindowOpen(ui) && windowKey !== ui.round.tricksPlayed` → run the between-tricks window ONCE for this trick (see step 2 below), then set `windowKey = ui.round.tricksPlayed`.
   - `canAct(ui)` → `const move = policy.chooseCard(ui.round)`; hold `move.choice`; dispatch `TapCard` with `move.card` twice (arm, then commit) — the real two-tap interaction.
   - `currentTurn(ui.round) === QUARRY_SIDE` → dispatch `CarryOn` (the Quarry-to-lead gap).
   - otherwise → break as stalled: the loop has no action to take, which is a driver bug, not a game state.
4. The between-tricks window, in this order: for each id in `policy.chooseBuffs(ui)` — dispatch `ToggleLoadout` if `!loadoutOpen(ui)`, then `TapBuff(id)` twice (poise, commit), counting a `NoEffectYet` refusal into `deadCardRefusals` before dispatching; then `CancelLoadout` if the panel is open; then, if `policy.wantsApplyDamage(ui)`, dispatch `TapApplyDamage` twice (poise, commit). Every dispatch is preceded by re-asking the engine's own refusal predicate, and a refused action is skipped rather than dispatched.
5. Assemble the `WarCouncilRoundResult` exactly as `WarCouncilRound.tsx`'s `handleCarryOn` does — `finalState: ui.round`, `encounter`, `cheats`, `timebombCharges`, `blastGuardHeld`, `discardsRemaining`, `buffs`, `unplayedAtResolve`, `coinsEarned: ui.buffHand.coinsEarned` — and the `HandReport` from the deltas against `ui.openingEncounter` plus `apCapacityFor(run.apCapacityBonus) - ui.buffActivation.apPool`.

Keep the file under 400 lines; if the window logic pushes it over, split the window into `src/sim/handWindow.ts` in this same task and say so in the summary.

- [x] **Step 2: Write the spec `src/sim/__tests__/playHand.test.ts`**

1. A hand played from `startRun(PLAYER_START_HEALTH, [], 42)` terminates with `stalled === false` and `fault === null`.
2. The same seed twice produces identical `HandReport`s (deep equality).
3. `report.damageToQuarry + report.damageToPlayer > 0` for at least one of the first three hands of seed 42 — a driver that plays cards but never causes a damage event is measuring nothing.
4. `result.finalState.tricksPlayed` is 6, or the encounter resolved before the sixth trick.

- [x] **Step 3: Run the spec**

Run: `npx vitest run src/sim/__tests__/playHand.test.ts`
Expected: 4 passed, 0 failed.

### Task 6: Drive one whole run ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/sim/playRun.ts`

- [x] **Step 1: Write `src/sim/playRun.ts`**

`playRun(seed, policy): RunReport`. A headless transcription of `App.tsx`'s `handleComplete` / `leaveForNextFight`:

1. `let run = startRun(PLAYER_START_HEALTH, [], seed)`; `let carried = FRESH_ENCOUNTER_DECK`; `let handNumber = 1`.
2. While `run.outcome === RunOutcome.InProgress` and the fight's hand count is under `MAX_HANDS_PER_FIGHT`: play a hand, `recordEncounter(run, result.encounter, result.cheats, result.timebombCharges, result.blastGuardHeld, result.discardsRemaining, result.unplayedAtResolve, result.coinsEarned, result.buffs)`, then:
   - encounter still live → `carried = closeHand(result.finalState)`, `handNumber += 1`, continue;
   - encounter resolved and `canAdvanceRun(run)` → run the shop visit (Task 7's loop), then `advanceRun`, `carried = FRESH_ENCOUNTER_DECK`, `handNumber += 1`, reset the per-fight hand counter;
   - otherwise → the run is over.
3. Coins earned and spent are tracked as deltas across `recordEncounter` (earned) and across each shop action (spent), never re-derived from prices — a second arithmetic path is how the two disagree.
4. `ending` is `Won` / `Lost` from `run.outcome`, or `Stalled` if any hand stalled, any hand faulted, or the hand cap was hit. `Stalled` is deliberately distinct from `Lost`.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 7: Execute the shop visit the policy asks for ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/sim/playRun.ts` — add the shop-visit loop

- [x] **Step 1: Add `visitShop(run, policy)` to `src/sim/playRun.ts`**

A bounded loop, at most `MAX_SHOP_ACTIONS_PER_VISIT` iterations, that asks `policy.nextShopAction(run)` and executes the answer defensively — the refusal predicate is re-asked before every commit and a refused action ends the visit rather than throwing:

- `buy` → `refusalFor(shopStockFor(run), item)`; if `null`, `run = buyFromShop(run, item)`.
- `flask` → `flaskRefusalFor(flaskStockFor(run))`; if `null`, `run = drinkFlask(run)`.
- `pull` → `slotPullRefusalFor(slotVisitStockFor(run))`; if `null`, derive the strip and the spin exactly as `useShopSlot` does — `const stripSeed = slotSeedFor(run.runSeed, machineId, run.encounterIndex)`, `const machine = drawReelPool(machineId, createSeededRng(stripSeed))`, `const pull = pullMachine(machine, createSeededRng(spinSeedFor(stripSeed, run.slotPullsThisVisit)))` — then `run = pullSlotMachine(run, pull)`. Use `drawReelPool`, **not** `drawVaultReelPool`: a simulated run has an empty Vault (`plan.md` Part 1 → Assumptions made).
- `null` → leave the shop.

Return the new run plus the coins spent and the pull count for the `RunReport`.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 8: Batch the runs and format the report ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/sim/simulate.ts`
- Create: `src/sim/report.ts`
- Test: `src/sim/__tests__/simulate.test.ts`

- [x] **Step 1: Write `src/sim/simulate.ts`**

`simulate(options, policy): SimSummary` maps `runIndex` in `[0, options.runs)` to `playRun(mixSeed(options.baseSeed, runIndex), policy)` and returns `{ policyName: policy.name, baseSeed: options.baseSeed, runs }`. `mixSeed` is the existing helper from `src/hunt/seededRng.ts` — no new seed arithmetic is written.

- [x] **Step 2: Write `src/sim/report.ts`**

`formatSummary(summary): string` returns the whole report and **prints nothing** — that is what makes it testable and what keeps `console.log` out of shipped code. Sections, one per line group:

- header: policy name, base seed, run count;
- outcomes: won / lost / stalled counts and the win rate as a percentage;
- fights: mean and max fight index reached, mean fights won;
- hands: mean hands per encounter, max hands in one encounter;
- damage: mean, median, p90 and max damage to the Quarry per hand, and the same for damage to the player;
- economy: mean coins earned, mean coins spent, mean slot pulls, mean buffs owned at the end;
- buffs and AP: mean buff activations per hand, mean AP spent per hand, mean Apply Damage presses per hand, total `NoEffectYet` refusals (the unreachable-consumable count);
- faults: any hand faults, with the reason, and the stalled-run count.

Every division guards its divisor and prints `n/a` on an empty sample rather than emitting `NaN`. Percentiles read a sorted array by index; no interpolation.

- [x] **Step 3: Write the spec `src/sim/__tests__/simulate.test.ts`**

1. **Determinism:** `formatSummary(simulate({ runs: 5, baseSeed: 11 }, baselinePolicy))` equals the same expression evaluated a second time, string-for-string.
2. **Seed sensitivity:** base seed 11 and base seed 12 do not produce the same report string — proving the seed is actually threaded rather than ignored.
3. **Termination:** every `RunReport` in a 10-run batch has `ending !== RunEnding.Stalled`, and `hands.length >= 1`.
4. **No `NaN` reaches the report:** the formatted string of a 1-run batch contains no `NaN`.
5. **The report names its policy:** the string contains `baseline`.

- [x] **Step 4: Run the spec**

Run: `npx vitest run src/sim/__tests__/simulate.test.ts`
Expected: 5 passed, 0 failed.

### Task 9: Wire the CLI to the real simulation ✓

- Skill: `react-frontend`

**Files:**

- Modify: `scripts/sim.ts` — replace the placeholder `main` body
- Create: `src/sim/index.ts`

- [x] **Step 1: Write the barrel `src/sim/index.ts`**

Export `simulate`, `formatSummary`, `playRun`, `playHand`, `baselinePolicy`, `POLICIES`, `BASELINE_CASH_AT_MULTIPLIER`, the three caps from `simConfig.ts`, every type from `types.ts`, and (after Task 10) the fixtures. Nothing else.

- [x] **Step 2: Replace `main` in `scripts/sim.ts`**

```ts
function main(): number {
  const parsed = parseArgs(process.argv.slice(2))
  if (typeof parsed === 'string') {
    process.stdout.write(`${parsed}\n`)
    return 1
  }
  const policy = POLICIES[parsed.policyName]
  if (policy === undefined) {
    process.stdout.write(
      `Unknown policy '${parsed.policyName}'. Known policies: ${Object.keys(POLICIES).join(', ')}\n`,
    )
    return 1
  }
  process.stdout.write(
    formatSummary(simulate({ runs: parsed.runs, baseSeed: parsed.baseSeed }, policy)),
  )
  return 0
}
```

An unknown policy exits 1 naming the known policies rather than falling back to the baseline — a silent fallback would attribute one policy's numbers to another.

- [x] **Step 3: Run the real command and read the output**

Run: `npm run sim -- --runs 20 --seed 7`
Expected: exits 0 within a few seconds and prints the full report — outcomes, fights, hands, damage, economy, buffs/AP, faults. It must return to the prompt.

- [x] **Step 4: Confirm the same command twice prints the same thing**

Run: `npm run sim -- --runs 5 --seed 7 > $env:TEMP\sim-a.txt; npm run sim -- --runs 5 --seed 7 > $env:TEMP\sim-b.txt; if ((Get-Content $env:TEMP\sim-a.txt -Raw) -eq (Get-Content $env:TEMP\sim-b.txt -Raw)) { "identical" } else { "DIFFERENT" }`
Expected: prints `identical`.

- [x] **Step 5: Confirm an unknown policy fails loudly**

Run: `npm run sim -- --policy nonesuch; $LASTEXITCODE`
Expected: prints `Unknown policy 'nonesuch'. Known policies: baseline` and a non-zero exit code.

- [x] **Step 6: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

---

## Phase 4 — Reusable deep-state fixtures

The ticket's second half: the states browser QA has never reached, exposed as plain values a component spec can render. Safe stopping point — the fixtures are additive, depend only on Phase 3's drivers, and nothing else imports them.

### Task 10: Export the deep-state fixtures ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/sim/fixtures.ts`
- Modify: `src/sim/index.ts` — export the fixtures
- Test: `src/sim/__tests__/fixtures.test.ts`

- [x] **Step 1: Write `src/sim/fixtures.ts`**

Three exported builders, each deterministic, each defaulting its seed so a spec can call it with no arguments, each documented with the state it guarantees:

- `fixtureRunAfterFirstFight(seed = 1301): RunState` — plays hands with `baselinePolicy` until the first encounter resolves with the player winning, retrying the next seed (bounded to 50 attempts, throwing a `RangeError` naming the failure if none wins) so the returned run reliably holds coins, a health delta and a real `lastQuickKillPayout`. **This is the state coins come from**, which is why browser QA could never reach the shop with anything in the purse.
- `fixtureHandWithPrimedTimebomb(seed = 1302): RoundUiState` — a run with a Timebomb charge bought directly through `buyFromShop(run, ShopItem.Timebomb)` (legitimate: `buyFromShop` is total over `ShopItem` and still prices Timebomb; DLR-116 only pared it off the `SHOP_ITEMS` shelf — note that in the docblock), then a dealt hand driven to the point where a card is primed and `encounter.pendingTimebomb` is non-zero on at least one side.
- `fixtureHandWithStackedBuffs(seed = 1303): RoundUiState` — a hand at a between-tricks window after `baselinePolicy` has activated two or more buffs in one trick, so `buffActivation.activatedThisTrick.length >= 2`.

No fixture calls `Math.random()`, and none reads or writes storage.

- [x] **Step 2: Write the spec `src/sim/__tests__/fixtures.test.ts`**

One test per fixture asserting the state it claims, plus one determinism test:

1. `fixtureRunAfterFirstFight()` returns a run with `coins > 0`, `encounterIndex >= 0` and a resolved-or-advanced encounter.
2. `fixtureHandWithPrimedTimebomb()` returns a state with `round.primedCards.length >= 1`.
3. `fixtureHandWithStackedBuffs()` returns a state with `buffActivation.activatedThisTrick.length >= 2`.
4. Each fixture called twice returns deeply equal values.

- [x] **Step 3: Run the spec**

Run: `npx vitest run src/sim/__tests__/fixtures.test.ts`
Expected: 4 passed, 0 failed.

- [x] **Step 4: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

---

## Phase 5 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task 11: Confirm the pure boundary holds for the new tree ✓

- [x] **Step 1: Grep the simulator for React and DOM references**

Run: `Get-ChildItem src\sim -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage"`
Expected: zero hits.

- [x] **Step 2: Confirm no `Math.random()` call entered the simulator or the CLI**

Run: `Get-ChildItem src\sim,scripts -Recurse -Include *.ts | Select-String -Pattern "Math\.random\(\)"`
Expected: zero hits.

- [x] **Step 3: Confirm the ESLint override covers `src/sim/**` on both halves**

Run: `Select-String -Path eslint.config.js -Pattern "src/sim/\*\*"`
Expected: at least one hit inside the pure-core block's `files` array and at least one inside the later block's `ignores` array. (The pattern also matches the explanatory comment prose beside each entry, so the raw hit count is four, not two — the planner's original "exactly two hits" wording did not account for the comments the same task tells you to write. Read the hits and confirm both array entries are present.)

### Task 12: Confirm no game tuning value was touched and no file breached the budget ✓

- [x] **Step 1: Confirm the diff touches no game configuration**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain`
Expected: no modified file under `src/hunt/`, `src/warCouncil/`, `src/vault/` or `src/app/`. The only modified files are `package.json`, `tsconfig.json` and `eslint.config.js`; everything else is new.

- [x] **Step 2: Measure every file this contract created**

Run: `Get-ChildItem src\sim,scripts -Recurse -Include *.ts | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count under 400. Measured with `(Get-Content <path>).Count`, never `Measure-Object -Line`, which drops blank lines.

### Task 13: Static gates and full suite ✓

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed and at least 1765 passed — the pre-contract baseline was 1765 passed of 1765 across 133 files, so any failure is this contract's.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

- [x] **Step 3: Formatting of this contract's own files**

Run: `npx prettier --check src\sim scripts package.json tsconfig.json tsconfig.scripts.json eslint.config.js`
Expected: exits 0. If it fails, run `npx prettier --write` on exactly those paths — never repo-wide `npm run format`, which rewrites ~58 unrelated `.md` files.

### Task 14: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- a link to `plan.md` in this folder;
- a summary of the change: a new pure `src/sim/` module, a node CLI, one npm script, one tsconfig project, one lint-boundary extension, and no game-code change;
- **the exact command the developer runs and a sample of its real output**;
- **what `baselinePolicy` does, in full, and how to swap it** (`--policy <name>`, `POLICIES` in `src/sim/baselinePolicy.ts`);
- the fixtures exported and what deep state each reaches;
- every decision the developer must make: whether the baseline is the player they want measured, and `BASELINE_CASH_AT_MULTIPLIER`;
- **what the simulator actually reported when it was run, marked plainly as an observation with nothing retuned**;
- verification results from the prior phases.

---

## Self-review

**Spec coverage:**

- A runnable script, the primary deliverable — Tasks 3, 9 (`npm run sim`, real output, terminates, deterministic across two invocations).
- Seeded and deterministic — Tasks 5, 6, 8 (every seed from `mixSeed`/`dealSeedFor`/`slotSeedFor`/`spinSeedFor`), verified in Task 8 Step 3 test 1, Task 9 Step 4, and Task 11 Step 2.
- A pluggable policy seam with a documented baseline — Tasks 1 (`SimPolicy`), 4 (`baselinePolicy`, `POLICIES`, the full docblock), 9 (`--policy`, unknown-name exit 1).
- Reusable deep-state fixtures — Task 10.
- A `package.json` change, called out — Task 3 Step 2, and in the File map.
- No retuning, no game-code change — enforced by Task 12 Step 1's clean-diff check.
- Documentation of the baseline in `.docs/implementation/` — owned by `implementation-doc-writer` at the end of `/fb-apply`, per `plan.md` Part 2.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step is a concrete code change or a runnable command with `Run:` / `Expected:`. The Phase 1 CLI placeholder is explicitly scoped ("argument parsing is final here; Task 9 replaces only the placeholder body") and is replaced by a named later task, not left behind.

**Type / name consistency:** `SimPolicy`, `CardChoice`, `ShopAction`, `HandReport`, `RunReport`, `RunEnding`, `SimSummary`, `SimOptions`, `baselinePolicy`, `POLICIES`, `BASELINE_CASH_AT_MULTIPLIER`, `MAX_ACTIONS_PER_HAND`, `MAX_HANDS_PER_FIGHT`, `MAX_SHOP_ACTIONS_PER_VISIT`, `playHand`, `HandOutcome`, `playRun`, `visitShop`, `simulate`, `formatSummary`, `fixtureRunAfterFirstFight`, `fixtureHandWithPrimedTimebomb`, `fixtureHandWithStackedBuffs` are each spelled identically here and in `plan.md` Part 2 → Data shapes. The npm script is `sim` in both files; the policy registry key is `baseline` in both.

**Phase boundary cleanliness:**

- Phase 1 ends type-checking, linting and with `npm run sim` running and exiting — the module exists with types and caps and nothing depends on unwritten code.
- Phase 2 ends type-checking with `baselinePolicy` unit-tested and unused; no driver depends on it yet.
- Phase 3 ends with all three loops written, tested and wired to the CLI, and `npm run sim` printing the real report.
- Phase 4 ends with the fixtures added and tested; they are additive and nothing else imports them.
- Phase 5 makes no production change at all.
