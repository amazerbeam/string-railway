import { describe, expect, it } from 'vitest'
import { checkDemand, DemandOutcome, scoreHunt, scoreRound, tricksToPoints } from '../scoring'
import { CardRank, PlayerSide, RoundPhase, Suit, type Card, type RoundState } from '../types'
import { STANDING_BANDS, StandingBandName, type StandingBand } from '../../hunt'

// Ranks that carry no Treasure(7)/Poison(8) scoring adjustment, so a flat
// cardValue override of 1 gives exactly 1 point per card — mirrors
// spoils.test.ts's own flat-value fixture, which avoids the same two ranks.
const NEUTRAL_RANKS = [1, 2, 3, 4, 5, 6, 9, 10, 11]

function fillerCards(count: number): Card[] {
  return Array.from({ length: count }, (_, i) => ({
    suit: Suit.Bells,
    rank: NEUTRAL_RANKS[i % NEUTRAL_RANKS.length],
  }))
}

function huntState(
  capturedCards: Record<'player' | 'cpu', Card[]>,
  tricksWon: Record<'player' | 'cpu', number>,
): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: Suit.Bells, rank: 2 },
    trumpSuit: Suit.Bells,
    tricksWon,
    capturedCards,
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: tricksWon.player + tricksWon.cpu,
    phase: RoundPhase.AwaitingLead,
  }
}

describe('tricksToPoints', () => {
  it.each([
    [0, 6],
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 1],
    [5, 2],
    [6, 3],
    [7, 6],
    [8, 6],
    [9, 6],
    [10, 0],
    [11, 0],
    [12, 0],
    [13, 0],
  ])('tricks=%i -> %i points', (tricks, points) => {
    expect(tricksToPoints(tricks)).toBe(points)
  })
})

describe('scoreRound', () => {
  it('scores both sides from their tricksWon, summing to a locked pair for every split', () => {
    for (let playerTricks = 0; playerTricks <= 13; playerTricks++) {
      const cpuTricks = 13 - playerTricks
      const result = scoreRound({ player: playerTricks, cpu: cpuTricks })
      expect(result.player).toBe(tricksToPoints(playerTricks))
      expect(result.cpu).toBe(tricksToPoints(cpuTricks))
    }
  })
})

describe('scoreHunt — §3 flat-value table (AC4)', () => {
  it.each([
    [0, 0, StandingBandName.Humble],
    [1, 12, StandingBandName.Humble],
    [2, 24, StandingBandName.Humble],
    [3, 36, StandingBandName.Humble],
    [4, 8, StandingBandName.Defeated],
    [5, 20, StandingBandName.Defeated],
    [6, 36, StandingBandName.Defeated],
    [7, 84, StandingBandName.Victorious],
    [8, 96, StandingBandName.Victorious],
    [9, 108, StandingBandName.Victorious],
    [10, 0, StandingBandName.Greedy],
    [11, 0, StandingBandName.Greedy],
    [12, 0, StandingBandName.Greedy],
    [13, 0, StandingBandName.Greedy],
  ])('k=%i tricks -> score %i, band %s', (k, expectedScore, expectedBand) => {
    const state = huntState({ player: fillerCards(2 * k), cpu: [] }, { player: k, cpu: 13 - k })
    const result = scoreHunt(state, PlayerSide.Player, () => 1)
    expect(result.spoils).toBe(2 * k)
    expect(result.tricks).toBe(k)
    expect(result.score).toBe(expectedScore)
    expect(result.band.name).toBe(expectedBand)
  })

  it('k=9 peaks at 108, the §3 ceiling', () => {
    const state = huntState({ player: fillerCards(18), cpu: [] }, { player: 9, cpu: 4 })
    const result = scoreHunt(state, PlayerSide.Player, () => 1)
    expect(result.score).toBe(108)
    expect(result.band.name).toBe(StandingBandName.Victorious)
  })
})

describe('scoreHunt — Humble break-even at a raised multiplier (AC5)', () => {
  it('k=3 also scores 108 when Humble is raised to ×18 in an injected table, with no other change', () => {
    const raisedHumbleTable: readonly StandingBand[] = STANDING_BANDS.map((band) =>
      band.name === StandingBandName.Humble ? { ...band, multiplier: 18 } : band,
    )
    const state = huntState({ player: fillerCards(6), cpu: [] }, { player: 3, cpu: 10 })

    const raised = scoreHunt(state, PlayerSide.Player, () => 1, raisedHumbleTable)
    expect(raised.score).toBe(108)

    // Proves the table is genuinely live: the same state, un-injected, still scores 36 —
    // the only thing that changed between the two calls is the table passed in.
    const baseline = scoreHunt(state, PlayerSide.Player, () => 1)
    expect(baseline.score).toBe(36)
  })
})

describe('scoreHunt — Greedy zeroes a round with maximal Spoils (AC6)', () => {
  it('score is 0 at k=13 even though Spoils is large (26 Monarch captures, rank-weighted default)', () => {
    const monarchCards: Card[] = Array.from({ length: 26 }, () => ({
      suit: Suit.Bells,
      rank: CardRank.Monarch,
    }))
    const state = huntState({ player: monarchCards, cpu: [] }, { player: 13, cpu: 0 })

    const result = scoreHunt(state, PlayerSide.Player)
    expect(result.spoils).toBe(26 * CardRank.Monarch)
    expect(result.standing).toBe(0)
    expect(result.band.name).toBe(StandingBandName.Greedy)
    expect(result.score).toBe(0)
  })
})

describe('checkDemand — the boundary is inclusive: equal clears (AC7)', () => {
  it('clears when score equals the demand', () => {
    expect(checkDemand(50, 50)).toBe(DemandOutcome.Cleared)
  })

  it('clears when score exceeds the demand', () => {
    expect(checkDemand(51, 50)).toBe(DemandOutcome.Cleared)
  })

  it('misses when score falls short of the demand', () => {
    expect(checkDemand(49, 50)).toBe(DemandOutcome.Missed)
  })
})
