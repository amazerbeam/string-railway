---
description: Dump the session to debug what the agents did, how they interacted, what they found, and how they delegated
---

You are the **Session Reporter** for this project's implementation pipeline. Your job is to produce a concise debug report of the current or most recent `/fb-apply` session, focusing on **agent interactions, delegation flow, and issues found** — not the full solution details.

## Step 1: Load Contract State

Read `.claude/workflow/plan-resolution.md` and follow **Resolving the target plan**, accepting any status. `$ARGUMENTS` may name the slug directly. The resolved folder is `<plan>`; say which plan you are reporting on. If that file is absent, do not guess: say so, state that plans live at `.claude/contract/<slug>/` as `plan.md` + `tasks.md`, and ask the developer which plan to use.

Then read (if they still exist):
- `<plan>/plan.md` — Part 1 for the feature name and scope, Part 2 for the planned approach
- `<plan>/tasks.md` — task status and outcomes
- `<plan>/corrections.md` — corrections logged via `/fb-issue`, if any

If no plan resolves, check git log for recent agent-related commits and report based on available evidence. Finished plans live under `.claude/contract/archive/<slug>/` — read one there when the developer names an archived plan.

## Step 2: Reconstruct the Pipeline Execution

For each phase that was executed, report:

### Per-Phase Summary

```markdown
### Phase N: [phase name]

**Tasks assigned:** [count]
**Tasks passed:** [count] ✓
**Tasks failed:** [count] ✗

#### Agent Flow
1. **Implementer** → [what it was asked to do] → [outcome: success/partial/failed]
2. **Code-Evaluator** → [verdict: CLEAN / ISSUES FOUND] → [brief list of issues if any]
   - Fix rounds: [0/1/2] — [resolved? yes/no]
3. **Defender** → [verdict: CLEAN / ISSUES FOUND] → [brief list of issues if any]
   - Fix rounds: [0/1/2] — [resolved? yes/no]
4. **QA** → [verdict: PASS / FAILURES FOUND] → [brief list of failures if any]
   - Fix rounds: [0/1/2] — [resolved? yes/no]

#### Issues Surfaced
- [Issue 1: which agent found it, what it was, was it fixed]
- [Issue 2: ...]
```

## Step 3: Cross-Agent Analysis

Analyze how the agents worked together:

```markdown
## Agent Interaction Summary

### Delegation Pattern
- Total agent spawns: [count]
- Fix-review loops triggered: [count]
- Maximum rounds used: [which phase/stage hit the 2-round cap]

### Agent Effectiveness
| Agent | Issues Found | Issues Fixed | False Positives | Missed Issues |
|-------|-------------|-------------|-----------------|---------------|
| Implementer | — | N | — | — |
| Code-Evaluator | N | N (via re-impl) | N | N |
| Defender | N | N (via re-impl) | N | N |
| QA | N | N (via re-impl) | N | N |

### Handoff Quality
- Did agents receive sufficient context? [yes/no — note gaps]
- Were fix instructions clear enough for the Implementer? [yes/no — note issues]
- Did any agent duplicate work another already covered? [yes/no — note overlap]
```

## Step 3.5: Friction the pipeline caused itself

Separate **real defects the pipeline caught** from **time the pipeline wasted**. The second category is what this report exists to surface, and in this stack it has recognisable shapes:

- **Watch-mode hangs** — how many test runs stalled because Vitest was invoked without the `run` subcommand, and how much wall-clock each cost. This is the single most expensive self-inflicted failure here.
- **A foreground `npm run dev`** — did anything try to run the dev server and consume a whole timeout for nothing?
- **Missing dependencies or scripts** — `'vite' is not recognized`, `Cannot find module`, `Missing script`: discovered at preflight (cheap) or at phase 3 (expensive)?
- **Pauses for a developer decision** — an unchosen configuration value, an ambiguous design reading, a dependency needing approval. How many, and were they anticipated by the plan or discovered mid-phase? A decision the plan predicted and routed to "Developer decides or observes" is healthy; one it missed is a planning gap. A tuning value an agent *invented* rather than escalating is worse than a pause — flag it separately.
- **Skill list misses** — did any prompt tell an agent to invoke a skill that does not exist on disk, or leave `Skill: none` on a task that writes TypeScript? Both are a `/fb-issue` against the planner, not a one-off.
- **Boundary and config surprises** — did a change break an established purity boundary or leave a reader on an old configuration key, and did the Step 1.6 audit catch it first or did a reviewer?
- **Lint suppression** — was any `eslint-disable` added to make a gate pass? That is a process failure, not a code style note.

Report each with a count and one line on where the fix belongs (planner, agent, `web-project.md`, `react-frontend`, or preflight).

## Step 4: Key Findings

```markdown
## Key Findings

### What Worked
- [Pattern or interaction that worked smoothly]

### What Didn't Work
- [Bottleneck, miscommunication, or gap in the pipeline]

### Issues That Persisted
- [Any unresolved issues after max retries — which agent flagged them, why they couldn't be fixed]

### Recommendations
- [Concrete suggestions to improve the pipeline for next run. Name the file each one lands in — a recommendation with no target file will not get applied.]
```

## Step 5: Present the Report

Combine everything into a single report:

```markdown
# Session Report

**Feature:** [name from `plan.md` Part 1]
**Status:** [from tasks.md]
**Date:** [today]

---

[Phase summaries from Step 2]

---

[Cross-agent analysis from Step 3]

---

[Self-inflicted friction from Step 3.5]

---

[Key findings from Step 4]
```

## Important Rules

- **Do NOT reproduce full code diffs or solutions** — this is a debug/process report, not a code review
- **Focus on the agent pipeline**: spawning, delegation, feedback loops, and outcomes
- **Highlight friction points**: where agents disagreed, where fix rounds were needed, where context was lost
- **Be honest about gaps**: if you can't reconstruct part of the session, say so rather than guessing
- **Keep it scannable**: use tables and bullet points, not paragraphs
- **A recommendation names its target file.** "Improve the planner" is not actionable; "add a preflight `node_modules` check to `.claude/commands/fb-apply.md`" is.
