import { describe, expect, it } from 'vitest'
import {
  endsOn,
  entryCount,
  passesThrough,
  pathFullyInside,
  pointInAnyRect,
  pointTouchesPath,
  rectFullyInside,
  rectsOverlapOrTouch,
  touchesPath,
  touchesRect,
} from '../containment'
import type { Point, Polyline, Rect } from '../types'

const p = (x: number, y: number): Point => ({ x, y })
const r = (x: number, y: number, size = 20): Rect => ({ x, y, width: size, height: size })
const SQUARE = [p(0, 0), p(100, 0), p(100, 100), p(0, 100)] // closed loop, implicit last edge

describe('rectsOverlapOrTouch', () => {
  it('is true for overlapping rects', () => {
    expect(rectsOverlapOrTouch(r(0, 0), r(10, 10))).toBe(true)
  })

  it('is true for rects sharing exactly one edge', () => {
    expect(rectsOverlapOrTouch(r(0, 0), r(20, 0))).toBe(true)
  })

  it('is false for separated rects', () => {
    expect(rectsOverlapOrTouch(r(0, 0), r(21, 0))).toBe(false)
  })
})

describe('rectFullyInside', () => {
  it('is true when the whole rect is within the loop', () => {
    expect(rectFullyInside(r(40, 40), SQUARE)).toBe(true)
  })

  it('is false when the rect straddles the loop boundary', () => {
    expect(rectFullyInside(r(95, 40), SQUARE)).toBe(false)
  })

  it('is false when the rect is entirely outside', () => {
    expect(rectFullyInside(r(200, 200), SQUARE)).toBe(false)
  })
})

describe('pathFullyInside (M7)', () => {
  it('is true for a path that stays within the loop', () => {
    expect(pathFullyInside([p(10, 10), p(90, 90)], SQUARE)).toBe(true)
  })

  it('is false for a path that leaves and re-enters', () => {
    expect(pathFullyInside([p(10, 50), p(150, 50), p(90, 90)], SQUARE)).toBe(false)
  })
})

describe('pointInAnyRect', () => {
  it('is true when the point falls inside one of the rects', () => {
    expect(pointInAnyRect(p(45, 45), [r(0, 0), r(40, 40)])).toBe(true)
  })

  it('is true on a rect boundary — an on-edge crossing is still on the card', () => {
    expect(pointInAnyRect(p(40, 45), [r(40, 40)])).toBe(true)
  })

  it('is false when no rect contains it, and for an empty list', () => {
    expect(pointInAnyRect(p(300, 300), [r(0, 0)])).toBe(false)
    expect(pointInAnyRect(p(5, 5), [])).toBe(false)
  })
})

describe('touchesRect', () => {
  it('is true when the path enters the rect', () => {
    expect(touchesRect([p(30, 50), p(50, 50)], r(40, 40), 0.5)).toBe(true)
  })

  it('is true when the path ends exactly on the rect edge', () => {
    expect(touchesRect([p(20, 50), p(40, 50)], r(40, 40), 0.5)).toBe(true)
  })

  it('is false when the path passes near but outside the tolerance', () => {
    expect(touchesRect([p(0, 50), p(35, 50)], r(40, 40), 0.5)).toBe(false)
  })

  it('sees a single-point path that sits inside the rect (FIX 8 — no segment to iterate)', () => {
    expect(touchesRect([p(45, 45)], r(40, 40), 0.5)).toBe(true)
  })

  it('sees a single-point path within tolerance of the rect edge', () => {
    expect(touchesRect([p(39.7, 45)], r(40, 40), 0.5)).toBe(true)
  })

  it('is false for a single-point path clearly outside the rect and its tolerance', () => {
    expect(touchesRect([p(0, 0)], r(40, 40), 0.5)).toBe(false)
  })

  it('is false for an empty path', () => {
    expect(touchesRect([], r(40, 40), 0.5)).toBe(false)
  })
})

describe('touchesPath', () => {
  it('is true for a near-parallel pair within tolerance', () => {
    const a: Polyline = [p(0, 100), p(100, 100)]
    const b: Polyline = [p(0, 100.3), p(100, 100.3)]
    expect(touchesPath(a, b, 0.5)).toBe(true)
  })

  it('is false for a clearly separated pair', () => {
    const a: Polyline = [p(0, 100), p(100, 100)]
    const b: Polyline = [p(0, 110), p(100, 110)]
    expect(touchesPath(a, b, 0.5)).toBe(false)
  })

  it('is true for a transversally-crossing pair — touchesPath is a pure closeness predicate, not a legality decision', () => {
    // A genuine crossing is a touch too (distance 0), same as touchesRect
    // treating an entered rect as a touch. Distinguishing a legitimate
    // crossing (scored, §10.3) from a degenerate near-miss (rejected, check
    // 10) is the caller's job — validate.ts does it by separately checking
    // `crossings` before calling this.
    const a: Polyline = [p(0, 0), p(100, 100)]
    const b: Polyline = [p(0, 100), p(100, 0)]
    expect(touchesPath(a, b, 0.5)).toBe(true)
  })
})

describe('pointOnSegment normalisation at realistic board scale (FIX 5)', () => {
  it('treats a point exactly on a large-scale, non-axis-aligned loop edge as inside (boundary-inclusive)', () => {
    // At small, exact-integer scale a raw (un-normalised) cross product for a
    // point mathematically on the line is exactly zero, so this bug is
    // invisible there. These coordinates were found by search specifically
    // because, at ~4000-unit board scale (SCRUM-3a's suggested M2 range), the
    // pre-fix RAW cross product for boundaryPoint exceeds EPSILON even
    // though it lies exactly on edge A-B — pathFullyInside would then
    // wrongly report it as outside the loop.
    const A: Point = p(3932.1522090029075, 2032.9302486745887)
    const B: Point = p(-2727.499885924824, -1333.8368054710238)
    const C: Point = p(-1754.410776362887, 5011.3031880511935)
    const loop: Polyline = [A, B, C]
    const t = 0.4760320206194544
    const boundaryPoint = p(A.x + t * (B.x - A.x), A.y + t * (B.y - A.y))
    const interiorPoint = p((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3)

    expect(pathFullyInside([interiorPoint, boundaryPoint], loop)).toBe(true)
  })
})

describe('entryCount (criterion 3)', () => {
  it('counts one entry for a straight pass through', () => {
    expect(entryCount([p(30, 50), p(70, 50)], r(40, 40))).toBe(1)
  })

  it('counts one entry for a path that grazes the same edge twice in one pass', () => {
    const grazing = [p(30, 40), p(45, 39), p(50, 41), p(55, 39), p(70, 40)]
    expect(entryCount(grazing, r(40, 40))).toBe(1)
  })

  it('counts two entries for a path that leaves the rect and comes back', () => {
    const inOutIn = [p(45, 45), p(45, 20), p(55, 20), p(55, 45)]
    expect(entryCount(inOutIn, r(40, 40))).toBe(2)
  })

  it('counts zero for a path that never reaches the rect', () => {
    expect(entryCount([p(0, 0), p(10, 10)], r(40, 40))).toBe(0)
  })
})

describe('passesThrough / endsOn (Terminus, §5.3)', () => {
  it('reports a mid-path traversal as passing through', () => {
    const through = [p(30, 50), p(70, 50)]
    expect(passesThrough(through, r(40, 40))).toBe(true)
    expect(endsOn(through, r(40, 40))).toBe(false)
  })

  it('reports a path ending inside the rect as ending on it, not passing through', () => {
    const ending = [p(20, 50), p(45, 50)]
    expect(endsOn(ending, r(40, 40))).toBe(true)
    expect(passesThrough(ending, r(40, 40))).toBe(false)
  })

  it('reports a path with both endpoints on the rect as ending on it', () => {
    const both = [p(42, 42), p(58, 58)]
    expect(endsOn(both, r(40, 40))).toBe(true)
    expect(passesThrough(both, r(40, 40))).toBe(false)
  })
})

describe('pointTouchesPath', () => {
  const line: Polyline = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]

  it('is true for a point exactly on the path', () => {
    expect(pointTouchesPath({ x: 50, y: 0 }, line, 0.5)).toBe(true)
  })

  it('is true for a point within tolerance', () => {
    expect(pointTouchesPath({ x: 50, y: 0.4 }, line, 0.5)).toBe(true)
  })

  it('is false for a point beyond tolerance', () => {
    expect(pointTouchesPath({ x: 50, y: 5 }, line, 0.5)).toBe(false)
  })

  it('is inclusive at exactly the tolerance', () => {
    expect(pointTouchesPath({ x: 50, y: 0.5 }, line, 0.5)).toBe(true)
  })

  it('clamps to the segment extent rather than the infinite line', () => {
    expect(pointTouchesPath({ x: 200, y: 0 }, line, 0.5)).toBe(false)
  })

  it('is false for an empty path rather than throwing', () => {
    expect(pointTouchesPath({ x: 0, y: 0 }, [], 0.5)).toBe(false)
  })

  it('handles a single-point path as plain point distance', () => {
    const single: Polyline = [{ x: 10, y: 10 }]
    expect(pointTouchesPath({ x: 10, y: 10.2 }, single, 0.5)).toBe(true)
    expect(pointTouchesPath({ x: 10, y: 20 }, single, 0.5)).toBe(false)
  })

  it('measures the wrap edge only when the caller closes the loop themselves', () => {
    // SQUARE is corners-only, so its (0,100)->(0,0) edge exists only once the
    // caller appends the first point back. The predicate is deliberately OPEN
    // (setup generation relies on that), so the same point answers differently
    // depending on which polyline it is handed.
    const onWrapEdge = p(0, 50)
    expect(pointTouchesPath(onWrapEdge, SQUARE, 0.5)).toBe(false)
    expect(pointTouchesPath(onWrapEdge, [...SQUARE, SQUARE[0]], 0.5)).toBe(true)
  })
})
