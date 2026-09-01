/**
 * `RoundUiSeed` — the mount's opening figures, as a value distinct from the state they seed — and
 * `createRoundUiState`, the pure restructuring from one to the other.
 *
 * Split out of `roundUiState.ts` on DLR-150: that file had reached its 400-line budget once the
 * carry pool's seed field and docblock landed. `roundUiState.ts` still owns `RoundUiState` itself
 * and every predicate over it; this file owns only the seed and its one consumer, and both names
 * are re-exported from `roundUiState.ts` so no importer has to know the seam moved.
 */
import { ALL_BRONZE, startBuffActivation, STARTING_AP } from '../../hunt'
import type {
  ActionPoints,
  Buff,
  BuffCarry,
  Coins,
  EncounterState,
  RankTierTable,
} from '../../hunt'
import type { StreakState, WarCouncilState } from '../../warCouncil'
import { startBuffHand } from './buffRoundState'
import type { RoundUiState } from './roundUiState'

export interface RoundUiSeed {
  readonly round: WarCouncilState
  readonly encounter: EncounterState
  readonly blastGuardHeld: boolean
  readonly baseDamageBonus: number
  readonly discardsRemaining: number
  readonly buffs: readonly Buff[]
  /** DLR-116 — the per-hand AP pool including capacity bought in the shop. OPTIONAL and defaulted
   *  to STARTING_AP so every existing seed fixture reproduces the pre-DLR-116 pool exactly; the
   *  driver passes apCapacityFor(run.apCapacityBonus). */
  readonly apCapacity?: ActionPoints
  /** DLR-122 — the player's bought ability ladder. OPTIONAL and defaulted to `ALL_BRONZE` so every
   *  existing seed fixture reproduces the pre-DLR-122 game exactly; an absent table IS "nothing
   *  bought", which is what AC1 requires play identically to today. The driver passes
   *  `playerRankTiersFor(run)`. */
  readonly rankTiers?: RankTierTable
  /** DLR-125 — the run's purse at the START of this hand, for Miser. OPTIONAL and defaulted to 0
   *  so all 38 existing `createRoundUiState` fixtures reproduce today's game exactly. */
  readonly coins?: Coins
  /** DLR-150 AC3 — the carry this hand opens on. OPTIONAL and defaulted to `EMPTY_BUFF_CARRY` so
   *  all 11 existing seed literals reproduce today's game exactly, following `apCapacity`. */
  readonly feederCarry?: BuffCarry
  /** DLR-156 AC8 — the streak this hand opens on. OPTIONAL and defaulted to `EMPTY_STREAK`
   *  (via `total: 0, roll: 0` below), following `feederCarry`, so every existing
   *  `createRoundUiState` site and fixture reproduces today's game. */
  readonly streak?: StreakState
}

/** Still a pure restructuring of its seed, so StrictMode's double-invocation of the lazy
 *  `useReducer` initialiser recomputes an identical value. */
export function createRoundUiState(seed: RoundUiSeed): RoundUiState {
  return {
    // DLR-156 AC8 — the deal's hard `total: 0, roll: 0` are overwritten HERE, with the run's
    // carried streak, rather than in `dealRound` — that keeps the engine ignorant of the run.
    // ONLY when `seed.streak` is actually supplied: `seed.streak === undefined` leaves
    // `seed.round` untouched rather than forcing it to `0, 0`, so every existing seed literal
    // that hand-builds a non-zero `round.total`/`round.roll` (a great many component and
    // reducer specs do) still reproduces exactly, instead of being silently zeroed the moment
    // this optional field is added.
    round:
      seed.streak === undefined
        ? seed.round
        : { ...seed.round, total: seed.streak.total, roll: seed.streak.roll },
    armed: null,
    prompt: null,
    resolvedTrick: null,
    rejection: null,
    cpuFault: null,
    encounter: seed.encounter,
    openingEncounter: seed.encounter,
    cheatTricksRemaining: 0,
    timebombArmedDamage: null,
    primedTimebombDamage: null,
    timebombFuseRemaining: 0,
    timebombBuff: null,
    blastGuardHeld: seed.blastGuardHeld,
    baseDamageBonus: seed.baseDamageBonus,
    rankTiers: seed.rankTiers ?? ALL_BRONZE,
    unplayedAtResolve: null,
    discardsRemaining: seed.discardsRemaining,
    discardSelection: null,
    buffs: seed.buffs,
    buffActivation: startBuffActivation(seed.apCapacity ?? STARTING_AP),
    loadout: null,
    buffHand: startBuffHand(seed.feederCarry),
    coins: seed.coins ?? 0,
    // DLR-156 AC3/AC14 — the felt opens with the resolution screen closed.
    resolution: null,
  }
}
