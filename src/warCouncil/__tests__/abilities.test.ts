import { describe, expect, it } from 'vitest'
import { createSeededRng } from '../../hunt'
import { applyFoxExchange, applyWoodcutterDraw, nextLeaderAfterTrick } from '../abilities'
import { dealRound } from '../deal'
import { FRESH_ENCOUNTER_DECK } from '../encounterDeck'
import { PlayerSide, RoundPhase, type RoundState } from '../types'

function baseState(overrides: Partial<RoundState> = {}): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: {
      player: [
        { suit: 'keys', rank: 3 },
        { suit: 'moons', rank: 6 },
      ],
      cpu: [{ suit: 'bells', rank: 8 }],
    },
    drawPile: [
      { suit: 'moons', rank: 2 },
      { suit: 'keys', rank: 5 },
    ],
    decree: { suit: 'bells', rank: 4 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
    skulledCards: [],
    primedCards: [],
    spentPile: [],
    reshuffled: false,
    drawSeed: 0,
    total: 0,
    roll: 0,
    lastResolution: null,
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

describe('applyFoxExchange', () => {
  it('swaps the decree for the given hand card and updates trumpSuit', () => {
    const state = baseState()
    const next = applyFoxExchange(state, 'player', { suit: 'moons', rank: 6 })
    expect(next.decree).toEqual({ suit: 'moons', rank: 6 })
    expect(next.trumpSuit).toBe('moons')
    expect(next.hands.player).toEqual([
      { suit: 'keys', rank: 3 },
      { suit: 'bells', rank: 4 },
    ])
  })
})

describe('applyWoodcutterDraw', () => {
  it('draws the top of the draw pile into hand, then discards the chosen card to the bottom', () => {
    const state = baseState()
    const next = applyWoodcutterDraw(state, 'cpu', { suit: 'bells', rank: 8 })
    expect(next.hands.cpu).toEqual([{ suit: 'moons', rank: 2 }])
    expect(next.drawPile).toEqual([
      { suit: 'keys', rank: 5 },
      { suit: 'bells', rank: 8 },
    ])
  })

  it('draw pile length is unchanged after a draw-then-discard', () => {
    const state = baseState()
    const next = applyWoodcutterDraw(state, 'player', { suit: 'keys', rank: 3 })
    expect(next.drawPile).toHaveLength(state.drawPile.length)
  })

  it('DLR-146 — an empty draw pile reshuffles rather than putting `undefined` in the hand', () => {
    const dealt = dealRound(PlayerSide.Cpu, createSeededRng(9), FRESH_ENCOUNTER_DECK)
    const empty = { ...dealt, drawPile: [], spentPile: dealt.drawPile }
    const discard = empty.hands[PlayerSide.Player][0]
    const result = applyWoodcutterDraw(empty, PlayerSide.Player, discard)
    expect(result.hands[PlayerSide.Player]).toHaveLength(empty.hands[PlayerSide.Player].length)
    expect(result.hands[PlayerSide.Player].every((c) => c !== undefined)).toBe(true)
    expect(result.drawPile.at(-1)).toEqual(discard)
  })
})

describe('nextLeaderAfterTrick', () => {
  it('the winner leads next when no Swan is in the trick', () => {
    const trick = [
      { side: 'player' as const, card: { suit: 'bells', rank: 4 } },
      { side: 'cpu' as const, card: { suit: 'bells', rank: 9 } },
    ] as const
    expect(nextLeaderAfterTrick(trick, 'cpu')).toBe('cpu')
  })

  it('the losing Swan-player leads next instead of the winner', () => {
    const trick = [
      { side: 'player' as const, card: { suit: 'moons', rank: 1 } },
      { side: 'cpu' as const, card: { suit: 'moons', rank: 7 } },
    ] as const
    expect(nextLeaderAfterTrick(trick, 'cpu')).toBe('player')
  })

  it('two Swans in one trick: the loser leads next', () => {
    const trick = [
      { side: 'player' as const, card: { suit: 'bells', rank: 1 } },
      { side: 'cpu' as const, card: { suit: 'moons', rank: 1 } },
    ] as const
    expect(nextLeaderAfterTrick(trick, 'player')).toBe('cpu')
  })
})
