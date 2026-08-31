import { describe, expect, it } from 'vitest'
import { timebombBuff } from '../buffCatalog'
import { BuffKind, BuffRewardAxis, BuffTier, type Buff } from '../buffs'
import { STARTING_AP } from '../apConfig'
import {
  BuffActivationRefusal,
  buffActivationRefusalFor,
  buffActivationStockFor,
  startBuffActivation,
} from '../buffActivation'

/** A condition-family buff, mirroring `buffActivation.test.ts`'s own helper — `kind` is the
 *  caller's, so the same shape builds a Taker for the "never refuses a non-Timebomb" case. */
function conditionBuff(kind: BuffKind, tier: BuffTier, id: number): Buff {
  return {
    id,
    kind,
    tier,
    condition: { kind: `${kind}Trigger` },
    reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
  }
}

// Split out of `buffActivation.test.ts` on DLR-154 — that file was pushed to 414 of its 400-line
// budget by this suite, mirroring the split `buffActivation.deactivate.test.ts` already made.

describe('buffActivationRefusalFor — DLR-154 R2, TimebombLive', () => {
  const openStock = {
    effectLive: true,
    windowOpen: true,
    apPool: STARTING_AP,
    apCost: 2,
    alreadyActive: false,
    timebombLive: false,
  }

  it('refuses a second Timebomb while one is live', () => {
    const stock = { ...openStock, timebombLive: true }
    expect(buffActivationRefusalFor(stock)).toBe(BuffActivationRefusal.TimebombLive)
  })

  it('reports WindowClosed ahead of TimebombLive — the felt-wide reason wins', () => {
    const stock = { ...openStock, windowOpen: false, timebombLive: true }
    expect(buffActivationRefusalFor(stock)).toBe(BuffActivationRefusal.WindowClosed)
  })

  it('reports TimebombLive ahead of AlreadyActive', () => {
    const stock = { ...openStock, timebombLive: true, alreadyActive: true }
    expect(buffActivationRefusalFor(stock)).toBe(BuffActivationRefusal.TimebombLive)
  })
})

describe('buffActivationStockFor — DLR-154 R2, timebombLive', () => {
  it('never refuses a non-Timebomb for TimebombLive', () => {
    const state = startBuffActivation()
    expect(
      buffActivationStockFor(state, conditionBuff(BuffKind.Taker, BuffTier.Bronze, 5), true, true)
        .timebombLive,
    ).toBe(false)
  })

  it('reports timebombLive true for a Timebomb when the felt says one is live', () => {
    const state = startBuffActivation()
    expect(
      buffActivationStockFor(state, timebombBuff(BuffTier.Bronze, 6), true, true).timebombLive,
    ).toBe(true)
  })
})
