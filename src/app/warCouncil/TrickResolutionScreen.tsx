import { HAND_SIZE } from '../../hunt'
import { PlayerSide, potValue } from '../../warCouncil'
import PlayingCard from './PlayingCard'
import ResolutionLedger from './ResolutionLedger'
import { appliedHoldLabel, rolledOverHoldLabel } from './resolutionLabels'
import { RoundUiActionKind, type RoundUiAction, type ResolutionView } from './roundUiState'
import { useBeatSequence } from './useBeatSequence'
import { useResolveHold } from './useResolveHold'
import './warCouncilResolve.css'

/** The two keys `useResolveHold` is armed with here — a string union rather than a bare literal
 *  so the header derivation below and the click handlers cannot drift on the spelling. */
const HELD_APPLY = 'apply'
const HELD_ROLL_OVER = 'rollOver'

export interface TrickResolutionScreenProps {
  readonly resolution: ResolutionView
  readonly dispatch: (action: RoundUiAction) => void
}

// Copy, not an engine string leaking into the UI — matches `TrickWell.tsx`'s own `SIDE_LABEL`.
const SIDE_LABEL: Readonly<Record<PlayerSide, string>> = {
  [PlayerSide.Player]: 'You',
  [PlayerSide.Cpu]: 'Them',
}

/**
 * DLR-156 AC3/AC14 — the resolution screen: the trick that just resolved, its build-up (through
 * `ResolutionLedger`), the pot as it stands, and the apply-or-roll choice — REPLACING the felt
 * rather than overlaying it (`ui-notes.md` §1). Every duration and size bound is a transcribed
 * PLACEHOLDER from `warCouncilResolve.css`, not a value chosen here.
 *
 * The two played cards are CLONED from `resolution.cards`, never the felt's own trick well — the
 * felt is not mounted while this screen is up (`WarCouncilRound.tsx`'s switch), so there is
 * nothing to move them FROM; this screen owns its own rendering of the same two cards
 * (`ui-notes.md` §1: "cloned, not moved").
 *
 * A HURT trick (`resolution.resolution.trickDamage === null`) offers no choice (AC7): the single
 * `RollOver` dispatch is this branch's "Onward" exit, reusing the SAME action `applyPot`'s sibling
 * choice dispatches on a banked trick — `rollOverAction`'s own docblock names this reuse.
 *
 * DLR-156 — a choice does not dispatch immediately. `useResolveHold` holds it locally, renders
 * what just happened, and disables all three buttons for `--wc-resolve-hold` before the REAL
 * dispatch fires — otherwise applying the pot and cutting straight back to the felt would show
 * the player the number they chose for zero frames (`ui-notes.md` §4). The screen stays mounted
 * for the whole hold because `ui.resolution` is untouched until that delayed dispatch lands;
 * `WarCouncilRound.tsx`'s switch is what actually returns to the felt, once it does.
 */
export default function TrickResolutionScreen({
  resolution,
  dispatch,
}: TrickResolutionScreenProps) {
  const { beats, trickNumber, winner, cards, nextPotFloor } = resolution
  const { total, roll, trickDamage, damageToPlayer } = resolution.resolution
  const { landed } = useBeatSequence(beats)
  const { held, settle } = useResolveHold()

  const hurt = trickDamage === null
  // DLR-156 B2 — a REPLACED clean loss (DLR-90 AC5) reaches this branch too (`trickDamage` is
  // `null` on every non-taken outcome), but resets NOTHING: `damageToPlayer === 0` here can only
  // mean neither the ordinary hit nor a Timebomb fired (`resolutionBeats.ts`'s own docblock
  // proves the implication), so the header and the exit's own subtext must not say "broken".
  const absorbed = hurt && damageToPlayer === 0
  const pot = potValue(total, roll)
  const nextRoll = roll + 1
  const thisTrick = landed > 0 ? beats[Math.min(landed, beats.length) - 1].running : 0

  const outcomeWord = hurt ? (absorbed ? 'nothing changed' : 'the streak is broken') : 'banked'
  // DLR-156 AC-hold — the header names what just happened once a choice has been made
  // (`ui-notes.md` §4). The hurt branch's Onward changes nothing the header didn't already say
  // (AC7 offers no choice), so it keeps `outcomeWord` rather than gaining a third string.
  const headerWord =
    held === HELD_APPLY
      ? appliedHoldLabel()
      : held === HELD_ROLL_OVER && !hurt
        ? rolledOverHoldLabel(nextRoll)
        : outcomeWord

  // DLR-156 AC-hold — a press while already held is a no-op here too, on top of `useResolveHold`'s
  // own guard: `disabled` on the buttons below already blocks a second click, but a dispatch
  // reachable only through a rendered control (`WarCouncilTable.tsx`'s own DLR-156 review-fix
  // discipline: belt-and-suspenders at both the control and the hook) is the same idiom the card
  // flight's `inFlight` guard uses.
  function handleApply() {
    if (held !== null) return
    settle(HELD_APPLY, () => dispatch({ kind: RoundUiActionKind.ApplyPot }))
  }

  function handleRollOver() {
    if (held !== null) return
    settle(HELD_ROLL_OVER, () => dispatch({ kind: RoundUiActionKind.RollOver }))
  }

  return (
    <section className="wc-resolve" aria-label="Trick resolved — apply the pot or roll it over">
      <p className="wc-resolve-head">
        Trick {trickNumber} of {HAND_SIZE} · {headerWord}
      </p>

      <div className="wc-resolve-main">
        <div className="wc-resolve-trick">
          {cards.map((played) => (
            <figure
              key={`${played.side}-${played.card.suit}-${played.card.rank}`}
              className={`wc-resolve-card${played.side === winner ? ' wc-is-winner' : ''}`}
            >
              <div className="wc-resolve-card-slot">
                <PlayingCard card={played.card} variant="table" winner={played.side === winner} />
              </div>
              <figcaption>
                {SIDE_LABEL[played.side]} {played.card === cards[0].card ? 'led' : 'played'}
              </figcaption>
            </figure>
          ))}
        </div>

        <p className={`wc-resolve-verdict${hurt ? ' wc-is-hurt' : ''}`}>
          {winner === PlayerSide.Player ? 'You took it' : 'They took it'}
        </p>

        <section
          className="wc-resolve-figures"
          aria-live="polite"
          aria-label="Damage for this trick"
        >
          <ResolutionLedger beats={beats} landed={landed} />
          <div className="wc-resolve-registers">
            <div className={`wc-resolve-big${hurt ? ' wc-is-hurt' : ''}`}>
              <span key={landed} className="wc-resolve-big-value">
                {hurt ? 0 : thisTrick}
              </span>
            </div>
            <div
              className="wc-resolve-potline"
              role="group"
              aria-label={`Total ${total}, roll ${roll}, pot ${pot}`}
            >
              <span className="wc-resolve-figure-value">{total}</span>
              <span aria-hidden="true">×</span>
              <span className="wc-resolve-figure-value">{roll}</span>
              <span aria-hidden="true">=</span>
              <span className="wc-resolve-figure-value">{pot}</span>
            </div>
          </div>
        </section>
      </div>

      {hurt ? (
        <nav className="wc-resolve-prompt" role="group" aria-label="Onward">
          <button
            type="button"
            className="wc-resolve-pbtn"
            onClick={handleRollOver}
            disabled={held !== null}
          >
            <b>Onward</b>
            <span className="wc-resolve-pbtn-small">
              {absorbed
                ? 'total and roll stand — nothing changed'
                : `trick ${trickNumber + 1} starts from nothing`}
            </span>
          </button>
        </nav>
      ) : (
        <nav className="wc-resolve-prompt" role="group" aria-label="Apply the pot, or roll it over">
          <button
            type="button"
            className="wc-resolve-pbtn wc-is-solid"
            aria-label={`Apply Damage — deal ${pot} to the Quarry now, total and roll reset`}
            onClick={handleApply}
            disabled={held !== null}
          >
            <b>Apply Damage</b>
            <span className="wc-resolve-pbtn-fig">{pot}</span>
            <span className="wc-resolve-pbtn-small">dealt now · total and roll reset</span>
          </button>
          <button
            type="button"
            className="wc-resolve-pbtn wc-is-dashed"
            aria-label={`Roll over — next roll ${nextRoll}, ${nextPotFloor}+ if you take trick ${trickNumber + 1}, 0 if you do not`}
            onClick={handleRollOver}
            disabled={held !== null}
          >
            <b>Roll over</b>
            <span className="wc-resolve-pbtn-fig">{nextPotFloor}+</span>
            <span className="wc-resolve-pbtn-small">
              if you take trick {trickNumber + 1} ·{' '}
              <span className="wc-resolve-pbtn-risk">0 if you do not</span>
            </span>
          </button>
        </nav>
      )}
    </section>
  )
}
