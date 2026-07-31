import { PATH_KIND, REJECTION_REASON, STATION_REJECTION_REASON } from '../constants/game'
import { arcLength, crossings, selfIntersects } from './geometry'
import {
  entryCount,
  passesThrough,
  pathFullyInside,
  pointInAnyRect,
  rectFullyInside,
  rectsOverlapOrTouch,
  touchesPath,
  touchesRect,
} from './containment'
import type { RulesConfig } from './config'
import type {
  ColourId,
  GameState,
  Polyline,
  Rect,
  RejectionReason,
  StationId,
  StationRejectionReason,
} from './types'

export type PlacementResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly reason: RejectionReason | StationRejectionReason
      readonly stationId?: StationId
    }

/**
 * §5.2 — the three station-placement constraints, checked in the rulebook's own
 * order: does not touch any string (including terrain) -> does not touch any
 * other station -> fully within the border string.
 */
export function validateStationPlacement(
  state: GameState,
  rect: Rect,
  config: RulesConfig,
): PlacementResult {
  for (const placedPath of state.paths) {
    if (touchesRect(placedPath.path, rect, config.tangencyTolerance)) {
      return { ok: false, reason: STATION_REJECTION_REASON.TOUCHES_STRING }
    }
  }

  for (const station of state.stations) {
    if (rectsOverlapOrTouch(rect, station.rect)) {
      return {
        ok: false,
        reason: STATION_REJECTION_REASON.TOUCHES_STATION,
        stationId: station.card.id,
      }
    }
  }

  const border = state.paths.find((placedPath) => placedPath.kind === PATH_KIND.BORDER)
  if (!border || !rectFullyInside(rect, border.path)) {
    return { ok: false, reason: STATION_REJECTION_REASON.NOT_INSIDE_BORDER }
  }

  return { ok: true }
}

/**
 * §10.2 — the ten string-placement checks, in the rulebook's own order. This is
 * deliberately a straight-line sequence, not a rule table: the order is
 * normative (the first failure is what the player sees), so reading this
 * against §10.2 one branch at a time is the point, and an array of predicate
 * objects would make "which check ran first" a test about array indices
 * instead of behaviour.
 */
export function validateStringPlacement(
  state: GameState,
  colour: ColourId,
  stringKind: 'SHORT_RAIL' | 'LONG_RAIL',
  path: Polyline,
  config: RulesConfig,
): PlacementResult {
  // 1. The chosen string type is still in the player's supply.
  const seat = state.seats.find((candidate) => candidate.colour === colour)
  if (!seat) {
    return { ok: false, reason: REJECTION_REASON.NOT_IN_SUPPLY }
  }
  const stringsLeft = stringKind === 'SHORT_RAIL' ? seat.shortStringsLeft : seat.longStringsLeft
  if (stringsLeft <= 0) {
    return { ok: false, reason: REJECTION_REASON.NOT_IN_SUPPLY }
  }

  // 2. Arc length within tolerance of the nominal length (M6). Inclusive: a
  // path exactly at +/-2% passes.
  const nominalLength =
    stringKind === 'SHORT_RAIL' ? config.shortStringLength : config.longStringLength
  const length = arcLength(path)
  if (Math.abs(length - nominalLength) > nominalLength * config.arcLengthTolerance) {
    return { ok: false, reason: REJECTION_REASON.WRONG_LENGTH }
  }

  // 3. The path does not cross itself.
  if (selfIntersects(path)) {
    return { ok: false, reason: REJECTION_REASON.SELF_INTERSECTS }
  }

  // 4. Both endpoints touch some station.
  const stationRects = state.stations.map((station) => station.rect)
  const startPoint = path[0]
  const endPoint = path[path.length - 1]
  if (!pointInAnyRect(startPoint, stationRects) || !pointInAnyRect(endPoint, stationRects)) {
    return { ok: false, reason: REJECTION_REASON.ENDPOINT_OFF_STATION }
  }

  // 5. One end is on the colour's own network: the starting station, or a
  // station already touched by one of that colour's earlier strings.
  const ownPaths = state.paths.filter((placedPath) => placedPath.owner === colour)
  const networkRects: Rect[] = []
  for (const station of state.stations) {
    const isStartingStation = station.card.id === seat.startingStationId
    const onOwnNetwork = ownPaths.some((ownPath) => entryCount(ownPath.path, station.rect) > 0)
    if (isStartingStation || onOwnNetwork) {
      networkRects.push(station.rect)
    }
  }
  if (!pointInAnyRect(startPoint, networkRects) && !pointInAnyRect(endPoint, networkRects)) {
    return { ok: false, reason: REJECTION_REASON.NETWORK_DISCONNECTED }
  }

  // 6. No station is entered more than once — contiguous runs, not raw hits.
  for (const station of state.stations) {
    if (entryCount(path, station.rect) > 1) {
      return {
        ok: false,
        reason: REJECTION_REASON.STATION_ENTERED_TWICE,
        stationId: station.card.id,
      }
    }
  }

  // 7. Every Terminus the path touches is touched only at an endpoint.
  for (const station of state.stations) {
    if (station.card.flags.terminus && passesThrough(path, station.rect)) {
      return {
        ok: false,
        reason: REJECTION_REASON.TERMINUS_PASS_THROUGH,
        stationId: station.card.id,
      }
    }
  }

  // 8. Player limit, including pass-through (M15) — every station the path
  // touches at all, not just its two endpoints.
  for (const station of state.stations) {
    if (entryCount(path, station.rect) === 0) {
      continue
    }
    const distinctColours = new Set<ColourId>(station.connections.keys())
    distinctColours.add(colour)
    if (distinctColours.size > station.card.playerLimit) {
      return {
        ok: false,
        reason: REJECTION_REASON.PLAYER_LIMIT_EXCEEDED,
        stationId: station.card.id,
      }
    }
  }

  // 9. The path stays fully inside the border string (M7).
  const border = state.paths.find((placedPath) => placedPath.kind === PATH_KIND.BORDER)
  if (!border || !pathFullyInside(path, border.path)) {
    return { ok: false, reason: REJECTION_REASON.LEAVES_BORDER }
  }

  // 10. No degenerate tangency (M8): a station the path comes within
  // config.tangencyTolerance of without genuinely entering it. Genuine touches
  // are already accounted for above via entryCount > 0 (checks 6 and 8), so
  // this only fires for the ambiguous near-miss the rulebook calls out by
  // name — a card edge grazed closer than the tolerance the game is played at,
  // without either side of the tolerance being able to say cleanly whether it
  // touched.
  for (const station of state.stations) {
    if (
      entryCount(path, station.rect) === 0 &&
      touchesRect(path, station.rect, config.tangencyTolerance)
    ) {
      return { ok: false, reason: REJECTION_REASON.DEGENERATE_TANGENCY, stationId: station.card.id }
    }
  }

  // 10 (continued) — Rules.md §10.2's tenth check names "an existing path or
  // card edge", not card edges alone. Mirrors the station half above: a path
  // that genuinely crosses another (crossings(...).length > 0) is a scored
  // crossing per §10.3, not a rejection here, so it is exempted the same way
  // entryCount > 0 exempts a genuinely-touched station. The BORDER path is
  // exempted entirely — check 9 above already governs the border with its
  // own inclusive boundary test (a string may legitimately run flush along
  // the wall), so a second, tolerance-based near-border check would fight
  // that design and reject ordinary boards where play space is tight against
  // the wall. Terrain that is not the border (mountain, river) is NOT
  // exempted: a near-miss against terrain is exactly the ambiguous case M8
  // means, the same as a near-miss against another player's string.
  for (const otherPath of state.paths) {
    if (otherPath.kind === PATH_KIND.BORDER) {
      continue
    }
    const genuinelyCrosses = crossings(path, otherPath.path).length > 0
    if (!genuinelyCrosses && touchesPath(path, otherPath.path, config.tangencyTolerance)) {
      return { ok: false, reason: REJECTION_REASON.DEGENERATE_TANGENCY }
    }
  }

  return { ok: true }
}
