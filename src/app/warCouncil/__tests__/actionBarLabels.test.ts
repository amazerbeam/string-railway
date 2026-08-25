import { describe, expect, it } from 'vitest'
import { Suit } from '../../../warCouncil'
import { applyDamageDelayTricks, type PendingApplyPayout } from '../../../hunt'
import {
  applyBuffAccessibleName,
  applyDamageBarAccessibleName,
  cardsAccessibleName,
  queuedPayoutText,
} from '../actionBarLabels'

const payout = (resolutionsOwed: number): PendingApplyPayout => ({
  cashOut: 12,
  resolutionsOwed,
  unplayedAtPress: 3,
})

describe('actionBarLabels', () => {
  it('queuedPayoutText is null when nothing is queued', () => {
    expect(queuedPayoutText(null)).toBeNull()
  })

  it('reads "1 trick to go" for a single resolution owed', () => {
    expect(queuedPayoutText(payout(1))).toContain('1 trick to go')
  })

  it('reads "2 tricks to go" for more than one resolution owed', () => {
    expect(queuedPayoutText(payout(2))).toContain('2 tricks to go')
  })

  it('DLR-119/DLR-141 — names the risk while the payout is queued', () => {
    expect(queuedPayoutText(payout(2))).toBe(
      'Payout queued: 12 damage, 2 tricks to go. Damage to you cuts it to 60%.',
    )
  })

  it('cardsAccessibleName names no selection when nothing is armed', () => {
    expect(cardsAccessibleName(null)).toContain('No card selected')
  })

  it('cardsAccessibleName names the armed card', () => {
    expect(cardsAccessibleName({ suit: Suit.Bells, rank: 7 })).toContain('7 of Bells')
  })

  it('applyDamageBarAccessibleName names the cash value and the AP cost', () => {
    const name = applyDamageBarAccessibleName(12, 3, false, null, null)
    expect(name).toContain('12')
    expect(name).toContain('3')
  })

  it('applyDamageBarAccessibleName includes the queued sentence when a payout is pending', () => {
    const name = applyDamageBarAccessibleName(12, 3, false, null, payout(2))
    expect(name).toContain('2 tricks to go')
    expect(name).toContain('Damage to you cuts it to 60%.')
  })

  it('applyBuffAccessibleName names the AP figure it is given', () => {
    expect(applyBuffAccessibleName(4, 2, false, true)).toContain('4')
  })

  it('DLR-135 lesson, applied to the spec — the "N tricks to go" figure a FRESH press owes is derived from applyDamageDelayTricks() + 1, not a literal', () => {
    const freshlyQueuedResolutionsOwed = applyDamageDelayTricks() + 1
    const tricksWord = freshlyQueuedResolutionsOwed === 1 ? 'trick' : 'tricks'
    expect(queuedPayoutText(payout(freshlyQueuedResolutionsOwed))).toContain(
      `${freshlyQueuedResolutionsOwed} ${tricksWord} to go`,
    )
  })
})
