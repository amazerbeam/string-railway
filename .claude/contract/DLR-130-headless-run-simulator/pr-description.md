# DLR-130 — Headless run simulator: play the game without a browser, for balance measurement

Contract: [`.claude/contract/DLR-130-headless-run-simulator/plan.md`](plan.md)
Module doc: [`.docs/implementation/sim/README.md`](../../../.docs/implementation/sim/README.md)

## Summary

Adds `npm run sim` — a runnable, terminating command that plays N fully seeded runs of the game by
driving the shipped engine (`src/hunt/`, `src/warCouncil/`) and the shipped felt reducer
(`src/app/warCouncil/roundReducer.ts`) headlessly, and prints a plain-text balance report.

**No game rule and no tuning value changed.** Not one file under `src/hunt/`, `src/warCouncil/`,
`src/vault/` or `src/app/` was modified. The only existing files touched are `package.json` (one
script), `tsconfig.json` (one project reference) and `eslint.config.js` (the pure boundary extended
to cover the new tree). No dependency was added, runtime or dev — the runner is `vite build --ssr`
plus `node`, both already present.

New: a pure `src/sim/` module (policy seam, baseline policy, hand driver, run driver, batch loop,
report formatter, fixtures), a node CLI at `scripts/sim.ts`, and `tsconfig.scripts.json` so that CLI
can use `process` without leaking `@types/node` into `src/`.

## The command you run

```
npm run sim -- --runs 200 --seed 7
```

Defaults: `--runs 200`, `--seed 1`, `--policy baseline`. It rebuilds (a few seconds) and always
exits. A bad argument or an unknown policy exits 1 naming what was wrong, never a silent default.

Sample output, verbatim, from `npm run sim -- --runs 20 --seed 7`:

```
Headless run simulator — policy: baseline, base seed: 7, runs: 20

Outcomes
  won: 0  lost: 20  stalled: 0  win rate: 0.0%

Fights
  mean fight reached: 0.60  max fight reached: 2  mean fights won: 0.60

Hands
  mean hands per encounter: 4.85  max hands in one encounter: 10

Damage per hand
  to Quarry — mean: 2.39  median: 2  p90: 6  max: 13
  to player — mean: 2.59  median: 3  p90: 4  max: 6

Economy
  mean coins earned: 1.00  mean coins spent: 0.75  mean slot pulls: 0.60  mean buffs owned at end: 5.50

Buffs and AP
  mean buff activations per hand: 1.08  mean AP spent per hand: 2.76  mean Apply Damage presses per hand: 0.42  NoEffectYet refusals: 0

Faults
  none
  stalled runs: 0
```

## What the baseline policy does — read this before reading any number above

**Every figure the simulator prints is conditional on this.** A policy that never activated a buff
would report the game unwinnable and be technically correct and completely useless, so the baseline
does activate them — but it is deliberately simple, not good.

- **Cards** — `chooseCpuMove(round, PlayerSide.Player)`: the engine's own opponent heuristic, seated
  on the player's side. Lead the lowest legal card; when following, the lowest legal card that would
  *lose* and carries a skull, else the lowest that would *win*, else the lowest legal card. Fox and
  Woodcutter choices come from the same call.
- **Buffs** — at every between-tricks window, activates every offered buff whose refusal is `null`,
  cheapest AP first, while the pool would still cover `APPLY_DAMAGE_AP_COST`.
- **Apply Damage** — presses when the refusal is `null` and either the multiplier has reached
  `BASELINE_CASH_AT_MULTIPLIER` (**3**) or it is the hand's last window with a non-empty bank.
- **Never** discards, marks a Timebomb, or arms a Cheat — none of the three is on `SHOP_ITEMS`.
- **Shop** — takes the free pulls, then buys Heal (only below max health) → AP capacity → Swan tier
  → Witch tier while affordable, then drinks the flask if below max health with a charge.

**To swap it:** implement `SimPolicy` (`src/sim/types.ts` — four pure methods), add it to `POLICIES`
in `src/sim/baselinePolicy.ts`, and run `npm run sim -- --policy <name>`. The driver treats every
policy answer as advisory — it re-asks the engine's own refusal predicate before dispatching — so a
careless policy cannot crash a batch.

## Fixtures for component specs

The deep states browser QA has never reached, because coins only arrive once a fight is finished.
Each is deterministic and importable from `.test.tsx`:

- `fixtureRunAfterFirstFight()` → a `RunState` with real coins, a health delta and a quick-kill payout
- `fixtureHandWithPrimedTimebomb()` → a `RoundUiState` with a card primed and the detonation booked
- `fixtureHandWithStackedBuffs()` → a `RoundUiState` with two or more buffs activated in one trick

## Observation — not a change, and nothing was retuned

The first thing the instrument reported is **0 wins in 20 runs at seed 7**, with a mean fight
reached of 0.60 and a mean hand exchange of 2.39 damage dealt against 2.59 taken — the player is
losing the exchange, not merely losing on variance. This is consistent with
`.docs/implementation/run-winnability-simulation.md`'s pre-V5 finding of 0/120 and 0/150.

**DLR-130 ships the instrument, not the readings.** Nothing was retuned on the strength of this and
nothing should be until you have run it yourself. Two caveats before reading it as a balance
verdict: the number is conditional on the baseline policy above (a better cash-out discipline alone
could move it), and it is 20 runs, not 200.

Known-dead content the driver met, for the record: `NoEffectYet` refusals came back **0**, so the
unreachable consumables (Ward, Second Thoughts, Puppeteer, Foresight, Spyglass) never even reached
the offer — no template mints one, so they cannot distort these figures. `Keepsake` remains dead and
`Long Fall` was never shipped; neither is counted separately.

## Decisions for you

1. **Is the baseline the player you want measured?** Every number moves with it.
2. **`BASELINE_CASH_AT_MULTIPLIER = 3`** (`src/sim/baselinePolicy.ts`) — a *policy* parameter, not a
   game tunable, deliberately not in `src/hunt/config.ts`. It has the most leverage of any single
   knob over the printed damage distribution.
3. **Optional, later:** approving `tsx` as a devDependency would make `npm run sim` start instantly
   instead of rebuilding each invocation. Not requested here; this contract adds no dependency.

## Verification

| Gate | Result |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | **137 files, 1783 passed, 0 failed** (baseline was 133 / 1765 — the delta is this contract's 4 spec files) |
| `npm run build` | exit 0, `dist/` written |
| `npx prettier --check` (scoped) | exit 0 |
| Determinism | two identical invocations produce byte-identical output |
| CLI edge cases | `--seed 3.5`, `--seed 1e400`, `--runs 0`, `--runs` with no value, `--bogus 1`, `--policy nonesuch` — each exits 1 naming the fault |
| Purity boundary | zero React imports, DOM globals or `Math.random()` calls in `src/sim/` or `scripts/`; ESLint override extended on both halves and the ban proven to fire |
| Blast radius | `git status` — no file under `src/hunt/`, `src/warCouncil/`, `src/vault/` or `src/app/` modified |
| File budget | largest new file 245 lines, well under 400 |

Reviewers: Defender **APPROVED** (0 critical, 0 warning). Code-Evaluator and QA each found one
issue — the same one, two files not Prettier-clean — fixed in a whitespace-only pass and re-verified.

No browser pass: this contract renders nothing. There is no surface a browser could have checked.

## Note for future contributors

`src/sim/` is pure but **imports `src/app/warCouncil/`**, and that is deliberate. The four-step
damage/Timebomb/payout fold (`applyResolution`) and buff activation (`handleTapBuff`) live in the
app layer despite being React-free, so a driver that avoided them would measure a game nobody
plays. The coupling runs one way only — nothing in `src/hunt/`, `src/warCouncil/` or `src/vault/`
imports `src/sim/`.
