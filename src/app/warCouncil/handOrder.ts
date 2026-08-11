import { ALL_SUITS, type Card, type Suit } from '../../warCouncil'

/**
 * AC6 — display order only, in three keys (developer-confirmed at the DLR-63 planning
 * gate, 2026-08-11):
 *
 *   1. holding size DESCENDING — the suit you hold most of sits leftmost
 *   2. `ALL_SUITS` order as the tie-break, so the comparator is TOTAL and the result
 *      never depends on `Array.prototype.sort` stability
 *   3. rank ASCENDING within a suit
 *
 * A copy, never a mutation: `RoundState.hands` keeps its dealt order, because sorting it
 * would change what `dealRound` returns for a purely presentational reason. Holding size
 * is counted from `hand` alone, so the order re-derives correctly as the hand shrinks —
 * which does mean a suit can lose its leftmost slot mid-round (DLR-63 plan.md -> Risks).
 *
 * Lives here rather than in the lint-enforced pure core because display order is not a
 * game rule — the same call `intentPreview.ts` makes. React-free and DOM-free, so it runs
 * in the cheap `node` Vitest project.
 */
export function sortHandForDisplay(hand: readonly Card[]): readonly Card[] {
  const held = new Map<Suit, number>()
  for (const card of hand) {
    held.set(card.suit, (held.get(card.suit) ?? 0) + 1)
  }

  return [...hand].sort(
    (a, b) =>
      (held.get(b.suit) ?? 0) - (held.get(a.suit) ?? 0) ||
      ALL_SUITS.indexOf(a.suit) - ALL_SUITS.indexOf(b.suit) ||
      a.rank - b.rank,
  )
}
