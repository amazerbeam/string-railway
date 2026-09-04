import { DISCARDS_PER_FIGHT, WOODCUTTER_SWAP_STEP } from './config'

/** DLR-163 AC5 — the two figures the Swap control prints, as plain values. This module owns the
 *  rule and must not learn the shape of the layer that calls it. */
export interface SwapPile {
  readonly discardsRemaining: number
  readonly discardCapBonus: number
}

/** DLR-163 AC5 — THE statement of what one played Woodcutter does to the Swap pile. BOTH figures
 *  climb by `WOODCUTTER_SWAP_STEP`, which is what makes "never refused for a full pile" true by
 *  construction rather than by a guard: 3 of 3 becomes 4 of 4, and 0 of 3 becomes 1 of 4. */
export function swapPileAfterWoodcutter(pile: SwapPile): SwapPile {
  return {
    discardsRemaining: pile.discardsRemaining + WOODCUTTER_SWAP_STEP,
    discardCapBonus: pile.discardCapBonus + WOODCUTTER_SWAP_STEP,
  }
}

/** DLR-163 AC5 — the cap the Swap control prints, stated once so the control's readout and any
 *  future refusal cannot disagree about what "full" means. */
export function swapCapFor(discardCapBonus: number): number {
  return DISCARDS_PER_FIGHT + discardCapBonus
}
