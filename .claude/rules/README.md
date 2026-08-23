# Shared Rules

Topic-scoped rules that apply across this project. Any skill, agent, command, or `CLAUDE.md` reference can pull from here — the goal is one canonical statement of each rule, reused everywhere.

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

- **Here** — the rule is about project data or constraints that more than one workflow could touch (a persisted-data schema, a configuration file's shape, determinism and seeding requirements).
- **Inside a skill** — the rule only makes sense within that skill's narrow domain. Anything about how to write React or TypeScript here belongs in `.claude/skills/react-frontend/`, not in this folder.
- **In `.claude/workflow/web-project.md`** — the rule is about *where code lives* or *how to verify it*. Paths and runner commands belong there, not here, so there is exactly one place to fix them.

## Index

- [`save-data-versioning.md`](save-data-versioning.md) — how anything that survives a run is keyed, enveloped, versioned, and rejected when it cannot be read. Enforce on any ticket that persists a value.

This folder was created because all five `/fb-*` commands and the `implementer`, `code-evaluator`, `defender`, and `qa` agents instruct a scan of this README before touching related work.

DLR-106 wrote the first rule when `src/persistence/` introduced the project's first persisted shape — a change touching storage keys and persisted field names that more than one queued ticket (DLR-113, DLR-118, DLR-123) will depend on. The five-section shape above, with its reject conditions, is the pattern for the next one.
