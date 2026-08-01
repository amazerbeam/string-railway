/**
 * §10.4 — the turn loop, reshaped into resumable state transitions. The
 * pseudocode's loop-local variables (extraDraws, drewRuralAlready, failures)
 * live on GameState (extraDraws, drewRuralAlready, stationStepFailures)
 * because a reducer cannot hold a `while` loop open across dispatches: each
 * function here handles one slice of the loop and hands back a new
 * GameState for the next dispatch (or the next internal call, for the Rural
 * chain) to continue from. reducer.ts is what sequences these calls against
 * a Move; this module never appends to moveLog itself.
 */
import { DRAW_EVENT, PATH_KIND, TURN_PHASE } from '../constants/game'
import { SKIP_REASON } from '../constants/game'
import { rectFullyInside } from './containment'
import { hasLegalStationPlacement } from './search'
import type { RulesConfig } from './config'
import type {
  ColourSeat,
  DrawEvent,
  DrawEventKind,
  GameState,
  PlacedStation,
  Rect,
  SkipReason,
  StationCard,
} from './types'

/**
 * §5.5 / §10.4 — exactly five turns per colour-seat before the game ends.
 * Rulebook constant, not a rules.json tunable — M2/M6/M8 are the tunables
 * that live in RulesConfig; the round count is fixed by the rulebook itself.
 */
const ROUNDS_PER_GAME = 5

/**
 * M4 — after this many consecutive failures to place a drawn card, step 1
 * is skipped. §10.4's literal `failures >= 3`. Rulebook constant, not a
 * rules.json tunable.
 *
 * Exported so UI copy can state the ceiling ("2 of 3") without a literal.
 */
export const MAX_STATION_STEP_FAILURES = 3

export interface StationStepOutcome {
  readonly state: GameState
  readonly skipped: SkipReason | null
  /** §5.2's sequence, in the order it happened, so the UI can show a recycle
   *  instead of silently presenting whatever card finally succeeded. */
  readonly events: readonly DrawEvent[]
}

function activeSeat(state: GameState): ColourSeat {
  const colour = state.turnOrder[state.activeSeatIndex]
  const seat = state.seats.find((candidate) => candidate.colour === colour)
  if (!seat) {
    throw new Error(`turn.ts: no seat found for active colour "${String(colour)}"`)
  }
  return seat
}

/**
 * §10.4 step 1's draw-and-recycle sequence for a single "slot" in the while
 * loop: consumes one queued extra draw if present (mirrors the pseudocode's
 * `if extraDraws > 0: extraDraws -= 1`, which runs unconditionally at the
 * top of every iteration — the first one included, where it is simply a
 * no-op since extraDraws starts at 0), then draws until it finds a card the
 * active seat can legally place. Two recycle reasons put a card to the
 * BOTTOM of the deck, never a discard, never a reshuffle:
 *  - the card needsMarker and the seat has none left (does not count toward
 *    the M4 failure count — the card was never evaluated for placement);
 *  - the card has no legal placement anywhere on the board (M4 — counts
 *    toward the failure count).
 *
 * Terminates either with `skipped: null` and `pendingCard` set to the
 * placeable card, or with a SkipReason: DECK_EMPTY (M5) if the deck runs dry
 * before a placeable card turns up, or NO_LEGAL_PLACEMENT (M4) once
 * MAX_STATION_STEP_FAILURES consecutive unplaceable draws accumulate.
 * stationStepFailures is NOT reset here — it resets exactly once per turn,
 * in reducer.ts's BEGIN_TURN handling, so failures accumulated on the FIRST
 * card of a turn still count if a Rural chain's SECOND card also fails.
 *
 * The needsMarker-recycle branch is bounded separately from `failures`: a
 * marker-starved recycle never reaches hasLegalStationPlacement, so it must
 * not silently loop forever if every remaining card in the deck needs a
 * marker the active seat does not have. `markerRecycleStreak` counts
 * consecutive marker-branch recycles and resets the moment any card is
 * actually evaluated for placement (success or failure); reaching one full
 * deck cycle (the deck's own length, measured on entry, since a recycle-only
 * loop never changes deck.length) means every card in the deck needs a
 * marker while the seat has none — a caller/setup bug, not a player
 * mistake, so this throws rather than inventing a new player-visible
 * SkipReason nowhere in §10.4 or §14.
 */
export function beginStationStep(state: GameState, config: RulesConfig): StationStepOutcome {
  const seat = activeSeat(state)

  let deck = state.deck
  let failures = state.stationStepFailures
  let extraDraws = state.extraDraws
  if (extraDraws > 0) {
    extraDraws -= 1
  }

  const events: DrawEvent[] = []
  // Reads the live `failures` at call time, so an event carries the count
  // INCLUDING its own failure when called after the increment.
  const note = (kind: DrawEventKind, card: StationCard | null): void => {
    events.push({
      kind,
      cardId: card?.id ?? null,
      stationType: card?.type ?? null,
      failures,
    })
  }

  const finish = (
    skipped: SkipReason | null,
    pendingCard: StationCard | null,
  ): StationStepOutcome => ({
    state: { ...state, deck, stationStepFailures: failures, extraDraws, pendingCard },
    skipped,
    events,
  })

  const deckSizeOnEntry = deck.length
  let markerRecycleStreak = 0

  for (;;) {
    if (deck.length === 0) {
      note(DRAW_EVENT.SKIPPED_DECK_EMPTY, null)
      return finish(SKIP_REASON.DECK_EMPTY, null)
    }

    const [card, ...rest] = deck

    if (card.flags.needsMarker && seat.markersLeft === 0) {
      deck = [...rest, card]
      note(DRAW_EVENT.RECYCLED_NEEDS_MARKER, card)
      markerRecycleStreak += 1
      if (markerRecycleStreak >= deckSizeOnEntry) {
        throw new Error(
          'beginStationStep: every remaining card in the deck needs a marker, but the active seat has none left — this cannot resolve without recycling forever',
        )
      }
      continue
    }
    markerRecycleStreak = 0

    const candidateState: GameState = {
      ...state,
      deck: rest,
      stationStepFailures: failures,
      extraDraws,
    }
    if (!hasLegalStationPlacement(candidateState, card, config)) {
      deck = [...rest, card]
      failures += 1
      note(DRAW_EVENT.RECYCLED_NO_LEGAL_PLACEMENT, card)
      if (failures >= MAX_STATION_STEP_FAILURES) {
        note(DRAW_EVENT.SKIPPED_NO_LEGAL_PLACEMENT, null)
        return finish(SKIP_REASON.NO_LEGAL_PLACEMENT, null)
      }
      continue
    }

    deck = rest
    note(DRAW_EVENT.DREW, card)
    return finish(null, card)
  }
}

/** Derived fresh from state.paths (M11), mirroring scoring.ts's own local
 *  helper of the same intent — the whole card must sit inside the mountain
 *  loop for insideMountain to be true. */
function isFullyInsideMountain(rect: Rect, state: GameState): boolean {
  return state.paths.some(
    (placedPath) =>
      placedPath.kind === PATH_KIND.MOUNTAIN && rectFullyInside(rect, placedPath.path),
  )
}

/**
 * Commits state.pendingCard at `rect`: creates the PlacedStation, attaches a
 * marker automatically when the card requires one (M16 — mandatory, never
 * optional), spending one of the active seat's markers, and applies the
 * Rural chain cap — queues one extra draw the first time a Draw Station
 * card is placed this turn; drewRuralAlready blocks a second one, so the
 * chain caps at one extra station per turn (never a third).
 *
 * Deliberately leaves `phase` untouched and does not itself draw the next
 * card even when extraDraws becomes positive: reducer.ts's PLACE_STATION
 * handling is what re-invokes beginStationStep for the queued extra draw
 * and decides, from the resulting state, whether step 1 continues or step 2
 * begins. Keeping that sequencing out of this function is what makes the
 * Rural-queuing and Rural-capping behaviours independently testable.
 */
export function commitStationPlacement(
  state: GameState,
  rect: Rect,
  config: RulesConfig,
): GameState {
  // No RulesConfig field is read directly here — kept for signature symmetry
  // with the sibling validate/score functions this composes with in the
  // reducer, and because a future card-dependent footprint would need it.
  // `void` (not an underscore-prefixed name) is the idiom that reliably
  // passes @typescript-eslint/no-unused-vars for a trailing unused
  // parameter — see search.ts's hasLegalStationPlacement.
  void config

  const card = state.pendingCard
  if (!card) {
    throw new Error('commitStationPlacement: state.pendingCard is null')
  }
  const colour = state.turnOrder[state.activeSeatIndex]

  const station: PlacedStation = {
    card,
    rect,
    markerOwner: card.flags.needsMarker ? colour : null,
    connections: new Map(),
    firstConnector: null,
    insideMountain: isFullyInsideMountain(rect, state),
  }

  const seats = card.flags.needsMarker
    ? state.seats.map((seat) =>
        seat.colour === colour ? { ...seat, markersLeft: seat.markersLeft - 1 } : seat,
      )
    : state.seats

  let extraDraws = state.extraDraws
  let drewRuralAlready = state.drewRuralAlready
  if (card.flags.drawStation && !drewRuralAlready) {
    extraDraws += 1
    drewRuralAlready = true
  }

  return {
    ...state,
    seats,
    stations: [...state.stations, station],
    pendingCard: null,
    extraDraws,
    drewRuralAlready,
  }
}

/**
 * Advances to the next seat in turnOrder, wrapping into the next round when
 * the order cycles back to its start, and resetting phase/pendingCard for
 * the seat about to begin. Deliberately does NOT reset
 * stationStepFailures/extraDraws/drewRuralAlready — those reset exactly
 * once per turn, in reducer.ts's BEGIN_TURN handling, not here.
 */
export function advanceTurn(state: GameState): GameState {
  const seatCount = state.turnOrder.length
  const nextSeatIndex = seatCount === 0 ? 0 : (state.activeSeatIndex + 1) % seatCount
  const wrapped = nextSeatIndex === 0

  const nextState: GameState = {
    ...state,
    activeSeatIndex: nextSeatIndex,
    round: wrapped ? state.round + 1 : state.round,
    phase: TURN_PHASE.STATION,
    pendingCard: null,
    // A previous seat's draw trace must not linger into the next seat's turn,
    // in the window between END_TURN and that seat's own BEGIN_TURN.
    lastDraw: [],
  }

  return isGameOver(nextState) ? { ...nextState, status: 'ENDED' } : nextState
}

/**
 * §5.5 / §10.4 — the game ends after all players have taken five turns.
 * `round` only advances past ROUNDS_PER_GAME once the LAST seat of the
 * final round has ended its turn (advanceTurn's wraparound), so this is
 * true only from that point on.
 */
export function isGameOver(state: GameState): boolean {
  return state.round > ROUNDS_PER_GAME
}
