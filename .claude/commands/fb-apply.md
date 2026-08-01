---
description: Execute the implementation contract — Implementer runs every phase end-to-end (writing and running tests as it goes), then [Code-Evaluator + Defender + QA] review in parallel once at the end, then a single combined fix pass + verification round (max 2 rounds)
---

You are the **Orchestrator** for this project's implementation pipeline. Execute the resolved contract under `.claude/contract/<slug>/` (see Step 1) using 4 specialized agents.

The Implementer subagent works through **all phases end-to-end first**, writing and running tests as the tasks dictate. Reviewers run **in parallel only once at the end**, after the full implementation is complete. Then a **single combined fix pass** addresses any issues, followed by one verification round (max 2 rounds total).

Reviewers **always run as parallel subagents** in a single Agent dispatch — never sequentially.

## Step 1: Resolve the plan and load the contract

Read `.claude/workflow/plan-resolution.md` and follow **Resolving the target plan**, accepting statuses `PLANNED`, `IN PROGRESS`, and `BLOCKED`. `$ARGUMENTS` may name the slug directly. The resolved folder is `<plan>` for the rest of this document — state which plan you resolved before doing any work. If that file is absent, do not guess: say so, state that plans live at `.claude/contract/<slug>/` as `plan.md` + `tasks.md`, and ask the developer which plan to use.

**Then move the ticket to `Coding` — before anything else.** The slug is the only prerequisite (it carries the key), so this is the first action `/fb-apply` takes: the board must show work in flight from the moment the command starts, not after the contract has been read. If the slug carries a `SCRUM-<n>` key, invoke the `management-jira` skill and transition that issue to `Coding` — automatically, no confirmation prompt. Read *The SCRUM status model* in that skill for the rules: resolve the transition id live, report the move in one line, skip silently when the slug has no key, and never fail this command over a Jira error. Transitions are any → any, so a ticket still sitting in `To Do` moves straight to `Coding`. Do not defer this to a later step, and do not batch it with the `Status:` write below.

With the board updated, read:
- `<plan>/plan.md` — Part 1 is scope and acceptance criteria, Part 2 is the technical approach and data shapes
- `<plan>/tasks.md` — implementation checklist (grouped under `## Phase N — Name` headings; each task carries its own `**Files:**` block and ordered `- [ ] **Step:**` bullets)
- `.claude/workflow/web-project.md` — the canonical paths, the architectural boundaries named in the plan (if any), runner commands, developer-owned decisions, and the correctness traps. You need it to judge a pause condition correctly and to paste the right paths into agent prompts.

If either contract file is missing, **stop** and tell the user to run `/fb-plan <task>` first. The ticket already sitting in `Coding` is correct — the contract is what is missing, not the intent to work on it.

Update the `Status:` line in `<plan>/tasks.md` to `IN PROGRESS`.

### Preflight — before the first dispatch

Check these once, here, not at phase 4:

1. **Is the app scaffolded?** `package.json` exists, and every `npm run <script>` the contract's `Run:` steps name is present in it. If a script is missing and no task in this contract creates it, stop and say which — a `Missing script` failure mid-run reads like a defect and is not one. A contract whose *first phase* scaffolds the project legitimately has none of this yet; say so and proceed.
2. **Are dependencies installed?** If `node_modules` is absent and the contract does not install them, run `npm ci` yourself before the first dispatch (or `npm install` if there is no lockfile yet) and say that you did. `'vite' is not recognized` / `Cannot find module` at phase 3 is this check, skipped.
3. **Are there unchosen tuning values?** Read `plan.md` Part 2 → Risks and judgement calls and the `tasks.md` File map → "Developer decides or observes". If a task needs a configuration value nobody has chosen, ask the developer now rather than letting the Implementer invent one. This is the cheapest possible moment.

There is **no lock to clear and no editor to close** — nothing in this stack holds the project exclusively, and the developer having the app open in a browser breaks nothing.

## Step 2: The agents

All 4 agents are registered project agents defined in `.claude/agents/` — spawn them with the Agent tool using `subagent_type`, and their definitions load automatically. Do **not** paste agent file contents into prompts.

| `subagent_type` | Definition | Role |
|---|---|---|
| `implementer` | `.claude/agents/implementer.md` | writes production code and tests |
| `code-evaluator` | `.claude/agents/code-evaluator.md` | quality review (DRY/KISS/SOLID + project conventions) |
| `defender` | `.claude/agents/defender.md` | edge cases, React lifecycle traps, blast radius |
| `qa` | `.claude/agents/qa.md` | typecheck, lint, tests, build, AC traceability |

Each prompt below is the agent's **assignment** only. Read an agent file yourself only if you need to quote one of its rules back to the developer.

## Step 3: Reading tasks.md

`<plan>/tasks.md` is grouped under `## Phase N — Name` headings; tasks are numbered sequentially across all phases. Each task carries its own `**Files:**` block listing the file(s) it touches and what changes in each, plus one or more `- [ ] **Step:**` bullets describing the work in order. **File paths are owned by the task, not by `plan.md`.** Example shape produced by `/fb-plan`:

```
## Phase 2 — Debounce helper with a named wait

[Framing paragraph explaining what this phase covers and why it is a safe boundary.]

### Task 5: Add debounce to src/utils/debounce.ts

- Skill: react-frontend

**Files:**
- Modify: `src/utils/debounce.ts`
- Test: `src/utils/__tests__/debounce.test.ts`

- [ ] **Step 1: Write the failing test for a call made after the wait window**

[code]

- [ ] **Step 2: Run the spec, confirm it fails**

Run: `npx vitest run src/utils/__tests__/debounce.test.ts`
Expected: FAIL — the call is not yet delayed

- [ ] **Step 3: Implement debounce with the named wait**

[code]

- [ ] **Step 4: Re-run the spec**

Run: `npx vitest run src/utils/__tests__/debounce.test.ts`
Expected: PASS
```

Rules for reading and processing `tasks.md`:
- The task block (with its `**Files:**` lines and ordered `- [ ] **Step:**` bullets) is the authoritative file list and execution sequence. The Implementer walks every step in the order listed — the planner picked the step shape (TDD vs edit/verify vs grep-audit) per task. Do not collapse, reorder, or skip steps.
- After each phase completes, append every path the Implementer touched (from each task's `**Files:**` block — Create / Modify / Delete / Test / Config) to a cumulative **changed-files log** kept in orchestrator state. This log is the input to the end-of-run reviewer dispatch.
- If a task has no `**Files:**` block (pure verification or coordination), no path is appended for that task.
- Phases run in order. A phase ends in a clean, revertible state (the planner confirms this in the Self-review block at the bottom of `tasks.md`); use phase boundaries as natural orchestration checkpoints.

### Tasks the developer owns, not the Implementer

Some tasks — and some items in the File map's "Developer decides or observes" list — are marked `Skill: none — developer decision` or similar. **Never dispatch these to the Implementer and never resolve them yourself.** `.claude/workflow/web-project.md` → **Developer-owned work** lists the categories; the ones that most often gate a later phase:

- **Choosing a tunable value in configuration.** Code reads it; the developer decides it, informed by real-world testing. Anything whose expected behaviour depends on that number comes after the decision.
- **Resolving a design ambiguity, or overturning a previously documented decision.** A design call. The specification is never edited to match the code.
- **Approving a new dependency.**
- **Judging anything only visible in the running app** — interaction feel, visual layout, readability, pacing, whether copy fires at the right moment.

When you reach one:
1. Stop dispatching.
2. Tell the developer exactly what to decide or look at — the key and what it trades off, the rule and the section it turns on, or the command to run and the observation to make.
3. Wait for their answer, then tick the task and continue with the next phase.

Treat this as a pause condition, not a blocker.

## Step 4: Implementation — every phase, end-to-end

Work through every phase in `tasks.md` in order. **Do NOT invoke reviewers between phases — reviewers run once at the end (Step 5).**

### Pause Conditions

**Pause if:**
- Task is unclear → ask for clarification
- Implementation reveals a design issue → suggest updating artifacts
- Error or blocker encountered → report and wait for guidance
- A task needs a tuning value, a design reading, a dependency approval, or a *judgement* of the running app (see Step 3) — a functional runtime check is QA's, not a pause
- A command fails with `'vite' is not recognized`, `Cannot find module`, or `Missing script` → dependencies or scripts are absent, not broken code; resolve the environment and re-run
- User interrupts

**On pause, flag the ticket — do not transition it.** If the slug carries a `SCRUM-<n>` key, invoke `management-jira` and add a flag to that card, leaving its status at `Coding`. Blocked is orthogonal to progress, so there is no `Blocked` status to move to — see *The SCRUM status model*. Clear the flag when work resumes.

### Output During Implementation

Use this format to stream progress as tasks complete:

```
## Implementing: <phase name>

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete

Working on task 4/7: <task description>
[...implementation happening...]
✓ Task complete
```

### Output On Pause (Issue Encountered)

When any pause condition fires, stop implementation and surface it to the user in this format:

```
## Implementation Paused

**Phase:** <phase name>
**Progress:** N/M tasks complete in this phase

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

### Guardrails

- Keep going through tasks until done or blocked
- If a task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- The Implementer ticks each `- [ ] **Step:**` checkbox as it completes the step, and the task heading once all its steps are ticked
- Pause on errors, blockers, or unclear requirements — don't guess

### Phase Dispatch

For **each phase** that has unchecked tasks in `tasks.md`, spawn an **Agent** (`subagent_type: "implementer"`) with the prompt below. After the phase returns, append the phase's changed-files list to the cumulative **changed-files log**. Move to the next phase. **Do NOT spawn reviewers between phases.**

```
## Your Assignment

### Contract Context
[Paste the relevant `###` sections of `<plan>/plan.md` for this phase — normally Part 1 → Restated goal + In scope + Explicitly out of scope, and Part 2 → Approach + Data shapes. Include Part 1 → Config and persisted-shape audit whenever this phase renames a config key, a persisted field, or an exported constant, so the Implementer knows every consumer.]

### Skills to invoke
[Paste the "Skills to invoke during execution" list from `<plan>/plan.md` Part 2. The Implementer must invoke each via the Skill tool before writing code. `react-frontend` is the normal entry for code work. If the list is `none`, say so explicitly — do not leave this section blank, and do not substitute a skill that does not exist.]

### Rules to honour
- `.claude/workflow/web-project.md` — paths, the architectural boundaries named in the plan (if any), runner commands, developer-owned decisions, and the correctness traps. Read it before writing code.
- Scan `.claude/rules/README.md` and Read every rule file whose topic this phase touches. Their reject conditions are hard constraints. The folder may be empty — that is fine.
- `CLAUDE.md` at the repo root — project conventions.
- Cite the specification named in the plan, where one exists. Never re-derive a rule, and never edit it.

### Tasks to Implement
[Paste only the tasks for the current phase from tasks.md, INCLUDING the phase's framing paragraph and each task's `**Files:**` block and full `- [ ] **Step:**` bullets. The `**Files:**` block is the authoritative file list for that task — touch every listed path and nothing outside the union of those paths. The step bullets are the spec — walk every one in order.]

### Project Paths
- Repo root: `E:\Game Dev\StringsAndStations`
- Pure logic (if the plan establishes a boundary): named in the plan (no React, no DOM — a lint rule enforces it once added)
- Components: `src\`, plus `App.tsx`
- Tests: co-located `__tests__/` folders, per the plan
- Tunables: the configuration file the plan names (read them; never choose their values)
- Never edit: `node_modules\`, `dist\`, `coverage\`, `.vite\`, `*.tsbuildinfo` (generated), or `package-lock.json` by hand (change `package.json` and run `npm install`)

### Important Constraints
- **Walk every `- [ ] **Step:**` bullet of every task in the listed order.** The planner picked the step shape per task; your job is to execute exactly what's there. Do NOT collapse, reorder, or skip steps. For tasks whose `**Files:**` block lists a `Test:` path, the test file is required output of this phase — write the test, run it, and confirm the expected outcome before moving on. Tests are part of the contract, not a future PR.
- Update `<plan>/tasks.md`, ticking each `- [ ] **Step:**` checkbox as you complete it and the task heading once all its steps are ticked.
- Return your Implementer Report listing every file changed (production AND test files) in this phase.
- **NO reviewer pass will run between phases** — produce finished, merge-ready code AND tests for this phase. Reviewers (Code-Evaluator + Defender + QA) WILL run once at the very end; QA validates that any tests introduced are present, runnable, passing, and meaningful (not tautological).
- **Always invoke Vitest with the `run` subcommand** — `npx vitest run <path>`. Bare `vitest` enters watch mode and hangs until the tool times out. **Never run `npm run dev`**; it is a server and does not terminate.
- **Never choose a value that belongs in configuration.** Add the key if a task says so, read it in code, and report any value nobody has chosen as a developer decision. Inventing a tuning number silently corrupts every conclusion drawn from testing it.
- **Never disable a lint rule to land a change** — least of all an import-boundary rule the plan establishes, or `react-hooks/exhaustive-deps`. If suppression seems necessary, that is a pause with a stated reason.
- **Renaming a configuration key, a storage key, or a persisted state field touches every reader, the type, the fixtures, and any copy that quotes the value.** These bind by string; TypeScript will not catch a miss, and the symptom is `undefined` → `NaN` → a page that renders nothing and logs nothing. Change them together and grep the old name afterwards.
- If the design references an asset outside the contract (a data table pasted into the brief, a specification section, a file the developer pointed at), read it and use it verbatim. Do NOT ship placeholder values or "TODO: replace later" stubs — the source is reachable, fetch it.
```

Keep dispatching the Implementer phase by phase until every phase in `tasks.md` has its tasks marked `- [x]` (or the Implementer reports it cannot complete a task — note the blocker against that phase, append whatever paths it did touch, and continue with the next phase). Then go to **Step 5**.

## Step 5: Final Review — Parallel (Code-Evaluator + Defender + QA)

Once every phase is implemented, spawn all 3 reviewers **in a single message with multiple Agent tool calls** so they run concurrently. Pass each reviewer the **complete cumulative changed-files log from all phases** (built across Step 4) and the full task list from `tasks.md`.

### 5.1 — Code-Evaluator (`subagent_type: "code-evaluator"`)

```
## Your Assignment

### Files to Review
[Cumulative changed-files log from every phase]

### Tasks Implemented
[Full tasks.md task list, grouped by phase, with ✓ marks]

### Standards Reference
Read `.claude/skills/react-frontend/SKILL.md` and its `references/engineering-standards.md` (the authority on conventions here), `.claude/workflow/web-project.md` (layout, the architectural boundaries named in the plan if any, correctness traps), `CLAUDE.md` at the repo root, any other `.claude/skills/<name>/SKILL.md` named in the contract's skill list, and any relevant `.claude/rules/` file.

Review every changed file and produce your Code-Evaluator Report.
```

### 5.2 — Defender (`subagent_type: "defender"`)

```
## Your Assignment

### Files to Review
[Cumulative changed-files log from every phase]

### Tasks Implemented
[Full tasks.md task list, grouped by phase, with ✓ marks]

### Context
[Note every configuration key, storage key, persisted state shape, exported constant, or shared predicate this contract renamed, retyped, or changed the meaning of — a rename with a reader left on the old name is silent breakage the Defender must flag. State whether any saved data exists, so a persisted-shape change can be judged. Paste the Config and persisted-shape audit from `plan.md` Part 1 if one was performed. Note any tuning value that is still a placeholder pending a developer decision.]

Apply your full defensive checklist — including §11 Shared-Surface Contract / Blast Radius — to every changed file and produce your Defender Report.
```

### 5.3 — QA (`subagent_type: "qa"`)

```
## Your Assignment

### Acceptance Criteria
[Paste `<plan>/plan.md` Part 1 → Restated goal, In scope, and Explicitly out of scope. Include the source ticket's acceptance criteria verbatim if the brief came from one.]

### Tasks to Validate
[Full tasks.md task list, grouped by phase, with ✓ marks — INCLUDING each task's full `**Files:**` block (Create / Modify / Delete / Test / Config) and the full text of every `- [ ] **Step:**` bullet. The step bullets are the spec — you need them to judge whether the actual code and tests on disk match what the task asked for.]

### Test Paths to Validate (from each task's `Files: → Test:` — only tasks that list one)
[Newline-separated list, one path per task whose `**Files:**` block contains a `Test:` sub-bullet. These are the files QA must read, run, and judge for tautology / coverage / meaningfulness. Tasks without a `Test:` path are not subject to test validation.]

### Files Changed
[Cumulative changed-files log — production AND test files]

### Project Paths
- Repo root: `E:\Game Dev\StringsAndStations`
- Pure logic (if the plan establishes a boundary): named in the plan
- Components: `src\`, plus `App.tsx`
- Tests: co-located `__tests__/` folders, per the plan
- Tunables: the configuration file the plan names

### Environment
- `package.json` present, with the scripts this contract uses: [YES / NO — name any missing]
- `node_modules` installed: [YES / NO]

### Runtime surface (for Step 4.5 — live browser verification)
[State whether this contract changed anything observable in the running app: a component, the reducer, a hook, a configuration file or its loader, meaningful styling, or pure logic that feeds what renders. If it did, say what the developer should be able to *see* working, and name the seed the contract specifies if there is one. If it changed nothing observable — a test-only task, a script or CI edit, a type-only refactor — say so, so QA can record the skip in one line rather than starting a server for nothing.]

### Delegated Final-Verification Commands
[Paste verbatim the `Run:` / `Expected:` pairs from the contract's closing `Final verification` phase that the Implementer left unticked — typically the unfiltered `npm test`, `npm run build`, and any grep audits it delegated. If none, say "none delegated".]

Run all eight validation steps (typecheck/build, lint, **test validation** for tasks that list a `Test:` path, boundary/config/persisted-shape verification, **live browser verification via the `chrome-devtools` MCP**, output review, AC traceability, delegated final-verification) against the FULL implementation (not per phase) and produce your QA Report. Remember: you NEVER write code — including tests. If a required test is missing, broken, or tautological, FAIL the task and let the Implementer fix it in the combined fix pass. Always invoke Vitest with the `run` subcommand, and never run `npm run dev` in the foreground — Step 4.5 starts it detached, on the port and by the procedure your agent definition specifies, and kills only the PID it started. **You CAN observe the app running, so verify that the change actually works rather than describing how someone else could check.** Reserve MANUAL VERIFICATION NEEDED for genuine judgement — interaction feel, visual and copy judgement, pacing — and for states the browser tooling cannot reach; give the exact command, interaction, and expected outcome for those. A criterion with a right answer that you filed as manual verification is under-verification, not caution.
```

**Wait for all 3 agents to return.** Collect all three reports.

## Step 6: Combined Fix Pass + Re-Review

Verdicts:
- Code-Evaluator: `APPROVED` or `ISSUES FOUND`
- Defender: `APPROVED` or `ISSUES FOUND`
- QA: `ALL PASSED` or `FAILURES FOUND`

**If ALL three approved** → skip to **Step 7** (Final Report).

**If ANY reviewer found issues**, spawn the Implementer (`subagent_type: "implementer"`) **once** with all feedback combined:

```
## Your Assignment: Fix Review Issues

You are receiving feedback from 3 reviewers who analyzed the full implementation in parallel.
Fix ALL issues listed below in a single pass.

### Code-Evaluator Feedback
[Paste the full Code-Evaluator Report — or "No issues" if APPROVED]

### Defender Feedback
[Paste the full Defender Report — or "No issues" if APPROVED]

### QA Feedback
[Paste the full QA Report — or "No issues" if ALL PASSED]

### Files Previously Changed
[Cumulative changed-files log from Step 4]

### Project Paths
- Repo root: `E:\Game Dev\StringsAndStations`
- Pure logic (if the plan establishes a boundary): named in the plan
- Components: `src\`, plus `App.tsx`
- Tests: co-located `__tests__/` folders, per the plan
- Tunables: the configuration file the plan names

### Important Constraints
- Fix ONLY the issues identified by reviewers — do not make unrelated changes
- For Code-Evaluator issues: apply the specific principle or convention fix suggested
- For Defender issues: prioritize Critical over Warning; skip Info-level items
- For QA failures: fix typecheck and lint errors, functional issues, AND test issues — for `test-missing` add the test the task specified at the listed `Test:` path; for `test-broken` make it run and pass; for `test-tautological` rewrite it to assert the actual behaviour described in the task's step bullets; for `test-coverage-gap` or `ac-test-gap` add an assertion for the missed criterion
- **`boundary-violation` IS yours to fix** — move the offending logic so the tree the plan protects stays pure. Never fix it by disabling the lint rule.
- **`tunable-hardcoded` IS yours to fix** — read the value from configuration instead. If the key does not exist yet, add the key with the placeholder the contract specified and report the unchosen value; do not pick a number.
- **`lint-suppressed` IS yours to fix** — remove the suppression and address the underlying issue.
- **`design-decision-needed` is NOT yours to fix.** An unchosen tuning value, an ambiguous rule reading, and a new dependency are the developer's. Report it back so the orchestrator can resolve it with them.
- **`deps-not-installed` / `not-scaffolded` are NOT code defects** — they mean the environment is incomplete. Report back; do not "fix" anything.
- **`MANUAL VERIFICATION NEEDED` items are NOT failures** — leave them for the developer.
- Return your Implementer Report listing all fixes applied (production AND test files)
```

Collect the result. Extract the updated list of changed files (union with the previous cumulative log).

**Re-Review (verification round).** After the fix pass, spawn all 3 reviewers **in parallel again** with the same prompts as Step 5, including any newly-changed files.

**Wait for all 3 agents to return.**

- If ALL three now approve → proceed to Step 7.
- If issues remain → **maximum 2 fix-review rounds total.** If round 2 still has issues, log the remaining issues and proceed to Step 7 — do not block the contract on a stuck reviewer cycle.

## Step 7: Update Tasks & Final Report

Update `<plan>/tasks.md`:
- Tasks that completed cleanly: tick the task heading and every step beneath it; append ` ✓` to the heading.
- Tasks that could not be completed or failed after max retries: tick the heading, append ` ✗ — [failure reason]`.

Set the `Status:` line to `COMPLETE` (or `BLOCKED` if any task failed after max retries).

**Move the ticket to `Ready for Test`** — but only when the status you just wrote is `COMPLETE`. The gates are green and the one remaining question is how it feels in the hand, which is the developer's to answer. If you wrote `BLOCKED` instead, flag the card and leave it at `Coding`. Automatic either way, no confirmation prompt; the rules are in *The SCRUM status model* in `management-jira`.

Present:

```markdown
## Implementation Summary

### Tasks
- Total: N
- Passed: M ✓
- Failed: K ✗

### Phase Results
[Include only phases that were in the contract]
| Phase | Tasks | Passed | Failed |
|-------|-------|--------|--------|
| 1. [phase name] | N | M | K |
| 2. [phase name] | N | M | K |
| ... | ... | ... | ... |

### Failed Tasks (if any)
- ✗ Task N — [description] — [reason]

### Review Cycles Used
- Round 1: [APPROVED | ISSUES FOUND]
- Round 2 (if used): [APPROVED | ISSUES FOUND]

### Residual Review Issues (if round 2 still had issues)
- [unresolved issue summary, file:line]

### Verification Results
- Typecheck / lint / suite / build: [QA's results, with the counts quoted]

### Jira
- [The transition performed, e.g. `SCRUM-12 Coding → Ready for Test` — or the flag added, or plainly that it was skipped or failed]

### Developer Actions Outstanding
- [Every tuning value still to choose, with what it trades off; every ambiguous rule reading; any dependency awaiting approval; plus every MANUAL VERIFICATION NEEDED item from the QA report with the command to run, the interaction to perform, and the expected outcome]

### Files Changed
[Cumulative changed-files log, deduplicated]

### Next Steps
[If all passed, no residuals]: "Implementation complete. Run `/fb-archive` to close this contract."
[If some failed or residuals]: "Some tasks failed or have residual review issues. Review above. Run `/fb-apply` again to retry failed tasks only."
```

## Important Rules

- **The Jira move to `Coding` is the first action, not a formality.** It happens in Step 1 the moment the slug resolves — before the contract files are read, before preflight, before any dispatch. A run that reaches the Implementer with the card still in `Planned` is a defect in this command's ordering.
- **Implementer runs through every phase first** — do NOT invoke Code-Evaluator, Defender, or QA between phases. The Implementer carries quality through every phase (writing AND running tests as tasks dictate); reviewers see the full result.
- **Reviewers run once, at the very end, in a single Agent dispatch** — always spawn all 3 in a single message so they execute concurrently. Never per-phase, never sequentially.
- **Combined feedback to the Implementer** — all 3 reviewer reports are merged into a single Implementer prompt for the fix pass, never sent one reviewer at a time.
- **Agents have isolated context** — pass everything they need in the prompt; do not assume any agent remembers prior phases or prior dispatches.
- **The orchestrator manages state** — track the cumulative changed-files log across phases, fix-round counters, and residual issues.
- **Files come from tasks, not from `plan.md`** — every phase dispatch uses each task's `**Files:**` block as the authoritative file list.
- **Nobody in this pipeline decides a tuning value or a design reading.** Configuration values and previously documented decisions are the developer's; the specification is never edited to match the code. If the contract needs a decision mid-run, pause and hand it over.
- **Never run `npm run dev` in the foreground, and never invoke bare `vitest`.** The first does not terminate; the second enters watch mode and hangs. Both waste the whole timeout and return nothing. QA is the sole exception: it starts the server *detached* and drives the app through the `chrome-devtools` MCP, then kills the PID it started. Neither you nor the Implementer does this.
- **`'vite' is not recognized` / `Cannot find module` / `Missing script` is never a code defect.** It means dependencies or scripts are absent. Resolve the environment, then re-run.
- **Maximum 2 fix-review rounds total.** After round 2, log residuals and continue.
- **Failed tasks from a previous `/fb-apply` run** should be retried (they will still be unticked in `tasks.md`).
- **Do not implement code yourself** — all code changes go through the Implementer agent.
- **If a phase blocks on a genuine failure** (the Implementer cannot complete a task), log the blocker, continue with remaining phases, and surface it in the final report — do not run reviewers as an early-exit hack, and do not auto-retry beyond the post-review fix-loop cap.
