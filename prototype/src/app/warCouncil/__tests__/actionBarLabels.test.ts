import { describe, expect, it } from 'vitest'
import { Suit } from '../../../warCouncil'
import { applyBuffAccessibleName, cardsAccessibleName } from '../actionBarLabels'

describe('actionBarLabels', () => {
  it('cardsAccessibleName names no selection when nothing is armed', () => {
    expect(cardsAccessibleName(null)).toContain('No card selected')
  })

  it('cardsAccessibleName names the armed card', () => {
    expect(cardsAccessibleName({ suit: Suit.Bells, rank: 7 })).toContain('7 of Bells')
  })

  it('applyBuffAccessibleName names the held count, with no AP figure (DLR-145 AC2)', () => {
    const name = applyBuffAccessibleName(2, false, true)
    expect(name).toContain('2')
    expect(name).not.toContain('AP')
    expect(name).not.toContain('action point')
  })
})
