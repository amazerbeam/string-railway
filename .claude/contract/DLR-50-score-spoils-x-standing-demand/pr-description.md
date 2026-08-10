# DLR-50 — Standing from the band table, and Score = Spoils × Standing against the Demand

Plan: [`plan.md`](./plan.md)

## Summary

Migrated `tricksToPoints` in `src/warCouncil/scoring.ts` onto T2's `resolveStanding`, so the Standing multiplier table has exactly one owner (`STANDING_BANDS` in `src/hunt/config.ts`) instead of a duplicated five-branch if-chain. Added `scoreHunt(state, side)` and `checkDemand(score, demand)` so a Hunt has a computable outcome: `scoreHunt` returns `{ spoils, tricks, band, standing, score }` — Spoils × Standing, computed once from an already-final `RoundState`, never accumulated per trick — and `checkDemand` compares that score against a passed-in Demand, returning `'cleared' | 'missed'`. No UI was touched.

Also added: a `Score` type alias in `src/hunt/types.ts` (alongside the existing `Spoils`/`Standing`/`Demand` aliases), and re-exports of `scoreHunt`, `checkDemand`, `DemandOutcome`, `HuntScore`, and `Score` from `src/warCouncil/index.ts` / `src/hunt/index.ts` so a later ticket (T7, T9) can consume them without reaching past the module boundary.

## Judgement calls flagged for review

1. **`tricksToPoints`/`scoreRound` are kept unrenamed, in their current UI-facing shape**, even though their internals now express a different concept (a Standing multiplier rather than a "score"). This is a deliberate scope call to avoid touching `WarCouncilRound.tsx`/`RoundOverPanel.tsx`, which the ticket marks out of scope. It does mean the UI's "Points" column will keep showing the Standing multiplier, not `Spoils × Standing`, until T7 lands — worth confirming that reading is acceptable for however long T7 is scheduled after this ticket.
2. **The `Score` type alias is not named anywhere in the ticket's ACs.** It is additive and has zero runtime effect (erased at compile time — a `number` alias), but it is a naming choice the developer may want to red-line, e.g. if a future ticket prefers `score` to stay a bare `number` throughout.

## Verification results

| Phase | Typecheck | Lint | Scoped Vitest |
|---|---|---|---|
| 1 — migrate `tricksToPoints` | exit 0 | — | `src/warCouncil/__tests__/scoring.test.ts` — 15 passed (existing suite, unmodified — proves the migration is behaviour-preserving) |
| 2 — `Score` type alias | exit 0 | — | — (no new test; alias compiles unused) |
| 3 — `scoreHunt` + AC4/5/6 tests | exit 0 | exit 0 | 32 passed |
| 4 — `checkDemand` + AC7 tests | exit 0 | exit 0 | 35 passed |
| 5 — `index.ts` re-exports | exit 0 | exit 0 | — (no behaviour change) |
| 6 — final verification (this phase) | see below | see below | see below |

Phase 6 (this dispatch) ran only its two read-only grep audits:

- **Task 8** — `Get-ChildItem -Recurse -Include *.ts,*.tsx -Path src | Select-String -Pattern "tricks <= 3|tricks === 4|tricks === 5|tricks === 6|tricks <= 9"` — **zero hits.** The migrated if-chain's condition shape does not survive anywhere in `src/`.
- **Task 9** — `Get-ChildItem -Recurse -Include *.ts -Path src\warCouncil,src\hunt | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"` — **zero hits.** `scoreHunt`/`checkDemand` add no React import and no DOM/browser global; the pure-core boundary for `src/warCouncil/**` and `src/hunt/**` still holds.

**Pending QA** (Task 10 — not run in this dispatch; the unfiltered suite and the production build are QA's, once, at the end):
- `npm run typecheck` (full-project re-confirmation)
- `npm run lint` (full-project re-confirmation)
- `npm test` (unfiltered suite)
- `npm run build` (production build)

These are reported here as **pending**, not as passed — no claim is made about their outcome.

## Note for future contributors

`scoreHunt`/`checkDemand` are the first two consumers of T2's/T3's injectable-parameter pattern (`cardValue`, `standingTable`) outside their own definitions — the next ticket needing a config override in a test should reach for the same shape (pass an overridden table/function as an optional parameter) rather than mutating `STANDING_BANDS` in place.
