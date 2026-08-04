# Vanguard board engine — hex grid, bases, Expand/Overwrite/Reinforce

Plan: [`plan.md`](./plan.md) · Ticket: [SCRUM-21](https://amazerbeam.atlassian.net/browse/SCRUM-21)

## Summary

Builds the Vanguard board as a pure, headless TypeScript module under `src/vanguard/`: a hex-grid
rhombus board with two fixed bases (Player, CPU) each pre-seeded with a small connected starting
cluster, a fixed set of permanent defense cells neither side may ever occupy, and the three Clash
actions — **Expand**, **Overwrite**, **Reinforce** — each enforcing its documented legality (range,
adjacency, ownership, the reinforcement cap) and returning its documented move cost. A single
reducer-shaped dispatch entry, `applyVanguardAction`, routes to the correct action by kind. No
Muster/turn-order bookkeeping, no Breach detection, no CPU decision-making, and no rendering — this
ticket is the board engine only, ready for a future Clash-orchestrator ticket to drive it
turn-by-turn.

## Developer decisions needed

- **`BOARD_SIZE = 11`, `STARTING_CLUSTER_SIZE = 4`, `DEFENSE_CELLS`** (a 5-cell placeholder layout
  near board centre) in `src/vanguard/config.ts` are all unchosen placeholders — no value exists
  anywhere in the brief or design doc. Retune after first playtest.
- **Reinforcement is modeled as a numeric stack (`reinforced: number`, capped by the named
  `REINFORCE_MAX_STACK = 1` constant)** rather than a boolean. Confirm this reading of "the +1
  reinforce cap is itself illustrative," or say if the cap should be permanently fixed at exactly
  one — in which case a boolean would be simpler.
- **Overwrite resets the captured cell's reinforcement to `0` for the new owner.** No explicit
  support either way in the brief or design doc. Confirm, or say if a captured position's
  fortification should carry over (fully or partially) to the capturing side.

## Verification results

All run against the full implementation (not per-phase):

| Check | Result |
|---|---|
| `npm run typecheck` | PASS — exit 0, no errors |
| `npm run lint` | PASS — exit 0, no warnings |
| `npm run format:check` | PASS — "All matched files use Prettier code style!" |
| `npm test` (unfiltered) | PASS — `Test Files 19 passed (19)`, `Tests 112 passed (112)` |
| `npm run build` | PASS — exit 0, `dist/` written, no bundler errors |

Two review rounds ran (Code-Evaluator, Defender, QA in parallel): round 1 found a DRY violation (a
test fixture helper duplicated across 5 spec files), a Prettier formatting gap, and one unexplained
non-null assertion; all three were fixed in a single combined pass and round 2 confirmed all three
reviewers APPROVED / ALL PASSED with zero remaining issues.

## Note for future tickets

`VanguardState` is no longer `unknown` — it now aliases the real `VanguardBoard` interface. Any
future ticket touching `src/battle/` (which references `VanguardState` structurally in
`BattleState.vanguard`) should expect the real shape, not `unknown`. No edit to `src/battle/` was
needed for this ticket; a whole-project `npm run typecheck` confirmed it already compiles clean
against the new shape.
