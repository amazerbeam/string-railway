# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state — read this first

**There is no Unity project on disk yet.** The repository currently contains exactly two things:

- `.claude/` — the `/fb-*` contract pipeline (commands, agents, workflow references, shared rules)
- `.docs/Game_Rules/` — `Rules.pdf` (the source rulebook) and `Rules.md` (a complete, buildable extraction)

Consequences that change how you work here:

- `Assets/`, `Packages/`, `ProjectSettings/`, `*.sln` do **not** exist. Every path in `.claude/workflow/unity-project.md` is the *intended* layout, explicitly marked "assumed, not yet observed."
- `dotnet build` has no `.sln` to build. Unity generates it on first import. Until then the fast compile gate is unavailable — say so rather than reporting a failure.
- `Glob`/`Grep` over `Assets/**` returning nothing means the project is not bootstrapped, not that the search was wrong.
- The first substantive code contract has to create the Unity project itself. That is developer-owned Editor work (Unity Hub creates the project, writes `ProjectSettings/`, generates the `.sln`) — it cannot be done by file edits.

`.claude/contract/` is empty apart from `archive/` and `specs/`; `.claude/lessons/` is empty. No plan has ever been run.

## The single-source-of-truth rule

This project is deliberately organised so each fact is stated once. When something is wrong, **fix it where it is owned**, not at the call site that used it:

| Fact | Owner |
|---|---|
| Where code lives, runner commands, developer-owned Editor work, Unity correctness traps | `.claude/workflow/unity-project.md` |
| Where plans live, slug grammar, how a command picks *which* plan | `.claude/workflow/plan-resolution.md` |
| Project-wide domain constraints (save versioning, determinism, scene structure, asset loading) | `.claude/rules/<topic>.md` — currently empty; see its `README.md` |
| Game rules, geometry constants, deck composition, scoring resolution | `.docs/Game_Rules/Rules.md` |
| Project-wide code conventions | this file |

A path or command restated in five files gets updated in four. The `/fb-*` commands and the four agents all reference these files rather than carrying copies — keep it that way.

## Commands

Everything runs in **PowerShell on Windows**. Chain with `;`, never `&&`. Backslash paths.

The Unity Editor is not on `PATH`. Every CLI invocation goes through `$env:UNITY_EXE`, which the developer sets once per shell:

```powershell
$env:UNITY_EXE = "C:\Program Files\Unity\Hub\Editor\<version>\Editor\Unity.exe"
```

| To verify | Command |
|---|---|
| Code compiles (fast, no Editor lock) | `dotnet build StringsAndStations.sln` |
| EditMode tests | `& $env:UNITY_EXE -runTests -batchmode -projectPath . -testPlatform EditMode -testResults TestResults-EditMode.xml -logFile -` |
| PlayMode tests | same, with `-testPlatform PlayMode` |
| A single test class | append `-testFilter <Namespace.ClassName>` |

Three failure modes that are **not** code defects:

- `Multiple Unity instances cannot open the same project` — Unity holds an exclusive lock. The developer has the Editor open. Ask them to close it and re-run.
- Pass/fail lives in the `-testResults` **XML**, not in stdout. `-logFile -` streams a verbose Editor log full of benign warnings. Read the XML. Exit code 0 means every test passed.
- A compile error inside a test assembly appears as a run that produced **no results**, not as a failing test. The usual cause is a missing `.asmdef` reference.

There is **no lint script and no analyzer.** Never invent `dotnet format --verify-no-changes` or an analyzer gate.

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
- Slugs use the **date branch** (`YYYY-MM-DD-kebab-title`), not a Jira key: no issue tracker is wired up. `specs` and `archive` are reserved folder names.
- **File paths are owned by tasks, not by `plan.md`.** Each `### Task N:` carries its own `**Files:**` block (Create / Modify / Delete / Test / Asmdef) — that block is the authoritative file list for the Implementer, and nothing outside its union may be touched.
- **Reviewers never run between phases.** Per-phase review was deliberately removed; the Implementer carries quality through all phases, writing and running tests as tasks dictate.
- The Implementer runs only `-testFilter`-scoped runs and batches compile/test steps into one block per phase. **The unfiltered suite belongs to QA alone**, once, at the end.
- The four agents have isolated context. Everything they need goes in the dispatch prompt — never assume an agent remembers a prior phase.
- Two preflight checks happen before the first dispatch, not at phase 4: `$env:UNITY_EXE` is set, and the Editor is closed.

**The pause condition.** Some state lives in YAML that Unity owns and rewrites. Reaching one of these stops the pipeline — the developer clicks, then work resumes:

Inspector/`[SerializeField]` wiring · adding a scene to Build Settings · creating or assigning `ScriptableObject` instances · layers, tags, physics matrix, Input System action maps · art/audio import settings · anything needing observation of the running game · **re-saving prefabs/scenes/assets so a `[FormerlySerializedAs]` migration actually writes to disk**.

Nobody in this pipeline hand-edits a `.prefab`, `.unity`, `.asset`, `.meta`, or `ProjectSettings/` file. A wrong `fileID` or GUID corrupts silently.

## Code conventions

Read the nearest existing equivalent under `Assets/Scripts/` and match it. With no precedent yet, these are the defaults — and the reviewers enforce them:

- **Push logic out of `MonoBehaviour`.** A plain C# class with constructor-injected dependencies is EditMode-testable; the same logic in a component is not. The `MonoBehaviour` is a thin adapter: read Inspector values, forward, apply results. This is the highest-leverage habit here, because it caps how much of the codebase can ever be tested. A PlayMode test needed only because logic is trapped in a component is a design smell in the code, not a test problem.
- `[SerializeField] private` over `public` fields. Expose a read-only property if callers need the value.
- **`!= null` on `UnityEngine.Object` types — never `?.`, `??`, or `is null`.** `Object` overloads `==` so destroyed objects report as null; the null-propagating operators bypass the overload and see a live reference. `transform?.position` on a destroyed object throws.
- **A renamed `[SerializeField]` field needs `[FormerlySerializedAs("<old>")]`.** Without it, every prefab, scene object, and asset holding a value silently takes the default. That is data loss, not a refactor — and the values only migrate once the developer re-saves the affected assets.
- A `MonoBehaviour` class name must match its filename. Renaming one without the other unbinds the script from every instance.
- `Awake` for self-initialisation, `Start` for cross-object reads — `Awake` ordering across objects is not guaranteed.
- Every `+=` has a matching `-=` (`OnEnable`/`OnDisable`, or `Awake`/`OnDestroy`). An orphan is a leak *and* a latent fake-null exception.
- No allocation or lookups in per-frame paths: `GetComponent`, `Find`, LINQ, string concatenation, boxing, closures. Cache in `Awake`.
- Scale by the right delta — `Time.deltaTime` in `Update`, `Time.fixedDeltaTime` in `FixedUpdate`; physics forces belong in `FixedUpdate`.
- Reset static mutable state explicitly. Statics survive Play-mode exit with domain reload disabled and persist across EditMode tests in one run — the symptom is a test that passes alone and fails in the suite.
- Coroutines die with their host `GameObject` mid-body, skipping everything after the current `yield` including `finally`. Don't put teardown that matters only in a coroutine tail.
- **Names bound by string are invisible to the compiler**: Animator states and parameters, Input System actions, `SendMessage` targets, scene names, save-data keys, `Resources.Load` paths. Grep both sides of any rename that touches one.
- Tests: Unity Test Framework (NUnit 3). `Assets/Tests/EditMode/` by default; `Assets/Tests/PlayMode/` only where a frame loop, scene load, or coroutine is genuinely required. A test can only see a production assembly its `.asmdef` references — adding that reference is part of the task, not a follow-up.

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

- **M6 is the decision that defines the game.** A placed string's arc length must equal its nominal length within ±2% — a physical string cannot stretch and coiling the slack would self-intersect. This is what makes it a spatial puzzle rather than a free-draw.
- **M2 (geometry constants) and M17 (deck composition) are the two biggest difficulty levers.** Both belong in a config file, never in code. M17 is the one made-up value with a definitive real answer — count the physical cards and replace the table.
- §12 maps observed symptoms back to the specific made-up value that is probably wrong. Consult it before inventing a fix.

Verify any scoring implementation against the rulebook's page-7 worked example, cited in §5.4: `+3` Scenic inside the mountain, `+2` for a first connection, `−1 −1` for two mountain crossings, nothing for a crossing on top of a station card → net `+3`. It settles two rules the prose leaves ambiguous: terrain strings count as "previously placed strings", and each crossing point counts separately.

## Skills

Glob `.claude/skills/*/SKILL.md` to see what actually exists — never classify against a remembered roster. Currently only `skill-creator` and `management-jira` are present: **there are no domain skills.** `Skill: none — <reason>` in a task is the expected value, not an error. Never name a skill that does not resolve to a real file on disk; a plan that tells the executor to invoke a missing skill wastes a turn.
