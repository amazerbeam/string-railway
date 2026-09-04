import { useRef, useState, type ReactNode } from 'react'
import {
  anchorKeyFor,
  MotionAnchorContext,
  type MotionAnchorKey,
  type MotionAnchors,
} from './motionAnchorContext'
import type { PlaceId } from './cardPlacement'

/**
 * DLR-157 — the place registry's provider. `useCardMotion` resolves a movement's `from`/`to`
 * `PlaceId`s to live elements at the moment it measures, so a caller never hands over two elements
 * itself and never binds a class name through `document.querySelector` (`plan.md`'s "nineteen of
 * those is a maintenance trap the correctness-traps section of `web-project.md` names
 * explicitly"). The context, the key form and the two hooks live in `motionAnchorContext.ts` —
 * split out so this `.tsx` file exports only the component, per `react-refresh/only-export-
 * components`.
 *
 * The element map lives in a `useRef` inside the provider — never module-level mutable state,
 * which would survive HMR and leak between tests in one file. `arriving` is real React state
 * because a component (a hand slot, a well row) reads it to render `wc-is-in-flight` (AC7), which
 * must re-render when the set changes.
 */
export function MotionAnchorProvider({ children }: { children: ReactNode }) {
  const elementsRef = useRef<Map<MotionAnchorKey, HTMLElement>>(new Map())
  const [arriving, setArriving] = useState<ReadonlySet<string>>(new Set())

  function register(key: MotionAnchorKey) {
    return (el: HTMLElement | null) => {
      if (el === null) elementsRef.current.delete(key)
      else elementsRef.current.set(key, el)
    }
  }

  function resolve(place: PlaceId): HTMLElement | null {
    return elementsRef.current.get(anchorKeyFor(place)) ?? null
  }

  const value: MotionAnchors = { register, resolve, arriving, setArriving }
  return <MotionAnchorContext.Provider value={value}>{children}</MotionAnchorContext.Provider>
}
