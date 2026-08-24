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
  discardRefusalFor,
  PlayerSide,
  QUARRY_SIDE,
  RoundPhase,
  type AbilityChoice,
  type EncounterDeck,
  type WarCouncilState,
} from '../warCouncil'
import {
  activatableBuffs,
  apCapacityFor,
  bankClimbBonusFor,
  BuffActivationRefusal,
  DuelSide,
  hasCheat,
  isEncounterResolved,
  MAX_CARDS_PER_DISCARD,
  playerRankTiersFor,
  type RunState,
} from '../hunt'
import { dealHand } from '../app/handDeal'
import { loadoutRefusalFor } from '../app/warCouncil/buffHandlers'
import { roundReducer } from '../app/warCouncil/roundReducer'
import {
  applyDamageStock,
  canAct,
  cheatArmed,
  createRoundUiState,
  discardSelecting,
  discardStock,
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

interface DiscardOutcome {
  readonly ui: RoundUiState
  /** `true` only when a swap actually committed and a budget charge was spent. */
  readonly committed: boolean
}

/**
 * One optional discard, in the same between-tricks window the buff activations use — `discardStock`
 * and `buffActivationStock` read the SAME `discardWindowOpen` predicate, so there is no second
 * timing gate to keep in step. Runs BEFORE the buff window because a swap changes the hand the buff
 * decision is made against.
 *
 * Every dispatch is preceded by re-asking the engine's own refusal predicate, and any path that
 * cannot commit cancels the selection rather than leaving it open — `runBuffWindow`'s own
 * discipline, and load-bearing here because an open selection reinterprets the next hand-card tap.
 */
function runDiscard(initial: RoundUiState, policy: SimPolicy): DiscardOutcome {
  if (policy.chooseDiscard === undefined) return { ui: initial, committed: false }
  const wanted = policy.chooseDiscard(initial)
  if (wanted.length === 0) return { ui: initial, committed: false }
  if (discardRefusalFor(discardStock(initial)) !== null) return { ui: initial, committed: false }

  let ui = roundReducer(initial, { kind: RoundUiActionKind.TapDiscard })
  if (!discardSelecting(ui)) return { ui: initial, committed: false }

  for (const card of wanted.slice(0, MAX_CARDS_PER_DISCARD)) {
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card })
  }
  if (discardRefusalFor(discardStock(ui)) !== null) {
    return { ui: roundReducer(ui, { kind: RoundUiActionKind.CancelDiscard }), committed: false }
  }

  ui = roundReducer(ui, { kind: RoundUiActionKind.TapDiscard })
  return { ui, committed: !discardSelecting(ui) }
}

interface CheatPlayOutcome {
  readonly ui: RoundUiState
  /** `true` only when the Cheat left `ui.cheats` — i.e. the card actually committed. */
  readonly spent: boolean
}

/**
 * One optional Cheat-armed play: two taps to poise and arm, then two to commit the card the policy
 * named. Counted only when the Cheat actually LEFT the pile, which `commitHandlers.ts` does on the
 * committing tap and only there.
 *
 * A play that does not commit — an illegal card, or a Fox/Woodcutter that opened a prompt instead —
 * gives the Cheat back through `CancelCheat` and then clears any armed card through
 * `CancelSelection`, so the caller's ordinary two-tap commit is not left racing a half-armed state.
 */
function runCheatPlay(initial: RoundUiState, policy: SimPolicy): CheatPlayOutcome {
  const play = policy.wantsCheatPlay?.(initial) ?? null
  if (play === null || !hasCheat(initial.cheats, play.cheatId)) {
    return { ui: initial, spent: false }
  }

  let ui = roundReducer(initial, { kind: RoundUiActionKind.TapCheat, id: play.cheatId })
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapCheat, id: play.cheatId })
  if (!cheatArmed(ui)) {
    return { ui: initial, spent: false }
  }

  const before = ui.cheats.length
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: play.card })
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: play.card })
  if (ui.cheats.length < before) {
    return { ui, spent: true }
  }

  ui = roundReducer(ui, { kind: RoundUiActionKind.CancelCheat })
  ui = roundReducer(ui, { kind: RoundUiActionKind.CancelSelection })
  return { ui, spent: false }
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
  let discardsUsed = 0
  let cheatsArmed = 0
  let discardedThisHand = false
  let stalled = false
  let fault: string | null = null
  let terminated = false

  // The decisive statistic. Read through the PRODUCTION predicate rather than counting the pile,
  // so this can never disagree with what the loadout panel offers.
  const activatableBuffsHeld = activatableBuffs(run.buffs).length

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
      if (!discardedThisHand) {
        const discard = runDiscard(ui, policy)
        ui = discard.ui
        if (discard.committed) {
          discardsUsed += 1
          discardedThisHand = true
        }
      }
      const outcome = runBuffWindow(ui, policy)
      ui = outcome.ui
      buffsActivated += outcome.buffsActivated
      applyDamagePresses += outcome.applyDamagePresses
      deadCardRefusals += outcome.deadCardRefusals
      continue
    }

    if (canAct(ui)) {
      const cheat = runCheatPlay(ui, policy)
      ui = cheat.ui
      if (cheat.spent) {
        cheatsArmed += 1
        continue
      }
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
    activatableBuffsHeld,
    discardsUsed,
    cheatsArmed,
    stalled,
    fault,
  }

  return { result, report, deadCardRefusals }
}
