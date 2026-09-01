import type { Card } from '../../warCouncil'
import { PlaceKind } from './cardPlacement'
import { cardKey } from './labels'
import { useCardMotion } from './useCardMotion'

/**
 * DLR-157 Task 7 — M1's pre-commit orchestration, lifted out of `WarCouncilTable.tsx` (which was
 * at exactly 400 lines) with NO behaviour change: same commit-tap gate, same `inFlight` folded
 * into `interactive`, same deferred dispatch. `handleTap`'s own `document.querySelector`s are
 * replaced by the anchor registry — `{ kind: PlaceKind.PlayerHand, slot: cardKey(card) }` for the
 * hand-fan button `[data-buff-anchor="…"] button` used to find, `{ kind: PlaceKind.TrickWell }`
 * for `.wc-trick-row`.
 *
 * `hide: 'from'` is set explicitly rather than derived through `cardMotionPlan.ts`'s
 * `planMovements`: this movement is caller-driven, not diff-driven (`plan.md`'s "M1 stays
 * caller-driven and pre-commit"), and DLR-156's original behaviour hides the SOURCE hand slot
 * while the clone travels — the trick well has no per-card slot to hide yet, only a shared row.
 * `flip: false` because the player's own card is already face-up in both places.
 */
export interface TableCardMotion {
  /** DLR-156's behaviour, unchanged: clones the armed card, flies it to the trick well, and calls
   *  `onLanded` once — so the trick resolves when the card visibly arrives, not before. */
  readonly flyPlayedCard: (card: Card, onLanded: () => void) => void
  readonly inFlight: boolean
}

export function useTableCardMotion(): TableCardMotion {
  const { move, inFlight } = useCardMotion()

  function flyPlayedCard(card: Card, onLanded: () => void) {
    move(
      [
        {
          from: { kind: PlaceKind.PlayerHand, slot: cardKey(card) },
          to: { kind: PlaceKind.TrickWell },
          hide: 'from',
          flip: false,
          delayMs: 0,
        },
      ],
      onLanded,
    )
  }

  return { flyPlayedCard, inFlight }
}
