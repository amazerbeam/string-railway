import { useState } from 'react'
import { SLICE_QUARRY_CHARACTER, type Hunt } from './hunt'
import { dealRound, type WarCouncilState } from './warCouncil'
import WarCouncilRound from './app/warCouncil/WarCouncilRound'
import { dealerForRound } from './app/dealerForRound'

// The slice's single encounter (§11): one Quarry. Built once at module scope because its only
// half is a configuration constant — it holds no per-round state, so it cannot go stale across
// the remounts below. The Demand and the Lose-credit pool were retired on DLR-67.
const HUNT: Hunt = { quarry: { character: SLICE_QUARRY_CHARACTER } }

function App() {
  const [round, setRound] = useState(1)
  const [dealt, setDealt] = useState<WarCouncilState>(() =>
    dealRound(dealerForRound(1), Math.random, SLICE_QUARRY_CHARACTER),
  )

  // onComplete's declared signature is (result: WarCouncilRoundResult) => void; the result is
  // deliberately not read here (see .docs/implementation/app/README.md — no score display yet), so the
  // parameter is omitted rather than named and left unused (a zero-arg function is assignable to
  // a wider callback type). Naming it `_result` trips @typescript-eslint/no-unused-vars, which
  // this project has not configured with an argsIgnorePattern.
  function handleComplete() {
    const next = round + 1
    setRound(next)
    setDealt(dealRound(dealerForRound(next), Math.random, SLICE_QUARRY_CHARACTER))
  }

  return (
    <WarCouncilRound key={round} initialState={dealt} hunt={HUNT} onComplete={handleComplete} />
  )
}

export default App
