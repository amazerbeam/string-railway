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

  it('reports Unavailable and returns the default when the backing store throws on getItem', () => {
    const failing: StorageLike = {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError')
      },
      setItem: () => {},
      removeItem: () => {},
    }
    const result = probeStore(failing).read()
    expect(result.outcome).toBe(SaveReadOutcome.Unavailable)
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

  it('clear does not throw when the backing store throws on removeItem', () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {
        throw new DOMException('blocked', 'SecurityError')
      },
    }
    expect(() => probeStore(failing).clear()).not.toThrow()
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
