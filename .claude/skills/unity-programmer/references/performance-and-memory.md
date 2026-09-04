# Performance and memory

## Scope

**Structural — permanent, safe to rely on.** Why allocation in a per-frame method is different from allocation anywhere else; why an engine property is not a field; the reuse, pooling and hoisting patterns; the boxing and closure rules; the order in which to investigate a frame hitch. None of this changes with a Unity version.

**Owned by the live source — resolve before writing.** Every method signature, overload and attribute named below. The code is written against **Unity 6 LTS, September 2026**, and the non-allocating overloads in particular gain and lose members between releases. Confirm against `docs.unity3d.com` for the project's actual version before generating code that uses one. `UnityEngine.Pool`, `Unity.Collections`, `Unity.Burst` and Addressables are separately versioned again.

---

## Why per-frame allocation is the whole problem

Unity's current collector is non-generational and non-compacting. It stops the main thread and scans, and the pause scales with the size of the heap rather than with the amount of garbage. Incremental mode spreads that pause across frames but does not remove it — it converts one long hitch into many small ones, which is better and is not free.

CoreCLR brings a generational, compacting collector and softens this considerably. It does not make the problem go away: a per-frame allocation is still a per-frame allocation, and the patterns below are correct on both runtimes. One number does change — CoreCLR's large-object threshold is 85KB against Mono's 2–8KB, so arrays that used to land on the large-object heap will now be collected normally.

The investigation order, when something hitches: Profiler capture on device first, then check whether the time is in rendering or in managed code, then use the allocation call stacks to name the line. Rewriting for speed before that step is guessing.

---

## Allocate collections once, clear them forever

A new `List<T>` per frame at 60fps is 60 objects a second heading for the heap. Unity's non-allocating overloads exist so you can hand them a buffer you own.

**Legacy — two allocations per frame:**

```csharp
void Update()
{
    var hits = new List<Enemy>();
    foreach (var e in GetComponentsInChildren<Enemy>())
        if (e.IsAlive) hits.Add(e);

    Resolve(hits);
}
```

**Modern — zero allocations after warm-up:**

```csharp
readonly List<Enemy> _buffer = new(32);
readonly List<Enemy> _hits   = new(32);

void Update()
{
    _buffer.Clear();
    _hits.Clear();

    GetComponentsInChildren(_buffer);
    foreach (var e in _buffer)
        if (e.IsAlive) _hits.Add(e);

    Resolve(_hits);
}
```

The same shape runs across the API surface: `GetComponents(list)`, `Mesh.GetVertices(list)`, `Scene.GetRootGameObjects(list)`, `Physics.RaycastNonAlloc`. **When a Unity method returns an array, look for the overload that takes a list.** Give the list its capacity up front so it does not grow into a second allocation.

---

## Pool with the engine's pool

`UnityEngine.Pool` has shipped since 2021 and has settled as the standard. A hand-rolled stack-of-objects class is the tell of a codebase that stopped reading release notes.

**Legacy — an allocation and a native instantiate per shot:**

```csharp
void Fire()
{
    var b = Instantiate(bulletPrefab, muzzle.position, muzzle.rotation);
    Destroy(b, 3f);
}
```

**Modern — reuses instances, bounded:**

```csharp
ObjectPool<Bullet> _pool;

void Awake()
{
    _pool = new ObjectPool<Bullet>(
        createFunc:      () => Instantiate(bulletPrefab),
        actionOnGet:     b => b.gameObject.SetActive(true),
        actionOnRelease: b => b.gameObject.SetActive(false),
        actionOnDestroy: b => Destroy(b.gameObject),
        defaultCapacity: 64,
        maxSize:         256);
}

void Fire()
{
    var b = _pool.Get();
    b.transform.SetPositionAndRotation(muzzle.position, muzzle.rotation);
    b.ReturnTo(_pool);
}
```

`maxSize` matters — an unbounded pool is a memory leak with good manners. `ListPool<T>` and `DictionaryPool<T,V>` in the same namespace cover the temporary-collection case where a field-held buffer does not fit.

---

## Small temporary buffers belong on the stack

`stackalloc` assigned to a `Span<T>` is fully safe modern C# — the compiler refuses to let the memory escape the frame, so you cannot return it or store it in a field. Keep it under a few kilobytes; the thread stack is around 1MB and a loop that stack-allocates will overflow it. Above roughly 1KB, rent instead.

```csharp
// Legacy — heap array per call
float[] weights = new float[8];

// Modern — stack frame, freed on return
Span<float> weights = stackalloc float[8];

// Larger, still no GC
var rented = ArrayPool<float>.Shared.Rent(4096);
try { /* ... */ }
finally { ArrayPool<float>.Shared.Return(rented); }
```

`stackalloc` takes unmanaged types only — no reference types, and no struct containing one.

---

## Boxing is the allocation you cannot see

Any time a struct is handed to something expecting `object` or an interface, it is copied to the heap. Three routine offenders:

```csharp
// Legacy
Debug.Log("Score: " + score);            // boxes the int
list.Sort((IComparer)myStructComparer);  // boxes the comparer
void Apply(IDamage d) { }                // boxes any struct passed in

// Modern
Debug.Log($"Score: {score}");            // interpolation, no box
list.Sort(myStructComparer);             // generic overload
void Apply<T>(in T d) where T : IDamage { }
```

`in` passes a read-only struct by reference and avoids the copy — **but only if the struct is declared `readonly struct`.** On a mutable struct the compiler inserts a defensive copy on every member access, which is worse than passing by value. If you write `in`, write `readonly struct` too.

---

## Strings: build them once, or not at all

Every concatenation produces a new immutable string. A HUD rebuilding a readout each frame is one of the most common sources of steady garbage in a shipped game.

**Legacy — several strings per frame:**

```csharp
void Update()
{
    label.text = "HP " + hp + " / " + max;
    if (gameObject.tag == "Player") { }   // allocates the tag string
}
```

**Modern — no garbage, and usually no string at all:**

```csharp
int _shownHp = -1;

void Update()
{
    if (hp != _shownHp)                   // only when it changed
    {
        _shownHp = hp;
        label.SetText("HP {0} / {1}", hp, max);
    }

    if (CompareTag("Player")) { }         // no allocation
}
```

`SetText` with format arguments is TextMeshPro's non-allocating path. The wider principle outlives the API: **only touch the UI when the value changed.** That is also what makes an event-driven architecture pay for itself rather than just being tidier.

---

## Closures capture, and capturing allocates

A lambda that reads a local or a field allocates a closure object each time the enclosing method runs. A lambda capturing nothing is cached by the compiler and costs nothing.

```csharp
// Legacy — a closure per call
void Register(int id) => _bus.Subscribe(e => Handle(id, e));

// Modern — state passed, not captured
void Register(int id) => _bus.Subscribe(static (state, e) => Handle(state, e), id);
```

`static` on a lambda is the enforcement mechanism: it is a compile error if the body captures anything. Put it on any callback that runs often, and on any callback you want to prove is capture-free.

---

## LINQ, and where it is fine

A hand-written loop runs roughly twice the speed of the equivalent LINQ query, and each operator in a chain allocates an enumerator. This is not an argument against LINQ — it is excellent in editor tooling, tests, and setup code, where the readability is worth more than the microseconds. It is an argument against LINQ in `Update` and `FixedUpdate`.

**Legacy — allocates in Update:**

```csharp
var target = _enemies.Where(e => e.IsAlive).OrderBy(e => e.Distance).FirstOrDefault();
```

**Modern — one pass, no allocation:**

```csharp
Enemy target = null;
float best = float.MaxValue;

for (int i = 0; i < _enemies.Count; i++)
{
    var e = _enemies[i];
    if (!e.IsAlive || e.Distance >= best) continue;
    best = e.Distance;
    target = e;
}
```

Note the indexed `for`. On a concrete `List<T>` the struct enumerator makes `foreach` allocation-free too — but on an interface-typed collection, `IList<T>` or `IEnumerable<T>`, it boxes the enumerator. **Iterate the concrete type.**

---

## The managed/native boundary

A `MonoBehaviour` is a managed shell around a native C++ object. Properties that look like fields cross into native code through Unity's bindings layer, which is why patterns that would be free in ordinary C# are not free here.

### Resolve components once

```csharp
// Legacy — a native search every frame
void Update() => GetComponent<Rigidbody>().AddForce(Vector3.up);

// Modern — resolved once, and visible in the Inspector
[SerializeField] Rigidbody _body;

void Awake()
{
    if (_body == null) _body = GetComponent<Rigidbody>();
}

void Update() => _body.AddForce(Vector3.up);
```

The serialized field is the better half of that pattern: the dependency becomes visible, wired at author time, and the fallback covers only runtime-created objects. `[RequireComponent(typeof(Rigidbody))]` on the class makes the guarantee structural.

Where the component may genuinely be absent, `TryGetComponent(out T)` is the one to use — unlike `GetComponent`, it does not allocate an error message in the editor when the lookup fails.

### Read a transform once, write it once

`transform.position` returns a `Vector3` **by value** from native code, which is why `transform.position.x = 5` does not compile and why the usual workaround crosses the boundary repeatedly.

```csharp
// Legacy — reads and writes repeatedly
transform.position += velocity * dt;
transform.position += gravity  * dt;
transform.rotation  = Quaternion.Euler(0, yaw, 0);

// Modern — one read, one combined write
var p = transform.position;
p += (velocity + gravity) * dt;
transform.SetPositionAndRotation(p, Quaternion.Euler(0, yaw, 0));
```

Setting position and rotation separately also triggers two rounds of internal transform-hierarchy dirtying, which is the larger half of the saving.

### Delete empty magic methods, and centralise the rest

Unity calls `Update` across the boundary once per component per frame. An empty one still costs the crossing. At a few thousand objects the crossings are measurable before your code has done anything.

```csharp
// Legacy — 3,000 boundary crossings a frame
public class Pickup : MonoBehaviour
{
    void Start() { }                       // empty, still invoked
    void Update() => transform.Rotate(0, spin * Time.deltaTime, 0);
}

// Modern — one crossing, one loop
public class Pickup : MonoBehaviour
{
    public float Spin;
    void OnEnable()  => PickupSystem.Register(this);
    void OnDisable() => PickupSystem.Unregister(this);
}

public class PickupSystem : MonoBehaviour
{
    static readonly List<Pickup> Active = new(256);

    void Update()
    {
        float dt = Time.deltaTime;         // hoisted — also a native read
        for (int i = 0; i < Active.Count; i++)
            Active[i].transform.Rotate(0, Active[i].Spin * dt, 0);
    }
}
```

When the maths in that loop gets heavy enough to matter, this is also the shape that ports cleanly to the Job System — see `architecture-and-async.md`.

### Null checks: correct first, then hoisted

Unity overloads `==` on `UnityEngine.Object` so a destroyed object compares equal to null even though the managed wrapper still exists. That overload is a native call.

```csharp
// Legacy — misses destroyed objects entirely
if (!ReferenceEquals(_target, null)) Chase(_target);   // throws if destroyed
if (_target is not null)             Chase(_target);   // same trap

// Modern — correct, and checked once
if (_target == null) { _target = FindNext(); return; }

for (int i = 0; i < steps; i++)
    Chase(_target);                                     // check hoisted out
```

This is the one place where the newer C# idiom is the wrong answer. `is null`, `?.`, `is not null` and nullable reference types all bypass the overload.

---

## Runtime cutover items that show up as performance work

- **Statics no longer reset between Play sessions** once Fast Enter Play Mode is on. Give every static an explicit reset via `[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]`, or `[AutoStaticsCleanup]` on 6.5+.
- **CoreCLR uses checked arithmetic** where Mono let integers wrap silently. Wrap deliberate overflow — a rolling hash, for instance — in `unchecked { }`.
- **CoreCLR enforces IEEE 754 properly**, so float results can differ from Mono's. Anything depending on bit-exact float results across runs or platforms — replays, seeded simulations, lockstep netcode — needs integer ticks or fixed-point instead of accumulated floats.
- **No finalizers.** They run on another thread at an unpredictable time, cannot touch anything Unity owns, and promote the object to survive an extra collection. Use `IDisposable` and a `using` declaration.
