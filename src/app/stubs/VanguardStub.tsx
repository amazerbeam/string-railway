import { useEffect, useState } from 'react'
import { PlayerSide, scoreRound } from '../../warCouncil'
import { convertScoreToMuster } from '../../vanguard'
import type { Muster } from '../../vanguard'
import { isValidTricksWon } from '../tricksWon'
import type { VanguardMountProps } from '../vanguardMount'

type RequestOutcome =
  | { readonly kind: 'error'; readonly round: number; readonly message: string }
  | { readonly kind: 'success'; readonly round: number; readonly muster: Muster }

type RequestStatus =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'success'; readonly muster: Muster }

function VanguardStub({ initialState, requestTricksWon, onComplete }: VanguardMountProps) {
  const [round, setRound] = useState(1)
  const [outcome, setOutcome] = useState<RequestOutcome | null>(null)

  useEffect(() => {
    let cancelled = false

    requestTricksWon(round).then((tricks) => {
      if (cancelled) return
      if (!isValidTricksWon(tricks)) {
        setOutcome({ kind: 'error', round, message: 'Invalid trick split for this round.' })
        return
      }
      setOutcome({ kind: 'success', round, muster: convertScoreToMuster(scoreRound(tricks)) })
    })

    return () => {
      cancelled = true
    }
  }, [round, requestTricksWon])

  // The request for `round` is still pending until an outcome tagged with that
  // same round number lands — derived at render time rather than reset via a
  // synchronous setState call in the effect body (react-hooks/set-state-in-effect).
  const status: RequestStatus = outcome && outcome.round === round ? outcome : { kind: 'loading' }

  const handleSimulateBreach = () => {
    onComplete({ finalState: initialState, winner: PlayerSide.Player })
  }

  return (
    <section>
      <h2>Vanguard (stub)</h2>
      <p>Round: {round}</p>
      {status.kind === 'loading' && <p>Requesting this round's trick split...</p>}
      {status.kind === 'error' && <p role="alert">{status.message}</p>}
      {status.kind === 'success' && (
        <p>
          Muster — player: {status.muster.player}, cpu: {status.muster.cpu}
        </p>
      )}
      <button type="button" onClick={() => setRound((current) => current + 1)}>
        Next round
      </button>
      <button type="button" onClick={handleSimulateBreach}>
        Simulate breach
      </button>
    </section>
  )
}

export default VanguardStub
