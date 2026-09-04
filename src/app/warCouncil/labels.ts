import {
  CardRank,
  DiscardRefusal,
  IllegalMoveReason,
  Suit,
  TrickOutcome,
  type Card,
  type SuitShape,
} from '../../warCouncil'
import { DuelSide, MAX_CARDS_PER_DISCARD } from '../../hunt'
import type { CardDamageBranch, CardDamagePreview } from './cardDamage'
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

/** Which markers a card is carrying. An OBJECT rather than positional booleans: a second marker
 *  would make `cardAccessibleName(card, true, false)` one transposition away from
 *  announcing the wrong one — on the exact surface a player who cannot see the card depends on. */
export interface CardMarks {
  readonly skulled?: boolean
}

/** `marks` is optional so every call site that names an unmarked card keeps compiling unchanged;
 *  a caller that knows a card's markers passes them. PLACEHOLDER COPY, as this file's rest is. */
export function cardAccessibleName(card: Card, marks: CardMarks = {}): string {
  const base = `${card.rank} of ${SUIT_NAME[card.suit]}`
  const named = RANK_NAME[card.rank]
  const name = named ? `${base} (${named})` : base
  return marks.skulled ? `${name}, skulled` : name
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
  // DLR-163 — `InvalidFoxExchangeCard` and `InvalidWoodcutterDiscard` are gone from the union;
  // neither rule takes a card any more. This map is a total `Record`, so their removal here is
  // proved by the compiler rather than left as a silent gap.
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
 * "At risk" is conditional and evaporates if the streak breaks. Placeholder copy: the wording is
 * the developer's.
 *
 * DLR-115 adds the shield clause, inserted between `standing` and `atRisk` so the sentence reads
 * outermost protection to innermost certainty — standing, shielded, at risk, lethal —
 * matching the row's own left-to-right reading (shield cluster inboard of the red run).
 *
 * DLR-119 moves `Lethal.` from the end of the sentence to the front: it is the one fact that
 * changes what the player does next, and it was arriving after four descriptive clauses. The
 * four descriptive clauses keep their existing order behind it — this is a re-order, not a rewrite.
 */
export function healthBarValueText(view: HealthBarView): string {
  const standing = `${view.current} of ${view.max}.`
  const shielded = view.shielded > 0 ? ` ${view.shielded} shielded.` : ''
  const atRisk = view.pending > 0 ? ` ${view.pending} at risk.` : ''
  const body = `${standing}${shielded}${atRisk}`
  // DLR-119 — `Lethal.` LEADS: it is the one fact that changes what the player does next, and it
  // was arriving after the descriptive clauses. Nothing is dropped: every clause is load-bearing
  // state and the descriptive ones keep their outermost-to-innermost order.
  return view.lethal ? `Lethal. ${body}` : body
}

export const FINISH_ROUND_LABEL = 'Deal the next Hunt'

/** §3.2's four outcomes, as the player is told them on the bank meter — the second copy of outcome
 *  wording, distinct from the resolution panel's headline. DLR-165 leads each with the four-way
 *  name (AC1: the bank meter is a player-facing surface that named an outcome), then the
 *  consequence. Placeholder copy: the wording after the name is the developer's. */
export const TRICK_OUTCOME_MESSAGE: Readonly<Record<TrickOutcome, string>> = {
  [TrickOutcome.HighVictory]: 'High Victory. The streak climbs.',
  [TrickOutcome.LowVictory]: 'Low Victory. The skull passed you by — the streak climbs.',
  [TrickOutcome.LowDefeat]: 'Low Defeat. 1 damage — the streak is lost.',
  [TrickOutcome.HighDefeat]: 'High Defeat. You took the skull. 1 damage — the streak is lost.',
}

export const SKULL_MARK_LABEL = 'Skull'
// DLR-156 Task 15 Step 7 — renamed from `TRICKS_LABEL`/`MULTIPLIER_LABEL`: the pair `BankMeter`
// renders is `total`/`roll` (`streak.ts`'s own field names), not a count of tricks or a
// multiplier, so the copy is retitled to match what the figures actually are.
export const TOTAL_LABEL = 'Total'
export const ROLL_LABEL = 'Roll'
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

/** DLR-155 AC2/AC3 — the telegraph's ONE sentence, used by both the visible bubble and the
 *  `.wc-sr-only` span in `QuarryShape.tsx`, so the two channels cannot drift into two copies of
 *  one phrase (the exact defect DLR-80 found between `quarryShapeText` and that component, which
 *  is why `suitShapeRowText` above has a single owner). Suit name from `SUIT_NAME`, never typed
 *  out. Never a rank: `Suit` has none to give. PLACEHOLDER COPY, as this file's rest is. */
export function quarryLeadTelegraphText(suit: Suit): string {
  return `The Quarry will lead with ${SUIT_NAME[suit]}`
}

/** DLR-163 AC7 — the visible word on the row a skull just landed in. A WORD, not colour alone:
 *  the border marks the row too, but a border on its own is a colour signal. PLACEHOLDER copy. */
export const SKULL_ARRIVED_WORD = 'skull arrived'

/** DLR-163 AC7 — the same fact for a reader who cannot see the row. Suit name from `SUIT_NAME`,
 *  never typed out, exactly as `quarryLeadTelegraphText` above. PLACEHOLDER copy. */
export function skullArrivedText(suit: Suit): string {
  return `A skull just landed on a ${SUIT_NAME[suit]} card in the Quarry's hand`
}

/** The purse plate on the status band (DLR-84). PLACEHOLDER copy, as this file's other labels
 *  are. Distinct from `runLabels.ts`'s `SHOP_COINS_LABEL`: each file owns its own surface's
 *  copy, so the felt and the shop can be reworded independently. */
export const COINS_PLATE_LABEL = 'Coins'

/** The discard rail's copy (DLR-100). PLACEHOLDER — the wording is the developer's, exactly as
 *  this file's rest is. */
export const DISCARD_RAIL_LABEL = 'Discard'
export const DISCARD_SELECT_HINT = `Pick up to ${MAX_CARDS_PER_DISCARD} cards to discard`
export const DISCARD_READY_HINT = 'Tap Discard again to swap them'

/** Why the control is dark, in the player's words. A total `Record`, so a fourth refusal reason is
 *  a compile error here rather than an `undefined` sentence under a disabled button. */
export const DISCARD_REFUSAL_MESSAGE: Readonly<Record<DiscardRefusal, string>> = {
  [DiscardRefusal.NotAvailable]: 'Not available yet.',
  [DiscardRefusal.NoDiscardsRemaining]: 'No discards left this fight.',
  [DiscardRefusal.EmptySelection]: 'Select a card to discard.',
}

/** DLR-163 AC5/AC6 — the Swap control's visible count. BOTH figures, because a cap that can grow
 *  is unreadable as a bare remainder: "3 left" says nothing about whether the pile just went to 4
 *  of 4. The exact wording is the developer's, as this file's rest is. */
export function swapCountText(discardsRemaining: number, swapCap: number): string {
  return `${discardsRemaining} of ${swapCap}`
}

/** The rail's accessible name. The readings — held, selecting, ready, refused — MUST differ:
 *  `getByRole('button', { name })` is how the spec tells them apart.
 *
 *  DLR-163 AC6 — the raise is spoken as well as drawn, so a player using a screen reader is told
 *  the addition landed rather than left to infer it from a number that changed. */
export function discardAccessibleName(
  discardsRemaining: number,
  swapCap: number,
  justRaised: boolean,
  selecting: boolean,
  selectionSize: number,
  refusal: DiscardRefusal | null,
): string {
  if (refusal !== null) {
    return `${DISCARD_RAIL_LABEL}, unavailable — ${DISCARD_REFUSAL_MESSAGE[refusal]}`
  }
  const raised = justRaised ? ', just raised by a Woodcutter' : ''
  const held = `${DISCARD_RAIL_LABEL}, ${swapCountText(discardsRemaining, swapCap)}${raised}`
  if (!selecting) return held
  return selectionSize > 0
    ? `${held}, ${selectionSize} selected — tap to swap`
    : `${held}, selecting`
}

/** DLR-117 — the caveat a preview carries while the Quarry's card is face down. Its own
 *  constant rather than an inline string, so the sentence and any future non-fan reader of
 *  the same caveat cannot drift. PLACEHOLDER copy, as this file's rest is. */
export const CARD_DAMAGE_ESTIMATE_NOTE =
  'Estimate — the Quarry’s card is face down, so this trick’s skull state is not yet decided.'

/** The `~` an estimate carries in the compact form. A FORM signal, not colour — `game-ux`'s
 *  "state reads without motion or colour alone". PLACEHOLDER glyph. */
export const CARD_DAMAGE_ESTIMATE_GLYPH = '~'

/**
 * DLR-117 — the compact on-card form, e.g. `W6 L1`, or `~W6 L1` for an estimate. Rendered
 * `aria-hidden`; `cardDamageText` below is what a reader who cannot see it gets.
 *
 * TWO figures, and they are the CARD-DEPENDENT ones: what this card ADDS TO THE STREAK if it
 * wins, what it costs if it loses. DLR-156 B1 — the `W` figure is `winPot.trickDamage`, not
 * `win.toQuarry`: AC5 means a win no longer pays the Quarry immediately, so `win.toQuarry` is
 * correctly 0 on every ordinary trick and would make this glyph say the same thing on every
 * card. `winPot.trickDamage` is what this card is actually worth toward the pot. The two
 * cross-term — the loss's own hit — is the same whichever
 * card is played and is already previewed on the bars (DLR-86 AC3's
 * at-risk band), so repeating it on six cards would add noise without adding information. The
 * full truth, including the pot the streak would then stand at, is in the sentence below.
 * PLACEHOLDER glyphs: the wording is the developer's.
 */
export function cardDamageGlyphText(preview: CardDamagePreview): string {
  const estimate = preview.exact ? '' : CARD_DAMAGE_ESTIMATE_GLYPH
  return `${estimate}W${preview.winPot.trickDamage} L${preview.lose.toPlayer}`
}

/** One branch, in words. Omits a zero rather than saying "0 damage to you", and says
 *  "no damage" when the branch costs nobody anything — a REPLACED Low Defeat (DLR-90 AC5) is
 *  exactly that, and it is the branch a player most needs stated plainly. */
function cardDamageBranchText(branch: CardDamageBranch): string {
  const parts: string[] = []
  if (branch.toQuarry > 0) parts.push(`${branch.toQuarry} damage to the Quarry`)
  if (branch.toPlayer > 0) parts.push(`${branch.toPlayer} damage to you`)
  if (branch.shielded > 0) parts.push(`${branch.shielded} absorbed by your shield`)
  return parts.length === 0 ? 'no damage' : parts.join(', ')
}

/**
 * DLR-156 B1 — the win branch in words. Nothing is dealt to the Quarry immediately from a win any
 * more (AC5) — winning GROWS the streak instead, so this states what the trick adds and what the
 * pot would then be worth, plus any genuine immediate cross-term (shield absorption, say) exactly
 * as `cardDamageBranchText` states
 * them for the lose branch. PLACEHOLDER copy, as this file's rest is.
 */
function cardDamageWinText(preview: CardDamagePreview): string {
  const parts: string[] = []
  parts.push(
    preview.winPot.trickDamage > 0
      ? `adds ${preview.winPot.trickDamage} to the streak — the pot would stand at ${preview.winPot.pot}`
      : 'adds nothing to the streak',
  )
  if (preview.win.toQuarry > 0) parts.push(`${preview.win.toQuarry} damage to the Quarry`)
  if (preview.win.toPlayer > 0) parts.push(`${preview.win.toPlayer} damage to you`)
  if (preview.win.shielded > 0) parts.push(`${preview.win.shielded} absorbed by your shield`)
  return parts.join(', ')
}

/**
 * DLR-117 — the `.wc-sr-only` sentence, and the COMPLETE statement: both branches, both sides
 * of each, any shield absorption, and the estimate caveat when one applies. Reached through
 * the card button's `aria-describedby`, so it is a DESCRIPTION and never part of the card's
 * accessible NAME — `cardAccessibleName` stays the card's identity alone. PLACEHOLDER copy.
 */
export function cardDamageText(preview: CardDamagePreview): string {
  const body =
    `If you win this trick: ${cardDamageWinText(preview)}. ` +
    `If you lose: ${cardDamageBranchText(preview.lose)}.`
  return preview.exact ? body : `${body} ${CARD_DAMAGE_ESTIMATE_NOTE}`
}

/** DLR-123 AC8/AC9 — the spent pile's copy. "Spent", not "discard": `discard` already means the
 *  PLAYER'S swap everywhere in this codebase and on this felt, and DLR-123 was asked to resolve
 *  that collision. It is resolved by naming the NEW thing, so nothing existing had to be renamed.
 *  The flavour noun is the developer's — this is a descriptive placeholder. */
export const SPENT_PILE_LABEL = 'Spent'

/** AC8 — the live count. A count and nothing else: AC8 forbids the contents ever being
 *  inspectable, so no label here may hint at what is in the pile. */
export function spentCountText(spentCount: number): string {
  return `${spentCount} spent`
}

/** AC9's SECOND half — the standing statement that cards are NOT reshuffled between hands. It is
 *  on screen at every moment the notice below is not, so the absence of a reshuffle is stated
 *  rather than merely implied by the absence of a message. */
export const SPENT_STANDING_NOTE = 'Spent cards stay spent'

/** AC9's FIRST half — the reshuffle, announced at the moment it happens. */
export const RESHUFFLE_NOTE = 'Reshuffled — the deck is fresh'
