import { useEffect, useState } from 'react'

/**
 * DLR-156 play-test fix 1 — "after I play the card the card goes up in the air then the next
 * screen just appears, it should land on the 'you played' pile." `commit` (`commitHandlers.ts`)
 * sets `ui.resolvedTrick` and `ui.resolution` in the SAME transition, so the instant a trick
 * resolves `WarCouncilRound.tsx`'s switch used to render `TrickResolutionScreen` in the very next
 * paint — the card's flight (`useCardFlight.ts`) lands the clone, and the felt showing that landed
 * card (`roundControlsProps.ts`'s `feltStageProps`, `ui.resolvedTrick` branch) is replaced before
 * the player ever sees it there.
 *
 * PLACEHOLDER, not a chosen value: the real source is the `--wc-trick-dwell` CSS custom property
 * declared in `warCouncilResolve.css`, following `useResolveHold.ts`'s/`useBeatSequence.ts`'s own
 * `holdMs`/`beatIntervalMs` pattern exactly — `dwellMs` below reads it live and only falls back to
 * this literal when the property cannot be read at all, which is always true in jsdom.
 */
const FALLBACK_DWELL_MS = 800

function dwellMs(): number {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') {
    return FALLBACK_DWELL_MS
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--wc-trick-dwell').trim()
  if (raw === '') return FALLBACK_DWELL_MS
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_DWELL_MS
}

/**
 * Holds the felt on screen for `--wc-trick-dwell` after a trick resolves, before the caller is
 * told to switch to the resolution screen. `resolutionPresent` is `ui.resolution !== null` —
 * whether a trick is currently resolved, NOT a value that changes shape, so this hook never sees
 * anything but a `boolean` and needs nothing keyed off the resolution's own identity.
 *
 * DOES NOT delay the dispatch that resolves the trick, and does not delay HIDING the resolution
 * screen either — only the one-time reveal is held. Delaying the commit itself would leave a
 * window where the flown card's clone is already gone (`useCardFlight.ts`'s `land()` removed it)
 * but the table has not yet re-rendered the real card into the well — a gap where the card exists
 * nowhere on screen, which is worse than the bug this hook fixes. Delaying only which SCREEN is
 * shown, with `ui.resolvedTrick` already rendering the landed card in the well the whole time,
 * avoids that gap entirely.
 *
 * `WarCouncilRound.tsx`'s own docblock calls itself the effect-free reducer owner; this hook is
 * the sanctioned exception, exactly as `useResolveHold`/`useBeatSequence`/`useCardFlight` already
 * are for that component's tree — the timer lives here, in a hook the mount calls, never in the
 * reducer and never in the pure trees (`plan.md`'s "timers live in hooks under
 * `src/app/warCouncil/`"). `src/sim/playHand.ts` dispatches straight at the reducer with no
 * component in between, so the dwell never reaches it and the simulator never waits on a timer.
 *
 * Owns exactly one effect, with its own cleanup, per `react-frontend`'s listener-cleanup rule.
 * Keyed off `resolutionPresent` itself — a boolean in state's dependency, not a ref or a
 * module-level flag — so React StrictMode's double invoke-then-cleanup-then-invoke mount clears the
 * first timer before the second is ever scheduled, rather than double-scheduling. Unmounting
 * mid-dwell runs the same cleanup, so nothing further is ever dispatched or rendered from it.
 */
export function useTrickDwell(resolutionPresent: boolean): boolean {
  const [showResolution, setShowResolution] = useState(false)

  useEffect(() => {
    // Nothing to arm — and nothing to reset either, deliberately: this hook must never call
    // `setState` synchronously from the effect BODY (the cascading-render anti-pattern
    // `react-hooks/set-state-in-effect` exists to catch, matching `useBeatSequence.ts`'s own
    // `initialReducedMotion` comment on the same rule). The reset back to `false` happens in this
    // same effect's CLEANUP below instead — which fires the instant `resolutionPresent` goes back
    // to false, on the `true` -> false edge — never here in the body.
    if (!resolutionPresent) return
    const id = window.setTimeout(() => setShowResolution(true), dwellMs())
    return () => {
      window.clearTimeout(id)
      setShowResolution(false)
    }
  }, [resolutionPresent])

  return showResolution
}
