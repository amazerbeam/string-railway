import type { BuffTemplate } from '../../hunt'
import { SuitMark } from '../warCouncil/SuitMark'
import { slotSymbolFace } from './slotSymbols'
import { SLOT_STRIP_GROUP_LABEL, slotSymbolText } from './slotLabels'
import SlotGlyph from './SlotGlyph'

/**
 * 2026-09-01 — the machine's face-up strip, as GLYPH CHIPS rather than eight sentences.
 *
 * The strip is decision-critical, so `game-ux` forbids putting it behind hover — but the previous
 * rendering, eight rows of "Moon High (Momentum) — go high on Moons", was most of what made
 * the developer call this screen a wall of information. A chip carries the same three facts the
 * reel window carries (suit glyph, family, reward axis), in the same shape, so the strip can be
 * compared against the three windows at a glance instead of read.
 *
 * Nothing is hidden by the compression: each chip's `title` and its accessible name both carry the
 * full sentence from `slotSymbolText` — the ONE grammar for describing a buff — so a screen reader
 * and a pointer both still reach the long form.
 */
export default function SlotStripChips({ reel }: { readonly reel: readonly BuffTemplate[] }) {
  // Guarded before any mapping, for the same reason `SlotReel` guards its own indexing: a machine
  // whose strip has not been drawn renders nothing rather than an empty frame.
  if (reel.length === 0) return null

  return (
    <ul className="shop-strip-chips" aria-label={SLOT_STRIP_GROUP_LABEL}>
      {reel.map((template, index) => {
        const face = slotSymbolFace(template)
        const sentence = slotSymbolText(template)
        return (
          <li key={index} className="shop-strip-chip" title={sentence} aria-label={sentence}>
            <span
              className="shop-strip-chip-glyph"
              data-glyph={face.glyph.kind === 'suit' ? face.glyph.suit : face.glyph.kind}
              aria-hidden="true"
            >
              {face.glyph.kind === 'suit' ? (
                <SuitMark suit={face.glyph.suit} className="shop-strip-chip-mark" />
              ) : (
                <SlotGlyph kind={face.glyph.kind} className="shop-strip-chip-mark" />
              )}
            </span>
            <span className="shop-strip-chip-family" aria-hidden="true">
              {face.family}
            </span>
            {/* An activated card has no reward axis, so nothing is drawn — never a blank row. */}
            {face.axis !== null && (
              <span className="shop-strip-chip-axis" aria-hidden="true">
                {face.axis}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
