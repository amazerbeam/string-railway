import { describe, expect, it } from 'vitest'
import { PLAYER_START_HEALTH } from '../config'
import { startEncounter } from '../encounter'
import { buyFromShop, drinkFlask, startRun, type RunState } from '../run'
import { ShopItem } from '../shop'
import { DuelSide } from '../types'

// DLR-127. The ticket reported that buying a Timebomb charge also granted a Cheat. It does not —
// `buyFromShop`'s Timebomb branch returns `{ ...paid, timebombCharges: run.timebombCharges + 1 }` and
// never touches `cheats`; the red assertion was reading the run's OPENING Cheat grant. But "a
// purchase quietly handed over something it did not charge for" is a real class of defect and had
// no guard at all, so this file adds one for every item at once rather than for Timebomb alone.
//
// Each case asserts the EXACT set of `RunState` fields a transition writes. An exact set, not a
// spot-check, is what makes this catch the next one: a branch that starts writing a field nobody
// thought to name fails here, and so does a field added to `RunState` later and written by
// accident.

/**
 * The top-level `RunState` keys whose values differ between two runs, sorted.
 *
 * Compares by REFERENCE (`Object.is`), which is exact for this module rather than merely cheap:
 * every transition in `runTransitions.ts` is an immutable spread, so a field the transition did
 * not write is the very same object — never a rebuilt equal one. A deep-equality diff would be
 * strictly worse here, because it would report the Heal's rebuilt `encounter` as unchanged
 * whenever the player was already at full health, which is exactly a case worth failing on.
 */
function changedFields(before: RunState, after: RunState): readonly string[] {
  return (Object.keys(before) as (keyof RunState)[])
    .filter((key) => !Object.is(before[key], after[key]))
    .sort()
}

/** A run at fight 0 with coins to spend and three hearts of damage taken, so the Heal and the
 *  flask both have something to restore and neither is refused for being at full health. */
function hurtAndFunded(coins: number): RunState {
  const run = startRun()
  return { ...run, coins, encounter: startEncounter(0, PLAYER_START_HEALTH - 3) }
}

/** `hurtAndFunded`, with the fight won — `drinkFlask` refuses an unresolved encounter, because
 *  AC4 makes drinking a between-fights action. */
function afterAWonFight(coins: number): RunState {
  const run = hurtAndFunded(coins)
  return {
    ...run,
    encounter: {
      ...run.encounter,
      health: { ...run.encounter.health, [DuelSide.Quarry]: 0 },
      winner: DuelSide.Player,
    },
  }
}

describe('changedFields — the helper itself is honest', () => {
  it('reports nothing for a run compared with itself', () => {
    const run = hurtAndFunded(9)
    expect(changedFields(run, run)).toEqual([])
  })

  it('reports a field that was written', () => {
    const run = hurtAndFunded(9)
    expect(changedFields(run, { ...run, coins: 0 })).toEqual(['coins'])
  })

  it('reports a field rebuilt to an equal value, so a needless rebuild cannot hide', () => {
    const run = hurtAndFunded(9)
    expect(changedFields(run, { ...run, cheats: [...run.cheats] })).toEqual(['cheats'])
  })
})

describe('buyFromShop — one purchase changes exactly one thing, plus the coins it cost', () => {
  it('Cheat: coins, the held list, and the id counter — and nothing else', () => {
    const before = hurtAndFunded(9)
    expect(changedFields(before, buyFromShop(before, ShopItem.Cheat))).toEqual([
      'cheats',
      'coins',
      'nextCheatId',
    ])
  })

  it('Timebomb: coins and the charge count — and NOTHING else (the DLR-127 report)', () => {
    const before = hurtAndFunded(9)
    expect(changedFields(before, buyFromShop(before, ShopItem.Timebomb))).toEqual([
      'coins',
      'timebombCharges',
    ])
  })

  it('Blast Guard: coins and the held flag — and nothing else', () => {
    const before = hurtAndFunded(9)
    expect(changedFields(before, buyFromShop(before, ShopItem.BlastGuard))).toEqual([
      'blastGuardHeld',
      'coins',
    ])
  })

  it('Whetstone: coins and the stone count — and nothing else', () => {
    const before = hurtAndFunded(9)
    expect(changedFields(before, buyFromShop(before, ShopItem.Whetstone))).toEqual([
      'coins',
      'whetstones',
    ])
  })

  it('Heal: coins and the encounter it restores health on — and nothing else', () => {
    const before = hurtAndFunded(9)
    expect(changedFields(before, buyFromShop(before, ShopItem.Heal))).toEqual([
      'coins',
      'encounter',
    ])
  })
})

describe('drinkFlask — the sibling that is not a purchase', () => {
  it('spends a charge and restores health, and grants no item on the way', () => {
    const before = afterAWonFight(9)
    expect(changedFields(before, drinkFlask(before))).toEqual(['encounter', 'flaskCharges'])
  })
})

describe('no purchase touches another item’s holding', () => {
  it('buying every item in turn leaves each holding at exactly what its own purchase set', () => {
    const opened = hurtAndFunded(20)
    const all = [ShopItem.Cheat, ShopItem.Timebomb, ShopItem.BlastGuard, ShopItem.Whetstone].reduce(
      (run, item) => buyFromShop(run, item),
      opened,
    )
    expect(all.cheats).toHaveLength(opened.cheats.length + 1)
    expect(all.timebombCharges).toBe(1)
    expect(all.blastGuardHeld).toBe(true)
    expect(all.whetstones).toBe(1)
    // The one the ticket is about, stated once more against a run that bought everything.
    expect(all.flaskCharges).toBe(opened.flaskCharges)
  })
})
