import { describe, expect, it } from 'vitest'
import { advanceRun, recordEncounter, startRun } from '../run'
import { applyDamage } from '../encounter'
import { BuffTier } from '../buffs'
import { COINS_PER_ENCOUNTER_WIN, RUN_STARTING_CHEATS, STARTING_BUFF_COUNT } from '../config'
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
  it('seeds STARTING_BUFF_COUNT bronze buffs plus RUN_STARTING_CHEATS bronze Cheats at the start of a run (AC3)', () => {
    const run = startRun()
    expect(run.buffs).toHaveLength(STARTING_BUFF_COUNT + RUN_STARTING_CHEATS)
    expect(run.buffs.every((b) => b.tier === BuffTier.Bronze)).toBe(true)
    expect(run.nextBuffId).toBe(STARTING_BUFF_COUNT + 1 + RUN_STARTING_CHEATS)
  })

  it('carries the buff pile across a fight boundary untouched (AC2)', () => {
    const run = startRun()
    const won = recordEncounter(
      run,
      winEncounter(run.encounter),
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
      false,
      first.discardsRemaining,
      null,
    )
    const second = advanceRun(wonFirst)
    const wonSecond = recordEncounter(
      second,
      winEncounter(second.encounter),
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
      false,
      run.discardsRemaining,
      null,
    )
    const withZero = recordEncounter(
      run,
      winEncounter(run.encounter),
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
    const recorded = recordEncounter(run, lostEncounter, false, run.discardsRemaining, null, 3)
    expect(recorded.coins).toBe(run.coins + 3)
  })
})

describe('recordEncounter — DLR-126, the run adopts a pile a hand spent from', () => {
  /** `recordEncounter`'s first six arguments for a run that neither won nor lost this hand. */
  const carry = (run: ReturnType<typeof startRun>) =>
    [run.encounter, run.blastGuardHeld, run.discardsRemaining, null, 0] as const

  it('adopts the shrunken pile when the ninth argument is passed', () => {
    const run = startRun()
    const shrunken = run.buffs.slice(1)

    const recorded = recordEncounter(run, ...carry(run), shrunken)

    expect(recorded.buffs).toEqual(shrunken)
    expect(recorded.buffs).toHaveLength(run.buffs.length - 1)
  })

  it('keeps run.buffs untouched when the ninth argument is omitted — all 52 existing call sites', () => {
    const run = startRun()
    const recorded = recordEncounter(run, ...carry(run))
    expect(recorded.buffs).toBe(run.buffs)
  })

  it('never decrements nextBuffId — a spent card’s id is not reissued', () => {
    const run = startRun()
    const recorded = recordEncounter(run, ...carry(run), run.buffs.slice(1))
    expect(recorded.nextBuffId).toBe(run.nextBuffId)
  })
})
