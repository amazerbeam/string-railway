import { createContext, useContext } from 'react'
import type { PlaceId } from './cardPlacement'

/**
 * DLR-157 — the context, the key form and the two hooks over `MotionAnchors.tsx`'s registry,
 * split into this companion module for one reason only: `react-refresh/only-export-components`
 * (a real, enforced project gate — `npm run lint` fails otherwise) requires a `.tsx` file that
 * exports a component to export nothing else. `MotionAnchorProvider` stays the sole export of
 * `MotionAnchors.tsx`; every hook and helper here.
 */

/** The registry's key form. `slot` folded in so a `Map` can hold it. */
export type MotionAnchorKey = string

export function anchorKeyFor(place: PlaceId): MotionAnchorKey {
  return place.slot === undefined ? place.kind : `${place.kind}:${place.slot}`
}

export interface MotionAnchors {
  /** Ref callback a place calls once to register itself. Registers on a non-null element and
   *  unregisters on `null` — React's own unmount call is what unregisters, so nothing here can
   *  leak a detached node. */
  readonly register: (key: MotionAnchorKey) => (el: HTMLElement | null) => void
  readonly resolve: (place: PlaceId) => HTMLElement | null
  /** Card keys currently flying INTO a slot — that slot renders laid out but invisible (AC7). */
  readonly arriving: ReadonlySet<string>
  readonly setArriving: (keys: ReadonlySet<string>) => void
}

export const MotionAnchorContext = createContext<MotionAnchors | null>(null)

export function useMotionAnchors(): MotionAnchors {
  const anchors = useContext(MotionAnchorContext)
  if (anchors === null) {
    throw new Error('useMotionAnchors must be used within a MotionAnchorProvider')
  }
  return anchors
}

export function useMotionAnchor(place: PlaceId): (el: HTMLElement | null) => void {
  const { register } = useMotionAnchors()
  return register(anchorKeyFor(place))
}
