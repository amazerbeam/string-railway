import { Suit } from '../../warCouncil'

// The three suit marks bind to their <symbol> by this id — a rename here
// type-checks cleanly and renders nothing, so this map and the sheet below
// are the only two places a suit's symbol id may be written.
const SUIT_SYMBOL_ID: Readonly<Record<Suit, string>> = {
  [Suit.Bells]: 's-bells',
  [Suit.Keys]: 's-keys',
  [Suit.Moons]: 's-moons',
}

interface SuitMarkProps {
  readonly suit: Suit
  readonly className?: string
}

/** Mounted once by the round mount. Defines the three suit glyphs referenced by `SuitMark`. */
export function SuitSymbolSheet() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <symbol id="s-bells" viewBox="0 0 24 24">
        <path
          d="M6.8 16.4v-4.6a5.2 5.2 0 0 1 10.4 0v4.6M4.6 16.4h14.8M12 6.6V4.6M10.2 19.1a1.9 1.9 0 0 0 3.6 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </symbol>
      <symbol id="s-keys" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="12" cy="7.2" r="3.5" />
          <path d="M12 10.7V20M12 14.6h3.1M12 17.6h2.3" />
        </g>
      </symbol>
      <symbol id="s-moons" viewBox="0 0 24 24">
        <path
          d="M15.3 3.9a8.2 8.2 0 1 0 3.9 11.8 6.7 6.7 0 0 1-3.9-11.8z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
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
    <svg className={className} aria-hidden="true" focusable="false">
      <use href={`#${SUIT_SYMBOL_ID[suit]}`} />
    </svg>
  )
}
