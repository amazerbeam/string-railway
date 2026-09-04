import { describe, expect, it } from 'vitest'
import { RunEnding, type HandReport, type RunReport, type SimSummary } from '../types'
import { baselinePolicy } from '../baselinePolicy'
import { formatSummary } from '../report'
import { simulate } from '../simulate'
import { EMPTY_BUFF_CARRY } from '../../hunt'
import { EMPTY_STREAK } from '../../warCouncil'

function handFixture(overrides: Partial<HandReport> = {}): HandReport {
  return {
    handOfFight: 1,
    damageToQuarry: 0,
    damageToPlayer: 0,
    tricksWon: 0,
    tricksPlayed: 0,
    buffsActivated: 0,
    apSpent: 0,
    coinsFromBuffs: 0,
    activatableBuffsHeld: 0,
    discardsUsed: 0,
    cheatsArmed: 0,
    stalled: false,
    fault: null,
    buffWindowObservations: [],
    buffFireOutcomes: [],
    lowCarryIn: EMPTY_BUFF_CARRY,
    lowCarryOut: EMPTY_BUFF_CARRY,
    streakIn: EMPTY_STREAK,
    streakOut: EMPTY_STREAK,
    potsApplied: [],
    playerHealthAtStart: 10,
    maxPlayerHealthAtStart: 10,
    trickOutcomes: {
      highVictory: 0,
      lowVictory: 0,
      lowDefeat: 0,
      highDefeat: 0,
      hurtLeading: 0,
      hurtFollowing: 0,
    },
    trickDamage: [],
    cheatMoments: { forced: 0, escapable: 0, held: 0, taken: 0 },
    ...overrides,
  }
}

function runFixture(overrides: Partial<RunReport> = {}): RunReport {
  return {
    seed: 1,
    ending: RunEnding.Won,
    fightReached: 0,
    fightsWon: 0,
    hands: [handFixture()],
    coinsEarned: 0,
    coinsSpent: 0,
    slotPulls: 0,
    combines: 0,
    buffsAcquired: 0,
    coinsSpentOnPulls: 0,
    coinsSpentByItem: {},
    buffsOwnedAtEnd: 0,
    deadCardRefusals: 0,
    ...overrides,
  }
}

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

  // DLR-165 renamed the four outcome counters (`cleanWin`/`dodge`/`cleanLoss`/`skullWin` →
  // `highVictory`/`lowVictory`/`lowDefeat`/`highDefeat`) and nothing else in this tree. This pins
  // the invariant `TrickOutcomeCounts`'s own docblock states, which is what the rename could
  // plausibly have broken: the two DEFEATS are exactly the hurt tricks, split by who was leading.
  // A counter left keyed on a retired name shows up here as a mismatch rather than as a silently
  // missing row in the printed report.
  it('DLR-165 — the two renamed Defeat counters are exactly the hurt tricks', () => {
    const summary = simulate({ runs: 8, baseSeed: 7 }, baselinePolicy)
    let hurtSeen = 0
    for (const run of summary.runs) {
      for (const hand of run.hands) {
        const oc = hand.trickOutcomes
        expect(oc.lowDefeat + oc.highDefeat).toBe(oc.hurtLeading + oc.hurtFollowing)
        hurtSeen += oc.hurtLeading + oc.hurtFollowing
      }
    }
    // Guard against the assertion above passing vacuously on all-zero counters.
    expect(hurtSeen).toBeGreaterThan(0)
  })

  it('terminates: every run of a 10-run batch is not Stalled and played at least one hand', () => {
    const summary = simulate({ runs: 10, baseSeed: 3 }, baselinePolicy)
    for (const run of summary.runs) {
      expect(run.ending).not.toBe(RunEnding.Stalled)
      expect(run.hands.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('the Quarry can actually be beaten in at least one fight (Code-Evaluator regression) — playHand.ts must dispatch the resolution screen’s apply-or-roll choice, or the Quarry can never take pot damage since `TrickResolution.cashOut` is zeroed unconditionally (DLR-156 AC5), and no simulated policy could defeat a Quarry through ordinary play at all', () => {
    // A whole RUN win is a documented, long-standing near-zero-probability event for every policy
    // here regardless of this fix (`.docs/implementation/run-winnability-simulation.md` — a
    // 25-encounter run against `PLAYER_START_HEALTH = 10` with no restore between fights), so a
    // full-run win is not the right bar. Beating even ONE fight is: it is only reachable at all
    // through `ApplyPot` actually dealing the Quarry damage, which is exactly what was broken.
    const summary = simulate({ runs: 20, baseSeed: 1 }, baselinePolicy)
    expect(summary.runs.some((run) => run.fightsWon > 0)).toBe(true)
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

describe('formatSummary — the DLR-120 levers and buff-starved figures', () => {
  it('formats the buff-starved percentage against activatableBuffsHeld', () => {
    const starved: SimSummary = {
      policyName: 'baseline',
      baseSeed: 1,
      runs: [
        runFixture({ hands: [handFixture({ activatableBuffsHeld: 0 })] }),
        runFixture({ hands: [handFixture({ activatableBuffsHeld: 0 })] }),
      ],
    }
    expect(formatSummary(starved)).toContain('hands played holding NO activatable buff: 100.0%')

    const unstarved: SimSummary = {
      policyName: 'baseline',
      baseSeed: 1,
      runs: [
        runFixture({ hands: [handFixture({ activatableBuffsHeld: 1 })] }),
        runFixture({ hands: [handFixture({ activatableBuffsHeld: 2 })] }),
      ],
    }
    expect(formatSummary(unstarved)).toContain('hands played holding NO activatable buff: 0.0%')
  })

  it('formats n/a for all three new figures on a zero-run summary, with no NaN', () => {
    const empty: SimSummary = { policyName: 'baseline', baseSeed: 1, runs: [] }
    const report = formatSummary(empty)
    expect(report).toContain('hands played holding NO activatable buff: n/a')
    expect(report).toContain('mean discards per run: n/a')
    expect(report).toContain('mean Cheats armed per run: n/a')
    expect(report).not.toMatch(/NaN/)
  })
})
