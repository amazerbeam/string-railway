/**
 * DLR-130 Phase 4 — deterministic deep-state fixtures for component specs. Browser QA has never
 * been able to reach any of these states, because coins only arrive when a fight is finished
 * (`fixtureRunAfterFirstFight`). Each builder is a plain value, built by calling the same
 * drivers `npm run sim` calls — never a hand-rolled literal — so a `.test.tsx` spec can import one
 * and assert what the component renders under it.
 *
 * Every builder is deterministic (same seed in, byte-identical value out) and calls neither
 * `Math.random()` nor any storage API — `src/sim/**` is lint-enforced pure.
 */
import { closeHand, FRESH_ENCOUNTER_DECK, type EncounterDeck } from '../warCouncil'
import {
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  DuelSide,
  isEncounterResolved,
  mintFromTemplate,
  PLAYER_START_HEALTH,
  recordEncounter,
  startRun,
  templatesForFamily,
  type Buff,
  type RunState,
} from '../hunt'
import { dealHand } from '../app/handDeal'
import { roundReducer } from '../app/warCouncil/roundReducer'
import {
  createRoundUiState,
  discardWindowOpen,
  offeredBuffs,
  RoundUiActionKind,
  type RoundUiState,
} from '../app/warCouncil/roundUiState'
import { baselinePolicy } from './baselinePolicy'
import { MAX_HANDS_PER_FIGHT } from './simConfig'
import { playHand, seedFor } from './playHand'

/** Bounded retries for a fixture that searches for an outcome the engine does not guarantee on
 *  every seed — never an unbounded search. Kept local to this file: these are search caps for a
 *  fixture builder, not termination caps for the simulator itself (`simConfig.ts` owns those). */
const FIRST_FIGHT_MAX_ATTEMPTS = 50

/** One attempt at playing a fight to its end with `baselinePolicy`, seeded fresh. Returns the run
 *  right after `recordEncounter` books the resolved encounter — before `advanceRun` — or `null`
 *  when the attempt stalled, faulted, or the player did not win. Mirrors `playRun.ts`'s inner loop
 *  for exactly one fight, since `fixtureRunAfterFirstFight` only needs the first. */
function attemptFirstFight(seed: number): RunState | null {
  let run = startRun(PLAYER_START_HEALTH, [], seed)
  let carried: EncounterDeck = FRESH_ENCOUNTER_DECK
  let handNumber = 1

  for (let i = 0; i < MAX_HANDS_PER_FIGHT; i += 1) {
    const outcome = playHand(run, handNumber, carried, baselinePolicy)
    if (outcome.report.stalled || outcome.report.fault !== null) return null

    run = recordEncounter(
      run,
      outcome.result.encounter,
      outcome.result.discardsRemaining,
      outcome.result.unplayedAtResolve,
      outcome.result.coinsEarned,
      outcome.result.buffs,
    )
    handNumber += 1

    if (!isEncounterResolved(run.encounter)) {
      carried = closeHand(outcome.result.finalState)
      continue
    }

    return run.encounter.winner === DuelSide.Player ? run : null
  }
  return null
}

/**
 * A run right after the first encounter resolved with the player winning — the state coins come
 * from, which is why browser QA could never reach the shop with anything in the purse. Retries the
 * next seed (bounded to `FIRST_FIGHT_MAX_ATTEMPTS`) because `baselinePolicy`'s win rate is not
 * guaranteed on every seed; a `RangeError` naming the failure is the correct outcome if none of the
 * attempts wins, not a raised cap and not a silent fallback.
 */
export function fixtureRunAfterFirstFight(seed = 1301): RunState {
  for (let attempt = 0; attempt < FIRST_FIGHT_MAX_ATTEMPTS; attempt += 1) {
    const run = attemptFirstFight(seed + attempt)
    if (run !== null) return run
  }
  throw new RangeError(
    `fixtureRunAfterFirstFight: no seed in [${seed}, ${seed + FIRST_FIGHT_MAX_ATTEMPTS - 1}] ` +
      `produced a player win on the first encounter within ${MAX_HANDS_PER_FIGHT} hands per attempt`,
  )
}

/** Two cheap, real, activatable buffs — real templates minted via `mintFromTemplate`, exactly as
 *  `baselinePolicy.test.ts` does, because a fresh run's pile is a random draw (DLR-135) and this
 *  fixture needs two buffs of a KNOWN cost. Taker on the Magnitude
 *  axis at Bronze costs `1` AP each (`REWARD_BASE.magnitude.bronze + CONDITION_MODIFIER.taker` =
 *  `1 + 0`), so both together cost `2` of `STARTING_AP`'s `6`, comfortably affordable. */
function twoCheapActivatableBuffs(): readonly Buff[] {
  const takerMagnitudeTemplates = templatesForFamily(BuffKind.Taker).filter(
    (template) => template.form === 'condition' && template.axis === BuffRewardAxis.Magnitude,
  )
  if (takerMagnitudeTemplates.length < 2) {
    throw new RangeError(
      `twoCheapActivatableBuffs: expected at least 2 Taker/Magnitude templates, found ${takerMagnitudeTemplates.length}`,
    )
  }
  return takerMagnitudeTemplates
    .slice(0, 2)
    .map((template, index) => mintFromTemplate(template, BuffTier.Bronze, 9001 + index))
}

/**
 * A hand at a between-tricks window after two buffs have been activated in one trick, so
 * `buffActivation.activatedThisTrick.length >= 2`. Seeds the run's pile with two real, cheap,
 * activatable buffs of a KNOWN cost (see `twoCheapActivatableBuffs`) rather than relying on the
 * fresh run's random draw (DLR-135), whose cost this fixture cannot control. No policy driving is
 * needed here:
 * the window is opened and both buffs activated directly, which is both simpler and, unlike a
 * policy-driven search, exactly reproducible with no retry.
 */
export function fixtureHandWithStackedBuffs(seed = 1303): RoundUiState {
  const run: RunState = {
    ...startRun(PLAYER_START_HEALTH, [], seed),
    buffs: twoCheapActivatableBuffs(),
  }
  const dealt = dealHand(run, 1, FRESH_ENCOUNTER_DECK)
  let ui = createRoundUiState(seedFor(run, dealt))

  if (!discardWindowOpen(ui)) {
    throw new RangeError(
      'fixtureHandWithStackedBuffs: the discard/activation window is not open on deal',
    )
  }
  const targets = offeredBuffs(ui).slice(0, 2)
  if (targets.length < 2) {
    throw new RangeError(
      `fixtureHandWithStackedBuffs: only ${targets.length} activatable buffs offered — need at least 2`,
    )
  }

  ui = roundReducer(ui, { kind: RoundUiActionKind.ToggleLoadout })
  for (const buff of targets) {
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id: buff.id }) // poise
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id: buff.id }) // commit
  }

  if (ui.buffActivation.activatedThisTrick.length < 2) {
    throw new RangeError(
      `fixtureHandWithStackedBuffs: only ${ui.buffActivation.activatedThisTrick.length} of 2 offered buffs activated`,
    )
  }
  return ui
}
