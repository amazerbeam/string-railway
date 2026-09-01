import { useEffect, useRef } from 'react'
import type { RoundState } from '../../warCouncil'
import { cardMotionTiming } from './cardMotionConfig'
import { diffPlacements, placementsOf, type PlaceId } from './cardPlacement'
import { planMovements } from './cardMotionPlan'
import { useMotionAnchors } from './motionAnchorContext'
import { useCardMotion } from './useCardMotion'

/**
 * DLR-157 Phase 4 — the keystone. Watches `round` across renders, diffs its placements, plans the
 * staggered schedule (`cardMotionPlan.planMovements`) and runs it through the shared primitive.
 * Every post-commit movement in the inventory (M2–M14) falls out of this one diff — wiring each at
 * its own commit site is the "ten implementations" AC3 forbids (`plan.md`'s Approach section).
 *
 * Holds the previous placement in a `useRef` — never module-level state, which would survive HMR
 * and leak between tests in one file. The ref is updated IMMEDIATELY on every effect run, not in
 * `move`'s landing callback, so a second `round` change mid-flight diffs against the truth rather
 * than a stale map. Seeded on the first run: a first render's `prevRef.current` is `null`, and that
 * case returns before computing a diff — otherwise the fresh mount would diff against an empty map
 * and every one of the round's ~33 cards would fly in from nowhere. Under StrictMode's double
 * mount, the second invocation of this same effect finds `prevRef.current` already set to the
 * placements it itself just wrote, and `round` has not changed between the two invocations, so the
 * diff is empty and nothing is emitted — no special-casing needed beyond the ref itself.
 *
 * Starts no timer of its own: every timer, clone and listener a movement needs is owned by
 * `useCardMotion`'s own mount effect and released in ITS cleanup, which fires from the same
 * component tree this hook renders into — mounting `useCardMotion()` here is what gives an
 * unmount mid-flight a cleanup path at all.
 */
export function useCardMotionDriver(round: RoundState): void {
  const { move } = useCardMotion()
  const { setArriving } = useMotionAnchors()
  const prevRef = useRef<ReadonlyMap<string, PlaceId> | null>(null)

  useEffect(() => {
    const next = placementsOf(round)
    const prev = prevRef.current
    // Updated before anything else in this effect — the ref must hold the truth even if `move`
    // below is still airborne when the NEXT round change arrives.
    prevRef.current = next

    if (prev === null) return // first render — seed only, emit nothing

    const movements = diffPlacements(prev, next)
    if (movements.length === 0) return

    const requests = planMovements(movements, cardMotionTiming().staggerMs)
    const arrivingKeys = new Set<string>()
    for (const request of requests) {
      if (request.hide === 'to' && request.cardKey !== undefined) {
        arrivingKeys.add(request.cardKey)
      }
    }
    setArriving(arrivingKeys)
    move(requests, () => setArriving(new Set()))
  }, [round, move, setArriving])
}
