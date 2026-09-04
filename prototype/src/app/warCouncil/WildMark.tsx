/**
 * DLR-162 — the wild mark, drawn where a suit mark sits. `SuitMark`'s contract exactly: every path
 * is `aria-hidden`, takes its tint from the surrounding `color`, and naming is the call site's job.
 *
 * ONE DRAWING, TWO HOSTS. `src/app/run/SlotGlyph.tsx` renders this same component for its
 * `wildcard` case rather than carrying a second copy of the path data — the reason `SlotGlyph`
 * itself exists (a chip and a reel window must show the same symbol) applied one level up.
 *
 * A six-armed asterisk: it reads as "any of these" rather than as one of the three suits, and it
 * survives greyscale, which is what AC9 needs of it — wildness is carried by this SHAPE and by the
 * `Wild` prefix in the card's name, never by a colour of its own. The tint it borrows is the
 * developer's to change (`tasks.md` → Developer decides or observes).
 */
interface WildMarkProps {
  readonly className?: string
}

export function WildMark({ className }: WildMarkProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M12 3.2v17.6" />
        <path d="M4.2 7.6l15.6 8.8" />
        <path d="M19.8 7.6 4.2 16.4" />
      </g>
    </svg>
  )
}
