import { potValue } from '../../warCouncil'
import ResolutionBreakdown from './ResolutionBreakdown'
import { appliedHoldLabel, rolledOverHoldLabel } from './resolutionLabels'
import { RoundUiActionKind, type RoundUiAction, type ResolutionView } from './roundUiState'
import { useBeatSequence } from './useBeatSequence'
import { useResolveHold } from './useResolveHold'
import './warCouncilResolve.css'
import './warCouncilResolvePanel.css'

/** The two keys `useResolveHold` is armed with here — a string union rather than a bare literal
 *  so the header derivation below and the click handlers cannot drift on the spelling. */
const HELD_APPLY = 'apply'
const HELD_ROLL_OVER = 'rollOver'

export interface TrickResolutionScreenProps {
  readonly resolution: ResolutionView
  readonly dispatch: (action: RoundUiAction) => void
  /** DLR-160 (widened) — the Quarry's CURRENT health (`ui.encounter.health[DuelSide.Quarry]`),
   *  threaded from `WarCouncilTable.tsx` so the Apply control's hint carries the pot's scale in
   *  EVERY state, not only when the pot happens to be lethal. Named generically ("the Quarry"),
   *  not by the Quarry's own name — `resolutionLabels.ts`'s `appliedHoldLabel` docblock records
   *  the same DLR-85 precedent this follows: the fight screen keeps its own resolution wording
   *  generic, and the bare name is not cheaply reachable here (only the already-worded possessive
   *  `quarryLabel`, e.g. "Aoife's health", reaches this tree — see the Implementer's own report). */
  readonly quarryHealth: number
}

/**
 * DLR-156 AC3/AC14, narrowed by DLR-160 to the BODY and FOOT of `PotCard.tsx`'s merged card — the
 * build-up (through `ResolutionBreakdown`) and the apply-or-roll choice. `PotCard.tsx` owns the
 * card's own chrome (border, background, radius) and the head (`BankMeter`); this component no
 * longer renders a section of its own with a border, and no longer renders the trick's cards, the
 * four-outcome word, or the decree chip — all three moved to the felt (`TrickWell.tsx`, already
 * reading the SAME `resolutionOutcome.ts` module) and the felt rail (`DecreePile.tsx`'s permanent
 * "<suit> is trump" chip), per the developer's own direction on this ticket. AC2 (the outcome
 * word) and AC7 (the decree) are still MET — just from a different surface than the one those
 * ACs originally named; `.docs/game_rules/the-hunt.md` needs a note reflecting the new owner.
 *
 * Every duration and size bound below is a transcribed PLACEHOLDER from `warCouncilResolve.css` /
 * `warCouncilResolvePanel.css`, not a value chosen here.
 *
 * A HURT trick (`resolution.resolution.trickDamage === null`) offers no choice (AC7): the single
 * `RollOver` dispatch is this branch's "Onward" exit, reusing the SAME action `applyPot`'s sibling
 * choice dispatches on a banked trick — `rollOverAction`'s own docblock names this reuse.
 *
 * DLR-156 — a choice does not dispatch immediately. `useResolveHold` holds it locally, renders
 * what just happened, and disables all three buttons for `--wc-resolve-hold` before the REAL
 * dispatch fires — otherwise applying the pot and cutting straight back to the felt would show
 * the player the number they chose for zero frames (`ui-notes.md` §4). Since the head (the
 * outcome/consequence line) moved to `BankMeter`, which does not know about the hold at all, the
 * "what just happened" line during the hold now renders HERE, in the body — see `heldLine` below.
 */
export default function TrickResolutionScreen({
  resolution,
  dispatch,
  quarryHealth,
}: TrickResolutionScreenProps) {
  const { trickNumber, nextPotFloor, deadBuffs, potIsLethal, beats } = resolution
  const { total, roll, trickDamage, damageToPlayer } = resolution.resolution
  const { landed } = useBeatSequence(beats)
  const { held, settle } = useResolveHold()

  const hurt = trickDamage === null
  // DLR-156 B2 — a REPLACED clean loss (DLR-90 AC5) reaches this branch too (`trickDamage` is
  // `null` on every non-taken outcome), but resets NOTHING: `damageToPlayer === 0` here can only
  // mean the ordinary hit did not fire (`resolutionBeats.ts`'s own docblock
  // proves the implication).
  const absorbed = hurt && damageToPlayer === 0
  const pot = potValue(total, roll)
  const nextRoll = roll + 1

  // DLR-156 AC-hold — the ONE place "what just happened" is said while the hold is live. Rendered
  // only during the hold (`held !== null`); the hurt branch's Onward changes nothing the felt and
  // head didn't already say (AC7 offers no choice), so it renders nothing here either.
  const heldLine =
    held === HELD_APPLY
      ? appliedHoldLabel()
      : held === HELD_ROLL_OVER && !hurt
        ? rolledOverHoldLabel(nextRoll)
        : null

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
    <>
      <div className="wc-resolve-body">
        {heldLine !== null && (
          <p className="wc-resolve-held" aria-live="polite">
            {heldLine}
          </p>
        )}
        <ResolutionBreakdown beats={beats} landed={landed} deadBuffs={deadBuffs} />
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
            aria-label={`Apply Damage — deal ${pot} to the Quarry now${potIsLethal ? ', which ends the fight' : ', total and roll reset'}. The Quarry holds ${quarryHealth}.`}
            onClick={handleApply}
            disabled={held !== null}
          >
            {/* DLR-160 AC6 — reads in greyscale: a WORD, never only a colour on the button
                itself (`game-ux` hard floor). */}
            {potIsLethal && <span className="wc-resolve-lethal-tag">Lethal — ends the fight</span>}
            <b>Apply damage</b>
            <span className="wc-resolve-pbtn-fig">{pot}</span>
            <span className="wc-resolve-pbtn-small">
              The Quarry holds {quarryHealth}
              {!potIsLethal && ' · your total and streak reset'}
            </span>
          </button>
          <button
            type="button"
            className="wc-resolve-pbtn wc-is-dashed"
            aria-label={`Roll over — next roll ${nextRoll}, at least ${nextPotFloor} if you take trick ${trickNumber + 1} before any buff you arm, 0 if you do not`}
            onClick={handleRollOver}
            disabled={held !== null}
          >
            <b>Roll over</b>
            <span className="wc-resolve-pbtn-fig">{nextPotFloor}+</span>
            <span className="wc-resolve-pbtn-small">
              at least {nextPotFloor} if you take trick {trickNumber + 1}, before any buff you arm ·{' '}
              <span className="wc-resolve-pbtn-risk">0 if you do not</span>
            </span>
          </button>
        </nav>
      )}
    </>
  )
}
