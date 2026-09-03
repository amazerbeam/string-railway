import { describe, expect, it } from 'vitest'
import {
  BASE_DAMAGE,
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  BuffTier,
  DAMAGE_PER_HIT,
  startHandAccrual,
  type Buff,
  type BuffTrickInput,
} from '../../hunt'
import { resolveTrickBank, TrickOutcome, type StreakState, type TrickFacts } from '../streak'
import { potValue } from '../pot'

/**
 * DLR-156 — pins `spec.md`'s own worked examples against the real `resolveTrickBank`, not a
 * restatement of its arithmetic. See `.claude/contract/DLR-156-roll-over-damage-model/spec.md`
 * → "New behaviour" and "Worked example".
 */

const START: StreakState = { total: 0, roll: 0 }

const HAND = {
  playerSuits: [BuffTargetSuit.Bells],
  playerRanks: [] as readonly number[],
  remainingSuits: [] as readonly BuffTargetSuit[],
  tricksWithoutHit: 0,
  coins: 0,
  playerHealth: 20,
  applyDamagePressed: false,
}

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

// A bronze Bells Taker (Blade, +2 magnitude) and a bronze Bells Taker (Momentum, +1 multiplier),
// both firing on every Bells trick the player wins. Two buffs firing together draws R5's Overlap
// Bonus (+1), so the combined multiplier contribution is 1 (raw) + 1 (overlap) = 2 — exactly
// spec.md's "+2 multiplier points" — while the flat damage is the Blade's own +2.
const bladeBuff: Buff = {
  id: 1,
  kind: BuffKind.Taker,
  tier: BuffTier.Bronze,
  condition: { kind: BuffKind.Taker, target: { suit: BuffTargetSuit.Bells } },
  reward: { axis: BuffRewardAxis.Magnitude, value: 2 },
}
const momentumBuff: Buff = {
  id: 2,
  kind: BuffKind.Taker,
  tier: BuffTier.Bronze,
  condition: { kind: BuffKind.Taker, target: { suit: BuffTargetSuit.Bells } },
  reward: { axis: BuffRewardAxis.Multiplier, value: 1 },
}

const twoBuffInput = (): BuffTrickInput => ({
  active: [bladeBuff, momentumBuff],
  accrual: startHandAccrual(),
  firedThisHand: [],
  hand: HAND,
})

const oneBuffInput = (): BuffTrickInput => ({
  active: [bladeBuff],
  accrual: startHandAccrual(),
  firedThisHand: [],
  hand: HAND,
})

describe('AC13 — bare play pays the same six-trick curve as today', () => {
  it('1, 4, 9, 16, 25, 36 with no buffs and no baseDamageBonus', () => {
    const pots: number[] = []
    let state: StreakState = START
    for (let n = 0; n < 6; n++) {
      const r = resolveTrickBank(state, facts({ playerWon: true }))
      state = { total: r.total, roll: r.roll }
      pots.push(potValue(state.total, state.roll))
    }
    expect(pots).toEqual([1, 4, 9, 16, 25, 36])
  })
})

describe("spec.md's worked example — +2 flat damage and +2 multiplier points every trick", () => {
  it('trick damage 9 each, pots 9, 36, 81, 144, 225, 324', () => {
    const pots: number[] = []
    let state: StreakState = START
    for (let n = 0; n < 6; n++) {
      const r = resolveTrickBank(state, facts({ playerWon: true, buffs: twoBuffInput() }))
      expect(r.trickDamage?.dealt).toBe(9)
      state = { total: r.total, roll: r.roll }
      pots.push(potValue(state.total, state.roll))
    }
    expect(pots).toEqual([9, 36, 81, 144, 225, 324])
  })
})

describe('AC11 — no pooling', () => {
  it('a Blade fired on trick 1 and nothing thereafter leaves tricks 2-6 paying the bare base', () => {
    let state: StreakState = START
    const first = resolveTrickBank(state, facts({ playerWon: true, buffs: oneBuffInput() }))
    expect(first.trickDamage?.dealt).toBe(BASE_DAMAGE + 2)
    state = { total: first.total, roll: first.roll }
    for (let n = 0; n < 5; n++) {
      const r = resolveTrickBank(state, facts({ playerWon: true }))
      expect(r.trickDamage?.dealt).toBe(BASE_DAMAGE)
      state = { total: r.total, roll: r.roll }
    }
  })
})

describe('AC7 — the hurt branch pays nothing and wipes both', () => {
  it('a clean loss sets total/roll to 0, cashOut 0, damageToPlayer DAMAGE_PER_HIT, trickDamage null', () => {
    const r = resolveTrickBank({ total: 5, roll: 3 }, facts())
    expect(r.outcome).toBe(TrickOutcome.CleanLoss)
    expect(r.total).toBe(0)
    expect(r.roll).toBe(0)
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    expect(r.trickDamage).toBeNull()
  })

  it('an eaten skull is identical to a clean loss', () => {
    const r = resolveTrickBank({ total: 5, roll: 3 }, facts({ playerWon: true, skullTrick: true }))
    expect(r.outcome).toBe(TrickOutcome.SkullWin)
    expect(r.total).toBe(0)
    expect(r.roll).toBe(0)
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    expect(r.trickDamage).toBeNull()
  })
})

describe('The outcome axis, not the mechanical one', () => {
  it('a dodge BANKS — adds damage and increments the roll', () => {
    const r = resolveTrickBank({ total: 5, roll: 3 }, facts({ skullTrick: true }))
    expect(r.outcome).toBe(TrickOutcome.Dodge)
    expect(r.total).toBe(6)
    expect(r.roll).toBe(4)
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(0)
    expect(r.trickDamage).not.toBeNull()
  })

  it('eating a skull HURTS, even though the player physically won it', () => {
    const r = resolveTrickBank({ total: 5, roll: 3 }, facts({ playerWon: true, skullTrick: true }))
    expect(r.total).toBe(0)
    expect(r.roll).toBe(0)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
  })
})

describe('AC8 — no hand-end cash', () => {
  it('finalTrick on a banked trick leaves total/roll standing and pays nothing', () => {
    const r = resolveTrickBank({ total: 3, roll: 3 }, facts({ playerWon: true, finalTrick: true }))
    expect(r.total).toBe(4)
    expect(r.roll).toBe(4)
    expect(r.cashOut).toBe(0)
  })
})

describe('AC10 — the base includes TrickFacts.baseDamageBonus', () => {
  it('a bare banked trick with baseDamageBonus 2 deals 3', () => {
    const r = resolveTrickBank(START, facts({ playerWon: true, baseDamageBonus: 2 }))
    expect(r.trickDamage?.base).toBe(BASE_DAMAGE + 2)
    expect(r.trickDamage?.dealt).toBe(3)
  })
})
