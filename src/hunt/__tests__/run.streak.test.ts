import { describe, expect, it } from 'vitest'
import { recordEncounter, startRun } from '../run'
import { startEncounter } from '../encounter'
import { DuelSide } from '../types'
import { EMPTY_STREAK } from '../../warCouncil'

describe('DLR-156 Phase 3 — RunState.streak and the fight-boundary reset', () => {
  it('rides an unresolved encounter into the next hand, and resets on either resolution', () => {
    const run = startRun()

    // A fresh run carries nothing.
    expect(run.streak).toEqual(EMPTY_STREAK)

    // An unresolved encounter — neither bar emptied.
    const unresolved = {
      ...startEncounter(run.encounterIndex, run.encounter.health[DuelSide.Player]),
      health: { [DuelSide.Player]: 6, [DuelSide.Quarry]: 4 },
      winner: null,
    }

    // A resolved encounter, the Quarry down.
    const quarryDown = {
      ...startEncounter(run.encounterIndex, run.encounter.health[DuelSide.Player]),
      health: { [DuelSide.Player]: 6, [DuelSide.Quarry]: 0 },
      winner: DuelSide.Player,
    }

    // A resolved encounter, the player down.
    const playerDown = {
      ...startEncounter(run.encounterIndex, run.encounter.health[DuelSide.Player]),
      health: { [DuelSide.Player]: 0, [DuelSide.Quarry]: 4 },
      winner: DuelSide.Quarry,
    }

    // It rides an unresolved encounter into the next hand — carries the streak HANDED to it.
    const carried = recordEncounter(run, unresolved, 3, null, 0, undefined, undefined, {
      total: 12,
      roll: 2,
    })
    expect(carried.streak).toEqual({ total: 12, roll: 2 })

    // AC9 — it is EMPTY_STREAK once the encounter resolves, on a WIN…
    expect(
      recordEncounter(carried, quarryDown, 3, 2, 0, undefined, undefined, {
        total: 99,
        roll: 9,
      }).streak,
    ).toEqual(EMPTY_STREAK)

    // …and on a LOSS.
    expect(
      recordEncounter(carried, playerDown, 3, null, 0, undefined, undefined, {
        total: 99,
        roll: 9,
      }).streak,
    ).toEqual(EMPTY_STREAK)

    // A caller that passes nothing keeps what the run held.
    expect(recordEncounter(carried, unresolved, 3, null).streak).toEqual({
      total: 12,
      roll: 2,
    })
  })
})
