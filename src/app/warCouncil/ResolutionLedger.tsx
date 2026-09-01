import { useEffect, useRef } from 'react'
import type { ResolutionBeat } from './resolutionBeats'

export interface ResolutionLedgerProps {
  /** The whole sequence `resolutionBeatsFor` derived, ordered. */
  readonly beats: readonly ResolutionBeat[]
  /** How many of `beats` have landed (`useBeatSequence`'s own field name). */
  readonly landed: number
}

/**
 * DLR-156 — the resolution screen's ledger: every landed beat, inside a window fixed at
 * `calc(2 * var(--wc-ledger-row))` (`warCouncilResolve.css`), never at the content's own height.
 * `ui-notes.md` §3/§6: the window does not grow with the sixth beat and does not collapse on the
 * first, and it is the file's ONE scrolling region.
 *
 * The follow is a plain ASSIGNMENT (`ref.current.scrollTop = ref.current.scrollHeight`) — never
 * the native scroll-to-element call and never the animated scrolling option — because both ride
 * the same compositor as the card flight, and `ui-notes.md` records that the animated version
 * silently never ran: `scrollTop` measured at 0 for a whole run and every term past the second
 * landed out of sight. An assignment cannot silently not run.
 */
export default function ResolutionLedger({ beats, landed }: ResolutionLedgerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const visible = beats.slice(0, landed)
  const overflowing = visible.length > 2

  // No cleanup to write — this effect only ever assigns a property on an element this
  // component already owns; it registers no listener, timer, or observer.
  useEffect(() => {
    const el = scrollRef.current
    if (el === null) return
    el.scrollTop = el.scrollHeight
  }, [landed])

  return (
    <section className="wc-resolve-ledger" aria-label="This trick">
      <h2 className="wc-resolve-ledger-heading">This trick</h2>
      <div
        ref={scrollRef}
        className={`wc-resolve-ledger-scroll${overflowing ? ' wc-is-overflowing' : ''}`}
      >
        {visible.map((entry, index) => (
          <div
            // A beat kind repeats across a trick (two Momentum cards, say), so the index joins
            // the kind rather than replacing it — the ORDER is what makes each row unique.
            key={`${index}-${entry.kind}`}
            className={`wc-resolve-lrow wc-resolve-lrow-${entry.kind}`}
          >
            <span className="wc-resolve-lrow-name">{entry.label}</span>
            <span className="wc-resolve-lrow-run">{entry.running}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
