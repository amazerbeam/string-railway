import { describe, expect, it } from 'vitest'
import { APPLY_DAMAGE_AP_COST, DuelSide, STARTING_AP } from '../../hunt'
import {
  ApplyDamageRefusal,
  applyDamageRefusalFor,
  cashBankNow,
  incomingFromCashOut,
  type ApplyDamageStock,
} from '../voluntaryCashOut'
import { PlayerSide, RoundPhase, Suit, type RoundState } from '../types'

const stock = (over: Partial<ApplyDamageStock> = {}): ApplyDamageStock => ({
  bank: 3,
  multiplier: 3,
  trickInFlight: false,
  payoutPending: false,
  apPool: STARTING_AP,
  canAct: true,
  ...over,
})

/** A minimal mid-trick round: the Quarry has led and the player owes a follow. */
function round(over: Partial<RoundState> = {}): RoundState {
  const lead = { side: PlayerSide.Cpu, card: { suit: Suit.Bells, rank: 9 } }
  return {
    dealer: PlayerSide.Cpu,
    hands: { [PlayerSide.Player]: [{ suit: Suit.Bells, rank: 2 }], [PlayerSide.Cpu]: [] },
    drawPile: [],
    decree: { suit: Suit.Keys, rank: 10 },
    trumpSuit: Suit.Keys,
    tricksWon: { [PlayerSide.Player]: 1, [PlayerSide.Cpu]: 2 },
    skulledCards: [],
    primedCards: [],
    spentPile: [],
    reshuffled: false,
    bank: 3,
    multiplier: 3,
    lastResolution: null,
    currentTrick: [lead],
    leader: PlayerSide.Cpu,
    tricksPlayed: 3,
    phase: RoundPhase.AwaitingFollow,
    ...over,
  }
}

describe('applyDamageRefusalFor — AC1', () => {
  it('allows the apply when the bank is up, nothing is owed, and it is the player’s move', () => {
    expect(applyDamageRefusalFor(stock())).toBeNull()
  })

  it('AC1 — refuses an empty bank, naming the reason', () => {
    expect(applyDamageRefusalFor(stock({ bank: 0, multiplier: 0 }))).toBe(
      ApplyDamageRefusal.EmptyBank,
    )
  })

  it('AC1 — refuses once any card is on the table, including the Quarry’s lead', () => {
    expect(applyDamageRefusalFor(stock({ trickInFlight: true }))).toBe(
      ApplyDamageRefusal.TrickInProgress,
    )
  })

  it('refuses when the player’s card is not the next thing to be committed', () => {
    expect(applyDamageRefusalFor(stock({ canAct: false }))).toBe(ApplyDamageRefusal.NotYourMove)
  })

  // The order is the reason that will still be true after the next trick banks.
  it('names the move gate first, then the trick-in-progress gate, then the bank', () => {
    expect(applyDamageRefusalFor(stock({ bank: 0, trickInFlight: true, canAct: false }))).toBe(
      ApplyDamageRefusal.NotYourMove,
    )
    expect(applyDamageRefusalFor(stock({ bank: 0, trickInFlight: true }))).toBe(
      ApplyDamageRefusal.TrickInProgress,
    )
  })

  it('refuses a degenerate bank rather than treating it as a streak', () => {
    for (const bad of [Number.NaN, -1, 1.5]) {
      expect(applyDamageRefusalFor(stock({ bank: bad }))).toBe(ApplyDamageRefusal.EmptyBank)
      expect(applyDamageRefusalFor(stock({ multiplier: bad }))).toBe(ApplyDamageRefusal.EmptyBank)
    }
  })

  it('DLR-109 — refuses while a pressed cash-out is still in the air', () => {
    expect(applyDamageRefusalFor(stock({ payoutPending: true }))).toBe(
      ApplyDamageRefusal.PayoutPending,
    )
  })

  it('DLR-109 AC1 — refuses when the AP pool cannot cover the press', () => {
    expect(applyDamageRefusalFor(stock({ apPool: APPLY_DAMAGE_AP_COST - 1 }))).toBe(
      ApplyDamageRefusal.InsufficientAp,
    )
  })

  // DLR-143 — the five-clause order is load-bearing: NotYourMove → TrickInProgress →
  // PayoutPending → InsufficientAp → EmptyBank. Walking it down from every reason true at once
  // confirms each clause yields to the one before it, in order.
  it('DLR-143 — walks all five refusal clauses in order', () => {
    const everyReason = stock({
      canAct: false,
      trickInFlight: true,
      payoutPending: true,
      apPool: 0,
      bank: 0,
      multiplier: 0,
    })
    expect(applyDamageRefusalFor(everyReason)).toBe(ApplyDamageRefusal.NotYourMove)
    expect(applyDamageRefusalFor({ ...everyReason, canAct: true })).toBe(
      ApplyDamageRefusal.TrickInProgress,
    )
    expect(applyDamageRefusalFor({ ...everyReason, canAct: true, trickInFlight: false })).toBe(
      ApplyDamageRefusal.PayoutPending,
    )
    expect(
      applyDamageRefusalFor({
        ...everyReason,
        canAct: true,
        trickInFlight: false,
        payoutPending: false,
      }),
    ).toBe(ApplyDamageRefusal.InsufficientAp)
    expect(
      applyDamageRefusalFor({
        ...everyReason,
        canAct: true,
        trickInFlight: false,
        payoutPending: false,
        apPool: STARTING_AP,
      }),
    ).toBe(ApplyDamageRefusal.EmptyBank)
  })
})

describe('cashBankNow — AC2 and AC3', () => {
  it('AC2 — pays the FULL bank × multiplier, unlike a forced hit', () => {
    expect(cashBankNow(round()).cashOut).toBe(9)
  })

  it('AC2 — zeroes the bank and the multiplier', () => {
    const { state } = cashBankNow(round())
    expect(state.bank).toBe(0)
    expect(state.multiplier).toBe(0)
  })

  it('AC2 — the player takes no damage at all', () => {
    const incoming = incomingFromCashOut(cashBankNow(round()).cashOut)
    expect(incoming[DuelSide.Player]).toBe(0)
    expect(incoming[DuelSide.Quarry]).toBe(9)
  })

  // AC3 is a property of what is NOT touched: the trick is mid-flight and stays mid-flight, so the
  // player's next tap plays their card by the ordinary rules against a zeroed bank.
  it('AC3 — leaves the trick, the phase, the leader and the hands exactly as they were', () => {
    const before = round()
    const { state } = cashBankNow(before)
    expect(state.currentTrick).toEqual(before.currentTrick)
    expect(state.phase).toBe(before.phase)
    expect(state.leader).toBe(before.leader)
    expect(state.hands).toEqual(before.hands)
    expect(state.tricksPlayed).toBe(before.tricksPlayed)
    expect(state.tricksWon).toEqual(before.tricksWon)
  })

  it('does NOT write lastResolution — no trick resolved', () => {
    expect(cashBankNow(round()).state.lastResolution).toBeNull()
    const carried = { outcome: 'cleanWin' } as unknown as RoundState['lastResolution']
    expect(cashBankNow(round({ lastResolution: carried })).state.lastResolution).toBe(carried)
  })

  it('never mutates the round it was given', () => {
    const before = round()
    cashBankNow(before)
    expect(before.bank).toBe(3)
    expect(before.multiplier).toBe(3)
  })

  it('pays nothing from an empty bank, and is safe to call anyway', () => {
    const { state, cashOut } = cashBankNow(round({ bank: 0, multiplier: 0 }))
    expect(cashOut).toBe(0)
    expect(state.bank).toBe(0)
  })
})
