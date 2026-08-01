# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state — read this first

**The pipeline targets the browser prototype, not Unity.** String Railway is being prototyped as a static Vite + React + TypeScript app so the M6 fixed-length drag and the M2 geometry constants can be play-tested before the real game is built. Unity remains the long-term target; the Unity-shaped pipeline is parked verbatim at `.claude/workflow/unity/` with instructions for switching back. Do not mix the two — an `Assets/Scripts/` path in a Vite project is a planning defect.

**The app is scaffolded and empty of game logic.** SCRUM-8 landed on 2026-07-31. The repository contains:

- the Vite + React 19 + TypeScript app at the repo root — `package.json`, `src/`, `public/rules.json`, and the full toolchain
- `.claude/` — the `/fb-*` contract pipeline (commands, agents, skills, workflow references, shared rules) plus the parked Unity snapshot
- `.docs/Game_Rules/` — `Rules.pdf` (the source rulebook) and `Rules.md` (a complete, buildable extraction)

What that means for how you work here:

- **The gates are real and they run.** `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, and `npm run build` all exist and all pass on a clean tree. Never record one as `N/A` while TypeScript files are in the diff.
- **`src/rules/` holds no production module yet** — only `__tests__/scaffold.test.ts`. An empty `Glob src/rules/*.ts` is the current state, not a broken search. The geometry core is the first story to put logic there (§11 build order).
- **The tuning surface is `public/rules.json`, not the repo root.** It ships `configVersion: 1` with `geometry: {}` and `deck: {}` — deliberately value-free. `public/` is the only tree Vite copies into `dist/`, so a root-level file would 404 in a production build. Nothing reads it yet; the configuration story adds the loader.
- **The homepage is a placeholder.** `src/ui/AppShell.tsx` renders a heading and one line of prose. The board story replaces it.
- The scaffold pinned React 19.2.8, Vite 8.2.0, TypeScript 6.0.3, Vitest 4.1.10, ESLint 10.8.0, Prettier 3.9.6 — `README.md` is the authority, and `package.json` is the authority on script names.

`.claude/contract/` holds the plans in flight; finished ones move to `archive/`. `.claude/lessons/` collects corrections logged via `/fb-issue`.

## The single-source-of-truth rule

This project is deliberately organised so each fact is stated once. When something is wrong, **fix it where it is owned**, not at the call site that used it:

| Fact | Owner |
|---|---|
| Where code lives, runner commands, developer-owned work, correctness traps | `.claude/workflow/web-project.md` |
| Where plans live, slug grammar, how a command picks *which* plan | `.claude/workflow/plan-resolution.md` |
| Jira status vocabulary, what each `SCRUM` status means, which transitions the `/fb-*` commands automate | `.claude/skills/management-jira/SKILL.md` → *The SCRUM status model* |
| How to write React/TypeScript here — the `src/rules/` contract, colour-first keying, the drag hot path, tunables, testing posture | `.claude/skills/react-frontend/SKILL.md` + its `references/engineering-standards.md` |
| Project-wide domain constraints (save/move-log versioning, determinism, config schema) | `.claude/rules/<topic>.md` — currently empty; see its `README.md` |
| Game rules, geometry constants, deck composition, scoring resolution | `.docs/Game_Rules/Rules.md` |
| Migrating back to Unity — when to switch, what carries over, in what order | `.docs/Unity_Migration.md` |
| The parked Unity pipeline files and which one replaces which | `.claude/workflow/unity/README.md` |

A path or command restated in five files gets updated in four. The `/fb-*` commands and the four agents all reference these files rather than carrying copies — keep it that way. In particular, **do not restate the `react-frontend` skill's conventions in a plan or an agent prompt** — name the skill and let it be loaded.

## Commands

Everything runs in **PowerShell on Windows**. Chain with `;`, never `&&`. Backslash paths for the filesystem; forward slashes inside npm script names and Vitest filters.

Node and npm are on `PATH`. Nothing here needs a machine-specific `$env:` variable.

| To verify | Command |
|---|---|
| Types are sound (fast gate) | `npm run typecheck` |
| Lint is clean | `npm run lint` |
| Full test suite | `npm test` |
| One test file | `npx vitest run src/rules/__tests__/geometry.test.ts` |
| One test by name | `npx vitest run -t "<test name>"` |
| Production build | `npm run build` |

Four failure modes that are **not** code defects:

- **Vitest watch mode hangs forever.** Always use the `run` subcommand (`npx vitest run`, or `npm test -- --run`). A test command silent for a minute is in watch mode, not running a slow suite.
- **`npm run dev` never returns** — it is a server. Never run it in the foreground. The QA agent is the one exception and starts it *detached* to drive the app through the `chrome-devtools` MCP (`.claude/agents/qa.md` → Step 4.5); judging what it looks and feels like is still the developer's.
- **Missing `node_modules`** surfaces as `'vite' is not recognized` or `Cannot find module`. Run `npm ci`; do not edit source in response.
- **A TypeScript error in a test file is not a failing test** — Vitest reports a transform/collection error and that file's tests never run. Check for it before concluding anything about coverage.

Unlike a Unity project, **static analysis is real here**: `npm run lint` and `npm run typecheck` are required gates, not inventions. Never record them as `N/A` while TypeScript files are in the diff.

## Architecture: the `/fb-*` contract pipeline

The pipeline is the substantive structure in this repo. It is not a suggestion — the five commands and four agents cross-reference each other, and a change to one usually implies a change to a referenced file rather than to the command itself.

**The lifecycle:**

```
/fb-plan <brief>   → .claude/contract/<slug>/plan.md   (14 required sections, 2 parts)
                     ↓ AskUserQuestion approval gate — mandatory, never inferred from chat
                     → .claude/contract/<slug>/tasks.md (phased checklist, Status: PLANNED)
/fb-apply <slug>   → Implementer walks EVERY phase end-to-end
                     → [code-evaluator + defender + qa] in ONE parallel dispatch, once, at the end
                     → single combined fix pass → one verification round (max 2 rounds total)
/fb-issue <desc>   → fixes the skill/agent/command that caused a mistake, logs corrections.md
/fb-archive        → learnings → .claude/lessons/<slug>.md, plan → .claude/contract/archive/<slug>/
/fb-report         → debug the pipeline itself: delegation flow, friction, wasted rounds
```

**Load-bearing properties:**

- `tasks.md` owns plan status via its first `^Status:` line (`PLANNED` / `IN PROGRESS` / `COMPLETE` / `BLOCKED`). There is no index or registry — a second source of truth drifts.
- Slugs take the **Jira key** when the work has one (`SCRUM-8-scaffold-vite-app`) and the **date branch** (`YYYY-MM-DD-kebab-title`) otherwise. `specs` and `archive` are reserved folder names.
- **File paths are owned by tasks, not by `plan.md`.** Each `### Task N:` carries its own `**Files:**` block (Create / Modify / Delete / Test / Config) — that block is the authoritative file list for the Implementer, and nothing outside its union may be touched.
- **Reviewers never run between phases.** Per-phase review was deliberately removed; the Implementer carries quality through all phases, writing and running tests as tasks dictate.
- The Implementer runs only scoped Vitest runs plus `npm run typecheck`, batched into one block per phase. **The unfiltered suite and the production build belong to QA alone**, once, at the end.
- The four agents have isolated context. Everything they need goes in the dispatch prompt — never assume an agent remembers a prior phase.
- One preflight check happens before the first dispatch: dependencies are installed, or the contract's first task installs them.

**The pause condition.** Some answers live in a human's eyes and hands. Reaching one of these stops the pipeline — the developer decides, then work resumes:

Whether the drag feels right (M6) · whether the game is any good · **changing a value in `rules.json`** · replacing M17 with the real deck composition · resolving a rulebook ambiguity or overturning a `[MADE UP — M#]` decision · approving a new dependency · visual and copy judgement · anything needing *judgement* of the app running. QA drives the app in a real browser now, so a functional question with a right answer ("does the score read `+2 −1`") is QA's, not a pause; a question of feel is still a pause.

Nobody in this pipeline decides a tuning value or a rule reading on their own authority. Code reads `rules.json`; the developer chooses what is in it.

## Code conventions

**`.claude/skills/react-frontend/SKILL.md` is the authority** — it holds the MUST/NEVER contract, the stack, the layout, and the success criteria, with general standards in `references/engineering-standards.md`. Read it before writing or editing anything under `src/`. Invoke it via the `Skill` tool; do not work from a remembered summary of it.

The five that matter most, restated here only because every reviewer enforces them:

- **`src/rules/` is pure.** No `react`, no `react-dom`, no DOM globals. It is plain TypeScript that runs under Vitest with no DOM, and a lint rule fails the build if that breaks. This is the boundary the whole epic rests on (SCRUM-8 criterion 4) — cheap now, expensive to retrofit.
- **Components never adjudicate rules.** A component may ask `src/rules/` whether a placement is legal; it may never decide. All state change goes through the reducer as `(state, move) => state`, and the move log is the only history.
- **Key every limit, marker trigger, and connection map on `ColourId`, never `PlayerId`.** §9 makes each colour a separate player for all purposes. `owner: PlayerId` exists solely for game-end score summing. Both are strings, so nothing but review catches the mix-up.
- **Every tunable is read from `rules.json`** — string lengths, card size, border perimeter, tolerance, deck composition. A literal `350` or a deck count in source *or in tutorial copy* is a defect (M2, M17).
- **Seed everything random.** `Math.random()` in setup generation is a defect: a board that cannot be regenerated cannot be debugged.

And the toolchain habits that keep verification honest:

- Strict TypeScript. An `any` needs a stated reason in the summary.
- Every listener, observer, timer, and `requestAnimationFrame` created in an effect is released in that effect's cleanup — an orphan leaks and double-fires after the next mount.
- No module-level mutable state without an explicit reset; it survives HMR and leaks between tests in one file.
- Files over 400 lines are blocking — measure with `(Get-Content <file> | Measure-Object -Line).Lines`, don't estimate.
- No `memo` / `useMemo` / `useCallback` without profiling evidence; no second state manager; no backend, API client, or remote call. The only fetch is `rules.json`.
- No `console.log` / `console.debug` in shipped code.
- Tests: **Vitest**. `src/rules/__tests__/` for rules-engine specs, which need no DOM. Component tests query by accessible role and label. The page-7 worked example (§5.4) is the canonical scoring test and stays green.
- **Never claim a test passed without running it.** Vitest is wired — run it and report the numbers, or say plainly that you did not.

## Game domain

`.docs/Game_Rules/Rules.md` is the buildable spec for **String Railway** — a 2–5 player dexterity/spatial game, exactly 5 turns per player, played inside a loop of string rather than on a board. Read it before any gameplay work; the sections below are the ones code depends on.

Turn structure is fixed: draw and place a station → place one railway string → score. Scoring is `+` connection bonus per newly-connected station (black value if you were the first player to connect, grey otherwise) and `−1` per transversal crossing of a previously-placed string, with crossings on top of a station card free.

**Where implementation detail already exists** — do not re-derive it:

- §10 — data model (`GameState`, `ColourSeat`, `StationCard`, `PlacedStation`, `PlacedPath`)
- §10.1 — the geometry predicates everything else rests on
- §10.2 — string-placement validation, in reject order
- §10.3 — scoring resolution, in pseudocode
- §10.4 — the turn loop, including the Rural extra-draw chain cap
- §11 — the suggested build order: geometry core (tested standalone) → static setup → station placement → the fixed-arc-length string drag → scoring → turn loop → special stations → 2-player variant

**The rulebook is silent on a lot, and every invention is flagged.** `[MADE UP — M#]` markers point at §14, the index of all 17 invented decisions with confidence ratings. Treat these as tuning values, not rules:

- **M6 is the decision that defines the game.** A placed string's arc length must equal its nominal length within ±2% — a physical string cannot stretch and coiling the slack would self-intersect. This is what makes it a spatial puzzle rather than a free-draw, and whether it *feels* right is the question the prototype exists to answer.
- **M2 (geometry constants) and M17 (deck composition) are the two biggest difficulty levers.** Both live in `rules.json`, never in code. M17 is the one made-up value with a definitive real answer — count the physical cards and replace the table.
- §12 maps observed symptoms back to the specific made-up value that is probably wrong. Consult it before inventing a fix — and remember that acting on it means changing `rules.json`, which is the developer's call.

Verify any scoring implementation against the rulebook's page-7 worked example, cited in §5.4: `+3` Scenic inside the mountain, `+2` for a first connection, `−1 −1` for two mountain crossings, nothing for a crossing on top of a station card → net `+3`. It settles two rules the prose leaves ambiguous: terrain strings count as "previously placed strings", and each crossing point counts separately.

## Skills

Glob `.claude/skills/*/SKILL.md` to see what actually exists — never classify against a remembered roster. Currently present:

| Skill | Owns |
|---|---|
| `react-frontend` | anything under `src/` — the `src/rules/` boundary, the SVG board, the drag, the reducer, tunables, Vitest coverage |
| `management-jira` | creating and transitioning Jira tickets |
| `skill-creator` | writing a new skill |

**`react-frontend` applies to virtually every code task in this repo**, so `Skill: react-frontend` is the normal value in a task, not `none`. Reserve `Skill: none — <reason>` for genuinely non-code work: a spec document, a Jira-only task, a decision hand-off to the developer. Never name a skill that does not resolve to a real file on disk; a plan that tells the executor to invoke a missing skill wastes a turn.
