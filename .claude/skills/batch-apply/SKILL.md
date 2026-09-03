---
name: batch-apply
description: Implements many already-approved contract plans at once by reading each plan's declared file list, grouping plans whose files do not overlap into parallel batches, dispatching one fresh agent per plan to walk its phases, and then running a single code-quality and QA review pass across every ticket at the end instead of once per ticket. Use when the developer wants to apply several plans in one go, run fb-apply on all planned contracts, code multiple tickets in parallel, clear the planned backlog in one pass, or batch the reviewers until every ticket is finished.
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(git:*), PowerShell, Agent, Skill
metadata:
  type: automation
---

# Batch Apply

## Overview

Batch Apply drives this repo's existing `/fb-apply` across several `.claude/contract/<slug>/` plans in one run. It differs from a plain `/fb-apply` in exactly two ways: plans whose declared file lists do not intersect run **concurrently**, and the reviewer stage — code-evaluator, defender, QA — runs **once at the end over the whole union of changes** rather than once per plan.

It does not plan anything. Every plan it touches must already exist and already have been through its approval gate. If a slug has no `plan.md`, it is not this skill's job to write one — that is `/fb-plan`.

## When to Use This Skill

- The developer wants several already-planned tickets implemented in one sitting: "apply all the planned contracts", "run fb-apply on DLR-163, DLR-164 and DLR-165", "code everything that's PLANNED", "batch these plans and QA once at the end"
- Two or more plans are ready and the developer does not want to sit through a full reviewer round per ticket

Do not use it for a single plan — that is plain `/fb-apply`, with its own reviewers intact. Do not use it when the tickets need planning first, and do not use it in place of `sprint-coder`, which starts from Jira and writes the plans itself.

## Why the reviewers move to the end

Running the three reviewers per plan on a shared working tree produces findings about half-finished sibling work, and the same shared file gets three separate fix passes that each re-open the others. Batching them means the reviewers see one coherent tree, once, and the fix pass is a single coordinated edit. The cost is real and must be stated in the run log: **between the first batch starting and the review stage, nothing has been reviewed.** A defect in an early plan sits under later plans' work until the end.

## Core Workflow

### Phase 1: Preflight

1. `git status --porcelain` — the tree must be clean. Uncommitted work makes the per-plan commits in Phase 4 impossible to separate, and makes it impossible to tell whose change a reviewer finding belongs to. If it is dirty, stop and say so.
2. Confirm the branch. Every plan in the run lands on the current branch; there is no per-plan branch.
3. Confirm dependencies are installed (`node_modules` exists). A missing install surfaces later as `'vite' is not recognized`, in four agents at once, and reads like four unrelated failures.
4. Resolve the target plans. Read `.claude/workflow/plan-resolution.md` and follow **Resolving the target plan**, accepting `PLANNED`, `IN PROGRESS` and `BLOCKED` — but resolve to a *set*, not a single plan:
   - Slugs named in the invocation → use exactly those; stop if any is missing or has no `plan.md`.
   - Nothing named → discover every non-archived plan in an accepted status and present the list for confirmation before starting. A multi-plan run writes real code into several modules at once; never infer the set silently.
5. Report the resolved set by slug **and by the H1 title of each `plan.md`**, so the developer sees what is about to be built rather than a column of keys.

### Phase 2: Build each plan's file set

For every resolved plan, read `<plan>/tasks.md` and collect its file set from two places, unioned:

- The `## File map` section near the top — its `**Created:**` / `**Modified:**` / `**Deleted:**` / `**Test:**` lists.
- Every per-task `**Files:**` block. These are authoritative per `CLAUDE.md` ("file paths are owned by tasks, not by `plan.md`"), and a task occasionally names a file the top file map missed.

Normalise as you go: strip any `:12-40` line-range suffix, strip the `Create:` / `Modify:` / `Delete:` / `Test:` / `Config:` prefix, drop backticks, and lowercase for comparison only — this is Windows, where `CardFace.tsx` and `cardface.ts` are the same path to the filesystem even though they are not to `git`.

If a plan's `tasks.md` declares no files at all, treat its file set as **everything** — it collides with every other plan and therefore runs alone. That is the safe reading of a missing declaration, not a reason to guess.

### Phase 3: Group into non-overlapping batches

Two plans conflict if their file sets intersect. Build the batches greedily: walk the plans in the order the developer gave them (or slug order if discovered), and place each plan in the first batch where it conflicts with nothing already there; otherwise open a new batch.

Three adjustments that matter more than the algorithm:

- **Treat barrels, config and shared stylesheets as conflicts even when only one plan names them.** `src/hunt/index.ts`, `src/warCouncil/index.ts`, any `*.css` several plans touch, `eslint.config.js`, `package.json` — a plan that edits one of these is nearly always about to be edited by a sibling that forgot to declare it. When in doubt, put the two in different batches; a wasted batch boundary costs minutes, a lost edit costs a debugging session.
- **Cap a batch at four plans.** Beyond that, four concurrent Vitest and TypeScript processes contend for the same CPU and the run gets slower, not faster.
- **A batch of one is fine.** If every plan touches `src/hunt/buffs.ts`, the run is fully sequential and still correct. Say so in the log rather than forcing parallelism that will corrupt the tree.

Write the batch plan to the run log (Phase 6) before dispatching anything, including which pairs conflicted and on which file. That list is what lets the developer see why a run they expected to be parallel wasn't.

### Phase 4: Run the batches

Batches run **strictly one after another**. Within a batch, dispatch every plan's agent in a **single message with one `Agent` call per plan** so they genuinely run concurrently — a batch dispatched across several messages is just a slow sequential run.

Each agent is a **fresh agent, not a fork** — it must start with no memory of another plan's work. Its prompt is self-contained and says:

- Which plan folder it owns, and the plan's title.
- Run `Skill: fb-apply <slug>` and walk **every phase of `tasks.md` end to end**, invoking the skills each task names (`react-frontend` for anything under `src/`, and any other skill a task lists).
- **Stop after the implementation phases. Do not dispatch code-evaluator, defender or QA** — this run reviews once, centrally, after every batch. Say this explicitly; the `/fb-apply` command's own instructions end in that dispatch and an agent will otherwise follow them.
- **Touch nothing outside its own declared file set.** If a task turns out to need a file the plan did not declare, the agent stops and reports it rather than editing it — an undeclared file is exactly the file a sibling agent may be holding.
- **Per-phase verification is scoped Vitest only.** Run the test files the tasks name; do not run the unfiltered suite, `npm run lint`, or `npm run build`. Those read the whole tree and will report a sibling's half-written module as this plan's failure.
- **`npm run typecheck` is allowed once, at the agent's end, as a signal — not a gate.** Errors in files inside its own file set are its to fix. Errors in any other file belong to a sibling: report them, do not touch them.
- **Do not run `git add`, `git commit`, `git push`, or any other `git` write.** The coordinator commits at the batch boundary. Two agents staging concurrently will interleave.
- Report back: phases completed, scoped test results with real numbers, any file it needed but could not touch, and every assumption it made that would normally have paused the pipeline.

**At each batch boundary**, before opening the next batch:

1. Run the authoritative `npm run typecheck` yourself. This is the first point in the run where the tree is coherent.
2. Commit each plan separately with a pathspec limited to that plan's file set (`git add <files>` then `git commit`), so `git log` keeps one commit per ticket naming its key and what changed. Do not push.
3. If a plan's agent reported it could not finish, mark it `BLOCKED` in its own `tasks.md` and in the log, and carry on — one blocked plan never halts the run, and never silently ships either.

### Phase 5: One review pass over everything

Only after the last batch has been committed, and typecheck is green:

1. Dispatch **code-evaluator, defender and qa in one parallel `Agent` call**, exactly as `/fb-apply` does at its end. Give each the full list of plans in the run, the union of changed files, and the diff range covering the whole run. Tell them plainly that several tickets are in this diff, so a finding must name which plan it belongs to.
2. QA owns the gates that were deliberately deferred all run: the **unfiltered test suite**, `npm run lint`, `npm run format:check`, and the production build. Those never ran during the batches; this is the only place they run, and skipping them here means they never ran at all.
3. **The browser pass stays opt-in and off by default**, as in `/fb-apply`. If the developer asked for it, batch it into one pass at the end across every surface the run touched. Either way QA records what a browser would have checked, per plan, as the developer's eyes-on agenda.
4. Run **one combined fix pass** over all findings, then **one verification round** — the same two-round ceiling `/fb-apply` uses. Anything still red after the second round is reported as blocked, with the failing output, not committed over.

### Phase 6: Wrap-up

Maintain a run log at `.claude/batch-runs/<today's date>-batch/log.md`, written at Phase 3 and updated at each batch boundary. It holds: the resolved plan set with titles, the batch grouping with the conflicting file that forced each split, one section per plan with its assumptions and its "what a browser would have checked" list, and a single `**Progress:**` line rewritten in place (`batches 2/3 · plans 5/7 — 4 committed, 1 blocked`).

Finish by reporting, in the terminal: plans committed, plans blocked and why, the review findings and what was fixed, the gate results with real numbers, and the accumulated eyes-on agenda. State in one line whether a browser pass ran.

Do not archive anything. `/fb-archive` is a separate, deliberate step.

## Safety

- A dirty tree at preflight stops the run. There is no way to attribute a reviewer finding, or scope a commit, once the run's changes are mixed with the developer's.
- Batches never overlap in time, and no agent inside a batch writes outside its declared file set. Those two rules together are the entire guarantee that concurrent agents do not lose each other's edits — nothing else in the run enforces it.
- No agent runs a `git` write. The coordinator commits, at batch boundaries, per plan, by pathspec.
- Nothing is pushed. The developer pushes after looking at the result.
- Deferring the reviewers is not deferring the gates. The full suite, lint, format and build all run in Phase 5, on every run, without exception. A run that ends without them has verified nothing.
- Nothing here overrides the pipeline's pause conditions: visual and copy judgement, approving a new dependency, and any tuning or design value remain the developer's, and a plan that reaches one still stops and asks.

## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/` (Glob `.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules added after this skill was written. See `.claude/rules/README.md` for the index. `save-data-versioning.md` bites whenever any plan in the run persists a value.

## Success Criteria

- Every resolved plan ends the run either committed or recorded `BLOCKED` with its failing output — never half-applied, never silently dropped.
- `git log` on the branch shows one commit per plan, each naming its ticket and its change, with no commit mixing two plans' files.
- No two plans that share a file ran in the same batch — verifiable against the conflict list written in the log at Phase 3.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build` were each run at least once in Phase 5, with their real numbers reported.
- The reviewers ran exactly once, in one parallel dispatch, after the final batch — not once per plan.
- `.claude/batch-runs/<date>-batch/log.md` exists, its single `**Progress:**` line reads as complete, and its per-plan sections match what was actually committed.
