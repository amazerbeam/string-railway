import type { BuffCarry } from '../../hunt'
import type { TrickResolution } from '../../warCouncil'
import BankMeter from './BankMeter'
import TrickResolutionScreen from './TrickResolutionScreen'
import type { RoundUiAction, ResolutionView } from './roundUiState'
import './warCouncilBankMeter.css'
import './warCouncilResolve.css'
import './warCouncilResolvePanel.css'

export interface PotCardProps {
  readonly total: number
  readonly roll: number
  readonly lastResolution: TrickResolution | null
  readonly carriedIn?: BuffCarry
  readonly carryOut?: BuffCarry
  /** `null` while the felt is up — the card then renders only its head (`BankMeter`), per
   *  `game-ux`'s rule against a panel that has nothing to say: no breakdown, no controls, no
   *  empty frame. Non-null once a trick has resolved and the dwell has passed
   *  (`WarCouncilRound.tsx`'s own `showResolution`). */
  readonly resolution: ResolutionView | null
  readonly dispatch: (action: RoundUiAction) => void
  /** The Quarry's CURRENT health, threaded straight to `TrickResolutionScreen`'s Apply hint. */
  readonly quarryHealth: number
}

/**
 * DLR-160 (widened) — the merged pot card the developer asked for: "we don't need to see the
 * decree or the outcome here, we just need the damage numbers" plus "I think we can fold in what
 * I've marked in orange" (the Total/pot card). `BankMeter` and the old free-standing resolution
 * PANEL become one bordered card — this wrapper owns the chrome (`.wc-resolve` in
 * `warCouncilResolvePanel.css`, which already carries the flex-in-column sizing a previous pass
 * gave it), `BankMeter` is its head, and `TrickResolutionScreen` supplies the body and foot only
 * once a resolution exists to show. Neither child renders its own border/background any more —
 * see each component's own docblock.
 */
export default function PotCard({
  total,
  roll,
  lastResolution,
  carriedIn,
  carryOut,
  resolution,
  dispatch,
  quarryHealth,
}: PotCardProps) {
  return (
    <section
      className={`wc-resolve${resolution === null ? ' wc-is-resting' : ''}`}
      aria-label="The pot"
    >
      <BankMeter
        total={total}
        roll={roll}
        lastResolution={lastResolution}
        carriedIn={carriedIn}
        carryOut={carryOut}
      />
      {resolution !== null && (
        <TrickResolutionScreen
          resolution={resolution}
          dispatch={dispatch}
          quarryHealth={quarryHealth}
        />
      )}
    </section>
  )
}
