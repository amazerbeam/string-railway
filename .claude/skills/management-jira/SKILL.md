---
name: management-jira
description: Create and manage Jira tickets. Use when creating any Jira issue — epics, stories, tasks, or bugs — or when transitioning, commenting on, or updating existing tickets. Triggered by phrases like create a ticket, add to Jira, log a bug, create a story, raise a task, move DEV-123 to In Review, close out DEV-123, log a status update on the ticket, or after a commit or PR lands.
allowed-tools: Read, Bash(git log:*), Bash(git rev-parse:*), Bash(gh pr view:*), mcp__atlassian__getAccessibleAtlassianResources, mcp__atlassian__getVisibleJiraProjects, mcp__atlassian__getJiraIssue, mcp__atlassian__searchJiraIssuesUsingJql, mcp__atlassian__createJiraIssue, mcp__atlassian__createIssueLink, mcp__atlassian__getIssueLinkTypes, mcp__atlassian__getTransitionsForJiraIssue, mcp__atlassian__transitionJiraIssue, mcp__atlassian__addCommentToJiraIssue, mcp__atlassian__getJiraProjectIssueTypesMetadata, mcp__atlassian__getJiraIssueTypeMetaWithFields
metadata:
  type: automation
---

# Management — Jira

## Overview

Full lifecycle Jira skill. Two workflows: **create** a new issue, or **manage**
an existing one (transition + comment). Both follow the same conventions —
correct priority labels, no subtasks, backlog placement, parent epic linking,
and plain-text comments.

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

Never set a sprint field. All tickets go to the backlog — do not pass `sprint`,
`customfield_10020`, or any sprint-related field.

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
"move DEV-302 to In Review" / "close out DEV-302" / "log a status update".

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
Proposed update for DEV-302:

  Transition: In Progress → In Review
  Comment:
    Opened PR #36 for the branch-naming skill — thin wrapper over the
    documented branching model, pairs with iac-commit and iac-pull-request.
    https://github.com/example-org/agents/pull/36

Apply?
```

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
| Subtasks | Never create subtasks — use linked tickets instead |
| Sprint | Never assign to a sprint — always land in backlog |
| Parent epic | Always ask for non-epic tickets; set as parent if confirmed |
| Fix version | Always ask; link if provided |
| Testing Type | Mandatory for Test tickets — fixed dropdown; always read live `allowedValues` from `getJiraIssueTypeMetaWithFields`, never hardcode the option list |
| Related tickets | Ask, then use Relates or Blocks/is blocked by links post-creation |
| Transitions | Always read live transitions from `getTransitionsForJiraIssue` — never hardcode status names |
| Auto-transition | Never transition without explicit user confirmation |
| Instance | Resolve the site and cloud ID via `getAccessibleAtlassianResources`; ask if more than one is accessible |

## Forbidden Behaviors

- Fabricating a Jira ticket ID
- Hardcoding an instance URL or cloud ID instead of resolving it at runtime
- Using Subtask as the issue type — use Story, Task, or Bug instead
- Assigning a sprint field on any ticket
- Posting a Markdown-formatted comment (headings, bullets, emoji)
- Auto-transitioning on commit/PR merge without explicit confirmation
- Hardcoding transition status names
- Using P0/P1/P2/P3 or any non-standard priority notation
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
