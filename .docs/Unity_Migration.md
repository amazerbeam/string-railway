# Returning to Unity

How to move String Railway from the browser prototype to a Unity project, and how to put the `/fb-*` pipeline back on Unity footing.

Read this when the prototype has answered the questions it exists to answer. **The file-by-file restore procedure lives in `.claude/workflow/unity/README.md`** — that folder holds the verbatim Unity snapshot and owns the inventory. This document is the developer-facing plan around it: when to switch, what survives the move, and what to do in what order.

---

## Before you start: the prototype has a job to finish

The prototype is not a first draft of the game. It exists to settle the decisions that are cheap to change in a browser and expensive to change in an engine. Switching before they are settled means re-answering them in the slower tool.

Tick these off first:

- [ ] **M6 — the ±2% arc-length rule** has been played, and the fixed-length drag either feels like a spatial puzzle or has been retuned until it does. This is the decision that defines the game (`.docs/Game_Rules/Rules.md` §14, M6).
- [ ] **M2 — the geometry constants** are settled: border perimeter, per-player-count edge lengths, card footprint, string lengths. Not "plausible" — play-tested.
- [ ] **M17 — deck composition** has been replaced with a count of the physical cards. It is the one made-up value with a definitive real answer.
- [ ] **§12's symptom-to-cause table** has been worked through for anything that felt wrong, rather than patched in code.
- [ ] **The page-7 worked example (§5.4) is green** in the Vitest suite, and the scoring edge cases around it (terrain counts as a previously-placed string; each crossing point counts separately; on-card crossings are free) have tests.
- [ ] **Every M-decision the play-testing settled has been written back into `Rules.md` §14** with its confidence updated. Otherwise the answers exist only as numbers in `rules.json`, and the reasoning is lost. Editing the rulebook is a design act — do it deliberately, and do it before the port so the Unity build reads a settled spec.

If some of these are still open, the honest move is to keep prototyping. Unity does not make a rules question easier to answer.

---

## What carries over, and what doesn't

The `src/rules/` purity boundary was established so this migration is a port of *logic*, not an archaeology dig through components. That is the payoff — collect it.

| Artefact | Carries over? | How |
|---|---|---|
| **The Vitest specs in `src/rules/__tests__/`** | **Yes — highest-value thing you own** | Port assertion-by-assertion to NUnit EditMode tests. The expected values are the spec; the arrange/act shape barely changes. Port these *first*, before the code they test. |
| **Geometry predicates, validation order, scoring resolution, turn loop** | Yes, as algorithms | TypeScript → C# is mechanical for pure functions with no framework calls. Keep them plain C# classes, not `MonoBehaviour`s — see Step 4. |
| **`rules.json` values** | Yes, as data | Becomes a `ScriptableObject` (or a JSON asset). Carry the M-number comment on every field, or the tuning workflow dies in the move. |
| **The named intersection epsilon and the degenerate-case list** | Yes | Float behaviour differs between the two runtimes; the *cases* transfer even when the epsilon needs re-tuning. Re-run the degenerate tests before trusting it. |
| **The seeded-generation design** | Yes, as a requirement | The seed and the move log reproduce any board. Unity needs its own seeded RNG — `Random.InitState` or your own — and `UnityEngine.Random` without an explicit seed is the same defect `Math.random()` was. |
| **The move-log / saved-game shape** | Design yes, format no | The "state is a fold over a move log" design is what matters. Serialised web save files are not worth migrating. |
| **The SVG board** | No | Rendering is a full rewrite: sprites, a mesh line renderer, or a custom shader. |
| **The drag implementation** | No | Ref-mutating a `path`'s `d` attribute is a web technique. Unity needs its own input handling; the *interaction design* (lay the whole string, arc length is the budget) is what transfers. |
| **The accessibility notes** | Partly | The ≥44px target sizing and focus-visible work is web-specific. The known gap — the freehand drag has no keyboard equivalent — is still true in Unity and still worth stating. |
| **Component structure, hooks, CSS** | No | Nothing to port. |

Decide explicitly what happens to the prototype tree. Keeping `src/` in the repo as a reference implementation is defensible; leaving it live while a Unity project builds beside it is how an agent ends up planning `src/rules/` paths into a Unity contract. If you keep it, say so in `CLAUDE.md` and mark it read-only.

---

## Step 1 — Create the Unity project (developer-owned)

This one cannot be delegated. Unity Hub creates the project, writes `ProjectSettings/`, and generates the `.sln` on first import; there is no file-edit equivalent.

1. **Pin the Editor version** in Unity Hub and record it in `CLAUDE.md`. The Editor version pins what the API surface contains — an unpinned version is a future afternoon lost to a signature that moved.
2. Create the project **at the repo root** (2D template) so `Assets/`, `Packages/`, and `ProjectSettings/` sit beside `.claude/` and `.docs/`.
3. Add Unity's `.gitignore` — `Library/`, `Temp/`, `Logs/`, `Build/`, `obj/`, `*.csproj`, `*.sln`. Note that this repo is **not currently a git repository**; if that has not changed, initialising one is worth doing before the port rather than after.
4. Open the project once so Unity generates `StringsAndStations.sln`. Until that exists, the fast compile gate does not.
5. Set the Editor path for CLI runs, once per shell:
   ```powershell
   $env:UNITY_EXE = "C:\Program Files\Unity\Hub\Editor\<version>\Editor\Unity.exe"
   ```
6. Create the folder skeleton the restored `unity-project.md` expects: `Assets/Scripts/`, `Assets/Tests/EditMode/`, `Assets/Tests/PlayMode/`, with an `.asmdef` per feature area and test asmdefs referencing them.

---

## Step 2 — Restore the pipeline

**Follow `.claude/workflow/unity/README.md` → "Switching back to Unity".** It lists which snapshot file replaces which live file and why a blind `Copy-Item -Force` is the wrong move: the live files have accumulated process improvements (step ordering, the approval gate, the per-phase batching policy, the reviewer dispatch shape) that are stack-agnostic and would be discarded.

The shape of it:

1. Snapshot the web variant into `.claude/workflow/web/` the same way the Unity one was made — you may well come back to it, and this is the only copy.
2. Diff each live file against its Unity snapshot and merge, keeping process changes and taking back Unity content.
3. Restore the Unity-specific pieces by name: the runner table, developer-owned Editor work, `/fb-plan`'s serialization audit, the `Asmdef:` sub-bullet in the `**Files:**` block, and the Defender's fake-null and serialization checklist items.
4. **Fix the skill roster before any plan names a skill.** `react-frontend` does not apply to a Unity build, and a plan that tells the executor to invoke a missing skill wastes a turn. Either write the replacement with `/skill-creator` first, or accept `Skill: none` and lean on `CLAUDE.md` plus `unity-project.md` — but decide, don't drift.

Two inversions to check specifically, because they are the ones most likely to be missed and each produces a confidently wrong review:

- **The lint gate disappears.** There is no analyzer in a stock Unity project. `npm run lint` / `npm run typecheck` must stop being required gates, and QA must stop failing tasks for a missing one — or every contract fails on a command that does not exist.
- **Optional chaining becomes dangerous.** `?.`, `??`, and `is null` bypass `UnityEngine.Object`'s `==` overload and see a live reference to a destroyed object. In the prototype they are ordinary, correct TypeScript. The Defender's checklist has to flip on this, not merely mention it.

The full before/after table is in the snapshot README — read it rather than reconstructing it from memory.

---

## Step 3 — Re-point `CLAUDE.md`

`CLAUDE.md` is where every agent goes for conventions, so a half-switched one keeps sending work to the wrong stack. State plainly which stack the pipeline targets, and if a prototype tree still exists, which of the two is live. Restore from `.claude/workflow/unity/CLAUDE.md`, then update:

- Project state — the Unity project now exists, so the "assumed, not yet observed" caveats on paths come off as you confirm each one.
- The Editor version you pinned in Step 1.
- The single-source-of-truth table — the workflow-reference row points back at `unity-project.md`.
- The skills table — whatever Step 2 decided.

---

## Step 4 — Port the rules engine, tests first

Follow the rulebook's own build order (§11), which is also the order that keeps you in green tests:

1. **Port the EditMode tests for the geometry predicates**, from the Vitest specs. They will not compile yet. That is fine.
2. Port the predicates as **plain C# classes** — no `MonoBehaviour`, no `UnityEngine` types in the signatures. This is what makes the tests a 1:1 mirror of the Vitest ones and keeps the engine testable without a scene. Trapping this logic in a component is the single most consequential mistake available in the move; it caps how much of the codebase can ever be tested.
3. Move the tunables into a `ScriptableObject`, with the M-number on every field and the validation the prototype did on load (counts summing, positive lengths, long string longer than short).
4. Port validation (§10.2, in reject order), then scoring (§10.3), then the turn loop (§10.4) — each with its tests ported first.
5. Only then start on presentation: board rendering, then the string drag, then the HUD.
6. Re-run the degenerate geometry cases and re-tune the epsilon for the new float pipeline. Do not assume the prototype's value transfers.

The `.asmdef` boundaries do the job the `src/rules/` lint rule did: put the engine in its own assembly, and let the test assembly reference it. If a test needs a `MonoBehaviour`, the logic is in the wrong place.

---

## Done when

- [ ] Unity project opens clean; `dotnet build StringsAndStations.sln` succeeds.
- [ ] Every Vitest spec has an EditMode counterpart, and the page-7 worked example (§5.4) is green in NUnit.
- [ ] Tunables live in a `ScriptableObject` with M-numbers intact; no geometry literal appears in code.
- [ ] Seeded generation reproduces a board from a seed, with no unseeded `UnityEngine.Random` reachable from it.
- [ ] `.claude/workflow/unity-project.md` is live again and every path in it has been *observed*, not assumed.
- [ ] `CLAUDE.md` names the Unity stack, the pinned Editor version, and the skill roster.
- [ ] `.claude/workflow/web/` holds the web variant snapshot, and the prototype tree's status is stated rather than ambiguous.
- [ ] One end-to-end `/fb-plan` → `/fb-apply` cycle has run on a small Unity contract, to prove the restored pipeline before a real feature depends on it.
