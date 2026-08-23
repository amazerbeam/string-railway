# PR: DLR-104 — Action Points, core resource and single-source-of-truth toggle

Plan: [`plan.md`](./plan.md)

## Summary

Adds a standalone, unit-tested Action Points resource module (`src/hunt/actionPoints.ts`) plus its config keys (`AP_ENABLED`, `STARTING_AP`, `ApRefreshCadence`/`AP_REFRESH_CADENCE`) and an `ActionPoints` type. No consumer is wired, and there is no UI — this ticket ships the resource and its toggle only, per DLR-104 AC4. The new names are re-exported from `src/hunt/index.ts` so a later ticket can import them the same way it imports `CheatCard`/`FlaskStock` today.

## Developer decisions carried in this plan

- `STARTING_AP = 6` — an unplayed placeholder pending T5's buff-activation cost table and T6's Apply Damage cost existing to test it against.
- `AP_ENABLED` defaults to `true` — a judgement call, since the brief didn't state a default and no consumer yet makes the choice visible either way.
- Whether `actionPoints.ts`'s pure-function shape (plain `pool`/`cost` values, no `RunState`/`RoundState` field seeded in this ticket) is the right shape for T5/T6 to build against — the most consequential scope call in this plan.

All three are recorded in `plan.md` Part 2 → Risks and judgement calls.

## Verification (Task 8)

- `npm run typecheck` — **PASS**, exits 0, no errors.
- `npm run lint` — **PASS**, exits 0, no output (clean).
- `npm test` — **1 failed | 1010 passed (1011)**, 78 passed / 1 failed of 79 test files. The one failure (`src/hunt/__tests__/envenom.test.ts` → `buyFromShop — Envenom (AC1, AC2) > does NOT add a Cheat`) is **pre-existing and unrelated to this ticket** — confirmed by stashing this dispatch's changes and re-running against the clean tree, where it fails identically. No file this ticket touches (`types.ts`, `config.ts`, `config.test.ts`, `index.ts`, `actionPoints.ts`, `actionPoints.test.ts`) is on the failing test's call path.
- `npm run build` — **PASS**, exits 0. `dist/` written: `index.html` (0.48 kB), `index-*.css` (37.74 kB), `index-*.js` (257.94 kB). No bundler errors.
- Pure-core boundary grep (`src/hunt/**` for `from 'react'` / `window.` / `document.` / `localStorage`) — **zero hits**.
- Tunable/stale-name grep (`AP_ENABLED`, `STARTING_AP`, `AP_REFRESH_CADENCE`, `ApRefreshCadence` across `src/`) — hits confined to `src/hunt/config.ts` (definitions), `src/hunt/actionPoints.ts` (imports/comments), `src/hunt/index.ts` (barrel re-export), and the two test files. No bare literal `6` or `'perHand'` outside those.

## Note for future consumers

Future AP-spending code should call `apCostFor` / `canAffordAp` / `spendAp` rather than reading `AP_ENABLED` directly, per AC2 — that is the single place the toggle is honoured.
