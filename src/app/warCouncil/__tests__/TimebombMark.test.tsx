/** @vitest-environment jsdom */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import TimebombMark from '../TimebombMark'

afterEach(cleanup)

describe('TimebombMark — DLR-154 AC7/AC8', () => {
  it('draws the bomb inline, never through <use>', () => {
    const { container } = render(<TimebombMark fuseRemaining={2} />)
    expect(container.querySelector('use')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('mints unique gradient ids per instance, so two marks cannot collide', () => {
    const { container } = render(
      <>
        <TimebombMark fuseRemaining={2} />
        <TimebombMark fuseRemaining={1} />
      </>,
    )
    const ids = [...container.querySelectorAll('radialGradient')].map((node) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('renders the fuse count as a real text node — R4', () => {
    const { container } = render(<TimebombMark fuseRemaining={2} />)
    expect(container.textContent).toContain('2')
  })

  it('is decorative — the accessible name carries the fact instead', () => {
    const { container } = render(<TimebombMark fuseRemaining={2} />)
    // No `@testing-library/jest-dom` in this project (`package.json` — two runtime
    // dependencies, react-frontend's own floor) — asserted through the plain DOM API, the
    // pattern `PlayingCard.test.tsx` already uses, rather than adding a matcher library.
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
  })

  it('suppresses the numeral when the count is unknown — FIX 6, no fabricated "0"', () => {
    const { container } = render(<TimebombMark />)
    expect(container.querySelector('.wc-timebomb-mark-fuse')).toBeNull()
    expect(container.textContent).toBe('')
  })

  it('also suppresses the numeral on an explicit 0 — a momentary state, not a displayable one', () => {
    const { container } = render(<TimebombMark fuseRemaining={0} />)
    expect(container.querySelector('.wc-timebomb-mark-fuse')).toBeNull()
  })
})
