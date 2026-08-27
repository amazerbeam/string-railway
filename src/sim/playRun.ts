/**
 * DLR-130 — the MIDDLE loop: plays a whole run by driving `playHand` until each encounter
 * resolves, adopting the result through `recordEncounter`, visiting the shop the policy asks for,
 * and calling `advanceRun` — a headless transcription of `App.tsx`'s `handleComplete` /
 * `leaveForNextFight`. Bounded by `MAX_HANDS_PER_FIGHT` per fight and by `playHand`'s own
 * `MAX_ACTIONS_PER_HAND`, so this always terminates; hitting either reports `Stalled`, deliberately
 * distinct from `Lost`.
 */
import { closeHand, FRESH_ENCOUNTER_DECK, type EncounterDeck } from '../warCouncil'
import {
  advanceRun,
  buyFromShop,
  canAdvanceRun,
  createSeededRng,
  drawReelPool,
  DuelSide,
  drinkFlask,
  flaskRefusalFor,
  flaskStockFor,
  isEncounterResolved,
  PLAYER_START_HEALTH,
  pullMachine,
  pullSlotMachine,
  recordEncounter,
  refusalFor,
  RunOutcome,
  shopStockFor,
  slotPullRefusalFor,
  slotSeedFor,
  slotVisitStockFor,
  spinSeedFor,
  startRun,
  type BuffTemplate,
  type RunState,
} from '../hunt'
import { withOpeningPile } from './openingPileVariants'
import { playHand } from './playHand'
import { MAX_HANDS_PER_FIGHT, MAX_SHOP_ACTIONS_PER_VISIT } from './simConfig'
import { RunEnding, type HandReport, type RunReport, type SimPolicy } from './types'

interface ShopVisitOutcome {
  readonly run: RunState
  readonly coinsSpent: number
  readonly slotPulls: number
}

/**
 * A bounded loop over `policy.nextShopAction`, executed defensively: every commit re-asks the
 * matching refusal predicate first, and a refusal ends the visit rather than throwing. `pull`
 * derives its strip and spin exactly as `useShopSlot` does, through `drawReelPool` — never
 * `drawVaultReelPool`, because a simulated run has an empty Vault (`plan.md` Part 1 → Assumptions
 * made). Coins spent are tracked as the delta `buyFromShop`/`pullSlotMachine` actually charged,
 * never re-derived from a price table.
 */
function visitShop(run: RunState, policy: SimPolicy): ShopVisitOutcome {
  let live = run
  let coinsSpent = 0
  let slotPulls = 0

  for (let i = 0; i < MAX_SHOP_ACTIONS_PER_VISIT; i += 1) {
    const action = policy.nextShopAction(live)
    if (action === null) break

    if (action.kind === 'buy') {
      if (refusalFor(shopStockFor(live), action.item) !== null) break
      const before = live.coins
      live = buyFromShop(live, action.item)
      coinsSpent += before - live.coins
      continue
    }

    if (action.kind === 'flask') {
      if (flaskRefusalFor(flaskStockFor(live)) !== null) break
      live = drinkFlask(live)
      continue
    }

    // action.kind === 'pull'
    if (slotPullRefusalFor(slotVisitStockFor(live)) !== null) break
    const stripSeed = slotSeedFor(live.runSeed, action.machineId, live.encounterIndex)
    const machine = drawReelPool(action.machineId, createSeededRng(stripSeed))
    const pull = pullMachine(
      machine,
      createSeededRng(spinSeedFor(stripSeed, live.slotPullsThisVisit)),
    )
    const before = live.coins
    live = pullSlotMachine(live, pull)
    coinsSpent += before - live.coins
    slotPulls += 1
  }

  return { run: live, coinsSpent, slotPulls }
}

/** Plays one whole run from `seed`, ending `Won`, `Lost`, or `Stalled` — a driver failure
 *  (a hand stalled or faulted, or `MAX_HANDS_PER_FIGHT` was hit), deliberately distinct from
 *  `Lost`, which is a genuine game outcome. */
export function playRun(
  seed: number,
  policy: SimPolicy,
  /** play-tester (2026-08-25) — OPTIONAL what-if opening-pile weighting; see
   *  `SimOptions.openingPileWeightOf`. Absent leaves `startRun`'s production draw untouched, which
   *  is what every pre-existing caller gets. */
  openingPileWeightOf?: (template: BuffTemplate) => number,
): RunReport {
  const started = startRun(PLAYER_START_HEALTH, [], seed)
  let run =
    openingPileWeightOf === undefined ? started : withOpeningPile(started, openingPileWeightOf)
  let carried: EncounterDeck = FRESH_ENCOUNTER_DECK
  let handNumber = 1
  let handsThisFight = 0
  const hands: HandReport[] = []
  let coinsEarned = 0
  let coinsSpent = 0
  let slotPulls = 0
  let deadCardRefusals = 0
  let fightsWon = 0
  let stalled = false

  while (run.outcome === RunOutcome.InProgress && handsThisFight < MAX_HANDS_PER_FIGHT) {
    const outcome = playHand(run, handNumber, carried, policy)
    hands.push(outcome.report)
    deadCardRefusals += outcome.deadCardRefusals
    if (outcome.report.stalled || outcome.report.fault !== null) {
      stalled = true
      break
    }

    const coinsBefore = run.coins
    run = recordEncounter(
      run,
      outcome.result.encounter,
      outcome.result.blastGuardHeld,
      outcome.result.discardsRemaining,
      outcome.result.unplayedAtResolve,
      outcome.result.coinsEarned,
      outcome.result.buffs,
      outcome.result.feederCarry,
    )
    coinsEarned += run.coins - coinsBefore
    handsThisFight += 1
    handNumber += 1

    if (!isEncounterResolved(run.encounter)) {
      carried = closeHand(outcome.result.finalState)
      continue
    }

    if (run.encounter.winner === DuelSide.Player) {
      fightsWon += 1
    }

    if (canAdvanceRun(run)) {
      const visit = visitShop(run, policy)
      run = visit.run
      coinsSpent += visit.coinsSpent
      slotPulls += visit.slotPulls
      run = advanceRun(run)
      carried = FRESH_ENCOUNTER_DECK
      handsThisFight = 0
      continue
    }

    // The run is over — won outright or lost.
    break
  }

  const ending: RunEnding =
    stalled || run.outcome === RunOutcome.InProgress
      ? RunEnding.Stalled
      : run.outcome === RunOutcome.Won
        ? RunEnding.Won
        : RunEnding.Lost

  return {
    seed,
    ending,
    fightReached: run.encounterIndex,
    fightsWon,
    hands,
    coinsEarned,
    coinsSpent,
    slotPulls,
    buffsOwnedAtEnd: run.buffs.length,
    deadCardRefusals,
  }
}
