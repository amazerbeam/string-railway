import { describe, expect, it } from 'vitest'
import { buyFromShop, shopStockFor, startRun } from '../run'
import { CHEAT_PRICE, HEAL_HEALTH_RESTORED, HEAL_PRICE, PLAYER_START_HEALTH } from '../config'
import { ShopItem } from '../shop'
import { DuelSide } from '../types'

// DLR-95 Phase 3 — split out of `run.test.ts` before that file's 21 `recordEncounter` call sites
// each gained a sixth argument, which would have pushed it past the blocking 400-line budget
// (`CLAUDE.md`, `react-frontend`). A pure move: no expression or assertion below differs from what
// `run.test.ts` held. Follows the existing `run.flask.test.ts` / `run.whetstone.test.ts` sibling
// convention.

describe('buyFromShop (DLR-84)', () => {
  it('mints a fresh id for a bought Cheat, so a spent card cannot be re-issued', () => {
    const run = { ...startRun(), coins: 5, cheats: [] }
    const bought = buyFromShop(run, ShopItem.Cheat)
    expect(bought.nextCheatId).toBe(run.nextCheatId + 1)
    expect(bought.cheats.map((c) => c.id)).toContain(run.nextCheatId)
  })

  it('deducts CHEAT_PRICE on a Cheat purchase', () => {
    const run = { ...startRun(), coins: 5, cheats: [] }
    const bought = buyFromShop(run, ShopItem.Cheat)
    expect(bought.coins).toBe(run.coins - CHEAT_PRICE)
  })

  it('deducts HEAL_PRICE and raises player health by HEAL_HEALTH_RESTORED on a Heal purchase', () => {
    const run = { ...startRun(1), coins: 5 }
    const healed = buyFromShop(run, ShopItem.Heal)
    expect(healed.coins).toBe(run.coins - HEAL_PRICE)
    expect(healed.encounter.health[DuelSide.Player]).toBe(1 + HEAL_HEALTH_RESTORED)
  })

  it('discards overheal rather than exceeding the maximum (AC4)', () => {
    const run = { ...startRun(9), coins: 5 }
    const healed = buyFromShop(run, ShopItem.Heal, 10)
    expect(healed.encounter.health[DuelSide.Player]).toBe(10)
  })

  it('allows buying twice in one visit when the coins allow (AC8)', () => {
    const run = { ...startRun(1), coins: 5, cheats: [] }
    const once = buyFromShop(run, ShopItem.Heal, 10)
    const twice = buyFromShop(once, ShopItem.Cheat)
    expect(twice.coins).toBe(run.coins - HEAL_PRICE - CHEAT_PRICE)
    expect(twice.cheats.length).toBe(run.cheats.length + 1)
  })

  it('throws a RangeError naming SlotsFull and leaves the run unmodified', () => {
    const run = { ...startRun(), coins: 5, cheats: [{ id: 100 }, { id: 101 }] }
    const before = JSON.stringify(run)
    expect(() => buyFromShop(run, ShopItem.Cheat)).toThrow(/slotsFull/)
    expect(JSON.stringify(run)).toBe(before)
  })

  it('throws a RangeError naming AlreadyFullHealth and leaves the run unmodified', () => {
    const run = { ...startRun(10), coins: 5 }
    const before = JSON.stringify(run)
    expect(() => buyFromShop(run, ShopItem.Heal, 10)).toThrow(/alreadyFullHealth/)
    expect(JSON.stringify(run)).toBe(before)
  })

  it('throws a RangeError naming NotEnoughCoins and leaves the run unmodified', () => {
    const run = { ...startRun(), coins: 0, cheats: [] }
    const before = JSON.stringify(run)
    expect(() => buyFromShop(run, ShopItem.Cheat)).toThrow(/notEnoughCoins/)
    expect(JSON.stringify(run)).toBe(before)
  })
})

describe('shopStockFor (DLR-84)', () => {
  it('projects the six figures the shop rules need', () => {
    const run = { ...startRun(), coins: 3 }
    const stock = shopStockFor(run)
    expect(stock).toEqual({
      coins: 3,
      cheatCount: run.cheats.length,
      playerHealth: run.encounter.health[DuelSide.Player],
      maxPlayerHealth: PLAYER_START_HEALTH,
      blastGuardHeld: run.blastGuardHeld,
      rankTiers: run.rankTiers,
    })
  })
})
