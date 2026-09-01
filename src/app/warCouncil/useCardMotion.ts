import { useEffect, useRef, useState } from 'react'
import { cardMotionTiming, prefersReducedMotion } from './cardMotionConfig'
import type { CardMoveRequest } from './cardMotionPlan'
import { useMotionAnchors, type MotionAnchors } from './motionAnchorContext'

/**
 * DLR-157 — DLR-156's single-card flight, generalised from one flight to a group. Everything it proved
 * survives verbatim: the clone into a fixed layer above every `overflow: hidden` ancestor, the arc
 * that lifts before it travels, the source-or-destination hidden with `visibility` so its slot
 * keeps its space, and — the part that exists because of a real defect — the three-path landing
 * race, where `onfinish`, a `setTimeout` matched to the duration, and a `visibilitychange` handler
 * all reach one idempotent `land()`, because `onfinish` ALONE is not safe: a background tab freezes
 * Web Animations at time 0, `onfinish` never fires, and everything after an awaited finish is dead
 * for the rest of the session (`ui-notes.md` §2, the defect this hook exists to prevent).
 *
 * What is new: `move` takes a LIST. Each request is scheduled at `index`'s own `delayMs` (AC5),
 * each holds its own `flip` flag (AC6), and `onAllLanded` fires exactly once when the last request
 * has landed by whichever path reached it first. Under `prefers-reduced-motion` the whole thing
 * short-circuits before any clone is made — no flyer, no stagger, no hidden slot, `onAllLanded`
 * called synchronously (AC8) — a different code path rather than a one-millisecond duration,
 * following `useSlotSpin.ts`'s existing precedent.
 *
 * Owns no module-level mutable state: one `useRef` per hook instance holds every currently active
 * flight's teardown, reset by the mount effect's own cleanup. No `memo`/`useMemo`/`useCallback` —
 * the travel runs on the compositor via Web Animations, not through React state, so `move` itself
 * is cheap to redefine on every render.
 */

export interface CardMotion {
  /** Executes every request, each starting at its own `delayMs`, and calls `onAllLanded` exactly
   *  once when the last has landed by whichever of its three paths reached it first. Under
   *  prefers-reduced-motion, calls `onAllLanded` synchronously and clones nothing. Resolves every
   *  request's `from`/`to` against the enclosing `MotionAnchorProvider` — this hook must be called
   *  from a descendant of one. */
  readonly move: (requests: readonly CardMoveRequest[], onAllLanded: () => void) => void
  readonly inFlight: boolean
}

/** One request's three landing paths close over this. `landed` guards `land()`'s own idempotence;
 *  unmount tears the same flight down through `teardown()` instead, which marks `landed` true
 *  WITHOUT calling its landing callback — so a stray `onfinish`/timer/`visibilitychange` that fires
 *  after unmount finds the guard already closed and lands nothing (`ui-notes.md` §2). */
interface ActiveFlight {
  landed: boolean
  readonly teardown: () => void
}

function startTeardown(active: ActiveFlight, teardown: () => void): void {
  if (active.landed) return
  active.landed = true
  teardown()
}

/** Runs one request: clones its source, animates it on an arc to its destination, and reaches
 *  `onLanded` through whichever of the three paths gets there first. `onLanded` is called with no
 *  arguments and must be idempotence-safe on its own side (the group counter in `move` handles
 *  that). Returns the teardown so the caller's effect cleanup (or a superseding call) can release
 *  the timers, the animation and the listener even if this flight never lands on its own. */
function runRequest(
  request: CardMoveRequest,
  anchors: MotionAnchors,
  timing: ReturnType<typeof cardMotionTiming>,
  onLanded: () => void,
): () => void {
  const fromEl = anchors.resolve(request.from)
  const toEl = anchors.resolve(request.to)

  // A place that cannot currently be resolved is not an error and is not silently skipped: the
  // request lands instantly, matching `handleTap`'s existing `cardEl === null` branch — no
  // destination is ever left empty (AC8's underlying rule, applied to a second cause).
  if (fromEl === null || toEl === null || typeof fromEl.animate !== 'function') {
    onLanded()
    return () => {}
  }

  const hiddenEl = request.hide === 'from' ? fromEl : toEl

  const startBox = fromEl.getBoundingClientRect()
  const endBox = toEl.getBoundingClientRect()
  const clone = fromEl.cloneNode(true) as HTMLElement
  const wrap = document.createElement('div')
  // `position`/`pointer-events`/`z-index` live in `warCouncilMotion.css`'s `.wc-card-flyer` rule —
  // this element carries only the per-flight positioning that rule cannot know.
  wrap.className = 'wc-card-flyer'
  wrap.style.cssText = `left:${startBox.left}px;top:${startBox.top}px;width:${startBox.width}px;height:${startBox.height}px;`
  clone.style.cssText = 'width:100%;height:100%;'
  wrap.appendChild(clone)
  document.body.appendChild(wrap)
  // The original stays in the layout (its slot's gap must not collapse mid-flight) but is hidden
  // while the clone is what's actually seen travelling. Restored in `land`/`teardown` below.
  hiddenEl.style.visibility = 'hidden'

  const dx = endBox.left + endBox.width / 2 - (startBox.left + startBox.width / 2)
  const dy = endBox.top + endBox.height / 2 - (startBox.top + startBox.height / 2)
  const scale = startBox.width > 0 ? endBox.width / startBox.width : 1

  // An arc, not a straight line — lifting clear before it travels is what makes the card read as
  // PLACED rather than dragged through its neighbours (`ui-notes.md` §2).
  const animation = wrap.animate(
    [
      { transform: 'translate(0,0) scale(1) rotate(0deg)' },
      {
        transform: `translate(${dx * 0.45}px, ${dy * 0.35 - timing.liftPx}px) scale(${1 + (scale - 1) * 0.3}) rotate(-${timing.tiltDeg}deg)`,
        offset: 0.45,
      },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(0deg)` },
    ],
    { duration: timing.durationMs, easing: timing.easing, fill: 'forwards' },
  )

  // AC6 — a request whose face changes carries its own flip, on the clone, timed by `flipAt` (0 =
  // start, 1 = on landing) rather than as a separate branch.
  let flipAnimation: Animation | null = null
  if (request.flip) {
    flipAnimation = clone.animate(
      [
        { transform: 'rotateY(0deg)', offset: Math.max(0, timing.flipAt - 0.001) },
        { transform: 'rotateY(90deg)', offset: timing.flipAt },
        { transform: 'rotateY(0deg)', offset: Math.min(1, timing.flipAt + 0.001) },
      ],
      { duration: timing.durationMs, fill: 'forwards' },
    )
  }

  const active: ActiveFlight = {
    landed: false,
    teardown: () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.clearTimeout(timerId)
      try {
        animation.cancel()
        flipAnimation?.cancel()
      } catch {
        // Already finished or already cancelled — nothing left to release.
      }
      wrap.remove()
      hiddenEl.style.visibility = ''
    },
  }

  function land() {
    if (active.landed) return
    active.landed = true
    active.teardown()
    onLanded()
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') land()
  }

  animation.onfinish = land
  const timerId = window.setTimeout(land, timing.durationMs)
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => startTeardown(active, active.teardown)
}

export function useCardMotion(): CardMotion {
  const [inFlight, setInFlight] = useState(false)
  const anchors = useMotionAnchors()
  // Every currently active request's teardown, for the mount effect's cleanup and for a call to
  // `move` that supersedes a still-airborne group.
  const teardownsRef = useRef<Array<() => void>>([])
  // QA fix (DLR-157 review) — the still-uncommitted `onAllLanded` of a group superseded before it
  // finished. `move()` used to tear an outgoing group down WITHOUT ever calling its callback,
  // which is correct for unmount (nothing is left to receive it) but WRONG for a second `move()`
  // call from a still-mounted caller: two sites now defer a real state commit to that callback
  // (a buff removal in `useBuffCardMotion.flyToGallery`, a shop purchase in `ShopPanel.handleBuy`)
  // and both share ONE `useCardMotion()` instance with a second trigger that can supersede them
  // mid-flight. A superseded group's callback is now FLUSHED — called exactly once, right after
  // its visuals are torn down — so the commit it carries is never silently dropped. Unmount still
  // calls nothing: see the mount effect's cleanup below, which clears this ref without flushing.
  const pendingOnAllLandedRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      for (const teardown of teardownsRef.current) teardown()
      teardownsRef.current = []
      pendingOnAllLandedRef.current = null
    }
  }, [])

  function move(requests: readonly CardMoveRequest[], onAllLanded: () => void) {
    // A group already airborne when a new one starts has its callback flushed FIRST, then its
    // visuals torn down — this hook runs one group at a time, but no group's commit is dropped.
    const pendingFlush = pendingOnAllLandedRef.current
    pendingOnAllLandedRef.current = null
    for (const teardown of teardownsRef.current) teardown()
    teardownsRef.current = []
    pendingFlush?.()

    if (requests.length === 0) {
      onAllLanded()
      return
    }

    if (prefersReducedMotion()) {
      // No clone, no stagger, no hidden slot — the end state is reached synchronously (AC8).
      onAllLanded()
      return
    }

    const timing = cardMotionTiming()
    let remaining = requests.length
    setInFlight(true)
    pendingOnAllLandedRef.current = onAllLanded

    function landedOne() {
      remaining--
      if (remaining === 0) {
        teardownsRef.current = []
        setInFlight(false)
        pendingOnAllLandedRef.current = null
        onAllLanded()
      }
    }

    for (const request of requests) {
      // A request with no stagger delay starts synchronously, exactly as DLR-156's single `fly`
      // call did — a group of one is indistinguishable from the old behaviour. Only a genuinely
      // staggered request (`delayMs > 0`) waits on a timer at all.
      if (request.delayMs <= 0) {
        const teardown = runRequest(request, anchors, timing, landedOne)
        teardownsRef.current.push(teardown)
        continue
      }
      const timerId = window.setTimeout(() => {
        const teardown = runRequest(request, anchors, timing, landedOne)
        teardownsRef.current.push(teardown)
      }, request.delayMs)
      teardownsRef.current.push(() => window.clearTimeout(timerId))
    }
  }

  return { move, inFlight }
}
