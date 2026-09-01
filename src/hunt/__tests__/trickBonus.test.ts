import { describe, expect, it } from 'vitest'
import { trickBonusFor } from '../buffAccrual'
import { ACTIVATED_BUFF_CONDITION, BuffKind, BuffRewardAxis, BuffTier, type Buff } from '../buffs'

/**
 * DLR-156 AC11/AC12 — `trickBonusFor` is ONE trick's buff contribution, for THAT trick only.
 * Nothing pools: a bronze Blade and a bronze Momentum pay the same figures whichever trick they
 * fired on, and two successive calls over the same `fired` array never accumulate.
 */

function buff(
  kind: (typeof BuffKind)[keyof typeof BuffKind],
  axis: (typeof BuffRewardAxis)[keyof typeof BuffRewardAxis],
  tier: (typeof BuffTier)[keyof typeof BuffTier],
  value: number,
  id = 1,
): Buff {
  return {
    id,
    kind,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis, value },
  }
}

describe('AC12 — tier values are unchanged', () => {
  it('a bronze Blade alone gives flatDamageBonus 1 and nothing else', () => {
    const blade = buff(BuffKind.Taker, BuffRewardAxis.Magnitude, BuffTier.Bronze, 1)
    expect(trickBonusFor([blade], false)).toEqual({
      flatDamageBonus: 1,
      multiplierBonus: 0,
      overlapBonus: 0,
    })
  })

  it('a bronze Momentum alone gives multiplierBonus 2 and nothing else', () => {
    const momentum = buff(BuffKind.Taker, BuffRewardAxis.Multiplier, BuffTier.Bronze, 2)
    expect(trickBonusFor([momentum], false)).toEqual({
      flatDamageBonus: 0,
      multiplierBonus: 2,
      overlapBonus: 0,
    })
  })
})

describe('AC16 — the Overlap Bonus is carried separately', () => {
  it('three fired buffs give overlapBonus 2 (firedCount - 1)', () => {
    const fired = [
      buff(BuffKind.Taker, BuffRewardAxis.Magnitude, BuffTier.Bronze, 1, 1),
      buff(BuffKind.Taker, BuffRewardAxis.Multiplier, BuffTier.Bronze, 2, 2),
      buff(BuffKind.Taker, BuffRewardAxis.Coins, BuffTier.Bronze, 3, 3),
    ]
    expect(trickBonusFor(fired, false).overlapBonus).toBe(2)
  })
})

describe('DLR-150 AC1 — a Feeder firing on a Loss carries instead', () => {
  it('contributes nothing to this trick’s figures', () => {
    const feeder = buff(BuffKind.Feeder, BuffRewardAxis.Magnitude, BuffTier.Bronze, 1)
    expect(trickBonusFor([feeder], true)).toEqual({
      flatDamageBonus: 0,
      multiplierBonus: 0,
      overlapBonus: 0,
    })
  })
})

describe('AC11 — nothing pools across calls', () => {
  it('two successive calls with the same fired array return identical values', () => {
    const fired = [buff(BuffKind.Taker, BuffRewardAxis.Magnitude, BuffTier.Bronze, 1)]
    const first = trickBonusFor(fired, false)
    const second = trickBonusFor(fired, false)
    expect(first).toEqual(second)
  })
})
