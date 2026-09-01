import { useEffect, useRef, useState } from 'react'

/**
 * DLR-156 AC15 — the card's travel time from the hand to the table.
 *
 * PLACEHOLDER, not a chosen value: transcribed from `mockup.html` via `ui-notes.md` §2. The real
 * source is the `--wc-flight` CSS custom property declared in `warCouncilResolve.css` —
 * `flightDurationMs` below reads it live, following `useBeatSequence.ts`'s own `FALLBACK_BEAT_MS`
 * pattern exactly, and only falls back to this literal when the property cannot be read at all,
 * which is always true in jsdom (it computes no custom properties).
 */
const FALLBACK_FLIGHT_MS = 380

/** Same pattern as `useBeatSequence.ts`'s `beatIntervalMs` — the single statement of the pace
 *  stays in the stylesheet, not duplicated as a TypeScript literal. */
function flightDurationMs(): number {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') {
    return FALLBACK_FLIGHT_MS
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--wc-flight').trim()
  if (raw === '') return FALLBACK_FLIGHT_MS
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_FLIGHT_MS
}

export interface CardFlight {
  /** Clones `from` into a fixed layer above everything, animates it on an arc to `to`'s box, and
   *  calls `onLanded` exactly once — from whichever of the three landing paths reaches it first. */
  readonly fly: (from: HTMLElement, to: HTMLElement, onLanded: () => void) => void
  readonly inFlight: boolean
}

/** Everything one flight's three landing paths close over. `landed` guards `land()`'s own
 *  idempotence; a UNMOUNT tears the same flight down through `teardown()` instead, which marks
 *  `landed` true WITHOUT calling `onLanded` — so a stray `onfinish`/timer/`visibilitychange` that
 *  fires after unmount finds the guard already closed and lands nothing (`ui-notes.md` §2). */
interface ActiveFlight {
  landed: boolean
  readonly teardown: () => void
}

/**
 * DLR-156 AC15 — clones a card into a fixed layer and flies it on an arc from `from`'s box to
 * `to`'s box. `land()` is reachable three ways — `onfinish`, a `setTimeout` matched to
 * `--wc-flight`, and a `visibilitychange` handler — because `onfinish` ALONE is not safe: a
 * background tab freezes Web Animations at time 0, `onfinish` never fires, and everything after an
 * awaited finish is dead for the rest of the session (`ui-notes.md` §2, the defect this hook
 * exists to prevent). All three paths, plus the cloned node, are released in the effect's cleanup.
 *
 * Owns no module-level mutable state: one `useRef` per hook instance holds the currently in-flight
 * card's teardown, reset by the mount effect's own cleanup. No `memo`/`useMemo`/`useCallback` — the
 * card's travel runs on the compositor via Web Animations, not through React state, so `fly` itself
 * is cheap to redefine on every render.
 */
export function useCardFlight(): CardFlight {
  const [inFlight, setInFlight] = useState(false)
  const activeRef = useRef<ActiveFlight | null>(null)

  useEffect(() => {
    return () => {
      activeRef.current?.teardown()
      activeRef.current = null
    }
  }, [])

  function fly(from: HTMLElement, to: HTMLElement, onLanded: () => void) {
    // A flight already airborne when a new one starts is torn down silently rather than landed —
    // this hook is used one card at a time, and reaching this at all would mean a second tap
    // raced a still-travelling clone.
    activeRef.current?.teardown()

    // Feature-detected, not environment-sniffed: an environment with no Web Animations support
    // (jsdom by default — it implements no `.animate` at all) lands immediately rather than
    // leaving the tap that triggered this call silently unresolved. Every test that wants the
    // real three-path landing race stubs `Element.prototype.animate` itself (Task 16/17's own
    // specs), which is what makes this branch false for them.
    if (typeof from.animate !== 'function') {
      onLanded()
      return
    }

    const startBox = from.getBoundingClientRect()
    const endBox = to.getBoundingClientRect()
    const clone = from.cloneNode(true) as HTMLElement
    const wrap = document.createElement('div')
    // `position`/`pointer-events`/`z-index` live in `warCouncil.css`'s `.wc-card-flyer` rule —
    // this element carries only the per-flight positioning that rule cannot know.
    wrap.className = 'wc-card-flyer'
    wrap.style.cssText = `left:${startBox.left}px;top:${startBox.top}px;width:${startBox.width}px;height:${startBox.height}px;`
    clone.style.cssText = 'width:100%;height:100%;'
    wrap.appendChild(clone)
    document.body.appendChild(wrap)
    setInFlight(true)
    // `ui-notes.md` §1's "cloned, not moved" rule, applied here to the source too: the original
    // stays in the layout (its slot's gap must not collapse mid-flight) but is hidden while the
    // clone is what's actually seen travelling. Restored in `land`/`teardown` below.
    from.style.visibility = 'hidden'

    const dx = endBox.left + endBox.width / 2 - (startBox.left + startBox.width / 2)
    const dy = endBox.top + endBox.height / 2 - (startBox.top + startBox.height / 2)
    const scale = startBox.width > 0 ? endBox.width / startBox.width : 1
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reducedMotion ? 1 : flightDurationMs()

    // An arc, not a straight line — lifting clear before it travels is what makes the card read
    // as PLACED rather than dragged through its neighbours (`ui-notes.md` §2).
    const animation = wrap.animate(
      [
        { transform: 'translate(0,0) scale(1) rotate(0deg)' },
        {
          transform: `translate(${dx * 0.45}px, ${dy * 0.35 - 34}px) scale(${1 + (scale - 1) * 0.3}) rotate(-4deg)`,
          offset: 0.45,
        },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(0deg)` },
      ],
      { duration, easing: 'cubic-bezier(.3,.75,.25,1)', fill: 'forwards' },
    )

    const active: ActiveFlight = {
      landed: false,
      teardown: () => {
        if (active.landed) return
        active.landed = true
        document.removeEventListener('visibilitychange', onVisibilityChange)
        window.clearTimeout(timerId)
        try {
          animation.cancel()
        } catch {
          // Already finished or already cancelled — nothing left to release.
        }
        wrap.remove()
        from.style.visibility = ''
      },
    }
    activeRef.current = active

    function land() {
      if (active.landed) return
      active.landed = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.clearTimeout(timerId)
      try {
        animation.cancel()
      } catch {
        // Already finished — nothing left to cancel.
      }
      wrap.remove()
      from.style.visibility = ''
      if (activeRef.current === active) activeRef.current = null
      setInFlight(false)
      onLanded()
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') land()
    }

    animation.onfinish = land
    const timerId = window.setTimeout(land, duration)
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  return { fly, inFlight }
}
