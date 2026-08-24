/**
 * DLR-130 — the INNER loop: plays one hand by dispatching `RoundUiAction`s at `roundReducer`,
 * exactly as a player's taps would, until the hand or the encounter is over. Never re-implements
 * the hand over `playCard` directly — `applyResolution`'s four-step damage/Timebomb/payout fold
 * and `handleTapBuff`'s activation-plus-consumable-spend live in `src/app/warCouncil/` and have no
 * equivalent in the pure tree, so driving anything else would measure a game nobody plays.
 *
 * The action picked each iteration comes from `roundReducer.ts`'s OWN guards, read off in the
 * priority order below, not invented — that is what keeps this driver honest as those guards
 * change. Bounded by `MAX_ACTIONS_PER_HAND`; hitting the cap (or finding no legal action to take)
 * reports `stalled: true` rather than looping forever.
 */
import {
  applyDamageRefusalFor,
  chooseCpuMove,
  currentTurn,
  PlayerSide,
  QUARRY_SIDE,
  RoundPhase,
  type AbilityChoice,
  type EncounterDeck,
  type WarCouncilState,
} from '../warCouncil'
import {
  apCapacityFor,
  bankClimbBonusFor,
  BuffActivationRefusal,
  DuelSide,
  isEncounterResolved,
  playerRankTiersFor,
  type RunState,
} from '../hunt'
import { dealHand } from '../app/handDeal'
import { loadoutRefusalFor } from '../app/warCouncil/buffHandlers'
import { roundReducer } from '../app/warCouncil/roundReducer'
import {
  applyDamageStock,
  canAct,
  createRoundUiState,
  discardWindowOpen,
  loadoutOpen,
  offeredBuffs,
  RoundUiActionKind,
  type RoundUiSeed,
  type RoundUiState,
} from '../app/warCouncil/roundUiState'
import type { WarCouncilRoundResult } from '../app/warCouncilMount'
import { MAX_ACTIONS_PER_HAND } from './simConfig'
import type { HandReport, SimPolicy } from './types'

export interface HandOutcome {
  readonly result: WarCouncilRoundResult
  readonly report: HandReport
  /** Activations refused `NoEffectYet` this hand — the unreachable-consumable count `RunReport`
   *  sums across every hand of the run. `HandReport` itself carries no per-hand breakdown of
   *  refusal reasons (`plan.md` Part 2 → Data shapes), so this rides on the outcome instead —
   *  additive to the plan's literal `HandOutcome` shape, not a rename or a removal. */
  readonly deadCardRefusals: number
}

/** ONE helper for `RoundUiSeed`, mirroring exactly what `App.tsx`'s mount passes — see `plan.md`'s
 *  construction-site audit for why a fourth inline literal is how a field gets forgotten. Exported
 *  (DLR-130 Phase 4) so `fixtures.ts` builds the identical seed rather than a divergent inline
 *  literal — the same reason this stayed a single helper in the first place. */
export function seedFor(run: RunState, dealt: WarCouncilState): RoundUiSeed {
  return {
    round: dealt,
    encounter: run.encounter,
    cheats: run.cheats,
    timebombCharges: run.timebombCharges,
    blastGuardHeld: run.blastGuardHeld,
    discardsRemaining: run.discardsRemaining,
    buffs: run.buffs,
    bankClimbBonus: bankClimbBonusFor(run),
    rankTiers: playerRankTiersFor(run),
    apCapacity: apCapacityFor(run.apCapacityBonus),
    coins: run.coins,
  }
}

interface WindowOutcome {
  readonly ui: RoundUiState
  readonly buffsActivated: number
  readonly applyDamagePresses: number
  readonly deadCardRefusals: number
}

/** One between-tricks window: the policy's buff activations, then its Apply Damage press. Every
 *  dispatch is preceded by re-asking the engine's own refusal predicate, and a refused action is
 *  skipped rather than dispatched — the driver treats every policy answer as advisory. */
function runBuffWindow(initial: RoundUiState, policy: SimPolicy): WindowOutcome {
  let ui = initial
  let buffsActivated = 0
  let deadCardRefusals = 0
  let applyDamagePresses = 0

  for (const id of policy.chooseBuffs(ui)) {
    const buff = offeredBuffs(ui).find((candidate) => candidate.id === id)
    if (buff === undefined) continue
    if (!loadoutOpen(ui)) {
      ui = roundReducer(ui, { kind: RoundUiActionKind.ToggleLoadout })
    }
    let refusal = loadoutRefusalFor(ui, buff)
    if (refusal === BuffActivationRefusal.NoEffectYet) {
      deadCardRefusals += 1
    }
    if (refusal !== null) continue
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id }) // poise
    refusal = loadoutRefusalFor(ui, buff)
    if (refusal !== null) continue
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id }) // commit
    buffsActivated += 1
  }

  if (loadoutOpen(ui)) {
    ui = roundReducer(ui, { kind: RoundUiActionKind.CancelLoadout })
  }

  if (policy.wantsApplyDamage(ui) && applyDamageRefusalFor(applyDamageStock(ui)) === null) {
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapApplyDamage }) // poise
    if (applyDamageRefusalFor(applyDamageStock(ui)) === null) {
      ui = roundReducer(ui, { kind: RoundUiActionKind.TapApplyDamage }) // commit
      applyDamagePresses += 1
    }
  }

  return { ui, buffsActivated, applyDamagePresses, deadCardRefusals }
}

/** Plays one hand to its end — a resolved encounter, a completed round, a reported CPU fault, or
 *  `MAX_ACTIONS_PER_HAND` dispatches, whichever comes first — and reports both the result the felt
 *  would have handed `onComplete` and what the hand did. */
export function playHand(
  run: RunState,
  handNumber: number,
  carried: EncounterDeck,
  policy: SimPolicy,
): HandOutcome {
  const dealt = dealHand(run, handNumber, carried)
  let ui = createRoundUiState(seedFor(run, dealt))

  let heldChoice: AbilityChoice | undefined
  let windowKey = -1
  let buffsActivated = 0
  let applyDamagePresses = 0
  let deadCardRefusals = 0
  let stalled = false
  let fault: string | null = null
  let terminated = false

  for (let i = 0; i < MAX_ACTIONS_PER_HAND; i += 1) {
    if (ui.cpuFault !== null) {
      fault = ui.cpuFault
      terminated = true
      break
    }
    if (isEncounterResolved(ui.encounter)) {
      terminated = true
      break
    }
    if (ui.round.phase === RoundPhase.Complete && ui.resolvedTrick === null) {
      terminated = true
      break
    }

    if (ui.resolvedTrick !== null) {
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

    if (discardWindowOpen(ui) && windowKey !== ui.round.tricksPlayed) {
      windowKey = ui.round.tricksPlayed
      const outcome = runBuffWindow(ui, policy)
      ui = outcome.ui
      buffsActivated += outcome.buffsActivated
      applyDamagePresses += outcome.applyDamagePresses
      deadCardRefusals += outcome.deadCardRefusals
      continue
    }

    if (canAct(ui)) {
      const move = policy.chooseCard(ui.round)
      heldChoice = move.choice
      ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: move.card }) // arm
      ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: move.card }) // commit
      continue
    }

    if (currentTurn(ui.round) === QUARRY_SIDE) {
      ui = roundReducer(ui, { kind: RoundUiActionKind.CarryOn })
      continue
    }

    stalled = true
    terminated = true
    break
  }
  if (!terminated) stalled = true

  const result: WarCouncilRoundResult = {
    finalState: ui.round,
    encounter: ui.encounter,
    cheats: ui.cheats,
    timebombCharges: ui.timebombCharges,
    blastGuardHeld: ui.blastGuardHeld,
    discardsRemaining: ui.discardsRemaining,
    buffs: ui.buffs,
    unplayedAtResolve: ui.unplayedAtResolve,
    coinsEarned: ui.buffHand.coinsEarned,
  }

  const report: HandReport = {
    handOfFight: run.handOfFight,
    damageToQuarry:
      ui.openingEncounter.health[DuelSide.Quarry] - ui.encounter.health[DuelSide.Quarry],
    damageToPlayer:
      ui.openingEncounter.health[DuelSide.Player] - ui.encounter.health[DuelSide.Player],
    tricksWon: ui.round.tricksWon[PlayerSide.Player],
    buffsActivated,
    apSpent: apCapacityFor(run.apCapacityBonus) - ui.buffActivation.apPool,
    applyDamagePresses,
    coinsFromBuffs: ui.buffHand.coinsEarned,
    stalled,
    fault,
  }

  return { result, report, deadCardRefusals }
}
