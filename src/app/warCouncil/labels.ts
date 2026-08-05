import { CardRank, IllegalMoveReason, Suit, type Card } from '../../warCouncil'

export const SUIT_NAME: Readonly<Record<Suit, string>> = {
  [Suit.Bells]: 'Bells',
  [Suit.Keys]: 'Keys',
  [Suit.Moons]: 'Moons',
}

export const RANK_NAME: Readonly<Record<number, string>> = {
  [CardRank.Swan]: 'Swan',
  [CardRank.Fox]: 'Fox',
  [CardRank.Woodcutter]: 'Woodcutter',
  [CardRank.Witch]: 'Witch',
  [CardRank.Monarch]: 'Monarch',
}

export function cardAccessibleName(card: Card): string {
  const base = `${card.rank} of ${SUIT_NAME[card.suit]}`
  const named = RANK_NAME[card.rank]
  return named ? `${base} (${named})` : base
}

/** A stable React list key for a card — suit and rank never repeat within one hand or pile. */
export function cardKey(card: Card): string {
  return `${card.suit}-${card.rank}`
}

export const ILLEGAL_MOVE_MESSAGE: Readonly<Record<IllegalMoveReason, string>> = {
  [IllegalMoveReason.RoundComplete]: 'The round is over.',
  [IllegalMoveReason.NotYourTurn]: 'It is not your turn.',
  [IllegalMoveReason.CardNotInHand]: 'That card is not in your hand.',
  [IllegalMoveReason.MustFollowLeadSuit]: 'You must follow the led suit.',
  [IllegalMoveReason.MustFollowMonarch]:
    'The Monarch was led — play your Swan or your highest card of that suit.',
  [IllegalMoveReason.MissingAbilityChoice]: 'Choose what this card does before playing it.',
  [IllegalMoveReason.UnexpectedAbilityChoice]: 'That card takes no choice.',
  [IllegalMoveReason.InvalidFoxExchangeCard]: 'That card is not available to exchange.',
  [IllegalMoveReason.InvalidWoodcutterDiscard]: 'That card is not available to discard.',
}
