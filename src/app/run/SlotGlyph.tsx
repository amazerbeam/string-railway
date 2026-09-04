import { WildMark } from '../warCouncil/WildMark'

/**
 * 2026-09-01 — the four drawn marks that are NOT a suit: Skull Low, Cheat, Skull Helmet
 * and Skull Tether.
 *
 * Extracted from `SlotReel.tsx` when the strip list became glyph chips (`SlotStripChips.tsx`), so
 * one drawing serves both — a chip and a reel window must show the same symbol or the strip cannot
 * be compared against the windows, which is the entire reason the chips exist.
 *
 * The three suits are NOT here: `SuitMark` already owns them, and re-drawing them would be a second
 * source of truth for what a suit looks like. Every path is `aria-hidden` and takes its tint from
 * the surrounding `color`, exactly as `SuitMark` does — naming is the call site's job.
 *
 * DLR-161 — Skull Helmet and Skull Tether share ONE colour token (`--wc-guard`, both stylesheets),
 * so the two are told apart by SHAPE, not tint: the Helmet is a dome over a skull (the blow lands,
 * the dome takes it), the Tether is a taut line to an anchor (the roll stays tied on). Each also
 * reads distinctly from Skull Low's three chevrons with colour removed. (DLR-165 renamed the mark,
 * not the drawing: the same three chevrons are still what the card shows.)
 */
// DLR-167 — Curse's mark is an arrow coming DOWN onto a skull: the player puts the skull there,
// which is what tells it apart from the Helmet's dome-over-skull with colour removed.
export type SlotGlyphKind =
  'skullLow' | 'cheat' | 'skullHelmet' | 'skullTether' | 'wildcard' | 'curse'

interface SlotGlyphProps {
  readonly kind: SlotGlyphKind
  readonly className?: string
}

export default function SlotGlyph({ kind, className }: SlotGlyphProps) {
  // DLR-162 — the wild mark is `WildMark`'s drawing, not a second copy of it. Returned ahead of
  // this component's own <svg> because WildMark brings its own, exactly as SuitMark does for the
  // three suits this module deliberately does not draw.
  if (kind === 'wildcard') return <WildMark className={className} />
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'skullLow' && (
          <>
            <path d="M4 6.5 9.5 12 4 17.5" />
            <path d="M12.5 6.5 18 12l-5.5 5.5" opacity=".55" />
            <path d="M20.5 6.5V17.5" opacity=".35" />
          </>
        )}
        {kind === 'cheat' && (
          <>
            <rect x="7.5" y="4" width="10" height="14" rx="1.6" transform="rotate(-14 12.5 11)" />
            <rect x="7.5" y="4" width="10" height="14" rx="1.6" opacity=".55" />
            <path d="M4 20.5h16" opacity=".4" />
          </>
        )}
        {kind === 'skullHelmet' && (
          <>
            <path d="M4.5 12a7.5 7.5 0 0 1 15 0" />
            <path d="M3 12.4h18" />
            <path
              d="M7.5 14.5v3.2a1.6 1.6 0 0 0 1.6 1.6h5.8a1.6 1.6 0 0 0 1.6-1.6v-3.2"
              opacity=".55"
            />
            <circle cx="10" cy="17" r="1" opacity=".8" />
            <circle cx="14" cy="17" r="1" opacity=".8" />
          </>
        )}
        {kind === 'curse' && (
          <>
            <path d="M12 2.5v5.5" />
            <path d="M9.5 5.8 12 8.4l2.5-2.6" />
            <path d="M6 15.2a6 6 0 1 1 12 0v1.6a1.6 1.6 0 0 1-1.6 1.6H7.6A1.6 1.6 0 0 1 6 16.8z" />
            <circle cx="9.7" cy="15" r="1.1" opacity=".8" />
            <circle cx="14.3" cy="15" r="1.1" opacity=".8" />
            <path d="M9.5 21h5" opacity=".45" />
          </>
        )}
        {kind === 'skullTether' && (
          <>
            <circle cx="6" cy="6" r="2.6" />
            <path d="M8.2 7.8 15 15" />
            <path d="M13 19.5h7a1.5 1.5 0 0 0 1.5-1.5v-4" opacity=".55" />
            <path d="M15 15l4.5-1.2" opacity=".7" />
            <path d="M15 15l-1.2 4.5" opacity=".7" />
          </>
        )}
      </g>
    </svg>
  )
}
