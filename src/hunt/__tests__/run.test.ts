import { describe, expect, it } from 'vitest'
import { advanceRun, canAdvanceRun, recordEncounter, RunOutcome, startRun } from '../run'
import { applyDamage } from '../encounter'
import { PLAYER_START_HEALTH, QUARRY_ENCOUNTER_HEALTH, quarryHealthForEncounter } from '../config'
import { DuelSide, type EncounterState, type IncomingDamage } from '../types'

const damage = (toPlayer: number, toQuarry: number): IncomingDamage => ({
  [DuelSide.Player]: toPlayer,
  [DuelSide.Quarry]: toQuarry,
})

/** Beat the Quarry of the encounter `run` is on, leaving the player on `playerLoss` less health. */
function winEncounter(encounter: EncounterState, playerLoss = 0): EncounterState {
  return applyDamage(encounter, damage(playerLoss, encounter.health[DuelSide.Quarry]))
}

describe('startRun (AC1)', () => {
  it('opens on fight 0 with both bars at their configured totals', () => {
    const run = startRun()
    expect(run.encounterIndex).toBe(0)
    expect(run.encounterCount).toBe(QUARRY_ENCOUNTER_HEALTH.length)
    expect(run.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
    expect(run.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
    expect(run.outcome).toBe(RunOutcome.InProgress)
  })

  it('sequences at least three fights that are not all the same', () => {
    expect(startRun().encounterCount).toBeGreaterThanOrEqual(3)
    expect(new Set(QUARRY_ENCOUNTER_HEALTH).size).toBeGreaterThan(1)
  })

  it('refuses a non-positive or non-finite starting health rather than starting a NaN bar', () => {
    for (const health of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => startRun(health)).toThrow(RangeError)
    }
  })
})

describe('recordEncounter — the outcome boundaries (AC4, AC5)', () => {
  it('stays in progress while the fight is live', () => {
    const run = startRun()
    const hit = applyDamage(run.encounter, damage(1, 1))
    expect(recordEncounter(run, hit).outcome).toBe(RunOutcome.InProgress)
  })

  it('stays in progress when an intermediate fight is won — the next one is waiting', () => {
    const run = startRun()
    const after = recordEncounter(run, winEncounter(run.encounter))
    expect(after.outcome).toBe(RunOutcome.InProgress)
    expect(after.encounter.winner).toBe(DuelSide.Player)
    expect(canAdvanceRun(after)).toBe(true)
  })

  it('ends the run as WON when the final fight is won (AC5)', () => {
    let run = startRun()
    for (let i = 0; i < run.encounterCount - 1; i += 1) {
      run = advanceRun(recordEncounter(run, winEncounter(run.encounter)))
    }
    const final = recordEncounter(run, winEncounter(run.encounter))
    expect(final.encounterIndex).toBe(final.encounterCount - 1)
    expect(final.outcome).toBe(RunOutcome.Won)
    expect(canAdvanceRun(final)).toBe(false)
  })

  it('ends the run as LOST the moment the player is down, whatever the position (AC4)', () => {
    const run = startRun()
    const dead = applyDamage(run.encounter, damage(PLAYER_START_HEALTH, 0))
    const after = recordEncounter(run, dead)
    expect(after.outcome).toBe(RunOutcome.Lost)
    expect(canAdvanceRun(after)).toBe(false)
  })

  it('refuses to record onto a run that has already ended', () => {
    const run = startRun()
    const lost = recordEncounter(run, applyDamage(run.encounter, damage(PLAYER_START_HEALTH, 0)))
    expect(() => recordEncounter(lost, lost.encounter)).toThrow(RangeError)
  })
})

describe('advanceRun — the carry (AC3)', () => {
  it('carries the health the player finished on, restoring nothing', () => {
    const run = startRun()
    const loss = 3
    const next = advanceRun(recordEncounter(run, winEncounter(run.encounter, loss)))
    expect(next.encounterIndex).toBe(1)
    expect(next.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - loss)
    expect(next.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(1))
  })

  it('opens the next fight unresolved, with its own damage counter at zero', () => {
    const run = startRun()
    const next = advanceRun(recordEncounter(run, winEncounter(run.encounter, 2)))
    expect(next.encounter.winner).toBeNull()
    expect(next.encounter.damageEventsApplied).toBe(0)
    expect(next.outcome).toBe(RunOutcome.InProgress)
  })

  it('throws rather than returning the run unchanged when it cannot advance', () => {
    const live = startRun()
    expect(canAdvanceRun(live)).toBe(false)
    expect(() => advanceRun(live)).toThrow(RangeError)

    const lost = recordEncounter(live, applyDamage(live.encounter, damage(PLAYER_START_HEALTH, 0)))
    expect(() => advanceRun(lost)).toThrow(RangeError)
  })

  it('never mutates the run it was handed', () => {
    const run = startRun()
    const won = recordEncounter(run, winEncounter(run.encounter, 4))
    const before = JSON.stringify(won)
    advanceRun(won)
    expect(JSON.stringify(won)).toBe(before)
  })
})
