import { HuntDeclaration, type Demand, type Spoils, type StandingBand } from '../../hunt'
import type { DeclarationState } from '../../warCouncil'
import { STANDING_BAND_NAME } from './labels'

interface HuntLedgerProps {
  readonly demand: Demand
  readonly spoils: Spoils
  readonly band: StandingBand
  /** `null` on the Win path and while undeclared — the cell renders only under Lose. */
  readonly declaration: DeclarationState | null
}

/**
 * §1's equation in progress (AC2): running Spoils, the Standing band the player's trick
 * count currently sits in, the product they make, and the Demand it is checked against.
 * Computes only that product — every input arrives already derived from config through
 * `spoils` and `resolveStanding`, so no multiplier or band boundary is written here.
 *
 * Each cell carries its own `aria-label` because the visible value is a bare number whose
 * meaning lives in a separate key element (AC6).
 */
export default function HuntLedger({ demand, spoils, band, declaration }: HuntLedgerProps) {
  const bandName = STANDING_BAND_NAME[band.name]
  const score = spoils * band.multiplier

  return (
    <div className="wc-ledger" role="group" aria-label="The Hunt so far">
      <span className="wc-ledger-cell">
        <span className="wc-ledger-key" aria-hidden="true">
          Spoils
        </span>
        <span className="wc-ledger-value" aria-label={`Running Spoils: ${spoils}`}>
          {spoils}
        </span>
      </span>
      <span className="wc-ledger-op" aria-hidden="true">
        ×
      </span>
      <span className="wc-ledger-cell wc-is-band">
        <span className="wc-ledger-key" aria-hidden="true">
          Standing
        </span>
        <span
          className="wc-ledger-value"
          aria-label={`Standing band: ${bandName}, multiplier ${band.multiplier}`}
        >
          {bandName} ×{band.multiplier}
        </span>
      </span>
      <span className="wc-ledger-op" aria-hidden="true">
        =
      </span>
      <span className="wc-ledger-cell">
        <span className="wc-ledger-key" aria-hidden="true">
          Score
        </span>
        <span className="wc-ledger-value" aria-label={`Score so far: ${score}`}>
          {score}
        </span>
      </span>
      <span className="wc-ledger-op" aria-hidden="true">
        /
      </span>
      <span className="wc-ledger-cell wc-is-demand">
        <span className="wc-ledger-key" aria-hidden="true">
          Demand
        </span>
        <span className="wc-ledger-value" aria-label={`The Demand: ${demand}`}>
          {demand}
        </span>
      </span>
      {declaration?.path === HuntDeclaration.Lose && (
        <span
          className={`wc-ledger-cell wc-is-credits${declaration.creditsRemaining === 0 ? ' wc-is-spent' : ''}`}
        >
          <span className="wc-ledger-key" aria-hidden="true">
            Credits
          </span>
          <span
            className="wc-ledger-value"
            aria-label={`Lose-credits remaining: ${declaration.creditsRemaining}`}
          >
            {declaration.creditsRemaining}
          </span>
        </span>
      )}
    </div>
  )
}
