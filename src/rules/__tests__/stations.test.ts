import { describe, expect, it } from 'vitest'
import { DECK_SIZE, STATION_DEFINITIONS, STATION_TYPE } from '../../constants/stations'

describe('STATION_DEFINITIONS (§8)', () => {
  it('defines all ten station types', () => {
    expect(Object.keys(STATION_DEFINITIONS).sort()).toEqual(Object.values(STATION_TYPE).sort())
  })

  it('gives Depot its inverted 0/2 values', () => {
    const depot = STATION_DEFINITIONS[STATION_TYPE.DEPOT]
    expect(depot.bonusFirst).toBe(0)
    expect(depot.bonusLater).toBe(2)
    expect(depot.flags.markerBonus).toBe(true)
    expect(depot.flags.needsMarker).toBe(true)
  })

  it('gives Rural a player limit of 1 and the draw-station flag', () => {
    const rural = STATION_DEFINITIONS[STATION_TYPE.RURAL]
    expect(rural.playerLimit).toBe(1)
    expect(rural.flags.drawStation).toBe(true)
  })

  it('flags Terminus as pass-through banned and Railyard as a multiplier', () => {
    expect(STATION_DEFINITIONS[STATION_TYPE.TERMINUS].flags.terminus).toBe(true)
    expect(STATION_DEFINITIONS[STATION_TYPE.RAILYARD].flags.multiplier).toBe(true)
  })

  it('gives Landmark a marker penalty and Starting Station the same', () => {
    expect(STATION_DEFINITIONS[STATION_TYPE.LANDMARK].flags.markerPenalty).toBe(true)
    expect(STATION_DEFINITIONS[STATION_TYPE.STARTING].flags.markerPenalty).toBe(true)
  })

  it('gives Scenic the mountain bonus flag at base 1/1', () => {
    const scenic = STATION_DEFINITIONS[STATION_TYPE.SCENIC]
    expect(scenic.flags.mountainBonus).toBe(true)
    expect(scenic.bonusFirst).toBe(1)
    expect(scenic.bonusLater).toBe(1)
  })

  it('gives Scenic a mountainBonusValue of 2 and every other station 0', () => {
    expect(STATION_DEFINITIONS[STATION_TYPE.SCENIC].mountainBonusValue).toBe(2)

    for (const type of Object.values(STATION_TYPE)) {
      if (type === STATION_TYPE.SCENIC) {
        continue
      }
      expect(STATION_DEFINITIONS[type].mountainBonusValue).toBe(0)
    }
  })
})

describe('DECK_SIZE', () => {
  it('is the §2 printed total of 35 station cards', () => {
    expect(DECK_SIZE).toBe(35)
  })

  it('has a STATION_DEFINITIONS row for every deck-eligible type', () => {
    const deckTypes = Object.values(STATION_TYPE).filter((type) => type !== STATION_TYPE.STARTING)
    expect(deckTypes).toHaveLength(9)
    for (const type of deckTypes) {
      expect(STATION_DEFINITIONS[type]).toBeDefined()
    }
  })
})
