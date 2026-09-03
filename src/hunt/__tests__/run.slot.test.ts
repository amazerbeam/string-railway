import { describe, expect, it } from 'vitest'
import { startRun, slotVisitStockFor } from '../run'
import { advanceRun, pullSlotMachine, recordEncounter } from '../runTransitions'
import { applyDamage } from '../encounter'
import { isPricedBuff } from '../buffActivation'
import { resolvePull } from '../slotMachine'
import { BUFF_TEMPLATES } from '../buffTemplates'
import { SLOT_FREE_PULLS_PER_VISIT, SLOT_REROLL_PRICE } from '../slotConfig'
import { DuelSide, type EncounterState, type IncomingDamage } from '../types'

const damage = (toPlayer: number, toQuarry: number): IncomingDamage => ({
  [DuelSide.Player]: toPlayer,
  [DuelSide.Quarry]: toQuarry,
})

/** Beat the Quarry of the encounter `run` is on — the `run.test.ts` helper, restated here so this
 *  file needs no cross-file import for a two-line fixture. */
function winEncounter(encounter: EncounterState): EncounterState {
  return applyDamage(encounter, damage(0, encounter.health[DuelSide.Quarry]))
}

describe('slotVisitStockFor / the per-visit reset', () => {
  it('a fresh run has slotPullsThisVisit and apCapacityBonus at zero', () => {
    const run = startRun()
    expect(run.slotPullsThisVisit).toBe(0)
    expect(run.apCapacityBonus).toBe(0)
  })

  it('startRun takes runSeed as its third parameter', () => {
    expect(startRun(undefined, undefined, 99).runSeed).toBe(99)
  })

  it('startRun defaults runSeed to a fixed documented seed', () => {
    expect(startRun().runSeed).toBe(1)
  })

  it('slotVisitStockFor mirrors coins and slotPullsThisVisit', () => {
    const run = { ...startRun(), coins: 7, slotPullsThisVisit: 2 }
    expect(slotVisitStockFor(run)).toEqual({ coins: 7, pullsThisVisit: 2 })
  })

  it('advanceRun resets slotPullsThisVisit to 0 while leaving runSeed and apCapacityBonus unchanged', () => {
    const run = { ...startRun(undefined, undefined, 42), apCapacityBonus: 3, slotPullsThisVisit: 5 }
    const recorded = recordEncounter(
      run,
      winEncounter(run.encounter),
      run.discardsRemaining,
      null,
    )
    const advanced = advanceRun(recorded)
    expect(advanced.slotPullsThisVisit).toBe(0)
    expect(advanced.runSeed).toBe(42)
    expect(advanced.apCapacityBonus).toBe(3)
  })
})

describe('pullSlotMachine', () => {
  const [a, b, c] = BUFF_TEMPLATES
  const allDifferentPull = resolvePull([a, b, c])
  const twoMatchPull = resolvePull([a, a, b])
  const threeMatchPull = resolvePull([a, a, a])

  it('costs 0 (SLOT_FREE_PULLS_PER_VISIT) on the first pull of a visit', () => {
    const run = startRun()
    expect(SLOT_FREE_PULLS_PER_VISIT).toBe(1)
    const after = pullSlotMachine(run, allDifferentPull)
    expect(after.coins).toBe(run.coins)
    expect(after.slotPullsThisVisit).toBe(1)
  })

  it('costs SLOT_REROLL_PRICE on the second pull', () => {
    const run = { ...startRun(), coins: 5, slotPullsThisVisit: 1 }
    const after = pullSlotMachine(run, allDifferentPull)
    expect(after.coins).toBe(5 - SLOT_REROLL_PRICE)
  })

  it('appends awards to run.buffs in order, with consecutive ids from nextBuffId', () => {
    const run = startRun()
    const after = pullSlotMachine(run, allDifferentPull)
    const minted = after.buffs.slice(run.buffs.length)
    expect(minted).toHaveLength(allDifferentPull.awards.length)
    minted.forEach((buff, index) => {
      expect(buff.id).toBe(run.nextBuffId + index)
    })
    expect(after.nextBuffId).toBe(run.nextBuffId + allDifferentPull.awards.length)
  })

  it('every appended buff satisfies isPricedBuff — the Unassigned trap, asserted', () => {
    const run = startRun()
    const after = pullSlotMachine(run, allDifferentPull)
    const minted = after.buffs.slice(run.buffs.length)
    for (const buff of minted) {
      expect(isPricedBuff(buff)).toBe(true)
    }
  })

  it('appends 3 buffs for an all-different pull, 2 for a two-match pull, 1 for a three-match pull', () => {
    const run = startRun()
    expect(pullSlotMachine(run, allDifferentPull).buffs.length - run.buffs.length).toBe(3)
    expect(pullSlotMachine(run, twoMatchPull).buffs.length - run.buffs.length).toBe(2)
    expect(pullSlotMachine(run, threeMatchPull).buffs.length - run.buffs.length).toBe(1)
  })

  it('throws a RangeError naming notEnoughCoins when the pull cannot be afforded', () => {
    const run = { ...startRun(), coins: 0, slotPullsThisVisit: 1 }
    expect(() => pullSlotMachine(run, allDifferentPull)).toThrow(/notEnoughCoins/)
  })

  it('does not mutate the original run object', () => {
    const run = startRun()
    const snapshot = { ...run }
    pullSlotMachine(run, allDifferentPull)
    expect(run).toEqual(snapshot)
  })
})
