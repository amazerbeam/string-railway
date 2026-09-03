import { describe, expect, it } from 'vitest'
import {
  BuffKind,
  BuffTier,
  mintFromTemplate,
  templatesForFamily,
  type Buff,
  type MintableConditionKind,
} from '../../../hunt'
import { deadBuffReasonText, deadBuffsFor } from '../resolutionDeadBuffs'

// DLR-160 AC3 — buffs minted through `mintFromTemplate`, never hand-built `Buff` literals, so the
// fixtures cannot drift from the real minted shape. Feeder is used deliberately: its condition is
// `!playerWon && suit matches`, with no skull term at all (`CLAUDE.md`'s win/lose axis note) — this
// module must not "correct" that while composing a reason.

function mint(kind: MintableConditionKind, id: number): Buff {
  const [template] = templatesForFamily(kind)
  return mintFromTemplate(template, BuffTier.Bronze, id)
}

describe('deadBuffsFor', () => {
  it('excludes a buff that was armed and fired', () => {
    const buff = mint(BuffKind.Taker, 1)
    expect(deadBuffsFor([buff.id], [buff.id], [buff])).toEqual([])
  })

  it('returns a buff that was armed and did not fire', () => {
    const buff = mint(BuffKind.Feeder, 2)
    expect(deadBuffsFor([buff.id], [], [buff])).toEqual([buff])
  })

  it('drops an armed id with no matching Buff in candidates, rather than yielding undefined', () => {
    const buff = mint(BuffKind.Feeder, 3)
    expect(deadBuffsFor([buff.id], [], [])).toEqual([])
  })

  it('returns an empty array for an empty armed list', () => {
    const buff = mint(BuffKind.Taker, 4)
    expect(deadBuffsFor([], [], [buff])).toEqual([])
  })
})

describe('deadBuffReasonText', () => {
  it('names the buff and its condition sentence', () => {
    const buff = mint(BuffKind.Feeder, 5)
    const text = deadBuffReasonText(buff)
    expect(text).toContain('Feeder')
    expect(text).toContain('lose a trick')
  })
})
