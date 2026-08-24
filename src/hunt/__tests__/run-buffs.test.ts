import { describe, expect, it } from 'vitest'
import { advanceRun, recordEncounter, startRun } from '../run'
import { applyDamage } from '../encounter'
import { BuffTier } from '../buffs'
import { COINS_PER_ENCOUNTER_WIN, STARTING_BUFF_COUNT } from '../config'
import { DuelSide, type EncounterState, type IncomingDamage } from '../types'

const damage = (toPlayer: number, toQuarry: number): IncomingDamage => ({
  [DuelSide.Player]: toPlayer,
  [DuelSide.Quarry]: toQuarry,
})

/**
 * Beat the Quarry of the encounter `run` is on, leaving the player on `playerLoss` less health.
 *
 * Mirrors `run.test.ts`'s own `winEncounter` helper — duplicated rather than imported because
 * this file was split out of `run.test.ts` purely to keep both specs under the project's 400-line
 * budget (see `.claude/skills/react-frontend/SKILL.md`), and importing a `const`/`function` across
 * two sibling `__tests__` files is unusual here; the split changes no test's assertions or intent.
 */
function winEncounter(encounter: EncounterState, playerLoss = 0): EncounterState {
  const wounded = playerLoss > 0 ? applyDamage(encounter, damage(playerLoss, 0)) : encounter
  return applyDamage(wounded, damage(0, wounded.health[DuelSide.Quarry]))
}

describe('Buff pile on RunState (DLR-105 AC2/AC3)', () => {
  it('seeds STARTING_BUFF_COUNT bronze buffs at the start of a run (AC3)', () => {
    const run = startRun()
    expect(run.buffs).toHaveLength(STARTING_BUFF_COUNT)
    expect(run.buffs.every((b) => b.tier === BuffTier.Bronze)).toBe(true)
    expect(run.nextBuffId).toBe(STARTING_BUFF_COUNT + 1)
  })

  it('carries the buff pile across a fight boundary untouched (AC2)', () => {
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
    expect(next.buffs).toEqual(run.buffs)
    expect(next.nextBuffId).toBe(run.nextBuffId)
  })

  it('carries the buff pile across two fight boundaries (AC2)', () => {
    const first = startRun()
    const wonFirst = recordEncounter(
      first,
      winEncounter(first.encounter),
      first.cheats,
      first.timebombCharges,
      false,
      first.discardsRemaining,
      null,
    )
    const second = advanceRun(wonFirst)
    const wonSecond = recordEncounter(
      second,
      winEncounter(second.encounter),
      second.cheats,
      second.timebombCharges,
      false,
      second.discardsRemaining,
      null,
    )
    const third = advanceRun(wonSecond)
    expect(third.buffs).toEqual(first.buffs)
  })
})

describe('DLR-125 — Purse coins reach the run purse through recordEncounter', () => {
  it('the eighth parameter is added to the purse', () => {
    const run = startRun()
    const recorded = recordEncounter(
      run,
      winEncounter(run.encounter),
      run.cheats,
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
      5,
    )
    expect(recorded.coins).toBe(run.coins + COINS_PER_ENCOUNTER_WIN + 5)
  })

  it('an omitted buffCoinsEarned reproduces the pre-DLR-125 payout exactly', () => {
    const run = startRun()
    const withoutBuffs = recordEncounter(
      run,
      winEncounter(run.encounter),
      run.cheats,
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
    )
    const withZero = recordEncounter(
      run,
      winEncounter(run.encounter),
      run.cheats,
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
      0,
    )
    expect(withoutBuffs).toEqual(withZero)
  })

  it('a purse contribution lands even on a lost encounter — coins are never conditioned on a win', () => {
    const run = startRun()
    const lostEncounter = applyDamage(
      run.encounter,
      damage(run.encounter.health[DuelSide.Player], 0),
    )
    const recorded = recordEncounter(
      run,
      lostEncounter,
      run.cheats,
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
      3,
    )
    expect(recorded.coins).toBe(run.coins + 3)
  })
})
