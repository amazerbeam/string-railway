import { describe, expect, it } from 'vitest'
import {
  CHEAT_DURATION_TRICKS,
  cheatBuff,
  cheatDurationTricksOf,
  shieldBuff,
  shieldHeartsOf,
  wildcardBuff,
} from '../buffCatalog'
import {
  ACTIVATED_BUFF_CONDITION,
  buffIsWild,
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  UNASSIGNED_BUFF_CONDITION,
  UNASSIGNED_BUFF_REWARD,
} from '../buffs'
import { isPricedBuff } from '../buffActivation'
import { startRun } from '../run'

describe('CHEAT_DURATION_TRICKS (AC1)', () => {
  it('is the transcribed 1 / 2 / 3 table', () => {
    expect(CHEAT_DURATION_TRICKS[BuffTier.Bronze]).toBe(1)
    expect(CHEAT_DURATION_TRICKS[BuffTier.Silver]).toBe(2)
    expect(CHEAT_DURATION_TRICKS[BuffTier.Gold]).toBe(3)
  })

  it('escalates strictly with tier, so a higher tier is never worse', () => {
    expect(CHEAT_DURATION_TRICKS[BuffTier.Silver]).toBeGreaterThan(
      CHEAT_DURATION_TRICKS[BuffTier.Bronze],
    )
    expect(CHEAT_DURATION_TRICKS[BuffTier.Gold]).toBeGreaterThan(
      CHEAT_DURATION_TRICKS[BuffTier.Silver],
    )
  })
})
describe('cheatBuff (AC1)', () => {
  it('mints a Cheat buff whose reward is a DURATION, not a magnitude', () => {
    expect(cheatBuff(BuffTier.Gold, 7)).toEqual({
      id: 7,
      kind: BuffKind.Cheat,
      tier: BuffTier.Gold,
      condition: ACTIVATED_BUFF_CONDITION,
      reward: { axis: BuffRewardAxis.DurationTricks, value: CHEAT_DURATION_TRICKS[BuffTier.Gold] },
    })
  })

  it('bronze grants one trick — the single-card behaviour shipping today (AC1/AC4)', () => {
    expect(cheatDurationTricksOf(cheatBuff(BuffTier.Bronze, 1))).toBe(1)
  })
})

describe('the readers refuse a buff of the wrong kind rather than answering', () => {
  it('cheatDurationTricksOf throws on a Shield', () => {
    expect(() => cheatDurationTricksOf(shieldBuff(BuffTier.Bronze, 1))).toThrow(RangeError)
  })

  it('cheatDurationTricksOf throws on the unassigned sentinel (DLR-135: nothing mints it now)', () => {
    const placeholder = {
      id: 1,
      kind: BuffKind.Unassigned,
      tier: BuffTier.Bronze,
      condition: UNASSIGNED_BUFF_CONDITION,
      reward: UNASSIGNED_BUFF_REWARD,
    }
    expect(() => cheatDurationTricksOf(placeholder)).toThrow(RangeError)
  })

  it('shieldHeartsOf throws on a Cheat', () => {
    expect(() => shieldHeartsOf(cheatBuff(BuffTier.Bronze, 1))).toThrow(RangeError)
  })

  it('names the kind it was actually given, so the message identifies the caller bug', () => {
    expect(() => shieldHeartsOf(cheatBuff(BuffTier.Bronze, 1))).toThrow(/cheat/)
  })
})

describe('shieldBuff (DLR-110)', () => {
  it('mints a Shield on the heartCount axis with the caller’s id and the activated condition', () => {
    const buff = shieldBuff(BuffTier.Silver, 7)
    expect(buff.kind).toBe(BuffKind.Shield)
    expect(buff.id).toBe(7)
    expect(buff.tier).toBe(BuffTier.Silver)
    expect(buff.condition).toBe(ACTIVATED_BUFF_CONDITION)
    expect(buff.reward.axis).toBe(BuffRewardAxis.HeartCount)
  })

  it('AC2 — carries the tier’s blue-heart count, 1 / 2 / 3', () => {
    expect(shieldBuff(BuffTier.Bronze, 1).reward.value).toBe(1)
    expect(shieldBuff(BuffTier.Silver, 2).reward.value).toBe(2)
    expect(shieldBuff(BuffTier.Gold, 3).reward.value).toBe(3)
  })
})

describe('shieldHeartsOf (DLR-110)', () => {
  it('reads back the figure the buff was minted with, at every tier', () => {
    expect(shieldHeartsOf(shieldBuff(BuffTier.Bronze, 1))).toBe(1)
    expect(shieldHeartsOf(shieldBuff(BuffTier.Silver, 2))).toBe(2)
    expect(shieldHeartsOf(shieldBuff(BuffTier.Gold, 3))).toBe(3)
  })

  it('throws on a Cheat rather than granting a shield off the wrong card', () => {
    expect(() => shieldHeartsOf(cheatBuff(BuffTier.Gold, 1))).toThrow(RangeError)
    expect(() => shieldHeartsOf(cheatBuff(BuffTier.Gold, 1))).toThrow(/cheat/)
  })

  it('throws on a Cheat', () => {
    expect(() => shieldHeartsOf(cheatBuff(BuffTier.Gold, 2))).toThrow(RangeError)
    expect(() => shieldHeartsOf(cheatBuff(BuffTier.Gold, 2))).toThrow(/cheat/)
  })
})

describe('nothing in this ticket puts a gold Cheat on a player-reachable path', () => {
  // The ticket's own Dependencies & Risks: gold Cheat needs a costing pass before it ships. The
  // run's opening pile is real bronze content now (DLR-135), not placeholder content.
  it('the run-seeding path mints only BRONZE — no gold Cheat reaches a player (DLR-135)', () => {
    const pile = startRun().buffs
    expect(pile.every((b) => b.tier === BuffTier.Bronze)).toBe(true)
    expect(pile.every((b) => b.kind !== BuffKind.Unassigned)).toBe(true)
    expect(pile.every((b) => isPricedBuff(b))).toBe(true)
  })
})

describe('wildcardBuff (DLR-162)', () => {
  it('mints an activated card with no condition and no reward, at the caller id and tier', () => {
    const card = wildcardBuff(BuffTier.Silver, 77)
    expect(card).toEqual({
      id: 77,
      kind: BuffKind.Wildcard,
      tier: BuffTier.Silver,
      condition: ACTIVATED_BUFF_CONDITION,
      reward: { axis: BuffRewardAxis.None, value: 0 },
    })
  })

  it('is not itself wild - it is the card you spend, not a card made wild by one', () => {
    expect(buffIsWild(wildcardBuff(BuffTier.Bronze, 1))).toBe(false)
  })

  it('carries the tier it was dealt at every rung', () => {
    for (const tier of [BuffTier.Bronze, BuffTier.Silver, BuffTier.Gold]) {
      expect(wildcardBuff(tier, 1).tier).toBe(tier)
    }
  })
})
