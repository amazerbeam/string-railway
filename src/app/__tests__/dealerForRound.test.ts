import { describe, expect, it } from 'vitest'
import { otherSide, PlayerSide } from '../../warCouncil'
import { dealerForRound } from '../dealerForRound'

describe('dealerForRound', () => {
  it('uses the placeholder first dealer for round 1', () => {
    expect(dealerForRound(1)).toBe(PlayerSide.Player)
  })

  it('alternates every subsequent round', () => {
    expect(dealerForRound(2)).toBe(otherSide(PlayerSide.Player))
    expect(dealerForRound(3)).toBe(PlayerSide.Player)
    expect(dealerForRound(4)).toBe(otherSide(PlayerSide.Player))
    expect(dealerForRound(5)).toBe(PlayerSide.Player)
  })
})
