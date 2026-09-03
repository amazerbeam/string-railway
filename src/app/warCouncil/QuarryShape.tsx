import type { Suit, SuitShape } from '../../warCouncil'
import {
  QUARRY_SHAPE_LABEL,
  SKULL_ARRIVED_WORD,
  SUIT_NAME,
  quarryLeadTelegraphText,
  skullArrivedText,
  suitShapeRowText,
} from './labels'
import { SuitMark } from './SuitMark'

interface QuarryShapeProps {
  readonly shape: readonly SuitShape[]
  /** DLR-155 — the suit to mark, or `null`/absent for none. OPTIONAL for the same reason
   *  `cardAccessibleName`'s `marks` is: every existing render site keeps compiling, and an
   *  un-telegraphed panel is a real state (the player is the one leading). */
  readonly leadSuit?: Suit | null
  /** DLR-163 AC7 — the suit whose skulled count climbed on the last resolved trick, or `null`.
   *  The row marks the arrival, which is where a skull minted onto a face-down Quarry card is
   *  actually visible to the player. OPTIONAL, following `leadSuit`, so every existing render
   *  site keeps compiling. */
  readonly skullArrivedIn?: Suit | null
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
 *
 * DLR-155 — `leadSuit` marks the one row the Quarry is about to lead with, at the moment the
 * player chooses which buffs to activate. The row is marked from the prop alone: this component
 * computes nothing about the telegraph (that lives in `quarryTelegraph.ts`), and `SuitShape`
 * still carries no rank for it to leak, so the marked row draws exactly the same tally as any
 * other. The mark is CSS only — enlarged tiles and a glow so it survives a greyscale reading, plus
 * a hover/`:focus-visible` tooltip that is a nicety, never the only signal.
 */
export default function QuarryShape({ shape, leadSuit, skullArrivedIn }: QuarryShapeProps) {
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
        // DLR-155 — a string comparison per row, three per render. The suit is resolved ONCE
        // upstream in `quarryTelegraph.ts`; nothing here polls the engine.
        const marked = leadSuit !== undefined && leadSuit !== null && row.suit === leadSuit
        // DLR-163 AC7 — the Quarry's cards are face down, so a skull landing on one is invisible
        // there. This row is where the player can already read the Quarry's skulled count per
        // suit, so the arrival is marked HERE.
        const skullArrived =
          skullArrivedIn !== undefined && skullArrivedIn !== null && row.suit === skullArrivedIn

        return (
          <div
            key={row.suit}
            className={`wc-shape-row wc-suit-${row.suit}${marked ? ' wc-shape-row-lead' : ''}${
              skullArrived ? ' wc-shape-row-skull-arrived' : ''
            }`}
            tabIndex={marked ? 0 : undefined}
          >
            {marked && <span className="wc-sr-only">{quarryLeadTelegraphText(row.suit)}</span>}
            {/* AC7 — spoken as well as drawn, so a player using a reader is told a skull arrived
                rather than left to notice a count that changed. */}
            {skullArrived && <span className="wc-sr-only">{skullArrivedText(row.suit)}</span>}
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
            {marked && (
              <span className="wc-shape-tip" aria-hidden="true">
                {quarryLeadTelegraphText(row.suit)}
              </span>
            )}
            {/* AC7 — a visible WORD as well as the border, so the arrival does not read by
                colour alone. */}
            {skullArrived && (
              <span className="wc-shape-arrived" aria-hidden="true">
                {SKULL_ARRIVED_WORD}
              </span>
            )}
          </div>
        )
      })}
    </section>
  )
}
