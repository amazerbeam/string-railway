import { describe, expect, it } from 'vitest'
import { PATH_KIND, REJECTION_REASON, STATION_REJECTION_REASON } from '../../constants/game'
import { STATION_TYPE } from '../../constants/stations'
import { asColourId } from '../types'
import type { Point, Polyline, Rect } from '../types'
import { validateStationPlacement, validateStringPlacement } from '../validate'
import { TEST_CONFIG, makePath, makeSeat, makeState, makeStation } from './fixtures'

const p = (x: number, y: number): Point => ({ x, y })
const PINK = asColourId('PINK')

/** Matches fixtures.ts's default border exactly — a test that overrides
 *  `paths` owns re-including this, per fixtures.ts's own documented contract. */
const BORDER: Polyline = [p(0, 0), p(500, 0), p(500, 500), p(0, 500)]

describe('validateStationPlacement (§5.2)', () => {
  it('accepts a card inside the border touching nothing', () => {
    const state = makeState()
    const rect: Rect = { x: 100, y: 100, width: 20, height: 20 }

    expect(validateStationPlacement(state, rect, TEST_CONFIG)).toEqual({ ok: true })
  })

  it('rejects a card touching any string with TOUCHES_STRING', () => {
    const existingString = makePath(PATH_KIND.SHORT_RAIL, [p(90, 110), p(130, 110)])
    const state = makeState({ paths: [makePath(PATH_KIND.BORDER, BORDER), existingString] })
    const rect: Rect = { x: 100, y: 100, width: 20, height: 20 }

    expect(validateStationPlacement(state, rect, TEST_CONFIG)).toEqual({
      ok: false,
      reason: STATION_REJECTION_REASON.TOUCHES_STRING,
    })
  })

  it('rejects a card touching another station with TOUCHES_STATION', () => {
    const otherStation = makeStation(STATION_TYPE.HAMLET, { x: 118, y: 100, width: 20, height: 20 })
    const state = makeState({ stations: [otherStation] })
    const rect: Rect = { x: 100, y: 100, width: 20, height: 20 }

    expect(validateStationPlacement(state, rect, TEST_CONFIG)).toEqual({
      ok: false,
      reason: STATION_REJECTION_REASON.TOUCHES_STATION,
      stationId: otherStation.card.id,
    })
  })

  it('rejects a card not fully inside the border with NOT_INSIDE_BORDER', () => {
    const state = makeState()
    const rect: Rect = { x: 700, y: 700, width: 20, height: 20 }

    expect(validateStationPlacement(state, rect, TEST_CONFIG)).toEqual({
      ok: false,
      reason: STATION_REJECTION_REASON.NOT_INSIDE_BORDER,
    })
  })

  it('rejects a card touching a string before one touching a station', () => {
    const existingString = makePath(PATH_KIND.SHORT_RAIL, [p(90, 110), p(130, 110)])
    const otherStation = makeStation(STATION_TYPE.HAMLET, { x: 118, y: 100, width: 20, height: 20 })
    const state = makeState({
      paths: [makePath(PATH_KIND.BORDER, BORDER), existingString],
      stations: [otherStation],
    })
    const rect: Rect = { x: 100, y: 100, width: 20, height: 20 }

    expect(validateStationPlacement(state, rect, TEST_CONFIG)).toEqual({
      ok: false,
      reason: STATION_REJECTION_REASON.TOUCHES_STRING,
    })
  })
})

describe('validateStringPlacement (§10.2)', () => {
  it('rejects a string type the seat has none of with NOT_IN_SUPPLY', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 460, y: 240, width: 20, height: 20 })
    const seat = makeSeat('PINK', 'P1', {
      startingStationId: stationA.card.id,
      shortStringsLeft: 0,
    })
    const state = makeState({ seats: [seat], stations: [stationA, stationB] })
    const path: Polyline = [p(60, 250), p(460, 250)]

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: false,
      reason: REJECTION_REASON.NOT_IN_SUPPLY,
    })
  })

  it('rejects a path outside ±2% of nominal with WRONG_LENGTH (M6)', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({ seats: [seat], stations: [stationA] })
    const path: Polyline = [p(60, 250), p(510, 250)] // length 450, nominal 400 -> +12.5%

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: false,
      reason: REJECTION_REASON.WRONG_LENGTH,
    })
  })

  it('accepts a path exactly at +2% — the tolerance is inclusive', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 468, y: 240, width: 20, height: 20 })
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({ seats: [seat], stations: [stationA, stationB] })
    const path: Polyline = [p(60, 250), p(468, 250)] // length 408 = 400 * 1.02

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: true,
    })
  })

  it('accepts a path exactly at −2% — the tolerance is inclusive', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 452, y: 240, width: 20, height: 20 })
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({ seats: [seat], stations: [stationA, stationB] })
    const path: Polyline = [p(60, 250), p(452, 250)] // length 392 = 400 * 0.98

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: true,
    })
  })

  it('rejects a self-intersecting path with SELF_INTERSECTS', () => {
    const seat = makeSeat('PINK', 'P1')
    const state = makeState({ seats: [seat] })
    // A bowtie: (100,100)->(240,100)->(180,180)->(180,20). Segments 0 and 2
    // cross at (180,100); total arc length is 140 + 100 + 160 = 400 exactly.
    const path: Polyline = [p(100, 100), p(240, 100), p(180, 180), p(180, 20)]

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: false,
      reason: REJECTION_REASON.SELF_INTERSECTS,
    })
  })

  it('rejects a path whose endpoint is off every station with ENDPOINT_OFF_STATION', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 460, y: 240, width: 20, height: 20 })
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({ seats: [seat], stations: [stationA, stationB] })
    const path: Polyline = [p(200, 200), p(200, 600)] // length 400, touches neither station

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: false,
      reason: REJECTION_REASON.ENDPOINT_OFF_STATION,
    })
  })

  it('rejects a path unconnected to the colour’s own network with NETWORK_DISCONNECTED', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 40, width: 20, height: 20 })
    const stationC = makeStation(STATION_TYPE.HAMLET, { x: 40, y: 400, width: 20, height: 20 })
    const stationD = makeStation(STATION_TYPE.HAMLET, { x: 460, y: 400, width: 20, height: 20 })
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({ seats: [seat], stations: [stationA, stationC, stationD] })
    // Touches C and D (satisfies check 4) but neither is on PINK's network.
    const path: Polyline = [p(60, 410), p(460, 410)]

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: false,
      reason: REJECTION_REASON.NETWORK_DISCONNECTED,
    })
  })

  it('rejects a path entering one station twice with STATION_ENTERED_TWICE', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 240, y: 240, width: 20, height: 20 })
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({ seats: [seat], stations: [stationA] })
    // Starts inside A, dips out and back into A from a different edge, so A
    // is touched by two separate contiguous runs. Length 195+10+195 = 400.
    const path: Polyline = [p(245, 245), p(245, 50), p(255, 50), p(255, 245)]

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: false,
      reason: REJECTION_REASON.STATION_ENTERED_TWICE,
      stationId: stationA.card.id,
    })
  })

  it('rejects a path crossing a Terminus mid-run with TERMINUS_PASS_THROUGH', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const stationT = makeStation(STATION_TYPE.TERMINUS, { x: 240, y: 240, width: 20, height: 20 })
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 460, y: 240, width: 20, height: 20 })
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({ seats: [seat], stations: [stationA, stationT, stationB] })
    const path: Polyline = [p(60, 250), p(460, 250)] // straight through the Terminus, mid-run

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: false,
      reason: REJECTION_REASON.TERMINUS_PASS_THROUGH,
      stationId: stationT.card.id,
    })
  })

  it('rejects a pass-through over a full station with PLAYER_LIMIT_EXCEEDED (M15)', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const blue = asColourId('BLUE')
    const stationFull = makeStation(
      STATION_TYPE.RURAL, // playerLimit 1
      { x: 240, y: 240, width: 20, height: 20 },
      { connections: new Map([[blue, 1]]), firstConnector: blue },
    )
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 460, y: 240, width: 20, height: 20 })
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({ seats: [seat], stations: [stationA, stationFull, stationB] })
    const path: Polyline = [p(60, 250), p(460, 250)] // passes through stationFull, neither endpoint

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: false,
      reason: REJECTION_REASON.PLAYER_LIMIT_EXCEEDED,
      stationId: stationFull.card.id,
    })
  })

  it('rejects PLAYER_LIMIT_EXCEEDED for a colour whose seat shares an owner with the connected colour (criterion 11, §9)', () => {
    // A1 and A2 are two DIFFERENT colours that happen to share owner P1. The
    // player limit is keyed on ColourId, never PlayerId (§9), so A2 must
    // still consume its own slot against stationFull's limit of 1 even
    // though A1 (already connected) is the same real player.
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const colourA1 = asColourId('A1')
    const stationFull = makeStation(
      STATION_TYPE.RURAL, // playerLimit 1
      { x: 240, y: 240, width: 20, height: 20 },
      { connections: new Map([[colourA1, 1]]), firstConnector: colourA1 },
    )
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 460, y: 240, width: 20, height: 20 })
    const colourA2 = asColourId('A2')
    const seatA1 = makeSeat('A1', 'P1', { startingStationId: stationA.card.id })
    const seatA2 = makeSeat('A2', 'P1', { startingStationId: stationA.card.id }) // same owner P1 as A1
    const state = makeState({
      seats: [seatA1, seatA2],
      stations: [stationA, stationFull, stationB],
    })
    const path: Polyline = [p(60, 250), p(460, 250)] // passes through stationFull, neither endpoint

    expect(validateStringPlacement(state, colourA2, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: false,
      reason: REJECTION_REASON.PLAYER_LIMIT_EXCEEDED,
      stationId: stationFull.card.id,
    })
  })

  it('rejects a path leaving the border with LEAVES_BORDER (M7)', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 10, y: 240, width: 20, height: 20 })
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 10, y: 300, width: 20, height: 20 })
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({ seats: [seat], stations: [stationA, stationB] })
    // Bulges out to x = -150 (outside the 500x500 border) and back.
    // Length 170 + 60 + 170 = 400.
    const path: Polyline = [p(20, 250), p(-150, 250), p(-150, 310), p(20, 310)]

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: false,
      reason: REJECTION_REASON.LEAVES_BORDER,
    })
  })

  it('rejects a degenerate tangency with DEGENERATE_TANGENCY (M8)', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 460, y: 240, width: 20, height: 20 })
    // 0.3 units below the path's line — inside tangencyTolerance (0.5) but the
    // path never actually enters it (entryCount stays 0).
    const stationNear = makeStation(STATION_TYPE.HAMLET, {
      x: 250,
      y: 250.3,
      width: 20,
      height: 20,
    })
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({ seats: [seat], stations: [stationA, stationB, stationNear] })
    const path: Polyline = [p(60, 250), p(460, 250)]

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: false,
      reason: REJECTION_REASON.DEGENERATE_TANGENCY,
      stationId: stationNear.card.id,
    })
  })

  it('rejects a degenerate tangency against another placed path with DEGENERATE_TANGENCY (M8)', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 460, y: 240, width: 20, height: 20 })
    // A near-parallel LONG_RAIL sitting 0.3 units below the path's own line —
    // inside tangencyTolerance (0.5) but never crossing it (both segments are
    // horizontal, so they are parallel and never straddle each other).
    const nearParallelPath = makePath(PATH_KIND.LONG_RAIL, [p(100, 250.3), p(400, 250.3)])
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({
      seats: [seat],
      stations: [stationA, stationB],
      paths: [makePath(PATH_KIND.BORDER, BORDER), nearParallelPath],
    })
    const path: Polyline = [p(60, 250), p(460, 250)]

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: false,
      reason: REJECTION_REASON.DEGENERATE_TANGENCY,
    })
  })

  it('does not reject a path that genuinely crosses another path, even within tangency tolerance of it elsewhere', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 460, y: 240, width: 20, height: 20 })
    // Crosses the test path transversally at (250, 250) — a genuine crossing,
    // scored per §10.3, must still validate even though check 10 exists.
    const crossingPath = makePath(PATH_KIND.LONG_RAIL, [p(250, 200), p(250, 300)])
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({
      seats: [seat],
      stations: [stationA, stationB],
      paths: [makePath(PATH_KIND.BORDER, BORDER), crossingPath],
    })
    const path: Polyline = [p(60, 250), p(460, 250)]

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: true,
    })
  })

  it('does not reject a path that runs near the border itself — check 9 governs the border on its own', () => {
    // Both stations sit flush against the border's top edge (y = 0) so the
    // path itself can run within tangencyTolerance of that edge (y = 0.3)
    // without leaving it (check 9's own inclusive boundary test already
    // allows this), and must not be separately rejected by the new
    // path-tangency half of check 10.
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 0, width: 20, height: 20 })
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 460, y: 0, width: 20, height: 20 })
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({ seats: [seat], stations: [stationA, stationB] })
    const path: Polyline = [p(60, 0.3), p(460, 0.3)] // length 400, matches nominal exactly

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: true,
    })
  })

  it('reports WRONG_LENGTH, not STATION_ENTERED_TWICE, when both are violated', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 240, y: 400, width: 20, height: 20 })
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({ seats: [seat], stations: [stationA] })
    // Same double-entry shape as the STATION_ENTERED_TWICE case, but stretched
    // so the length (300 + 10 + 300 = 610) also violates check 2.
    const path: Polyline = [p(245, 405), p(245, 105), p(255, 105), p(255, 405)]

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: false,
      reason: REJECTION_REASON.WRONG_LENGTH,
    })
  })

  it('reports TERMINUS_PASS_THROUGH, not PLAYER_LIMIT_EXCEEDED, when both are violated', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const existingColours = ['C1', 'C2', 'C3', 'C4', 'C5'].map(asColourId)
    const connections = new Map(existingColours.map((colour) => [colour, 1] as const))
    const stationT = makeStation(
      STATION_TYPE.TERMINUS, // playerLimit 5, already full
      { x: 240, y: 240, width: 20, height: 20 },
      { connections, firstConnector: existingColours[0] },
    )
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 460, y: 240, width: 20, height: 20 })
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({ seats: [seat], stations: [stationA, stationT, stationB] })
    const path: Polyline = [p(60, 250), p(460, 250)] // passes through stationT, neither endpoint

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: false,
      reason: REJECTION_REASON.TERMINUS_PASS_THROUGH,
      stationId: stationT.card.id,
    })
  })
})
