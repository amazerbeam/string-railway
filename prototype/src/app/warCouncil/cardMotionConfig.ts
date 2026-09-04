/**
 * DLR-157 AC10 — the single reader for `warCouncilMotion.css`'s six motion tokens.
 *
 * Follows `useCardMotion.ts`'s own token readers and `useBeatSequence.ts`'s `beatIntervalMs`
 * exactly: each token is read live off the document's computed style, so the real source of
 * truth stays the stylesheet, never a duplicated TypeScript literal. A `FALLBACK_*` constant is
 * used only when the property cannot be read at all — always true in jsdom, which computes no
 * custom properties — or when what was read is not a usable number.
 */

/** PLACEHOLDER, transcribed from `warCouncilMotion.css` — not chosen here. */
const FALLBACK_DURATION_MS = 380
/** PLACEHOLDER, transcribed from `warCouncilMotion.css` — not chosen here. */
const FALLBACK_STAGGER_MS = 70
/** PLACEHOLDER, transcribed from `warCouncilMotion.css` — not chosen here. */
const FALLBACK_LIFT_PX = 34
/** PLACEHOLDER, transcribed from `warCouncilMotion.css` — not chosen here. */
const FALLBACK_TILT_DEG = 4
/** PLACEHOLDER, transcribed from `warCouncilMotion.css` — not chosen here. */
const FALLBACK_EASING = 'cubic-bezier(0.3, 0.75, 0.25, 1)'
/** PLACEHOLDER, transcribed from `warCouncilMotion.css` — AC6's in-transit-vs-on-landing call,
 *  shipped unchosen. Not chosen here. */
const FALLBACK_FLIP_AT = 0.5

export interface CardMotionTiming {
  readonly durationMs: number
  readonly staggerMs: number
  readonly liftPx: number
  readonly tiltDeg: number
  readonly easing: string
  /** 0..1, clamped. AC6's in-transit-vs-on-landing call as a single number. */
  readonly flipAt: number
}

function readCustomProperty(name: string): string {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** A duration/distance value: absent, unparseable, zero or negative all yield `fallback` — a
 *  zero-or-negative duration would otherwise leave a WAAPI animation never finishing (a `NaN` or
 *  zero-length duration is treated the same as absent). */
function readPositiveNumber(name: string, fallback: number): number {
  const raw = readCustomProperty(name)
  if (raw === '') return fallback
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** The stagger is the one duration-shaped token where zero is a legitimate setting — every
 *  request firing at once, deliberately — so only a genuinely unusable value falls back. */
function readNonNegativeNumber(name: string, fallback: number): number {
  const raw = readCustomProperty(name)
  if (raw === '') return fallback
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function readEasing(name: string, fallback: string): string {
  const raw = readCustomProperty(name)
  return raw === '' ? fallback : raw
}

/** AC6's `--wc-flip-at`, clamped into `[0, 1]` regardless of what the stylesheet holds. */
function readFlipAt(name: string, fallback: number): number {
  const raw = readCustomProperty(name)
  if (raw === '') return fallback
  const parsed = Number.parseFloat(raw)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(1, Math.max(0, parsed))
}

export function cardMotionTiming(): CardMotionTiming {
  return {
    durationMs: readPositiveNumber('--wc-flight', FALLBACK_DURATION_MS),
    staggerMs: readNonNegativeNumber('--wc-flight-stagger', FALLBACK_STAGGER_MS),
    liftPx: readPositiveNumber('--wc-flight-lift', FALLBACK_LIFT_PX),
    tiltDeg: readPositiveNumber('--wc-flight-tilt', FALLBACK_TILT_DEG),
    easing: readEasing('--wc-flight-ease', FALLBACK_EASING),
    flipAt: readFlipAt('--wc-flip-at', FALLBACK_FLIP_AT),
  }
}

/** Same guard `useCardMotion.ts` and `useSlotSpin.ts:63` both use. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
