import { MAX_CARDS_PER_DISCARD } from '../hunt'
import { containsCard, removeCard } from './cardUtils'
import type { Card, PlayerSide, RoundState } from './types'

/**
 * DLR-100 AC9 — why the discard rail cannot be tapped, or cannot yet commit. A reason CODE, not a
 * sentence: `src/warCouncil/` holds no user-facing copy, and `src/app/warCouncil/labels.ts` maps
 * these to words. Exactly `voluntaryCashOut.ts`'s `ApplyDamageRefusal`, `src/hunt/flask.ts`'s
 * `FlaskRefusal`, and `src/hunt/shop.ts`'s `PurchaseRefusal`.
 */
export const DiscardRefusal = {
  /** AC1 — mid-trick, a reveal is held, a prompt is open, or the hand/fight is over. */
  NotAvailable: 'notAvailable',
  /** AC5 — the per-fight budget is spent. */
  NoDiscardsRemaining: 'noDiscardsRemaining',
  /** AC9 — the selection mode is open but nothing has been toggled in yet. */
  EmptySelection: 'emptySelection',
} as const
export type DiscardRefusal = (typeof DiscardRefusal)[keyof typeof DiscardRefusal]

/**
 * Everything the rule needs and nothing else — PLAIN VALUES, never a `RoundUiState`.
 * `applyDamageStock`'s own discipline: this module owns the rule and must not learn the shape of
 * the layer that calls it. `roundUiState.ts`'s `discardStock` builds it.
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
}

/**
 * THE single statement of whether the discard rail is available — read by the reducer before it
 * commits anything, and by the rail control to disable itself and print the reason. `windowOpen`
 * first, because it is true of the whole felt rather than of this control, mirroring
 * `applyDamageRefusalFor`'s own stated ordering.
 */
export function discardRefusalFor(stock: DiscardStock): DiscardRefusal | null {
  if (!stock.windowOpen) return DiscardRefusal.NotAvailable
  if (stock.discardsRemaining <= 0) return DiscardRefusal.NoDiscardsRemaining
  if (stock.selecting && stock.selectionSize <= 0) return DiscardRefusal.EmptySelection
  return null
}

/**
 * AC2/AC3 — the swap. `n` cards out of `side`'s hand, the same `n` off the FRONT of `drawPile`,
 * the discarded cards appended to its BACK — `applyWoodcutterDraw`'s own convention, generalised
 * from one card to n. `drawPile.length` is invariant across the call.
 *
 * THROWS rather than returning the state unchanged, the discipline `envenomCard` and `cheats.ts`'s
 * `addCheat` already set: a silent no-op would let the caller spend a discard for a swap that never
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
  if (discarded.length > state.drawPile.length) {
    throw new RangeError(
      `Cannot discard ${discarded.length} cards — only ${state.drawPile.length} left in the draw pile`,
    )
  }
  const drawn = state.drawPile.slice(0, discarded.length)
  const handAfterRemoval = discarded.reduce((hand, c) => removeCard(hand, c), state.hands[side])
  return {
    ...state,
    hands: { ...state.hands, [side]: [...handAfterRemoval, ...drawn] },
    drawPile: [...state.drawPile.slice(discarded.length), ...discarded],
  }
}
