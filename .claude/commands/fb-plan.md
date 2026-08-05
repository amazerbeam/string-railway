---
description: Produce an implementation plan (plan.md + tasks.md, in one plan folder) for a primed task
---

You are the **Planning Agent**. Produce an implementation plan for the primed task:

**Task brief:** $ARGUMENTS

The brief is the source of truth. Scope, technical pointers, pattern references, and constraints all come from it — whether it arrived as prose the developer typed, a Jira ticket they named, a spec under `.claude/contract/specs/`, or a file the developer pointed at. Do not infer intent the brief doesn't state. Do not sweep the codebase for context — the developer has already primed what you need.

## Step 0: Preconditions — only refuse when there is literally no context

The gate is narrow. Only refuse to plan if one of these two unrecoverable conditions holds:

1. **No brief** — `$ARGUMENTS` is empty and there is no pasted task description, ticket reference, spec, or file reference in the session.
   - Response: "Describe the task before invoking `/fb-plan`."

2. **Brief unreadable** — the developer named a spec file, contract folder, source file, or Jira issue and it cannot be read (missing path, permission error, unknown issue key).
   - Response: surface the actual error verbatim and list what you did find (e.g. the specs that exist under `.claude/contract/specs/`). Ask the developer to paste the brief inline or fix the reference. Do not guess.

**Vagueness is NOT a refusal condition.** If the brief is missing pattern references, ambiguous on scope, light on technical pointers, or otherwise sparse — proceed. Do not bounce it back to the developer. Instead, in Step 2:

- Make the **most plausible decisions** you can defend, drawing on the loaded skills (Step 1.5) and the conventions they encode.
- Capture every such decision in the **"Assumptions made"** section of `plan.md` Part 1, each with a one-line rationale.
- Frame the plan so the developer can red-line specific assumptions during Part 1 review rather than rewriting the brief.

**One thing is never an assumption: a tuning value.** If the work needs a number that lives in configuration and nobody has chosen it, that is a developer decision (`.claude/workflow/web-project.md` → Developer-owned work). Plan the code that reads the key, and list the unchosen value under Risks and judgement calls so it is decided at the approval gate rather than invented mid-phase.

The alignment check happens in `plan.md` Part 1, not at the gate. A best-effort plan with explicit assumptions is more useful to the developer than a refusal.

## Step 0.5: Move the ticket to `Planning` — before anything else

**This is the first action `/fb-plan` takes.** The board must show the work in flight from the moment planning starts, not once the plan folder exists — a developer looking at the board mid-planning should never see the card still in `To Do`.

Nothing here depends on the slug. Scan `$ARGUMENTS` and the primed brief for a `SCRUM-<n>` key: the developer named a ticket, pasted one, or referenced a spec that cites one. If you find one, invoke the `management-jira` skill and transition that issue to `Planning` — automatically, no confirmation prompt. Read *The SCRUM status model* in that skill for the rules: resolve the transition id live, report the move in one line, and never fail this command over a Jira error. Transitions are any → any, so a card in `To Do` moves straight to `Planning`.

Skip silently when the brief carries no key — that work will get a date-branch slug in Step 1.7 and has no card to move. Do not create a ticket to have something to transition; `/fb-plan` plans, it does not open work.

Run this **after** Step 0's refusal gate, not before it. Step 0 only refuses when there is no brief at all or the named brief is unreadable, and moving a card for a run that is about to refuse would leave the board lying. Everything else — reading `web-project.md`, classification, the skill confirmation, the config audit, creating the folder — comes after this transition.

## Step 1: Defer to the workflow reference, the skills, and the shared rules

- **Read `.claude/workflow/web-project.md` first, every time.** It is the canonical statement of where code lives, the architectural boundaries named in past plans (if any), which commands verify what, what only the developer can decide, and the correctness traps (config-key renames, hard-coded tunables, effect cleanup, epsilon choices, high-frequency interaction hot paths). Every `Run:` step you write and every path you name must come from it. If a path or script name there turns out to be wrong, fix *that* file rather than working around it in the plan.
- **`package.json` is the authority on script names.** Read it before writing a `Run:` step that invokes one. If the app is not scaffolded yet, say so in the plan rather than planning a command that cannot resolve.
- **Never pattern-match against generated output.** `node_modules/`, `dist/`, `coverage/`, `.vite/`, and `*.tsbuildinfo` are regenerated from the real source. They are not evidence of anything and must never be planned as edit targets. `package-lock.json` is different: it is committed and it matters, but it is machine-written — plan a `package.json` change plus `npm install`, never a hand-edit of the lockfile.
- **Read the shared rules that apply.** Scan `.claude/rules/README.md` and Read every rule file whose topic the plan touches. Their **reject conditions** are planning constraints: a plan that would trip one is a broken plan. That folder may be empty — an empty scan is a valid outcome, not a reason to stop.
- **Quality standards live in the skills** — chiefly `.claude/skills/react-frontend/SKILL.md` and its `references/engineering-standards.md` — and in `CLAUDE.md` at the repo root. Do not restate their contents in the plan; name the skill and let the executor load it.
- **Cite the specification the brief names, where one exists.** Do not re-derive a rule or behaviour that is already defined in a linked document, ticket, or section the brief points at — cite it instead. Where that source was silent and a decision was made anyway, flag it plainly as an assumption in the plan (Part 1 → Assumptions made) rather than treating it as settled fact.

If the brief points to specific files, modules, or components as a pattern reference, treat those as authoritative for this task.

## Step 1.5: Classify the work and load skills BEFORE planning

The planner is only as good as the conventions it has loaded. Without the right skills in context, plans can be internally consistent yet put game logic in a component, hard-code a tunable, or key a limit on the wrong id. Close that gap before writing either file.

### a) Discover which skills actually exist

**Do not classify against a remembered roster.** Glob `.claude/skills/*/SKILL.md` and read the `description:` line of each hit. That listing is the real menu.

`react-frontend` covers everything under `src/`, so on this project it is the **normal** value for a code task, not an exception. `Skill: none` is legitimate only for genuinely non-code work — a spec document, a Jira-only task, a decision hand-off to the developer. If your classification produces `none` for a task that writes TypeScript, that is a classification error, not a finding about the project.

- If a skill covers the area the brief touches, propose it.
- If none does, say so plainly in `plan.md` Part 2 under "Skills to invoke during execution" — write `none — <one-line reason>` rather than naming a skill that does not exist. A plan that tells the executor to invoke a missing skill wastes a turn and erodes trust in the whole list.
- If an area will clearly recur and no skill covers it, note it as a follow-up: `/skill-creator` is the way to write that skill, and it is its own piece of work, not something to smuggle into this plan.

### b) Classify the work from the brief

Pick every category that applies; a task can be in more than one.

**Pure logic** — self-contained TypeScript with no React import and no DOM access, fully unit-testable under Vitest with no renderer. Prefer pushing logic here whenever it has a testable invariant.

**UI components** — anything rendering markup, plus `App.tsx`. Subject to effect cleanup, StrictMode double-invocation, stale closures, and hot-path cost. Sub-classify:
- **Committed-state rendering** — declarative React over application state.
- **A high-frequency interaction** (drag, scroll, resize) — a candidate for a sanctioned ref-mutation path, and the performance-critical surface.
- **A `use*` hook** — logic extracted out of a component.

**Hooks** — logic extracted from a component body into a reusable `use*` function; its own category when a task's whole purpose is the extraction rather than the component around it.

**Config and tunables** — a configuration file, `src/constants/` (if the project has one), `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`. Adding a *key* is a code task; choosing its *value* is a developer decision.

**Toolchain and scaffolding** — creating the project, wiring a script, adding a lint rule. Ordinary agent work.

**Process** — the developer wants a standalone spec document before code, or the brief is still too vague to plan. Say so rather than planning blind.

### c) Confirm the skill list with the developer

Build the proposed list from (a) and (b), then call `AskUserQuestion` **once** to confirm — a single `multiSelect: true` question listing the matched skills, each option's description naming what that skill owns for this task. `AskUserQuestion` allows at most 4 options per question; if the classification matched more, ask a second question in the same call. The developer can untick anything that doesn't apply or tick extras the classifier missed.

**Skip this call entirely when the classification matched no skills** — an `AskUserQuestion` with nothing to choose between is noise. Record `none` in Part 2 and move on. If the runtime cannot present `AskUserQuestion` (non-interactive session), proceed with the proposed list and note in `plan.md` Part 2 that no developer override was applied.

### d) Load the confirmed skills

For each confirmed skill, invoke it via the `Skill` tool *before* writing `plan.md` and `tasks.md`. The skill content informs:
- the **Approach** section in `plan.md` Part 2 (correct module placement, correct patterns)
- the file paths each task names (right paths, right naming)
- the **Tasks** in `tasks.md` (concrete steps that match house standards)

Record the loaded skills in `plan.md` Part 2 under "Skills to invoke during execution" — this becomes the handoff list for the post-`/clear` execution session. If the developer overrode a skill, capture that in a one-line note under the list so the execution session understands why.

## Step 1.6: Config and persisted-shape audit (when applicable)

This project's integrity risk is not a database and not a compiler-checked interface — it is the **name-bound surface outside the type checker's view**: configuration keys, `localStorage` keys, persisted state kinds and fields, rejection reason codes, exported constant-map keys, `data-testid` values, CSS class names, and SVG/`aria-*` ids. A rename that type-checks cleanly can turn a configured constant into `undefined`, and a `NaN` renders nothing and logs nothing. Ground the plan in the actual on-disk state before designing.

Run this step whenever the task touches a configuration key, a persisted or stored shape, an exported constant map, a reason code, or any name a test or stylesheet references by string. Skip it entirely for a self-contained change with no config, storage, or string-bound surface — and say so in one line.

Use `Grep`, `Glob`, and `Read` against the real files. Confirm:

1. **Every configuration key being renamed, retyped, or removed is found by name** across `src/**`, the configuration file, and any user-facing copy. Quote the actual hit count. Every hit is a site the plan must change in the same task; a key with zero hits is new or dead, and knowing which is the point of the audit.
2. **Every persisted shape affected is enumerated.** Wherever state is persisted (a save file, a stored log, `localStorage`), undo or replay may derive from it, so a changed kind or field invalidates stored records. State whether anything is persisted yet: if nothing is, say so explicitly — that is a cheap window, and recording that it was open here is what lets a later change know it has closed.
3. **Type changes are checked for loss.** `number` → `string` changes every read; array → object breaks index access; required → optional makes every consumer's assumption wrong; a widened union forces every `switch` to grow a case. State which case applies and what the plan does about it.
4. **Every consumer of a changed exported constant or predicate is enumerated.** A predicate that feeds both validation *and* a derived calculation — "some callers may be affected" is not an audit; a count is.
5. **Names align across the chain**: configuration key ↔ its TypeScript type ↔ any `src/constants/` entry ↔ the reader ↔ copy that quotes the number ↔ test fixtures. Several of these bind by string, so the compiler will not catch a mismatch. Any mismatch found is an in-scope defect.
6. **Any architectural boundary the plan establishes is not crossed.** Run the boundary grep from `web-project.md`, if one applies, and confirm the design does not require a DOM global or a React import inside a tree meant to stay pure. A design that does is a design to change, not a lint rule to disable.

Capture findings in `plan.md` Part 1 under **"Config and persisted-shape audit"**, one bullet per check, quoting real counts and real key names. An audit that paraphrases instead of quoting has not been done.

## Step 1.7: Create the plan folder

Plans are folders, not loose files — several plans coexist under `.claude/contract/`, and a new plan must never overwrite an existing one.

Read `.claude/workflow/plan-resolution.md` and follow **Plan slug grammar**. This project has a Jira project (`SCRUM`), so **prefer the Jira key** when the work has one — `SCRUM-8-scaffold-vite-app`. Fall back to today's date plus a kebab-case title when it does not. Lowercase title, 60 characters max.

Then:

1. Check whether `.claude/contract/<slug>/` already exists. If it does, append `-2` (then `-3`, …) until the path is free. Never write into an existing plan folder.
2. Create `.claude/contract/<slug>/`. For the rest of this document, `<plan>` means that path.
3. If the session was primed with a spec from `.claude/contract/specs/`, **move** it to `<plan>/spec.md` so the plan folder carries its own upstream input, and cite it in Part 1 → Task reference. If the brief came from a Jira ticket, cite the issue key and paste its acceptance criteria into Part 1 → Task reference — the plan folder must stand alone after `/clear`.
4. State the chosen slug in chat when you hand off in Step 3 — it is the developer's cue to rename the folder now, while it is cheap. A rename must also update the `Plan folder:` line the Step 2 template writes into `plan.md`, or that line names a path that no longer exists; and `specs` and `archive` are reserved names a plan folder may not take, since resolution skips both and the plan would become permanently undiscoverable.

The ticket is already in `Planning` — Step 0.5 moved it before this folder existed. If the slug you just derived carries a `SCRUM-<n>` key that Step 0.5 did not find in the brief, transition it now and say that the move was late.

## Step 2: Produce the plan — write plan.md

Write **only** `<plan>/plan.md` in this step. **Do not write `tasks.md` yet** — it is gated on developer approval (see Step 3). `plan.md` has two parts: **Part 1 — Alignment** is the shared understanding of the task, **Part 2 — Technical design** is the approach. Both parts are required, and the two-part split is load-bearing: the developer reads Part 1 first and stops if the restated goal is wrong, before spending attention on the design.

### The only file in this step: `<plan>/plan.md`

Fourteen `###` sections — eight in Part 1, six in Part 2. Every one is required. Where a section genuinely does not apply, write a single-line skip justification ("Config and persisted-shape audit: skipped — no config, storage, or string-bound surface touched."). Empty headings, empty `mermaid` fences, and "TBD" are worse than absent: they signal the planner gave up rather than thought it through.

File paths are **not** listed centrally in Part 2 — each task in `tasks.md` names the files it touches.

```markdown
# Plan: [Task title]

Plan folder: `.claude/contract/<slug>/`
Execution status: see `tasks.md` in this folder.

---

## Part 1 — Alignment

*(The shared understanding of what this task is doing. Restate it in your own words — this is how the developer confirms you read the brief correctly before any design happens. Mismatch here = stop and fix.)*

### Task reference
[The verbatim prose the developer primed, the Jira issue key plus its acceptance criteria, or a citation of `spec.md` when a spec was moved into this folder. Include any follow-up decisions confirmed interactively, dated.]

### Restated goal
[One paragraph in plain prose: what this task delivers, in your own words.]

### In scope
- [Specific, concrete deliverable]

### Explicitly out of scope
- [Anything the brief implies but isn't asking for]
- [Anything adjacent that could otherwise creep in]

### Pattern Reference
[File paths, module names, component names, or "follow `react-frontend`/SKILL.md" — verbatim from the brief where it supplied them. Cite the specification the brief names (a section, a doc, a linked ticket) for any behaviour it already defines. If the brief supplied no code reference, write "None supplied" and document the references you chose here.]

### Constraints flagged on the brief
[Determinism/seeding requirements, target pointer responsiveness, save-compatibility, accessibility expectations, the two-dependency limit — anything the developer called out as "don't surprise me on this".]

### Assumptions made
[Every decision you made because the brief didn't say. One bullet per assumption with a one-line rationale — the developer red-lines this section, which is cheaper than rewriting the brief. Mark developer-confirmed choices as confirmed so they are not re-litigated. Capture: module/folder chosen; pattern reference selected when none was supplied; whether logic goes in a pure module, a hook, or a component, and why; the shape of any new configuration key; whether state is in a reducer or local; scope-narrowing when the brief straddled logic and presentation. Never assume a tuning *value* — route it to Risks.]

### Config and persisted-shape audit
[One bullet per check actually performed in Step 1.6, quoting real hit counts and key names. Skip with a one-line justification when the task has no config, storage, or string-bound surface.]

---

## Part 2 — Technical design

### Approach
[2-4 paragraphs on the technical shape: how the change is structured, why this shape over the alternatives (call them out by name — the developer often learns more from the road not taken), what the moving parts are, how data and control flow at runtime. Say explicitly which logic goes in a pure, unit-testable module and which must be in a component or hook, and why. Cite the specification the behaviour comes from, where one exists. Reflect the conventions from the skills loaded in Step 1.5 without restating them.]

### Skills to invoke during execution
[The confirmed skill list from Step 1.5. One bullet per skill: `skill-name` — why it applies and what it owns for this task. `react-frontend` is the normal entry for code work. When no skill covers the area, write `none — <one-line reason>` rather than inventing one. List any `.claude/rules/` files the executor must Read on a trailing line, and always list `.claude/workflow/web-project.md`. Note any developer override so the execution session knows why.]

### Diagram
[A Mermaid diagram of whatever matters most: sequence for a pointer interaction, component diagram for structural change, state diagram for a multi-step flow, flowchart for a documented validation or reject order. For a genuine single-file edit with no flow, write one line — "Diagram skipped — single-file change, no flow." Never leave an empty fence.]

### Data shapes
[The new or modified concrete shapes, as TypeScript: types and interfaces added, new action/state variants, function signatures with their parameter and return types, configuration keys with their types and units, `src/constants/` entries, component props, reducer action shapes, and any `package.json` script or dependency change. Not prose. If nothing changes shape, write "No type, config, or contract changes." Flag every name or type that changes against the Step 1.6 audit, and state which persisted or stored data it affects. For a new configuration key, give the key, its type, its unit, and its rationale — and mark the value itself as a developer decision if it has not been chosen.]

### Runtime quality notes
[Address each dimension below. "Trivial — no concerns" is acceptable per dimension, but only when honestly true.]

- **Purity and adjudication:** [what goes in a pure module and stays DOM-free; that no component decides logic it should only ask about; that every tunable is read from configuration]
- **Effects, mount and teardown:** [which effects run when; StrictMode double-invocation safety; every listener/observer/timer/`requestAnimationFrame`/`AbortController` and where its cleanup lives; pointer capture released on `pointerup` *and* `pointercancel`; module-level state and its reset; what happens on a second mount]
- **Hot-path cost:** [what runs per pointer event and what it allocates; whether repeated work is incremental rather than whole-collection; whether a high-frequency value stays off the reconciler; whether any search is bounded; any memoisation and the profiling evidence for it]
- **Determinism and numeric safety:** [the seed path and that no `Math.random()` is reachable from anything that must be reproducible; the named epsilon and the degenerate cases it must survive; guarded divisors so no `NaN` reaches a rendered value]
- **Error paths:** [what's guarded, what throws, what the user sees, what gets logged — no swallowing a failure into a success shape, no `catch { return DEFAULTS }` on the config load; an invalid action cannot commit and its rejection names a specific reason; all four async states on any new async surface]

### Risks and judgement calls
[Decisions the developer should sanity-check before approving — pattern choice, naming, structure, the logic-vs-hook-vs-component split, scope-narrowing, any design reading the brief leaves ambiguous, **every tuning value the work needs that nobody has chosen**, any dependency that would be required, and every behaviour that can only be judged by running the app. One bullet each. The second-most-important section after Approach: it surfaces what could be wrong instead of burying it in prose.]
```

**Nested headings.** Any heading *inside* one of the fourteen sections is a `####`, never a `###` — a `###` would read as a fifteenth top-level section. This matters most under Data shapes, which often wants sub-headings per artefact.

## Step 2.5: Self-review plan.md

Before handing off for approval, review `plan.md` against the brief. No subagent dispatch — do this yourself.

1. **Brief coverage:** Skim each requirement, acceptance criterion, and pattern reference in the brief. Is each reflected in Part 1 → In scope and addressed in Part 2 → Approach? List gaps and fix.
2. **Structural completeness:** Exactly two `##` parts and fourteen `###` sections, in the template's order — counting only headings **outside** fenced code blocks. A plan that documents a markdown template embeds headings inside a fence; those belong to the example, not to the document, and a naive `Select-String '^## '` count will fail on them. Each is filled or carries an explicit one-line skip justification. No heading inside a section is a `###`.
3. **Placeholder scan:** No `TBD`, `TODO`, `implement later`, "appropriate error handling", empty `mermaid` fences, or empty sections. Fix every hit.
4. **Assumptions ↔ design alignment:** Every assumption in Part 1 that constrains a technical decision is reflected in Part 2 → Approach or Risks and judgement calls. Assumptions that influence nothing are noise — drop them. No assumption invents a tuning value.
5. **Audit (when Step 1.6 ran):** The audit section reports a finding for every check performed, with real counts. Every renamed key with non-zero hits has every hit accounted for in a task.
6. **Skill list honesty:** Every skill named in Part 2 resolves to a real `.claude/skills/<name>/SKILL.md`. No invented skills, and no `none` on a task that writes TypeScript.
7. **Rule compliance:** No reject condition from any applicable `.claude/rules/` file is tripped by the design.
8. **Spec fidelity:** Every behaviour the plan describes either cites the specification the brief names or is flagged as new. No rule is re-derived, and no prior documented decision is silently overturned — that is a developer call, raised in Risks.

Fix issues inline. Continue to Step 3.

## Step 3: Hand off plan.md — gate approval with `AskUserQuestion`

**Do not write `tasks.md` yet.** First present in chat:

1. **The plan folder slug** you created in Step 1.7 — the developer's cheapest chance to rename it
2. **Restated goal** from Part 1, so the developer can confirm understanding before reading the rest
3. **Assumptions made** from Part 1 — call this out clearly; it is the part the developer most needs to red-line
4. **Mermaid diagram** from Part 2 if you produced one
5. **Skills loaded** during planning and **skills to invoke** during execution — flag any developer override
6. **Judgement calls** you made — pattern choice, naming, structural decisions
7. **Every decision the developer owns** — unchosen tuning values, ambiguous rule readings, dependencies that would be needed, and anything that can only be judged by playing

Then tell the developer:

> Review `<plan>/plan.md`. Start with Part 1 — if the restated goal doesn't match your intent, stop and fix that before going further.

### Then call `AskUserQuestion` to gate the tasks.md write

This is a **mandatory** tool call — do not infer approval from chat replies. Use this exact shape:

```
AskUserQuestion({
  questions: [{
    question: "Approve plan.md (Part 1 Alignment + Part 2 Technical design) and proceed to write tasks.md?",
    header: "Approve plan",
    multiSelect: false,
    options: [
      { label: "Approve — write tasks.md",
        description: "Alignment and design look right. Generate tasks.md in the same plan folder now." },
      { label: "Request changes",
        description: "plan.md needs revision before tasks.md. I'll list red-lines in the next message." }
    ]
  }]
})
```

**Branch on the answer:**

- **Approve — write tasks.md** → continue to Step 3.5 if this task was classified as **UI components** in Step 1.5b, otherwise straight to Step 4.
- **Request changes** → ask the developer for the specific red-lines (or read them from the same turn if already provided). Revise `plan.md` in place, re-run Step 2.5, then re-call `AskUserQuestion` with the same question. Loop until the developer picks "Approve".
- **`Other` (free-text)** → treat as a request for changes unless the free-text is unambiguous approval (e.g. "approved", "lgtm, proceed"). When in doubt, re-ask.

If the runtime cannot present `AskUserQuestion` (non-interactive session), state that explicitly in chat and proceed to Step 3.5 or Step 4 as above, but add a one-line note at the top of `tasks.md` that `plan.md` was not developer-confirmed.

## Step 3.5: For UI tickets — build and gate an interactive HTML mockup

**This is a MUST, not a suggestion: every UI ticket gets a mockup before tasks.md is written.** Runs only when Step 1.5b classified this task as touching **UI components** (a `.tsx` surface, `App.tsx`, or a `use*` hook extracted from one) — skip silently, with no note, for pure-logic, config/tunable, toolchain, or process-only work.

`plan.md` is developer-approved at this point; the mockup is downstream of it, not a new design decision. Do not use this step to invent visuals `plan.md` didn't already call for — if `plan.md` Part 1 → Assumptions made already picked the CSS/text-based card/token default (the SCRUM-32 pattern), the mockup follows that; it does not go looking for art.

1. **Build one self-contained file**, `<plan>/mockup.html` — static HTML, inline `<style>`, inline `<script>`. No build step, no framework, no import of this project's real components or styles. It exists to validate layout and interaction before real code is written, not to be shipped or reused as source.
2. **Cover every surface `plan.md` Part 1 → In scope claims this ticket renders**, populated with obviously-fake placeholder data (hard-coded hand of cards, a fake board, a fake score) — enough to judge layout and information density, nothing that needs to be real.
3. **Every actionable element the plan's acceptance criteria describe gets a real, clickable handler.** Fidelity floor: a plain `onclick="alert('deal')"`-style stub is enough — it does not need to model real game state, call an engine, or persist anything. The point is that the developer can click the thing and see that clicking it does something, not that the logic is correct.
4. **Publish it with the `Artifact` tool** (favicon of your choice, one-line description) so the developer can open and click through it from a single link, and confirm the same content is saved at `<plan>/mockup.html` so the plan folder still stands alone after `/clear`.
5. **Present it in chat**: what surfaces it covers, what to click and what should happen, and which `plan.md` acceptance criteria it's standing in for. Then call `AskUserQuestion` — mandatory, same standing as Step 3's gate:

```
AskUserQuestion({
  questions: [{
    question: "Does this mockup's layout and interaction match what should get built? Approve to continue to tasks.md, or describe what's wrong.",
    header: "Approve mockup",
    multiSelect: false,
    options: [
      { label: "Approve — continue to tasks.md",
        description: "Layout and interaction read right. Move on to writing the execution checklist." },
      { label: "Request changes",
        description: "Something about the layout or interaction is wrong. I'll describe it in the next message." }
    ]
  }]
})
```

**Branch on the answer:**

- **Approve — continue to tasks.md** → continue to Step 4.
- **Request changes** → get the specific red-lines, revise `<plan>/mockup.html`, re-publish via `Artifact`, re-ask. Loop until approved.
- **`Other` (free-text)** → treat as a request for changes unless unambiguous approval. When in doubt, re-ask.

If the runtime cannot present `AskUserQuestion` (non-interactive session) or the `Artifact` tool is unavailable, state that explicitly in chat, still write `<plan>/mockup.html` to disk, and proceed to Step 4 — but add a one-line note at the top of `tasks.md` that the mockup was not developer-confirmed.

**Carry the mockup forward.** Once approved, `<plan>/mockup.html` is a pattern reference for Step 4: the task(s) that build each UI surface should cite it by path in their step text (e.g. "layout per `<plan>/mockup.html`'s trick area") so the executor — who may be reading this contract after `/clear` with no memory of this conversation — knows it exists and what it settled. It is a layout/interaction reference, not a substitute for `plan.md` Part 2 → Data shapes or Approach.

## Step 4: Produce `tasks.md` (after approval)

Now that `plan.md` is approved, write the execution checklist into the same plan folder.

### The second file: `<plan>/tasks.md`

The execution checklist. Atomic, ordered, specific, **grouped by phase**. Each phase is a safe stopping point — the project type-checks and the codebase is internally consistent. Within a phase, each task is a self-contained vertical slice that names its module, the skill that governs it, the files it touches, and the ordered checkbox steps the executor must walk through. Tests live inside the task that introduces the behaviour they cover — never as a trailing "Unit tests" section. **Do not insert commit steps between phases or between tasks** — the executor decides when to commit; planning never prescribes git commits.

```markdown
# Tasks: [Task title]

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: PLANNED
Started: [today's date]

**Goal:** [one-sentence restatement of `plan.md` Part 1 → Restated goal]

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** *(or "(none — no new files)")*
- `src/utils/debounce.ts` — [one-line purpose]

**Modified:**
- `src/hooks/useSomething.ts` — [one-line summary of change]
- `src/components/Panel.tsx:120-145` — [one-line summary]

**Deleted:** *(or "(none)")*
- `src/utils/obsolete.ts`

**Developer decides or observes:** *(or "(none)")*
- config → `retryDelayMs` — [the value to choose, and what it trades off]
- [Behaviour only judgeable by running the app, with what to look for]

---

## Phase 1 — [Phase name, e.g. "Debounce helper with a named wait"]

[1-3 sentence framing paragraph: what this phase covers and why the boundary is a safe stopping point — does it type-check? does it widen before it cuts? are the side effects read-only? The framing tells the executor when to stop and re-evaluate if a step misbehaves. Do not include commit instructions.]

### Task 1: [Module / verb-shaped name — e.g. "Add debounce to src/utils/debounce.ts"]

- Skill: [skill-name from `plan.md` Part 2 "Skills to invoke during execution", normally `react-frontend`, or `none — <one-line reason>` for non-code work]

**Files:**
- Create: `src/utils/debounce.ts`
- Modify: `src/hooks/useSomething.ts:40-72`
- Delete: `src/utils/obsolete.ts`
- Test: `src/utils/__tests__/debounce.test.ts`
- Config: config file — add `retryDelayMs` (value is a developer decision) / `package.json` — add the `typecheck` script

(Omit any sub-bullet that genuinely doesn't apply. Use `path:line-range` on `Modify:` whenever the change is localised. Include the `Config:` sub-bullet whenever the task needs a configuration-file, `package.json`, `tsconfig.json`, `vite.config.ts`, or ESLint change — without it the executor has no mandate to touch those files.)

- [ ] **Step 1: [Imperative verb describing the action — e.g. "Write the failing test for a call made after the wait window"]**

[The exact code or change. Use a fenced block when the action is a code edit. State the precise diff: what gets replaced and what replaces it.]

​```ts
/** Debounce a callback by the given wait in milliseconds. */
export function debounce<T extends (...args: never[]) => void>(fn: T, waitMs: number): T {
​```

- [ ] **Step 2: [Verify the previous step — typecheck or run a scoped spec]**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: [Next module]

[…repeat the same shape, with whatever step count fits the work…]

---

## Phase 2 — [Phase name]

[Framing paragraph for Phase 2.]

### Task N: …

[…tasks…]

---

## Phase M — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task M.1: Confirm any architectural boundary this plan established still holds

- [ ] **Step 1: Grep for React and DOM references inside the tree meant to stay pure**

Run: `Select-String -Path <the tree's glob> -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. Include this task only when the plan established such a boundary — omit it otherwise rather than grepping a directory that doesn't exist.

### Task M.2: Confirm no tunable was hard-coded and no stale name remains

- [ ] **Step 1: Grep source and copy for the literals configuration owns**

Run: `Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "\b(<the specific literal values this plan's configuration owns>)\b"`
Expected: zero hits outside the configuration file and its type declaration.

### Task M.3: Static gates and full suite

- [ ] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task M.4: Update the PR description

- [ ] **Step 1: Write / update `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary of the change.
- Every decision the developer must make and every behaviour they must judge by playing.
- Verification results from the prior phases.
- A one-line note for future contributors on any new convention introduced.

---

## Self-review

(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)

**Spec coverage:**
- [plan.md In-scope bullet 1] — Tasks N, M.
- [plan.md In-scope bullet 2] — Task K.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or command.

**Type / name consistency:** [Confirm any new identifiers — exported function names, type names, configuration keys, action/state kinds, constant-map keys, reason codes, `data-testid` values — are used identically across every task that touches them.]

**Phase boundary cleanliness:** Each phase ends type-checking, with the codebase internally consistent (no half-applied renames, no dead imports, no spec importing a module that does not exist yet). [One sentence per phase confirming this.]
```

**Rules for tasks.md:**

- Tasks are grouped under `## Phase N — Name` headings. Phase numbering starts at 1; task numbering is sequential across all phases.
- Every phase opens with a 1-3 sentence framing paragraph explaining what the phase covers and why the boundary is a safe stopping point.
- **Never plan commits.** No `git commit` steps, "commit at end of phase" instructions, or commit-message templates. Committing is the executor's decision.
- Every code-touching task carries a `**Files:**` block and at least one `- [ ] **Step:**` bullet.
- **Step shape is flexible — fit the work, not a fixed template.** Common shapes:
  - `edit → typecheck` (refactors, config changes)
  - `add failing test → run-fail → implement → run-pass` (TDD slices — the default for anything with a testable invariant, most commonly pure logic)
  - `grep → confirm zero hits` (verification phases)
  Each step must be a real action (a concrete code change, or a runnable command with `Run:` / `Expected:`), never a description.
- The Skill bullet must name a skill from `plan.md` Part 2. `react-frontend` is the normal value for code work; `Skill: none — <one-line reason>` only for non-code tasks.
- The closing phase is named `## Phase N — Final verification` and contains only no-production-change sanity checks.

**Verification commands — use `.claude/workflow/web-project.md`.** That file owns the runner table; do not restate commands from memory and do not invent one that is not in it. Commands run in **PowerShell on Windows** — chain with `;`, not `&&`, and use backslash paths for filesystem arguments.

Hard constraints worth restating because they change plan shape:

- **Vitest must be invoked with the `run` subcommand.** `npx vitest run <path>`, never bare `vitest` — watch mode hangs the executor until it times out and produces nothing. This is the single most common way to waste a phase.
- **Never plan a `npm run dev` step.** It is a server that does not terminate, and no task step may invoke it. But "needs the running app" is no longer the same as "developer observation": QA drives the app through the `chrome-devtools` MCP at the end of `/fb-apply`, so a runtime question with a **right answer** — does the page render, does the action commit, does the panel read the expected value, is the console clean — is QA's to verify. Only *judgement* goes under "Developer decides or observes": interaction feel, visual and copy calls, pacing, whether the design is any good. Filing an automatable functional check as a developer observation buries it; the developer will not run it and nothing else will either.
- **`npm run typecheck` is the fast gate**, not `npm run build`. Reserve the build for Final verification.
- **`npm run lint` is a real, required gate** — plan it in the Final verification phase and, for any phase that touches a tree with an established purity boundary, alongside the boundary grep. Never plan an `eslint-disable` as a solution.
- **Dependencies must be installed for any npm step to work.** If the contract is the one that scaffolds the project, make its first task the scaffold and its second `npm install`; otherwise assume `node_modules` exists and let `/fb-apply` preflight it.
- **Read `package.json` before naming a script.** A `Run: npm run <script>` for a script that does not exist fails as `Missing script`, which reads like a defect and is not one.
- **Pass/fail is the exit code and the summary line**, not a results file. Write `Expected:` in those terms.
- **Default every test for pure logic to sit beside that logic, in its own `__tests__/` folder.** Planning a component test for logic that could be pure is a design smell — push the logic into a pure module instead, and say so in the plan.
- Unfiltered suite runs and the production build belong **only** to the Final verification phase; `/fb-apply` delegates them to QA.

**Config and persisted-shape changes have a mandatory task shape.** Because these names bind by string:

1. One task changes the shape and every reader together — the configuration key or persisted field, its TypeScript type, every consumer the Step 1.6 audit found, the test fixtures, and any copy that quotes the value. Splitting these across tasks leaves a phase boundary where the app is silently broken.
2. Where stored data exists, a following task handles migration or explicit rejection of the old shape — never a silent deserialisation into a half-valid object.
3. A task that adds a configuration key whose **value** has not been chosen names the key, gives it a documented placeholder, and lists the value under "Developer decides or observes". The executor must not invent a tuning number.

**Never plan a step that hand-edits `package-lock.json`.** Change `package.json` and run `npm install` so the lockfile is regenerated consistently.

**Other rules:**

- One module per task. If a slice touches a predicate, a validator, and a config key, that's separate tasks under the same phase — not one bundle.
- If the work warrants TDD (new logic with a meaningful invariant — which describes most pure logic), the task's steps follow the test-first sequence. If it's a mechanical refactor, rename, or config edit, the steps follow edit/verify. The planner picks the shape per task.
- **Prefer a pure module for anything with a testable invariant.** A task that puts a comparison or a limit check inside a `.tsx` file has made itself untestable without a renderer; the plan should note why if it does that deliberately.
- **Cite the spec, don't restate it.** A step implementing a documented validation order names the section and the reject order rather than paraphrasing it.

**How phases execute in `/fb-apply`:**
- The Implementer subagent walks every phase end-to-end first, executing every `- [ ] **Step:**` bullet of every task in order — including test steps. Reviewers do **not** run between phases.
- After the last phase, three reviewers (Code-Evaluator + Defender + QA) run **once, in parallel**, against the cumulative implementation. QA validates the production code AND any tests introduced.
- If reviewers find issues, the Implementer gets a single combined fix prompt, then reviewers run **one** verification round. Max 2 rounds total.

### Rules across both files
- `plan.md` Part 1 is the alignment check, Part 2 is the technical approach, and `tasks.md` is the execution list. Don't duplicate content across them.
- Tasks must be specific: file paths, module names, exported function names, type names, config keys.
- Tests live inside the task that introduces the behaviour they cover. Tasks that introduce new logic with a meaningful invariant must include a test step (and the corresponding `Test:` entry in the `**Files:**` block).
- The plan must comply with the loaded skills' standards, every applicable `.claude/rules/` file, and the traps section of `.claude/workflow/web-project.md`.

### No placeholders
Every line must contain content the developer can act on. These are **plan failures** — never write them in either file:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- A step that is prose ("verify it works", "run the build") without a `Run:` / `Expected:` line or a concrete code block
- A step that describes *what* without showing *how*
- References in `tasks.md` to types, functions, or config keys not present in `plan.md` Part 2 "Data shapes" or earlier tasks
- An empty `mermaid` code fence in `plan.md`
- A `plan.md` section with no body (write the one-line skip justification instead)
- A `## Phase` heading with no framing paragraph, or with no `### Task N:` blocks under it
- A task missing its `- Skill:` line, its `**Files:**` block, or any `- [ ] **Step:**` bullet
- A step that hand-edits `package-lock.json`, or that edits anything under `node_modules/` or `dist/`
- A step that runs bare `vitest` (watch mode) or `npm run dev` (never terminates)
- A step that invents a tuning value instead of routing it to the developer
- A step whose fix is an `eslint-disable`
- A `Skill:` value naming a skill that does not exist on disk, or `none` on a task that writes TypeScript

### Cross-file consistency
- Every code-touching task in `tasks.md` carries a `**Files:**` block and at least one `- [ ] **Step:**` bullet — file paths and verification commands are owned by tasks, not by `plan.md`.
- Every `- Skill:` value in a task must appear in `plan.md` Part 2 "Skills to invoke during execution" (or be the literal `none — <reason>`).
- Every type, function signature, config key, and file path used inside a task's steps must match `plan.md` Part 2 "Data shapes" (or be introduced by an earlier task).
- Every "In scope" bullet in `plan.md` Part 1 must map to one or more tasks in `tasks.md`.
- Every assumption in `plan.md` Part 1 that constrains a technical decision must be reflected in Part 2 "Approach" or "Risks and judgement calls".
- Every consumer named in the Step 1.6 audit appears in a task's `**Files:**` block.
- Every developer decision in `plan.md` Part 2 "Risks and judgement calls" appears in the `tasks.md` File map under "Developer decides or observes".
- Every phase in `tasks.md` ends type-checking with no half-applied changes — confirm this in the Self-review block.

## Step 4.5: Self-review `tasks.md` against the approved plan.md

Look at `tasks.md` with fresh eyes against the already-approved `plan.md`. Run this checklist yourself — no subagent dispatch.

1. **Brief coverage:** Skim each requirement and acceptance criterion in the brief, plus every "In scope" bullet in `plan.md` Part 1. Can you point to a task that implements it? List gaps and add tasks.
2. **Phase shape:** Grouped under `## Phase N — Name` headings. Every phase has a framing paragraph and at least one `### Task N:` block. Every code-touching task has a heading, a `- Skill:` line, a `**Files:**` block, and at least one `- [ ] **Step:**` bullet that is either a concrete code change or a runnable command with `Run:` / `Expected:`. The closing phase is `## Phase N — Final verification`.
3. **Runner sanity:** Every `Run:` command appears in `.claude/workflow/web-project.md` (or is `Get-ChildItem` / `Select-String` / a line count). Every `npm run <script>` names a script that exists in `package.json` — or is created by an earlier task in this contract. No bare `vitest`, no `npm run dev`, no invented flag. Unfiltered suite runs and the build appear only in Final verification.
4. **Test placement:** Every `Test:` path for pure-logic work sits beside the logic it tests, needs no DOM, and tests behaviour rather than implementation. A component test exists only where the behaviour is genuinely presentational.
5. **Config-change ordering (when a config key or persisted shape changes):** the shape, its type, every reader, the fixtures, and the copy change in ONE task; migration follows; unchosen values are routed to the developer, not invented.
6. **Cross-file consistency:** Apply the bullets above. A function called `debounce()` in Task 3 but `createDebouncer()` in Task 7 is a bug — find and fix it. Every `- Skill:` resolves to a skill listed in `plan.md` Part 2 *and* existing on disk. Do **not** silently change anything in the approved `plan.md` — if a gap forces a design change, surface it back to the developer for re-approval.
7. **Placeholder scan in `tasks.md`:** Search for the patterns in "No placeholders". Fix every hit.
8. **Self-review block:** Present at the bottom of the file, listing spec coverage, placeholder-scan confirmation, type/name consistency, and a per-phase cleanliness line.

Fix issues inline. No need to re-review after fixing — just fix and continue to Step 5.

## Step 5: Final hand off

`tasks.md` now exists at `Status: PLANNED`, so **move the ticket `Planning → Planned`** — automatically, no confirmation prompt. Same rules as Step 0.5: invoke `management-jira`, resolve the transition id live per *The SCRUM status model*, skip silently when the slug carries no `SCRUM-<n>` key, and never fail this command over a Jira error.

Then present in chat:

1. **Counts**: total phases and total tasks
2. **Phase summary**: one line per phase naming the phase and what it delivers
3. Reminder of the approved skills to invoke during execution (from `plan.md` Part 2)
4. **Everything the developer owns personally** — every tuning value still to choose, every ambiguous rule reading, any dependency needing approval, and every behaviour that can only be judged by running the app, with what to look for
5. **Jira**: the transition performed, e.g. `SCRUM-12 → Planned`. Say so plainly if it was skipped or failed
6. **Mockup**: if Step 3.5 ran, confirm `<plan>/mockup.html` exists and was approved, and which tasks cite it. Say so plainly if it was skipped (non-UI work) or left unconfirmed (non-interactive session)

Then tell the developer:

> The contract is complete under `<plan>/` — `plan.md` and `tasks.md`. That folder is the canonical plan, not this chat session. When you're ready, `/clear` and start a fresh execution session pointed at it: `/fb-apply <slug>`.
