import { RunOutcome, type Health } from '../../hunt'
import {
  CARRIED_HEALTH_LABEL,
  NEW_RUN_LABEL,
  NEXT_FIGHT_LABEL,
  runHeadline,
  runProgressText,
  runVerdictDetail,
  TRICKS_TAKEN_LABEL,
  tricksTakenText,
} from './runLabels'
import './run.css'

/**
 * The deciding hand's trick split, as two counts. The engine keeps NO per-trick winner sequence —
 * `WarCouncilState.tricksWon` is a Record of two numbers — so the bars are GROUPED (taken, then
 * lost) rather than in play order. Rendering them chronologically means adding a history array to
 * `src/warCouncil/`, which DLR-82 AC7 puts out of bounds; it is a clean follow-up.
 */
export interface TrickTally {
  readonly taken: number
  readonly lost: number
}

interface RunOutcomePanelProps {
  readonly outcome: RunOutcome
  readonly encounterIndex: number
  readonly encounterCount: number
  readonly carriedHealth: Health
  readonly tricks: TrickTally
  /** `true` when the Quarry is down and another fight remains — the only state offering
   *  `onNextFight`. Handed in from `canAdvanceRun` rather than derived here, so this component
   *  cannot disagree with the run module about whether the run is over. */
  readonly canContinue: boolean
  readonly onNextFight: () => void
  readonly onNewRun: () => void
}

/**
 * The run verdict (DLR-82): a full-viewport surface shown whenever an encounter resolves, in
 * place of the felt. It replaces the terminal hand panel this ticket deletes — a `<p role="status">`
 * inside a tally table, with no control, which a play session showed the player did not read as
 * "you won" and could not act on.
 *
 * Computes NOTHING. Every figure and every branch arrives as a prop. Layout follows
 * `.claude/contract/DLR-82-play-fights-in-sequence-on-one-health-bar/mockup.html` screens 2-4.
 *
 * Three states, distinguishable WITHOUT colour or motion: the headline text differs, the rule
 * above it differs in form (single / double / hatched), the supporting line differs, and the
 * control's label differs. `game-ux` requires this — a screenshot in greyscale must still tell
 * them apart.
 */
export default function RunOutcomePanel({
  outcome,
  encounterIndex,
  encounterCount,
  carriedHealth,
  tricks,
  canContinue,
  onNextFight,
  onNewRun,
}: RunOutcomePanelProps) {
  const verdict = canContinue ? 'fightWon' : outcome
  const bars = [
    ...Array.from({ length: tricks.taken }, () => true),
    ...Array.from({ length: tricks.lost }, () => false),
  ]

  return (
    <div className="run-shell">
      <div className="run-verdict" data-verdict={verdict}>
        <div className="run-rule" aria-hidden="true" />
        <h1 className="run-headline">{runHeadline(outcome)}</h1>
        <p className="run-detail" role="status">
          {runVerdictDetail(outcome, encounterIndex, encounterCount, carriedHealth)}
        </p>
        <div
          className="run-tricks"
          role="group"
          aria-label={tricksTakenText(tricks.taken, tricks.lost)}
        >
          <span className="run-tricks-label">
            {TRICKS_TAKEN_LABEL} · {tricks.taken} of {tricks.taken + tricks.lost}
          </span>
          <span className="run-bars" aria-hidden="true">
            {bars.map((taken, index) => (
              <span key={index} className={`run-trick${taken ? '' : ' is-lost'}`} />
            ))}
          </span>
        </div>
        <p className="run-carry">
          {CARRIED_HEALTH_LABEL} — {carriedHealth}
        </p>
        <div className="run-actions">
          {canContinue ? (
            <button type="button" className="run-btn is-primary" onClick={onNextFight}>
              {NEXT_FIGHT_LABEL}
            </button>
          ) : (
            <button type="button" className="run-btn is-primary" onClick={onNewRun}>
              {NEW_RUN_LABEL}
            </button>
          )}
        </div>
        <p className="run-position">{runProgressText(encounterIndex, encounterCount)}</p>
      </div>
    </div>
  )
}
