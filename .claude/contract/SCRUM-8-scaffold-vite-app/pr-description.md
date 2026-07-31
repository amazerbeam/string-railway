# PR: Scaffold the Vite + React + TypeScript application

**Jira:** [SCRUM-8 — Scaffold the Vite + React + TypeScript application](https://amazerbeam.atlassian.net/browse/SCRUM-8)
**Plan:** [`plan.md`](./plan.md) in this folder · execution detail in [`tasks.md`](./tasks.md)

## Summary

Scaffolds the String Railway browser prototype from the Vite `react-ts` template and fixes the one architectural decision the rest of the epic depends on: game logic lives in `src/rules/` as pure TypeScript with zero React or DOM access, enforced by an ESLint boundary rule that runs inside `npm run build`.

The scaffold was generated into a scratch directory (never in the repo root, never with `--overwrite`) and copied in, so `.claude/` and `.docs/` survived untouched. It then received: TypeScript strict mode in both project-reference configs; a minimal `AppShell` component replacing the Vite demo counter; a `public/rules.json` value-free tuning shell; Vitest configured with a `node` test environment and one passing placeholder spec under `src/rules/__tests__/`; Prettier plus an ESLint override that trips on any `src/rules/` file importing React or touching a DOM global (proved by deliberately tripping it with a throwaway probe, then deleting it); an extended `.gitignore`; a README covering install/run/test/build and the boundary rationale; and corrections to the three `.claude/` documents this scaffold made false (stack version numbers, the `rules.json` path moving under `public/`).

Resolved versions actually installed (read off disk, not transcribed from the plan):

- Node **v24.16.0**, npm **11.13.0**
- react **19.2.8**, react-dom **19.2.8**
- vite **8.2.0**
- typescript **6.0.3**
- vitest **4.1.10**
- eslint **10.8.0**
- prettier **3.9.6**

## Review fix-up (this pass)

Three items landed in this pass on top of the Phase 1–5 work: two Defender warnings against the ESLint boundary override, plus the one contract task (Task 16) Phase 6 had left unwritten.

- **`eslint.config.js` — widened the `no-restricted-globals` denylist.** It previously covered only `window`, `document`, `navigator`, `localStorage`. Added `fetch`, `sessionStorage`, `location`, `history`, `XMLHttpRequest`, `requestAnimationFrame`, `cancelAnimationFrame`, `alert`, `confirm`, `matchMedia`, `getComputedStyle`, `Image`, `Worker` — every browser-only global `globals.browser` exposes that a pure rules engine must never reach for. `setTimeout`/`setInterval`/`crypto` were deliberately left out: they exist in Node as well as the browser, so they are not DOM globals and restricting them would be a scope decision beyond criterion 4's wording. `languageOptions.globals` was **not** added to the override — inheriting `globals.browser` from the block above is exactly what makes `no-restricted-globals` fire at all.
- **`eslint.config.js` — widened the boundary override's glob** from `src/rules/**/*.ts` to `src/rules/**/*.{ts,tsx}`, so a `.tsx` file placed under `src/rules/` is no longer invisible to both restriction rules.
- **Re-proved the boundary fires**, mirroring Task 8 Step 3's inverted check: created `src/rules/__fix-probe.tsx` importing `react` and referencing `fetch`, ran `npm run lint`, confirmed a non-zero exit naming both `no-restricted-imports` and `no-restricted-globals` against that path, then deleted the probe and confirmed `npm run lint` returned to a clean exit 0 with no probe file left under `src/rules/`.
- **Wrote this file** (`pr-description.md`) to close out Task 16.

No other file was touched. The Code-Evaluator's approval and QA's all-pass verdict from the prior review round stand unchanged.

## Acceptance criteria

| # | Criterion | Evidence |
|---|---|---|
| 1 | `npm create vite@latest` (`react-ts`) produces a running app; `npm run dev` serves it; `npm run build` succeeds | `npm run build` → exit 0, `✓ 18 modules transformed`, `✓ built in 352ms`. **The `npm run dev` half is developer-verified** — no agent may start a non-terminating dev server; see "Developer decides or observes" below for the four things to check. |
| 2 | Folder structure separates concerns: `src/rules/`, `src/rules/__tests__/`, `src/ui/`, `App.tsx` at root | `src/rules/__tests__/scaffold.test.ts`, `src/ui/AppShell.tsx` + `AppShell.css`, `src/App.tsx` on disk as scaffolded in Tasks 4 and 6 |
| 3 | Vitest installed and configured; `npm test` passes at least one placeholder test in `src/rules/__tests__/` | `npm test` → `Test Files  1 passed (1)`, `Tests  1 passed (1)` |
| 4 | A lint rule (or equivalent) fails the build if `src/rules/` imports `react`, `react-dom`, or a DOM global | `eslint.config.js`'s `src/rules/**/*.{ts,tsx}` override, widened this pass; proved firing against both a `.ts` probe (Task 8) and a `.tsx` probe (this pass) — both non-zero exit, both rules named in the output |
| 5 | TypeScript strict mode; `npm run typecheck` reports no errors | `strict: true` in `tsconfig.app.json` and `tsconfig.node.json`; `npm run typecheck` → exit 0, no output |
| 6 | ESLint and Prettier configured and pass on the scaffolded source | `npm run lint` → exit 0; `npm run format:check` → "All matched files use Prettier code style!" |
| 7 | `.gitignore` covers `node_modules`, `dist`, local environment files | `.gitignore` extended in Task 9 with `.env`, `.env.*`, `!.env.example`, `coverage`, on top of the template's `node_modules`/`dist` |
| 8 | `README.md` covers install/run/test/build plus the `src/rules/` boundary paragraph | `README.md` — "Getting started" script table, "The `src/rules/` boundary" section |
| 9 | An empty but valid `rules.json` shell exists at the agreed path | `public/rules.json` — `configVersion: 1`, empty `geometry: {}` and `deck: {}`; `dist/rules.json` parses with `configVersion` → `1` after build, confirming the `public/` location survives into production |
| 10 | No backend, server, API route, or database dependency | `npm ls --depth=0 --omit=dev` → `react` and `react-dom` only (verified in Task 13 Step 3) |

## Developer decides or observes

Carried forward verbatim from `tasks.md`'s File map — nothing here was decided by an agent:

- **The localhost homepage — the headline deliverable, and the one thing only a human can confirm.** Both `npm run dev` and `npm run preview` are non-terminating servers, so no agent may start either. Run `npm run dev`, open the printed `http://localhost:5173`, and check four things: the browser tab reads **String Railway** (not "Vite + React + TS"); the page shows the `String Railway` heading and the one-line "Prototype shell…" placeholder; there is no Vite counter button, logo, or demo artwork left anywhere; and the browser console is clean — no 404, no React warning. Then `Ctrl+C`, run `npm run build; npm run preview`, and confirm the production build serves the identical page.
- **Whether `AppShell` should look like anything** — it ships as an `<h1>` and one line of prose, deliberately unstyled beyond spacing.
- **TypeScript `~6.0.2`** (resolved to `6.0.3` on disk) — the template's pin, while the registry's `latest` is `7.0.2`. Taken as-is to avoid an unrequested compiler major; overrule if you want the jump.
- **`erasableSyntaxOnly: true`** — a template default that forbids `enum` and `namespace` project-wide. Harmless against the skill's `as const` maps, but every later story inherits it.
- **Every value inside `public/rules.json`** — the M2 geometry constants and the M17 deck composition. The shell ships with `geometry: {}` and `deck: {}` and no invented number.
- **`CLAUDE.md` goes stale when this lands** — its "Project state — read this first" section says there is no application on disk, that `npm run typecheck` has nothing to run, and that an empty `Glob src/**` means the project is unscaffolded. All three become false. This contract does **not** touch it, because the approved `plan.md` scoped documentation corrections to three other files (`.claude/skills/react-frontend/SKILL.md`, `.claude/workflow/web-project.md`, `.claude/agents/defender.md`). Decide whether to fix `CLAUDE.md` now or let `/fb-archive` handle it.

## Verification results

**Phase 6 (QA-reported, this review round):**

- `npm test` → `Test Files  1 passed (1)` / `Tests  1 passed (1)`
- `npm run build` → exit 0, `✓ 18 modules transformed`, `✓ built in 143ms`
- `dist/` contains `index.html`, `assets`, `favicon.svg`, `rules.json`; `dist/rules.json` parses with `configVersion` → `1`
- `dist/index.html` carries `<title>String Railway</title>`; the bundle contains both `String Railway` and `Prototype shell`

**Re-confirmed in this pass, after the ESLint fix-up:**

- `npm run lint` → exit 0 (probe present: non-zero exit naming `no-restricted-imports` and `no-restricted-globals` against `src/rules/__fix-probe.tsx`; probe deleted, confirmed absent via `Get-ChildItem src\rules -Recurse -Filter "*probe*"` → no output)
- `npm run format` → all files "(unchanged)"; no path under `.claude/` or `.docs/` appeared in the output
- `npm run format:check` → "All matched files use Prettier code style!"
- `npm run typecheck` → exit 0, no output
- `npm test` → `Test Files  1 passed (1)` / `Tests  1 passed (1)`
- `npm run build` → exit 0, `✓ 18 modules transformed`, `✓ built in 352ms`
- `dist/rules.json` → `configVersion` → `1`; `dist/index.html` → `<title>String Railway</title>` matched; bundle contains both `String Railway` and `Prototype shell` (1 hit each)

## Conventions introduced (for future contributors)

- **`public/rules.json` is the tuning path**, not a repo-root `rules.json` — Vite only copies `public/` into `dist/`, so this is the location that survives a production build.
- **`npm test` runs once and exits** (`vitest run`); use `npm run test:watch` for interactive watch-mode work. Never run bare `npm test` expecting it to watch, and never run `vitest` directly without the `run` subcommand.
- **`npm run lint` runs inside `npm run build`** (`lint && tsc -b && vite build`), so the `src/rules/` boundary rule is a build failure, not an advisory.
- **`erasableSyntaxOnly` rules out `enum` and `namespace`** project-wide — use the `as const` object-map form for anything that would otherwise be an enum.
