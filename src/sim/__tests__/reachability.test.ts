import { describe, expect, it } from 'vitest'
import {
  activatableBuffs,
  BUFF_TEMPLATES,
  BuffKind,
  RUN_STARTING_CHEATS,
  ShopItem,
  startRun,
} from '../../hunt'
import { mintableBuffKinds, unreachableBuffKinds, unshelvedShopItems } from '../reachability'

describe('reachability — the DLR-120 audit', () => {
  it('mints exactly the 11 condition families', () => {
    const mintable = mintableBuffKinds()
    expect(mintable.size).toBe(11)
    expect([...mintable].sort()).toEqual(
      [
        BuffKind.Taker,
        BuffKind.Feeder,
        BuffKind.MarkOfRank,
        BuffKind.Sidestep,
        BuffKind.Glutton,
        BuffKind.Hoarder,
        BuffKind.Unbloodied,
        BuffKind.DebtCollector,
        BuffKind.Keepsake,
        BuffKind.Miser,
        BuffKind.Cornered,
      ].sort(),
    )
  })

  it('PINNED GAP — no template mints a consumable', () => {
    // No template mints one (`BuffTemplate.kind` is typed `BuffConditionKind`); DLR-126 built
    // the five consumables and DLR-112's pool cannot produce them; the developer decides
    // whether they ship in v1's reel.
    const unreachable = unreachableBuffKinds()
    expect(unreachable.has(BuffKind.Ward)).toBe(true)
    expect(unreachable.has(BuffKind.Puppeteer)).toBe(true)
    expect(unreachable.has(BuffKind.SecondThoughts)).toBe(true)
    expect(unreachable.has(BuffKind.Foresight)).toBe(true)
    expect(unreachable.has(BuffKind.Spyglass)).toBe(true)
  })

  it('PINNED GAP — Cheat, Timebomb and Shield have zero production callers as buffs', () => {
    // `cheatBuff` / `timebombBuff` / `shieldBuff` have zero production callers — DLR-107's
    // migration into the ordinary buff pile was never finished, though its own log entry said
    // the intermediate state would last only until DLR-108 and DLR-114, both of which landed.
    const unreachable = unreachableBuffKinds()
    expect(unreachable.has(BuffKind.Cheat)).toBe(true)
    expect(unreachable.has(BuffKind.Timebomb)).toBe(true)
    expect(unreachable.has(BuffKind.Shield)).toBe(true)
    expect(unreachable.size).toBe(8)
  })

  it('partitions the BuffKind union with mintable and unreachable, less Unassigned', () => {
    expect(BUFF_TEMPLATES.length).toBe(71)
    const total = Object.values(BuffKind).length
    expect(mintableBuffKinds().size + unreachableBuffKinds().size + 1).toBe(total)
  })

  it('PINNED GAP — Cheat, Timebomb, Blast Guard and Whetstone are not on the shelf', () => {
    // DLR-116 pared the shelf; all four are still priced by `priceOf`, still tested, and none
    // can be bought.
    const unshelved = unshelvedShopItems()
    expect(unshelved.has(ShopItem.Cheat)).toBe(true)
    expect(unshelved.has(ShopItem.Timebomb)).toBe(true)
    expect(unshelved.has(ShopItem.BlastGuard)).toBe(true)
    expect(unshelved.has(ShopItem.Whetstone)).toBe(true)
  })

  it('PINNED GAP — a fresh run holds no Timebomb charge, Blast Guard or Whetstone', () => {
    // Taken with the previous case, no play path can produce a Timebomb, a Blast Guard or a
    // Whetstone — DLR-101, DLR-107, DLR-110's Blast Guard and DLR-129 all sit behind this.
    const run = startRun()
    expect(run.timebombCharges).toBe(0)
    expect(run.blastGuardHeld).toBe(false)
    expect(run.whetstones).toBe(0)
  })

  it('seeds exactly RUN_STARTING_CHEATS — the one activated card a player can reach', () => {
    const run = startRun()
    expect(run.cheats.length).toBe(RUN_STARTING_CHEATS)
  })

  it('the player enters fight one with nothing to activate', () => {
    // This is the measurement `HandReport.activatableBuffsHeld` generalises, and it is the
    // central evidence in this ticket's balance-versus-integration reading.
    const run = startRun()
    expect(activatableBuffs(run.buffs).length).toBe(0)
  })
})
