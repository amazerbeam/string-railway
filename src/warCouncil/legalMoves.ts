import { cardsOfSuit, highestOfSuit, sameCard } from './cardUtils'
import { CardRank, type Card, type PlayerSide, type RoundState } from './types'

export function legalMoves(state: RoundState, side: PlayerSide): readonly Card[] {
  const hand = state.hands[side]

  if (state.currentTrick.length === 0) {
    return hand
  }

  const led = state.currentTrick[0].card

  if (led.rank === CardRank.Monarch) {
    const suitCards = cardsOfSuit(hand, led.suit)
    if (suitCards.length === 0) {
      return hand
    }
    const swan = suitCards.find((c) => c.rank === CardRank.Swan)
    const highest = highestOfSuit(hand, led.suit)
    const options = [swan, highest].filter((c): c is Card => c !== undefined)
    return options.filter((c, i) => options.findIndex((o) => sameCard(o, c)) === i)
  }

  const followSuit = cardsOfSuit(hand, led.suit)
  return followSuit.length > 0 ? followSuit : hand
}
