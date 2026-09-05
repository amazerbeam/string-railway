# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## How to talk to this developer

**Be short. Expand only when asked.** Lead with the answer in a sentence or two, and stop. The
developer will ask for detail if they want it — several small turns beat one long one. Cut every
table, heading and bullet list that is not doing real work.

**Never use a shorthand the developer has not used themselves without saying what it means.**
`AC11`, a bare ticket key, a config constant, a file path, an internal section number, a pipeline or
agent term — all of these are meaningless to them out of context. Say "the criterion about a card
showing both the skull and the bomb", not "AC11".

**One thing per turn.** If a turn explains something *and* needs a decision, split it: explain,
let them agree or push back, then ask. Bundling the two means disagreeing with half an answer is
awkward, and they have said so.

Two narrower rules extend this and still apply where they bite: design analysis goes in prose, with
the worked detail in `ideas.md` rather than in chat; and a buff or card name never appears bare —
say what it does the first time it comes up, since the names were agent-authored and carry no
intuition.

## Project state — read this first

**The repository holds two codebases, and `unity/` is the one being built.** `unity/` is the live game — a Unity 6 (6000.5.1f1) URP 2D project, on disk and opening in the editor. `prototype/` is the retained Vite + React 19 + TypeScript implementation — still runnable, still green — kept as an oracle, not as the thing under construction.

**New work goes to `unity/` and is written in C#.** The `unity-programmer` skill governs it. React and `prototype/src/` are oracle maintenance only: a change there is justified by keeping the reference implementation correct or by a seed-for-seed comparison against the Unity build, never by "this is where the game is built". A brief that would put new game behaviour in `prototype/src/` is a brief to question.

`prototype/src/` holds 271 source files across eight modules (measured DLR-121) — `app/` (React screens and the app shell), `warCouncil/` (the card-layer engine), `hunt/` (the Hunt configuration module and domain types), `persistence/` (cross-run save storage), `vault/` (cross-run meta-progression), `sim/` (the headless run simulator, lint-enforced pure), `styles/`, and `__tests__/` — plus `App.tsx` and `main.tsx` at the root. 139 of those files are tests.

**The prototype is kept as an oracle, not as an archive.** It is a working, measured, deterministic implementation of the game's rules, and the Unity port's own simulator is checked against it seed-for-seed — see `prototype/.docs/implementation/unity-port-architecture.md` §20.1. Do not treat it as legacy code to eventually delete.

**The prototype's design documents describe the prototype, not the game being built.** `prototype/.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` is the fullest statement of the previous direction — worth mining, and the reason its folder name and the "hybrid" label survive is history, not intent. It is **not** the live design. It describes mechanics the new build has not adopted and may never adopt, so never quote it as current, and never answer "what does the game do" from it.

**The live design is being written fresh, at the root `.docs/`, as each system is actually built.** It starts nearly empty. A rule that is not yet written there is undecided — not silently inherited from the prototype. The order of work is the order of the build: the core trick-taking loop first, up to a player playing a hand against a skull and damage changing hands, and nothing documented ahead of being built.

Everything removed is fully recoverable — nothing was force-pushed, no branch was deleted, and no history was rewritten. Any file can be restored with:

```
$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git show <commit>:<path>
```

commit `2cf7ec7` on `origin/master` is the last commit before the 2026-08-01 removal of an earlier prototype.

`.claude/contract/` holds the plans in flight; finished ones move to `archive/`. `.claude/lessons/` collects corrections logged via `/fb-issue`. `.docs/` at the repository root is the live game's documentation, written fresh against `unity/` as each system is built; `prototype/.docs/` is the prototype's own equivalent, complete and frozen as reference. `.docs/implementation/` holds one folder per module — living, cumulative documentation of how the shipped code actually works (responsibilities, key exports, the mechanics behind each rule, enforced invariants), maintained by the `implementation-doc-writer` skill and updated on every `/fb-apply` run, never by hand. It answers "how does X actually work" or "what's been built so far" without re-reading old contracts — see that skill's `SKILL.md` for the folder's internal shape.

## The single-source-of-truth rule

This project is deliberately organised so each fact is stated once. When something is wrong, **fix it where it is owned**, not at the call site that used it:

| Fact | Owner |
|---|---|
| Where code lives, runner commands, developer-owned work, correctness traps — the prototype | `.claude/workflow/web-project.md` |
| Where code lives, runner commands, developer-owned work, correctness traps — the Unity project | `.claude/workflow/unity-project.md` |
| Where plans live, slug grammar, how a command picks *which* plan | `.claude/workflow/plan-resolution.md` |
| Jira status vocabulary, what each board status means, which transitions the `/fb-*` commands automate | `.claude/skills/management-jira/SKILL.md` → its status-model section |
| Jira label vocabulary — the closed layer set (`ui` / `engine` / `infra` / `design` / `spike`) and the `playable` marker | `.claude/skills/management-jira/SKILL.md` → its label-vocabulary section |
| How to write C# for the live game — Unity conventions, allocation, data and event architecture | `.claude/skills/unity-programmer/SKILL.md` |
| How to write React/TypeScript in the retained prototype — conventions, tunables, testing posture | `.claude/skills/react-frontend/SKILL.md` + its `references/engineering-standards.md` |
| How a game screen is laid out and operated — viewport shell, zoning, interaction cost, navigating a collection of controls; and how feedback about a screen becomes a redesign | `.claude/skills/game-ux/SKILL.md` + its `references/full-viewport-layout.md` and `references/feedback-to-redesign.md` |
| The game's name, and the fiction and myth-sourcing behind every other name in it | `prototype/.docs/design/tech-duinn-lore.md` |
| Game design frameworks, designer research, the critique checklist | `prototype/.docs/design/design-principles.md` |
| What the game's rules currently are, and which are still undecided | `.docs/game_rules/the-hunt.md` — see the three-doc split below |
| How implemented code actually works — per-module mechanics, key types, enforced rules | `.claude/skills/implementation-doc-writer/SKILL.md`, output in `.docs/implementation/` |
| Project-wide domain constraints | `.claude/rules/<topic>.md`; see its `README.md` |

A path or command restated in five files gets updated in four. The `/fb-*` commands and the four agents all reference these files rather than carrying copies — keep it that way. In particular, **do not restate the `react-frontend` skill's conventions in a plan or an agent prompt** — name the skill and let it be loaded.

### The three docs about the game, and the question each answers

The game itself is documented three times, deliberately, because these are three different questions and answering them in one file means the answer to each drifts. Before writing about the game anywhere, work out which question you are answering:

| Doc | Owns | Answers |
|---|---|---|
| `.docs/game_rules/the-hunt.md` | The playable procedure as it currently stands | "What are the rules?" |
| `.docs/design/` | Why each rule exists, and the branches discarded on the way | "Why this rule?" |
| `.docs/implementation/<module>/` | What the code does, per module | "How does the code do it?" |

Two consequences worth stating, because both are easy to get wrong:

- **`the-hunt.md` is the ruleset, not a changelog.** It is organised in playing order, marks every rule `[settled]` / `[provisional]` / `[open]` / `[not built]`, cites the live design doc under `.docs/design/` rather than reproducing its reasoning, and names no functions outside its Status register. `implementation-doc-writer` owns it and `/fb-apply` updates it every run that changes a rule — never edit it by hand, and never add a per-ticket section to it.
- **`prototype/.docs/game_rules/fox-in-the-forest.md` is not part of this split.** It is the base game's published rulebook, transcribed, and it is a fixed reference — nothing in the pipeline maintains it.

### The four names a trick can have — use them in prose, not only in code

**This vocabulary carries forward; the mechanics it describes are the prototype's and are being
rebuilt.** The four names below are how this project talks about a trick, and they stay in use
because the distinction they draw is the one that keeps discussion honest. The specific numbers,
the pot arithmetic, and the buff behaviour underneath them describe `prototype/src/` — treat those
as the reference implementation's rules, decided again in the root `.docs/game_rules/the-hunt.md`
as each is actually built, not inherited by default.

A skull **inverts** a trick, so what you did and what you got come apart. Two facts, each with its
own word, combining into exactly four names:

- **Straight** and **Skulled** name the **trick** — whether a skull was played into it.
- **Victory** and **Loss** name the **outcome** and nothing else. A Victory banks; a Loss hurts.

The four, which `.docs/game_rules/the-hunt.md` owns once it is written:

| | Straight trick (no skull) | Skulled trick |
|---|---|---|
| **You took the cards** | **Straight Victory** — banks | **Skulled Loss** — you ate the skull; it hurts |
| **You did not** | **Straight Loss** — it hurts | **Skulled Victory** — the dodge; banks |

**Straight** and **Skulled** are also the adjectives for a trick on its own — a straight trick, a
skulled trick — so the vocabulary works before the outcome is known.

**High** and **low** survive as separate words for the **act**: whether the player took the cards.
High means winning the contest, trump included — not the higher numeral. The four outcome names no
longer carry that axis, and it is still the axis a buff condition reads, so a rule about going low
has to say "went low" rather than grouping two of the four names.

**These are the words to use everywhere, not only in shipped strings** — in conversation with the
developer, in a plan, in a ticket, in an agent dispatch prompt, and in a reviewer finding. "Win a
trick" is never an acceptable way to describe a Skulled Victory. A sentence about a trick either
names one of the four outcomes or says high or low.

**A Skulled Victory is a good outcome reached by going low.** Playing a 2 under a skulled 5 is the
correct play — no damage, and the trick banks. Damage on a skulled trick comes from going **high**
on it, never from going low.

**The prototype uses the older names.** `prototype/src/` and everything under `prototype/.docs/`
say High Victory, High Defeat, Low Victory and Low Defeat, and its code field is
`playerWentHigh`. That is the retained reference implementation and it is not being renamed. Read
across the mapping — Straight Victory was High Victory, Straight Loss was Low Defeat, Skulled
Victory was Low Victory, Skulled Loss was High Defeat — and use the new names in everything written
now.

### The prototype's buff pool is the prototype's, not a specification

The retained web build ships 19 mintable buff templates and keeps a further eight condition
families, two reward axes and five consumables as dead restoration paths. That whole arrangement —
which cards exist, which are cut, why Momentum was unsafe on one row — is documented in
`prototype/.docs/` and asserted by `prototype/src/hunt/__tests__/buffTemplates.test.ts`. Read it
as prior art when designing the equivalent for the live game.

**None of it is inherited.** The game being built has whatever buffs its own design gives it, decided
one at a time and written into the root `.docs/` as each ships. Do not describe a prototype card as
something the player can get, do not port one because it exists, and do not treat an older design
document listing charms, consumables or a 71-template pool as a backlog.

## Commands

Everything runs in **PowerShell on Windows**. Chain with `;`, never `&&`. Backslash paths for the filesystem; forward slashes inside npm script names and Vitest filters.

Node and npm are on `PATH`. Nothing here needs a machine-specific `$env:` variable.

### The prototype

Every command below runs from `prototype/`, not the repository root — `.claude/workflow/web-project.md` owns the exact form (including the `Push-Location prototype; …; Pop-Location` pattern used to avoid masking a failed exit code) and any path or command drift; fix it there, not here.

| To verify | Command |
|---|---|
| Types are sound (fast gate) | `npm run typecheck` |
| Lint is clean | `npm run lint` |
| Formatting is clean | `npm run format:check` |
| Full test suite | `npm test` |
| One test file | `npx vitest run src/__tests__/smoke.test.ts` |
| One test by name | `npx vitest run -t "<test name>"` |
| Production build | `npm run build` |

### The Unity project

The project exists on disk (Unity 6000.5.1f1, URP 2D, the input system, one sample scene). `.claude/workflow/unity-project.md` owns the layout, the assembly list and the runner commands. As of DLR-176 the fast gate (`dotnet test "unity\TechDuinn.FastGate.sln"`, needs the .NET 8 SDK) has actually been run and passes; the Unity batch-mode test and build commands it also documents remain unrun and unproven — treat a first invocation of either as unproven, and report what it actually printed rather than what it was supposed to print.

**The Unity editor is reachable live over MCP.** Unity's official MCP server ships in the `com.unity.ai.assistant` package and is registered with Claude Code as `unity-mcp`; the bridge is at Edit → Project Settings → AI → Unity MCP inside the editor. It exposes the running editor — console logs, the scene and GameObject tree, the asset database, the profiler, screenshot capture, and script editing. Two consequences: a question about the *live* editor should be answered by asking it rather than by inferring from files on disk; and its script-writing tools do **not** exempt anything from the `/fb-apply` rule below. A scene edit made through it lands in editor memory and reaches git only once the developer saves, so never treat an unsaved scene change as recoverable.

Four failure modes that are **not** code defects:

- **Vitest watch mode hangs forever.** Always use the `run` subcommand (`npx vitest run`, or `npm test -- --run`). A test command silent for a minute is in watch mode, not running a slow suite.
- **`npm run dev` never returns** — it is a server. Never run it in the foreground. The QA agent is the one exception, and only on a **requested** browser pass: it starts the server *detached* to drive the app through the `chrome-devtools` MCP (`.claude/agents/qa.md` → Step 4.5). **That pass is opt-in and off by default** — on an ordinary `/fb-apply` no server starts at all. Judging what it looks and feels like is the developer's either way.
- **Missing `node_modules`** surfaces as `'vite' is not recognized` or `Cannot find module`. Run `npm ci`; do not edit source in response.
- **A TypeScript error in a test file is not a failing test** — Vitest reports a transform/collection error and that file's tests never run. Check for it before concluding anything about coverage.

Static analysis is real here: `npm run lint` and `npm run typecheck` are required gates, not inventions. Never record them as `N/A` while TypeScript files are in the diff.

## Architecture: the `/fb-*` contract pipeline

The pipeline is the substantive structure in this repo. It is not a suggestion — the five commands and four agents cross-reference each other, and a change to one usually implies a change to a referenced file rather than to the command itself.

**Never write code outside `/fb-apply`.** Every change to `prototype/src/` — and to anything else the pipeline
owns — goes `/fb-plan <brief>` → the approval gate → `/fb-apply <slug>`. This holds however the
request is phrased: a bare "go", a "go" repeated several times, a task that looks small enough to
just do, and an urgent-sounding ask are all still `/fb-plan` first. The only exception is the
developer explicitly saying to work outside the pipeline for that piece of work.

Two things follow from this and are just as binding:

- **Do not pre-empt the plan's design decisions in chat.** Alignment, assumptions and open
  questions belong in `plan.md` Part 1 and are settled at the approval gate. A conversational
  back-and-forth that reaches those decisions first means the gate is rubber-stamping a
  conversation the plan folder does not record.
- **Reading is not writing.** Exploring the codebase to write a good brief or a good plan is fine
  and encouraged. Editing a file is not.

If code was written outside the pipeline, revert it and start at `/fb-plan` — do not retro-fit a
plan around work already on disk.

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

Visual and copy judgement · approving a new dependency · anything needing *judgement* of the app running · any tuning or design value that is the developer's to choose.

**The browser pass is opt-in and off by default** (`/fb-apply <slug> --browser`, or ask for it in the invocation). This shifts where the line falls: with no browser pass, a functional question that is only answerable at runtime routes to the developer with the exact interaction and expected outcome — that is correct, not a shortfall. When a browser pass *was* requested, a functional question with a right answer is QA's and filing it as manual verification is under-verification. A question of feel is always a pause, either way.

Whether or not a browser pass runs, QA always records **what a browser would have checked**, so the developer's eyes-on list is an agenda rather than an open-ended hunt.

Nobody in this pipeline decides a tuning value or a design reading on their own authority.

## Code conventions

**`.claude/skills/unity-programmer/SKILL.md` is the authority for the live game** — read it before writing or editing anything under `unity/`. `.claude/skills/react-frontend/SKILL.md` is the authority for the retained prototype — it holds the MUST/NEVER contract, the stack, the layout, and the success criteria, with general standards in `references/engineering-standards.md`; read it before touching anything under `prototype/src/`. Invoke either via the `Skill` tool; do not work from a remembered summary.

The rules below are the **prototype's** toolchain rules, restated here because every reviewer enforces them on work in that tree. They do not describe C# — `unity-programmer` owns the equivalents for `unity/`, and applying a React rule to a Unity file is a category error:

- Strict TypeScript. An `any` needs a stated reason in the summary.
- Every listener, observer, timer, and `requestAnimationFrame` created in an effect is released in that effect's cleanup — an orphan leaks and double-fires after the next mount.
- No module-level mutable state without an explicit reset; it survives HMR and leaks between tests in one file.
- Files over 400 lines are blocking — measure with `(Get-Content <path>).Count`, don't estimate. (`Measure-Object -Line` undercounts — it drops blank lines and hid a real breach on DLR-63; `.claude/workflow/web-project.md` is the authority on this.)
- No `memo` / `useMemo` / `useCallback` without profiling evidence; no second state manager; no backend, API client, or remote call.
- No `console.log` / `console.debug` in shipped code.
- Tests: **Vitest**. Component tests query by accessible role and label.
- **Never claim a test passed without running it.** Vitest is wired — run it and report the numbers, or say plainly that you did not.

## Skills

Glob `.claude/skills/*/SKILL.md` to see what actually exists — never classify against a remembered roster. Currently present:

| Skill | Owns |
|---|---|
| `unity-programmer` | anything under `unity/` — the live game |
| `react-frontend` | anything under `prototype/src/` — the retained reference implementation |
| `management-jira` | creating and transitioning Jira tickets |
| `skill-creator` | writing a new skill |
| `game-designer` | critiquing and developing game designs; anything under `.docs/design/` |
| `game-ux` | the game-screen layer — full-viewport no-scroll layout, zoning, interaction cost, keyboard navigation of a hand or board; and turning play-session feedback about a screen into a redesign doc |
| `implementation-doc-writer` | maintaining `.docs/implementation/` — per-module docs on how shipped code actually works — and `.docs/game_rules/the-hunt.md`, the game's current ruleset |

**`unity-programmer` is the default for code work — it owns the codebase being built.** `react-frontend` owns `prototype/src/`, which is reference: naming it means the work is oracle maintenance, and a task naming it should be able to say why the change belongs in the reference implementation rather than in the game. Reserve `Skill: none — <reason>` for genuinely non-code work: a spec document, a Jira-only task, a decision hand-off to the developer. Never name a skill that does not resolve to a real file on disk; a plan that tells the executor to invoke a missing skill wastes a turn.
