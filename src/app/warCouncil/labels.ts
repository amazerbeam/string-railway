import {
  CardRank,
  IllegalMoveReason,
  QuarryIntentStance,
  Suit,
  TrickOutcome,
  type Card,
  type QuarryIntent,
  type SuitShape,
} from '../../warCouncil'
import { DuelSide } from '../../hunt'
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

/** `skulled` defaults to `false` so every existing call site — none of which yet knows whether
 *  the card it names carries a skull — keeps compiling unchanged; a caller that does know passes
 *  it explicitly. */
export function cardAccessibleName(card: Card, skulled = false): string {
  const base = `${card.rank} of ${SUIT_NAME[card.suit]}`
  const named = RANK_NAME[card.rank]
  const name = named ? `${base} (${named})` : base
  return skulled ? `${name}, skulled` : name
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

/** The verb phrase for each telegraphed stance (§4, DLR-52's QuarryIntentStance). */
export const STANCE_PHRASE: Readonly<Record<QuarryIntentStance, string>> = {
  [QuarryIntentStance.Leading]: 'lead',
  [QuarryIntentStance.Pressing]: 'press with',
  [QuarryIntentStance.Ducking]: 'duck with',
}

/** AC1/AC7 — each bar's accessible name. The two must differ, because `getByRole('meter', …)`
 *  is how the spec distinguishes them. */
export const HEALTH_BAR_LABEL: Readonly<Record<DuelSide, string>> = {
  [DuelSide.Player]: 'Your health',
  [DuelSide.Quarry]: 'The Quarry’s health',
}

/**
 * AC6's one sentence, for a reader who cannot see the row.
 *
 * The current-of-max reading is byte-identical to DLR-80's whenever `pending` is 0, which is every
 * shape the pre-DLR-86 assertions pin. The at-risk clause exists because DLR-86 gives a sighted
 * player a preview of what the streak would cash for, and a meter whose text is less true than its
 * picture is worse than one with no picture. Placeholder copy: the wording is the developer's.
 */
export function healthBarValueText(view: HealthBarView): string {
  const standing = `${view.current} of ${view.max}.`
  const atRisk = view.pending > 0 ? ` ${view.pending} at risk.` : ''
  return view.lethal ? `${standing}${atRisk} Lethal.` : `${standing}${atRisk}`
}

export const FINISH_ROUND_LABEL = 'Deal the next Hunt'

/** §3.2's four outcomes, as the player is told them. Placeholder copy: the wording is the
 *  developer's. */
export const TRICK_OUTCOME_MESSAGE: Readonly<Record<TrickOutcome, string>> = {
  [TrickOutcome.CleanWin]: 'Clean trick, taken. The streak climbs.',
  [TrickOutcome.Dodge]: 'Skull dodged. The streak climbs.',
  [TrickOutcome.CleanLoss]: 'Clean trick lost. 1 damage — the streak cashes.',
  [TrickOutcome.SkullWin]: 'You ate the skull. 1 damage — the streak cashes.',
}

export const SKULL_MARK_LABEL = 'Skull'
export const TRICKS_LABEL = 'Tricks'
export const MULTIPLIER_LABEL = 'Multiplier'
export const QUARRY_SHAPE_LABEL = 'What the Quarry holds'

/** One suit row's own phrase (AC11) — never a rank. The single owner of this wording: both
 *  `quarryShapeText`'s joined sentence and `QuarryShape.tsx`'s per-row `aria-label` build from
 *  this rather than each spelling the phrase out separately (DLR-80 review — the two had drifted
 *  into two copies of the same phrase, one live and one tested only against itself). */
export function suitShapeRowText(row: SuitShape): string {
  const skulls = row.skulled === 0 ? 'none skulled' : `${row.skulled} skulled`
  return `${SUIT_NAME[row.suit]}: ${row.held} held, ${skulls}`
}

/** One sentence for a reader who cannot see the shape rows (AC11) — never a rank. */
export function quarryShapeText(shape: readonly SuitShape[]): string {
  return `${QUARRY_SHAPE_LABEL} — ${shape.map(suitShapeRowText).join('; ')}.`
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
