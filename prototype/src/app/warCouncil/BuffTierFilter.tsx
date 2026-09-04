import { BuffTier } from '../../hunt'

interface BuffTierFilterProps {
  readonly counts: Readonly<Record<BuffTier | 'all', number>>
  readonly selected: BuffTier | 'all'
  readonly onSelect: (tier: BuffTier | 'all') => void
}

const TIERS: readonly (BuffTier | 'all')[] = [
  'all',
  BuffTier.Bronze,
  BuffTier.Silver,
  BuffTier.Gold,
]

const TIER_LABEL: Readonly<Record<BuffTier | 'all', string>> = {
  all: 'All',
  [BuffTier.Bronze]: 'Bronze',
  [BuffTier.Silver]: 'Silver',
  [BuffTier.Gold]: 'Gold',
}

const TIER_SWATCH_CLASS: Readonly<Record<BuffTier | 'all', string>> = {
  all: 'wc-tier-chip-dot-all',
  [BuffTier.Bronze]: 'wc-tier-chip-dot-bronze',
  [BuffTier.Silver]: 'wc-tier-chip-dot-silver',
  [BuffTier.Gold]: 'wc-tier-chip-dot-gold',
}

/**
 * Four real `<button>`s, rendered **outside** `BuffGallery`'s roving-tabindex `groupRef` — that
 * hook indexes `querySelectorAll('button')` positionally, so any button inside the group that
 * isn't a buff card would silently shift every arrow-key index after it. Each carries a metal
 * swatch, the tier word, and a live count, and each is ≥44px in its hit area
 * (`warCouncilBuffGallery.css`'s `.wc-tier-chip` floor).
 */
export default function BuffTierFilter({ counts, selected, onSelect }: BuffTierFilterProps) {
  return (
    <nav className="wc-tier-filter" aria-label="Filter by tier">
      {TIERS.map((tier) => (
        <button
          key={tier}
          type="button"
          className="wc-tier-chip"
          aria-pressed={selected === tier}
          onClick={() => onSelect(tier)}
        >
          <span className={`wc-tier-chip-dot ${TIER_SWATCH_CLASS[tier]}`} aria-hidden="true" />
          <span>{TIER_LABEL[tier]}</span>
          <span className="wc-tier-chip-n">{counts[tier]}</span>
        </button>
      ))}
    </nav>
  )
}
