---
name: sprint-coder
description: Runs the full /fb-plan then /fb-apply contract pipeline unattended across every To Do ticket in the current sprint, one fresh-context agent per ticket in Jira rank order, auto-approving the plan gate and skipping the mockup gate, committing and pushing each ticket straight to the developer's working branch, transitioning its Jira status, holding a live % progress counter across the whole run, and logging every assumption and gotcha to one running file for batch developer review at the end. Use when the developer wants to code through the whole sprint unattended, chew through a sprint backlog overnight, batch-implement every ticket in the current sprint, run fb-apply across multiple tickets back to back, or leave the pipeline running without pausing at each plan approval.
allowed-tools: Read, Grep, Glob, Write, Bash(git:*), Agent, mcp__atlassian__getAccessibleAtlassianResources, mcp__atlassian__searchJiraIssuesUsingJql, mcp__atlassian__getJiraIssue, mcp__atlassian__getTransitionsForJiraIssue, mcp__atlassian__transitionJiraIssue
metadata:
  type: automation
---

# Sprint Coder

## Overview

Sprint Coder is the orchestration layer over this repo's existing `/fb-plan` → `/fb-apply` contract pipeline. Where a normal contract run stops at two human gates (plan approval, mockup approval) per ticket, Sprint Coder chains every `To Do` ticket in the current sprint end to end with both gates overridden for the run, and defers all human judgement to a single review pass at the end instead of one pause per ticket.

It does not replace `/fb-plan` or `/fb-apply` — it drives them, once per ticket, each in a **fresh agent with no memory of the previous ticket**, so context never balloons across a 15-20 ticket sprint the way it would in one long conversation.

Because the run is unattended and long, it reports a **% progress counter at every step** — see "Progress counter" below. That counter is not decoration: it is the only thing that tells a developer glancing at the terminal mid-run whether the sprint is moving or stuck.

## When to Use This Skill

- The developer wants to run the contract pipeline across an entire sprint unattended
- "chew through the sprint", "code the backlog overnight", "batch-implement the sprint", "run fb-apply on everything in To Do"
- The developer has confirmed they want the plan and mockup gates skipped for this run, reviewing assumptions and UI in one pass afterward instead

Do not use this for a single ticket — that's plain `/fb-plan` + `/fb-apply`, with its gates intact.

## Core Workflow

### Phase 1: Preflight

1. `git status` — the working tree must be clean (or only contain changes the developer already knows about) and on the branch commits will be pushed to. If it isn't clean, stop and tell the developer rather than starting a multi-ticket run on top of unknown local state.
2. Resolve the Jira cloud ID (`getAccessibleAtlassianResources`) and confirm the project key from the ticket keys already in this repo's history (`git log` prefixes, existing `.claude/contract/` slugs) if not already known.
3. Query the sprint: `searchJiraIssuesUsingJql` with `sprint in openSprints() AND project = <key> ORDER BY Rank ASC`, fields `["summary","status"]`. Filter to `status = "To Do"` — anything `Ready for Test`/`Done`/`In Progress` is either already shipped or already being worked, and is out of scope.
4. Cross-check each candidate ticket's likely file surface against `git status` / recent commits. If a ticket looks like it already has local uncommitted work or a recent commit touching its area, **exclude it from the run and flag it in the log** rather than guessing at what's already in flight.
5. **Content-dependency check.** Jira rank order tracks priority, not build order. Scan the ticket list for a "design/author/define the content" ticket (e.g. "author the v1 buff card list", "define the enemy roster") whose output — an actual list of things, not a mechanism — is what a later-ranked-but-actually-earlier-needed implementation ticket (a draw pool, an activation flow, a cost table) would otherwise have to invent an assumption for. Pull that authoring ticket ahead of anything that depends on its output, and note the reorder and why in the log header. This is the one case where rank order is deliberately overridden before the run starts, distinct from the per-ticket "pick the plan's default" overrides that happen during the run.
6. Create this run's log file at `.claude/sprint-runs/<today's date>-sprint/log.md` (create the folder if needed). Write a header: run start time, target branch, the ordered ticket list (key + summary), the excluded/flagged tickets with why, and a `**Progress:**` line (see below) initialised to `0/N (0%)`.
7. Fix the denominator `N` here — the count of tickets that survived exclusion — and report `0/N (0%) — starting DLR-xxx` before spawning the first agent. `N` never changes mid-run; a ticket discovered to be unnecessary still counts and is reconciled as skipped-with-reason, so the percentage can never move backwards.

### Phase 2: Per-ticket loop (sequential — never parallel)

Tickets share one branch and can touch overlapping files, so process them **one at a time, in Jira rank order** ("I usually go in order" — don't re-sort by size, type, or guessed dependency unless a ticket's own description says it blocks on another). For each ticket, spawn one fresh `Agent` (a new agent, not a fork — it must start with no memory of prior tickets) with a fully self-contained prompt covering:

- The ticket key **and its Jira summary** (so the agent, and later the commit message and log, all say what the ticket actually is — never just a bare key).
- Its position in the run (`ticket 4 of 12`) and an instruction to prefix each of its own progress reports with that position, so a nested `/fb-apply` phase report reads as part of the sprint, not as a lone ticket.
- Run `Skill: fb-plan` for this ticket.
- **At the plan approval gate: do not pause.** Pick the plan's own stated default reading for every open rule/tuning question — this project's convention is that a documented plan default is pre-approved, not a stall point. Record every such default chosen as a bullet under this ticket's heading in the shared log file (path given in the prompt).
- **Skip the mockup approval gate entirely** for UI-classified work — proceed straight to `tasks.md` generation without pausing for it. Note in the log that the mockup was auto-approved unseen, so the end-of-run review knows to actually look at the UI.
- Run `Skill: fb-apply` for the resulting slug.
- **Browser QA is deferred for the whole run** — see "Deferred browser QA" below. Tell the agent explicitly: run every other gate as normal, skip the live browser pass, and state in its report what a browser would have needed to check.
- Any assumption made anywhere in the run that would normally have paused the pipeline (a design reading, a tuning value, a dependency choice, an ambiguous rule interpretation) gets appended to the log under this ticket's heading — not just gate overrides.
- If the implementer/reviewers hit the pipeline's own 2-round fix ceiling and the ticket is still red: **do not commit broken code.** Report back `BLOCKED` with what's failing; leave the working tree as-is for the coordinator to inspect.
- If green: commit locally with a message that states what changed and why (ticket key + summary in the subject, a short body on the actual change) — **do not push**. The coordinator pushes after checking the result.
- Report back pass/fail of typecheck/lint/tests/build, and whether it committed.

### Phase 3: Coordinator reconciliation (after each subagent returns, before starting the next)

- **If the subagent reports green and committed:** `git push` to the target branch, then transition the Jira ticket's status using this project's status vocabulary — invoke `Skill: management-jira` (via the subagent, or directly with `getTransitionsForJiraIssue` + `transitionJiraIssue`) rather than guessing a transition ID.
- **If `BLOCKED`:** do not push, do not transition Jira. Append a `## <ticket-key> — BLOCKED` section to the log with what failed, and move on to the next ticket. A blocked ticket must never silently stop the whole run, but must never silently ship either.
- **Then update the counter, always** — pushed, blocked or skipped, a reconciled ticket advances the numerator. Rewrite the log header's `**Progress:**` line in place (one line, not an append-only history) and print the same figure to the terminal.
- Only after reconciling one ticket does the loop spawn the next agent — this is what keeps the branch from ever having two tickets' uncommitted work on it at once.

### Deferred browser QA — a run-level policy

`/fb-apply` already gates the browser pass on reachability per ticket. A sprint run goes one step further and **defers the browser pass across the entire run**, because a sprint has something a single ticket does not: a natural batch point at the end, where the surfaces several tickets built can be looked at together, in the state they will actually ship in.

- Every ticket in the run skips the live browser pass. All other gates run unchanged — typecheck, lint, the **full unit suite**, and the build, every ticket, every time. The unit suite is what stands between the run and a silent regression across fifteen stacked tickets; it is never deferred.
- Each ticket's agent records **what a browser would have checked** — the surface, the state, the thing that should be visible. These accumulate into the batch.
- At wrap-up, run **one** browser pass over the accumulated list, on the finished branch. Keep it to what only a real browser can answer: CSS custom properties resolving rather than silently falling back, layout not scrolling or cropping at the target viewport, a clean console. Everything else the unit suite already asserts.

**State the cost of this plainly in the log header, because it is real:** nothing is looked at until the end, so a layout defect in an early ticket is found with later tickets stacked on top of it. That trade is worth taking when most of the run is bottom-up work with no reachable surface, and worth refusing when the run is mostly UI tickets building on each other. **Decide which it is at preflight, from the actual ticket list, and record the decision and the reasoning in the log header.**

If the project has a headless driver that can play the game without a browser, prefer it as the per-ticket end-to-end signal — it reaches deep states (a fight played out, an item bought and used) that browser tooling typically cannot, in milliseconds, deterministically.

### Phase 4: Wrap-up

- No `/fb-archive` — this developer doesn't archive contracts; leave `.claude/contract/<slug>/` in place.
- Set the counter to `N/N (100%)` in both the log header and the terminal — the run is complete whether or not every ticket shipped; blocked tickets are counted as reconciled, not as outstanding progress.
- Print a summary: tickets shipped and pushed, tickets blocked, tickets excluded at preflight, and the log file path.
- **Run the deferred browser pass** over the accumulated list from every ticket, once, on the finished branch. Report what it checked and what it found. If it was skipped entirely, say so and say why.
- End with an explicit callout that every UI-classified ticket in the shipped list had its mockup gate skipped and still needs an eyes-on look — this run only validated function, never feel, per this project's own pause-condition rule. Name every surface the deferred browser pass could not reach, so the developer knows exactly what no process in this run has ever seen.

## Progress counter

Maintained continuously, from preflight to wrap-up, in two places at once: the log header and the terminal.

**The arithmetic.** `N` = tickets in the run after preflight exclusions. `done` = tickets fully reconciled (pushed **or** logged `BLOCKED` **or** skipped with a reason). Percentage is `done / N`, rounded to a whole number. Excluded-at-preflight tickets are outside `N` entirely — they were never part of this run.

**The format**, identical in both places:

```
Progress: 4/12 (33%) — done: 3 shipped, 1 blocked | now: DLR-107 "Draw pool wiring" (5/12) — fb-apply, phase 2/4
```

**When to emit it:**

| Moment | Emitted to |
|---|---|
| Preflight complete, before the first agent | terminal + log header (`0/N (0%)`) |
| Each ticket's agent spawned | terminal |
| Each `/fb-plan` finished, each `/fb-apply` phase boundary reported back | terminal |
| Each ticket reconciled (push / block / skip) | terminal + log header, rewritten in place |
| Wrap-up | terminal + log header (`N/N (100%)`) |

**Rules that make it trustworthy:**

- The log header holds **one** `**Progress:**` line, overwritten each time. A stack of stale progress lines is worse than none — the developer can't tell which is current.
- The counter only ever advances on a *reconciled* ticket. Work in flight inside a ticket is reported in the `now:` clause, never as fractional credit in the numerator.
- A blocked ticket advances the counter. Progress means "dealt with", not "shipped" — the shipped/blocked split lives in the `done:` breakdown, and conflating the two hides failures behind a healthy-looking percentage.
- Always name the current ticket alongside the number. `5/12` alone doesn't tell the developer what is running right now, which is the question they actually have.
- If a ticket's agent runs long with no phase report, re-emit the counter unchanged rather than going silent — an unchanged counter with a live `now:` clause reads as working; silence reads as hung.

## Safety

- Sequential only. Two agents committing to the same branch concurrently will race and corrupt history — never spawn the next ticket's agent before the current one is fully reconciled (pushed or logged blocked).
- Never push a ticket that didn't reach green within the pipeline's normal 2-round fix ceiling. Overriding the *approval* gates is in scope for this skill; overriding the *quality* gate is not.
- Never touch a ticket whose files already show local uncommitted changes at preflight — that's the developer's in-progress work, not this run's to claim.
- Never report a percentage that outruns the reconciliations — a counter that counts a ticket as done before its push or block is recorded will, on a crash mid-run, tell the developer work landed that never did.
- **Deferring the browser pass is not deferring the gates.** Typecheck, lint, the full unit suite and the build run on every ticket without exception. A run that defers the unit suite has stopped being a pipeline.
- Every gate override and assumption is logged with enough detail that the developer's end-of-run pass is a real review, not a rubber stamp — a log entry that just says "approved plan" without saying what was assumed is not sufficient.

## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/` (Glob `.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules added after this skill was written. See `.claude/rules/README.md` for the index.

## Success Criteria

- Every `To Do` sprint ticket not excluded at preflight ends the run either pushed-and-transitioned or logged `BLOCKED` — never silently skipped, never left half-applied on the branch.
- `.claude/sprint-runs/<date>-sprint/log.md` exists and has one heading per ticket processed, with every gate override and assumption recorded under it.
- `git log` on the target branch shows one commit per shipped ticket, each with a message naming the ticket and describing the actual change.
- Every shipped ticket's Jira status matches the transition `management-jira`'s status vocabulary defines for "done with this pipeline" — verify with `getJiraIssue` on a sample if unsure.
- No ticket that hit the 2-round fix ceiling was pushed.
- The log header's single `**Progress:**` line reads `N/N (100%)` at the end, and its shipped/blocked breakdown matches the ticket sections in the body of the same file.
