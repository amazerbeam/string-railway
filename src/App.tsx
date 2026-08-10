import { useState } from 'react'
import { dealRound, type WarCouncilState } from './warCouncil'
import WarCouncilRound from './app/warCouncil/WarCouncilRound'
import { dealerForRound } from './app/dealerForRound'

function App() {
  const [round, setRound] = useState(1)
  const [dealt, setDealt] = useState<WarCouncilState>(() =>
    dealRound(dealerForRound(1), Math.random),
  )

  // onComplete's declared signature is (result: WarCouncilRoundResult) => void; the result is
  // deliberately not read here (see .docs/implementation/app/README.md — no score display yet), so the
  // parameter is omitted rather than named and left unused (a zero-arg function is assignable to
  // a wider callback type). Naming it `_result` trips @typescript-eslint/no-unused-vars, which
  // this project has not configured with an argsIgnorePattern.
  function handleComplete() {
    const next = round + 1
    setRound(next)
    setDealt(dealRound(dealerForRound(next), Math.random))
  }

  return <WarCouncilRound key={round} initialState={dealt} onComplete={handleComplete} />
}

export default App
