import { cashValue, forcedCashValue, isTaken, type TrickResolution } from '../../warCouncil'
import { EMPTY_BUFF_CARRY, type BuffCarry, type CashOutBonus } from '../../hunt'
import { TRICKS_LABEL, MULTIPLIER_LABEL, TRICK_OUTCOME_MESSAGE } from './labels'

/** No buff bonus pending — the default when a caller has none to report, so every existing
 *  call site keeps reading exactly as it did before this prop existed. */
const NO_PENDING_BONUS: CashOutBonus = { multiplierBonus: 0, flatDamageBonus: 0 }

interface BankMeterProps {
  readonly bank: number
  readonly multiplier: number
  readonly lastResolution: TrickResolution | null
  /** The unpaid buff accrual (`payableCashOutBonus`) this hand has fired but not yet cashed —
   *  Momentum sits inside the product, Blade lands on top of it, exactly as `resolveTrickBank`
   *  would spend it at the next real cash-out. Display only: nothing here pays it. */
  readonly pendingBonus?: CashOutBonus
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
 * AC4/AC5/AC8/AC9's readout — the bank, the streak, and `bank * multiplier` as the figure this
 * streak would cash for — taking the retired Standing track's place in the dossier column.
 *
 * `bank * multiplier` is computed here, not threaded through the engine, because it is a
 * display figure with no rule attached: `resolveTrickBank` owns the cash-out that actually
 * lands, and this component only restates its two running inputs. Renders
 * `TRICK_OUTCOME_MESSAGE[lastResolution.outcome]` when a resolution is present; the take/hit
 * distinction is carried by that copy and by a class name (`wc-is-take`/`wc-is-hit`), never by
 * colour alone.
 */
export default function BankMeter({
  bank,
  multiplier,
  lastResolution,
  pendingBonus = NO_PENDING_BONUS,
  carriedIn = EMPTY_BUFF_CARRY,
  carryOut = EMPTY_BUFF_CARRY,
}: BankMeterProps) {
  // A buff's bonus is unpaid until a real cash-out, but the reader can already see it building —
  // folded into the SAME two figures `resolveTrickBank` would use if a cash-out fired right now
  // (Momentum inside the product, Blade added on top), never a third running total of its own.
  const shownMultiplier = multiplier + pendingBonus.multiplierBonus
  const cash = cashValue(bank, shownMultiplier) + pendingBonus.flatDamageBonus
  // DLR-94 AC4 — what the same streak pays if the player is caught before applying. Computed
  // through `forcedCashValue` rather than restated as a fraction, so this copy cannot drift from
  // the configured constants. It is on the face of the readout rather than behind a hover because
  // it is precisely the number the new decision needs (`game-ux`).
  const forced = forcedCashValue(bank, shownMultiplier) + pendingBonus.flatDamageBonus
  const hasPendingBonus = pendingBonus.multiplierBonus > 0 || pendingBonus.flatDamageBonus > 0
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
    <section className="wc-bank" aria-label={`${TRICKS_LABEL} and ${MULTIPLIER_LABEL}`}>
      <p className="wc-bank-eyebrow" aria-hidden="true">
        {TRICKS_LABEL}
      </p>
      <p
        className="wc-bank-figures"
        aria-label={`${TRICKS_LABEL} ${bank}, ${MULTIPLIER_LABEL} ${multiplier}${
          hasPendingBonus
            ? `, plus a pending buff bonus of ${pendingBonus.multiplierBonus} multiplier and ${pendingBonus.flatDamageBonus} damage`
            : ''
        }${
          hasCarriedIn
            ? `, of which ${carriedIn.multiplierBonus} multiplier and ${carriedIn.flatDamageBonus} damage carried in from last hand`
            : ''
        }${
          hasCarryOut
            ? `, banking ${carryOut.multiplierBonus} multiplier and ${carryOut.flatDamageBonus} damage for next hand`
            : ''
        }, cashes for ${cash}, or ${forced} if you are hit first`}
      >
        <span className="wc-bank-num" aria-hidden="true">
          {bank}
        </span>
        <span className="wc-bank-op" aria-hidden="true">
          ×
        </span>
        <span className="wc-bank-mult" aria-hidden="true">
          {multiplier}
        </span>
        {pendingBonus.multiplierBonus > 0 && (
          <span className="wc-bank-pending-bonus" aria-hidden="true">
            +{pendingBonus.multiplierBonus}
          </span>
        )}
      </p>
      <p className="wc-bank-cash" aria-hidden="true">
        Cashes for <b>{cash}</b>
      </p>
      <p className="wc-bank-forced" aria-hidden="true">
        If you&rsquo;re hit first: <b>{forced}</b>
      </p>
      {hasPendingBonus && (
        <p className="wc-bank-pending" aria-hidden="true">
          Buff bonus pending: <b>+{pendingBonus.multiplierBonus}</b> multiplier,{' '}
          <b>+{pendingBonus.flatDamageBonus}</b> damage
        </p>
      )}
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
