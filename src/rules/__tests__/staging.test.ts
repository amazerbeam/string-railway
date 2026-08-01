import { describe, expect, it } from 'vitest'
import { DRAW_EVENT, STATION_STEP_STAGE, TURN_PHASE } from '../../constants/game'
import { STATION_TYPE } from '../../constants/stations'
import { cardRectAt, stationStepStage } from '../staging'
import { asStationId } from '../types'
import type { DrawEvent } from '../types'
import { makeCard, makeState } from './fixtures'

const drawEvent = (kind: DrawEvent['kind']): DrawEvent => ({
  kind,
  cardId: asStationId('HAMLET-1'),
  stationType: STATION_TYPE.HAMLET,
  failures: 0,
})

describe('cardRectAt', () => {
  it('centres a square of exactly cardSize on the given point', () => {
    const rect = cardRectAt({ x: 100, y: 50 }, 20)
    expect(rect).toEqual({ x: 90, y: 40, width: 20, height: 20 })
  })

  it('keeps the rect centre equal to the input point for an odd size', () => {
    const rect = cardRectAt({ x: 0, y: 0 }, 15)
    expect(rect.x + rect.width / 2).toBe(0)
    expect(rect.y + rect.height / 2).toBe(0)
  })

  it('accepts negative coordinates without distorting the footprint', () => {
    const rect = cardRectAt({ x: -30, y: -30 }, 20)
    expect(rect).toEqual({ x: -40, y: -40, width: 20, height: 20 })
  })
})

describe('stationStepStage', () => {
  it('is AWAITING_DRAW in phase STATION with no card and no trace', () => {
    const state = makeState({ phase: TURN_PHASE.STATION, pendingCard: null, lastDraw: [] })
    expect(stationStepStage(state)).toBe(STATION_STEP_STAGE.AWAITING_DRAW)
  })

  it('is PLACING once a card is pending', () => {
    const state = makeState({
      phase: TURN_PHASE.STATION,
      pendingCard: makeCard(STATION_TYPE.HAMLET),
    })
    expect(stationStepStage(state)).toBe(STATION_STEP_STAGE.PLACING)
  })

  it('is SKIPPED when the trace ended in a skip, which AWAITING_DRAW otherwise looks identical to', () => {
    for (const kind of [DRAW_EVENT.SKIPPED_DECK_EMPTY, DRAW_EVENT.SKIPPED_NO_LEGAL_PLACEMENT]) {
      const state = makeState({
        phase: TURN_PHASE.STATION,
        pendingCard: null,
        lastDraw: [drawEvent(kind)],
      })
      expect(stationStepStage(state)).toBe(STATION_STEP_STAGE.SKIPPED)
    }
  })

  it('is AWAITING_DRAW when the trace ended in a recycle rather than a skip', () => {
    const state = makeState({
      phase: TURN_PHASE.STATION,
      pendingCard: null,
      lastDraw: [drawEvent(DRAW_EVENT.RECYCLED_NEEDS_MARKER)],
    })
    expect(stationStepStage(state)).toBe(STATION_STEP_STAGE.AWAITING_DRAW)
  })

  it('is DONE outside phase STATION', () => {
    const state = makeState({ phase: TURN_PHASE.STRING })
    expect(stationStepStage(state)).toBe(STATION_STEP_STAGE.DONE)
  })

  it('is DONE on an ended game even though advanceTurn leaves phase STATION', () => {
    const state = makeState({ phase: TURN_PHASE.STATION, pendingCard: null, status: 'ENDED' })
    expect(stationStepStage(state)).toBe(STATION_STEP_STAGE.DONE)
  })
})
