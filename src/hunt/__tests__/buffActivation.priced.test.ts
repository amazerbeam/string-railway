import { describe, expect, it } from 'vitest'
import {
  BuffKind,
  BuffTier,
  UNASSIGNED_BUFF_CONDITION,
  UNASSIGNED_BUFF_REWARD,
  type Buff,
  type BuffId,
} from '../buffs'
import { cheatBuff, shieldBuff, timebombBuff } from '../buffCatalog'
import { apCostOf } from '../buffCosts'
import { activatableBuffs, isPricedBuff } from '../buffActivation'
import { BUFF_TEMPLATES, mintGrants } from '../buffTemplates'

/** DLR-135 — NOTHING MINTS THIS ANY MORE (the opening pile is four real bronze cards now), which
 *  is exactly why the guard still needs a fixture: `isPricedBuff` must keep refusing any unpriced
 *  kind, and `BuffKind.Unassigned` is the codebase's canonical one. Built here rather than drawn
 *  from a factory, so the guard is tested against the CLASS of unpriced kind rather than against
 *  whatever a production path happens to mint today. */
function unassignedPlaceholder(id: BuffId): Buff {
  return {
    id,
    kind: BuffKind.Unassigned,
    tier: BuffTier.Bronze,
    condition: UNASSIGNED_BUFF_CONDITION,
    reward: UNASSIGNED_BUFF_REWARD,
  }
}

describe('isPricedBuff / activatableBuffs — the unpriced-kind guard (DLR-135: nothing mints one now)', () => {
  it('rejects every unassigned buff, because apCostOf throws on them', () => {
    for (const placeholder of [1, 2, 3, 4].map(unassignedPlaceholder)) {
      expect(isPricedBuff(placeholder)).toBe(false)
      expect(() => apCostOf(placeholder)).toThrow(RangeError)
    }
  })

  it('accepts the three activated cards the catalog mints', () => {
    expect(isPricedBuff(cheatBuff(BuffTier.Bronze, 1))).toBe(true)
    expect(isPricedBuff(timebombBuff(BuffTier.Silver, 2))).toBe(true)
    expect(isPricedBuff(shieldBuff(BuffTier.Gold, 3))).toBe(true)
  })

  it('accepts every condition-family buff a template can mint', () => {
    const minted = mintGrants(
      BUFF_TEMPLATES.slice(0, 8).map((t) => ({ templateId: t.id, tier: BuffTier.Bronze })),
      1,
    )
    expect(minted.length).toBeGreaterThan(0)
    for (const buff of minted) expect(isPricedBuff(buff)).toBe(true)
  })

  it('activatableBuffs drops the unassigned sentinels and keeps the rest, in order', () => {
    const cheat = cheatBuff(BuffTier.Bronze, 10)
    const pile = [
      unassignedPlaceholder(1),
      unassignedPlaceholder(2),
      cheat,
      unassignedPlaceholder(20),
    ]
    expect(activatableBuffs(pile)).toEqual([cheat])
  })

  it('every buff activatableBuffs keeps can be priced without throwing', () => {
    const pile = [...[1, 2, 3, 4].map(unassignedPlaceholder), cheatBuff(BuffTier.Gold, 9)]
    for (const buff of activatableBuffs(pile)) {
      expect(() => apCostOf(buff)).not.toThrow()
    }
  })
})
