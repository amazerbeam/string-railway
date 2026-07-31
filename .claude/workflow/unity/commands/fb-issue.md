---
description: Fix a skill or agent based on a developer correction, then document the issue
---

You are the **Issue Agent**. The developer is correcting something Claude got wrong. Your job is to **fix the responsible skill or agent** so the same mistake does not happen next time, then document what was fixed. Documentation alone is not enough — the fix is the point.

**Issue description:** $ARGUMENTS

## Step 0: Detect mode (warm vs cold)

Read `.claude/workflow/plan-resolution.md` and follow **Resolving the target plan**, accepting any status. If that file is absent, do not guess: say so, state that plans live at `.claude/contract/<slug>/` as `plan.md` + `tasks.md`, and ask the developer which plan to use.

**Skip step 1 of that algorithm.** Here `$ARGUMENTS` is the issue description, not a slug — freeform prose would otherwise be read as an explicit plan target. Go straight to discovery. When the picker appears, take the "None of these — treat as cold mode" option seriously: a correction frequently belongs to no open plan, and filing it under one puts it in that plan's `corrections.md`, which `/fb-archive` reads as that plan's learnings.

- **Warm mode** — a plan folder resolved and contains `plan.md`. That folder is `<plan>`; use `plan.md` and recent chat to ground the issue.
- **Cold mode** — no plan folder resolved, or the developer picked "None of these". The developer's description is the **whole story**. Do not fabricate "what Claude did" from absent context.

## Step 1: Validate input

If `$ARGUMENTS` is empty, stop and ask: "Describe the issue — what did Claude do, and what should it have done? Name the plan slug or topic if no plan is open."

In **cold mode**, also confirm:
- The plan slug, or a short topic to derive one per `.claude/workflow/plan-resolution.md` → **Plan slug grammar** — this names the lessons entry. Ask once if missing. Use the slug so a later `/fb-archive` of the same work lands on the same `.claude/lessons/<slug>.md` file.
- The relevant skill or agent — if the developer knows. If they do not, you must still try to identify it from `$ARGUMENTS`. If you cannot, stop and ask: "Which skill or agent should this fix go into?" — do not fabricate a target.

## Step 2: Identify the target file

The fix lands in exactly one file. Determine which:

- **Warm mode** — read `<plan>/plan.md`. Part 1 → Pattern Reference and Part 2 → Approach and Skills to invoke during execution name the skill or agent that owned this work.
- **Cold mode** — use the developer's stated target, or infer from `$ARGUMENTS` if unambiguous.

Resolve to a real file path. The candidates, in the order to consider them:

| Target | Path | When the fix belongs here |
|---|---|---|
| A skill | `.claude/skills/<name>/SKILL.md` (or a file under its `references/`) | Claude applied the wrong domain convention |
| A pipeline agent | `.claude/agents/<implementer\|code-evaluator\|defender\|qa>.md` | An agent missed something it should have caught, or flagged a false positive |
| A workflow command | `.claude/commands/fb-<name>.md` | The *process* was wrong — the wrong step order, a missing gate, a bad prompt |
| The stack reference | `.claude/workflow/unity-project.md` | A path, runner command, or Unity constraint stated there is wrong or missing |
| Plan resolution | `.claude/workflow/plan-resolution.md` | The wrong plan was picked, or a plan was undiscoverable |
| A shared rule | `.claude/rules/<topic>.md` | A project constraint more than one workflow could trip over |

**A wrong path or a wrong runner command almost always belongs in `unity-project.md`, not in the command or agent that used it.** That file exists so the fix lands once instead of in five places. Resist the pull to patch it at the call site.

If the path does not exist, stop and tell the developer — do not silently create new files from `/fb-issue`. The one exception is `.claude/rules/<topic>.md`: this project starts with an empty rules folder, so a genuinely new project-wide constraint may legitimately need its first file. Propose it as a new file explicitly, with the five sections `.claude/rules/README.md` requires (what, why, when to enforce, how to verify, reject conditions), and get the same approval as any other fix.

## Step 3: Read the target file

Read the target file in full before composing any edit. The fix must:

- Land in the **right section** (do not append blindly to the end of the file)
- Match the **existing style and tone** of the surrounding content
- Be **surgical** — one or two sentences, or a short bullet, not a paragraph
- Address the **root cause**, not the surface symptom

If the file already contains guidance that *should* have prevented this mistake, the issue is that the guidance is not strong enough or is in the wrong place. Strengthen or relocate it; do not duplicate.

## Step 4: Compose and present the fix

Show the developer:

1. **Target file** — full path
2. **Section** — which heading the change goes under, and why that section
3. **Exact change** — a unified-style diff showing the edit (old text → new text, or insertion point)
4. **Why this prevents recurrence** — one sentence

Then ask: **"Apply this fix? (yes / no / revise)"**

Do **not** edit the file before the developer answers.

## Step 5: Apply or revise

- **Yes** → write the edit to the target file. Keep the change scoped to what was approved.
- **No** → do not edit. The correction still gets logged in Step 6 with `**Fix status:** rejected — <reason>`.
- **Revise** → ask for the revision, present the new fix, return to the approve/reject prompt.

## Step 6: Document the issue

Append a block to the corrections file. Decide the path:

- **Warm mode** → `<plan>/corrections.md`
- **Cold mode** → `.claude/lessons/<slug>.md`

`<slug>` is the plan slug, the same key `/fb-archive` uses when it moves a plan's `corrections.md` to `.claude/lessons/<slug>.md`. The two commands must agree, or a later correction starts a second trail beside the first.

Lazy-create the file with a header on first use:

```markdown
# Corrections — <slug>
```

Append the block:

```markdown
## [ISO timestamp] — [short title]
**What Claude did:** [from chat in warm mode; verbatim from $ARGUMENTS in cold mode — do not invent]
**What it should have done:** [from $ARGUMENTS]
**Target:** [full path to the file edited]
**Section edited:** [heading the change went under]
**Fix status:** applied | rejected — <reason> | revised then applied
**Diff:**
\`\`\`
[unified diff of the actual change applied, or the rejected proposal]
\`\`\`
```

The diff goes in the documentation **even if the fix was rejected** — future runs of `/fb-archive` and future `/fb-issue` calls benefit from seeing what was tried.

## Step 7: Confirm

Tell the developer:

- Target file path and whether it was edited
- Corrections file path
- That `/fb-archive` will read this when closing the contract, and `/fb-issue` against the same slug later (post-QA, next day) will continue the same lessons file — both commands key on `<slug>`, so the trail stays in one place

## Guardrails

- **Fixing the source of the mistake is the primary outcome.** Documentation alone is failure.
- **Never edit without explicit "yes".** Same posture as the rest of the workflow.
- **Read before you write.** Compose every edit against the actual current content of the target file, not from memory.
- **One issue per invocation.** Multiple corrections require multiple `/fb-issue` calls so each gets its own diff and approval.
- **Do not modify the contract files** (`plan.md`, `tasks.md`).
- **Do not create new skill or agent files from `/fb-issue`.** If the right place to put the fix does not exist, stop and tell the developer — that is a `skill-creator` job. The single exception is a first `.claude/rules/<topic>.md`, per Step 2.
- **Never invent context.** If you do not know what Claude did in cold mode, write "unknown — see developer description" rather than guessing.
