export const Suit = {
  Bells: 'bells',
  Keys: 'keys',
  Moons: 'moons',
} as const
export type Suit = (typeof Suit)[keyof typeof Suit]

export const ALL_SUITS: readonly Suit[] = [Suit.Bells, Suit.Keys, Suit.Moons]
export const RANKS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

// Every rank with a named ability or scoring rule — referenced by name at every
// branch that keys off one of them, rather than as a bare numeric literal.
// Treasure (7) and Poison (8) are scoring interventions rather than play-time
// triggers (fox-in-the-forest.md → Poison cards; hybrid-design.md §1's component
// table) but are named here for the same reason.
export const CardRank = {
  Swan: 1,
  Fox: 3,
  Woodcutter: 5,
  Treasure: 7,
  Poison: 8,
  Witch: 9,
  Monarch: 11,
} as const

// Consolidates the round-length literal previously duplicated as a bare `13` in playCard.ts
// and deal.ts, and separately declared in the now-deleted src/app/tricksWon.ts.
export const TRICKS_PER_ROUND = 13

export interface Card {
  readonly suit: Suit
  readonly rank: number
}

export const PlayerSide = {
  Player: 'player',
  Cpu: 'cpu',
} as const
export type PlayerSide = (typeof PlayerSide)[keyof typeof PlayerSide]

export function otherSide(side: PlayerSide): PlayerSide {
  return side === PlayerSide.Player ? PlayerSide.Cpu : PlayerSide.Player
}

export const RoundPhase = {
  AwaitingLead: 'awaitingLead',
  AwaitingFollow: 'awaitingFollow',
  Complete: 'complete',
} as const
export type RoundPhase = (typeof RoundPhase)[keyof typeof RoundPhase]

export interface TrickCard {
  readonly side: PlayerSide
  readonly card: Card
}

export interface RoundState {
  readonly dealer: PlayerSide
  readonly hands: Readonly<Record<PlayerSide, readonly Card[]>>
  readonly drawPile: readonly Card[]
  readonly decree: Card
  readonly trumpSuit: Suit
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly capturedCards: Readonly<Record<PlayerSide, readonly Card[]>>
  readonly currentTrick: readonly TrickCard[]
  readonly leader: PlayerSide
  readonly tricksPlayed: number
  readonly phase: RoundPhase
}

export function currentTurn(state: RoundState): PlayerSide {
  return state.currentTrick.length === 0 ? state.leader : otherSide(state.currentTrick[0].side)
}

export const AbilityChoiceKind = {
  FoxExchange: 'foxExchange',
  FoxDecline: 'foxDecline',
  WoodcutterDiscard: 'woodcutterDiscard',
} as const
export type AbilityChoiceKind = (typeof AbilityChoiceKind)[keyof typeof AbilityChoiceKind]

export type AbilityChoice =
  | { readonly kind: typeof AbilityChoiceKind.FoxExchange; readonly handCard: Card }
  | { readonly kind: typeof AbilityChoiceKind.FoxDecline }
  | { readonly kind: typeof AbilityChoiceKind.WoodcutterDiscard; readonly discard: Card }

export const IllegalMoveReason = {
  RoundComplete: 'roundComplete',
  NotYourTurn: 'notYourTurn',
  CardNotInHand: 'cardNotInHand',
  MustFollowLeadSuit: 'mustFollowLeadSuit',
  MustFollowMonarch: 'mustFollowMonarch',
  MissingAbilityChoice: 'missingAbilityChoice',
  UnexpectedAbilityChoice: 'unexpectedAbilityChoice',
  InvalidFoxExchangeCard: 'invalidFoxExchangeCard',
  InvalidWoodcutterDiscard: 'invalidWoodcutterDiscard',
} as const
export type IllegalMoveReason = (typeof IllegalMoveReason)[keyof typeof IllegalMoveReason]

export type PlayCardResult =
  | { readonly ok: true; readonly state: RoundState }
  | { readonly ok: false; readonly reason: IllegalMoveReason }
