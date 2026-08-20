import { cashValue, forcedCashValue, isTaken, type TrickResolution } from '../../warCouncil'
import { TRICKS_LABEL, MULTIPLIER_LABEL, TRICK_OUTCOME_MESSAGE } from './labels'

interface BankMeterProps {
  readonly bank: number
  readonly multiplier: number
  readonly lastResolution: TrickResolution | null
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
export default function BankMeter({ bank, multiplier, lastResolution }: BankMeterProps) {
  const cash = cashValue(bank, multiplier)
  // DLR-94 AC4 — what the same streak pays if the player is caught before applying. Computed
  // through `forcedCashValue` rather than restated as a fraction, so this copy cannot drift from
  // the configured constants. It is on the face of the readout rather than behind a hover because
  // it is precisely the number the new decision needs (`game-ux`).
  const forced = forcedCashValue(bank, multiplier)
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
        aria-label={`${TRICKS_LABEL} ${bank}, ${MULTIPLIER_LABEL} ${multiplier}, cashes for ${cash}, or ${forced} if you are hit first`}
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
      </p>
      <p className="wc-bank-cash" aria-hidden="true">
        Cashes for <b>{cash}</b>
      </p>
      <p className="wc-bank-forced" aria-hidden="true">
        If you&rsquo;re hit first: <b>{forced}</b>
      </p>
      <p className={lastClassName}>{lastLine}</p>
    </section>
  )
}
