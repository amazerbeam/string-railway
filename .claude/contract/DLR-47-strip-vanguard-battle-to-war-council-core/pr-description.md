# DLR-47 — Strip the Vanguard and battle-loop layers back to the War Council core

Plan: [plan.md](plan.md)

## Summary

Retired the Vanguard board engine, the battle-loop orchestrator, and their UIs — everything built
for the previous hex-board/battle-loop design direction that `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md`
superseded. `src/App.tsx` now mounts a single War Council round directly via
`src/warCouncil/deal.ts` and `src/app/warCouncil/WarCouncilRound.tsx`, restarting with a fresh deal
(dealer alternating by round parity) on completion. `TRICKS_PER_ROUND` — previously a duplicated
bare `13` literal in two files and a separate constant in a now-deleted module — is consolidated
into a single exported constant in `src/warCouncil/types.ts`. The five docs describing the deleted
modules are gone; `README.md`, `app.md`, `war-council.md`, and `war-council-ui.md` are updated to
match what's actually on disk. `CLAUDE.md`'s "Game naming" section (vocabulary that belonged to the
deleted modules) is removed, and its stale file/module counts — along with
`.claude/workflow/web-project.md`'s — are corrected.

Every later ticket in the DLR-46 epic now builds on one game instead of maintaining a second one it
doesn't touch.

## Before / after test counts

| | Test files | Tests |
|---|---|---|
| Before (baseline, measured at planning time) | 54 | 410 |
| After (measured by QA, final) | 19 | 187 |

The drop is attributable entirely to deletion: the removed Vanguard/battle-loop trees carried their
own test suites, and the one net addition — `src/app/dealerForRound.ts`'s 2-test unit spec — is the
only new test this contract introduces. `src/warCouncil/`'s own test files (`deal.test.ts`,
`playCard.test.ts`, `types.test.ts`) were deliberately left unmodified throughout, and re-ran
unchanged (19/19 passing) as the proof the `TRICKS_PER_ROUND` consolidation altered no behaviour.

## Developer decisions still open

- **`src/app/dealerForRound.ts`'s `FIRST_DEALER` placeholder** (`PlayerSide.Player`) — carried
  forward verbatim from the deleted `src/battle/config.ts`'s equivalent placeholder. Confirm keep,
  flip, or randomize.
- **Whether `App.tsx`'s restart should alternate the dealer by round parity at all**, vs. always
  dealing from the same side — this plan's own design call, not a preserved behaviour from the
  deleted code.
- **Whether `App.tsx` deserves a render-level component test** beyond QA's browser-driven check —
  this contract scoped testing to the new pure `dealerForRound` helper only.
- **`.docs/implementation/war-council.md`'s "Deferred / not yet implemented" section** (lines
  ~230-247) still references retired Vanguard/battle-loop vocabulary and deleted file paths — all
  three reviewers confirmed this was explicitly out of Task 3.4's scope (which touched exactly two
  other sections of that file) and recommend a small follow-up ticket to bring it in line with the
  live design direction, rather than folding it into this contract.
- **CI passing on the branch** — no `gh` CLI access on this machine, so this is developer-owned per
  `.claude/workflow/web-project.md`. Every step `.github/workflows/ci.yml` runs was replicated
  locally and passed (lint, typecheck, test, build), which strongly predicts a green run.
- **Round-restart pacing/feel** — the auto-restart-on-completion behaviour is explicit placeholder
  scaffolding ahead of the real Hunt run loop (T9/T10 per the brief); worth a developer's own look
  via `npm run dev` before considering the pacing final.

## Verification results

- **Typecheck:** PASS — `npm run typecheck`, exit 0.
- **Lint:** PASS — `npm run lint`, exit 0, no warnings.
- **Format:** scoped `npx prettier --check` over all 15 files this contract touched — PASS. Repo-wide
  `npm run format:check` fails only on 4 pre-existing files under `.docs/design/`, untouched by this
  contract (known infrastructure gap, not this contract's scope).
- **Full test suite:** PASS — `npm test`, 19 files / 187 tests, 0 failed.
- **Production build:** PASS — `npm run build`, exit 0, `dist/` written, no bundler errors.
- **Live browser verification (QA, via `chrome-devtools` MCP):** `npm run dev` opens directly into a
  playable 13-trick War Council round — no mode-select screen, no hex board. Played a card through
  to trick resolution; trick counters updated correctly, console stayed clean throughout (load,
  interaction, and a full page reload/remount). Confirms AC 2.
- **Architectural boundary:** zero React/DOM/`localStorage` references inside `src/warCouncil/**` —
  the pure-core ESLint boundary holds with no behaviour change (AC 9).
- **Stale-reference sweep:** zero surviving references anywhere in `src/` to any identifier this
  contract deleted (`AppMode`, `isValidTricksWon`, `BattleHost`, `VanguardMountProps`, etc.), and
  zero lingering hard-coded `13` in `deal.ts`/`playCard.ts` where `TRICKS_PER_ROUND` now reads.

One review-round issue was found and fixed: `eslint.config.js`'s `no-restricted-imports` message
string still named the deleted `src/vanguard/` directory after its `files` glob was correctly
narrowed. Fixed to `'src/warCouncil/ is pure TypeScript — no React.'`; re-reviewed clean by all
three reviewers in round 2.

`src/App.tsx`'s round-restart is explicit placeholder scaffolding for the real Hunt run loop landing
in a later DLR-46 ticket (T9/T10 per the brief) — it tracks no score, no win condition, and no state
across rounds beyond dealer alternation.
