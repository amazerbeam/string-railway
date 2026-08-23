import { describe, expect, it } from 'vitest'
import {
  activateShield,
  applyDamage,
  hasShieldHearts,
  queueApplyDamagePayout,
  startEncounter,
} from '../encounter'
import { queueApplyPayout } from '../applyDamagePayout'
import { advanceRun, buyFromShop, drinkFlask, startRun } from '../run'
import { HEAL_HEALTH_RESTORED, OpponentKind, RUN_ENCOUNTERS } from '../config'
import { ShopItem } from '../shop'
import { BuffTier } from '../buffs'
import { NO_SHIELD_HEARTS } from '../shield'
import { DuelSide, type EncounterState, type IncomingDamage } from '../types'

const MAX = 10

/** Keyed by the side the damage is APPLIED TO, matching `IncomingDamage`. */
function damage(toPlayer: number, toQuarry: number): IncomingDamage {
  return { [DuelSide.Player]: toPlayer, [DuelSide.Quarry]: toQuarry }
}

/** An unresolved encounter on `playerHealth`, shielded at `tier` through the real transition. */
function shielded(tier: BuffTier, playerHealth = MAX): EncounterState {
  return activateShield(startEncounter(0, playerHealth), tier)
}

/** Drains the Quarry through `applyDamage` until it goes down, so `winner` is set by the
 *  engine's own rules rather than by hand. */
function winIt(encounter: EncounterState): EncounterState {
  let next = encounter
  while (next.winner === null) {
    next = applyDamage(next, damage(0, next.health[DuelSide.Quarry]))
  }
  return next
}

const firstOrdinaryIndex = RUN_ENCOUNTERS.findIndex((e) => e.kind === OpponentKind.Ordinary)

describe('startEncounter — blue hearts are seeded empty and cleared at the boundary', () => {
  it('seeds shieldHearts to NO_SHIELD_HEARTS', () => {
    const encounter = startEncounter(0)
    expect(encounter.shieldHearts).toBe(NO_SHIELD_HEARTS)
    expect(hasShieldHearts(encounter)).toBe(false)
  })

  it('a fresh encounter after a shielded one carries no blue hearts across the boundary', () => {
    let run = startRun(MAX)
    while (run.encounterIndex < firstOrdinaryIndex) {
      run = advanceRun({ ...run, encounter: winIt(run.encounter) })
    }
    const shieldedRun = { ...run, encounter: activateShield(run.encounter, BuffTier.Gold) }
    expect(shieldedRun.encounter.shieldHearts).toBe(3)
    const next = advanceRun({ ...shieldedRun, encounter: winIt(shieldedRun.encounter) })
    expect(next.encounter.shieldHearts).toBe(NO_SHIELD_HEARTS)
  })
})

describe('activateShield — AC2, it SETS the count and never adds', () => {
  it('sets each tier’s count on a bare encounter', () => {
    expect(shielded(BuffTier.Bronze).shieldHearts).toBe(1)
    expect(shielded(BuffTier.Silver).shieldHearts).toBe(2)
    expect(shielded(BuffTier.Gold).shieldHearts).toBe(3)
  })

  it('AC2 — a bronze Shield after a gold one leaves 1, not 4 and not 3', () => {
    const gold = shielded(BuffTier.Gold)
    expect(activateShield(gold, BuffTier.Bronze).shieldHearts).toBe(1)
  })

  it('AC2 — silver after silver leaves 2, not 4', () => {
    const silver = shielded(BuffTier.Silver)
    expect(activateShield(silver, BuffTier.Silver).shieldHearts).toBe(2)
  })

  it('returns a resolved encounter unchanged — protection is never granted in a finished fight', () => {
    const resolved = winIt(startEncounter(0))
    expect(activateShield(resolved, BuffTier.Gold)).toBe(resolved)
  })

  it('leaves the encounter it was given untouched', () => {
    const before = startEncounter(0)
    activateShield(before, BuffTier.Gold)
    expect(before.shieldHearts).toBe(NO_SHIELD_HEARTS)
  })
})

describe('applyDamage — AC4, blue hearts absorb before red health', () => {
  it('a fully absorbed hit spends a blue heart and leaves red health untouched', () => {
    const after = applyDamage(shielded(BuffTier.Silver), damage(1, 0))
    expect(after.shieldHearts).toBe(1)
    expect(after.health[DuelSide.Player]).toBe(MAX)
  })

  it('a partially absorbed hit spends every blue heart and lets the remainder through', () => {
    const after = applyDamage(shielded(BuffTier.Silver), damage(3, 0))
    expect(after.shieldHearts).toBe(0)
    expect(after.health[DuelSide.Player]).toBe(MAX - 1)
  })

  it('an unshielded player takes the whole hit, exactly as before this ticket', () => {
    const after = applyDamage(startEncounter(0, MAX), damage(3, 0))
    expect(after.shieldHearts).toBe(NO_SHIELD_HEARTS)
    expect(after.health[DuelSide.Player]).toBe(MAX - 3)
  })

  it('overkill floors both pools at zero and resolves to the Quarry — the single clamp holds', () => {
    const after = applyDamage(shielded(BuffTier.Gold), damage(MAX + 99, 0))
    expect(after.health[DuelSide.Player]).toBe(0)
    expect(after.shieldHearts).toBe(0)
    expect(after.winner).toBe(DuelSide.Quarry)
  })

  it('a player cannot be killed while a blue heart still stands', () => {
    const after = applyDamage(shielded(BuffTier.Silver, 1), damage(2, 0))
    expect(after.health[DuelSide.Player]).toBe(1)
    expect(after.winner).toBeNull()
  })

  it('D7 — a Quarry that goes down spends NO blue heart', () => {
    const encounter = shielded(BuffTier.Gold)
    const after = applyDamage(encounter, damage(5, encounter.health[DuelSide.Quarry]))
    expect(after.shieldHearts).toBe(3)
    expect(after.winner).toBe(DuelSide.Player)
  })
})

describe('applyDamage — the DLR-109 queued payout, both directions', () => {
  it('a FULLY absorbed hit leaves the queued payout intact', () => {
    const queued = queueApplyDamagePayout(shielded(BuffTier.Silver), queueApplyPayout(9, 4))
    const after = applyDamage(queued, damage(1, 0))
    expect(after.pendingApplyPayout).toEqual(queued.pendingApplyPayout)
  })

  it('a partially absorbed hit that drops red health destroys it exactly as before', () => {
    const queued = queueApplyDamagePayout(shielded(BuffTier.Silver), queueApplyPayout(9, 4))
    const after = applyDamage(queued, damage(3, 0))
    expect(after.pendingApplyPayout).toBeNull()
  })
})

describe('AC3 — no heal path restores a spent blue heart', () => {
  it('the shop’s Heal raises red health and leaves blue hearts spent', () => {
    // A gold shield taking 8: 3 absorbed, 5 through — so the heal lands clear of the cap and
    // its full effect on RED health is visible beside the blue hearts that stay spent.
    const run = { ...startRun(MAX), coins: 5 }
    const spent = applyDamage(activateShield(run.encounter, BuffTier.Gold), damage(8, 0))
    expect(spent.shieldHearts).toBe(0)
    expect(spent.health[DuelSide.Player]).toBe(MAX - 5)
    const healed = buyFromShop({ ...run, encounter: spent }, ShopItem.Heal, MAX)
    expect(healed.encounter.health[DuelSide.Player]).toBe(MAX - 5 + HEAL_HEALTH_RESTORED)
    expect(healed.encounter.shieldHearts).toBe(0)
  })

  it('the flask restores red health and leaves blue hearts spent', () => {
    const run = { ...startRun(MAX), flaskCharges: 1 }
    const spent = applyDamage(activateShield(run.encounter, BuffTier.Silver), damage(3, 0))
    const resolved = winIt(spent)
    expect(resolved.shieldHearts).toBe(0)
    const drunk = drinkFlask({ ...run, encounter: resolved }, MAX)
    expect(drunk.encounter.health[DuelSide.Player]).toBeGreaterThan(MAX - 1)
    expect(drunk.encounter.shieldHearts).toBe(0)
  })
})
