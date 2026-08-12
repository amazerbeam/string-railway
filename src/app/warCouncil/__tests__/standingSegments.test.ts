import { describe, expect, it } from 'vitest'
import { standingSegments } from '../standingSegments'
import { HuntDeclaration, standingTableFor, type StandingBand } from '../../../hunt'

const winTable = standingTableFor(HuntDeclaration.Win)

describe('standingSegments — geometry derived from the configured table', () => {
  it('gives every configured row one segment, spanning its trick range', () => {
    const segments = standingSegments(winTable, 0)
    expect(segments).toHaveLength(winTable.length)
    segments.forEach((segment, i) => {
      expect(segment.span).toBe(winTable[i].maxTricks - winTable[i].minTricks + 1)
    })
    // The spans must tile 0..13 exactly — 14 positions, no gap and no overlap.
    expect(segments.reduce((total, s) => total + s.span, 0)).toBe(14)
  })

  it('scales height against the table’s largest multiplier, so the peak is 100%', () => {
    const top = Math.max(...winTable.map((b) => b.multiplier))
    const segments = standingSegments(winTable, 0)
    segments.forEach((segment, i) => {
      expect(segment.heightPct).toBeCloseTo((winTable[i].multiplier / top) * 100)
    })
    expect(segments.some((s) => s.heightPct === 100)).toBe(true)
  })

  it('marks peak and cliff from the table’s own extremes, not from a band name', () => {
    const mults = winTable.map((b) => b.multiplier)
    const segments = standingSegments(winTable, 0)
    segments.forEach((segment, i) => {
      expect(segment.isPeak).toBe(winTable[i].multiplier === Math.max(...mults))
      expect(segment.isCliff).toBe(winTable[i].multiplier === Math.min(...mults))
    })
  })

  it.each([0, 3, 4, 7, 9, 13])(
    'puts the current pip at the right index within its bracket (k=%i)',
    (k) => {
      const segments = standingSegments(winTable, k)
      const current = segments.filter((s) => s.isCurrent)
      expect(current).toHaveLength(1)
      expect(current[0].band.minTricks).toBeLessThanOrEqual(k)
      expect(current[0].band.maxTricks).toBeGreaterThanOrEqual(k)
      expect(current[0].currentPipIndex).toBe(k - current[0].band.minTricks)
      segments.filter((s) => !s.isCurrent).forEach((s) => expect(s.currentPipIndex).toBeNull())
    },
  )

  it('renders with no marker rather than throwing on an out-of-range trick count', () => {
    // A readout drawn every render must not blank the screen. This is deliberately the
    // OPPOSITE posture from huntDamage, which throws — that commits damage, this displays.
    const segments = standingSegments(winTable, 99)
    expect(segments).toHaveLength(winTable.length)
    expect(segments.every((s) => !s.isCurrent && s.currentPipIndex === null)).toBe(true)
  })

  it('throws on an empty table rather than dividing by −Infinity into NaN', () => {
    const empty: readonly StandingBand[] = []
    expect(() => standingSegments(empty, 0)).toThrow(RangeError)
  })
})
