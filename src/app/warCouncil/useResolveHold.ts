import { useEffect, useState } from 'react'

/**
 * DLR-156 — the resolution screen's post-choice hold. `ui-notes.md` §4: "Both exits hold before
 * leaving" — Apply, Roll over, and the hurt branch's Onward all show what just happened for
 * `--wc-resolve-hold` before the screen actually hands off (which happens only once the delayed
 * dispatch below fires and the reducer clears `ui.resolution`, per `WarCouncilRound.tsx`'s switch).
 *
 * PLACEHOLDER, not a chosen value: transcribed from `mockup.html` via `ui-notes.md` §1/§7 ("how
 * long the resolution screen holds after a choice before returning to the table"). The real source
 * is the `--wc-resolve-hold` custom property declared in `warCouncilResolve.css` —`holdMs` below
 * reads it live, following `useBeatSequence.ts`'s `beatIntervalMs`/`useCardFlight.ts`'s
 * `flightDurationMs` pattern exactly, and only falls back to this literal when the property cannot
 * be read at all, which is always true in jsdom (it computes no custom properties).
 */
const FALLBACK_HOLD_MS = 700

/** Same pattern as `useBeatSequence.ts`'s `beatIntervalMs` — the single statement of the pace
 *  stays in the stylesheet, not duplicated as a TypeScript literal. */
function holdMs(): number {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') {
    return FALLBACK_HOLD_MS
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--wc-resolve-hold')
    .trim()
  if (raw === '') return FALLBACK_HOLD_MS
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_HOLD_MS
}

interface Pending {
  readonly key: string
  readonly onSettle: () => void
}

export interface ResolveHold {
  /** The key passed to `settle`, or `null` before a choice has been made. The caller decides what
   *  each key renders (`TrickResolutionScreen`'s own `apply`/`rollOver`). */
  readonly held: string | null
  /**
   * Arms the hold for `key` and calls `onSettle` exactly once, after `--wc-resolve-hold`. A call
   * while already held is a no-op — the double-press guard `ui-notes.md` §4 and the review note on
   * the card flight (this contract's own DLR-156 fix) both ask for: a second press during the hold
   * must not queue a second dispatch.
   */
  readonly settle: (key: string, onSettle: () => void) => void
}

/**
 * Owns exactly one effect, with its own cleanup, per `react-frontend`'s listener-cleanup rule —
 * the timer that fires `onSettle`. Keyed off `pending` itself (a value in state), matching
 * `useBeatSequence.ts`'s own StrictMode discipline: the double invoke-then-cleanup-then-invoke
 * mount recomputes an identical schedule instead of double-scheduling, and unmounting mid-hold
 * clears the timer through the same cleanup, so nothing further dispatches.
 *
 * Component-local and reducer-free by design (`plan.md`'s "timers live in hooks under
 * `src/app/warCouncil/`, never in the reducer and never in the pure trees") — `src/sim/playHand.ts`
 * dispatches `ApplyPot`/`RollOver` straight at the reducer with no component in between, so the
 * hold never reaches it and the simulator never waits on a timer.
 */
export function useResolveHold(): ResolveHold {
  const [pending, setPending] = useState<Pending | null>(null)

  useEffect(() => {
    if (pending === null) return
    const id = window.setTimeout(() => {
      pending.onSettle()
    }, holdMs())
    return () => window.clearTimeout(id)
  }, [pending])

  function settle(key: string, onSettle: () => void) {
    setPending((current) => (current === null ? { key, onSettle } : current))
  }

  return { held: pending?.key ?? null, settle }
}
