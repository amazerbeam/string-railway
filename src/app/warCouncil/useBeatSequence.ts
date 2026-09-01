import { useEffect, useState } from 'react'
import type { ResolutionBeat } from './resolutionBeats'

/**
 * DLR-156 AC16/AC18 — the resolution screen's build-up clock.
 *
 * PLACEHOLDER, not a chosen value: transcribed from `mockup.html` via `ui-notes.md` §7, which
 * calls `--wc-beat` "the single number most worth setting from a play-through". The real source
 * is the `--wc-beat` CSS custom property declared in `warCouncilResolve.css` (Task 15, not yet on
 * disk) — `beatIntervalMs` below reads it live, and only falls back to this literal when the
 * property cannot be read at all, which is always true in jsdom (it computes no custom
 * properties) and would otherwise be true before Task 15 lands the stylesheet.
 */
const FALLBACK_BEAT_MS = 520

export interface BeatSequence {
  /** How many of `beats` have landed. Never exceeds `beats.length`. */
  readonly landed: number
  readonly reducedMotion: boolean
  /** `landed === beats.length`, named so a caller does not re-derive the comparison. */
  readonly done: boolean
}

/** The initial read, computed lazily in `useState`'s initialiser rather than synchronously
 *  inside an effect body — `react-hooks/set-state-in-effect` flags the latter as the cascading-
 *  render anti-pattern it is. The effect below only ever calls `setReducedMotion` from the
 *  `change` LISTENER's own callback, never from the effect body itself. */
function initialReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/** Reads `--wc-beat` off the document's computed style so the pace stays stated in exactly one
 *  place — the stylesheet — rather than being duplicated as a TypeScript literal read by the
 *  hook. Never reads a global this module doesn't already need: `getComputedStyle` is a DOM call,
 *  fine here because this is a hook, not the pure-core the DOM ban applies to. */
function beatIntervalMs(): number {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') {
    return FALLBACK_BEAT_MS
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--wc-beat').trim()
  if (raw === '') return FALLBACK_BEAT_MS
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_BEAT_MS
}

/**
 * AC16/AC18 — walks `beats` one per `--wc-beat`, and still staggers under `prefers-reduced-motion`
 * — the stagger is information (one term at a time IS the derivation), not decoration, so only the
 * travel/scale/ring classes a caller applies are suppressed by `reducedMotion`, never the timing
 * this hook drives.
 *
 * Owns exactly TWO effects, each with its own cleanup, per `react-frontend`'s listener-cleanup
 * rule: one `matchMedia` change listener, and one `setTimeout` advancing `landed` by one. The
 * timer effect is keyed off `landed` itself (a value in state) rather than appending to a ref or a
 * module-level array, so React StrictMode's double invoke-then-cleanup-then-invoke mount recomputes
 * an identical schedule instead of double-scheduling — the first invocation's timer is cleared by
 * its own cleanup before the second ever fires.
 */
export function useBeatSequence(beats: readonly ResolutionBeat[]): BeatSequence {
  const [landed, setLanded] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(initialReducedMotion)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (landed >= beats.length) return
    const id = window.setTimeout(() => {
      setLanded((count) => Math.min(count + 1, beats.length))
    }, beatIntervalMs())
    return () => window.clearTimeout(id)
  }, [landed, beats])

  return { landed, reducedMotion, done: landed >= beats.length }
}
