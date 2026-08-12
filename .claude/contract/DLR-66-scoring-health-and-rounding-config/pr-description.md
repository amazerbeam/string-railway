# DLR-66 — Scoring, health and rounding configuration: two mirrored tables as data

Plan: [`plan.md`](./plan.md) in this folder.
Jira: [DLR-66](https://amazerbeam.atlassian.net/browse/DLR-66) (parent epic [DLR-65](https://amazerbeam.atlassian.net/browse/DLR-65))

## Summary

The single transcribed Standing table (`STANDING_BANDS`) is replaced by
`HUNT_MULTIPLIER_TABLES` — two mirrored tables, one per `HuntDeclaration`, whose band
boundaries genuinely differ (Win groups tricks 7–9 into one row; Lose groups 4–6). A
declaration-aware accessor, `standingTableFor`, is the only way a consumer outside
`src/hunt/` gets a table; `resolveStanding` now **requires** a caller-supplied table
instead of silently defaulting to the retired single table.

Also added to `src/hunt/config.ts`, all as named data rather than logic scattered across
callers:

- `cardValueFor(declaration)` — the per-declaration accessor pairing `cardBaseValue` (Win)
  and `invertedCardValue` (Lose), §1's second term.
- `DamageRounding` / `DAMAGE_ROUNDING` / `roundDamage` — the ×0.5-band rounding rule.
- `PLAYER_START_HEALTH`, `QUARRY_ENCOUNTER_HEALTH`, `quarryHealthForEncounter`,
  `ENCOUNTER_PLAYER_RESTORE` — both health totals and the accessor.
- `SIMULTANEOUS_DEPLETION_WINNER` — the §5/§9 ruling, as data instead of a hardcoded branch
  in a later ticket.

Two `.tsx` call sites and `src/warCouncil/scoring.ts` were adapted (signature-only — no
behaviour redesign) to keep compiling against `resolveStanding`'s now-required table
parameter.

## Decisions the developer should confirm

- **`DAMAGE_ROUNDING` ships as `HalfAwayFromZero`**, with health at **1,350 / 1,600**. §9
  records this row Undecided; doubling both multiplier tables and both health totals is the
  one-file alternative if a different call is wanted (all of it lives in `src/hunt/config.ts`).
- **The multiplier tables themselves** — transcribed verbatim from AC1 (Win
  `0–3 ×1, 4 ×2, 5 ×3, 6 ×4, 7–9 ×5, 10–13 ×0.5`; Lose
  `0–3 ×0.5, 4–6 ×5, 7 ×4, 8 ×3, 9 ×2, 10–13 ×1`) — are the developer's to overturn; a test
  proves a whole-table swap (including the Lose side's different boundaries) is a one-file
  edit.
- **Whether the two `.tsx` call-site edits are acceptable** — making `resolveStanding`'s
  table parameter required is a compile-breaking change, so `src/app/warCouncil/WarCouncilRound.tsx`
  (one argument, resolved from the live declaration) and
  `src/app/warCouncil/__tests__/HuntLedger.test.tsx` (five call sites) had to change to keep
  the repo compiling. No layout, copy, control, or component shape changed.

## What changes visibly, and why nothing new is playable

- The in-app status band now reads the new multipliers — e.g. "Humble ×1" where it
  previously read "Humble ×6" — and `HuntLedger` still computes `spoils × multiplier`
  unrounded, so an odd Spoils under a ×0.5 band can render a `.5` product on screen until
  T2/T3 land.
- None of this contract's new exports (`cardValueFor`, `roundDamage`, the health constants,
  `SIMULTANEOUS_DEPLETION_WINNER`) have a consumer yet — they are consumed starting at
  DLR-65 T3. There is no feel question in this contract.

## Verification results (measured, this run)

**AC9 — no band boundary or multiplier survives outside the module (Task 10):**

- `Select-String … -Pattern "STANDING_BANDS"` over all of `src/**/*.ts,*.tsx` → **zero hits**.
- `Select-String … -Pattern "minTricks|maxTricks"` over `src/app/**` and `src/warCouncil/**`
  → **zero hits**.
- `Select-String … -Pattern "HUNT_MULTIPLIER_TABLES"` over all of `src/**` → hits only in
  `src\hunt\config.ts`, `src\hunt\index.ts`, and `src\hunt\__tests__\config.test.ts`. No hit
  under `src\app\` or `src\warCouncil\`.

**Pure-core boundary and file-size budget (Task 11):**

- `Select-String … -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage|fetch\("`
  over `src\hunt\**` → **zero hits**.
- Line counts (`(Get-Content <file>).Count`, not `Measure-Object -Line`):
  - `src\hunt\config.ts` — 253
  - `src\hunt\types.ts` — 60
  - `src\hunt\index.ts` — 33
  - `src\hunt\__tests__\config.test.ts` — 303
  - `src\warCouncil\scoring.ts` — 71
  - `src\warCouncil\__tests__\scoring.test.ts` — 132
  - `src\app\warCouncil\__tests__\HuntLedger.test.tsx` — 76
  - `src\app\warCouncil\WarCouncilRound.tsx` — 271
  - All under the 400-line budget; no split needed.

  (These are the final counts, re-measured after the Prettier `--write` pass below
  reformatted three of the test files. Task 11 ran its measurement before that pass, so its
  in-run figures for the three reformatted files were superseded.)

**Static gates, full suite, production build (Task 12):**

- `npm run typecheck` — exit 0, no errors.
- `npm run lint` — exit 0, no output.
- `npx prettier --check` scoped to this contract's files — **initially failed** on
  `src\hunt\__tests__\config.test.ts`, `src\warCouncil\__tests__\scoring.test.ts`, and
  `src\app\warCouncil\__tests__\HuntLedger.test.tsx`; fixed with `npx prettier --write` on
  those three files (the one self-fix the Implementer is permitted), then re-checked clean:
  `All matched files use Prettier code style!`.
  - The repo-wide `npm run format:check` was also run and reported (not gated on): it still
    fails on 21 pre-existing `.docs/**` and `.github/**` files this contract never touched —
    expected per `web-project.md`.
- `npx vitest run --project node` — `Test Files  26 passed (26)`, `Tests  481 passed (481)`.
- `npx vitest run --project dom` — `Test Files  8 passed (8)`, `Tests  51 passed (51)` (no
  cold-cache timeout this run).
- `npm test` (full suite) — `Test Files  34 passed (34)`, `Tests  532 passed (532)`.
- `npm run build` — exit 0, `dist/` written (`dist/index.html`, `dist/assets/index-*.css`,
  `dist/assets/index-*.js`), no bundler errors.

## Note for future contributors

Consumers name a **declaration**, never a table — `standingTableFor` and `cardValueFor` are
the module's whole public entry point for §1's two terms. Reach for those two functions, not
`HUNT_MULTIPLIER_TABLES` or `cardBaseValue`/`invertedCardValue` directly, from outside
`src/hunt/`.
