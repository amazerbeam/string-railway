import { describe, expect, it } from 'vitest'
import {
  activateShield,
  activateWard,
  applyDamage,
  hasWard,
  NO_WARD,
  queueApplyDamagePayout,
  startEncounter,
} from '../encounter'
import { queueApplyPayout } from '../applyDamagePayout'
import { advanceRun, startRun } from '../run'
import { OpponentKind, RUN_ENCOUNTERS } from '../config'
import { BuffTier } from '../buffs'
import { WARD_ABSORPTION } from '../consumables'
import { NO_SHIELD_HEARTS } from '../shield'
import { DuelSide, type EncounterState, type IncomingDamage } from '../types'

const MAX = 10

/** Keyed by the side the damage is APPLIED TO, matching `IncomingDamage`. */
function damage(toPlayer: number, toQuarry: number): IncomingDamage {
  return { [DuelSide.Player]: toPlayer, [DuelSide.Quarry]: toQuarry }
}

/** An unresolved encounter on `playerHealth`, warded at `tier` through the real transition. */
function warded(tier: BuffTier, playerHealth = MAX): EncounterState {
  return activateWard(startEncounter(0, playerHealth), tier)
}

/** Drains the Quarry through `applyDamage` until it goes down, so `winner` is set by the engine's
 *  own rules rather than by hand. */
function winIt(encounter: EncounterState): EncounterState {
  let next = encounter
  while (next.winner === null) {
    next = applyDamage(next, damage(0, next.health[DuelSide.Quarry]))
  }
  return next
}

const firstOrdinaryIndex = RUN_ENCOUNTERS.findIndex((e) => e.kind === OpponentKind.Ordinary)

describe('startEncounter — a Ward is seeded empty and cleared at the boundary', () => {
  it('seeds wardAbsorbs to NO_WARD', () => {
    const encounter = startEncounter(0)
    expect(encounter.wardAbsorbs).toBe(NO_WARD)
    expect(hasWard(encounter)).toBe(false)
  })

  it('a fresh encounter after a warded one carries no Ward across the boundary', () => {
    let run = startRun(MAX)
    while (run.encounterIndex < firstOrdinaryIndex) {
      run = advanceRun({ ...run, encounter: winIt(run.encounter) })
    }
    const wardedRun = { ...run, encounter: activateWard(run.encounter, BuffTier.Gold) }
    expect(wardedRun.encounter.wardAbsorbs).toBe(5)
    const next = advanceRun({ ...wardedRun, encounter: winIt(wardedRun.encounter) })
    expect(next.encounter.wardAbsorbs).toBe(NO_WARD)
  })
})

describe('activateWard — it SETS the absorption and never adds', () => {
  it('sets each tier to its transcribed figure', () => {
    expect(warded(BuffTier.Bronze).wardAbsorbs).toBe(WARD_ABSORPTION[BuffTier.Bronze])
    expect(warded(BuffTier.Silver).wardAbsorbs).toBe(WARD_ABSORPTION[BuffTier.Silver])
    expect(warded(BuffTier.Gold).wardAbsorbs).toBe(WARD_ABSORPTION[BuffTier.Gold])
  })

  it('sets DOWNWARD — a bronze Ward after a gold one leaves 1, not 5, and never 6', () => {
    const gold = warded(BuffTier.Gold)
    expect(activateWard(gold, BuffTier.Bronze).wardAbsorbs).toBe(1)
  })

  it('refuses to grant protection in a fight that is already over', () => {
    const over = winIt(startEncounter(0, MAX))
    expect(activateWard(over, BuffTier.Gold)).toBe(over)
  })
})

describe('applyDamage — a Ward absorbs up to N, then breaks regardless', () => {
  it('eats a hit at or below N whole, and STILL breaks', () => {
    const after = applyDamage(warded(BuffTier.Silver), damage(1, 0))
    expect(after.health[DuelSide.Player]).toBe(MAX)
    // The assertion that separates a Ward from a blue heart: 3 absorption took a 1 hit and is gone.
    expect(after.wardAbsorbs).toBe(NO_WARD)
    expect(hasWard(after)).toBe(false)
  })

  it('lets the remainder through on a hit above N, and breaks', () => {
    const after = applyDamage(warded(BuffTier.Bronze), damage(5, 0))
    expect(after.health[DuelSide.Player]).toBe(MAX - 4)
    expect(after.wardAbsorbs).toBe(NO_WARD)
  })

  it('survives a damage event that is not a hit on the player', () => {
    const after = applyDamage(warded(BuffTier.Gold), damage(0, 1))
    expect(after.wardAbsorbs).toBe(5)
  })

  it('spends nothing when the Quarry goes down on the same event', () => {
    const start = warded(BuffTier.Bronze)
    const after = applyDamage(start, damage(4, start.health[DuelSide.Quarry]))
    expect(after.winner).toBe(DuelSide.Player)
    expect(after.wardAbsorbs).toBe(1)
    expect(after.health[DuelSide.Player]).toBe(MAX)
  })
})

describe('applyDamage — a Ward absorbs BEFORE blue hearts', () => {
  it('splits one hit Ward-first, then blue hearts, then red health', () => {
    const both = activateShield(warded(BuffTier.Bronze), BuffTier.Silver)
    expect(both.wardAbsorbs).toBe(1)
    expect(both.shieldHearts).toBe(2)

    const after = applyDamage(both, damage(4, 0))

    expect(after.wardAbsorbs).toBe(NO_WARD)
    expect(after.shieldHearts).toBe(NO_SHIELD_HEARTS)
    // 4 damage: 1 to the Ward, 2 to the blue hearts, 1 to red health.
    expect(after.health[DuelSide.Player]).toBe(MAX - 1)
  })

  it('leaves blue hearts untouched when the Ward covered the whole hit', () => {
    const both = activateShield(warded(BuffTier.Gold), BuffTier.Silver)
    const after = applyDamage(both, damage(3, 0))

    expect(after.wardAbsorbs).toBe(NO_WARD)
    expect(after.shieldHearts).toBe(2)
    expect(after.health[DuelSide.Player]).toBe(MAX)
  })
})

describe('applyDamage — a hit a Ward fully absorbed leaves a queued payout standing', () => {
  it('keeps pendingApplyPayout when red health never moved', () => {
    const queued = queueApplyDamagePayout(warded(BuffTier.Silver), queueApplyPayout(4, 1))
    expect(queued.pendingApplyPayout).not.toBeNull()

    const after = applyDamage(queued, damage(2, 0))

    expect(after.health[DuelSide.Player]).toBe(MAX)
    expect(after.wardAbsorbs).toBe(NO_WARD)
    // DLR-110's reading, unchanged by DLR-126: the payout is lost by LOSING HEALTH, and a guard
    // that ate the hit did its job.
    expect(after.pendingApplyPayout).not.toBeNull()
  })

  it('destroys pendingApplyPayout when the Ward only partly covered the hit', () => {
    const queued = queueApplyDamagePayout(warded(BuffTier.Bronze), queueApplyPayout(4, 1))
    const after = applyDamage(queued, damage(3, 0))

    expect(after.health[DuelSide.Player]).toBe(MAX - 2)
    expect(after.pendingApplyPayout).toBeNull()
  })
})
