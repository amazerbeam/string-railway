import { describe, expect, it } from 'vitest'
import { BattlePhase } from '../battlePhase'

describe('BattlePhase', () => {
  it('names exactly the four battle-loop stages', () => {
    expect(Object.values(BattlePhase)).toEqual([
      'warCouncilRound',
      'musterConversion',
      'clash',
      'resolved',
    ])
  })

  it('has no duplicate phase values', () => {
    const values = Object.values(BattlePhase)
    expect(new Set(values).size).toBe(values.length)
  })
})
