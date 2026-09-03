import { describe, expect, it } from 'vitest'
import {
  activatableBuffs,
  BUFF_TEMPLATES,
  BuffKind,
  RUN_STARTING_CHEATS,
  ShopItem,
  STARTING_BUFF_COUNT,
  startRun,
} from '../../hunt'
import { mintableBuffKinds, unreachableBuffKinds, unshelvedShopItems } from '../reachability'

describe('reachability — the DLR-120 audit', () => {
  it('DLR-161 — mints exactly the 5 surviving condition families plus DLR-132s two activated cards', () => {
    const mintable = mintableBuffKinds()
    expect(mintable.size).toBe(7)
    expect([...mintable].sort()).toEqual(
      [
        BuffKind.Taker,
        BuffKind.Feeder,
        BuffKind.Sidestep,
        BuffKind.SkullHelmet,
        BuffKind.SkullTether,
        BuffKind.Cheat,
        BuffKind.Timebomb,
      ].sort(),
    )
  })

  it('PINNED GAP — no template mints a consumable', () => {
    // No template mints one — DLR-126 built the five consumables and DLR-112's pool cannot
    // produce them. DLR-132 closed this gap for Cheat and Timebomb only (`ActivatedBuffTemplate`);
    // the five consumables remain a separate, developer-owned decision.
    const unreachable = unreachableBuffKinds()
    expect(unreachable.has(BuffKind.Ward)).toBe(true)
    expect(unreachable.has(BuffKind.Puppeteer)).toBe(true)
    expect(unreachable.has(BuffKind.SecondThoughts)).toBe(true)
    expect(unreachable.has(BuffKind.Foresight)).toBe(true)
    expect(unreachable.has(BuffKind.Spyglass)).toBe(true)
  })

  it('PINNED GAP — Shield has zero production callers as a buff; Cheat and Timebomb no longer do', () => {
    // `shieldBuff` still has zero production callers. DLR-132 closes the gap `cheatBuff` /
    // `timebombBuff` left open: both templates are now in `BUFF_TEMPLATES` and mint through the
    // ordinary reel, so neither belongs in the unreachable set any more. The five consumables
    // (asserted above) and Shield are the scope boundary this ticket does NOT cross.
    const unreachable = unreachableBuffKinds()
    expect(unreachable.has(BuffKind.Cheat)).toBe(false)
    expect(unreachable.has(BuffKind.Timebomb)).toBe(false)
    expect(unreachable.has(BuffKind.Shield)).toBe(true)
  })

  it('DLR-145 — widens the unreachable set to the previous 6 plus the 8 families pruned from TEMPLATE_FAMILIES', () => {
    // The eight are DELIBERATELY declared-but-unreachable, not a defect: `BuffKind`,
    // `CONDITION_MODIFIER`, `buffFires` and `BUFF_CADENCE` all still carry them (see
    // `buffTemplates.ts`'s module docblock), and restoring one is a `TEMPLATE_FAMILIES` row.
    const unreachable = unreachableBuffKinds()
    expect(unreachable.size).toBe(14)
    for (const kind of [
      BuffKind.MarkOfRank,
      BuffKind.Glutton,
      BuffKind.Hoarder,
      BuffKind.Unbloodied,
      BuffKind.DebtCollector,
      BuffKind.Keepsake,
      BuffKind.Miser,
      BuffKind.Cornered,
    ]) {
      expect(unreachable.has(kind)).toBe(true)
    }
  })

  it('partitions the BuffKind union with mintable and unreachable, less Unassigned', () => {
    expect(BUFF_TEMPLATES.length).toBe(18)
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

  it('DLR-145 — ApCapacity is not on the shelf either, AP having been removed entirely', () => {
    const unshelved = unshelvedShopItems()
    expect(unshelved.has(ShopItem.ApCapacity)).toBe(true)
  })

  it('PINNED GAP — a fresh run holds no Blast Guard or Whetstone', () => {
    // Taken with the previous case, no play path can produce a Blast Guard or a Whetstone —
    // DLR-110's Blast Guard and DLR-129 both sit behind this. A Timebomb is no longer a run-level
    // charge (DLR-132) — it is a pile member, covered by the next case instead.
    const run = startRun()
    expect(run.blastGuardHeld).toBe(false)
    expect(run.whetstones).toBe(0)
  })

  it("seeds RUN_STARTING_CHEATS GUARANTEED Cheats as the pile's final members (DLR-132)", () => {
    const run = startRun()
    const guaranteed = run.buffs.slice(run.buffs.length - RUN_STARTING_CHEATS)
    expect(guaranteed).toHaveLength(RUN_STARTING_CHEATS)
    expect(guaranteed.every((buff) => buff.kind === BuffKind.Cheat)).toBe(true)
  })

  it('the player enters fight one with EVERY opening card activatable (DLR-135)', () => {
    // DLR-120 measured this at 0 — the opening pile held only `Unassigned` placeholders. DLR-132
    // added the guaranteed Cheat, taking it to 1. DLR-135 draws the other four for real, so the
    // whole opening pile is now activatable and this asserts the total rather than the Cheat.
    const run = startRun()
    expect(activatableBuffs(run.buffs)).toHaveLength(STARTING_BUFF_COUNT + RUN_STARTING_CHEATS)
    expect(activatableBuffs(run.buffs)).toHaveLength(run.buffs.length)
  })
})
