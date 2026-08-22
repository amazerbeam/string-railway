// DLR-100 Phase 2 — the discard's per-fight budget on `RunState`, seeded by `startRun`, reset by
// `advanceRun`, and carried through `recordEncounter` exactly as `cheats`/`envenomCharges`/
// `poisonGuardHeld` already are. Follows `run.flask.test.ts`/`run.whetstone.test.ts`'s own shape:
// a local, minimal duplicate of `run.test.ts`'s helpers rather than an import, because importing
// one `.test.ts` module from another re-executes its top-level `describe` calls and silently
// duplicates every test in that file.
import { describe, expect, it } from 'vitest'
import { DISCARDS_PER_FIGHT } from '../config'
import { applyDamage } from '../encounter'
import { advanceRun, recordEncounter, startRun } from '../run'
import { DuelSide, type EncounterState } from '../types'

const MAX = 10

/** A resolved encounter the player won, on the given carried health. Built by draining the
 *  Quarry through `applyDamage` rather than by hand, so `winner` and `isEncounterResolved` are
 *  set by the engine's own rules — the same fixture `run.flask.test.ts` builds. */
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

describe('startRun (DLR-100 AC5)', () => {
  it('seeds discardsRemaining at the configured per-fight budget, not a literal', () => {
    expect(startRun(MAX).discardsRemaining).toBe(DISCARDS_PER_FIGHT)
  })
})

describe("recordEncounter's discardsRemaining parameter (DLR-100 AC5)", () => {
  it('carries a lower figure through onto the returned RunState', () => {
    const run = startRun(MAX)
    const spent = DISCARDS_PER_FIGHT - 1
    const recorded = recordEncounter(
      run,
      wonEncounter(run.encounter, MAX),
      run.cheats,
      run.envenomCharges,
      run.poisonGuardHeld,
      spent,
      null,
    )
    expect(recorded.discardsRemaining).toBe(spent)
  })

  it("does NOT reset the figure when the encounter it records is unresolved — the reset is advanceRun's alone", () => {
    const run = startRun(MAX)
    const spent = DISCARDS_PER_FIGHT - 2
    const recorded = recordEncounter(
      run,
      run.encounter, // still unresolved — no card play modelled here, matching handOfFight's own precedent
      run.cheats,
      run.envenomCharges,
      run.poisonGuardHeld,
      spent,
      null,
    )
    expect(recorded.discardsRemaining).toBe(spent)
  })
})

describe('advanceRun (DLR-100 AC5)', () => {
  it('resets a spent-down budget to the configured per-fight figure on the new fight', () => {
    const run = startRun(MAX)
    const spent = DISCARDS_PER_FIGHT - 1
    const recorded = recordEncounter(
      run,
      wonEncounter(run.encounter, MAX),
      run.cheats,
      run.envenomCharges,
      run.poisonGuardHeld,
      spent,
      null,
    )
    expect(recorded.discardsRemaining).toBe(spent)
    expect(advanceRun(recorded).discardsRemaining).toBe(DISCARDS_PER_FIGHT)
  })
})
