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

      let raw: string | null
      try {
        raw = storage.getItem(key)
      } catch {
        // The store itself failed to answer — that is an availability problem, not a data
        // problem, so it gets the same outcome as `storage === null` above.
        return fallback(SaveReadOutcome.Unavailable)
      }
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
     *  Wiping keys a store does not own is not something a `clear` call should be able to do.
     *  `clear()` returns `void` and has no outcome channel to report through, so a throwing
     *  `removeItem` is swallowed into a silent no-op here — deliberately, to keep the module's
     *  no-throw guarantee, not an oversight. */
    clear(): void {
      try {
        storage?.removeItem(key)
      } catch {
        // no-op — see comment above.
      }
    },
  }
}
