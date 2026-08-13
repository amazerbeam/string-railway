import {
  CardRank,
  DeclareRejection,
  IllegalMoveReason,
  QuarryIntentStance,
  Suit,
  type Card,
  type QuarryIntent,
} from '../../warCouncil'
import { DuelSide, HuntDeclaration, StandingBandName } from '../../hunt'
import type { HealthBarView } from './duelHealthBars'

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

/** Group label for the Standing track (DLR-68). Kept beside `STANDING_BAND_NAME` because both
 *  are display copy for the same module — see `.claude/skills/react-frontend/SKILL.md`. */
export const STANDING_TRACK_LABEL = 'Standing track'

/** AC1/AC7 — each bar's accessible name. The two must differ, because `getByRole('meter', …)`
 *  is how the spec distinguishes them. */
export const HEALTH_BAR_LABEL: Readonly<Record<DuelSide, string>> = {
  [DuelSide.Player]: 'Your health',
  [DuelSide.Quarry]: 'The Quarry’s health',
}

/**
 * AC7's one sentence: both the current and the pending figure, for a reader who cannot see the
 * bar's two segments. `aria-valuenow` can carry only one number, so the second lives here.
 *
 * "Nothing at risk yet" rather than "0 at risk": before the declaration there is no table to read
 * and `pendingHuntDamage` returns `null`, which is a different state from a Hunt that genuinely
 * threatens nothing.
 */
export function healthBarValueText(view: HealthBarView): string {
  const standing = `${view.current} of ${view.max}.`
  if (view.lethal) return `${standing} Lethal this Hunt.`
  if (view.pending === 0) return `${standing} Nothing at risk yet.`
  return `${standing} ${view.pending} at risk this Hunt.`
}

/** The end panel's two-stage control (AC4). Stage one commits the damage so the bars can be seen
 *  to move; stage two leaves the Hunt. */
export const APPLY_DAMAGE_LABEL = 'Apply the damage'
export const FINISH_ROUND_LABEL = 'Deal the next Hunt'

/** The terminal state when a bar empties. Keyed by the winner `applyHunt` resolved — the tie is
 *  already decided by `SIMULTANEOUS_DEPLETION_WINNER`, so there is no third case here.
 *  Placeholder copy: the wording is the developer's. */
export const ENCOUNTER_OUTCOME: Readonly<Record<DuelSide, string>> = {
  [DuelSide.Player]: 'The Quarry is down. The encounter is yours.',
  [DuelSide.Quarry]: 'You are down. The run ends here.',
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
