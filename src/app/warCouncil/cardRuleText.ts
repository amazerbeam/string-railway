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
  3: 'On playing it, you may exchange the decree card for a card from your hand. The exchanged card becomes the new decree, and its suit becomes the new trump suit. You may decline.',
  4: PLAIN_RANK_RULE_TEXT,
  5: 'On playing it, draw the top card of the draw pile, then put one card from your hand — the drawn card or one you already held — on the bottom of the pile.',
  6: PLAIN_RANK_RULE_TEXT,
  7: 'No effect at all. A named card with no rule attached.',
  8: PLAIN_RANK_RULE_TEXT,
  9: 'If a trick contains exactly one Witch, that Witch counts as trump when the winner is decided. Two Witches cancel — neither is treated as trump.',
  10: PLAIN_RANK_RULE_TEXT,
  11: 'When led, the follower may play only their Swan of that suit, or their highest card of that suit.',
}

/** AC2 — the Treasure's printed mark. Two words and no rule text: AC8 forbids rule text on any
 *  face, and this says only that there is none. PLACEHOLDER copy, as this project's copy is. */
export const NO_RULE_MARK_LABEL = 'no rule'
