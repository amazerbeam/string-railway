# Tasks: Cross-run persistent storage layer

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Note:** `plan.md` was NOT developer-confirmed. This contract ran under the 2026-08-23 unattended sprint run, which overrides the `AskUserQuestion` approval gate and takes the plan's own stated defaults. No mockup was produced — the work is pure logic and renders nothing, so Step 3.5 did not apply.

Status: COMPLETE
Started: 2026-08-23

**Goal:** Add one new top-level module, `src/persistence/`, giving the codebase a single typed, namespaced, version-enveloped way to store a small JSON blob and read it back on a later page load — never throwing, always naming why a read produced no stored data — plus the project's first shared rule, `.claude/rules/save-data-versioning.md`, to constrain every ticket that persists something after this one.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/persistence/config.ts` — `SAVE_NAMESPACE`, `SAVE_KEY_SEPARATOR`, `SAVE_SCHEMA_VERSION`
- `src/persistence/storageDriver.ts` — the `StorageLike` interface and `createMemoryStorage()`
- `src/persistence/browserStorage.ts` — `browserLocalStorage()`, the only file that names `localStorage`
- `src/persistence/saveStore.ts` — envelope, outcome maps, `saveKeyFor`, `createSaveStore`
- `src/persistence/index.ts` — barrel, mirroring `src/hunt/index.ts`
- `src/persistence/__tests__/storageDriver.test.ts` — memory driver and browser-resolver specs
- `src/persistence/__tests__/saveStore.test.ts` — key composition, read outcomes, write outcomes, the AC3 round trip
- `.claude/rules/save-data-versioning.md` — the project's first shared rule

**Modified:**
- `.claude/rules/README.md` — the `## Index` section and the trailing "correctly empty" paragraph
- `.claude/workflow/web-project.md` — the `src/` layout block and its module/file counts

**Deleted:** (none)

**Developer decides or observes:**
- `src/persistence/config.ts` → `SAVE_NAMESPACE = 'strings-and-stations'` — the one literal that cannot be changed after a real save exists in a real browser without orphaning it. Chosen from the repository name over the game's working title because the title has already changed once. **Ten seconds of attention now, none ever again.**
- `createSaveStore`'s mandatory `isValidData` guard — heavier API for DLR-113 in exchange for making an unchecked `as T` cast impossible. Reversible in one line if the developer would rather the Vault ticket trust the envelope.
- Whether a save whose version cannot be migrated should be **discarded** rather than ignored. This ticket detects `VersionMismatch` and returns the default; deleting a stale Vault balance is a player-facing design call and belongs to DLR-113.
- `.claude/rules/save-data-versioning.md`'s reject conditions — read by `/fb-plan` and all four reviewers from the moment the file exists, so this is the part of the ticket whose blast radius extends past the module. **Worth reading in full.**
- Nothing on this ticket is judgeable by running the app. Nothing renders and no code path is reachable from the UI; QA finding the app unchanged is the correct result, not a gap.

---

## Phase 1 — The storage seam

Establishes `StorageLike` and its two implementations before anything depends on them. A safe stopping point: two self-contained files with no importer yet, both type-checking, with the in-memory driver already under test. Nothing in `src/` behaves differently at the end of this phase.

### Task 1: Declare `StorageLike` and the in-memory driver in `src/persistence/storageDriver.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/persistence/storageDriver.ts`
- Test: `src/persistence/__tests__/storageDriver.test.ts`

- [x] **Step 1: Write the failing spec for the in-memory driver**

Create `src/persistence/__tests__/storageDriver.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createMemoryStorage } from '../storageDriver'

describe('createMemoryStorage', () => {
  it('returns null for a key that was never set', () => {
    expect(createMemoryStorage().getItem('absent')).toBeNull()
  })

  it('round-trips a value through setItem and getItem', () => {
    const storage = createMemoryStorage()
    storage.setItem('k', 'v')
    expect(storage.getItem('k')).toBe('v')
  })

  it('overwrites an existing key rather than appending', () => {
    const storage = createMemoryStorage()
    storage.setItem('k', 'first')
    storage.setItem('k', 'second')
    expect(storage.getItem('k')).toBe('second')
  })

  it('removeItem returns the key to null', () => {
    const storage = createMemoryStorage()
    storage.setItem('k', 'v')
    storage.removeItem('k')
    expect(storage.getItem('k')).toBeNull()
  })

  it('removeItem on an absent key is a no-op, not a throw', () => {
    expect(() => createMemoryStorage().removeItem('absent')).not.toThrow()
  })

  it('hands each call its own isolated backing map', () => {
    const first = createMemoryStorage()
    const second = createMemoryStorage()
    first.setItem('k', 'v')
    expect(second.getItem('k')).toBeNull()
  })
})
```

- [x] **Step 2: Run the spec and confirm it fails to resolve the module**

Run: `npx vitest run src/persistence/__tests__/storageDriver.test.ts`
Expected: non-zero exit; Vitest reports it cannot resolve `../storageDriver`.

- [x] **Step 3: Implement `src/persistence/storageDriver.ts`**

```ts
/**
 * DLR-106 AC1 — the seam between "the thing that holds bytes" and "the thing that decides what
 * those bytes mean". These are the only three members of the Web Storage API this module uses.
 *
 * Injecting this interface instead of naming `localStorage` directly is forced, not stylistic:
 * `vite.config.ts` runs every `*.test.ts` under the `node` project, where `localStorage` does
 * not exist. A store that reached for the global could not be unit-tested without moving its
 * spec to `.test.tsx` and dragging in jsdom to test something with no DOM in it at all.
 */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * A Map-backed StorageLike. The substrate of every spec in this module, and a legitimate
 * explicit fallback for a caller that would rather hold state for the session than not at all.
 *
 * A fresh Map per call, with NO shared default instance exported — module-level mutable state
 * survives HMR and leaks between every test in one file, which is exactly the trap
 * `.claude/workflow/web-project.md` names under Correctness traps.
 */
export function createMemoryStorage(): StorageLike {
  const entries = new Map<string, string>()
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value)
    },
    removeItem: (key) => {
      entries.delete(key)
    },
  }
}
```

- [x] **Step 4: Re-run the spec and typecheck**

Run: `npx vitest run src/persistence/__tests__/storageDriver.test.ts; npm run typecheck`
Expected: Vitest reports `6 passed`, exit 0; `tsc -b` exits 0 with no errors.

### Task 2: Add the browser adapter in `src/persistence/browserStorage.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/persistence/browserStorage.ts`
- Test: `src/persistence/__tests__/storageDriver.test.ts` (append a describe block)

- [x] **Step 1: Implement `src/persistence/browserStorage.ts`**

```ts
import type { StorageLike } from './storageDriver'

/**
 * DLR-106 — THE only place in this codebase that names `localStorage`. Quarantining the browser
 * global to one function is what keeps `saveStore.ts` pure TypeScript, testable under Vitest's
 * `node` project, and free of the DOM.
 *
 * Returns `null` rather than throwing when storage is absent (node, a test run, SSR) or blocked
 * (private browsing, disabled cookies, an enterprise policy). Note the `try` covers the property
 * *read* itself, not just the calls on it: accessing `globalThis.localStorage` is what throws a
 * SecurityError in a blocked context, before any method is ever invoked.
 *
 * `null` is not an error state — it is "there is nowhere to put this", which `createSaveStore`
 * reports as `SaveReadOutcome.Unavailable` / `SaveWriteOutcome.Unavailable` rather than
 * pretending a save happened.
 */
export function browserLocalStorage(): StorageLike | null {
  try {
    const candidate = globalThis.localStorage
    return candidate ?? null
  } catch {
    return null
  }
}
```

- [x] **Step 2: Append the browser-resolver spec to `src/persistence/__tests__/storageDriver.test.ts`**

Add the import and a second `describe` block. This spec runs under the `node` project, where `globalThis.localStorage` is genuinely absent — which is precisely the unavailable branch worth asserting:

```ts
import { browserLocalStorage } from '../browserStorage'

describe('browserLocalStorage', () => {
  it('returns null when the environment has no localStorage, rather than throwing', () => {
    expect(() => browserLocalStorage()).not.toThrow()
    expect(browserLocalStorage()).toBeNull()
  })

  it('returns the global when one is present', () => {
    const stub = createMemoryStorage()
    const globalWithStorage = globalThis as { localStorage?: unknown }
    const had = 'localStorage' in globalWithStorage
    const previous = globalWithStorage.localStorage
    globalWithStorage.localStorage = stub
    try {
      expect(browserLocalStorage()).toBe(stub)
    } finally {
      if (had) {
        globalWithStorage.localStorage = previous
      } else {
        delete globalWithStorage.localStorage
      }
    }
  })
})
```

The `try`/`finally` restore is mandatory — an assignment to `globalThis` left in place is module-level mutable state by another name and would leak into every later spec in the file.

- [x] **Step 3: Run the spec and typecheck**

Run: `npx vitest run src/persistence/__tests__/storageDriver.test.ts; npm run typecheck`
Expected: Vitest reports `8 passed`, exit 0; `tsc -b` exits 0.

---

## Phase 2 — The versioned save store

Builds the typed store on top of Phase 1's seam. Ends with the module's whole public surface implemented, barrelled, and covered — including AC3's round trip. A safe stopping point: `src/persistence/` is complete and self-consistent, with its specs as its only consumer, and nothing outside the module imports it.

### Task 3: Declare the module's constants in `src/persistence/config.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/persistence/config.ts`
- Config: `src/persistence/config.ts` — adds `SAVE_NAMESPACE` (value is a developer decision, see the File map), `SAVE_KEY_SEPARATOR`, `SAVE_SCHEMA_VERSION`

- [x] **Step 1: Write `src/persistence/config.ts`**

Mirrors `src/hunt/config.ts` — named constants with the reasoning attached, so no call site ever inlines one:

```ts
/**
 * DLR-106 — the key prefix every save this game writes shares. Named for the REPOSITORY, not the
 * game's working title: the title has already changed once during this project, and a storage key
 * that renames orphans every save already on a player's disk with nothing able to find it again.
 *
 * This value is the one literal in the module that cannot be changed after a real save exists.
 * See `.claude/rules/save-data-versioning.md`.
 */
export const SAVE_NAMESPACE = 'strings-and-stations'

/**
 * Joins the namespace to a section name. `:` is the near-universal localStorage convention and
 * cannot collide with a section name made of identifier characters.
 */
export const SAVE_KEY_SEPARATOR = ':'

/**
 * The schema version stamped into every envelope written today. A schema IDENTITY, not a tuning
 * value — there is exactly one correct value for the first version of a schema. Bump it when a
 * stored payload's shape changes incompatibly, and never otherwise.
 */
export const SAVE_SCHEMA_VERSION = 1
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. (`noUnusedLocals` is on but applies to locals, not to unimported module exports.)

### Task 4: Implement `saveKeyFor` and `createSaveStore` in `src/persistence/saveStore.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/persistence/saveStore.ts`
- Test: `src/persistence/__tests__/saveStore.test.ts`

- [x] **Step 1: Write the failing spec**

Create `src/persistence/__tests__/saveStore.test.ts`. It covers key composition, every member of both outcome maps, and — as the AC3 round trip — a second store built over the same backing storage, which is what "simulate a reload" means for a module whose entire state lives in the injected driver:

```ts
import { describe, expect, it } from 'vitest'
import { SAVE_SCHEMA_VERSION } from '../config'
import { createMemoryStorage, type StorageLike } from '../storageDriver'
import {
  SaveReadOutcome,
  SaveWriteOutcome,
  createSaveStore,
  saveKeyFor,
  type SaveStore,
} from '../saveStore'

interface Probe {
  readonly count: number
}

const DEFAULT_PROBE: Probe = { count: 0 }

function isProbe(candidate: unknown): candidate is Probe {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof (candidate as { count?: unknown }).count === 'number'
  )
}

function probeStore(storage: StorageLike | null, version?: number): SaveStore<Probe> {
  return createSaveStore<Probe>({
    section: 'probe',
    defaultValue: DEFAULT_PROBE,
    isValidData: isProbe,
    storage,
    version,
  })
}

describe('saveKeyFor', () => {
  it('composes the namespace and the section with the separator', () => {
    expect(saveKeyFor('vault')).toBe('strings-and-stations:vault')
  })

  it('gives two different sections two different keys', () => {
    expect(saveKeyFor('vault')).not.toBe(saveKeyFor('settings'))
  })
})

describe('createSaveStore — read', () => {
  it('AC2 — reports Empty and returns the default when nothing was ever written', () => {
    const result = probeStore(createMemoryStorage()).read()
    expect(result.outcome).toBe(SaveReadOutcome.Empty)
    expect(result.value).toEqual(DEFAULT_PROBE)
  })

  it('AC2 — a read with no prior save does not throw', () => {
    expect(() => probeStore(createMemoryStorage()).read()).not.toThrow()
  })

  it('reports Unavailable and returns the default when storage is null', () => {
    const result = probeStore(null).read()
    expect(result.outcome).toBe(SaveReadOutcome.Unavailable)
    expect(result.value).toEqual(DEFAULT_PROBE)
  })

  it('reports Corrupt for a value that is not JSON', () => {
    const storage = createMemoryStorage()
    storage.setItem(saveKeyFor('probe'), 'not json {{{')
    const result = probeStore(storage).read()
    expect(result.outcome).toBe(SaveReadOutcome.Corrupt)
    expect(result.value).toEqual(DEFAULT_PROBE)
  })

  it('reports Corrupt for JSON that is not an envelope', () => {
    const storage = createMemoryStorage()
    storage.setItem(saveKeyFor('probe'), JSON.stringify({ count: 3 }))
    expect(probeStore(storage).read().outcome).toBe(SaveReadOutcome.Corrupt)
  })

  it('reports Corrupt for an envelope whose version is not a number', () => {
    const storage = createMemoryStorage()
    storage.setItem(saveKeyFor('probe'), JSON.stringify({ version: 'one', data: { count: 3 } }))
    expect(probeStore(storage).read().outcome).toBe(SaveReadOutcome.Corrupt)
  })

  it('reports Corrupt when the payload fails the caller-supplied guard', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      saveKeyFor('probe'),
      JSON.stringify({ version: SAVE_SCHEMA_VERSION, data: { count: 'three' } }),
    )
    const result = probeStore(storage).read()
    expect(result.outcome).toBe(SaveReadOutcome.Corrupt)
    expect(result.value).toEqual(DEFAULT_PROBE)
  })

  it('reports VersionMismatch rather than deserialising a foreign schema', () => {
    const storage = createMemoryStorage()
    probeStore(storage, 2).write({ count: 7 })
    const result = probeStore(storage, 1).read()
    expect(result.outcome).toBe(SaveReadOutcome.VersionMismatch)
    expect(result.value).toEqual(DEFAULT_PROBE)
  })
})

describe('createSaveStore — write and clear', () => {
  it('reports Written and puts an envelope carrying the current version under the key', () => {
    const storage = createMemoryStorage()
    expect(probeStore(storage).write({ count: 4 })).toBe(SaveWriteOutcome.Written)
    expect(JSON.parse(storage.getItem(saveKeyFor('probe')) ?? '')).toEqual({
      version: SAVE_SCHEMA_VERSION,
      data: { count: 4 },
    })
  })

  it('reports Unavailable when storage is null, rather than throwing', () => {
    expect(probeStore(null).write({ count: 4 })).toBe(SaveWriteOutcome.Unavailable)
  })

  it('reports Rejected when the backing store throws, e.g. on quota', () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError')
      },
      removeItem: () => {},
    }
    expect(probeStore(failing).write({ count: 4 })).toBe(SaveWriteOutcome.Rejected)
  })

  it('clear returns a written store to Empty', () => {
    const storage = createMemoryStorage()
    const store = probeStore(storage)
    store.write({ count: 4 })
    store.clear()
    expect(store.read().outcome).toBe(SaveReadOutcome.Empty)
  })

  it('clear removes only its own key', () => {
    const storage = createMemoryStorage()
    storage.setItem(saveKeyFor('other'), 'untouched')
    probeStore(storage).clear()
    expect(storage.getItem(saveKeyFor('other'))).toBe('untouched')
  })

  it('clear on a store with nothing written does not throw', () => {
    expect(() => probeStore(createMemoryStorage()).clear()).not.toThrow()
  })

  it('clear on null storage does not throw', () => {
    expect(() => probeStore(null).clear()).not.toThrow()
  })
})

describe('createSaveStore — AC3 round trip', () => {
  it('a fresh store over the same backing storage reads back what a previous one wrote', () => {
    const storage = createMemoryStorage()

    // The run that saves.
    expect(probeStore(storage).write({ count: 42 })).toBe(SaveWriteOutcome.Written)

    // The reload: a brand-new store object, holding no state from the first, over the same bytes.
    const afterReload = probeStore(storage).read()
    expect(afterReload.outcome).toBe(SaveReadOutcome.Loaded)
    expect(afterReload.value).toEqual({ count: 42 })
  })

  it('the last write wins across two simulated reloads', () => {
    const storage = createMemoryStorage()
    probeStore(storage).write({ count: 1 })
    probeStore(storage).write({ count: 2 })
    expect(probeStore(storage).read().value).toEqual({ count: 2 })
  })
})
```

- [x] **Step 2: Run the spec and confirm it fails to resolve the module**

Run: `npx vitest run src/persistence/__tests__/saveStore.test.ts`
Expected: non-zero exit; Vitest reports it cannot resolve `../saveStore`.

- [x] **Step 3: Implement `src/persistence/saveStore.ts`**

```ts
import { SAVE_KEY_SEPARATOR, SAVE_NAMESPACE, SAVE_SCHEMA_VERSION } from './config'
import type { StorageLike } from './storageDriver'

/**
 * Why a read produced what it produced. An `as const` map, NOT an enum: `erasableSyntaxOnly` is
 * on in `tsconfig.app.json`. Follows `src/hunt/shop.ts`'s ShopItem / PurchaseRefusal idiom.
 *
 * Every member except `Loaded` comes back paired with the caller's `defaultValue`. That is what
 * keeps this from being the `catch { return DEFAULTS }` the react-frontend skill forbids: the
 * failure is reported in-band, by name, alongside a value the caller can keep running on.
 */
export const SaveReadOutcome = {
  /** A record was found, its version matched, and it passed the caller's guard. */
  Loaded: 'loaded',
  /** Nothing has ever been written under this key. DLR-106 AC2 — the default, not a throw. */
  Empty: 'empty',
  /** Something is there but it is not a valid envelope for this type. */
  Corrupt: 'corrupt',
  /** A valid envelope written by a different schema version. Deliberately NOT migrated here. */
  VersionMismatch: 'versionMismatch',
  /** There is nowhere to read from — no localStorage, or it is blocked. */
  Unavailable: 'unavailable',
} as const
export type SaveReadOutcome = (typeof SaveReadOutcome)[keyof typeof SaveReadOutcome]

/** Whether a write actually happened. A save that silently did not happen is the worst failure
 *  this module could have, so `write` reports rather than returning void. */
export const SaveWriteOutcome = {
  Written: 'written',
  /** The backing store threw — quota exceeded, or Safari private browsing. */
  Rejected: 'rejected',
  Unavailable: 'unavailable',
} as const
export type SaveWriteOutcome = (typeof SaveWriteOutcome)[keyof typeof SaveWriteOutcome]

/**
 * What is actually stored under a key. `data` is `unknown` because parsed JSON is untrusted;
 * the caller's `isValidData` guard is the only thing that narrows it.
 *
 * The version lives INSIDE the envelope, not in the key. A versioned key would orphan the
 * previous key on every upgrade — unfindable and unclearable — and force a reader to guess which
 * old versions to probe for. Inside, there is exactly one key per section for all time.
 */
export interface SaveEnvelope {
  readonly version: number
  readonly data: unknown
}

export interface SaveReadResult<T> {
  readonly outcome: SaveReadOutcome
  readonly value: T
}

export interface SaveStoreOptions<T> {
  /** Key suffix, e.g. 'vault'. Composed with the namespace by `saveKeyFor`. */
  readonly section: string
  /** Returned by `read()` for every non-Loaded outcome. DLR-106 AC2. */
  readonly defaultValue: T
  /** Narrows the untrusted parsed payload. Mandatory — the alternative is an unchecked `as T`,
   *  which would let a hand-edited or half-written value flow into game state typed as valid. */
  readonly isValidData: (candidate: unknown) => candidate is T
  /** Injected backing store. `null` means storage is unavailable, which is not an error. */
  readonly storage: StorageLike | null
  /** Defaults to SAVE_SCHEMA_VERSION. Overridable so a spec can assert mismatch handling. */
  readonly version?: number
}

/** Exactly the three operations DLR-106's risk note asks for, plus the key for diagnostics. */
export interface SaveStore<T> {
  readonly key: string
  read(): SaveReadResult<T>
  write(value: T): SaveWriteOutcome
  clear(): void
}

/**
 * THE single place a save key is composed. Never inline SAVE_NAMESPACE at a call site — storage
 * keys are the archetype of the string-bound-name trap in `.claude/workflow/web-project.md`,
 * where a rename type-checks cleanly and silently orphans every existing save.
 */
export function saveKeyFor(section: string): string {
  return `${SAVE_NAMESPACE}${SAVE_KEY_SEPARATOR}${section}`
}

/** Narrows parsed JSON to an envelope. A non-numeric `version` lands here, not in a comparison,
 *  so no NaN can ever be produced from a hand-edited record. */
function isSaveEnvelope(candidate: unknown): candidate is SaveEnvelope {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof (candidate as { version?: unknown }).version === 'number' &&
    'data' in candidate
  )
}

/**
 * DLR-106 AC1 — the typed, namespaced read/write interface. Fully synchronous, holds no
 * module-level state, and never throws from any of its three operations.
 */
export function createSaveStore<T>(options: SaveStoreOptions<T>): SaveStore<T> {
  const { defaultValue, isValidData, storage } = options
  const key = saveKeyFor(options.section)
  const version = options.version ?? SAVE_SCHEMA_VERSION

  function fallback(outcome: SaveReadOutcome): SaveReadResult<T> {
    return { outcome, value: defaultValue }
  }

  return {
    key,

    read(): SaveReadResult<T> {
      if (storage === null) {
        return fallback(SaveReadOutcome.Unavailable)
      }

      const raw = storage.getItem(key)
      if (raw === null) {
        return fallback(SaveReadOutcome.Empty)
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        return fallback(SaveReadOutcome.Corrupt)
      }

      if (!isSaveEnvelope(parsed)) {
        return fallback(SaveReadOutcome.Corrupt)
      }
      if (parsed.version !== version) {
        return fallback(SaveReadOutcome.VersionMismatch)
      }
      if (!isValidData(parsed.data)) {
        return fallback(SaveReadOutcome.Corrupt)
      }

      return { outcome: SaveReadOutcome.Loaded, value: parsed.data }
    },

    write(value: T): SaveWriteOutcome {
      if (storage === null) {
        return SaveWriteOutcome.Unavailable
      }
      const envelope: SaveEnvelope = { version, data: value }
      try {
        storage.setItem(key, JSON.stringify(envelope))
      } catch {
        return SaveWriteOutcome.Rejected
      }
      return SaveWriteOutcome.Written
    },

    /** Removes ONLY this store's own key — never the namespace, never `localStorage.clear()`.
     *  Wiping keys a store does not own is not something a `clear` call should be able to do. */
    clear(): void {
      storage?.removeItem(key)
    },
  }
}
```

- [x] **Step 4: Re-run the spec and typecheck**

Run: `npx vitest run src/persistence/__tests__/saveStore.test.ts; npm run typecheck`
Expected: Vitest reports `19 passed`, exit 0; `tsc -b` exits 0.

### Task 5: Add the module barrel `src/persistence/index.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/persistence/index.ts`

- [x] **Step 1: Write the barrel, mirroring `src/hunt/index.ts` — types first, then values**

```ts
export { SAVE_NAMESPACE, SAVE_KEY_SEPARATOR, SAVE_SCHEMA_VERSION } from './config'

export type { StorageLike } from './storageDriver'
export { createMemoryStorage } from './storageDriver'

export { browserLocalStorage } from './browserStorage'

export type { SaveEnvelope, SaveReadResult, SaveStore, SaveStoreOptions } from './saveStore'
export { SaveReadOutcome, SaveWriteOutcome, saveKeyFor, createSaveStore } from './saveStore'
```

- [x] **Step 2: Typecheck and lint the new module**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. `verbatimModuleSyntax` is on, so any type re-exported without the `type` keyword is a hard error here — a clean run is the confirmation the split is right.

---

## Phase 3 — The shared rule and the layout record

No source changes. Writes the project's first `.claude/rules/` entry and brings the two prose files that own facts this ticket changed back into step. A safe stopping point by construction — nothing here is compiled.

### Task 6: Write `.claude/rules/save-data-versioning.md` ✓

- Skill: `none — a pipeline rule document, not source code. .claude/rules/README.md is its specification.`

**Files:**
- Create: `.claude/rules/save-data-versioning.md`

- [x] **Step 1: Write the rule file in the five-section shape `.claude/rules/README.md` prescribes**

The README's five required sections are **what the rule is**, **why it exists**, **when to enforce**, **how to verify**, **reject conditions** — and it states plainly that "reject conditions are the load-bearing part … a rule file with no reject conditions will be skimmed and ignored." Write the file with those five `##` headings, in that order. Its content must state:

- **What:** every value this game persists goes through `src/persistence/`; it is written as a `{ version, data }` envelope stamped with `SAVE_SCHEMA_VERSION`; its key is composed only by `saveKeyFor(section)`; and a reader that meets a version it does not recognise returns its default and reports `SaveReadOutcome.VersionMismatch` rather than deserialising.
- **Why:** storage keys and persisted field names bind by string and sit outside the type checker's view (`.claude/workflow/web-project.md` → Correctness traps), so a rename type-checks cleanly and silently orphans every save already on a player's disk. Unlike every other kind of breakage in this prototype, a bad save shape damages data the developer cannot regenerate by re-running the app.
- **When to enforce:** any ticket that adds a field to a persisted shape, changes an existing one's type, renames a section, or reads/writes storage at all. Names DLR-113 (Vault), DLR-118 (Vault end-of-run screen) and DLR-123 (persistent deck) as the queued consumers.
- **How to verify:** `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "localStorage|sessionStorage"` returns hits only in `src/persistence/browserStorage.ts`; `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "'strings-and-stations'"` returns hits only in `src/persistence/config.ts`; a breaking payload change is accompanied by a `SAVE_SCHEMA_VERSION` bump in the same task.
- **Reject conditions** — at minimum these six, each stated as a flat "reject a change that…":
  1. calls `localStorage` or `sessionStorage` outside `src/persistence/browserStorage.ts`;
  2. composes a storage key by string concatenation rather than through `saveKeyFor`;
  3. writes a bare payload instead of a `{ version, data }` envelope;
  4. changes a persisted shape incompatibly without bumping `SAVE_SCHEMA_VERSION` in the same task;
  5. casts a parsed payload with `as T` instead of narrowing it through a type guard;
  6. turns a read failure into a silent success — a `catch` that returns the default without also returning the non-`Loaded` outcome that names why.

- [x] **Step 2: Confirm the file has all five required sections**

Run: `Select-String -Path .claude\rules\save-data-versioning.md -Pattern "^## "`
Expected: exactly five matches, ending with the reject-conditions heading.

### Task 7: Register the rule in `.claude/rules/README.md` ✓

- Skill: `none — a pipeline index file, not source code.`

**Files:**
- Modify: `.claude/rules/README.md` — the `## Index` section and the closing paragraph

- [x] **Step 1: Replace the empty-index placeholder with the real entry**

Replace the line `*(empty — no rules written yet)*` under `## Index` with:

```markdown
- [`save-data-versioning.md`](save-data-versioning.md) — how anything that survives a run is keyed, enveloped, versioned, and rejected when it cannot be read. Enforce on any ticket that persists a value.
```

- [x] **Step 2: Correct the closing paragraph, which now asserts something false**

The README's final two paragraphs state that the folder is correctly empty and that "there are no candidate first rules yet". Both are now wrong — and the second names `save-data-versioning.md` as its own worked example of the candidate. Replace them with a short paragraph recording that DLR-106 wrote the first rule when `src/persistence/` introduced the project's first persisted shape, and that the five-section shape above is the pattern for the next one. Do not delete the surrounding sections — Convention, How skills use this folder, and When to add a rule here vs. inside a skill all remain correct.

- [x] **Step 3: Confirm the placeholder is gone and the entry is present**

Run: `Select-String -Path .claude\rules\README.md -Pattern "empty — no rules written yet|save-data-versioning"`
Expected: no hit for the placeholder text; at least one hit for `save-data-versioning`.

### Task 8: Record the new module in `.claude/workflow/web-project.md` ✓

- Skill: `none — the pipeline's layout reference, not source code.`

**Files:**
- Modify: `.claude/workflow/web-project.md` — the Status note and the `src/` block inside the Layout section

- [x] **Step 1: Add `persistence/` to the layout block and move the counts**

That file is the named owner of "where code lives", so a new top-level module has to land there or the fact is stated nowhere. In the fenced layout block, add a line beneath `hunt/`:

```
    persistence/          cross-run save storage — the only tree that touches localStorage
```

Then update the two places the module count appears — the `> **Status:**` blockquote's "five modules" and the `src/` line's own "57 source files across five modules and 20 test files" — to the real numbers after this contract. Measure, do not estimate:

Run: `(Get-ChildItem src -Recurse -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch '__tests__' }).Count; (Get-ChildItem src -Recurse -Include *.test.ts,*.test.tsx).Count`
Expected: two integers; write those two numbers and "six modules" into both places.

- [x] **Step 2: Note the deliberate absence of a lint boundary on the new module**

In the **Architectural boundaries** section, after the existing paragraph about the `src/warCouncil/**` / `src/hunt/**` override, add a short paragraph recording that `src/persistence/**` is deliberately **not** added to it: `browserStorage.ts` must legitimately touch `localStorage`, so the boundary is held by keeping that access to one file and grepping for it, not by a lint rule the module would have to disable. Point at `.claude/rules/save-data-versioning.md` as the enforcing document.

- [x] **Step 3: Confirm both edits landed**

Run: `Select-String -Path .claude\workflow\web-project.md -Pattern "persistence"`
Expected: at least three hits — the layout line, the boundaries paragraph, and the rule reference.

---

## Phase 4 — Final verification

The closing phase. No production changes — only sanity checks that the cumulative work is clean, that the module's one deliberate DOM touch stayed where it was put, and that no constant got inlined.

### Task 9: Confirm the storage boundary this contract established still holds ✓

- Skill: `none — a verification-only task that changes no code.`

**Files:**
- (no file changes)

- [x] **Step 1: Confirm `localStorage` is named in exactly one source file**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "localStorage|sessionStorage"`
Expected: hits only in `src\persistence\browserStorage.ts` and `src\persistence\__tests__\storageDriver.test.ts`. Zero hits under `src\hunt\`, `src\warCouncil\`, or `src\app\`. (The recursive `Get-ChildItem` form is mandatory — `Select-String -Path 'src\**\*.ts'` reaches exactly one directory level and would report a false zero.)

Re-run in this fix pass returned six files, not two — `config.ts`, `index.ts`, `saveStore.ts` and `storageDriver.ts` all now match too, because this raw word pattern also matches docblock prose (e.g. saveStore.ts's `localStorage.clear()` comment) and re-exported identifiers (`browserLocalStorage`, `createMemoryStorage`). Zero hits under `src\hunt\`, `src\warCouncil\`, or `src\app\` still holds — the boundary itself is intact; it is this task's own word-match pattern, same defect as Defender Warning 2, that overreports. See the tightened pattern now in `.claude/rules/save-data-versioning.md` → How to verify.

- [x] **Step 2: Confirm the new module imports no React**

Run: `Get-ChildItem src\persistence -Recurse -Include *.ts | Select-String -Pattern "from 'react"`
Expected: zero hits. Confirmed — zero hits.

### Task 10: Confirm no constant was inlined and no name drifted ✓

- Skill: `none — a verification-only task that changes no code.`

**Files:**
- (no file changes)

- [x] **Step 1: Confirm the namespace literal appears only in its config file**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "strings-and-stations"`
Expected: hits only in `src\persistence\config.ts` and in `src\persistence\__tests__\saveStore.test.ts` (which asserts the composed key by literal on purpose — that assertion is what would catch an accidental rename). Confirmed — exactly those two files.

- [x] **Step 2: Confirm no file in the new module breaches the 400-line budget**

Run: `Get-ChildItem src\persistence -Recurse -Include *.ts | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count well under 400. Use `(Get-Content <path>).Count`, never `Measure-Object -Line`, which drops blank lines and undercounts. Confirmed: saveStore.test.ts 195, storageDriver.test.ts 64, browserStorage.ts 24, config.ts 22, index.ts 9, saveStore.ts 175, storageDriver.ts 35 — all well under 400.

### Task 11: Static gates and full suite ✓

- Skill: `none — a verification-only task that changes no code.`

**Files:**
- (no file changes)

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: `typecheck` and `lint` exit 0. `npm test` reports 0 failed **except** for the one known pre-existing failure, `src/hunt/__tests__/envenom.test.ts :: "does NOT add a Cheat"`, which fails identically on clean `master` and is out of this contract's scope — do not fix it. Confirmed in this fix pass: typecheck exit 0, lint exit 0, `npm test` → `Test Files  1 failed | 83 passed (84)`, `Tests  1 failed | 1061 passed (1062)` — the sole failure is the named pre-existing `envenom.test.ts` case. (Test and pass counts are two higher than the plan's original 1059/1060 because this fix pass added two new saveStore specs for Defender Warning 1's throw-guard branches.)

- [x] **Step 2: Confirm formatting of only the files this contract touched**

Run: `npx prettier --check src/persistence/config.ts src/persistence/storageDriver.ts src/persistence/browserStorage.ts src/persistence/saveStore.ts src/persistence/index.ts src/persistence/__tests__/storageDriver.test.ts src/persistence/__tests__/saveStore.test.ts eslint.config.js`
Expected: exits 0. The repo-wide `npm run format:check` currently fails on pre-existing `.docs/**` files this contract has not touched — scope the check, do not "fix" the repo. Confirmed — "All matched files use Prettier code style!"

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. Note the `build` script runs `lint` first, so a lint regression fails here too. Confirmed — built in 123ms, `dist/` written, no errors.

### Task 12: Update the PR description ✓

- Skill: `none — a hand-off document, not source code.`

**Files:**
- Create: `.claude/contract/DLR-106-cross-run-persistent-storage-layer/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- A link to `plan.md` in this folder.
- A summary of the change: one new module, `src/persistence/`, five source files and two specs; no existing source file modified; no new dependency; nothing in the app calls it yet.
- Every decision the developer must make, copied from this file's **Developer decides or observes** block — chiefly `SAVE_NAMESPACE`, the mandatory `isValidData` guard, and whether an unmigratable save should be discarded.
- Verification results from Phase 4, quoting the real exit codes and the Vitest summary line, and naming the known pre-existing `envenom.test.ts` failure as out of scope.
- A one-line note for future contributors on the new convention: **anything that must survive a run goes through `src/persistence/`, in a `{ version, data }` envelope, under a key composed by `saveKeyFor` — the constraint is written down as `.claude/rules/save-data-versioning.md`, and `/fb-plan` and the reviewers read it from now on.**

---

## Self-review

**Spec coverage:**
- New module `src/persistence/` with driver, store, constants, barrel — Tasks 1, 2, 3, 4, 5.
- `StorageLike` plus browser and in-memory implementations — Tasks 1, 2.
- Typed `createSaveStore` with exactly `read` / `write` / `clear`, namespaced key, versioned envelope (AC1) — Task 4.
- Named outcome codes for read and write, no throw on any path (AC2 generalised) — Task 4, Steps 1 and 3.
- Unit tests including the AC3 round trip — Tasks 1, 2, 4 (the `AC3 round trip` describe block).
- AC4, no Vault-specific field — held by construction: the store is generic over `T` and the only concrete payload anywhere in the contract is the specs' local `Probe { count: number }`.
- `.claude/rules/save-data-versioning.md` plus its index entry — Tasks 6, 7.
- `web-project.md` layout updated — Task 8.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact prose requirement, or a runnable command with `Run:` / `Expected:`. No step runs bare `vitest`, `npm run dev`, or edits `package-lock.json`, `node_modules/`, or `dist/`. No step invents a tuning value — `SAVE_NAMESPACE` is routed to the developer under **Developer decides or observes** and shipped with the plan's stated default. No step's fix is an `eslint-disable`.

**Type / name consistency:** `StorageLike`, `createMemoryStorage`, `browserLocalStorage`, `SaveEnvelope`, `SaveReadOutcome`, `SaveWriteOutcome`, `SaveReadResult`, `SaveStoreOptions`, `SaveStore`, `saveKeyFor`, `createSaveStore`, `SAVE_NAMESPACE`, `SAVE_KEY_SEPARATOR`, `SAVE_SCHEMA_VERSION` are spelled identically in `plan.md` Part 2 → Data shapes, in Tasks 1–5, in both specs, and in the barrel. Both outcome sets use the `as const`-map-plus-type idiom throughout — no `enum` anywhere, as `erasableSyntaxOnly` requires. Every `- Skill:` value is either `react-frontend` (listed in `plan.md` Part 2 and present on disk) or the literal `none — <reason>` on a task that writes no TypeScript.

**Phase boundary cleanliness:**
- **Phase 1** ends with `storageDriver.ts` and `browserStorage.ts` created, type-checking, and covered by 8 passing tests. Nothing imports them yet, so no half-applied change exists.
- **Phase 2** ends with the store implemented, barrelled, type-checked and linted, and 27 tests passing across the module. No file outside `src/persistence/` has been touched, so the rest of `src/` is byte-identical to its state at `2c8f6bc`.
- **Phase 3** touches only Markdown under `.claude/`. It cannot affect compilation, and Phase 2's gates remain valid.
- **Phase 4** changes no production code at all — greps, line counts, the static gates, the build, and the PR description.
