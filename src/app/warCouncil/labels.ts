import {
  CardRank,
  DeclareRejection,
  IllegalMoveReason,
  QuarryIntentStance,
  Suit,
  type Card,
  type QuarryIntent,
} from '../../warCouncil'
import { HuntDeclaration, StandingBandName } from '../../hunt'

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
  [IllegalMoveReason.HuntNotDeclared]: 'Declare Win or Lose before you play a card.',
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

/** The verb phrase for each telegraphed stance (§4, DLR-52's QuarryIntentStance). */
export const STANCE_PHRASE: Readonly<Record<QuarryIntentStance, string>> = {
  [QuarryIntentStance.Leading]: 'lead',
  [QuarryIntentStance.Pressing]: 'press with',
  [QuarryIntentStance.Ducking]: 'duck with',
}

/** Display copy for each Standing band (§1). The multiplier is rendered beside it and is
 *  read from the band itself, never written here. */
export const STANDING_BAND_NAME: Readonly<Record<StandingBandName, string>> = {
  [StandingBandName.Humble]: 'Humble',
  [StandingBandName.Defeated]: 'Defeated',
  [StandingBandName.Victorious]: 'Victorious',
  [StandingBandName.Greedy]: 'Greedy',
}

/** AC1 — the two declarable paths, as the player sees them named. */
export const HUNT_DECLARATION_NAME: Readonly<Record<HuntDeclaration, string>> = {
  [HuntDeclaration.Win]: 'Win',
  [HuntDeclaration.Lose]: 'Lose',
}

/** Copy for `declareHunt`'s rejections. Both are structurally unreachable through the
 *  gate, which only renders while undeclared — carried so a future caller has copy. */
export const DECLARE_REJECTION_MESSAGE: Readonly<Record<DeclareRejection, string>> = {
  [DeclareRejection.AlreadyDeclared]: 'This Hunt is already declared.',
  [DeclareRejection.HuntUnderway]: 'The Hunt has started — it is too late to declare.',
}

/**
 * The telegraph's screen-reader name (AC6). `speculative` distinguishes the live reading of
 * the Quarry's own turn from the preview against a card the player has merely armed, so the
 * two never sound identical to someone who cannot see the difference in the border.
 */
export function intentAccessibleName(intent: QuarryIntent | null, speculative: boolean): string {
  if (intent === null) {
    return speculative
      ? 'The Quarry has no readable answer to that lead.'
      : 'The Quarry has no intent to read yet.'
  }
  const suit = SUIT_NAME[intent.suit]
  const phrase = intent.stance === undefined ? 'play' : STANCE_PHRASE[intent.stance]
  const body = `The Quarry will ${phrase} ${suit}.`
  return speculative ? `If you lead that card: ${body}` : body
}
