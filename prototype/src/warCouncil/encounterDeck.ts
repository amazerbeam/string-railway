import { createSeededRng, HAND_SIZE, mixSeed, type Rng } from '../hunt'
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
 *  Shared and only ever spread from, exactly as `shield.ts`'s `NO_SHIELD_HEARTS` is. */
export const FRESH_ENCOUNTER_DECK: EncounterDeck = { drawPile: [], spentPile: [] }

/** Whether this deck is a new encounter's. ONE statement, so `dealRound`'s branch and a spec
 *  cannot disagree about what "fresh" means. */
export function isFreshDeck(deck: EncounterDeck): boolean {
  return deck.drawPile.length === 0 && deck.spentPile.length === 0
}

/**
 * D6 — at hand's end EVERY card not in the draw pile joins the spent pile: the decree (AC4), both
 * hands, and anything still on the table. ONE rule rather than three coordinated special cases,
 * which is what makes it total: it covers a hand ended early by a mid-hand cash-out with cards
 * still held.
 *
 * DLR-163 AC2 — the decree is now nullable. A Fox that named a suit sent the decree card to the
 * spent pile at the instant it did so, so there is nothing left here to spend.
 *
 * All 33 are conserved by construction — the returned two piles are exactly the input state's
 * cards, repartitioned — which is the invariant `deckCycle.test.ts` pins.
 */
export function closeHand(state: RoundState): EncounterDeck {
  return {
    drawPile: state.drawPile,
    spentPile: [
      ...state.spentPile,
      // DLR-163 AC2 — a Fox that named a suit already sent this card to the spent pile, so a
      // `null` decree spends nothing here. Spending it twice would duplicate a card and break the
      // all-33-conserved invariant `deckCycle.test.ts` pins; skipping it when there IS a card
      // would lose one. This conditional is the whole of the difference.
      ...(state.decree === null ? [] : [state.decree]),
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
 * bug or a hand-built fixture. Deliberately NOT on any event-handler commit path: a root
 * `ErrorBoundary` now exists (DLR-131), so an escaping throw replaces the app with the fallback
 * panel rather than blanking the screen — but that is still a run lost, so the guard here stays.
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

/** DLR-146 — what one draw needs off the state, and nothing else. `DiscardStock`'s discipline:
 *  this module owns the rule and must not learn the shape of the layer that calls it. */
export interface DrawSource {
  readonly drawPile: readonly Card[]
  readonly spentPile: readonly Card[]
  readonly drawSeed: number
}

/** The cards drawn, and the three fields as they now stand — spread straight onto a `RoundState`. */
export interface DrawResult {
  readonly drawn: readonly Card[]
  readonly drawPile: readonly Card[]
  readonly spentPile: readonly Card[]
  readonly drawSeed: number
  /** Whether this draw folded the spent pile back in. Reported so a spec can pin it, and
   *  deliberately NOT written to `RoundState.reshuffled`, which means "this hand was DEALT from a
   *  reshuffle" and is read by the felt's notice. */
  readonly reshuffled: boolean
}

/**
 * DLR-146 — THE single way a card leaves the draw pile mid-hand. `dealPileFor`'s sibling: it folds
 * the spent pile back in under a seeded shuffle when the pile cannot cover the draw, for the same
 * reason and by the same rule, but WITHIN a hand rather than between two.
 *
 * Before this existed, five sites read `drawPile` directly and were safe only because the pile's
 * length was invariant for the life of a hand: the three that MUTATE it (`applyDiscard`,
 * `applyWoodcutterDraw`, and the refill this ticket adds) plus two that only PREVIEW it
 * (`playCard`'s and `chooseCpuMove`'s Woodcutter-discard validation, both of which indexed
 * `drawPile[0]` to compute "the hand as it would be after the draw"). The refill retires that
 * invariant, which made `applyDiscard`'s `RangeError` reachable inside a reducer, let
 * `applyWoodcutterDraw` destructure `undefined` off an empty array into a hand, and left both
 * previews reading `undefined` off an empty pile. This one primitive is what every one of the
 * five now routes through, so none of them can disagree about which card a draw actually returns.
 *
 * Does NOT throw on an exhausted deck — it returns fewer cards than asked, which is AC5's no-op as
 * the degenerate case of a general rule. The shortfall is visible in `drawn.length`, so no caller
 * is handed a success it did not get. It DOES throw on a negative or non-finite `count`, the guard
 * discipline `quickKillPayout` and `flaskHealAmount` already set: a `NaN` count would slice to an
 * empty array and silently draw nothing.
 */
export function drawCards(source: DrawSource, count: number): DrawResult {
  if (!Number.isFinite(count)) {
    throw new RangeError(`Cannot draw ${count} cards: the count must be a finite number`)
  }
  if (count < 0) {
    throw new RangeError(`Cannot draw ${count} cards: the count must be zero or more`)
  }
  if (count === 0 || source.drawPile.length >= count) {
    return {
      drawn: source.drawPile.slice(0, count),
      drawPile: source.drawPile.slice(count),
      spentPile: source.spentPile,
      drawSeed: source.drawSeed,
      reshuffled: false,
    }
  }
  // Short. Take what the pile has, then rebuild it from the spent pile and take the rest. The
  // leftover front cards keep their order and their place at the head of the draw — folding them
  // INTO the shuffle instead would reorder cards the caller has already been handed.
  const fromPile = source.drawPile
  const rebuilt = shuffle([...source.spentPile], createSeededRng(source.drawSeed))
  const stillWanted = count - fromPile.length
  return {
    drawn: [...fromPile, ...rebuilt.slice(0, stillWanted)],
    drawPile: rebuilt.slice(stillWanted),
    spentPile: [],
    // Advanced so a second reshuffle in the same hand cannot repeat the first's order.
    drawSeed: mixSeed(source.drawSeed, source.spentPile.length),
    reshuffled: true,
  }
}
