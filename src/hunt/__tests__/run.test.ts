import { describe, expect, it } from 'vitest'
import { advanceRun, canAdvanceRun, recordEncounter, RunOutcome, startRun } from '../run'
import { applyDamage } from '../encounter'
import {
  COINS_PER_ENCOUNTER_WIN,
  PLAYER_START_HEALTH,
  QUARRY_ENCOUNTER_HEALTH,
  quarryHealthForEncounter,
  RUN_STARTING_CHEATS,
} from '../config'
import { DuelSide, type EncounterState, type IncomingDamage } from '../types'

const damage = (toPlayer: number, toQuarry: number): IncomingDamage => ({
  [DuelSide.Player]: toPlayer,
  [DuelSide.Quarry]: toQuarry,
})

/**
 * Beat the Quarry of the encounter `run` is on, leaving the player on `playerLoss` less health.
 *
 * Two events, not one: D7 spares the player entirely on an event that empties the Quarry's bar,
 * so a single simultaneous event would leave `playerLoss` unapplied. The loss lands first, on an
 * event that does not touch the Quarry; the killing blow follows as its own event.
 */
function winEncounter(encounter: EncounterState, playerLoss = 0): EncounterState {
  const wounded = playerLoss > 0 ? applyDamage(encounter, damage(playerLoss, 0)) : encounter
  return applyDamage(wounded, damage(0, wounded.health[DuelSide.Quarry]))
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

  it('opens on zero coins (AC2)', () => {
    expect(startRun().coins).toBe(0)
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

  it('opens holding no Blast Guard (DLR-91 AC2)', () => {
    expect(startRun().blastGuardHeld).toBe(false)
  })
})

describe('recordEncounter — the outcome boundaries (AC4, AC5)', () => {
  it('stays in progress while the fight is live', () => {
    const run = startRun()
    const hit = applyDamage(run.encounter, damage(1, 1))
    expect(
      recordEncounter(run, hit, run.cheats, run.timebombCharges, false, run.discardsRemaining, null)
        .outcome,
    ).toBe(RunOutcome.InProgress)
  })

  it('stays in progress when an intermediate fight is won — the next one is waiting', () => {
    const run = startRun()
    const after = recordEncounter(
      run,
      winEncounter(run.encounter),
      run.cheats,
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
    )
    expect(after.outcome).toBe(RunOutcome.InProgress)
    expect(after.encounter.winner).toBe(DuelSide.Player)
    expect(canAdvanceRun(after)).toBe(true)
  })

  it('ends the run as WON when the final fight is won (AC5)', () => {
    let run = startRun()
    for (let i = 0; i < run.encounterCount - 1; i += 1) {
      run = advanceRun(
        recordEncounter(
          run,
          winEncounter(run.encounter),
          run.cheats,
          run.timebombCharges,
          false,
          run.discardsRemaining,
          null,
        ),
      )
    }
    const final = recordEncounter(
      run,
      winEncounter(run.encounter),
      run.cheats,
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
    )
    expect(final.encounterIndex).toBe(final.encounterCount - 1)
    expect(final.outcome).toBe(RunOutcome.Won)
    expect(canAdvanceRun(final)).toBe(false)
  })

  it('ends the run as LOST the moment the player is down, whatever the position (AC4)', () => {
    const run = startRun()
    const dead = applyDamage(run.encounter, damage(PLAYER_START_HEALTH, 0))
    const after = recordEncounter(
      run,
      dead,
      run.cheats,
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
    )
    expect(after.outcome).toBe(RunOutcome.Lost)
    expect(canAdvanceRun(after)).toBe(false)
  })

  it('refuses to record onto a run that has already ended', () => {
    const run = startRun()
    const lost = recordEncounter(
      run,
      applyDamage(run.encounter, damage(PLAYER_START_HEALTH, 0)),
      run.cheats,
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
    )
    expect(() =>
      recordEncounter(
        lost,
        lost.encounter,
        lost.cheats,
        lost.timebombCharges,
        false,
        lost.discardsRemaining,
        null,
      ),
    ).toThrow(RangeError)
  })
})

describe('recordEncounter — the payout (AC1)', () => {
  it('credits COINS_PER_ENCOUNTER_WIN the moment the player wins the encounter', () => {
    const run = startRun()
    const after = recordEncounter(
      run,
      winEncounter(run.encounter),
      run.cheats,
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
    )
    expect(after.coins).toBe(run.coins + COINS_PER_ENCOUNTER_WIN)
  })

  it('credits nothing while the encounter is still live', () => {
    const run = startRun()
    const hit = applyDamage(run.encounter, damage(1, 1))
    const after = recordEncounter(
      run,
      hit,
      run.cheats,
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
    )
    expect(after.coins).toBe(run.coins)
  })

  it('credits nothing when the Quarry wins', () => {
    const run = startRun()
    const dead = applyDamage(run.encounter, damage(PLAYER_START_HEALTH, 0))
    const after = recordEncounter(
      run,
      dead,
      run.cheats,
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
    )
    expect(after.coins).toBe(run.coins)
  })
})

describe('advanceRun — the carry (AC3)', () => {
  it('carries the health the player finished on, restoring nothing', () => {
    const run = startRun()
    const loss = 3
    const next = advanceRun(
      recordEncounter(
        run,
        winEncounter(run.encounter, loss),
        run.cheats,
        run.timebombCharges,
        false,
        run.discardsRemaining,
        null,
      ),
    )
    expect(next.encounterIndex).toBe(1)
    expect(next.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - loss)
    expect(next.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(1))
  })

  it('opens the next fight unresolved, with its own damage counter at zero', () => {
    const run = startRun()
    const next = advanceRun(
      recordEncounter(
        run,
        winEncounter(run.encounter, 2),
        run.cheats,
        run.timebombCharges,
        false,
        run.discardsRemaining,
        null,
      ),
    )
    expect(next.encounter.winner).toBeNull()
    expect(next.encounter.damageEventsApplied).toBe(0)
    expect(next.outcome).toBe(RunOutcome.InProgress)
  })

  it('throws rather than returning the run unchanged when it cannot advance', () => {
    const live = startRun()
    expect(canAdvanceRun(live)).toBe(false)
    expect(() => advanceRun(live)).toThrow(RangeError)

    const lost = recordEncounter(
      live,
      applyDamage(live.encounter, damage(PLAYER_START_HEALTH, 0)),
      live.cheats,
      live.timebombCharges,
      false,
      live.discardsRemaining,
      null,
    )
    expect(() => advanceRun(lost)).toThrow(RangeError)
  })

  it('never mutates the run it was handed', () => {
    const run = startRun()
    const won = recordEncounter(
      run,
      winEncounter(run.encounter, 4),
      run.cheats,
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
    )
    const before = JSON.stringify(won)
    advanceRun(won)
    expect(JSON.stringify(won)).toBe(before)
  })

  it('carries the coin balance across a fight boundary untouched', () => {
    const run = startRun()
    const won = recordEncounter(
      run,
      winEncounter(run.encounter),
      run.cheats,
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
    )
    const next = advanceRun(won)
    expect(next.coins).toBe(won.coins)
  })
})

describe('Cheats on RunState (DLR-83 AC3)', () => {
  it('grants Cheats from configuration at the start of a run (AC3)', () => {
    const run = startRun()
    expect(run.cheats).toHaveLength(RUN_STARTING_CHEATS)
    expect(run.nextCheatId).toBe(RUN_STARTING_CHEATS + 1)
  })

  it('carries the slots across a fight boundary untouched (AC3)', () => {
    const run = startRun()
    const won = recordEncounter(
      run,
      winEncounter(run.encounter),
      [{ id: 2 }],
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
    )
    const next = advanceRun(won)
    expect(next.cheats).toEqual([{ id: 2 }])
    expect(next.nextCheatId).toBe(won.nextCheatId)
  })

  it('adopts a spend reported by the hand', () => {
    const run = startRun()
    const hit = applyDamage(run.encounter, damage(1, 1))
    const after = recordEncounter(
      run,
      hit,
      [],
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
    )
    expect(after.cheats).toEqual([])
  })
})
