import { describe, expect, it } from 'vitest'
import { PayoutOutcome } from '../../../hunt'
import { PAYOUT_QUEUE_RISK_HINT, payoutEventText } from '../payoutLabels'

describe('payoutEventText', () => {
  it('says nothing when this trick reported no payout event', () => {
    expect(payoutEventText(null)).toBeNull()
  })

  it('names the figure that landed', () => {
    expect(payoutEventText({ outcome: PayoutOutcome.Paid, cashOut: 12, remaining: null })).toBe(
      'Your queued 12 lands.',
    )
  })

  it('DLR-141 — names both figures when a hit cut the payout', () => {
    expect(payoutEventText({ outcome: PayoutOutcome.Reduced, cashOut: 12, remaining: 7 })).toBe(
      'The hit cut your queued 12 to 7.',
    )
  })

  it('DLR-141 — names the frozen figure when the fight ended before the payout could land', () => {
    expect(
      payoutEventText({ outcome: PayoutOutcome.Evaporated, cashOut: 12, remaining: null }),
    ).toBe('The fight ended before your queued 12 could land.')
  })

  it('states the risk in one sentence, derived from the retention percentage', () => {
    expect(PAYOUT_QUEUE_RISK_HINT).toBe('Damage to you cuts it to 60%.')
  })
})
