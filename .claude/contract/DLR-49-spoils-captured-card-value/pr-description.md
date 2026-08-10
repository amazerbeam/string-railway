# PR: Spoils — sum the value of captured cards

Plan: [`plan.md`](./plan.md)

## Summary

`RoundState` now retains captured cards per side; `playCard.ts` appends them on
every resolved trick; a new `spoils(state, side)` sums their value from
`src/hunt/config.ts`'s `cardBaseValue`, folding in Poison (-1) and Treasure (+1)
adjustments.

## Judgement calls for the developer to confirm

Two red-lined judgement calls from `plan.md` → Risks and judgement calls carry
into this diff and are worth a specific look before merge:

1. **`CardRank` gains `Treasure: 7` and `Poison: 8` as named members**, extending
   an object whose own comment previously said "the five odd ranks." This plan's
   own reading of the project's "referenced by name, not a bare literal" rule,
   extended to two ranks that carry a scoring rule rather than a play-time
   trigger. Cheap to revert to bare `7`/`8` literals inside `spoils.ts` alone if
   the developer would rather keep `CardRank` scoped to play-time abilities only.

2. **`spoils` takes an optional third `cardValue` parameter** beyond the ticket's
   literal two-argument `spoils(state, side)` signature, mirroring DLR-48's
   `resolveStanding(tricks, table?)` precedent — needed to make the flat-value
   identity test (AC6) independently testable without mutating
   `src/hunt/config.ts`'s shared `cardBaseValue`. Every real call site still works
   with two arguments.

## Verification results

- Task 5 (pure-core boundary grep across `src/warCouncil/**` and `src/hunt/**`
  for React/DOM references): **zero hits, confirmed.**
- Task 6, Step 1 (bare `rank === 7`/`rank === 8` comparison outside `types.ts`):
  **zero hits, confirmed.**
- Task 6, Step 2 (stale "five odd ranks" comment in `types.ts`): **zero hits,
  confirmed.**
- Task 7 (typecheck, lint, unfiltered `npm test`, `npm run build`): **QA
  verification pending** — this task does not run the unfiltered suite or the
  production build; those are run once by QA in the closing Final verification
  phase, per this project's runner ownership rule.

## Note for future contributors

`spoils` reads `state.capturedCards`, not trick history — any future ticket that
needs a per-trick replay view will need to add trick grouping, since this ticket
deliberately stores a flat per-side list (per the ticket's own "Default taken").
