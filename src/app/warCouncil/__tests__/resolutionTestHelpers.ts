import { act, fireEvent, screen } from '@testing-library/react'
import { vi } from 'vitest'

/**
 * DLR-156 — the resolution screen REPLACES the felt the instant a trick resolves and BLOCKS
 * until the player presses one of its own controls (`ui-notes.md` §1/§4) — there is no longer a
 * "tap the table to carry on" gesture ON THE FELT for a held reveal. Every existing spec that
 * drives a trick to resolution and then keeps interacting with the felt needs the equivalent
 * dismissal, which is what this helper is: whichever control the screen actually offers (the
 * hurt branch's sole "Onward", or the banked branch's "Roll over" — never "Apply", so a spec that
 * does not care about the pot's economy does not accidentally spend it and reset the streak under
 * itself).
 *
 * DLR-156 (hold) — a press no longer dispatches on the click itself: `useResolveHold` holds it
 * for `--wc-resolve-hold` first (`TrickResolutionScreen.tsx`'s own docblock). `RESOLVE_HOLD_MS`
 * mirrors the FALLBACK constant `useResolveHold.ts` falls back to — jsdom computes no custom
 * properties, so every spec here runs that fallback, same as `useBeatSequence`'s own fallback
 * this file's `stubMatchMedia` sits beside. `pressAndFlush` enables fake timers ONLY for the
 * window between the click and the advance — created under real timers, `useResolveHold`'s own
 * `setTimeout` cannot be driven by `vi.advanceTimersByTime` at all, so the switch must happen
 * BEFORE the click, not after — then restores whatever mode the caller was already in, so a spec
 * that wraps its own body in `vi.useFakeTimers()` (the card-flight specs) is left exactly as it
 * found it.
 */
const RESOLVE_HOLD_MS = 700

/**
 * EXPORTED for specs that press a resolution-screen control THEMSELVES — a mixed query, a custom
 * driving loop (`WarCouncilRound.duelHealthBars.test.tsx`'s own) — and still need the hold
 * flushed afterward. `press` must do the actual `fireEvent.click` INSIDE this callback, not
 * before calling it — the fake-timer switch has to happen before the click, since a `setTimeout`
 * created under real timers cannot be driven by `vi.advanceTimersByTime` at all.
 */
export function withResolveHold(press: () => void): void {
  const wasFake = vi.isFakeTimers()
  if (!wasFake) vi.useFakeTimers()
  try {
    press()
    act(() => {
      vi.advanceTimersByTime(RESOLVE_HOLD_MS)
    })
  } finally {
    if (!wasFake) vi.useRealTimers()
  }
}

export function carryOnFromResolution(): void {
  withResolveHold(() => {
    const onward = screen.queryByRole('button', { name: /onward/i })
    const button = onward ?? screen.getByRole('button', { name: /roll over/i })
    fireEvent.click(button)
  })
}

/** Also needed by the small number of specs that ARE about the pot's economy, and want the
 *  Apply Damage branch specifically. */
export function applyFromResolution(): void {
  withResolveHold(() => {
    fireEvent.click(screen.getByRole('button', { name: /apply damage/i }))
  })
}

/** `window.matchMedia` is not implemented by jsdom at all — `useBeatSequence` (the resolution
 *  screen's build-up clock) reads it on mount, so every spec that can reach that screen needs
 *  this stub, mirroring `useBeatSequence.test.tsx`'s own. Call once, at module scope or in a
 *  `beforeEach` — it is a plain assignment, not a mock that needs resetting between tests. */
export function stubMatchMedia(matches = false): void {
  window.matchMedia = (query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
