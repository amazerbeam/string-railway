import { PATH_KIND } from '../constants/game'
import type { PathKind, PlacedPath, Polyline } from './types'

/**
 * SCRUM-16 — the one place that knows whether a PlacedPath's stored `path` is a
 * ring or an arc.
 *
 * §4.1 steps 2 and 4 make the border and the mountain closed loops; §4.1 step 3
 * makes the river an open arc, and both railway kinds are open strings. Every
 * one of them is stored CORNERS-ONLY (see PlacedPath.path), so a predicate that
 * walks `points[i] -> points[i + 1]` never reaches a loop's closing edge unless
 * the first point is repeated first. Before this module every consumer
 * re-derived that for itself, and four of them got it wrong.
 */

/** The path kinds stored as a closed ring. Queried with `.has()` only — never
 *  iterated, so its insertion order cannot reach a generated board. */
const CLOSED_PATH_KINDS: ReadonlySet<PathKind> = new Set([PATH_KIND.BORDER, PATH_KIND.MOUNTAIN])

/** Whether a kind's stored `path` is a ring. Also what BoardTerrain.tsx asks in
 *  order to choose between an SVG `Z` and an open polyline. */
export function isClosedPathKind(kind: PathKind): boolean {
  return CLOSED_PATH_KINDS.has(kind)
}

/**
 * Repeats the first point at the end so consecutive-pair iteration reaches the
 * closing edge.
 *
 * A loop of fewer than two points has no closing edge and is returned
 * unchanged: wrapping a single point would manufacture a zero-length segment,
 * and a zero-length segment is exactly the degenerate input the predicates
 * downstream have to guard their divisors against
 * (geometry.segmentsCrossTransversally, containment.pointOnSegment). Guard the
 * input rather than rely on the symptom being caught later.
 */
export function closeLoop(loop: Polyline): Polyline {
  return loop.length < 2 ? loop : [...loop, loop[0]]
}

/**
 * The polyline to hand any predicate that walks `points[i] -> points[i + 1]` —
 * touchesPath, touchesRect, crossings, selfIntersects, arcLength,
 * pointTouchesPath.
 *
 * Returns a wrapped copy for a closed kind and the STORED ARRAY BY REFERENCE
 * for an open one, so calling it unconditionally on any PlacedPath costs
 * nothing when that path is a railway string. That is deliberate: it makes
 * "always call this when the source is a PlacedPath and the predicate walks
 * edges" a rule with no reason not to obey it.
 *
 * NOT for the endpoint-sensitive predicates (entryCount, passesThrough,
 * endsOn) — they read path[0] and path[length - 1], which a wrap collapses onto
 * the same vertex. NOT needed for rectFullyInside / pathFullyInside's `loop`
 * parameter, which wraps internally via containment.loopEdges. See the doc
 * comment on PlacedPath.path for all three families.
 */
export function edgePolyline(placedPath: PlacedPath): Polyline {
  return isClosedPathKind(placedPath.kind) ? closeLoop(placedPath.path) : placedPath.path
}
