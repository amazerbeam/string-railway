import { describe, expect, it } from 'vitest'
import { STARTING_AP } from '../apConfig'
import { cheatBuff, timebombBuff } from '../buffCatalog'
import { ACTIVATED_BUFF_CONDITION, BuffKind, BuffRewardAxis, BuffTier, type Buff } from '../buffs'
import {
  activateFromPile,
  deactivateFromPile,
  isRevocableBuff,
  startBuffActivation,
} from '../buffActivation'

/** A Ward for the non-revocable-consumable case — same shape `buffActivation.test.ts` uses. */
function wardBuff(tier: BuffTier, id: number): Buff {
  return {
    id,
    kind: BuffKind.Ward,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.DamageAbsorbed, value: 0 },
  }
}

/** A Shield for the non-revocable-consumable case. */
function shieldBuffFixture(tier: BuffTier, id: number): Buff {
  return {
    id,
    kind: BuffKind.Shield,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.HeartCount, value: 0 },
  }
}

/** A condition-family buff, mirroring `buffActivation.test.ts`'s own `conditionBuff` helper. */
function conditionBuff(kind: BuffKind, tier: BuffTier, id: number): Buff {
  return {
    id,
    kind,
    tier,
    condition: { kind: `${kind}Trigger` },
    reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
  }
}

describe('isRevocableBuff — DLR-153 AC10, the one statement of which cards may be taken back', () => {
  it('is true for the three condition families — Taker, Feeder, Sidestep', () => {
    expect(isRevocableBuff(conditionBuff(BuffKind.Taker, BuffTier.Bronze, 1))).toBe(true)
    expect(isRevocableBuff(conditionBuff(BuffKind.Feeder, BuffTier.Bronze, 2))).toBe(true)
    expect(isRevocableBuff(conditionBuff(BuffKind.Sidestep, BuffTier.Bronze, 3))).toBe(true)
  })

  it('is false for the Activated cards — Cheat, Timebomb, Ward, Shield', () => {
    expect(isRevocableBuff(cheatBuff(BuffTier.Bronze, 4))).toBe(false)
    expect(isRevocableBuff(timebombBuff(BuffTier.Bronze, 5))).toBe(false)
    expect(isRevocableBuff(wardBuff(BuffTier.Bronze, 6))).toBe(false)
    expect(isRevocableBuff(shieldBuffFixture(BuffTier.Bronze, 7))).toBe(false)
  })
})

describe('deactivateFromPile — DLR-153 AC10, the mirror of activateFromPile', () => {
  it('returns activatedThisTrick and spentThisTrick to empty, restores the card, and refunds the pool', () => {
    const taker = conditionBuff(BuffKind.Taker, BuffTier.Bronze, 1)
    const { activation, buffs } = activateFromPile(startBuffActivation(), [taker], taker, true)

    const reverted = deactivateFromPile(activation, buffs, taker)

    expect(reverted.activation.activatedThisTrick).toEqual([])
    expect(reverted.activation.spentThisTrick).toEqual([])
    expect(reverted.buffs.map((b) => b.id)).toEqual([1])
    expect(reverted.activation.apPool).toBe(STARTING_AP)
  })

  it('appends the restored card to the end of the pile rather than its old index', () => {
    const first = conditionBuff(BuffKind.Taker, BuffTier.Bronze, 1)
    const second = conditionBuff(BuffKind.Feeder, BuffTier.Bronze, 2)
    const third = conditionBuff(BuffKind.Sidestep, BuffTier.Bronze, 3)
    const pile: readonly Buff[] = [first, second, third]

    const { activation, buffs } = activateFromPile(startBuffActivation(), pile, first, true)
    expect(buffs.map((b) => b.id)).toEqual([2, 3])

    const reverted = deactivateFromPile(activation, buffs, first)
    expect(reverted.buffs.map((b) => b.id)).toEqual([2, 3, 1])
  })

  it('does not add a card a second time when it never left the pile — a revocable buff whose card was never removed, e.g. under a CONDITION_CARD_SINGLE_USE = false toggle', () => {
    const kept = conditionBuff(BuffKind.MarkOfRank, BuffTier.Bronze, 1)
    const taker = conditionBuff(BuffKind.Taker, BuffTier.Bronze, 2)
    const pile: readonly Buff[] = [kept, taker]
    const state = { ...startBuffActivation(), activatedThisTrick: [2], spentThisTrick: [] }

    const reverted = deactivateFromPile(state, pile, taker)
    expect(reverted.buffs).toHaveLength(2)
    expect(reverted.buffs.map((b) => b.id).sort()).toEqual([1, 2])
  })

  it('throws a RangeError naming the reason for a non-revocable buff', () => {
    const cheat = cheatBuff(BuffTier.Bronze, 1)
    const { activation, buffs } = activateFromPile(startBuffActivation(), [cheat], cheat, true)

    expect(() => deactivateFromPile(activation, buffs, cheat)).toThrow(RangeError)
  })

  it('throws a RangeError naming the reason for a revocable buff that is not riding this trick', () => {
    const taker = conditionBuff(BuffKind.Taker, BuffTier.Bronze, 1)
    const state = startBuffActivation()

    expect(() => deactivateFromPile(state, [taker], taker)).toThrow(RangeError)
  })

  it('leaves the other activated buff in activatedThisTrick when only one of two is revoked', () => {
    const taker = conditionBuff(BuffKind.Taker, BuffTier.Bronze, 1)
    const feeder = conditionBuff(BuffKind.Feeder, BuffTier.Bronze, 2)
    const pile: readonly Buff[] = [taker, feeder]

    const afterTaker = activateFromPile(startBuffActivation(), pile, taker, true)
    const afterFeeder = activateFromPile(afterTaker.activation, afterTaker.buffs, feeder, true)

    const reverted = deactivateFromPile(afterFeeder.activation, afterFeeder.buffs, taker)

    expect(reverted.activation.activatedThisTrick).toEqual([2])
    // Feeder is still spent — only the revoked Taker comes back into the pile.
    expect(reverted.buffs.map((b) => b.id)).toEqual([1])
  })
})
