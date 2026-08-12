import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import StandingTrack from '../StandingTrack'
import { HuntDeclaration, standingTableFor } from '../../../hunt'

// Vitest's `globals` option is off in this project, so React Testing Library's auto-cleanup
// (which relies on a global `afterEach`) never fires — every other `.test.tsx` file here
// calls this explicitly, and without it a later test's `screen.getByRole(...)` matches every
// still-mounted component from every earlier `it()` in this file.
afterEach(cleanup)

const winTable = standingTableFor(HuntDeclaration.Win)

describe('StandingTrack', () => {
  it('names the current band, its multiplier, and the trick count', () => {
    render(<StandingTrack table={winTable} tricks={8} />)
    // k=8 is Victorious ×5 on the Win table — read from config, not asserted as a literal.
    const band = winTable.find((b) => 8 >= b.minTricks && 8 <= b.maxTricks)
    expect(
      screen.getByText(new RegExp(`multiplier ${band?.multiplier}, at 8 tricks won`)),
    ).toBeDefined()
  })

  it('renders one segment per configured row and one pip per trick', () => {
    const { container } = render(<StandingTrack table={winTable} tricks={0} />)
    expect(container.querySelectorAll('.wc-track-seg')).toHaveLength(winTable.length)
    // The pips tile 0..13 — 14 positions across the whole track.
    expect(container.querySelectorAll('.wc-track-pip')).toHaveLength(14)
    expect(container.querySelectorAll('.wc-track-pip.wc-is-here')).toHaveLength(1)
  })

  it('marks exactly one segment current, and none when the trick count is out of range', () => {
    const { container, unmount } = render(<StandingTrack table={winTable} tricks={5} />)
    expect(container.querySelectorAll('.wc-track-seg.wc-is-current')).toHaveLength(1)
    unmount()

    const out = render(<StandingTrack table={winTable} tricks={99} />)
    expect(out.container.querySelectorAll('.wc-track-seg.wc-is-current')).toHaveLength(0)
    expect(out.container.querySelectorAll('.wc-track-pip.wc-is-here')).toHaveLength(0)
  })

  it('is labelled as a group so the track is reachable as one thing', () => {
    render(<StandingTrack table={winTable} tricks={3} />)
    expect(screen.getByRole('group', { name: 'Standing track' })).toBeDefined()
  })
})
