---
name: jira-epic-decomposition
description: Decompose a Jira epic into a sequenced, dependency-linked set of child Story/Task tickets, write the breakdown to a tasks file, then create every ticket in Jira. Use when the user gives an epic key or URL and wants it broken down, says break down this epic, decompose SCRUM-18 into tickets, turn this epic into a task list, or wants the full child-ticket tree scaffolded from an epic in one pass.
allowed-tools: Read, Grep, Glob, Write, Skill, mcp__atlassian__getAccessibleAtlassianResources, mcp__atlassian__getJiraIssue, mcp__atlassian__getVisibleJiraProjects, mcp__atlassian__getJiraProjectIssueTypesMetadata, mcp__atlassian__getIssueLinkTypes, mcp__atlassian__searchJiraIssuesUsingJql
metadata:
  type: automation
---

# Jira Epic Decomposition

Turns one Jira epic into a full, sequenced set of child tickets — read the epic and whatever it
points at, think through every part of the work with no gaps, write it to a tasks file, get the
developer's sign-off, then create every ticket for real. This is the "give me an epic key back,
get a populated backlog" skill.

## When to Use This Skill

- The developer gives a Jira epic key or URL (`SCRUM-18`, `https://.../browse/SCRUM-18`) and wants
  it broken into child tickets.
- "Break down this epic", "decompose SCRUM-18 into tickets", "turn this epic into a task list",
  "scaffold the child tickets for X".
- Not for editing or transitioning an existing ticket — that's `management-jira` directly.
- Not for planning an implementation contract for code already scoped to one ticket — that's
  `/fb-plan`.

## Skill Integrations

**management-jira**: Task file → Created tickets
- When: Phase 5 (Execute), and nowhere else
- Why: `management-jira` is this project's single owner of ticket-creation conventions (field
  templates, priority notation, backlog placement, link-type rules). This skill never calls
  `createJiraIssue` or `createIssueLink` itself — it hands the finished tasks file to
  `management-jira` and lets that skill's own Workflow A do the writing, so every ticket this skill
  produces gets the exact same conventions as one created by hand.
- How: literally invoke `/management-jira` (the `Skill` tool with `skill: management-jira`) — not
  an approximation of its conventions written inline here. See Phase 5.

## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/` (Glob
`.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules added
after this skill was written. See `.claude/rules/README.md` for the index.

## Workflow

### Phase 1 — Resolve the epic (Check)

1. Accept a bare key (`SCRUM-18`) or a full URL and extract the key.
2. Resolve the Atlassian cloud ID via `getAccessibleAtlassianResources` — same resolution
   `management-jira` uses; if more than one site is accessible, ask which one before continuing.
3. Fetch the epic with `getJiraIssue` (`fields: ["*all"]`, `responseContentFormat: "markdown"`).
   Confirm `issuetype.name` is `Epic`. If it isn't, tell the developer what type it actually is and
   confirm they still want a full breakdown before continuing — don't silently proceed as if it
   were an epic.
4. Search for existing children: `searchJiraIssuesUsingJql` with `parent = <KEY>`. If any exist,
   list them and ask the developer whether to skip decomposition, supplement the existing set, or
   start fresh — never create a second copy of a ticket that already exists under this epic.
5. Confirm the project's live issue types and priorities via `getVisibleJiraProjects` /
   `getJiraProjectIssueTypesMetadata` rather than assuming Story/Task/Bug/Epic and
   Highest–Lowest exist — team-managed projects vary.

### Phase 2 — Read what the epic points at

An epic's description routinely references design docs, prior tickets, ADRs, or other repo files.
Read every one of them before decomposing — a breakdown written from the epic summary alone
invents rules the source material already settled, or misses out-of-scope items the epic relies on
staying excluded. Follow relative paths and repo-rooted paths mentioned in the description; Grep
the repo for anything named but not linked directly. If the epic names conventions this repo
already owns elsewhere (a `CLAUDE.md` single-source-of-truth table, a skill, a rules file under
`.claude/rules/`), plan to point tickets at that owner rather than re-deriving or restating it.

### Phase 3 — Decompose with no gaps (Plan)

Work through this checklist for every epic, regardless of domain — skip a category only if the
epic's own scope genuinely excludes it, and say so in the breakdown rather than silently omitting
it:

1. **Foundational scaffold.** Shared types, module layout, anything else every other ticket needs
   to plug into. If the repo has no established structure for this kind of work yet, this is
   ticket one — decomposing straight into feature work on top of nothing produces tickets that
   each invent an incompatible shape.
2. **Core domain/rules logic.** The behavior the epic is actually about, specified precisely enough
   to be testable, kept separate from any interface.
3. **Autonomous or reactive behavior.** Ask explicitly: does anything in this epic have to act on
   its own — an opponent, a bot, a background job, a scheduled task, an agent? If yes, it needs its
   own ticket(s), and each one must state its own ambition level (heuristic vs. full search/ML,
   legal-only vs. skilled) so scope doesn't quietly creep toward the hardest version of the problem.
4. **User-facing interface.** One ticket per distinct surface the epic implies. Each should ship a
   stated *functional* default and explicitly defer visual judgement rather than blocking on it.
5. **Visual/experience polish.** Once the functional surfaces exist, give the whole thing a
   dedicated pass — spacing, colour, interactive states, motion — as its own ticket, or an explicit
   ticket asking the developer whether to skip it. "It works" is not "it looks decent," and an epic
   with a UI component that skips this reads as unfinished even when every functional AC passes.
6. **Integration.** The ticket that wires every prior piece into one running whole. Schedule it
   last among build work — it is where independently-built pieces reveal interface mismatches.
7. **Deploy/release.** However this repo ships. Unlike integration, schedule this *early* in
   parallel with build work where possible — a broken deploy pipeline is cheap to catch against a
   placeholder and expensive to debug for the first time under deadline pressure.
8. **Verification & sign-off.** One closing ticket that checks the epic's own stated Definition of
   Done as a whole, end to end, against the real deployed/integrated result — not a re-statement of
   the per-ticket tests that already passed.

Two more principles that keep the breakdown honest:

- **State a default, don't stall.** For every open question the source material leaves unresolved,
  pick a stated, reversible default and note it in that ticket's Dependencies & Risks — don't block
  the whole decomposition on it. Reserve an actual pause — its own low-priority ticket, or a
  flagged question to the developer — for genuine judgement calls: visual/aesthetic direction, a
  new external dependency, or anything the repo's own docs already name as developer-owned.
- **Illustrative numbers stay illustrative.** If the source material marks a value as an example or
  not-yet-chosen, the ticket implements it as a named, easily-retuned constant — never a decision
  this skill makes on the developer's behalf.

For each ticket, write the full content `management-jira`'s Story/Task (or Bug) template expects —
do not restate that template here, use it. Include, per ticket: suggested type, suggested priority,
parent epic key, which other tickets in this breakdown it's blocked by / blocks, and which of this
repo's skills (if any) owns the work.

Also produce a plain-text sequencing diagram (blocker → blocked, grouped by the checklist phases
above) — this is what turns the flat ticket list into a build order, and it's what Phase 5 links
literally.

Write the result to `.claude/contract/<EPIC-KEY>-epic-breakdown/tasks.md`, with a header note
stating plainly that this file is a ticket-creation worklist, not an `/fb-plan` implementation
contract (no `^Status:` line, not walked by `/fb-apply`). If the developer names an exact path
instead, use that.

### Phase 4 — Approval gate (Validate) — mandatory, never skipped

Creating tickets is visible to the whole team and not cheaply undone. Before calling
`management-jira`:

1. Show the developer the full ticket list (title, type, priority, one-line summary of what it
   covers) and the sequencing diagram, in chat.
2. Ask a direct, explicit question — "Create these N tickets in Jira now?" — and wait for an
   unambiguous yes. Never infer approval from the conversation continuing, and never treat writing
   the tasks file itself as approval to create anything.
3. If the developer wants changes, edit the tasks file and re-present before asking again.

### Phase 5 — Create the tickets (Execute)

**This phase must call `/management-jira`** — call the `Skill` tool with `skill: management-jira`,
exactly as if the developer had typed `/management-jira` themselves. Do this once, with `args`
pointing at the tasks file's path and instructing it to create every ticket in the order listed —
so a ticket's dependencies already have real keys by the time they need linking — then link every
stated Blocks/Blocked-by relationship from the sequencing diagram. Let `management-jira`'s own
Workflow A and Rules Summary govern every field this produces; this skill supplies content and
order, never the write calls themselves. Do not paraphrase or hand-roll `management-jira`'s
conventions inline — actually invoke it.

Confirm link direction live via `getIssueLinkTypes` before linking rather than assuming — Jira's
`inward`/`outward` semantics for "Blocks" are easy to get backwards, and getting it backwards
silently inverts the whole dependency graph.

### Phase 6 — Verify and report (Verify)

1. Re-run `searchJiraIssuesUsingJql` with `parent = <KEY>` and confirm the returned count matches
   the tasks file's ticket count.
2. Spot-check that a few of the stated Blocks links actually landed (re-read one or two created
   issues, or trust `createIssueLink`'s per-call confirmation from Phase 5 — don't silently assume).
3. Report a table of key → title → type → priority, a link to the tasks file, and flag any ticket
   that represents a genuine pause condition (visual judgement, a new dependency, anything the
   checklist's "state a default" principle escalated instead of deciding).

## Safety

- Never call `createJiraIssue` or `createIssueLink` directly from this skill — Phase 5 must always
  go through an actual `/management-jira` invocation, so ticket conventions never drift between the
  two skills.
- Never skip Phase 4. An epic with 20 child tickets is 20 pieces of visible, shared state — treat
  the approval gate the same way `/fb-plan`'s gate is treated in this repo: mandatory, explicit,
  never inferred.
- Never silently duplicate: Phase 1 Step 4's existing-children check exists specifically so a
  second run of this skill on the same epic doesn't double the backlog.
- Never invent a ticket ID or assume a link direction — resolve both live, every time.

## Success Criteria

- The epic and everything it references was actually read (Phase 2), not summarized from title
  alone.
- The checklist in Phase 3 was applied in full, with an explicit note for any category the epic
  genuinely excludes — no silent gaps.
- `.claude/contract/<EPIC-KEY>-epic-breakdown/tasks.md` exists, with every ticket's full
  Problem Statement / User Story / Acceptance Criteria / Scope Boundaries / Dependencies & Risks
  content already written — nothing left as a placeholder for `management-jira` to improvise.
- The developer explicitly approved the ticket list before any `createJiraIssue` call happened.
- `searchJiraIssuesUsingJql` with `parent = <KEY>` returns exactly the tickets the tasks file
  described, each carrying its stated priority and type.
- Every dependency in the tasks file's sequencing diagram exists as a live `Blocks` link, not just
  prose.

## Example

`/jira-epic-decomposition SCRUM-18` → resolve the epic, read the two design docs its description
references, notice it needs foundational scaffolding + two rules engines + two CPU opponents + four
UI surfaces + a polish pass + deploy + sign-off, write all eighteen tickets with full templates and
a dependency graph to `.claude/contract/SCRUM-18-epic-breakdown/tasks.md`, show the developer the
list, and on their go-ahead create all eighteen in Jira with every Blocks link wired.
