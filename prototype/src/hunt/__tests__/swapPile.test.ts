import { describe, expect, it } from 'vitest'
import { DISCARDS_PER_FIGHT, swapCapFor, swapPileAfterWoodcutter } from '..'

describe('swapPileAfterWoodcutter', () => {
  it('raises a FULL pile rather than refusing it — 3 of 3 becomes 4 of 4', () => {
    expect(swapPileAfterWoodcutter({ discardsRemaining: 3, discardCapBonus: 0 })).toEqual({
      discardsRemaining: 4,
      discardCapBonus: 1,
    })
  })

  it('fills an EMPTY pile by exactly the step — 0 of 3 becomes 1 of 4', () => {
    expect(swapPileAfterWoodcutter({ discardsRemaining: 0, discardCapBonus: 0 })).toEqual({
      discardsRemaining: 1,
      discardCapBonus: 1,
    })
  })

  it('stacks — two Woodcutters give a cap of 5 (AC11)', () => {
    const once = swapPileAfterWoodcutter({ discardsRemaining: 3, discardCapBonus: 0 })
    expect(swapCapFor(swapPileAfterWoodcutter(once).discardCapBonus)).toBe(DISCARDS_PER_FIGHT + 2)
  })
})
