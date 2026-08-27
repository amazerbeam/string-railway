import { describe, expect, it } from 'vitest'
import { MAX_COIN_BONUS_PER_HAND, MAX_MULTIPLIER_BONUS_PER_HAND } from '../apConfig'
import * as buffAccrual from '../buffAccrual'
import {
  EMPTY_BUFF_ACCRUAL,
  accrueAxisBonus,
  markCashOutPaid,
  overlapBonusFor,
  payableCashOutBonus,
  resolveFiredBuffs,
  startHandAccrual,
  type BuffBonusAccrual,
} from '../buffAccrual'
import { ACTIVATED_BUFF_CONDITION, BuffKind, BuffRewardAxis, BuffTier, type Buff } from '../buffs'

function firedBuff(
  axis: (typeof BuffRewardAxis)[keyof typeof BuffRewardAxis],
  value: number,
): Buff {
  return {
    id: 1,
    kind: BuffKind.Taker,
    tier: BuffTier.Bronze,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis, value },
  }
}

describe('startHandAccrual', () => {
  it('equals EMPTY_BUFF_ACCRUAL, all four fields 0', () => {
    expect(startHandAccrual()).toEqual(EMPTY_BUFF_ACCRUAL)
    expect(startHandAccrual()).toEqual({
      multiplierBonus: 0,
      flatDamageBonus: 0,
      coinBonus: 0,
      apRefunded: 0,
      multiplierPaid: 0,
      flatDamagePaid: 0,
      carriedIn: { multiplierBonus: 0, flatDamageBonus: 0 },
      carryOut: { multiplierBonus: 0, flatDamageBonus: 0 },
    })
  })
})

describe('R2 — within an axis, contributions add', () => {
  it('two Blade contributions of 1 and 3 accrue flatDamageBonus to 4', () => {
    let accrual = startHandAccrual()
    accrual = accrueAxisBonus(accrual, BuffRewardAxis.Magnitude, 1)
    accrual = accrueAxisBonus(accrual, BuffRewardAxis.Magnitude, 3)
    expect(accrual.flatDamageBonus).toBe(4)
  })
})

describe('R1 — axes do not interact', () => {
  it('accruing on multiplier leaves the other three fields at 0', () => {
    const accrual = accrueAxisBonus(startHandAccrual(), BuffRewardAxis.Multiplier, 2)
    expect(accrual.multiplierBonus).toBe(2)
    expect(accrual.flatDamageBonus).toBe(0)
    expect(accrual.coinBonus).toBe(0)
    expect(accrual.apRefunded).toBe(0)
  })
})

describe('R6 — a contribution past a cap is clipped and the remainder is lost', () => {
  it('accrues to exactly the cap and a subsequent 0 does not restore anything', () => {
    let accrual = startHandAccrual()
    accrual = accrueAxisBonus(accrual, BuffRewardAxis.Coins, 5)
    accrual = accrueAxisBonus(accrual, BuffRewardAxis.Coins, 5)
    expect(accrual.coinBonus).toBe(MAX_COIN_BONUS_PER_HAND)
    accrual = accrueAxisBonus(accrual, BuffRewardAxis.Coins, 5)
    expect(accrual.coinBonus).toBe(MAX_COIN_BONUS_PER_HAND)
    accrual = accrueAxisBonus(accrual, BuffRewardAxis.Coins, 0)
    expect(accrual.coinBonus).toBe(MAX_COIN_BONUS_PER_HAND)
  })
})

describe('R6’s asymmetry — the module offers no per-hit reset', () => {
  it('exports no onHit/resetOnHit-shaped function', () => {
    const exportNames = Object.keys(buffAccrual)
    expect(exportNames.some((name) => /onHit/i.test(name))).toBe(false)
    expect(exportNames.some((name) => /resetOnHit/i.test(name))).toBe(false)
    // startHandAccrual is the ONLY reset this module exports.
    expect(exportNames.filter((name) => /^start|reset/i.test(name))).toEqual(['startHandAccrual'])
  })

  it('a caller who exhausts MAX_MULTIPLIER_BONUS_PER_HAND and keeps accruing still reads the cap', () => {
    let accrual = startHandAccrual()
    accrual = accrueAxisBonus(accrual, BuffRewardAxis.Multiplier, MAX_MULTIPLIER_BONUS_PER_HAND)
    accrual = accrueAxisBonus(accrual, BuffRewardAxis.Multiplier, 4)
    expect(accrual.multiplierBonus).toBe(MAX_MULTIPLIER_BONUS_PER_HAND)
  })
})

describe('DLR-145 AC9 — Multiplier and Magnitude are uncapped', () => {
  it('never clips a Momentum or Blade contribution, however many cards fire', () => {
    let accrual = startHandAccrual()
    for (let i = 0; i < 12; i++) {
      accrual = accrueAxisBonus(accrual, BuffRewardAxis.Multiplier, 5)
      accrual = accrueAxisBonus(accrual, BuffRewardAxis.Magnitude, 5)
    }
    expect(accrual.multiplierBonus).toBe(60)
    expect(accrual.flatDamageBonus).toBe(60)
    expect(Number.isFinite(accrual.multiplierBonus)).toBe(true)
    expect(Number.isFinite(accrual.flatDamageBonus)).toBe(true)
  })
})

describe('R5 — the Overlap Bonus is linear', () => {
  it('overlapBonusFor(1) = 0, (2) = 1, (6) = 5, (0) = 0', () => {
    expect(overlapBonusFor(1)).toBe(0)
    expect(overlapBonusFor(2)).toBe(1)
    expect(overlapBonusFor(6)).toBe(5)
    expect(overlapBonusFor(0)).toBe(0)
  })
})

describe('R5 — the bonus draws from the Momentum cap', () => {
  it('an accrual already at the multiplier cap receives nothing further from a six-buff overlap', () => {
    const maxedOut: BuffBonusAccrual = {
      ...startHandAccrual(),
      multiplierBonus: MAX_MULTIPLIER_BONUS_PER_HAND,
    }
    const fired = Array.from({ length: 6 }, () => firedBuff(BuffRewardAxis.Multiplier, 0))
    const result = resolveFiredBuffs(maxedOut, fired, false)
    expect(result.multiplierBonus).toBe(MAX_MULTIPLIER_BONUS_PER_HAND)
  })
})

describe('resolveFiredBuffs', () => {
  it('returns the accrual unchanged on an empty array', () => {
    const accrual = accrueAxisBonus(startHandAccrual(), BuffRewardAxis.Coins, 3)
    expect(resolveFiredBuffs(accrual, [], false)).toEqual(accrual)
  })

  it('three fired buffs across three axes move three counters and add k-1=2 to multiplierBonus', () => {
    const fired = [
      firedBuff(BuffRewardAxis.Magnitude, 3),
      firedBuff(BuffRewardAxis.Coins, 2),
      firedBuff(BuffRewardAxis.ApRefund, 1),
    ]
    const result = resolveFiredBuffs(startHandAccrual(), fired, false)
    expect(result.flatDamageBonus).toBe(3)
    expect(result.coinBonus).toBe(2)
    expect(result.apRefunded).toBe(1)
    expect(result.multiplierBonus).toBe(2)
  })
})

describe('DLR-125 — the cash-out spend model', () => {
  it('a second cash-out in the same hand pays nothing more once the pool is spent', () => {
    const accrued = accrueAxisBonus(startHandAccrual(), BuffRewardAxis.Magnitude, 5)
    const first = payableCashOutBonus(accrued)
    expect(first.flatDamageBonus).toBe(5)
    const after = markCashOutPaid(accrued, first)
    expect(payableCashOutBonus(after).flatDamageBonus).toBe(0)
  })

  it('a contribution accrued AFTER a cash-out is still payable at the next one', () => {
    const spent = markCashOutPaid(
      accrueAxisBonus(startHandAccrual(), BuffRewardAxis.Multiplier, 2),
      {
        multiplierBonus: 2,
        flatDamageBonus: 0,
      },
    )
    const more = accrueAxisBonus(spent, BuffRewardAxis.Multiplier, 3)
    expect(payableCashOutBonus(more).multiplierBonus).toBe(3)
  })

  // DLR-145 AC9 retired the Multiplier axis's per-hand cap, so a spend no longer has a bound to
  // re-hit — the case this test guarded against (a spend resetting the pool and letting a second
  // cash-out pay past the cap) no longer has a cap to reset. What survives is the underlying
  // bookkeeping: `markCashOutPaid` deducts what was already paid rather than zeroing the accrual,
  // so a contribution made AFTER a spend is exactly the new payable amount.
  it('a spend deducts what was paid rather than resetting the running total', () => {
    let a = accrueAxisBonus(startHandAccrual(), BuffRewardAxis.Multiplier, 6)
    a = markCashOutPaid(a, payableCashOutBonus(a))
    a = accrueAxisBonus(a, BuffRewardAxis.Multiplier, 4)
    expect(a.multiplierBonus).toBe(10)
    expect(payableCashOutBonus(a).multiplierBonus).toBe(4)
  })
})

describe('every field of every returned accrual is a non-negative integer, input never mutated', () => {
  it('holds across a representative sequence', () => {
    const start = startHandAccrual()
    const fired = [firedBuff(BuffRewardAxis.Magnitude, 5), firedBuff(BuffRewardAxis.Multiplier, 2)]
    const result = resolveFiredBuffs(start, fired, false)
    const { carriedIn, carryOut, ...axisTotals } = result
    for (const value of Object.values(axisTotals)) {
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
    }
    // DLR-150 — carriedIn/carryOut are BuffCarry objects, not numbers; check their own two fields.
    for (const carry of [carriedIn, carryOut]) {
      for (const value of Object.values(carry)) {
        expect(Number.isInteger(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
      }
    }
    expect(start).toEqual(EMPTY_BUFF_ACCRUAL)
  })
})
