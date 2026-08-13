import { describe, expect, it } from 'vitest'
import { HAND_SIZE, QuarryCharacter, SKULL_DENSITY, SKULL_MIN_RANK } from '../../hunt'
import { containsCard } from '../cardUtils'
import { createDeck } from '../deck'
import { dealRound } from '../deal'
import { PlayerSide, RoundPhase } from '../types'

function lcg(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}

describe('dealRound', () => {
  it('deals six cards to each side and leaves a decree plus twenty', () => {
    const state = dealRound(PlayerSide.Player, lcg(42))
    expect(state.hands[PlayerSide.Player]).toHaveLength(HAND_SIZE)
    expect(state.hands[PlayerSide.Cpu]).toHaveLength(HAND_SIZE)
    expect(state.drawPile).toHaveLength(createDeck().length - HAND_SIZE * 2 - 1)
    expect(state.decree).toBeDefined()
  })

  it('accounts for all 33 cards with no duplicates across hands, pile, and decree', () => {
    const state = dealRound(PlayerSide.Cpu, lcg(7))
    const all = [...state.hands.player, ...state.hands.cpu, ...state.drawPile, state.decree]
    const keys = all.map((c) => `${c.suit}-${c.rank}`)
    expect(new Set(keys).size).toBe(33)
    expect(all).toHaveLength(33)
  })

  it("sets trumpSuit to the decree card's suit", () => {
    const state = dealRound(PlayerSide.Player, lcg(99))
    expect(state.trumpSuit).toBe(state.decree.suit)
  })

  it('sets the leader to the non-dealer side', () => {
    expect(dealRound(PlayerSide.Player, lcg(1)).leader).toBe('cpu')
    expect(dealRound(PlayerSide.Cpu, lcg(1)).leader).toBe('player')
  })

  it('starts at tricksPlayed 0, both tricksWon 0, and phase AwaitingLead', () => {
    const state = dealRound(PlayerSide.Player, lcg(3))
    expect(state.tricksPlayed).toBe(0)
    expect(state.tricksWon).toEqual({ player: 0, cpu: 0 })
    expect(state.phase).toBe(RoundPhase.AwaitingLead)
    expect(state.currentTrick).toEqual([])
  })

  it('is deterministic for the same dealer and rng', () => {
    const a = dealRound(PlayerSide.Player, lcg(55))
    const b = dealRound(PlayerSide.Player, lcg(55))
    expect(a).toEqual(b)
  })

  it('deals a characterless round when no Quarry character is given', () => {
    expect(dealRound(PlayerSide.Player, lcg(11)).quarryCharacter).toBeUndefined()
  })

  it('records the Quarry character it was dealt with', () => {
    const state = dealRound(PlayerSide.Player, lcg(11), QuarryCharacter.Monarch)
    expect(state.quarryCharacter).toBe(QuarryCharacter.Monarch)
  })

  it('leaves the rest of the deal identical whether a character is active or not', () => {
    const plain = dealRound(PlayerSide.Player, lcg(11))
    const withMonarch = dealRound(PlayerSide.Player, lcg(11), QuarryCharacter.Monarch)
    expect(withMonarch.hands).toEqual(plain.hands)
    expect(withMonarch.decree).toEqual(plain.decree)
    expect(withMonarch.drawPile).toEqual(plain.drawPile)
  })

  it('skulls only cards in the Quarry’s own hand, and never a rank 1', () => {
    const state = dealRound(PlayerSide.Player, lcg(42))
    expect(state.skulledCards).toHaveLength(Math.round(HAND_SIZE * SKULL_DENSITY))
    for (const skull of state.skulledCards) {
      expect(skull.rank).toBeGreaterThanOrEqual(SKULL_MIN_RANK)
      expect(containsCard(state.hands[PlayerSide.Cpu], skull)).toBe(true)
    }
  })

  it('opens the bank and the streak at zero with nothing resolved', () => {
    const state = dealRound(PlayerSide.Player, lcg(42))
    expect(state.bank).toBe(0)
    expect(state.multiplier).toBe(0)
    expect(state.lastResolution).toBeNull()
  })
})
