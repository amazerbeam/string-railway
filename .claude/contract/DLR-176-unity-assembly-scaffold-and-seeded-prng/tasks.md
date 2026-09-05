# Tasks: Unity assembly scaffold, the seeded PRNG, and the first fast gate

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: PLANNED
Started: 2026-09-05

**Goal:** Turn `unity/` from an empty Unity 6 project into one with three assembly definitions, a hand-written `.csproj` beside each engine-free `.asmdef` over the same source folder, a seeded PRNG ported bit-for-bit from the prototype, a `dotnet test` fast gate that has actually been run, and three documents corrected against what is now on disk.

**Spec:** `plan.md` in this folder.

---

## Preflight — the developer must do this before `/fb-apply`

**The .NET 8 SDK is not installed on this machine.** Only the .NET 6 runtime is present; `C:\Program Files\dotnet\sdk\` is empty. Every `dotnet` step below fails without it.

```
winget install Microsoft.DotNet.SDK.8
```

Then, in a **fresh** terminal, `dotnet --list-sdks` must print an `8.0.x` line. If it does not, stop and say so — do not proceed and do not report a gate result.

---

## File map

**Created:**
- `unity/Directory.Build.props` — redirects MSBuild `obj/` and `bin/` out of `Assets/` and into the already-ignored `unity/Build/`
- `unity/TechDuinn.FastGate.sln` — the single argument the documented fast-gate command takes
- `unity/Assets/TechDuinn.Table/TechDuinn.Table.asmdef` — engine-free, references nothing
- `unity/Assets/TechDuinn.Table/TechDuinn.Table.csproj` — the `dotnet` view of the same folder
- `unity/Assets/TechDuinn.Table/csc.rsp` — `-nullable:enable` for the Unity half
- `unity/Assets/TechDuinn.Table/SeededRng.cs` — the ported mulberry32 generator and `Seeds`
- `unity/Assets/TechDuinn.Presentation/TechDuinn.Presentation.asmdef` — engine-free, references `TechDuinn.Table`
- `unity/Assets/TechDuinn.Presentation/TechDuinn.Presentation.csproj`
- `unity/Assets/TechDuinn.Presentation/csc.rsp`
- `unity/Assets/TechDuinn.Presentation/SeedDisplay.cs` — one real pure view model over `SeededRng`
- `unity/Assets/TechDuinn.Game/TechDuinn.Game.asmdef` — references UnityEngine, no `csc.rsp`
- `unity/Assets/TechDuinn.Game/GameAssembly.cs` — placeholder so Unity does not warn on a script-less asmdef
- `unity/Tests/TechDuinn.Table.Tests/TechDuinn.Table.Tests.csproj`
- `unity/Tests/TechDuinn.Table.Tests/SeededRngTests.cs` — golden vectors generated from the prototype
- `unity/Tests/TechDuinn.Table.Tests/AssemblyBoundaryTests.cs` — proves the one-way reference edge
- `unity/Tests/TechDuinn.Presentation.Tests/TechDuinn.Presentation.Tests.csproj`
- `unity/Tests/TechDuinn.Presentation.Tests/SeedDisplayTests.cs`

**Modified:**
- `unity/.gitignore` — un-ignore the hand-written solution; add unanchored `obj/`/`bin/` patterns
- `.claude/workflow/unity-project.md` — corrected against the project that now exists
- `CLAUDE.md:167` — the paragraph claiming no gate has ever been run
- `unity/README.md` — the "deliberately empty, nothing here yet" framing

**Deleted:** (none)

**Developer decides or observes:**
- **Install the .NET 8 SDK before `/fb-apply`** — see Preflight above. Nothing from Phase 2 onward runs without it.
- **Approve three NuGet test packages** — `Microsoft.NET.Test.Sdk` 17.11.1, `NUnit` 4.2.2, `NUnit3TestAdapter` 4.6.0. NUnit rather than xUnit so the same test files could later run inside Unity's own NUnit-based test framework.
- **Open the Unity editor once after apply, confirm the console shows no compile errors for the three new assemblies, and commit the generated `.meta` files.** An agent cannot make the editor import, so this is the ticket's one unavoidable eyes-on step and the scaffold is incomplete in Unity's eyes until it happens.
- **`TreatWarningsAsErrors` is on in the two engine-free projects** — a nullable warning will fail the gate rather than log. Judge whether that is too sharp on a scaffold this small; it is one line to relax.

---

## Phase 1 — The scaffold: three assemblies, their project files, and the solution

Everything structural, and nothing that thinks. This phase creates the two views of each source folder — the `.asmdef` Unity reads and the `.csproj` `dotnet` reads — plus the output redirection and `.gitignore` corrections that stop the two toolchains fighting over the same directory. The boundary is safe because it ends with `dotnet build` green over a solution of two source projects that compile to nearly-empty assemblies; no test project exists yet and nothing references anything that is not on disk. The `.gitignore` task is first deliberately: the solution created later in the phase is swallowed by the existing `/*.sln` rule until that edit lands.

### Task 1: Redirect MSBuild output out of `Assets/` and correct `unity/.gitignore`

- Skill: `unity-programmer`

**Files:**
- Create: `unity/Directory.Build.props`
- Modify: `unity/.gitignore`

- [ ] **Step 1: Create `unity/Directory.Build.props`**

`Directory.Build.props` is imported at the top of `Sdk.props`, which is the only point early enough for `BaseIntermediateOutputPath` to affect NuGet restore. Setting these inside each `.csproj` would be too late.

```xml
<Project>
  <PropertyGroup>
    <!-- The engine-free .csproj files sit inside Assets/ beside their .asmdef (architecture §2.1).
         Left at MSBuild's defaults they would write obj/ and bin/ there, and Unity would import the
         resulting DLL as a managed plugin, clashing with the assembly the .asmdef compiles from the
         same sources. unity/Build/ is already matched by /[Bb]uild/ in unity/.gitignore. -->
    <BaseIntermediateOutputPath>$(MSBuildThisFileDirectory)Build\obj\$(MSBuildProjectName)\</BaseIntermediateOutputPath>
    <BaseOutputPath>$(MSBuildThisFileDirectory)Build\bin\$(MSBuildProjectName)\</BaseOutputPath>
  </PropertyGroup>
</Project>
```

- [ ] **Step 2: Append the two corrections to `unity/.gitignore`**

The existing patterns `/[Oo]bj/`, `/[Bb]uild/` and `/*.sln` all carry a leading slash, so they match only at the root of `unity/`. Two consequences this step fixes: an `obj/` or `bin/` created inside `Assets/` would be committed, and the hand-written solution would be silently ignored. Append at the end of the file:

```gitignore

# MSBuild output for the hand-written .csproj files. Unanchored, unlike the /[Oo]bj/ above: these
# projects live inside Assets/, and a compiled DLL left there is imported by Unity as a managed
# plugin and clashes with the assembly the .asmdef compiles from the same sources.
# Directory.Build.props already redirects both out to unity/Build/; these are the second line.
[Oo]bj/
[Bb]in/

# ...but the fast gate's solution is hand-written and must stay tracked. /*.sln above would
# otherwise swallow it, exactly as the .csproj comment further up anticipates for project files.
!/TechDuinn.FastGate.sln
```

- [ ] **Step 3: Confirm git will track the solution path once it exists**

Run: `git check-ignore -v unity/TechDuinn.FastGate.sln; echo "exit=$LASTEXITCODE"`
Expected: no rule is printed and `exit=1` — `git check-ignore` exits 1 when the path is **not** ignored, which is the outcome wanted here. If it prints `unity/.gitignore:NN:/*.sln`, the negation is in the wrong place; it must come after the `/*.sln` line.

Note: `git` is not on `PATH` in PowerShell on this machine — run this step through the Bash tool, or prefix with `$env:Path = "C:\Program Files\Git\cmd;$env:Path";`.

### Task 2: Create the `TechDuinn.Table` assembly

- Skill: `unity-programmer`

**Files:**
- Create: `unity/Assets/TechDuinn.Table/TechDuinn.Table.asmdef`
- Create: `unity/Assets/TechDuinn.Table/TechDuinn.Table.csproj`
- Create: `unity/Assets/TechDuinn.Table/csc.rsp`

- [ ] **Step 1: Write the assembly definition**

`noEngineReferences: true` is the structural enforcement of the engine-free boundary — with it set, `UnityEngine.Random` will not compile in this assembly. References are written by **name**, not GUID: GUIDs come from `.meta` files Unity has not generated yet.

`unity/Assets/TechDuinn.Table/TechDuinn.Table.asmdef`:

```json
{
  "name": "TechDuinn.Table",
  "rootNamespace": "TechDuinn.Table",
  "references": [],
  "includePlatforms": [],
  "excludePlatforms": [],
  "allowUnsafeCode": false,
  "overrideReferences": false,
  "precompiledReferences": [],
  "autoReferenced": false,
  "defineConstraints": [],
  "versionDefines": [],
  "noEngineReferences": true
}
```

- [ ] **Step 2: Write the `.csproj` beside it, over the same folder**

The SDK's default glob picks up `**/*.cs` from the project directory, which is what makes this the same source folder as the `.asmdef`. No `<Compile Include>` is needed and none should be added.

`unity/Assets/TechDuinn.Table/TechDuinn.Table.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <!-- ProjectSettings.asset has apiCompatibilityLevel: 6 — Unity's .NET Standard 2.1 level. -->
    <TargetFramework>netstandard2.1</TargetFramework>
    <AssemblyName>TechDuinn.Table</AssemblyName>
    <RootNamespace>TechDuinn.Table</RootNamespace>
    <Nullable>enable</Nullable>
    <!-- Unity 6's Mono compiler is C# 9. Pinned so dotnet test can never go green on syntax the
         editor will reject — the dual .asmdef/.csproj setup's one real failure mode. -->
    <LangVersion>9.0</LangVersion>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <GenerateAssemblyInfo>true</GenerateAssemblyInfo>
  </PropertyGroup>
</Project>
```

- [ ] **Step 3: Write the `csc.rsp` that turns nullable on in the Unity half**

An `.asmdef` has no nullable field, so `<Nullable>enable</Nullable>` in the `.csproj` alone would satisfy the nullable requirement for `dotnet test` and silently miss it for the editor. `csc.rsp` is Unity's per-assembly compiler-option mechanism.

`unity/Assets/TechDuinn.Table/csc.rsp`, one line, with a trailing newline:

```
-nullable:enable
```

### Task 3: Create the `TechDuinn.Presentation` assembly

- Skill: `unity-programmer`

**Files:**
- Create: `unity/Assets/TechDuinn.Presentation/TechDuinn.Presentation.asmdef`
- Create: `unity/Assets/TechDuinn.Presentation/TechDuinn.Presentation.csproj`
- Create: `unity/Assets/TechDuinn.Presentation/csc.rsp`

- [ ] **Step 1: Write the assembly definition, with the one-way reference on `Table`**

`unity/Assets/TechDuinn.Presentation/TechDuinn.Presentation.asmdef`:

```json
{
  "name": "TechDuinn.Presentation",
  "rootNamespace": "TechDuinn.Presentation",
  "references": [
    "TechDuinn.Table"
  ],
  "includePlatforms": [],
  "excludePlatforms": [],
  "allowUnsafeCode": false,
  "overrideReferences": false,
  "precompiledReferences": [],
  "autoReferenced": false,
  "defineConstraints": [],
  "versionDefines": [],
  "noEngineReferences": true
}
```

- [ ] **Step 2: Write the `.csproj`, with the matching project reference**

`unity/Assets/TechDuinn.Presentation/TechDuinn.Presentation.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.1</TargetFramework>
    <AssemblyName>TechDuinn.Presentation</AssemblyName>
    <RootNamespace>TechDuinn.Presentation</RootNamespace>
    <Nullable>enable</Nullable>
    <LangVersion>9.0</LangVersion>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <GenerateAssemblyInfo>true</GenerateAssemblyInfo>
  </PropertyGroup>
  <ItemGroup>
    <!-- The .csproj mirror of the .asmdef's "references": ["TechDuinn.Table"]. One direction only. -->
    <ProjectReference Include="..\TechDuinn.Table\TechDuinn.Table.csproj" />
  </ItemGroup>
</Project>
```

- [ ] **Step 3: Write the `csc.rsp`**

`unity/Assets/TechDuinn.Presentation/csc.rsp`, one line, with a trailing newline:

```
-nullable:enable
```

### Task 4: Create the `TechDuinn.Game` assembly

- Skill: `unity-programmer`

`TechDuinn.Game` gets **no** `csc.rsp` and **no** `.csproj`. The missing `csc.rsp` is what leaves nullable disabled there, which is the requirement, not an omission — a `[SerializeField]` the Inspector never filled is null while the compiler believes it cannot be. The missing `.csproj` is because this assembly references UnityEngine and so cannot build outside the editor.

**Files:**
- Create: `unity/Assets/TechDuinn.Game/TechDuinn.Game.asmdef`
- Create: `unity/Assets/TechDuinn.Game/GameAssembly.cs`

- [ ] **Step 1: Write the assembly definition**

`unity/Assets/TechDuinn.Game/TechDuinn.Game.asmdef`:

```json
{
  "name": "TechDuinn.Game",
  "rootNamespace": "TechDuinn.Game",
  "references": [
    "TechDuinn.Table",
    "TechDuinn.Presentation"
  ],
  "includePlatforms": [],
  "excludePlatforms": [],
  "allowUnsafeCode": false,
  "overrideReferences": false,
  "precompiledReferences": [],
  "autoReferenced": true,
  "defineConstraints": [],
  "versionDefines": [],
  "noEngineReferences": false
}
```

- [ ] **Step 2: Write the placeholder type**

Deliberately not a `MonoBehaviour`, and deliberately carrying no magic methods — an empty `Update` or `Start` costs a crossing into managed code every frame, per component. A `const`, not a `static readonly` field, so there is no static state to go sticky under Fast Enter Play Mode.

`unity/Assets/TechDuinn.Game/GameAssembly.cs`:

```csharp
namespace TechDuinn.Game
{
    /// <summary>
    /// Placeholder so the assembly compiles and Unity does not warn on a script-less .asmdef.
    /// TechDuinn.Game holds MonoBehaviours, prefabs, input, animation, audio, scene wiring and the
    /// composition root (architecture §2); none of that exists yet and DLR-176 does not add it.
    /// The first real TechDuinn.Game ticket deletes this file.
    /// </summary>
    internal static class GameAssembly
    {
        internal const string Purpose = "Scene wiring and MonoBehaviours. Nothing built yet.";
    }
}
```

### Task 5: Create the fast gate's solution and confirm both engine-free projects build

- Skill: `unity-programmer`

**Files:**
- Create: `unity/TechDuinn.FastGate.sln`

- [ ] **Step 1: Create the solution and add the two source projects**

`dotnet new sln` names the solution after its output folder unless told otherwise, which would produce `unity.sln`; `--name` is what makes it `TechDuinn.FastGate.sln`.

Run:
```
dotnet new sln --name TechDuinn.FastGate --output unity
dotnet sln "unity\TechDuinn.FastGate.sln" add "unity\Assets\TechDuinn.Table\TechDuinn.Table.csproj"
dotnet sln "unity\TechDuinn.FastGate.sln" add "unity\Assets\TechDuinn.Presentation\TechDuinn.Presentation.csproj"
```
Expected: all three exit 0; the second and third print `Project ... added to the solution.`

- [ ] **Step 2: Build the solution**

Run: `dotnet build "unity\TechDuinn.FastGate.sln"`
Expected: exits 0, `Build succeeded`, `0 Warning(s)`, `0 Error(s)`. Two assemblies are produced. `TechDuinn.Table` compiles to a nearly-empty assembly at this point, which is correct — its only source file arrives in Phase 2.

- [ ] **Step 3: Confirm no build output landed inside `Assets/`**

This is the check that `Directory.Build.props` actually took effect. A `bin/` or `obj/` under `Assets/` means Unity will import a DLL as a managed plugin and end up with two copies of every type in the assembly.

Run: `Get-ChildItem unity\Assets -Recurse -Directory -Include obj,bin | Select-Object -ExpandProperty FullName`
Expected: no output at all.

Run: `Get-ChildItem unity\Build -Recurse -Filter TechDuinn.Table.dll | Select-Object -ExpandProperty FullName`
Expected: at least one path printed, confirming the output went where it was redirected.

---

## Phase 2 — The seeded PRNG, pinned to the prototype

The one piece of real logic in the ticket. The generator is ported bit-for-bit from `prototype/src/hunt/seededRng.ts`, then pinned by golden values that are **generated from the prototype under Node and not from the port** — freezing values the C# produced itself would prove only that it agrees with itself. The boundary is safe because it ends with the whole solution building and `dotnet test` passing over a single test project; the vector-generation step is read-only against `prototype/` and writes only to the scratchpad.

### Task 6: Generate the golden vectors from the prototype

- Skill: `none — read-only extraction from the prototype to produce test data; no source file is written`

This task produces numbers, not code. Its output is pasted into Task 8's test file.

**Files:**
- Create: `C:\Users\jossd\AppData\Local\Temp\claude\E--Game-Dev-StringsAndStations\3ce88c2e-8e09-4ec7-807a-7eff60428d34\scratchpad\goldenVectors.mjs` — scratchpad only, not part of the repository

- [ ] **Step 1: Read the prototype's generator and copy its arithmetic verbatim**

Read `prototype/src/hunt/seededRng.ts`. The two bodies needed are `createSeededRng` (the four statements inside the returned closure) and `mixSeed` (the loop body). **Copy them character for character.** Do not retype the arithmetic and do not simplify it — if the copy drifts, the golden vectors will be self-consistent and wrong, and the port will be pinned to a generator the prototype does not have. This is the most fragile step in the ticket.

The one deliberate change: the prototype's closure ends `return ((t ^ (t >>> 14)) >>> 0) / 4294967296`. Drop the `/ 4294967296` and return the raw `uint32`. That division is the float the C# port does not have (architecture §20.2).

Write to the scratchpad path above:

```js
// Golden-vector generator for DLR-176. The two function bodies below are copied verbatim from
// prototype/src/hunt/seededRng.ts, with one deliberate change: createSeededRng's trailing
// `/ 4294967296` is dropped so the raw uint32 is returned. The C# port has no float (§20.2).
function createSeededRngRaw(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return (t ^ (t >>> 14)) >>> 0
  }
}

function mixSeed(...parts) {
  let hash = 0x811c9dc5
  for (const part of parts) {
    hash = Math.imul(hash ^ (part | 0), 0x01000193) >>> 0
    hash = (hash ^ (hash >>> 13)) >>> 0
  }
  return hash >>> 0
}

for (const seed of [0, 1, 12345]) {
  const rng = createSeededRngRaw(seed)
  console.log(`SEED ${seed}: ` + Array.from({ length: 8 }, rng).join(', '))
}
console.log('MIX_1_2_3: ' + mixSeed(1, 2, 3))
console.log('MIX_3_2_1: ' + mixSeed(3, 2, 1))
console.log('DEAL_1234_2_3: ' + mixSeed(1234, 2, 3))

// NextBelow parity. The prototype's bounded draw is Math.floor(rng() * n), whose integer identity
// is (raw * n) >> 32 — which is what the C# port computes. These prove the two agree.
const bounded = createSeededRngRaw(12345)
console.log(
  'BELOW_52 (seed 12345): ' +
    Array.from({ length: 8 }, () => {
      const raw = bounded()
      return Number((BigInt(raw) * 52n) >> 32n)
    }).join(', '),
)
```

- [ ] **Step 2: Run it and record the output**

Run: `node "C:\Users\jossd\AppData\Local\Temp\claude\E--Game-Dev-StringsAndStations\3ce88c2e-8e09-4ec7-807a-7eff60428d34\scratchpad\goldenVectors.mjs"`
Expected: exits 0 and prints seven labelled lines — `SEED 0:`, `SEED 1:`, `SEED 12345:`, `MIX_1_2_3:`, `MIX_3_2_1:`, `DEAL_1234_2_3:`, `BELOW_52 (seed 12345):`. Every number is a non-negative integer below 2³² (the `BELOW_52` line, below 52). Keep the exact output — Task 8 pastes these literals into the test file, and the numbers are not known before this step runs.

- [ ] **Step 3: Sanity-check the output before trusting it**

`MIX_1_2_3` and `MIX_3_2_1` must differ — `mixSeed` is order-sensitive, and equal values would mean the loop body was copied wrong. The three `SEED` lines must all differ from each other. If any of those hold equal, re-read `prototype/src/hunt/seededRng.ts` and fix the copy before going on.

### Task 7: Write `SeededRng` and `Seeds` in `TechDuinn.Table`

- Skill: `unity-programmer`

**Files:**
- Create: `unity/Assets/TechDuinn.Table/SeededRng.cs`

- [ ] **Step 1: Write the generator**

Block namespace, not file-scoped — file-scoped namespaces are C# 10 and this assembly is pinned to C# 9. A `readonly struct` rather than the `readonly record struct` architecture §10 names, for the same reason. `Next` returns its successor rather than mutating, which is what makes §10's "seeds are values in state, never fields on a service" structurally true and leaves nothing static to go sticky under Fast Enter Play Mode.

```csharp
using System;

namespace TechDuinn.Table
{
    /// <summary>
    /// The only randomness source a rules assembly may reach for. mulberry32, ported bit-for-bit
    /// from prototype/src/hunt/seededRng.ts so a seed replays identically in both implementations
    /// and a later seed-for-seed comparison against the oracle stays possible (architecture §20.1).
    ///
    /// UnityEngine.Random is structurally unreachable here — TechDuinn.Table sets
    /// noEngineReferences. System.Random is banned by architecture §10 because its sequence is not
    /// contractually stable across .NET versions, and the Mono-to-CoreCLR cutover is exactly the
    /// event that would change it and invalidate every recorded seed.
    ///
    /// A readonly struct rather than the readonly record struct §10 asks for: record structs are
    /// C# 10 and Unity 6's Mono compiler is C# 9. Convert after the 6.8 CoreCLR cutover.
    /// </summary>
    public readonly struct SeededRng : IEquatable<SeededRng>
    {
        /// <summary>The generator's whole state. A value, never a field on a service (§10).</summary>
        public uint State { get; }

        private SeededRng(uint state)
        {
            State = state;
        }

        /// <summary>A generator positioned at <paramref name="seed"/>.</summary>
        public static SeededRng FromSeed(uint seed) => new SeededRng(seed);

        /// <summary>
        /// The next raw 32-bit output, and the generator that follows this one. No float is ever
        /// produced: the prototype's trailing division by 2^32 is deliberately not ported (§20.2).
        /// Allocation-free — five integer operations on a stack value, safe in a per-frame path.
        /// </summary>
        public SeededRng Next(out uint value)
        {
            unchecked
            {
                uint state = State + 0x6d2b79f5u;
                uint t = state;
                t = (t ^ (t >> 15)) * (t | 1u);
                t ^= t + (t ^ (t >> 7)) * (t | 61u);
                value = t ^ (t >> 14);
                return new SeededRng(state);
            }
        }

        /// <summary>
        /// A value in [0, <paramref name="exclusiveBound"/>), and the generator that follows.
        /// Computed as (ulong)raw * bound >> 32 — the integer identity of the prototype's
        /// Math.floor(rng() * n), so the two implementations agree exactly. Modulo would be a
        /// different sequence and would quietly cost the oracle comparison. The shift truncates
        /// toward zero, which is the rounding direction §20.2 requires stating at every division.
        /// </summary>
        /// <exception cref="ArgumentOutOfRangeException">
        /// When <paramref name="exclusiveBound"/> is not positive. A bound of zero would otherwise
        /// yield 0 and look plausible forever.
        /// </exception>
        public SeededRng NextBelow(int exclusiveBound, out int value)
        {
            if (exclusiveBound <= 0)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(exclusiveBound),
                    exclusiveBound,
                    "A bounded draw needs a positive upper bound.");
            }

            SeededRng next = Next(out uint raw);
            value = (int)(((ulong)raw * (ulong)exclusiveBound) >> 32);
            return next;
        }

        public bool Equals(SeededRng other) => State == other.State;

        public override bool Equals(object? obj) => obj is SeededRng other && Equals(other);

        public override int GetHashCode() => State.GetHashCode();

        public static bool operator ==(SeededRng left, SeededRng right) => left.Equals(right);

        public static bool operator !=(SeededRng left, SeededRng right) => !left.Equals(right);
    }

    /// <summary>Seed composition, ported from the same prototype module.</summary>
    public static class Seeds
    {
        /// <summary>
        /// Fold integers into one 32-bit seed, order-sensitive. FNV-1a with a shift-xor finaliser,
        /// matching the prototype's mixSeed exactly. The params array allocates per call, which is
        /// deliberate and fine: seed composition happens once per hand, never per frame.
        /// </summary>
        public static uint MixSeed(params int[] parts)
        {
            if (parts == null)
            {
                throw new ArgumentNullException(nameof(parts));
            }

            unchecked
            {
                uint hash = 0x811c9dc5u;
                foreach (int part in parts)
                {
                    hash = (hash ^ (uint)part) * 0x01000193u;
                    hash ^= hash >> 13;
                }

                return hash;
            }
        }

        /// <summary>
        /// The seed for one hand's deal, and for the reshuffle that happens under the same
        /// generator. Unique per hand of a run: the encounter index separates the fights and the
        /// hand index separates the hands within one.
        /// </summary>
        public static uint DealSeedFor(uint runSeed, int encounterIndex, int handOfFight) =>
            MixSeed(unchecked((int)runSeed), encounterIndex, handOfFight);
    }
}
```

- [ ] **Step 2: Build, and measure the file**

Run: `dotnet build "unity\TechDuinn.FastGate.sln"`
Expected: exits 0, `0 Warning(s)`, `0 Error(s)`. `TreatWarningsAsErrors` is on, so any nullable warning fails here.

Run: `(Get-Content unity\Assets\TechDuinn.Table\SeededRng.cs).Count`
Expected: a number well under 400. Use `.Count` on the raw content, not `Measure-Object -Line`, which drops blank lines and undercounts.

### Task 8: Test the generator against the prototype's golden vectors

- Skill: `unity-programmer`

**Files:**
- Create: `unity/Tests/TechDuinn.Table.Tests/TechDuinn.Table.Tests.csproj`
- Test: `unity/Tests/TechDuinn.Table.Tests/SeededRngTests.cs`

- [ ] **Step 1: Create the test project**

It lives at `unity/Tests/`, outside `Assets/`, so Unity never tries to import NUnit and the test adapter and collide with its own bundled `com.unity.test-framework`. The `None` items copy the three `.asmdef` files into the output so Task 10's boundary test can read what the editor reads. The `TechDuinn.Presentation` project reference is there so that same test can reflect over the forward edge.

`unity/Tests/TechDuinn.Table.Tests/TechDuinn.Table.Tests.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.11.1" />
    <PackageReference Include="NUnit" Version="4.2.2" />
    <PackageReference Include="NUnit3TestAdapter" Version="4.6.0" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\..\Assets\TechDuinn.Table\TechDuinn.Table.csproj" />
    <ProjectReference Include="..\..\Assets\TechDuinn.Presentation\TechDuinn.Presentation.csproj" />
  </ItemGroup>
  <ItemGroup>
    <!-- Copied so the boundary test can assert on what the editor will read. -->
    <None Include="..\..\Assets\TechDuinn.Table\TechDuinn.Table.asmdef" LinkBase="Asmdefs" CopyToOutputDirectory="PreserveNewest" />
    <None Include="..\..\Assets\TechDuinn.Presentation\TechDuinn.Presentation.asmdef" LinkBase="Asmdefs" CopyToOutputDirectory="PreserveNewest" />
    <None Include="..\..\Assets\TechDuinn.Game\TechDuinn.Game.asmdef" LinkBase="Asmdefs" CopyToOutputDirectory="PreserveNewest" />
  </ItemGroup>
</Project>
```

- [ ] **Step 2: Add the test project to the solution**

Run: `dotnet sln "unity\TechDuinn.FastGate.sln" add "unity\Tests\TechDuinn.Table.Tests\TechDuinn.Table.Tests.csproj"`
Expected: exits 0, prints `Project ... added to the solution.`

- [ ] **Step 3: Write the tests, pasting Task 6's real output as the golden literals**

Every `TODO` marker below must be replaced with the actual numbers Task 6 printed. **Do not invent them and do not compute them from the C# — the whole point is that they come from a different process, a different runtime and a different language.** The eight-value arrays come from the `SEED n:` lines, the three single values from `MIX_1_2_3`, `MIX_3_2_1` and `DEAL_1234_2_3`, and the bounded array from `BELOW_52 (seed 12345):`.

`unity/Tests/TechDuinn.Table.Tests/SeededRngTests.cs`:

```csharp
using System;
using NUnit.Framework;
using TechDuinn.Table;

namespace TechDuinn.Table.Tests
{
    /// <summary>
    /// The golden vectors below were produced by running the mulberry32 body copied verbatim out of
    /// prototype/src/hunt/seededRng.ts under Node, and are asserted here from a dotnet test process.
    /// That makes DLR-176's "identical sequence across separate processes" literally true — the
    /// values are generated by one process, one runtime and one language, and verified by another —
    /// and it pins the port to the oracle so a seed-for-seed comparison stays possible. If the
    /// CoreCLR cutover ever changes the arithmetic, this file fails loudly.
    /// </summary>
    public sealed class SeededRngTests
    {
        // Replace with the real output of the Task 6 scratchpad script. Eight values per seed.
        private static readonly uint[] GoldenSeed0 = { /* TODO: SEED 0 */ };
        private static readonly uint[] GoldenSeed1 = { /* TODO: SEED 1 */ };
        private static readonly uint[] GoldenSeed12345 = { /* TODO: SEED 12345 */ };
        private static readonly int[] GoldenBelow52Seed12345 = { /* TODO: BELOW_52 */ };
        private const uint GoldenMix123 = 0; // TODO: MIX_1_2_3
        private const uint GoldenMix321 = 0; // TODO: MIX_3_2_1
        private const uint GoldenDeal1234_2_3 = 0; // TODO: DEAL_1234_2_3

        private static uint[] Take(uint seed, int count)
        {
            var taken = new uint[count];
            SeededRng rng = SeededRng.FromSeed(seed);
            for (int i = 0; i < count; i++)
            {
                rng = rng.Next(out taken[i]);
            }

            return taken;
        }

        [TestCase(0u)]
        [TestCase(1u)]
        [TestCase(12345u)]
        public void MatchesThePrototypesRecordedSequence(uint seed)
        {
            uint[] expected = seed switch
            {
                0u => GoldenSeed0,
                1u => GoldenSeed1,
                _ => GoldenSeed12345,
            };

            Assert.That(Take(seed, expected.Length), Is.EqualTo(expected));
        }

        [Test]
        public void BoundedDrawsMatchThePrototypesFlooredMultiply()
        {
            var taken = new int[GoldenBelow52Seed12345.Length];
            SeededRng rng = SeededRng.FromSeed(12345u);
            for (int i = 0; i < taken.Length; i++)
            {
                rng = rng.NextBelow(52, out taken[i]);
            }

            Assert.That(taken, Is.EqualTo(GoldenBelow52Seed12345));
        }

        [Test]
        public void TheSameSeedYieldsTheSameSequence()
        {
            Assert.That(Take(9876u, 32), Is.EqualTo(Take(9876u, 32)));
        }

        [Test]
        public void DifferentSeedsYieldDifferentSequences()
        {
            Assert.That(Take(1u, 32), Is.Not.EqualTo(Take(2u, 32)));
        }

        [Test]
        public void AdvancingOneGeneratorLeavesItsPredecessorUntouched()
        {
            SeededRng first = SeededRng.FromSeed(7u);
            SeededRng second = first.Next(out uint firstValue);

            first.Next(out uint replayed);

            Assert.That(replayed, Is.EqualTo(firstValue));
            Assert.That(second, Is.Not.EqualTo(first));
        }

        [Test]
        public void BoundedDrawsStayInsideTheirBound()
        {
            SeededRng rng = SeededRng.FromSeed(99u);
            for (int i = 0; i < 500; i++)
            {
                rng = rng.NextBelow(52, out int value);
                Assert.That(value, Is.InRange(0, 51));
            }
        }

        [TestCase(0)]
        [TestCase(-1)]
        [TestCase(int.MinValue)]
        public void ABoundThatIsNotPositiveThrowsRatherThanReturningAPlausibleZero(int bound)
        {
            SeededRng rng = SeededRng.FromSeed(1u);

            Assert.Throws<ArgumentOutOfRangeException>(() => rng.NextBelow(bound, out _));
        }

        [Test]
        public void MixSeedMatchesThePrototypeAndIsOrderSensitive()
        {
            Assert.That(Seeds.MixSeed(1, 2, 3), Is.EqualTo(GoldenMix123));
            Assert.That(Seeds.MixSeed(3, 2, 1), Is.EqualTo(GoldenMix321));
            Assert.That(GoldenMix123, Is.Not.EqualTo(GoldenMix321));
        }

        [Test]
        public void DealSeedForMatchesThePrototype()
        {
            Assert.That(Seeds.DealSeedFor(1234u, 2, 3), Is.EqualTo(GoldenDeal1234_2_3));
        }

        [Test]
        public void DealSeedForSeparatesHandsFightsAndRuns()
        {
            uint baseline = Seeds.DealSeedFor(1234u, 2, 3);

            Assert.That(Seeds.DealSeedFor(1234u, 2, 4), Is.Not.EqualTo(baseline));
            Assert.That(Seeds.DealSeedFor(1234u, 3, 3), Is.Not.EqualTo(baseline));
            Assert.That(Seeds.DealSeedFor(1235u, 2, 3), Is.Not.EqualTo(baseline));
        }
    }
}
```

- [ ] **Step 4: Run the test project**

Run: `dotnet test "unity\Tests\TechDuinn.Table.Tests\TechDuinn.Table.Tests.csproj"`
Expected: exits 0; the summary line reports `Failed: 0` and a non-zero `Passed` count. If the golden-vector tests fail, the port and the prototype disagree — **fix the port, never the golden values**, unless Task 6's copy is provably wrong.

- [ ] **Step 5: Confirm no `TODO` marker survived**

Run: `Select-String -Path unity\Tests\TechDuinn.Table.Tests\SeededRngTests.cs -Pattern "TODO"`
Expected: no output. A surviving marker means a golden array was left empty and its test passed vacuously.

---

## Phase 3 — The one-way reference, proved

`TechDuinn.Presentation` gets one real function so its reference on `TechDuinn.Table` is load-bearing rather than decorative, and the boundary that makes the whole architecture worth having gets asserted rather than assumed. The boundary is safe because it ends with the full solution building and both test projects passing.

### Task 9: Write `SeedDisplay` in `TechDuinn.Presentation` and test it

- Skill: `unity-programmer`

**Files:**
- Create: `unity/Assets/TechDuinn.Presentation/SeedDisplay.cs`
- Create: `unity/Tests/TechDuinn.Presentation.Tests/TechDuinn.Presentation.Tests.csproj`
- Test: `unity/Tests/TechDuinn.Presentation.Tests/SeedDisplayTests.cs`

- [ ] **Step 1: Write the view model**

Architecture §2 describes `TechDuinn.Presentation` as "pure functions from rules state to what a screen shows". This is the smallest honest example of one, and it takes a `TechDuinn.Table` type as its parameter so the reference edge carries real weight.

`unity/Assets/TechDuinn.Presentation/SeedDisplay.cs`:

```csharp
using TechDuinn.Table;

namespace TechDuinn.Presentation
{
    /// <summary>
    /// A view model over the rules' generator. Exists so TechDuinn.Presentation holds real work
    /// rather than a marker type, and so its one-way reference on TechDuinn.Table is load-bearing.
    /// </summary>
    public static class SeedDisplay
    {
        /// <summary>
        /// The eight-character uppercase hex code a debug overlay shows for a generator's position.
        /// Pure. Allocates the returned string, so it belongs on a debug overlay rather than in a
        /// per-frame path.
        /// </summary>
        public static string ShortCode(SeededRng rng) => rng.State.ToString("X8");
    }
}
```

- [ ] **Step 2: Create the second test project and add it to the solution**

`unity/Tests/TechDuinn.Presentation.Tests/TechDuinn.Presentation.Tests.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.11.1" />
    <PackageReference Include="NUnit" Version="4.2.2" />
    <PackageReference Include="NUnit3TestAdapter" Version="4.6.0" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\..\Assets\TechDuinn.Presentation\TechDuinn.Presentation.csproj" />
  </ItemGroup>
</Project>
```

Run: `dotnet sln "unity\TechDuinn.FastGate.sln" add "unity\Tests\TechDuinn.Presentation.Tests\TechDuinn.Presentation.Tests.csproj"`
Expected: exits 0, prints `Project ... added to the solution.`

- [ ] **Step 3: Write the tests**

`unity/Tests/TechDuinn.Presentation.Tests/SeedDisplayTests.cs`:

```csharp
using NUnit.Framework;
using TechDuinn.Presentation;
using TechDuinn.Table;

namespace TechDuinn.Presentation.Tests
{
    public sealed class SeedDisplayTests
    {
        [Test]
        public void RendersEightUppercaseHexCharacters()
        {
            string code = SeedDisplay.ShortCode(SeededRng.FromSeed(0xdeadbeefu));

            Assert.That(code, Is.EqualTo("DEADBEEF"));
        }

        [Test]
        public void PadsASmallSeedToEightCharacters()
        {
            Assert.That(SeedDisplay.ShortCode(SeededRng.FromSeed(1u)), Is.EqualTo("00000001"));
        }

        [Test]
        public void TracksTheGeneratorAsItAdvances()
        {
            SeededRng first = SeededRng.FromSeed(12345u);
            SeededRng second = first.Next(out _);

            Assert.That(SeedDisplay.ShortCode(second), Is.Not.EqualTo(SeedDisplay.ShortCode(first)));
        }
    }
}
```

- [ ] **Step 4: Run the new test project**

Run: `dotnet test "unity\Tests\TechDuinn.Presentation.Tests\TechDuinn.Presentation.Tests.csproj"`
Expected: exits 0; `Failed: 0`, `Passed: 3`.

### Task 10: Prove the reference edge runs one way only

- Skill: `unity-programmer`

**Files:**
- Test: `unity/Tests/TechDuinn.Table.Tests/AssemblyBoundaryTests.cs`

- [ ] **Step 1: Write the boundary test**

Two independent proofs. Reflection over the built assemblies reads what the compiler actually emitted, which is the strong one; parsing the `.asmdef` files catches someone adding a reference through the editor's inspector later. The `.asmdef` assertions deliberately avoid the literal reference *names* — Unity may rewrite name references to GUIDs when it saves the file, but an empty `references` array and the `noEngineReferences` flag both survive that rewrite.

`unity/Tests/TechDuinn.Table.Tests/AssemblyBoundaryTests.cs`:

```csharp
using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using NUnit.Framework;
using TechDuinn.Presentation;
using TechDuinn.Table;

namespace TechDuinn.Table.Tests
{
    /// <summary>
    /// DLR-176 acceptance criterion 4: TechDuinn.Presentation may reference TechDuinn.Table, and the
    /// reverse must be impossible. Architecture §2 makes this the load-bearing rule of the whole
    /// layout — it is what stops a MonoBehaviour ending up inside a rule.
    /// </summary>
    public sealed class AssemblyBoundaryTests
    {
        private static string[] ReferencedAssemblyNames(Assembly assembly) =>
            assembly.GetReferencedAssemblies()
                .Select(reference => reference.Name ?? string.Empty)
                .ToArray();

        private static JsonElement ReadAsmdef(string name)
        {
            string path = Path.Combine(AppContext.BaseDirectory, "Asmdefs", name);
            Assert.That(File.Exists(path), Is.True, $"{name} was not copied to the test output.");

            using JsonDocument document = JsonDocument.Parse(File.ReadAllText(path));
            return document.RootElement.Clone();
        }

        [Test]
        public void TableReferencesNothingFromTheEngine()
        {
            string[] references = ReferencedAssemblyNames(typeof(SeededRng).Assembly);

            Assert.That(
                references.Any(name => name.StartsWith("UnityEngine", StringComparison.Ordinal)),
                Is.False,
                "TechDuinn.Table must compile with no UnityEngine reference at all.");
        }

        [Test]
        public void TableDoesNotReferencePresentation()
        {
            string[] references = ReferencedAssemblyNames(typeof(SeededRng).Assembly);

            Assert.That(references, Has.No.Member("TechDuinn.Presentation"));
        }

        [Test]
        public void PresentationDoesReferenceTable()
        {
            string[] references = ReferencedAssemblyNames(typeof(SeedDisplay).Assembly);

            Assert.That(references, Has.Member("TechDuinn.Table"));
        }

        [Test]
        public void PresentationReferencesNothingFromTheEngineEither()
        {
            string[] references = ReferencedAssemblyNames(typeof(SeedDisplay).Assembly);

            Assert.That(
                references.Any(name => name.StartsWith("UnityEngine", StringComparison.Ordinal)),
                Is.False);
        }

        [Test]
        public void TablesAssemblyDefinitionDeclaresNoReferencesAndNoEngine()
        {
            JsonElement asmdef = ReadAsmdef("TechDuinn.Table.asmdef");

            Assert.That(asmdef.GetProperty("references").GetArrayLength(), Is.Zero);
            Assert.That(asmdef.GetProperty("noEngineReferences").GetBoolean(), Is.True);
        }

        [Test]
        public void PresentationsAssemblyDefinitionDeclaresAReferenceAndNoEngine()
        {
            JsonElement asmdef = ReadAsmdef("TechDuinn.Presentation.asmdef");

            Assert.That(asmdef.GetProperty("references").GetArrayLength(), Is.GreaterThan(0));
            Assert.That(asmdef.GetProperty("noEngineReferences").GetBoolean(), Is.True);
        }

        [Test]
        public void GamesAssemblyDefinitionIsTheOneThatKeepsTheEngine()
        {
            JsonElement asmdef = ReadAsmdef("TechDuinn.Game.asmdef");

            Assert.That(asmdef.GetProperty("noEngineReferences").GetBoolean(), Is.False);
        }
    }
}
```

- [ ] **Step 2: Run both test projects together**

Run: `dotnet test "unity\TechDuinn.FastGate.sln"`
Expected: exits 0; `Failed: 0` across both test projects.

---

## Phase 4 — Run the gate for real, and correct the documents it falsifies

The first three phases made the fast gate possible; this one runs it, records what it actually printed, and fixes the three documents that still say it cannot exist. The boundary is safe because the code is finished and unchanged from here — every task below either runs a command or edits prose.

### Task 11: Run the fast gate and record its real output on DLR-176

- Skill: `management-jira`

**Files:**
- (no repository file changes — this task runs a command and comments on a Jira issue)

- [ ] **Step 1: Run the fast gate from the repository root, clean**

Run:
```
dotnet build "unity\TechDuinn.FastGate.sln" --no-incremental
dotnet test "unity\TechDuinn.FastGate.sln"
```
Expected: both exit 0. The build reports `0 Warning(s)`, `0 Error(s)`; the test run reports `Failed: 0` with a non-zero `Passed` count across two test projects. **Capture the verbatim output of both commands** — acceptance criterion 6 requires the real output, not a paraphrase of it.

If either command fails, stop. The brief is explicit: say so plainly rather than falling back to editor-mode tests and reporting a pass.

- [ ] **Step 2: Comment the command and its real output on DLR-176**

Invoke the `management-jira` skill and add a comment to `DLR-176` containing the exact command line used as the fast gate (`dotnet test "unity\TechDuinn.FastGate.sln"`, run from the repository root) and the verbatim summary lines from Step 1 — the `Build succeeded` / warning / error counts, and the `Passed` / `Failed` / `Skipped` / duration line from the test run. Note in the comment that the .NET 8 SDK is a prerequisite and give the version `dotnet --list-sdks` reported.

Do not transition the issue here — `/fb-apply` owns the status move.

### Task 12: Correct `.claude/workflow/unity-project.md` against the project that now exists

- Skill: `none — documentation; this file is its own owner per CLAUDE.md's single-source-of-truth table`

**Files:**
- Modify: `.claude/workflow/unity-project.md`

- [ ] **Step 1: Replace the forward-looking header**

Delete the opening paragraph beginning *"**This file is forward-looking.** No Unity project exists on disk yet"* in its entirety, including the sentence instructing the first scaffolding ticket to correct this file — that instruction has now been carried out and leaving it invites a second correction. Replace it with a paragraph stating: the Unity project exists at `unity/`, on editor version 6000.5.1f1 with URP 2D and the Input System; three of the seven assemblies exist as of DLR-176; and the fast gate below has been run and its output recorded on DLR-176. Name the .NET 8 SDK as a prerequisite for the fast gate, since it is not part of a Unity install.

- [ ] **Step 2: Correct the Layout section — both the paths and which assemblies exist**

The current tree draws the assemblies as `unity/TechDuinn.Table/`, which cannot work: Unity only compiles code under `Assets/` or inside a package, so an `.asmdef` outside `Assets/` is never seen by the editor. Redraw the tree with the real paths and mark what exists:

```
unity/
  Assets/
    TechDuinn.Table/          EXISTS (DLR-176) — engine-free. Today: the seeded PRNG only.
                               Eventually: cards, suits, ranks, the deal, legal moves, trick
                               resolution, the draw pile and its reshuffle, the Shade's card
                               choice, the four outcomes, the pot arithmetic
    TechDuinn.Presentation/   EXISTS (DLR-176) — engine-free — view models: pure functions from
                               rules state to what a screen shows
    TechDuinn.Game/           EXISTS (DLR-176) — references UnityEngine — MonoBehaviours, prefabs,
                               input, animation, audio, scene wiring, the composition root
  Tests/
    TechDuinn.Table.Tests/          the fast gate's test projects. Outside Assets/ deliberately, so
    TechDuinn.Presentation.Tests/   Unity never imports NUnit and collides with its own bundled
                                    com.unity.test-framework
  Directory.Build.props       redirects MSBuild obj/ and bin/ out of Assets/ into unity/Build/
  TechDuinn.FastGate.sln      the solution the fast gate takes as its single argument

Deferred — created by the epic that first needs each, not before:
  TechDuinn.Passage/          engine-free — the run: charms, the Cairn's grants, the shop, Dagda's
                               Cauldron, health, coins, the opponent ladder, the fight boundary
  TechDuinn.Data/             references UnityEngine — ScriptableObject definitions
  TechDuinn.Persistence/      references UnityEngine — the save envelope, the key composer
  TechDuinn.Simulation/       engine-free — the headless run simulator and its policies
```

- [ ] **Step 2b: Record the three mechanisms the dual setup actually needs**

The existing §2.1 paragraph describes the dual `.asmdef` + `.csproj` design but not what it takes to make it work. Add, immediately after it, the three facts DLR-176 established, since each is a trap the next assembly will hit:

- Nullable is turned on in the Unity half by a `csc.rsp` file beside the `.asmdef` containing `-nullable:enable`. An `.asmdef` has no nullable field, so `<Nullable>enable</Nullable>` in the `.csproj` alone satisfies `dotnet test` and silently misses the editor.
- `LangVersion` is pinned to `9.0` in every engine-free `.csproj`. Unity 6's Mono compiler is C# 9; without the pin, `dotnet test` compiles syntax the editor then rejects. This is why `SeededRng` is a `readonly struct` rather than the `readonly record struct` architecture §10 names.
- `unity/Directory.Build.props` redirects `BaseIntermediateOutputPath` and `BaseOutputPath` to `unity/Build/`. Without it MSBuild writes `bin/` inside `Assets/` and Unity imports the DLL as a managed plugin, clashing with the assembly the `.asmdef` builds from the same sources.

- [ ] **Step 3: Correct the Verification commands section**

Delete the line *"**The whole table below is not yet runnable.** No Unity project exists to run it against."* Replace the fast-gate row's prose description with the command that was really run in Task 11:

```
dotnet test "unity\TechDuinn.FastGate.sln"
```

Run from the repository root. Note that it requires the .NET 8 SDK (`winget install Microsoft.DotNet.SDK.8`) and that it covers only the engine-free assemblies currently in the solution — two of them today, growing as the deferred assemblies land, each of which must add itself with `dotnet sln add`. Leave the other two rows — editor-mode tests and the player build — marked as still unrun, because they are; say so in those terms rather than deleting the caveat wholesale.

- [ ] **Step 4: Add the seeded PRNG to the Correctness traps section**

The existing trap *"No `UnityEngine.Random` or `System.Random` in a rules path"* ends with "Port the prototype's own seeded PRNG instead." That has now happened. Amend it to name `SeededRng` and `Seeds` in `TechDuinn.Table` as the one sanctioned source, note that it is pinned to the prototype by golden vectors generated under Node and asserted under `dotnet test`, and state that `SeededRng.NextBelow` uses multiply-shift rather than modulo specifically so the sequence matches the prototype's `Math.floor(rng() * n)` — a future contributor "tidying" it to modulo would silently break the oracle comparison.

- [ ] **Step 5: Confirm no stale claim survives**

Run: `Select-String -Path .claude\workflow\unity-project.md -Pattern "forward-looking|No Unity project exists|not yet runnable|has been run"`
Expected: no hit for `forward-looking`, `No Unity project exists`, or `not yet runnable`. Hits for `has been run` are expected and correct.

### Task 13: Correct `CLAUDE.md` and `unity/README.md`

- Skill: `none — documentation`

Both restate the claim `unity-project.md` owns, and both become false the moment this ticket lands. Correcting them is what the single-source-of-truth rule asks for.

**Files:**
- Modify: `CLAUDE.md:167`
- Modify: `unity/README.md`

- [ ] **Step 1: Rewrite the Unity paragraph in `CLAUDE.md`**

Replace the paragraph at line 167 that begins *"The project exists on disk (Unity 6000.5.1f1, URP 2D, the input system, one sample scene) but **no gate has ever been run against it**"*. The new paragraph keeps the same job — pointing at `unity-project.md` as the owner and warning that unrun commands are unproven — but tells the truth: the fast gate `dotnet test "unity\TechDuinn.FastGate.sln"` has been run and passes as of DLR-176, it needs the .NET 8 SDK, and the Unity batch-mode test and build commands remain unrun and unproven. Keep the existing instruction to report what a command actually printed rather than what it was supposed to print.

Do not restate the assembly list or the layout here — `unity-project.md` owns those, and duplicating them is what this rule exists to prevent.

- [ ] **Step 2: Rewrite `unity/README.md`**

Replace *"Deliberately empty. The Unity project is scaffolded by its own ticket; nothing here yet."* with a short statement of what is now here: three assembly definitions under `Assets/`, two of them engine-free and carrying a `.csproj` beside their `.asmdef`, plus the test projects under `Tests/` and the fast-gate solution. Point at `.claude/workflow/unity-project.md` for the commands and the current layout, and keep the existing pointers to the architecture document and to `prototype/` as the oracle. Keep it to a handful of lines — it is a signpost, not a second copy of the workflow file.

- [ ] **Step 3: Confirm the stale phrasing is gone repository-wide**

Run: `Select-String -Path CLAUDE.md,unity\README.md,.claude\workflow\unity-project.md -Pattern "no gate has ever been run|Deliberately empty|nothing here yet|No Unity project exists"`
Expected: no output.

---

## Phase 5 — Final verification

No production changes. Only sanity-checks that the cumulative work is clean, that the boundaries the ticket exists to establish actually hold, and that nothing crossed a line the architecture forbids.

### Task 14: Confirm the engine-free boundary and the banned random sources

- Skill: `unity-programmer`

**Files:**
- (no changes — verification only)

- [ ] **Step 1: Grep the two engine-free assemblies for any engine or banned-random reference**

Run: `Select-String -Path unity\Assets\TechDuinn.Table\*.cs,unity\Assets\TechDuinn.Presentation\*.cs -Pattern "UnityEngine|System\.Random|\bnew Random\b|MonoBehaviour|ScriptableObject"`
Expected: no output. `UnityEngine` is already structurally impossible via `noEngineReferences`, but `System.Random` is not — this grep is its only gate.

- [ ] **Step 2: Confirm no floating-point arithmetic reached `TechDuinn.Table`**

Architecture §20.2: integer arithmetic only, because a float that is harmless in one browser is not harmless across a Windows build, a Mac build, and a recorded seed that has to replay on both.

Run: `Select-String -Path unity\Assets\TechDuinn.Table\*.cs -Pattern "\bfloat\b|\bdouble\b|\bdecimal\b|\bMathf\b"`
Expected: no output.

- [ ] **Step 3: Confirm nullable is on where it must be and off where it must not**

Run: `Get-ChildItem unity\Assets -Recurse -Filter csc.rsp | Select-Object -ExpandProperty FullName`
Expected: exactly two paths — one under `TechDuinn.Table`, one under `TechDuinn.Presentation`. A third under `TechDuinn.Game` would be a defect: nullable must stay off there, because a `[SerializeField]` the Inspector never filled is null while the compiler believes it cannot be.

Run: `Select-String -Path unity\Assets\TechDuinn.Table\TechDuinn.Table.csproj,unity\Assets\TechDuinn.Presentation\TechDuinn.Presentation.csproj -Pattern "<Nullable>enable</Nullable>|<LangVersion>9.0</LangVersion>"`
Expected: four hits — both properties in both files.

### Task 15: Confirm the solution and the working tree are consistent

- Skill: `unity-programmer`

**Files:**
- (no changes — verification only)

- [ ] **Step 1: Confirm every project the solution lists exists on disk**

The solution's project paths bind by string and no compiler checks them; a typo produces a project that is silently never built or a solution the gate cannot open.

Run: `dotnet sln "unity\TechDuinn.FastGate.sln" list`
Expected: exactly four project paths — the two engine-free source projects under `Assets\` and the two test projects under `Tests\`.

Run: `dotnet sln "unity\TechDuinn.FastGate.sln" list | Select-String "\.csproj$" | ForEach-Object { $p = Join-Path "unity" $_.ToString().Trim(); if (-not (Test-Path $p)) { "MISSING: $p" } }`
Expected: no output.

- [ ] **Step 2: Confirm the solution and every hand-written project file will actually be committed**

Run through the Bash tool, or prefix with `$env:Path = "C:\Program Files\Git\cmd;$env:Path";` — git is not on `PATH` in PowerShell on this machine:

Run: `git status --porcelain unity | Select-String "TechDuinn.FastGate.sln|Directory.Build.props|\.asmdef|\.csproj|csc\.rsp"`
Expected: an untracked or added entry for the solution, `Directory.Build.props`, all three `.asmdef` files, all four `.csproj` files, and both `csc.rsp` files. A missing solution entry means the `!/TechDuinn.FastGate.sln` negation is not working.

- [ ] **Step 3: Confirm no build output is staged for commit**

Run: `git status --porcelain unity | Select-String "unity/Build/|/obj/|/bin/|\.dll$"`
Expected: no output.

- [ ] **Step 4: Measure every source file created**

Run: `Get-ChildItem unity\Assets,unity\Tests -Recurse -Filter *.cs | ForEach-Object { "$($_.FullName): $((Get-Content $_.FullName).Count)" }`
Expected: every count well under 400. Use `.Count` on the raw content, not `Measure-Object -Line`, which drops blank lines and undercounts.

### Task 16: The fast gate, clean, from a cold build

- Skill: `unity-programmer`

**Files:**
- (no changes — verification only)

- [ ] **Step 1: Restore, build and test from scratch**

Run:
```
dotnet restore "unity\TechDuinn.FastGate.sln"
dotnet build "unity\TechDuinn.FastGate.sln" --no-incremental
dotnet test "unity\TechDuinn.FastGate.sln"
```
Expected: all three exit 0. The build reports `0 Warning(s)`, `0 Error(s)`; the test run reports `Failed: 0` with a non-zero `Passed` count across both test projects. Report the actual numbers printed, not the numbers expected.

- [ ] **Step 2: Confirm the prototype was not touched**

The prototype is read from in Task 6 and must not be edited. Run through the Bash tool, or with the `$env:Path` prefix above:

Run: `git status --porcelain prototype`
Expected: no output.

### Task 17: Update the PR description

- Skill: `none — documentation`

**Files:**
- Create: `.claude/contract/DLR-176-unity-assembly-scaffold-and-seeded-prng/pr-description.md`

- [ ] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- A link to `plan.md` in this folder.
- A summary of the change: three assembly definitions, the dual `.asmdef` + `.csproj` setup and the three mechanisms that make it work, the ported PRNG and how it is pinned to the prototype, and the first real run of the fast gate.
- Every decision the developer must make and every behaviour they must judge: the .NET 8 SDK prerequisite, the three NuGet test packages, `TreatWarningsAsErrors`, and — the one that blocks the ticket being genuinely finished — **opening Unity once, confirming a clean console for the three new assemblies, and committing the generated `.meta` files.**
- Verification results from Phases 2 through 5, with the real numbers from Task 16.
- A one-line note for future contributors on each new convention introduced: `csc.rsp` for per-assembly nullable, `LangVersion 9.0` as the Unity ceiling, `Directory.Build.props` for output redirection, `dotnet sln add` for every new engine-free assembly, and the rule that a golden vector is changed only when the prototype changes.

---

## Self-review

**Spec coverage:**
- Three assembly definitions, `Passage`/`Data`/`Persistence`/`Simulation` not created (AC1) — Tasks 2, 3, 4; the deferred four are recorded in Task 12 Step 2 and appear in no file map.
- Engine-free, each with a `.csproj` beside its `.asmdef` over the same folder (AC2) — Tasks 2, 3; verified Task 14 Step 1 and Task 15 Step 1.
- Nullable on for the two engine-free assemblies, off for `TechDuinn.Game` (AC3) — Task 2 Step 3, Task 3 Step 3, Task 4 (no `csc.rsp`, deliberately); verified Task 14 Step 3.
- `Presentation → Table` only, proved by a test (AC4) — Task 9 gives the edge real weight, Task 10 proves it twice over by reflection and by parsing the `.asmdef` files.
- A seeded PRNG in `Table`, neither `UnityEngine.Random` nor `System.Random`, identical across separate processes, proved (AC5) — Task 7 writes it, Task 6 generates the vectors from the prototype under Node, Task 8 asserts them from a `dotnet test` process; the ban is verified by grep in Task 14 Step 1 and structurally by `noEngineReferences`.
- `dotnet test` runs from a documented command and passes, with the PRNG's tests in it; command and real output recorded on the ticket (AC6) — Task 11 runs and records it, Task 16 re-runs it cold, Task 12 Step 3 documents it.
- `.claude/workflow/unity-project.md` corrected — framing gone, assemblies match reality plus a deferred note, fast-gate command is the one really run (AC7) — Task 12, verified Step 5.
- In-scope items beyond the ACs: output redirection and `.gitignore` (Task 1), the solution (Task 5), `CLAUDE.md` and `unity/README.md` (Task 13).

**Placeholder scan:** No `TBD`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with `Run:` / `Expected:`. The one deliberate `TODO` marker lives inside Task 8's test skeleton, where the golden literals cannot be known before Task 6 runs; Task 8 Step 5 greps to prove none survived.

**Type / name consistency:** `SeededRng`, `SeededRng.State`, `FromSeed`, `Next(out uint)`, `NextBelow(int, out int)`, `Seeds.MixSeed`, `Seeds.DealSeedFor`, `SeedDisplay.ShortCode`, `GameAssembly.Purpose` are used identically in Tasks 7, 8, 9, 10 and match `plan.md` Part 2 → Data shapes. The assembly names `TechDuinn.Table`, `TechDuinn.Presentation`, `TechDuinn.Game` are identical across the `.asmdef` `name` field, the `.csproj` `AssemblyName` and `RootNamespace`, the folder names, the declared namespaces, the `ProjectReference` paths and the `dotnet sln add` arguments. `unity/TechDuinn.FastGate.sln` is spelled identically in Task 1's `.gitignore` negation, Task 5's `--name`, every `dotnet` invocation, and Task 12's documentation.

**Phase boundary cleanliness:**
- **Phase 1** ends with `dotnet build` green over two source projects that compile to near-empty assemblies, no test project referencing anything absent, and build output verified to be outside `Assets/`. `TechDuinn.Presentation` and `TechDuinn.Table` have no `.cs` files yet, which is a Unity warning, not an error, and no compile failure.
- **Phase 2** ends with the solution building and `TechDuinn.Table.Tests` passing; the golden literals are in place and grepped for surviving markers, and the scratchpad script is outside the repository.
- **Phase 3** ends with the full solution building and both test projects passing, including the boundary assertions. No half-applied reference: `SeedDisplay` and the `.asmdef`/`.csproj` reference it needs both landed, in Tasks 3 and 9.
- **Phase 4** makes no code change at all — one command run plus prose edits to three documents — so the tree ends exactly as Phase 3 left it, compiling and green.
- **Phase 5** changes nothing and only verifies.
