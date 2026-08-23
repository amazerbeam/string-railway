import { describe, expect, it } from 'vitest'
import {
  CHEAT_DURATION_TRICKS,
  TIMEBOMB_DAMAGE,
  TIMEBOMB_TIER_MULTIPLIER,
  cheatBuff,
  cheatDurationTricksOf,
  timebombBuff,
  timebombDamageOf,
} from '../buffCatalog'
import {
  ACTIVATED_BUFF_CONDITION,
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  seedStartingBuffPile,
} from '../buffs'
import { ENVENOM_PLAYER_DAMAGE, ENVENOM_QUARRY_DAMAGE } from '../config'

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

describe('TIMEBOMB_DAMAGE (AC2)', () => {
  // AC4's equivalence assertion: bronze IS today's live pair. Asserted against the CONSTANTS, not
  // against 4 and 2, so retuning the live mechanic moves this with it rather than reddening here.
  it('bronze is exactly the live Envenom pair, so the migration changes nothing', () => {
    expect(TIMEBOMB_DAMAGE[BuffTier.Bronze]).toEqual({
      quarry: ENVENOM_QUARRY_DAMAGE,
      player: ENVENOM_PLAYER_DAMAGE,
    })
  })

  it('scales BOTH sides — the reading AC2 resolves design doc §3 to', () => {
    expect(TIMEBOMB_DAMAGE[BuffTier.Gold].player).toBeGreaterThan(
      TIMEBOMB_DAMAGE[BuffTier.Bronze].player,
    )
  })

  it('holds the live 2:1 Quarry-to-player ratio at every tier', () => {
    for (const tier of Object.values(BuffTier)) {
      const row = TIMEBOMB_DAMAGE[tier]
      expect(row.quarry * ENVENOM_PLAYER_DAMAGE).toBe(row.player * ENVENOM_QUARRY_DAMAGE)
    }
  })

  it('is the tier multiplier applied to both of the live figures', () => {
    for (const tier of Object.values(BuffTier)) {
      expect(TIMEBOMB_DAMAGE[tier]).toEqual({
        quarry: ENVENOM_QUARRY_DAMAGE * TIMEBOMB_TIER_MULTIPLIER[tier],
        player: ENVENOM_PLAYER_DAMAGE * TIMEBOMB_TIER_MULTIPLIER[tier],
      })
    }
  })

  it('every figure is a whole number of health points', () => {
    for (const tier of Object.values(BuffTier)) {
      expect(Number.isInteger(TIMEBOMB_DAMAGE[tier].quarry)).toBe(true)
      expect(Number.isInteger(TIMEBOMB_DAMAGE[tier].player)).toBe(true)
    }
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

describe('timebombBuff (AC2)', () => {
  it('mints a Timebomb buff whose reward carries the Quarry-side figure', () => {
    expect(timebombBuff(BuffTier.Silver, 3)).toEqual({
      id: 3,
      kind: BuffKind.Timebomb,
      tier: BuffTier.Silver,
      condition: ACTIVATED_BUFF_CONDITION,
      reward: { axis: BuffRewardAxis.Magnitude, value: TIMEBOMB_DAMAGE[BuffTier.Silver].quarry },
    })
  })

  it('bronze owes exactly the live pair (AC4)', () => {
    expect(timebombDamageOf(timebombBuff(BuffTier.Bronze, 1))).toEqual({
      quarry: ENVENOM_QUARRY_DAMAGE,
      player: ENVENOM_PLAYER_DAMAGE,
    })
  })
})

describe('the readers refuse a buff of the wrong kind rather than answering', () => {
  it('cheatDurationTricksOf throws on a Timebomb', () => {
    expect(() => cheatDurationTricksOf(timebombBuff(BuffTier.Bronze, 1))).toThrow(RangeError)
  })

  it('cheatDurationTricksOf throws on a placeholder seed', () => {
    const [placeholder] = seedStartingBuffPile(1, 1)
    expect(() => cheatDurationTricksOf(placeholder)).toThrow(RangeError)
  })

  it('timebombDamageOf throws on a Cheat', () => {
    expect(() => timebombDamageOf(cheatBuff(BuffTier.Bronze, 1))).toThrow(RangeError)
  })

  it('names the kind it was actually given, so the message identifies the caller bug', () => {
    expect(() => timebombDamageOf(cheatBuff(BuffTier.Bronze, 1))).toThrow(/cheat/)
  })
})

describe('nothing in this ticket puts a gold Cheat on a player-reachable path', () => {
  // The ticket's own Dependencies & Risks: gold Cheat needs a costing pass before it ships. Nothing
  // activates a buff yet, and the run's opening pile is still all-bronze placeholder content.
  it('the run-seeding path still mints only bronze, unassigned buffs', () => {
    expect(
      seedStartingBuffPile(4, 1).every(
        (b) => b.tier === BuffTier.Bronze && b.kind === BuffKind.Unassigned,
      ),
    ).toBe(true)
  })
})
