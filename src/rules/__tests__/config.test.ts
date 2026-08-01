import { describe, expect, it } from 'vitest'
import { CONFIG_FAILURE } from '../../constants/game'
import { parseRulesConfig, describeConfigFailures } from '../config'

function valid(): Record<string, unknown> {
  return {
    configVersion: 1,
    geometry: {
      borderPerimeter: 4000,
      cardSize: 120,
      shortStringLength: 350,
      longStringLength: 700,
      mountainLength: 1400,
      riverLength: 700,
      arcLengthTolerance: 0.02,
      tangencyTolerance: 0.5,
    },
    deck: {
      composition: {
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
    },
  }
}

function reasons(raw: unknown): readonly string[] {
  const result = parseRulesConfig(raw)
  return result.ok ? [] : result.failures.map((failure) => failure.reason)
}

describe('parseRulesConfig', () => {
  it('accepts the shipped rules.json shape and returns every field', () => {
    const result = parseRulesConfig(valid())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.config.borderPerimeter).toBe(4000)
    expect(result.config.mountainLength).toBe(1400)
    expect(result.config.riverLength).toBe(700)
    expect(result.config.deckComposition.HAMLET).toBe(6)
  })

  it('rejects a non-object payload', () => {
    expect(reasons(null)).toContain(CONFIG_FAILURE.NOT_AN_OBJECT)
    expect(reasons('{}')).toContain(CONFIG_FAILURE.NOT_AN_OBJECT)
  })

  it('rejects an unreadable configVersion rather than best-effort parsing', () => {
    const raw = valid()
    raw.configVersion = 2
    expect(reasons(raw)).toContain(CONFIG_FAILURE.VERSION_MISMATCH)
  })

  it('names the missing key when a geometry constant is absent', () => {
    const raw = valid()
    delete (raw.geometry as Record<string, unknown>).riverLength
    const result = parseRulesConfig(raw)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.failures[0].reason).toBe(CONFIG_FAILURE.MISSING_KEY)
    expect(result.failures[0].key).toBe('geometry.riverLength')
  })

  it('rejects a non-finite number', () => {
    const raw = valid()
    ;(raw.geometry as Record<string, unknown>).cardSize = 'big'
    expect(reasons(raw)).toContain(CONFIG_FAILURE.NOT_A_NUMBER)
  })

  it('rejects a non-positive length (SCRUM-3 AC4)', () => {
    const raw = valid()
    ;(raw.geometry as Record<string, unknown>).shortStringLength = 0
    expect(reasons(raw)).toContain(CONFIG_FAILURE.NOT_POSITIVE)
  })

  it('rejects a long string that is not longer than the short one (SCRUM-3 AC4)', () => {
    const raw = valid()
    ;(raw.geometry as Record<string, unknown>).longStringLength = 350
    expect(reasons(raw)).toContain(CONFIG_FAILURE.LONG_NOT_LONGER_THAN_SHORT)
  })

  it('rejects a tolerance outside (0, 1)', () => {
    const raw = valid()
    ;(raw.geometry as Record<string, unknown>).arcLengthTolerance = 1
    expect(reasons(raw)).toContain(CONFIG_FAILURE.TOLERANCE_OUT_OF_RANGE)
  })

  it('accepts a zero tangencyTolerance, which is a legitimate exact-touch setting', () => {
    const raw = valid()
    ;(raw.geometry as Record<string, unknown>).tangencyTolerance = 0
    expect(parseRulesConfig(raw).ok).toBe(true)
  })

  it('rejects a fractional deck count', () => {
    const raw = valid()
    ;(raw.deck as { composition: Record<string, unknown> }).composition.TOWN = 5.5
    expect(reasons(raw)).toContain(CONFIG_FAILURE.DECK_COUNT_NOT_INTEGER)
  })

  it('rejects a composition that does not sum to DECK_SIZE (SCRUM-3 AC4)', () => {
    const raw = valid()
    ;(raw.deck as { composition: Record<string, unknown> }).composition.TOWN = 4
    expect(reasons(raw)).toContain(CONFIG_FAILURE.DECK_TOTAL_MISMATCH)
  })

  it('rejects STARTING in the composition — §2 ships those separately', () => {
    const raw = valid()
    const composition = (raw.deck as { composition: Record<string, unknown> }).composition
    composition.TOWN = 4
    composition.STARTING = 1
    expect(reasons(raw)).toContain(CONFIG_FAILURE.DECK_TYPE_NOT_ALLOWED)
  })

  it('reports every failure, not just the first', () => {
    const raw = valid()
    ;(raw.geometry as Record<string, unknown>).cardSize = -1
    ;(raw.geometry as Record<string, unknown>).riverLength = -1
    const result = parseRulesConfig(raw)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.failures.length).toBeGreaterThanOrEqual(2)
  })
})

describe('describeConfigFailures', () => {
  it('names each offending key by dotted path so the startup error is actionable', () => {
    const raw = valid()
    delete (raw.geometry as Record<string, unknown>).mountainLength
    const result = parseRulesConfig(raw)
    expect(result.ok).toBe(false)
    if (result.ok) return
    const message = describeConfigFailures(result.failures)
    expect(message).toContain('geometry.mountainLength')
    expect(message).toContain(CONFIG_FAILURE.MISSING_KEY)
  })
})
