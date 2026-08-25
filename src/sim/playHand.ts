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
  isEncounterResolved,
  MAX_CARDS_PER_DISCARD,
  PayoutOutcome,
  playerRankTiersFor,
  type ActionPoints,
  type BuffId,
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
import type { BuffFireOutcome, BuffWindowObservation, HandReport, SimPolicy } from './types'

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
  /** `true` only when the trick the Cheat was spent on actually committed and consumed a trick of
   *  `cheatTricksRemaining` — i.e. `commit` (`commitHandlers.ts`) decremented it, which it does
   *  only on a SUCCESSFUL player commit. */
  readonly spent: boolean
  /** 2026-08-25 — the AP the Cheat's own `TapBuff` commit spent, captured BEFORE the `TapCard`
   *  arm/commit below it: under `ApRefreshCadence.PerTrick` those two dispatches can cross a
   *  trick boundary and refill `apPool`, which would make a before/after diff taken any later
   *  than this undercount every spend that happened before the refill. */
  readonly apSpent: ActionPoints
}

/**
 * One optional Cheat-armed play, driven through the ordinary two-tap row flow every buff now
 * uses: `TapBuff` (poise), `TapBuff` (commit — this is where the AP is spent and
 * `cheatTricksRemaining` is set), then `TapCard` (arm), `TapCard` (commit the card the policy
 * named).
 *
 * DLR-132 — there is no give-back. Before this ticket a rejected commit handed the Cheat back to
 * `ui.cheats` through `CancelCheat`; now the trick is only spent on a SUCCESSFUL `commit`
 * (`commitHandlers.ts`'s `wasArmed` decrement), so a rejected card simply leaves
 * `cheatTricksRemaining` untouched and the Cheat stays armed for a later attempt — the same AC7
 * discipline `commit`'s own docblock records.
 */
function runCheatPlay(initial: RoundUiState, policy: SimPolicy): CheatPlayOutcome {
  const play = policy.wantsCheatPlay?.(initial) ?? null
  const cheat =
    play === null ? undefined : offeredBuffs(initial).find((buff) => buff.id === play.cheatId)
  if (play === null || cheat === undefined) {
    return { ui: initial, spent: false, apSpent: 0 }
  }

  let ui = initial
  if (!loadoutOpen(ui)) {
    ui = roundReducer(ui, { kind: RoundUiActionKind.ToggleLoadout })
  }
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id: play.cheatId }) // poise
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id: play.cheatId }) // commit
  if (loadoutOpen(ui)) {
    ui = roundReducer(ui, { kind: RoundUiActionKind.CancelLoadout })
  }
  // Captured HERE, before the TapCard dispatches below: those can cross a trick boundary and,
  // under ApRefreshCadence.PerTrick, refill apPool — a diff taken any later would undercount.
  const apSpent = initial.buffActivation.apPool - ui.buffActivation.apPool
  if (!cheatArmed(ui)) {
    return { ui, spent: false, apSpent }
  }

  const before = ui.cheatTricksRemaining
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: play.card }) // arm
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: play.card }) // commit
  return { ui, spent: ui.cheatTricksRemaining < before, apSpent }
}

interface WindowOutcome {
  readonly ui: RoundUiState
  readonly buffsActivated: number
  readonly applyDamagePresses: number
  readonly deadCardRefusals: number
  /** 2026-08-25 — every AP this window spent, on buffs and Apply Damage alike. Safe to diff
   *  `initial`/final `apPool` directly: no `TapCard` dispatch happens inside this window, so no
   *  per-trick refill can land between the spends counted and this diff. */
  readonly apSpent: ActionPoints
  /** Every buff `offeredBuffs(initial)` held at this window's OPEN, kind and refusal together —
   *  see `BuffWindowObservation`. Independent of `policy.chooseBuffs`: recorded from `initial`,
   *  before this window's own activation loop can spend AP and shift a later buff's refusal. */
  readonly observations: readonly BuffWindowObservation[]
}

/** One between-tricks window: the policy's buff activations, then its Apply Damage press. Every
 *  dispatch is preceded by re-asking the engine's own refusal predicate, and a refused action is
 *  skipped rather than dispatched — the driver treats every policy answer as advisory. */
function runBuffWindow(initial: RoundUiState, policy: SimPolicy): WindowOutcome {
  let ui = initial
  let buffsActivated = 0
  let deadCardRefusals = 0
  let applyDamagePresses = 0
  const observations: BuffWindowObservation[] = offeredBuffs(initial).map((buff) => ({
    kind: buff.kind,
    refusal: loadoutRefusalFor(initial, buff),
    axis: buff.reward.axis,
    tier: buff.tier,
  }))

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

  return {
    ui,
    buffsActivated,
    applyDamagePresses,
    deadCardRefusals,
    apSpent: initial.buffActivation.apPool - ui.buffActivation.apPool,
    observations,
  }
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
  const buffWindowObservations: BuffWindowObservation[] = []
  const buffFireOutcomes: BuffFireOutcome[] = []
  // The buffs activated for the trick currently in flight, resolved once at activation time rather
  // than re-looked-up later — `activatedThisTrick` itself clears the instant the trick resolves
  // (`buffActivation.ts`), so this is the only place that window's active set survives to be
  // reconciled against `resolvedTrick.resolution.firedBuffIds` below. Carries the reward axis/tier
  // with the kind for the same reason: the `Buff` object is in hand HERE and gone later.
  // `fired` and `trickOfHand` are BOTH supplied at resolution, not here: this map is built when the
  // window opens, before the trick it belongs to has resolved.
  let pendingActive: ReadonlyMap<BuffId, Omit<BuffFireOutcome, 'fired' | 'trickOfHand'>> = new Map()
  // 2026-08-25 — summed at each spend site rather than read as `capacity - endingApPool`: under
  // `ApRefreshCadence.PerTrick` the pool refills mid-hand, so a start/end diff would only ever
  // report the LAST trick's spend and silently undercount every earlier one.
  let apSpentTotal = 0
  let applyDamagePaidTotal = 0
  let applyDamageLostTotal = 0
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
      const fired = ui.resolvedTrick.resolution.firedBuffIds
      for (const [id, card] of pendingActive) {
        buffFireOutcomes.push({
          ...card,
          fired: fired.includes(id),
          trickOfHand: ui.round.tricksPlayed,
        })
      }
      pendingActive = new Map()
      const payout = ui.resolvedTrick.payout
      if (payout !== null) {
        if (payout.outcome === PayoutOutcome.Paid) {
          applyDamagePaidTotal += payout.cashOut
        } else if (payout.outcome === PayoutOutcome.Reduced) {
          applyDamageLostTotal += payout.cashOut - (payout.remaining ?? 0)
        } else {
          applyDamageLostTotal += payout.cashOut
        }
      }
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
      apSpentTotal += outcome.apSpent
      buffWindowObservations.push(...outcome.observations)
      // Snapshot the trick's active set HERE, while `activatedThisTrick` still holds it — it
      // clears the moment this trick resolves, before `buffFireOutcomes` above gets to read it.
      const offered = offeredBuffs(ui)
      pendingActive = new Map(
        ui.buffActivation.activatedThisTrick.flatMap((id) => {
          const buff = offered.find((candidate) => candidate.id === id)
          return buff === undefined
            ? []
            : [
                [
                  id,
                  {
                    kind: buff.kind,
                    axis: buff.reward.axis,
                    tier: buff.tier,
                    rewardValue: buff.reward.value,
                  },
                ] as const,
              ]
        }),
      )
      continue
    }

    if (canAct(ui)) {
      const cheat = runCheatPlay(ui, policy)
      ui = cheat.ui
      apSpentTotal += cheat.apSpent
      if (cheat.spent) {
        cheatsArmed += 1
        continue
      }
      const move = policy.chooseCard(ui.round, ui)
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
    tricksPlayed: ui.round.tricksPlayed,
    applyDamagePaid: applyDamagePaidTotal,
    applyDamageLost: applyDamageLostTotal,
    buffsActivated,
    apSpent: apSpentTotal,
    applyDamagePresses,
    coinsFromBuffs: ui.buffHand.coinsEarned,
    activatableBuffsHeld,
    discardsUsed,
    cheatsArmed,
    stalled,
    fault,
    buffWindowObservations,
    buffFireOutcomes,
  }

  return { result, report, deadCardRefusals }
}
