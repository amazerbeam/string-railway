import { describe, expect, it } from 'vitest'
import { recordEncounter, startRun } from '../run'
import { startEncounter } from '../encounter'
import { DuelSide } from '../types'
import { EMPTY_BUFF_CARRY } from '../buffAccrual'

describe('DLR-150 Phase 3 — RunState.lowCarry and the fight-boundary reset', () => {
  it('rides an unresolved encounter into the next hand, and resets on either resolution', () => {
    const run = startRun()

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

    // It rides an unresolved encounter into the next hand.
    const carried = recordEncounter(run, unresolved, 3, null, 0, undefined, {
      multiplierBonus: 2,
      flatDamageBonus: 1,
    })
    expect(carried.lowCarry).toEqual({ multiplierBonus: 2, flatDamageBonus: 1 })

    // AC4 — it is empty once the encounter resolves, with the Quarry down…
    expect(
      recordEncounter(carried, quarryDown, 3, 2, 0, undefined, {
        multiplierBonus: 9,
        flatDamageBonus: 9,
      }).lowCarry,
    ).toEqual(EMPTY_BUFF_CARRY)

    // …and with the player down.
    expect(
      recordEncounter(carried, playerDown, 3, null, 0, undefined, {
        multiplierBonus: 9,
        flatDamageBonus: 9,
      }).lowCarry,
    ).toEqual(EMPTY_BUFF_CARRY)

    // A caller that passes nothing keeps what the run held — the 48 existing call sites.
    expect(recordEncounter(carried, unresolved, 3, null).lowCarry).toEqual({
      multiplierBonus: 2,
      flatDamageBonus: 1,
    })

    // A fresh run carries nothing.
    expect(startRun().lowCarry).toEqual(EMPTY_BUFF_CARRY)
  })
})
