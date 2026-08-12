import type { Spoils, StandingBand } from '../../hunt'
import { STANDING_BAND_NAME } from './labels'

interface HuntLedgerProps {
  readonly spoils: Spoils
  readonly band: StandingBand
}

/**
 * §1's equation in progress: running Spoils, the Standing band the player's trick count
 * currently sits in, and the Damage they make. Computes only that product — both inputs arrive
 * already derived from config through `spoils` and `resolveStanding`, so no multiplier or band
 * boundary is written here. The Demand cell and the Lose-credit cell were removed on DLR-67.
 *
 * Each cell carries its own `aria-label` because the visible value is a bare number whose
 * meaning lives in a separate key element.
 */
export default function HuntLedger({ spoils, band }: HuntLedgerProps) {
  const bandName = STANDING_BAND_NAME[band.name]
  const damage = spoils * band.multiplier

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
          Damage
        </span>
        <span className="wc-ledger-value" aria-label={`Damage so far: ${damage}`}>
          {damage}
        </span>
      </span>
    </div>
  )
}
