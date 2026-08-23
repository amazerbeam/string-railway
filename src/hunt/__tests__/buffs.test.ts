import { describe, expect, it } from 'vitest'
import {
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  UNASSIGNED_BUFF_CONDITION,
  UNASSIGNED_BUFF_REWARD,
  seedStartingBuffPile,
} from '../buffs'

describe('seedStartingBuffPile', () => {
  it('mints `count` buffs with consecutive ids from `firstId`, all bronze (AC1/AC3)', () => {
    const pile = seedStartingBuffPile(2, 1)
    expect(pile).toEqual([
      {
        id: 1,
        kind: BuffKind.Unassigned,
        tier: BuffTier.Bronze,
        condition: UNASSIGNED_BUFF_CONDITION,
        reward: UNASSIGNED_BUFF_REWARD,
      },
      {
        id: 2,
        kind: BuffKind.Unassigned,
        tier: BuffTier.Bronze,
        condition: UNASSIGNED_BUFF_CONDITION,
        reward: UNASSIGNED_BUFF_REWARD,
      },
    ])
  })

  it('seeds nothing for 0 rather than throwing', () => {
    expect(seedStartingBuffPile(0, 1)).toEqual([])
  })

  it('starts ids at `firstId`, not always 1', () => {
    expect(seedStartingBuffPile(1, 7)).toEqual([
      {
        id: 7,
        kind: BuffKind.Unassigned,
        tier: BuffTier.Bronze,
        condition: UNASSIGNED_BUFF_CONDITION,
        reward: UNASSIGNED_BUFF_REWARD,
      },
    ])
  })

  it('the reward axis is a value from the three known axes (AC1)', () => {
    expect(Object.values(BuffRewardAxis)).toEqual(['magnitude', 'durationTricks', 'heartCount'])
  })

  it('seeds placeholder content as `unassigned`, never as a real card (DLR-107)', () => {
    expect(Object.values(BuffKind)).toEqual(['unassigned', 'cheat', 'timebomb'])
    expect(seedStartingBuffPile(3, 1).every((b) => b.kind === BuffKind.Unassigned)).toBe(true)
  })
})
