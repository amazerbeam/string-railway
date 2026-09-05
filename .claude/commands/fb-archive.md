---
description: Archive the completed contract — extract learnings, update rules, and clean up
---

You are the **Archive Agent** for this project's implementation pipeline. Close out the current contract, capture learnings, and clean up.

## Step 1: Resolve the plan and read its status

Read `.claude/workflow/plan-resolution.md` and follow **Resolving the target plan**, accepting statuses `COMPLETE` and `BLOCKED`. `$ARGUMENTS` may name the slug directly. The resolved folder is `<plan>`; the slug is `<slug>`. If that file is absent, do not guess: say so, state that plans live at `.claude/contract/<slug>/` as `plan.md` + `tasks.md`, and ask the developer which plan to use.

Then read:
- `<plan>/tasks.md` — check ✓ vs ✗ counts and overall status
- `<plan>/plan.md` — Part 1 for the feature name and acceptance criteria, Part 2 for the technical approach taken
- `<plan>/corrections.md` — **if present**, the developer's corrections logged via `/fb-issue` during this contract. This is the **primary signal** for learnings (Step 3). If absent, the developer logged no corrections — fall back to `tasks.md` ✗ entries and session context.

If no plan resolves, inform the user: "No finished plan to archive."

## Step 2: Generate Session Summary

Analyze the implementation:

1. **Feature**: What was implemented?
2. **Completion**: How many tasks passed (✓) vs failed (✗)?
3. **Acceptance criteria**: Which criteria were met?
4. **Outstanding developer decisions and observations**: Did the developer choose every tuning value the contract needed, resolve every ambiguous design reading, and actually look at what only running the app can show? A contract carrying a placeholder in configuration, or one whose interaction has never been judged by a human, is functionally incomplete even at 100% ✓ — say so plainly rather than archiving it as clean.

## Step 3: Extract Learnings

Order of evidence:

1. **`corrections.md`** (if present) — every block here is a developer-confirmed correction. These are the highest-signal learnings; treat them as authoritative. Note which corrections were already applied to a skill/agent/command vs rejected vs left pending.
2. **`tasks.md` ✗ entries** — task-level failures with their captured reason.
3. **Session context** — anything else surfaced in chat that did not make it into `corrections.md` or `tasks.md`.

For each source, identify:

- **What worked well?** — Patterns, approaches, or decisions that succeeded smoothly
- **What caused failures?** — Root causes of any ✗ tasks (not just symptoms)
- **What was surprising?** — Unexpected issues, missing context, or wrong assumptions in the plan
- **Gaps** — edge cases or quality patterns not covered by an existing rule, by `react-frontend`, or by `web-project.md`
- **Tuning signal** — did real-world testing show a chosen configuration value is wrong? That is not a code learning; it is the output that playing the game exists to produce. Record it as a developer decision rather than proposing a code change.

If `corrections.md` is present and most issues were already applied via `/fb-issue` during the session, Steps 4 and 5 may have little to add — that is fine. Skip them honestly rather than inventing updates.

## Step 4: Propose Updates to the Shared Layer (if needed)

If the session revealed **generalizable** improvements, propose specific additions or modifications. Pick the target by what kind of thing was learned:

| What you learned | Where it belongs |
|---|---|
| A path is wrong, a runner command is wrong or missing, a toolchain trap bit us | `.claude/workflow/web-project.md` |
| A project-wide constraint more than one workflow could trip over (save / persisted-data compatibility, determinism and seeding, a configuration file's schema) | a new or existing `.claude/rules/<topic>.md` — see that folder's `README.md` for the required five sections |
| The wrong plan was picked, or a plan was undiscoverable | `.claude/workflow/plan-resolution.md` |
| A React/TypeScript convention Claude should have known | `.claude/skills/react-frontend/SKILL.md`, or `references/engineering-standards.md` when it is a general standard rather than specific to this project |
| A domain convention no skill covers yet | note that `/skill-creator` should write one, and treat that as its own piece of work |
| The *process* was wrong — bad step order, missing gate, weak prompt | the relevant `.claude/commands/fb-<name>.md` |

**A wrong path or runner command belongs in `web-project.md`, not in the command or agent that used it.** That file exists so the fix lands once. The same applies to a convention: it belongs in `react-frontend`, not in a copy pasted into an agent — and to anything the four agents each restate.

**Rules for proposing updates:**
- Only propose changes that are **generalizable** — not specific to this one feature
- Only propose changes based on **actual issues encountered** — not hypothetical scenarios
- Changes should be **additive or corrective** — don't remove existing guidance without strong justification
- Keep them concise — one or two lines per new rule
- A new `.claude/rules/` file needs all five sections, and its **reject conditions** are the part that makes it enforceable

**Present all proposed changes to the user and WAIT for explicit approval before making any edits.**

## Step 5: Propose Agent Updates (if needed)

If the pipeline agents (implementer, code-evaluator, defender, qa) could be improved based on this session:

- Did any agent miss something it should have caught?
- Did any agent flag false positives repeatedly?
- Were the agent prompts missing important context?

Propose specific changes to the agent definition files in `.claude/agents/` and **wait for user approval**.

## Step 6: Save Project Memory (if applicable)

If there were significant **non-obvious learnings** about the project (not code patterns — those go in rules), save them to memory:

- Discovered constraints, limitations, or undocumented behaviour
- Decisions that affect future feature work — including a tuning value the developer settled on and why
- Toolchain facts specific to this machine or project setup that cost real time to discover

Only save what would be useful in a future conversation with no memory of this session, and only what is not already recorded in the repo, `CLAUDE.md`, `web-project.md`, or the `react-frontend` skill.

## Step 7: Clean Up

After the user confirms they are satisfied with the summary and any proposed updates, **ask for confirmation before touching any file** — this is the one destructive step in the pipeline, so the prompt comes first, not after the moves:

> "Ready to move corrections to `.claude/lessons/<slug>.md` and archive the plan to `.claude/contract/archive/<slug>/`. Proceed?"

Only once the developer agrees, work through the four steps below. Nothing is deleted — a finished plan becomes history, not a gap.

1. **If `<plan>/corrections.md` exists**, move its content to `.claude/lessons/<slug>.md`, creating `.claude/lessons/` if needed. If that file already holds a trail, **append** to it rather than overwriting — a forced overwrite destroys prior lessons and an unforced move fails mid-cleanup, leaving the folder half-processed. Then remove the now-copied `<plan>/corrections.md`. `.claude/lessons/` stays the single place a post-archive `/fb-issue` appends to, which is why corrections leave the plan folder rather than travelling with it.
2. Create `.claude/contract/archive/` if it does not exist.
3. Check `.claude/contract/archive/<slug>/` **before** moving. If it already exists, stop and report it, or archive to `<slug>-2` (then `-3`, …) — on Windows, moving a folder onto an existing folder of the same name nests it as `archive/<slug>/<slug>/` instead of merging. Once the target is free, **move** the whole plan folder to `.claude/contract/archive/<slug>/` — `plan.md`, `tasks.md`, `pr-description.md`, and `spec.md` if present. Move, never copy: a path that is live in two places drifts.
4. Confirm `.claude/contract/<slug>/` no longer exists, that `.claude/contract/archive/<slug>/plan.md` is the file you just moved (same size and content as the plan you summarised — a pre-existing archived copy would satisfy a bare existence check), and that `.claude/contract/archive/<slug>/<slug>/` does **not** exist.
5. **Move the ticket to `Done`.** The contract is archived, which is exactly what `Done` means here — `Ready for Test` covers the window before it. If the slug carries a `DLR-<n>` key, invoke `management-jira` and transition that issue automatically; the developer's confirmation above covered this step. Only do it when the archive status is `COMPLETE` — for a `PARTIAL` archive, leave the ticket where it is and flag it, because unfinished work must not read as shipped. Resolve the transition id live, skip silently when there is no key, and never fail the clean-up over a Jira error. See *The DLR status model*.

Other plan folders are untouched — archiving one plan never affects another. Before writing the Step 8 output, enumerate them for the "Other plans still active" line: run the discovery step from `.claude/workflow/plan-resolution.md` over `.claude/contract/` and list each remaining plan's slug and status.

## Step 8: Final Output

```markdown
## Archive Summary

### Feature: [name]
### Status: [COMPLETE | PARTIAL — N of M tasks passed]

### Tasks
- Passed: N ✓
- Failed: M ✗

### Shared Layer Updated
- [list of files updated under `.claude/workflow/`, `.claude/rules/`, `.claude/skills/`, `.claude/commands/`, or "None"]

### Agents Updated
- [list of agent files updated, or "None"]

### Learnings Saved
- [list of memories saved, or "None"]

### Contract
- [MOVED to `.claude/contract/archive/<slug>/` | RETAINED in place — reason]

### Corrections
- [`corrections.md` moved to `.claude/lessons/<slug>.md` | "No corrections logged"]

### Jira
- [The transition performed, e.g. `DLR-12 Ready for Test → Done` — or the flag added for a PARTIAL archive, or plainly that it was skipped or failed]

### Developer Work Still Outstanding
- [any tuning value still a placeholder, ambiguous rule reading still unresolved, dependency still unapproved, or behaviour never judged by playing — or "None"]

### Other plans still active
- [slug — Status, one line each, or "None"]

---
Ready for the next `/fb-plan`.
```
