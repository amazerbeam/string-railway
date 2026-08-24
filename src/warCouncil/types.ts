import type { TrickResolution } from './bank'

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

export interface Card {
  readonly suit: Suit
  readonly rank: number
}

export const PlayerSide = {
  Player: 'player',
  Cpu: 'cpu',
} as const
export type PlayerSide = (typeof PlayerSide)[keyof typeof PlayerSide]

// The seat the Quarry plays. Named so a later mode that seats the Quarry as the player has
// exactly one place to change, and so no caller writes `PlayerSide.Cpu` when it means "the
// opponent". Lived in the deleted `quarryRuleBreak.ts` until DLR-81 — it is a seat constant
// and never had anything to do with a character power.
export const QUARRY_SIDE: PlayerSide = PlayerSide.Cpu

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
  /** AC2 — the Quarry's dealt cards carrying a skull. Written once by `dealRound` and carried by
   *  every state spread thereafter, so a skull cannot appear or vanish mid-hand. A card that
   *  changes hands keeps its skull, which is what `trickIsSkulled` tests against. */
  readonly skulledCards: readonly Card[]
  /** DLR-90 AC2 — cards the player has marked with Timebomb this hand. Written by `primeCard`
   *  and carried by every state spread thereafter, exactly as `skulledCards` above is, so a mark
   *  cannot appear or vanish mid-hand and a card that changes hands keeps it — which is what
   *  `trickIsPrimed` tests against.
   *
   *  A WHOLLY SEPARATE list from `skulledCards`, and nothing whatever to do with
   *  `CardRank.Poison`: the-hunt.md §1 records that rank 8's name is an ordinary card with no rule
   *  and no connection to the skull. That is why nothing in this feature is called `poison`.
   *
   *  Hand-scoped by construction: `dealRound` rebuilds this, so a mark cannot leak into the next
   *  hand. With `HAND_SIZE` cards and that many tricks every dealt card is played, so a mark
   *  normally resolves in the hand it was made — the exception being a card the Woodcutter buries
   *  or the Fox exchanges away and never takes back, which simply wastes the charge. */
  readonly primedCards: readonly Card[]
  /** DLR-123 AC3 — cards resolved to a trick this ENCOUNTER, face-down and never inspectable
   *  (AC8). Grows by exactly two at each trick's resolution, in `playCard`, and by nothing else;
   *  seeded by `dealRound` from the encounter's carried deck, so it climbs ACROSS the hands of a
   *  fight and empties only on a reshuffle.
   *
   *  NOTHING to do with `src/warCouncil/discard.ts`, which is the PLAYER'S swap and sends its
   *  cards to the BOTTOM OF THE DRAW PILE (AC5), where they stay unseen. That is the naming
   *  collision DLR-123 was asked to resolve, and it is resolved by naming THIS pile something
   *  else: "discard" continues to mean the swap, everywhere, unchanged. */
  readonly spentPile: readonly Card[]
  /** DLR-123 AC9 — whether THIS hand was dealt from a reshuffle. Written once by `dealRound` and
   *  read only by the felt's notice. Hand-scoped by construction: the next deal rewrites it, so a
   *  notice cannot persist into a hand that was not reshuffled. */
  readonly reshuffled: boolean
  /** AC4/AC5 — the number of tricks taken in a row since the last cash-out. Only ever climbs
   *  until it cashes, which is the property the retired pending-damage figure lacked. */
  readonly bank: number
  /** AC9 — the number of tricks taken in a row. Zero on any damage taken. */
  readonly multiplier: number
  /** The resolution of the trick that just completed. `null` on a fresh deal and after a lead.
   *  The reducer reads it to apply damage; the felt reads it to say what happened. */
  readonly lastResolution: TrickResolution | null
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
