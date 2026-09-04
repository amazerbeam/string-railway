import { describe, expect, it } from 'vitest'
import { HAND_SIZE } from '../../hunt'
import { createDeck } from '../deck'
import {
  CARDS_PER_DEAL,
  FRESH_ENCOUNTER_DECK,
  closeHand,
  dealPileFor,
  isFreshDeck,
} from '../encounterDeck'
import { dealRound } from '../deal'
import { PlayerSide } from '../types'

function lcg(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}

describe('CARDS_PER_DEAL', () => {
  it('is two hands plus the decree, derived from HAND_SIZE', () => {
    expect(CARDS_PER_DEAL).toBe(HAND_SIZE * 2 + 1)
    expect(CARDS_PER_DEAL).toBe(13)
  })
})

describe('isFreshDeck', () => {
  it('is true for the fresh value and false once either pile holds a card', () => {
    expect(isFreshDeck(FRESH_ENCOUNTER_DECK)).toBe(true)
    expect(isFreshDeck({ drawPile: createDeck().slice(0, 1), spentPile: [] })).toBe(false)
    expect(isFreshDeck({ drawPile: [], spentPile: createDeck().slice(0, 1) })).toBe(false)
  })
})

describe('closeHand', () => {
  it('D6 — sends every card not in the draw pile to the spent pile, conserving all 33', () => {
    const state = dealRound(PlayerSide.Player, lcg(42))
    const deck = closeHand(state)
    expect(deck.drawPile).toEqual(state.drawPile)
    // 6 + 6 dealt, plus the decree
    expect(deck.spentPile).toHaveLength(CARDS_PER_DEAL)
    expect(deck.drawPile.length + deck.spentPile.length).toBe(createDeck().length)
  })

  it('AC4 — the decree is spent, and after a Fox exchange it is whatever sits in the slot', () => {
    const state = dealRound(PlayerSide.Player, lcg(7))
    const swapped = { ...state, decree: state.hands[PlayerSide.Player][0] }
    const keys = closeHand(swapped).spentPile.map((c) => `${c.suit}-${c.rank}`)
    expect(keys).toContain(`${swapped.decree.suit}-${swapped.decree.rank}`)
  })

  it('spends cards still on the table when a hand ends mid-trick', () => {
    const state = dealRound(PlayerSide.Player, lcg(9))
    const lead = state.hands[PlayerSide.Cpu][0]
    const mid = {
      ...state,
      hands: { ...state.hands, [PlayerSide.Cpu]: state.hands[PlayerSide.Cpu].slice(1) },
      currentTrick: [{ side: PlayerSide.Cpu, card: lead }],
    }
    const deck = closeHand(mid)
    expect(deck.drawPile.length + deck.spentPile.length).toBe(createDeck().length)
  })
})

describe('dealPileFor', () => {
  it('AC2 — does not reshuffle while the draw pile can cover a deal', () => {
    const drawPile = createDeck().slice(0, CARDS_PER_DEAL)
    const result = dealPileFor({ drawPile, spentPile: createDeck().slice(CARDS_PER_DEAL) }, lcg(1))
    expect(result.reshuffled).toBe(false)
    expect(result.drawPile).toEqual(drawPile)
  })

  it('AC6/D3 — reshuffles below the threshold, folding the leftover draw pile in', () => {
    const drawPile = createDeck().slice(0, 7)
    const spentPile = createDeck().slice(7)
    const result = dealPileFor({ drawPile, spentPile }, lcg(3))
    expect(result.reshuffled).toBe(true)
    expect(result.drawPile).toHaveLength(createDeck().length)
    const keys = result.drawPile.map((c) => `${c.suit}-${c.rank}`)
    expect(new Set(keys).size).toBe(createDeck().length)
  })

  it('AC12 — the same rng reproduces the same reshuffle', () => {
    const deck = { drawPile: createDeck().slice(0, 7), spentPile: createDeck().slice(7) }
    expect(dealPileFor(deck, lcg(55))).toEqual(dealPileFor(deck, lcg(55)))
  })

  it('throws when the two piles together cannot cover a deal', () => {
    expect(() =>
      dealPileFor({ drawPile: [], spentPile: createDeck().slice(0, 3) }, lcg(1)),
    ).toThrow(RangeError)
  })
})
