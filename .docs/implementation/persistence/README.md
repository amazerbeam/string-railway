# Persistence — `src/persistence/`

**Status:** implemented
**Built by:** DLR-106

## Responsibility

Gives the rest of the codebase one typed, namespaced way to store a small JSON-serialisable value
under this game's own key prefix in `localStorage` and read it back on a later page load. It knows
nothing about the Vault, coins, buffs, or any other game concept — a caller names a section, a
default value and a type guard, and gets back a `read()` / `write()` / `clear()` triple that never
throws and always reports *why* a read did not produce stored data. This is a **new top-level
module**, a sibling of `app/`, `hunt/`, `warCouncil/`, `styles/` — it cannot live inside
`src/hunt/`, whose ESLint override already bans `localStorage`, and it is not UI, so it is not
`src/app/`.

**Nothing in the running app calls into this module yet.** Its own specs are its only consumer;
no screen, reducer, or `RunState`/`EncounterState` field reads or writes through it. The Vault
(`.docs/design/Balatro-Forbidden-Solitaire/version-5-developer-idea.md` §8) is the first intended
caller, and is DLR-113's — its currency, exchange rate and purchase shapes are all still open there.

## Key types & exports

| Export | Purpose | File |
|---|---|---|
| `SAVE_NAMESPACE` | `'strings-and-stations'` — the key prefix every save shares, named for the repository rather than the game's working title | `config.ts` |
| `SAVE_KEY_SEPARATOR` | `':'` — joins the namespace to a section name | `config.ts` |
| `SAVE_SCHEMA_VERSION` | `1` — the schema identity stamped into every envelope written today | `config.ts` |
| `StorageLike` | the three-member seam (`getItem`/`setItem`/`removeItem`) `createSaveStore` is written against | `storageDriver.ts` |
| `createMemoryStorage()` | a fresh `Map`-backed `StorageLike` per call — the substrate of every spec | `storageDriver.ts` |
| `browserLocalStorage()` | resolves `globalThis.localStorage`, returning `null` (never throwing) when it is absent or blocked | `browserStorage.ts` |
| `SaveReadOutcome` / `SaveWriteOutcome` | `as const` maps naming why a read or write did or didn't happen | `saveStore.ts` |
| `SaveEnvelope` | the on-disk shape, `{ version, data }` | `saveStore.ts` |
| `SaveReadResult<T>` | `{ outcome, value }` — `value` is always usable, even on failure | `saveStore.ts` |
| `SaveStoreOptions<T>` | `{ section, defaultValue, isValidData, storage, version? }` | `saveStore.ts` |
| `SaveStore<T>` | the public surface: `key`, `read()`, `write(value)`, `clear()` | `saveStore.ts` |
| `saveKeyFor(section)` | THE only place a save key is composed | `saveStore.ts` |
| `createSaveStore(options)` | the factory | `saveStore.ts` |

`index.ts` re-exports all of the above, types then values, mirroring `src/hunt/index.ts`'s barrel
shape.

## How it works

### The storage seam and why the browser global is quarantined

`StorageLike` (`storageDriver.ts`) names exactly the three members of the Web Storage API this
module uses. `createSaveStore` is written entirely against that interface and never names
`localStorage` itself, so it is ordinary pure TypeScript. `browserLocalStorage()`
(`browserStorage.ts`) is **the only function in the codebase that names `globalThis.localStorage`**
— it wraps the property *read* itself in a `try`, because merely accessing the property throws a
`SecurityError` in some blocked/private-browsing contexts before any method is even called, and
returns `null` rather than throwing. This split is forced, not stylistic: `vite.config.ts` runs
every `*.test.ts` file under Vitest's `node` project, where `localStorage` does not exist at all —
a store that reached for the global directly could not be unit-tested without moving its spec to
`.test.tsx` and pulling in jsdom to test something with no DOM in it. `createMemoryStorage()` is
the in-memory `StorageLike` every spec in the module (and any future spec of a caller) runs
against; it allocates a fresh `Map` per call, with no shared default instance exported, so nothing
leaks between tests in one file.

### The versioned envelope and the four read outcomes

Every value `write()` stores is wrapped as `JSON.stringify({ version, data })` — never a bare
payload. `read()` (`saveStore.ts`) walks four checks in order, each producing its own named
`SaveReadOutcome`, and **never throws**:

1. `storage === null` (or `getItem` itself throws) → `Unavailable`.
2. `getItem(key)` returns `null` → `Empty` (DLR-106 AC2 — no prior save is not an error).
3. `JSON.parse` throws, or the parsed value is not an object carrying a numeric `version` and a
   `data` field (`isSaveEnvelope`) → `Corrupt`.
4. The envelope's `version` does not equal the store's version → `VersionMismatch`.
5. The envelope's `data` fails the caller's `isValidData` type guard → `Corrupt`.

Every outcome except `Loaded` returns the caller's `defaultValue` **alongside** the outcome in
`SaveReadResult<T>` — the failure is reported in-band, by name, never swallowed into a bare
default. `write()` returns `Written`, `Unavailable` (storage is `null`), or `Rejected` (`setItem`
threw — quota exceeded, Safari private browsing). `clear()` removes only that store's own key via
`storage?.removeItem(key)`, never the namespace and never `localStorage.clear()`; because `clear()`
returns `void` and has no outcome channel, a throwing `removeItem` is swallowed to a silent no-op
by design, to keep the module's overall no-throw guarantee.

### Key composition and the version seam

`saveKeyFor(section)` (`saveStore.ts`) is the single place a key is ever composed:
`` `${SAVE_NAMESPACE}${SAVE_KEY_SEPARATOR}${section}` `` — e.g. `strings-and-stations:vault`. The
version lives **inside** the envelope, not the key, so there is exactly one key per section for
all time; a versioned key would orphan the previous key on every schema bump with nothing able to
find it again. The migration seam this makes possible ships **deliberately empty**: a store created
with `version: 1` handed a `version: 2` record reports `VersionMismatch` and returns the default —
the record is neither migrated nor deleted. Whether an unmigratable save should be discarded is a
player-facing design question, explicitly deferred to DLR-113.

## Rules & invariants enforced

- **`.claude/rules/save-data-versioning.md`** — the project's first shared rule, written on this
  ticket. States the envelope shape, the `saveKeyFor`-only key composition, and five reject
  conditions (bare `localStorage` outside `browserStorage.ts`, string-concatenated keys, bare
  payloads, an incompatible schema change with no version bump, an `as T` cast bypassing
  `isValidData`, a swallowed read failure).
- **Lint-enforced storage confinement.** `eslint.config.js` carries a second `no-restricted-globals`
  override (distinct from the pure-core boundary below) scoped to `src/**/*.{ts,tsx}` banning
  `localStorage`/`sessionStorage`, with `ignores: ['src/persistence/browserStorage.ts',
  'src/warCouncil/**', 'src/hunt/**']` — the latter two stay listed only so this narrower block
  does not silently overwrite their own fuller DOM-ban override (same-key flat-config rules
  replace rather than merge). `npm run lint` fails on any file outside `browserStorage.ts` that
  names either global directly, across the whole `src/` tree, not just inside `persistence/`.
- **`src/persistence/` is deliberately *not* added to the pure-core `no-restricted-imports`/
  `no-restricted-globals` boundary** that covers `src/warCouncil/**` and `src/hunt/**` — one file
  in this module (`browserStorage.ts`) must legitimately touch the global that boundary bans, so a
  membership there would ban the module's own reason to exist. The confinement is held by the
  second, narrower override above instead.
- **No module-level mutable state.** `createSaveStore` is a factory returning a closure over its
  options; `createMemoryStorage()` allocates fresh per call. Nothing here survives HMR or leaks
  between specs.
- **`isValidData` is a mandatory type guard**, not an optional cast — parsed JSON arrives as
  `unknown`, and the alternative would be an unchecked `as T` letting a hand-edited or half-written
  stored value flow into game state typed as valid.

## Deferred / not yet implemented

- **No consumer.** Nothing under `src/app/`, `src/hunt/`, or `src/warCouncil/` reads or writes a
  save — this ticket shipped the generic capability only (DLR-106 AC4). The first caller is DLR-113
  (Vault currency and purchases).
- **No React hook** (`useSaveStore` or similar). No component needs one yet; the subscription shape
  depends on how the Vault screen ends up reading the store.
- **No actual migration.** The envelope carries a version and `read()` *detects* a mismatch by
  name, but nothing upgrades a v1 record to v2 — there has only ever been one version.
- **No autosave, save slots, multiple profiles, export/import, or cloud sync.**
- **No encryption, obfuscation, or tamper resistance** — a single-player prototype has no need.
