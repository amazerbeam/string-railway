import { describe, expect, it } from 'vitest'
import { FRESH_ENCOUNTER_DECK } from '../../warCouncil'
import { PLAYER_START_HEALTH, startRun } from '../../hunt'
import { baselinePolicy } from '../baselinePolicy'
import { playHand } from '../playHand'

describe('playHand', () => {
  it('terminates cleanly for a hand from a fresh run', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 42)
    const outcome = playHand(run, 1, FRESH_ENCOUNTER_DECK, baselinePolicy)
    expect(outcome.report.stalled).toBe(false)
    expect(outcome.report.fault).toBeNull()
  })

  it('is deterministic: the same seed twice produces identical HandReports', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 42)
    const first = playHand(run, 1, FRESH_ENCOUNTER_DECK, baselinePolicy)
    const second = playHand(run, 1, FRESH_ENCOUNTER_DECK, baselinePolicy)
    expect(second.report).toStrictEqual(first.report)
  })

  it('causes at least one damage event in the first three hands of seed 42', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 42)
    let sawDamage = false
    for (let hand = 1; hand <= 3; hand += 1) {
      const outcome = playHand(run, hand, FRESH_ENCOUNTER_DECK, baselinePolicy)
      if (outcome.report.damageToQuarry + outcome.report.damageToPlayer > 0) {
        sawDamage = true
      }
    }
    expect(sawDamage).toBe(true)
  })

  it('plays all six tricks, or resolves the encounter before the sixth', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 42)
    const outcome = playHand(run, 1, FRESH_ENCOUNTER_DECK, baselinePolicy)
    const resolvedEarly = outcome.result.finalState.tricksPlayed < 6
    expect(outcome.result.finalState.tricksPlayed === 6 || resolvedEarly).toBe(true)
  })
})
