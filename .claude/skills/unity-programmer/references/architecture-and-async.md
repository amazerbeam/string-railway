# Architecture and async

## Scope

**Structural — permanent, safe to rely on.** The layering rule (rules in plain C#, configuration in assets, `MonoBehaviour` as a thin view); why an event channel beats a singleton; the subscribe/unsubscribe discipline; the assembly-definition split and what it buys; the separation of sequencing from throughput; thread affinity. None of this changes with a Unity version.

**Owned by the live source — resolve before writing.** Every method signature and attribute named below. Written against **Unity 6 LTS, September 2026**. `Awaitable` (2023.1+), the Job System, Burst, `Unity.Collections` and Addressables are each separately versioned — confirm against `docs.unity3d.com` and the package's own documentation for the project's actual versions before generating code. VContainer is a third-party package; adding it is a dependency decision that needs the developer's approval, not a default.

---

## The layering rule

The consensus shape for a modern Unity project:

| Layer | Holds | Assembly |
|---|---|---|
| Domain | The rules. Plain C# classes, constructor-injected dependencies. | No `UnityEngine` reference at all |
| Configuration | Tuning values, content definitions. ScriptableObject assets. | Engine assembly |
| Presentation | `MonoBehaviour` views that translate between the domain and the scene. | Engine assembly |

The payoff is not aesthetic. It is that the rules become testable without opening the editor, and recompile in isolation when you edit them.

**Legacy — rules unreachable without a scene:**

```csharp
public class CombatController : MonoBehaviour
{
    void Resolve()
    {
        // 300 lines of damage rules, reachable only by pressing Play
    }
}
```

**Modern — plain C#, unit-testable:**

```csharp
// Game.Domain.asmdef — references no engine assembly
public sealed class CombatResolver
{
    readonly IRandom _rng;
    public CombatResolver(IRandom rng) => _rng = rng;

    public TrickResult Resolve(in Trick trick) { /* ... */ }
}

// Game.Presentation.asmdef — the thin view
public class CombatView : MonoBehaviour
{
    CombatResolver _resolver;
    void Render(TrickResult r) { /* ... */ }
}
```

Assembly definitions are what enforce this. Without an `.asmdef`, everything compiles into one assembly that references the engine, and the "domain layer" is a naming convention nothing checks. With one, an accidental `using UnityEngine` in the domain is a compile error — which is the point.

The split also governs analyzer scope: an analyzer placed beside an `.asmdef` applies only to that assembly and its dependents, which is how you hold the domain to stricter rules than prototype code.

---

## Dependency injection follows from the split, it does not precede it

Once the domain is plain C# with constructor parameters, wiring it by hand from a single composition root is sufficient for most projects and adds no dependency. Do that first.

When manual wiring genuinely stops scaling, **VContainer** is the current default for new work: allocation-free on resolve and materially faster than Zenject, whose original project is no longer maintained. Adding it is a dependency decision — raise it with the developer rather than introducing it.

What not to do, in either case:

```csharp
// Legacy — every system reachable from everywhere, nothing testable
GameManager.Instance.AddScore(reward);
AudioManager.Instance.Play(clip);
```

A singleton is a global with a constructor. It also survives Fast Enter Play Mode, so its state leaks between Play sessions.

---

## Tuning values live in ScriptableObjects

A ScriptableObject is a data asset independent of any scene, referenceable from anywhere, editable in the Inspector without touching a prefab. It replaces both the hardcoded constant and the singleton-manager-holding-config.

**Legacy — recompile to retune, duplicated per prefab:**

```csharp
public class Enemy : MonoBehaviour
{
    const int   Health = 30;
    const float Speed  = 3.5f;
}
```

**Modern — one asset, shared, tuned live:**

```csharp
[CreateAssetMenu(menuName = "Game/Enemy Profile")]
public sealed class EnemyProfile : ScriptableObject
{
    [field: SerializeField] public int   Health { get; private set; } = 30;
    [field: SerializeField] public float Speed  { get; private set; } = 3.5f;
}

public class Enemy : MonoBehaviour
{
    [SerializeField] EnemyProfile _profile;
}
```

`[field: SerializeField]` on an auto-property keeps the value visible and editable in the Inspector while making it read-only to everything outside the class — which is exactly the guarantee a configuration asset should carry.

**The gotcha that catches everyone:** a ScriptableObject is an asset, so a runtime write persists in the editor and does *not* persist in a build. That asymmetry produces bugs that only reproduce in one of the two environments. Treat the asset as read-only configuration — the `private set` above enforces it — and copy any value you need to mutate into runtime state.

---

## Event channels decouple systems that must not know each other

The channel is a ScriptableObject asset holding an event. Publishers raise it; listeners subscribe. Neither holds a reference to the other, and unlike a static event bus, the connection is a serialized asset reference you can see, click, and find usages of.

**Legacy — the enemy knows about UI, audio and scoring:**

```csharp
void Die()
{
    GameManager.Instance.AddScore(_reward);
    FindObjectOfType<HudView>().Flash();
    AudioManager.Instance.Play(deathClip);
}
```

**Modern — the enemy knows only that it died:**

```csharp
[CreateAssetMenu(menuName = "Game/Events/Enemy Died")]
public sealed class EnemyDiedChannel : ScriptableObject
{
    public event Action<EnemyDied> Raised;
    public void Raise(EnemyDied e) => Raised?.Invoke(e);

    void OnDisable() => Raised = null;   // see the Play-mode note below
}

// Publisher
[SerializeField] EnemyDiedChannel _died;
void Die() => _died.Raise(new EnemyDied(_reward, transform.position));

// Listener — the pairing is not optional
void OnEnable()  => _died.Raised += OnEnemyDied;
void OnDisable() => _died.Raised -= OnEnemyDied;
```

Two rules make this safe rather than a new source of bugs:

1. **Subscribe in `OnEnable`, unsubscribe in `OnDisable`, always paired.** An event living on a long-lived asset keeps a destroyed listener alive, and it will fire into a dead object.
2. **Clear subscribers when the asset is disabled.** With Fast Enter Play Mode the asset survives between Play sessions and so do stale handlers — this is the single most common cause of "works the first time I press Play".

Mark the field in the Inspector with a `[Header]` saying whether the channel is being sent to or listened for. It is the one piece of information the type does not carry.

---

## Load assets by reference, not by string

Everything in a `Resources` folder is packed into the build and its index is loaded at startup regardless of use. Addressables replaced it years ago; the migration is settled practice.

```csharp
// Legacy — always in the build, string-keyed
var prefab = Resources.Load<GameObject>("Enemies/Wolf");

// Modern — loaded on demand, released explicitly
[SerializeField] AssetReferenceGameObject _wolf;

async Awaitable Spawn() => await _wolf.InstantiateAsync().Task;

void OnDestroy() => _wolf.ReleaseAsset();
```

The explicit release is the part people skip, and it is the part that keeps memory bounded.

---

## Awaitable replaces coroutines for new code

Coroutines cannot return values, swallow exceptions, and allocate a `WaitForSeconds` on every yield unless you cache it. `Awaitable` is Unity's own allocation-conscious awaitable type — it pools its instances, runs on the player loop, and works with `try`/`catch` normally.

**Legacy — allocates, cannot return, fails silently:**

```csharp
IEnumerator Reload()
{
    _reloading = true;
    yield return new WaitForSeconds(2f);
    yield return LoadClip();
    _reloading = false;
}

StartCoroutine(Reload());
```

**Modern — pooled, cancellable, throws properly:**

```csharp
async Awaitable ReloadAsync(CancellationToken ct)
{
    _reloading = true;
    try
    {
        await Awaitable.WaitForSecondsAsync(2f, ct);
        await LoadClipAsync(ct);
    }
    finally { _reloading = false; }
}

async void OnFirePressed()                  // entry point only
{
    try { await ReloadAsync(destroyCancellationToken); }
    catch (OperationCanceledException) { }
}
```

**The trap that matters:** a coroutine stops when its GameObject is disabled. An async method does not — it keeps running and then touches a destroyed object. `destroyCancellationToken` exists on every `MonoBehaviour` and is the fix; thread it through every `await` in the chain and pass it anywhere a token is accepted.

`async void` belongs only at an outermost entry point, wrapped in `try`/`catch`. Anywhere else the exception is unobservable, and on CoreCLR an unobserved exception takes the process down.

Coroutines are not forbidden. Existing coroutine code is fine, and a simple time-based sequence in an old file is not worth converting for its own sake. New code gets `Awaitable`.

---

## Background threads may not touch the engine

The Unity API is main-thread only, and violating it is a crash rather than an exception.

```csharp
// Legacy — undefined behaviour
Task.Run(() =>
{
    var result = HeavyParse(bytes);
    transform.position = result.Spawn;      // crash
});

// Modern — explicit thread transitions
async Awaitable LoadAsync(CancellationToken ct)
{
    await Awaitable.BackgroundThreadAsync();
    var result = HeavyParse(bytes);          // worker thread

    await Awaitable.MainThreadAsync();
    ct.ThrowIfCancellationRequested();
    transform.position = result.Spawn;       // main thread
}
```

This replaces the older pattern of queuing work and draining the queue in `Update`.

---

## Jobs and Burst are worth it without adopting ECS

Sequencing and throughput are separate problems that get conflated. `Awaitable` solves sequencing. Throughput — the same maths over thousands of items — is the Job System, and it does not require Entities. Any self-contained loop over a large array of value types can move off the main thread and be compiled to native SIMD by Burst with the rest of the project untouched.

**Legacy — one thread, no vectorisation:**

```csharp
void Update()
{
    for (int i = 0; i < _agents.Length; i++)
        _agents[i].Cost = Evaluate(_agents[i]);
}
```

**Modern — parallel, Burst-compiled:**

```csharp
[BurstCompile]
struct CostJob : IJobParallelFor
{
    [ReadOnly]  public NativeArray<AgentState> Agents;
    [WriteOnly] public NativeArray<float> Costs;

    public void Execute(int i) => Costs[i] = Evaluate(Agents[i]);
}

void Update()
{
    var costs = new NativeArray<float>(_agents.Length, Allocator.TempJob);
    try
    {
        new CostJob { Agents = _agents, Costs = costs }
            .Schedule(_agents.Length, 64)
            .Complete();
        Apply(costs);
    }
    finally { costs.Dispose(); }
}
```

Three constraints to plan around:

- **Unmanaged types only.** No classes, no managed references inside the job struct.
- **Every native container must be disposed.** The `try`/`finally` is the habit to form — a leaked `Allocator.TempJob` allocation is reported four frames later, far from the code that caused it.
- **`[ReadOnly]` and `[WriteOnly]` are not documentation.** They are what lets the job safety system prove there is no aliasing, and that proof is where most of Burst's optimisation comes from.

Do not reach for this speculatively. It costs real readability; spend it where a Profiler capture says the time actually goes.

---

## The language-level habits Unity's Mono era discouraged

Unity sat on old C# versions for years and a generation of tutorials taught around the gap. Most of it is closed now, and closes entirely at the CoreCLR cutover. These have settled into common use:

| Instead of | Write | Because |
|---|---|---|
| `public int Health;` | `[field: SerializeField] public int Health { get; private set; }` | Still shows in the Inspector; nothing outside the class can write it. |
| Out parameters for multiple returns | `(Vector3 pos, Quaternion rot) GetSpawn()` | `ValueTuple` is a struct — no type to declare, no allocation. |
| Long `if/else if` chains on a type or enum | `switch` expressions with patterns | The compiler warns on unhandled cases, and the result is an expression. |
| Hand-written equality and copy constructors | `record`, and `with` expressions | Value equality and non-destructive copies with no boilerplate to keep in sync. |
| `class` for small immutable data | `readonly record struct` | No allocation, no defensive copies, value semantics. |
| `namespace Game { … }` wrapping the file | `namespace Game;` | Removes a level of indentation from every file. |
| Classes left open by default | `sealed` unless designed for inheritance | Lets the JIT devirtualise calls, and states the design intent. |

On a real type:

```csharp
public readonly record struct TrickResult(int Damage, bool Banked);

var doubled = result with { Damage = result.Damage * 2 };
var (damage, banked) = result;

string Describe(TrickResult r) => r switch
{
    { Banked: true, Damage: 0 } => "Dodged clean",
    { Banked: true }            => $"Banked {r.Damage}",
    _                           => "Lost the trick",
};
```

**One caveat on nullable reference types.** They are excellent in a pure C# domain assembly. They are misleading on `MonoBehaviour` fields, because a serialized field the Inspector never filled is null while the compiler believes it cannot be, and because Unity's destroyed-object equality does not participate in the analysis at all. Enable them per assembly, starting with the engine-free ones.

---

## Enforcement

None of this survives without a gate — every rule here is one a tired person breaks at 11pm.

- **`Microsoft.Unity.Analyzers`** ships with Visual Studio Tools for Unity and is included automatically in Unity-generated projects. It catches the Unity-specific mistakes a general C# analyzer cannot see: empty magic methods, `GetComponent` in `Update`, string comparison against `tag`, wrong null-check idioms on engine objects.
- **Project Auditor 2.0+** scans for performance and compatibility issues, and is the tool Unity points at specifically for auditing a codebase ahead of the CoreCLR cutover.
- **Analyzer scope follows assembly definitions** — loose in `Assets` it applies to everything; beside an `.asmdef` it applies to that assembly and its dependents.
- **Profile on device, not in the editor.** Editor timings are not build timings, and most "C# performance problems" turn out to be draw calls or asset residency. Confirm the bottleneck is managed code before rewriting managed code.
