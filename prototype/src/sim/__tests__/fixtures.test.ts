import { describe, expect, it } from 'vitest'
import { isEncounterResolved } from '../../hunt'
import { fixtureHandWithStackedBuffs, fixtureRunAfterFirstFight } from '../fixtures'

describe('fixtureRunAfterFirstFight', () => {
  it('returns a run with coins, a valid fight index, and a resolved-or-advanced encounter', () => {
    const run = fixtureRunAfterFirstFight()
    expect(run.coins).toBeGreaterThan(0)
    expect(run.encounterIndex).toBeGreaterThanOrEqual(0)
    const resolvedOrAdvanced = isEncounterResolved(run.encounter) || run.encounterIndex > 0
    expect(resolvedOrAdvanced).toBe(true)
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
    expect(fixtureHandWithStackedBuffs()).toStrictEqual(fixtureHandWithStackedBuffs())
  })
})
