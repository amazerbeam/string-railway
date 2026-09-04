import { createSeededRng, dealSeedFor, type RunState } from '../hunt'
import { dealRound, type EncounterDeck, type WarCouncilState } from '../warCouncil'
import { dealerForRound } from './dealerForRound'

/**
 * DLR-123 AC12 — THE one place a hand is dealt, and the one place the deal's rng is chosen.
 *
 * `dealRound` used to be handed `Math.random`, which meant no deal and no reshuffle in this game
 * was ever reproducible. It is handed a seeded generator here instead, derived from the run's own
 * `runSeed` through `dealSeedFor` — so the last `Math.random()` on the deal path is gone, and the
 * only one left in `App.tsx` is the one that chooses `runSeed` itself.
 *
 * `handNumber` is `App.tsx`'s MONOTONIC counter, which feeds `dealerForRound`'s parity and must
 * never reset. `run.handOfFight` is the DIFFERENT, per-fight 1-based figure that feeds the seed.
 * The two are not interchangeable — `RunState.handOfFight`'s own docblock says so — and passing
 * one where the other belongs would either break the dealer alternation or make every fight of a
 * run deal identically.
 */
export function dealHand(
  run: RunState,
  handNumber: number,
  carried: EncounterDeck,
): WarCouncilState {
  return dealRound(
    dealerForRound(handNumber),
    createSeededRng(dealSeedFor(run.runSeed, run.encounterIndex, run.handOfFight)),
    carried,
  )
}
