import { HAND_SIZE, type Rng } from '../hunt'
import { shuffle } from './shuffle'
import { PlayerSide, type Card, type RoundState } from './types'

/**
 * DLR-123 — the encounter's deck, which now OUTLIVES the hand that deals from it.
 *
 * Pure and DOM-free like the rest of this tree, and free of `Math.random()`: `dealPileFor` takes
 * `rng` explicitly, the convention `dealRound`, `shuffle` and `assignSkulls` already set. That is
 * the property AC12 turns on — a reshuffle nobody can reproduce would make DLR-130's balance
 * simulator impossible, and no test would ever catch it.
 */

/** Cards one hand costs: two hands and the decree. DERIVED from `HAND_SIZE` rather than written
 *  as 13, so it is not a configuration dial anyone has to keep in step — it is what a deal takes,
 *  and it is therefore the reshuffle threshold BY DEFINITION rather than by choice. */
export const CARDS_PER_DEAL = HAND_SIZE * 2 + 1

/**
 * What one encounter carries between its hands. `drawPile` is dealt from the FRONT and is where
 * the player's swap and the Woodcutter's bury put their cards, on the BOTTOM (AC5) — so those
 * cards stay unseen. `spentPile` is never dealt from at all until a reshuffle folds it back in.
 */
export interface EncounterDeck {
  readonly drawPile: readonly Card[]
  readonly spentPile: readonly Card[]
}

/** AC1/AC10 — a new encounter carries nothing, so `dealRound` builds and shuffles a fresh 33.
 *  Shared and only ever spread from, exactly as `encounter.ts`'s `NO_PENDING_TIMEBOMB` is. */
export const FRESH_ENCOUNTER_DECK: EncounterDeck = { drawPile: [], spentPile: [] }

/** Whether this deck is a new encounter's. ONE statement, so `dealRound`'s branch and a spec
 *  cannot disagree about what "fresh" means. */
export function isFreshDeck(deck: EncounterDeck): boolean {
  return deck.drawPile.length === 0 && deck.spentPile.length === 0
}

/**
 * D6 — at hand's end EVERY card not in the draw pile joins the spent pile: the decree (AC4), both
 * hands, and anything still on the table. ONE rule rather than three coordinated special cases,
 * which is what makes it total: it covers a Fox exchange (whatever card the Fox left in the decree
 * slot is what gets spent), and a hand ended early by a mid-hand cash-out with cards still held.
 *
 * All 33 are conserved by construction — the returned two piles are exactly the input state's
 * cards, repartitioned — which is the invariant `deckCycle.test.ts` pins.
 */
export function closeHand(state: RoundState): EncounterDeck {
  return {
    drawPile: state.drawPile,
    spentPile: [
      ...state.spentPile,
      state.decree,
      ...state.hands[PlayerSide.Player],
      ...state.hands[PlayerSide.Cpu],
      ...state.currentTrick.map((t) => t.card),
    ],
  }
}

/** The draw pile a deal will come off, and whether a reshuffle produced it. */
export interface DealPile {
  readonly drawPile: readonly Card[]
  readonly reshuffled: boolean
}

/**
 * AC6 — reshuffle exactly when the draw pile cannot cover a full deal, and not otherwise. The
 * leftover draw pile is folded INTO the shuffle rather than left on top of it (D3): discarding it
 * would lose cards from a 33-card deck, and stacking it on top is a second rule about ordering
 * with no observable difference, since those cards were never seen either way. Folding makes
 * AC6's "a full reset of what the player knows" literally true.
 *
 * THROWS when the two piles together cannot cover a deal. Unreachable through the shipped driver:
 * `closeHand` conserves all 33, so the draw pile at a hand's start is exactly 33, 20 or 7, and 7
 * reshuffles back to 33. Kept for `shieldHeartsForTier`'s stated reason — the guard is not dead
 * code, it is the check that makes that guarantee hold — and reachable only from a genuine driver
 * bug or a hand-built fixture. Deliberately NOT on any event-handler commit path: `src/` has no
 * ErrorBoundary (DLR-131), so an escaping throw would blank the screen.
 */
export function dealPileFor(deck: EncounterDeck, rng: Rng): DealPile {
  if (deck.drawPile.length >= CARDS_PER_DEAL) {
    return { drawPile: deck.drawPile, reshuffled: false }
  }
  const total = deck.drawPile.length + deck.spentPile.length
  if (total < CARDS_PER_DEAL) {
    throw new RangeError(
      `Cannot deal ${CARDS_PER_DEAL} cards: the draw pile holds ${deck.drawPile.length} and the spent pile ${deck.spentPile.length}, ${CARDS_PER_DEAL - total} short even after a reshuffle`,
    )
  }
  return { drawPile: shuffle([...deck.spentPile, ...deck.drawPile], rng), reshuffled: true }
}
