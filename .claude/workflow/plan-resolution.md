# Contract layout and plan resolution

The canonical statement of where plans live and how a command decides *which* plan it is operating on.

`/fb-plan` writes this layout. `/fb-apply`, `/fb-issue`, `/fb-archive`, and `/fb-report` read it. Change a rule **here only** — the four consumer commands reference this file rather than restating the algorithm, because a rule stated in four places gets updated in three.

This file deliberately lives outside `.claude/contract/`, so archiving or clearing a plan can never delete the algorithm that finds plans.

## Layout

```
.claude/contract/
  <slug>/                  one folder per plan
    plan.md                Part 1 Alignment + Part 2 Technical design (written by /fb-plan)
    tasks.md               phased execution checklist, carries the Status: line
    corrections.md         created on demand by /fb-issue
    spec.md                present only when /fb-plan consumed a spec from specs/
  specs/                   upstream spec documents awaiting a plan
    YYYY-MM-DD-<topic>-spec.md
  archive/
    <slug>/                finished plans, moved here by /fb-archive

.claude/lessons/<slug>.md  corrections.md, moved out on archive
```

`specs/` and `archive/` are **not** plans and are skipped by resolution.

## Plan slug grammar

```
slug        := ( jira-key "-" kebab-title ) | ( iso-date "-" kebab-title )
jira-key    := [A-Z][A-Z0-9]+ "-" [0-9]+          e.g. SCRUM-8
iso-date    := YYYY "-" MM "-" DD                 e.g. 2026-07-29
kebab-title := [a-z0-9]+ ( "-" [a-z0-9]+ )*       lowercase ASCII only
constraint  := total length <= 60 characters
collision   := if .claude/contract/<slug>/ already exists, append "-2", then "-3", …
```

Prefer the Jira key when the work has one; fall back to the planning date. This project tracks the prototype in the `SCRUM` project on Jira (the epic is SCRUM-1), so most plans take the key branch — `SCRUM-8-scaffold-vite-app`. The key makes the plan folder traceable to its ticket; the date prefix sorts chronologically, so where dates are used the newest plan is last in a directory listing.

## Resolving the target plan

1. **Explicit argument.** If the invoking command's arguments name a slug, or a path under `.claude/contract/`, use that folder. If it does not exist or contains no `plan.md`, stop — report what you looked for and list the available slugs. Never fall back to a closest match.
2. **Otherwise discover.** Glob `.claude/contract/*/tasks.md`, excluding anything under `.claude/contract/archive/` and `.claude/contract/specs/`. For callers accepting any status (`/fb-issue`, `/fb-report`), also include folders that contain `plan.md` but no `tasks.md` — a plan awaiting its approval gate. Treat their status as `PLANNED (unapproved)`. Status-filtered callers ignore them. Without this, a plan is undiscoverable during exactly the window where the developer most wants to correct the planner.
3. **Read status.** For each match, read the **first** line matching `^Status:` in `tasks.md`. Valid values: `PLANNED`, `IN PROGRESS`, `COMPLETE`, `BLOCKED`. Anchor on the line start and take the first hit — task bodies quote `Status:` inside fenced examples and prose, so an unanchored read can return someone else's value. If that first line is absent, or holds anything other than the four values above, **report the plan as malformed and still offer it as a candidate**; do not filter it out silently. A silently dropped plan reads to the developer as "no plan exists", and the next `/fb-plan` then creates a `<slug>-2` for work that is already planned.
4. **Filter** to the statuses the calling command accepts (table below).
5. **Decide.**
   - Exactly one candidate → use it, and name it in chat so the developer sees which plan is in play.
   - Several → present an `AskUserQuestion` single-select, one option per candidate labelled `<slug> — <title from plan.md H1> — <Status>`. Never auto-select by modification time: applying the wrong plan's tasks writes real code into the repo. For `/fb-issue`, add a final option — "None of these — treat as cold mode" — because a correction often belongs to no open plan, and forcing it onto one files it in the wrong plan's `corrections.md`, where `/fb-archive` later reads it as that plan's learnings.
   - None → stop with the calling command's own no-candidate message.

For the rest of the calling command, `<plan>` means the resolved folder path.

| Command | Accepted `Status:` values | No-candidate message |
|---|---|---|
| `/fb-apply` | `PLANNED`, `IN PROGRESS`, `BLOCKED` | "No plan ready to apply. Run `/fb-plan <subtask>` first." |
| `/fb-issue` | any | Fall back to cold mode — the developer's description is the whole story. |
| `/fb-report` | any | Report from git log and session context instead. |
| `/fb-archive` | `COMPLETE`, `BLOCKED` | "No finished plan to archive." |

## Status semantics

`tasks.md` owns plan status — there is no index or registry file, because a second source of truth drifts the moment someone hand-edits a `Status:` line. `/fb-plan` writes `PLANNED`; `/fb-apply` writes `IN PROGRESS` when it starts and `COMPLETE` or `BLOCKED` when it finishes. A stale status is the one thing that misroutes resolution: a finished plan still marked `IN PROGRESS` keeps being offered to `/fb-apply` and withheld from `/fb-archive`.

## If this file is missing

Degrade to a prompt, not a guess: tell the developer this file is absent, state that plans live in `.claude/contract/<slug>/` as `plan.md` + `tasks.md`, and ask which plan to use rather than picking one.
