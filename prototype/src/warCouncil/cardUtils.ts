import type { Card, Suit } from './types'

export function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank
}

export function containsCard(hand: readonly Card[], card: Card): boolean {
  return hand.some((c) => sameCard(c, card))
}

export function removeCard(hand: readonly Card[], card: Card): Card[] {
  const index = hand.findIndex((c) => sameCard(c, card))
  if (index === -1) return [...hand]
  return [...hand.slice(0, index), ...hand.slice(index + 1)]
}

export function cardsOfSuit(hand: readonly Card[], suit: Suit): Card[] {
  return hand.filter((c) => c.suit === suit)
}

export function highestOfSuit(hand: readonly Card[], suit: Suit): Card | undefined {
  return cardsOfSuit(hand, suit).reduce<Card | undefined>(
    (highest, c) => (!highest || c.rank > highest.rank ? c : highest),
    undefined,
  )
}
