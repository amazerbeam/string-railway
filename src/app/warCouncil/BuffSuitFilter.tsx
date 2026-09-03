import { BUFF_RUN_ORDER, BuffRunKind } from './buffGalleryModel'
import { RUN_LABEL, RUN_SUIT } from './buffRunLabels'
import { SuitMark } from './SuitMark'

interface BuffSuitFilterProps {
  readonly counts: Readonly<Record<BuffRunKind | 'all', number>>
  readonly selected: BuffRunKind | 'all'
  readonly onSelect: (run: BuffRunKind | 'all') => void
}

const RUNS: readonly (BuffRunKind | 'all')[] = ['all', ...BUFF_RUN_ORDER]

/**
 * AC8 — a sibling of `BuffTierFilter`, rendered OUTSIDE `BuffGallery`'s roving-tabindex
 * `groupRef` for the identical reason that file's docblock states: `useRovingTabIndex` indexes
 * `groupRef.current.querySelectorAll('button')` positionally, so any focusable control inside
 * the group that isn't a buff card would silently shift every arrow-key index after it.
 *
 * A follow-up fix moved this from a second horizontal row beneath the tier filter into a
 * left-hand rail beside the card grid — three children (tier row, this rail, the scrolling grid)
 * had been laid into `warCouncilBuffGallery.css`'s two `.wc-gallery-body` row tracks, so the
 * third fell into an implicit row that overflowed the panel and painted these chips over the
 * cards. `warCouncilBuffGallery.css` now gives `.wc-gallery-body` an explicit 2x2 grid; this
 * component's markup is unchanged, only the stylesheet's layout of it.
 *
 * Six real `<button>`s — `all`, the three suits, `Suitless`, and `Press` — using `BuffRunKind`
 * and `BuffRunTab`'s own run words and suit map rather than a second naming for the same five
 * runs. Suit is carried by a `SuitMark` glyph plus the word, never colour alone (the greyscale
 * rule): `warCouncilBuffGallery.css` already records that Bells' amber sits 28.7 RGB units from
 * the bronze tier field, the same distance that moved tier onto a metallic frame there.
 * `Suitless` and `Press` carry no glyph, because neither names a suit.
 */
export default function BuffSuitFilter({ counts, selected, onSelect }: BuffSuitFilterProps) {
  return (
    <nav className="wc-suit-filter" aria-label="Filter by suit">
      {RUNS.map((run) => {
        const suit = run === 'all' ? undefined : RUN_SUIT[run]
        const label = run === 'all' ? 'All suits' : RUN_LABEL[run]
        return (
          <button
            key={run}
            type="button"
            className="wc-tier-chip wc-suit-chip"
            aria-pressed={selected === run}
            onClick={() => onSelect(run)}
          >
            {suit !== undefined && <SuitMark suit={suit} />}
            <span>{label}</span>
            <span className="wc-tier-chip-n">{counts[run]}</span>
          </button>
        )
      })}
    </nav>
  )
}
