import type { SuitShape } from '../../warCouncil'
import { QUARRY_SHAPE_LABEL, SUIT_NAME, suitShapeRowText } from './labels'
import { SuitMark } from './SuitMark'

interface QuarryShapeProps {
  readonly shape: readonly SuitShape[]
}

/**
 * AC11 — one row per suit, in the order `shape` arrives (`suitShape`'s own `ALL_SUITS` order),
 * reporting what the Quarry holds and how much of it is mined. Computes nothing beyond splitting
 * each row's `held` into clean and skulled, and `SuitShape` itself carries no rank (`skulls.ts`'s
 * own docblock), so there is nothing here that could leak one.
 *
 * The row is drawn as **one small card face per card held** rather than as digits: a suit mark for
 * a clean card, a skull for a mined one. Counting four tiles is faster than reading "4" and then
 * mapping a separate skull count onto it, and it puts the readout in the same visual vocabulary as
 * the cards on the table. The count is bounded by `HAND_SIZE`, so the repetition cannot run away.
 *
 * The tiles are ordered clean-then-skulled. That ordering carries **no information about which
 * cards** — it is a tally, and the Quarry's hand has no order the player is entitled to see.
 *
 * Every tile is `aria-hidden`, and each row states its counts in words through a `.wc-sr-only`
 * span instead ("Keys: 4 held, 2 skulled") — a better reading than six repeated glyph names, and
 * what satisfies game-ux's rule that state must read without colour or motion alone.
 *
 * That sentence is **real text, not an `aria-label` on the row**, and the distinction is
 * load-bearing: a `role="group"` whose every child is `aria-hidden` gets pruned from Chrome's
 * accessibility tree along with its label, which silently emptied this readout for a screen
 * reader. Verified in the browser — the row text now appears in the tree.
 */
export default function QuarryShape({ shape }: QuarryShapeProps) {
  return (
    <section className="wc-shape" aria-label={QUARRY_SHAPE_LABEL}>
      <p className="wc-shape-eyebrow" aria-hidden="true">
        {QUARRY_SHAPE_LABEL}
      </p>
      {shape.map((row) => {
        // Clamped rather than trusted: a row claiming more skulls than cards would otherwise
        // render a negative-length run, and a tally that disagrees with itself is worse than one
        // that quietly shows every card as mined.
        const skulled = Math.min(row.skulled, row.held)
        const clean = row.held - skulled

        return (
          <div key={row.suit} className={`wc-shape-row wc-suit-${row.suit}`}>
            <span className="wc-sr-only">{suitShapeRowText(row)}</span>
            <SuitMark suit={row.suit} className="wc-shape-pip" />
            <span className="wc-shape-suit" aria-hidden="true">
              {SUIT_NAME[row.suit]}
            </span>
            <span className="wc-shape-cards" aria-hidden="true">
              {row.held === 0 ? (
                <span className="wc-shape-none">—</span>
              ) : (
                <>
                  {Array.from({ length: clean }, (_, index) => (
                    <span key={`clean-${index}`} className="wc-shape-card">
                      <SuitMark suit={row.suit} className="wc-shape-card-mark" />
                    </span>
                  ))}
                  {Array.from({ length: skulled }, (_, index) => (
                    <span key={`skulled-${index}`} className="wc-shape-card wc-shape-card-skulled">
                      ☠
                    </span>
                  ))}
                </>
              )}
            </span>
          </div>
        )
      })}
    </section>
  )
}
