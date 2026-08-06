import { describe, expect, it } from 'vitest'
import { hexBoardMetrics, hexPlacement } from '../hexLayout'

describe('hexBoardMetrics', () => {
  it('reports a wider-than-tall rhombus', () => {
    const m = hexBoardMetrics(11)
    expect(m.widthUnits).toBeGreaterThan(m.heightUnits)
    expect(m.aspectRatio).toBeCloseTo(m.widthUnits / m.heightUnits)
  })

  it('never divides by zero on a degenerate size', () => {
    for (const size of [0, -1]) {
      const m = hexBoardMetrics(size)
      expect(Number.isFinite(m.aspectRatio)).toBe(true)
      expect(m.aspectRatio).toBeGreaterThan(0)
    }
  })
})

describe('hexPlacement — orientation', () => {
  it('puts the player base at the bottom and the cpu base at the top', () => {
    const player = hexPlacement({ q: 0, r: 0 }, 11)
    const cpu = hexPlacement({ q: 10, r: 10 }, 11)
    expect(player.yFraction).toBeGreaterThan(cpu.yFraction)
  })

  it('makes the player base the leftmost cell on the board', () => {
    const player = hexPlacement({ q: 0, r: 0 }, 11)
    for (let q = 0; q < 11; q++) {
      for (let r = 0; r < 11; r++) {
        expect(hexPlacement({ q, r }, 11).xFraction).toBeGreaterThanOrEqual(player.xFraction)
      }
    }
  })

  it('leans rows to the right as they climb', () => {
    const low = hexPlacement({ q: 0, r: 0 }, 11)
    const high = hexPlacement({ q: 0, r: 10 }, 11)
    expect(high.xFraction).toBeGreaterThan(low.xFraction)
    expect(high.yFraction).toBeLessThan(low.yFraction)
  })
})

describe('hexPlacement — containment and safety', () => {
  it('keeps every cell centre inside the bounding box and finite', () => {
    for (const size of [1, 5, 11]) {
      for (let q = 0; q < size; q++) {
        for (let r = 0; r < size; r++) {
          const p = hexPlacement({ q, r }, size)
          expect(Number.isFinite(p.xFraction)).toBe(true)
          expect(Number.isFinite(p.yFraction)).toBe(true)
          expect(p.xFraction).toBeGreaterThan(0)
          expect(p.xFraction).toBeLessThan(1)
          expect(p.yFraction).toBeGreaterThan(0)
          expect(p.yFraction).toBeLessThan(1)
        }
      }
    }
  })
})
