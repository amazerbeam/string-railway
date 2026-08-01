import type {
  DRAW_EVENT,
  MOVE_KIND,
  PATH_KIND,
  REJECTION_REASON,
  SKIP_REASON,
  STATION_REJECTION_REASON,
  STATION_STEP_STAGE,
  TURN_PHASE,
} from '../constants/game'
import type { StationFlags, StationType } from '../constants/stations'

export type { StationFlags, StationType }

/** Branded so a PlayerId can never be passed where a ColourId is required (§9). */
export type ColourId = string & { readonly __brand: 'ColourId' }
export type PlayerId = string & { readonly __brand: 'PlayerId' }
export type StationId = string & { readonly __brand: 'StationId' }
export type PathId = string & { readonly __brand: 'PathId' }

export interface Point {
  readonly x: number
  readonly y: number
}
export type Polyline = readonly Point[]
export interface Segment {
  readonly a: Point
  readonly b: Point
}
export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export type PathKind = (typeof PATH_KIND)[keyof typeof PATH_KIND]
export type TurnPhase = (typeof TURN_PHASE)[keyof typeof TURN_PHASE]
export type RejectionReason = (typeof REJECTION_REASON)[keyof typeof REJECTION_REASON]
/** §5.2 — the three station-placement constraints, used by validateStationPlacement. */
export type StationRejectionReason =
  (typeof STATION_REJECTION_REASON)[keyof typeof STATION_REJECTION_REASON]
export type SkipReason = (typeof SKIP_REASON)[keyof typeof SKIP_REASON]
export type MoveKind = (typeof MOVE_KIND)[keyof typeof MOVE_KIND]
export type DrawEventKind = (typeof DRAW_EVENT)[keyof typeof DRAW_EVENT]
export type StationStepStage = (typeof STATION_STEP_STAGE)[keyof typeof STATION_STEP_STAGE]

export interface StationCard {
  readonly id: StationId
  readonly type: StationType
  readonly bonusFirst: number
  readonly bonusLater: number
  readonly playerLimit: number
  readonly flags: StationFlags
}

/** One step of §5.2's draw-and-recycle sequence, in the order it happened. */
export interface DrawEvent {
  readonly kind: DrawEventKind
  /** The card the event concerns; null for the two SKIPPED_* kinds, which are
   *  about the sequence terminating rather than about any one card. */
  readonly cardId: StationId | null
  readonly stationType: StationType | null
  /** Consecutive M4 failures accumulated at the moment this event fired, so the
   *  UI can say "2 of 3" without knowing the ceiling itself. */
  readonly failures: number
}

export interface PlacedStation {
  readonly card: StationCard
  readonly rect: Rect
  readonly markerOwner: ColourId | null
  /** Map, not Record: a branded key survives on a Map, and Map iteration is
   *  insertion-ordered, where object-key order is a determinism hazard. */
  readonly connections: ReadonlyMap<ColourId, number>
  readonly firstConnector: ColourId | null
  readonly insideMountain: boolean
}

export interface PlacedPath {
  readonly id: PathId
  readonly kind: PathKind
  readonly owner: ColourId | null
  /**
   * Vertices in order. A CLOSED loop (BORDER, MOUNTAIN — §4.1 steps 2 and 4) is
   * stored CORNERS-ONLY: the first point is NOT repeated at the end, so the
   * ring's closing edge is implied, never present. RIVER (§4.1 step 3) and both
   * railway kinds are open and need no wrap.
   *
   * SCRUM-16 — three predicate families, three calling conventions:
   *  - EDGE-WALKING (touchesPath, touchesRect, crossings, selfIntersects,
   *    arcLength, pointTouchesPath) iterates `i < length - 1` and MISSES the
   *    closing edge if handed this array. Pass `edgePolyline(placedPath)` from
   *    './pathGeometry' instead.
   *  - LOOP-ARGUMENT (rectFullyInside, pathFullyInside — their `loop`
   *    parameter) wraps internally via containment.loopEdges. Pass this array.
   *  - ENDPOINT-SENSITIVE (entryCount, passesThrough, endsOn) reads path[0] and
   *    path[length - 1]. Pass this array — a wrapped copy collapses start onto
   *    end. Only ever called on open railway strings.
   */
  readonly path: Polyline
  readonly placedOnTurn: number
}

export interface ColourSeat {
  readonly colour: ColourId
  readonly owner: PlayerId
  readonly shortStringsLeft: number
  readonly longStringsLeft: number
  readonly markersLeft: number
  readonly startingStationId: StationId
  readonly score: number
}

export interface GameState {
  readonly seats: readonly ColourSeat[]
  readonly turnOrder: readonly ColourId[]
  readonly round: number
  readonly activeSeatIndex: number
  readonly phase: TurnPhase
  readonly pendingCard: StationCard | null
  readonly stationStepFailures: number
  readonly extraDraws: number
  readonly drewRuralAlready: boolean
  readonly deck: readonly StationCard[]
  readonly stations: readonly PlacedStation[]
  readonly paths: readonly PlacedPath[]
  readonly moveLog: readonly Move[]
  readonly lastScoring: ScoringBreakdown | null
  /** §5.2's trace for the most recent draw attempt (SCRUM-5 AC7/AC8/AC9).
   *  Transient UI-facing derived state, exactly like lastScoring — but an array
   *  rather than `| null`, because "no draw happened" and "an empty sequence of
   *  draw events" are the same fact here and every read site is a `.map` that
   *  would otherwise carry a null guard for no information gain. */
  readonly lastDraw: readonly DrawEvent[]
  readonly status: 'IN_PLAY' | 'ENDED'
}

export type Move =
  | { readonly kind: typeof MOVE_KIND.BEGIN_TURN }
  | {
      readonly kind: typeof MOVE_KIND.PLACE_STATION
      readonly cardId: StationId
      readonly rect: Rect
    }
  | { readonly kind: typeof MOVE_KIND.SKIP_STATION_STEP; readonly reason: SkipReason }
  | {
      readonly kind: typeof MOVE_KIND.PLACE_STRING
      readonly stringKind: 'SHORT_RAIL' | 'LONG_RAIL'
      readonly path: Polyline
    }
  | { readonly kind: typeof MOVE_KIND.FORFEIT_STRING }
  | { readonly kind: typeof MOVE_KIND.END_TURN }

/**
 * §10.3 scoring breakdown line types. Declared here alongside the domain model
 * (rather than in scoring.ts, which Phase 5 creates) to avoid GameState.lastScoring
 * forcing a circular import between types.ts and scoring.ts. scoring.ts re-exports
 * these under the same names.
 */
export interface ConnectionLine {
  readonly stationId: StationId
  readonly stationType: StationType
  readonly scored: boolean
  readonly tier: 'BLACK' | 'GREY' | null
  readonly base: number
  readonly mountainBonus: number
  readonly total: number
}

export interface CrossingLine {
  readonly point: Point
  readonly otherPathId: PathId
  readonly otherPathKind: PathKind
  readonly onCard: boolean
  readonly cost: number
}

export interface MarkerEffectLine {
  readonly stationId: StationId
  readonly markerOwner: ColourId
  readonly delta: number
  readonly sameOwner: boolean
}

export interface ScoringBreakdown {
  readonly colour: ColourId
  readonly connections: readonly ConnectionLine[]
  readonly crossings: readonly CrossingLine[]
  readonly markerEffects: readonly MarkerEffectLine[]
  readonly gained: number
  readonly lost: number
  readonly net: number
}

export const asColourId = (value: string): ColourId => value as ColourId
export const asPlayerId = (value: string): PlayerId => value as PlayerId
export const asStationId = (value: string): StationId => value as StationId
export const asPathId = (value: string): PathId => value as PathId
