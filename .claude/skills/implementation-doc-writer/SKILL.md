---
name: implementation-doc-writer
description: Creates and maintains living, per-module reference documentation under `.docs/implementation/` that explains how implemented code actually works — its responsibilities, key exported types, the mechanics behind each algorithm or rule, and the boundaries it enforces — sourced from the code and the contract that built it. Use after a `/fb-apply` contract's reviewers approve and the gates go green, when asked how a system or mechanic works (e.g. "how are the cards shuffled", "how does Muster conversion work"), when asked what has been implemented so far or in a specific ticket, or when a module's code has changed enough that its doc has gone stale.
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  type: automation
---

# Implementation Doc Writer

Maintains `.docs/implementation/` as a living, module-by-module reference for how this codebase's
implemented systems actually work — the doc a developer opens months from now to answer "how are
the cards shuffled" without reading the source, and the doc that answers "what's actually been
built" without archaeology through old tickets.

**Scope:** one file per `src/` module folder, updated cumulatively as tickets touch it — never one
file per ticket. A mechanic's explanation lives in exactly one place regardless of which ticket
last touched it. This mirrors `.docs/design/` (design intent) and `.docs/game_rules/`
(rules-as-written) — this folder is the third leg: implementation-as-built.

## When to Use This Skill

- A `/fb-apply` run just finished its final review round with all reviewers approved (or residuals
  logged) — update every module the cumulative changed-files log touched, before the contract's
  Final Report.
- Asked how a system or mechanic works — "how are the cards shuffled", "how does the network
  growth work", "what does the Muster conversion do".
- Asked what has been implemented — overall, or for a specific ticket or module.
- A module's doc is suspected stale — code changed but the doc wasn't updated as part of an
  `/fb-apply` run (e.g. a manual edit outside the pipeline).

Not for: design intent or open design questions (`game-designer` owns `.docs/design/`), transcribed
rules-as-designed (`.docs/game_rules/` is written directly, not through this skill), writing the
code itself (`react-frontend` owns that), or a single ticket's PR description (the contract's own
`pr-description.md` is ephemeral and ticket-scoped — this skill's output is the opposite: permanent
and module-scoped).

## Folder structure

```
.docs/implementation/
  README.md              index: one row per module, its doc, status, and which tickets built it
  <module-slug>.md        one file per src/ folder — kebab-case of the folder name
                          (src/warCouncil/ -> war-council.md, src/vanguard/ -> vanguard.md,
                           src/battle/ -> battle.md)
```

A module gets a file the first time any ticket creates or meaningfully populates its `src/`
folder. `App.tsx` / `main.tsx` (not yet inside a named folder) share `app-shell.md` if they ever
need more than a line in the README.

## Per-module doc template

```markdown
# <Module display name> — `src/<folder>/`

**Status:** scaffold | partial | implemented
**Built by:** SCRUM-19, SCRUM-21, ...

## Responsibility
[1-2 sentences: what this module owns and why it's separate from its neighbors]

## Key types & exports
| Export | Purpose | File |
|---|---|---|
| `WarCouncilState` | placeholder state shape | `index.ts` |

## How it works
### <Mechanic name, e.g. "Shuffling">
[Plain-English explanation of the actual algorithm/logic, written for someone who won't read the
code. Point at the exact function and file: "`shuffleDeck` in `deck.ts` uses a Fisher-Yates
shuffle seeded from `crypto.getRandomValues`..." One subsection per mechanic worth a standalone
answer — a reader asking "how are the cards shuffled" should land on one heading, not grep the
whole file.]

## Rules & invariants enforced
[e.g. the pure-core ESLint boundary, a reducer-only state-update pattern — name the actual
mechanism (which lint rule, which file), not just the intent]

## Deferred / not yet implemented
[Explicit list of what this module does NOT do yet, so a reader doesn't assume more exists than
does. A scaffold-stage module's entire "How it works" section may legitimately be empty — say so
here instead of leaving the reader to wonder.]
```

Every claim under **How it works** must trace to a real file and function — this is documentation
of what ships, not of what the plan intended. If `plan.md` describes a mechanic the code doesn't
implement yet (a placeholder type, a stubbed function), that content belongs under **Deferred**,
not **How it works**.

## Workflow

### Step 1: Check — find what changed and what exists

- Get the list of touched files: the cumulative changed-files log from the calling `/fb-apply` run,
  or — if invoked standalone — `git status` / `git diff` plus the task description.
- Group touched files by their `src/<folder>/` prefix. Each distinct folder is a module to update.
- Glob `.docs/implementation/*.md` for existing docs. A touched module with no doc yet needs one
  created; a touched module with a doc needs it updated, not replaced wholesale.

### Step 2: Plan — gather sources per module

For each touched module:
- Read the contract's `plan.md` Part 2 (Approach, Data shapes, Runtime quality notes) for the *why*
  behind each decision — usually better-written prose than the code itself, and it saves
  re-deriving intent from source.
- Read the actual source files in that module — the doc must describe what's on disk, not what the
  plan proposed.
- Read the Implementer Report(s) for that phase, if available, for anything the plan didn't
  anticipate — a judgement call made mid-implementation, a note about what's deferred.

### Step 3: Validate — before writing

- Every mechanic named in **How it works** must have a real function backing it — Grep for the
  name if unsure it survived to the final diff.
- A module that is still type-only (placeholder types, no runtime logic) gets `Status: scaffold`
  and an empty or near-empty **How it works** — do not pad it with the plan's future intentions
  written as if already true.
- Check whether the ticket key is already in **Built by** before appending — don't duplicate it
  across re-runs of the same contract.

### Step 4: Execute — write

- Create the module file from the template if it doesn't exist; otherwise Edit the existing
  sections — append new **Key types & exports** rows, add new **How it works** subsections, move
  satisfied items out of **Deferred**, append the ticket key to **Built by**, and update **Status**
  if the module graduated from scaffold to partial or implemented.
- Update `.docs/implementation/README.md` — add or refresh the module's row (Module | Doc | Status
  | Built by).
- Never delete a **How it works** subsection because a later ticket didn't touch that mechanic —
  only remove or rewrite it if the mechanic itself was removed or replaced in code.

### Step 5: Verify

- Re-read the written doc. Confirm the **Status** line matches what Step 3 validated, and every
  function or file named under **How it works** actually exists (Grep it).
- Report which module docs were created vs. updated, and list anything moved into or out of
  **Deferred**.

## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/` (Glob
`.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules added
after this skill was written. See `.claude/rules/README.md` for the index. That folder is
currently empty; re-scan rather than assuming it stays that way.

## Success Criteria

- Every module touched by the calling contract has a doc under `.docs/implementation/`, created or
  updated — never skipped.
- `.docs/implementation/README.md` lists every module doc that exists, kept in sync in the same
  pass.
- Every claim under a module's **How it works** section names a real file and function — verified
  by Grep, not assumed from the plan.
- **Status** reflects the code's actual state (scaffold/partial/implemented), not the ticket's
  ambitions.
- No module doc was replaced wholesale when an incremental update would have preserved prior
  tickets' contributions.
