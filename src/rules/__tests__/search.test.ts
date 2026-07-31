import { describe, expect, it } from 'vitest'
import { PATH_KIND } from '../../constants/game'
import { STATION_TYPE } from '../../constants/stations'
import { asColourId } from '../types'
import type { Polyline, Rect } from '../types'
import { hasAnyLegalStringPlacement, hasLegalStationPlacement } from '../search'
import { TEST_CONFIG, makePath, makeSeat, makeState, makeStation } from './fixtures'

const PINK = asColourId('PINK')

/** A closed loop of the given width/height, corners only (SQUARE convention —
 *  no repeated closing point), matching fixtures.ts's own border shape. */
const border = (width: number, height: number): Polyline => [
  { x: 0, y: 0 },
  { x: width, y: 0 },
  { x: width, y: height },
  { x: 0, y: height },
]

describe('hasLegalStationPlacement (M4)', () => {
  it('is true on an empty board inside the border', () => {
    const state = makeState()
    const card = makeStation(STATION_TYPE.HAMLET, { x: 0, y: 0, width: 20, height: 20 }).card

    expect(hasLegalStationPlacement(state, card, TEST_CONFIG)).toBe(true)
  })

  it('is false when the border is fully packed with stations', () => {
    // A 100x100 border tiled exactly by a 5x5 grid of cardSize (20) stations
    // — zero gap anywhere, so no rect of any size can avoid touching one.
    const size = TEST_CONFIG.cardSize
    const stations = []
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const rect: Rect = { x: col * size, y: row * size, width: size, height: size }
        stations.push(makeStation(STATION_TYPE.HAMLET, rect))
      }
    }
    const state = makeState({ paths: [makePath(PATH_KIND.BORDER, border(100, 100))], stations })
    const card = makeStation(STATION_TYPE.HAMLET, { x: 0, y: 0, width: size, height: size }).card

    expect(hasLegalStationPlacement(state, card, TEST_CONFIG)).toBe(false)
  })

  it('is false when every gap is smaller than the card footprint', () => {
    // A 100x100 border tiled by a 4x4 grid of cardSize (20) stations on a
    // pitch of 25 — every gap between stations, and at the far edge, is
    // exactly 5 units wide: real open space, but narrower than one card in
    // every direction, so no rect of cardSize can ever land without overlap.
    const size = TEST_CONFIG.cardSize
    const pitch = 25
    const stations = []
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const rect: Rect = { x: col * pitch, y: row * pitch, width: size, height: size }
        stations.push(makeStation(STATION_TYPE.HAMLET, rect))
      }
    }
    const state = makeState({ paths: [makePath(PATH_KIND.BORDER, border(100, 100))], stations })
    const card = makeStation(STATION_TYPE.HAMLET, { x: 0, y: 0, width: size, height: size }).card

    expect(hasLegalStationPlacement(state, card, TEST_CONFIG)).toBe(false)
  })

  it('finds a single legal gap exactly one card wide', () => {
    // A 100x60 border with two full-height "wall" stations leaving a single
    // x-gap from 28 to 52 (width 24 = cardSize 20 + a 2-unit clearance on
    // each side, enough to clear both walls without touching either). The
    // legal x-interval (28, 32) straddles the midpoint of coarse samples 20
    // and 40 (coarse grid: 0, 20, 40, 60, 80) — every coarse sample overlaps
    // a wall, so only the bisection refinement can land inside it.
    const wallA = makeStation(STATION_TYPE.HAMLET, { x: 0, y: 0, width: 28, height: 60 })
    const wallB = makeStation(STATION_TYPE.HAMLET, { x: 52, y: 0, width: 48, height: 60 })
    const state = makeState({
      paths: [makePath(PATH_KIND.BORDER, border(100, 60))],
      stations: [wallA, wallB],
    })
    const card = makeStation(STATION_TYPE.HAMLET, { x: 0, y: 0, width: 20, height: 20 }).card

    expect(hasLegalStationPlacement(state, card, TEST_CONFIG)).toBe(true)
  })
})

describe('hasAnyLegalStringPlacement (M9)', () => {
  it('is true when a reachable station is within the string’s length budget', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 440, y: 240, width: 20, height: 20 })
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({ seats: [seat], stations: [stationA, stationB] })

    expect(hasAnyLegalStringPlacement(state, PINK, TEST_CONFIG)).toBe(true)
  })

  it('is false when the seat has no strings left in supply', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 440, y: 240, width: 20, height: 20 })
    const seat = makeSeat('PINK', 'P1', {
      startingStationId: stationA.card.id,
      shortStringsLeft: 0,
      longStringsLeft: 0,
    })
    const state = makeState({ seats: [seat], stations: [stationA, stationB] })

    expect(hasAnyLegalStringPlacement(state, PINK, TEST_CONFIG)).toBe(false)
  })

  it('is false when every other station is beyond the length budget', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 480, y: 20, width: 20, height: 20 })
    const stationC = makeStation(STATION_TYPE.HAMLET, { x: 480, y: 480, width: 20, height: 20 })
    // longStringsLeft: 0 isolates the short-string budget (nominal 400) —
    // otherwise the long budget (nominal 800) would legitimately reach these.
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id, longStringsLeft: 0 })
    const state = makeState({ seats: [seat], stations: [stationA, stationB, stationC] })

    expect(hasAnyLegalStringPlacement(state, PINK, TEST_CONFIG)).toBe(false)
  })
})
