import { PlayerSide, RoundPhase, Suit, type Card, type WarCouncilState } from '../../../warCouncil'

const card = (suit: Suit, rank: number): Card => ({ suit, rank })

/** An unstarted round the player leads. Override any field a spec needs to aim. */
export function makeRound(overrides: Partial<WarCouncilState> = {}): WarCouncilState {
  return {
    dealer: PlayerSide.Cpu,
    hands: {
      [PlayerSide.Player]: [
        card(Suit.Bells, 2),
        card(Suit.Bells, 7),
        card(Suit.Keys, 3),
        card(Suit.Keys, 8),
        card(Suit.Moons, 5),
        card(Suit.Moons, 11),
      ],
      [PlayerSide.Cpu]: [
        card(Suit.Bells, 4),
        card(Suit.Keys, 6),
        card(Suit.Moons, 9),
        card(Suit.Moons, 10),
      ],
    },
    drawPile: [
      card(Suit.Bells, 1),
      card(Suit.Bells, 5),
      card(Suit.Keys, 9),
      card(Suit.Keys, 11),
      card(Suit.Moons, 2),
      card(Suit.Moons, 6),
    ],
    decree: card(Suit.Bells, 10),
    trumpSuit: Suit.Bells,
    tricksWon: { [PlayerSide.Player]: 0, [PlayerSide.Cpu]: 0 },
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

export { card }
