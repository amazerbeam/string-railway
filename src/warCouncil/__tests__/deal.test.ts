import { describe, expect, it } from 'vitest'
import { HAND_SIZE, SKULL_DENSITY, SKULL_RANK_WEIGHTS } from '../../hunt'
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

  it('carries no Quarry character into engine state at all', () => {
    // DLR-81: the character is an identity label held by `Hunt` for the dossier panel, and the
    // engine has no field for it. A round state that carried one would mean a power could read it.
    expect(dealRound(PlayerSide.Player, lcg(11))).not.toHaveProperty('quarryCharacter')
  })

  it('skulls only cards in the Quarry’s own hand, and never a rank 1', () => {
    const state = dealRound(PlayerSide.Player, lcg(42))
    expect(state.skulledCards).toHaveLength(Math.round(HAND_SIZE * SKULL_DENSITY))
    for (const skull of state.skulledCards) {
      expect(SKULL_RANK_WEIGHTS[skull.rank]).toBeGreaterThan(0)
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
