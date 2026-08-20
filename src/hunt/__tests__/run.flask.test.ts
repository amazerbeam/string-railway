import { describe, expect, it } from 'vitest'
import { FLASK_STARTING_CHARGES, OpponentKind, RUN_ENCOUNTERS } from '../config'
import { FlaskRefusal, flaskHealAmount } from '../flask'
import { advanceRun, drinkFlask, flaskStockFor, recordEncounter, startRun } from '../run'
import { applyDamage } from '../encounter'
import { DuelSide, type EncounterState } from '../types'

const MAX = 10

/** The first index in the configured run holding each kind — read from the config rather than
 *  hard-coded, so reshaping the run cannot silently point these specs at the wrong opponent. */
const firstBossIndex = RUN_ENCOUNTERS.findIndex((e) => e.kind === OpponentKind.Boss)
const firstOrdinaryIndex = RUN_ENCOUNTERS.findIndex((e) => e.kind === OpponentKind.Ordinary)

/** A resolved encounter the player won, on the given carried health. Built by draining the
 *  Quarry through `applyDamage` rather than by hand, so `winner` and `isEncounterResolved` are
 *  set by the engine's own rules. */
function wonEncounter(encounter: EncounterState, carriedPlayerHealth: number): EncounterState {
  let next: EncounterState = {
    ...encounter,
    health: { ...encounter.health, [DuelSide.Player]: carriedPlayerHealth },
  }
  while (next.winner === null) {
    next = applyDamage(next, {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: next.health[DuelSide.Quarry],
    })
  }
  return next
}

/** A run sitting UNRESOLVED at `index`, both bars full, with the given charges. Adapted from the
 *  plan's fixture: `runWonAt` below builds on top of this rather than resolving the encounter
 *  twice. */
function runUnresolvedAt(index: number, charges: number) {
  let run = startRun(MAX)
  while (run.encounterIndex < index) {
    run = advanceRun({ ...run, encounter: wonEncounter(run.encounter, MAX) })
  }
  return { ...run, flaskCharges: charges }
}

/** A run sitting on a resolved, won encounter at `index`, with the given health and charges. */
function runWonAt(index: number, health: number, charges: number) {
  const run = runUnresolvedAt(index, charges)
  return {
    ...run,
    encounter: wonEncounter(run.encounter, health),
  }
}

describe('startRun (AC1)', () => {
  it('opens the run on the configured starting charges, not a literal', () => {
    expect(startRun(MAX).flaskCharges).toBe(FLASK_STARTING_CHARGES)
  })
})

describe('flaskStockFor', () => {
  it('projects the run into exactly the three figures the rules need', () => {
    const run = startRun(MAX)
    expect(flaskStockFor(run, MAX)).toEqual({
      charges: FLASK_STARTING_CHARGES,
      playerHealth: MAX,
      maxPlayerHealth: MAX,
    })
  })
})

describe('drinkFlask (AC2, AC3, AC4)', () => {
  it('restores the configured proportion and spends the charge', () => {
    const run = runWonAt(firstOrdinaryIndex, 3, 1)
    const after = drinkFlask(run, MAX)
    expect(after.encounter.health[DuelSide.Player]).toBe(3 + flaskHealAmount(MAX))
    expect(after.flaskCharges).toBe(0)
  })

  it('clamps to the maximum and discards the overheal', () => {
    const run = runWonAt(firstOrdinaryIndex, 8, 1)
    const after = drinkFlask(run, MAX)
    expect(after.encounter.health[DuelSide.Player]).toBe(MAX)
    expect(after.flaskCharges).toBe(0)
  })

  it('leaves every other run field untouched', () => {
    const run = runWonAt(firstOrdinaryIndex, 3, 1)
    const after = drinkFlask(run, MAX)
    expect(after.coins).toBe(run.coins)
    expect(after.cheats).toBe(run.cheats)
    expect(after.envenomCharges).toBe(run.envenomCharges)
    expect(after.whetstones).toBe(run.whetstones)
    expect(after.encounter.health[DuelSide.Quarry]).toBe(run.encounter.health[DuelSide.Quarry])
  })

  it('throws naming the refusal at zero charges rather than taking a no-op turn', () => {
    const run = runWonAt(firstOrdinaryIndex, 3, 0)
    expect(() => drinkFlask(run, MAX)).toThrow(RangeError)
    expect(() => drinkFlask(run, MAX)).toThrow(FlaskRefusal.NoCharges)
  })

  it('throws naming the refusal at full health', () => {
    const run = runWonAt(firstOrdinaryIndex, MAX, 1)
    expect(() => drinkFlask(run, MAX)).toThrow(FlaskRefusal.AlreadyFullHealth)
  })

  it('throws on a maximum that is not a positive finite number', () => {
    const run = runWonAt(firstOrdinaryIndex, 3, 1)
    expect(() => drinkFlask(run, 0)).toThrow(RangeError)
    expect(() => drinkFlask(run, Number.NaN)).toThrow(RangeError)
  })

  // AC4 — a between-fights action. Reaching it mid-hand is a driver bug, so it throws rather
  // than wording a third reason the screen would have to render.
  it('throws mid-hand, when the encounter has not resolved', () => {
    const run = startRun(MAX)
    expect(() => drinkFlask({ ...run, flaskCharges: 1 }, MAX)).toThrow(RangeError)
    expect(() => drinkFlask({ ...run, flaskCharges: 1 }, MAX)).toThrow(/not resolved|in progress/i)
  })

  it('carries the drunk charge count across the fight boundary', () => {
    const run = runWonAt(firstOrdinaryIndex, 3, 1)
    expect(advanceRun(drinkFlask(run, MAX)).flaskCharges).toBe(0)
  })
})

describe("recordEncounter's flask refill (AC5)", () => {
  it('refills to the configured charges on a stage-boss kill from empty', () => {
    const at = runWonAt(firstBossIndex, 3, 0)
    const recorded = recordEncounter(
      at,
      wonEncounter(at.encounter, 3),
      at.cheats,
      at.envenomCharges,
      at.poisonGuardHeld,
    )
    expect(recorded.flaskCharges).toBe(FLASK_STARTING_CHARGES)
  })

  it('refills on a stage-boss kill even when a charge was already held', () => {
    const at = runWonAt(firstBossIndex, 3, 1)
    const recorded = recordEncounter(
      at,
      wonEncounter(at.encounter, 3),
      at.cheats,
      at.envenomCharges,
      at.poisonGuardHeld,
    )
    expect(recorded.flaskCharges).toBe(FLASK_STARTING_CHARGES)
  })

  it('does NOT refill on an ordinary kill', () => {
    const at = runWonAt(firstOrdinaryIndex, 3, 0)
    const recorded = recordEncounter(
      at,
      wonEncounter(at.encounter, 3),
      at.cheats,
      at.envenomCharges,
      at.poisonGuardHeld,
    )
    expect(recorded.flaskCharges).toBe(0)
  })

  it('does NOT refill on a boss the player lost to', () => {
    // Built on `runUnresolvedAt`, not `runWonAt`: an already-won encounter's Quarry bar is
    // already <= 0, which would resolve every following `applyDamage` in the player's favour
    // regardless of the incoming damage below.
    const at = runUnresolvedAt(firstBossIndex, 0)
    let lost: EncounterState = {
      ...at.encounter,
      health: { ...at.encounter.health, [DuelSide.Player]: 1 },
    }
    while (lost.winner === null) {
      lost = applyDamage(lost, {
        [DuelSide.Player]: lost.health[DuelSide.Player],
        [DuelSide.Quarry]: 0,
      })
    }
    const recorded = recordEncounter(at, lost, at.cheats, at.envenomCharges, at.poisonGuardHeld)
    expect(recorded.flaskCharges).toBe(0)
  })
})
