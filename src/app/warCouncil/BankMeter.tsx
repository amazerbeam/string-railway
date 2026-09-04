import { potValue, isTaken, type TrickResolution } from '../../warCouncil'
import { EMPTY_BUFF_CARRY, type BuffCarry } from '../../hunt'
import { TOTAL_LABEL, ROLL_LABEL, TRICK_OUTCOME_MESSAGE } from './labels'

interface BankMeterProps {
  readonly total: number
  readonly roll: number
  readonly lastResolution: TrickResolution | null
  /** DLR-150 AC6, first half — what this hand opened on. Reads `accrual.carriedIn`, which stays
   *  the same value for the whole hand, so a player who looks up mid-hand still sees where their
   *  opening bonus came from rather than only at trick 0. Display only. */
  readonly carriedIn?: BuffCarry
  /** DLR-150 AC6, second half — what this hand is banking for the next one. Reads
   *  `accrual.carryOut`. Deliberately NOT folded into `cash`/`forced`/`shownMultiplier` — AC1
   *  says this hand's cash-out pays nothing from it, and folding it in would be this component
   *  inventing a payout. Display only. */
  readonly carryOut?: BuffCarry
}

/**
 * DLR-156 — the total, the roll, and `potValue(total, roll)` as the pot this streak is sitting
 * on — taking the retired Standing track's place in the dossier column.
 *
 * `potValue` is threaded from the engine rather than restated, so this display cannot disagree
 * with what a resolution actually pays. Renders `TRICK_OUTCOME_MESSAGE[lastResolution.outcome]`
 * when a resolution is present; the take/hit distinction is carried by that copy and by a class
 * name (`wc-is-take`/`wc-is-hit`), never by colour alone.
 *
 * DLR-156 — the pending-buff-bonus and forced-cash-out readouts are GONE: a buff no longer pools
 * across the hand into a spendable balance (`buffAccrual.ts`'s `trickBonusFor` pays only the
 * trick it fired on), and a hit no longer pays a reduced share. `carriedIn`/`carryOut` survive
 * unchanged — the coin, AP-refund and low-carry axes are untouched by this ticket.
 *
 * DLR-160 — this is now the HEAD of `PotCard.tsx`'s merged card (mockup-left-damage-block-v2.html):
 * the pot figure (`cash`) is the big headline, and total×roll — restyled to a small sub-line via
 * `warCouncilBankMeter.css` — reads "N banked × M streak" underneath it. No DOM node was removed or
 * renamed: `.wc-bank-figures` keeps the SAME full `aria-label` it always has (the developer's own
 * red-line — `PotCard.tsx`'s docblock), and `.wc-bank-cash` keeps the SAME class a still-passing
 * `BankMeter.test.tsx` reads by. Only the visible text inside each and their relative emphasis
 * changed — a restyle and a reorder, not a rename.
 */
export default function BankMeter({
  total,
  roll,
  lastResolution,
  carriedIn = EMPTY_BUFF_CARRY,
  carryOut = EMPTY_BUFF_CARRY,
}: BankMeterProps) {
  const cash = potValue(total, roll)
  const hasCarriedIn = carriedIn.multiplierBonus > 0 || carriedIn.flatDamageBonus > 0
  const hasCarryOut = carryOut.multiplierBonus > 0 || carryOut.flatDamageBonus > 0
  const taken = lastResolution ? isTaken(lastResolution.outcome) : null
  const lastLine = lastResolution
    ? TRICK_OUTCOME_MESSAGE[lastResolution.outcome]
    : 'Take tricks. Make them eat the skulls.'

  const lastClassName = [
    'wc-bank-last',
    taken === true && 'wc-is-take',
    taken === false && 'wc-is-hit',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className="wc-bank" aria-label={`${TOTAL_LABEL} and ${ROLL_LABEL}`}>
      {/* PLACEHOLDER COPY — "The pot" eyebrow, matching mockup-left-damage-block-v2.html. The
          developer's to retune, exactly as every other string in this file already is. */}
      <p className="wc-bank-eyebrow" aria-hidden="true">
        The pot
      </p>
      <p className="wc-bank-cash" aria-hidden="true">
        <b>{cash}</b>
      </p>
      <p
        className="wc-bank-figures"
        aria-label={`${TOTAL_LABEL} ${total}, ${ROLL_LABEL} ${roll}${
          hasCarriedIn
            ? `, of which ${carriedIn.multiplierBonus} multiplier and ${carriedIn.flatDamageBonus} damage carried in from last hand`
            : ''
        }${
          hasCarryOut
            ? `, banking ${carryOut.multiplierBonus} multiplier and ${carryOut.flatDamageBonus} damage for next hand`
            : ''
        }, pot stands at ${cash}`}
      >
        <span className="wc-bank-num" aria-hidden="true">
          {total}
        </span>
        <span className="wc-bank-suffix" aria-hidden="true">
          banked
        </span>
        <span className="wc-bank-op" aria-hidden="true">
          ×
        </span>
        <span className="wc-bank-mult" aria-hidden="true">
          {roll}
        </span>
        <span className="wc-bank-suffix" aria-hidden="true">
          streak
        </span>
      </p>
      {hasCarriedIn && (
        <p className="wc-bank-carried-in" aria-hidden="true">
          Carried in from last hand: <b>+{carriedIn.multiplierBonus}</b> multiplier,{' '}
          <b>+{carriedIn.flatDamageBonus}</b> damage
        </p>
      )}
      {hasCarryOut && (
        <p className="wc-bank-carry-out" aria-hidden="true">
          Banking for next hand: <b>+{carryOut.multiplierBonus}</b> multiplier,{' '}
          <b>+{carryOut.flatDamageBonus}</b> damage
        </p>
      )}
      <p className={lastClassName}>{lastLine}</p>
    </section>
  )
}
