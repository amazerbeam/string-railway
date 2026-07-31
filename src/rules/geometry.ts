import type { Point, Polyline, Segment } from './types'

/**
 * Unitless float-noise guard for cross-product sign tests. This is numeric
 * robustness, NOT a tuning lever — the geometric threshold that is one is
 * RulesConfig.tangencyTolerance (M8), applied at validation time.
 */
export const EPSILON = 1e-9

/** §10.1 — the M6 fixed-length check. Sums segment lengths; a duplicated
 *  consecutive point contributes a zero-length segment rather than NaN. */
export function arcLength(path: Polyline): number {
  let total = 0
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1]
    const curr = path[i]
    total += Math.hypot(curr.x - prev.x, curr.y - prev.y)
  }
  return total
}

/**
 * M8 — transversal crossing only. Returns the intersection point when each
 * segment strictly straddles the other's line, and null for tangency,
 * collinearity, a shared endpoint, or any near-touch within EPSILON.
 *
 * Implementation: a signed-area (cross-product) sign test. Segment `a`
 * crosses segment `b` transversally only if b's two endpoints fall on
 * strictly opposite sides of a's line, AND a's two endpoints fall on
 * strictly opposite sides of b's line. Any signed area within EPSILON of
 * zero is treated as "on the line" rather than to either side, which is
 * what makes a tangency (touch-and-return-to-same-side) resolve to null.
 */
export function segmentsCrossTransversally(a: Segment, b: Segment): Point | null {
  const d1x = a.b.x - a.a.x
  const d1y = a.b.y - a.a.y
  const d2x = b.b.x - b.a.x
  const d2y = b.b.y - b.a.y
  const len1 = Math.hypot(d1x, d1y)
  const len2 = Math.hypot(d2x, d2y)

  // A zero-length segment cannot cross anything transversally. Guard the
  // divisor up front so a degenerate pair cannot poison a later coordinate.
  if (len1 < EPSILON || len2 < EPSILON) {
    return null
  }

  const cross = (px: number, py: number, qx: number, qy: number): number => px * qy - py * qx

  // Signed perpendicular distance (cross product normalised by the tested
  // segment's own length) of each of the other segment's endpoints from the
  // line through this segment. Normalising keeps EPSILON comparable across
  // segments of very different lengths — an un-normalised signed area scales
  // with segment length and would call a tiny real deviation "transversal"
  // on a long segment while missing it on a short one.
  const sideB1 = cross(d1x, d1y, b.a.x - a.a.x, b.a.y - a.a.y) / len1
  const sideB2 = cross(d1x, d1y, b.b.x - a.a.x, b.b.y - a.a.y) / len1
  const sideA1 = cross(d2x, d2y, a.a.x - b.a.x, a.a.y - b.a.y) / len2
  const sideA2 = cross(d2x, d2y, a.b.x - b.a.x, a.b.y - b.a.y) / len2

  const straddlesB =
    (sideB1 > EPSILON && sideB2 < -EPSILON) || (sideB1 < -EPSILON && sideB2 > EPSILON)
  const straddlesA =
    (sideA1 > EPSILON && sideA2 < -EPSILON) || (sideA1 < -EPSILON && sideA2 > EPSILON)

  if (!straddlesB || !straddlesA) {
    return null
  }

  // Denominator is the cross product of the two direction vectors. Guard it
  // before dividing — parallel/near-parallel lines would otherwise poison
  // the intersection point with NaN or a wildly inaccurate coordinate.
  const denom = cross(d1x, d1y, d2x, d2y)
  if (Math.abs(denom) < EPSILON) {
    return null
  }

  const t = cross(b.a.x - a.a.x, b.a.y - a.a.y, d2x, d2y) / denom
  return { x: a.a.x + t * d1x, y: a.a.y + t * d1y }
}

/** §10.1 — used for the border, river, mountain, and every railway string.
 *  Walks every non-adjacent segment pair and delegates to
 *  segmentsCrossTransversally; adjacent segments share an endpoint by
 *  construction and are skipped rather than re-derived. */
export function selfIntersects(path: Polyline): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const segA: Segment = { a: path[i], b: path[i + 1] }
    for (let j = i + 2; j < path.length - 1; j++) {
      const segB: Segment = { a: path[j], b: path[j + 1] }
      if (segmentsCrossTransversally(segA, segB) !== null) {
        return true
      }
    }
  }
  return false
}

/** Every transversal intersection point, one entry per point. The page-7 example
 *  scores −2 for two crossings of one string, so a boolean here under-counts.
 *  Takes two whole polylines rather than a running accumulator so SCRUM-6 can
 *  later call this with a single newest segment against each existing path. */
export function crossings(newPath: Polyline, existing: Polyline): Point[] {
  const points: Point[] = []
  for (let i = 0; i < newPath.length - 1; i++) {
    const segNew: Segment = { a: newPath[i], b: newPath[i + 1] }
    for (let j = 0; j < existing.length - 1; j++) {
      const segExisting: Segment = { a: existing[j], b: existing[j + 1] }
      const point = segmentsCrossTransversally(segNew, segExisting)
      if (point !== null) {
        points.push(point)
      }
    }
  }
  return points
}
