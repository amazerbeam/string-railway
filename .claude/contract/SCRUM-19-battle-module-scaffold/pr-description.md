# SCRUM-19 — Battle module scaffold and shared game-state types

Plan: [`.claude/contract/SCRUM-19-battle-module-scaffold/plan.md`](./plan.md)

## Summary

Establishes `src/warCouncil/`, `src/vanguard/`, and `src/battle/` as the module layout for the SCRUM-18 epic. Adds shared `BattlePhase` (a four-state const map covering War Council round, Muster conversion, The Clash, and Breach/resolved) and `BattleState` (a top-level interface referencing each engine's own state rather than duplicating it), plus a pure-core ESLint boundary (`no-restricted-imports` / `no-restricted-globals`) scoped to the two engine folders. No engine logic, CPU logic, or React/UI code is added — this is types and folders only, per the ticket's own AC5.

## Notes for the developer

- **`BattleState` is deliberately minimal.** It holds only `phase`, `warCouncil`, and `vanguard` — no `round`, `dealer`, or `winner` field. This is intentional per the ticket's own stated risk (over-designing the shared shape before the engines it wraps exist). Later tickets (A1 War Council engine, A2 Vanguard engine, A6 Battle orchestrator) are expected to extend it — that's expected, not a defect in this ticket.
- **The pure-core ESLint boundary was established now, in this scaffold ticket, rather than deferred to A1/A2.** This is flagged in `plan.md` → *Risks and judgement calls* as the plan's biggest judgement call: AC5 says "types and folders only," and an `eslint.config.js` change is arguably neither, though it's also not logic, UI, or CPU code. If you'd rather A0 stay strictly folders-and-types with zero tooling changes, this override can be moved to A1/A2 — it's scoped cleanly to `src/warCouncil/**` and `src/vanguard/**` and can be lifted out in one diff.
- **For future contributors:** Muster conversion, The Clash, and Breach detection all belong inside `src/vanguard/`, not a separate `src/muster/` or `src/clash/` folder — per `CLAUDE.md`'s naming pointer ("within a round of the Vanguard: Muster, The Clash, The Breach").

## Verification (Phase 2 — Final verification)

All commands run from repo root, PowerShell on Windows.

- **Pure-core boundary grep** (`src/warCouncil/`, `src/vanguard/` — no React import, no DOM global): zero hits.
- **Stray-consumer grep** (`BattlePhase` / `BattleState` / `WarCouncilState` / `VanguardState` outside their own defining/re-exporting/testing files): zero hits.
- **Typecheck** — `npm run typecheck` — exit 0, no errors.
- **Lint** — `npm run lint` — exit 0, no errors.
- **Full suite** — `npm test` — `Test Files  2 passed (2)`, `Tests  3 passed (3)` (the pre-existing smoke test plus the two new `BattlePhase` assertions).
- **Production build** — `npm run build` — exit 0, `dist/index.html`, `dist/assets/index-CbmgodH0.css`, `dist/assets/index-PDNcSK7V.js` written, no bundler errors, built in 2.79s.

## Files changed

**Created:**
- `src/warCouncil/index.ts`
- `src/vanguard/index.ts`
- `src/battle/battlePhase.ts`
- `src/battle/battleState.ts`
- `src/battle/index.ts`
- `src/battle/__tests__/battlePhase.test.ts`

**Modified:**
- `eslint.config.js` — adds the pure-core boundary override for `src/warCouncil/**` and `src/vanguard/**`
