# Unity project layout, runners, and developer-owned work

**This file is forward-looking.** No Unity project exists on disk yet — `unity/` holds only a
`README.md`. **No command in this file has been run.** Everything below describes the project as
`prototype/.docs/implementation/unity-port-architecture.md` designs it, mirrored into the same shape as its
sibling, `.claude/workflow/web-project.md`, which covers the prototype under `prototype/`. **The
first Unity scaffolding ticket must include a task that corrects this file against the real
project** — assembly names that turned out different, a command that needs a flag this file
doesn't know about, a path that landed somewhere else. Until that correction lands, treat every
command here as a plan, not a verified fact.

## Layout

Seven assembly definitions, all under `unity/` (`prototype/.docs/implementation/unity-port-architecture.md`
§2):

```
unity/
  README.md
  TechDuinn.Table/          engine-free — cards, suits, ranks, the deal, legal moves, trick
                             resolution, the draw pile and its reshuffle, the Shade's card choice,
                             the four outcomes, the pot arithmetic
  TechDuinn.Passage/        engine-free — the run: charms, the Cairn's grants, the shop, Dagda's
                             Cauldron, health, coins, the opponent ladder, the fight boundary
  TechDuinn.Presentation/   engine-free — view models: pure functions from rules state to what a
                             screen shows
  TechDuinn.Data/           references UnityEngine — ScriptableObject definitions and the mapping
                             from an asset to the plain rules value it produces
  TechDuinn.Persistence/    references UnityEngine — the save envelope, the key composer, the one
                             class that touches the filesystem
  TechDuinn.Game/           references UnityEngine — MonoBehaviours, prefabs, input, animation,
                             audio, scene wiring, the composition root
  TechDuinn.Simulation/     engine-free — the headless run simulator and its policies
```

Cite `prototype/.docs/implementation/unity-port-architecture.md` §2 for the full per-assembly table and the
reasoning behind each row; it is not restated here.

## Architectural boundaries

Four rules, from §2:

- **`TechDuinn.Table` and `TechDuinn.Passage` reference no `UnityEngine` at all.** That is what
  makes every rule unit-testable without entering Play mode and what makes it structurally
  impossible for a `MonoBehaviour`, a `Transform`, or a `ScriptableObject` to end up inside a rule.
- **`TechDuinn.Passage` may reference `TechDuinn.Table`, never the reverse.** One direction only.
- **Nothing references `TechDuinn.Data`.** Definition assets flow into the rules as plain values;
  a rule never holds a `ScriptableObject`.
- **`TechDuinn.Presentation` is engine-free too.** Every "which cards light up" / "what does this
  card pay" / "why is this button greyed out" question is answered by a pure function with a unit
  test; the `MonoBehaviour` only positions things.

Plus §2.1: **`Table`, `Passage`, `Presentation` and `Simulation` — the four assemblies with no
`UnityEngine` reference — also carry a plain `.csproj` alongside their `.asmdef`, pointed at the
same source folders.** That is what lets `dotnet test` run them with no Unity install and no
licence, and it is what makes the fast gate below possible at all. Nullable reference types are on
for these four assemblies and off for `Data` and `Game`, per §2.1.

## Verification commands

**The whole table below is not yet runnable.** No Unity project exists to run it against.

| To verify | Command |
|---|---|
| **Types and rules are sound (the fast gate, analogous to `npm run typecheck`)** | `dotnet test` over the four engine-free assemblies (`Table`, `Passage`, `Presentation`, `Simulation`) |
| Anything touching `Data` or `Game` | Unity editor-mode tests, run in batch mode |
| A player build | Unity's batch-mode build pipeline, targeting the project's chosen platform |

Cite `prototype/.docs/implementation/unity-port-architecture.md` §2.1 and §12 for why the fast gate is
possible at all, and §20.4 for why this table exists as this file's sibling rather than as an
addition to `web-project.md`.

### Hard constraints on runners

- **A Unity batch-mode invocation needs `-batchmode -nographics -quit` and an explicit log path,
  or it produces no readable output.** Without `-quit` the editor stays open; without a log path
  there is nothing to read back.
- **The editor holds a project lock.** Two Unity invocations cannot run concurrently against the
  same project — unlike the npm commands in `web-project.md`, where nothing holds an exclusive
  lock and several commands can run side by side.
- **Prefer `dotnet test` over the editor test runner wherever the assembly allows it.** The editor
  test runner needs a full domain reload per run; `dotnet test` over the four engine-free
  assemblies does not, which is the entire point of §2.1's dual `.csproj` setup.

## Developer-owned work

Some work cannot be done by an agent, because the answer lives in a human's eyes and hands, or
because it commits the project to something expensive to reverse. Never dispatch these to the
Implementer and never fabricate the outcome.

- **Approving a new Unity package.**
- **Anything requiring *judgement* of the running game** — feel, readability, pacing — the same
  boundary `web-project.md` draws for the prototype.
- **Pinning the editor version and the render pipeline** (§20.5) — including whether the
  Mono-to-CoreCLR cutover at 6.8 is something to land on deliberately or to sit behind, and the
  Input System and base resolution/card-dimension choices §20.5 also names.
- **The git and LFS setup before the first binary asset lands** (§20.3) — forcing text
  serialization, committing `.meta` files, configuring LFS for art and audio, and taking Unity's
  own `.gitignore`. Retrofitting LFS after sprites are in history is a rewrite of the repository.

Treat reaching one of these as a pause condition: stop dispatching, state precisely what the
developer must do or decide, wait for their answer, then continue.

## Correctness traps

These produce bugs that compile cleanly and pass a naive review. Four are general to Unity C#
(`.claude/skills/unity-programmer/SKILL.md`'s own trap list); two are specific to this game
(`prototype/.docs/implementation/unity-port-architecture.md`).

- **`== null`, not `is null`, on anything deriving from `UnityEngine.Object`.** Unity overloads
  `==` so a destroyed object compares equal to null even though its managed wrapper still exists;
  `is null`, `?.`, and nullable reference types all bypass that overload.
- **Engine properties are function calls into C++, not fields.** `transform`, `position`,
  `enabled`, `Time.deltaTime` and their neighbours look like fields and are not — read once into a
  local, do the work, write once.
- **Nullable reference types mislead on `[SerializeField]`.** A field the Inspector never filled is
  null while the compiler believes it cannot be — this is why nullable is on for the four
  engine-free assemblies and off for `Data` and `Game` (§2.1).
- **Fast Enter Play Mode makes statics sticky.** A game that works the first time Play is pressed
  and misbehaves the second is almost always a static, an event subscription, or a
  ScriptableObject holding runtime state that never reset.
- **No `UnityEngine.Random` or `System.Random` in a rules path** (§10). Both are banned in `Table`,
  `Passage` and `Simulation` — `UnityEngine.Random` because it is a global, shared, order-dependent
  static that isn't reset between Play sessions once Fast Enter Play Mode is mandatory;
  `System.Random` because its sequence is not contractually stable across .NET versions, and the
  Mono-to-CoreCLR cutover is exactly the event that would silently change it and invalidate every
  recorded seed. Port the prototype's own seeded PRNG instead.
- **No floating-point arithmetic in `Table` or `Passage`** (§20.2). Integer arithmetic only, with
  percentages as integers and the rounding direction stated at every division — a float that is
  harmless in one browser is not harmless across a Windows build, a Mac build, and a recorded seed
  that has to replay on both, and an integer round-trips through JSON exactly where a float does
  not.

## Version this was written against

Unity 6 LTS, as of September 2026. **Two facts here move and must be re-checked rather than
trusted:** the scripting runtime is Mono today, and **Unity 6.8 removes it** — CoreCLR only, .NET
10 as the sole target framework; and Fast Enter Play Mode becomes the default for new projects at
6.6 and **mandatory at 6.8**, after which static state no longer resets between Play sessions.
Resolve any version-gated API against `docs.unity3d.com` for the project's actual target version
before writing code against it — `.claude/skills/unity-programmer/SKILL.md` owns this rule and the
list of APIs it applies to.
