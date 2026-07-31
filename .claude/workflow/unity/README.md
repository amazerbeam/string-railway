# Unity variant — parked, not deleted

A verbatim snapshot of the `/fb-*` pipeline as it stood when this project targeted **Unity**, taken on 2026-07-31 immediately before it was repointed at the browser prototype (SCRUM-8).

**Nothing in this folder is live.** No command, agent, or skill reads it. It exists because the prototype is a means to an end: the plan is to answer the M6/M2 design questions in the browser and then build the real game in Unity. When that day comes, this is a restore rather than a rewrite.

## What is here

| Snapshot | Live counterpart now |
|---|---|
| `CLAUDE.md` | `CLAUDE.md` at the repo root (rewritten for Vite/React/TS) |
| `workflow/unity-project.md` | `.claude/workflow/web-project.md` |
| `agents/{implementer,code-evaluator,defender,qa}.md` | `.claude/agents/` (same filenames, rewritten) |
| `commands/fb-{plan,apply,issue,archive,report}.md` | `.claude/commands/` (same filenames, rewritten) |

`.claude/workflow/plan-resolution.md` is **not** here: contract layout, slug grammar, and plan resolution are stack-agnostic and were never rewritten. It stays live and correct for both variants.

## Switching back to Unity

**Start at `.docs/Unity_Migration.md`** — it owns the migration plan: when the prototype has finished its job, what carries over (the Vitest specs are the highest-value artefact), creating the Unity project, and the porting order. This section owns only the file mechanics it points back to.

This is a deliberate, reviewed switch — not a `Copy-Item -Force` sweep. The live files have since accumulated pipeline improvements that are stack-agnostic (step ordering, the approval gate, the batching policy, the reviewer dispatch shape). A blind restore throws those away.

1. Snapshot the web variant the same way this folder was made, into `.claude/workflow/web/`.
2. Diff each live file against its snapshot here and carry forward every change that is about *process* rather than about the stack.
3. Restore the Unity-specific content: the runner table, the developer-owned-Editor-work list, the serialization audit (`/fb-plan` Step 1.6), the `Asmdef:` sub-bullet in the `**Files:**` block, and the Defender's fake-null and serialization checklist items.
4. Re-check the skill roster. `react-frontend` does not apply to a Unity build; whatever replaces it must exist on disk before any plan names it.

## What changed conceptually, and why it matters if you come back

The two stacks fail in different places, and the pipeline is shaped around the failure modes:

| Unity | Browser prototype |
|---|---|
| Serialization is name-based and invisible to the compiler — a renamed `[SerializeField]` is silent data loss | `rules.json` keys, storage keys, and the persisted move log are the name-bound surface |
| No linter, no analyzer — never invent one | `npm run lint` and `npm run typecheck` are required gates |
| The Editor holds an exclusive lock; batchmode runs fail while it is open | No lock. The hang risk is Vitest watch mode and a foreground `npm run dev` |
| Test results live in the `-testResults` XML, not stdout | Exit code and stdout are authoritative |
| Project creation is developer-owned Editor work | Scaffolding is `npm create vite` — an agent can do it |
| Pause condition: Inspector wiring, Build Settings, ScriptableObject instances | Pause condition: anything needing a human at the browser, and any tuning or rule-reading decision |
| `?.` / `??` / `is null` are dangerous on `UnityEngine.Object` (fake-null) | Optional chaining is ordinary, correct TypeScript |

If you restore the Unity variant while a browser prototype still exists in the tree, say in `CLAUDE.md` which one the pipeline is pointed at. Two live stacks with one set of commands is how an agent ends up planning `Assets/Scripts/` paths into a Vite project.
