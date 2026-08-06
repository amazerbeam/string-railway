import type { PlayerSide } from '../../warCouncil'
import { SIDE_NAME } from './labels'

export interface ClashOverPanelProps {
  readonly outcome:
    { readonly kind: 'breached'; readonly winner: PlayerSide } | { readonly kind: 'roundOver' }
  readonly onContinue: () => void // "Next round", or "Finish" which calls onComplete
}

/**
 * The Breach / round-over overlay (mockup `#panel`). Copy is transcribed from
 * the approved mockup — the round-over reading is deliberately "resolved, not
 * broken", never "game over"; SCRUM-30 owns the fuller Muster/turn messaging.
 * A plain `<button onClick>` with no manual key handler: `Enter`/`Space`
 * activate natively, and pairing a native button with a manual handler is the
 * shape that risks a double dispatch.
 */
export default function ClashOverPanel({ outcome, onContinue }: ClashOverPanelProps) {
  const title = outcome.kind === 'breached' ? 'The Breach' : 'Round over'
  const body =
    outcome.kind === 'breached'
      ? `${capitalize(SIDE_NAME[outcome.winner])} tokens formed an unbroken chain from base to base. The Vanguard is ${SIDE_NAME[outcome.winner]}s.`
      : 'Both sides spent their Muster and neither reached the Breach. The board carries over untouched.'
  const buttonLabel = outcome.kind === 'breached' ? 'Finish' : 'Next round'

  return (
    <div className="vg-panel" role="dialog" aria-labelledby="vg-panel-title">
      <h2 id="vg-panel-title">{title}</h2>
      <p>{body}</p>
      <button type="button" className="vg-primary" onClick={onContinue}>
        {buttonLabel}
      </button>
    </div>
  )
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}
