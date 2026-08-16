import { describe, expect, it } from 'vitest'
import {
  advanceRun,
  buyFromShop,
  canAdvanceRun,
  recordEncounter,
  RunOutcome,
  shopStockFor,
  startRun,
} from '../run'
import { applyDamage } from '../encounter'
import {
  CHEAT_PRICE,
  COINS_PER_ENCOUNTER_WIN,
  HEAL_HEALTH_RESTORED,
  HEAL_PRICE,
  PLAYER_START_HEALTH,
  QUARRY_ENCOUNTER_HEALTH,
  quarryHealthForEncounter,
  RUN_STARTING_CHEATS,
} from '../config'
import { ShopItem } from '../shop'
import { DuelSide, type EncounterState, type IncomingDamage } from '../types'

const damage = (toPlayer: number, toQuarry: number): IncomingDamage => ({
  [DuelSide.Player]: toPlayer,
  [DuelSide.Quarry]: toQuarry,
})

/** Beat the Quarry of the encounter `run` is on, leaving the player on `playerLoss` less health. */
function winEncounter(encounter: EncounterState, playerLoss = 0): EncounterState {
  return applyDamage(encounter, damage(playerLoss, encounter.health[DuelSide.Quarry]))
}

describe('startRun (AC1)', () => {
  it('opens on fight 0 with both bars at their configured totals', () => {
    const run = startRun()
    expect(run.encounterIndex).toBe(0)
    expect(run.encounterCount).toBe(QUARRY_ENCOUNTER_HEALTH.length)
    expect(run.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
    expect(run.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
    expect(run.outcome).toBe(RunOutcome.InProgress)
  })

  it('opens on zero coins (AC2)', () => {
    expect(startRun().coins).toBe(0)
  })

  it('sequences at least three fights that are not all the same', () => {
    expect(startRun().encounterCount).toBeGreaterThanOrEqual(3)
    expect(new Set(QUARRY_ENCOUNTER_HEALTH).size).toBeGreaterThan(1)
  })

  it('refuses a non-positive or non-finite starting health rather than starting a NaN bar', () => {
    for (const health of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => startRun(health)).toThrow(RangeError)
    }
  })
})

describe('recordEncounter — the outcome boundaries (AC4, AC5)', () => {
  it('stays in progress while the fight is live', () => {
    const run = startRun()
    const hit = applyDamage(run.encounter, damage(1, 1))
    expect(recordEncounter(run, hit, run.cheats).outcome).toBe(RunOutcome.InProgress)
  })

  it('stays in progress when an intermediate fight is won — the next one is waiting', () => {
    const run = startRun()
    const after = recordEncounter(run, winEncounter(run.encounter), run.cheats)
    expect(after.outcome).toBe(RunOutcome.InProgress)
    expect(after.encounter.winner).toBe(DuelSide.Player)
    expect(canAdvanceRun(after)).toBe(true)
  })

  it('ends the run as WON when the final fight is won (AC5)', () => {
    let run = startRun()
    for (let i = 0; i < run.encounterCount - 1; i += 1) {
      run = advanceRun(recordEncounter(run, winEncounter(run.encounter), run.cheats))
    }
    const final = recordEncounter(run, winEncounter(run.encounter), run.cheats)
    expect(final.encounterIndex).toBe(final.encounterCount - 1)
    expect(final.outcome).toBe(RunOutcome.Won)
    expect(canAdvanceRun(final)).toBe(false)
  })

  it('ends the run as LOST the moment the player is down, whatever the position (AC4)', () => {
    const run = startRun()
    const dead = applyDamage(run.encounter, damage(PLAYER_START_HEALTH, 0))
    const after = recordEncounter(run, dead, run.cheats)
    expect(after.outcome).toBe(RunOutcome.Lost)
    expect(canAdvanceRun(after)).toBe(false)
  })

  it('refuses to record onto a run that has already ended', () => {
    const run = startRun()
    const lost = recordEncounter(
      run,
      applyDamage(run.encounter, damage(PLAYER_START_HEALTH, 0)),
      run.cheats,
    )
    expect(() => recordEncounter(lost, lost.encounter, lost.cheats)).toThrow(RangeError)
  })
})

describe('recordEncounter — the payout (AC1)', () => {
  it('credits COINS_PER_ENCOUNTER_WIN the moment the player wins the encounter', () => {
    const run = startRun()
    const after = recordEncounter(run, winEncounter(run.encounter), run.cheats)
    expect(after.coins).toBe(run.coins + COINS_PER_ENCOUNTER_WIN)
  })

  it('credits nothing while the encounter is still live', () => {
    const run = startRun()
    const hit = applyDamage(run.encounter, damage(1, 1))
    const after = recordEncounter(run, hit, run.cheats)
    expect(after.coins).toBe(run.coins)
  })

  it('credits nothing when the Quarry wins', () => {
    const run = startRun()
    const dead = applyDamage(run.encounter, damage(PLAYER_START_HEALTH, 0))
    const after = recordEncounter(run, dead, run.cheats)
    expect(after.coins).toBe(run.coins)
  })
})

describe('advanceRun — the carry (AC3)', () => {
  it('carries the health the player finished on, restoring nothing', () => {
    const run = startRun()
    const loss = 3
    const next = advanceRun(recordEncounter(run, winEncounter(run.encounter, loss), run.cheats))
    expect(next.encounterIndex).toBe(1)
    expect(next.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - loss)
    expect(next.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(1))
  })

  it('opens the next fight unresolved, with its own damage counter at zero', () => {
    const run = startRun()
    const next = advanceRun(recordEncounter(run, winEncounter(run.encounter, 2), run.cheats))
    expect(next.encounter.winner).toBeNull()
    expect(next.encounter.damageEventsApplied).toBe(0)
    expect(next.outcome).toBe(RunOutcome.InProgress)
  })

  it('throws rather than returning the run unchanged when it cannot advance', () => {
    const live = startRun()
    expect(canAdvanceRun(live)).toBe(false)
    expect(() => advanceRun(live)).toThrow(RangeError)

    const lost = recordEncounter(
      live,
      applyDamage(live.encounter, damage(PLAYER_START_HEALTH, 0)),
      live.cheats,
    )
    expect(() => advanceRun(lost)).toThrow(RangeError)
  })

  it('never mutates the run it was handed', () => {
    const run = startRun()
    const won = recordEncounter(run, winEncounter(run.encounter, 4), run.cheats)
    const before = JSON.stringify(won)
    advanceRun(won)
    expect(JSON.stringify(won)).toBe(before)
  })

  it('carries the coin balance across a fight boundary untouched', () => {
    const run = startRun()
    const won = recordEncounter(run, winEncounter(run.encounter), run.cheats)
    const next = advanceRun(won)
    expect(next.coins).toBe(won.coins)
  })
})

describe('Cheats on RunState (DLR-83 AC3)', () => {
  it('grants Cheats from configuration at the start of a run (AC3)', () => {
    const run = startRun()
    expect(run.cheats).toHaveLength(RUN_STARTING_CHEATS)
    expect(run.nextCheatId).toBe(RUN_STARTING_CHEATS + 1)
  })

  it('carries the slots across a fight boundary untouched (AC3)', () => {
    const run = startRun()
    const won = recordEncounter(run, winEncounter(run.encounter), [{ id: 2 }])
    const next = advanceRun(won)
    expect(next.cheats).toEqual([{ id: 2 }])
    expect(next.nextCheatId).toBe(won.nextCheatId)
  })

  it('adopts a spend reported by the hand', () => {
    const run = startRun()
    const hit = applyDamage(run.encounter, damage(1, 1))
    const after = recordEncounter(run, hit, [])
    expect(after.cheats).toEqual([])
  })
})

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
  it('projects the four figures the shop rules need', () => {
    const run = { ...startRun(), coins: 3 }
    const stock = shopStockFor(run)
    expect(stock).toEqual({
      coins: 3,
      cheatCount: run.cheats.length,
      playerHealth: run.encounter.health[DuelSide.Player],
      maxPlayerHealth: PLAYER_START_HEALTH,
    })
  })
})
