import { PATH_KIND, TURN_PHASE } from '../constants/game'
import { STATION_DEFINITIONS, STATION_TYPE } from '../constants/stations'
import {
  COLOUR_SEATS,
  LONG_STRINGS_PER_SEAT,
  MARKERS_PER_SEAT,
  SHORT_STRINGS_PER_SEAT,
} from '../constants/setup'
import { rectFullyInside } from './containment'
import { buildDeck } from './deck'
import { closeLoop } from './pathGeometry'
import { createRng } from './rng'
import {
  placeCornerStation,
  regularPolygon,
  sampleMountain,
  sampleRiver,
  SetupSamplerError,
  sideCountFor,
} from './setupSamplers'
import { validateSetup } from './setupValidation'
import { asColourId, asPathId, asPlayerId, asStationId } from './types'
import type { RulesConfig } from './config'
import type { PlayerCount } from './setupSamplers'
import type { SetupFailure } from './setupValidation'
import type {
  ColourSeat,
  GameState,
  PlacedPath,
  PlacedStation,
  Point,
  Polyline,
  Rect,
} from './types'

// The border-shape primitives live in setupSamplers.ts, because the samplers
// there call them inside their retry loops and a shared module cannot import
// back into its own consumer. They are re-exported here so `from './setup'`
// stays the single public entry point for the whole setup surface.
export { inradius, regularPolygon, sideCountFor } from './setupSamplers'
export type { PlayerCount } from './setupSamplers'

/**
 * Raised when a sampler exhausts its retry ceiling (SCRUM-4 AC9 — a ceiling
 * surfaces an error instead of looping forever). Carries the seed and player
 * count so the failing board is reproducible from the message alone, which is
 * the diagnostic the brief's stated river risk asks for.
 */
export class SetupGenerationError extends Error {
  readonly seed: number
  readonly playerCount: PlayerCount
  readonly failures: readonly SetupFailure[]

  constructor(seed: number, playerCount: PlayerCount, failures: readonly SetupFailure[]) {
    super(
      `generateSetup failed for ${playerCount} players at seed ${seed}: ` +
        failures.map((failure) => `${failure.reason} (${failure.detail})`).join('; '),
    )
    this.name = 'SetupGenerationError'
    this.seed = seed
    this.playerCount = playerCount
    this.failures = failures
  }
}

export interface SetupRequest {
  readonly playerCount: PlayerCount
  readonly seed: number
}

/** The play area is centred on the origin; boardBounds is what the view uses,
 *  so no world offset needs choosing here. */
const PLAY_AREA_CENTRE: Point = { x: 0, y: 0 }

/**
 * §4.1 / §4.3 — M3 seeded setup generation (SCRUM-4 AC1, 4-9).
 *
 * Pure: the same seed and playerCount produce an identical GameState (AC8), and
 * no Math.random(), Date.now() or object-key iteration is reachable from here.
 * Every sampling decision comes from the one Rng created below, drawn in a fixed
 * order, so inserting a draw changes every downstream board — which is why the
 * order is not rearranged casually.
 *
 * Throws SetupGenerationError rather than returning a partial or illegal board:
 * a per-element ceiling is exhausted, or the assembled board fails
 * validateSetup's whole-board gate (AC9).
 */
export function generateSetup(request: SetupRequest, config: RulesConfig): GameState {
  const { playerCount, seed } = request
  const rng = createRng(seed)
  const sideCount = sideCountFor(playerCount)

  try {
    const borderLoop = regularPolygon(PLAY_AREA_CENTRE, sideCount, config.borderPerimeter)
    const mountainLoop = sampleMountain(PLAY_AREA_CENTRE, borderLoop, sideCount, config, rng)
    const riverPath = sampleRiver(borderLoop, mountainLoop, config, rng)

    // The river is an OPEN arc (§4.1 step 3) and is passed unwrapped; only the
    // mountain is a closed loop. Wrapping the river would invent a phantom
    // chord back to its mouth, and setupValidation's own station checks make
    // exactly the same distinction — sampler and gate must agree or a legal
    // board fails the final gate on some seeds.
    const blockers: readonly Polyline[] = [riverPath, closeLoop(mountainLoop)]

    // §9 — the 2-player variant takes FOUR colour-seats mapped to two owners,
    // in turn order [A1, B1, A2, B2]. Colours are consumed in COLOUR_SEATS
    // order and owners alternate, so seat k takes corner k: owner A lands on
    // corners 0 and 2, owner B on 1 and 3 — opposite corners for free (AC4).
    const seatCount = playerCount === 2 ? 4 : playerCount
    const ownerFor = (index: number): string =>
      playerCount === 2 ? `P${(index % 2) + 1}` : `P${index + 1}`

    const stations: PlacedStation[] = []
    const seats: ColourSeat[] = []
    const startingDefinition = STATION_DEFINITIONS[STATION_TYPE.STARTING]

    for (let index = 0; index < seatCount; index++) {
      const colour = asColourId(COLOUR_SEATS[index].id)
      const rect = placeCornerStation(
        index,
        borderLoop,
        blockers,
        stations.map((station) => station.rect),
        config,
        rng,
      )
      const stationId = asStationId(`${COLOUR_SEATS[index].id}-START`)

      stations.push({
        card: {
          id: stationId,
          type: STATION_TYPE.STARTING,
          bonusFirst: startingDefinition.bonusFirst,
          bonusLater: startingDefinition.bonusLater,
          playerLimit: startingDefinition.playerLimit,
          flags: startingDefinition.flags,
        },
        rect,
        // Its own colour, so §9's marker penalty fires when ANOTHER colour —
        // including the same owner's other colour — scores here. STARTING has
        // markerPenalty but not needsMarker, and scoring.ts only fires an
        // effect when markerOwner is non-null, so leaving this null would
        // silently disable the penalty. No marker is spent: §2 ships the
        // starting station as its own component and §2.1's two markers are for
        // Landmark and Depot.
        markerOwner: colour,
        connections: new Map(),
        firstConnector: null,
        // Setup places stations in corners and the mountain is a central loop
        // that may touch neither, so this is false by construction — but it is
        // derived, not assumed, so a retuned mountain cannot make it a lie.
        insideMountain: rectFullyInside(rect, mountainLoop),
      })

      seats.push({
        colour,
        owner: asPlayerId(ownerFor(index)),
        shortStringsLeft: SHORT_STRINGS_PER_SEAT,
        longStringsLeft: LONG_STRINGS_PER_SEAT,
        markersLeft: MARKERS_PER_SEAT,
        startingStationId: stationId,
        score: 0,
      })
    }

    const paths: readonly PlacedPath[] = [
      {
        id: asPathId('BORDER'),
        kind: PATH_KIND.BORDER,
        owner: null,
        path: borderLoop,
        placedOnTurn: 0,
      },
      {
        id: asPathId('MOUNTAIN'),
        kind: PATH_KIND.MOUNTAIN,
        owner: null,
        path: mountainLoop,
        placedOnTurn: 0,
      },
      {
        id: asPathId('RIVER'),
        kind: PATH_KIND.RIVER,
        owner: null,
        path: riverPath,
        placedOnTurn: 0,
      },
    ]

    const state: GameState = {
      seats,
      turnOrder: seats.map((seat) => seat.colour),
      round: 1,
      activeSeatIndex: 0,
      phase: TURN_PHASE.STATION,
      pendingCard: null,
      stationStepFailures: 0,
      extraDraws: 0,
      drewRuralAlready: false,
      deck: buildDeck(config.deckComposition, rng),
      stations,
      paths,
      moveLog: [],
      lastScoring: null,
      lastDraw: [],
      status: 'IN_PLAY',
    }

    // AC9's gate. A sampler bug that produced a subtly illegal board surfaces
    // here as named failures rather than reaching the reducer.
    const validation = validateSetup(state, config)
    if (!validation.ok) {
      throw new SetupGenerationError(seed, playerCount, validation.failures)
    }
    return state
  } catch (error) {
    if (error instanceof SetupSamplerError) {
      throw new SetupGenerationError(seed, playerCount, error.failures)
    }
    throw error
  }
}

/**
 * Axis-aligned bounds of every path vertex and station rect, padded by one card
 * width. Pure and exported so Board.tsx's viewBox is unit-testable without a
 * renderer, and so a later pan/zoom story has the same box to work from.
 *
 * Never returns a zero dimension: an SVG viewBox with a zero width renders
 * nothing and reports no error, which is exactly the silent-NaN class of bug
 * web-project.md warns about.
 */
export function boardBounds(state: GameState, config: RulesConfig): Rect {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const path of state.paths) {
    for (const point of path.path) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
  }
  for (const station of state.stations) {
    minX = Math.min(minX, station.rect.x)
    minY = Math.min(minY, station.rect.y)
    maxX = Math.max(maxX, station.rect.x + station.rect.width)
    maxY = Math.max(maxY, station.rect.y + station.rect.height)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { x: 0, y: 0, width: config.cardSize, height: config.cardSize }
  }

  const pad = config.cardSize
  return {
    x: minX - pad,
    y: minY - pad,
    width: Math.max(maxX - minX + pad * 2, config.cardSize),
    height: Math.max(maxY - minY + pad * 2, config.cardSize),
  }
}
