import { describe, expect, it } from 'vitest'
import { createSeededRng, mixSeed } from '../seededRng'

describe('createSeededRng', () => {
  it('yields the same sequence for the same seed', () => {
    const a = createSeededRng(12345)
    const b = createSeededRng(12345)
    expect(Array.from({ length: 20 }, a)).toEqual(Array.from({ length: 20 }, b))
  })

  it('yields a different sequence for a different seed', () => {
    const a = createSeededRng(1)
    const b = createSeededRng(2)
    expect(Array.from({ length: 20 }, a)).not.toEqual(Array.from({ length: 20 }, b))
  })

  it('stays inside [0, 1)', () => {
    const rng = createSeededRng(99)
    for (let i = 0; i < 500; i++) {
      const value = rng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
      expect(Number.isFinite(value)).toBe(true)
    }
  })

  it('gives two generators independent state', () => {
    const a = createSeededRng(7)
    const b = createSeededRng(7)
    a()
    a()
    expect(b()).toEqual(createSeededRng(7)())
  })
})

describe('mixSeed', () => {
  it('is pure, order-sensitive, and always a non-negative 32-bit integer', () => {
    expect(mixSeed(1, 2, 3)).toEqual(mixSeed(1, 2, 3))
    expect(mixSeed(1, 2, 3)).not.toEqual(mixSeed(3, 2, 1))
    const seed = mixSeed(4, 0, 11)
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThan(2 ** 32)
  })
})
