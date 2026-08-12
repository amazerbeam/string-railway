import type { Spoils, StandingBand } from '../../hunt'
import { STANDING_BAND_NAME } from './labels'
import StandingTrack from './StandingTrack'

interface HuntLedgerProps {
  readonly spoils: Spoils
  readonly band: StandingBand
  readonly table: readonly StandingBand[]
  readonly tricks: number
}

/**
 * §1's equation in progress: running Spoils, the Standing band the player's trick count
 * currently sits in, and the Damage they make. Computes only that product — both inputs arrive
 * already derived from config through `spoils` and `resolveStanding`, so no multiplier or band
 * boundary is written here. The Demand cell and the Lose-credit cell were removed on DLR-67.
 *
 * Each cell carries its own `aria-label` because the visible value is a bare number whose
 * meaning lives in a separate key element.
 *
 * Renders BOTH the Standing track (DLR-68) and the original compact cell — the CSS breakpoint
 * in `warCouncilHunt.css` shows exactly one, so there is no `matchMedia`, no resize listener,
 * and nothing to clean up. Their accessible labels differ deliberately: jsdom applies no CSS,
 * so both are in the accessibility tree during a component test.
 */
export default function HuntLedger({ spoils, band, table, tricks }: HuntLedgerProps) {
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
      <StandingTrack table={table} tricks={tricks} />
      <span className="wc-ledger-cell wc-is-band wc-is-compact">
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
