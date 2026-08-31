import { describe, expect, it } from 'vitest'
import { BuffTier, mintFromTemplate, templateById, timebombBuff } from '../../../hunt'
import { Suit, type Card } from '../../../warCouncil'
import {
  buffBadgeText,
  buffReachText,
  buffRemovedText,
  deadRowElsewhereText,
  deadRowReasonText,
  removeBuffLabel,
  ridingRowText,
  timebombRemovedText,
} from '../buffRideLabels'
import type { RidingBuffRow, TimebombRide } from '../buffRideModel'

const bellsTaker = mintFromTemplate(templateById('taker:bells:magnitude')!, BuffTier.Bronze, 1)
const sidestep = mintFromTemplate(templateById('sidestep:magnitude')!, BuffTier.Bronze, 2)
const keysCard: Card = { suit: Suit.Keys, rank: 5 }
const five: Card = { suit: Suit.Bells, rank: 5 }
const timebombCard = timebombBuff(BuffTier.Bronze, 9)

const takerRow: RidingBuffRow = {
  buff: bellsTaker,
  reach: 3,
  revocable: true,
  timebomb: null,
}

function rowWith(timebomb: TimebombRide): RidingBuffRow {
  return { buff: timebombCard, reach: 0, revocable: true, timebomb }
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
    const label = removeBuffLabel(bellsTaker, 3)
    expect(label).toContain('trick')
    expect(label.toLowerCase().startsWith('take')).toBe(true)
  })

  it('states the zero-reach case as nothing going dark', () => {
    expect(removeBuffLabel(bellsTaker, 0)).toContain('nothing goes dark')
  })
})

describe('deadRowReasonText', () => {
  it('names both the buff’s target suit and the card’s own suit', () => {
    const text = deadRowReasonText(bellsTaker, keysCard)
    expect(text).toContain('Bells')
    expect(text).toContain('Keys')
  })

  it('gives a suit-neutral reading for a suitless buff', () => {
    const text = deadRowReasonText(sidestep, keysCard)
    expect(text).not.toContain('Needs')
  })
})

describe('deadRowElsewhereText', () => {
  it('falls back to the zero-reach sentence when reach is 0', () => {
    expect(deadRowElsewhereText(bellsTaker, 0)).toBe(' No card in your hand can fire it.')
  })

  it('names the reach elsewhere at a non-zero reach', () => {
    const text = deadRowElsewhereText(bellsTaker, 2)
    expect(text).toContain('2')
    expect(text).toContain('instead')
  })
})

describe('buffRemovedText', () => {
  it('names the buff and how many cards went dark', () => {
    const text = buffRemovedText(bellsTaker, 3)
    expect(text).toContain('3 cards went dark')
  })

  it('states the zero case as nothing going dark', () => {
    expect(buffRemovedText(bellsTaker, 0)).toContain('nothing went dark')
  })
})

describe('ridingRowText', () => {
  it('says the row is not yet primed before a card is chosen — AC12', () => {
    expect(ridingRowText(rowWith({ target: null, fuseRemaining: 0 }))).toMatch(/not yet primed/i)
  })

  it('names the target once primed — AC12', () => {
    expect(ridingRowText(rowWith({ target: five, fuseRemaining: 2 }))).toMatch(/5 of/)
  })

  it('leaves a non-Timebomb row on the reach sentence', () => {
    expect(ridingRowText({ ...takerRow, timebomb: null })).toBe(buffReachText(takerRow.reach))
  })

  it('does not claim "0 tricks left" for a primed card whose fuse already spent by another route — FIX 8', () => {
    const text = ridingRowText(rowWith({ target: five, fuseRemaining: 0 }))
    expect(text).toContain('5 of')
    expect(text).not.toMatch(/0 tricks left/)
  })
})

describe('timebombRemovedText — DLR-154 AC5/AC13, wired into buffRideProps.ts (FIX 4)', () => {
  it('says nothing was primed yet when the target is null', () => {
    expect(timebombRemovedText(null)).toBe('Timebomb taken back.')
  })

  it('names the card taken back', () => {
    // `five` is rank 5 — `CardRank.Woodcutter` — so `cardAccessibleName` includes its rank name.
    expect(timebombRemovedText(five)).toBe('Timebomb taken off the 5 of Bells (Woodcutter).')
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
