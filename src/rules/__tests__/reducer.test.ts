import { describe, expect, it } from 'vitest'
import { DRAW_EVENT, MOVE_KIND, TURN_PHASE } from '../../constants/game'
import { STATION_TYPE } from '../../constants/stations'
import { asColourId, asStationId } from '../types'
import type { GameState, Move } from '../types'
import { gameReducer } from '../reducer'
import { TEST_CONFIG, makeCard, makeSeat, makeState, makeStation } from './fixtures'

const PINK = asColourId('PINK')

/** Two stations exactly config.shortStringLength (400) apart, reachable by a
 *  straight string — mirrors search.test.ts's own "reachable" fixture. */
function reachableStations() {
  const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
  const stationB = makeStation(STATION_TYPE.HAMLET, { x: 440, y: 240, width: 20, height: 20 })
  return { stationA, stationB }
}

function legalStringState(overrides?: Partial<GameState>): GameState {
  const { stationA, stationB } = reachableStations()
  const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
  return makeState({
    seats: [seat],
    turnOrder: [PINK],
    activeSeatIndex: 0,
    phase: TURN_PHASE.STRING,
    stations: [stationA, stationB],
    ...overrides,
  })
}

const LEGAL_STRING_PATH = [
  { x: 50, y: 250 },
  { x: 450, y: 250 },
]

describe('gameReducer', () => {
  it('appends every applied move to the move log', () => {
    const state = legalStringState()
    const move: Move = { kind: MOVE_KIND.FORFEIT_STRING }

    const result = gameReducer(state, move, TEST_CONFIG)

    expect(result.moveLog).toEqual([...state.moveLog, move])
  })

  it('returns state unchanged when PLACE_STRING fails validation', () => {
    const state = legalStringState()
    // A path far too short to satisfy M6's arc-length tolerance.
    const move: Move = {
      kind: MOVE_KIND.PLACE_STRING,
      stringKind: 'SHORT_RAIL',
      path: [
        { x: 50, y: 250 },
        { x: 51, y: 250 },
      ],
    }

    const result = gameReducer(state, move, TEST_CONFIG)

    expect(result).toBe(state)
  })

  it('does not append a rejected move to the log', () => {
    const { stationA, stationB } = reachableStations()
    const card = makeCard(STATION_TYPE.HAMLET, { id: asStationId('C') })
    const state = makeState({
      seats: [makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })],
      turnOrder: [PINK],
      activeSeatIndex: 0,
      phase: TURN_PHASE.STATION,
      pendingCard: card,
      stations: [stationA, stationB],
    })
    // Overlaps stationB, so validateStationPlacement rejects it.
    const move: Move = { kind: MOVE_KIND.PLACE_STATION, cardId: card.id, rect: stationB.rect }

    const result = gameReducer(state, move, TEST_CONFIG)

    expect(result.moveLog).toHaveLength(state.moveLog.length)
  })

  it('returns state unchanged when PLACE_STATION fails validation', () => {
    const card = makeCard(STATION_TYPE.HAMLET, { id: asStationId('C') })
    const state = makeState({
      seats: [makeSeat('PINK', 'P1')],
      turnOrder: [PINK],
      activeSeatIndex: 0,
      phase: TURN_PHASE.STATION,
      pendingCard: card,
    })
    // Outside the 500x500 default border entirely.
    const move: Move = {
      kind: MOVE_KIND.PLACE_STATION,
      cardId: card.id,
      rect: { x: 1000, y: 1000, width: 20, height: 20 },
    }

    const result = gameReducer(state, move, TEST_CONFIG)

    expect(result).toBe(state)
    // AC4 — an illegal placement leaves the trace untouched too, not just the board.
    expect(result.lastDraw).toEqual(state.lastDraw)
  })

  it('records the draw trace on lastDraw when a turn begins', () => {
    const state = makeState({
      seats: [makeSeat('PINK', 'P1')],
      turnOrder: [PINK],
      activeSeatIndex: 0,
      phase: TURN_PHASE.STATION,
      deck: [makeCard(STATION_TYPE.HAMLET)],
    })

    const result = gameReducer(state, { kind: MOVE_KIND.BEGIN_TURN }, TEST_CONFIG)

    expect(result.lastDraw.map((event) => event.kind)).toEqual([DRAW_EVENT.DREW])
  })

  it('records EXTRA_DRAW_FROM_RURAL and the follow-on draw when a Rural is placed (AC5)', () => {
    const ruralCard = makeCard(STATION_TYPE.RURAL, { id: asStationId('RURAL-1') })
    const nextCard = makeCard(STATION_TYPE.HAMLET, { id: asStationId('NEXT') })
    const state = makeState({
      seats: [makeSeat('PINK', 'P1')],
      turnOrder: [PINK],
      activeSeatIndex: 0,
      phase: TURN_PHASE.STATION,
      pendingCard: ruralCard,
      deck: [nextCard],
    })
    const move: Move = {
      kind: MOVE_KIND.PLACE_STATION,
      cardId: ruralCard.id,
      // Well clear of the 500x500 default border's edges.
      rect: { x: 100, y: 100, width: 20, height: 20 },
    }

    const result = gameReducer(state, move, TEST_CONFIG)

    expect(result.lastDraw.map((event) => event.kind)).toEqual([
      DRAW_EVENT.EXTRA_DRAW_FROM_RURAL,
      DRAW_EVENT.DREW,
    ])
    // The chain is still open for exactly one more card — phase stays STATION.
    expect(result.phase).toBe(TURN_PHASE.STATION)
    expect(result.pendingCard).not.toBeNull()
  })

  it('records RURAL_CHAIN_CAPPED and queues nothing on a second Rural (§7.3, AC5)', () => {
    const secondRural = makeCard(STATION_TYPE.RURAL, { id: asStationId('RURAL-2') })
    const state = makeState({
      seats: [makeSeat('PINK', 'P1')],
      turnOrder: [PINK],
      activeSeatIndex: 0,
      phase: TURN_PHASE.STATION,
      pendingCard: secondRural,
      drewRuralAlready: true,
      extraDraws: 0,
    })
    const move: Move = {
      kind: MOVE_KIND.PLACE_STATION,
      cardId: secondRural.id,
      rect: { x: 100, y: 100, width: 20, height: 20 },
    }

    const result = gameReducer(state, move, TEST_CONFIG)

    expect(result.lastDraw.map((event) => event.kind)).toEqual([DRAW_EVENT.RURAL_CHAIN_CAPPED])
    expect(result.extraDraws).toBe(0)
    expect(result.phase).toBe(TURN_PHASE.STRING)
  })

  it('applies scoring on a legal PLACE_STRING and records lastScoring', () => {
    const state = legalStringState()
    const move: Move = {
      kind: MOVE_KIND.PLACE_STRING,
      stringKind: 'SHORT_RAIL',
      path: LEGAL_STRING_PATH,
    }

    const result = gameReducer(state, move, TEST_CONFIG)

    expect(result.lastScoring).not.toBeNull()
    expect(result.lastScoring?.colour).toBe(PINK)
    const seat = result.seats.find((candidate) => candidate.colour === PINK)
    expect(seat?.score).toBe(result.lastScoring?.net)
  })

  it('spends a short string from supply on a legal PLACE_STRING', () => {
    const state = legalStringState()
    const move: Move = {
      kind: MOVE_KIND.PLACE_STRING,
      stringKind: 'SHORT_RAIL',
      path: LEGAL_STRING_PATH,
    }

    const result = gameReducer(state, move, TEST_CONFIG)

    const seat = result.seats.find((candidate) => candidate.colour === PINK)
    expect(seat?.shortStringsLeft).toBe(3)
  })

  it('keeps the string in supply on FORFEIT_STRING but still advances the turn (M9)', () => {
    const state = legalStringState({ turnOrder: [PINK, asColourId('BLUE')] })
    const forfeit: Move = { kind: MOVE_KIND.FORFEIT_STRING }

    const afterForfeit = gameReducer(state, forfeit, TEST_CONFIG)
    const seat = afterForfeit.seats.find((candidate) => candidate.colour === PINK)
    expect(seat?.shortStringsLeft).toBe(4)
    expect(afterForfeit.phase).toBe(TURN_PHASE.COMPLETE)

    const endTurn: Move = { kind: MOVE_KIND.END_TURN }
    const afterEndTurn = gameReducer(afterForfeit, endTurn, TEST_CONFIG)
    expect(afterEndTurn.activeSeatIndex).toBe(1)
  })

  it('throws on a move dispatched in the wrong phase', () => {
    const state = makeState({
      seats: [makeSeat('PINK', 'P1')],
      turnOrder: [PINK],
      activeSeatIndex: 0,
      phase: TURN_PHASE.STATION,
    })
    const move: Move = {
      kind: MOVE_KIND.PLACE_STRING,
      stringKind: 'SHORT_RAIL',
      path: LEGAL_STRING_PATH,
    }

    expect(() => gameReducer(state, move, TEST_CONFIG)).toThrow()
  })

  it('throws on PLACE_STATION naming a cardId that is not the pending card', () => {
    const pendingCard = makeCard(STATION_TYPE.HAMLET, { id: asStationId('PENDING') })
    const state = makeState({
      seats: [makeSeat('PINK', 'P1')],
      turnOrder: [PINK],
      activeSeatIndex: 0,
      phase: TURN_PHASE.STATION,
      pendingCard,
    })
    const move: Move = {
      kind: MOVE_KIND.PLACE_STATION,
      cardId: asStationId('SOMEONE-ELSE'),
      rect: { x: 0, y: 0, width: 20, height: 20 },
    }

    expect(() => gameReducer(state, move, TEST_CONFIG)).toThrow()
  })

  it('throws on PLACE_STRING for a string kind the seat has none of', () => {
    const state = legalStringState({
      seats: [
        makeSeat('PINK', 'P1', {
          startingStationId: reachableStations().stationA.card.id,
          shortStringsLeft: 0,
        }),
      ],
    })
    const move: Move = {
      kind: MOVE_KIND.PLACE_STRING,
      stringKind: 'SHORT_RAIL',
      path: LEGAL_STRING_PATH,
    }

    expect(() => gameReducer(state, move, TEST_CONFIG)).toThrow()
  })

  it('produces identical state when the same move log is replayed from the same start', () => {
    const card = makeCard(STATION_TYPE.HAMLET, { id: asStationId('REPLAY-CARD') })
    const initial = makeState({
      seats: [makeSeat('PINK', 'P1')],
      turnOrder: [PINK],
      activeSeatIndex: 0,
      round: 1,
      phase: TURN_PHASE.STATION,
      deck: [card],
    })

    const afterBegin = gameReducer(initial, { kind: MOVE_KIND.BEGIN_TURN }, TEST_CONFIG)
    const placeMove: Move = {
      kind: MOVE_KIND.PLACE_STATION,
      cardId: afterBegin.pendingCard!.id,
      // Well clear of the border edge — a rect at (0,0) would touch the
      // border string itself (§5.2's TOUCHES_STRING) and be rejected.
      rect: { x: 100, y: 100, width: 20, height: 20 },
    }
    const afterPlace = gameReducer(afterBegin, placeMove, TEST_CONFIG)
    const afterForfeit = gameReducer(afterPlace, { kind: MOVE_KIND.FORFEIT_STRING }, TEST_CONFIG)
    const finalState = gameReducer(afterForfeit, { kind: MOVE_KIND.END_TURN }, TEST_CONFIG)

    // Round-trip the log through JSON to prove it is ordinary serializable
    // data, then replay it from the same starting state via nothing but the
    // logged moves.
    const serializedLog = JSON.parse(JSON.stringify(finalState.moveLog)) as readonly Move[]
    let replayed: GameState = initial
    for (const loggedMove of serializedLog) {
      replayed = gameReducer(replayed, loggedMove, TEST_CONFIG)
    }

    expect(replayed).toEqual(finalState)
  })

  it('does not mutate the state object it was given', () => {
    const state = legalStringState()
    const before = structuredClone(state)
    const move: Move = {
      kind: MOVE_KIND.PLACE_STRING,
      stringKind: 'SHORT_RAIL',
      path: LEGAL_STRING_PATH,
    }

    gameReducer(state, move, TEST_CONFIG)

    expect(state).toEqual(before)
  })
})
