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
  it('returns a state with at least one primed card and a booked Timebomb payment', () => {
    const ui = fixtureHandWithPrimedTimebomb()
    expect(ui.round.primedCards.length).toBeGreaterThanOrEqual(1)
    const booked =
      ui.encounter.pendingTimebomb[DuelSide.Player] > 0 ||
      ui.encounter.pendingTimebomb[DuelSide.Quarry] > 0
    expect(booked).toBe(true)
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
