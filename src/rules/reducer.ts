/**
 * (state, move) => state. The single entry point the UI dispatches against;
 * moveLog is the only history undo and replay derive from. Validation runs
 * before any state change, so an illegal PLACE_STATION or PLACE_STRING
 * returns the input state untouched and is never logged. A genuinely
 * impossible input — wrong phase, an unknown pendingCard, a string kind the
 * seat has none of — throws, because that is a caller bug, not a player
 * mistake, and swallowing it would let the board and the move log diverge
 * silently. No branch below catches an error and returns a success shape.
 */
import { MOVE_KIND, PATH_KIND, TURN_PHASE } from '../constants/game'
import { validateStationPlacement, validateStringPlacement } from './validate'
import { applyScoring, resolveScoring } from './scoring'
import { advanceTurn, beginStationStep, commitStationPlacement } from './turn'
import { asPathId } from './types'
import type { RulesConfig } from './config'
import type { GameState, Move, PlacedPath } from './types'

function appendMove(state: GameState, move: Move): GameState {
  return { ...state, moveLog: [...state.moveLog, move] }
}

/**
 * §10.4 step 1's setup: resets the loop locals exactly once per turn
 * (extraDraws, drewRuralAlready, stationStepFailures), then runs the first
 * draw-and-recycle slot. Phase stays STATION whether a pendingCard comes
 * back or the very first card exhausts to a skip — a skip on the FIRST card
 * of a turn (zero placements made) requires the caller to follow up with an
 * explicit SKIP_STATION_STEP, which is what keeps that transition in the
 * move log rather than smuggled inside BEGIN_TURN's own effect.
 */
function applyBeginTurn(state: GameState, move: Move, config: RulesConfig): GameState {
  if (state.phase !== TURN_PHASE.STATION) {
    throw new Error('gameReducer: BEGIN_TURN dispatched outside phase STATION')
  }
  if (state.pendingCard !== null) {
    throw new Error(
      'gameReducer: BEGIN_TURN dispatched with a pendingCard already awaiting placement',
    )
  }

  const reset: GameState = {
    ...state,
    extraDraws: 0,
    drewRuralAlready: false,
    stationStepFailures: 0,
  }
  const outcome = beginStationStep(reset, config)
  return appendMove(outcome.state, move)
}

/**
 * Validates, then commits, the pending card at the named rect. If the
 * commit queues a Rural extra draw (M16's marker attach is unconditional
 * inside commitStationPlacement itself), this draws the next card
 * immediately — still within this one PLACE_STATION dispatch — and only
 * transitions phase to STRING once extraDraws is fully spent, whether that
 * spending ends in another placeable card, a mid-chain skip (M4/M5, which
 * simply ends step 1 without a separate move — a placement already
 * happened this turn), or was never queued at all.
 */
function applyPlaceStation(
  state: GameState,
  move: Extract<Move, { kind: typeof MOVE_KIND.PLACE_STATION }>,
  config: RulesConfig,
): GameState {
  if (state.phase !== TURN_PHASE.STATION) {
    throw new Error('gameReducer: PLACE_STATION dispatched outside phase STATION')
  }
  if (state.pendingCard === null || state.pendingCard.id !== move.cardId) {
    throw new Error('gameReducer: PLACE_STATION cardId does not match the pending card')
  }

  const result = validateStationPlacement(state, move.rect, config)
  if (!result.ok) {
    return state
  }

  const committed = commitStationPlacement(state, move.rect, config)

  let finalState: GameState
  if (committed.extraDraws > 0) {
    const outcome = beginStationStep(committed, config)
    finalState = {
      ...outcome.state,
      phase: outcome.state.pendingCard ? TURN_PHASE.STATION : TURN_PHASE.STRING,
    }
  } else {
    finalState = { ...committed, phase: TURN_PHASE.STRING }
  }

  return appendMove(finalState, move)
}

/**
 * Only legal when the draw-and-recycle sequence has already exhausted to a
 * skip on the FIRST card of the turn (phase STATION, no pendingCard) —
 * formally transitions to the string step and logs the reason.
 */
function applySkipStationStep(
  state: GameState,
  move: Extract<Move, { kind: typeof MOVE_KIND.SKIP_STATION_STEP }>,
): GameState {
  if (state.phase !== TURN_PHASE.STATION || state.pendingCard !== null) {
    throw new Error(
      'gameReducer: SKIP_STATION_STEP dispatched when a station step was not exhausted',
    )
  }

  const finalState: GameState = { ...state, phase: TURN_PHASE.STRING, stationStepFailures: 0 }
  return appendMove(finalState, move)
}

/**
 * §10.2 validation, then §10.3 scoring, in the order resolveScoring's
 * contract requires: it treats every entry in state.paths as previously
 * placed, so scoring resolves BEFORE the new path is appended. Spends one
 * string of the dispatched kind from the active seat's supply and moves
 * phase to COMPLETE — scoring is synchronous with placement, so there is no
 * separate "scoring" phase to wait in.
 */
function applyPlaceString(
  state: GameState,
  move: Extract<Move, { kind: typeof MOVE_KIND.PLACE_STRING }>,
  config: RulesConfig,
): GameState {
  if (state.phase !== TURN_PHASE.STRING) {
    throw new Error('gameReducer: PLACE_STRING dispatched outside phase STRING')
  }

  const colour = state.turnOrder[state.activeSeatIndex]
  const seat = state.seats.find((candidate) => candidate.colour === colour)
  if (!seat) {
    throw new Error('gameReducer: no seat found for the active colour')
  }

  const stringsLeft =
    move.stringKind === 'SHORT_RAIL' ? seat.shortStringsLeft : seat.longStringsLeft
  if (stringsLeft <= 0) {
    throw new Error(
      `gameReducer: PLACE_STRING dispatched for a ${move.stringKind} the seat has none of`,
    )
  }

  const result = validateStringPlacement(state, colour, move.stringKind, move.path, config)
  if (!result.ok) {
    return state
  }

  const newPath: PlacedPath = {
    id: asPathId(`${colour}-path-${state.moveLog.length}`),
    kind: move.stringKind === 'SHORT_RAIL' ? PATH_KIND.SHORT_RAIL : PATH_KIND.LONG_RAIL,
    owner: colour,
    path: move.path,
    placedOnTurn: state.round,
  }

  const breakdown = resolveScoring(state, colour, newPath, config)
  const scored = applyScoring(state, breakdown)

  const seats = scored.seats.map((candidate) => {
    if (candidate.colour !== colour) {
      return candidate
    }
    return move.stringKind === 'SHORT_RAIL'
      ? { ...candidate, shortStringsLeft: candidate.shortStringsLeft - 1 }
      : { ...candidate, longStringsLeft: candidate.longStringsLeft - 1 }
  })

  const finalState: GameState = {
    ...scored,
    seats,
    paths: [...scored.paths, newPath],
    phase: TURN_PHASE.COMPLETE,
  }

  return appendMove(finalState, move)
}

/**
 * M9 — the string stays in supply; nothing here re-derives
 * hasAnyLegalStringPlacement, trusting the caller's own determination that
 * no legal placement existed. Moves phase to COMPLETE exactly like a
 * successful PLACE_STRING, so END_TURN still advances normally afterward.
 *
 * Deliberate, accepted exception to this file's own header philosophy
 * ("a genuinely impossible input throws, because that is a caller bug, not
 * a player mistake"). The only thing this move's legality could re-check is
 * hasAnyLegalStringPlacement, and search.ts documents that search as NOT
 * false-negative-safe — it enumerates only straight segments and two
 * symmetric single-bend detours per station pair, so a legal-but-elaborate
 * placement can exist that it fails to find. Turning that into a throw
 * source here would couple a known search limitation to a hard crash: a
 * player who actually had a legal move available, just one the search
 * missed, would get an exception instead of their turn. Trusting the
 * caller's own determination is the accepted trade-off, not an oversight.
 */
function applyForfeitString(
  state: GameState,
  move: Extract<Move, { kind: typeof MOVE_KIND.FORFEIT_STRING }>,
): GameState {
  if (state.phase !== TURN_PHASE.STRING) {
    throw new Error('gameReducer: FORFEIT_STRING dispatched outside phase STRING')
  }

  const finalState: GameState = { ...state, phase: TURN_PHASE.COMPLETE }
  return appendMove(finalState, move)
}

function applyEndTurn(
  state: GameState,
  move: Extract<Move, { kind: typeof MOVE_KIND.END_TURN }>,
): GameState {
  if (state.phase !== TURN_PHASE.COMPLETE) {
    throw new Error('gameReducer: END_TURN dispatched outside phase COMPLETE')
  }

  const advanced = advanceTurn(state)
  return appendMove(advanced, move)
}

export function gameReducer(state: GameState, move: Move, config: RulesConfig): GameState {
  switch (move.kind) {
    case MOVE_KIND.BEGIN_TURN:
      return applyBeginTurn(state, move, config)
    case MOVE_KIND.PLACE_STATION:
      return applyPlaceStation(state, move, config)
    case MOVE_KIND.SKIP_STATION_STEP:
      return applySkipStationStep(state, move)
    case MOVE_KIND.PLACE_STRING:
      return applyPlaceString(state, move, config)
    case MOVE_KIND.FORFEIT_STRING:
      return applyForfeitString(state, move)
    case MOVE_KIND.END_TURN:
      return applyEndTurn(state, move)
  }
}
