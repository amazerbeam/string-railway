import { describe, expect, it } from 'vitest'
import { DAMAGE_PER_HIT, DuelSide } from '../../hunt'
import {
  incomingFrom,
  isTaken,
  resolveTrickBank,
  TrickOutcome,
  trickOutcomeFor,
  type BankState,
} from '../bank'

const START: BankState = { bank: 0, multiplier: 0 }

describe('trickOutcomeFor', () => {
  it('maps §3.2’s four rows', () => {
    expect(trickOutcomeFor(true, false)).toBe(TrickOutcome.CleanWin)
    expect(trickOutcomeFor(false, true)).toBe(TrickOutcome.Dodge)
    expect(trickOutcomeFor(false, false)).toBe(TrickOutcome.CleanLoss)
    expect(trickOutcomeFor(true, true)).toBe(TrickOutcome.SkullWin)
  })

  it('takes the trick on a clean win and a dodge, and only those', () => {
    expect(isTaken(TrickOutcome.CleanWin)).toBe(true)
    expect(isTaken(TrickOutcome.Dodge)).toBe(true)
    expect(isTaken(TrickOutcome.CleanLoss)).toBe(false)
    expect(isTaken(TrickOutcome.SkullWin)).toBe(false)
  })
})

describe('resolveTrickBank', () => {
  it('a clean win banks one trick and climbs the multiplier', () => {
    const r = resolveTrickBank({ bank: 0, multiplier: 0 }, true, false, false)
    expect(r.outcome).toBe(TrickOutcome.CleanWin)
    expect(r.bankAdded).toBe(1)
    expect(r.bank).toBe(1)
    expect(r.multiplier).toBe(1)
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(0)
  })

  it('AC5 — a dodged skull is identical to a clean win', () => {
    const clean = resolveTrickBank(START, true, false, false)
    const dodge = resolveTrickBank(START, false, true, false)
    expect(dodge.bankAdded).toBe(clean.bankAdded)
    expect(dodge.bank).toBe(clean.bank)
    expect(dodge.multiplier).toBe(clean.multiplier)
    expect(dodge.damageToPlayer).toBe(0)
    expect(dodge.outcome).toBe(TrickOutcome.Dodge)
  })

  it('a clean loss cashes bank × multiplier and resets both', () => {
    const r = resolveTrickBank({ bank: 3, multiplier: 3 }, false, false, false)
    expect(r.outcome).toBe(TrickOutcome.CleanLoss)
    expect(r.cashOut).toBe(9)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
    expect(r.bankAdded).toBe(0)
  })

  it('AC7 — winning a skull trick is identical to losing a clean one', () => {
    const before: BankState = { bank: 3, multiplier: 3 }
    const lost = resolveTrickBank(before, false, false, false)
    const ate = resolveTrickBank(before, true, true, false)
    expect(ate.cashOut).toBe(lost.cashOut)
    expect(ate.damageToPlayer).toBe(lost.damageToPlayer)
    expect(ate.bank).toBe(0)
    expect(ate.multiplier).toBe(0)
    expect(ate.outcome).toBe(TrickOutcome.SkullWin)
  })

  it('AC9 — the multiplier is the streak, and a hit resets it', () => {
    let s: BankState = START
    for (const won of [true, true, true]) s = resolveTrickBank(s, won, false, false)
    expect(s.multiplier).toBe(3)
    s = resolveTrickBank(s, false, false, false)
    expect(s.multiplier).toBe(0)
  })

  it('AC8 — the sixth trick cashes what the streak built', () => {
    const r = resolveTrickBank({ bank: 1, multiplier: 1 }, true, false, true)
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
    expect(r.cashOut).toBe(4)
    expect(r.cashedAtHandEnd).toBe(true)
  })

  it('AC8 — a sixth trick that takes damage cashes once, not twice', () => {
    const r = resolveTrickBank({ bank: 2, multiplier: 2 }, false, false, true)
    expect(r.cashOut).toBe(4)
    expect(r.cashedAtHandEnd).toBe(false)
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
  })

  it('pays n × n across a whole unbroken streak — 1, 4, 9, 16, 25, 36', () => {
    const payouts: number[] = []
    let state = { bank: 0, multiplier: 0 }
    for (let n = 1; n <= 6; n++) {
      const taken = resolveTrickBank(state, true, false, false)
      state = { bank: taken.bank, multiplier: taken.multiplier }
      payouts.push(resolveTrickBank(state, false, false, false).cashOut)
    }
    expect(payouts).toEqual([1, 4, 9, 16, 25, 36])
  })
})

describe('incomingFrom', () => {
  it('keys damage by the side it depletes', () => {
    const r = resolveTrickBank({ bank: 3, multiplier: 3 }, false, false, false)
    expect(incomingFrom(r)).toEqual({ [DuelSide.Player]: 1, [DuelSide.Quarry]: 9 })
  })

  it('is all zeroes for a trick that neither cashed nor hit', () => {
    const r = resolveTrickBank(START, true, false, false)
    expect(incomingFrom(r)).toEqual({ [DuelSide.Player]: 0, [DuelSide.Quarry]: 0 })
  })
})
