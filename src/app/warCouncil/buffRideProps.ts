/**
 * DLR-153 — assembles `BuffRideView` from the reducer's own state plus the value
 * `WarCouncilRound.tsx` already derives once (`legal`). Split out for the same stated reason
 * `roundControlsProps.ts` was: `WarCouncilRound.tsx` sits at its 400-line budget and would breach
 * it assembling this prop object inline. This file decides nothing — every value it reads comes
 * from an already-built pure model (`buffRideModel.ts`) or the reducer's own action.
 *
 * `useBuffRide` below is the ONE further move that keeps that budget: it bundles the hover-bridge
 * hook call, the breakdown lookup and the transient removal announcement — all view-only state
 * that reads no rule (Assumption 7) — behind a single hook `WarCouncilRound.tsx` calls once,
 * rather than each living inline there. It is a hook (calls `useState`/`useBuffBreakdownTarget`),
 * not a plain assembler like `buffRideView`, which is why it lives beside it rather than in it.
 */
import { useEffect, useRef, useState } from 'react'
import type { BuffId } from '../../hunt'
import type { Card } from '../../warCouncil'
import { breakdownFor, type CardBuffBreakdown } from './buffBreakdownModel'
import { buffRemovedText } from './buffRideLabels'
import {
  lightsForHand,
  ridingRowsFor,
  type CardBuffLight,
  type RidingBuffRow,
} from './buffRideModel'
import { RoundUiActionKind, type RoundUiAction, type RoundUiState } from './roundUiState'
import { useBuffBreakdownTarget, type BreakdownTarget } from './useBuffBreakdownTarget'
import { useBuffCardMotion } from './useBuffCardMotion'

export interface BuffRideOptions {
  readonly ui: RoundUiState
  readonly dispatch: (action: RoundUiAction) => void
  readonly legal: readonly Card[]
}

export interface BuffRideView {
  readonly lights: ReadonlyMap<string, CardBuffLight>
  readonly riding: readonly RidingBuffRow[]
  readonly onRemoveBuff: (id: BuffId) => void
}

// DLR-153 Phase 8 Correction 1 — the breakdown is hover-only now (AC13 reversed), so it has no
// default target to open on. `bestLitCard` and `buffRideView`'s former `defaultTarget` field
// existed only to feed that fallback; with nothing left to consume it, this file stops computing
// it. `bestLitCard` itself was deleted from `buffRideModel.ts` in the same Phase 8 cleanup — it
// had no other caller once this file stopped computing a default target.
export function buffRideView({ ui, dispatch, legal }: BuffRideOptions): BuffRideView {
  const lights = lightsForHand(ui, legal)
  const riding = ridingRowsFor(ui, legal)
  return {
    lights,
    riding,
    onRemoveBuff: (id) => dispatch({ kind: RoundUiActionKind.RemoveBuff, id }),
  }
}

export interface BuffRideBundle {
  readonly lights: ReadonlyMap<string, CardBuffLight>
  readonly riding: readonly RidingBuffRow[]
  readonly breakdown: CardBuffBreakdown | null
  readonly breakdownTarget: BreakdownTarget
  /** `null` when nothing has been removed since the last dispatch — see
   *  `clearRemovedAnnouncement`'s own docblock for what clears it. */
  readonly removedAnnouncement: string | null
  readonly handleRemoveBuff: (id: BuffId) => void
  /** DLR-153 Fix 4 — clears `removedAnnouncement`. `WarCouncilRound.tsx` calls this from a SINGLE
   *  wrapper around its reducer `dispatch` (`dispatchClearingAnnouncement`) so every action other
   *  than the removal's own clears it, not just `TapCard`/`CancelSelection` — `ToggleLoadout`,
   *  `TapBuff`, applying damage and opening a discard selection all reach a hand action between a
   *  removal and the next card tap, and each used to leave the confirmation stranded in place of
   *  the hand's real hint, both visually and to a screen reader. */
  readonly clearRemovedAnnouncement: () => void
  /** QA fix (DLR-157 review) — true while a buff's M15/M16 flight is airborne. `BuffRidingList`
   *  disables its remove buttons while this is true, so a second tap cannot supersede — and
   *  silently re-target — a removal whose commit is still in flight. */
  readonly buffMotionInFlight: boolean
  /** DLR-160 AC4 — the breakdown panel's measured top edge, published via `BreakdownTopContext` so
   *  `CardAbilityTip` can anchor above it. `null` while no panel is open. */
  readonly breakdownTop: number | null
  /** Passed to `CardBuffBreakdown` as `onTopChange` — a stable `useState` setter, not a new
   *  function per render. */
  readonly onBreakdownTopChange: (top: number | null) => void
}

/** AC9/AC10/AC13/AC14 bundled behind one hook call. Reads `ui`/`legal` the same way
 *  `buffRideView` does — `useBuffBreakdownTarget`'s own docblock and `breakdownFor`'s own docblock
 *  are the two rules this hook obeys and does not restate. */
export function useBuffRide(options: BuffRideOptions): BuffRideBundle {
  const view = buffRideView(options)
  const breakdownTarget = useBuffBreakdownTarget()
  const breakdown =
    breakdownTarget.target === null
      ? null
      : breakdownFor(options.ui, options.legal, view.lights, breakdownTarget.target)

  // AC10 — a transient confirmation of what just went dark, read through the hand's OWN
  // `aria-live="polite"` hint region rather than a second live region. Component-local: it names
  // no rule and dies with the next ordinary hand action.
  const [removedAnnouncement, setRemovedAnnouncement] = useState<string | null>(null)

  // DLR-160 AC4 — the breakdown panel's measured top edge, reported up by `CardBuffBreakdown`
  // itself (via `onTopChange`) rather than re-measured here.
  const [breakdownTop, setBreakdownTop] = useState<number | null>(null)

  // DLR-157 Task 13 (M15/M16) — the buff going up to the riding strip and coming back. Neither
  // movement is a card in `RoundState`, so the felt's own diff-driven `useCardMotionDriver`
  // (Task 10) never sees it; this hook is the caller-driven equivalent for the two of them.
  const { flyToStrip, flyToGallery, inFlight: buffMotionInFlight } = useBuffCardMotion()

  // M15's trigger (`buffHandlers.handleTapBuff`'s COMMITTING tap) dispatches through the raw
  // reducer, not through this file — `RidingStrip`'s row for the newly activated buff does not
  // exist until AFTER that dispatch commits, so there is no "before" moment at which a request
  // naming that destination could resolve (`useCardMotion.ts`'s own unresolvable-anchor path would
  // just land it instantly, every time). Watching `view.riding` for a buff id that WASN'T here on
  // the previous render is the same shape Task 10's driver uses for the felt, scoped to the one
  // place a buff can appear. Seeded from the FIRST render's own riding set, not an empty one — a
  // hand that opens with a buff already riding (a restored save, a re-render) must not fly it.
  const previousRidingIdsRef = useRef<ReadonlySet<BuffId>>(
    new Set(view.riding.map((row) => row.buff.id)),
  )

  useEffect(() => {
    const currentIds = new Set(view.riding.map((row) => row.buff.id))
    for (const id of currentIds) {
      if (!previousRidingIdsRef.current.has(id)) flyToStrip(String(id), () => {})
    }
    previousRidingIdsRef.current = currentIds
  }, [view.riding, flyToStrip])

  function handleRemoveBuff(id: BuffId) {
    const row = view.riding.find((candidate) => candidate.buff.id === id)
    // M16 — the strip row is still resolvable at this instant (it is what the player just tapped
    // to remove); the gallery card it returns to may or may not be, depending on whether the buff
    // ever left the pile. Either way `useCardMotion` lands it and calls back — the actual removal,
    // and `removedAnnouncement` (DLR-154 FIX 3's ONE place it is set), stay deferred to that
    // landing, mirroring `useTableCardMotion.flyPlayedCard`'s deferred-dispatch shape for M1.
    flyToGallery(String(id), () => {
      view.onRemoveBuff(id)
      if (row === undefined) return
      setRemovedAnnouncement(buffRemovedText(row.buff, row.reach))
    })
  }

  return {
    lights: view.lights,
    riding: view.riding,
    breakdown,
    breakdownTarget,
    removedAnnouncement,
    handleRemoveBuff,
    clearRemovedAnnouncement: () => setRemovedAnnouncement(null),
    buffMotionInFlight,
    breakdownTop,
    onBreakdownTopChange: setBreakdownTop,
  }
}
