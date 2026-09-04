---
name: unity-programmer
description: Apply modern Unity 6 C# engineering standards — allocation-free hot paths, engine-boundary costs, ScriptableObject and event-channel architecture, Awaitable over coroutines, and the Mono-to-CoreCLR cutover. Use when writing or reviewing Unity C# code, porting this prototype's rules into Unity, choosing between coroutines and async, deciding where game data or tuning values live, diagnosing a garbage-collection spike or frame hitch, or judging whether a Unity pattern is current or legacy.
allowed-tools: Read, Grep, Glob, Write, Edit, PowerShell, WebSearch, WebFetch
metadata:
  type: reference
---

# Unity Programmer

Conventions for writing Unity C# to the standards that have settled by 2026. Read this before writing or reviewing any `.cs` file that references `UnityEngine`.

**Scope:** this file holds the hard MUST/NEVER contract, the version facts, and the four traps that are unique to Unity rather than to C#. The worked legacy-versus-modern code pairs live in two reference files — read the one that matches the decision in front of you:

- `references/performance-and-memory.md` — allocation in the hot path, the managed/native boundary, what each engine property actually costs.
- `references/architecture-and-async.md` — ScriptableObjects, event channels, assembly definitions, dependency injection, `Awaitable`, the Job System.

## Use when

- Writing or editing any Unity C# file.
- Reviewing a Unity change for allocation, lifecycle, or architecture problems.
- Porting logic out of this repo's TypeScript prototype into Unity.
- Deciding between a coroutine and `async`/`Awaitable`, between a singleton and an event channel, or between a constant and a ScriptableObject.
- Diagnosing a frame hitch, a garbage-collection spike, or a bug that appears only on the second press of Play.

## Do not use when

- Anything under this repo's `src/` — that is the Vite + React prototype and belongs to the `react-frontend` skill. There is no Unity code in this repository today; this skill is for Unity work when it starts, and for judging portability decisions before then.
- Game design questions — use `game-designer`.
- Screen layout and interaction questions — use `game-ux`. Its zoning and interaction-cost thinking transfers to Unity UI; its CSS specifics do not.

## The pipeline still applies

Unity C# is code. Every change to it goes `/fb-plan <brief>` → the approval gate → `/fb-apply <slug>`, exactly as `CLAUDE.md` requires for `src/`. Reading Unity code, sketching an approach, and answering a question about it are all fine outside the pipeline. Writing a `.cs` file is not.

## Version facts (authoritative — check before assuming)

Written against **Unity 6 LTS, September 2026**. Two of these move; confirm them rather than trusting this file if the answer changes what you write.

| Fact | Current position |
|---|---|
| Scripting runtime | Mono today. **Unity 6.8 removes it** — CoreCLR only, .NET 10 as the sole target framework. |
| Domain reload | Fast Enter Play Mode becomes the default for new projects at 6.6 and **mandatory at 6.8**. Static state no longer resets between Play sessions. |
| Language | C# 9 on Mono; C# 14 after the cutover. |
| CoreCLR backend | Experimental at 6.7. **Do not ship on it.** Write code that survives the cutover; do not adopt the backend early. |

The rule that follows from this: prefer the shape that is correct on both runtimes. Where they differ, the CoreCLR-correct shape wins, because the Mono-only shape has a removal date.

## Resolve live sources

Unity's API surface is version-gated and moves between releases. Before generating code against anything in the table below — or anything else you are not certain shipped in the target version — resolve it first:

> Search Unity's official documentation for the API and the **specific Unity version the project targets**, using `WebSearch` then `WebFetch` against `docs.unity3d.com`. No Unity documentation MCP is connected in this project, so the web is the source. Read the API's own page before writing against it.

Resolve, do not assume: `Awaitable` and its members (2023.1+), `[AutoStaticsCleanup]` and the other new lifecycle attributes (6.5+), `UnityEngine.Pool` (2021+), Addressables (a package, so its version is independent of the editor's), anything in `Unity.Collections` or `Unity.Burst`, and any API this file names that the project's editor version might predate.

State the version you resolved against in the change summary. Never hardcode a signature you did not read.

## Hard floor (MUST / NEVER)

Everything below this section is rationale and detail. These are the rules a change cannot ship without.

### MUST

- **Read the nearest existing equivalent before writing.** Match its assembly, its namespace, its serialization style, and how it gets its dependencies.
- **Resolve component references once, in `Awake`, and prefer a `[SerializeField]` wired in the Inspector.** `GetComponent` is a search through a native component list. `[RequireComponent]` makes the guarantee structural.
- **Reset every static field explicitly.** A `[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]` reset method, or `[AutoStaticsCleanup]` on 6.5+. Without one, the field keeps last session's value the moment Fast Enter Play Mode is on.
- **Pair every `+=` on an event with a `-=`.** Subscribe in `OnEnable`, unsubscribe in `OnDisable`. An event on a ScriptableObject or a static outlives the listener and will fire into a destroyed object.
- **Dispose every native container and every `IDisposable`,** in a `finally` or with a `using` declaration. `Allocator.TempJob` leaks are reported as warnings four frames later, which is far from the code that caused them.
- **Pass `destroyCancellationToken` through every `await`.** A coroutine stops when its GameObject is disabled; an async method does not.
- **Use `== null` on anything deriving from `UnityEngine.Object`,** and hoist the check out of tight loops rather than replacing it. See the trap below.
- **Measure every file you create or grow** (`(Get-Content <file> | Measure-Object -Line).Lines`). Under 200 lines is fine, 200–400 needs a second look, **over 400 is blocking** — split it in the same change. Note that `Measure-Object -Line` drops blank lines, so a file near the limit is likely already over it; check the raw count before concluding it passes.
- **Name what you profiled.** "This is faster" without a Profiler capture is a guess. Say which marker moved, and whether you measured in the editor or in a build.

### NEVER

- **Never allocate per frame.** No `new` inside `Update`, `FixedUpdate`, `LateUpdate`, or anything they call. Reuse a field-held collection and `Clear()` it.
- **Never call `GameObject.Find`, `FindObjectOfType`, or `SendMessage` at runtime.** They scan the scene or use reflection, and they encode the dependency as a string the compiler cannot check.
- **Never use LINQ in per-frame code.** It is excellent in editor tooling, tests, and setup. It allocates an enumerator per operator and runs roughly half the speed of the equivalent loop.
- **Never write a finalizer in runtime code.** It runs on another thread at an unpredictable time, cannot touch anything Unity owns, and forces the object to survive an extra collection. Implement `IDisposable` instead.
- **Never leave an empty magic method.** An empty `Update` or `Start` still costs a crossing into managed code every frame, per component.
- **Never mutate a ScriptableObject at runtime as if it were state.** It is an asset: the write persists in the editor and vanishes in a build. Treat it as read-only configuration and copy what you need to mutate.
- **Never use `BinaryFormatter`.** It is obsolete and absent from the surface Unity is moving to.
- **Never touch the Unity API from a background thread.** Return to the main thread explicitly first.
- **Never use `async void`** except at an outermost entry point, wrapped in `try`/`catch`. Anywhere else the exception is unobservable and takes the process down on CoreCLR.
- **Never leave `Debug.Log` in a hot path.** It allocates, and it is expensive even when the console is closed. Strip it or gate it behind a conditional compilation symbol.
- **Never claim a build or a test passed without running it.** Say plainly what you ran and what you did not.

## The four Unity-specific traps

General C# instinct is wrong in exactly these four places. Everything else in this skill is ordinary good engineering applied to a game engine; these are the ones that will catch an experienced C# developer who is new to Unity.

**1. Modern null-checking is the legacy answer here.** Unity overloads `==` on `UnityEngine.Object` so a destroyed object compares equal to null even though its managed wrapper still exists. `is null`, `?.`, `is not null` and nullable reference types all bypass that overload and will happily hand you a destroyed object. Use `== null`. The overload costs a native call, so get it out of tight loops by checking once and hoisting — not by switching to `ReferenceEquals`.

**2. Engine properties are function calls into C++.** `transform`, `position`, `enabled`, `Time.deltaTime` and their neighbours look like fields and are not. Read once into a local, do the work, write once. `SetPositionAndRotation` exists specifically to halve the crossings.

**3. Nullable reference types mislead on serialized fields.** A `[SerializeField]` the Inspector never filled is null while the compiler believes it cannot be. Enable nullable per assembly, starting with the engine-free ones, and leave it off where Unity's serializer is the one assigning the field.

**4. Fast Enter Play Mode makes statics sticky.** The classic symptom is a game that works the first time you press Play and behaves strangely the second. It is almost always a static, an event subscription, or a ScriptableObject holding runtime state.

## Focus areas

- Allocation-free hot paths — pooling, buffer reuse, `Span<T>` and `stackalloc`, boxing, closures, string building.
- The managed/native boundary — component lookup, transform access, update-loop cost, batching many behaviours into one system.
- Architecture — plain C# rules, ScriptableObject configuration, event channels, assembly definitions, composition roots.
- Concurrency — `Awaitable` for sequencing, the Job System and Burst for throughput, thread affinity.
- The CoreCLR migration — statics, serialization, arithmetic, finalizers.
- Enforcement — `Microsoft.Unity.Analyzers`, Project Auditor, per-assembly analyzer scope, profiling on device.

## Approach

1. **Establish where the code belongs before writing it.** Engine-free rules go in a domain assembly with no `UnityEngine` reference; that is what makes them unit-testable without opening the editor. A `MonoBehaviour` is a thin view.
2. **Resolve any version-gated API** against the docs for the project's actual Unity version. See the live-sources section.
3. **Read the matching reference file** — `performance-and-memory.md` for anything per-frame or allocation-shaped, `architecture-and-async.md` for anything about structure, data, or sequencing.
4. **Write the version that is correct on both runtimes**, and where they differ, the CoreCLR one.
5. **Check the four traps** against what you just wrote.
6. **Measure the file length**, and say what you verified.

## Calibration

Don't over-optimise. Most "C# performance problems" in a Unity project are draw calls or asset residency, not managed code — confirm the bottleneck with the Profiler before rewriting anything for speed. Pooling, Jobs, and Burst all cost readability; spend them where a capture says the time actually goes, and leave straightforward code straightforward everywhere else.

Equally, don't under-architect on the grounds that it is a prototype. The ScriptableObject-and-event-channel shape costs almost nothing to adopt at the start and is expensive to retrofit once fifty scripts reference a singleton.

## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/` (Glob `.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules added after this skill was written. See `.claude/rules/README.md` for the index.

`save-data-versioning.md` is the one that bites most often here: its envelope, key-composition and version-bump requirements are about persisted data, not about the web prototype, so they carry across to Unity's save layer unchanged.

## Success criteria

- No `new` in any per-frame method or its call tree.
- Every static field has an explicit reset; every `+=` has a matching `-=`; every native container is disposed.
- No `GameObject.Find`, `FindObjectOfType`, `SendMessage`, `BinaryFormatter`, or finalizer in runtime code.
- Component references are serialized fields or resolved once in `Awake`.
- Every `await` carries a cancellation token.
- Engine-free rules compile in an assembly that does not reference `UnityEngine`, and their tests run without entering Play mode.
- Every file measured, none over 400 lines.
- The Unity version each resolved API was checked against is stated in the change summary.
