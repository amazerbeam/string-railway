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
  combineBuffs,
  combineRefusalFor,
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
  type ShopItem,
} from '../hunt'
import { withOpeningPile } from './openingPileVariants'
import { playHand } from './playHand'
import { MAX_HANDS_PER_FIGHT, MAX_SHOP_ACTIONS_PER_VISIT } from './simConfig'
import { RunEnding, type HandReport, type RunReport, type SimPolicy } from './types'

interface ShopVisitOutcome {
  readonly run: RunState
  readonly coinsSpent: number
  readonly slotPulls: number
  /** play-tester (2026-09-02) — the pull share of `coinsSpent`, and the cards those pulls minted.
   *  Both are measured as the delta the engine actually applied, never re-derived from
   *  `SLOT_REROLL_PRICE` or from the machine's posted odds — the same discipline `coinsSpent`
   *  itself already follows. */
  readonly coinsSpentOnPulls: number
  readonly buffsAcquired: number
  /** play-tester (2026-09-02) — the shelf share of `coinsSpent`, per item. A `Map` inside the
   *  visit and a plain object on the report: accumulating into an object with a `ShopItem` key
   *  needs a widening cast, and `Map` needs none. */
  readonly coinsSpentByItem: ReadonlyMap<ShopItem, number>
  /** play-tester (2026-09-02) — combines committed this visit. Costs no coins, so it is counted
   *  rather than priced. */
  readonly combines: number
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
  let coinsSpentOnPulls = 0
  let buffsAcquired = 0
  let combines = 0
  const coinsSpentByItem = new Map<ShopItem, number>()

  for (let i = 0; i < MAX_SHOP_ACTIONS_PER_VISIT; i += 1) {
    const action = policy.nextShopAction(live)
    if (action === null) break

    if (action.kind === 'buy') {
      if (refusalFor(shopStockFor(live), action.item) !== null) break
      const before = live.coins
      live = buyFromShop(live, action.item)
      const charged = before - live.coins
      coinsSpent += charged
      coinsSpentByItem.set(action.item, (coinsSpentByItem.get(action.item) ?? 0) + charged)
      continue
    }

    if (action.kind === 'combine') {
      if (combineRefusalFor(live.buffs, action.key) !== null) break
      live = combineBuffs(live, action.key)
      combines += 1
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
    const buffsBefore = live.buffs.length
    live = pullSlotMachine(live, pull)
    const charged = before - live.coins
    coinsSpent += charged
    coinsSpentOnPulls += charged
    buffsAcquired += live.buffs.length - buffsBefore
    slotPulls += 1
  }

  return {
    run: live,
    coinsSpent,
    slotPulls,
    coinsSpentOnPulls,
    buffsAcquired,
    coinsSpentByItem,
    combines,
  }
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
  let coinsSpentOnPulls = 0
  let buffsAcquired = 0
  let combines = 0
  const coinsSpentByItem = new Map<ShopItem, number>()
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
      outcome.result.discardsRemaining,
      outcome.result.unplayedAtResolve,
      outcome.result.coinsEarned,
      outcome.result.buffs,
      outcome.result.lowCarry,
      outcome.result.streak,
      // DLR-163 AC5/AC8 — the same two figures `App.tsx`'s `handleComplete` carries. Without
      // these the simulator measures the pre-change game and silently reports the wrong figures.
      outcome.result.discardCapBonus,
      outcome.result.treasureDamageBonus,
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
      coinsSpentOnPulls += visit.coinsSpentOnPulls
      buffsAcquired += visit.buffsAcquired
      combines += visit.combines
      for (const [item, coins] of visit.coinsSpentByItem) {
        coinsSpentByItem.set(item, (coinsSpentByItem.get(item) ?? 0) + coins)
      }
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
    combines,
    buffsAcquired,
    coinsSpentOnPulls,
    coinsSpentByItem: Object.fromEntries(coinsSpentByItem),
    buffsOwnedAtEnd: run.buffs.length,
    deadCardRefusals,
  }
}
