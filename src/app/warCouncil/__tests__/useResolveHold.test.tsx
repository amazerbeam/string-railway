/** @vitest-environment jsdom */
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useResolveHold } from '../useResolveHold'

afterEach(cleanup)

// jsdom computes no custom properties, so every case here runs the documented
// FALLBACK_HOLD_MS (700ms) — the same value `--wc-resolve-hold` transcribes.
const FALLBACK_HOLD_MS = 700

function Host({ onSettle }: { onSettle: () => void }) {
  const { held, settle } = useResolveHold()
  return (
    <div>
      <span data-testid="held">{held ?? 'none'}</span>
      <button type="button" onClick={() => settle('apply', onSettle)}>
        press
      </button>
    </div>
  )
}

describe('useResolveHold', () => {
  it('holds the pressed key and fires onSettle exactly once after --wc-resolve-hold', () => {
    vi.useFakeTimers()
    const onSettle = vi.fn()
    render(<Host onSettle={onSettle} />)
    expect(screen.getByTestId('held').textContent).toBe('none')

    act(() => screen.getByRole('button').click())
    expect(screen.getByTestId('held').textContent).toBe('apply')
    expect(onSettle).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(FALLBACK_HOLD_MS))
    expect(onSettle).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('a second settle call while already held is a no-op — no second timer, no second fire', () => {
    vi.useFakeTimers()
    const onSettle = vi.fn()
    render(<Host onSettle={onSettle} />)

    act(() => screen.getByRole('button').click())
    act(() => screen.getByRole('button').click())
    act(() => vi.advanceTimersByTime(FALLBACK_HOLD_MS))
    expect(onSettle).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('clears its pending timer on unmount and calls onSettle nothing further', () => {
    vi.useFakeTimers()
    const onSettle = vi.fn()
    const { unmount } = render(<Host onSettle={onSettle} />)

    act(() => screen.getByRole('button').click())
    unmount()
    expect(() => act(() => vi.advanceTimersByTime(FALLBACK_HOLD_MS * 5))).not.toThrow()
    expect(onSettle).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
