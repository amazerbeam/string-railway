# The Breach — win-condition detection

Plan: [`plan.md`](plan.md)

## Summary

Adds `hasReachedBreach(board, side)` to `src/vanguard/`, reusing the module's existing `connectedNetwork` reachability query so the Breach check is gap-free by construction rather than by a second hand-written traversal. `connectedNetwork` already runs a breadth-first search over physical (non-leapfrog) adjacency from a side's base, admitting only cells that side owns — exactly "an unbroken chain of adjacent tokens." `hasReachedBreach` reduces to a membership test: is the opponent's base coordinate present in that already-correct reachability set?

Changes:
- `src/vanguard/breach.ts` — new pure function `hasReachedBreach(board, side): boolean`.
- `src/vanguard/index.ts` — re-exports `hasReachedBreach` alongside the module's other public exports.
- `src/vanguard/__tests__/breach.test.ts` — four unit tests: no chain, a solid chain, a chain with a single gap cell (regression for the Expand gap rule), and a chain only the opponent holds.

## Nothing for the developer to decide before merging

No tuning value, dependency, or UI judgement is involved in this change. The plan flags two judgement calls worth a read, not a blocking decision:

- **The function name `hasReachedBreach` is invented** — the ticket named no identifier. Chosen to match the existing verb-first, boolean-returning style (`isWithinBoard` in `hexGrid.ts`). A one-line rename if a different name is preferred.
- **Base-loss behaviour is inherited, not newly decided.** `connectedNetwork` already returns `[]` when a side no longer owns its own base cell; `hasReachedBreach` inherits that for free, so "lost your base ⇒ no Breach" is the existing, already-tested contract rather than a new rule invented by this ticket. Base-loss *consequences* beyond this were explicitly out of scope for this ticket.

## Verification (Phase 2 — final verification, no production changes)

- **Pure-core boundary grep** (`src\vanguard\`) for a React import or DOM/browser global — zero hits.
- **Naming consistency grep** for `hasReachedBreach` — every hit spells the identifier identically (declaration in `breach.ts`, re-export in `index.ts`, import + repeated use in `breach.test.ts`).
- **Typecheck** (`npm run typecheck`) — exit 0, no errors.
- **Lint** (`npm run lint`) — exit 0, clean.
- **Full test suite** (`npm test`) — exit 0. `Test Files  21 passed (21)`, `Tests  126 passed (126)`.
- **Production build** (`npm run build`) — exit 0, `dist/` written (`index.html`, `assets/`, `favicon.svg`), no bundler errors.

## For future contributors

`src/vanguard/breach.ts` is the module's first read-only "query" style file, as opposed to the three `apply*` action files (`applyExpand`, `applyOverwrite`, `applyReinforce`). The next query added to this module (e.g. a stalemate/tiebreak check, if one is ever added) should follow the same shape: a small, single-purpose pure function with its own `__tests__` file, no new types, no new config, re-exported from `index.ts` next to its siblings.
