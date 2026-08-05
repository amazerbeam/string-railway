# War Council CPU — heuristic card player

Plan: [`plan.md`](./plan.md)

## Summary

Adds a pure, deterministic heuristic CPU card player for the War Council engine
(`src/warCouncil/cpuPlayer.ts`) plus a thin `src/battle/playCpuWarCouncilTurn.ts` composition
function that plugs it into the existing `submitWarCouncilCard` battle action. The CPU always
plays a legal card — including through the Fox's trump-mutating exchange and the Woodcutter's
draw/discard — verified with zero illegal plays across 60 seeded full 13-trick simulated rounds.

## Assumptions worth a quick sanity read

Two documented defaults and one tie-break rule were needed where the brief stated no rule; see
`plan.md` Part 1 → Assumptions made for the full rationale. Flagging these for a quick sanity
check, not as open questions:

- **Fox (rank 3) ability choice:** exchange the lowest card of the CPU's most-held non-trump
  suit; decline only if that suit is already trump or the hand is empty after the Fox.
- **Woodcutter (rank 5) ability choice:** always discard the lowest-ranked card of the hand after
  the draw.
- **Tie-break suit order:** rank first, then suit in `ALL_SUITS` declaration order
  (Bells < Keys < Moons) — reuses the engine's existing canonical order rather than inventing a
  second one.

## Verification results

Per-phase scoped results observed during implementation (all three production phases individually
green):

- **Phase 1** (`cpuPlayer.ts` core heuristics — `chooseCpuCard`, `chooseCpuFoxChoice`,
  `chooseCpuWoodcutterChoice`, `chooseCpuMove`): 11/11 tests passed, typecheck clean, lint clean.
- **Phase 2** (AC4 simulation coverage, 60 seeded full 13-trick rounds, both sides driven through
  `chooseCpuMove`): 72/72 tests passed (cumulative in `cpuPlayer.test.ts`), typecheck clean, zero
  illegal-play errors thrown.
- **Phase 3** (`playCpuWarCouncilTurn` battle-level composition): 4/4 tests passed, typecheck
  clean, lint clean.

The unfiltered `npm test` (whole suite) and `npm run build` (production build) are QA's to run
once, at the end of this contract, per the project's Implementer/QA split — they are not run by
the Implementer and will be reported separately in the final QA pass.

## Note for future contributors

`chooseCpuMove` is legality-generic per `PlayerSide` — it can drive either side's turn, which is
how the AC4 simulation tests exercise "a range of hands" without needing a second decision
function for the non-CPU side.
