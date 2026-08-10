import { describe, expect, it } from 'vitest'
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
  it('deals 13 cards to each side, a 6-card draw pile, and a decree card', () => {
    const state = dealRound(PlayerSide.Player, lcg(42))
    expect(state.hands.player).toHaveLength(13)
    expect(state.hands.cpu).toHaveLength(13)
    expect(state.drawPile).toHaveLength(6)
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
    expect(state.capturedCards).toEqual({ player: [], cpu: [] })
    expect(state.phase).toBe(RoundPhase.AwaitingLead)
    expect(state.currentTrick).toEqual([])
  })

  it('is deterministic for the same dealer and rng', () => {
    const a = dealRound(PlayerSide.Player, lcg(55))
    const b = dealRound(PlayerSide.Player, lcg(55))
    expect(a).toEqual(b)
  })
})
