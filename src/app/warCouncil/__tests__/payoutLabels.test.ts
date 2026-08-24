import { describe, expect, it } from 'vitest'
import { PayoutOutcome } from '../../../hunt'
import { PAYOUT_QUEUE_RISK_HINT, payoutEventText } from '../payoutLabels'

describe('payoutEventText', () => {
  it('says nothing when no payout settled or died on this trick', () => {
    expect(payoutEventText(null)).toBeNull()
  })

  it('names the figure that landed', () => {
    expect(payoutEventText({ outcome: PayoutOutcome.Paid, cashOut: 12 })).toBe(
      'Your queued 12 lands.',
    )
  })

  it('names the figure the hit destroyed', () => {
    expect(payoutEventText({ outcome: PayoutOutcome.Destroyed, cashOut: 12 })).toBe(
      'The hit destroyed your queued 12.',
    )
  })

  it('states the risk in one sentence, for the queued note on the bar', () => {
    expect(PAYOUT_QUEUE_RISK_HINT).toBe('Damage to you destroys it.')
  })
})
