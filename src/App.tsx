import { useState } from 'react'
import {
  DuelSide,
  isEncounterResolved,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  SLICE_QUARRY_CHARACTER,
  startEncounter,
  type Hunt,
} from './hunt'
import { dealRound, type WarCouncilState } from './warCouncil'
// Imported from `./app/warCouncilMount` directly, NOT from the `./app` barrel: `./app`
// extensionless collides case-insensitively with this very file (`App.tsx`) on Windows —
// the same NTFS trap `duelHealthBars.ts`/`DuelHealthBars.tsx` hit — and would resolve here
// instead of to the barrel, which does not export this type.
import type { WarCouncilRoundResult } from './app/warCouncilMount'
import WarCouncilRound from './app/warCouncil/WarCouncilRound'
import { dealerForRound } from './app/dealerForRound'

// The slice's single encounter (§11): one Quarry, one health bar each. `0` indexes
// `QUARRY_ENCOUNTER_HEALTH`; it is not a tuning value. DLR-73 replaces it with the encounter loop.
const SLICE_ENCOUNTER_INDEX = 0

// Built once at module scope because its only half is a configuration constant — it holds no
// per-round state, so it cannot go stale across the remounts below. The Demand and the
// Lose-credit pool were retired on DLR-67.
const HUNT: Hunt = { quarry: { character: SLICE_QUARRY_CHARACTER } }

// Read from config, never written as numbers. `startEncounter` resolves the Quarry's bar from
// the same function, so the maximum and the opening value cannot disagree.
const MAX_HEALTH = {
  [DuelSide.Player]: PLAYER_START_HEALTH,
  [DuelSide.Quarry]: quarryHealthForEncounter(SLICE_ENCOUNTER_INDEX),
}

function App() {
  const [round, setRound] = useState(1)
  const [dealt, setDealt] = useState<WarCouncilState>(() =>
    dealRound(dealerForRound(1), Math.random, SLICE_QUARRY_CHARACTER),
  )
  const [encounter, setEncounter] = useState(() => startEncounter(SLICE_ENCOUNTER_INDEX))

  // The result IS read now (DLR-71): it carries the encounter the player just watched the
  // damage land on, already applied by the reducer through `applyDamage`. Setting it here rather
  // than re-applying is what keeps one Hunt to one application.
  function handleComplete(result: WarCouncilRoundResult) {
    setEncounter(result.encounter)
    if (isEncounterResolved(result.encounter)) {
      return // No next Hunt. The transition and outcome screens are DLR-73's.
    }
    const next = round + 1
    setRound(next)
    setDealt(dealRound(dealerForRound(next), Math.random, SLICE_QUARRY_CHARACTER))
  }

  return (
    <WarCouncilRound
      key={round}
      initialState={dealt}
      hunt={HUNT}
      encounter={encounter}
      maxHealth={MAX_HEALTH}
      onComplete={handleComplete}
    />
  )
}

export default App
