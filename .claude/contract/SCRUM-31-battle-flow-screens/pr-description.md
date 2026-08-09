# SCRUM-31 — Battle-flow screens: round transition and Breach win/loss

Plan: [`plan.md`](./plan.md) in this folder.

## Summary

Adds `RoundTransitionPanel` and `BattleOverPanel` under `src/app/battle/`, satisfying the
Definition of Done's requirement for a round-transition screen and a Breach win/loss screen.
Neither component is wired into `App.tsx` yet — that wiring is reserved for the not-yet-planned
`SCRUM-34` battle-loop orchestrator, whose eventual job is to decide when each screen mounts.

Both components are pure, props-in/markup-out — neither calls into `src/battle`, `src/warCouncil`,
or `src/vanguard` beyond type imports and the one pure helper `otherSide`. They ship complete and
tested against hand-built fixture props, ready for `SCRUM-34` to import by path.

Also adds a shared `src/app/battle/labels.ts` (`SIDE_LABEL`) and a full-viewport shell stylesheet
`src/app/battle/battle.css`, following the same per-feature pattern already established by
`src/app/warCouncil/` and `src/app/vanguard/`.

## Decisions the developer should make

1. **Where the round-transition screen sits.** This plan places it at the `MusterConversion`
   phase boundary (the one point where a round's score and its resulting Muster are both live in
   state at once), rather than after a Clash resolves without a Breach. Defensible either way — the
   AC names no explicit phase boundary. Confirm this reading before `SCRUM-34` wires it in.
2. **Whether a button-less win/loss screen is acceptable.** `BattleOverPanel` renders no control at
   all — no restart/"play again" flow — per the ticket's own scope boundary (optional, not a DoD
   requirement, explicitly warned against expanding this ticket). Worth a sanity-check that a
   dead-end screen reads as intentional until `SCRUM-34` exists to give it somewhere to go.
3. **Further visual/copy polish beyond the approved `mockup.html`.** Colour, exact typography, and
   spacing are structural placeholders transcribed from the approved mockup, not a final visual
   pass — the developer's call per this project's design-judgement pause conditions.

## Verification results

All gates green after one fix-review round (a Prettier formatting fix to `battle.css`, no logic
change):

| Check | Result |
|---|---|
| `npm run typecheck` | PASS — exit 0, no errors |
| `npm run lint` | PASS — exit 0, no warnings |
| `npm run format:check` (scoped to this contract's files) | PASS — `npx prettier --check src/app/battle/battle.css` → clean |
| `npm test` (full suite) | PASS — `Test Files 51 passed (51)`, `Tests 398 passed (398)` |
| `npm run build` | PASS — exit 0, `dist/` written, no bundler errors |

Component tests (7 total, both files query exclusively by accessible role/label):
- `src/app/battle/__tests__/RoundTransitionPanel.test.tsx` — 3/3 passed: renders tricks/score/Muster
  for both sides, distinguishes this-round vs. next-round dealer via the real `otherSide`, and
  confirms `onContinue` fires on the primary control.
- `src/app/battle/__tests__/BattleOverPanel.test.tsx` — 4/4 passed: both named fixtures (Player-Breach,
  CPU-Breach) name the correct winner, no interactive control renders, and the round-note text is
  present.

Review cycle: Code-Evaluator and QA approved on round 1; Defender flagged one Warning (the
`battle.css` formatting gate) on round 1, fixed in a single combined pass, and all three reviewers
approved on round 2. No residual issues.

## Note for future contributors

`src/app/battle/` is the new sibling to `src/app/warCouncil/` and `src/app/vanguard/`, for
Battle-level (not per-subgame) screens — see `.docs/implementation/battle-ui.md`.
