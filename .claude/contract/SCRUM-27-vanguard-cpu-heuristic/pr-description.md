# SCRUM-27 — Vanguard CPU: heuristic action selection

Plan: [`plan.md`](./plan.md)

## Summary

Adds a pure, dry-run-validated heuristic CPU action-selector for the Vanguard Clash
(`src/vanguard/cpuPlayer.ts`) plus a thin `src/battle/playCpuClashTurn.ts` composition function
that plugs it into `submitClashAction`, mirroring how SCRUM-26 plugged the War Council CPU into
`submitWarCouncilCard`.

`chooseCpuClashAction(board, side, musterAvailable)` ranks legal, affordable Expand and Overwrite
candidates by distance to the opponent's base, falling back to Reinforce only when no advance
validates, and throwing a descriptive `Error` only on a true, unmodeled dead end (mirroring the
existing `scriptedClashAction`/`scriptedLocalAction` precedent). Zero illegal actions is verified
two ways:

- **Structurally** — every candidate the ranking produces is walked through the engine's own
  `applyVanguardAction` as a dry run, and only the first one confirmed `ok: true` is ever returned.
  Candidate generation never stands in as a substitute for the engine's own legality check.
- **Empirically** — 25 seeded multi-round Clash simulations (`cpuPlayer.test.ts`, AC4) chain each
  round's ending board into the next round's `startClash` for both `PlayerSide.Player` and
  `PlayerSide.Cpu`, asserting zero illegal-action rejections and that the claimed-cell count grows
  over the course of a battle.

## Design reading worth a sanity check

The ranking is two-tier: **contiguous-before-gap-jump, then distance-to-base**. A flat,
single-tier distance-to-base ranking was tried first and rejected while writing the Task 1 test —
because `EXPAND_RANGE` is 2, an Expand gap-jump straight past an adjacent enemy blocker is *always*
one hex closer to a distant base than overwriting that blocker is, so a flat ranking picks the
leapfrog every time and never picks the Overwrite AC2's own example calls for. The two-tier fix is
grounded directly in `skirmish-board-replacement.md`'s "a winning connection must be solid, no
gaps... a gap left unfilled is exploitable" — a gap-jump doesn't count toward the Breach until it's
filled in, so it's worth less than clearing an adjacent blocker even when it lands nominally closer.
See `plan.md` Part 1 → Assumptions made for the full worked hex-math. Flagging this for a quick
sanity read, not raising it as an open question — it's a documented reading, not a gap.

## Flagged follow-up (not fixed in this ticket, deliberately out of scope)

`src/battle/__tests__/battleTestHelpers.ts`'s scripted Clash helpers (`scriptedClashAction`,
`expandCandidates`, `affordableEnemyAdjacent`) now duplicate a simplified version of the real
heuristic this ticket adds. They're explicitly documented in their own comments as fixed,
non-adaptive scripts used only to drive `battleLoop.integration.test.ts` to completion quickly —
left untouched here, matching the identical precedent SCRUM-26 set for `autoPlayWarCouncilRound`.
A later ticket could swap `battleLoop.integration.test.ts` over to the real
`chooseCpuClashAction`/`playCpuClashTurn`, removing the duplication entirely.

## Verification (Phase 4, Task 5)

- **Typecheck** — `npm run typecheck` — exit 0, no output (`tsc -b`).
- **Lint** — `npm run lint` — exit 0, no output (`eslint .`).
- **Full suite** — `npm test` (`vitest run`) — `Test Files  32 passed (32)`, `Tests  261 passed
  (261)`, 0 failed, across the whole suite (every existing `warCouncil`, `vanguard`, and `battle`
  spec included, not just this contract's new files).
- **Production build** — `npm run build` — exit 0; `dist/index.html`, `dist/assets/*.css`,
  `dist/assets/*.js` written; no bundler errors.

## Note for future contributors

`chooseCpuClashAction` is side-generic per `PlayerSide` — like `chooseCpuCard`, it takes `side` as
a parameter rather than assuming the CPU, so it can drive either side's turn (used for both sides
in the AC4 seeded simulations).
