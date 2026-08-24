import { describe, expect, it } from 'vitest'
import { RunEnding } from '../types'
import { baselinePolicy } from '../baselinePolicy'
import { formatSummary } from '../report'
import { simulate } from '../simulate'

describe('simulate + formatSummary', () => {
  it('is deterministic: the same options and policy produce the identical report string', () => {
    const first = formatSummary(simulate({ runs: 5, baseSeed: 11 }, baselinePolicy))
    const second = formatSummary(simulate({ runs: 5, baseSeed: 11 }, baselinePolicy))
    expect(second).toBe(first)
  })

  it('is seed-sensitive: base seed 11 and base seed 12 do not produce the same report', () => {
    const seedEleven = formatSummary(simulate({ runs: 5, baseSeed: 11 }, baselinePolicy))
    const seedTwelve = formatSummary(simulate({ runs: 5, baseSeed: 12 }, baselinePolicy))
    expect(seedEleven).not.toBe(seedTwelve)
  })

  it('terminates: every run of a 10-run batch is not Stalled and played at least one hand', () => {
    const summary = simulate({ runs: 10, baseSeed: 3 }, baselinePolicy)
    for (const run of summary.runs) {
      expect(run.ending).not.toBe(RunEnding.Stalled)
      expect(run.hands.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('reports no NaN in a 1-run batch', () => {
    const report = formatSummary(simulate({ runs: 1, baseSeed: 5 }, baselinePolicy))
    expect(report).not.toMatch(/NaN/)
  })

  it('names its policy', () => {
    const report = formatSummary(simulate({ runs: 1, baseSeed: 5 }, baselinePolicy))
    expect(report).toContain('baseline')
  })
})
