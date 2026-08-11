# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state — read this first

**This is a Vite + React 19 + TypeScript prototype with a working POC on disk.** `src/` holds 53 source files across four modules — `app/` (React screens and the app shell), `warCouncil/` (the card-layer engine), `styles/`, and `__tests__/` — plus `App.tsx` and `main.tsx` at the root. 19 of those files are tests.

**The POC implements the project's previous design direction.** The live design is `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md`. The POC code and its per-module record in `.docs/implementation/` are retained as a working reference — not as a description of where the game is going. The superseded direction's design documents, its art tree, and its build contracts were retired on DLR-45.

Everything removed is fully recoverable — nothing was force-pushed, no branch was deleted, and no history was rewritten. Any file can be restored with:

```
$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git show <commit>:<path>
```

commit `2cf7ec7` on `origin/master` is the last commit before the 2026-08-01 removal of an earlier prototype.

`.claude/contract/` holds the plans in flight; finished ones move to `archive/`. `.claude/lessons/` collects corrections logged via `/fb-issue`. `.docs/implementation/` holds one folder per `src/` module — living, cumulative documentation of how the shipped code actually works (responsibilities, key exports, the mechanics behind each rule, enforced invariants), maintained by the `implementation-doc-writer` skill and updated on every `/fb-apply` run, never by hand. It answers "how does X actually work" or "what's been built so far" without re-reading old contracts — see that skill's `SKILL.md` for the folder's internal shape.

## The single-source-of-truth rule

This project is deliberately organised so each fact is stated once. When something is wrong, **fix it where it is owned**, not at the call site that used it:

| Fact | Owner |
|---|---|
| Where code lives, runner commands, developer-owned work, correctness traps | `.claude/workflow/web-project.md` |
| Where plans live, slug grammar, how a command picks *which* plan | `.claude/workflow/plan-resolution.md` |
| Jira status vocabulary, what each board status means, which transitions the `/fb-*` commands automate | `.claude/skills/management-jira/SKILL.md` → its status-model section |
| Jira label vocabulary — the closed layer set (`ui` / `engine` / `infra` / `design` / `spike`) and the `playable` marker | `.claude/skills/management-jira/SKILL.md` → its label-vocabulary section |
| How to write React/TypeScript here — conventions, tunables, testing posture | `.claude/skills/react-frontend/SKILL.md` + its `references/engineering-standards.md` |
| How a game screen is laid out and operated — viewport shell, zoning, interaction cost, navigating a collection of controls | `.claude/skills/game-ux/SKILL.md` + its `references/full-viewport-layout.md` |
| Game design frameworks, designer research, the critique checklist | `.docs/design/design-principles.md` |
| What the game's rules currently are, and which are still undecided | `.docs/game_rules/the-hunt.md` — see the three-doc split below |
| How implemented code actually works — per-module mechanics, key types, enforced rules | `.claude/skills/implementation-doc-writer/SKILL.md`, output in `.docs/implementation/` |
| Project-wide domain constraints | `.claude/rules/<topic>.md` — currently empty; see its `README.md` |

A path or command restated in five files gets updated in four. The `/fb-*` commands and the four agents all reference these files rather than carrying copies — keep it that way. In particular, **do not restate the `react-frontend` skill's conventions in a plan or an agent prompt** — name the skill and let it be loaded.

### The three docs about the game, and the question each answers

The game itself is documented three times, deliberately, because these are three different questions and answering them in one file means the answer to each drifts. Before writing about the game anywhere, work out which question you are answering:

| Doc | Owns | Answers |
|---|---|---|
| `.docs/game_rules/the-hunt.md` | The playable procedure as it currently stands | "What are the rules?" |
| `.docs/design/…/hybrid-design.md` | Why each rule exists, the discarded branches, §9's open forks | "Why this rule?" |
| `.docs/implementation/<module>/` | What the code does, per module | "How does the code do it?" |

Two consequences worth stating, because both are easy to get wrong:

- **`the-hunt.md` is the ruleset, not a changelog.** It is organised in playing order, marks every rule `[settled]` / `[provisional]` / `[open]` / `[not built]`, cites `hybrid-design.md §N` rather than reproducing its reasoning, and names no functions outside its Status register. `implementation-doc-writer` owns it and `/fb-apply` updates it every run that changes a rule — never edit it by hand, and never add a per-ticket section to it.
- **`.docs/game_rules/fox-in-the-forest.md` is not part of this split.** It is the base game's published rulebook, transcribed, and it is a fixed reference — nothing in the pipeline maintains it.

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
                     ↓ UI-classified work only: .claude/contract/<slug>/mockup.html — interactive, its own AskUserQuestion approval gate
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
- Slugs take the **Jira key** when the work has one (`DLR-45-retire-old-design-documentation`) and the **date branch** (`YYYY-MM-DD-kebab-title`) otherwise. `specs` and `archive` are reserved folder names.
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
| `game-ux` | the game-screen layer — full-viewport no-scroll layout, zoning, interaction cost, keyboard navigation of a hand or board |
| `implementation-doc-writer` | maintaining `.docs/implementation/` — per-module docs on how shipped code actually works — and `.docs/game_rules/the-hunt.md`, the game's current ruleset |

**`react-frontend` applies to virtually every code task in this repo**, so `Skill: react-frontend` is the normal value in a task, not `none`. Reserve `Skill: none — <reason>` for genuinely non-code work: a spec document, a Jira-only task, a decision hand-off to the developer. Never name a skill that does not resolve to a real file on disk; a plan that tells the executor to invoke a missing skill wastes a turn.
