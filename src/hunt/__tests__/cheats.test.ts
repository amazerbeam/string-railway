import { describe, expect, it } from 'vitest'
import { CHEAT_SLOT_COUNT } from '../config'
import { addCheat, grantCheats, hasCheat, removeCheat } from '../cheats'

describe('grantCheats', () => {
  it('mints `count` cards with consecutive ids from `firstId` (AC3)', () => {
    expect(grantCheats(2, 1)).toEqual([{ id: 1 }, { id: 2 }])
    expect(grantCheats(1, 7)).toEqual([{ id: 7 }])
  })

  it('grants nothing for 0 rather than throwing', () => {
    expect(grantCheats(0, 1)).toEqual([])
  })

  it('refuses a count above the slot cap rather than clamping (AC2)', () => {
    expect(() => grantCheats(CHEAT_SLOT_COUNT + 1, 1)).toThrow(RangeError)
  })

  it('refuses a negative or non-integer count', () => {
    expect(() => grantCheats(-1, 1)).toThrow(RangeError)
    expect(() => grantCheats(1.5, 1)).toThrow(RangeError)
  })
})

describe('addCheat', () => {
  it('appends to a list with room', () => {
    expect(addCheat([{ id: 1 }], { id: 2 })).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('refuses a third card when both slots are full (AC2)', () => {
    const full = grantCheats(CHEAT_SLOT_COUNT, 1)
    expect(() => addCheat(full, { id: 99 })).toThrow(RangeError)
  })

  it('refuses an id already held', () => {
    expect(() => addCheat([{ id: 1 }], { id: 1 })).toThrow(RangeError)
  })

  it('does not mutate its input', () => {
    const held = [{ id: 1 }]
    addCheat(held, { id: 2 })
    expect(held).toEqual([{ id: 1 }])
  })
})

describe('removeCheat', () => {
  it('drops exactly the named card and frees its slot (AC7)', () => {
    expect(removeCheat([{ id: 1 }, { id: 2 }], 1)).toEqual([{ id: 2 }])
  })

  it('refuses an id that is not held, so a double-consume is loud', () => {
    expect(() => removeCheat([{ id: 1 }], 2)).toThrow(RangeError)
  })

  it('does not mutate its input', () => {
    const held = [{ id: 1 }, { id: 2 }]
    removeCheat(held, 1)
    expect(held).toHaveLength(2)
  })
})

describe('hasCheat', () => {
  it('answers whether an id is still held', () => {
    expect(hasCheat([{ id: 1 }], 1)).toBe(true)
    expect(hasCheat([{ id: 1 }], 2)).toBe(false)
    expect(hasCheat([], 1)).toBe(false)
  })
})
