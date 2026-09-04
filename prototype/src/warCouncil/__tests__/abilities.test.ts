import { describe, expect, it } from 'vitest'
import { createSeededRng } from '../../hunt'
import {
  applyNameTrump,
  applyQuarrySwap,
  chooseQuarrySwapCard,
  nextLeaderAfterTrick,
} from '../abilities'
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
    cursedCards: [],
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

// DLR-163 — `applyFoxExchange`'s exchange case is replaced by `applyNameTrump`, which takes
// nothing from hand; the full rule is pinned in `nameTrump.test.ts`. `applyWoodcutterDraw`'s
// draw-and-bury is replaced by `applyQuarrySwap`, pinned in `quarrySwap.test.ts`. The two cases
// kept here are the ones that were about THIS file's own primitives.
describe('applyNameTrump', () => {
  it('takes nothing from hand and moves the replaced decree to the spent pile', () => {
    const state = baseState()
    const next = applyNameTrump(state, 'moons')
    expect(next.decree).toBeNull()
    expect(next.trumpSuit).toBe('moons')
    expect(next.hands.player).toEqual(state.hands.player)
    expect(next.spentPile).toEqual([{ suit: 'bells', rank: 4 }])
  })
})

describe('chooseQuarrySwapCard', () => {
  it('gives up the lowest-ranked held card', () => {
    expect(
      chooseQuarrySwapCard([
        { suit: 'bells', rank: 8 },
        { suit: 'keys', rank: 2 },
      ]),
    ).toEqual({ suit: 'keys', rank: 2 })
  })

  it('returns null for an empty hand rather than throwing', () => {
    expect(chooseQuarrySwapCard([])).toBeNull()
  })
})

describe('applyQuarrySwap', () => {
  it('draws into the Quarry hand and buries the swapped card at the bottom of the draw pile', () => {
    const state = baseState()
    const next = applyQuarrySwap(state, { suit: 'bells', rank: 8 })
    expect(next.hands.cpu).toEqual([{ suit: 'moons', rank: 2 }])
    expect(next.drawPile).toEqual([
      { suit: 'keys', rank: 5 },
      { suit: 'bells', rank: 8 },
    ])
  })

  it('DLR-146 — an empty draw pile reshuffles rather than putting `undefined` in the hand', () => {
    const dealt = dealRound(PlayerSide.Cpu, createSeededRng(9), FRESH_ENCOUNTER_DECK)
    const empty = { ...dealt, drawPile: [], spentPile: dealt.drawPile }
    const swapped = empty.hands[PlayerSide.Cpu][0]
    const result = applyQuarrySwap(empty, swapped)
    expect(result.hands[PlayerSide.Cpu]).toHaveLength(empty.hands[PlayerSide.Cpu].length)
    expect(result.hands[PlayerSide.Cpu].every((c) => c !== undefined)).toBe(true)
    expect(result.drawPile.at(-1)).toEqual(swapped)
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
