import { describe, expect, it } from 'vitest'
import {
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  BuffTier,
  DAMAGE_PER_HIT,
  EMPTY_BUFF_CARRY,
  mintFromTemplate,
  startHandAccrual,
  templateById,
  type Buff,
  type BuffTrickInput,
} from '../../hunt'
import { resolveTrickBank, type TrickFacts } from '../streak'

const buff = (id: string, tier: BuffTier, buffId: number): Buff =>
  mintFromTemplate(templateById(id)!, tier, buffId)

const HAND = {
  playerSuits: [BuffTargetSuit.Bells],
  playerRanks: [] as readonly number[],
  remainingSuits: [] as readonly BuffTargetSuit[],
  tricksWithoutHit: 0,
  coins: 0,
  playerHealth: 20,
  applyDamagePressed: false,
}

const input = (over: Partial<BuffTrickInput> = {}): BuffTrickInput => ({
  active: [],
  accrual: startHandAccrual(),
  firedThisHand: [],
  hand: HAND,
  ...over,
})

const facts = (over: Partial<TrickFacts> = {}): TrickFacts => ({
  playerWon: false,
  skullTrick: false,
  finalTrick: false,
  baseDamageBonus: 0,
  swanKeepsMultiplier: false,
  swanKeepsBank: false,
  buffs: null,
  ...over,
})

describe('resolveTrickBank — DLR-125/DLR-124 R5/R6 at resolution level', () => {
  it('R5 — three buffs firing on one trick still accrue the hand-long axes (coins, AP) plus the Overlap Bonus', () => {
    const magnitude = buff('taker:bells:magnitude', BuffTier.Bronze, 1)
    const momentum = buff('taker:bells:multiplier', BuffTier.Bronze, 2)
    // `MintableRewardAxis` narrowed Taker to Magnitude/Multiplier (DLR-145) — Coins stays on
    // `BuffRewardAxis` with its `REWARD_TIER_VALUE` ladder, so it is built directly as a `Buff`
    // literal rather than through `templateById('taker:bells:coins')`, which is now orphaned.
    const coins: Buff = {
      id: 3,
      kind: BuffKind.Taker,
      tier: BuffTier.Bronze,
      condition: { kind: BuffKind.Taker, target: { suit: BuffTargetSuit.Bells } },
      reward: { axis: BuffRewardAxis.Coins, value: 2 },
    }
    const r = resolveTrickBank(
      { total: 0, roll: 0 },
      facts({
        playerWon: true,
        buffs: input({ active: [magnitude, momentum, coins] }),
      }),
    )
    // R5 — max(0, 3 - 1) = 2. DLR-156 moved the DAMAGE axes off this accrual and onto
    // `trickDamage` (pinned in `streak.formula.test.ts`); the coins axis and the Overlap Bonus's
    // contribution to `buffAccrual` are untouched by that move.
    expect(r.buffAccrual?.coinBonus).toBe(2)
    expect(r.buffAccrual?.flatDamageBonus).toBe(1)
    expect(r.buffAccrual?.multiplierBonus).toBe(2 + 2)
    // DLR-156 AC1/AC11 — the trick's OWN damage comes from `trickDamage`, not the accrual.
    expect(r.trickDamage?.buffDamage).toBe(1)
    expect(r.trickDamage?.overlapBonus).toBe(2)
    expect(r.trickDamage?.buffMult).toBe(1 + 2 + 2)
  })

  it('a null `buffs` fact reproduces the bare-rule figures exactly', () => {
    const withBuffs = resolveTrickBank(
      { total: 2, roll: 2 },
      facts({ playerWon: true, finalTrick: true, buffs: null }),
    )
    const bare = resolveTrickBank(
      { total: 2, roll: 2 },
      facts({ playerWon: true, finalTrick: true }),
    )
    expect(withBuffs).toEqual(bare)
    expect(withBuffs.total).toBe(3) // 2 + BASE_DAMAGE
    expect(withBuffs.roll).toBe(3)
    expect(withBuffs.cashOut).toBe(0) // AC8 — nothing cashes at hand end any more
    expect(withBuffs.buffAccrual).toBeNull()
    expect(withBuffs.firedBuffIds).toEqual([])
  })

  it('DLR-150 — a Bells Feeder on a clean loss carries and the trick still pays nothing (AC7)', () => {
    const feeder: Buff = {
      id: 9,
      kind: BuffKind.Feeder,
      tier: BuffTier.Bronze,
      condition: { kind: BuffKind.Feeder, target: { suit: BuffTargetSuit.Bells } },
      reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
    }
    const bare = resolveTrickBank({ total: 0, roll: 0 }, facts({ playerWon: false }))
    const withFeeder = resolveTrickBank(
      { total: 0, roll: 0 },
      facts({ playerWon: false, buffs: input({ active: [feeder] }) }),
    )
    expect(withFeeder.buffAccrual?.carryOut.flatDamageBonus).toBe(1)
    expect(withFeeder.cashOut).toBe(bare.cashOut)
    expect(withFeeder.trickDamage).toBeNull()
  })

  it('DLR-150 — the same card on a dodge pays this hand and leaves carryOut empty', () => {
    const feeder: Buff = {
      id: 9,
      kind: BuffKind.Feeder,
      tier: BuffTier.Bronze,
      condition: { kind: BuffKind.Feeder, target: { suit: BuffTargetSuit.Bells } },
      reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
    }
    const r = resolveTrickBank(
      { total: 0, roll: 0 },
      facts({ playerWon: false, skullTrick: true, buffs: input({ active: [feeder] }) }),
    )
    expect(r.buffAccrual?.carryOut).toEqual(EMPTY_BUFF_CARRY)
    expect(r.buffAccrual?.flatDamageBonus).toBe(1)
    // AC11 — the SAME Feeder also pays this trick's own damage, since a Dodge is banked.
    expect(r.trickDamage?.buffDamage).toBe(1)
  })
})

describe('resolveTrickBank — DLR-161 the reset block keeps a protected figure', () => {
  describe('regression — the de-nesting is behaviour-neutral for every existing Swan case', () => {
    it('neither rung: both figures zero on a clean loss', () => {
      const r = resolveTrickBank(
        { total: 8, roll: 2 },
        facts({ playerWon: false, skullTrick: false }),
      )
      expect(r.total).toBe(0)
      expect(r.roll).toBe(0)
      expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    })

    it('silver only: the roll survives, the total zeroes', () => {
      const r = resolveTrickBank(
        { total: 8, roll: 2 },
        facts({ playerWon: false, skullTrick: false, swanKeepsMultiplier: true }),
      )
      expect(r.total).toBe(0)
      expect(r.roll).toBe(2)
      expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    })

    it('gold only, and gold-implies-silver: both figures survive', () => {
      const r = resolveTrickBank(
        { total: 8, roll: 2 },
        facts({ playerWon: false, skullTrick: false, swanKeepsBank: true }),
      )
      expect(r.total).toBe(8)
      expect(r.roll).toBe(2)
      expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    })

    it('gold-implies-silver holds even when only swanKeepsBank is set (no separate silver flag)', () => {
      const r = resolveTrickBank(
        { total: 8, roll: 2 },
        facts({
          playerWon: false,
          skullTrick: false,
          swanKeepsBank: true,
          swanKeepsMultiplier: false,
        }),
      )
      expect(r.total).toBe(8)
      expect(r.roll).toBe(2)
    })
  })

  describe('new — a Skull Helmet or Skull Tether on a skull the player took', () => {
    const START = { total: 8, roll: 2 }
    const skullTaken = (over: Partial<TrickFacts> = {}) =>
      facts({ playerWon: true, skullTrick: true, ...over })

    it('a bronze Helmet keeps the total, zeroes the roll', () => {
      const helmet = buff('skullHelmet:protection', BuffTier.Bronze, 1)
      const r = resolveTrickBank(
        START,
        skullTaken({ buffs: input({ active: [helmet] }) }),
      )
      expect(r.total).toBe(8)
      expect(r.roll).toBe(0)
      expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    })

    it('a bronze Tether keeps the roll, zeroes the total', () => {
      const tether = buff('skullTether:protection', BuffTier.Bronze, 1)
      const r = resolveTrickBank(
        START,
        skullTaken({ buffs: input({ active: [tether] }) }),
      )
      expect(r.total).toBe(0)
      expect(r.roll).toBe(2)
      expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    })

    it('both bronze together keep both figures, unchanged', () => {
      const helmet = buff('skullHelmet:protection', BuffTier.Bronze, 1)
      const tether = buff('skullTether:protection', BuffTier.Bronze, 2)
      const r = resolveTrickBank(
        START,
        skullTaken({ buffs: input({ active: [helmet, tether] }) }),
      )
      expect(r.total).toBe(8)
      expect(r.roll).toBe(2)
      expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    })

    it('both gold add their +1 to each surviving figure', () => {
      const helmet = buff('skullHelmet:protection', BuffTier.Gold, 1)
      const tether = buff('skullTether:protection', BuffTier.Gold, 2)
      const r = resolveTrickBank(
        START,
        skullTaken({ buffs: input({ active: [helmet, tether] }) }),
      )
      expect(r.total).toBe(9)
      expect(r.roll).toBe(3)
      expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    })

    it('AC8 — two gold Helmets do not stack: +1, not +2', () => {
      const helmetA = buff('skullHelmet:protection', BuffTier.Gold, 1)
      const helmetB = buff('skullHelmet:protection', BuffTier.Gold, 2)
      const r = resolveTrickBank(
        START,
        skullTaken({ buffs: input({ active: [helmetA, helmetB] }) }),
      )
      expect(r.total).toBe(9)
      expect(r.roll).toBe(0)
      expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    })

    it('AC5 — a silver Helmet also protects on a clean loss', () => {
      const helmet = buff('skullHelmet:protection', BuffTier.Silver, 1)
      const r = resolveTrickBank(
        START,
        facts({ playerWon: false, skullTrick: false, buffs: input({ active: [helmet] }) }),
      )
      expect(r.total).toBe(8)
      expect(r.roll).toBe(0)
      expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    })

    it('a bronze Helmet does NOT protect on the same clean loss', () => {
      const helmet = buff('skullHelmet:protection', BuffTier.Bronze, 1)
      const r = resolveTrickBank(
        START,
        facts({ playerWon: false, skullTrick: false, buffs: input({ active: [helmet] }) }),
      )
      expect(r.total).toBe(0)
      expect(r.roll).toBe(0)
      expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    })

    it('a gold Helmet does not fire and cannot protect a clean win, which banks anyway', () => {
      const helmet = buff('skullHelmet:protection', BuffTier.Gold, 1)
      const r = resolveTrickBank(
        { total: 0, roll: 0 },
        facts({ playerWon: true, skullTrick: false, buffs: input({ active: [helmet] }) }),
      )
      // A clean win banks; the reset block is never reached.
      expect(r.damageToPlayer).toBe(0)
      expect(r.total).toBeGreaterThan(0)
      expect(r.roll).toBe(1)
    })

    it('a gold Tether does not fire and cannot protect a dodge, which banks anyway', () => {
      const tether = buff('skullTether:protection', BuffTier.Gold, 1)
      const r = resolveTrickBank(
        { total: 0, roll: 0 },
        facts({ playerWon: false, skullTrick: true, buffs: input({ active: [tether] }) }),
      )
      // A dodge banks; the reset block is never reached.
      expect(r.damageToPlayer).toBe(0)
      expect(r.total).toBeGreaterThan(0)
      expect(r.roll).toBe(1)
    })
  })
})
