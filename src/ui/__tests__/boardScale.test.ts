import { describe, expect, it } from 'vitest'
import { cardMetrics, overlayMarks, terrainStrokes } from '../boardScale'
import type { RulesConfig } from '../../rules/config'

/** Only borderPerimeter is read by the two board derivations; the rest of the
 *  shape is present because RulesConfig requires it. */
function configWith(borderPerimeter: number): RulesConfig {
  return {
    shortStringLength: 350,
    longStringLength: 700,
    arcLengthTolerance: 0.02,
    tangencyTolerance: 0.5,
    cardSize: 120,
    borderPerimeter,
    mountainLength: 1400,
    riverLength: 700,
    deckComposition: {
      HAMLET: 6,
      VILLAGE: 6,
      TOWN: 5,
      SCENIC: 4,
      RURAL: 4,
      TERMINUS: 3,
      RAILYARD: 3,
      LANDMARK: 2,
      DEPOT: 2,
    },
  }
}

/** The borderPerimeter the prototype ships with. The board fractions are chosen
 *  so this reproduces the pre-SCRUM-15 appearance exactly. */
const SHIPPED_PERIMETER = 4000

describe('cardMetrics', () => {
  it('scales every dimension linearly with the card size (AC1)', () => {
    const small = cardMetrics(60)
    const large = cardMetrics(120)

    for (const key of Object.keys(large) as (keyof typeof large)[]) {
      expect(large[key]).toBeCloseTo(small[key] * 2, 10)
    }
  })

  it('keeps the black bonus dominant over and clear of the grey one (AC2, §7.2)', () => {
    const metrics = cardMetrics(120)

    expect(metrics.bonusFirstSize).toBeGreaterThan(metrics.bonusLaterSize * 1.5)
    // Cap height is ~0.72em, so the grey number's top sits this far above its
    // baseline. The gap below the black number's baseline must stay positive.
    const greyTop = metrics.bonusLaterY - metrics.bonusLaterSize * 0.72
    expect(greyTop - metrics.bonusFirstY).toBeGreaterThan(0)
  })

  it('keeps the whole face inside the card at any size (AC1)', () => {
    for (const size of [40, 120, 400]) {
      const metrics = cardMetrics(size)
      expect(metrics.typeY - metrics.typeSize * 0.72).toBeGreaterThan(0)
      expect(metrics.pawnY + metrics.pawnRadius + metrics.pawnStroke).toBeLessThan(size)
      // §7.1's pawn row must clear the grey bonus above it.
      expect(metrics.pawnY - metrics.pawnRadius).toBeGreaterThan(metrics.bonusLaterY)
    }
  })

  it('is a pure function of its argument', () => {
    expect(cardMetrics(120)).toEqual(cardMetrics(120))
  })
})

describe('terrainStrokes', () => {
  it('reproduces the shipped world units exactly at the shipped perimeter', () => {
    const strokes = terrainStrokes(configWith(SHIPPED_PERIMETER))

    expect(strokes.border).toBe(8)
    expect(strokes.mountain).toBe(6)
    expect(strokes.river).toBe(7)
    expect(strokes.mountainDash).toBe('18 10')
  })

  it('halves every stroke when the perimeter halves (AC4)', () => {
    const strokes = terrainStrokes(configWith(SHIPPED_PERIMETER / 2))

    expect(strokes.border).toBe(4)
    expect(strokes.mountain).toBe(3)
    expect(strokes.river).toBe(3.5)
    expect(strokes.mountainDash).toBe('9 5')
  })
})

describe('overlayMarks', () => {
  it('reproduces the shipped world units exactly at the shipped perimeter', () => {
    const marks = overlayMarks(configWith(SHIPPED_PERIMETER))

    expect(marks.vertexRadius).toBe(4)
    expect(marks.crossingRadius).toBe(7)
    expect(marks.crossingStroke).toBe(3)
    expect(marks.rectStroke).toBe(2)
    expect(marks.rectDash).toBe('6 4')
  })

  it('halves every mark when the perimeter halves (AC4)', () => {
    const marks = overlayMarks(configWith(SHIPPED_PERIMETER / 2))

    expect(marks.vertexRadius).toBe(2)
    expect(marks.crossingRadius).toBe(3.5)
    expect(marks.crossingStroke).toBe(1.5)
    expect(marks.rectStroke).toBe(1)
    expect(marks.rectDash).toBe('3 2')
  })

  it('keeps a crossing ring visibly larger than a vertex dot', () => {
    const marks = overlayMarks(configWith(SHIPPED_PERIMETER))

    expect(marks.crossingRadius).toBeGreaterThan(marks.vertexRadius)
  })
})
