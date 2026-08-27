/**
 * AC6 — the payoff bar's text meets WCAG AA (4.5:1) against its bar colour on every suit. This
 * spec PARSES the real stylesheet text rather than mirroring the hex values here in TypeScript —
 * exporting them from TS and also writing them in CSS would be two sources of truth for one
 * colour, and a retuned suit would then only fail the build if someone remembered to update both.
 * `token()`'s `throw` on a missing token is deliberate: a renamed token must fail loudly, not
 * silently pass by comparing `undefined` against `undefined`.
 */
/// <reference types="node" />
// `src/**` is typed for the browser only (`tsconfig.app.json`'s `types` is `["vite/client"]`,
// deliberately excluding Node's ambient types, since app code never runs under Node) — this
// triple-slash directive pulls in Node's ambient types for THIS file alone, rather than widening
// that boundary for the whole tree. This is a `node`-project Vitest spec (`vite.config.ts`), so it
// really does run under Node, and it needs `readFileSync` to read the real stylesheet text.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../warCouncil.css', import.meta.url), 'utf-8')

/** WCAG 2.x relative luminance. The divisor in `ratio` below is `>= 0.05` by construction, so no
 *  `NaN` is reachable from this function — there is no guard to write because there is no
 *  degenerate case. */
function luminance(hex: string): number {
  const channel = (value: number): number => {
    const srgb = value / 255
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
  }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function token(sheet: string, name: string): string {
  const match = sheet.match(new RegExp('--' + name + ':\\s*(#[0-9a-fA-F]{6})'))
  if (match === null) throw new Error(`token --${name} not found — was it renamed?`)
  return match[1]
}

const WCAG_AA_TEXT_RATIO = 4.5

describe('the payoff bar inks meet WCAG AA on their own suit (AC6)', () => {
  it('--wc-payoff-ink-bells on --wc-bells >= 4.5:1', () => {
    expect(ratio(token(css, 'wc-payoff-ink-bells'), token(css, 'wc-bells'))).toBeGreaterThanOrEqual(
      WCAG_AA_TEXT_RATIO,
    )
  })

  it('--wc-payoff-ink-keys on --wc-keys >= 4.5:1', () => {
    expect(ratio(token(css, 'wc-payoff-ink-keys'), token(css, 'wc-keys'))).toBeGreaterThanOrEqual(
      WCAG_AA_TEXT_RATIO,
    )
  })

  it('--wc-payoff-ink-moons on --wc-moons >= 4.5:1', () => {
    expect(ratio(token(css, 'wc-payoff-ink-moons'), token(css, 'wc-moons'))).toBeGreaterThanOrEqual(
      WCAG_AA_TEXT_RATIO,
    )
  })

  it('the regression the ink exists for: white on every suit FAILS 4.5:1', () => {
    expect(ratio('#ffffff', token(css, 'wc-bells'))).toBeLessThan(WCAG_AA_TEXT_RATIO)
    expect(ratio('#ffffff', token(css, 'wc-keys'))).toBeLessThan(WCAG_AA_TEXT_RATIO)
    expect(ratio('#ffffff', token(css, 'wc-moons'))).toBeLessThan(WCAG_AA_TEXT_RATIO)
  })

  it('a missing token throws rather than silently comparing undefined', () => {
    expect(() => token(css, 'wc-this-token-does-not-exist')).toThrow(/was it renamed/)
  })
})

describe('the trick consequence readout inks meet WCAG AA on the readout ground (AC6)', () => {
  it('--wc-readout-ink on --wc-readout-ground >= 4.5:1', () => {
    expect(
      ratio(token(css, 'wc-readout-ink'), token(css, 'wc-readout-ground')),
    ).toBeGreaterThanOrEqual(WCAG_AA_TEXT_RATIO)
  })

  it('--wc-readout-label on --wc-readout-ground >= 4.5:1', () => {
    expect(
      ratio(token(css, 'wc-readout-label'), token(css, 'wc-readout-ground')),
    ).toBeGreaterThanOrEqual(WCAG_AA_TEXT_RATIO)
  })

  it('--wc-readout-costly on --wc-readout-ground >= 4.5:1', () => {
    expect(
      ratio(token(css, 'wc-readout-costly'), token(css, 'wc-readout-ground')),
    ).toBeGreaterThanOrEqual(WCAG_AA_TEXT_RATIO)
  })

  it('--wc-readout-worthwhile on --wc-readout-ground >= 4.5:1', () => {
    expect(
      ratio(token(css, 'wc-readout-worthwhile'), token(css, 'wc-readout-ground')),
    ).toBeGreaterThanOrEqual(WCAG_AA_TEXT_RATIO)
  })

  it('the regression the readout inks exist for: --wc-alarm and --wc-brass FAIL on the readout ground', () => {
    expect(ratio(token(css, 'wc-alarm'), token(css, 'wc-readout-ground'))).toBeLessThan(
      WCAG_AA_TEXT_RATIO,
    )
    expect(ratio(token(css, 'wc-brass'), token(css, 'wc-readout-ground'))).toBeLessThan(
      WCAG_AA_TEXT_RATIO,
    )
  })
})
