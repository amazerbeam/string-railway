import { describe, expect, it } from 'vitest'
import {
  accrueAxisBonus,
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  BuffTier,
  DuelSide,
  EMPTY_BUFF_ACCRUAL,
  EMPTY_BUFF_CARRY,
  mintFromTemplate,
  startEncounter,
  startHandAccrual,
  templateById,
  type Buff,
  type BuffTrickInput,
} from '../../hunt'
// DLR-125 Task 8 — `applyResolution` is the app layer's fold, and this is the ONE test in
// `src/warCouncil/` allowed to reach for it: it is the resolution-level proof the whole ticket
// exists for, that an activated buff genuinely changes what `applyResolution` deals, and no
// production module in this tree imports it — only this spec does.
import { applyResolution } from '../../app/warCouncil/commitHandlers'
import { forcedCashValue, resolveTrickBank, type BankState, type TrickFacts } from '../bank'

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
  bankClimbBonus: 0,
  swanKeepsMultiplier: false,
  swanKeepsBank: false,
  buffs: null,
  ...over,
})

describe('resolveTrickBank — DLR-125/DLR-124 R3 at resolution level', () => {
  // Both of these tests build the accrual directly with `active: []` rather than through two
  // firing buffs: two buffs firing on the SAME trick also draws R5's Overlap Bonus (already
  // proven in the "R5" case below), which would fold an extra +1 multiplier into these figures
  // and obscure the thing under test — R3's ORDER, not R5's stacking arithmetic.

  it('R3 — Momentum is inside the product and Blade is outside it', () => {
    // A bronze Momentum (+2, multiplier axis) and a bronze Blade (+1, magnitude axis), already
    // accrued. `before` is {bank: 2, multiplier: 2}; this CleanWin trick banks one more (bonus
    // 0), reaching {bank: 3, multiplier: 3} BEFORE the final-trick cash-out — the figure the
    // worked example names.
    const accrued = accrueAxisBonus(
      accrueAxisBonus(startHandAccrual(), BuffRewardAxis.Multiplier, 2),
      BuffRewardAxis.Magnitude,
      1,
    )
    const before: BankState = { bank: 2, multiplier: 2 }
    const r = resolveTrickBank(
      before,
      facts({
        playerWon: true,
        finalTrick: true,
        buffs: input({ accrual: accrued }),
      }),
    )
    // Inside-the-product: (3) x (3 + 2) = 15, then + 1 flat = 16. If Blade were folded into the
    // multiplier INSIDE the product instead of added after it, the figure would be
    // 3 x (3 + 2 + 1) = 18 — the exact confusion the cost model's price gap
    // (`v1-buff-card-list.md`) depends on not happening. 16, not 18, pins R3's order.
    expect(r.cashOut).toBe(16)
  })

  it("R3 step 4 lands AFTER §7's two-thirds floor on a forced cash-out", () => {
    // The same +2 Momentum / +1 Blade accrual, but this trick is a hit — the FORCED cash-out,
    // not the end-of-hand fold.
    const accrued = accrueAxisBonus(
      accrueAxisBonus(startHandAccrual(), BuffRewardAxis.Multiplier, 2),
      BuffRewardAxis.Magnitude,
      1,
    )
    const before: BankState = { bank: 3, multiplier: 3 }
    const r = resolveTrickBank(
      before,
      facts({
        playerWon: false,
        skullTrick: false,
        buffs: input({ accrual: accrued }),
      }),
    )
    // forcedCashValue(3, 3 + 2) = floor(15 x 2/3) = 10, THEN + 1 flat = 11. Folding Blade into
    // the multiplier before flooring would instead read forcedCashValue(3, 3 + 2 + 1) =
    // floor(18 x 2/3) = 12 — a different, wrong figure, which is what pins the order.
    expect(r.cashOut).toBe(11)
    expect(forcedCashValue(3, 3 + 2 + 1)).toBe(12)
  })

  it('R6 — the flat pool pays once across a forced cash-out and the end-of-hand fold', () => {
    const accrued = accrueAxisBonus(startHandAccrual(), BuffRewardAxis.Magnitude, 5)
    const forced = resolveTrickBank(
      { bank: 3, multiplier: 3 },
      facts({ buffs: input({ accrual: accrued }) }),
    )
    // forcedCashValue(3, 3) = 6, plus the whole flat pool of 5, once.
    expect(forced.cashOut).toBe(forcedCashValue(3, 3) + 5)
    expect(forced.buffAccrual?.flatDamagePaid).toBe(5)

    const foldedIn = resolveTrickBank(
      { bank: forced.bank, multiplier: forced.multiplier },
      facts({
        playerWon: true,
        finalTrick: true,
        buffs: input({ accrual: forced.buffAccrual ?? EMPTY_BUFF_ACCRUAL }),
      }),
    )
    // The pool is already spent — the second cash-out pays only the bare climb, not the flat 5
    // again. bank 0 -> bankAdded 1, multiplier 0 -> 1, so cashValue(1, 1) = 1.
    expect(foldedIn.cashOut).toBe(1)
  })

  it('R5 — three buffs firing on one trick add +2 Momentum from the Overlap Bonus', () => {
    const magnitude = buff('taker:bells:magnitude', BuffTier.Bronze, 1)
    const multiplier = buff('taker:bells:multiplier', BuffTier.Bronze, 2)
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
      { bank: 0, multiplier: 0 },
      facts({
        playerWon: true,
        buffs: input({ active: [magnitude, multiplier, coins] }),
      }),
    )
    // R5 — max(0, 3 - 1) = 2, drawn from the same multiplier pool the Momentum card draws from.
    expect(r.buffAccrual?.flatDamageBonus).toBe(1)
    expect(r.buffAccrual?.coinBonus).toBe(2)
    expect(r.buffAccrual?.multiplierBonus).toBe(2 + 2)
  })

  it('a null `buffs` fact reproduces the pre-DLR-125 figures exactly', () => {
    const withBuffs = resolveTrickBank(
      { bank: 2, multiplier: 2 },
      facts({ playerWon: true, finalTrick: true, buffs: null }),
    )
    const bare = resolveTrickBank(
      { bank: 2, multiplier: 2 },
      facts({ playerWon: true, finalTrick: true }),
    )
    expect(withBuffs).toEqual(bare)
    expect(withBuffs.cashOut).toBe(9) // (2+1) x (2+1) = 9, the pre-DLR-125 figure
    expect(withBuffs.buffAccrual).toBeNull()
    expect(withBuffs.firedBuffIds).toEqual([])
  })

  it('DLR-150 — a Bells Feeder on a clean loss carries and pays nothing this trick', () => {
    const feeder: Buff = {
      id: 9,
      kind: BuffKind.Feeder,
      tier: BuffTier.Bronze,
      condition: { kind: BuffKind.Feeder, target: { suit: BuffTargetSuit.Bells } },
      reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
    }
    const bare = resolveTrickBank({ bank: 0, multiplier: 0 }, facts({ playerWon: false }))
    const withFeeder = resolveTrickBank(
      { bank: 0, multiplier: 0 },
      facts({ playerWon: false, buffs: input({ active: [feeder] }) }),
    )
    expect(withFeeder.buffAccrual?.carryOut.flatDamageBonus).toBe(1)
    expect(withFeeder.cashOut).toBe(bare.cashOut)
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
      { bank: 0, multiplier: 0 },
      facts({ playerWon: false, skullTrick: true, buffs: input({ active: [feeder] }) }),
    )
    expect(r.buffAccrual?.carryOut).toEqual(EMPTY_BUFF_CARRY)
    expect(r.buffAccrual?.flatDamageBonus).toBe(1)
  })

  it('an activated Bell-Taker (Blade) genuinely increases the damage applyResolution deals', () => {
    const encounter = startEncounter(0)
    const before: BankState = { bank: 2, multiplier: 2 }
    const activated = input({
      active: [buff('taker:bells:magnitude', BuffTier.Bronze, 1)],
      hand: { ...HAND, playerSuits: [BuffTargetSuit.Bells] },
    })
    const plain = applyResolution(
      encounter,
      resolveTrickBank(before, facts({ playerWon: true, finalTrick: true, buffs: null })),
      true,
    )
    const buffed = applyResolution(
      encounter,
      resolveTrickBank(before, facts({ playerWon: true, finalTrick: true, buffs: activated })),
      true,
    )
    const quarryLost = (after: typeof plain.encounter): number =>
      encounter.health[DuelSide.Quarry] - after.health[DuelSide.Quarry]
    expect(quarryLost(buffed.encounter)).toBeGreaterThan(quarryLost(plain.encounter))
  })
})
