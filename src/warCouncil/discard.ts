import { MAX_CARDS_PER_DISCARD } from '../hunt'
import { containsCard, removeCard } from './cardUtils'
import { drawCards } from './encounterDeck'
import type { Card, PlayerSide, RoundState } from './types'

/**
 * DLR-100 AC9 — why the discard rail cannot be tapped, or cannot yet commit. A reason CODE, not a
 * sentence: `src/warCouncil/` holds no user-facing copy, and `src/app/warCouncil/labels.ts` maps
 * these to words. Exactly `src/hunt/flask.ts`'s `FlaskRefusal`, and `src/hunt/shop.ts`'s
 * `PurchaseRefusal`.
 */
export const DiscardRefusal = {
  /** AC1 — mid-trick, a reveal is held, a prompt is open, or the hand/fight is over. */
  NotAvailable: 'notAvailable',
  /** AC5 — the per-fight budget is spent. */
  NoDiscardsRemaining: 'noDiscardsRemaining',
  /** AC9 — the selection mode is open but nothing has been toggled in yet. */
  EmptySelection: 'emptySelection',
  /** DLR-167 fix pass — a paid-for Curse is armed and already owns the next hand tap. Two controls
   *  that reinterpret that tap must not be open at once (`handleToggleLoadout`'s own rule); with
   *  both live the discard took the tap and the Curse became silently unreachable. */
  CurseArmed: 'curseArmed',
} as const
export type DiscardRefusal = (typeof DiscardRefusal)[keyof typeof DiscardRefusal]

/**
 * Everything the rule needs and nothing else — PLAIN VALUES, never a `RoundUiState`. This module
 * owns the rule and must not learn the shape of the layer that calls it. `roundUiState.ts`'s
 * `discardStock` builds it.
 */
export interface DiscardStock {
  readonly discardsRemaining: number
  /** Whether the selection mode is currently open. `EmptySelection` only fires while this is
   *  `true` — otherwise "nothing chosen yet" would refuse the rail control before it has ever
   *  been tapped. */
  readonly selecting: boolean
  readonly selectionSize: number
  /** AC1 — the moment is right: not mid-trick, no reveal held, no prompt open, hand and fight both
   *  still live. Independent of whose turn it is — `roundUiState.ts`'s `discardWindowOpen` is what
   *  reaches the Quarry-to-lead gap. */
  readonly windowOpen: boolean
  /** DLR-167 fix pass — a Curse has been paid for and is waiting for a hand card, so the next hand
   *  tap is already claimed. `roundUiState.ts`'s `curseArmed` is the fact; stating it here is what
   *  makes the rule ONE rule, read by both the Swap control's disabled state and the reducer. */
  readonly curseArmed: boolean
}

/**
 * THE single statement of whether the discard rail is available — read by the reducer before it
 * commits anything, and by the rail control to disable itself and print the reason. `windowOpen`
 * comes first, because it is true of the whole felt rather than of this control.
 *
 * DLR-167 fix pass — `curseArmed` is second, ahead of the budget, because it is a claim on the next
 * hand TAP rather than a fact about this control's stock: a player holding an armed Curse should be
 * told what actually blocks them, not that they are out of swaps.
 */
export function discardRefusalFor(stock: DiscardStock): DiscardRefusal | null {
  if (!stock.windowOpen) return DiscardRefusal.NotAvailable
  if (stock.curseArmed) return DiscardRefusal.CurseArmed
  if (stock.discardsRemaining <= 0) return DiscardRefusal.NoDiscardsRemaining
  if (stock.selecting && stock.selectionSize <= 0) return DiscardRefusal.EmptySelection
  return null
}

/**
 * AC2/AC3 — the swap. `n` cards out of `side`'s hand, the same `n` off the FRONT of `drawPile`,
 * the discarded cards appended to its BACK — `applyWoodcutterDraw`'s own convention, generalised
 * from one card to n.
 *
 * Since DLR-146 `drawPile.length` is NO LONGER invariant across the call: if the pile cannot cover
 * the draw, `drawCards` folds the spent pile back in and the two piles are repartitioned. All 33
 * cards are still conserved, which is what `deckCycle.test.ts` pins.
 *
 * THROWS rather than returning the state unchanged, the discipline `primeCard` (this tree) and
 * `activateBuff` (`src/hunt/buffActivation.ts`) already set: a silent no-op would let the caller
 * spend a discard for a swap that never
 * happened. The reducer guards every precondition before calling — a reducer must not throw,
 * because a throw during an event handler unmounts the tree — so reaching either throw here is a
 * driver bug.
 */
export function applyDiscard(
  state: RoundState,
  side: PlayerSide,
  discarded: readonly Card[],
): RoundState {
  if (discarded.length === 0 || discarded.length > MAX_CARDS_PER_DISCARD) {
    throw new RangeError(
      `Cannot discard ${discarded.length} cards — must be 1 to ${MAX_CARDS_PER_DISCARD}`,
    )
  }
  const missing = discarded.find((c) => !containsCard(state.hands[side], c))
  if (missing) {
    throw new RangeError(
      `Cannot discard the ${missing.rank} of ${missing.suit} — it is not in the ${side}'s hand`,
    )
  }
  if (discarded.length > state.drawPile.length + state.spentPile.length) {
    throw new RangeError(
      `Cannot discard ${discarded.length} cards — only ${state.drawPile.length + state.spentPile.length} left in the encounter's deck`,
    )
  }
  const draw = drawCards(state, discarded.length)
  const handAfterRemoval = discarded.reduce((hand, c) => removeCard(hand, c), state.hands[side])
  return {
    ...state,
    hands: { ...state.hands, [side]: [...handAfterRemoval, ...draw.drawn] },
    // AC3/AC5 unchanged — the discarded cards go to the BOTTOM of whatever pile the draw left,
    // so they stay unseen whether or not the draw reshuffled.
    drawPile: [...draw.drawPile, ...discarded],
    spentPile: draw.spentPile,
    drawSeed: draw.drawSeed,
  }
}
