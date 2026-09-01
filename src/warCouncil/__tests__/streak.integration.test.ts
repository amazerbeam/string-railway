import { describe, expect, it } from 'vitest'
import { buyFromShop, startRun, baseDamageBonusFor } from '../../hunt'
import { WHETSTONE_PRICE } from '../../hunt/config'
import { ShopItem } from '../../hunt/shop'
import { resolveTrickBank, type StreakState, type TrickFacts } from '../streak'

const facts = (over: Partial<TrickFacts> = {}): TrickFacts => ({
  playerWon: false,
  skullTrick: false,
  finalTrick: false,
  timebombTrick: false,
  timebombToPlayer: 0,
  timebombToQuarry: 0,
  blastGuarded: false,
  baseDamageBonus: 0,
  swanKeepsMultiplier: false,
  swanKeepsBank: false,
  buffs: null,
  ...over,
})

describe('DLR-96 AC3 / DLR-156 AC7 — Whetstone climbs the total, but a hit still pays nothing', () => {
  it('a hit wipes the WHETSTONE-boosted total exactly as it would the bare one', () => {
    // Two Whetstones bought through the real shop rule — not a hand-set `RunState` field.
    const run = buyFromShop(
      buyFromShop({ ...startRun(), coins: WHETSTONE_PRICE * 2 }, ShopItem.Whetstone),
      ShopItem.Whetstone,
    )
    const bonus = baseDamageBonusFor(run)
    expect(bonus).toBe(2)

    // Three taken tricks at bonus 2: each banks (BASE_DAMAGE + 2) = 3, roll climbs by 1 each time.
    let state: StreakState = { total: 0, roll: 0 }
    for (let i = 0; i < 3; i++) {
      const taken = resolveTrickBank(state, facts({ playerWon: true, baseDamageBonus: bonus }))
      state = { total: taken.total, roll: taken.roll }
    }
    expect(state).toEqual({ total: 9, roll: 3 })

    // DLR-156 AC7 — a hit pays the Quarry NOTHING, whatever the Whetstone-boosted total was
    // worth. The whole point of the change: there is no reduced share to compare against any
    // more, boosted or bare.
    const hit = resolveTrickBank(state, facts({ baseDamageBonus: bonus }))
    expect(hit.cashOut).toBe(0)
    expect(hit.total).toBe(0)
    expect(hit.roll).toBe(0)
  })
})
