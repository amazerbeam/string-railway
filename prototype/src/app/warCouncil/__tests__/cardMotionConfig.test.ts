import { afterEach, describe, expect, it, vi } from 'vitest'
import { cardMotionTiming, prefersReducedMotion } from '../cardMotionConfig'

/**
 * DLR-157 — `cardMotionConfig.ts` reads `warCouncilMotion.css`'s six tokens live via
 * `getComputedStyle`, following `useCardMotion.ts`'s own token readers and
 * `useBeatSequence.ts`'s `beatIntervalMs` exactly. No DOM is actually needed here — this spec
 * runs under Vitest's `node` project and stubs `document`/`getComputedStyle` itself, the way
 * `cardPlacement.test.ts` and `cardMotionPlan.test.ts` stub nothing at all: a pure reader over a
 * fake computed style is still function-in, value-out.
 */

interface StubProps {
  readonly [key: string]: string
}

function stubComputedStyle(props: StubProps): void {
  vi.stubGlobal('document', { documentElement: {} })
  vi.stubGlobal('getComputedStyle', () => ({
    getPropertyValue: (name: string) => props[name] ?? '',
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cardMotionTiming', () => {
  it('reads a well-formed token', () => {
    stubComputedStyle({
      '--wc-flight': '500ms',
      '--wc-flight-stagger': '90ms',
      '--wc-flight-lift': '40px',
      '--wc-flight-tilt': '6deg',
      '--wc-flight-ease': 'linear',
      '--wc-flip-at': '0.75',
    })
    const timing = cardMotionTiming()
    expect(timing.durationMs).toBe(500)
    expect(timing.staggerMs).toBe(90)
    expect(timing.liftPx).toBe(40)
    expect(timing.tiltDeg).toBe(6)
    expect(timing.easing).toBe('linear')
    expect(timing.flipAt).toBe(0.75)
  })

  it('falls back when a token is absent', () => {
    stubComputedStyle({})
    const timing = cardMotionTiming()
    expect(timing.durationMs).toBe(380)
    expect(timing.staggerMs).toBe(70)
    expect(timing.liftPx).toBe(34)
    expect(timing.tiltDeg).toBe(4)
    expect(timing.easing).toBe('cubic-bezier(0.3, 0.75, 0.25, 1)')
    expect(timing.flipAt).toBe(0.5)
  })

  it('falls back to the documented literal when nothing can be read at all (jsdom-less)', () => {
    vi.stubGlobal('document', undefined)
    const timing = cardMotionTiming()
    expect(timing.durationMs).toBe(380)
    expect(timing.staggerMs).toBe(70)
  })

  it('yields the fallback rather than propagating NaN', () => {
    stubComputedStyle({ '--wc-flight': 'not-a-number', '--wc-flight-lift': 'nope' })
    const timing = cardMotionTiming()
    expect(timing.durationMs).toBe(380)
    expect(timing.liftPx).toBe(34)
  })

  it('yields the fallback for a zero or negative duration', () => {
    stubComputedStyle({ '--wc-flight': '0ms' })
    expect(cardMotionTiming().durationMs).toBe(380)
    stubComputedStyle({ '--wc-flight': '-40ms' })
    expect(cardMotionTiming().durationMs).toBe(380)
  })

  it('keeps a zero stagger — a legitimate setting, unlike a zero duration', () => {
    stubComputedStyle({ '--wc-flight-stagger': '0ms' })
    expect(cardMotionTiming().staggerMs).toBe(0)
  })

  it('clamps --wc-flip-at into [0, 1]', () => {
    stubComputedStyle({ '--wc-flip-at': '1.4' })
    expect(cardMotionTiming().flipAt).toBe(1)
    stubComputedStyle({ '--wc-flip-at': '-0.2' })
    expect(cardMotionTiming().flipAt).toBe(0)
  })
})

describe('prefersReducedMotion', () => {
  it('returns false when matchMedia is unavailable', () => {
    vi.stubGlobal('window', {})
    expect(prefersReducedMotion()).toBe(false)
  })

  it('reads the media query when matchMedia is available', () => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({ matches: query.includes('reduce') }),
    })
    expect(prefersReducedMotion()).toBe(true)
  })
})
