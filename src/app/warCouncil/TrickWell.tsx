import type { MouseEvent } from 'react'
import { isPrimed, isSkulled, PlayerSide, type Card, type TrickCard } from '../../warCouncil'
import { cardAccessibleName, timebombBookedText } from './labels'
import PlayingCard from './PlayingCard'
import type { ResolvedTrick } from './roundUiState'

// Copy, not an engine string leaking into the UI — "Them" is never PlayerSide.Cpu rendered raw.
const SIDE_LABEL: Readonly<Record<PlayerSide, string>> = {
  [PlayerSide.Player]: 'You',
  [PlayerSide.Cpu]: 'Them',
}

interface TrickWellProps {
  readonly currentTrick: readonly TrickCard[]
  readonly resolvedTrick: ResolvedTrick | null
  /** AC3's second half — once a card is face up here, it announces its own skull. Defaults to
   *  `[]` so a caller that predates this (there is none left after this task, but the pattern
   *  matches `cardAccessibleName`'s own default) keeps compiling. */
  readonly skulledCards?: readonly Card[]
  /** DLR-90 AC2 — once a marked card is face up here, it announces its own Timebomb. Defaults to
   *  `[]` for `skulledCards`' own stated reason. */
  readonly primedCards?: readonly Card[]
  readonly quarryToLead: boolean
  readonly onCarryOn: () => void
}

/**
 * The faintly-marked well at the centre of the felt (AC2). Four states:
 * a held resolved trick with its winner marked, the Quarry's chosen-but-not-yet-committed
 * lead (AC3), an in-progress trick with its lead card, or an empty well. `playCard` clears
 * `currentTrick` the instant the second card lands, so the resolved trick must be held
 * separately here — without it, the winning card would never be visible.
 */
export default function TrickWell({
  currentTrick,
  resolvedTrick,
  skulledCards = [],
  primedCards = [],
  quarryToLead,
  onCarryOn,
}: TrickWellProps) {
  // A real, keyboard-reachable control rather than relying on the enclosing felt's own
  // pointer tap: while a trick is held (or the Quarry's lead is pending), every hand card
  // is disabled and nothing else in the tree is focusable, so this is the only way a
  // keyboard-only player can carry on. A plain `<button type="button" onClick>` — the same
  // shape `RoundOverPanel`'s "Finish the round" control already uses — gets native
  // focusability, the implicit button role, and native Enter/Space activation for free,
  // with no manual key handler and therefore no double-dispatch risk to guard against in
  // the first place. Shared by both branches below.
  function handleHintClick(event: MouseEvent<HTMLButtonElement>) {
    // Guards against bubbling to the felt's own onClick — a genuine concern for either
    // element choice, unrelated to native-vs-custom activation.
    event.stopPropagation()
    onCarryOn()
  }

  if (resolvedTrick) {
    const winnerLabel = resolvedTrick.winner === PlayerSide.Player ? 'You' : 'They'

    return (
      <>
        <div className="wc-trick-row">
          {resolvedTrick.cards.map((played) => (
            <span
              key={`${played.side}-${played.card.suit}-${played.card.rank}`}
              className={`wc-played${played.side === resolvedTrick.winner ? ' wc-is-winner' : ''}`}
            >
              <span className="wc-played-side">{SIDE_LABEL[played.side]}</span>
              <PlayingCard
                card={played.card}
                variant="table"
                winner={played.side === resolvedTrick.winner}
                skulled={isSkulled(skulledCards, played.card)}
                primed={isPrimed(primedCards, played.card)}
              />
            </span>
          ))}
        </div>
        <p className="wc-table-line">
          {winnerLabel} take the trick.
          {resolvedTrick.resolution.cashOut > 0 &&
            ` They take ${resolvedTrick.resolution.cashOut}.`}
          {resolvedTrick.resolution.damageToPlayer > 0 &&
            ` You take ${resolvedTrick.resolution.damageToPlayer}.`}
          {resolvedTrick.resolution.timebombTarget !== null && (
            <span className="wc-timebomb-clause">
              {' '}
              {timebombBookedText(resolvedTrick.resolution.timebombTarget)}
            </span>
          )}
        </p>
        <button type="button" className="wc-table-hint wc-is-carry-on" onClick={handleHintClick}>
          Tap the table to carry on
        </button>
      </>
    )
  }

  if (quarryToLead) {
    // The Quarry's lead is chosen but not committed, so the telegraph beside the felt can be
    // read first (AC3). The control is a real button for the same reason the carry-on control
    // is: while the Quarry holds the turn every hand card is disabled, so this is the only
    // thing a keyboard-only player can reach.
    return (
      <>
        <div className="wc-trick-row" />
        <p className="wc-table-line">They are about to lead. Read their intent first.</p>
        <button type="button" className="wc-table-hint wc-is-carry-on" onClick={handleHintClick}>
          Let them lead
        </button>
      </>
    )
  }

  if (currentTrick.length > 0) {
    const led = currentTrick[0]
    return (
      <>
        <div className="wc-trick-row">
          <span className="wc-played">
            <span className="wc-played-side">{SIDE_LABEL[led.side]}</span>
            <PlayingCard
              card={led.card}
              variant="table"
              skulled={isSkulled(skulledCards, led.card)}
              primed={isPrimed(primedCards, led.card)}
            />
          </span>
        </div>
        <p className="wc-table-line">
          {led.side === PlayerSide.Player ? 'You led' : 'They led'} {cardAccessibleName(led.card)}.
        </p>
      </>
    )
  }

  return (
    <>
      <div className="wc-trick-row" />
      <p className="wc-table-line">The table is yours — lead.</p>
    </>
  )
}
