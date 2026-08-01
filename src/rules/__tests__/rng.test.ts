import { describe, expect, it } from 'vitest'
import { createRng, hashSeed } from '../rng'

describe('createRng', () => {
  it('produces an identical stream for an identical seed (SCRUM-4 AC8)', () => {
    const a = createRng(12345)
    const b = createRng(12345)
    const drawA = Array.from({ length: 20 }, () => a.nextFloat())
    const drawB = Array.from({ length: 20 }, () => b.nextFloat())
    expect(drawA).toEqual(drawB)
  })

  it('produces different streams for different seeds', () => {
    const a = Array.from(
      { length: 10 },
      (
        (rng) => () =>
          rng.nextFloat()
      )(createRng(1)),
    )
    const b = Array.from(
      { length: 10 },
      (
        (rng) => () =>
          rng.nextFloat()
      )(createRng(2)),
    )
    expect(a).not.toEqual(b)
  })

  it('holds no module-level state — two instances are independent', () => {
    const a = createRng(7)
    const first = a.nextFloat()
    const b = createRng(7)
    expect(b.nextFloat()).toBe(first)
  })

  it('keeps nextFloat in [0, 1)', () => {
    const rng = createRng(99)
    for (let i = 0; i < 500; i++) {
      const value = rng.nextFloat()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('keeps nextInt in [0, maxExclusive)', () => {
    const rng = createRng(4)
    for (let i = 0; i < 200; i++) {
      const value = rng.nextInt(5)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(5)
    }
  })

  it('throws rather than returning NaN for a non-positive bound', () => {
    const rng = createRng(4)
    expect(() => rng.nextInt(0)).toThrow(/maxExclusive/)
    expect(() => rng.nextInt(-3)).toThrow(/maxExclusive/)
  })

  it('keeps nextRange within its half-open interval', () => {
    const rng = createRng(31)
    for (let i = 0; i < 200; i++) {
      const value = rng.nextRange(10, 20)
      expect(value).toBeGreaterThanOrEqual(10)
      expect(value).toBeLessThan(20)
    }
  })
})

describe('hashSeed', () => {
  it('is deterministic for the same text', () => {
    expect(hashSeed('interesting-board')).toBe(hashSeed('interesting-board'))
  })

  it('separates different text', () => {
    expect(hashSeed('a')).not.toBe(hashSeed('b'))
  })

  it('returns a finite 32-bit unsigned integer for any input, including empty', () => {
    for (const text of ['', 'x', '999999999999999999999', '🎲 seed']) {
      const seed = hashSeed(text)
      expect(Number.isInteger(seed)).toBe(true)
      expect(seed).toBeGreaterThanOrEqual(0)
      expect(seed).toBeLessThanOrEqual(0xffffffff)
    }
  })
})
