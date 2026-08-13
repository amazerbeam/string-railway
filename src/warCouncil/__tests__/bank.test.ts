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
import { PlayerSide, Suit, type TrickCard } from '../types'

const START: BankState = { bank: 0, multiplier: 0 }

function pair(leadRank: number, followRank: number): readonly [TrickCard, TrickCard] {
  return [
    { side: PlayerSide.Cpu, card: { suit: Suit.Bells, rank: leadRank } },
    { side: PlayerSide.Player, card: { suit: Suit.Bells, rank: followRank } },
  ]
}

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
  it('AC4 — a clean win banks both ranks and climbs the multiplier', () => {
    const r = resolveTrickBank(START, pair(11, 9), true, false, false)
    expect(r.outcome).toBe(TrickOutcome.CleanWin)
    expect(r.bankAdded).toBe(20)
    expect(r.bank).toBe(20)
    expect(r.multiplier).toBe(1)
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(0)
  })

  it('AC5 — a dodged skull is identical to a clean win', () => {
    const clean = resolveTrickBank(START, pair(4, 2), true, false, false)
    const dodge = resolveTrickBank(START, pair(4, 2), false, true, false)
    expect(dodge.bankAdded).toBe(clean.bankAdded)
    expect(dodge.bank).toBe(clean.bank)
    expect(dodge.multiplier).toBe(clean.multiplier)
    expect(dodge.damageToPlayer).toBe(0)
    expect(dodge.outcome).toBe(TrickOutcome.Dodge)
  })

  it('AC6 — a clean loss costs one health and cashes the bank', () => {
    const r = resolveTrickBank({ bank: 43, multiplier: 3 }, pair(5, 4), false, false, false)
    expect(r.outcome).toBe(TrickOutcome.CleanLoss)
    expect(r.cashOut).toBe(129)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
    expect(r.bankAdded).toBe(0)
  })

  it('AC7 — winning a skull trick is identical to losing a clean one', () => {
    const before: BankState = { bank: 43, multiplier: 3 }
    const lost = resolveTrickBank(before, pair(5, 4), false, false, false)
    const ate = resolveTrickBank(before, pair(5, 4), true, true, false)
    expect(ate.cashOut).toBe(lost.cashOut)
    expect(ate.damageToPlayer).toBe(lost.damageToPlayer)
    expect(ate.bank).toBe(0)
    expect(ate.multiplier).toBe(0)
    expect(ate.outcome).toBe(TrickOutcome.SkullWin)
  })

  it('AC9 — the multiplier is the streak, and a hit resets it', () => {
    let s: BankState = START
    for (const won of [true, true, true]) s = resolveTrickBank(s, pair(3, 2), won, false, false)
    expect(s.multiplier).toBe(3)
    s = resolveTrickBank(s, pair(3, 2), false, false, false)
    expect(s.multiplier).toBe(0)
  })

  it('AC8 — the sixth trick cashes what the streak built', () => {
    const r = resolveTrickBank({ bank: 11, multiplier: 1 }, pair(9, 2), true, false, true)
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
    expect(r.cashOut).toBe(44)
    expect(r.cashedAtHandEnd).toBe(true)
  })

  it('AC8 — a sixth trick that takes damage cashes once, not twice', () => {
    const r = resolveTrickBank({ bank: 22, multiplier: 2 }, pair(9, 2), false, false, true)
    expect(r.cashOut).toBe(44)
    expect(r.cashedAtHandEnd).toBe(false)
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
  })

  it('reproduces §3.3’s worked hand exactly', () => {
    let s: BankState = START
    const steps: ReadonlyArray<[readonly [TrickCard, TrickCard], boolean, boolean, boolean]> = [
      [pair(11, 9), true, false, false],
      [pair(10, 7), true, false, false],
      [pair(4, 2), false, true, false],
      [pair(1, 1), false, false, false],
      [pair(8, 3), true, false, false],
      [pair(9, 2), true, false, true],
    ]
    const cashed: number[] = []
    for (const [cards, won, skull, last] of steps) {
      const r = resolveTrickBank(s, cards, won, skull, last)
      cashed.push(r.cashOut)
      s = r
    }
    expect(cashed).toEqual([0, 0, 0, 129, 0, 44])
  })
})

describe('incomingFrom', () => {
  it('keys damage by the side it depletes', () => {
    const r = resolveTrickBank({ bank: 10, multiplier: 2 }, pair(5, 4), false, false, false)
    expect(incomingFrom(r)).toEqual({ [DuelSide.Player]: 1, [DuelSide.Quarry]: 20 })
  })

  it('is all zeroes for a trick that neither cashed nor hit', () => {
    const r = resolveTrickBank(START, pair(5, 4), true, false, false)
    expect(incomingFrom(r)).toEqual({ [DuelSide.Player]: 0, [DuelSide.Quarry]: 0 })
  })
})
