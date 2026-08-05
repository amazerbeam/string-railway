import { cardsOfSuit, removeCard } from './cardUtils'
import { legalMoves } from './legalMoves'
import { resolveTrickWinner } from './resolveTrick'
import {
  ALL_SUITS,
  AbilityChoiceKind,
  CardRank,
  type AbilityChoice,
  type Card,
  type PlayerSide,
  type RoundState,
  type Suit,
} from './types'

export interface CpuMove {
  readonly card: Card
  readonly choice?: AbilityChoice
}

function suitOrder(suit: Suit): number {
  return ALL_SUITS.indexOf(suit)
}

function compareCards(a: Card, b: Card): number {
  return a.rank - b.rank || suitOrder(a.suit) - suitOrder(b.suit)
}

function lowestCard(cards: readonly Card[]): Card {
  return [...cards].sort(compareCards)[0]
}

// Card selection only — always drawn from legalMoves()'s own output, so this can
// never produce an illegal card. Leading: lowest legal card. Following: the lowest
// legal card that would win the trick (per the engine's own resolveTrickWinner),
// or the lowest legal card at all if none would win.
export function chooseCpuCard(state: RoundState, side: PlayerSide): Card {
  const legal = legalMoves(state, side)
  if (state.currentTrick.length === 0) {
    return lowestCard(legal)
  }
  const lead = state.currentTrick[0]
  const winners = legal.filter(
    (card) => resolveTrickWinner([lead, { side, card }], state.trumpSuit) === side,
  )
  return lowestCard(winners.length > 0 ? winners : legal)
}

// Exchanges the Fox for the lowest card of the CPU's most-held suit whenever
// that suit isn't already trump — concentrates trump in the CPU's strongest
// suit. Declines when the strongest suit is already trump, or when the Fox
// was the last card in hand (nothing left to offer).
export function chooseCpuFoxChoice(handAfterFox: readonly Card[], trumpSuit: Suit): AbilityChoice {
  if (handAfterFox.length === 0) {
    return { kind: AbilityChoiceKind.FoxDecline }
  }
  const strongestSuit = ALL_SUITS.map((suit) => cardsOfSuit(handAfterFox, suit)).reduce(
    (best, cards) => (cards.length > best.length ? cards : best),
  )
  if (strongestSuit[0].suit === trumpSuit) {
    return { kind: AbilityChoiceKind.FoxDecline }
  }
  return { kind: AbilityChoiceKind.FoxExchange, handCard: lowestCard(strongestSuit) }
}

// Always discards the lowest-ranked card of the hand after the draw — the
// simplest deterministic "keep your best cards" default. Every candidate is
// drawn from the post-draw hand, so the discard is always legal.
export function chooseCpuWoodcutterChoice(handWithDrawn: readonly Card[]): AbilityChoice {
  return { kind: AbilityChoiceKind.WoodcutterDiscard, discard: lowestCard(handWithDrawn) }
}

// Composes card selection with the matching ability choice, mirroring the same
// hand-shape construction playCard.ts itself uses internally, so the two stay
// in lockstep. Every value this can produce is drawn from a set the engine
// itself already treats as legal.
export function chooseCpuMove(state: RoundState, side: PlayerSide): CpuMove {
  const card = chooseCpuCard(state, side)
  const handAfter = removeCard(state.hands[side], card)

  if (card.rank === CardRank.Fox) {
    return { card, choice: chooseCpuFoxChoice(handAfter, state.trumpSuit) }
  }
  if (card.rank === CardRank.Woodcutter) {
    const handWithDrawn = [...handAfter, state.drawPile[0]]
    return { card, choice: chooseCpuWoodcutterChoice(handWithDrawn) }
  }
  return { card }
}
