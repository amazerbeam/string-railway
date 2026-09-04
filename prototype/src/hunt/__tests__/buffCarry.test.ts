import { describe, expect, it } from 'vitest'
import { MAX_FLAT_DAMAGE_BONUS_PER_HAND, MAX_MULTIPLIER_BONUS_PER_HAND } from '../apConfig'
import {
  accrueAxisBonus,
  accrueCarry,
  EMPTY_BUFF_CARRY,
  resolveFiredBuffs,
  startHandAccrual,
} from '../buffAccrual'
import { BuffKind, BuffRewardAxis, BuffTargetSuit, BuffTier, type Buff } from '../buffs'

/**
 * DLR-150 AC1/AC2/AC3/AC7 — the four named cases on the pure accrual: a Defeat-firing Suit Low card
 * carries and pays nothing this hand, the same card firing on a Low Victory pays this hand as
 * today, the carry seeds the next hand and survives a later same-axis accrual unclipped, and a
 * non-Suit-Low card firing on a Defeat is unchanged.
 */

const bladeSuitLow: Buff = {
  id: 1,
  kind: BuffKind.SuitLow,
  tier: BuffTier.Bronze,
  condition: { kind: BuffKind.SuitLow, target: { suit: BuffTargetSuit.Bells } },
  reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
}

const momentumSuitLow: Buff = {
  id: 2,
  kind: BuffKind.SuitLow,
  tier: BuffTier.Bronze,
  condition: { kind: BuffKind.SuitLow, target: { suit: BuffTargetSuit.Keys } },
  reward: { axis: BuffRewardAxis.Multiplier, value: 2 },
}

const bladeSuitHigh: Buff = {
  id: 3,
  kind: BuffKind.SuitHigh,
  tier: BuffTier.Bronze,
  condition: { kind: BuffKind.SuitHigh, target: { suit: BuffTargetSuit.Bells } },
  reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
}

describe('DLR-150 AC1 — a Suit Low card firing on a Defeat carries and pays nothing this hand', () => {
  it('routes the reward into carryOut, not the payable axis', () => {
    const carried = resolveFiredBuffs(startHandAccrual(), [bladeSuitLow], true)
    expect(carried.carryOut).toEqual({ multiplierBonus: 0, flatDamageBonus: 1 })
    expect({
      multiplierBonus: carried.multiplierBonus,
      flatDamageBonus: carried.flatDamageBonus,
    }).toEqual({ multiplierBonus: 0, flatDamageBonus: 0 })
  })
})

describe('DLR-150 AC2 — the same card firing on a Low Victory pays this hand', () => {
  it('pays this hand and a second fired buff still adds the Overlap Bonus', () => {
    const paid = resolveFiredBuffs(startHandAccrual(), [bladeSuitLow, momentumSuitLow], false)
    expect(paid.carryOut).toEqual(EMPTY_BUFF_CARRY)
    expect({
      multiplierBonus: paid.multiplierBonus,
      flatDamageBonus: paid.flatDamageBonus,
    }).toEqual({ multiplierBonus: 2 + 1, flatDamageBonus: 1 })
  })
})

describe('DLR-150 AC3 — the carry seeds the next hand', () => {
  it('is spendable as an ordinary hand-long bonus and survives a later same-axis accrual unclipped', () => {
    const next = startHandAccrual({ multiplierBonus: 3, flatDamageBonus: 2 })
    expect({
      multiplierBonus: next.multiplierBonus,
      flatDamageBonus: next.flatDamageBonus,
    }).toEqual({ multiplierBonus: 3, flatDamageBonus: 2 })
    expect(next.carriedIn).toEqual({ multiplierBonus: 3, flatDamageBonus: 2 })
    expect(next.carryOut).toEqual(EMPTY_BUFF_CARRY)

    // The cap dependency, pinned. Seeding writes into a capped axis; both caps are
    // POSITIVE_INFINITY today, and a finite one would clip the seed DOWN on the next accrual.
    const later = accrueAxisBonus(next, BuffRewardAxis.Multiplier, 2)
    expect(later.multiplierBonus).toBe(5)
    expect(MAX_MULTIPLIER_BONUS_PER_HAND).toBe(Number.POSITIVE_INFINITY)
    expect(MAX_FLAT_DAMAGE_BONUS_PER_HAND).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('a non-Suit-Low card firing on a Defeat is unchanged', () => {
  it('a Suit High card on a High Defeat still pays this hand', () => {
    const suitHighDefeat = resolveFiredBuffs(startHandAccrual(), [bladeSuitHigh], true)
    expect(suitHighDefeat.carryOut).toEqual(EMPTY_BUFF_CARRY)
    expect(suitHighDefeat.flatDamageBonus).toBe(1)
  })
})

describe('accrueCarry throws loudly on an axis that cannot carry across a hand boundary', () => {
  // Unreachable via any mintable template today — Coins and ApRefund are both cut reward axes,
  // unconstructible per `MintableRewardAxis` (CLAUDE.md — "Cut buffs are cut until a ticket brings
  // them back"). This pins the loud-failure path rather than a plausible zero, so a future
  // widening of that union cannot silently start paying zero on an axis this function was never
  // taught to carry.
  it('throws naming the offending axis for Coins', () => {
    expect(() => accrueCarry(startHandAccrual(), BuffRewardAxis.Coins, 1)).toThrow(
      /coins.*cannot carry across a hand boundary/,
    )
  })

  it('throws naming the offending axis for ApRefund', () => {
    expect(() => accrueCarry(startHandAccrual(), BuffRewardAxis.ApRefund, 1)).toThrow(
      /apRefund.*cannot carry across a hand boundary/,
    )
  })
})
