import { describe, expect, it } from 'vitest'
import { WAR_COUNCIL_FIRST_DEALER } from '../../../battle'
import { otherSide } from '../../../warCouncil'
import { dealerForRound } from '../dealerForRound'

describe('dealerForRound', () => {
  it('uses WAR_COUNCIL_FIRST_DEALER for round 1', () => {
    expect(dealerForRound(1)).toBe(WAR_COUNCIL_FIRST_DEALER)
  })

  it('alternates every subsequent round', () => {
    expect(dealerForRound(2)).toBe(otherSide(WAR_COUNCIL_FIRST_DEALER))
    expect(dealerForRound(3)).toBe(WAR_COUNCIL_FIRST_DEALER)
    expect(dealerForRound(4)).toBe(otherSide(WAR_COUNCIL_FIRST_DEALER))
    expect(dealerForRound(5)).toBe(WAR_COUNCIL_FIRST_DEALER)
  })
})
