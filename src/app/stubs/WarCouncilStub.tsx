import { RoundPhase, scoreRound } from '../../warCouncil'
import type { WarCouncilMountProps } from '../warCouncilMount'

function WarCouncilStub({ initialState, onComplete }: WarCouncilMountProps) {
  const handleSimulateCompletion = () => {
    onComplete({
      finalState: { ...initialState, phase: RoundPhase.Complete },
      score: scoreRound(initialState.tricksWon),
    })
  }

  return (
    <section>
      <h2>War Council (stub)</h2>
      <p>Dealer: {initialState.dealer}</p>
      <button type="button" onClick={handleSimulateCompletion}>
        Simulate completion
      </button>
    </section>
  )
}

export default WarCouncilStub
