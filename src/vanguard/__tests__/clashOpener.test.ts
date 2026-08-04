import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { openingSideForRound } from '../clashOpener'

describe('openingSideForRound', () => {
  it('has the CPU open round 1 and alternates every round thereafter', () => {
    expect(openingSideForRound(1)).toBe(PlayerSide.Cpu)
    expect(openingSideForRound(2)).toBe(PlayerSide.Player)
    expect(openingSideForRound(3)).toBe(PlayerSide.Cpu)
    expect(openingSideForRound(4)).toBe(PlayerSide.Player)
  })
})
