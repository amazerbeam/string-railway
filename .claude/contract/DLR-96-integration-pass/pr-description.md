# DLR-96 — Integration pass: shop, flask, Apply Damage and quick-kill payout together

Plan: [`plan.md`](./plan.md)

## Summary

Verifies DLR-89 through DLR-95 compose as one run economy. The plan's static audit found the
composition already correct across `bank.ts`, `run.ts`, and `runTransitions.ts` — this contract
closed the concrete gaps that audit identified rather than re-litigating the mechanics:

- **AC2** (`src/hunt/__tests__/run.integration.test.ts`) — every epic-added `RunState` field
  populated at once, carried through `recordEncounter` → `advanceRun`, confirming run-scoped
  fields (`whetstones`, `cheats`, `coins`, `flaskCharges`) survive the fight boundary while
  encounter-scoped fields (`handOfFight`, `poisonGuardHeld`, `encounter.winner`) reset.
- **AC3** (`src/warCouncil/__tests__/bank.integration.test.ts`) — a forced cash-out pays against
  the Whetstone-*boosted* bank, not the bare figure, exercised through the real
  `buyFromShop` → `bankClimbBonusFor` → `resolveTrickBank` → `forcedCashValue` call chain rather
  than a hand-set `RunState` field.
- **AC1** — QA drove a full run through the five-point playthrough (every shop category purchase,
  a flask drink, a stage-boss kill with flask refill, a voluntary Apply Damage, a quick-kill
  payout). The `chrome-devtools` MCP tool was not available in the Implementer's Phase 2 dispatch,
  so a Playwright-driven script against the same running dev server substituted for it (no new
  project dependency — Chromium was fetched as a one-time tool outside `package.json`).
  - **3 of 5 touchpoints confirmed live, with zero console errors and no interface mismatch
    found:** shop purchases across the Cheat, Envenom, and Poison Guard categories; a flask drink;
    and a voluntary Apply Damage.
  - **The remaining 3 were not reached live in three ~4–5 minute automated attempts:** a
    *specifically* Whetstone shop purchase, a stage-boss kill with flask refill, and a quick-kill
    payout. Coverage for these three instead rests on the pre-existing and Phase-1 pure-logic
    tests (including this contract's own `bank.integration.test.ts`, which exercises the
    Whetstone + forced-hit path directly). This gap is escalated to the orchestrator as a
    developer judgement call, per the plan's own stated risk — not silently marked as passed.
- **AC4** — no interface mismatch was found by either the static audit or the live playthrough
  portion that was reached; no contingent fix was needed.
- **AC5** — full static gates and test suite pass; see Verification below.

## Developer decisions needed

- **(a) Live-playthrough coverage:** whether the 3-of-5 confirmed touchpoints (with the other 3
  covered only by pure-logic tests, per above) is acceptable, or whether QA should retry with real
  `chrome-devtools` MCP tooling to reach the Whetstone purchase, stage-boss/flask-refill, and
  quick-kill payout live.
- **(b) Payout figures:** none of the payout figures observed during the live playthrough (or
  computed by the new composition tests) looked too large or too small — Phase 2's report flagged
  nothing as surprising.

## Verification (this phase, real output)

| Check | Result |
|---|---|
| `npx vitest run --project node` | PASS — 759 tests, 50 files |
| `npx vitest run --project dom` | PASS — 198 tests, 24 files |
| `npm run typecheck` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0 |
| `npm test` (unfiltered) | PASS — `Test Files  74 passed (74)`, `Tests  957 passed (957)`, 0 failed |
| `npm run build` | PASS — exit 0, `dist/` written (`index.html`, CSS 34.80 kB, JS 253.76 kB gzip 78.11 kB), no bundler errors |

957 = 759 + 198, meeting the plan's stated minimum of `757 + 198 + 2`.

## Convention note

This ticket added no new convention — it exercises the convention DLR-89 through DLR-95 already
established.
