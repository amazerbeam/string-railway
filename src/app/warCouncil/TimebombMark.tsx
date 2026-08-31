import { useId } from 'react'
import './warCouncilTimebombMark.css'

interface TimebombMarkProps {
  /** R4 — trick resolutions left, rendered as the numeral on the bomb. `undefined` (or any
   *  non-positive value) means the caller does not know the real count — DLR-154 FIX 6 — and the
   *  numeral is suppressed rather than fabricating a `0` that reads as "detonating now" on a card
   *  that may have 1–2 tricks left. `PlayingCardProps.fuseRemaining`'s own docblock is the single
   *  statement of which call sites know the real figure and which do not. */
  readonly fuseRemaining?: number
}

/**
 * The approved bomb (`.claude/contract/DLR-147-full-ui-pass/mockup-primed-card.html`), as inline
 * SVG shapes — AC7/AC8. No `<symbol>`/`<use>`: `use` clones into a shadow tree the fizz class
 * cannot reach from the light DOM, leaving the spark dead and unreachable by
 * `prefers-reduced-motion` — deliberately the opposite of the rule `#wc-skull` follows.
 *
 * `aria-hidden` because `cardAccessibleName` is the accessible carrier for both the "primed" fact
 * and the fuse clause (AC6/R4) — this component states nothing to assistive tech itself.
 *
 * The two gradient ids are minted per instance via `useId()` (Assumption 7): the mockup hard-codes
 * `id="bombBody"` / `id="sparkGlow"`, and two marks on screen at once — a primed card in hand and
 * the same card in the trick well — would collide on a literal id.
 */
export default function TimebombMark({ fuseRemaining }: TimebombMarkProps) {
  const base = useId()
  const bodyId = `${base}-body`
  const glowId = `${base}-glow`
  // DLR-154 FIX 6 — a KNOWN, POSITIVE count only. `0` and `undefined` render identically (no
  // numeral): the render layer cannot tell "the fuse really is spent" from "this call site never
  // learned the real count" apart, and fabricating a `0` for the latter reads as "detonating now"
  // on a card that may have 1–2 tricks left (`AbilityPrompt`/`DecreePile`, via `FeltRail`).
  const known = fuseRemaining !== undefined && fuseRemaining > 0 ? fuseRemaining : null
  return (
    <span className="wc-timebomb-mark" aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <defs>
          <radialGradient id={bodyId} cx="36%" cy="32%" r="72%">
            <stop offset="0" stopColor="#5a5852" />
            <stop offset=".42" stopColor="#22201c" />
            <stop offset="1" stopColor="#0a0908" />
          </radialGradient>
          <radialGradient id={glowId}>
            <stop offset="0" stopColor="#fff6cf" />
            <stop offset=".4" stopColor="#f5a623" stopOpacity=".8" />
            <stop offset="1" stopColor="#f5a623" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="46" cy="60" r="31" fill={`url(#${bodyId})`} />
        <path d="M18 52a31 31 0 0 1 26-22 31 31 0 0 0-22 30z" fill="#8e8a80" opacity=".5" />
        <ellipse
          cx="33"
          cy="46"
          rx="8"
          ry="5.5"
          fill="#ffffff"
          opacity=".26"
          transform="rotate(-28 33 46)"
        />
        <rect x="37" y="22" width="17" height="12" rx="3" fill="#33302a" />
        <rect x="37" y="22" width="17" height="4" rx="2" fill="#5c574d" />
        <path
          d="M54 27c9-7 19-4 22 3"
          fill="none"
          stroke="#7a6a4a"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle className="wc-timebomb-mark-glow" cx="76" cy="30" r="15" fill={`url(#${glowId})`} />
        <g className="wc-timebomb-mark-fizz" fill="#ffd980">
          <path d="M76 18l3.4 8.6L88 30l-8.6 3.4L76 42l-3.4-8.6L64 30l8.6-3.4z" />
          <circle cx="76" cy="30" r="3.6" fill="#fffbe8" />
        </g>
      </svg>
      {/* R4 — a real text node, not CSS `content`, so it survives a screenshot and reaches
          assistive tech (through the card's accessible name, not this decorative span).
          FIX 6 — rendered ONLY once the real count is known and positive; see `known` above. */}
      {known !== null && <span className="wc-timebomb-mark-fuse">{known}</span>}
    </span>
  )
}
