import { otherSide, PlayerSide } from '../../warCouncil'
import type { Muster } from '../../vanguard'
import { SIDE_LABEL } from './labels'
import './battle.css'

export interface RoundTransitionPanelProps {
  readonly round: number
  readonly dealer: PlayerSide
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly score: Readonly<Record<PlayerSide, number>>
  readonly muster: Muster
  readonly onContinue: () => void
}

/**
 * The round-transition summary (SCRUM-31, AC1): shown once a War Council
 * round's score and Muster are both known, before The Clash begins.
 * Purely presentational — score and muster arrive already computed by
 * the caller (scoreRound / convertScoreToMuster), matching
 * RoundOverPanel's existing contract. `otherSide` is the only derivation
 * this component makes itself: narrating an already-known fact, not new
 * game logic.
 */
export default function RoundTransitionPanel({
  round,
  dealer,
  tricksWon,
  score,
  muster,
  onContinue,
}: RoundTransitionPanelProps) {
  const nextDealer = otherSide(dealer)

  return (
    <div className="battle-shell">
      <div className="battle-panel" role="region" aria-labelledby="battle-transition-title">
        <p className="battle-eyebrow">Round {round} complete</p>
        <h1 id="battle-transition-title">The War Council has spoken</h1>

        <table className="battle-tally">
          <caption>Tricks and points this round</caption>
          <thead>
            <tr>
              <th>Side</th>
              <th>Tricks</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{SIDE_LABEL[PlayerSide.Player]}</td>
              <td data-side="player">{tricksWon[PlayerSide.Player]}</td>
              <td data-side="player">{score[PlayerSide.Player]}</td>
            </tr>
            <tr>
              <td>{SIDE_LABEL[PlayerSide.Cpu]}</td>
              <td data-side="cpu">{tricksWon[PlayerSide.Cpu]}</td>
              <td data-side="cpu">{score[PlayerSide.Cpu]}</td>
            </tr>
          </tbody>
        </table>

        <table className="battle-tally">
          <caption>Muster awarded for The Clash</caption>
          <tbody>
            <tr>
              <td>{SIDE_LABEL[PlayerSide.Player]}</td>
              <td data-side="player" colSpan={2}>
                {muster[PlayerSide.Player]}
              </td>
            </tr>
            <tr>
              <td>{SIDE_LABEL[PlayerSide.Cpu]}</td>
              <td data-side="cpu" colSpan={2}>
                {muster[PlayerSide.Cpu]}
              </td>
            </tr>
          </tbody>
        </table>

        <p>
          Your Vanguard network carries into The Clash unchanged — nothing on the board resets
          between rounds.
        </p>

        <div className="battle-dealer">
          <span>
            This round dealt by{' '}
            <strong>{dealer === PlayerSide.Player ? 'you' : 'the opponent'}</strong>
          </span>
          <span>
            Next round dealt by{' '}
            <strong>{nextDealer === PlayerSide.Player ? 'you' : 'the opponent'}</strong>
          </span>
        </div>

        <button type="button" className="battle-primary" onClick={onContinue}>
          Begin The Clash
        </button>
      </div>
    </div>
  )
}
