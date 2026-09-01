// A SIBLING of `run.test.ts`, holding only DLR-92's four Whetstone specs — split out here because
// Phase 1's additions pushed `run.test.ts` past its 400-line budget, exactly the precedent
// `playCard.timebomb.test.ts` sets beside `playCard.test.ts` for the same reason.
import { describe, expect, it } from 'vitest'
import {
  advanceRun,
  baseDamageBonusFor,
  buyFromShop,
  recordEncounter,
  shopStockFor,
  startRun,
} from '../run'
import { applyDamage } from '../encounter'
import { WHETSTONE_PRICE } from '../config'
import { PurchaseRefusal, refusalFor, ShopItem } from '../shop'
import { DuelSide, type EncounterState, type IncomingDamage } from '../types'

// A local, minimal duplicate of `run.test.ts`'s own helpers rather than an import: importing one
// `.test.ts` module from another re-executes its top-level `describe` calls in the importer's
// suite, silently duplicating every test in that file.
const damage = (toPlayer: number, toQuarry: number): IncomingDamage => ({
  [DuelSide.Player]: toPlayer,
  [DuelSide.Quarry]: toQuarry,
})

function winEncounter(encounter: EncounterState, playerLoss = 0): EncounterState {
  const wounded = playerLoss > 0 ? applyDamage(encounter, damage(playerLoss, 0)) : encounter
  return applyDamage(wounded, damage(0, wounded.health[DuelSide.Quarry]))
}

describe('buyFromShop — Whetstone (DLR-92)', () => {
  it('DLR-92 AC2 — a Whetstone is buyable more than once and the count stacks', () => {
    const run = { ...startRun(), coins: WHETSTONE_PRICE * 2 }
    const one = buyFromShop(run, ShopItem.Whetstone)
    const two = buyFromShop(one, ShopItem.Whetstone)
    expect(one.whetstones).toBe(1)
    expect(two.whetstones).toBe(2)
    expect(two.coins).toBe(0)
  })

  it('DLR-92 AC2 — the third copy is refused only for coins, never a cap', () => {
    const broke = { ...startRun(), coins: 0, whetstones: 5 }
    expect(refusalFor(shopStockFor(broke), ShopItem.Whetstone)).toBe(PurchaseRefusal.NotEnoughCoins)
    const flush = { ...broke, coins: WHETSTONE_PRICE }
    expect(refusalFor(shopStockFor(flush), ShopItem.Whetstone)).toBeNull()
  })

  it('DLR-92 AC3 — the count survives advanceRun, exactly as coins do', () => {
    const run = { ...startRun(), whetstones: 2 }
    const won = recordEncounter(
      run,
      winEncounter(run.encounter),
      false,
      run.discardsRemaining,
      null,
    )
    expect(advanceRun(won).whetstones).toBe(2)
  })
})

describe('baseDamageBonusFor (DLR-92 AC2)', () => {
  it('is +1 per copy and 0 with none', () => {
    expect(baseDamageBonusFor(startRun())).toBe(0)
    expect(baseDamageBonusFor({ ...startRun(), whetstones: 3 })).toBe(3)
  })
})
