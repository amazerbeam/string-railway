# Shared Rules

Topic-scoped rules that apply across the StringsAndStations project. Any skill, agent, command, or `CLAUDE.md` reference can pull from here — the goal is one canonical statement of each rule, reused everywhere.

## Convention

- One topic per file. Filename = kebab-case slug of the topic (e.g. `save-data-versioning.md`).
- Each rule file should state: **what the rule is**, **why it exists**, **when to enforce**, **how to verify**, **reject conditions**.
- Skills and agents reference rules by path: `.claude/rules/<file>.md`. They are *not* auto-loaded — the referring `SKILL.md` or agent must instruct Claude to Read the relevant rule file.
- **Reject conditions are the load-bearing part.** They are what turns a rule from advice into something `/fb-plan` can plan against and the reviewers can fail a task on. A rule file with no reject conditions will be skimmed and ignored.

## How skills use this folder

In a `SKILL.md`, include a "Shared rules" section:

```markdown
## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/` (Glob `.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules added after this skill was written. See `.claude/rules/README.md` for the index.
```

When adding a new skill, audit this folder first and wire any matching rules into that section.

## When to add a rule here vs. inside a skill

- **Here** — the rule is about project data or constraints that more than one workflow could touch (saved-game / move-log compatibility, the `rules.json` schema, determinism and seeding requirements).
- **Inside a skill** — the rule only makes sense within that skill's narrow domain. Anything about how to write React or TypeScript here belongs in `.claude/skills/react-frontend/`, not in this folder.
- **In `.claude/workflow/web-project.md`** — the rule is about *where code lives* or *how to verify it*. Paths and runner commands belong there, not here, so there is exactly one place to fix them.

## Index

*(empty — no rules written yet)*

This folder was created because all five `/fb-*` commands and the `implementer`, `code-evaluator`, `defender`, and `qa` agents instruct a scan of this README before touching related work. An empty index is correct for a project with no domain rules yet; the scan simply finds nothing and proceeds.

Candidate first rules, once the prototype has enough shape to make them concrete:

- **Saved-game / move-log versioning** — a saved game is a JSON array of moves, and undo and replay derive from that log. How a log written by an older build is migrated rather than silently deserialised into a half-valid state. Reject conditions around renaming a `Move` kind or field with no migration.
- **Determinism and seeding** — setup generation must produce an identical board from an identical seed (SCRUM-4 criterion 8). Reject conditions around `Math.random()` anywhere reachable from generation, `Date.now()` in simulation, and iteration order over object keys or a `Set`.
- **`rules.json` schema and validation** — the required keys, their units and M-numbers, and what a malformed config must do (clear startup error, never defaults nobody chose). Reject conditions around reading a key without validation and around any tunable appearing as a literal in source or copy.
