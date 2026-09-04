import { RANK_FACE } from './cardFace'

/** The tooltip's title line. A named rank reads `9 · Witch`; an unnamed one reads `6`. */
export function cardTipTitle(rank: number): string {
  const name = RANK_FACE[rank]?.name
  return name === null || name === undefined ? String(rank) : `${rank} · ${name}`
}

/** A plain number's own sentence. Stated rather than omitted: "this card has no rule" is exactly
 *  the fact the ticket's problem statement says a player currently cannot read off a face. */
export const PLAIN_RANK_RULE_TEXT = 'A plain number card. No rule attached.'

/** AC8's body. Total over `RANKS` — a rank with no entry would hand the tooltip `undefined`,
 *  which renders as nothing and reads as "this card has no rule", the one wrong answer this
 *  surface can give. Transcribed from `.docs/game_rules/the-hunt.md` §"Each named rank does one
 *  thing — except two" and §4 (the Monarch's narrowing); PLACEHOLDER only in the sense that the
 *  doc's wording is the developer's, as this project's copy always is. */
export const RANK_RULE_TEXT: Readonly<Record<number, string>> = {
  1: 'If a Swan is in a trick and belongs to the side that lost it, that side leads the next trick. Two Swans: the loser leads either way.',
  2: PLAIN_RANK_RULE_TEXT,
  3: 'On playing it, you may name any suit; that suit becomes the new trump suit and the decree becomes a marker showing it. You give up nothing. You may decline.',
  4: PLAIN_RANK_RULE_TEXT,
  5: 'On playing it, your Swap pile gains one — both the cap and the Swaps you have left — for the rest of the fight.',
  6: PLAIN_RANK_RULE_TEXT,
  7: 'A trick you were victorious on that carried a Treasure adds 1 to your base damage for the rest of the fight. A trick that hurt you and carried one costs 2 health instead of 1.',
  8: PLAIN_RANK_RULE_TEXT,
  9: 'If a trick contains exactly one Witch, that Witch counts as trump when the winner is decided. Two Witches cancel — neither is treated as trump.',
  10: PLAIN_RANK_RULE_TEXT,
  11: 'When led, the follower may play only their Swan of that suit, or their highest card of that suit.',
}

/** AC2 — the printed no-rule mark. Two words and no rule text: AC8 forbids rule text on any
 *  face, and this says only that there is none. PLACEHOLDER copy, as this project's copy is.
 *
 *  DLR-163 AC12 — NO LONGER the Treasure's: rank 7 became an acting face when it got a rule, and
 *  `printedRects` pushes this mark only for an `Inert` face. It stays exported and applied to any
 *  future inert rank; nothing in `RANK_FACE` is `Inert` today. */
export const NO_RULE_MARK_LABEL = 'no rule'
