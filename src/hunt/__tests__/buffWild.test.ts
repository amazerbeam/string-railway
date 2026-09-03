import { describe, expect, it } from 'vitest'
import {
  buffIsWild,
  buffTargetSuitOf,
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  type Buff,
  type BuffId,
} from '../buffs'
import { cheatBuff, wildcardBuff } from '../buffCatalog'
import { mintFromTemplate, templateById } from '../buffTemplates'
import { startRun } from '../run'
import {
  WildRefusal,
  isWildcardCard,
  mintWildAtTier,
  spendWildcard,
  wildRefusalFor,
  wildenedBuff,
} from '../buffWild'

/** Mints a REAL template, never a hand-built `Buff` literal — so a future field on `Buff` cannot
 *  leave this spec constructing a shape production never produces. */
function fromTemplate(id: string, tier: BuffTier, buffId: BuffId): Buff {
  const template = templateById(id)
  if (template === undefined) throw new Error(`No template for id '${id}'`)
  return mintFromTemplate(template, tier, buffId)
}

function bellTaker(tier: BuffTier, id: BuffId): Buff {
  return fromTemplate('taker:bells:magnitude', tier, id)
}

function sidestep(tier: BuffTier, id: BuffId): Buff {
  return fromTemplate('sidestep:magnitude', tier, id)
}

describe('wildRefusalFor (DLR-162 AC5)', () => {
  it('allows a suit-specific card', () => {
    expect(wildRefusalFor(bellTaker(BuffTier.Bronze, 1))).toBeNull()
  })
  it('refuses a card that names no suit — Sidestep needs nothing in return', () => {
    expect(wildRefusalFor(sidestep(BuffTier.Bronze, 2))).toBe(WildRefusal.NoSuit)
  })
  it('refuses an already-wild card — there is no second suit to take off', () => {
    expect(wildRefusalFor(wildenedBuff(bellTaker(BuffTier.Bronze, 3)))).toBe(
      WildRefusal.AlreadyWild,
    )
  })
  it('refuses an activated card, which names no suit either', () => {
    expect(wildRefusalFor(cheatBuff(BuffTier.Bronze, 4))).toBe(WildRefusal.NoSuit)
  })
  it('refuses a wildcard being spent on another wildcard', () => {
    expect(wildRefusalFor(wildcardBuff(BuffTier.Bronze, 5))).toBe(WildRefusal.NoSuit)
  })
})

describe('isWildcardCard', () => {
  it('is true for the spendable card and false for a card made wild by one', () => {
    expect(isWildcardCard(wildcardBuff(BuffTier.Bronze, 1))).toBe(true)
    expect(isWildcardCard(wildenedBuff(bellTaker(BuffTier.Bronze, 2)))).toBe(false)
    expect(isWildcardCard(bellTaker(BuffTier.Bronze, 3))).toBe(false)
  })
})

describe('wildenedBuff (AC2, AC4)', () => {
  it('keeps the id, kind, tier and reward, and drops only the suit', () => {
    const before = bellTaker(BuffTier.Silver, 9)
    const after = wildenedBuff(before)
    expect(after.id).toBe(before.id)
    expect(after.kind).toBe(before.kind)
    expect(after.tier).toBe(before.tier)
    expect(after.reward).toEqual(before.reward)
    expect(buffTargetSuitOf(after)).toBeNull()
    expect(buffIsWild(after)).toBe(true)
  })
})

describe('spendWildcard (AC4)', () => {
  it('removes the wildcard, keeps the target as the same card made wild, and does not advance nextBuffId', () => {
    const run = {
      ...startRun(),
      buffs: [wildcardBuff(BuffTier.Bronze, 1), bellTaker(BuffTier.Bronze, 2)],
      nextBuffId: 3,
    }
    const next = spendWildcard(run, 1, 2)
    expect(next.buffs.map((b) => b.id)).toEqual([2])
    expect(buffIsWild(next.buffs[0])).toBe(true)
    expect(next.nextBuffId).toBe(3)
  })

  it('converts exactly ONE card — a second held copy of the target is untouched', () => {
    const run = {
      ...startRun(),
      buffs: [
        wildcardBuff(BuffTier.Bronze, 1),
        bellTaker(BuffTier.Bronze, 2),
        bellTaker(BuffTier.Bronze, 3),
      ],
      nextBuffId: 4,
    }
    const next = spendWildcard(run, 1, 2)
    expect(next.buffs.filter((b) => buffIsWild(b)).map((b) => b.id)).toEqual([2])
    expect(next.buffs.filter((b) => !buffIsWild(b)).map((b) => b.id)).toEqual([3])
  })

  it('THROWS naming the refusal rather than returning the run unchanged', () => {
    const run = {
      ...startRun(),
      buffs: [wildcardBuff(BuffTier.Bronze, 1), sidestep(BuffTier.Bronze, 2)],
      nextBuffId: 3,
    }
    expect(() => spendWildcard(run, 1, 2)).toThrow(RangeError)
  })

  it('THROWS when the spent card is not a wildcard, or is not in the pile at all', () => {
    const run = {
      ...startRun(),
      buffs: [bellTaker(BuffTier.Bronze, 1), bellTaker(BuffTier.Bronze, 2)],
      nextBuffId: 3,
    }
    expect(() => spendWildcard(run, 1, 2)).toThrow(RangeError)
    expect(() => spendWildcard(run, 99, 2)).toThrow(RangeError)
  })
})

describe('mintWildAtTier', () => {
  it('reads the same reward ladder mintFromTemplate reads', () => {
    const card = mintWildAtTier(BuffKind.Taker, BuffRewardAxis.Magnitude, BuffTier.Gold, 50)
    expect(card.reward).toEqual({ axis: BuffRewardAxis.Magnitude, value: 5 })
    expect(buffIsWild(card)).toBe(true)
  })

  it('THROWS on an axis with no ladder rather than minting a zero-value card', () => {
    expect(() => mintWildAtTier(BuffKind.Taker, BuffRewardAxis.None, BuffTier.Bronze, 1)).toThrow(
      RangeError,
    )
  })
})
