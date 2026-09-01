/** @vitest-environment jsdom */
import { StrictMode } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BeatKind, type ResolutionBeat } from '../resolutionBeats'
import { useBeatSequence } from '../useBeatSequence'

afterEach(cleanup)

// jsdom computes no custom properties, so every case here runs the documented FALLBACK_BEAT_MS
// (520ms) — the same value `--wc-beat` transcribes until `warCouncilResolve.css` lands (Task 15).
const FALLBACK_BEAT_MS = 520

const BEATS: readonly ResolutionBeat[] = [
  { kind: BeatKind.Base, label: 'Base damage +1', amount: 1, damage: 1, mult: 1, running: 1 },
  {
    kind: BeatKind.Blade,
    label: 'Bell-Taker (Blade) +1 DMG',
    amount: 1,
    damage: 2,
    mult: 1,
    running: 2,
  },
  {
    kind: BeatKind.Banked,
    label: 'Banked — total 0→2, roll 0→1',
    amount: 0,
    damage: 2,
    mult: 1,
    running: 2,
  },
]

function stubMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function Host({ beats }: { beats: readonly ResolutionBeat[] }) {
  const sequence = useBeatSequence(beats)
  return (
    <div>
      <span data-testid="landed">{sequence.landed}</span>
      <span data-testid="reducedMotion">{String(sequence.reducedMotion)}</span>
      <span data-testid="done">{String(sequence.done)}</span>
    </div>
  )
}

function landedText() {
  return screen.getByTestId('landed').textContent
}

describe('useBeatSequence', () => {
  it('lands beats one at a time as the clock advances by --wc-beat', () => {
    stubMatchMedia(false)
    vi.useFakeTimers()
    render(<Host beats={BEATS} />)
    expect(landedText()).toBe('0')
    act(() => vi.advanceTimersByTime(FALLBACK_BEAT_MS))
    expect(landedText()).toBe('1')
    act(() => vi.advanceTimersByTime(FALLBACK_BEAT_MS))
    expect(landedText()).toBe('2')
    act(() => vi.advanceTimersByTime(FALLBACK_BEAT_MS))
    expect(landedText()).toBe('3')
    vi.useRealTimers()
  })

  it('never exceeds beats.length and flips `done` true at the last beat', () => {
    stubMatchMedia(false)
    vi.useFakeTimers()
    render(<Host beats={BEATS} />)
    // Advanced one beat interval at a time: a single large jump does not let React's effects
    // re-schedule the NEXT timer between fake-timer ticks, so this loop is the faithful way to
    // drive "well past the end" rather than a false negative about the hook itself.
    for (let tick = 0; tick < 10; tick += 1) {
      act(() => vi.advanceTimersByTime(FALLBACK_BEAT_MS))
    }
    expect(landedText()).toBe('3')
    expect(screen.getByTestId('done').textContent).toBe('true')
    vi.useRealTimers()
  })

  it('clears its pending timer on unmount and lands nothing further', () => {
    stubMatchMedia(false)
    vi.useFakeTimers()
    const { unmount } = render(<Host beats={BEATS} />)
    act(() => vi.advanceTimersByTime(FALLBACK_BEAT_MS))
    expect(landedText()).toBe('1')
    unmount()
    expect(() => act(() => vi.advanceTimersByTime(FALLBACK_BEAT_MS * 5))).not.toThrow()
    vi.useRealTimers()
  })

  it('still runs the stagger beat by beat under prefers-reduced-motion, and reports it (AC18)', () => {
    stubMatchMedia(true)
    vi.useFakeTimers()
    render(<Host beats={BEATS} />)
    expect(screen.getByTestId('reducedMotion').textContent).toBe('true')
    expect(landedText()).toBe('0')
    act(() => vi.advanceTimersByTime(FALLBACK_BEAT_MS))
    expect(landedText()).toBe('1')
    act(() => vi.advanceTimersByTime(FALLBACK_BEAT_MS))
    expect(landedText()).toBe('2')
    act(() => vi.advanceTimersByTime(FALLBACK_BEAT_MS))
    expect(landedText()).toBe('3')
    vi.useRealTimers()
  })

  it('does not double the beat count under StrictMode double-mount', () => {
    stubMatchMedia(false)
    vi.useFakeTimers()
    render(
      <StrictMode>
        <Host beats={BEATS} />
      </StrictMode>,
    )
    for (let tick = 0; tick < 10; tick += 1) {
      act(() => vi.advanceTimersByTime(FALLBACK_BEAT_MS))
    }
    expect(landedText()).toBe('3')
    vi.useRealTimers()
  })
})
