import { describe, expect, it } from 'vitest'
import { createMemoryStorage } from '../storageDriver'
import { browserLocalStorage } from '../browserStorage'

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
