---
name: implementation-doc-writer
description: Creates and maintains living, per-module reference documentation under `.docs/implementation/` that explains how implemented code actually works — its responsibilities, key exported types, the mechanics behind each algorithm or rule, and the boundaries it enforces — plus the game's playable ruleset at `.docs/game_rules/the-hunt.md`, kept in step with it. Use after a `/fb-apply` contract's reviewers approve and the gates go green, when asked how a system or mechanic works (e.g. "how are the cards shuffled", "how does Muster conversion work"), when asked what the current game rules are or whether a rule is settled, when asked what has been implemented so far or in a specific ticket, or when a module's code has changed enough that its doc has gone stale.
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  type: automation
---

# Implementation Doc Writer

Maintains `.docs/implementation/` as a living, module-by-module reference for how this codebase's
implemented systems actually work — the doc a developer opens months from now to answer "how are
the cards shuffled" without reading the source, and the doc that answers "what's actually been
built" without archaeology through old tickets.

**Scope:** one folder per `src/` module, updated cumulatively as tickets touch it — never one file
(or folder) per ticket. A mechanic's explanation lives in exactly one place regardless of which
ticket last touched it. This mirrors `.docs/design/` (design intent) and `.docs/game_rules/`
(rules-as-written) — this folder is the third leg: implementation-as-built.

**Second output: the game's ruleset.** This skill also owns `.docs/game_rules/the-hunt.md` — the
playable procedure of the game currently being built, in playing order, with every rule marked
settled / provisional / open / not-built. It is a **different document with a different job** from
the module docs, and the boundary is what keeps either useful:

| Doc                              | Owns                                                     | Answers                    |
| -------------------------------- | -------------------------------------------------------- | -------------------------- |
| `.docs/game_rules/the-hunt.md`   | The playable procedure as it currently stands             | "What are the rules?"      |
| `.docs/design/…/hybrid-design.md` | Why each rule exists, the discarded branches, open forks | "Why this rule?"           |
| `.docs/implementation/<module>/` | What the code does, per module                            | "How does the code do it?" |

`the-hunt.md` is organised by **the order a player does things**, not by `src/` folder — so one rule
that three modules implement is stated once, in the section a player would look for it. It names no
function in its prose; every code pointer lives in its own **Status register** table, once.
`fox-in-the-forest.md` in the same folder is the **base game, transcribed** and is *not* maintained
by this skill — it is a fixed reference to a published rulebook. Only `the-hunt.md` is.

## When to Use This Skill

- A `/fb-apply` run just finished its final review round with all reviewers approved (or residuals
  logged) — update every module the cumulative changed-files log touched, before the contract's
  Final Report. **`/fb-apply` invokes this skill unconditionally, every run** — see that command's
  Step 6.5. Never skip the invocation because a contract "looks" docs-only or code-only; this skill
  decides that, not the caller.
- Asked how a system or mechanic works — "how are the cards shuffled", "how does the network
  growth work", "what does the Muster conversion do".
- Asked what has been implemented — overall, or for a specific ticket or module.
- **Asked what the game's rules are, how a rule works from a player's point of view, or whether a
  rule is settled** — "how does declaring Lose work", "what does the Monarch Quarry do", "is the
  Humble multiplier decided". That is `the-hunt.md`'s question, and this skill answers it from that
  file rather than re-deriving it from source.
- A module's doc is suspected stale — code changed but the doc wasn't updated as part of an
  `/fb-apply` run (e.g. a manual edit outside the pipeline), or a doc references a file, module, or
  vocabulary a *later* ticket removed (a doc can go stale by someone else's deletion, not just by
  its own module's code changing — check for this explicitly, see Step 3).
- **`the-hunt.md` is suspected stale** — a rule was added, changed, or dropped outside the pipeline,
  or its Status register names a file or constant that no longer exists.

Not for: design intent or open design questions (`game-designer` owns `.docs/design/`), transcribing
a *published* rulebook (`.docs/game_rules/fox-in-the-forest.md` is a fixed reference, written
directly and never maintained here), writing the code itself (`react-frontend` owns that), or a
single ticket's PR description (the contract's own `pr-description.md` is ephemeral and
ticket-scoped — this skill's output is the opposite: permanent and cumulative).

## Folder structure

```
.docs/implementation/
  README.md                    top-level index: one row per module, its folder, status, tickets
  <module-slug>/                one folder per src/ module — kebab-case of the folder name
                                (src/warCouncil/ -> war-council/, src/vanguard/ -> vanguard/,
                                 src/battle/ -> battle/)
    README.md                  the module's spine — Status, Built by, Responsibility, Key types &
                                exports, a How-it-works index (links, not the content itself once
                                there's more than one mechanic file), Rules & invariants, Deferred
    <mechanic-slug>.md          one file per mechanic worth a standalone answer — created once the
                                module has more than one, see "When to split" below
```

**Every module gets a folder, not a bare `.md` file**, even a thin one — this is what makes the
structure extensible without a rename later. A module gets a folder the first time any ticket
creates or meaningfully populates its `src/` folder. `App.tsx` / `main.tsx` (not yet inside a named
folder) share an `app-shell/` folder if they ever need more than a line in the top-level README.

### When to split a mechanic out of `README.md` into its own file

A new module starts with everything in `README.md` — Responsibility, Key types & exports, Rules &
invariants, Deferred, and **How it works** written inline. Split a mechanic out into
`<mechanic-slug>.md` the moment either becomes true:

- **`README.md` would cross roughly 150 lines** if the new content stayed inline. This project's
  400-line budget is a hard ceiling for *code*; treat 150 lines as the doc equivalent of "getting
  hard to scan in one sitting" — a docs file has no compiler to force the split, so this skill
  enforces it by convention instead.
- **The mechanic is something a reader would ask about by name** — "how are the cards shuffled",
  "how does the CPU decide its move" — independent of any other mechanic in the module. If the
  answer to that question is a self-contained explanation that doesn't require reading a sibling
  mechanic first, it can stand alone.

When splitting, group related mechanics into one file rather than one file per subsection — a file
per *question a developer would actually ask*, not per H3 heading. Five or six files per module is
a reasonable ceiling; if a module needs more than that, its `src/` folder likely deserves a second
look before its doc does. `README.md` keeps a short **How it works** index — one line per mechanic
file, naming the file and what it answers — so a reader lands on the right file without opening
several.

A thin module (a handful of types, one small function) never needs to split — most of this
project's modules will stay single-file (`README.md` alone) for their whole life. Splitting is
driven by the module's actual size and shape, not by an ambition to look organized.

## Per-module `README.md` template (unsplit — the default for a new or thin module)

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

## Per-module `README.md` template (split — once the module has mechanic files)

```markdown
# <Module display name> — `src/<folder>/`

**Status:** scaffold | partial | implemented
**Built by:** SCRUM-19, SCRUM-21, ...

## Responsibility
[same as unsplit]

## Key types & exports
[same as unsplit — the full table stays in README.md even when mechanics split out, since a reader
scanning exports shouldn't have to open five files]

## How it works
[an index, not the content — one line per mechanic file]
- [Shuffling and dealing](shuffling-and-dealing.md) — the deck, the Fisher-Yates shuffle, hand sizes
- [Legal moves and abilities](legal-moves-and-abilities.md) — what's playable, the odd-card effects

## Rules & invariants enforced
[same as unsplit]

## Deferred / not yet implemented
[same as unsplit]
```

Each `<mechanic-slug>.md` file is headerless prose starting directly with its content (no
module-level `# Title`, no `**Status:**`/`**Built by:**` — those live once, in `README.md`); a
one-line "part of [<module>](README.md)" back-link at the top is enough to orient a reader who
landed on the mechanic file directly (e.g. from a search or a cross-module link) rather than
through the module's own index.

Every claim under **How it works** (inline or split) must trace to a real file and function — this
is documentation of what ships, not of what the plan intended. If `plan.md` describes a mechanic
the code doesn't implement yet (a placeholder type, a stubbed function), that content belongs under
**Deferred**, not **How it works**.

## The ruleset — `.docs/game_rules/the-hunt.md`

One file, organised in **playing order**: components, setup, the pre-play decisions, playing a
trick, abilities, resolution, scoring, the opponent, the outer loop, then what the base game had
that this game does not. A reader looking for a rule finds it where they would do the thing.

### The four status markers — the load-bearing part

Every rule carries exactly one. A ruleset for a game still being designed is only useful if it
separates what is decided from what is being played to find out. **Never state an undecided rule as
though it were decided, and never omit one because it is undecided** — mark it `[open]` and state
the placeholder currently in force.

| Marker            | Means                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| **[settled]**     | Decided and playable. Changing it is a design change, not a tuning pass.          |
| **[provisional]** | Playable, but the value or the reading is expected to move after a playtest.      |
| **[open]**        | Not decided. The procedure stated is a placeholder, and may not survive.          |
| **[not built]**   | Decided in design, but nothing enforces it — you cannot do this in the app today. |

A rule whose *procedure* is settled but whose *number* is not gets the marker for the number — the
value is what a reader would act on. State the number, then mark it, then say whose decision it is.

### Three rules about the prose

- **No rationale.** Where a rule needs justifying, cite `hybrid-design.md §N` and stop. Reproducing
  the argument creates a second copy that will drift from the first.
- **No function or file names in the prose.** They belong in the **Status register** only. Prose
  written for a player survives a refactor; prose naming `resolveTrickWinner` does not.
- **Mark every deviation from the base game explicitly**, as a blockquote under the rule it affects.
  A reader arriving from `fox-in-the-forest.md` must be able to see what changed without diffing two
  documents in their head.

### Its two required tables

- **Status register** — one row per rule area: `Rule area | Status | Where enforced | Who decides
  what's open`. This is the *only* place code paths appear, and it is what makes staleness
  checkable: every path in it must resolve to a real file, verified by Glob or Read, not assumed.
- **Known tensions** — design problems that are recorded rather than resolved (a dominated strategy,
  an unbalanced fork, an unproven assumption). Append to it; never quietly drop an entry because a
  ticket didn't address it.

### A contract in progress

When the calling contract has landed some of its rules and not others — engine done, screen not —
say so in one dated note near the register, naming what is live and what a player cannot yet reach.
A rule that exists in the engine but has no UI **is** a rule of the game and belongs in the body;
what it needs is the note, not omission.

## Workflow

### Step 1: Check — find what changed and what exists

- Get the list of touched files: the cumulative changed-files log from the calling `/fb-apply` run,
  or — if invoked standalone — `git status` / `git diff` plus the task description.
- Group touched files by their `src/<folder>/` prefix. Each distinct folder is a module to update.
- Glob `.docs/implementation/*/README.md` for existing module docs. A touched module with no doc
  yet needs a folder created; a touched module with a doc needs it updated, not replaced wholesale.
- **Also check every *other* module's docs for a reference into anything this contract deleted or
  renamed** — a doc can go stale without its own module's code changing at all, purely because a
  ticket deleted a file or a vocabulary term a *different* module's doc still names. Grep every
  `.docs/implementation/**/*.md` for each identifier, path, and vocabulary term the contract
  deleted or renamed. This is what catches a case like: Module A's doc's Deferred section still
  says "see `src/otherModule/`'s state" after a separate ticket deleted `src/otherModule/` entirely
  — A's own code never changed, but A's doc is now wrong.
- **Decide whether this contract changed a game rule.** Read `.docs/game_rules/the-hunt.md` and ask
  the question from the player's side: *does anything in this diff change what a player may do, must
  do, or is scored on?* Any of these is a yes — and the last two are the ones most often missed:
  - a new or changed **procedure** (a new decision point, a new legal-move constraint, a new phase);
  - a changed **scoring rule** (what a card is worth, what a term sums over, how a band resolves);
  - a **tunable's value** moving, or a placeholder being replaced by a decision — that flips a
    marker from `[open]`/`[provisional]` to `[settled]`, or moves a number the rules state outright;
  - a rule graduating from **`[not built]`** because it now has enforcement, or a rule reaching the
    engine but **not yet the screen** (which needs the in-progress note, not omission);
  - a file or constant named in the **Status register** being renamed, moved, or deleted.

  A contract that touches only layout, styling, tests, or internal refactoring is a genuine no —
  record that it was checked and move on. **Never skip the check itself** on the grounds that a
  contract "looks" like UI work: DLR-63 changed the scoring rule and the card face in one ticket.

### Step 2: Plan — gather sources per module

For each touched module:
- Read the contract's `plan.md` Part 2 (Approach, Data shapes, Runtime quality notes) for the *why*
  behind each decision — usually better-written prose than the code itself, and it saves
  re-deriving intent from source.
- Read the actual source files in that module — the doc must describe what's on disk, not what the
  plan proposed.
- Read the Implementer Report(s) for that phase, if available, for anything the plan didn't
  anticipate — a judgement call made mid-implementation, a note about what's deferred.

If Step 1 found a rule change, also gather **the rule's own sources**, in this order — the order
matters, because each one can correct the one before it:
- The ticket's **acceptance criteria** as quoted in `plan.md` Part 1. When a mechanic is new and not
  yet written into `hybrid-design.md`, the AC text *is* the specification — say so rather than
  citing a design section that does not cover it.
- `plan.md`'s **Assumptions** and **Risks** — this is where a reading was chosen between two
  defensible ones, and where a value was explicitly routed to the developer. An assumption recorded
  there is what makes a `[provisional]` marker honest rather than a guess.
- **The design section the rule sits in** (`hybrid-design.md §N`) for the citation, and for whether
  the design still says what the code now does. Where the two disagree, the code is the rule and the
  disagreement is worth a short note — that is a real finding, not a formatting problem.
- **The constant itself**, read from source. A tunable's comment usually states its unit, whose
  decision it is, and the arithmetic behind the placeholder — which is exactly what the marker and
  the register need.

### Step 3: Validate — before writing

- Every mechanic named in **How it works** must have a real function backing it — Grep for the
  name if unsure it survived to the final diff.
- A module that is still type-only (placeholder types, no runtime logic) gets `Status: scaffold`
  and an empty or near-empty **How it works** — do not pad it with the plan's future intentions
  written as if already true.
- Check whether the ticket key is already in **Built by** before appending — don't duplicate it
  across re-runs of the same contract.
- **A rename or deletion this contract performs must be reflected everywhere it's named**, not just
  in the module whose code changed. If this contract deleted `src/foo/` or removed a piece of
  project vocabulary, grep every doc under `.docs/implementation/` (not only the touched module's)
  for the old name and fix every hit — a Deferred bullet in an untouched module that still
  describes deleted code as future work is exactly the kind of drift this skill exists to prevent.
- **The top-level `README.md`'s table and every individual module `README.md`'s own `**Built by:**`
  line must agree.** Adding a ticket key to one and not the other is a common half-edit — check
  both together, every time, not just the file you're actively editing.

For `the-hunt.md`, if Step 1 found a rule change:

- **Every number stated in the prose must match the constant it comes from** — Read the constant,
  don't trust the plan or a previous pass. A rules document stating a stale number is worse than one
  omitting it, because a reader will act on it.
- **Every marker must match reality**, tested against the code rather than the ticket's ambition:
  `[settled]` needs enforcement *and* a decision; `[provisional]` needs enforcement and an
  undecided value; `[not built]` needs no enforcement anywhere — Grep to confirm, since "not built"
  is the claim most easily falsified by a constant that quietly gained a consumer.
- **A rule live in the engine but not on screen is `[settled]` in the body, plus the in-progress
  note.** It is a rule; it is merely unreachable. Do not downgrade it to `[not built]`, which would
  be false, and do not omit it, which would leave the next ticket re-deciding it.
- **Every path in the Status register resolves to a real file** — check them as a set, not only the
  rows you edited. Rows go stale by *other* tickets' renames, which is the same failure mode as the
  cross-module check above.

### Step 4: Execute — write

- Create the module's folder and `README.md` from the unsplit template if the module doesn't have
  one yet; otherwise Edit the existing sections — append new **Key types & exports** rows, add new
  **How it works** subsections (inline, or as a new mechanic file once the split threshold is hit —
  see "When to split" above), move satisfied items out of **Deferred**, append the ticket key to
  **Built by**, and update **Status** if the module graduated from scaffold to partial or
  implemented.
- If a module's `README.md` crosses the split threshold as part of this edit, perform the split in
  the same pass: create the mechanic file(s), replace the inline sections in `README.md` with the
  How-it-works index, and verify nothing was dropped in the move.
- Update `.docs/implementation/README.md` — add or refresh the module's row (Module | Doc | Status
  | Built by), pointing at the module's folder (its `README.md` is the natural link target).
- Fix every stale reference Step 1/Step 3 found in *other* modules' docs, in the same pass — do not
  leave a cross-module stale reference for "later" once you know about it.
- Never delete a **How it works** subsection (or mechanic file) because a later ticket didn't touch
  that mechanic — only remove or rewrite it if the mechanic itself was removed or replaced in code.

Then, if Step 1 found a rule change, edit `.docs/game_rules/the-hunt.md` **in the same pass** — a
rule change shipped without its rules entry is the drift this skill exists to prevent, and it is
cheapest to catch now:

- **Edit the section the rule belongs to in playing order**, adding a new section only for a genuinely
  new stage of play. Resist appending a per-ticket section at the foot: that turns the ruleset into
  the changelog it is meant to replace.
- **Update the marker, then the number, then the register row** — the three go together, and a
  half-applied edit is the common failure. Flipping a marker to `[settled]` without removing "the
  developer's to decide" from the register's last column leaves the file contradicting itself.
- **Refresh the "last reviewed" date and the in-progress note** at the top and near the register.
  A rules document with no date cannot be trusted, and a stale in-progress note is worse than none.
- **Append to Known tensions** if the contract surfaced or inherited an unresolved design problem —
  and never remove an entry unless the tension itself was actually resolved in code or design.
- **Never delete a rule because this contract didn't touch it.** Same discipline as a **How it works**
  subsection: a rule leaves the document only when it leaves the game.

### Step 5: Verify

- Re-read every file written or edited this pass — including the top-level `README.md` and every
  module `README.md` whose `**Built by:**` line changed, not just the mechanic files. Confirm the
  **Status** line matches what Step 3 validated, and every function or file named under **How it
  works** actually exists (Grep it).
- **Confirm the top-level `README.md`'s table and each module's own `README.md` agree** — same
  `Built by` list, same `Status`, and the table's link resolves to a real file. This is the specific
  check that catches a half-applied `Built by` edit (one file updated, the sibling forgotten).
- If `the-hunt.md` was edited: re-read it end to end, not only the edited section. Confirm every
  marker matches what Step 3 validated, every number matches its constant, every Status-register path
  resolves, and the "last reviewed" date and in-progress note are current.
- **If `the-hunt.md` was *not* edited, say so and say why** — one line naming what the contract
  changed and why none of it was a rule. A silent absence is indistinguishable from a skipped check,
  which is precisely what makes the check worthless.
- Report which module docs were created vs. updated, which were split into multiple files this
  pass and why, anything moved into or out of **Deferred**, and — for `the-hunt.md` — which rules
  were added or changed and which markers moved, in which direction.

## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/` (Glob
`.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules added
after this skill was written. See `.claude/rules/README.md` for the index. That folder is
currently empty; re-scan rather than assuming it stays that way.

## Success Criteria

- Every module touched by the calling contract has a folder under `.docs/implementation/`, created
  or updated — never skipped.
- `.docs/implementation/README.md` lists every module folder that exists, kept in sync in the same
  pass — and every module `README.md`'s own `Built by`/`Status` agrees with the top-level table's
  row for it.
- A module's `README.md` never grows past the split threshold without being split — a reader should
  never have to scroll past 150+ lines of inline "How it works" to find the mechanic they asked
  about.
- Every claim under a module's **How it works** section (inline or split) names a real file and
  function — verified by Grep, not assumed from the plan.
- **Status** reflects the code's actual state (scaffold/partial/implemented), not the ticket's
  ambitions.
- No module doc was replaced wholesale when an incremental update would have preserved prior
  tickets' contributions.
- No *other* module's doc was left citing a file, path, or vocabulary term this contract deleted or
  renamed — the cross-module stale-reference check in Step 1/3 actually ran, not just the touched
  module's own content.
- **The rule check in Step 1 ran and its outcome was reported** — either `the-hunt.md` was updated,
  or the report states in one line why the contract changed no rule. Silence fails this criterion.
- **Every rule the contract added, changed, or dropped appears in `the-hunt.md`**, in its section in
  playing order, carrying a marker that matches the code — not appended as a per-ticket section.
- **Every number `the-hunt.md` states matches the constant it comes from**, and every path in its
  Status register resolves to a real file — both verified this pass, not assumed from the last one.
- **No rule was stated as settled while its value is still the developer's**, and no undecided rule
  was omitted rather than marked. Both failures mislead in the same direction: they make the game
  look more decided than it is.
- **A rule live in the engine but not yet on screen is in the body with the in-progress note** —
  neither omitted nor mislabelled `[not built]`.
- `the-hunt.md`'s prose names no function or file, and cites `hybrid-design.md §N` rather than
  reproducing its argument — the two boundaries that keep it from becoming a fourth source of truth.
