import { STATION_DEFINITIONS } from '../constants/stations'
import { crossings } from './geometry'
import { entryCount, pointInAnyRect } from './containment'
import type {
  ColourId,
  ConnectionLine,
  CrossingLine,
  GameState,
  MarkerEffectLine,
  PlacedPath,
  ScoringBreakdown,
  StationId,
} from './types'
import type { RulesConfig } from './config'

/**
 * §10.3 scoring line/breakdown types. Declared in types.ts (Phase 1) to avoid a
 * circular import via GameState.lastScoring — re-exported here, not redeclared.
 */
export type { ConnectionLine, CrossingLine, MarkerEffectLine, ScoringBreakdown }

/**
 * §10.3 — walk every station the new string touches (entryCount > 0, so
 * pass-throughs count per M15), then every path already on the board
 * (terrain included, per M10) for crossing penalties. Returns an itemised
 * ScoringBreakdown, never a number — SCRUM-7's stated rework risk if this
 * engine did otherwise.
 */
export function resolveScoring(
  state: GameState,
  colour: ColourId,
  newPath: PlacedPath,
  config: RulesConfig,
): ScoringBreakdown {
  // `config` is part of the plan's fixed signature (matching validate.ts's
  // (state, colour, ..., config) shape) but nothing in §10.3 currently reads
  // a RulesConfig field — the mountain bonus is a fixed §8 value (read from
  // STATION_DEFINITIONS below), not an M2 tunable, and no other scoring rule
  // is config-driven. `void` (not an underscore-prefixed name) is the idiom
  // that reliably passes @typescript-eslint/no-unused-vars for a trailing
  // unused parameter — see search.ts's hasLegalStationPlacement.
  void config
  const connections: ConnectionLine[] = []
  const markerEffects: MarkerEffectLine[] = []
  let gained = 0

  for (const station of state.stations) {
    if (entryCount(newPath.path, station.rect) === 0) {
      continue
    }

    const alreadyMine = station.connections.has(colour)
    const scores = !alreadyMine || station.card.flags.multiplier // Railyard, M12

    if (!scores) {
      connections.push({
        stationId: station.card.id,
        stationType: station.card.type,
        scored: false,
        tier: null,
        base: 0,
        mountainBonus: 0,
        total: 0,
      })
      continue
    }

    const tier: 'BLACK' | 'GREY' = station.firstConnector === null ? 'BLACK' : 'GREY'
    const base = tier === 'BLACK' ? station.card.bonusFirst : station.card.bonusLater
    // M11 — "within the mountain string" means the whole card is inside the
    // mountain loop. Trusts PlacedStation.insideMountain (turn.ts's
    // commitStationPlacement computes it once, at placement time, from
    // state.paths) rather than recomputing it here — see FIX 3's reasoning:
    // Rules.md §10.3's own pseudocode reads `station.insideMountain`
    // directly rather than re-deriving it at scoring time.
    const mountainBonus =
      station.card.flags.mountainBonus && station.insideMountain
        ? STATION_DEFINITIONS[station.card.type].mountainBonusValue
        : 0
    const total = base + mountainBonus
    gained += total

    connections.push({
      stationId: station.card.id,
      stationType: station.card.type,
      scored: true,
      tier,
      base,
      mountainBonus,
      total,
    })

    // Marker/owner trigger: "each time ANOTHER player scores the connection
    // bonus here" (§7.3) — a ColourId comparison, per the §9 colour-first rule.
    // Only reached inside the `scores` branch, so this fires on every scoring
    // event (M13), including a Railyard repeat, not first connections only.
    if (station.markerOwner !== null && station.markerOwner !== colour) {
      // sameOwner is the ONLY place a PlayerId is read in this file — it
      // reports whether the two colours happen to share an owner (§9); it
      // never decides whether the trigger fires, which is colour-first above.
      const scorerSeat = state.seats.find((seat) => seat.colour === colour)
      const markerSeat = state.seats.find((seat) => seat.colour === station.markerOwner)
      const sameOwner =
        scorerSeat !== undefined &&
        markerSeat !== undefined &&
        scorerSeat.owner === markerSeat.owner

      if (station.card.flags.markerBonus) {
        markerEffects.push({
          stationId: station.card.id,
          markerOwner: station.markerOwner,
          delta: 1,
          sameOwner,
        })
      }
      if (station.card.flags.markerPenalty) {
        markerEffects.push({
          stationId: station.card.id,
          markerOwner: station.markerOwner,
          delta: -1,
          sameOwner,
        })
      }
    }
  }

  const stationRects = state.stations.map((station) => station.rect)
  const crossingLines: CrossingLine[] = []
  let lost = 0

  // "Previously placed strings" (M10) — every path already in state.paths,
  // including terrain (border/river/mountain); newPath is not yet in that
  // array, so nothing here double-counts against itself.
  for (const otherPath of state.paths) {
    for (const point of crossings(newPath.path, otherPath.path)) {
      const onCard = pointInAnyRect(point, stationRects)
      const cost = onCard ? 0 : 1
      lost += cost
      crossingLines.push({
        point,
        otherPathId: otherPath.id,
        otherPathKind: otherPath.kind,
        onCard,
        cost,
      })
    }
  }

  return {
    colour,
    connections,
    crossings: crossingLines,
    markerEffects,
    gained,
    lost,
    net: gained - lost, // M14 — may go negative; nothing floors it.
  }
}

/**
 * Folds a ScoringBreakdown into state: the scoring colour's seat moves by
 * `net`, each marker effect's delta lands on the marker OWNER's seat (never
 * the scorer's), and every scored connection updates that station's
 * `connections` map and (on a BLACK tier) its `firstConnector`. Appends
 * nothing to the move log. Returns new objects throughout — the input state
 * is never mutated.
 */
export function applyScoring(state: GameState, breakdown: ScoringBreakdown): GameState {
  const seats = state.seats.map((seat) => {
    let score = seat.score
    if (seat.colour === breakdown.colour) {
      score += breakdown.net
    }
    for (const effect of breakdown.markerEffects) {
      if (effect.markerOwner === seat.colour) {
        score += effect.delta
      }
    }
    return score === seat.score ? seat : { ...seat, score }
  })

  const scoredLines = new Map<StationId, ConnectionLine>()
  for (const line of breakdown.connections) {
    if (line.scored) {
      scoredLines.set(line.stationId, line)
    }
  }

  const stations = state.stations.map((station) => {
    const line = scoredLines.get(station.card.id)
    if (!line) {
      return station
    }
    const connections = new Map(station.connections)
    connections.set(breakdown.colour, (connections.get(breakdown.colour) ?? 0) + 1)
    const firstConnector = line.tier === 'BLACK' ? breakdown.colour : station.firstConnector
    return { ...station, connections, firstConnector }
  })

  return { ...state, seats, stations, lastScoring: breakdown }
}
