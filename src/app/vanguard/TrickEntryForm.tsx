import { useState } from 'react'
import { PlayerSide } from '../../warCouncil'
import { TRICKS_PER_ROUND, type TricksWon } from '../tricksWon'

export interface TrickEntryFormProps {
  readonly round: number
  readonly onSubmit: (tricks: TricksWon) => void
}

/**
 * AC6 — Test-mode manual trick entry. Renders exactly one number input, for
 * the player's own trick count; the opponent's is derived and displayed,
 * never entered, so an impossible split (one that doesn't sum to a full
 * round) is nearly unrepresentable rather than relying on `isValidTricksWon`
 * as the primary defence. That validator remains the reducer's backstop,
 * unchanged.
 */
export default function TrickEntryForm({ round, onSubmit }: TrickEntryFormProps) {
  const [raw, setRaw] = useState('')
  const value = Number(raw)
  const valid = isValidTrickCount(value)

  const handleSubmit = () => {
    if (!valid) return
    onSubmit({ [PlayerSide.Player]: value, [PlayerSide.Cpu]: TRICKS_PER_ROUND - value })
  }

  return (
    <aside className="vg-entry" aria-labelledby="vg-entry-title">
      <h2 id="vg-entry-title">Test mode — round {round}'s War Council result</h2>
      <p>
        Stands in for a real match. Runs the same scoreRound → convertScoreToMuster pipeline a real
        round takes; there is no parallel scoring rule.
      </p>
      <label htmlFor="vg-tricks-won">
        Tricks you won
        <input
          id="vg-tricks-won"
          type="number"
          min={0}
          max={TRICKS_PER_ROUND}
          step={1}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
        />
      </label>
      <p className="vg-derived" data-invalid={valid ? 'false' : 'true'}>
        {valid
          ? `They won ${TRICKS_PER_ROUND - value} · ${TRICKS_PER_ROUND} tricks in a round`
          : `Enter a whole number from 0 to ${TRICKS_PER_ROUND}`}
      </p>
      <button type="button" className="vg-primary" onClick={handleSubmit}>
        Convert to Muster
      </button>
    </aside>
  )
}

function isValidTrickCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= TRICKS_PER_ROUND
}
