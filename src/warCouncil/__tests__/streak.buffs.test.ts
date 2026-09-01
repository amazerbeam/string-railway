import { describe, expect, it } from 'vitest'
import {
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  BuffTier,
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
  timebombTrick: false,
  timebombToPlayer: 0,
  timebombToQuarry: 0,
  blastGuarded: false,
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
