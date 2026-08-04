# SCRUM-20 — War Council rules engine

Plan: [`plan.md`](./plan.md)

## Summary

Implements the War Council rules engine — deck construction, deterministic shuffle-and-deal, legal-move validation, trick-winner resolution (including the Witch and Monarch abilities), the Fox's mid-trick trump mutation, the Woodcutter and Swan abilities, and end-of-round scoring bands — replacing SCRUM-19's `WarCouncilState = unknown` placeholder with the real engine state (`RoundState`).

The engine lives under `src/warCouncil/` as a tree of small, single-concern, pure TypeScript modules (`types.ts`, `cardUtils.ts`, `deck.ts`, `shuffle.ts`, `deal.ts`, `scoring.ts`, `legalMoves.ts`, `resolveTrick.ts`, `abilities.ts`, `playCard.ts`), with `playCard` as the single reducer-shaped entry point that validates and applies every play. No CPU decision-making and no rendering are included — this ticket produces the engine only, ready for a later ticket to drive from either side.

## Scope call to flag for the developer

All five non-Treasure odd-card abilities were implemented — Swan, Fox, Woodcutter, Witch, and Monarch — not only the Fox trump-mutation ability that AC2 names explicitly by name. This was `plan.md`'s own Assumptions-section judgement call, reasoned out there in detail (the base game's own trick-winner and follow-suit rules are wrong for the base deck if Witch or Monarch are missing whenever those ranks appear).

**Please confirm this is the scope you wanted**, or ask for Woodcutter and/or Swan to be pulled back out — the plan's Risks section notes these two as the most independent to cut if a smaller slice were preferred: Woodcutter only affects hand/draw-pile composition (no other module depends on it), and Swan only affects who leads the next trick, not the current trick's winner or score.

## Treasure note

Treasure's (rank 7) mid-round point award is deliberately **not** implemented. The card is playable as an ordinary card (rank 7, no special effect), but it awards no bonus points. This is per the ticket's own instruction not to invent a Treasure-Muster rule — how Treasure's points would feed Muster is an open design question tracked in `.docs/design/hybrid-concept.md`, not resolved here.

## Verification results

- `npm run typecheck` — PASS, exit 0
- `npm run lint` — PASS, exit 0, zero warnings
- `npm test` (unfiltered) — PASS, `Test Files  12 passed (12)` / `Tests  69 passed (69)` (10 `src/warCouncil/__tests__/*.test.ts` files including `playCard.test.ts`'s 8 tests, plus the pre-existing `src/__tests__/smoke.test.ts` and `src/battle/__tests__/battlePhase.test.ts`)
- `npm run build` — PASS, exit 0, `dist/` written, no bundler errors
- Pure-core boundary grep (React import / DOM global) over `src/warCouncil` — zero hits
- `Math.random()` grep over `src/warCouncil` — zero hits
- Largest production file: `playCard.ts` at 89 lines; all files well under the 400-line budget

## Note for future contributors

`playCard` is the only way to mutate `RoundState`. `legalMoves`, `resolveTrickWinner`, and the functions in `abilities.ts` are pure queries/helpers it calls internally — not independent entry points a future CPU ticket should call directly to mutate state.

## Review history

This contract went through 2 fix-review rounds:

- **Round 1** fixed magic-number constants, unexplained casts, a Woodcutter reason-code asymmetry, three documentation gaps, and a tautological test.
- **Round 2** added one missing test-coverage case.

All three reviewers — Code-Evaluator, Defender, and QA — approved by the end.
