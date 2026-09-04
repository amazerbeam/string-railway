import { BuffTargetSuit, BuffTier } from '../../hunt'

/**
 * DLR-159 code-evaluator fix — the three lookup tables `BuffCard.tsx`, `HeldBuffCard.tsx` and
 * `CombineGroupCard.tsx` each carried their own copy of. Extracted once a third consumer made the
 * duplication real: a future suit or tier needed three synchronised edits with no compiler check
 * tying them together. A pure lookup table, not a component — each of the three still renders its
 * own card face, since `BuffCard.tsx` (the felt) and `HeldBuffCard.tsx` (the shop tray) both carry
 * markup this contract's file map does not license changing.
 */

/** Tier, legible as a ROMAN NUMERAL, independent of colour — a metallic gradient reads as
 *  light-and-dark in greyscale, never as bronze/silver/gold. */
export const TIER_NUMERAL: Readonly<Record<BuffTier, string>> = {
  [BuffTier.Bronze]: 'I',
  [BuffTier.Silver]: 'II',
  [BuffTier.Gold]: 'III',
}

export const TIER_CLASS: Readonly<Record<BuffTier, string>> = {
  [BuffTier.Bronze]: 'wc-buffcard-bronze',
  [BuffTier.Silver]: 'wc-buffcard-silver',
  [BuffTier.Gold]: 'wc-buffcard-gold',
}

export const SUIT_CLASS: Readonly<Record<BuffTargetSuit, string>> = {
  [BuffTargetSuit.Bells]: 'wc-buffcard-bells',
  [BuffTargetSuit.Keys]: 'wc-buffcard-keys',
  [BuffTargetSuit.Moons]: 'wc-buffcard-moons',
}
