import type { HexCoord } from './types'
import { PlayerSide } from '../warCouncil'

// --- Configuration: values with no chosen number yet, retunable without a design
// change (see plan.md Part 1 -> Risks and judgement calls) ---
export const BOARD_SIZE = 11
export const STARTING_CLUSTER_SIZE = 4
export const DEFENSE_CELLS: readonly HexCoord[] = [
  { q: 5, r: 4 },
  { q: 5, r: 5 },
  { q: 5, r: 6 },
  { q: 4, r: 5 },
  { q: 6, r: 5 },
]

// --- Constants: values the ticket's acceptance criteria already state; named so
// they are never inlined in an action module ---
export const EXPAND_RANGE = 2
export const EXPAND_COST = 1
export const OVERWRITE_COST = 2
export const OVERWRITE_COST_REINFORCED = 3
export const REINFORCE_COST = 1
export const REINFORCE_MAX_STACK = 1

// --- Configuration: Muster baseline and bonus for SCRUM-22, illustrative only —
// retunable without a design change (see plan.md Part 1 -> Risks and judgement calls) ---
export const MUSTER_BASELINE = 7
export const MUSTER_BONUS = 3

// --- Configuration: the round-opener default AC3 states outright (not a
// placeholder) — exposed as one constant so a later retune is one line ---
export const CLASH_FIRST_ROUND_OPENER: PlayerSide = PlayerSide.Cpu
