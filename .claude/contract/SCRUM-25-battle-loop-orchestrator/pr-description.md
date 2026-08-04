# SCRUM-25 — Battle loop orchestrator

Plan: [plan.md](plan.md)

## Summary

Adds the four-function battle-loop orchestrator (`startBattle`, `submitWarCouncilCard`,
`beginClash`, `submitClashAction`) sequencing War Council → Muster → The Clash → Breach/loop over a
single persistent `BattleState`, replacing the SCRUM-19 placeholder flat interface with a 4-variant
discriminated union keyed on `phase`. Wires together the four already-built engines (War Council,
Vanguard board actions, Muster conversion, The Clash, Breach detection) with no CPU logic and no
UI — every function takes a card or an action as caller-supplied input.

Board persistence across rounds is structural: `createVanguardBoard()` is called exactly once, in
`startBattle`; every later transition threads the same board reference forward. Dealer alternation
is a single named `dealer` field, flipped exactly once — in `submitClashAction`, at the point a
Clash ends naturally without a Breach. There is no round cap anywhere in the module.

## Developer decisions outstanding

- **`WAR_COUNCIL_FIRST_DEALER`** (`src/battle/config.ts`) — no stated default exists anywhere in
  the brief or design docs for who deals round 1 of a battle. Placeholdered to `PlayerSide.Player`.
  Flip it in one line if you want the other side, or want it to contrast deliberately with
  `CLASH_FIRST_ROUND_OPENER`'s `Cpu` default.
- **Whether `MusterConversion` should remain its own explicit, driver-called phase (`beginClash`)**
  — this plan's choice — versus being folded silently into `submitWarCouncilCard`'s
  round-completion branch. Changing this drops the public function count from four to three.
- **Whether `submitClashAction` auto-dealing the next round** on a natural (non-Breach) Clash end
  is the right API shape, versus a separate explicit `startNextWarCouncilRound(state, rng)` call
  the driver must remember to invoke.
- **Whether the integration test's scripted Clash-action policy reads as acceptably "CPU-free
  scripted" per AC5.** The policy was substantially reworked mid-implementation from the plan's
  literal snippet — see "Notable deviation" below — and is now a distance-minimizing script with
  Muster-affordability gating and a connectivity fix, not a literal hardcoded coordinate path. All
  three reviewers (Code-Evaluator, Defender, QA) independently judged it fixed-and-non-adaptive
  across two review rounds; flagging for a final developer read since "nearest cell" is the
  simplest form of goal-seeking behaviour and a stricter reading of "CPU-free" could want more.

## A finding for a future ticket, out of this one's scope

The Defender's review surfaced a pre-existing engine-level question in `src/vanguard/`, unrelated
to any file this ticket touches: `applyReinforce` rejects once a token is already at its
reinforcement cap, there is no `Pass`/`Skip` `VanguardActionKind`, and nothing in `applyClashAction`
auto-resolves a turn where a side has Muster left but zero legal actions (every own token capped,
no affordable Expand or Overwrite in reach). This wasn't hit by the integration test's own scripted
policy (verified across 8 seeds, all resolving in 3-4 rounds), but the Implementer's initial
scripted-policy deadlock before the fix was fixed was exactly this symptom's shape. Worth a
follow-up check on whether legal-move starvation is reachable in real play, and if so what the
intended resolution is.

## Notable deviations from the plan's literal snippets

1. **`startBattle`'s return type** narrowed from `BattleState` to
   `Extract<BattleState, { phase: WarCouncilRound }>` — strictly more precise (the function can
   only ever construct that variant), remains freely assignable wherever `BattleState` is expected,
   and lets every caller read `dealer`/`vanguard` without a manual narrowing check.
2. **`src/warCouncil/index.ts` gained a `CardRank` re-export** it was missing — a pre-existing
   barrel gap (the type existed in `types.ts` but wasn't re-exported), discovered because the
   plan's own test/helper snippets import it from the barrel. Purely additive; confirmed via `git
   diff` that no existing export was touched or reordered.
3. **The scripted Clash-action test policy in `battleTestHelpers.ts`** was substantially reworked
   from the plan's literal snippet. The literal script deadlocked or nearly saturated the board on
   real seeds; the fix adds Muster-affordability gating before proposing an Overwrite, a missing
   fallback tier for the passive/local script, and a connectivity fix for a case where
   `EXPAND_RANGE`'s 2-hex jump could create a network-disconnected island invisible to
   `connectedNetwork`'s adjacency-only BFS. All three changes are confined to test-only code in
   `src/battle/__tests__/`; the Defender independently verified each fix's premise against the real
   (untouched) `src/vanguard/` engine code.

## Verification results

- `npm run typecheck` — exit 0
- `npm run lint` — exit 0
- `npm test` (full unfiltered suite) — 28 test files, 149 tests, all passed
- `npm run build` — exit 0, `dist/` written, no bundler errors
- Scoped `src/battle/` suite — 6 test files, 16 tests, all passed (2 seeded full-battle integration
  runs among them, satisfying AC5)
- Review: Code-Evaluator, Defender, QA all ran twice (round 1 found 2 minor DRY nits in the
  integration test, fixed in a single combined pass; round 2 — all three APPROVED / ALL PASSED with
  zero remaining issues)

## Note for future contributors

`BattlePhase.MusterConversion` is a real, reachable phase now — any future code branching on
`BattleState.phase` must handle all four cases (`WarCouncilRound`, `MusterConversion`, `Clash`,
`Resolved`), not just three.
