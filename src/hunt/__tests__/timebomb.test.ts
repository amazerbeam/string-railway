import { describe, expect, it } from 'vitest'
import {
  TIMEBOMB_PLAYER_DAMAGE,
  TIMEBOMB_PRICE,
  TIMEBOMB_QUARRY_DAMAGE,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  RUN_STARTING_CHEATS,
} from '../config'
import {
  applyDamage,
  hasPendingTimebomb,
  isEncounterResolved,
  NO_PENDING_TIMEBOMB,
  queueTimebomb,
  startEncounter,
} from '../encounter'
import { advanceRun, buyFromShop, recordEncounter, startRun } from '../run'
import { ShopItem } from '../shop'
import { DuelSide } from '../types'
import { BuffKind, BuffTier } from '../buffs'
import { TIMEBOMB_DAMAGE } from '../buffCatalog'

// DLR-132 — `queueTimebomb` now takes the damage pair; BRONZE reproduces exactly the flat
// `TIMEBOMB_QUARRY_DAMAGE` / `TIMEBOMB_PLAYER_DAMAGE` figures this whole file already asserts
// against, by construction (`timebombRow` multiplies the live constants by 1 at bronze).
const BRONZE_DAMAGE = TIMEBOMB_DAMAGE[BuffTier.Bronze]

describe('startEncounter — the queue opens empty (AC7)', () => {
  it('seeds pendingTimebomb to zeros on both sides', () => {
    expect(startEncounter(0).pendingTimebomb).toEqual(NO_PENDING_TIMEBOMB)
  })

  it('reports nothing pending', () => {
    expect(hasPendingTimebomb(startEncounter(0))).toBe(false)
  })
})

describe('queueTimebomb — booking the hit (AC3)', () => {
  it('D2 — books the Quarry’s figure against the Quarry and the player’s against the player', () => {
    const base = startEncounter(0, 10)
    expect(
      queueTimebomb(base, DuelSide.Quarry, BRONZE_DAMAGE).pendingTimebomb[DuelSide.Quarry],
    ).toBe(TIMEBOMB_QUARRY_DAMAGE)
    expect(
      queueTimebomb(base, DuelSide.Player, BRONZE_DAMAGE).pendingTimebomb[DuelSide.Player],
    ).toBe(TIMEBOMB_PLAYER_DAMAGE)
  })

  it('books nothing against the untargeted side', () => {
    const queued = queueTimebomb(startEncounter(0), DuelSide.Quarry, BRONZE_DAMAGE)
    expect(queued.pendingTimebomb[DuelSide.Player]).toBe(0)
    const queuedPlayer = queueTimebomb(startEncounter(0), DuelSide.Player, BRONZE_DAMAGE)
    expect(queuedPlayer.pendingTimebomb[DuelSide.Quarry]).toBe(0)
  })

  it('D4 — two bookings against one side sum rather than replacing', () => {
    const once = queueTimebomb(startEncounter(0), DuelSide.Player, BRONZE_DAMAGE)
    expect(
      queueTimebomb(once, DuelSide.Player, BRONZE_DAMAGE).pendingTimebomb[DuelSide.Player],
    ).toBe(TIMEBOMB_PLAYER_DAMAGE * 2)
  })

  it('accumulates, so two marked tricks in one hand both land', () => {
    const twice = queueTimebomb(
      queueTimebomb(startEncounter(0), DuelSide.Quarry, BRONZE_DAMAGE),
      DuelSide.Quarry,
      BRONZE_DAMAGE,
    )
    expect(twice.pendingTimebomb[DuelSide.Quarry]).toBe(TIMEBOMB_QUARRY_DAMAGE * 2)
  })

  it('books both sides independently', () => {
    const both = queueTimebomb(
      queueTimebomb(startEncounter(0), DuelSide.Quarry, BRONZE_DAMAGE),
      DuelSide.Player,
      BRONZE_DAMAGE,
    )
    expect(both.pendingTimebomb).toEqual({
      [DuelSide.Player]: TIMEBOMB_PLAYER_DAMAGE,
      [DuelSide.Quarry]: TIMEBOMB_QUARRY_DAMAGE,
    })
  })

  it('does not touch health, and does not count as a damage event', () => {
    const fresh = startEncounter(0)
    const queued = queueTimebomb(fresh, DuelSide.Quarry, BRONZE_DAMAGE)
    expect(queued.health).toEqual(fresh.health)
    expect(queued.damageEventsApplied).toBe(fresh.damageEventsApplied)
  })

  it('discards the booking on an already-resolved encounter (AC7)', () => {
    const dead = applyDamage(startEncounter(0), {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: quarryHealthForEncounter(0),
    })
    expect(isEncounterResolved(dead)).toBe(true)
    expect(queueTimebomb(dead, DuelSide.Quarry, BRONZE_DAMAGE)).toBe(dead)
  })

  it('never mutates its input', () => {
    const fresh = startEncounter(0)
    queueTimebomb(fresh, DuelSide.Quarry, BRONZE_DAMAGE)
    expect(fresh.pendingTimebomb).toEqual(NO_PENDING_TIMEBOMB)
  })
})

/** A run holding `coins`, at fight 0. */
const funded = (coins: number) => ({ ...startRun(), coins })

describe('buyFromShop — Timebomb (AC1, AC2)', () => {
  // DLR-145 — Timebomb is an ordinary weighted-pool member now (`SLOT_FAMILY_WEIGHTS`), exactly as
  // Cheat already was under DLR-132, so a fresh run's DRAWN opening pile (20 cards, up from 4) can
  // legitimately pick one before the shop is ever reached — "opens holding none" is no longer a
  // true invariant to assert. What must still hold is the purchase's OWN effect: it adds exactly
  // one Timebomb to whatever the pile already carried, mirroring the "does NOT add a Cheat" fix
  // below for the identical reason.
  it('mints a Timebomb buff into the pile and debits the price', () => {
    const before = funded(3)
    const beforeCount = before.buffs.filter((b) => b.kind === BuffKind.Timebomb).length
    const after = buyFromShop(before, ShopItem.Timebomb)
    expect(after.buffs.filter((b) => b.kind === BuffKind.Timebomb)).toHaveLength(beforeCount + 1)
    expect(after.coins).toBe(3 - TIMEBOMB_PRICE)
  })

  it('does NOT heal — the regression the third item exposed', () => {
    const hurt = { ...funded(3), encounter: startEncounter(0, PLAYER_START_HEALTH - 3) }
    const after = buyFromShop(hurt, ShopItem.Timebomb)
    expect(after.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - 3)
  })

  it('does NOT add a Cheat', () => {
    const before = funded(3)
    // Non-vacuity guard (DLR-127): the original assertion was `toEqual([])`, which silently
    // stopped testing anything the moment `RUN_STARTING_CHEATS` moved 0 -> 1 and the run began
    // opening with a Cheat in the pile — it then failed on the OPENING GRANT rather than on
    // anything the purchase did. Asserting the fixture actually holds Cheats keeps the check
    // below meaningful whatever that key is retuned to. DLR-145 — `>=` rather than `toHaveLength`
    // exactly: the pool prune raised the odds of the DRAWN opening pile also picking a `cheat`
    // template, on top of the `RUN_STARTING_CHEATS` guaranteed tail, so the fixture's true count
    // can be higher than the guarantee alone. Still non-vacuous, and still exercises what the
    // purchase itself must leave untouched.
    expect(before.buffs.filter((b) => b.kind === BuffKind.Cheat).length).toBeGreaterThanOrEqual(
      RUN_STARTING_CHEATS,
    )
    const after = buyFromShop(before, ShopItem.Timebomb)
    // Fails on a Cheat ADDED and on a Cheat REMOVED — the Timebomb branch mints only the one
    // Timebomb buff, so the pile's Cheat count must be exactly what it was before the purchase.
    expect(after.buffs.filter((b) => b.kind === BuffKind.Cheat)).toEqual(
      before.buffs.filter((b) => b.kind === BuffKind.Cheat),
    )
  })

  it('stacks, because there is no cap', () => {
    const before = funded(10)
    const beforeCount = before.buffs.filter((b) => b.kind === BuffKind.Timebomb).length
    const twice = buyFromShop(buyFromShop(before, ShopItem.Timebomb), ShopItem.Timebomb)
    expect(twice.buffs.filter((b) => b.kind === BuffKind.Timebomb)).toHaveLength(beforeCount + 2)
  })

  it('throws rather than taking payment it cannot honour', () => {
    expect(() => buyFromShop(funded(TIMEBOMB_PRICE - 1), ShopItem.Timebomb)).toThrow(RangeError)
  })
})

describe('recordEncounter and advanceRun — the pile is run state (AC2)', () => {
  it('adopts the pile the hand handed back', () => {
    const run = buyFromShop(funded(3), ShopItem.Timebomb)
    const withoutTimebomb = run.buffs.filter((b) => b.kind !== BuffKind.Timebomb)
    const after = recordEncounter(
      run,
      run.encounter,
      false,
      run.discardsRemaining,
      null,
      0,
      withoutTimebomb,
    )
    expect(after.buffs.filter((b) => b.kind === BuffKind.Timebomb)).toHaveLength(0)
  })

  it('carries an unspent Timebomb buff across a fight boundary', () => {
    const before = funded(3)
    const beforeCount = before.buffs.filter((b) => b.kind === BuffKind.Timebomb).length
    const run = buyFromShop(before, ShopItem.Timebomb)
    const won = recordEncounter(
      run,
      {
        ...run.encounter,
        health: { ...run.encounter.health, [DuelSide.Quarry]: 0 },
        winner: DuelSide.Player,
      },
      false,
      run.discardsRemaining,
      null,
    )
    expect(advanceRun(won).buffs.filter((b) => b.kind === BuffKind.Timebomb)).toHaveLength(
      beforeCount + 1,
    )
  })
})

describe('the queue never crosses a boundary (AC7)', () => {
  it('is discarded by advanceRun, because startEncounter re-seeds it', () => {
    const run = startRun()
    const won = recordEncounter(
      run,
      queueTimebomb(
        {
          ...run.encounter,
          health: { ...run.encounter.health, [DuelSide.Quarry]: 0 },
          winner: DuelSide.Player,
        },
        DuelSide.Quarry,
        BRONZE_DAMAGE,
      ),
      false,
      run.discardsRemaining,
      null,
    )
    // The booking survives onto the recorded run — and dies the moment the next fight opens.
    expect(advanceRun(won).encounter.pendingTimebomb).toEqual(NO_PENDING_TIMEBOMB)
  })

  it('is discarded by startRun, so nothing crosses a run boundary', () => {
    expect(startRun().encounter.pendingTimebomb).toEqual(NO_PENDING_TIMEBOMB)
  })

  it('D5 — a queued hit does not survive the fight it was booked in', () => {
    const owed = queueTimebomb(startEncounter(0, 10), DuelSide.Player, BRONZE_DAMAGE)
    expect(hasPendingTimebomb(owed)).toBe(true)
    // A fresh encounter re-seeds the queue to zeros, which is the discard with no explicit step.
    expect(hasPendingTimebomb(startEncounter(1, owed.health[DuelSide.Player]))).toBe(false)
  })
})
