import {
  CONSEQUENCE_BRANCH_LABEL,
  CONSEQUENCE_CLAUSE_TEXT,
  consequenceAccessibleName,
} from './consequenceLabels'
import type { TrickConsequenceView } from './trickConsequenceModel'

export interface TrickConsequenceProps {
  readonly view: TrickConsequenceView | null
}

/**
 * DLR-148 Phase 5 — the readout slip in the felt rail. Renders NOTHING when `view` is `null`: the
 * component decides nothing, `trickConsequenceModel.ts`'s `trickConsequence` already did (AC14) —
 * no placeholder row, no empty frame, no "nothing to report" text (`game-ux`: a readout that sits
 * in the same place every turn becomes furniture).
 *
 * Every row is rendered identically regardless of branch (AC15) — same element, same class list,
 * same attributes — so nothing here marks one branch as more important than the other. The branch
 * LABEL is never coloured; only the consequence text is, via each clause's own `tone`. This is the
 * readout's half of `CLAUDE.md`'s "win/lose mean two things" split: `CONSEQUENCE_BRANCH_LABEL`
 * speaks the OUTCOME axis ("If you win" / "If you lose" / "Rule"), never the mechanical one the buff
 * cadence pill uses.
 */
export default function TrickConsequence({ view }: TrickConsequenceProps) {
  if (view === null) return null

  return (
    <div className="wc-readout" aria-label={consequenceAccessibleName(view)}>
      {view.rows.map((row) => (
        <p key={row.branch} className="wc-readout-row">
          <span className="wc-readout-label">{CONSEQUENCE_BRANCH_LABEL[row.branch]}</span>{' '}
          {row.clauses.map((clause) => (
            <span key={clause.kind} className={`wc-readout-clause wc-is-${clause.tone}`}>
              {CONSEQUENCE_CLAUSE_TEXT[clause.kind]}{' '}
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}
