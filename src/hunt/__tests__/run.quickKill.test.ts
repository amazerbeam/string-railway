import { describe, expect, it } from 'vitest'
import { advanceRun, recordEncounter, startRun } from '../run'
import { applyDamage } from '../encounter'
import { COINS_PER_ENCOUNTER_WIN, HAND_SIZE, PLAYER_START_HEALTH } from '../config'
import { DuelSide, type EncounterState, type IncomingDamage } from '../types'

const damage = (toPlayer: number, toQuarry: number): IncomingDamage => ({
  [DuelSide.Player]: toPlayer,
  [DuelSide.Quarry]: toQuarry,
})

/** The same two-event split `run.test.ts`'s own `winEncounter` helper uses, and for its reason:
 *  D7 spares the player on any event that empties the Quarry's bar, so a single simultaneous
 *  event would leave the player's loss unapplied. */
function winEncounter(encounter: EncounterState): EncounterState {
  return applyDamage(encounter, damage(0, encounter.health[DuelSide.Quarry]))
}

/** Record an unresolved hand — the fight goes on, so the counter advances. */
function playAnotherHand(run: ReturnType<typeof startRun>) {
  return recordEncounter(
    run,
    applyDamage(run.encounter, damage(1, 1)),
    run.cheats,
    run.timebombCharges,
    run.poisonGuardHeld,
    run.discardsRemaining,
    null,
  )
}

describe('handOfFight — the hand-within-encounter counter (AC3)', () => {
  it('opens a run on its first hand', () => {
    expect(startRun().handOfFight).toBe(1)
  })

  it('advances only while the fight is unresolved', () => {
    const run = startRun()
    expect(playAnotherHand(run).handOfFight).toBe(2)
    expect(playAnotherHand(playAnotherHand(run)).handOfFight).toBe(3)
  })

  it('holds still on the hand that ended the fight, so the kill’s tier stays readable', () => {
    const second = playAnotherHand(startRun())
    const won = recordEncounter(
      second,
      winEncounter(second.encounter),
      second.cheats,
      second.timebombCharges,
      second.poisonGuardHeld,
      second.discardsRemaining,
      3,
    )
    expect(won.handOfFight).toBe(2)
  })

  it('resets to 1 when the next fight opens (AC3)', () => {
    const third = playAnotherHand(playAnotherHand(startRun()))
    const won = recordEncounter(
      third,
      winEncounter(third.encounter),
      third.cheats,
      third.timebombCharges,
      third.poisonGuardHeld,
      third.discardsRemaining,
      0,
    )
    expect(advanceRun(won).handOfFight).toBe(1)
  })
})

describe('recordEncounter — the quick-kill payout (AC1, AC2, AC4, AC5)', () => {
  function winOn(handOfFight: number, unplayedCards: number) {
    let run = startRun()
    for (let i = 1; i < handOfFight; i += 1) run = playAnotherHand(run)
    return recordEncounter(
      run,
      winEncounter(run.encounter),
      run.cheats,
      run.timebombCharges,
      run.poisonGuardHeld,
      run.discardsRemaining,
      unplayedCards,
    )
  }

  // The design doc's worked example, credited: 5 × 2 = 10, PLUS the flat coin (AC1, resolved
  // additive by the developer 2026-08-20).
  it('pays the flat win coin AND the quick-kill payout on a first-hand kill (AC1)', () => {
    const won = winOn(1, 5)
    expect(won.lastQuickKillPayout).toBe(10)
    expect(won.coins).toBe(COINS_PER_ENCOUNTER_WIN + 10)
  })

  it('halves into a floored payout on a third-hand kill (AC2, AC4)', () => {
    const won = winOn(3, 5)
    expect(won.lastQuickKillPayout).toBe(2)
    expect(won.coins).toBe(COINS_PER_ENCOUNTER_WIN + 2)
  })

  it('still pays the flat coin when the taper pays nothing (AC5)', () => {
    const won = winOn(4, HAND_SIZE)
    expect(won.lastQuickKillPayout).toBe(0)
    expect(won.coins).toBe(COINS_PER_ENCOUNTER_WIN)
  })

  it('pays nothing extra when the hand reported no figure', () => {
    const run = startRun()
    const won = recordEncounter(
      run,
      winEncounter(run.encounter),
      run.cheats,
      run.timebombCharges,
      run.poisonGuardHeld,
      run.discardsRemaining,
      null,
    )
    expect(won.lastQuickKillPayout).toBe(0)
    expect(won.coins).toBe(COINS_PER_ENCOUNTER_WIN)
  })

  it('pays nothing at all when the player is the one who went down', () => {
    const run = startRun()
    const dead = applyDamage(run.encounter, damage(PLAYER_START_HEALTH, 0))
    const lost = recordEncounter(
      run,
      dead,
      run.cheats,
      run.timebombCharges,
      run.poisonGuardHeld,
      run.discardsRemaining,
      6,
    )
    expect(lost.lastQuickKillPayout).toBe(0)
    expect(lost.coins).toBe(0)
  })

  it('clears the receipt on a hand that resolved nothing, so a stale figure cannot be shown', () => {
    const paid = winOn(1, 5)
    expect(paid.lastQuickKillPayout).toBe(10)
    expect(playAnotherHand(advanceRun(paid)).lastQuickKillPayout).toBe(0)
  })
})
