// DLR-163 AC8/AC9/AC10 — the 7's two halves, measured against the four outcomes.
//
// The axis distinction is the whole point of this file: `playerWentHigh` is the MECHANICAL axis (the
// player physically took the cards) and `treasureBonusEarned` reads the OUTCOME axis (the trick
// banked). A Low Victory earns the bonus; a High Defeat does not.
import { describe, expect, it } from 'vitest'
import { DAMAGE_PER_HIT, QUARRY_TREASURE_DAMAGE } from '../../hunt'
import { resolveTrickBank, type StreakState, type TrickFacts } from '../streak'

const STREAK: StreakState = { total: 3, roll: 3 }

const facts = (over: Partial<TrickFacts> = {}): TrickFacts => ({
  playerWentHigh: false,
  skullTrick: false,
  finalTrick: false,
  baseDamageBonus: 0,
  swanKeepsMultiplier: false,
  swanKeepsBank: false,
  buffs: null,
  treasureTrick: false,
  ...over,
})

describe('a trick that carried a Treasure', () => {
  it('AC10 — a Low Defeat costs QUARRY_TREASURE_DAMAGE, not DAMAGE_PER_HIT', () => {
    const resolved = resolveTrickBank(
      STREAK,
      facts({ treasureTrick: true, playerWentHigh: false, skullTrick: false }),
    )
    expect(resolved.damageToPlayer).toBe(QUARRY_TREASURE_DAMAGE)
  })

  it('AC10 — an eaten skull costs QUARRY_TREASURE_DAMAGE too: both are hurt tricks', () => {
    const resolved = resolveTrickBank(
      STREAK,
      facts({ treasureTrick: true, playerWentHigh: true, skullTrick: true }),
    )
    expect(resolved.damageToPlayer).toBe(QUARRY_TREASURE_DAMAGE)
  })

  it('AC8 — a High Victory reports treasureBonusEarned', () => {
    const resolved = resolveTrickBank(
      STREAK,
      facts({ treasureTrick: true, playerWentHigh: true, skullTrick: false }),
    )
    expect(resolved.treasureBonusEarned).toBe(true)
    expect(resolved.damageToPlayer).toBe(0)
  })

  it('AC8 — a Low Victory reports treasureBonusEarned: banked is banked, however it got there', () => {
    const resolved = resolveTrickBank(
      STREAK,
      facts({ treasureTrick: true, playerWentHigh: false, skullTrick: true }),
    )
    expect(resolved.treasureBonusEarned).toBe(true)
    expect(resolved.damageToPlayer).toBe(0)
  })

  it('AC8/AC9 — a hurt trick reports treasureBonusEarned false and costs 2', () => {
    // AC9's worked example, from the developer: the Quarry plays a skulled 7, the player answers
    // and TAKES the trick. Mechanically the player went HIGH; on the outcome axis it is a Defeat,
    // so there is no +1.
    const eaten = resolveTrickBank(
      STREAK,
      facts({ treasureTrick: true, playerWentHigh: true, skullTrick: true }),
    )
    expect(eaten.treasureBonusEarned).toBe(false)
    expect(eaten.damageToPlayer).toBe(QUARRY_TREASURE_DAMAGE)

    const lowDefeat = resolveTrickBank(
      STREAK,
      facts({ treasureTrick: true, playerWentHigh: false, skullTrick: false }),
    )
    expect(lowDefeat.treasureBonusEarned).toBe(false)
    expect(lowDefeat.damageToPlayer).toBe(QUARRY_TREASURE_DAMAGE)
  })

  it('a trick with no Treasure is unchanged in both respects', () => {
    const hurt = resolveTrickBank(STREAK, facts({ playerWentHigh: false, skullTrick: false }))
    expect(hurt.damageToPlayer).toBe(DAMAGE_PER_HIT)
    expect(hurt.treasureBonusEarned).toBe(false)

    const banked = resolveTrickBank(STREAK, facts({ playerWentHigh: true, skullTrick: false }))
    expect(banked.damageToPlayer).toBe(0)
    expect(banked.treasureBonusEarned).toBe(false)
  })

  it('AC10 — the Treasure REPLACES the flat hit rather than adding to it', () => {
    expect(QUARRY_TREASURE_DAMAGE).not.toBe(DAMAGE_PER_HIT + QUARRY_TREASURE_DAMAGE)
    const resolved = resolveTrickBank(
      STREAK,
      facts({ treasureTrick: true, playerWentHigh: false, skullTrick: false }),
    )
    expect(resolved.damageToPlayer).not.toBe(DAMAGE_PER_HIT + QUARRY_TREASURE_DAMAGE)
  })
})
