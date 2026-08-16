// The two heart glyphs bind to their <symbol> by these ids — a rename here type-checks cleanly
// and renders an empty <svg> with no console error, so this map and the sheet below are the only
// two places a heart's symbol id may be written. Same rule as SUIT_SYMBOL_ID in SuitMark.tsx.
const HEART_SYMBOL_ID = {
  whole: 'hp-heart',
  broken: 'hp-heart-broken',
} as const

interface HeartMarkProps {
  readonly broken: boolean
}

/**
 * Mounted once, by `DuelHealthBars` — not by `SideBar`, which renders twice and would duplicate
 * both ids. Defines the whole heart and the cracked one.
 *
 * The two are different SHAPES, not one shape in two colours: AC6 requires a heart's state to
 * read without relying on colour, so a broken heart is a stroked outline split by a jagged
 * fissure while a whole one is solid. Neither path carries a `stroke-width` — `stroke-width` is
 * an inherited SVG property, so leaving it unset lets `.wc-hp-heart` set the weight in CSS and
 * have it reach the cloned content through the `<use>` shadow tree.
 *
 * Both `d` values are placeholders transcribed from this ticket's `mockup.html`; the glyph shape
 * is the developer's to judge at final rendered size.
 */
export function HeartSymbolSheet() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <symbol id={HEART_SYMBOL_ID.whole} viewBox="0 0 24 24">
        <path
          d="M12 20.4 4.5 13a4.9 4.9 0 0 1 7.5-6.2A4.9 4.9 0 0 1 19.5 13Z"
          fill="currentColor"
          stroke="currentColor"
          strokeLinejoin="round"
        />
      </symbol>
      <symbol id={HEART_SYMBOL_ID.broken} viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round">
          <path d="M12 20.4 4.5 13a4.9 4.9 0 0 1 7.5-6.2A4.9 4.9 0 0 1 19.5 13Z" />
          <path d="M12 6.1 9.9 10.4l3.4 1.6-2.6 2.9 2 1.9" />
        </g>
      </symbol>
    </svg>
  )
}

/**
 * One heart, tinted by the surrounding CSS `color` (every path is `currentColor`). Always
 * `aria-hidden`: the `role="meter"` on the row above carries the whole reading, so a screen
 * reader counting ten glyphs would be reading the same figure a second time.
 */
export function HeartMark({ broken }: HeartMarkProps) {
  return (
    <svg aria-hidden="true" focusable="false">
      <use href={`#${broken ? HEART_SYMBOL_ID.broken : HEART_SYMBOL_ID.whole}`} />
    </svg>
  )
}
