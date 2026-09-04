/** @vitest-environment jsdom */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTrickDwell } from '../useTrickDwell'

afterEach(cleanup)

// jsdom computes no custom properties, so every case here runs the documented
// FALLBACK_DWELL_MS (800ms) — the same value `--wc-trick-dwell` transcribes.
const FALLBACK_DWELL_MS = 800

function Host({
  resolutionPresent,
  onRender,
}: {
  resolutionPresent: boolean
  onRender: (showResolution: boolean) => void
}) {
  const showResolution = useTrickDwell(resolutionPresent)
  onRender(showResolution)
  return <div />
}

describe('useTrickDwell', () => {
  it('stays false the instant resolutionPresent goes true, and flips true only after --wc-trick-dwell', () => {
    vi.useFakeTimers()
    let latest = false
    const { rerender } = render(<Host resolutionPresent={false} onRender={(v) => (latest = v)} />)
    expect(latest).toBe(false)

    rerender(<Host resolutionPresent onRender={(v) => (latest = v)} />)
    // The commit that resolved the trick has already happened — this render is the very next
    // paint — and the hook must not have flipped yet.
    expect(latest).toBe(false)

    act(() => vi.advanceTimersByTime(FALLBACK_DWELL_MS))
    expect(latest).toBe(true)
    vi.useRealTimers()
  })

  it('resets to false the instant resolutionPresent goes back to false, with no further delay', () => {
    vi.useFakeTimers()
    let latest = false
    const { rerender } = render(<Host resolutionPresent onRender={(v) => (latest = v)} />)
    act(() => vi.advanceTimersByTime(FALLBACK_DWELL_MS))
    expect(latest).toBe(true)

    rerender(<Host resolutionPresent={false} onRender={(v) => (latest = v)} />)
    expect(latest).toBe(false)
    vi.useRealTimers()
  })

  it('arms a fresh dwell for the NEXT trick — the hook is reusable across the whole hand', () => {
    vi.useFakeTimers()
    let latest = false
    const { rerender } = render(<Host resolutionPresent onRender={(v) => (latest = v)} />)
    act(() => vi.advanceTimersByTime(FALLBACK_DWELL_MS))
    expect(latest).toBe(true)
    rerender(<Host resolutionPresent={false} onRender={(v) => (latest = v)} />)

    rerender(<Host resolutionPresent onRender={(v) => (latest = v)} />)
    expect(latest).toBe(false)
    act(() => vi.advanceTimersByTime(FALLBACK_DWELL_MS))
    expect(latest).toBe(true)
    vi.useRealTimers()
  })

  it('clears its pending timer on unmount and renders nothing further', () => {
    vi.useFakeTimers()
    let renderCount = 0
    const { unmount } = render(<Host resolutionPresent onRender={() => (renderCount += 1)} />)
    const countAtUnmount = renderCount
    unmount()
    expect(() => act(() => vi.advanceTimersByTime(FALLBACK_DWELL_MS * 5))).not.toThrow()
    // No further render happened from an orphaned timer firing after unmount.
    expect(renderCount).toBe(countAtUnmount)
    vi.useRealTimers()
  })
})
