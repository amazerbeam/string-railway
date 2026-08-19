# CLAUDE.md — `.claude/commands/`

Guidance for **editing the five `/fb-*` command files in this directory**. If you are *running* a command, read that command's own file — it is self-contained by design.

## What this file does not repeat

The root `CLAUDE.md` warns that a fact restated in five files gets updated in four. So this file covers only what an editor of a command file needs. Everything else is owned elsewhere:

| Fact | Owner |
|---|---|
| What the pipeline is and why it exists | root `CLAUDE.md` → *Architecture: the `/fb-*` contract pipeline* |
| Where code lives, runner commands, correctness traps | `.claude/workflow/web-project.md` |
| Slug grammar, how a command picks *which* plan | `.claude/workflow/plan-resolution.md` |
| React/TypeScript conventions, architectural boundaries (if any) | `.claude/skills/react-frontend/SKILL.md` |
| Jira status meanings and which transitions are automatic | `.claude/skills/management-jira/SKILL.md` → *The DLR status model* |
| Project-wide domain rules | `.claude/rules/` (see its `README.md`) |

**Reference, never copy.** A command names the file or skill and instructs a Read. Pasting a skill's conventions into a command creates a second source of truth that silently rots — this is the single most common defect in this directory.

## The five commands

| File | Persona it opens with | `$ARGUMENTS` | Writes |
|---|---|---|---|
| `fb-plan.md` | Planning Agent | the task brief (prose, Jira key, spec, or file ref) | `<plan>/plan.md` and `<plan>/mockup.html` (the latter for UI-classified work only) — both presented together at one approval gate — then `<plan>/tasks.md` |
| `fb-apply.md` | Orchestrator | slug (optional) | code, `tasks.md` ticks and `Status:` |
| `fb-issue.md` | — | the issue description, **not** a slug | the target skill/agent, `<plan>/corrections.md` |
| `fb-archive.md` | Archive Agent | slug (optional) | `.claude/lessons/<slug>.md`, moves the plan folder |
| `fb-report.md` | — | slug (optional) | nothing — read-only diagnostic |

Each resolver accepts a different status set, and that filter is load-bearing:

- `fb-apply` — `PLANNED`, `IN PROGRESS`, `BLOCKED`
- `fb-archive` — `COMPLETE`, `BLOCKED`
- `fb-report` — any status
- `fb-issue` — **skips step 1 of the resolution algorithm**, because `$ARGUMENTS` here is prose; freeform text would otherwise be read as an explicit plan target

## Structural conventions

- **Frontmatter is `description:` only.** No `allowed-tools`, no `argument-hint`, no `model` on any of the five. Match that unless there is a stated reason.
- **Steps are `## Step N:`**, and fractional steps are normal (`1.5`, `1.6`, `1.7`, `2.5`, `4.5`) — they exist so a step can be inserted without renumbering every downstream cross-reference. Prefer a fractional step over renumbering.
- **Cross-references cite step numbers and line-anchored names** (`see Step 3`). If you renumber, grep this directory for the old number.
- Agent dispatch prompts and developer-facing output are **fenced templates** with `[bracketed placeholders]`. Keep them fenced — they are copied verbatim at runtime.

## Ownership map — exactly one command owns each of these

Duplicating any row means two commands fight over the same state.

| State | Owner |
|---|---|
| Writes `Status: PLANNED` | `fb-plan` Step 4 |
| Writes `IN PROGRESS` | `fb-apply` Step 1 |
| Writes `COMPLETE` / `BLOCKED` | `fb-apply` Step 7 |
| Reads status only, never writes | `fb-archive`, `fb-report` |
| The single `AskUserQuestion` approval gate before `tasks.md` — covering `plan.md` **and** the UI mockup together | `fb-plan` Step 3 — mandatory, never inferred from chat. For UI-classified work the mockup is built in Step 3.5 *before* this gate and presented in the same handoff; Step 3.5 carries no gate of its own. Never split this into two sequential gates: the gate's question promises `tasks.md` next, so every artefact it authorises must already be on the table. |
| Destructive moves (plan → `archive/`, corrections → `lessons/`) | `fb-archive` Step 7, behind its own confirmation prompt |
| Unfiltered test suite + production build | the **QA agent only**, once, at the end of `fb-apply` |

### Jira transitions

Five boundaries, each owned once. Rules live in `management-jira`; these are the insertion points:

| Command | Step | Transition |
|---|---|---|
| `fb-plan` | 0.5 (key found in the brief — the command's **first** action, after Step 0's refusal gate only) | `→ Planning` |
| `fb-plan` | 5 (`tasks.md` written) | `Planning → Planned` |
| `fb-apply` | 1 (slug resolved — the command's **first** action, before the contract files are read) | `Planned → Coding` |
| `fb-apply` | 7 (`COMPLETE` written) | `Coding → Ready for Test` |
| `fb-archive` | 7 (clean-up, `COMPLETE` only) | `Ready for Test → Done` |

These run automatically with no confirmation prompt, are reported in the command's output block, and must never fail the command. Blocked work is a **flag**, not a status — `fb-apply`'s Pause Conditions and its `BLOCKED` path flag the card and leave the status alone. Never hardcode a transition or status id; resolve it live.

## Invariants an edit must not break

1. **No reviewers between phases.** Per-phase review was deliberately removed. The Implementer carries quality through all phases. Adding a review dispatch inside the phase loop is a regression, not an improvement.
2. **Agents have isolated context.** Everything an agent needs goes in its dispatch prompt. Never write "as established earlier" or assume a prior phase is remembered.
3. **File paths are owned by tasks, not by `plan.md`.** Each `### Task N:` carries its own `**Files:**` block, and nothing outside that union may be touched.
4. **The Implementer runs scoped Vitest plus `typecheck` only**, batched per phase. The full suite and the build belong to QA.
5. **Never name a skill that does not exist on disk.** Commands Glob `.claude/skills/*/SKILL.md` and read `description:` lines rather than working from a remembered roster.
6. **Pause conditions are real.** Tuning values, configuration edits, design ambiguities, overturning a previously documented decision, new dependencies, visual judgement, and anything needing the developer's *judgement* of the running app all stop the pipeline. No command decides these on its own authority. A runtime check with a right answer is **not** a pause — QA drives the app through the `chrome-devtools` MCP (`.claude/agents/qa.md` → Step 4.5); reserve the pause for questions of feel.
7. **Static gates are never `N/A`** while TypeScript is in the diff. `typecheck`, `lint`, `format:check`, `test`, `build` all exist and all run.

## Before you finish an edit here

- Did you copy something that a workflow file, skill, or rule already owns? Replace it with a reference.
- Did you renumber a step? Grep this directory for the old number.
- Did you add state a second command also writes? Check the ownership map.
- Did you add a Jira status name or id? Names come from `management-jira`; ids are resolved live, never written down.
- Does a changed dispatch prompt still stand alone with no prior context?

`.claude/agents/` holds the four agent definitions the commands dispatch to (`implementer`, `code-evaluator`, `defender`, `qa`). A change to what an agent is told usually belongs in the agent file, not in the command that dispatches it.
