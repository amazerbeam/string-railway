import { PATH_KIND, SETUP_FAILURE } from '../constants/game'
import { arcLength, selfIntersects } from './geometry'
import {
  pathFullyInside,
  pointTouchesPath,
  rectFullyInside,
  rectsOverlapOrTouch,
  touchesPath,
  touchesRect,
} from './containment'
import type { RulesConfig } from './config'
import type { GameState, PlacedPath, Polyline } from './types'

export type SetupFailureReason = (typeof SETUP_FAILURE)[keyof typeof SETUP_FAILURE]

export interface SetupFailure {
  readonly reason: SetupFailureReason
  readonly detail: string
}

export type SetupValidationResult =
  { readonly ok: true } | { readonly ok: false; readonly failures: readonly SetupFailure[] }

/** A closed loop is stored corners-only, so wrap it to measure or to test
 *  containment along its final edge. */
function closed(loop: Polyline): Polyline {
  return loop.length === 0 ? loop : [...loop, loop[0]]
}

function terrain(state: GameState, kind: PlacedPath['kind']): PlacedPath | undefined {
  return state.paths.find((path) => path.kind === kind)
}

/** Inclusive, matching validate.ts:96's M6 comparison — a length exactly at
 *  ±tolerance passes. */
function lengthWithinTolerance(actual: number, nominal: number, tolerance: number): boolean {
  return Math.abs(actual - nominal) <= nominal * tolerance
}

/**
 * SCRUM-4 AC9 — a generated board always passes the rules engine's own legality
 * checks. Those checks are the §4.1 SETUP invariants, not §10.2's in-play
 * order: §4.1 step 6 requires a starting station to be both contained within
 * AND touching the border, which validateStationPlacement rejects outright
 * because the border is a PlacedPath and §5.2 forbids a station touching any
 * string. Same §10.1 predicates underneath; different rule set on top.
 *
 * Collects every failure rather than short-circuiting, so a generator bug
 * reports its full shape in one run.
 */
export function validateSetup(state: GameState, config: RulesConfig): SetupValidationResult {
  const failures: SetupFailure[] = []
  const fail = (reason: SetupFailureReason, detail: string): void => {
    failures.push({ reason, detail })
  }

  const border = terrain(state, PATH_KIND.BORDER)
  const river = terrain(state, PATH_KIND.RIVER)
  const mountain = terrain(state, PATH_KIND.MOUNTAIN)

  if (!border) {
    // Everything below measures against the border, so a missing one is
    // reported and the rest is skipped rather than passing vacuously.
    fail(SETUP_FAILURE.BORDER_SELF_INTERSECTS, 'no BORDER path is present in state.paths')
    return { ok: false, failures }
  }

  const borderLoop = closed(border.path)

  if (selfIntersects(borderLoop)) {
    fail(SETUP_FAILURE.BORDER_SELF_INTERSECTS, 'the border loop crosses itself (§4.1 step 2)')
  }
  const borderLength = arcLength(borderLoop)
  if (!lengthWithinTolerance(borderLength, config.borderPerimeter, config.arcLengthTolerance)) {
    fail(
      SETUP_FAILURE.BORDER_WRONG_PERIMETER,
      `border perimeter ${borderLength.toFixed(2)} is not within tolerance of borderPerimeter ${config.borderPerimeter}`,
    )
  }

  if (mountain) {
    const mountainLoop = closed(mountain.path)
    if (selfIntersects(mountainLoop)) {
      fail(SETUP_FAILURE.MOUNTAIN_SELF_INTERSECTS, 'the mountain loop crosses itself (§4.1 step 4)')
    }
    const mountainLength = arcLength(mountainLoop)
    if (!lengthWithinTolerance(mountainLength, config.mountainLength, config.arcLengthTolerance)) {
      fail(
        SETUP_FAILURE.MOUNTAIN_WRONG_LENGTH,
        `mountain length ${mountainLength.toFixed(2)} is not within tolerance of mountainLength ${config.mountainLength}`,
      )
    }
    if (!pathFullyInside(mountainLoop, border.path)) {
      fail(SETUP_FAILURE.MOUNTAIN_OUTSIDE_BORDER, 'the mountain is not fully inside the border')
    }
    if (touchesPath(mountainLoop, borderLoop, config.tangencyTolerance)) {
      fail(SETUP_FAILURE.MOUNTAIN_TOUCHES_BORDER, 'the mountain touches the border (§4.1 step 4)')
    }
    if (river && touchesPath(mountainLoop, river.path, config.tangencyTolerance)) {
      fail(SETUP_FAILURE.MOUNTAIN_TOUCHES_RIVER, 'the mountain touches the river (§4.1 step 4)')
    }
  }

  if (river) {
    if (selfIntersects(river.path)) {
      fail(SETUP_FAILURE.RIVER_SELF_INTERSECTS, 'the river crosses itself (§4.1 step 3)')
    }
    const riverLength = arcLength(river.path)
    if (!lengthWithinTolerance(riverLength, config.riverLength, config.arcLengthTolerance)) {
      fail(
        SETUP_FAILURE.RIVER_WRONG_LENGTH,
        `river length ${riverLength.toFixed(2)} is not within tolerance of riverLength ${config.riverLength}`,
      )
    }
    if (!pathFullyInside(river.path, border.path)) {
      fail(SETUP_FAILURE.RIVER_OUTSIDE_BORDER, 'the river leaves the border')
    }
    // AC6 / §4.1 step 3 — EXACTLY one end touches the border, and no interior
    // vertex does either, which is what "curving inward" means geometrically.
    const touching = river.path.filter((point) =>
      pointTouchesPath(point, borderLoop, config.tangencyTolerance),
    )
    const endsTouching = [river.path[0], river.path[river.path.length - 1]].filter((point) =>
      pointTouchesPath(point, borderLoop, config.tangencyTolerance),
    )
    if (endsTouching.length !== 1 || touching.length !== 1) {
      fail(
        SETUP_FAILURE.RIVER_BORDER_TOUCH_COUNT,
        `exactly one river END must touch the border and no other vertex may: ${endsTouching.length} end(s) and ${touching.length} vertex/vertices touch`,
      )
    }
    if (mountain && touchesPath(river.path, closed(mountain.path), config.cardSize)) {
      fail(
        SETUP_FAILURE.RIVER_TOO_NEAR_MOUNTAIN,
        `the river comes within one card width (${config.cardSize}) of the mountain (§4.3)`,
      )
    }
  }

  for (const station of state.stations) {
    if (!rectFullyInside(station.rect, border.path)) {
      fail(
        SETUP_FAILURE.STATION_OUTSIDE_BORDER,
        `station ${String(station.card.id)} is not fully inside the border (§4.1 step 6)`,
      )
    }
    // §4.1 step 6 requires the card to be TOUCHING the border, so this asserts
    // the presence of a touch — the inverse of §5.2's in-play check.
    if (!touchesRect(borderLoop, station.rect, config.tangencyTolerance)) {
      fail(
        SETUP_FAILURE.STATION_NOT_TOUCHING_BORDER,
        `station ${String(station.card.id)} does not touch the border (§4.1 step 6)`,
      )
    }
    // The mountain is a closed loop (§4.1 step 4) and is wrapped; the river is
    // an OPEN arc (§4.1 step 3) and must NOT be, or the wrap invents a phantom
    // chord from its inland tip back to its mouth. A station near that chord
    // would be falsely rejected here while the sampler — which tests the open
    // river — placed it happily, so gate and generator would disagree.
    if (mountain && touchesRect(closed(mountain.path), station.rect, config.tangencyTolerance)) {
      fail(
        SETUP_FAILURE.STATION_TOUCHES_TERRAIN,
        `station ${String(station.card.id)} touches the mountain (§4.1)`,
      )
    }
    if (river && touchesRect(river.path, station.rect, config.tangencyTolerance)) {
      fail(
        SETUP_FAILURE.STATION_TOUCHES_TERRAIN,
        `station ${String(station.card.id)} touches the river (§4.1)`,
      )
    }
    for (const other of state.stations) {
      if (other !== station && rectsOverlapOrTouch(station.rect, other.rect)) {
        fail(
          SETUP_FAILURE.STATION_TOUCHES_STATION,
          `stations ${String(station.card.id)} and ${String(other.card.id)} overlap or touch`,
        )
      }
    }
  }

  if (state.seats.length !== state.turnOrder.length) {
    fail(
      SETUP_FAILURE.SEAT_COUNT_MISMATCH,
      `${state.seats.length} seat(s) but ${state.turnOrder.length} entries in turnOrder`,
    )
  }
  for (const seat of state.seats) {
    if (!state.stations.some((station) => station.card.id === seat.startingStationId)) {
      fail(
        SETUP_FAILURE.SEAT_STARTING_STATION_MISSING,
        `seat ${String(seat.colour)} names startingStationId ${String(seat.startingStationId)}, which is not on the board`,
      )
    }
  }

  return failures.length > 0 ? { ok: false, failures } : { ok: true }
}
