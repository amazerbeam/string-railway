import { createVanguardBoard } from '../vanguard'
import { dealRound } from '../warCouncil'
import { BattlePhase } from './battlePhase'
import { WAR_COUNCIL_FIRST_DEALER } from './config'
import type { BattleState } from './battleState'

// Narrowed to the WarCouncilRound variant: startBattle always constructs one,
// and callers (including its own test file) read `dealer`/`vanguard` off the
// result without a narrowing check first — those fields aren't on every
// BattleState variant, so the broader union type doesn't typecheck here.
type BattleStartState = Extract<BattleState, { phase: typeof BattlePhase.WarCouncilRound }>

export function startBattle(rng: () => number): BattleStartState {
  const dealer = WAR_COUNCIL_FIRST_DEALER
  return {
    phase: BattlePhase.WarCouncilRound,
    round: 1,
    dealer,
    vanguard: createVanguardBoard(),
    warCouncil: dealRound(dealer, rng),
  }
}
