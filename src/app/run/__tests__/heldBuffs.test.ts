import { describe, expect, it } from 'vitest'
import { BUFF_TEMPLATES, BuffTier, mintFromTemplate, type Buff, type BuffId } from '../../../hunt'
import { heldBuffStacks, heldBuffCount } from '../heldBuffs'

/** Mint a real card from a real template — never a hand-built literal, so a change to `Buff`'s
 *  shape fails here rather than letting a fixture drift away from what the engine produces. */
function mint(templateIndex: number, tier: BuffTier, id: BuffId): Buff {
  return mintFromTemplate(BUFF_TEMPLATES[templateIndex], tier, id)
}

describe('heldBuffStacks', () => {
  it('returns nothing for an empty hand', () => {
    expect(heldBuffStacks([])).toEqual([])
  })

  it('piles identical cards into one stack and counts the copies', () => {
    const stacks = heldBuffStacks([
      mint(0, BuffTier.Bronze, 1),
      mint(0, BuffTier.Bronze, 2),
      mint(0, BuffTier.Bronze, 3),
    ])
    expect(stacks).toHaveLength(1)
    expect(stacks[0].count).toBe(3)
  })

  it('keeps two tiers of the SAME template apart — a silver is not a bronze', () => {
    const stacks = heldBuffStacks([mint(0, BuffTier.Bronze, 1), mint(0, BuffTier.Silver, 2)])
    expect(stacks).toHaveLength(2)
    expect(stacks.every((stack) => stack.count === 1)).toBe(true)
  })

  it('orders by tier descending, so the best card is read first', () => {
    const stacks = heldBuffStacks([
      mint(0, BuffTier.Bronze, 1),
      mint(1, BuffTier.Gold, 2),
      mint(2, BuffTier.Silver, 3),
    ])
    expect(stacks.map((stack) => stack.buff.tier)).toEqual([
      BuffTier.Gold,
      BuffTier.Silver,
      BuffTier.Bronze,
    ])
  })

  it('is a TOTAL order — the same holdings in a different order draw the same tray', () => {
    const a = mint(0, BuffTier.Bronze, 1)
    const b = mint(1, BuffTier.Bronze, 2)
    const c = mint(2, BuffTier.Bronze, 3)
    const forwards = heldBuffStacks([a, b, c]).map((s) => s.buff.kind + s.buff.tier)
    const backwards = heldBuffStacks([c, b, a]).map((s) => s.buff.kind + s.buff.tier)
    expect(forwards).toEqual(backwards)
  })

  it('never mutates the array it is given', () => {
    const buffs = [mint(1, BuffTier.Gold, 2), mint(0, BuffTier.Bronze, 1)]
    const before = [...buffs]
    heldBuffStacks(buffs)
    expect(buffs).toEqual(before)
  })
})

describe('heldBuffCount', () => {
  it('counts COPIES, not piles — two of the same card read as two cards', () => {
    const buffs = [mint(0, BuffTier.Bronze, 1), mint(0, BuffTier.Bronze, 2)]
    expect(heldBuffStacks(buffs)).toHaveLength(1)
    expect(heldBuffCount(buffs)).toBe(2)
  })

  it('is zero for an empty hand', () => {
    expect(heldBuffCount([])).toBe(0)
  })
})
