import { describe, expect, it } from 'vitest'
import { FRESH_ENCOUNTER_DECK, PlayerSide, type Card } from '../../warCouncil'
import { BuffKind, BuffRewardAxis, BuffTier, PLAYER_START_HEALTH, startRun } from '../../hunt'
import { baselinePolicy } from '../baselinePolicy'
import { playHand } from '../playHand'
import type { CheatPlay, SimPolicy } from '../types'

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

  it('records exactly one buffFireOutcome per buff activation, and only for kinds a valid BuffKind names', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 42)
    const outcome = playHand(run, 1, FRESH_ENCOUNTER_DECK, baselinePolicy)

    expect(outcome.report.buffFireOutcomes.length).toBe(outcome.report.buffsActivated)
    for (const fireOutcome of outcome.report.buffFireOutcomes) {
      expect(Object.values(BuffKind)).toContain(fireOutcome.kind)
    }
  })

  it('reports applyDamagePaid as a non-negative subset of damageToQuarry, and applyDamageLost as non-negative', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 42)
    for (let hand = 1; hand <= 5; hand += 1) {
      const outcome = playHand(run, hand, FRESH_ENCOUNTER_DECK, baselinePolicy)
      expect(outcome.report.applyDamagePaid).toBeGreaterThanOrEqual(0)
      expect(outcome.report.applyDamageLost).toBeGreaterThanOrEqual(0)
      expect(outcome.report.applyDamagePaid).toBeLessThanOrEqual(outcome.report.damageToQuarry)
    }
  })

  it('carries the reward axis, tier and value on every fire outcome and window observation', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 42)
    const outcome = playHand(run, 1, FRESH_ENCOUNTER_DECK, baselinePolicy)

    const axes = Object.values(BuffRewardAxis)
    const tiers = Object.values(BuffTier)
    for (const fireOutcome of outcome.report.buffFireOutcomes) {
      expect(axes).toContain(fireOutcome.axis)
      expect(tiers).toContain(fireOutcome.tier)
      expect(fireOutcome.rewardValue).toBeGreaterThanOrEqual(0)
    }
    for (const observation of outcome.report.buffWindowObservations) {
      expect(axes).toContain(observation.axis)
      expect(tiers).toContain(observation.tier)
    }

    // The opening pile is drawn all-bronze (`startingPile.ts`), and hand 1 of a fresh run can only
    // offer opening-pile cards — nothing has reached a shop or a slot machine yet.
    for (const observation of outcome.report.buffWindowObservations) {
      expect(observation.tier).toBe(BuffTier.Bronze)
    }
  })

  it('records a buffWindowObservation for every offered buff at the opening window, independent of what the policy chooses', () => {
    const neverActivates: SimPolicy = { ...baselinePolicy, chooseBuffs: () => [] }
    const run = startRun(PLAYER_START_HEALTH, [], 42)
    const outcome = playHand(run, 1, FRESH_ENCOUNTER_DECK, neverActivates)

    // A fresh run's opening pile is non-empty (DLR-135), so the opening window offers at least
    // one buff even though this policy never activates any of them.
    expect(outcome.report.buffWindowObservations.length).toBeGreaterThan(0)
    for (const observation of outcome.report.buffWindowObservations) {
      expect(Object.values(BuffKind)).toContain(observation.kind)
    }
  })
})

describe('playHand — the optional levers', () => {
  it('baselinePolicy (neither optional method) reports zero discards and zero Cheats, and its HandReport is otherwise unchanged', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 42)
    const first = playHand(run, 1, FRESH_ENCOUNTER_DECK, baselinePolicy)
    const second = playHand(run, 1, FRESH_ENCOUNTER_DECK, baselinePolicy)

    expect(first.report.discardsUsed).toBe(0)
    expect(first.report.cheatsArmed).toBe(0)
    expect(second.report.damageToQuarry).toBe(first.report.damageToQuarry)
    expect(second.report.damageToPlayer).toBe(first.report.damageToPlayer)
    expect(second.report.tricksWon).toBe(first.report.tricksWon)
    expect(second.report.buffsActivated).toBe(first.report.buffsActivated)
    expect(second.report.apSpent).toBe(first.report.apSpent)
    expect(second.report.applyDamagePresses).toBe(first.report.applyDamagePresses)
  })

  it('a policy discarding the first two hand cards commits exactly one discard for the whole hand, and the discarded cards leave the final hand', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 42)
    let discarded: readonly Card[] = []
    const policy: SimPolicy = {
      ...baselinePolicy,
      chooseDiscard: (ui) => {
        if (discarded.length === 0) {
          discarded = ui.round.hands[PlayerSide.Player].slice(0, 2)
        }
        return discarded
      },
    }

    const outcome = playHand(run, 1, FRESH_ENCOUNTER_DECK, policy)

    expect(outcome.report.discardsUsed).toBe(1)
    const finalHand = outcome.result.finalState.hands[PlayerSide.Player]
    for (const card of discarded) {
      expect(finalHand).not.toContainEqual(card)
    }
  })

  it('a policy that never wants to discard commits none and leaves discardsRemaining untouched', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 42)
    const policy: SimPolicy = {
      ...baselinePolicy,
      chooseDiscard: () => [],
    }

    const outcome = playHand(run, 1, FRESH_ENCOUNTER_DECK, policy)

    expect(outcome.report.discardsUsed).toBe(0)
    expect(outcome.result.discardsRemaining).toBe(run.discardsRemaining)
  })

  it('a Cheat play naming a cheatId not held reports zero Cheats armed and leaves the held Cheats unchanged', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 42)
    // DLR-145 — `chooseBuffs` is ALSO overridden to `[]` here, isolating the lever under test from
    // the ordinary buff window: with the pool now concentrated on five families,
    // `baselinePolicy`'s "activate everything affordable" window reaches the run's real starting
    // Cheat and consumes it through the normal single-use path (`CONDITION_CARD_SINGLE_USE`) —
    // nothing to do with `wantsCheatPlay`. Without this override the held-Cheat-count assertion
    // below fails for a reason unrelated to what this test names.
    const policy: SimPolicy = {
      ...baselinePolicy,
      chooseBuffs: () => [],
      wantsCheatPlay: (ui): CheatPlay | null => {
        const card = ui.round.hands[PlayerSide.Player][0]
        return card === undefined ? null : { cheatId: -999, card }
      },
    }

    const outcome = playHand(run, 1, FRESH_ENCOUNTER_DECK, policy)

    expect(outcome.report.cheatsArmed).toBe(0)
    // DLR-132 — the Cheat is an ordinary pile buff now, so "unchanged" means the pile's own Cheat
    // count is unchanged, not a deleted `RunState.cheats` array.
    expect(outcome.result.buffs.filter((buff) => buff.kind === BuffKind.Cheat).length).toBe(
      run.buffs.filter((buff) => buff.kind === BuffKind.Cheat).length,
    )
  })
})
