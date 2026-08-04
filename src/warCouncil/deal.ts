import { createDeck } from './deck'
import { shuffle } from './shuffle'
import { otherSide, PlayerSide, RoundPhase, type RoundState } from './types'

export function dealRound(dealer: PlayerSide, rng: () => number): RoundState {
  const shuffled = shuffle(createDeck(), rng)
  const playerHand = shuffled.slice(0, 13)
  const cpuHand = shuffled.slice(13, 26)
  const remaining = shuffled.slice(26)
  const decree = remaining[0]
  const drawPile = remaining.slice(1)

  return {
    dealer,
    hands: { [PlayerSide.Player]: playerHand, [PlayerSide.Cpu]: cpuHand },
    drawPile,
    decree,
    trumpSuit: decree.suit,
    tricksWon: { [PlayerSide.Player]: 0, [PlayerSide.Cpu]: 0 },
    currentTrick: [],
    leader: otherSide(dealer),
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
  }
}
