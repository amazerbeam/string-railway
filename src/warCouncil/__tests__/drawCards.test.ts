import { describe, expect, it } from 'vitest'
import { createDeck } from '../deck'
import { drawCards } from '../encounterDeck'

const deck = createDeck()
const source = (drawPile: number, spentPile: number, drawSeed = 7) => ({
  drawPile: deck.slice(0, drawPile),
  spentPile: deck.slice(drawPile, drawPile + spentPile),
  drawSeed,
})

describe('drawCards', () => {
  it('takes from the FRONT of the draw pile and leaves the rest in order', () => {
    const src = source(10, 0)
    const result = drawCards(src, 3)
    expect(result.drawn).toEqual(src.drawPile.slice(0, 3))
    expect(result.drawPile).toEqual(src.drawPile.slice(3))
    expect(result.reshuffled).toBe(false)
    expect(result.drawSeed).toBe(src.drawSeed)
  })

  it('a count of 0 or less is a no-op that reshuffles nothing', () => {
    const src = source(2, 20)
    expect(drawCards(src, 0)).toMatchObject({ drawn: [], reshuffled: false, drawSeed: 7 })
    expect(drawCards(src, 0).drawPile).toEqual(src.drawPile)
    expect(drawCards(src, 0).spentPile).toEqual(src.spentPile)
  })

  it('folds the spent pile back in when the draw pile is short, and empties it', () => {
    const src = source(1, 20)
    const result = drawCards(src, 3)
    expect(result.drawn).toHaveLength(3)
    expect(result.drawn[0]).toEqual(src.drawPile[0])
    expect(result.reshuffled).toBe(true)
    expect(result.spentPile).toEqual([])
    expect(result.drawSeed).not.toBe(src.drawSeed)
  })

  it('conserves every card across a reshuffling draw, with no duplicate', () => {
    const src = source(1, 20)
    const result = drawCards(src, 3)
    const census = [...result.drawn, ...result.drawPile, ...result.spentPile]
    expect(census).toHaveLength(21)
    expect(new Set(census.map((c) => `${c.suit}-${c.rank}`)).size).toBe(21)
  })

  it('AC5 — an exhausted deck returns FEWER cards rather than throwing', () => {
    const result = drawCards(source(2, 0), 5)
    expect(result.drawn).toHaveLength(2)
    expect(result.drawPile).toEqual([])
    expect(result.spentPile).toEqual([])
  })

  it('the same seed reshuffles into the same order', () => {
    expect(drawCards(source(0, 20, 99), 3).drawn).toEqual(drawCards(source(0, 20, 99), 3).drawn)
    expect(drawCards(source(0, 20, 99), 3).drawn).not.toEqual(
      drawCards(source(0, 20, 100), 3).drawn,
    )
  })

  it('throws on a negative or non-finite count — a caller bug, not a game state', () => {
    expect(() => drawCards(source(10, 0), -1)).toThrow(RangeError)
    expect(() => drawCards(source(10, 0), Number.NaN)).toThrow(RangeError)
  })
})
