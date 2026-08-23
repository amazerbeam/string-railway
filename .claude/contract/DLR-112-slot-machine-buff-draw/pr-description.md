# DLR-112 — Slot-machine buff draw and templated buff pool

Plan: `.claude/contract/DLR-112-slot-machine-buff-draw/plan.md`

## Summary

Turns DLR-111's authored v1 card list into live, generated engine data, and builds the slot
machine that hands it out — all under `src/hunt/`, no UI.

- `src/hunt/seededRng.ts` — `createSeededRng` (mulberry32) and `mixSeed`, the only randomness
  source `src/hunt/` may use. Every consumer takes `rng: Rng` as an explicit parameter; nothing
  calls `Math.random()`.
- `src/hunt/buffTemplates.ts` — the 71-template condition-card pool, GENERATED at module load from
  two crossing tables (`TEMPLATE_FAMILIES` × axis lists), not hand-listed. Also the reward-value
  ladder (`REWARD_TIER_VALUE`), the tier-parameterised condition thresholds
  (`CONDITION_THRESHOLD`), and `mintFromTemplate`.
- `src/hunt/slotConfig.ts` — `SlotMachineId` (`Skirmisher`, `Strongbox`), `SLOT_MACHINE_IDS`,
  `REEL_COUNT = 3`, `REEL_POOL_SIZE = 8`, `SLOT_FREE_PULLS_PER_VISIT = 1`, `SLOT_REROLL_PRICE = 1`.
- `src/hunt/slotWeights.ts` — per-machine family/axis weight tables and
  `weightedDrawWithoutReplacement`, a generic re-statement of `src/warCouncil/skulls.ts`'s
  `weightedDraw` (re-stated, not imported — `hunt` cannot import `warCouncil` without a cycle).
- `src/hunt/slotMachine.ts` — `drawReelPool`, `spinReels`, `resolvePull` (AC2's three outcomes),
  `mintPullAwards`, `pullPriceFor` / `slotPullRefusalFor` (AC5), `slotSeedFor`.
- `src/hunt/index.ts` — additive barrel re-exports for every new public name.

## Draw-rate and weight numbers, with justification

All AGENT-CHOSEN under the 2026-08-23 sprint-run tuning override, never played against a real
hand. Every figure is retunable in `slotWeights.ts` alone.

**`SLOT_FAMILY_WEIGHTS`** — Skirmisher (trick/fight lean, weight on Event-cadence families that
pay inside a hand): Taker 5, Feeder 4, MarkOfRank 3, Sidestep 2, Glutton 4, Hoarder 1, Unbloodied
1, DebtCollector 3, Keepsake 1, Miser 1, Cornered 1. Strongbox (permanent-upgrade lean, weight on
Threshold families and, via the axis table, the coin axis): Taker 2, Feeder 2, MarkOfRank 1,
Sidestep 1, Glutton 2, Hoarder 5, Unbloodied 4, DebtCollector 2, Keepsake 1, Miser 2, Cornered 2.

**`SLOT_AXIS_WEIGHTS`** — Skirmisher: Magnitude 3, Multiplier 3, ApRefund 2, Coins 1. Strongbox:
Coins 4, ApRefund 3, Magnitude 1, Multiplier 1.

**Why family-weighted rather than flat uniform**: a flat draw over 71 templates would make
`Mark of the R` (22 of 71 templates, 31%) the pool's most frequent card purely on fan-out, not
design intent. `templateWeightFor` normalises by each family's own axis-weighted total, so a
family's strip share equals its stated weight regardless of template count. Flat is a legitimate
alternative and a one-line change (set every weight to `1`).

**`REEL_POOL_SIZE = 8`** — transcribed from AC3, not chosen here — sets P(three match) = 1/64,
P(exactly two match) = 21/64, P(all different) = 42/64; expected cards per pull ≈ 2.64. Flagged in
`plan.md` → Risks as generous and unplayed.

**Keepsake** — shipped at the floor weight (1) on both machines rather than excluded, because
`v1-buff-card-list.md` flags it as possibly unfireable with `HAND_SIZE = 6`. The document says
the fix ("not an agent's call") is the developer's: reword the condition, redefine the end-of-hand
instant, or delete the three rows.

**Ward** — not drawable here at all. Ward is a consumable and AC6 (consumables in the reel pool)
is deferred to DLR-126, which is still `To Do`. When DLR-126 admits consumables, DLR-111's
standing recommendation applies (delete the two rows if `DAMAGE_PER_HIT` never moves).

## Seeded RNG threading

`src/hunt/` must stay reproducible for DLR-130's headless balance simulator. Every randomness
consumer — `weightedDrawWithoutReplacement`, `drawReelPool`, `spinReels` — takes `rng: Rng` as an
explicit parameter, the convention `dealRound`/`shuffle`/`assignSkulls` already set in
`src/warCouncil/`. `createSeededRng(seed)` is a pure, allocation-free mulberry32 PRNG with no
module-level state, so two generators from the same seed are independent and reproducible.
`slotSeedFor(runSeed, machineId, visitIndex)` folds the machine's index and the visit index
through `mixSeed`, so a strip is *recomputed* from the run's seed rather than stored — nothing is
persisted. **`src/hunt/` randomness is threaded as an explicit `Rng` parameter everywhere and is
never taken from `Math.random()`** — confirmed by grep in Final verification.

## `apCost` stayed a lookup

No task touched `buffs.ts`, `buffCosts.ts`, `buffCatalog.ts`, or `config.ts`. `apCostOf` prices
every minted template through the existing `REWARD_BASE` + `CONDITION_MODIFIER` formula; every
`mintFromTemplate` output is asserted priceable in `buffTemplates.test.ts` and `slotMachine.test.ts`.

## Gate results

- Typecheck: PASS — `npm run typecheck` (`tsc -b`), 0 errors, run after every phase and again at
  the end.
- Lint: PASS — `npm run lint` (`eslint .`), 0 errors/warnings.
- Prettier: PASS — `npx prettier --check` on all 10 contract files, "All matched files use
  Prettier code style!"
- Vitest (scoped, this contract's four spec files): **56 passed / 56** —
  `seededRng.test.ts` (5), `buffTemplates.test.ts` (22), `slotWeights.test.ts` (13),
  `slotMachine.test.ts` (16).
- Architectural boundary grep (React/DOM globals across `src/hunt/**`): PASS, zero hits.
- `Math.random()` grep across `src/hunt/**`: 7 hits, all inside docblock prose stating the ban
  (`buffCatalog.ts`, `buffs.ts`, `buffTemplates.ts`, `cheats.ts`, `seededRng.ts` ×2,
  `slotMachine.ts`) — zero actual calls, read individually.
- Hard-coded tunable grep (`\breel\w*\s*[=<>]\s*8\b|pullsThisVisit\s*<\s*1\b`): one hit, inside
  `slotConfig.ts` itself (the constant's own definition) — zero hits elsewhere.
- File line counts (all under the 400-line budget, measured with `(Get-Content <path>).Count`
  after Prettier): `seededRng.ts` 38, `slotConfig.ts` 33, `buffTemplates.ts` 190,
  `slotWeights.ts` 137, `slotMachine.ts` 173, `index.ts` 264.
- `npm test` (unfiltered) and `npm run build` — **delegated to QA**, per this contract's and
  `web-project.md`'s rule that the Implementer never runs the unfiltered suite or the production
  build. Baseline before this contract: 1259 passing / 1259, 96 files, 0 failures; this contract
  adds 56 new tests across 4 new files with no existing test touched.

## Deviations from `tasks.md`

- `slotWeights.test.ts` as given in `tasks.md` imports `SLOT_AXIS_WEIGHTS` but never asserts
  against it, which fails `tsc`'s `noUnusedLocals`. Added one small legitimate assertion
  (`SLOT_AXIS_WEIGHTS[machineId]` values are finite and non-negative) rather than dropping the
  import, so the spec both matches the given intent and typechecks.
- The barrel additions in `src/hunt/index.ts` landed after the existing `actionPoints.ts` block
  (end of file) rather than immediately after `buffCosts.ts`, since several existing blocks
  (`cheats.ts`, `buffAccrual.ts`, `buffActivation.ts`, `shop.ts`, `flask.ts`, `quickKill.ts`,
  `run.ts`, `runTransitions.ts`, `quarryCharacters.ts`, `actionPoints.ts`) already sit between
  them. Grouping by source module is preserved; only the position shifted to the file's end.
- Corrected two re-export slips caught by `tsc` mid-implementation, not present in the final
  diff: `SlotMachineId` and `SlotPullRefusal` are each both a value (`as const` map) and a type
  (`typeof … [keyof typeof …]`) — each is re-exported once, as a value, which carries both
  meanings; a duplicate `export type { … }` line for the same name is a compile error under
  `verbatimModuleSyntax`.
