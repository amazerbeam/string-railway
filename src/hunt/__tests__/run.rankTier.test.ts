import { describe, expect, it } from 'vitest'
import { advanceRun, buyFromShop, recordEncounter, startRun } from '../run'
import { playerRankTiersFor, shopStockFor } from '../run'
import { ShopItem } from '../shop'
import { AbilityTier, ALL_BRONZE, RANK_TIER_STEP_PRICE, TieredRank } from '../rankTiers'
import { applyDamage } from '../encounter'
import { DuelSide } from '../types'

/** A run with coins to spend, and nothing else changed. */
const funded = (coins: number) => ({ ...startRun(), coins })

describe('a run opens with nothing bought (AC1)', () => {
  it('seeds every tierable rank at bronze', () => {
    expect(startRun().rankTiers).toEqual(ALL_BRONZE)
  })

  it('projects the table into the shop stock so the ceiling is a shop rule', () => {
    const run = funded(99)
    expect(shopStockFor(run).rankTiers).toBe(run.rankTiers)
  })

  it('reads back through the one player-side query', () => {
    const run = funded(99)
    expect(playerRankTiersFor(run)).toBe(run.rankTiers)
  })
})

describe('buying a tier (AC2)', () => {
  it('spends exactly one step price and raises exactly one rung', () => {
    const run = funded(RANK_TIER_STEP_PRICE)
    const bought = buyFromShop(run, ShopItem.SwanTier)
    expect(bought.coins).toBe(0)
    expect(bought.rankTiers[TieredRank.Swan]).toBe(AbilityTier.Silver)
  })

  it('leaves every other rank alone', () => {
    const bought = buyFromShop(funded(99), ShopItem.SwanTier)
    expect(bought.rankTiers[TieredRank.Witch]).toBe(AbilityTier.Bronze)
    expect(bought.rankTiers[TieredRank.Monarch]).toBe(AbilityTier.Bronze)
  })

  it('reaches gold in two buys and refuses a third by name', () => {
    const silver = buyFromShop(funded(99), ShopItem.SwanTier)
    const gold = buyFromShop(silver, ShopItem.SwanTier)
    expect(gold.rankTiers[TieredRank.Swan]).toBe(AbilityTier.Gold)
    expect(gold.coins).toBe(99 - 2 * RANK_TIER_STEP_PRICE)
    expect(() => buyFromShop(gold, ShopItem.SwanTier)).toThrow(/rankAtMaxTier/)
  })

  it('refuses by name when the purse is one coin short', () => {
    expect(() => buyFromShop(funded(RANK_TIER_STEP_PRICE - 1), ShopItem.SwanTier)).toThrow(
      /notEnoughCoins/,
    )
  })

  it('sells the Witch ladder independently of the Swan', () => {
    const bought = buyFromShop(funded(99), ShopItem.WitchTier)
    expect(bought.rankTiers[TieredRank.Witch]).toBe(AbilityTier.Silver)
    expect(bought.rankTiers[TieredRank.Swan]).toBe(AbilityTier.Bronze)
  })
})

describe('a bought tier is run-permanent (AC2)', () => {
  it('survives recording a won encounter and advancing to the next fight', () => {
    const bought = buyFromShop(funded(99), ShopItem.SwanTier)
    const won = applyDamage(bought.encounter, {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: bought.encounter.health[DuelSide.Quarry],
    })
    const recorded = recordEncounter(bought, won, bought.discardsRemaining, null)
    expect(recorded.rankTiers[TieredRank.Swan]).toBe(AbilityTier.Silver)
    expect(advanceRun(recorded).rankTiers[TieredRank.Swan]).toBe(AbilityTier.Silver)
  })
})
