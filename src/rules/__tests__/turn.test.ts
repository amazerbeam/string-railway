import { describe, expect, it } from 'vitest'
import { PATH_KIND, SKIP_REASON, TURN_PHASE } from '../../constants/game'
import { STATION_TYPE } from '../../constants/stations'
import { asColourId, asStationId } from '../types'
import type { GameState, Polyline } from '../types'
import { advanceTurn, beginStationStep, commitStationPlacement, isGameOver } from '../turn'
import { TEST_CONFIG, makeCard, makePath, makeSeat, makeState, makeStation } from './fixtures'

const PINK = asColourId('PINK')

/** A closed loop of the given width/height, corners only — matches
 *  fixtures.ts's own border convention. */
const border = (width: number, height: number): Polyline => [
  { x: 0, y: 0 },
  { x: width, y: 0 },
  { x: width, y: height },
  { x: 0, y: height },
]

/** A border smaller than TEST_CONFIG.cardSize (20) — no station rect can
 *  ever fit fully inside it, so hasLegalStationPlacement is always false
 *  regardless of which card is drawn. Used to force the M4 failure path. */
const HOPELESS_BORDER = border(10, 10)

/** A one-seat turnOrder state ready for the station step, with room on the
 *  board for a legal placement unless overridden. */
function stationStepState(overrides?: Partial<GameState>): GameState {
  return makeState({
    seats: [makeSeat('PINK', 'P1')],
    turnOrder: [PINK],
    activeSeatIndex: 0,
    phase: TURN_PHASE.STATION,
    ...overrides,
  })
}

describe('beginStationStep (§10.4)', () => {
  it('draws the top card and holds it as pendingCard', () => {
    const cardA = makeCard(STATION_TYPE.HAMLET, { id: asStationId('A') })
    const cardB = makeCard(STATION_TYPE.HAMLET, { id: asStationId('B') })
    const state = stationStepState({ deck: [cardA, cardB] })

    const outcome = beginStationStep(state, TEST_CONFIG)

    expect(outcome.skipped).toBeNull()
    expect(outcome.state.pendingCard).toEqual(cardA)
    expect(outcome.state.deck).toEqual([cardB])
  })

  it('recycles a needsMarker card to the bottom when the seat has no markers left', () => {
    const cardM = makeCard(STATION_TYPE.LANDMARK, { id: asStationId('M') })
    const cardN1 = makeCard(STATION_TYPE.HAMLET, { id: asStationId('N1') })
    const cardN2 = makeCard(STATION_TYPE.HAMLET, { id: asStationId('N2') })
    const state = stationStepState({
      seats: [makeSeat('PINK', 'P1', { markersLeft: 0 })],
      deck: [cardM, cardN1, cardN2],
    })

    const outcome = beginStationStep(state, TEST_CONFIG)

    expect(outcome.skipped).toBeNull()
    expect(outcome.state.pendingCard).toEqual(cardN1)
    expect(outcome.state.deck).toEqual([cardN2, cardM])
  })

  it('recycles an unplaceable card to the bottom and draws again (M4)', () => {
    const cardA = makeCard(STATION_TYPE.HAMLET, { id: asStationId('A') })
    const cardB = makeCard(STATION_TYPE.HAMLET, { id: asStationId('B') })
    const state = stationStepState({
      paths: [makePath(PATH_KIND.BORDER, HOPELESS_BORDER)],
      deck: [cardA, cardB],
    })

    const outcome = beginStationStep(state, TEST_CONFIG)

    // Hopeless board: every draw fails, so this necessarily runs to the M4
    // skip — but the recycle mechanic under test is that the SECOND draw is
    // a genuinely different card (B, not A again), evidenced by the deck's
    // rotation: [A,B] -> draw A, recycle -> [B,A] -> draw B, recycle -> [A,B]
    // -> draw A, recycle (3rd failure, break) -> [B,A].
    expect(outcome.state.deck).toEqual([cardB, cardA])
    expect(outcome.skipped).toBe(SKIP_REASON.NO_LEGAL_PLACEMENT)
  })

  it('skips the station step with NO_LEGAL_PLACEMENT after 3 consecutive failures (M4)', () => {
    const cardA = makeCard(STATION_TYPE.HAMLET, { id: asStationId('A') })
    const state = stationStepState({
      paths: [makePath(PATH_KIND.BORDER, HOPELESS_BORDER)],
      deck: [cardA],
    })

    const outcome = beginStationStep(state, TEST_CONFIG)

    expect(outcome.skipped).toBe(SKIP_REASON.NO_LEGAL_PLACEMENT)
    expect(outcome.state.pendingCard).toBeNull()
    expect(outcome.state.stationStepFailures).toBe(3)
  })

  it('skips the station step with DECK_EMPTY on an empty deck (M5)', () => {
    const state = stationStepState({ deck: [] })

    const outcome = beginStationStep(state, TEST_CONFIG)

    expect(outcome.skipped).toBe(SKIP_REASON.DECK_EMPTY)
    expect(outcome.state.pendingCard).toBeNull()
  })

  it('throws rather than recycling forever when every remaining card needs a marker the seat does not have', () => {
    // Landmark and Depot both set needsMarker; with markersLeft: 0 and no
    // other card type in the deck, every draw hits the marker-recycle branch
    // and hasLegalStationPlacement is never reached — failures never
    // advances, so without the bound this would cycle deck.length forever
    // rather than terminating. If the bound in beginStationStep were
    // removed, this test would hang (and eventually time out) rather than
    // pass, so it genuinely exercises the guard.
    const cardM1 = makeCard(STATION_TYPE.LANDMARK, { id: asStationId('M1') })
    const cardM2 = makeCard(STATION_TYPE.DEPOT, { id: asStationId('M2') })
    const cardM3 = makeCard(STATION_TYPE.LANDMARK, { id: asStationId('M3') })
    const state = stationStepState({
      seats: [makeSeat('PINK', 'P1', { markersLeft: 0 })],
      deck: [cardM1, cardM2, cardM3],
    })

    expect(() => beginStationStep(state, TEST_CONFIG)).toThrow()
  })

  it('never reshuffles — a recycled card goes to the bottom, not into a discard', () => {
    const cardM = makeCard(STATION_TYPE.LANDMARK, { id: asStationId('M') })
    const cardN1 = makeCard(STATION_TYPE.HAMLET, { id: asStationId('N1') })
    const cardN2 = makeCard(STATION_TYPE.HAMLET, { id: asStationId('N2') })
    const state = stationStepState({
      seats: [makeSeat('PINK', 'P1', { markersLeft: 0 })],
      deck: [cardM, cardN1, cardN2],
    })

    const outcome = beginStationStep(state, TEST_CONFIG)

    // cardM is still present (not discarded) and sits at the bottom of what
    // remains once cardN1 is drawn out as pendingCard.
    expect(outcome.state.deck).toEqual([cardN2, cardM])
    expect(outcome.state.pendingCard).toEqual(cardN1)
  })
})

describe('commitStationPlacement', () => {
  it('attaches a marker automatically on a Landmark or Depot (M16)', () => {
    const card = makeCard(STATION_TYPE.LANDMARK, { id: asStationId('L') })
    const state = stationStepState({
      seats: [makeSeat('PINK', 'P1', { markersLeft: 2 })],
      pendingCard: card,
    })

    const result = commitStationPlacement(state, { x: 0, y: 0, width: 20, height: 20 }, TEST_CONFIG)

    expect(result.stations).toHaveLength(1)
    expect(result.stations[0]?.markerOwner).toBe(PINK)
    expect(result.seats[0]?.markersLeft).toBe(1)
    expect(result.pendingCard).toBeNull()
  })

  it('queues one extra draw for a Rural station', () => {
    const card = makeCard(STATION_TYPE.RURAL, { id: asStationId('R') })
    const state = stationStepState({ pendingCard: card, extraDraws: 0, drewRuralAlready: false })

    const result = commitStationPlacement(state, { x: 0, y: 0, width: 20, height: 20 }, TEST_CONFIG)

    expect(result.extraDraws).toBe(1)
    expect(result.drewRuralAlready).toBe(true)
  })

  it('does not queue a third station when the second is also Rural (drewRuralAlready)', () => {
    const secondRural = makeCard(STATION_TYPE.RURAL, { id: asStationId('R2') })
    const state = stationStepState({
      pendingCard: secondRural,
      extraDraws: 1,
      drewRuralAlready: true,
      stations: [makeStation(STATION_TYPE.RURAL, { x: 0, y: 0, width: 20, height: 20 })],
    })

    const result = commitStationPlacement(
      state,
      { x: 40, y: 0, width: 20, height: 20 },
      TEST_CONFIG,
    )

    expect(result.extraDraws).toBe(1)
    expect(result.drewRuralAlready).toBe(true)
  })

  it('derives insideMountain: true for a rect placed fully inside a mountain path (M11)', () => {
    // Mountain loop matches scoring.test.ts's page-7 fixture: a closed square
    // (100,100)-(300,300). insideMountain is NOT set on the fixture — the
    // point of this case is proving commitStationPlacement computes it.
    const mountain = makePath(PATH_KIND.MOUNTAIN, [
      { x: 100, y: 100 },
      { x: 100, y: 300 },
      { x: 300, y: 300 },
      { x: 300, y: 100 },
    ])
    const card = makeCard(STATION_TYPE.HAMLET, { id: asStationId('SCENIC') })
    const state = stationStepState({
      paths: [makePath(PATH_KIND.BORDER, border(500, 500)), mountain],
      pendingCard: card,
    })

    // Clear of the loop's edges by 80-100 units, well outside tangencyTolerance
    // — mirrors page-7's Scenic rect (180,180)-(200,200) inside (100,100)-(300,300).
    const result = commitStationPlacement(
      state,
      { x: 180, y: 180, width: 20, height: 20 },
      TEST_CONFIG,
    )

    expect(result.stations).toHaveLength(1)
    expect(result.stations[0]?.insideMountain).toBe(true)
  })

  it('derives insideMountain: false for a rect placed outside the mountain path (M11)', () => {
    const mountain = makePath(PATH_KIND.MOUNTAIN, [
      { x: 100, y: 100 },
      { x: 100, y: 300 },
      { x: 300, y: 300 },
      { x: 300, y: 100 },
    ])
    const card = makeCard(STATION_TYPE.HAMLET, { id: asStationId('OUTSIDE') })
    const state = stationStepState({
      paths: [makePath(PATH_KIND.BORDER, border(500, 500)), mountain],
      pendingCard: card,
    })

    // Well clear of the mountain loop (nearest edge is 50 units away) and
    // well inside the 500x500 border.
    const result = commitStationPlacement(
      state,
      { x: 350, y: 350, width: 20, height: 20 },
      TEST_CONFIG,
    )

    expect(result.stations).toHaveLength(1)
    expect(result.stations[0]?.insideMountain).toBe(false)
  })
})

describe('advanceTurn / isGameOver', () => {
  it('advances through a 3-colour turnOrder', () => {
    const colours = [asColourId('A'), asColourId('B'), asColourId('C')]
    const state = makeState({ turnOrder: colours, activeSeatIndex: 2, round: 1 })

    const result = advanceTurn(state)

    expect(result.activeSeatIndex).toBe(0)
    expect(result.round).toBe(2)
    expect(result.phase).toBe(TURN_PHASE.STATION)
  })

  it('advances through a 4-colour turnOrder', () => {
    const colours = [asColourId('A'), asColourId('B'), asColourId('C'), asColourId('D')]
    const state = makeState({ turnOrder: colours, activeSeatIndex: 1, round: 3 })

    const result = advanceTurn(state)

    expect(result.activeSeatIndex).toBe(2)
    expect(result.round).toBe(3)
  })

  it('advances through a 5-colour turnOrder', () => {
    const colours = [
      asColourId('A'),
      asColourId('B'),
      asColourId('C'),
      asColourId('D'),
      asColourId('E'),
    ]
    const state = makeState({ turnOrder: colours, activeSeatIndex: 4, round: 4 })

    const result = advanceTurn(state)

    expect(result.activeSeatIndex).toBe(0)
    expect(result.round).toBe(5)
  })

  it('advances through the §9 two-player order [A1, B1, A2, B2]', () => {
    const colours = [asColourId('A1'), asColourId('B1'), asColourId('A2'), asColourId('B2')]
    const state = makeState({ turnOrder: colours, activeSeatIndex: 1, round: 2 })

    const result = advanceTurn(state)

    expect(result.activeSeatIndex).toBe(2)
    expect(colours[result.activeSeatIndex]).toBe(asColourId('A2'))
  })

  it('runs exactly five rounds over whatever turnOrder it is given', () => {
    const colours = [asColourId('A'), asColourId('B')]
    let state = makeState({ turnOrder: colours, activeSeatIndex: 0, round: 1 })

    for (let turn = 0; turn < colours.length * 5; turn++) {
      state = advanceTurn(state)
    }

    expect(state.round).toBe(6)
  })

  it('reports game over only after the last seat of round 5', () => {
    const colours = [asColourId('A'), asColourId('B')]
    let state = makeState({ turnOrder: colours, activeSeatIndex: 0, round: 1 })

    const totalTurns = colours.length * 5
    for (let turn = 0; turn < totalTurns; turn++) {
      state = advanceTurn(state)
      const isLastTurn = turn === totalTurns - 1
      expect(isGameOver(state)).toBe(isLastTurn)
    }
  })
})
