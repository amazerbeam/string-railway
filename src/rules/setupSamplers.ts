/**
 * The border-shape primitives and the three rejection samplers `generateSetup`
 * drives. Split out of setup.ts to keep both files inside the 400-line budget.
 *
 * The split runs THIS way round — primitives and samplers here, orchestration in
 * setup.ts — so the dependency is one-directional. sampleMountain and
 * placeCornerStation both call regularPolygon and inradius inside their retry
 * loops, so leaving those in setup.ts would have made the two modules import
 * each other. setup.ts re-exports PlayerCount, sideCountFor, regularPolygon and
 * inradius, so `from './setup'` remains the public entry point for all of them.
 */

import { SETUP_FAILURE } from '../constants/game'
import {
  MAX_MOUNTAIN_ATTEMPTS,
  MAX_RIVER_ATTEMPTS,
  MAX_STATION_ATTEMPTS,
  MOUNTAIN_OFFSET_FRACTION,
  MOUNTAIN_SEGMENTS,
  RIVER_EDGE_MARGIN,
  RIVER_MAX_TOTAL_TURN,
  RIVER_SEGMENTS,
  STATION_INSET_DEPTH,
} from '../constants/setup'
import {
  pathFullyInside,
  pointTouchesPath,
  rectFullyInside,
  rectsOverlapOrTouch,
  touchesPath,
  touchesRect,
} from './containment'
import { EPSILON, selfIntersects } from './geometry'
import type { RulesConfig } from './config'
import type { Rng } from './rng'
import type { SetupFailure } from './setupValidation'
import type { Point, Polyline, Rect } from './types'

export type PlayerCount = 2 | 3 | 4 | 5

/**
 * §6 / §9 — the border shape's side count. Two players play the FOUR-player
 * square (SCRUM-4 AC3: selecting 2 must not produce a two-corner board), which
 * is also what gives the 2-player variant four corners for its four
 * colour-seats.
 */
export function sideCountFor(playerCount: PlayerCount): 3 | 4 | 5 {
  return playerCount === 2 ? 4 : playerCount
}

/**
 * A regular polygon with EXACTLY the requested perimeter (SCRUM-4 AC2). The
 * edge is perimeter / sideCount and the circumradius follows from it as
 * edge / (2 sin(pi/n)) — so the perimeter is an identity, not a tolerance, and
 * the per-player-count edge lengths §3 tabulates (1333 / 1000 / 800) are
 * derived here rather than stored as separate config keys that could drift.
 *
 * Vertex 0 sits at the top (angle -pi/2) and the winding is CLOCKWISE in SVG's
 * y-down coordinate system, so "in clockwise seat order" (§4.1 step 7) means
 * simply walking this array.
 *
 * This is the ONLY function that assumes regularity. Everything downstream
 * consumes a Polyline plus its vertex list, so §4.2's irregular borders later
 * mean a sibling generator for this one function, not a rewrite.
 */
export function regularPolygon(centre: Point, sideCount: number, perimeter: number): Polyline {
  if (!Number.isInteger(sideCount) || sideCount < 3) {
    throw new Error(`regularPolygon: sideCount must be an integer >= 3, received ${sideCount}`)
  }
  if (!Number.isFinite(perimeter) || perimeter <= 0) {
    throw new Error(`regularPolygon: perimeter must be a positive number, received ${perimeter}`)
  }

  const edge = perimeter / sideCount
  // sin(pi/n) is strictly positive for n >= 3, so the divisor is guarded by the
  // sideCount check above rather than needing its own epsilon test.
  const circumradius = edge / (2 * Math.sin(Math.PI / sideCount))

  const points: Point[] = []
  for (let i = 0; i < sideCount; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / sideCount
    points.push({
      x: centre.x + circumradius * Math.cos(angle),
      y: centre.y + circumradius * Math.sin(angle),
    })
  }
  return points
}

/** Distance from the centre to an edge midpoint — the basis for the mountain's
 *  0-15% centre offset (SCRUM-4 AC5). */
export function inradius(sideCount: number, perimeter: number): number {
  if (!Number.isInteger(sideCount) || sideCount < 3) {
    throw new Error(`inradius: sideCount must be an integer >= 3, received ${sideCount}`)
  }
  return perimeter / sideCount / (2 * Math.tan(Math.PI / sideCount))
}

/**
 * Internal to the setup pair: a sampler knows which invariant it could not
 * satisfy, but not the seed. generateSetup owns catching this and re-throwing a
 * SetupGenerationError with the real seed and player count, which keeps the seed
 * in one place instead of threading it through three samplers. Exported only so
 * setup.ts can catch it — no other module should reference it.
 */
export class SetupSamplerError extends Error {
  readonly failures: readonly SetupFailure[]

  constructor(failures: readonly SetupFailure[]) {
    super(failures.map((failure) => failure.reason).join('; '))
    this.name = 'SetupSamplerError'
    this.failures = failures
  }
}

function centroid(points: Polyline): Point {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  }
}

/**
 * §4.1 step 4 / §4.3 / AC5 — a closed loop whose PERIMETER is exactly
 * config.mountainLength (a circle polygonised by radius would come out short
 * and fail arcLength's own check), centred within MOUNTAIN_OFFSET_FRACTION of
 * the border's inradius from the play-area centre. Rejected and resampled if it
 * escapes or touches the border.
 */
export function sampleMountain(
  centre: Point,
  borderLoop: Polyline,
  sideCount: number,
  config: RulesConfig,
  rng: Rng,
): Polyline {
  const maxOffset = inradius(sideCount, config.borderPerimeter) * MOUNTAIN_OFFSET_FRACTION
  const closedBorder = [...borderLoop, borderLoop[0]]

  for (let attempt = 0; attempt < MAX_MOUNTAIN_ATTEMPTS; attempt++) {
    const angle = rng.nextRange(0, Math.PI * 2)
    const distance = rng.nextRange(0, maxOffset)
    const loop = regularPolygon(
      { x: centre.x + Math.cos(angle) * distance, y: centre.y + Math.sin(angle) * distance },
      MOUNTAIN_SEGMENTS,
      config.mountainLength,
    )
    const closedLoop = [...loop, loop[0]]
    if (
      pathFullyInside(closedLoop, borderLoop) &&
      !touchesPath(closedLoop, closedBorder, config.tangencyTolerance)
    ) {
      return loop
    }
  }

  throw new SetupSamplerError([
    {
      reason: SETUP_FAILURE.MOUNTAIN_OUTSIDE_BORDER,
      detail: `no mountain placement found in ${MAX_MOUNTAIN_ATTEMPTS} attempts — mountainLength ${config.mountainLength} may be too large for borderPerimeter ${config.borderPerimeter} (see §12)`,
    },
  ])
}

/**
 * §4.1 step 3 / §4.3 / AC6 — an open arc of length exactly config.riverLength
 * with exactly one end on the border, curving inward.
 *
 * Implemented as a fixed-step turtle walk: RIVER_SEGMENTS steps of
 * riverLength / RIVER_SEGMENTS each, turning by a constant per-river curvature
 * drawn once from the RNG. Arc length is therefore exact BY CONSTRUCTION with
 * no rescaling pass — which matters because a rescale would have to re-check
 * every rejection condition afterwards.
 *
 * Rejected and resampled if it self-intersects, leaves the border, touches the
 * border anywhere but its first vertex, or comes within one card width of the
 * mountain (§4.3's tolerance here is cardSize, NOT tangencyTolerance).
 */
export function sampleRiver(
  borderLoop: Polyline,
  mountainLoop: Polyline,
  config: RulesConfig,
  rng: Rng,
): Polyline {
  const closedBorder = [...borderLoop, borderLoop[0]]
  const closedMountain = [...mountainLoop, mountainLoop[0]]
  const centre = centroid(borderLoop)
  const step = config.riverLength / RIVER_SEGMENTS

  for (let attempt = 0; attempt < MAX_RIVER_ATTEMPTS; attempt++) {
    const edgeIndex = rng.nextInt(borderLoop.length)
    const from = borderLoop[edgeIndex]
    const to = borderLoop[(edgeIndex + 1) % borderLoop.length]
    // Kept clear of the corners the starting stations occupy.
    const t = rng.nextRange(RIVER_EDGE_MARGIN, 1 - RIVER_EDGE_MARGIN)
    const mouth: Point = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }

    // Head inward: toward the centre, jittered so successive attempts explore.
    const inward = Math.atan2(centre.y - mouth.y, centre.x - mouth.x)
    let heading = inward + rng.nextRange(-Math.PI / 5, Math.PI / 5)
    const turnPerStep = rng.nextRange(-RIVER_MAX_TOTAL_TURN, RIVER_MAX_TOTAL_TURN) / RIVER_SEGMENTS

    const points: Point[] = [mouth]
    let current = mouth
    for (let i = 0; i < RIVER_SEGMENTS; i++) {
      current = {
        x: current.x + Math.cos(heading) * step,
        y: current.y + Math.sin(heading) * step,
      }
      points.push(current)
      heading += turnPerStep
    }

    if (selfIntersects(points)) {
      continue
    }
    if (!pathFullyInside(points, borderLoop)) {
      continue
    }
    // Exactly one vertex — the mouth — may touch the border.
    const touchingCount = points.filter((point) =>
      pointTouchesPath(point, closedBorder, config.tangencyTolerance),
    ).length
    if (touchingCount !== 1) {
      continue
    }
    if (touchesPath(points, closedMountain, config.cardSize)) {
      continue
    }
    return points
  }

  throw new SetupSamplerError([
    {
      reason: SETUP_FAILURE.RIVER_TOO_NEAR_MOUNTAIN,
      detail: `no river placement found in ${MAX_RIVER_ATTEMPTS} attempts — the board may be too cramped for riverLength ${config.riverLength} to clear the mountain by cardSize ${config.cardSize} (see §12)`,
    },
  ])
}

/**
 * §4.1 steps 6-7 / AC7 — one station per corner, inset along the corner's
 * interior bisector to the SMALLEST inset at which the card is fully inside the
 * border, which is the position that is simultaneously "contained within" and
 * "touching" the border. Found by bisection to STATION_INSET_DEPTH.
 *
 * Retries with a small tangential nudge when the bisected position clashes with
 * terrain or an already-placed sibling, so a river mouth near a corner does not
 * make the whole board unplaceable.
 */
export function placeCornerStation(
  cornerIndex: number,
  borderLoop: Polyline,
  blockers: readonly Polyline[],
  placed: readonly Rect[],
  config: RulesConfig,
  rng: Rng,
): Rect {
  const size = config.cardSize
  const corner = borderLoop[cornerIndex]
  const previous = borderLoop[(cornerIndex - 1 + borderLoop.length) % borderLoop.length]
  const next = borderLoop[(cornerIndex + 1) % borderLoop.length]

  const unit = (from: Point, to: Point): Point => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.hypot(dx, dy)
    // Guarded: a zero-length edge would poison every coordinate downstream.
    return length < EPSILON ? { x: 0, y: 0 } : { x: dx / length, y: dy / length }
  }
  const toPrevious = unit(corner, previous)
  const toNext = unit(corner, next)
  const bisector = unit({ x: 0, y: 0 }, { x: toPrevious.x + toNext.x, y: toPrevious.y + toNext.y })
  const tangent = { x: -bisector.y, y: bisector.x }

  const rectAt = (offset: number, slide: number): Rect => {
    const cx = corner.x + bisector.x * offset + tangent.x * slide
    const cy = corner.y + bisector.y * offset + tangent.y * slide
    return { x: cx - size / 2, y: cy - size / 2, width: size, height: size }
  }

  const clear = (rect: Rect): boolean =>
    blockers.every((blocker) => !touchesRect(blocker, rect, config.tangencyTolerance)) &&
    placed.every((other) => !rectsOverlapOrTouch(rect, other))

  // The bisector can never need more than the card's diagonal plus the
  // inradius, so that bounds the bisection interval.
  const maxOffset = size * 2 + inradius(borderLoop.length, config.borderPerimeter)

  for (let attempt = 0; attempt < MAX_STATION_ATTEMPTS; attempt++) {
    const slide = attempt === 0 ? 0 : rng.nextRange(-size * 1.5, size * 1.5)
    let low = 0
    let high = maxOffset
    let found: Rect | null = null
    for (let depth = 0; depth < STATION_INSET_DEPTH; depth++) {
      const mid = (low + high) / 2
      const candidate = rectAt(mid, slide)
      if (rectFullyInside(candidate, borderLoop)) {
        found = candidate
        high = mid
      } else {
        low = mid
      }
    }
    if (
      found &&
      touchesRect([...borderLoop, borderLoop[0]], found, config.tangencyTolerance) &&
      clear(found)
    ) {
      return found
    }
  }

  throw new SetupSamplerError([
    {
      reason: SETUP_FAILURE.STATION_OUTSIDE_BORDER,
      detail: `no legal position found for the corner-${cornerIndex} starting station in ${MAX_STATION_ATTEMPTS} attempts — cardSize ${config.cardSize} may be too large for borderPerimeter ${config.borderPerimeter} (see §12)`,
    },
  ])
}
