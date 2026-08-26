import { removeCard } from './cardUtils'
import { drawCards } from './encounterDeck'
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

export function applyWoodcutterDraw(
  state: RoundState,
  side: PlayerSide,
  discard: Card,
): RoundState {
  // DLR-146 — through the ONE draw primitive. Was `const [drawn, ...rest] = state.drawPile`, which
  // put `undefined` in a hand the moment the pile ran dry — unreachable before the player's refill
  // began shortening the pile mid-hand, and reachable after it.
  //
  // Unlike `applyDiscard`, this has no guard against a totally exhausted deck (`drawCards`
  // returning `drawn: []` because both the draw pile and the spent pile are empty). In that
  // degenerate case the hand shrinks by one — the discarded card leaves and nothing replaces it —
  // rather than staying net-neutral. That state is unreachable in real play: with 6+6 cards
  // committed to the two hands, all 33 cards cannot simultaneously be outside both piles. Adding a
  // throw here would put a new failure mode inside a reducer for a state the game cannot reach, so
  // this is documented rather than guarded. AC5's "an exhausted deck makes the refill a no-op"
  // promise covers the refill site, not this one.
  const draw = drawCards(state, 1)
  const handWithDrawn = [...state.hands[side], ...draw.drawn]
  return {
    ...state,
    hands: { ...state.hands, [side]: removeCard(handWithDrawn, discard) },
    drawPile: [...draw.drawPile, discard],
    spentPile: draw.spentPile,
    drawSeed: draw.drawSeed,
  }
}

export function nextLeaderAfterTrick(
  trick: readonly [TrickCard, TrickCard],
  winner: PlayerSide,
): PlayerSide {
  const swanLoser = trick.find((t) => t.card.rank === CardRank.Swan && t.side !== winner)
  return swanLoser ? swanLoser.side : winner
}
