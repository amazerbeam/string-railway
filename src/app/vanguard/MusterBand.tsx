// src/app/vanguard/MusterBand.tsx
import { TurnIndicator, type ClashHudState } from './clashHud'

export interface MusterBandProps {
  readonly hud: ClashHudState
}

const TURN_LABEL: Readonly<Record<TurnIndicator, string>> = {
  [TurnIndicator.AwaitingMuster]: 'Awaiting Muster',
  [TurnIndicator.PlayerTurn]: 'Your move',
  [TurnIndicator.CpuTurn]: 'Their move',
  [TurnIndicator.Resolved]: 'Exchange resolved',
}

/**
 * The status-band HUD (SCRUM-30): both sides' remaining Muster and a
 * turn/lifecycle badge. Purely presentational — every value comes from
 * `ClashHudState`, computed by `deriveClashHud`. Mirrors
 * `src/app/warCouncil/RoundStatusBand.tsx`'s three-cell `role="group"`
 * shape; no `aria-live`, matching that component's own precedent (counts
 * update via normal re-render).
 */
export default function MusterBand({ hud }: MusterBandProps) {
  return (
    <div className="vg-muster" role="group" aria-label="Muster and turn">
      <span className="vg-muster-cell" data-side="player">
        <span className="vg-muster-label">You</span>
        <span className="vg-muster-value">{hud.playerMuster ?? '—'}</span>
      </span>
      <span className="vg-turn-indicator" data-indicator={hud.indicator}>
        {TURN_LABEL[hud.indicator]}
        <span className="vg-turn-uncontested" data-visible={hud.uncontested}>
          Uncontested
        </span>
      </span>
      <span className="vg-muster-cell" data-side="cpu">
        <span className="vg-muster-label">CPU</span>
        <span className="vg-muster-value">{hud.cpuMuster ?? '—'}</span>
      </span>
    </div>
  )
}
