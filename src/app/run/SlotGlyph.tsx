/**
 * 2026-09-01 — the three drawn marks that are NOT a suit: Sidestep, Cheat and Timebomb.
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
 */
export type SlotGlyphKind = 'sidestep' | 'cheat' | 'timebomb'

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
      </g>
    </svg>
  )
}
