# Muster conversion — War Council score band to move budget

Plan: [plan.md](plan.md)

## Summary

Adds `convertScoreToMuster` to `src/vanguard/` — a pure function converting a War Council round's score into that round's Muster (the baseline move budget for both sides, plus a bonus for the round's winner only). This fixes the old Hex board's zero-Muster ambush problem by construction: because both sides always receive the baseline and only the winner adds a bonus on top, the losing side's Muster can never fall below the floor no matter how lopsided the round was.

## Tunable values — developer attention needed

- `MUSTER_BASELINE = 7` is taken directly from `skirmish-board-replacement.md`'s own illustrative figure.
- `MUSTER_BONUS = 3` is this plan's own invented placeholder, with **no design-document basis**. Flag for explicit developer attention before or during first playtest — this is the least-grounded number in the change.

## Judgement calls for developer sign-off

1. **The bonus is flat for the winner regardless of score margin.** An ambush and the tightest pitched battle produce identical Muster values. Confirm this reading, or say if the bonus should scale with how decisively the round was won.
2. **A tied score band grants the bonus to neither side.** This band is unreachable from `scoreRound` today, but the function's parameter type (`Readonly<Record<PlayerSide, number>>`) allows it, so the behaviour is defined and tested rather than left as an open case.

## Verification

- Typecheck: PASS (`npm run typecheck`, exit 0, no errors)
- Lint: PASS (`npm run lint`, exit 0, no errors)
- `npm test`: PASS — `Test Files 20 passed (20)`, `Tests 122 passed (122)` (includes the new 10-test `convertScoreToMuster` suite)
- `npm run build`: PASS — exit 0, `dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js` written, no bundler errors

## Note for future contributors

This ticket does not wire the Muster into `BattleState` or any orchestrator — it produces the value only. A future Clash-orchestrator ticket consumes it.
