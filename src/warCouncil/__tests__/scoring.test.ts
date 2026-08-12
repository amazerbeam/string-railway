import { describe, expect, it } from 'vitest'
import { scoreHunt } from '../scoring'
import { CardRank, PlayerSide, RoundPhase, Suit, type Card, type RoundState } from '../types'
import {
  cardValueFor,
  HuntDeclaration,
  resolveStanding,
  standingTableFor,
  StandingBandName,
  type StandingBand,
} from '../../hunt'

function fillerCards(count: number): Card[] {
  return Array.from({ length: count }, (_, i) => ({ suit: Suit.Bells, rank: (i % 11) + 1 }))
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

const winTable = standingTableFor(HuntDeclaration.Win)

describe('scoreHunt — the product of the two terms, over the Win table', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])(
    'k=%i tricks -> spoils × the band multiplier',
    (k) => {
      const state = huntState({ player: fillerCards(2 * k), cpu: [] }, { player: k, cpu: 13 - k })
      const band = resolveStanding(k, winTable)
      const result = scoreHunt(state, PlayerSide.Player, () => 1)
      expect(result.spoils).toBe(2 * k)
      expect(result.tricks).toBe(k)
      expect(result.band.name).toBe(band.name)
      expect(result.damage).toBe(2 * k * band.multiplier)
    },
  )
})

describe('scoreHunt — the standing table is genuinely injectable', () => {
  it('scores off an injected table and leaves the real exports unaffected', () => {
    const raised: readonly StandingBand[] = winTable.map((band) =>
      band.name === StandingBandName.Humble ? { ...band, multiplier: 18 } : band,
    )
    const state = huntState({ player: fillerCards(6), cpu: [] }, { player: 3, cpu: 10 })

    expect(scoreHunt(state, PlayerSide.Player, () => 1, raised).damage).toBe(6 * 18)

    // The same state, un-injected: the only thing that changed between the two calls is
    // the table passed in.
    const baseline = scoreHunt(state, PlayerSide.Player, () => 1)
    expect(baseline.damage).toBe(6 * resolveStanding(3, winTable).multiplier)
    expect(baseline.damage).not.toBe(6 * 18)
  })
})

describe('scoreHunt — the Greedy band still caps a round with maximal Spoils', () => {
  it('damage is capped by the Greedy multiplier at k=13 even though Spoils is large (26 Monarch captures, rank-weighted default)', () => {
    const monarchCards: Card[] = Array.from({ length: 26 }, () => ({
      suit: Suit.Bells,
      rank: CardRank.Monarch,
    }))
    const state = huntState({ player: monarchCards, cpu: [] }, { player: 13, cpu: 0 })

    const result = scoreHunt(state, PlayerSide.Player)
    expect(result.spoils).toBe(26 * CardRank.Monarch)
    expect(result.standing).toBe(resolveStanding(13, winTable).multiplier)
    expect(result.band.name).toBe(StandingBandName.Greedy)
    expect(result.damage).toBe(26 * CardRank.Monarch * result.standing)
  })
})

describe('scoreHunt — both defaults come from the state’s own declaration (DLR-67)', () => {
  it.each([HuntDeclaration.Win, HuntDeclaration.Lose])(
    'reads cardValueFor(%s) and standingTableFor(%s) with no argument supplied',
    (path) => {
      const state = {
        ...huntState({ player: fillerCards(8), cpu: [] }, { player: 4, cpu: 9 }),
        declaration: { path },
      }
      const expected = scoreHunt(
        state,
        PlayerSide.Player,
        cardValueFor(path),
        standingTableFor(path),
      )
      expect(scoreHunt(state, PlayerSide.Player)).toEqual(expected)
      expect(scoreHunt(state, PlayerSide.Player).standing).toBe(
        resolveStanding(4, standingTableFor(path)).multiplier,
      )
    },
  )

  it('reads the Win table on an undeclared round', () => {
    const state = huntState({ player: fillerCards(8), cpu: [] }, { player: 4, cpu: 9 })
    expect(scoreHunt(state, PlayerSide.Player).standing).toBe(
      resolveStanding(4, winTable).multiplier,
    )
  })
})
