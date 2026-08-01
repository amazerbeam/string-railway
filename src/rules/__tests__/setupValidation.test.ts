import { describe, expect, it } from 'vitest'
import { PATH_KIND, SETUP_FAILURE } from '../../constants/game'
import { STATION_TYPE } from '../../constants/stations'
import { validateSetup } from '../setupValidation'
import { generateSetup } from '../setup'
import { asStationId } from '../types'
import { makePath, makeSeat, makeStation, makeState, TEST_CONFIG } from './fixtures'
import type { GameState } from '../types'

/** A real generated 4-player board is the known-good baseline — validating the
 *  generator's own output against the validator is exactly AC9. */
function goodState(): GameState {
  return generateSetup({ playerCount: 4, seed: 2026 }, TEST_CONFIG)
}

function codes(state: GameState): readonly string[] {
  const result = validateSetup(state, TEST_CONFIG)
  return result.ok ? [] : result.failures.map((failure) => failure.reason)
}

describe('validateSetup', () => {
  it('passes a freshly generated board for every player count (AC9)', () => {
    for (const playerCount of [2, 3, 4, 5] as const) {
      const state = generateSetup({ playerCount, seed: 77 }, TEST_CONFIG)
      expect(validateSetup(state, TEST_CONFIG)).toEqual({ ok: true })
    }
  })

  it('does NOT reject a starting station for touching the border (§4.1 step 6)', () => {
    // The check §5.2 would fail. This is the regression guard for the whole
    // reason this module exists rather than reusing validateStationPlacement.
    expect(codes(goodState())).not.toContain(SETUP_FAILURE.STATION_TOUCHES_TERRAIN)
  })

  it('reports a border whose perimeter is not the configured value', () => {
    const state = goodState()
    const broken: GameState = {
      ...state,
      paths: state.paths.map((path) =>
        path.kind === PATH_KIND.BORDER
          ? makePath(PATH_KIND.BORDER, [
              { x: 0, y: 0 },
              { x: 10, y: 0 },
              { x: 10, y: 10 },
              { x: 0, y: 10 },
            ])
          : path,
      ),
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.BORDER_WRONG_PERIMETER)
  })

  it('reports a self-intersecting border', () => {
    const state = goodState()
    const broken: GameState = {
      ...state,
      paths: state.paths.map((path) =>
        path.kind === PATH_KIND.BORDER
          ? makePath(PATH_KIND.BORDER, [
              { x: 0, y: 0 },
              { x: 100, y: 100 },
              { x: 100, y: 0 },
              { x: 0, y: 100 },
            ])
          : path,
      ),
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.BORDER_SELF_INTERSECTS)
  })

  it('reports a mountain of the wrong length', () => {
    const state = goodState()
    const mountain = state.paths.find((path) => path.kind === PATH_KIND.MOUNTAIN)
    expect(mountain).toBeDefined()
    const shrunk = mountain!.path.map((point) => ({ x: point.x * 0.5, y: point.y * 0.5 }))
    const broken: GameState = {
      ...state,
      paths: state.paths.map((path) =>
        path.kind === PATH_KIND.MOUNTAIN ? makePath(PATH_KIND.MOUNTAIN, shrunk) : path,
      ),
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.MOUNTAIN_WRONG_LENGTH)
  })

  it('reports a mountain that escapes the border', () => {
    const state = goodState()
    const mountain = state.paths.find((path) => path.kind === PATH_KIND.MOUNTAIN)
    const shifted = mountain!.path.map((point) => ({ x: point.x + 100000, y: point.y }))
    const broken: GameState = {
      ...state,
      paths: state.paths.map((path) =>
        path.kind === PATH_KIND.MOUNTAIN ? makePath(PATH_KIND.MOUNTAIN, shifted) : path,
      ),
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.MOUNTAIN_OUTSIDE_BORDER)
  })

  it('reports a river whose length is wrong', () => {
    const state = goodState()
    const river = state.paths.find((path) => path.kind === PATH_KIND.RIVER)
    const truncated = river!.path.slice(0, 3)
    const broken: GameState = {
      ...state,
      paths: state.paths.map((path) =>
        path.kind === PATH_KIND.RIVER ? makePath(PATH_KIND.RIVER, truncated) : path,
      ),
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.RIVER_WRONG_LENGTH)
  })

  it('reports a river touching the border at both ends (AC6 — exactly one)', () => {
    const state = goodState()
    const river = state.paths.find((path) => path.kind === PATH_KIND.RIVER)
    const reversedEndOnBorder = [...river!.path, river!.path[0]]
    const broken: GameState = {
      ...state,
      paths: state.paths.map((path) =>
        path.kind === PATH_KIND.RIVER ? makePath(PATH_KIND.RIVER, reversedEndOnBorder) : path,
      ),
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.RIVER_BORDER_TOUCH_COUNT)
  })

  it('reports a station fully outside the border', () => {
    const state = goodState()
    const broken: GameState = {
      ...state,
      stations: [
        ...state.stations.slice(1),
        makeStation(STATION_TYPE.STARTING, {
          x: 900000,
          y: 900000,
          width: TEST_CONFIG.cardSize,
          height: TEST_CONFIG.cardSize,
        }),
      ],
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.STATION_OUTSIDE_BORDER)
  })

  it('reports two stations overlapping each other', () => {
    const state = goodState()
    const first = state.stations[0]
    const duplicate = makeStation(STATION_TYPE.STARTING, first.rect)
    const broken: GameState = { ...state, stations: [...state.stations, duplicate] }
    expect(codes(broken)).toContain(SETUP_FAILURE.STATION_TOUCHES_STATION)
  })

  it('reports a seat count that does not match the turn order', () => {
    const state = goodState()
    const broken: GameState = { ...state, seats: state.seats.slice(1) }
    expect(codes(broken)).toContain(SETUP_FAILURE.SEAT_COUNT_MISMATCH)
  })

  it('reports a seat whose starting station is not on the board', () => {
    const state = goodState()
    // The override is load-bearing: makeSeat defaults startingStationId to
    // `${colour}-START`, which is exactly the id generateSetup assigns, so a
    // bare makeSeat would still name a station that IS on the board and the
    // assertion would be vacuous. Point it at an id nothing owns instead.
    const broken: GameState = {
      ...state,
      seats: state.seats.map((seat, index) =>
        index === 0
          ? makeSeat(String(seat.colour), String(seat.owner), {
              startingStationId: asStationId('NO-SUCH-STATION'),
            })
          : seat,
      ),
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.SEAT_STARTING_STATION_MISSING)
  })

  it('reports a missing border rather than passing vacuously', () => {
    const bare = makeState({ paths: [] })
    const result = validateSetup(bare, TEST_CONFIG)
    expect(result.ok).toBe(false)
  })
})
