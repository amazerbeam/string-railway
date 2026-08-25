/**
 * The player's own commit — assembling the pending-Timebomb/bank-climb options a resolving trick
 * needs, folding a trick's resolution into the encounter, and committing `cardToPlay` before
 * advancing the Quarry's follow when the player led — separated from the reducer that calls it.
 *
 * Split out of `roundReducer.ts` in the DLR-100 fix pass, the moment the Quarry-to-lead-gap guard
 * pushed it to 404 of its 400-line budget, mirroring `quarryAdvance.ts`'s own split (DLR-94) and
 * `discardHandlers.ts`'s (DLR-100) for the same reason: this is a self-contained block that talks
 * to `playCard` and the encounter and decides nothing about the rest of the felt. PURE MOVE: no
 * behaviour changed, and every docblock came with its function.
 */
import {
  incomingFrom,
  incomingFromCashOut,
  playCard,
  PlayerSide,
  RoundPhase,
  type AbilityChoice,
  type Card,
  type PlayCardOptions,
  type TrickCard,
  type TrickResolution,
} from '../../warCouncil'
import {
  applyDamage,
  BuffTier,
  DuelSide,
  hasPendingTimebomb,
  isEncounterResolved,
  NO_PENDING_TIMEBOMB,
  PayoutOutcome,
  queueTimebomb,
  tickApplyPayout,
  TIMEBOMB_DAMAGE,
  type EncounterState,
  type TimebombDamage,
  type TrickPayoutEvent,
} from '../../hunt'
import { cheatArmed, type RoundUiState } from './roundUiState'
import { buffHandInputFor } from './buffRoundState'
import { advanceQuarryFollow, deriveResolvedTrick } from './quarryAdvance'

/**
 * Every `PlayCardOptions` field a resolving trick needs: D1's Timebomb owed from EARLIER tricks, read
 * off the encounter's queue, plus DLR-92 AC4's bank-climb bonus and DLR-122's rank-tier ladder,
 * both mirrored straight from state.
 *
 * One statement, read by both `playCard` call sites: the player's follow in `commit` and the
 * Quarry's in `advanceQuarryFollow`. Two readings of "what is pending" is exactly how a hit gets
 * paid twice or skipped, or a bonus applies to one side's follow and not the other's.
 *
 * EXPORTED on DLR-117: a THIRD reader, `cardDamage.ts`'s preview, which must assemble the
 * same five fields the two commit call sites do. A preview that read the queue itself would
 * be exactly the second reading this docblock already warns about.
 */
export function playOptions(state: RoundUiState): PlayCardOptions {
  return {
    timebombToPlayer: state.encounter.pendingTimebomb[DuelSide.Player],
    timebombToQuarry: state.encounter.pendingTimebomb[DuelSide.Quarry],
    blastGuarded: state.blastGuardHeld,
    bankClimbBonus: state.bankClimbBonus,
    // DLR-122 — the FIFTH field, in the one assembly all three readers share. A preview or a
    // commit that read the run's ladder itself would be exactly the second reading this
    // docblock already warns about.
    playerRankTiers: state.rankTiers,
    // DLR-125 — the SIXTH field, in the one assembly all three readers share. This is what makes
    // DLR-117's preview inherit buff contributions with no arithmetic of its own: it hands a
    // hypothetical resolution to `applyResolution` and reads the health delta, so a buffed
    // multiplier and a Blade bonus arrive in that delta for free.
    buffs: buffHandInputFor(state),
  }
}

/**
 * One trick's whole effect on the encounter, in the one place it is stated. FOUR steps, and the
 * ORDER IS LOAD-BEARING (DLR-109 adds the fourth):
 *
 *   1. the trick's own damage — which already folds in any Timebomb detonating this trick, via
 *      `playOptions` — is applied;
 *   2. the paid Timebomb queue is cleared;
 *   3. this trick's own prime is booked for the next trick;
 *   4. the queued Apply Damage payout ticks, and lands if it is due.
 *
 * Step 4 is LAST, and that is the whole ordering rule when a payout and a ticking Timebomb are
 * both outstanding. DLR-141 split AC3's old wipe into a reduce/evaporate pair, both inside
 * `applyDamage`: step 1 has already run `reduceApplyPayoutOnHit` on any trick that cost the
 * player health, so a Timebomb detonating against the player on the trick a payout was due
 * REDUCES that payout to `APPLY_DAMAGE_HIT_RETENTION` of its value (floored, clamped to a
 * minimum of `1`; `null` only when the encounter itself resolved) rather than destroying it
 * outright — and it is this reduced figure,
 * not the original, that lands if step 4 also settles the payout this same trick. Putting the
 * tick anywhere earlier would let a player dodge the reduction by timing, which is the one thing
 * the criterion exists to prevent.
 *
 * The all-zero skip on step 1 avoids bumping `damageEventsApplied` for nothing, but does not
 * return early: a REPLACED clean loss (DLR-90 AC5) is an all-zero event that still owes a booking.
 */
export interface FoldedResolution {
  readonly encounter: EncounterState
  /** DLR-109 AC4 — the press-time unplayed count, and ONLY when a DELAYED payout is what resolved
   *  the encounter. `null` on every other path, including a kill by ordinary trick damage, which
   *  `captureUnplayed` still handles off the live hand. */
  readonly unplayedAtPress: number | null
  /** DLR-119 — what this fold did to a queued payout, for the felt to narrate. `null` when
   *  nothing was queued. REQUIRED, not optional: an omitted field narrates nothing, silently. */
  readonly payout: TrickPayoutEvent | null
}

/**
 * EXPORTED on DLR-117 so the hand fan's per-card preview can ask THIS function what a
 * hypothetical trick would cost instead of re-deriving the arithmetic. That is the whole
 * anti-drift argument for the preview: it reads a health DELTA off the real fold, so shield
 * absorption, the zero floor, and the payout-destroyed-by-a-hit rule are inherited rather
 * than restated. `projectedDepletion` (`duelHealthBars.ts`) is the cautionary case — it had
 * its own absorption arithmetic and it lied until DLR-115.
 */
export function applyResolution(
  encounter: EncounterState,
  resolution: TrickResolution,
  handEnding: boolean,
  // DLR-132 — the primed card's OWN tier's damage pair. `commit` threads `state.primedTimebombDamage`
  // here, falling back to bronze when nothing is primed — unreachable in practice, since a
  // `timebombTarget` implies a primed card implies a spend, but the reducer must stay throw-free
  // and a non-null assertion would be exactly the "plausible thing that type-checks" this codebase
  // throws about elsewhere. The default keeps every OTHER caller (fixtures, previews) compiling
  // and behaving exactly as bronze always has, without passing one.
  timebombDamage: TimebombDamage = TIMEBOMB_DAMAGE[BuffTier.Bronze],
): FoldedResolution {
  if (isEncounterResolved(encounter)) return { encounter, unplayedAtPress: null, payout: null }
  const queued = encounter.pendingApplyPayout
  const incoming = incomingFrom(resolution)
  const paid =
    incoming[DuelSide.Player] === 0 && incoming[DuelSide.Quarry] === 0
      ? encounter
      : applyDamage(encounter, incoming)
  // DLR-141 — `applyDamage`'s two remaining fates, read off the field across that call.
  // `reduceApplyPayoutOnHit` clamps its floor at `1`, so a queued payout can only go to `null`
  // when the encounter resolved this trick (EVAPORATED); a smaller `cashOut` still standing is
  // REDUCED; unchanged is no event at all.
  const payoutEvent: TrickPayoutEvent | null =
    queued === null
      ? null
      : paid.pendingApplyPayout === null
        ? { outcome: PayoutOutcome.Evaporated, cashOut: queued.cashOut, remaining: null }
        : // Reference inequality, not a `cashOut` value comparison: `reduceApplyPayoutOnHit`
          // always returns a NEW object (`{ ...pending, cashOut }`) when it reduces, and
          // returns the SAME reference untouched when no hit landed this trick. Comparing
          // `cashOut` values instead would only detect a reduction because
          // `APPLY_DAMAGE_HIT_RETENTION` happens to be `< 1` today — raise that tunable to
          // `1.0` and a value comparison would silently stop reporting `Reduced` even though a
          // hit landed. Reference inequality detects "a reduction happened" independent of what
          // fraction the reduction produced.
          paid.pendingApplyPayout !== queued
          ? {
              outcome: PayoutOutcome.Reduced,
              cashOut: queued.cashOut,
              remaining: paid.pendingApplyPayout.cashOut,
            }
          : null
  const cleared = hasPendingTimebomb(paid)
    ? { ...paid, pendingTimebomb: NO_PENDING_TIMEBOMB }
    : paid
  const booked =
    resolution.timebombTarget === null
      ? cleared
      : queueTimebomb(cleared, resolution.timebombTarget, timebombDamage)
  return settleApplyPayout(booked, handEnding, payoutEvent)
}

/**
 * The payout half of `applyResolution`, split out so the four-step order above reads as four
 * steps. Ticks the queue and, when a payout comes due, deals it through `incomingFromCashOut` —
 * the ONE sanctioned `PlayerSide -> DuelSide` crossing for this figure — guarding
 * `isEncounterResolved` for the reason `applyResolution` already guards it: a dead Quarry needs no
 * further damage, and a dead player has already had the payout nulled by the `winner !== null`
 * (Evaporated) branch above, not by a hit's ordinary reduction.
 */
function settleApplyPayout(
  encounter: EncounterState,
  handEnding: boolean,
  payoutEvent: TrickPayoutEvent | null,
): FoldedResolution {
  const tick = tickApplyPayout(encounter.pendingApplyPayout, handEnding)
  if (tick.due === null) {
    // A no-payout trick allocates nothing: `tick.pending` is `null`, equal to the field it came
    // from, so the input object is returned untouched rather than a spread copy of itself.
    return tick.pending === encounter.pendingApplyPayout
      ? { encounter, unplayedAtPress: null, payout: payoutEvent }
      : {
          encounter: { ...encounter, pendingApplyPayout: tick.pending },
          unplayedAtPress: null,
          payout: payoutEvent,
        }
  }
  const cleared: EncounterState = { ...encounter, pendingApplyPayout: null }
  const settled = isEncounterResolved(cleared)
    ? cleared
    : applyDamage(cleared, incomingFromCashOut(tick.due.cashOut))
  return {
    encounter: settled,
    unplayedAtPress: isEncounterResolved(settled) ? tick.due.unplayedAtPress : null,
    // DLR-141 — a trick that BOTH reduces and settles a payout in the same fold reports it PAID
    // at the reduced figure: `tick.due.cashOut` is already the post-reduction value, so the
    // number the player is told is the number that actually landed. The intermediate `Reduced`
    // event this fold may have produced is deliberately overwritten here, not composed with it.
    payout: { outcome: PayoutOutcome.Paid, cashOut: tick.due.cashOut, remaining: null },
  }
}

/** Commits `cardToPlay` for the player, then advances the opponent when the player led. */
export function commit(
  state: RoundUiState,
  cardToPlay: Card,
  choice?: AbilityChoice,
): RoundUiState {
  const wasArmed = cheatArmed(state)
  const result = playCard(state.round, PlayerSide.Player, cardToPlay, choice, {
    ...playOptions(state),
    ...(wasArmed ? { ignoreFollowSuit: true } : {}),
  })
  if (!result.ok) {
    // A rejection is NOT a commit (AC7), so the Cheat survives and stays armed — the player can
    // try another card without paying twice.
    return { ...state, armed: null, prompt: null, rejection: result.reason }
  }

  // AC7's rule, unchanged: consumed on ANY successful commit while live, even if the card was
  // legal anyway. No "was it needed" check: that would put a legality judgement in the reducer
  // that `legalMoves` already owns, and would make arming free. Only the accounting moved — a
  // Cheat is a paid-for duration now, not a held card, so `Math.max` guards the floor instead of
  // how the retired src/hunt/cheats.ts's `removeCheat` guarded membership.
  const cheatTricksRemaining = wasArmed
    ? Math.max(0, state.cheatTricksRemaining - 1)
    : state.cheatTricksRemaining

  const timebombDamage = state.primedTimebombDamage ?? TIMEBOMB_DAMAGE[BuffTier.Bronze]
  const playedCard: TrickCard = { side: PlayerSide.Player, card: cardToPlay }
  const resolvedTrick = deriveResolvedTrick(state.round, result.state, playedCard)
  const folded = resolvedTrick
    ? applyResolution(
        state.encounter,
        resolvedTrick.resolution,
        result.state.phase === RoundPhase.Complete,
        timebombDamage,
      )
    : null
  const settled: RoundUiState = {
    ...state,
    round: result.state,
    armed: null,
    prompt: null,
    rejection: null,
    resolvedTrick:
      resolvedTrick !== null && folded !== null
        ? {
            ...resolvedTrick,
            payout: folded.payout,
            timebombDamage:
              resolvedTrick.resolution.timebombTarget === null ? null : state.primedTimebombDamage,
          }
        : resolvedTrick,
    encounter: folded ? folded.encounter : state.encounter,
    // DLR-109 AC4 — a DELAYED payout's press-time count, threaded in ONLY when nothing has
    // already frozen this field. The null check IS `captureUnplayed`'s "has this already been
    // captured" test, so this line and that function must never fight over the field.
    unplayedAtResolve: state.unplayedAtResolve ?? folded?.unplayedAtPress ?? null,
    cheatTricksRemaining,
    // AC4 — consumed exactly when it suppressed a reset, which `resolveTrickBank` decided. The
    // reducer does not re-derive "did the Guard matter" — that would be a second reading of one
    // rule, and the two would drift.
    blastGuardHeld: resolvedTrick?.resolution.blastGuardSpent ? false : state.blastGuardHeld,
  }

  if (resolvedTrick) {
    return settled
  }

  // The player led — advance the opponent in the same commit. `settled`, not `state`, so the
  // Quarry's follow reads the queue as the player's own commit left it.
  const advanced = advanceQuarryFollow(result.state, playOptions(settled))
  const quarryFolded = advanced.resolvedTrick
    ? applyResolution(
        settled.encounter,
        advanced.resolvedTrick.resolution,
        advanced.round.phase === RoundPhase.Complete,
        timebombDamage,
      )
    : null
  return {
    ...settled,
    round: advanced.round,
    resolvedTrick:
      advanced.resolvedTrick !== null && quarryFolded !== null
        ? {
            ...advanced.resolvedTrick,
            payout: quarryFolded.payout,
            timebombDamage:
              advanced.resolvedTrick.resolution.timebombTarget === null
                ? null
                : settled.primedTimebombDamage,
          }
        : advanced.resolvedTrick,
    cpuFault: advanced.cpuFault,
    encounter: quarryFolded ? quarryFolded.encounter : settled.encounter,
    unplayedAtResolve: settled.unplayedAtResolve ?? quarryFolded?.unplayedAtPress ?? null,
    blastGuardHeld: advanced.resolvedTrick?.resolution.blastGuardSpent
      ? false
      : settled.blastGuardHeld,
  }
}
