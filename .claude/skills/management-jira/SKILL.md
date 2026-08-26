---
name: management-jira
description: Create and manage Jira tickets. Use when creating any Jira issue — epics, stories, tasks, or bugs — or when transitioning, commenting on, or updating existing tickets. Triggered by phrases like create a ticket, add to Jira, log a bug, create a story, raise a task, move DLR-12 to Coding, close out DLR-12, log a status update on the ticket, or after a commit or PR lands.
allowed-tools: Read, PowerShell(git log:*), PowerShell(git rev-parse:*), PowerShell(gh pr view:*), mcp__claude_ai_Atlassian_Rovo__getAccessibleAtlassianResources, mcp__claude_ai_Atlassian_Rovo__getVisibleJiraProjects, mcp__claude_ai_Atlassian_Rovo__getJiraIssue, mcp__claude_ai_Atlassian_Rovo__searchJiraIssuesUsingJql, mcp__claude_ai_Atlassian_Rovo__createJiraIssue, mcp__claude_ai_Atlassian_Rovo__createIssueLink, mcp__claude_ai_Atlassian_Rovo__getIssueLinkTypes, mcp__claude_ai_Atlassian_Rovo__getTransitionsForJiraIssue, mcp__claude_ai_Atlassian_Rovo__transitionJiraIssue, mcp__claude_ai_Atlassian_Rovo__addCommentToJiraIssue, mcp__claude_ai_Atlassian_Rovo__editJiraIssue, mcp__claude_ai_Atlassian_Rovo__getJiraProjectIssueTypesMetadata, mcp__claude_ai_Atlassian_Rovo__getJiraIssueTypeMetaWithFields
metadata:
  type: automation
---

# Management — Jira

## Overview

Full lifecycle Jira skill. Two workflows: **create** a new issue, or **manage**
an existing one (transition + comment). Both follow the same conventions —
correct priority labels, the closed label vocabulary, no subtasks, backlog
placement, parent epic linking, and plain-text comments.

## Instance

Never hardcode an instance URL or cloud ID. Resolve them at runtime:

1. Call `getAccessibleAtlassianResources` to list the sites the current
   credentials can reach.
2. If exactly one site is returned, use it. If more than one, ask the user
   which site to work in before doing anything else.
3. Reuse that cloud ID for every call in the session.

If the MCP returns an auth error mid-session, call
`getAccessibleAtlassianResources` again to refresh and re-confirm the cloud ID
before proceeding.

---

## The DLR status model

This file is the **single owner** of what each `DLR` status means. The
`/fb-*` commands reference this section; they do not restate it.

`DLR` ("DeLorean 1.21") is a team-managed project whose six statuses mirror
the `/fb-*` contract pipeline, so the board tracks the contract rather than
being maintained by hand:

> **The key was `SCRUM` and is now `DLR`.** Same project (id `10000`), renamed —
> issue **numbers were preserved**, so a historical `SCRUM-32` is today's
> `DLR-32`, and Jira still resolves the old key as an alias. Contract folders
> written before the rename (`DLR-44`, `DLR-45`, `DLR-46`, `DLR-47`, `DLR-65`)
> still quote `SCRUM-<n>` keys in their prose; that is a **record of what was
> true when written and must not be rewritten** — read them through this
> mapping. Every *live* instruction across `.claude/` was corrected on
> 2026-08-18. This site also holds a second project, `MPP` ("My Pantry Plan"),
> which is nothing to do with this repository — `DLR` is the only project the
> `/fb-*` pipeline touches.

| Status | Category | Set when | `tasks.md` `^Status:` |
|---|---|---|---|
| `To Do` | To Do | Backlog. No contract folder exists. | — |
| `Planning` | To Do | `/fb-plan` created the plan folder and is writing `plan.md`. | none yet |
| `Planned` | To Do | `tasks.md` written after the approval gate; awaiting `/fb-apply`. | `PLANNED` |
| `Coding` | In Progress | `/fb-apply` resolved the contract and is walking the phases. | `IN PROGRESS` |
| `Ready for Test` | In Progress | `/fb-apply` finished, gates green — awaiting the developer at the app. | `COMPLETE`, not archived |
| `Done` | Done | Play-tested and `/fb-archive` run. | `COMPLETE`, archived |

`Planning` is a **claim marker**, not a dwell state — it says an agent is
mid-plan on this ticket right now, and it makes an abandoned `/fb-plan`
visible, because a ticket left in `Planning` is a plan that never reached
approval.

`COMPLETE` in `tasks.md` maps to two Jira statuses, split on whether the
contract has been archived: `Ready for Test` before `/fb-archive`, `Done`
after. `tasks.md` keeps its own four-value vocabulary — do not try to make the
two lists identical.

### Blocked is a flag, not a status

There is deliberately no `Blocked` column. Being blocked is orthogonal to
progress — a ticket can be blocked while `Planned`, `Coding`, or `Ready for
Test`, and a status would force it to forget where it was. `tasks.md`'s
`BLOCKED`, and every `CLAUDE.md` pause condition, map to **flag the card and
leave the status alone**.

Flagging is a field write, not a transition: set the **Flagged** field to
`Impediment` via `editJiraIssue`, and clear it to remove the flag.

- **Resolve the field id live.** Call `getJiraIssueTypeMetaWithFields` for the
  project and issue type and read the `Flagged` field's `customfield_XXXXX` id
  and its `allowedValues`. Never hardcode the id — it differs per site.
- **`editJiraIssue` frequently times out on this instance while the write
  still lands.** Do not retry on timeout. Re-read with `getJiraIssue` to
  confirm, and only act if the field genuinely did not change.
- If the field cannot be resolved, say so and add a plain-text comment naming
  the blocker instead. A missing flag is a reporting gap; a wrong status is a
  lie about where the work is.

### Pipeline transitions are automatic

Five transitions are driven by the `/fb-*` commands and run **without a
confirmation prompt**. They are pre-authorised because each is a
deterministic consequence of contract state the developer already approved —
not a judgement call:

| Command | Moment | Transition |
|---|---|---|
| `/fb-plan` | plan folder created | `→ Planning` |
| `/fb-plan` | `tasks.md` written | `Planning → Planned` |
| `/fb-apply` | contract resolved | `Planned → Coding` |
| `/fb-apply` | final report, gates green | `Coding → Ready for Test` |
| `/fb-archive` | clean-up | `Ready for Test → Done` |

Rules that apply to all five:

- **Report, never transition silently.** Name the transition in the command's
  existing output block so an automatic change is still visible.
- **Never fail the command on a Jira error.** Surface it and continue — a
  contract must not be blocked by an unreachable ticket tracker.
- **Skip silently when there is no ticket.** Derive the key from the plan slug
  (`DLR-<n>-*`); a date-branch slug has no key, so do nothing.
- **No-op when already in the target status**, and tolerate skipped
  predecessors — transitions are any → any, so `/fb-apply` on a `To Do` ticket
  goes straight to `Coding`.
- **Names here, ids resolved live.** Naming `Planning` as a target is not
  hardcoding: still call `getTransitionsForJiraIssue` and read the id from the
  response. A literal transition id in any file is a defect.

Everything *outside* this table — a human saying "move DLR-5 to Coding" —
is Workflow B and still requires explicit confirmation.

---

## The label vocabulary

This file is the **single owner** of the label set. It exists to answer one
question off the board, without opening a ticket: **when this closes, will
there be something the developer can actually put their hands on?**

Labels are a **closed set**. Never invent one outside the two axes below — a
one-off label is invisible on a board because nobody thinks to filter for it,
which defeats the entire point.

### Axis 1 — layer (mandatory, exactly one)

| Label | The ticket's work lands in | Verified by |
|---|---|---|
| `ui` | a surface the developer can see and operate — a screen, a HUD, a board renderer, an interaction model, a visual or copy pass | opening the app |
| `engine` | rules, scoring, state machines, CPU logic, domain types — no visible surface | Vitest |
| `infra` | scaffold, toolchain, CI, deploy, dependency and configuration plumbing | the gates, or a deploy URL |
| `design` | a document or a recorded decision, no code | reading it |
| `spike` | time-boxed research whose deliverable is a finding | reading the finding |

- **Exactly one, always.** A mixed ticket takes the layer its *diff* mostly
  lands in. If it is genuinely half and half, that is usually two tickets.
- **Judge by where the files change, not by what the ticket is about.** A
  ticket that moves something on screen but only edits engine files is
  `engine` — its own `Affected Product` section is the evidence. Getting this
  backwards is the most common mislabel.
- **Epics take no layer label.** Their children carry it; an epic labelled
  `ui` pollutes every filter with a container.

### Axis 2 — `playable` (optional, add alongside the layer)

Add `playable` when **closing this ticket leaves the developer able to open the
app and exercise the change by hand.** This is the label that answers "when do
I get something to test", so it is the one that has to be honest.

- **`ui` does not imply `playable`.** A types-only mount contract, or a
  component with no route into it yet, is `ui` and not `playable`.
- **`engine` can be `playable`** when it changes behaviour already reachable
  through a shipped screen.
- A bug found by playing is almost always `playable`.
- If the honest answer is "only once the ticket after it lands", leave
  `playable` off and say so in `Dependencies & Risks`. A `playable` that turns
  out not to be is worse than none, because it is the label the developer
  plans their evening around.

### Board setup (one-time, so the labels are visible)

Labels do not show on cards by default. Add the **Labels** field via board
settings → **Card layout**, and keep a **`playable`** filter to hand. Without
that, the labels are correct and useless.

Pre-existing free-form labels on old tickets (`prototype-playtest`,
`latent-defect`, `rules-engine`, `platform-research`) predate this vocabulary.
Leave them where they are, do not add more, and do not strip them while
touching a ticket for another reason.

---

## Workflow A — Create a Ticket

Use when the user says "create a ticket", "add to Jira", "log a bug", "create
a story", or "raise a task".

### Step 1: Gather required information

Confirm the following before creating anything. If context makes an answer
obvious, use it; otherwise ask.

**All ticket types**

- **Project** — ask: "Which Jira project?" If unsure, call
  `getVisibleJiraProjects` and let the user choose.
- **Summary** — clear, concise title
- **Issue type** — Epic, Story, Task, Bug, or Test (never Subtask — see rules).
  Test is only available in some projects — if the user requests it, confirm
  via `getJiraProjectIssueTypesMetadata` that the project supports it before
  proceeding.
- **Priority** — Highest, High, Medium, Low, or Lowest. Never use P0/P1/P2/P3
  or any other notation.
- **Description** — see Step 2
- **Labels** — pick the layer label, and decide `playable`, per *The label
  vocabulary*. Do **not** ask; derive both from the work and state the choice
  in your output so a wrong call is visible and correctable. Non-epics always
  carry a layer label; epics carry none.
- **Fix version** — ask: "Does this belong to a fix version?" Link if provided;
  skip if not.

**Test tickets only**

Both Testing Type and Test Activity are fixed dropdown fields — Jira rejects
any value that isn't one of the field's configured options. Never hardcode
or guess the option list; always call `getJiraIssueTypeMetaWithFields` for
the target project and Test issue type to read the live `allowedValues`
before asking the user to choose.

- **Testing Type** — mandatory custom field. Fetch the live allowed values,
  present them, and ask the user to pick one. Do not create the ticket
  without this value.
- **Test Activity** — optional custom field (Authoring / Execution, or
  whatever the live field metadata returns). Ask which applies; if the user
  doesn't know or skips it, leave it unset — do not block creation on it.

**Non-epic tickets only**

- **Parent epic** — ask: "Does this belong to an epic?" If yes, set as parent.
  If the user names one but you don't have its ID, search with
  `searchJiraIssuesUsingJql` first.
- **Related tickets** — ask: "Is this related to or blocked by existing
  tickets?" Note them for linking after creation (Step 4).

### Step 2: Write the description

Use the correct template for the issue type. If the user hasn't provided
enough information to fill a section, ask — do not leave sections blank or
use placeholder text.

**Story / Task**

```
## Problem Statement
[Why does this matter? What problem or opportunity does this address?]

## User Story
As a [type of user], I want to [do something], so that [I get this value/outcome].

## Acceptance Criteria
[Minimum 3 testable criteria — numbered list. Each must be specific and verifiable.]
1. 
2. 
3. 

## Scope Boundaries
**In scope:** [bullet list]
**Out of scope:** [bullet list]

## Dependencies & Risks
[Dependencies on other tickets, teams, or systems. Risks or open questions.]

## Design Assets
[Figma links, screenshots, or design specs. Write "N/A" if not applicable.]
```

**Bug**

```
## Problem Statement
[What is broken and why does it matter?]

## Affected Product
[Which product, service, or project is affected?]

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behaviour
[What should happen]

## Actual Behaviour
[What actually happens]

## Environment
[Browser, OS, version, account type, or other relevant context]

## Dependencies & Risks
[Related tickets, affected areas, or rollback considerations]
```

**Test**

```
## Objective
[What this test case verifies]

## Preconditions
[State or setup required before the test can run]

## Test Steps
1. 
2. 
3. 

## Expected Result
[What should happen if the system behaves correctly]

## Related Tickets
[Story, Task, or Bug this test case validates. Write "N/A" if not applicable.]
```

**Epic**

```
## Objective
[What this epic achieves]

## Background
[Why this work is needed]

## Approach
[How the work will be done — tools, methods, phases]

## Scope
**In scope:** [bullet list]
**Out of scope:** [bullet list]

## Prioritisation
Use Jira priorities (Highest → Lowest) to triage child issues.

## Deliverables
[Bullet list of tangible outputs]

## Definition of Done
[Numbered list of completion criteria]
```

### Step 3: Create the ticket

Call `createJiraIssue` with:

- `cloudId`: the cloud ID resolved in the Instance section
- `projectKey`: as confirmed in Step 1
- `issueTypeName`: Epic / Story / Task / Bug / Test
- `summary`: ticket title
- `description`: formatted per Step 2
- `contentFormat`: `markdown`
- `additional_fields`:
  - `priority`: `{ "name": "High" }` (or whichever applies)
  - `labels`: a plain string array — the layer label, plus `playable` if it
    applies. E.g. `["ui", "playable"]`, or `["engine"]`. Omit the field
    entirely for an epic. This is a standard Jira field, so no live id
    resolution is needed — but note that `labels` **replaces** the whole array
    on an `editJiraIssue` call, so read the current labels first when adding
    one to an existing ticket rather than clobbering what is there.
  - `fixVersions`: `[{ "name": "version name" }]` if provided
  - `parent`: `{ "key": "PROJ-XX" }` if a parent epic was confirmed (non-epics only)
  - Testing Type field: required for Test tickets. Call
    `getJiraIssueTypeMetaWithFields` for the target project and the Test
    issue type to get the exact custom field ID (`customfield_XXXXX`) and
    its live `allowedValues`. Set the field to the exact value object the
    user selected from that list (e.g. `{ "id": "..." }` or `{ "value": "..." }`
    as returned by the API) — never a hand-typed string.
  - Test Activity field: same rule — read the live `allowedValues` from
    `getJiraIssueTypeMetaWithFields`, set it only if the user picked one, and
    omit the field entirely if not provided rather than guessing a value.

### Step 3b: Sprint placement

Ask where the ticket goes: **the current sprint, or the backlog.** Both are
valid; neither is the silent default.

To put a ticket in a sprint, set the Sprint field in `additional_fields` to the
sprint's **numeric id as a bare scalar** — e.g. `"customfield_10020": 134`.

**Not an array.** `createJiraIssue` rejects `[134]` with
`400 {"customfield_10020": "Specify a valid value for Sprint"}` and creates
nothing, even when the id is a valid active sprint — verified on this instance
2026-08-26 while creating DLR-148. The scalar succeeds on create and reads back
as an array (`fields.customfield_10020[0]`), which is what makes the array form
look correct and is why this was wrong for so long. Write a scalar, read an
array.

- **Resolve the field id live.** Call `getJiraIssueTypeMetaWithFields` for the
  project and issue type and read the Sprint field's `customfield_XXXXX` id.
  Never hardcode it — it differs per site.
- **Resolve the sprint id live, and never guess it.** The Sprint field returns
  no `allowedValues`, and this MCP exposes no board or sprint API, so the id
  cannot be enumerated from field metadata. The only reliable route is to read
  it off an issue already in the target sprint: `searchJiraIssuesUsingJql` with
  `sprint in openSprints()`, then read `fields.customfield_10020[].id`,
  `.name`, and `.state`.
- **Do not probe candidate ids with JQL — it does not work on this instance.**
  `sprint = <id>` returns an empty result set for a nonexistent id rather than
  erroring (verified 2026-08-09 against DLR: `sprint = 99999` returned zero
  issues, no error), so an empty result proves nothing either way. An empty
  sprint and a nonexistent one are indistinguishable this way.
- **A brand-new sprint holds no issues, so its id cannot be read.** The first
  ticket into an empty sprint has to have its id supplied by the user — read
  from the board URL or the sprint header in Jira. Ask for it; do not guess.
- **Only ever write an `active` or `future` sprint.** Check the `state` field
  before writing. Assigning to a `closed` sprint silently misfiles the ticket
  where nobody will look at it.
- **If no open sprint exists, do not invent one.** Sprints cannot be created
  through this MCP. Say so, create to the backlog, and tell the user to start a
  sprint on the board — then set the field afterwards with `editJiraIssue`.
- **`editJiraIssue` frequently times out on this instance while the write still
  lands.** Do not retry on timeout. Re-read with `getJiraIssue` to confirm.

Omit the field entirely to land in the backlog.

### Step 4: Link related work items

After creation, if the user identified related or blocked tickets, call
`createIssueLink`.

Use these link types only:

- **Relates** — general relationship
- **Blocks / is blocked by** — when one ticket must complete before another

Call `getIssueLinkTypes` if you need to confirm available link type IDs for
the instance.

---

## Workflow B — Manage an Existing Ticket

Use when transitioning a ticket's status or posting a status comment — for
example after a commit lands, a PR is opened or merged, or the user says
"move DLR-12 to Coding" / "close out DLR-12" / "log a status update".

### Phase 1 — Identify the ticket

Precedence: user-supplied → branch name (`feature/DEV-302`) → last commit
subject → ask. Do not invent an ID.

### Phase 2 — Gather session context

Pull facts from the current session, not from the ticket itself:

- Branch name, latest commit SHA + subject (`git log -1 --format="%H %s"`)
- Open PR, if any (`gh pr view --json number,title,url,state`)
- What actually changed — the user already knows because they just watched it
  happen

Do not summarise the ticket description back to the ticket.

### Phase 3 — Draft and confirm

Show the proposed comment and transition together before doing anything:

```
Proposed update for DLR-12:

  Transition: Planned → Coding
  Comment:
    Started on the station card seat colour — the CSS stroke was overriding
    the per-seat colour, so the fix is scoped to the board renderer.
    https://github.com/example-org/strings-and-stations/pull/36

Apply?
```

This confirmation applies to **ad-hoc** transitions only. The five pipeline
transitions in *The DLR status model* run automatically and skip this step.

On explicit confirmation, call `addCommentToJiraIssue` then
`transitionJiraIssue`. Comment first — if the transition fails, the comment
still carries the status update.

### Phase 4 — Verify

Re-read the issue with `getJiraIssue` and confirm the status moved and the
comment shows.

#### Comment convention

- Plain text only. No headings, bullets, emoji, or backtick-wrapped phrases
  beyond the occasional `identifier`.
- One short paragraph — two or three sentences is typical; four is long.
- Lead with what changed, then the link. Write it as you'd update a teammate
  in chat.
- One link only — the PR URL, or the commit URL if there's no PR yet. Raw URL,
  no link text dressing.

If there is nothing meaningful to say, do not post a comment. A silent
transition is better than a filler comment.

Re-quote the PR title verbatim when it already says what happened — a good
PR title is a good Jira comment.

A comment that restates the ticket description is noise. The ticket creator
wrote that; do not echo it back.

### Do Not Use Workflow B When

- Logging worklog or time tracking — out of scope
- Bulk-updating multiple tickets at once

### Success Criteria

- [ ] Ticket identified, not invented
- [ ] Comment is plain text, ≤4 sentences, one link
- [ ] Transition chosen from the live `getTransitionsForJiraIssue` list
- [ ] User confirmed both the comment text and the transition before either ran

---

## Rules Summary

| Rule | Requirement |
|---|---|
| Jira project | Always ask which project the ticket belongs to |
| Priority labels | Always Highest, High, Medium, Low, or Lowest — never P0/P1 etc. |
| Labels | Closed set, per *The label vocabulary*. Exactly one layer label on every non-epic, none on an epic; add `playable` only when the developer can exercise it by hand on close. Derive it, state it, never ask. |
| Subtasks | Never create subtasks — use linked tickets instead |
| Sprint | Ask: current sprint or backlog. Resolve the sprint **id** live from an issue already in it — never guess an id, never write a `closed` sprint. Omit the field for backlog. |
| Parent epic | Always ask for non-epic tickets; set as parent if confirmed |
| Fix version | Always ask; link if provided |
| Testing Type | Mandatory for Test tickets — fixed dropdown; always read live `allowedValues` from `getJiraIssueTypeMetaWithFields`, never hardcode the option list |
| Related tickets | Ask, then use Relates or Blocks/is blocked by links post-creation |
| Transitions | Always resolve transition **ids** live from `getTransitionsForJiraIssue` — never hardcode an id |
| Auto-transition | Ad-hoc transitions need explicit user confirmation. The five pipeline transitions in *The DLR status model* are pre-authorised and automatic |
| Blocked work | Flag the card; never invent a `Blocked` status |
| Instance | Resolve the site and cloud ID via `getAccessibleAtlassianResources`; ask if more than one is accessible |

## Forbidden Behaviors

- Fabricating a Jira ticket ID
- Hardcoding an instance URL or cloud ID instead of resolving it at runtime
- Using Subtask as the issue type — use Story, Task, or Bug instead
- Writing a guessed, hardcoded, or `closed` sprint id instead of one resolved
  live from an issue already in the target sprint
- Posting a Markdown-formatted comment (headings, bullets, emoji)
- Auto-transitioning on commit/PR merge without explicit confirmation — the
  pre-authorised `/fb-*` pipeline transitions are the only exception
- Hardcoding a numeric transition or status id instead of resolving it live
- Adding a `Blocked` status instead of flagging the card
- Using P0/P1/P2/P3 or any non-standard priority notation
- Creating a non-epic with no layer label, or inventing a label outside the
  closed set in *The label vocabulary*
- Labelling a ticket `ui` because it concerns something on screen when its own
  `Affected Product` scopes the change to non-UI files
- Marking a ticket `playable` when it is only playable once a later ticket
  lands — the dependency belongs in `Dependencies & Risks`, not in a label
- Overwriting a ticket's existing labels when adding one — `labels` replaces
  the array, so read the current value first
- Editing fields not covered by this skill — no assignee changes, no component tweaks
- Creating a Test ticket without a confirmed Testing Type value
- Hardcoding Testing Type or Test Activity option lists instead of reading live `allowedValues` from `getJiraIssueTypeMetaWithFields`

## References

- Atlassian — [Jira issue workflows][jira-wf]

[jira-wf]: https://support.atlassian.com/jira-cloud-administration/docs/work-with-issue-workflows/
[bn]: ../iac-branch-naming/SKILL.md
[commit]: ../iac-commit/SKILL.md
[pr]: ../iac-pull-request/SKILL.md
[confluence]: ../management-confluence/SKILL.md
