import type { Suit } from '../../warCouncil'
import { SUIT_SYMBOL_ID } from './suitSymbolIds'

interface SuitMarkProps {
  readonly suit: Suit
  readonly className?: string
}

/**
 * Mounted once by the round mount. Defines the three suit glyphs referenced by `SuitMark`.
 *
 * None of the paths carries a `strokeWidth` attribute. `stroke-width` is an *inherited* SVG
 * property, so leaving it unset here lets each call site set its own weight in CSS and have it
 * reach the cloned content through the `<use>` shadow tree — a presentation attribute on the path
 * would win over that inheritance and pin every mark in the app to one weight. The default lives
 * once, on `.wc-suit-mark` in `warCouncil.css`; a call site that wants a heavier glyph overrides
 * it on its own class.
 */
export function SuitSymbolSheet() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <symbol id="s-bells" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="2.9" r="1.05" />
          <path d="M12 4.9v.8" />
          <path d="M6.6 16.1v-4.3a5.4 5.4 0 0 1 10.8 0v4.3" />
          <path d="M4.4 16.1h15.2" />
          <path d="M9.9 18.7a2.1 2.1 0 0 0 4.2 0" />
          <path d="M9.3 12.1a2.7 2.7 0 0 1 2.4-2.4" opacity=".5" />
          <path d="M8.5 16.1v-3.7M15.5 16.1v-3.7" opacity=".3" />
        </g>
      </symbol>
      <symbol id="s-keys" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="6.5" r="3.7" />
          <circle cx="12" cy="6.5" r="1.35" opacity=".55" />
          <path d="M12 10.2V21" />
          <path d="M12 14.3h3.5M12 17h2.7" />
          <path d="M12 19.5h1.9" opacity=".55" />
        </g>
      </symbol>
      <symbol id="s-moons" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15.4 3.6a8.4 8.4 0 1 0 4.1 12 6.9 6.9 0 0 1-4.1-12z" />
          <circle cx="9.5" cy="9.7" r="1.15" opacity=".45" />
          <circle cx="7.7" cy="14.3" r=".8" opacity=".4" />
          <circle cx="11.7" cy="15.5" r=".62" opacity=".35" />
        </g>
      </symbol>
      {/* AC12/DLR-148 — the skull. A skull is a property of the TRICK, not of a character, so it
          is drawn once here and referenced by `<use>` from every skulled `PlayingCard` — N skulled
          cards then cost one path rather than N, and every one is byte-identical. Bone shapes fill
          `currentColor` (the wrapper's `.wc-card-skull-face` sets it to the bone tint); the eye
          sockets and nasal cavity are a fixed dark regardless of suit, tier or greyscale, because
          they are shadow, not a suit-coloured signal. No `stroke-width` is set — this symbol uses
          no stroke at all, matching the file's convention of leaving weight to the call site.
          Geometry transcribed from `mockup-trick-readout.html`'s `SKULL()`. */}
      <symbol id="wc-skull" viewBox="0 0 100 100">
        <path
          d="M50 8C29 8 16 21 16 40c0 10 4 18 9 23 3 4 5 7 5 11v4c0 5 4 8 9 8h22c5 0 9-3 9-8v-4c0-4 2-7 5-11 5-5 9-13 9-23C84 21 71 8 50 8z"
          fill="currentColor"
        />
        <ellipse className="wc-skull-shadow" cx="36" cy="43" rx="10" ry="11" />
        <ellipse className="wc-skull-shadow" cx="64" cy="43" rx="10" ry="11" />
        <path className="wc-skull-shadow" d="M50 54l7 13H43z" />
        <path d="M33 72h34v10a4 4 0 0 1-4 4H37a4 4 0 0 1-4-4z" fill="currentColor" />
        <g className="wc-skull-shadow">
          <rect x="39" y="72" width="1.8" height="14" />
          <rect x="45" y="72" width="1.8" height="14" />
          <rect x="51" y="72" width="1.8" height="14" />
          <rect x="57" y="72" width="1.8" height="14" />
        </g>
      </symbol>
    </svg>
  )
}

/**
 * A suit's glyph, tinted by the surrounding CSS `color` (every path is
 * `stroke="currentColor"`). The suit is always carried in the surrounding
 * control's accessible name, so the mark itself is `aria-hidden`.
 */
export function SuitMark({ suit, className }: SuitMarkProps) {
  return (
    <svg
      className={className ? `wc-suit-mark ${className}` : 'wc-suit-mark'}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`#${SUIT_SYMBOL_ID[suit]}`} />
    </svg>
  )
}
