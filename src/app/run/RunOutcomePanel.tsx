import { RunOutcome, type Coins, type Health } from '../../hunt'
import {
  CARRIED_HEALTH_LABEL,
  CONTINUE_ANYWAY_LABEL,
  MAP_LABEL,
  NEW_RUN_LABEL,
  NEXT_FIGHT_LABEL,
  SHOP_LABEL,
  VISIT_SHOP_LABEL,
  fightLabel,
  rewardText,
  runHeadline,
  runProgressText,
  runVerdictDetail,
  TRICKS_TAKEN_LABEL,
  tricksTakenText,
  unspentCoinsText,
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
   *  `onContinue`/`onShop`. Handed in from `canAdvanceRun` rather than derived here, so this
   *  component cannot disagree with the run module about whether the run is over. */
  readonly canContinue: boolean
  /** AC2/AC10 — the purse, so the verdict states what is in hand before the player decides
   *  whether to spend it. */
  readonly coins: Coins
  /** `true` when the driver has judged there is something affordable being walked past. Swaps
   *  the two forward controls for the warning sentence and its own pair. The panel does NOT
   *  decide this — `canBuyAnything` does, in `App.tsx`. */
  readonly warning: boolean
  readonly onShop: () => void
  /** RENAMED from `onNextFight`: this control no longer starts a fight on its own. Pressed on an
   *  unwarned verdict it may raise the warning instead; pressed on a warned one it advances. */
  readonly onContinue: () => void
  /** Leaves the warning without advancing and without opening the shop — the `Escape` path. */
  readonly onDismissWarning: () => void
  readonly onNewRun: () => void
  /** AC8 / the ticket's scope extension — the opponent just beaten, which names the
   *  headline. `undefined` falls back to DLR-82's generic `FIGHT WON`. */
  readonly beatenName: string | undefined
  /** The opponent the primary control leads to. `undefined` on a won or lost run, where
   *  there is no next fight and the only control is `Start a new run`. */
  readonly nextName: string | undefined
  /** AC9 — opens the run map. The third control beside DLR-84's Continue and Shop. */
  readonly onMap: () => void
  /** DLR-95 AC6 — what the quick kill paid, straight off `RunState.lastQuickKillPayout`. `0` when
   *  it did not fire, in which case the line names the flat coin alone. */
  readonly quickKillPayout: Coins
  /** DLR-95 AC1 — the flat per-win coin, HANDED IN rather than imported, so this panel keeps its
   *  documented "computes NOTHING" property and reads no configuration of its own. */
  readonly winCoins: Coins
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
 *
 * DLR-85: the headline names the opponent just beaten when one is known, the primary control
 * names the opponent it leads to, and the unwarned action row gains a third control, `Map`
 * (AC9), beside DLR-84's Continue and Shop.
 */
export default function RunOutcomePanel({
  outcome,
  encounterIndex,
  encounterCount,
  carriedHealth,
  tricks,
  canContinue,
  coins,
  warning,
  onShop,
  onContinue,
  onDismissWarning,
  onNewRun,
  beatenName,
  nextName,
  onMap,
  quickKillPayout,
  winCoins,
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
        <h1 className="run-headline">{runHeadline(outcome, beatenName)}</h1>
        <p className="run-detail" role="status">
          {runVerdictDetail(outcome, encounterIndex, encounterCount, carriedHealth, nextName)}
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
        {outcome === RunOutcome.Lost ? null : (
          <p className="run-reward" role="status">
            {rewardText(winCoins, quickKillPayout)}
          </p>
        )}
        <p className="run-carry">
          {CARRIED_HEALTH_LABEL} — {carriedHealth} · {coins} coin{coins === 1 ? '' : 's'}
        </p>
        {!canContinue ? (
          <div className="run-actions">
            <button type="button" className="run-btn is-primary" onClick={onNewRun}>
              {NEW_RUN_LABEL}
            </button>
          </div>
        ) : warning ? (
          // An in-place swap of the two controls, NOT a modal — so there is no focus trap, no
          // document-level key listener, and nothing to clean up.
          <div
            className="run-warning"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onDismissWarning()
            }}
          >
            <p className="run-warning-text" role="status">
              {unspentCoinsText(coins)}
            </p>
            <div className="run-actions">
              <button type="button" className="run-btn is-primary" onClick={onShop}>
                {VISIT_SHOP_LABEL}
              </button>
              <button type="button" className="run-btn" onClick={onContinue}>
                {CONTINUE_ANYWAY_LABEL}
              </button>
            </div>
          </div>
        ) : (
          <div className="run-actions">
            <button type="button" className="run-btn is-primary" onClick={onContinue}>
              {nextName === undefined ? NEXT_FIGHT_LABEL : fightLabel(nextName)}
            </button>
            <button type="button" className="run-btn" onClick={onShop}>
              {SHOP_LABEL}
            </button>
            <button type="button" className="run-btn" onClick={onMap}>
              {MAP_LABEL}
            </button>
          </div>
        )}
        <p className="run-position">{runProgressText(encounterIndex, encounterCount)}</p>
      </div>
    </div>
  )
}
