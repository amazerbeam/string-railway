import { describe, expect, it } from 'vitest'
import { TRICKS_PER_ROUND, isValidTricksWon } from '../tricksWon'

describe('TRICKS_PER_ROUND', () => {
  it('is 13, matching the fixed round length in src/warCouncil', () => {
    expect(TRICKS_PER_ROUND).toBe(13)
  })
})

describe('isValidTricksWon', () => {
  it('accepts a split that sums to TRICKS_PER_ROUND', () => {
    expect(isValidTricksWon({ player: 3, cpu: 10 })).toBe(true)
    expect(isValidTricksWon({ player: 0, cpu: 13 })).toBe(true)
    expect(isValidTricksWon({ player: 13, cpu: 0 })).toBe(true)
  })

  it('rejects a split that does not sum to TRICKS_PER_ROUND', () => {
    expect(isValidTricksWon({ player: 10, cpu: 10 })).toBe(false)
    expect(isValidTricksWon({ player: 5, cpu: 5 })).toBe(false)
  })

  it('rejects a negative trick count', () => {
    expect(isValidTricksWon({ player: -1, cpu: 14 })).toBe(false)
  })

  it('rejects a non-integer trick count', () => {
    expect(isValidTricksWon({ player: 6.5, cpu: 6.5 })).toBe(false)
  })
})
