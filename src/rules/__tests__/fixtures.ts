import { PATH_KIND, TURN_PHASE } from '../../constants/game'
import { STATION_DEFINITIONS } from '../../constants/stations'
import { asColourId, asPathId, asPlayerId, asStationId } from '../types'
import type {
  ColourId,
  ColourSeat,
  GameState,
  PathKind,
  PlacedPath,
  PlacedStation,
  Polyline,
  Rect,
  StationCard,
  StationType,
} from '../types'
import type { RulesConfig } from '../config'

/**
 * Synthetic tuning values for the validate/scoring/search/turn specs. Deliberately
 * NOT the real M2 numbers (SCRUM-3a owns those in rules.json) — small round
 * figures keep the geometry readable and keep the "no hard-coded tunable" grep
 * over src/ meaningful, since these live only in test fixtures.
 */
export const TEST_CONFIG: RulesConfig = {
  shortStringLength: 400,
  longStringLength: 800,
  arcLengthTolerance: 0.02,
  tangencyTolerance: 0.5,
  cardSize: 20,
  borderPerimeter: 2000,
  mountainLength: 700,
  riverLength: 350,
  deckComposition: {
    HAMLET: 6,
    VILLAGE: 6,
    TOWN: 5,
    SCENIC: 4,
    RURAL: 4,
    TERMINUS: 3,
    RAILYARD: 3,
    LANDMARK: 2,
    DEPOT: 2,
  },
}

/** A closed 500x500 loop, corners only (no repeated closing point) — matches the
 *  SQUARE convention already used in containment.test.ts. */
const DEFAULT_BORDER_LOOP: Polyline = [
  { x: 0, y: 0 },
  { x: 500, y: 0 },
  { x: 500, y: 500 },
  { x: 0, y: 500 },
]

/**
 * A fresh GameState: a 500x500 square border, no terrain, no stations, no seats,
 * and mid-turn defaults for every loop-local field §10.4 needs. `paths` defaults
 * to a single BORDER path — if a caller overrides `paths`, THEY own including a
 * border path, or every border-containment check (§10.2 check 9, §5.2's
 * NOT_INSIDE_BORDER) silently passes against a border that isn't there rather
 * than failing loudly.
 */
export function makeState(overrides?: Partial<GameState>): GameState {
  const defaults: GameState = {
    seats: [],
    turnOrder: [],
    round: 1,
    activeSeatIndex: 0,
    phase: TURN_PHASE.STRING,
    pendingCard: null,
    stationStepFailures: 0,
    extraDraws: 0,
    drewRuralAlready: false,
    deck: [],
    stations: [],
    paths: [makePath(PATH_KIND.BORDER, DEFAULT_BORDER_LOOP)],
    moveLog: [],
    lastScoring: null,
    lastDraw: [],
    status: 'IN_PLAY',
  }
  return { ...defaults, ...overrides }
}

/** A seat, defaulting to 4 short + 1 long strings and 2 markers (§2.1). */
export function makeSeat(
  colour: string,
  owner: string,
  overrides?: Partial<ColourSeat>,
): ColourSeat {
  const seat: ColourSeat = {
    colour: asColourId(colour),
    owner: asPlayerId(owner),
    shortStringsLeft: 4,
    longStringsLeft: 1,
    markersLeft: 2,
    startingStationId: asStationId(`${colour}-START`),
    score: 0,
  }
  return { ...seat, ...overrides }
}

/** A placed station of the given type at the given rect, with no connections yet. */
export function makeStation(
  type: StationType,
  rect: Rect,
  overrides?: Partial<PlacedStation>,
): PlacedStation {
  const definition = STATION_DEFINITIONS[type]
  const station: PlacedStation = {
    card: {
      id: asStationId(`${type}-${rect.x}-${rect.y}`),
      type,
      bonusFirst: definition.bonusFirst,
      bonusLater: definition.bonusLater,
      playerLimit: definition.playerLimit,
      flags: definition.flags,
    },
    rect,
    markerOwner: null,
    connections: new Map<ColourId, number>(),
    firstConnector: null,
    insideMountain: false,
  }
  return { ...station, ...overrides }
}

/**
 * A raw, unplaced StationCard — for building `deck` arrays directly (turn.ts,
 * reducer.ts specs), distinct from makeStation's already-placed
 * PlacedStation. `id` defaults to a value unique enough for a small test
 * deck; pass one explicitly when a test needs to name a specific card.
 */
export function makeCard(type: StationType, overrides?: Partial<StationCard>): StationCard {
  const definition = STATION_DEFINITIONS[type]
  const card: StationCard = {
    id: asStationId(`${type}-CARD`),
    type,
    bonusFirst: definition.bonusFirst,
    bonusLater: definition.bonusLater,
    playerLimit: definition.playerLimit,
    flags: definition.flags,
  }
  return { ...card, ...overrides }
}

/** A placed path with no owner unless one is given — terrain paths (border,
 *  river, mountain) are ownerless per §10; railway strings pass their colour. */
export function makePath(kind: PathKind, points: Polyline, owner?: ColourId): PlacedPath {
  return {
    id: asPathId(`${kind}-${points.map((point) => `${point.x},${point.y}`).join('|')}`),
    kind,
    owner: owner ?? null,
    path: points,
    placedOnTurn: 0,
  }
}
