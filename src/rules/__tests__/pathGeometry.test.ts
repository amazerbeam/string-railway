import { describe, expect, it } from 'vitest'
import { PATH_KIND } from '../../constants/game'
import { crossings } from '../geometry'
import { closeLoop, edgePolyline, isClosedPathKind } from '../pathGeometry'
import { makePath } from './fixtures'
import type { Polyline } from '../types'

const p = (x: number, y: number) => ({ x, y })

/** Corners only, no repeated closing point — the SQUARE convention used across
 *  containment.test.ts and fixtures.ts. Its closing edge is the left wall,
 *  (0,100) back to (0,0). */
const SQUARE: Polyline = [p(0, 0), p(100, 0), p(100, 100), p(0, 100)]

describe('isClosedPathKind', () => {
  it('is true for the two terrain loops (§4.1 steps 2 and 4)', () => {
    expect(isClosedPathKind(PATH_KIND.BORDER)).toBe(true)
    expect(isClosedPathKind(PATH_KIND.MOUNTAIN)).toBe(true)
  })

  it('is false for the river (§4.1 step 3) and both railway kinds', () => {
    expect(isClosedPathKind(PATH_KIND.RIVER)).toBe(false)
    expect(isClosedPathKind(PATH_KIND.SHORT_RAIL)).toBe(false)
    expect(isClosedPathKind(PATH_KIND.LONG_RAIL)).toBe(false)
  })
})

describe('closeLoop', () => {
  it('repeats the first point so the closing edge becomes walkable', () => {
    expect(closeLoop(SQUARE)).toEqual([...SQUARE, p(0, 0)])
  })

  it('returns an empty loop unchanged', () => {
    expect(closeLoop([])).toEqual([])
  })

  it('returns a single point unchanged rather than manufacturing a zero-length segment', () => {
    const single: Polyline = [p(5, 5)]
    expect(closeLoop(single)).toEqual(single)
  })

  it('wraps a two-point loop into a there-and-back pair', () => {
    expect(closeLoop([p(0, 0), p(10, 0)])).toEqual([p(0, 0), p(10, 0), p(0, 0)])
  })
})

describe('edgePolyline', () => {
  it('wraps a BORDER path', () => {
    expect(edgePolyline(makePath(PATH_KIND.BORDER, SQUARE))).toEqual([...SQUARE, p(0, 0)])
  })

  it('wraps a MOUNTAIN path', () => {
    expect(edgePolyline(makePath(PATH_KIND.MOUNTAIN, SQUARE))).toEqual([...SQUARE, p(0, 0)])
  })

  it('returns the stored array BY REFERENCE for an open kind, so calling it costs nothing on a rail', () => {
    const river = makePath(PATH_KIND.RIVER, SQUARE)
    const rail = makePath(PATH_KIND.SHORT_RAIL, SQUARE)
    expect(edgePolyline(river)).toBe(river.path)
    expect(edgePolyline(rail)).toBe(rail.path)
  })

  it('makes the closing edge visible to an edge-walking predicate (SCRUM-16)', () => {
    // The whole bug in one assertion. crossings() iterates `j < other.length - 1`,
    // so on the stored array it never reaches the closing edge — the left wall
    // at x = 0 — and reports no crossing for a segment that plainly cuts it.
    const border = makePath(PATH_KIND.BORDER, SQUARE)
    const acrossTheClosingEdge: Polyline = [p(-10, 50), p(10, 50)]

    expect(crossings(acrossTheClosingEdge, border.path)).toHaveLength(0)
    expect(crossings(acrossTheClosingEdge, edgePolyline(border))).toHaveLength(1)
  })
})
