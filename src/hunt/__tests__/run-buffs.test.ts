import { describe, expect, it } from 'vitest'
import { advanceRun, recordEncounter, startRun } from '../run'
import { applyDamage } from '../encounter'
import { BuffTier } from '../buffs'
import { STARTING_BUFF_COUNT } from '../config'
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
      run.envenomCharges,
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
      first.envenomCharges,
      false,
      first.discardsRemaining,
      null,
    )
    const second = advanceRun(wonFirst)
    const wonSecond = recordEncounter(
      second,
      winEncounter(second.encounter),
      second.cheats,
      second.envenomCharges,
      false,
      second.discardsRemaining,
      null,
    )
    const third = advanceRun(wonSecond)
    expect(third.buffs).toEqual(first.buffs)
  })
})
