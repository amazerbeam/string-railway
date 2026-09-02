/**
 * DLR-130 — the INNER loop: plays one hand by dispatching `RoundUiAction`s at `roundReducer`,
 * exactly as a player's taps would, until the hand or the encounter is over. Never re-implements
 * the hand over `playCard` directly — `applyResolution`'s damage/Timebomb fold and
 * `handleTapBuff`'s activation-plus-consumable-spend live in `src/app/warCouncil/` and have no
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
  isSkulled,
  isTaken,
  PlayerSide,
  potValue,
  QUARRY_SIDE,
  RoundPhase,
  type AbilityChoice,
  type EncounterDeck,
} from '../warCouncil'
import {
  activatableBuffs,
  BuffKind,
  buffTargetSuitOf,
  DuelSide,
  isEncounterResolved,
  type BuffId,
  type RunState,
} from '../hunt'
import { dealHand } from '../app/handDeal'
import { roundReducer } from '../app/warCouncil/roundReducer'
import { roundResultFor } from '../app/warCouncil/roundResult'
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
// The driver imports these two PURE predicates from the skilled play deliberately, as instrumentation
// rather than as decision-making: counting how often a Cheat is the right play has to be independent
// of whether the policy in the seat would have found it, or the count only ever measures the policy.
import { cheatEscape, forcedHurt, trickIntent } from './skilledCardPlay'
import type {
  BuffFireOutcome,
  BuffWindowObservation,
  HandReport,
  HeldBuff,
  SimPolicy,
  TrickIntentRecord,
  TrickDamageRecord,
} from './types'

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
  let deadCardRefusals = 0
  let discardsUsed = 0
  let cheatsArmed = 0
  const buffWindowObservations: BuffWindowObservation[] = []
  const buffFireOutcomes: BuffFireOutcome[] = []
  const potsApplied: number[] = []
  const trickDamage: TrickDamageRecord[] = []
  const outcomes = {
    cleanWin: 0,
    dodge: 0,
    cleanLoss: 0,
    skullWin: 0,
    hurtLeading: 0,
    hurtFollowing: 0,
  }
  // Whether the player laid the FIRST card of the trick now resolving. Captured at the moment the
  // card is committed, because by the resolution the trick holds two cards and the seat is gone.
  let playerLedThisTrick = false
  const cheatMoments = { forced: 0, escapable: 0, held: 0, taken: 0 }
  // The pile as the CURRENT trick's window opened, held until that trick resolves and the record
  // for it is written. Snapshotted before `runBuffWindow` arms anything, so it is what was
  // AVAILABLE rather than what survived.
  // The read and the pile as the CURRENT trick's window opened. BOTH ARE CLEARED as each trick is
  // recorded: a window does not open for every trick — `discardWindowOpen` is false while a Fox or
  // Woodcutter prompt is pending — and without the reset the previous trick's read stayed attached
  // to the next one, which read as the strategy predicting the wrong seat on 27% of tricks when it
  // had in fact made no prediction at all.
  let heldAtWindow: readonly HeldBuff[] = []
  let intentAtWindow: TrickIntentRecord | null = null
  // The buffs activated for the trick currently in flight, resolved once at activation time rather
  // than re-looked-up later — `activatedThisTrick` itself clears the instant the trick resolves
  // (`buffActivation.ts`), so this is the only place that window's active set survives to be
  // reconciled against `resolvedTrick.resolution.firedBuffIds` below. Carries the reward axis/tier
  // with the kind for the same reason: the `Buff` object is in hand HERE and gone later.
  // `fired`, `trickOfHand` and `trickWasLoss` are ALL supplied at resolution, not here: this map is
  // built when the window opens, before the trick it belongs to has resolved.
  let pendingActive: ReadonlyMap<
    BuffId,
    Omit<BuffFireOutcome, 'fired' | 'trickOfHand' | 'trickWasLoss'>
  > = new Map()
  // 2026-08-25 — summed at each spend site rather than read as `capacity - endingApPool`: under
  // `ApRefreshCadence.PerTrick` the pool refills mid-hand, so a start/end diff would only ever
  // report the LAST trick's spend and silently undercount every earlier one.
  let apSpentTotal = 0
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
      const trickWasLoss = !isTaken(ui.resolvedTrick.resolution.outcome)
      const outcome = ui.resolvedTrick.resolution.outcome
      outcomes[outcome] += 1
      if (!isTaken(outcome)) {
        if (playerLedThisTrick) outcomes.hurtLeading += 1
        else outcomes.hurtFollowing += 1
      }
      for (const [id, card] of pendingActive) {
        buffFireOutcomes.push({
          ...card,
          fired: fired.includes(id),
          trickOfHand: ui.round.tricksPlayed,
          trickWasLoss,
        })
      }
      pendingActive = new Map()
      // DLR-156 review fix — the resolution screen's own apply-or-roll choice (AC3/AC5/AC6)
      // REPLACES the old unconditional `CarryOn` here: `ApplyPot`/`RollOver` already chain into
      // `handleCarryOn` themselves (`roundReducer.ts`), so dispatching `CarryOn` directly left
      // `ui.resolution` open and unconsumed — the Quarry could then never take damage through the
      // pot at all, since `cashOut` is zeroed unconditionally (DLR-156 AC5) and applying the pot is
      // the only remaining way to deal it. A hurt trick (`trickDamage === null`) offers no real
      // choice — `RollOver` is its only exit ("Onward") — so the policy is never asked on that
      // branch, matching `TrickResolutionScreen.tsx`'s own `hurt` gate.
      const hurt = ui.resolution === null || ui.resolvedTrick.resolution.trickDamage === null
      // MODELLING DEFAULT (developer-owned to revisit, not a tunable): when the policy declines to
      // answer, apply whenever a pot stands — the modelled player never pushes their luck. This is
      // the lowest-variance strategy the apply-or-roll choice admits, which is what makes the
      // simulator measure something real again; it is deliberately not a claim about optimal play,
      // and the whole point of the roll-over mechanic is the push a never-apply floor cannot see.
      const apply = !hurt && (policy.wantsApplyPot?.(ui) ?? true)
      const resolved = ui.resolvedTrick.resolution
      const terms = resolved.trickDamage
      trickDamage.push({
        trick: ui.round.tricksPlayed,
        outcome,
        intent: intentAtWindow,
        held: heldAtWindow,
        cards: ui.resolvedTrick.cards.map((played) => ({
          side: played.side,
          suit: played.card.suit,
          rank: played.card.rank,
          skulled: isSkulled(ui.round.skulledCards, played.card),
        })),
        trumpSuit: ui.round.trumpSuit,
        playerLed: ui.resolvedTrick.cards[0].side === PlayerSide.Player,
        base: terms?.base ?? 0,
        buffDamage: terms?.buffDamage ?? 0,
        buffMult: terms?.buffMult ?? 0,
        overlapBonus: terms?.overlapBonus ?? 0,
        dealt: terms?.dealt ?? 0,
        total: resolved.total,
        roll: resolved.roll,
        potApplied: apply ? potValue(resolved.total, resolved.roll) : null,
      })
      // Cleared only AFTER the record is written. A window does not open for every trick —
      // `discardWindowOpen` is false while a Fox or Woodcutter prompt is pending — and without this
      // the previous trick's read stayed attached to the next one, which read as the strategy
      // predicting the wrong seat on 27% of tricks when it had made no prediction at all.
      intentAtWindow = null
      heldAtWindow = []
      if (apply) {
        // play-tester (2026-09-02) — read BEFORE the dispatch: `ApplyPot` zeroes the streak, so
        // there is nothing left to compute the pot from once the reducer has run.
        const cashed = ui.resolvedTrick.resolution
        potsApplied.push(potValue(cashed.total, cashed.roll))
      }
      ui = roundReducer(ui, {
        kind: apply ? RoundUiActionKind.ApplyPot : RoundUiActionKind.RollOver,
      })
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
      const read = trickIntent(ui.round)
      intentAtWindow =
        read === null
          ? null
          : {
              suit: read.suit,
              willTake: read.willTake,
              certain: read.certain,
              playerLeads: read.playerLeads,
              skullOdds: read.skullOdds,
              held: read.held,
              skulled: read.skulled,
              plannedSuit: read.plannedCard === null ? null : read.plannedCard.suit,
              plannedRank: read.plannedCard === null ? null : read.plannedCard.rank,
            }
      heldAtWindow = activatableBuffs(ui.buffs).map((buff) => ({
        kind: buff.kind,
        tier: buff.tier,
        axis: buff.reward.axis,
        value: buff.reward.value,
        target: buffTargetSuitOf(buff),
      }))
      const outcome = runBuffWindow(ui, policy)
      ui = outcome.ui
      buffsActivated += outcome.buffsActivated
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
                    target: buffTargetSuitOf(buff),
                  },
                ] as const,
              ]
        }),
      )
      continue
    }

    if (canAct(ui)) {
      // Counted BEFORE `runCheatPlay`, which `continue`s when it spends one: counting after it
      // silently drops every moment the Cheat was actually used, which is the half of the question
      // that says the card works.
      if (ui.round.currentTrick.length > 0 && forcedHurt(ui.round)) {
        cheatMoments.forced += 1
        if (cheatEscape(ui.round) !== null) {
          cheatMoments.escapable += 1
          if (activatableBuffs(ui.buffs).some((buff) => buff.kind === BuffKind.Cheat)) {
            cheatMoments.held += 1
          }
        }
      }
      const cheat = runCheatPlay(ui, policy)
      ui = cheat.ui
      apSpentTotal += cheat.apSpent
      if (cheat.spent) {
        cheatsArmed += 1
        cheatMoments.taken += 1
        continue
      }
      playerLedThisTrick = ui.round.currentTrick.length === 0
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

  const result = roundResultFor(ui)

  const report: HandReport = {
    handOfFight: run.handOfFight,
    damageToQuarry:
      ui.openingEncounter.health[DuelSide.Quarry] - ui.encounter.health[DuelSide.Quarry],
    damageToPlayer:
      ui.openingEncounter.health[DuelSide.Player] - ui.encounter.health[DuelSide.Player],
    tricksWon: ui.round.tricksWon[PlayerSide.Player],
    tricksPlayed: ui.round.tricksPlayed,
    potsApplied,
    trickOutcomes: outcomes,
    trickDamage,
    cheatMoments,
    playerHealthAtStart: ui.openingEncounter.health[DuelSide.Player],
    maxPlayerHealthAtStart: run.maxPlayerHealth,
    buffsActivated,
    apSpent: apSpentTotal,
    coinsFromBuffs: ui.buffHand.coinsEarned,
    activatableBuffsHeld,
    discardsUsed,
    cheatsArmed,
    stalled,
    fault,
    buffWindowObservations,
    buffFireOutcomes,
    feederCarriedIn: ui.buffHand.accrual.carriedIn,
    feederCarryOut: ui.buffHand.accrual.carryOut,
    streakIn: run.streak,
    streakOut: result.streak,
  }

  return { result, report, deadCardRefusals }
}
