# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state — read this first

**This is a Vite + React 19 + TypeScript prototype scaffold with no application code.** `src/` holds `main.tsx`, `App.tsx` (a placeholder component) and `styles/global.css`. There is one placeholder spec at `src/__tests__/smoke.test.ts`, which exists solely to keep `npm test` meaningful on an otherwise-empty suite.

A previous prototype lived in this repository and was removed on 2026-08-01. It is fully recoverable — nothing was force-pushed, no branch was deleted, and no history was rewritten. Any file from it can be restored with:

```
$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git show origin/master:<path>
```

commit `2cf7ec7` on `origin/master` is the last commit before removal.

**Do not describe an architecture the next prototype has not chosen.** No subfolder structure, module boundary, or configuration surface exists yet beyond the three files named above — those are decisions for whatever gets built here next, not facts to assume from a deleted predecessor.

`.claude/contract/` holds the plans in flight; finished ones move to `archive/`. `.claude/lessons/` collects corrections logged via `/fb-issue`.

## Game naming

The hybrid's two component games have in-fiction names — use them everywhere (design docs, code,
conversation) instead of the parent-game names: the Fox in the Forest card layer is the **War
Council**; the hex-board network-growth mechanic that replaces Hex is **The Vanguard**. Within a
round of the Vanguard: **Muster** (the move budget), **The Clash** (the action exchange), **The
Breach** (a solid base-to-base connection — the win condition). This is a naming pointer, not a
rules restatement — the mechanic itself is owned by `.docs/design/skirmish-board-replacement.md`.

## The single-source-of-truth rule

This project is deliberately organised so each fact is stated once. When something is wrong, **fix it where it is owned**, not at the call site that used it:

| Fact | Owner |
|---|---|
| Where code lives, runner commands, developer-owned work, correctness traps | `.claude/workflow/web-project.md` |
| Where plans live, slug grammar, how a command picks *which* plan | `.claude/workflow/plan-resolution.md` |
| Jira status vocabulary, what each `SCRUM` status means, which transitions the `/fb-*` commands automate | `.claude/skills/management-jira/SKILL.md` → *The SCRUM status model* |
| How to write React/TypeScript here — conventions, tunables, testing posture | `.claude/skills/react-frontend/SKILL.md` + its `references/engineering-standards.md` |
| Game design frameworks, designer research, the critique checklist | `.docs/design/design-principles.md` |
| How implemented code actually works — per-module mechanics, key types, enforced rules | `.claude/skills/implementation-doc-writer/SKILL.md`, output in `.docs/implementation/` |
| Project-wide domain constraints | `.claude/rules/<topic>.md` — currently empty; see its `README.md` |

A path or command restated in five files gets updated in four. The `/fb-*` commands and the four agents all reference these files rather than carrying copies — keep it that way. In particular, **do not restate the `react-frontend` skill's conventions in a plan or an agent prompt** — name the skill and let it be loaded.

## Commands

Everything runs in **PowerShell on Windows**. Chain with `;`, never `&&`. Backslash paths for the filesystem; forward slashes inside npm script names and Vitest filters.

Node and npm are on `PATH`. Nothing here needs a machine-specific `$env:` variable.

| To verify | Command |
|---|---|
| Types are sound (fast gate) | `npm run typecheck` |
| Lint is clean | `npm run lint` |
| Formatting is clean | `npm run format:check` |
| Full test suite | `npm test` |
| One test file | `npx vitest run src/__tests__/smoke.test.ts` |
| One test by name | `npx vitest run -t "<test name>"` |
| Production build | `npm run build` |

Four failure modes that are **not** code defects:

- **Vitest watch mode hangs forever.** Always use the `run` subcommand (`npx vitest run`, or `npm test -- --run`). A test command silent for a minute is in watch mode, not running a slow suite.
- **`npm run dev` never returns** — it is a server. Never run it in the foreground. The QA agent is the one exception and starts it *detached* to drive the app through the `chrome-devtools` MCP (`.claude/agents/qa.md` → Step 4.5); judging what it looks and feels like is still the developer's.
- **Missing `node_modules`** surfaces as `'vite' is not recognized` or `Cannot find module`. Run `npm ci`; do not edit source in response.
- **A TypeScript error in a test file is not a failing test** — Vitest reports a transform/collection error and that file's tests never run. Check for it before concluding anything about coverage.

Static analysis is real here: `npm run lint` and `npm run typecheck` are required gates, not inventions. Never record them as `N/A` while TypeScript files are in the diff.

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

Visual and copy judgement · approving a new dependency · anything needing *judgement* of the app running · any tuning or design value that is the developer's to choose. QA drives the app in a real browser now, so a functional question with a right answer is QA's, not a pause; a question of feel is still a pause.

Nobody in this pipeline decides a tuning value or a design reading on their own authority.

## Code conventions

**`.claude/skills/react-frontend/SKILL.md` is the authority** — it holds the MUST/NEVER contract, the stack, the layout, and the success criteria, with general standards in `references/engineering-standards.md`. Read it before writing or editing anything under `src/`. Invoke it via the `Skill` tool; do not work from a remembered summary of it.

The toolchain-level rules that survive with no application code, restated here only because every reviewer enforces them:

- Strict TypeScript. An `any` needs a stated reason in the summary.
- Every listener, observer, timer, and `requestAnimationFrame` created in an effect is released in that effect's cleanup — an orphan leaks and double-fires after the next mount.
- No module-level mutable state without an explicit reset; it survives HMR and leaks between tests in one file.
- Files over 400 lines are blocking — measure with `(Get-Content <file> | Measure-Object -Line).Lines`, don't estimate.
- No `memo` / `useMemo` / `useCallback` without profiling evidence; no second state manager; no backend, API client, or remote call.
- No `console.log` / `console.debug` in shipped code.
- Tests: **Vitest**. Component tests query by accessible role and label.
- **Never claim a test passed without running it.** Vitest is wired — run it and report the numbers, or say plainly that you did not.

## Skills

Glob `.claude/skills/*/SKILL.md` to see what actually exists — never classify against a remembered roster. Currently present:

| Skill | Owns |
|---|---|
| `react-frontend` | anything under `src/` |
| `management-jira` | creating and transitioning Jira tickets |
| `skill-creator` | writing a new skill |
| `game-designer` | critiquing and developing game designs; anything under `.docs/design/` |
| `implementation-doc-writer` | maintaining `.docs/implementation/` — per-module docs on how shipped code actually works |

**`react-frontend` applies to virtually every code task in this repo**, so `Skill: react-frontend` is the normal value in a task, not `none`. Reserve `Skill: none — <reason>` for genuinely non-code work: a spec document, a Jira-only task, a decision hand-off to the developer. Never name a skill that does not resolve to a real file on disk; a plan that tells the executor to invoke a missing skill wastes a turn.
