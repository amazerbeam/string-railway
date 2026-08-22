import { describe, expect, it } from 'vitest'
import {
  ENVENOM_PLAYER_DAMAGE,
  ENVENOM_PRICE,
  ENVENOM_QUARRY_DAMAGE,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
} from '../config'
import {
  applyDamage,
  hasPendingEnvenom,
  isEncounterResolved,
  NO_PENDING_ENVENOM,
  queueEnvenom,
  startEncounter,
} from '../encounter'
import { advanceRun, buyFromShop, recordEncounter, startRun } from '../run'
import { ShopItem } from '../shop'
import { DuelSide } from '../types'

describe('startEncounter — the queue opens empty (AC7)', () => {
  it('seeds pendingEnvenom to zeros on both sides', () => {
    expect(startEncounter(0).pendingEnvenom).toEqual(NO_PENDING_ENVENOM)
  })

  it('reports nothing pending', () => {
    expect(hasPendingEnvenom(startEncounter(0))).toBe(false)
  })
})

describe('queueEnvenom — booking the hit (AC3)', () => {
  it('D2 — books the Quarry’s figure against the Quarry and the player’s against the player', () => {
    const base = startEncounter(0, 10)
    expect(queueEnvenom(base, DuelSide.Quarry).pendingEnvenom[DuelSide.Quarry]).toBe(
      ENVENOM_QUARRY_DAMAGE,
    )
    expect(queueEnvenom(base, DuelSide.Player).pendingEnvenom[DuelSide.Player]).toBe(
      ENVENOM_PLAYER_DAMAGE,
    )
  })

  it('books nothing against the untargeted side', () => {
    const queued = queueEnvenom(startEncounter(0), DuelSide.Quarry)
    expect(queued.pendingEnvenom[DuelSide.Player]).toBe(0)
    const queuedPlayer = queueEnvenom(startEncounter(0), DuelSide.Player)
    expect(queuedPlayer.pendingEnvenom[DuelSide.Quarry]).toBe(0)
  })

  it('D4 — two bookings against one side sum rather than replacing', () => {
    const once = queueEnvenom(startEncounter(0), DuelSide.Player)
    expect(queueEnvenom(once, DuelSide.Player).pendingEnvenom[DuelSide.Player]).toBe(
      ENVENOM_PLAYER_DAMAGE * 2,
    )
  })

  it('accumulates, so two marked tricks in one hand both land', () => {
    const twice = queueEnvenom(queueEnvenom(startEncounter(0), DuelSide.Quarry), DuelSide.Quarry)
    expect(twice.pendingEnvenom[DuelSide.Quarry]).toBe(ENVENOM_QUARRY_DAMAGE * 2)
  })

  it('books both sides independently', () => {
    const both = queueEnvenom(queueEnvenom(startEncounter(0), DuelSide.Quarry), DuelSide.Player)
    expect(both.pendingEnvenom).toEqual({
      [DuelSide.Player]: ENVENOM_PLAYER_DAMAGE,
      [DuelSide.Quarry]: ENVENOM_QUARRY_DAMAGE,
    })
  })

  it('does not touch health, and does not count as a damage event', () => {
    const fresh = startEncounter(0)
    const queued = queueEnvenom(fresh, DuelSide.Quarry)
    expect(queued.health).toEqual(fresh.health)
    expect(queued.damageEventsApplied).toBe(fresh.damageEventsApplied)
  })

  it('discards the booking on an already-resolved encounter (AC7)', () => {
    const dead = applyDamage(startEncounter(0), {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: quarryHealthForEncounter(0),
    })
    expect(isEncounterResolved(dead)).toBe(true)
    expect(queueEnvenom(dead, DuelSide.Quarry)).toBe(dead)
  })

  it('never mutates its input', () => {
    const fresh = startEncounter(0)
    queueEnvenom(fresh, DuelSide.Quarry)
    expect(fresh.pendingEnvenom).toEqual(NO_PENDING_ENVENOM)
  })
})

/** A run holding `coins`, at fight 0. */
const funded = (coins: number) => ({ ...startRun(), coins })

describe('buyFromShop — Envenom (AC1, AC2)', () => {
  it('opens a run with no charges held', () => {
    expect(startRun().envenomCharges).toBe(0)
  })

  it('credits a charge and debits the price', () => {
    const after = buyFromShop(funded(3), ShopItem.Envenom)
    expect(after.envenomCharges).toBe(1)
    expect(after.coins).toBe(3 - ENVENOM_PRICE)
  })

  it('does NOT heal — the regression the third item exposed', () => {
    const hurt = { ...funded(3), encounter: startEncounter(0, PLAYER_START_HEALTH - 3) }
    const after = buyFromShop(hurt, ShopItem.Envenom)
    expect(after.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - 3)
  })

  it('does NOT add a Cheat', () => {
    expect(buyFromShop(funded(3), ShopItem.Envenom).cheats).toEqual([])
  })

  it('stacks, because there is no cap', () => {
    const twice = buyFromShop(buyFromShop(funded(10), ShopItem.Envenom), ShopItem.Envenom)
    expect(twice.envenomCharges).toBe(2)
  })

  it('throws rather than taking payment it cannot honour', () => {
    expect(() => buyFromShop(funded(ENVENOM_PRICE - 1), ShopItem.Envenom)).toThrow(RangeError)
  })
})

describe('recordEncounter and advanceRun — the charge is run state (AC2)', () => {
  it('adopts the charge count the hand handed back', () => {
    const run = buyFromShop(funded(3), ShopItem.Envenom)
    const after = recordEncounter(
      run,
      run.encounter,
      run.cheats,
      0,
      false,
      run.discardsRemaining,
      null,
    )
    expect(after.envenomCharges).toBe(0)
  })

  it('carries an unspent charge across a fight boundary', () => {
    const run = buyFromShop(funded(3), ShopItem.Envenom)
    const won = recordEncounter(
      run,
      {
        ...run.encounter,
        health: { ...run.encounter.health, [DuelSide.Quarry]: 0 },
        winner: DuelSide.Player,
      },
      run.cheats,
      run.envenomCharges,
      false,
      run.discardsRemaining,
      null,
    )
    expect(advanceRun(won).envenomCharges).toBe(1)
  })
})

describe('the queue never crosses a boundary (AC7)', () => {
  it('is discarded by advanceRun, because startEncounter re-seeds it', () => {
    const run = startRun()
    const won = recordEncounter(
      run,
      queueEnvenom(
        {
          ...run.encounter,
          health: { ...run.encounter.health, [DuelSide.Quarry]: 0 },
          winner: DuelSide.Player,
        },
        DuelSide.Quarry,
      ),
      run.cheats,
      run.envenomCharges,
      false,
      run.discardsRemaining,
      null,
    )
    // The booking survives onto the recorded run — and dies the moment the next fight opens.
    expect(advanceRun(won).encounter.pendingEnvenom).toEqual(NO_PENDING_ENVENOM)
  })

  it('is discarded by startRun, so nothing crosses a run boundary', () => {
    expect(startRun().encounter.pendingEnvenom).toEqual(NO_PENDING_ENVENOM)
  })

  it('D5 — a queued hit does not survive the fight it was booked in', () => {
    const owed = queueEnvenom(startEncounter(0, 10), DuelSide.Player)
    expect(hasPendingEnvenom(owed)).toBe(true)
    // A fresh encounter re-seeds the queue to zeros, which is the discard with no explicit step.
    expect(hasPendingEnvenom(startEncounter(1, owed.health[DuelSide.Player]))).toBe(false)
  })
})
