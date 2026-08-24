import { describe, expect, it } from 'vitest'
import { APPLY_DAMAGE_DELAY_TRICKS } from '../config'
import {
  applyDamageDelayTricks,
  queueApplyPayout,
  tickApplyPayout,
  PayoutOutcome,
} from '../applyDamagePayout'

describe('applyDamageDelayTricks', () => {
  it('AC5 — reads the configured delay when no modifier is supplied', () => {
    expect(applyDamageDelayTricks()).toBe(APPLY_DAMAGE_DELAY_TRICKS)
  })

  it('AC5 — a shortening buff subtracts, and the result never goes below zero', () => {
    expect(applyDamageDelayTricks({ shortenBy: 1 })).toBe(APPLY_DAMAGE_DELAY_TRICKS - 1)
    expect(applyDamageDelayTricks({ shortenBy: 99 })).toBe(0)
  })

  it('AC5 — removeDelay wins over shortenBy', () => {
    expect(applyDamageDelayTricks({ removeDelay: true, shortenBy: -5 })).toBe(0)
  })

  it('ignores a non-finite shortenBy rather than producing NaN', () => {
    expect(applyDamageDelayTricks({ shortenBy: Number.NaN })).toBe(APPLY_DAMAGE_DELAY_TRICKS)
  })
})

describe('queueApplyPayout', () => {
  it('AC2 — owes the configured delay PLUS the trick the press happened in', () => {
    expect(queueApplyPayout(9, 4).resolutionsOwed).toBe(APPLY_DAMAGE_DELAY_TRICKS + 1)
  })

  it('AC4 — freezes the cash figure and the press-time hand size', () => {
    expect(queueApplyPayout(9, 4)).toMatchObject({ cashOut: 9, unplayedAtPress: 4 })
  })

  it('refuses a payout that could never render — a caller that skipped the refusal check', () => {
    expect(() => queueApplyPayout(0, 4)).toThrow(RangeError)
    expect(() => queueApplyPayout(Number.NaN, 4)).toThrow(RangeError)
    expect(() => queueApplyPayout(9, -1)).toThrow(RangeError)
  })
})

describe('tickApplyPayout', () => {
  it('nothing queued ticks to nothing, and never throws', () => {
    expect(tickApplyPayout(null, false)).toEqual({ pending: null, due: null })
  })

  it('AC2 — counts down one resolution at a time and is not due before zero', () => {
    const queued = queueApplyPayout(9, 4)
    const first = tickApplyPayout(queued, false)
    expect(first.due).toBeNull()
    expect(first.pending?.resolutionsOwed).toBe(APPLY_DAMAGE_DELAY_TRICKS)
  })

  it('AC2 — becomes due on the resolution that takes the count to zero', () => {
    let tick = tickApplyPayout(queueApplyPayout(9, 4), false)
    while (tick.pending !== null) tick = tickApplyPayout(tick.pending, false)
    expect(tick.due).toMatchObject({ cashOut: 9, unplayedAtPress: 4 })
  })

  it('an outstanding payout lands at the end of the hand however much was owed', () => {
    expect(tickApplyPayout(queueApplyPayout(9, 4), true).due?.cashOut).toBe(9)
  })

  it('exactly one of pending and due is set — a payout is never both held and paid', () => {
    const tick = tickApplyPayout(queueApplyPayout(9, 4), false)
    expect(tick.pending === null).not.toBe(tick.due === null)
  })
})

describe('PayoutOutcome', () => {
  it('has exactly two members, so a third fate cannot be added without a compile error here', () => {
    expect(Object.values(PayoutOutcome)).toEqual(['paid', 'destroyed'])
  })
})
