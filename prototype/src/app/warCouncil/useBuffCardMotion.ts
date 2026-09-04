import { PlaceKind } from './cardPlacement'
import { useCardMotion } from './useCardMotion'

/**
 * DLR-157 Task 13 — M15/M16, the buff going up to the riding strip and coming back. Neither end
 * changes face: `cardPlacement.ts`'s `faceAt` reads both `BuffGallery` and `RidingStrip` as `up`,
 * so both directions carry `flip: false`. `hide: 'to'` in both directions, the same reading
 * `cardMotionPlan.ts`'s own rule gives (`faceAt(to) === 'down' ? 'from' : 'to'`) — applied by hand
 * here rather than through `planMovements`, because a buff is not a card in `RoundState`:
 * `cardPlacement.ts` never sees it, so this movement is CALLER-driven, exactly as M1 is
 * (`useTableCardMotion.ts`'s own docblock).
 */
export interface BuffCardMotion {
  /** M15 — the gallery card flies to the riding strip row it becomes. */
  readonly flyToStrip: (buffId: string, onLanded: () => void) => void
  /** M16 — the exact reverse, on removal or on `Escape` while priming. */
  readonly flyToGallery: (buffId: string, onLanded: () => void) => void
  /** QA fix (DLR-157 review) — `flyToStrip` and `flyToGallery` share ONE `useCardMotion()`
   *  instance, so a second remove tap (or an activation) mid-flight would otherwise read as a
   *  no-op even though `useCardMotion.ts`'s own flush now guarantees the removal still commits.
   *  Callers disable the control that would supersede an in-flight removal while this is true,
   *  mirroring `useTableCardMotion`'s `inFlight` folded into M1's own `interactive` gate. */
  readonly inFlight: boolean
}

export function useBuffCardMotion(): BuffCardMotion {
  const { move, inFlight } = useCardMotion()

  function flyToStrip(buffId: string, onLanded: () => void) {
    move(
      [
        {
          from: { kind: PlaceKind.BuffGallery, slot: buffId },
          to: { kind: PlaceKind.RidingStrip, slot: buffId },
          hide: 'to',
          flip: false,
          delayMs: 0,
        },
      ],
      onLanded,
    )
  }

  function flyToGallery(buffId: string, onLanded: () => void) {
    move(
      [
        {
          from: { kind: PlaceKind.RidingStrip, slot: buffId },
          to: { kind: PlaceKind.BuffGallery, slot: buffId },
          hide: 'to',
          flip: false,
          delayMs: 0,
        },
      ],
      onLanded,
    )
  }

  return { flyToStrip, flyToGallery, inFlight }
}
