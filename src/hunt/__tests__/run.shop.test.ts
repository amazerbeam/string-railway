import { describe, expect, it } from 'vitest'
import { buyFromShop, shopStockFor, startRun } from '../run'
import { CHEAT_PRICE, HEAL_HEALTH_RESTORED, HEAL_PRICE, PLAYER_START_HEALTH } from '../config'
import { BuffKind } from '../buffs'
import { ShopItem } from '../shop'
import { DuelSide } from '../types'

// DLR-95 Phase 3 — split out of `run.test.ts` before that file's 21 `recordEncounter` call sites
// each gained a sixth argument, which would have pushed it past the blocking 400-line budget
// (`CLAUDE.md`, `react-frontend`). A pure move: no expression or assertion below differs from what
// `run.test.ts` held. Follows the existing `run.flask.test.ts` / `run.whetstone.test.ts` sibling
// convention.
//
// DLR-132 — `run.cheats` / `run.nextCheatId` are gone. A bought Cheat is a bronze `Buff` minted
// into `run.buffs`, exactly like every other buff, so the assertions below read the pile instead.

describe('buyFromShop (DLR-84)', () => {
  it('mints a fresh id for a bought Cheat, so a spent card cannot be re-issued', () => {
    const run = { ...startRun(), coins: 5 }
    const bought = buyFromShop(run, ShopItem.Cheat)
    expect(bought.nextBuffId).toBe(run.nextBuffId + 1)
    expect(bought.buffs.map((b) => b.id)).toContain(run.nextBuffId)
  })

  it('deducts CHEAT_PRICE on a Cheat purchase', () => {
    const run = { ...startRun(), coins: 5 }
    const bought = buyFromShop(run, ShopItem.Cheat)
    expect(bought.coins).toBe(run.coins - CHEAT_PRICE)
  })

  it('deducts HEAL_PRICE and raises player health by HEAL_HEALTH_RESTORED on a Heal purchase', () => {
    const run = { ...startRun(1), coins: 5, maxPlayerHealth: PLAYER_START_HEALTH }
    const healed = buyFromShop(run, ShopItem.Heal)
    expect(healed.coins).toBe(run.coins - HEAL_PRICE)
    expect(healed.encounter.health[DuelSide.Player]).toBe(1 + HEAL_HEALTH_RESTORED)
  })

  it('discards overheal rather than exceeding the maximum (AC4)', () => {
    const run = { ...startRun(9), coins: 5, maxPlayerHealth: 10 }
    const healed = buyFromShop(run, ShopItem.Heal)
    expect(healed.encounter.health[DuelSide.Player]).toBe(10)
  })

  it('allows buying twice in one visit when the coins allow (AC8)', () => {
    const run = { ...startRun(1), coins: 5, maxPlayerHealth: 10 }
    const once = buyFromShop(run, ShopItem.Heal)
    const twice = buyFromShop(once, ShopItem.Cheat)
    expect(twice.coins).toBe(run.coins - HEAL_PRICE - CHEAT_PRICE)
    expect(twice.buffs.length).toBe(run.buffs.length + 1)
  })

  it('mints into the pile rather than being capped — the pile has no slot count (DLR-132)', () => {
    const run = { ...startRun(), coins: CHEAT_PRICE * 3 }
    const thrice = [0, 1, 2].reduce((r) => buyFromShop(r, ShopItem.Cheat), run)
    expect(thrice.buffs.filter((b) => b.kind === BuffKind.Cheat).length).toBeGreaterThanOrEqual(3)
  })

  it('throws a RangeError naming AlreadyFullHealth and leaves the run unmodified', () => {
    const run = { ...startRun(10), coins: 5 }
    const before = JSON.stringify(run)
    expect(() => buyFromShop(run, ShopItem.Heal)).toThrow(/alreadyFullHealth/)
    expect(JSON.stringify(run)).toBe(before)
  })

  it('throws a RangeError naming NotEnoughCoins and leaves the run unmodified', () => {
    const run = { ...startRun(), coins: 0 }
    const before = JSON.stringify(run)
    expect(() => buyFromShop(run, ShopItem.Cheat)).toThrow(/notEnoughCoins/)
    expect(JSON.stringify(run)).toBe(before)
  })
})

describe('shopStockFor (DLR-84)', () => {
  it('projects the five figures the shop rules need', () => {
    const run = { ...startRun(), coins: 3 }
    const stock = shopStockFor(run)
    expect(stock).toEqual({
      coins: 3,
      playerHealth: run.encounter.health[DuelSide.Player],
      maxPlayerHealth: PLAYER_START_HEALTH,
      blastGuardHeld: run.blastGuardHeld,
      rankTiers: run.rankTiers,
      maxHealthPurchases: run.maxHealthPurchases,
    })
  })
})
