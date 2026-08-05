import type { MouseEvent } from 'react'
import { PlayerSide, type TrickCard } from '../../warCouncil'
import { cardAccessibleName } from './labels'
import PlayingCard from './PlayingCard'
import type { ResolvedTrick } from './roundReducer'

// Copy, not an engine string leaking into the UI — "Them" is never PlayerSide.Cpu rendered raw.
const SIDE_LABEL: Readonly<Record<PlayerSide, string>> = {
  [PlayerSide.Player]: 'You',
  [PlayerSide.Cpu]: 'Them',
}

interface TrickWellProps {
  readonly currentTrick: readonly TrickCard[]
  readonly resolvedTrick: ResolvedTrick | null
  readonly onCarryOn: () => void
}

/**
 * The faintly-marked well at the centre of the felt (AC2). Three states:
 * a held resolved trick with its winner marked, an in-progress trick with
 * its lead card, or an empty well. `playCard` clears `currentTrick` the
 * instant the second card lands, so the resolved trick must be held
 * separately here — without it, the winning card would never be visible.
 */
export default function TrickWell({ currentTrick, resolvedTrick, onCarryOn }: TrickWellProps) {
  if (resolvedTrick) {
    const winnerLabel = resolvedTrick.winner === PlayerSide.Player ? 'You' : 'They'

    // A real, keyboard-reachable control rather than relying on the enclosing felt's own
    // pointer tap: while a trick is held, every hand card is disabled and nothing else in
    // the tree is focusable, so this is the only way a keyboard-only player can carry on.
    // A plain `<button type="button" onClick>` — the same shape `RoundOverPanel`'s "Finish
    // the round" control already uses — gets native focusability, the implicit button role,
    // and native Enter/Space activation for free, with no manual key handler and therefore
    // no double-dispatch risk to guard against in the first place.
    function handleHintClick(event: MouseEvent<HTMLButtonElement>) {
      // Guards against bubbling to the felt's own onClick — a genuine concern for either
      // element choice, unrelated to native-vs-custom activation.
      event.stopPropagation()
      onCarryOn()
    }

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
              />
            </span>
          ))}
        </div>
        <p className="wc-table-line">{winnerLabel} take the trick.</p>
        <button type="button" className="wc-table-hint wc-is-carry-on" onClick={handleHintClick}>
          Tap the table to carry on
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
            <PlayingCard card={led.card} variant="table" />
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
