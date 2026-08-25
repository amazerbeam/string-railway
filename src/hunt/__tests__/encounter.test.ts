import { describe, expect, it } from 'vitest'
import {
  activateShield,
  applyDamage,
  hasPendingApplyPayout,
  isEncounterResolved,
  queueApplyDamagePayout,
  startEncounter,
} from '../encounter'
import { BuffTier } from '../buffs'
import {
  APPLY_DAMAGE_HIT_RETENTION,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  QUARRY_ENCOUNTER_HEALTH,
} from '../config'
import { DuelSide, type IncomingDamage } from '../types'
import { queueApplyPayout } from '../applyDamagePayout'

/** Keyed by the side the damage is APPLIED TO, matching `IncomingDamage`. */
function damage(toPlayer: number, toQuarry: number): IncomingDamage {
  return { [DuelSide.Player]: toPlayer, [DuelSide.Quarry]: toQuarry }
}

describe('startEncounter — both bars come from the configured totals (AC1)', () => {
  it('reads PLAYER_START_HEALTH and the indexed Quarry total, and starts unresolved', () => {
    const encounter = startEncounter(0)
    expect(encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
    expect(encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
    expect(encounter.damageEventsApplied).toBe(0)
    expect(encounter.winner).toBeNull()
    expect(isEncounterResolved(encounter)).toBe(false)
    expect(encounter.pendingApplyPayout).toBeNull()
  })

  it('lets quarryHealthForEncounter’s RangeError surface on an out-of-range index', () => {
    expect(() => startEncounter(99)).toThrow(RangeError)
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses a starting player health of %p rather than seeding a broken bar',
    (health) => {
      expect(() => startEncounter(0, health)).toThrow(RangeError)
    },
  )
})

describe('applyDamage — each side loses the OTHER side’s damage, once (AC2)', () => {
  it('subtracts both bars exactly once and counts one damage event', () => {
    const toPlayer = Math.min(10, PLAYER_START_HEALTH - 1)
    const toQuarry = Math.min(50, quarryHealthForEncounter(0) - 1)
    const after = applyDamage(startEncounter(0), damage(toPlayer, toQuarry))
    expect(after.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - toPlayer)
    expect(after.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0) - toQuarry)
    expect(after.damageEventsApplied).toBe(1)
    expect(after.winner).toBeNull()
  })

  it('leaves the encounter it was given untouched', () => {
    const before = startEncounter(0)
    applyDamage(before, damage(10, 50))
    expect(before.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
    expect(before.damageEventsApplied).toBe(0)
  })
})

describe('applyDamage — the end conditions (AC4)', () => {
  it('the Quarry’s bar alone empties -> the Player wins', () => {
    const after = applyDamage(startEncounter(0), damage(1, quarryHealthForEncounter(0)))
    expect(after.winner).toBe(DuelSide.Player)
    expect(isEncounterResolved(after)).toBe(true)
  })

  it('the player’s bar alone empties -> the Quarry wins and the run ends', () => {
    const after = applyDamage(startEncounter(0), damage(PLAYER_START_HEALTH, 1))
    expect(after.winner).toBe(DuelSide.Quarry)
  })

  it('D7 — a Quarry killed by this event spares the player its damage entirely', () => {
    const encounter = startEncounter(0, 3)
    const quarryHealth = encounter.health[DuelSide.Quarry]
    const after = applyDamage(encounter, {
      [DuelSide.Player]: 99,
      [DuelSide.Quarry]: quarryHealth,
    })
    expect(after.health[DuelSide.Quarry]).toBe(0)
    expect(after.health[DuelSide.Player]).toBe(3)
    expect(after.winner).toBe(DuelSide.Player)
  })

  it('D7 — a Quarry that survives lets the player take the damage', () => {
    const encounter = startEncounter(0, 10)
    const after = applyDamage(encounter, { [DuelSide.Player]: 4, [DuelSide.Quarry]: 1 })
    expect(after.health[DuelSide.Player]).toBe(6)
    expect(after.winner).toBeNull()
  })

  it('D7 — the player still goes down when the Quarry survives the same event', () => {
    const encounter = startEncounter(0, 2)
    const after = applyDamage(encounter, { [DuelSide.Player]: 2, [DuelSide.Quarry]: 1 })
    expect(after.health[DuelSide.Player]).toBe(0)
    expect(after.winner).toBe(DuelSide.Quarry)
  })

  it('D7 — a non-finite figure aimed at the player is still refused on the Quarry-down path', () => {
    const encounter = startEncounter(0, 5)
    const quarryHealth = encounter.health[DuelSide.Quarry]
    expect(() =>
      applyDamage(encounter, { [DuelSide.Player]: Number.NaN, [DuelSide.Quarry]: quarryHealth }),
    ).toThrow(RangeError)
  })

  it('resolves the moment a bar empties, even on a single event', () => {
    const start = startEncounter(0)
    const end = applyDamage(start, {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: QUARRY_ENCOUNTER_HEALTH[0],
    })
    expect(isEncounterResolved(end)).toBe(true)
    expect(end.winner).toBe(DuelSide.Player)
    expect(end.damageEventsApplied).toBe(1)
  })
})

describe('applyDamage — surplus damage is discarded, and health never goes negative (AC5, AC6)', () => {
  it('overkill leaves no trace: massive damage into a bar is identical to exactly emptying it', () => {
    const start = startEncounter(0)
    const exact = applyDamage(start, damage(0, quarryHealthForEncounter(0)))
    const overkill = applyDamage(start, damage(0, quarryHealthForEncounter(0) * 5 + 1))
    // Deep equality is the assertion: if surplus were carried or converted ANYWHERE in the
    // state, these two would differ. Nothing to inspect means nothing was kept.
    expect(overkill).toEqual(exact)
    expect(overkill.health[DuelSide.Quarry]).toBe(0)
  })

  it('clamps at zero rather than reporting negative health, across a spread from zero to overkill', () => {
    const q = quarryHealthForEncounter(0)
    for (const dealt of [0, 1, q - 1, q, q + 1, q * 10]) {
      const after = applyDamage(startEncounter(0), damage(dealt, dealt))
      expect(after.health[DuelSide.Player]).toBeGreaterThanOrEqual(0)
      expect(after.health[DuelSide.Quarry]).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('applyDamage — refuses rather than corrupting a bar', () => {
  it('throws on an encounter that has already resolved', () => {
    const resolved = applyDamage(startEncounter(0), damage(0, quarryHealthForEncounter(0)))
    expect(() => applyDamage(resolved, damage(10, 10))).toThrow(RangeError)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'throws on damage of %p rather than letting it reach a bar',
    (bad) => {
      // NaN is the one that matters: NaN - x is NaN, Math.max(0, NaN) is NaN, and a NaN health
      // renders as an empty bar with nothing logged anywhere.
      expect(() => applyDamage(startEncounter(0), damage(bad, 0))).toThrow(RangeError)
      expect(() => applyDamage(startEncounter(0), damage(0, bad))).toThrow(RangeError)
    },
  )
})

/** Applies the same event until the encounter resolves. `maxEvents` is the SPEC's bound, not a
 *  game rule — AC7 states the game has no cap — so a resolution bug fails as an assertion
 *  rather than hanging the suite. */
function fight(incoming: IncomingDamage, maxEvents = 10000) {
  let current = startEncounter(0)
  while (!isEncounterResolved(current) && current.damageEventsApplied < maxEvents) {
    current = applyDamage(current, incoming)
  }
  return current
}

describe('applyDamage — resolves over repeated events, derived from the configured totals (AC7, AC8)', () => {
  const quarryHealth = QUARRY_ENCOUNTER_HEALTH[0]

  it('a Quarry-only line resolves the moment the Quarry bar empties, with the player untouched', () => {
    const perEvent = Math.ceil(quarryHealth / 3)
    const end = fight(damage(0, perEvent))
    expect(end.winner).toBe(DuelSide.Player)
    expect(end.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
    expect(end.health[DuelSide.Quarry]).toBe(0)
    expect(end.damageEventsApplied).toBe(Math.ceil(quarryHealth / perEvent))
  })

  it('a player-only line resolves the moment the player bar empties', () => {
    const perEvent = Math.ceil(PLAYER_START_HEALTH / 3)
    const end = fight(damage(perEvent, 0))
    expect(end.winner).toBe(DuelSide.Quarry)
    expect(end.health[DuelSide.Quarry]).toBe(quarryHealth)
    expect(end.health[DuelSide.Player]).toBe(0)
  })

  it('runs past any plausible small cap without refusing — there is deliberately none (AC7)', () => {
    // One point of Quarry damage per event forces a run of exactly `quarryHealth` events —
    // comfortably past a handful, which is the property AC7 states: no event count is rejected
    // while the encounter is live.
    const end = fight(damage(0, 1), quarryHealth + 10)
    expect(end.winner).toBe(DuelSide.Player)
    expect(end.damageEventsApplied).toBe(quarryHealth)
    expect(end.damageEventsApplied).toBeGreaterThan(5)
  })
})

describe('queueApplyDamagePayout — the one-at-a-time rule (DLR-109 AC2)', () => {
  it('holds a payout on a live encounter', () => {
    const encounter = startEncounter(0)
    const payout = queueApplyPayout(9, 4)
    const after = queueApplyDamagePayout(encounter, payout)
    expect(after.pendingApplyPayout).toBe(payout)
    expect(hasPendingApplyPayout(after)).toBe(true)
  })

  it('returns the encounter unchanged when one is already queued', () => {
    const queued = queueApplyDamagePayout(startEncounter(0), queueApplyPayout(9, 4))
    const after = queueApplyDamagePayout(queued, queueApplyPayout(2, 1))
    expect(after).toBe(queued)
  })

  it('returns the encounter unchanged when it is already resolved', () => {
    const resolved = applyDamage(startEncounter(0), damage(0, quarryHealthForEncounter(0)))
    const after = queueApplyDamagePayout(resolved, queueApplyPayout(9, 4))
    expect(after).toBe(resolved)
  })
})

describe('applyDamage — DLR-109 AC3 / DLR-141, the payout is reduced (not wiped) at the single clamp point', () => {
  it('a non-zero hit to the player reduces a queued payout to APPLY_DAMAGE_HIT_RETENTION, floored', () => {
    const queued = queueApplyDamagePayout(startEncounter(0, 10), queueApplyPayout(9, 4))
    const after = applyDamage(queued, damage(1, 0))
    expect(after.pendingApplyPayout).toMatchObject({
      cashOut: Math.floor(9 * APPLY_DAMAGE_HIT_RETENTION),
      resolutionsOwed: 2,
      unplayedAtPress: 4,
    })
  })

  it('a reduction that floors to zero evaporates the payout the same way a resolved encounter does', () => {
    const queued = queueApplyDamagePayout(startEncounter(0, 10), queueApplyPayout(1, 4))
    const after = applyDamage(queued, damage(1, 0))
    expect(after.pendingApplyPayout).toBeNull()
  })

  it('a hit FULLY ABSORBED by blue hearts leaves the queued payout untouched, at 100%', () => {
    const shielded = activateShield(
      queueApplyDamagePayout(startEncounter(0, 10), queueApplyPayout(9, 4)),
      BuffTier.Bronze,
    )
    const after = applyDamage(shielded, damage(1, 0))
    expect(after.pendingApplyPayout).toBe(shielded.pendingApplyPayout)
  })

  it('an all-zero incoming event preserves the queued payout', () => {
    const queued = queueApplyDamagePayout(startEncounter(0, 10), queueApplyPayout(9, 4))
    const after = applyDamage(queued, damage(0, 0))
    expect(after.pendingApplyPayout).toBe(queued.pendingApplyPayout)
  })

  it('damage to the Quarry only preserves the queued payout', () => {
    const queued = queueApplyDamagePayout(startEncounter(0, 10), queueApplyPayout(9, 4))
    const after = applyDamage(queued, damage(0, 1))
    expect(after.pendingApplyPayout).toBe(queued.pendingApplyPayout)
  })

  it('an encounter that resolves — either side — still evaporates the payout in full', () => {
    const queuedOnPlayerWin = queueApplyDamagePayout(startEncounter(0, 10), queueApplyPayout(9, 4))
    const playerWins = applyDamage(queuedOnPlayerWin, damage(0, quarryHealthForEncounter(0)))
    expect(playerWins.winner).toBe(DuelSide.Player)
    expect(playerWins.pendingApplyPayout).toBeNull()

    const queuedOnQuarryWin = queueApplyDamagePayout(startEncounter(0, 1), queueApplyPayout(9, 4))
    const quarryWins = applyDamage(queuedOnQuarryWin, damage(1, 0))
    expect(quarryWins.winner).toBe(DuelSide.Quarry)
    expect(quarryWins.pendingApplyPayout).toBeNull()
  })
})
