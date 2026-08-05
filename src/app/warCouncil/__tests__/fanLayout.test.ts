import { describe, expect, it } from 'vitest'
import { FAN_ARMED_Z_INDEX, fanPlacement } from '../fanLayout'

describe('fanPlacement', () => {
  it('is symmetric about the centre of the fan', () => {
    expect(fanPlacement(0, 13, false).rotateDeg).toBeCloseTo(-fanPlacement(12, 13, false).rotateDeg)
    expect(fanPlacement(0, 13, false).liftPct).toBeCloseTo(fanPlacement(12, 13, false).liftPct)
  })

  it('leaves a single card upright', () => {
    const only = fanPlacement(0, 1, false)
    expect(only.rotateDeg).toBe(0)
    expect(only.liftPct).toBe(0)
  })

  it('never overlaps the first card', () => {
    expect(fanPlacement(0, 13, false).overlapPx).toBe(0)
  })

  it('tightens the overlap as the hand grows', () => {
    expect(fanPlacement(1, 13, false).overlapPx).toBeLessThan(fanPlacement(1, 5, false).overlapPx)
  })

  it('lifts an armed card above every sibling', () => {
    expect(fanPlacement(3, 13, true).zIndex).toBe(FAN_ARMED_Z_INDEX)
    expect(fanPlacement(3, 13, false).zIndex).toBeLessThan(FAN_ARMED_Z_INDEX)
  })

  it('produces finite numbers for every hand size a round can reach', () => {
    for (let count = 0; count <= 13; count++) {
      for (let i = 0; i < Math.max(count, 1); i++) {
        const p = fanPlacement(i, count, false)
        expect(Number.isFinite(p.rotateDeg)).toBe(true)
        expect(Number.isFinite(p.liftPct)).toBe(true)
        expect(Number.isFinite(p.overlapPx)).toBe(true)
      }
    }
  })
})
