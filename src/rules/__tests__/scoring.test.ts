import { describe, expect, it } from 'vitest'
import { PATH_KIND } from '../../constants/game'
import { STATION_TYPE } from '../../constants/stations'
import { applyScoring, resolveScoring } from '../scoring'
import { makePath, makeSeat, makeState, makeStation, TEST_CONFIG } from './fixtures'
import { asColourId } from '../types'
import type { GameState, PlacedPath, PlacedStation, Rect } from '../types'

const p = (x: number, y: number) => ({ x, y })
const r = (x: number, y: number, width = 20, height = 20): Rect => ({ x, y, width, height })

const PINK = asColourId('PINK')
const YELLOW = asColourId('YELLOW')

describe('resolveScoring (§10.3)', () => {
  it('scores the black value for the first colour to connect', () => {
    const station = makeStation(STATION_TYPE.STARTING, r(100, 100))
    const state = makeState({ seats: [makeSeat('PINK', 'P1')], stations: [station] })
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(90, 110), p(130, 110)], PINK)

    const breakdown = resolveScoring(state, PINK, newPath, TEST_CONFIG)
    const line = breakdown.connections.find((c) => c.stationId === station.card.id)

    expect(line?.scored).toBe(true)
    expect(line?.tier).toBe('BLACK')
    expect(line?.base).toBe(3) // §8 Starting Station: first = 3
  })

  it('scores the grey value for a later colour', () => {
    const station = makeStation(STATION_TYPE.STARTING, r(100, 100), {
      firstConnector: YELLOW,
      connections: new Map([[YELLOW, 1]]),
    })
    const state = makeState({ seats: [makeSeat('PINK', 'P1')], stations: [station] })
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(90, 110), p(130, 110)], PINK)

    const breakdown = resolveScoring(state, PINK, newPath, TEST_CONFIG)
    const line = breakdown.connections.find((c) => c.stationId === station.card.id)

    expect(line?.scored).toBe(true)
    expect(line?.tier).toBe('GREY')
    expect(line?.base).toBe(2) // §8 Starting Station: later = 2
  })

  it('scores nothing for a station this colour is already connected to', () => {
    const station = makeStation(STATION_TYPE.VILLAGE, r(100, 100), {
      firstConnector: PINK,
      connections: new Map([[PINK, 1]]),
    })
    const state = makeState({ seats: [makeSeat('PINK', 'P1')], stations: [station] })
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(90, 110), p(130, 110)], PINK)

    const breakdown = resolveScoring(state, PINK, newPath, TEST_CONFIG)
    const line = breakdown.connections.find((c) => c.stationId === station.card.id)

    expect(line?.scored).toBe(false)
    expect(line?.tier).toBeNull()
    expect(line?.total).toBe(0)
  })

  it('scores a Railyard again at grey on every later connection (M12)', () => {
    const station = makeStation(STATION_TYPE.RAILYARD, r(100, 100), {
      firstConnector: YELLOW,
      connections: new Map([[PINK, 1]]), // PINK already connected once
    })
    const state = makeState({ seats: [makeSeat('PINK', 'P1')], stations: [station] })
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(90, 110), p(130, 110)], PINK)

    const breakdown = resolveScoring(state, PINK, newPath, TEST_CONFIG)
    const line = breakdown.connections.find((c) => c.stationId === station.card.id)

    expect(line?.scored).toBe(true)
    expect(line?.tier).toBe('GREY')
    expect(line?.total).toBe(1) // §8 Railyard: later = 1
  })

  it('itemises the Scenic +2 mountain bonus separately from the base (M11)', () => {
    // resolveScoring trusts PlacedStation.insideMountain (set at placement
    // time by turn.ts's commitStationPlacement) rather than recomputing it —
    // Rules.md §10.3's own pseudocode reads the field directly. The fixture
    // must set it explicitly since makeStation defaults it to false.
    const scenic = makeStation(STATION_TYPE.SCENIC, r(50, 50), { insideMountain: true })
    const mountain = makePath(PATH_KIND.MOUNTAIN, [p(0, 0), p(200, 0), p(200, 200), p(0, 200)])
    const state = makeState({ seats: [makeSeat('PINK', 'P1')], stations: [scenic] })
    const withMountain = { ...state, paths: [...state.paths, mountain] }
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(40, 60), p(80, 60)], PINK)

    const breakdown = resolveScoring(withMountain, PINK, newPath, TEST_CONFIG)
    const line = breakdown.connections.find((c) => c.stationId === scenic.card.id)

    expect(line?.base).toBe(1) // §8 Scenic: first = 1
    expect(line?.mountainBonus).toBe(2)
    expect(line?.total).toBe(3)
  })

  it('counts pass-through stations as connections (M15)', () => {
    const station = makeStation(STATION_TYPE.VILLAGE, r(100, 100))
    const state = makeState({ seats: [makeSeat('PINK', 'P1')], stations: [station] })
    // Both endpoints are well outside the station rect — a genuine pass-through.
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(80, 110), p(140, 110)], PINK)

    const breakdown = resolveScoring(state, PINK, newPath, TEST_CONFIG)
    const line = breakdown.connections.find((c) => c.stationId === station.card.id)

    expect(line?.scored).toBe(true)
  })

  it('charges −1 per crossing point, counting each separately', () => {
    const straight = makePath(PATH_KIND.SHORT_RAIL, [p(100, 100), p(120, 100)], PINK)
    const zigzag = makePath(
      PATH_KIND.SHORT_RAIL,
      [p(105, 95), p(105, 105), p(115, 105), p(115, 95)],
      YELLOW,
    )
    const state = makeState({
      seats: [makeSeat('PINK', 'P1'), makeSeat('YELLOW', 'P2')],
      stations: [],
    })
    const withZigzag = { ...state, paths: [...state.paths, zigzag] }

    const breakdown = resolveScoring(withZigzag, PINK, straight, TEST_CONFIG)

    expect(breakdown.crossings).toHaveLength(2)
    expect(breakdown.crossings.every((c) => c.cost === 1)).toBe(true)
    expect(breakdown.lost).toBe(2)
  })

  it('charges nothing for a crossing that falls inside a station rect', () => {
    const straight = makePath(PATH_KIND.SHORT_RAIL, [p(200, 200), p(220, 200)], PINK)
    const vertical = makePath(PATH_KIND.SHORT_RAIL, [p(210, 195), p(210, 205)], YELLOW)
    const coveringStation = makeStation(STATION_TYPE.VILLAGE, r(200, 190))
    const state = makeState({
      seats: [makeSeat('PINK', 'P1'), makeSeat('YELLOW', 'P2')],
      stations: [coveringStation],
    })
    const withCrossing = { ...state, paths: [...state.paths, vertical] }

    const breakdown = resolveScoring(withCrossing, PINK, straight, TEST_CONFIG)

    expect(breakdown.crossings).toHaveLength(1)
    expect(breakdown.crossings[0].onCard).toBe(true)
    expect(breakdown.crossings[0].cost).toBe(0)
    expect(breakdown.lost).toBe(0)
  })

  it('charges −1 for crossing the mountain, the river and the border alike (M10)', () => {
    // The mountain is a genuine closed polygon (≥3 vertices, real area) rather
    // than a bare 2-point segment — a 2-point "loop" cannot occur on a legal
    // board (§4.1 step 4), and once SCRUM-16's edgePolyline wraps every
    // MOUNTAIN-kind path unconditionally, a 2-point segment retraces itself
    // there-and-back and crosses the rail twice instead of once (developer
    // decision, confirmed 2026-08-01 — amend this pre-existing fixture only;
    // closeLoop's `length < 2` guard is deliberately left unchanged).
    //
    // A closed loop crosses an infinite line an even number of times, so this
    // rectangle is shaped to put its SECOND crossing of the line x = 250
    // beyond the rail's own y-extent of [-10, 410]: the top edge crosses at
    // (250,200), inside the rail's span, and the bottom edge sits at y = 460,
    // past where the rail ends, so the rail terminates inside the polygon
    // instead of passing back out and re-crossing. Net result: exactly one
    // genuine crossing from the mountain, matching a board §4.1 could produce.
    const mountain = makePath(PATH_KIND.MOUNTAIN, [
      p(150, 200),
      p(350, 200),
      p(350, 460),
      p(150, 460),
    ])
    const river = makePath(PATH_KIND.RIVER, [p(200, 400), p(300, 400)])
    const state = makeState({ seats: [makeSeat('PINK', 'P1')], stations: [] })
    const withTerrain = { ...state, paths: [...state.paths, mountain, river] }
    // Crosses the default 500x500 border's top edge at (250,0), the mountain's
    // top edge at (250,200), and the river segment at (250,400).
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(250, -10), p(250, 410)], PINK)

    const breakdown = resolveScoring(withTerrain, PINK, newPath, TEST_CONFIG)

    expect(breakdown.crossings).toHaveLength(3)
    const kinds = breakdown.crossings.map((c) => c.otherPathKind).sort()
    expect(kinds).toEqual([PATH_KIND.BORDER, PATH_KIND.MOUNTAIN, PATH_KIND.RIVER].sort())
    expect(breakdown.crossings.every((c) => c.cost === 1)).toBe(true)
    expect(breakdown.lost).toBe(3)
  })

  it('counts a crossing of the mountain’s CLOSING edge as −1 (§10.3, M10 — SCRUM-16)', () => {
    // The mountain is stored corners-only, so its final edge — (100,300) back to
    // (100,100) — is implied, never in the array. crossings() iterates
    // `j < other.length - 1` and never reached it, so this rail scored 0 where
    // §5.4's page-7 example says a mountain crossing costs −1. On a real board
    // that is the 48th of 48 mountain edges, and the failure is silent.
    const mountain = makePath(PATH_KIND.MOUNTAIN, [
      p(100, 100),
      p(300, 100),
      p(300, 300),
      p(100, 300),
    ])
    const state = makeState({ seats: [makeSeat('PINK', 'P1')] })
    const withMountain = { ...state, paths: [...state.paths, mountain] }
    // Cuts the closing edge at (100,200) and touches nothing else.
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(80, 200), p(120, 200)], PINK)

    const breakdown = resolveScoring(withMountain, PINK, newPath, TEST_CONFIG)

    expect(breakdown.crossings).toHaveLength(1)
    expect(breakdown.crossings[0]?.otherPathId).toBe(mountain.id)
    expect(breakdown.crossings[0]?.onCard).toBe(false)
    expect(breakdown.lost).toBe(1)
    expect(breakdown.net).toBe(-1)
  })

  it('fires a Landmark penalty against the marker owner on every scoring event (M13)', () => {
    const station = makeStation(STATION_TYPE.LANDMARK, r(100, 100), { markerOwner: YELLOW })
    const state = makeState({
      seats: [makeSeat('PINK', 'P1'), makeSeat('YELLOW', 'P2')],
      stations: [station],
    })
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(90, 110), p(130, 110)], PINK)

    const breakdown = resolveScoring(state, PINK, newPath, TEST_CONFIG)
    const effect = breakdown.markerEffects.find((m) => m.stationId === station.card.id)

    expect(effect?.markerOwner).toBe(YELLOW)
    expect(effect?.delta).toBe(-1)
  })

  it('fires a Depot bonus of +1 to the marker owner (M13)', () => {
    const station = makeStation(STATION_TYPE.DEPOT, r(100, 100), { markerOwner: YELLOW })
    const state = makeState({
      seats: [makeSeat('PINK', 'P1'), makeSeat('YELLOW', 'P2')],
      stations: [station],
    })
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(90, 110), p(130, 110)], PINK)

    const breakdown = resolveScoring(state, PINK, newPath, TEST_CONFIG)
    const effect = breakdown.markerEffects.find((m) => m.stationId === station.card.id)

    expect(effect?.markerOwner).toBe(YELLOW)
    expect(effect?.delta).toBe(1)
  })

  it('does not fire a marker trigger when the scorer owns the marker', () => {
    const station = makeStation(STATION_TYPE.LANDMARK, r(100, 100), { markerOwner: PINK })
    const state = makeState({ seats: [makeSeat('PINK', 'P1')], stations: [station] })
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(90, 110), p(130, 110)], PINK)

    const breakdown = resolveScoring(state, PINK, newPath, TEST_CONFIG)

    expect(breakdown.markerEffects).toHaveLength(0)
  })

  it('fires the trigger between two colours sharing an owner, flagged sameOwner (§9)', () => {
    const station = makeStation(STATION_TYPE.LANDMARK, r(100, 100), { markerOwner: YELLOW })
    const state = makeState({
      seats: [makeSeat('PINK', 'SAME_PLAYER'), makeSeat('YELLOW', 'SAME_PLAYER')],
      stations: [station],
    })
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(90, 110), p(130, 110)], PINK)

    const breakdown = resolveScoring(state, PINK, newPath, TEST_CONFIG)
    const effect = breakdown.markerEffects.find((m) => m.stationId === station.card.id)

    expect(effect?.delta).toBe(-1)
    expect(effect?.sameOwner).toBe(true)
  })

  it('allows the net total to go below zero (M14)', () => {
    const straight = makePath(PATH_KIND.SHORT_RAIL, [p(100, 100), p(120, 100)], PINK)
    const zigzag = makePath(
      PATH_KIND.SHORT_RAIL,
      [p(105, 95), p(105, 105), p(115, 105), p(115, 95)],
      YELLOW,
    )
    const state = makeState({
      seats: [makeSeat('PINK', 'P1'), makeSeat('YELLOW', 'P2')],
      stations: [],
    })
    const withZigzag = { ...state, paths: [...state.paths, zigzag] }

    const breakdown = resolveScoring(withZigzag, PINK, straight, TEST_CONFIG)

    expect(breakdown.gained).toBe(0)
    expect(breakdown.lost).toBe(2)
    expect(breakdown.net).toBe(-2)
  })
})

describe('the rulebook page-7 worked example (§5.4)', () => {
  function buildPageSevenState(): {
    state: GameState
    scenic: PlacedStation
    village: PlacedStation
  } {
    const stationA = makeStation(STATION_TYPE.HAMLET, r(50, 180), {
      firstConnector: PINK,
      connections: new Map([[PINK, 1]]),
    })
    // insideMountain set explicitly — resolveScoring reads the stored field
    // rather than recomputing it (see the M11 test above for why).
    const scenic = makeStation(STATION_TYPE.SCENIC, r(180, 180), { insideMountain: true })
    const village = makeStation(STATION_TYPE.VILLAGE, r(450, 180))
    const mountain = makePath(PATH_KIND.MOUNTAIN, [
      p(100, 100),
      p(100, 300),
      p(300, 300),
      p(300, 100),
    ])
    const yellowString = makePath(PATH_KIND.SHORT_RAIL, [p(455, 170), p(455, 210)], YELLOW)

    const base = makeState({
      seats: [makeSeat('PINK', 'P1'), makeSeat('YELLOW', 'P2')],
      stations: [stationA, scenic, village],
    })
    const state: GameState = { ...base, paths: [...base.paths, mountain, yellowString] }
    return { state, scenic, village }
  }

  function pinkString(): PlacedPath {
    return makePath(PATH_KIND.SHORT_RAIL, [p(60, 190), p(460, 190)], PINK)
  }

  it('scores +3 for the Scenic station inside the mountain', () => {
    const { state, scenic } = buildPageSevenState()
    const breakdown = resolveScoring(state, PINK, pinkString(), TEST_CONFIG)
    const line = breakdown.connections.find((c) => c.stationId === scenic.card.id)

    expect(line?.base).toBe(1)
    expect(line?.mountainBonus).toBe(2)
    expect(line?.total).toBe(3)
  })

  it('scores +2 for the Village station connected for the first time', () => {
    const { state, village } = buildPageSevenState()
    const breakdown = resolveScoring(state, PINK, pinkString(), TEST_CONFIG)
    const line = breakdown.connections.find((c) => c.stationId === village.card.id)

    expect(line?.scored).toBe(true)
    expect(line?.tier).toBe('BLACK')
    expect(line?.total).toBe(2)
  })

  it('scores nothing for station A, already on this colour’s network', () => {
    const { state } = buildPageSevenState()
    const stationA = state.stations[0]
    const breakdown = resolveScoring(state, PINK, pinkString(), TEST_CONFIG)
    const line = breakdown.connections.find((c) => c.stationId === stationA.card.id)

    expect(line?.scored).toBe(false)
  })

  it('charges −1 −1 for the two mountain crossings', () => {
    const { state } = buildPageSevenState()
    const breakdown = resolveScoring(state, PINK, pinkString(), TEST_CONFIG)
    const mountainCrossings = breakdown.crossings.filter(
      (c) => c.otherPathKind === PATH_KIND.MOUNTAIN,
    )

    expect(mountainCrossings).toHaveLength(2)
    expect(mountainCrossings.every((c) => c.cost === 1)).toBe(true)
  })

  it('charges nothing for the crossing that falls on the Village card', () => {
    const { state } = buildPageSevenState()
    const breakdown = resolveScoring(state, PINK, pinkString(), TEST_CONFIG)
    const onCardCrossings = breakdown.crossings.filter((c) => c.onCard)

    expect(onCardCrossings).toHaveLength(1)
    expect(onCardCrossings[0].cost).toBe(0)
  })

  it('nets +3', () => {
    const { state } = buildPageSevenState()
    const breakdown = resolveScoring(state, PINK, pinkString(), TEST_CONFIG)

    expect(breakdown.gained).toBe(5)
    expect(breakdown.lost).toBe(2)
    expect(breakdown.net).toBe(3)
  })
})

describe('applyScoring', () => {
  it("moves the scoring seat's score by net", () => {
    const station = makeStation(STATION_TYPE.STARTING, r(100, 100))
    const state = makeState({ seats: [makeSeat('PINK', 'P1', { score: 5 })], stations: [station] })
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(90, 110), p(130, 110)], PINK)
    const breakdown = resolveScoring(state, PINK, newPath, TEST_CONFIG)

    const next = applyScoring(state, breakdown)
    const seat = next.seats.find((s) => s.colour === PINK)

    expect(seat?.score).toBe(5 + breakdown.net)
  })

  it("applies a MarkerEffectLine's delta to the marker owner's seat, not the scorer's", () => {
    const station = makeStation(STATION_TYPE.LANDMARK, r(100, 100), { markerOwner: YELLOW })
    const state = makeState({
      seats: [makeSeat('PINK', 'P1', { score: 0 }), makeSeat('YELLOW', 'P2', { score: 0 })],
      stations: [station],
    })
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(90, 110), p(130, 110)], PINK)
    const breakdown = resolveScoring(state, PINK, newPath, TEST_CONFIG)

    const next = applyScoring(state, breakdown)
    const pinkSeat = next.seats.find((s) => s.colour === PINK)
    const yellowSeat = next.seats.find((s) => s.colour === YELLOW)

    expect(yellowSeat?.score).toBe(-1)
    expect(pinkSeat?.score).toBe(breakdown.net)
  })

  it('updates connections and firstConnector on each scored station', () => {
    const station = makeStation(STATION_TYPE.STARTING, r(100, 100))
    const state = makeState({ seats: [makeSeat('PINK', 'P1')], stations: [station] })
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(90, 110), p(130, 110)], PINK)
    const breakdown = resolveScoring(state, PINK, newPath, TEST_CONFIG)

    const next = applyScoring(state, breakdown)
    const updated = next.stations.find((s) => s.card.id === station.card.id)

    expect(updated?.firstConnector).toBe(PINK)
    expect(updated?.connections.get(PINK)).toBe(1)
  })

  it('does not floor a resulting negative score at zero (M14)', () => {
    const straight = makePath(PATH_KIND.SHORT_RAIL, [p(100, 100), p(120, 100)], PINK)
    const zigzag = makePath(
      PATH_KIND.SHORT_RAIL,
      [p(105, 95), p(105, 105), p(115, 105), p(115, 95)],
      YELLOW,
    )
    const state = makeState({
      seats: [makeSeat('PINK', 'P1', { score: 0 }), makeSeat('YELLOW', 'P2')],
      stations: [],
    })
    const withZigzag = { ...state, paths: [...state.paths, zigzag] }
    const breakdown = resolveScoring(withZigzag, PINK, straight, TEST_CONFIG)

    const next = applyScoring(withZigzag, breakdown)
    const seat = next.seats.find((s) => s.colour === PINK)

    expect(seat?.score).toBe(-2)
  })

  it('does not mutate the input state', () => {
    const station = makeStation(STATION_TYPE.STARTING, r(100, 100))
    const state = makeState({ seats: [makeSeat('PINK', 'P1', { score: 0 })], stations: [station] })
    const originalSeats = state.seats
    const originalStations = state.stations
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(90, 110), p(130, 110)], PINK)
    const breakdown = resolveScoring(state, PINK, newPath, TEST_CONFIG)

    applyScoring(state, breakdown)

    expect(state.seats).toBe(originalSeats)
    expect(state.stations).toBe(originalStations)
    expect(state.seats[0].score).toBe(0)
    expect(state.stations[0].firstConnector).toBeNull()
  })
})
