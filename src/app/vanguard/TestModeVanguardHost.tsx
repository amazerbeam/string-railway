import { useCallback, useRef, useState } from 'react'
import { createVanguardBoard, type VanguardState } from '../../vanguard'
import { PlayerSide } from '../../warCouncil'
import type { TricksWon } from '../tricksWon'
import type { RequestTricksWon, VanguardMatchResult } from '../vanguardMount'
import TrickEntryForm from './TrickEntryForm'
import VanguardMatch from './VanguardMatch'

interface PendingRequest {
  readonly round: number
  readonly resolve: (tricks: TricksWon) => void
}

/**
 * Test-mode host — stands in for a real War Council match by asking a human
 * for each round's trick split through `TrickEntryForm`. This is where AC6's
 * "Test-mode only" becomes structural rather than a runtime check: the form
 * lives here, never inside `VanguardMatch`, so a future Campaign host simply
 * never renders it and the mount itself never knows which mode it is in
 * (SCRUM-37's central design idea).
 */
export default function TestModeVanguardHost() {
  // createVanguardBoard is deterministic — no rng parameter — so StrictMode's
  // development double-invocation of this lazy initializer recomputes an
  // identical board and nothing is wasted.
  const [board] = useState<VanguardState>(() => createVanguardBoard())
  const [pendingRound, setPendingRound] = useState<number | null>(null)
  const [result, setResult] = useState<VanguardMatchResult | null>(null)

  // Holds the pending request's resolver, keyed by round. A ref rather than
  // state because resolving it must never itself trigger a render — only
  // `pendingRound` does that. Assigning here always OVERWRITES rather than
  // queuing: StrictMode calls VanguardMatch's effect twice in development,
  // and without this the first promise would be orphaned forever with no way
  // to ever settle it.
  const pendingRef = useRef<PendingRequest | null>(null)

  // `RequestTricksWon`'s documented contract (src/app/vanguardMount.ts) is
  // that this identity must be referentially stable across renders:
  // VanguardMatch's single effect is keyed on it, and an unstable identity
  // would re-fire that effect on every render and issue unbounded duplicate
  // in-flight requests. The empty dependency array is correct, not
  // speculative — the closure reads only a ref and a `useState` setter, both
  // of which are stable across renders by React's own contract.
  const requestTricksWon: RequestTricksWon = useCallback((round) => {
    return new Promise<TricksWon>((resolve) => {
      pendingRef.current = { round, resolve }
      setPendingRound(round)
    })
  }, [])

  const handleSubmit = (tricks: TricksWon) => {
    pendingRef.current?.resolve(tricks)
    pendingRef.current = null
    setPendingRound(null)
  }

  if (result) {
    return (
      <section>
        <h2>Match complete</h2>
        <p>{result.winner === PlayerSide.Player ? 'You' : 'The CPU'} reached the Breach.</p>
      </section>
    )
  }

  return (
    <>
      <VanguardMatch
        initialState={board}
        requestTricksWon={requestTricksWon}
        onComplete={setResult}
      />
      {pendingRound !== null && <TrickEntryForm round={pendingRound} onSubmit={handleSubmit} />}
    </>
  )
}
