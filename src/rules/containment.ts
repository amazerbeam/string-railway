import { EPSILON, segmentsCrossTransversally } from './geometry'
import type { Point, Polyline, Rect, Segment } from './types'

/** The four corners of an axis-aligned rect, in winding order (SCRUM-5's scope
 *  boundary: cards are square, so orientation is not meaningful for legality —
 *  Rect here is always axis-aligned, never §10's OrientedRect). */
function rectCorners(rect: Rect): readonly Point[] {
  const { x, y, width, height } = rect
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ]
}

/** The edges of a closed polyline loop, wrapping the last point back to the
 *  first — SQUARE-style fixtures give points without a repeated closing point. */
function loopEdges(loop: Polyline): readonly Segment[] {
  const edges: Segment[] = []
  for (let i = 0; i < loop.length; i++) {
    edges.push({ a: loop[i], b: loop[(i + 1) % loop.length] })
  }
  return edges
}

function rectEdges(rect: Rect): readonly Segment[] {
  return loopEdges(rectCorners(rect))
}

/** Inclusive point-in-rect test — a point exactly on a rect edge counts as on
 *  the card (pointInAnyRect's stated boundary case). */
function pointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

/** True if `point` lies on `segment`, inclusive of its own endpoints. This is a
 *  different predicate from geometry.ts's segmentsCrossTransversally (which
 *  deliberately returns null for a touch) — it is the "is this point on this
 *  edge" test the polygon boundary-inclusion check below needs, so it is
 *  written locally rather than stretched out of the transversal-only helper. */
function pointOnSegment(point: Point, segment: Segment): boolean {
  const dx = segment.b.x - segment.a.x
  const dy = segment.b.y - segment.a.y
  const len = Math.hypot(dx, dy)
  if (len < EPSILON) {
    // Degenerate (zero-length) segment: no direction to normalise a cross
    // product against, so "on the segment" collapses to "equals its own
    // single point".
    return Math.hypot(point.x - segment.a.x, point.y - segment.a.y) <= EPSILON
  }
  // Normalised by the segment's own length before comparing to EPSILON — the
  // same reasoning as geometry.ts's segmentsCrossTransversally: a raw signed
  // area scales with segment length, so at realistic (thousands-of-units)
  // board scale an un-normalised cross product can exceed EPSILON for a
  // point that is mathematically exactly on the line, silently falling
  // through to the strict interior ray-cast for what should be a
  // boundary-inclusive hit (pointInPolygon, feeding rectFullyInside's M11
  // mountain containment and pathFullyInside's M7 border containment).
  const cross = (dx * (point.y - segment.a.y) - dy * (point.x - segment.a.x)) / len
  if (Math.abs(cross) > EPSILON) {
    return false
  }
  return (
    point.x >= Math.min(segment.a.x, segment.b.x) - EPSILON &&
    point.x <= Math.max(segment.a.x, segment.b.x) + EPSILON &&
    point.y >= Math.min(segment.a.y, segment.b.y) - EPSILON &&
    point.y <= Math.max(segment.a.y, segment.b.y) + EPSILON
  )
}

/** Standard ray-cast point-in-polygon, strict interior only (boundary is
 *  handled separately by pointOnSegment so this never divides by a
 *  horizontal edge's zero delta-y — the y-mismatch guard skips it first). */
function pointStrictlyInPolygon(point: Point, loop: Polyline): boolean {
  let inside = false
  const n = loop.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = loop[i]
    const pj = loop[j]
    if (pi.y > point.y !== pj.y > point.y) {
      const xCross = pi.x + ((point.y - pi.y) / (pj.y - pi.y)) * (pj.x - pi.x)
      if (point.x < xCross) {
        inside = !inside
      }
    }
  }
  return inside
}

/** Point-in-loop, inclusive of the loop's own boundary. */
function pointInPolygon(point: Point, loop: Polyline): boolean {
  if (loopEdges(loop).some((edge) => pointOnSegment(point, edge))) {
    return true
  }
  return pointStrictlyInPolygon(point, loop)
}

/** §10.1 — "does not touch any other station": true for overlap AND for a
 *  shared edge. A card sharing an edge with another is illegal, not legal. */
export function rectsOverlapOrTouch(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height
  )
}

/** §10.1 — "fully within the border string" / the mountain-containment test.
 *  Four-corners-inside alone would pass a rect a concave loop cuts through, so
 *  this also requires no loop edge to cross any rect edge transversally.
 *  `loop` takes a PlacedPath's stored corners-only `path` — loopEdges wraps it
 *  here, so do NOT pass edgePolyline's already-wrapped result (SCRUM-16). */
export function rectFullyInside(rect: Rect, loop: Polyline): boolean {
  if (!rectCorners(rect).every((corner) => pointInPolygon(corner, loop))) {
    return false
  }
  const rEdges = rectEdges(rect)
  const lEdges = loopEdges(loop)
  for (const rectEdge of rEdges) {
    for (const loopEdge of lEdges) {
      if (segmentsCrossTransversally(rectEdge, loopEdge) !== null) {
        return false
      }
    }
  }
  return true
}

/** §10.1 (M7) — every point of the path stays within the loop, and no path
 *  segment crosses the loop boundary (a leave-and-re-enter that happens to
 *  land back inside without a vertex ever outside would otherwise slip past
 *  a points-only check).
 *  `path` is edge-walked and must be wrapped by the caller if it is a loop;
 *  `loop` takes the stored corners-only form and is wrapped here (SCRUM-16). */
export function pathFullyInside(path: Polyline, loop: Polyline): boolean {
  if (!path.every((point) => pointInPolygon(point, loop))) {
    return false
  }
  const lEdges = loopEdges(loop)
  for (let i = 0; i < path.length - 1; i++) {
    const segment: Segment = { a: path[i], b: path[i + 1] }
    for (const loopEdge of lEdges) {
      if (segmentsCrossTransversally(segment, loopEdge) !== null) {
        return false
      }
    }
  }
  return true
}

/** §10.1 — exempts crossings that occur on top of a station card. */
export function pointInAnyRect(point: Point, rects: readonly Rect[]): boolean {
  return rects.some((rect) => pointInRect(point, rect))
}

/**
 * §10.1-adjacent — point-to-polyline closeness, inclusive of `tolerance`.
 * Needed by setup generation's "exactly one end of the river touches the
 * border" check (SCRUM-4 AC6): touchesPath answers the question for two
 * polylines, and a single point is not a polyline.
 *
 * Treats the polyline as OPEN — it does not wrap the last point back to the
 * first. A caller testing a closed loop passes the loop and gets its edges as
 * written; setup's border loop is tested by appending its first point, which
 * keeps the wrap decision at the call site rather than hidden here.
 */
export function pointTouchesPath(point: Point, other: Polyline, tolerance: number): boolean {
  if (other.length === 0) {
    return false
  }
  if (other.length === 1) {
    return Math.hypot(point.x - other[0].x, point.y - other[0].y) <= tolerance
  }
  for (let i = 0; i < other.length - 1; i++) {
    const segment: Segment = { a: other[i], b: other[i + 1] }
    if (distancePointToSegment(point, segment) <= tolerance) {
      return true
    }
  }
  return false
}

/** Closest-approach distance from a point to a segment, clamped to the
 *  segment's own extent. A zero-length segment (lenSq below EPSILON) falls
 *  back to plain point distance rather than dividing by zero. */
function distancePointToSegment(point: Point, segment: Segment): number {
  const dx = segment.b.x - segment.a.x
  const dy = segment.b.y - segment.a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq < EPSILON) {
    return Math.hypot(point.x - segment.a.x, point.y - segment.a.y)
  }
  const t = Math.max(
    0,
    Math.min(1, ((point.x - segment.a.x) * dx + (point.y - segment.a.y) * dy) / lenSq),
  )
  return Math.hypot(point.x - (segment.a.x + t * dx), point.y - (segment.a.y + t * dy))
}

/** Closest-approach distance between two segments known NOT to intersect —
 *  the classical result that a non-intersecting pair's minimum distance is
 *  always attained at one of the four endpoints, never at two interior points. */
function segmentToSegmentDistance(a: Segment, b: Segment): number {
  return Math.min(
    distancePointToSegment(a.a, b),
    distancePointToSegment(a.b, b),
    distancePointToSegment(b.a, a),
    distancePointToSegment(b.b, a),
  )
}

/** True if `segment` overlaps or touches the filled rect at all — an endpoint
 *  inside/on the rect, or a genuine transversal crossing of one of its edges. */
function segmentIntersectsRect(segment: Segment, rect: Rect): boolean {
  if (pointInRect(segment.a, rect) || pointInRect(segment.b, rect)) {
    return true
  }
  return rectEdges(rect).some((edge) => segmentsCrossTransversally(segment, edge) !== null)
}

/** Shortest distance from `segment` to the filled rect: 0 on any overlap or
 *  touch, otherwise the minimum distance to the rect's boundary — which,
 *  because the rect is convex and the pair does not intersect, is the min
 *  across its four edges of the non-intersecting segment-to-segment distance. */
function distanceSegmentToRect(segment: Segment, rect: Rect): number {
  if (segmentIntersectsRect(segment, rect)) {
    return 0
  }
  return Math.min(...rectEdges(rect).map((edge) => segmentToSegmentDistance(segment, edge)))
}

/** Shortest distance between two segments, 0 if they touch or cross at all —
 *  the segment-to-segment analogue of distanceSegmentToRect, needed because
 *  segmentToSegmentDistance's own contract assumes a non-intersecting pair. */
function segmentDistanceAllowingIntersection(a: Segment, b: Segment): number {
  if (segmentsCrossTransversally(a, b) !== null) {
    return 0
  }
  return segmentToSegmentDistance(a, b)
}

/** §10.2 check 10 (M8) — polyline-to-polyline analogue of touchesRect, built
 *  from the same segment-to-segment distance primitive. True on any overlap,
 *  any genuine transversal crossing, or any approach within `tolerance` —
 *  a pure geometric closeness test. It does NOT itself distinguish a
 *  legitimate crossing (scored, per §10.3) from a degenerate near-miss
 *  (rejected, per check 10): callers that need that distinction query
 *  `crossings` (geometry.ts) separately and gate on it, the same way
 *  check 10's station half gates on `entryCount > 0`. */
export function touchesPath(path: Polyline, other: Polyline, tolerance: number): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const segment: Segment = { a: path[i], b: path[i + 1] }
    for (let j = 0; j < other.length - 1; j++) {
      const otherSegment: Segment = { a: other[j], b: other[j + 1] }
      if (segmentDistanceAllowingIntersection(segment, otherSegment) <= tolerance) {
        return true
      }
    }
  }
  return false
}

/** §10.1 — string↔station connection, and the station-placement "does not
 *  touch any string" test. `tolerance` is the caller's config.tangencyTolerance
 *  (M8) or another world-unit value — never a default held here. */
export function touchesRect(path: Polyline, rect: Rect, tolerance: number): boolean {
  if (path.length === 0) {
    return false
  }
  if (path.length === 1) {
    // No segment to iterate — a single-point path can still legitimately
    // touch the rect (inside it, or within tolerance of an edge).
    const [point] = path
    return (
      pointInRect(point, rect) ||
      rectEdges(rect).some((edge) => distancePointToSegment(point, edge) <= tolerance)
    )
  }
  for (let i = 0; i < path.length - 1; i++) {
    const segment: Segment = { a: path[i], b: path[i + 1] }
    if (distanceSegmentToRect(segment, rect) <= tolerance) {
      return true
    }
  }
  return false
}

/** Liang-Barsky clip of `segment` against the filled rect: the sub-interval of
 *  t in [0, 1] where the segment lies inside-or-on the rect, or null if it
 *  never does. Convexity guarantees at most one such interval per segment. */
function clipSegmentToRect(segment: Segment, rect: Rect): { tEnter: number; tExit: number } | null {
  const dx = segment.b.x - segment.a.x
  const dy = segment.b.y - segment.a.y
  const planes: ReadonlyArray<readonly [number, number]> = [
    [-dx, segment.a.x - rect.x],
    [dx, rect.x + rect.width - segment.a.x],
    [-dy, segment.a.y - rect.y],
    [dy, rect.y + rect.height - segment.a.y],
  ]

  let tEnter = 0
  let tExit = 1
  for (const [p, q] of planes) {
    if (Math.abs(p) < EPSILON) {
      if (q < -EPSILON) {
        return null // parallel to this boundary and entirely on its outside
      }
      continue
    }
    const r = q / p
    if (p < 0) {
      if (r > tExit) return null
      if (r > tEnter) tEnter = r
    } else {
      if (r < tEnter) return null
      if (r < tExit) tExit = r
    }
  }
  return tEnter > tExit ? null : { tEnter, tExit }
}

/** One entry per maximal contiguous run of the path inside-or-on the rect,
 *  tagged with whether that run touches the path's own start/end vertex.
 *  Shared by entryCount and passesThrough so the two agree on what a "run" is. */
function computeRuns(
  path: Polyline,
  rect: Rect,
): ReadonlyArray<{ readonly touchesStart: boolean; readonly touchesEnd: boolean }> {
  if (path.length === 0) {
    return []
  }
  const n = path.length
  const insideVertex = path.map((point) => pointInRect(point, rect))
  const runs: Array<{ touchesStart: boolean; touchesEnd: boolean }> = []
  let current: { touchesStart: boolean; touchesEnd: boolean } | null = insideVertex[0]
    ? { touchesStart: true, touchesEnd: n === 1 }
    : null

  for (let i = 0; i < n - 1; i++) {
    const aIn = insideVertex[i]
    const bIn = insideVertex[i + 1]
    const isLastSegment = i === n - 2

    if (aIn && bIn) {
      if (current && isLastSegment) {
        current.touchesEnd = true
      }
      continue
    }
    if (aIn && !bIn) {
      if (current) {
        runs.push(current)
        current = null
      }
      continue
    }
    if (!aIn && bIn) {
      current = { touchesStart: false, touchesEnd: isLastSegment }
      continue
    }
    // Both endpoints outside — the rect is convex, so the only way this
    // segment still touches it is a single self-contained dip in and out,
    // which is its own run untouched by either path endpoint.
    const segment: Segment = { a: path[i], b: path[i + 1] }
    const clip = clipSegmentToRect(segment, rect)
    if (clip !== null && clip.tExit > clip.tEnter + EPSILON) {
      runs.push({ touchesStart: false, touchesEnd: false })
    }
  }

  if (current) {
    runs.push(current)
  }
  return runs
}

/** §10.1 — "does not enter the same station more than once": contiguous runs
 *  of the path inside the rect, NOT raw boundary intersections. A string
 *  grazing an edge twice in one pass entered once. */
export function entryCount(path: Polyline, rect: Rect): number {
  return computeRuns(path, rect).length
}

/** §10.1 / §5.3 (Terminus) — true when some point of the path is inside the
 *  rect but does not belong to either endpoint's own contiguous run. */
export function passesThrough(path: Polyline, rect: Rect): boolean {
  return computeRuns(path, rect).some((run) => !run.touchesStart && !run.touchesEnd)
}

/** §10.1 / §5.3 (Terminus) — true when either of the path's own endpoints
 *  lies inside or on the rect. */
export function endsOn(path: Polyline, rect: Rect): boolean {
  if (path.length === 0) {
    return false
  }
  return pointInRect(path[0], rect) || pointInRect(path[path.length - 1], rect)
}
