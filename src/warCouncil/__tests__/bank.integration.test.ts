import { describe, expect, it } from 'vitest'
import { buyFromShop, startRun, bankClimbBonusFor } from '../../hunt'
import { WHETSTONE_PRICE } from '../../hunt/config'
import { ShopItem } from '../../hunt/shop'
import { forcedCashValue, resolveTrickBank, type BankState, type TrickFacts } from '../bank'

const facts = (over: Partial<TrickFacts> = {}): TrickFacts => ({
  playerWon: false,
  skullTrick: false,
  finalTrick: false,
  timebombTrick: false,
  timebombToPlayer: 0,
  timebombToQuarry: 0,
  blastGuarded: false,
  bankClimbBonus: 0,
  swanKeepsMultiplier: false,
  swanKeepsBank: false,
  buffs: null,
  ...over,
})

describe('DLR-96 AC3 — Whetstone stacked with a forced hit pays against the BOOSTED bank', () => {
  it('a forced cash-out reads the bank Whetstone already climbed, not the bare figure', () => {
    // Two Whetstones bought through the real shop rule — not a hand-set `RunState` field.
    const run = buyFromShop(
      buyFromShop({ ...startRun(), coins: WHETSTONE_PRICE * 2 }, ShopItem.Whetstone),
      ShopItem.Whetstone,
    )
    const bonus = bankClimbBonusFor(run)
    expect(bonus).toBe(2)

    // Three taken tricks at bonus 2: each banks (1 + 2) = 3, multiplier climbs by 1 each time.
    let state: BankState = { bank: 0, multiplier: 0 }
    for (let i = 0; i < 3; i++) {
      const taken = resolveTrickBank(state, facts({ playerWon: true, bankClimbBonus: bonus }))
      state = { bank: taken.bank, multiplier: taken.multiplier }
    }
    expect(state).toEqual({ bank: 9, multiplier: 3 })

    // A forced hit now: the BARE (un-boosted) figure would have been bank 3 / multiplier 3 —
    // three ordinary takes with no Whetstone — for a bare forcedCashValue of 6. The boosted
    // streak must pay MORE than that bare figure, and must equal forcedCashValue of the actual
    // (boosted) bank and multiplier this run produced.
    const bareForcedValue = forcedCashValue(3, 3)
    const hit = resolveTrickBank(state, facts({ bankClimbBonus: bonus }))
    const boostedForcedValue = forcedCashValue(9, 3)

    expect(hit.cashOut).toBe(boostedForcedValue)
    expect(hit.cashOut).toBeGreaterThan(bareForcedValue)
    expect(hit.bank).toBe(0)
    expect(hit.multiplier).toBe(0)
  })
})
