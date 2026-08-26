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
  chooseCpuMove,
  currentTurn,
  PlayerSide,
  QUARRY_SIDE,
  RoundPhase,
  type AbilityChoice,
  type EncounterDeck,
} from '../warCouncil'
import {
  activatableBuffs,
  DuelSide,
  isEncounterResolved,
  PayoutOutcome,
  type BuffId,
  type RunState,
} from '../hunt'
import { dealHand } from '../app/handDeal'
import { roundReducer } from '../app/warCouncil/roundReducer'
import {
  canAct,
  createRoundUiState,
  discardWindowOpen,
  offeredBuffs,
  RoundUiActionKind,
} from '../app/warCouncil/roundUiState'
import type { WarCouncilRoundResult } from '../app/warCouncilMount'
import { MAX_ACTIONS_PER_HAND } from './simConfig'
import { runBuffWindow, runCheatPlay, runDiscard, seedFor } from './playHandWindows'
import type { BuffFireOutcome, BuffWindowObservation, HandReport, SimPolicy } from './types'

export { seedFor } from './playHandWindows'

export interface HandOutcome {
  readonly result: WarCouncilRoundResult
  readonly report: HandReport
  /** Activations refused `NoEffectYet` this hand — the unreachable-consumable count `RunReport`
   *  sums across every hand of the run. `HandReport` itself carries no per-hand breakdown of
   *  refusal reasons (`plan.md` Part 2 → Data shapes), so this rides on the outcome instead —
   *  additive to the plan's literal `HandOutcome` shape, not a rename or a removal. */
  readonly deadCardRefusals: number
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
      // DLR-145 — union `offeredBuffs` with `spentThisTrick`, the same fix `buffHandInputFor`
      // (`src/app/warCouncil/buffRoundState.ts`) already applies: a single-use condition card
      // (Taker/Feeder/Sidestep) is removed from the pile — and so from `offeredBuffs` — the
      // instant `activateFromPile` consumes it, so looking it up in `offeredBuffs` alone silently
      // drops it here even though `buffsActivated` counted it. Keep these two readings in step.
      const candidates = [...offeredBuffs(ui), ...ui.buffActivation.spentThisTrick]
      pendingActive = new Map(
        ui.buffActivation.activatedThisTrick.flatMap((id) => {
          const buff = candidates.find((candidate) => candidate.id === id)
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
