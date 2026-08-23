import { describe, expect, it } from 'vitest'
import { advanceRun, beatenCount, recordEncounter, RunOutcome, startRun } from '../run'
import { NO_PENDING_TIMEBOMB } from '../encounter'
import { DuelSide } from '../types'

// Split out of `run.test.ts` on DLR-129, which pushed that file to 401 lines — one over the
// project's 400-line budget. `beatenCount` is DLR-85's own question ("how many Quarries has this
// run put down"), self-contained and answerable without any of `run.test.ts`'s damage helpers,
// so it is the cohesive block to lift rather than an arbitrary cut.

describe('beatenCount (DLR-85)', () => {
  it('counts nothing beaten on a fresh run', () => {
    expect(beatenCount(startRun())).toBe(0)
  })

  it('counts the current encounter as beaten once the player has won it', () => {
    const run = startRun()
    const won = recordEncounter(
      run,
      {
        ...run.encounter,
        health: { ...run.encounter.health, [DuelSide.Quarry]: 0 },
        winner: DuelSide.Player,
        pendingTimebomb: NO_PENDING_TIMEBOMB,
      },
      run.cheats,
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
    )
    expect(won.encounterIndex).toBe(0)
    expect(beatenCount(won)).toBe(1)
  })

  it('does not count a live encounter as beaten after advancing', () => {
    const run = startRun()
    const won = recordEncounter(
      run,
      {
        ...run.encounter,
        health: { ...run.encounter.health, [DuelSide.Quarry]: 0 },
        winner: DuelSide.Player,
        pendingTimebomb: NO_PENDING_TIMEBOMB,
      },
      run.cheats,
      run.timebombCharges,
      false,
      run.discardsRemaining,
      null,
    )
    expect(beatenCount(advanceRun(won))).toBe(1)
  })

  it('counts every encounter on a won run', () => {
    let run = startRun()
    for (let i = 0; i < run.encounterCount; i += 1) {
      run = recordEncounter(
        run,
        {
          ...run.encounter,
          health: { ...run.encounter.health, [DuelSide.Quarry]: 0 },
          winner: DuelSide.Player,
          pendingTimebomb: NO_PENDING_TIMEBOMB,
        },
        run.cheats,
        run.timebombCharges,
        false,
        run.discardsRemaining,
        null,
      )
      if (run.outcome === RunOutcome.InProgress) run = advanceRun(run)
    }
    expect(run.outcome).toBe(RunOutcome.Won)
    expect(beatenCount(run)).toBe(run.encounterCount)
  })
})
