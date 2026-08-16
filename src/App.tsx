import { useState } from 'react'
import {
  advanceRun,
  canAdvanceRun,
  DuelSide,
  isEncounterResolved,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  recordEncounter,
  SLICE_QUARRY_CHARACTER,
  startRun,
  type Hunt,
} from './hunt'
import { dealRound, PlayerSide, type WarCouncilState } from './warCouncil'
// Imported from `./app/warCouncilMount` directly, NOT from the `./app` barrel: `./app`
// extensionless collides case-insensitively with this very file (`App.tsx`) on Windows —
// the same NTFS trap `duelHealthBars.ts`/`DuelHealthBars.tsx` hit — and would resolve here
// instead of to the barrel, which does not export this type.
import type { WarCouncilRoundResult } from './app/warCouncilMount'
import WarCouncilRound from './app/warCouncil/WarCouncilRound'
import { dealerForRound } from './app/dealerForRound'
import RunOutcomePanel, { type TrickTally } from './app/run/RunOutcomePanel'
import { runProgressText } from './app/run/runLabels'

// Built once at module scope because its only half is a configuration constant — it holds no
// per-run state, so it cannot go stale across the remounts below. Every fight of the run faces
// the same character: DLR-82 changes only each Quarry's health, and the roster is DLR-85's.
const HUNT: Hunt = { quarry: { character: SLICE_QUARRY_CHARACTER } }

const NO_TRICKS: TrickTally = { taken: 0, lost: 0 }

/**
 * The run driver (DLR-82). Owns `RunState` and switches on it: while the encounter is live it
 * mounts the felt exactly as before, and once an encounter resolves it mounts the run verdict
 * instead.
 *
 * Holds NO effect. Every transition below is a callback fired from a control, so there is no
 * listener, timer or subscription to clean up, and StrictMode's development double-mount only
 * re-runs the pure lazy initialisers.
 *
 * `hand` is monotonic across the WHOLE run, never reset per fight: it is React's remount `key`,
 * so every hand must have a distinct one, and it feeds `dealerForRound`'s parity, so counting on
 * across a fight boundary keeps the dealer alternating naturally.
 */
function App() {
  const [run, setRun] = useState(startRun)
  const [hand, setHand] = useState(1)
  const [dealt, setDealt] = useState<WarCouncilState>(() =>
    dealRound(dealerForRound(1), Math.random),
  )
  // The deciding hand's trick split, captured when an encounter resolves so the verdict can show
  // it. Nothing accumulates tricks across the several hands a fight takes, so this is the last
  // hand's, which is the only figure that exists.
  const [tricks, setTricks] = useState<TrickTally>(NO_TRICKS)

  const encounterOver = isEncounterResolved(run.encounter)

  // Read from config, never written as numbers, and derived from the SAME index the encounter was
  // started from — so a bar's denominator cannot disagree with its opening value. Not a module
  // constant any more: the Quarry's maximum changes with every fight of the run.
  const maxHealth = {
    [DuelSide.Player]: PLAYER_START_HEALTH,
    [DuelSide.Quarry]: quarryHealthForEncounter(run.encounterIndex),
  }

  function dealNextHand() {
    const next = hand + 1
    setHand(next)
    setDealt(dealRound(dealerForRound(next), Math.random))
  }

  function handleComplete(result: WarCouncilRoundResult) {
    const next = recordEncounter(run, result.encounter)
    setRun(next)
    if (isEncounterResolved(next.encounter)) {
      setTricks({
        taken: result.finalState.tricksWon[PlayerSide.Player],
        lost: result.finalState.tricksWon[PlayerSide.Cpu],
      })
      return // The verdict is next, not another hand.
    }
    dealNextHand()
  }

  function handleNextFight() {
    setRun(advanceRun(run))
    setTricks(NO_TRICKS)
    dealNextHand()
  }

  function handleNewRun() {
    const fresh = startRun()
    setRun(fresh)
    setTricks(NO_TRICKS)
    setHand(1)
    setDealt(dealRound(dealerForRound(1), Math.random))
  }

  if (encounterOver) {
    return (
      <RunOutcomePanel
        outcome={run.outcome}
        encounterIndex={run.encounterIndex}
        encounterCount={run.encounterCount}
        carriedHealth={run.encounter.health[DuelSide.Player]}
        tricks={tricks}
        canContinue={canAdvanceRun(run)}
        onNextFight={handleNextFight}
        onNewRun={handleNewRun}
      />
    )
  }

  return (
    <WarCouncilRound
      key={hand}
      initialState={dealt}
      hunt={HUNT}
      encounter={run.encounter}
      maxHealth={maxHealth}
      runLabel={runProgressText(run.encounterIndex, run.encounterCount)}
      onComplete={handleComplete}
    />
  )
}

export default App
