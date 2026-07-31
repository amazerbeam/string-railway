import { describe, expect, it } from 'vitest'
import {
  EPSILON,
  arcLength,
  crossings,
  segmentsCrossTransversally,
  selfIntersects,
} from '../geometry'
import type { Point, Segment } from '../types'

const p = (x: number, y: number): Point => ({ x, y })

describe('arcLength', () => {
  it('sums segment lengths along a polyline', () => {
    expect(arcLength([p(0, 0), p(3, 4), p(3, 14)])).toBe(15)
  })

  it('returns 0 for a single point and for an empty path', () => {
    expect(arcLength([p(1, 1)])).toBe(0)
    expect(arcLength([])).toBe(0)
  })

  it('ignores a duplicated consecutive point rather than producing NaN', () => {
    expect(arcLength([p(0, 0), p(0, 0), p(3, 4)])).toBe(5)
  })
})

describe('segmentsCrossTransversally (M8)', () => {
  const horizontal: Segment = { a: p(0, 0), b: p(10, 0) }

  it('returns the intersection point for a clean X crossing', () => {
    const vertical: Segment = { a: p(5, -5), b: p(5, 5) }
    expect(segmentsCrossTransversally(horizontal, vertical)).toEqual(p(5, 0))
  })

  it('returns null for a segment that touches and returns to the same side', () => {
    const touching: Segment = { a: p(5, 0), b: p(8, 3) }
    expect(segmentsCrossTransversally(horizontal, touching)).toBeNull()
  })

  it('returns null for collinear overlap', () => {
    const collinear: Segment = { a: p(3, 0), b: p(7, 0) }
    expect(segmentsCrossTransversally(horizontal, collinear)).toBeNull()
  })

  it('returns null for parallel non-touching segments', () => {
    const parallel: Segment = { a: p(0, 1), b: p(10, 1) }
    expect(segmentsCrossTransversally(horizontal, parallel)).toBeNull()
  })

  it('treats a deviation below EPSILON as non-transversal', () => {
    const grazing: Segment = { a: p(5, -EPSILON / 2), b: p(6, EPSILON / 2) }
    expect(segmentsCrossTransversally(horizontal, grazing)).toBeNull()
  })
})

describe('selfIntersects', () => {
  it('detects a figure-eight', () => {
    expect(selfIntersects([p(0, 0), p(10, 10), p(10, 0), p(0, 10)])).toBe(true)
  })

  it('does not flag adjacent segments sharing an endpoint', () => {
    expect(selfIntersects([p(0, 0), p(5, 0), p(5, 5)])).toBe(false)
  })

  it('does not flag a tight switchback that touches without crossing', () => {
    expect(selfIntersects([p(0, 0), p(10, 0), p(10, 1), p(0, 1)])).toBe(false)
  })
})

describe('crossings (M8)', () => {
  const straight = [p(0, 0), p(20, 0)]

  it('counts each intersection point separately', () => {
    const zigzag = [p(5, -5), p(5, 5), p(15, 5), p(15, -5)]
    expect(crossings(straight, zigzag)).toHaveLength(2)
  })

  it('returns an empty array for a path that touches and returns to the same side', () => {
    const tangent = [p(5, -5), p(10, 0), p(15, -5)]
    expect(crossings(straight, tangent)).toEqual([])
  })

  it('returns the crossing coordinates, not just a count', () => {
    const vertical = [p(8, -3), p(8, 3)]
    expect(crossings(straight, vertical)).toEqual([p(8, 0)])
  })
})
