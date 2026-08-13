import type { StandingBand } from '../../hunt'
import { STANDING_BAND_NAME } from './labels'
import StandingTrack from './StandingTrack'

interface HuntLedgerProps {
  readonly band: StandingBand
  readonly table: readonly StandingBand[]
  readonly tricks: number
}

/**
 * The Standing readout: which multiplier table is in force and where the player's trick count sits
 * in it. Computes nothing — `resolveStanding` derived the band and `standingSegments` derives the
 * track's geometry.
 *
 * DLR-71 stripped this to the Standing half and moved it out of the status band into the dossier
 * column. Its Spoils cell, its two operators and its Damage cell are gone: the health bars now
 * carry the running figure, and this component's `spoils * band.multiplier` was a second
 * arithmetic path that bypassed `roundDamage` (AC2). The Demand and Lose-credit cells went on
 * DLR-67.
 *
 * Still renders BOTH the track and the compact cell — the breakpoint in
 * `warCouncilStandingTrack.css` shows exactly one, so there is no `matchMedia`, no resize listener
 * and nothing to clean up. Their accessible labels differ deliberately: jsdom applies no CSS, so
 * both are in the accessibility tree during a component test.
 */
export default function HuntLedger({ band, table, tricks }: HuntLedgerProps) {
  const bandName = STANDING_BAND_NAME[band.name]

  return (
    <div className="wc-ledger" role="group" aria-label="Standing">
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
    </div>
  )
}
