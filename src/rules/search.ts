/**
 * §5.2 / §5.3 — the bounded legal-placement search backing M4 (three
 * consecutive unplaceable station cards skip step 1) and M9 (no legal string
 * placement forfeits steps 2-3). Pulled forward into SCRUM-2 by developer
 * decision so the reducer's draw-and-recycle sequence is a pure function of
 * state rather than a stub SCRUM-5 would otherwise have to invent.
 *
 * Both exported functions are pure `(state, ..., config) => boolean` with no
 * seeded-or-not randomness and no reliance on wall-clock time — the search
 * itself must replay identically from the move log. Neither adjudicates a
 * rule directly: every
 * candidate is filtered through validateStationPlacement / validateStringPlacement
 * (§5.2 / §10.2), so this module can only ever narrow the candidate set, never
 * re-decide legality.
 */
import { PATH_KIND } from '../constants/game'
import { EPSILON } from './geometry'
import { validateStationPlacement, validateStringPlacement } from './validate'
import type { RulesConfig } from './config'
import type { GameState, Point, Polyline, Rect, StationCard } from './types'
import type { ColourId } from './types'

/**
 * Bisection steps taken around a near-hit before giving up. Numeric bound, not
 * a tuning lever — raising it costs runtime and lowers the false-negative rate.
 */
const REFINEMENT_DEPTH = 3

interface BoundingBox {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

/** Axis-aligned bounding box of a closed loop's own points. */
function boundingBox(loop: Polyline): BoundingBox {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of loop) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  return { minX, minY, maxX, maxY }
}

/**
 * Coarse sample origins from `min` to `max` inclusive, stepping by `step`.
 * Always includes `max` itself even if `step` does not divide the span
 * evenly, so the far edge of the bounding box is never left untested. Empty
 * when the span is narrower than one step (nothing can fit).
 */
function sampleOrigins(min: number, max: number, step: number): readonly number[] {
  if (step <= 0 || max < min) {
    return []
  }
  const origins: number[] = []
  for (let value = min; value <= max; value += step) {
    origins.push(value)
  }
  const last = origins[origins.length - 1]
  if (last === undefined || max - last > EPSILON) {
    origins.push(max)
  }
  return origins
}

/**
 * Binary-subdivides `[low, high]` to `depth` levels, testing `predicate` at
 * each level's midpoint before descending into both halves. This is what
 * catches a legal gap that falls entirely between two coarse samples without
 * either one landing inside it — the case a fixed grid alone would miss.
 * Bounded: exactly 2^depth - 1 predicate calls per interval.
 */
function bisect(
  low: number,
  high: number,
  depth: number,
  predicate: (value: number) => boolean,
): boolean {
  if (depth <= 0) {
    return false
  }
  const mid = (low + high) / 2
  if (predicate(mid)) {
    return true
  }
  return bisect(low, mid, depth - 1, predicate) || bisect(mid, high, depth - 1, predicate)
}

/**
 * M4 — does any legal rect exist for this card? Samples at config.cardSize
 * granularity across the border's bounding box, then refines by bisection
 * along both axes near coarse misses to REFINEMENT_DEPTH.
 *
 * Worst case: with W x H the border's bounding box and s = config.cardSize,
 * the coarse grid is (W/s + 1) x (H/s + 1) candidates. Refinement adds, per
 * axis, one bisection (2^REFINEMENT_DEPTH - 1 calls) per pair of adjacent
 * coarse origins on the other axis' full range. Total candidate count is
 * O((W*H / s^2) * (1 + 2*(2^REFINEMENT_DEPTH - 1))) — proportional to board
 * area over card area, not to a continuous space. Every candidate itself
 * costs validateStationPlacement's O(paths + stations) scan.
 *
 * `card` does not vary this search today: the three §5.2 constraints
 * validateStationPlacement checks (touches a string, touches a station,
 * fully inside the border) depend only on the candidate rect's footprint —
 * every station card is the same config.cardSize square — never on the
 * card's type or flags. It stays in the signature because M4's redraw loop
 * asks the question once per drawn card, and a future card-dependent
 * footprint would read it.
 */
export function hasLegalStationPlacement(
  state: GameState,
  card: StationCard,
  config: RulesConfig,
): boolean {
  // Unread today — see the doc comment above. `void` (rather than an
  // underscore-prefixed name) is the idiom used across this file's siblings
  // for an intentionally-retained-but-unread parameter: ESLint's
  // @typescript-eslint/no-unused-vars only exempts a trailing unused
  // parameter positionally, never by name, so an underscored name alone
  // does not reliably pass lint.
  void card

  const border = state.paths.find((placedPath) => placedPath.kind === PATH_KIND.BORDER)
  if (!border) {
    return false
  }

  const size = config.cardSize
  const box = boundingBox(border.path)
  const xs = sampleOrigins(box.minX, box.maxX - size, size)
  const ys = sampleOrigins(box.minY, box.maxY - size, size)

  const isLegal = (x: number, y: number): boolean => {
    const rect: Rect = { x, y, width: size, height: size }
    return validateStationPlacement(state, rect, config).ok
  }

  for (const y of ys) {
    for (const x of xs) {
      if (isLegal(x, y)) {
        return true
      }
    }
  }

  // Refinement: a gap exactly card-width can fall entirely between two
  // coarse origins on one axis without either landing inside it. Bisect
  // every pair of horizontally-adjacent origins (holding y at each coarse
  // row) and every pair of vertically-adjacent origins (holding x at each
  // coarse column).
  for (const y of ys) {
    for (let i = 0; i < xs.length - 1; i++) {
      if (bisect(xs[i], xs[i + 1], REFINEMENT_DEPTH, (x) => isLegal(x, y))) {
        return true
      }
    }
  }
  for (const x of xs) {
    for (let i = 0; i < ys.length - 1; i++) {
      if (bisect(ys[i], ys[i + 1], REFINEMENT_DEPTH, (y) => isLegal(x, y))) {
        return true
      }
    }
  }

  return false
}

/** Centre point of a rect — always inside the rect itself (inclusive), so it
 *  is a valid candidate string endpoint per §10.2 check 4. */
function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

/** Unit vector perpendicular to the line from `a` to `b`. Zero vector for a
 *  degenerate (zero-length) segment — guarded before use, never divided by. */
function perpendicularUnit(a: Point, b: Point): Point {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len < EPSILON) {
    return { x: 0, y: 0 }
  }
  return { x: -dy / len, y: dx / len }
}

/**
 * Candidate paths of arc length ~= nominalLength (within tolerance) joining
 * two fixed endpoints. A path's arc length can never be shorter than the
 * straight-line distance between its endpoints, so:
 *  - if that distance already exceeds nominalLength * (1 + tolerance), no
 *    path between these two points can ever be short enough — no candidates.
 *  - if the distance is itself within tolerance of nominalLength, the
 *    straight segment is a candidate.
 *  - if the distance is shorter than nominalLength, an isosceles two-segment
 *    detour bowed perpendicular to the straight line can exactly hit
 *    nominalLength (closed-form: bend height h solves
 *    2*sqrt((d/2)^2 + h^2) = nominalLength). Both bend directions are
 *    produced, since one side may be blocked while the other is not.
 */
function candidatePaths(a: Point, b: Point, nominalLength: number, tolerance: number): Polyline[] {
  const distance = Math.hypot(b.x - a.x, b.y - a.y)
  const maxLength = nominalLength * (1 + tolerance)
  if (distance > maxLength) {
    return []
  }

  const candidates: Polyline[] = []
  const minLength = nominalLength * (1 - tolerance)
  if (distance >= minLength) {
    candidates.push([a, b])
  }

  if (distance < nominalLength) {
    const halfDistance = distance / 2
    const halfNominal = nominalLength / 2
    const underSqrt = halfNominal * halfNominal - halfDistance * halfDistance
    if (underSqrt > EPSILON) {
      const bendHeight = Math.sqrt(underSqrt)
      const mid: Point = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const perp = perpendicularUnit(a, b)
      candidates.push([a, { x: mid.x + perp.x * bendHeight, y: mid.y + perp.y * bendHeight }, b])
      candidates.push([a, { x: mid.x - perp.x * bendHeight, y: mid.y - perp.y * bendHeight }, b])
    }
  }

  return candidates
}

/**
 * M9 — does this seat have any legal string placement at all?
 *
 * Candidate set: every unordered pair of stations already on the board
 * (§5.3 derives that a string always connects two distinct stations, since
 * both ends must be on a station and no station may be entered twice), for
 * every string kind still in the seat's supply, tested with the straight
 * segment and the two symmetric bend candidates from candidatePaths. This
 * covers every pair that COULD possibly host a legal string of the right
 * length — a straight line is the shortest possible path between two points,
 * so no candidate is skipped that a longer, more convoluted path might have
 * saved; a candidate is only dropped when no path of any shape between those
 * two points could ever reach the nominal length. Network membership (check
 * 5) and every other §10.2 constraint is left entirely to
 * validateStringPlacement, never re-derived here — a pair whose stations are
 * both off the colour's network simply fails validation for every candidate
 * generated for it. Deliberately not a false-negative-safe claim for every
 * possible detour shape (an obstacle could block both bend directions while
 * a more elaborate zig-zag still fits) — only for straight-line reachability,
 * which is what M9 asks: report a forfeit only after failing to find any
 * connection this simple, defensible search could construct.
 *
 * Worst case: with n stations on the board, pairs = n*(n-1)/2, at most 2
 * string kinds in supply, at most 3 candidates per pair per kind — bounded by
 * station count (deck size, M17), never by a continuous board area. Each
 * candidate costs validateStringPlacement's O(stations) scan.
 */
export function hasAnyLegalStringPlacement(
  state: GameState,
  colour: ColourId,
  config: RulesConfig,
): boolean {
  const seat = state.seats.find((candidate) => candidate.colour === colour)
  if (!seat) {
    return false
  }

  const stringKinds: ReadonlyArray<{ kind: 'SHORT_RAIL' | 'LONG_RAIL'; nominalLength: number }> = [
    ...(seat.shortStringsLeft > 0
      ? [{ kind: 'SHORT_RAIL' as const, nominalLength: config.shortStringLength }]
      : []),
    ...(seat.longStringsLeft > 0
      ? [{ kind: 'LONG_RAIL' as const, nominalLength: config.longStringLength }]
      : []),
  ]
  if (stringKinds.length === 0) {
    return false
  }

  const stations = state.stations
  for (let i = 0; i < stations.length; i++) {
    for (let j = i + 1; j < stations.length; j++) {
      const a = rectCenter(stations[i].rect)
      const b = rectCenter(stations[j].rect)
      for (const { kind, nominalLength } of stringKinds) {
        for (const candidate of candidatePaths(a, b, nominalLength, config.arcLengthTolerance)) {
          if (validateStringPlacement(state, colour, kind, candidate, config).ok) {
            return true
          }
        }
      }
    }
  }

  return false
}
