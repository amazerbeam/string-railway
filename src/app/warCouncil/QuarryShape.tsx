import type { SuitShape } from '../../warCouncil'
import { QUARRY_SHAPE_LABEL, SKULL_MARK_LABEL, SUIT_NAME, suitShapeRowText } from './labels'
import { SuitMark } from './SuitMark'

interface QuarryShapeProps {
  readonly shape: readonly SuitShape[]
}

/**
 * AC11 — one row per suit, in the order `shape` arrives (`suitShape`'s own `ALL_SUITS` order),
 * reporting what the Quarry holds and how much of it is mined. Computes nothing: it renders the
 * `SuitShape[]` it is handed, and `SuitShape` itself carries no rank (`skulls.ts`'s own
 * docblock), so there is nothing here that could leak one.
 *
 * Skulls are drawn as repeated glyphs rather than a number, so "two skulls in Bells" reads at a
 * glance without counting a digit — the count is at most `HAND_SIZE`, so the repetition is
 * bounded. Each row also carries its own `aria-label` (game-ux: state must read without colour
 * or motion alone), and each glyph its own accessible name, so a reader who cannot see the row
 * at all still gets the same count a sighted player counts by eye.
 */
export default function QuarryShape({ shape }: QuarryShapeProps) {
  return (
    <section className="wc-shape" aria-label={QUARRY_SHAPE_LABEL}>
      <p className="wc-shape-eyebrow" aria-hidden="true">
        {QUARRY_SHAPE_LABEL}
      </p>
      {shape.map((row) => (
        <div
          key={row.suit}
          className={`wc-shape-row wc-suit-${row.suit}`}
          role="group"
          aria-label={suitShapeRowText(row)}
        >
          <SuitMark suit={row.suit} className="wc-shape-pip" />
          <span className="wc-shape-held" aria-hidden="true">
            {SUIT_NAME[row.suit]} {row.held}
          </span>
          <span className="wc-shape-skulls">
            {row.skulled === 0 ? (
              <span className="wc-shape-none" aria-hidden="true">
                —
              </span>
            ) : (
              Array.from({ length: row.skulled }, (_, index) => (
                <span
                  key={index}
                  className="wc-skull-mark"
                  role="img"
                  aria-label={SKULL_MARK_LABEL}
                >
                  ☠
                </span>
              ))
            )}
          </span>
        </div>
      ))}
    </section>
  )
}
