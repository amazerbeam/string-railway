/**
 * 2026-09-01 — the five drawn marks that are NOT a suit: Sidestep, Cheat, Timebomb, Skull Helmet
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
 * Timebomb is drawn here rather than reusing `TimebombMark`: that component carries a fuse numeral
 * and takes no `className`, and neither a reel symbol nor a strip chip has a fuse to count down.
 *
 * DLR-161 — Skull Helmet and Skull Tether share ONE colour token (`--wc-guard`, both stylesheets),
 * so the two are told apart by SHAPE, not tint: the Helmet is a dome over a skull (the blow lands,
 * the dome takes it), the Tether is a taut line to an anchor (the roll stays tied on). Each also
 * reads distinctly from Sidestep's three chevrons with colour removed.
 */
export type SlotGlyphKind = 'sidestep' | 'cheat' | 'timebomb' | 'skullHelmet' | 'skullTether'

interface SlotGlyphProps {
  readonly kind: SlotGlyphKind
  readonly className?: string
}

export default function SlotGlyph({ kind, className }: SlotGlyphProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'sidestep' && (
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
        {kind === 'timebomb' && (
          <>
            <circle cx="11" cy="15" r="6.4" />
            <path d="M15.6 10.4 18 8" />
            <path d="M18 8c1.6-1.6 3.2-.6 3 1.1" />
            <path d="M8.2 12.4a4 4 0 0 1 2.4-1.6" opacity=".45" />
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
