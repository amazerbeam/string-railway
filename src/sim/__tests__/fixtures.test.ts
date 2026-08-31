import { describe, expect, it } from 'vitest'
import { DuelSide, isEncounterResolved } from '../../hunt'
import {
  fixtureHandWithPrimedTimebomb,
  fixtureHandWithStackedBuffs,
  fixtureRunAfterFirstFight,
} from '../fixtures'

describe('fixtureRunAfterFirstFight', () => {
  it('returns a run with coins, a valid fight index, and a resolved-or-advanced encounter', () => {
    const run = fixtureRunAfterFirstFight()
    expect(run.coins).toBeGreaterThan(0)
    expect(run.encounterIndex).toBeGreaterThanOrEqual(0)
    const resolvedOrAdvanced = isEncounterResolved(run.encounter) || run.encounterIndex > 0
    expect(resolvedOrAdvanced).toBe(true)
  })
})

describe('fixtureHandWithPrimedTimebomb', () => {
  it('returns a state with a booked Timebomb payment and no lingering mark — DLR-154 FIX B', () => {
    const ui = fixtureHandWithPrimedTimebomb()
    const booked =
      ui.encounter.pendingTimebomb[DuelSide.Player] > 0 ||
      ui.encounter.pendingTimebomb[DuelSide.Quarry] > 0
    expect(booked).toBe(true)
    // The detonation that booked this payment cleared the mark in the same transition —
    // `commitHandlers.ts`'s `liftDetonatedMark`/`liftExpiredMarks`. A lingering primed card here
    // would be exactly the stranded-mark bug FIX B removed.
    expect(ui.round.primedCards).toEqual([])
  })
})

describe('fixtureHandWithStackedBuffs', () => {
  it('returns a state with two or more buffs activated in one trick', () => {
    const ui = fixtureHandWithStackedBuffs()
    expect(ui.buffActivation.activatedThisTrick.length).toBeGreaterThanOrEqual(2)
  })
})

describe('determinism', () => {
  it('each fixture called twice returns deeply equal values', () => {
    expect(fixtureRunAfterFirstFight()).toStrictEqual(fixtureRunAfterFirstFight())
    expect(fixtureHandWithPrimedTimebomb()).toStrictEqual(fixtureHandWithPrimedTimebomb())
    expect(fixtureHandWithStackedBuffs()).toStrictEqual(fixtureHandWithStackedBuffs())
  })
})
