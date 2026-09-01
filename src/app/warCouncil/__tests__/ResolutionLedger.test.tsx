/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BeatKind, type ResolutionBeat } from '../resolutionBeats'
import ResolutionLedger from '../ResolutionLedger'

afterEach(cleanup)

/** Six beats — the worked run `ui-notes.md` §3 tables — enough to exercise every beat count the
 *  window has to cope with (one, two, six). Only the fields the component reads are meaningful;
 *  the rest are filled in for shape. */
function beat(kind: ResolutionBeat['kind'], label: string, running: number): ResolutionBeat {
  return { kind, label, amount: 1, damage: running, mult: 1, running }
}

const SIX_BEATS: readonly ResolutionBeat[] = [
  beat(BeatKind.Base, 'Base damage +1', 1),
  beat(BeatKind.Blade, 'Bell-Taker (Blade) bronze +1 DMG', 2),
  beat(BeatKind.Momentum, 'Bell-Taker (Momentum) bronze +2 MULT', 6),
  beat(BeatKind.Momentum, 'Bell-Taker (Momentum) bronze +2 MULT', 10),
  beat(BeatKind.Overlap, 'Overlap Bonus +2 MULT (3 fired − 1)', 14),
  beat(BeatKind.Banked, 'Banked — total 12→26, roll 2→3', 14),
]

/** jsdom performs no layout, so `scrollHeight`/`clientHeight` read 0 and `scrollTop` is an
 *  unclamped plain property, unlike a real browser's, which clamps an assignment to
 *  `[0, scrollHeight - clientHeight]`. This stub reproduces that clamp so the assertion below
 *  ("the window is parked on the newest row") means the same thing here as it does on screen. */
function stubScrollGeometry(el: HTMLElement, scrollHeight: number, clientHeight: number) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight })
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight })
  let top = 0
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (value: number) => {
      top = Math.max(0, Math.min(value, scrollHeight - clientHeight))
    },
  })
}

describe('ResolutionLedger', () => {
  it.each([1, 2, 6])(
    'AC17 — renders every landed row inside ONE fixed-height window at %i beat(s)',
    (landedCount) => {
      const { container } = render(<ResolutionLedger beats={SIX_BEATS} landed={landedCount} />)
      // Exactly one scroll window — never a row-per-beat panel that grows with the count.
      const windows = container.querySelectorAll('.wc-resolve-ledger-scroll')
      expect(windows.length).toBe(1)
      // Every landed beat is IN the DOM — the two-row limit is a CSS window over real content,
      // not a truncation of what has landed.
      const rows = container.querySelectorAll('.wc-resolve-lrow')
      expect(rows.length).toBe(landedCount)
    },
  )

  it('follows the newest row: scrollTop is assigned to scrollHeight - clientHeight after a beat lands', () => {
    const { container, rerender } = render(<ResolutionLedger beats={SIX_BEATS} landed={1} />)
    const scroll = container.querySelector<HTMLElement>('.wc-resolve-ledger-scroll')
    expect(scroll).toBeTruthy()
    if (scroll === null) throw new Error('scroll window missing')

    stubScrollGeometry(scroll, 200, 80)
    rerender(<ResolutionLedger beats={SIX_BEATS} landed={3} />)
    expect(scroll.scrollTop).toBe(scroll.scrollHeight - scroll.clientHeight)

    stubScrollGeometry(scroll, 300, 80)
    rerender(<ResolutionLedger beats={SIX_BEATS} landed={6} />)
    expect(scroll.scrollTop).toBe(scroll.scrollHeight - scroll.clientHeight)
  })

  it("the follow is an ASSIGNMENT, never scrollIntoView or 'smooth' — ui-notes.md's recorded failure", () => {
    const scrollIntoView = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsdom does not implement this
    ;(Element.prototype as any).scrollIntoView = scrollIntoView

    const { rerender } = render(<ResolutionLedger beats={SIX_BEATS} landed={1} />)
    rerender(<ResolutionLedger beats={SIX_BEATS} landed={6} />)

    expect(scrollIntoView).not.toHaveBeenCalled()

    const source = readFileSync(path.join(__dirname, '..', 'ResolutionLedger.tsx'), 'utf-8')
    // Regexes target the CALL/PROPERTY forms, not prose — this file's own docblock names
    // `scrollIntoView` to explain why it is avoided, which must not itself trip the check.
    expect(source).not.toMatch(/\.scrollIntoView\(/)
    expect(source).not.toMatch(/behavior:\s*['"]smooth['"]/)
    expect(source).not.toMatch(/scroll-behavior:\s*smooth/)
  })

  it('masks the top edge only while the window actually overflows two rows', () => {
    const { container: oneRow } = render(<ResolutionLedger beats={SIX_BEATS} landed={1} />)
    expect(oneRow.querySelector('.wc-resolve-ledger-scroll')?.className).not.toContain(
      'wc-is-overflowing',
    )

    const { container: sixRows } = render(<ResolutionLedger beats={SIX_BEATS} landed={6} />)
    expect(sixRows.querySelector('.wc-resolve-ledger-scroll')?.className).toContain(
      'wc-is-overflowing',
    )
  })
})
