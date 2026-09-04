import { describe, expect, it } from 'vitest'
import { BuffTier, mintFromTemplate, templateById } from '../../../hunt'
import { Suit, type Card } from '../../../warCouncil'
import {
  buffBadgeText,
  buffReachText,
  buffRemovedText,
  deadRowElsewhereText,
  deadRowReasonText,
  removeBuffLabel,
  ridingRowText,
} from '../buffRideLabels'
import type { RidingBuffRow } from '../buffRideModel'

const bellsHigh = mintFromTemplate(templateById('suitHigh:bells:magnitude')!, BuffTier.Bronze, 1)
const skullLow = mintFromTemplate(templateById('skullLow:magnitude')!, BuffTier.Bronze, 2)
const keysCard: Card = { suit: Suit.Keys, rank: 5 }

const suitHighRow: RidingBuffRow = {
  buff: bellsHigh,
  reach: 3,
  revocable: true,
}

describe('buffReachText', () => {
  it('is plural for a reach of 3', () => {
    expect(buffReachText(3)).toBe('lights up 3 of your cards')
  })

  it('is singular for a reach of 1', () => {
    expect(buffReachText(1)).toBe('lights up 1 of your card')
  })

  it('states the zero case explicitly, never as "0 cards"', () => {
    expect(buffReachText(0)).toBe('no card in your hand can fire it')
  })
})

describe('removeBuffLabel', () => {
  it('names the trick, not a single card, and never uses "card" for the unload itself', () => {
    const label = removeBuffLabel(bellsHigh, 3)
    expect(label).toContain('trick')
    expect(label.toLowerCase().startsWith('take')).toBe(true)
  })

  it('states the zero-reach case as nothing going dark', () => {
    expect(removeBuffLabel(bellsHigh, 0)).toContain('nothing goes dark')
  })
})

describe('deadRowReasonText', () => {
  it('names both the buff’s target suit and the card’s own suit', () => {
    const text = deadRowReasonText(bellsHigh, keysCard)
    expect(text).toContain('Bells')
    expect(text).toContain('Keys')
  })

  it('gives a suit-neutral reading for a suitless buff', () => {
    const text = deadRowReasonText(skullLow, keysCard)
    expect(text).not.toContain('Needs')
  })
})

describe('deadRowElsewhereText', () => {
  it('falls back to the zero-reach sentence when reach is 0', () => {
    expect(deadRowElsewhereText(bellsHigh, 0)).toBe(' No card in your hand can fire it.')
  })

  it('names the reach elsewhere at a non-zero reach', () => {
    const text = deadRowElsewhereText(bellsHigh, 2)
    expect(text).toContain('2')
    expect(text).toContain('instead')
  })
})

describe('buffRemovedText', () => {
  it('names the buff and how many cards went dark', () => {
    const text = buffRemovedText(bellsHigh, 3)
    expect(text).toContain('3 cards went dark')
  })

  it('states the zero case as nothing going dark', () => {
    expect(buffRemovedText(bellsHigh, 0)).toContain('nothing went dark')
  })
})

describe('ridingRowText', () => {
  it('reports the row on the reach sentence', () => {
    expect(ridingRowText(suitHighRow)).toBe(buffReachText(suitHighRow.reach))
  })
})

describe('buffBadgeText', () => {
  it('uses "buff" singular at count 1', () => {
    expect(buffBadgeText({ count: 1, estimate: false })).toContain('1 buff ')
  })

  it('uses "buffs" plural at count 2', () => {
    expect(buffBadgeText({ count: 2, estimate: false })).toContain('2 buffs')
  })

  it('carries an estimate prefix when the count includes a mayFire buff', () => {
    expect(buffBadgeText({ count: 2, estimate: true })).toMatch(/^up to/)
  })
})
