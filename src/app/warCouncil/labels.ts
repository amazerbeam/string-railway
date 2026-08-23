import {
  ApplyDamageRefusal,
  CardRank,
  DiscardRefusal,
  IllegalMoveReason,
  QuarryIntentStance,
  Suit,
  TrickOutcome,
  type Card,
  type QuarryIntent,
  type SuitShape,
} from '../../warCouncil'
import { DuelSide, timebombDamageFor, MAX_CARDS_PER_DISCARD } from '../../hunt'
import type { HealthBarView } from './duelHealthBars'
import { CheatStage, TimebombStage } from './roundUiState'

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

/** Which markers a card is carrying. An OBJECT rather than positional booleans: DLR-90 added a
 *  second marker, and `cardAccessibleName(card, true, false)` is one transposition away from
 *  announcing the wrong one — on the exact surface a player who cannot see the card depends on. */
export interface CardMarks {
  readonly skulled?: boolean
  readonly primed?: boolean
}

/** `marks` is optional so every call site that names an unmarked card keeps compiling unchanged;
 *  a caller that knows a card's markers passes them. Skull before Timebomb, matching the order the
 *  two marks are drawn in. PLACEHOLDER COPY, as this file's rest is. */
export function cardAccessibleName(card: Card, marks: CardMarks = {}): string {
  const base = `${card.rank} of ${SUIT_NAME[card.suit]}`
  const named = RANK_NAME[card.rank]
  const name = named ? `${base} (${named})` : base
  const suffix = [marks.skulled && 'skulled', marks.primed && 'primed'].filter(Boolean).join(', ')
  return suffix ? `${name}, ${suffix}` : name
}

/** The mark's own label, beside `SKULL_MARK_LABEL`. PLACEHOLDER copy. */
export const PRIMED_MARK_LABEL = 'Primed'

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
 *  is how the spec distinguishes them.
 *
 *  The Quarry entry is now only the FALLBACK for an unnamed opponent — see
 *  `quarryHealthLabel` below, which is what the app actually renders. */
export const HEALTH_BAR_LABEL: Readonly<Record<DuelSide, string>> = {
  [DuelSide.Player]: 'Your health',
  [DuelSide.Quarry]: 'The Quarry’s health',
}

/**
 * The Quarry bar's name, after the opponent being fought — `Aoife’s health`.
 *
 * DLR-85 named the opponent on every RUN-level surface (the map, the verdict, the shop, the fight
 * counter) and deliberately left the fight screen generic, which put "Aoife" and "The Quarry" on
 * screen at the same time. This closes half of that seam; the dossier is the other half.
 *
 * Falls back to `HEALTH_BAR_LABEL[Quarry]` when no name is known, so the generic wording is stated
 * once rather than duplicated at a call site. Production always passes a name — every entry in
 * `RUN_ENCOUNTERS` has one — so the fallback is a guard, not a path the player reaches.
 *
 * Takes an already-resolved NAME, not an index or a run: this module holds copy, and the card layer
 * must not learn how to look an opponent up. Same discipline as `runLabel`.
 *
 * PLACEHOLDER COPY — the possessive wording is the developer's, as with everything else in here.
 */
export function quarryHealthLabel(name: string | undefined): string {
  return name === undefined ? HEALTH_BAR_LABEL[DuelSide.Quarry] : `${name}’s health`
}

/**
 * DLR-86 AC6's one sentence, for a reader who cannot see the row.
 *
 * The current-of-max reading is byte-identical to DLR-80's whenever `pending` is 0, and the
 * at-risk clause is byte-identical to DLR-86's whenever `ticking` is 0 — which is every shape the
 * earlier assertions pin.
 *
 * DLR-101 splits the two clauses because they are two different claims. "At risk" is conditional
 * and evaporates if the streak breaks; "ticking" is committed and lands at the next trick. A
 * meter that calls a booked hit "at risk" is less true than its own picture, which this file's
 * own standard says is worse than having no picture at all. Placeholder copy: the wording is the
 * developer's.
 */
export function healthBarValueText(view: HealthBarView): string {
  const standing = `${view.current} of ${view.max}.`
  const atRiskOnly = view.pending - view.ticking
  const atRisk = atRiskOnly > 0 ? ` ${atRiskOnly} at risk.` : ''
  const ticking = view.ticking > 0 ? ` ${view.ticking} ticking.` : ''
  const body = `${standing}${atRisk}${ticking}`
  return view.lethal ? `${body} Lethal.` : body
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

/** The Cheat rail's copy (DLR-83). PLACEHOLDER — the wording is the developer's, exactly as
 *  `FINISH_ROUND_LABEL` and `TRICK_OUTCOME_MESSAGE` above are. */
export const CHEAT_RAIL_LABEL = 'Cheats'
export const CHEAT_EMPTY_SLOT_LABEL = 'Empty Cheat slot'
export const CHEAT_ARMED_HINT = 'Cheat armed — play any card in your hand'
export const CHEAT_POISED_HINT = 'Tap the Cheat again to arm it'

/** One slot's accessible name. `null` is a held but unselected Cheat. The three must differ —
 *  `getByRole('button', { name })` is how the spec tells the stages apart. */
export function cheatAccessibleName(stage: CheatStage | null): string {
  if (stage === CheatStage.Armed) return 'Cheat, armed'
  if (stage === CheatStage.Poised) return 'Cheat, selected'
  return 'Cheat, held'
}

/** The purse plate on the status band (DLR-84). PLACEHOLDER copy, as this file's other labels
 *  are. Distinct from `runLabels.ts`'s `SHOP_COINS_LABEL`: each file owns its own surface's
 *  copy, so the felt and the shop can be reworded independently. */
export const COINS_PLATE_LABEL = 'Coins'

/** The Timebomb plate's copy (DLR-90). PLACEHOLDER — the wording is the developer's, exactly as
 *  `CHEAT_RAIL_LABEL` and the rest of this file are. */
export const TIMEBOMB_RAIL_LABEL = 'Timebomb'
export const TIMEBOMB_EMPTY_LABEL = 'No Timebomb held'
export const TIMEBOMB_POISED_HINT = 'Tap Timebomb again to arm it'
export const TIMEBOMB_ARMED_HINT = 'Pick a card in your hand to prime'

/** DLR-101 — the reveal's clause for a hit this trick just BOOKED, as distinct from one it paid.
 *  Names the side and the amount, which the Apply Damage refusal (the only prior trace of a
 *  booked hit anywhere in the UI) named neither of. The figure comes from `timebombDamageFor`,
 *  its single owner, so this copy cannot pick the wrong constant. PLACEHOLDER copy, as this
 *  file's rest is. */
export function timebombBookedText(target: DuelSide): string {
  const amount = timebombDamageFor(target)
  return target === DuelSide.Player
    ? `Timebomb ticking — you take ${amount} at the next trick.`
    : `Timebomb ticking — they take ${amount} at the next trick.`
}

/** The plate's accessible name. The three stages MUST differ, and the count is in the name rather
 *  than only in the glyph — `getByRole('button', { name })` is how the spec tells them apart, and
 *  a player who cannot see the plate needs to know how many are held. */
export function timebombAccessibleName(stage: TimebombStage | null, charges: number): string {
  if (charges <= 0) return TIMEBOMB_EMPTY_LABEL
  const held = `${TIMEBOMB_RAIL_LABEL}, ${charges} held`
  if (stage === TimebombStage.Armed) return `${held}, armed`
  if (stage === TimebombStage.Poised) return `${held}, selected`
  return held
}

/** The Apply Damage plate's copy (DLR-94). PLACEHOLDER — the wording is the developer's, exactly
 *  as `TIMEBOMB_RAIL_LABEL` and the rest of this file are. */
export const APPLY_DAMAGE_RAIL_LABEL = 'Apply'
export const APPLY_DAMAGE_POISED_HINT = 'Tap Apply again to cash your streak'

/** Why the control is dark, in the player's words. A total `Record`, so a fourth refusal reason is
 *  a compile error here rather than an `undefined` sentence under a disabled button. */
export const APPLY_DAMAGE_REFUSAL_MESSAGE: Readonly<Record<ApplyDamageRefusal, string>> = {
  [ApplyDamageRefusal.EmptyBank]: 'No streak to cash — take a trick first.',
  [ApplyDamageRefusal.TimebombPending]:
    'A Timebomb is still ticking — you cannot apply until it detonates.',
  [ApplyDamageRefusal.NotYourMove]: 'Not your move yet.',
}

/** The plate's accessible name. The three readings — live, poised, refused — MUST differ:
 *  `getByRole('button', { name })` is how the spec tells them apart, and a player who cannot see
 *  the dimming learns the reason from here or not at all. The figure is in the name rather than
 *  only in the glyph, for the reason `timebombAccessibleName` carries its count. */
export function applyDamageAccessibleName(
  cashValue: number,
  poised: boolean,
  refusal: ApplyDamageRefusal | null,
): string {
  if (refusal !== null) {
    return `${APPLY_DAMAGE_RAIL_LABEL} Damage, unavailable — ${APPLY_DAMAGE_REFUSAL_MESSAGE[refusal]}`
  }
  const base = `${APPLY_DAMAGE_RAIL_LABEL} Damage, ${cashValue} to the Quarry`
  return poised ? `${base} — tap again to confirm` : base
}

/** The discard rail's copy (DLR-100). PLACEHOLDER — the wording is the developer's, exactly as
 *  `CHEAT_RAIL_LABEL`/`TIMEBOMB_RAIL_LABEL`/`APPLY_DAMAGE_RAIL_LABEL` above are. */
export const DISCARD_RAIL_LABEL = 'Discard'
export const DISCARD_SELECT_HINT = `Pick up to ${MAX_CARDS_PER_DISCARD} cards to discard`
export const DISCARD_READY_HINT = 'Tap Discard again to swap them'

/** Why the control is dark, in the player's words. A total `Record`, so a fourth refusal reason is
 *  a compile error here rather than an `undefined` sentence under a disabled button — the same
 *  discipline `APPLY_DAMAGE_REFUSAL_MESSAGE` above already sets. */
export const DISCARD_REFUSAL_MESSAGE: Readonly<Record<DiscardRefusal, string>> = {
  [DiscardRefusal.NotAvailable]: 'Not available yet.',
  [DiscardRefusal.NoDiscardsRemaining]: 'No discards left this fight.',
  [DiscardRefusal.EmptySelection]: 'Select a card to discard.',
}

/** The rail's accessible name. The readings — held, selecting, ready, refused — MUST differ:
 *  `getByRole('button', { name })` is how the spec tells them apart. */
export function discardAccessibleName(
  discardsRemaining: number,
  selecting: boolean,
  selectionSize: number,
  refusal: DiscardRefusal | null,
): string {
  if (refusal !== null) {
    return `${DISCARD_RAIL_LABEL}, unavailable — ${DISCARD_REFUSAL_MESSAGE[refusal]}`
  }
  const held = `${DISCARD_RAIL_LABEL}, ${discardsRemaining} left`
  if (!selecting) return held
  return selectionSize > 0
    ? `${held}, ${selectionSize} selected — tap to swap`
    : `${held}, selecting`
}
