import { removeCard } from './cardUtils'
import { CardRank, type Card, type PlayerSide, type RoundState, type TrickCard } from './types'

export function applyFoxExchange(state: RoundState, side: PlayerSide, handCard: Card): RoundState {
  const handWithoutGivenCard = removeCard(state.hands[side], handCard)
  return {
    ...state,
    decree: handCard,
    trumpSuit: handCard.suit,
    hands: { ...state.hands, [side]: [...handWithoutGivenCard, state.decree] },
  }
}

// drawPile's length never changes once dealt, for the life of a round — every draw pairs with a
// discard back onto the pile; do not add a mutator that breaks this pairing without
// re-checking this function
export function applyWoodcutterDraw(
  state: RoundState,
  side: PlayerSide,
  discard: Card,
): RoundState {
  const [drawn, ...restOfPile] = state.drawPile
  const handWithDrawn = [...state.hands[side], drawn]
  const finalHand = removeCard(handWithDrawn, discard)
  return {
    ...state,
    hands: { ...state.hands, [side]: finalHand },
    drawPile: [...restOfPile, discard],
  }
}

export function nextLeaderAfterTrick(
  trick: readonly [TrickCard, TrickCard],
  winner: PlayerSide,
): PlayerSide {
  const swanLoser = trick.find((t) => t.card.rank === CardRank.Swan && t.side !== winner)
  return swanLoser ? swanLoser.side : winner
}
