import { describe, expect, it } from 'vitest'
import { PATH_KIND, TURN_PHASE } from '../../constants/game'
import { DECK_SIZE, STATION_TYPE } from '../../constants/stations'
import {
  LONG_STRINGS_PER_SEAT,
  MARKERS_PER_SEAT,
  MOUNTAIN_OFFSET_FRACTION,
  SHORT_STRINGS_PER_SEAT,
} from '../../constants/setup'
import { arcLength, selfIntersects } from '../geometry'
import {
  boardBounds,
  generateSetup,
  inradius,
  regularPolygon,
  SetupGenerationError,
  sideCountFor,
} from '../setup'
import { validateSetup } from '../setupValidation'
import { describeConfigFailures, parseRulesConfig } from '../config'
import { makeState, TEST_CONFIG } from './fixtures'
import shippedRules from '../../../public/rules.json'
import type { RulesConfig } from '../config'
import type { ColourId, Polyline } from '../types'

/** Closed-loop arc length: the polygon is corners-only, so wrap it to measure. */
function perimeterOf(loop: Polyline): number {
  return arcLength([...loop, loop[0]])
}

describe('sideCountFor', () => {
  it('maps player counts to §6 border shapes', () => {
    expect(sideCountFor(3)).toBe(3)
    expect(sideCountFor(4)).toBe(4)
    expect(sideCountFor(5)).toBe(5)
  })

  it('gives 2 players the four-player square per §9, not a two-corner board (AC3)', () => {
    expect(sideCountFor(2)).toBe(4)
  })
})

describe('regularPolygon', () => {
  const centre = { x: 0, y: 0 }

  it('preserves the requested perimeter exactly for every side count (AC2)', () => {
    for (const sides of [3, 4, 5, 48]) {
      const loop = regularPolygon(centre, sides, 4000)
      expect(perimeterOf(loop)).toBeCloseTo(4000, 6)
    }
  })

  it('returns one vertex per side', () => {
    expect(regularPolygon(centre, 5, 4000)).toHaveLength(5)
  })

  it('gives every edge the same length, perimeter / sideCount', () => {
    const loop = regularPolygon(centre, 4, 4000)
    const wrapped = [...loop, loop[0]]
    for (let i = 0; i < 4; i++) {
      expect(arcLength([wrapped[i], wrapped[i + 1]])).toBeCloseTo(1000, 6)
    }
  })

  it('does not self-intersect', () => {
    const loop = regularPolygon(centre, 5, 4000)
    expect(selfIntersects([...loop, loop[0]])).toBe(false)
  })

  it('is centred on the requested point', () => {
    const loop = regularPolygon({ x: 500, y: 300 }, 4, 4000)
    const meanX = loop.reduce((sum, point) => sum + point.x, 0) / loop.length
    const meanY = loop.reduce((sum, point) => sum + point.y, 0) / loop.length
    expect(meanX).toBeCloseTo(500, 6)
    expect(meanY).toBeCloseTo(300, 6)
  })

  it('winds clockwise for every side count so "clockwise seat order" is unambiguous (AC5, AC7)', () => {
    for (const sides of [3, 4, 5, 48]) {
      const loop = regularPolygon(centre, sides, 4000)
      // Shoelace sum is POSITIVE for clockwise winding in a y-down coordinate
      // system, which is what SVG gives us — so "walk the array" IS §4.1 step 7's
      // clockwise order. A uniform rotation cannot change this sign, which is why
      // it still holds after the even-side half-step rotation.
      let signed = 0
      for (let i = 0; i < loop.length; i++) {
        const a = loop[i]
        const b = loop[(i + 1) % loop.length]
        signed += a.x * b.y - b.x * a.y
      }
      expect(signed).toBeGreaterThan(0)
    }
  })

  it('keeps a vertex at the top for ODD side counts (AC3)', () => {
    for (const sides of [3, 5]) {
      const loop = regularPolygon(centre, sides, 4000)
      // Vertex 0 sits on the vertical centre line, alone at the top.
      expect(loop[0].x).toBeCloseTo(centre.x, 6)
      for (let i = 1; i < loop.length; i++) {
        expect(loop[i].y).toBeGreaterThan(loop[0].y)
      }
    }
  })

  it('presents a flat edge at the top for EVEN side counts, so the square is not a diamond (AC2)', () => {
    const loop = regularPolygon(centre, 4, 4000)
    // toBeCloseTo, not toBe: the two y-values are equal in exact arithmetic but
    // not in floating point — they come from sin(-3pi/4) and sin(-pi/4).
    expect(loop[0].y).toBeCloseTo(loop[1].y, 6)
    // Vertex 0 is the TOP-LEFT corner and vertex 1 the top-right, so walking the
    // array clockwise traverses the top edge first.
    expect(loop[0].x).toBeCloseTo(-500, 6)
    expect(loop[1].x).toBeCloseTo(500, 6)
    expect(loop[0].y).toBeCloseTo(-500, 6)
    // Axis-aligned: the bounding box collapses from the diamond's circumradius
    // box (1414.214 per side) to the edge length itself.
    const xs = loop.map((point) => point.x)
    const ys = loop.map((point) => point.y)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(1000, 6)
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(1000, 6)
  })

  it('throws rather than dividing by zero for a degenerate side count', () => {
    expect(() => regularPolygon(centre, 2, 4000)).toThrow(/sideCount/)
    expect(() => regularPolygon(centre, 0, 4000)).toThrow(/sideCount/)
  })

  it('throws for a non-positive perimeter', () => {
    expect(() => regularPolygon(centre, 4, 0)).toThrow(/perimeter/)
  })
})

describe('inradius', () => {
  it('is the distance from centre to an edge midpoint', () => {
    const loop = regularPolygon({ x: 0, y: 0 }, 4, 4000)
    const midX = (loop[0].x + loop[1].x) / 2
    const midY = (loop[0].y + loop[1].y) / 2
    expect(inradius(4, 4000)).toBeCloseTo(Math.hypot(midX, midY), 6)
  })

  it('is 500 for a 4000-perimeter square', () => {
    expect(inradius(4, 4000)).toBeCloseTo(500, 6)
  })

  it('is always smaller than the circumradius', () => {
    for (const sides of [3, 4, 5]) {
      const loop = regularPolygon({ x: 0, y: 0 }, sides, 4000)
      const circumradius = Math.hypot(loop[0].x, loop[0].y)
      expect(inradius(sides, 4000)).toBeLessThan(circumradius)
    }
  })
})

describe('generateSetup', () => {
  it('produces a complete setup: border, mountain, river and one station per corner (AC1)', () => {
    const state = generateSetup({ playerCount: 4, seed: 11 }, TEST_CONFIG)
    const kinds = state.paths.map((path) => path.kind)
    expect(kinds).toContain(PATH_KIND.BORDER)
    expect(kinds).toContain(PATH_KIND.MOUNTAIN)
    expect(kinds).toContain(PATH_KIND.RIVER)
    expect(state.stations).toHaveLength(4)
    expect(state.stations.every((station) => station.card.type === STATION_TYPE.STARTING)).toBe(
      true,
    )
  })

  it('matches the §6 border shape to the player count (AC2)', () => {
    expect(generateSetup({ playerCount: 3, seed: 1 }, TEST_CONFIG).stations).toHaveLength(3)
    expect(generateSetup({ playerCount: 5, seed: 1 }, TEST_CONFIG).stations).toHaveLength(5)
  })

  it('gives 2 players the square setup with four colour-seats, not two (AC3, AC4)', () => {
    const state = generateSetup({ playerCount: 2, seed: 1 }, TEST_CONFIG)
    expect(state.seats).toHaveLength(4)
    expect(state.stations).toHaveLength(4)
    expect(state.turnOrder).toHaveLength(4)
  })

  it('maps four 2-player colour-seats to two owners in [A1, B1, A2, B2] order (AC4)', () => {
    const state = generateSetup({ playerCount: 2, seed: 1 }, TEST_CONFIG)
    const owners = state.turnOrder.map(
      (colour) => state.seats.find((seat) => seat.colour === colour)?.owner,
    )
    expect(owners[0]).toBe(owners[2])
    expect(owners[1]).toBe(owners[3])
    expect(owners[0]).not.toBe(owners[1])
    expect(new Set(owners).size).toBe(2)
  })

  it('gives each 2-player owner opposite corners (AC4)', () => {
    const state = generateSetup({ playerCount: 2, seed: 1 }, TEST_CONFIG)
    const centre = { x: 0, y: 0 }
    const border = state.paths.find((path) => path.kind === PATH_KIND.BORDER)
    centre.x = border!.path.reduce((sum, p) => sum + p.x, 0) / border!.path.length
    centre.y = border!.path.reduce((sum, p) => sum + p.y, 0) / border!.path.length
    const seatFor = (colour: ColourId) => state.seats.find((seat) => seat.colour === colour)
    const rectFor = (colour: ColourId) =>
      state.stations.find((s) => s.card.id === seatFor(colour)?.startingStationId)!.rect
    const angle = (colour: ColourId) => {
      const rect = rectFor(colour)
      return Math.atan2(rect.y + rect.height / 2 - centre.y, rect.x + rect.width / 2 - centre.x)
    }
    // A1 and A2 sit two corners apart on a square, i.e. ~pi radians of separation.
    const separation = Math.abs(angle(state.turnOrder[0]) - angle(state.turnOrder[2]))
    expect(Math.min(separation, 2 * Math.PI - separation)).toBeGreaterThan(Math.PI * 0.75)
  })

  it('gives every seat the §2.1 supply and its own starting station', () => {
    const state = generateSetup({ playerCount: 5, seed: 3 }, TEST_CONFIG)
    for (const seat of state.seats) {
      expect(seat.shortStringsLeft).toBe(SHORT_STRINGS_PER_SEAT)
      expect(seat.longStringsLeft).toBe(LONG_STRINGS_PER_SEAT)
      expect(seat.markersLeft).toBe(MARKERS_PER_SEAT)
      expect(seat.score).toBe(0)
      expect(state.stations.some((s) => s.card.id === seat.startingStationId)).toBe(true)
    }
    expect(new Set(state.seats.map((seat) => seat.startingStationId)).size).toBe(5)
  })

  it('sets each starting station markerOwner to its own colour so §9 fires', () => {
    const state = generateSetup({ playerCount: 2, seed: 3 }, TEST_CONFIG)
    for (const seat of state.seats) {
      const station = state.stations.find((s) => s.card.id === seat.startingStationId)
      expect(station?.markerOwner).toBe(seat.colour)
    }
  })

  it('does not spend a player marker on the starting station (§2 / §2.1)', () => {
    const state = generateSetup({ playerCount: 4, seed: 3 }, TEST_CONFIG)
    expect(state.seats.every((seat) => seat.markersLeft === MARKERS_PER_SEAT)).toBe(true)
  })

  it('offsets the mountain centre by no more than 15% of the inradius (AC5)', () => {
    const limit = inradius(4, TEST_CONFIG.borderPerimeter) * MOUNTAIN_OFFSET_FRACTION
    for (let seed = 0; seed < 25; seed++) {
      const state = generateSetup({ playerCount: 4, seed }, TEST_CONFIG)
      const border = state.paths.find((path) => path.kind === PATH_KIND.BORDER)!
      const mountain = state.paths.find((path) => path.kind === PATH_KIND.MOUNTAIN)!
      const centreOf = (points: typeof border.path) => ({
        x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
        y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
      })
      const b = centreOf(border.path)
      const m = centreOf(mountain.path)
      expect(Math.hypot(m.x - b.x, m.y - b.y)).toBeLessThanOrEqual(limit + 1e-6)
    }
  })

  it('builds the full shuffled deck from the M17 composition (§4.1 step 5)', () => {
    const state = generateSetup({ playerCount: 4, seed: 5 }, TEST_CONFIG)
    expect(state.deck).toHaveLength(DECK_SIZE)
    expect(state.deck.some((card) => card.type === STATION_TYPE.STARTING)).toBe(false)
  })

  it('starts in round 1, phase STATION, seat 0, IN_PLAY, with an empty move log', () => {
    const state = generateSetup({ playerCount: 4, seed: 5 }, TEST_CONFIG)
    expect(state.round).toBe(1)
    expect(state.activeSeatIndex).toBe(0)
    expect(state.phase).toBe(TURN_PHASE.STATION)
    expect(state.status).toBe('IN_PLAY')
    expect(state.moveLog).toEqual([])
    expect(state.pendingCard).toBeNull()
    expect(state.lastScoring).toBeNull()
    expect(state.lastDraw).toEqual([])
  })

  it('is deterministic — same seed and player count give an identical board (AC8)', () => {
    for (const playerCount of [2, 3, 4, 5] as const) {
      const a = generateSetup({ playerCount, seed: 987 }, TEST_CONFIG)
      const b = generateSetup({ playerCount, seed: 987 }, TEST_CONFIG)
      expect(a).toEqual(b)
    }
  })

  it('produces a different board for a different seed', () => {
    const a = generateSetup({ playerCount: 4, seed: 1 }, TEST_CONFIG)
    const b = generateSetup({ playerCount: 4, seed: 2 }, TEST_CONFIG)
    expect(a.paths).not.toEqual(b.paths)
  })

  it('emits a board that passes validateSetup across many seeds (AC9)', () => {
    for (let seed = 0; seed < 30; seed++) {
      for (const playerCount of [2, 3, 4, 5] as const) {
        const state = generateSetup({ playerCount, seed }, TEST_CONFIG)
        expect(validateSetup(state, TEST_CONFIG)).toEqual({ ok: true })
      }
    }
  })

  it('throws SetupGenerationError carrying the seed when the board is impossible (AC9)', () => {
    // A card larger than the whole border leaves nowhere legal for a corner
    // station, so the station sampler exhausts its ceiling.
    const impossible: RulesConfig = {
      ...TEST_CONFIG,
      borderPerimeter: 40,
      cardSize: 500,
      mountainLength: 20,
      riverLength: 10,
    }
    let thrown: unknown
    try {
      generateSetup({ playerCount: 4, seed: 4242 }, impossible)
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(SetupGenerationError)
    const error = thrown as SetupGenerationError
    expect(error.seed).toBe(4242)
    expect(error.playerCount).toBe(4)
    expect(error.failures.length).toBeGreaterThan(0)
    expect(error.message).toContain('4242')
  })

  it('terminates rather than hanging on an over-constrained board (AC9)', () => {
    const cramped: RulesConfig = { ...TEST_CONFIG, borderPerimeter: 60, cardSize: 400 }
    expect(() => generateSetup({ playerCount: 5, seed: 9 }, cramped)).toThrow(SetupGenerationError)
  })
})

describe('boardBounds', () => {
  it('contains every path vertex and every station rect', () => {
    const state = generateSetup({ playerCount: 5, seed: 21 }, TEST_CONFIG)
    const bounds = boardBounds(state, TEST_CONFIG)
    for (const path of state.paths) {
      for (const point of path.path) {
        expect(point.x).toBeGreaterThanOrEqual(bounds.x)
        expect(point.x).toBeLessThanOrEqual(bounds.x + bounds.width)
        expect(point.y).toBeGreaterThanOrEqual(bounds.y)
        expect(point.y).toBeLessThanOrEqual(bounds.y + bounds.height)
      }
    }
    for (const station of state.stations) {
      expect(station.rect.x).toBeGreaterThanOrEqual(bounds.x)
      expect(station.rect.x + station.rect.width).toBeLessThanOrEqual(bounds.x + bounds.width)
    }
  })

  it('pads by one card width so a corner card is never flush against the edge', () => {
    const state = generateSetup({ playerCount: 4, seed: 21 }, TEST_CONFIG)
    const border = state.paths.find((path) => path.kind === PATH_KIND.BORDER)!
    const minX = Math.min(...border.path.map((point) => point.x))
    const bounds = boardBounds(state, TEST_CONFIG)
    expect(minX - bounds.x).toBeGreaterThanOrEqual(TEST_CONFIG.cardSize / 2)
  })

  it('returns positive dimensions so no viewBox divides by zero', () => {
    const bounds = boardBounds(generateSetup({ playerCount: 3, seed: 1 }, TEST_CONFIG), TEST_CONFIG)
    expect(bounds.width).toBeGreaterThan(0)
    expect(bounds.height).toBeGreaterThan(0)
  })

  it('falls back to a card-sized box for a state with nothing in it', () => {
    const bounds = boardBounds(makeState({ paths: [], stations: [] }), TEST_CONFIG)
    expect(bounds.width).toBeGreaterThan(0)
    expect(bounds.height).toBeGreaterThan(0)
  })
})

/**
 * Every other spec in this file runs on TEST_CONFIG, whose values are synthetic
 * and deliberately not proportional to the shipped ones: cardSize/borderPerimeter
 * is 0.01 in the fixture and 0.03 in public/rules.json, and cardSize is exactly
 * the tolerance the river sampler uses for its §4.3 mountain clearance and the
 * corner-station fit. So this is the only place the samplers meet the numbers
 * the running app actually loads.
 *
 * The JSON is imported directly rather than fetched: Vitest runs under Node and
 * resolves the import at build time, so the src/rules/ purity boundary is
 * untouched, and parseRulesConfig is the same validator useRulesConfig uses.
 */
describe('generateSetup against the shipped rules.json', () => {
  const parsed = parseRulesConfig(shippedRules)

  it('parses public/rules.json — the shipped keys are the ones parseRulesConfig reads', () => {
    // The one link no type check covers: rules.json is data, so a renamed or
    // mistyped key surfaces here and nowhere else.
    expect(parsed.ok ? '' : describeConfigFailures(parsed.failures)).toBe('')
    expect(parsed.ok).toBe(true)
  })

  it('emits a board that passes validateSetup for every player count across 20 seeds (AC9)', () => {
    if (!parsed.ok) {
      throw new Error(`public/rules.json is not valid: ${describeConfigFailures(parsed.failures)}`)
    }
    const shipped = parsed.config
    for (let seed = 0; seed < 20; seed++) {
      for (const playerCount of [2, 3, 4, 5] as const) {
        const state = generateSetup({ playerCount, seed }, shipped)
        expect(validateSetup(state, shipped)).toEqual({ ok: true })
      }
    }
  })
})
