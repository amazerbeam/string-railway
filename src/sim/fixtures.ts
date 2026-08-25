/**
 * DLR-130 Phase 4 — deterministic deep-state fixtures for component specs. Browser QA has never
 * been able to reach any of these states, because coins only arrive when a fight is finished
 * (`fixtureRunAfterFirstFight`) and a Timebomb charge is only ever bought after a hand-earned coin
 * (`fixtureHandWithPrimedTimebomb`). Each builder is a plain value, built by calling the same
 * drivers `npm run sim` calls — never a hand-rolled literal — so a `.test.tsx` spec can import one
 * and assert what the component renders under it.
 *
 * Every builder is deterministic (same seed in, byte-identical value out) and calls neither
 * `Math.random()` nor any storage API — `src/sim/**` is lint-enforced pure.
 */
import {
  chooseCpuMove,
  closeHand,
  currentTurn,
  FRESH_ENCOUNTER_DECK,
  PlayerSide,
  QUARRY_SIDE,
  RoundPhase,
  type AbilityChoice,
  type EncounterDeck,
} from '../warCouncil'
import {
  buyFromShop,
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  DuelSide,
  isEncounterResolved,
  mintFromTemplate,
  PLAYER_START_HEALTH,
  recordEncounter,
  ShopItem,
  startRun,
  templatesForFamily,
  TIMEBOMB_PRICE,
  type Buff,
  type RunState,
} from '../hunt'
import { dealHand } from '../app/handDeal'
import { roundReducer } from '../app/warCouncil/roundReducer'
import {
  canAct,
  createRoundUiState,
  discardWindowOpen,
  loadoutOpen,
  offeredBuffs,
  RoundUiActionKind,
  type RoundUiState,
} from '../app/warCouncil/roundUiState'
import { baselinePolicy } from './baselinePolicy'
import { MAX_ACTIONS_PER_HAND, MAX_HANDS_PER_FIGHT } from './simConfig'
import { playHand, seedFor } from './playHand'

/** Bounded retries for a fixture that searches for an outcome the engine does not guarantee on
 *  every seed — never an unbounded search. Kept local to this file: these are search caps for a
 *  fixture builder, not termination caps for the simulator itself (`simConfig.ts` owns those). */
const FIRST_FIGHT_MAX_ATTEMPTS = 50
const PRIMED_TIMEBOMB_MAX_ATTEMPTS = 20

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
      outcome.result.blastGuardHeld,
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

/** One attempt at marking and playing a card with a bought Timebomb charge, seeded fresh. Returns
 *  the `RoundUiState` right after the marked trick resolves and books a payment on
 *  `encounter.pendingTimebomb` — the narrow window `roundReducer.timebombQueue.test.ts` documents,
 *  open only until the NEXT trick's resolution pays and clears it — or `null` when the marked
 *  trick's own outcome does not book a payment (e.g. a `SkullWin`, which AC7 exempts) or the hand
 *  stalls before reaching one. `buyFromShop` is total over `ShopItem` and still prices Timebomb;
 *  DLR-116 only pared it off the `SHOP_ITEMS` shelf, so buying it directly here is legitimate. */
function attemptPrimedTimebomb(seed: number): RoundUiState | null {
  const funded: RunState = { ...startRun(PLAYER_START_HEALTH, [], seed), coins: TIMEBOMB_PRICE }
  const run = buyFromShop(funded, ShopItem.Timebomb)
  const dealt = dealHand(run, 1, FRESH_ENCOUNTER_DECK)
  let ui = createRoundUiState(seedFor(run, dealt))
  let heldChoice: AbilityChoice | undefined
  let marked = false

  for (let i = 0; i < MAX_ACTIONS_PER_HAND; i += 1) {
    const primed = ui.round.primedCards.length >= 1
    const booked =
      ui.encounter.pendingTimebomb[DuelSide.Player] > 0 ||
      ui.encounter.pendingTimebomb[DuelSide.Quarry] > 0
    if (primed && booked) return ui

    if (ui.cpuFault !== null) return null
    if (isEncounterResolved(ui.encounter)) return null
    if (ui.round.phase === RoundPhase.Complete && ui.resolvedTrick === null) return null

    if (ui.resolvedTrick !== null) {
      // The marked trick resolved without booking a payment (e.g. a SkullWin) — this attempt
      // cannot reach the target state, however many further tricks are played.
      if (marked) return null
      ui = roundReducer(ui, { kind: RoundUiActionKind.CarryOn })
      continue
    }

    if (ui.prompt !== null) {
      const choice = heldChoice ?? chooseCpuMove(ui.round, PlayerSide.Player).choice
      heldChoice = undefined
      ui =
        choice === undefined
          ? roundReducer(ui, { kind: RoundUiActionKind.CancelSelection })
          : roundReducer(ui, { kind: RoundUiActionKind.ChooseAbility, choice })
      continue
    }

    const timebomb = offeredBuffs(ui).find((buff) => buff.kind === BuffKind.Timebomb)
    if (canAct(ui) && !marked && timebomb !== undefined) {
      const move = baselinePolicy.chooseCard(ui.round)
      heldChoice = move.choice
      // DLR-132 — the Timebomb is an ordinary pile row now: `ToggleLoadout` opens the panel,
      // `TapBuff` twice poises then spends it (arming `timebombArmedDamage`), `CancelLoadout`
      // closes the panel again so the three `TapCard` taps below reach the ordinary hand — mark,
      // arm, commit — exactly as before DLR-132.
      if (!loadoutOpen(ui)) {
        ui = roundReducer(ui, { kind: RoundUiActionKind.ToggleLoadout })
      }
      ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id: timebomb.id }) // poise
      ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id: timebomb.id }) // commit, arms
      if (loadoutOpen(ui)) {
        ui = roundReducer(ui, { kind: RoundUiActionKind.CancelLoadout })
      }
      ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: move.card }) // marks it
      ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: move.card }) // arms to play
      ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: move.card }) // commits
      marked = true
      continue
    }

    if (canAct(ui)) {
      const move = baselinePolicy.chooseCard(ui.round)
      heldChoice = move.choice
      ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: move.card }) // arm
      ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: move.card }) // commit
      continue
    }

    if (currentTurn(ui.round) === QUARRY_SIDE) {
      ui = roundReducer(ui, { kind: RoundUiActionKind.CarryOn })
      continue
    }

    return null
  }
  return null
}

/**
 * A run with a Timebomb bought, dealt a hand, and driven to the point where a card is primed and
 * `encounter.pendingTimebomb` is non-zero on at least one side. DLR-132 — the Timebomb is an
 * ordinary pile row now: marking is `TapBuff` twice (poise, commit — this is the spend) through
 * the loadout panel, then `TapCard` on the target once to mark it; the booking lands on
 * `encounter.pendingTimebomb` when the trick carrying the primed card resolves. Retries the next
 * seed (bounded to `PRIMED_TIMEBOMB_MAX_ATTEMPTS`) because which trick outcome the marked card
 * lands is not guaranteed on every seed.
 */
export function fixtureHandWithPrimedTimebomb(seed = 1302): RoundUiState {
  for (let attempt = 0; attempt < PRIMED_TIMEBOMB_MAX_ATTEMPTS; attempt += 1) {
    const result = attemptPrimedTimebomb(seed + attempt)
    if (result !== null) return result
  }
  throw new RangeError(
    `fixtureHandWithPrimedTimebomb: no seed in [${seed}, ${seed + PRIMED_TIMEBOMB_MAX_ATTEMPTS - 1}] ` +
      `booked a Timebomb payment on the marked trick within ${MAX_ACTIONS_PER_HAND} actions per attempt`,
  )
}

/** Two cheap, real, activatable buffs — real templates minted via `mintFromTemplate`, exactly as
 *  `baselinePolicy.test.ts` does, because a fresh run's pile is a random draw (DLR-135) and this
 *  fixture needs two buffs of a KNOWN cost. Taker on the Magnitude
 *  axis at Bronze costs `1` AP each (`REWARD_BASE.magnitude.bronze + CONDITION_MODIFIER.taker` =
 *  `1 + 0`), so both together cost `2` of `STARTING_AP`'s `6` — comfortably inside the reserve
 *  `wantsApplyDamage`'s `APPLY_DAMAGE_AP_COST` of `3` would otherwise need. */
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
