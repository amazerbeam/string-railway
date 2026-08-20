// The potion glyph binds to its <symbol> by this id — a rename here type-checks cleanly and
// renders an empty <svg> with no console error, so this map and the sheet below are the only two
// places it may be written. Same rule as HEART_SYMBOL_ID in HeartMark.tsx and SUIT_SYMBOL_ID in
// SuitMark.tsx.
const FLASK_SYMBOL_ID = {
  potion: 'shop-flask-potion',
} as const

/**
 * Mounted ONCE, by `ShopPanel`, beside `HeartSymbolSheet` — never from a component that renders
 * more than once, which would duplicate the id.
 *
 * The `d` values are PLACEHOLDERS transcribed from this ticket's `mockup.html`, exactly as
 * `HeartMark.tsx` marks its own; the glyph shape is the developer's to judge at final rendered
 * size, and their UX design supersedes this wholesale.
 *
 * A stoppered flask with two bubbles: deliberately distinct in SILHOUETTE from the heart, not
 * merely in colour, so the two never read as the same thing at a glance and neither depends on
 * colour vision (AC6, and `game-ux`'s "state reads without motion or colour alone"). No path
 * carries a `stroke-width`: it is an inherited SVG property, so leaving it unset lets CSS set the
 * weight and have it reach the cloned content through the `<use>` shadow tree.
 */
export function FlaskSymbolSheet() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <symbol id={FLASK_SYMBOL_ID.potion} viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round">
          <path d="M10 2.8h4v3.1l3.1 4.4a6.2 6.2 0 1 1-10.2 0L10 5.9Z" />
          <path d="M8.1 14.4a6.2 6.2 0 0 0 7.8 0" />
          <path d="M9.4 2.8h5.2" />
        </g>
        <circle cx="10.4" cy="17" r="1.05" fill="currentColor" />
        <circle cx="13.7" cy="18.4" r="0.75" fill="currentColor" />
      </symbol>
    </svg>
  )
}

/**
 * One potion, tinted by the surrounding CSS `color` (every path is `currentColor`). Always
 * `aria-hidden`: the button around it carries the accessible name from `flaskAccessibleName`, so a
 * screen reader announcing the glyph too would read the same thing twice.
 */
export function FlaskMark() {
  return (
    <svg aria-hidden="true" focusable="false">
      <use href={`#${FLASK_SYMBOL_ID.potion}`} />
    </svg>
  )
}
