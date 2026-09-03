import type { TrickResolution } from './streak'

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
  /** DLR-163 AC2 — the decree card, or `null` once a Fox has replaced it with a bare suit.
   *  `null` does NOT mean "no trump": `trumpSuit` beside this is always live, and a `null` decree
   *  means the plate shows that suit with no card behind it. The replaced card joins `spentPile`
   *  at the instant it is replaced, so `closeHand` must not spend it a second time. */
  readonly decree: Card | null
  readonly trumpSuit: Suit
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  /** AC2 — the Quarry's dealt cards carrying a skull. Written once by `dealRound` and carried by
   *  every state spread thereafter, so a skull cannot appear or vanish mid-hand. A card that
   *  changes hands keeps its skull, which is what `trickIsSkulled` tests against. */
  readonly skulledCards: readonly Card[]
  /** DLR-167 AC3/AC7 — cards the PLAYER has cursed for the COMING TRICK. Unlike `skulledCards`
   *  above, which `dealRound` writes once and nothing changes mid-hand, this list is written
   *  mid-hand by `curseCard` and CLEARED by `playCard` at every trick's resolution: the mark is
   *  for one trick and lapses whether or not the card was played (AC7). That is exactly why it
   *  is a SEPARATE list and not an append to `skulledCards` — inside one list nothing could tell
   *  a dealt skull from a curse, so nothing would know what to lift.
   *
   *  `skullsOn` (`curse.ts`) is the ONE place this and `skulledCards` are read as one. Two
   *  readers deliberately do NOT use it — `cpuPlayer`'s card choice and `suitShape`'s readout —
   *  because both reason about the QUARRY's own dealt skulls, which a curse is not. */
  readonly cursedCards: readonly Card[]
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
  /** DLR-146 — the seed a MID-HAND reshuffle draws its order from. Written once by `dealRound`
   *  from the deal's own generator, so it inherits `dealSeedFor`'s run/encounter/hand uniqueness
   *  and a seeded encounter still reproduces every reshuffle. Replaced by `mixSeed(drawSeed,
   *  spentPile.length)` each time `drawCards` consumes it, so two reshuffles in one hand differ.
   *
   *  A plain integer rather than an `Rng` closure, deliberately: `RoundState` is immutable, plain,
   *  serialisable data, and every function in this tree takes `rng` as an explicit parameter.
   *  NOTHING to do with `reshuffled` above, which is a property of the DEAL and is never written
   *  mid-hand. */
  readonly drawSeed: number
  /** AC4/AC5 — the number of tricks taken in a row since the last cash-out. Only ever climbs
   *  until it cashes, which is the property the retired pending-damage figure lacked. */
  readonly total: number
  /** AC9 — the number of tricks taken in a row. Zero on any damage taken. */
  readonly roll: number
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
  /** DLR-163 AC1 — replaces `FoxExchange`. Carries a SUIT, not a card: nothing leaves the hand.
   *  Naming the suit already in force is accepted and behaves exactly as `DeclineTrump`, which is
   *  enforced in `applyNameTrump` rather than at the prompt so the two cannot disagree. */
  NameTrump: 'nameTrump',
  /** DLR-163 AC1 — replaces `FoxDecline`. */
  DeclineTrump: 'declineTrump',
} as const
export type AbilityChoiceKind = (typeof AbilityChoiceKind)[keyof typeof AbilityChoiceKind]

// DLR-163 AC5 — `WoodcutterDiscard` is REMOVED outright: the 5 takes no choice at all now.
export type AbilityChoice =
  | { readonly kind: typeof AbilityChoiceKind.NameTrump; readonly suit: Suit }
  | { readonly kind: typeof AbilityChoiceKind.DeclineTrump }

export const IllegalMoveReason = {
  RoundComplete: 'roundComplete',
  NotYourTurn: 'notYourTurn',
  CardNotInHand: 'cardNotInHand',
  MustFollowLeadSuit: 'mustFollowLeadSuit',
  MustFollowMonarch: 'mustFollowMonarch',
  /** DLR-163 AC1 — a 3 played with no choice. The one remaining refusal of its kind. */
  MissingAbilityChoice: 'missingAbilityChoice',
  /** DLR-163 AC5 — a choice offered with any rank but 3, which now includes the 5. */
  UnexpectedAbilityChoice: 'unexpectedAbilityChoice',
  // DLR-163 — `InvalidFoxExchangeCard` and `InvalidWoodcutterDiscard` are REMOVED. Neither rule
  // takes a card any more, so neither refusal has anything left to refuse.
} as const
export type IllegalMoveReason = (typeof IllegalMoveReason)[keyof typeof IllegalMoveReason]

export type PlayCardResult =
  | { readonly ok: true; readonly state: RoundState }
  | { readonly ok: false; readonly reason: IllegalMoveReason }
