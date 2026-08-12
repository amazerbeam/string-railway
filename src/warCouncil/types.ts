import { HuntDeclaration, type QuarryCharacter } from '../hunt'

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

/**
 * The declaration made before the first trick. Narrowed to `path` alone on DLR-67 — the
 * Lose path's three-field credit-pool bookkeeping is retired along with the mechanic that
 * spent it (§1: the pile swap "replaces it outright"). Kept as a nested object rather than
 * a bare field on `RoundState` so a reader still has exactly one absence check.
 */
export interface DeclarationState {
  readonly path: HuntDeclaration
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
  /**
   * The encounter's round-long rule-break (§4). Written once by `dealRound` and carried
   * by every state spread in `playCard`/`abilities`, so it cannot toggle mid-round
   * (DLR-51 AC1). Absent means no character is active and the base rules apply unchanged
   * — optional so the specs' hand-built `RoundState` literals still compile.
   */
  readonly quarryCharacter?: QuarryCharacter
  /**
   * DLR-63 AC1. Written once by `declareHunt` and never updated thereafter. Optional —
   * absent means undeclared, which is the pre-DLR-63 shape every existing spec fixture
   * holds, and which `spoils` treats identically to a Win declaration (AC2). Required
   * would break 22 hand-built `RoundState` literals for no gain; this follows
   * `quarryCharacter?`'s precedent.
   */
  readonly declaration?: DeclarationState
}

export function currentTurn(state: RoundState): PlayerSide {
  return state.currentTrick.length === 0 ? state.leader : otherSide(state.currentTrick[0].side)
}

/**
 * The value scheme and Standing table in force. An undeclared round reads as Win: nothing has
 * scored yet, and the readouts need a table to display before the player declares. The single
 * statement of that default — `spoils`, `scoreHunt` and the status band all read it here rather
 * than each writing their own `?? HuntDeclaration.Win`.
 *
 * NOT the path `huntDamage` takes. Its undeclared-reads-as-Win default is right for a readout
 * and wrong for scoring — routed through here, an undeclared Hunt would score cleanly off the
 * Win table and deal damage no rule authorised. `huntDamage` reads `state.declaration`
 * directly and throws `HuntNotScorableError` instead (DLR-68 AC5).
 */
export function declaredPath(state: RoundState): HuntDeclaration {
  return state.declaration?.path ?? HuntDeclaration.Win
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
  HuntNotDeclared: 'huntNotDeclared',
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
