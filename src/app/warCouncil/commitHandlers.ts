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
  applyPot,
  containsCard,
  incomingFrom,
  incomingFromPot,
  playCard,
  potValue,
  PlayerSide,
  type AbilityChoice,
  type Card,
  type PlayCardOptions,
  type StreakState,
  type TrickCard,
  type TrickResolution,
} from '../../warCouncil'
import {
  applyDamage,
  BASE_DAMAGE,
  BuffTier,
  DuelSide,
  hasPendingTimebomb,
  isEncounterResolved,
  NO_PENDING_TIMEBOMB,
  queueTimebomb,
  TIMEBOMB_DAMAGE,
  type EncounterState,
  type TimebombDamage,
} from '../../hunt'
import {
  cheatArmed,
  offeredBuffs,
  type ResolutionView,
  type ResolvedTrick,
  type RoundUiState,
} from './roundUiState'
import { buffHandInputFor } from './buffRoundState'
import { advanceQuarryFollow, deriveResolvedTrick } from './quarryAdvance'
import { resolutionBeatsFor } from './resolutionBeats'
import { liftDetonatedMark, liftExpiredMarks } from './timebombMarks'

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
    baseDamageBonus: state.baseDamageBonus,
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
 * One trick's whole effect on the encounter, in the one place it is stated. THREE steps, and the
 * ORDER IS LOAD-BEARING:
 *
 *   1. the trick's own damage — which already folds in any Timebomb detonating this trick, via
 *      `playOptions` — is applied;
 *   2. the paid Timebomb queue is cleared;
 *   3. this trick's own prime is booked for the next trick.
 *
 * DLR-156 Phase 4 — the fourth step, the queued Apply Damage payout's tick, is GONE with the
 * queue itself: applying now happens once, immediately, through `applyPot` on the resolution
 * screen (Phase 5), not through a delayed settle folded in here.
 *
 * The all-zero skip on step 1 avoids bumping `damageEventsApplied` for nothing, but does not
 * return early: a REPLACED clean loss (DLR-90 AC5) is an all-zero event that still owes a booking.
 */
export interface FoldedResolution {
  readonly encounter: EncounterState
}

/**
 * EXPORTED on DLR-117 so the hand fan's per-card preview can ask THIS function what a
 * hypothetical trick would cost instead of re-deriving the arithmetic. That is the whole
 * anti-drift argument for the preview: it reads a health DELTA off the real fold, so shield
 * absorption and the zero floor are inherited rather than restated. `projectedDepletion`
 * (`duelHealthBars.ts`) is the cautionary case — it had its own absorption arithmetic and it
 * lied until DLR-115.
 */
export function applyResolution(
  encounter: EncounterState,
  resolution: TrickResolution,
  // DLR-132 — the primed card's OWN tier's damage pair. `commit` threads `state.primedTimebombDamage`
  // here, falling back to bronze when nothing is primed — unreachable in practice, since a
  // `timebombTarget` implies a primed card implies a spend, but the reducer must stay throw-free
  // and a non-null assertion would be exactly the "plausible thing that type-checks" this codebase
  // throws about elsewhere. The default keeps every OTHER caller (fixtures, previews) compiling
  // and behaving exactly as bronze always has, without passing one.
  timebombDamage: TimebombDamage = TIMEBOMB_DAMAGE[BuffTier.Bronze],
  // R3 — the fuse expired with the card still held. Booked through `queueTimebomb`, the IDENTICAL
  // path a played bomb takes (below), so the bank reset and the Blast Guard's absorption are
  // inherited rather than restated (Assumption 13). `queueTimebomb` itself indexes the pair by
  // `target`, so passing the PLAYER side's damage happens by naming `DuelSide.Player` as the
  // target — the same figure `TIMEBOMB_DAMAGE[tier][DuelSide.Player]` gives (Assumption 14).
  fuseExpired = false,
): FoldedResolution {
  if (isEncounterResolved(encounter)) return { encounter }
  const incoming = incomingFrom(resolution)
  const paid =
    incoming[DuelSide.Player] === 0 && incoming[DuelSide.Quarry] === 0
      ? encounter
      : applyDamage(encounter, incoming)
  const cleared = hasPendingTimebomb(paid)
    ? { ...paid, pendingTimebomb: NO_PENDING_TIMEBOMB }
    : paid
  const booked =
    resolution.timebombTarget === null
      ? cleared
      : queueTimebomb(cleared, resolution.timebombTarget, timebombDamage)
  const withFuse = fuseExpired ? queueTimebomb(booked, DuelSide.Player, timebombDamage) : booked
  return { encounter: withFuse }
}

/**
 * DLR-156 AC3/AC14 — builds the resolution screen's whole content on the `null` -> non-null edge
 * of `resolvedTrick`, the SAME edge `foldBuffOutcome` and `openWindowOnTrickResolved` fire on.
 * Called exactly ONCE per resolved trick, inside `commit` — never per render and never per beat
 * (`plan.md` → Runtime quality notes). `resolutionBeatsFor` runs no rule of its own; it only
 * replays what `resolveTrickBank` already decided.
 *
 * `before` is `state.round.total`/`.roll` — the streak as it stood BEFORE this trick, which is
 * exactly `state.round`'s figures at every call site: the completing play is always the last
 * thing `commit` does with `state.round`, so nothing has touched `total`/`roll` yet by the time
 * this function reads them.
 */
function resolutionViewFor(
  state: RoundUiState,
  resolvedTrick: ResolvedTrick,
  trickNumber: number,
): ResolutionView {
  const before: StreakState = { total: state.round.total, roll: state.round.roll }
  // DLR-145 — the pile AND the cards spent out of it this trick, the same union
  // `buffHandInputFor`/`firedOncePerHandIds` read, so a card consumed on the trick it fired is
  // still resolvable by id here.
  const candidates = [...offeredBuffs(state), ...state.buffActivation.spentThisTrick]
  const { resolution } = resolvedTrick
  return {
    cards: resolvedTrick.cards,
    winner: resolvedTrick.winner,
    resolution,
    beats: resolutionBeatsFor(resolution, candidates, before),
    trickNumber,
    // AC2 — the bare rule: the player may fire nothing next trick, so this is a FLOOR, not a
    // prediction of what the next trick will actually pay.
    nextPotFloor: potValue(resolution.total + BASE_DAMAGE, resolution.roll + 1),
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

  // R3 — the fuse counts trick RESOLUTIONS, and only while the primed card is still in hand
  // (Assumption 12). A card played into this trick has left the hand, so its fuse stops rather
  // than ticking to a detonation the player already avoided. Every successful commit here
  // completes a trick's resolution within this same call — either this play is the follow
  // (`resolvedTrick` below), or it is the lead and the Quarry's automatic follow resolves it a
  // few lines further down — so decrementing beside Cheat's own decrement (above) counts exactly
  // one resolution per commit, matching that field's own cadence.
  const nextHand = result.state.hands[PlayerSide.Player]
  const primedStillHeld =
    state.timebombFuseRemaining > 0 &&
    state.round.primedCards.some((held) => containsCard(nextHand, held))
  const timebombFuseRemaining = primedStillHeld ? Math.max(0, state.timebombFuseRemaining - 1) : 0
  // R3 — the fuse expired with the card still held. Booked through `queueTimebomb` inside
  // `applyResolution`, the IDENTICAL path a played bomb takes, so the bank-and-multiplier reset,
  // the Blast Guard's absorption and the forced cash-out are inherited rather than restated
  // (Assumption 13). The mark is lifted in the same transition (`liftExpiredMarks` below) so the
  // same card cannot detonate twice.
  const fuseExpired = primedStillHeld && timebombFuseRemaining === 0

  const timebombDamage = state.primedTimebombDamage ?? TIMEBOMB_DAMAGE[BuffTier.Bronze]
  const playedCard: TrickCard = { side: PlayerSide.Player, card: cardToPlay }
  const resolvedTrick = deriveResolvedTrick(state.round, result.state, playedCard)
  // DLR-154 FIX B — the ORDINARY way a Timebomb detonates: a primed card is played and the trick
  // it lands in resolves the mark, as opposed to `fuseExpired`'s in-hand expiry. Both are
  // detonations and both must clear the same two things (`timebombBuff`, the felt mark) — see
  // `liftDetonatedMark`'s docblock for why this one needs a different lift than `fuseExpired`'s.
  const detonatedByPlay = resolvedTrick !== null && resolvedTrick.resolution.timebombTarget !== null
  const folded = resolvedTrick
    ? applyResolution(state.encounter, resolvedTrick.resolution, timebombDamage, fuseExpired)
    : null
  // DLR-156 AC3/AC14 — the ONE `null` -> non-null edge for THIS commit's own resolving play.
  // Reused for both `resolvedTrick` (the felt's existing hold-until-CarryOn reveal) and
  // `resolution` (the new screen), so the two can never disagree about which trick this is.
  const resolvedTrickWithTimebomb: ResolvedTrick | null =
    resolvedTrick !== null && folded !== null
      ? {
          ...resolvedTrick,
          timebombDamage:
            resolvedTrick.resolution.timebombTarget === null ? null : state.primedTimebombDamage,
        }
      : resolvedTrick
  const resolution: ResolutionView | null =
    resolvedTrickWithTimebomb !== null
      ? resolutionViewFor(state, resolvedTrickWithTimebomb, result.state.tricksPlayed)
      : state.resolution
  const settled: RoundUiState = {
    ...state,
    round: liftDetonatedMark(
      liftExpiredMarks(result.state, state.round.primedCards, nextHand, fuseExpired),
      detonatedByPlay && resolvedTrick !== null ? resolvedTrick.cards : [],
    ),
    armed: null,
    prompt: null,
    rejection: null,
    resolvedTrick: resolvedTrickWithTimebomb,
    resolution,
    encounter: folded ? folded.encounter : state.encounter,
    cheatTricksRemaining,
    timebombFuseRemaining,
    // DLR-154 FIX 2/FIX B — a detonation clears `timebombBuff`, whether the mark expired in hand
    // (`fuseExpired`) or the marked card was just played into a trick that resolved
    // (`detonatedByPlay`). Either edge, left unclear, keeps the riding row naming a card that has
    // already paid out and had its mark lifted (above).
    timebombBuff: fuseExpired || detonatedByPlay ? null : state.timebombBuff,
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
  const advanced = advanceQuarryFollow(settled.round, playOptions(settled))
  const quarryFolded = advanced.resolvedTrick
    ? applyResolution(
        settled.encounter,
        advanced.resolvedTrick.resolution,
        timebombDamage,
        fuseExpired,
      )
    : null
  // DLR-154 FIX B — the SECOND resolution site: a Quarry follow can complete a trick the marked
  // card LED, so this branch needs its own detonation check, mirroring `detonatedByPlay` above.
  const detonatedByQuarryFollow =
    advanced.resolvedTrick !== null && advanced.resolvedTrick.resolution.timebombTarget !== null
  // DLR-156 AC3/AC14 — the SECOND `null` -> non-null edge: a trick the player LED that only
  // resolves once the Quarry's automatic follow lands, later in this same commit.
  const advancedResolvedTrickWithTimebomb: ResolvedTrick | null =
    advanced.resolvedTrick !== null && quarryFolded !== null
      ? {
          ...advanced.resolvedTrick,
          timebombDamage:
            advanced.resolvedTrick.resolution.timebombTarget === null
              ? null
              : settled.primedTimebombDamage,
        }
      : advanced.resolvedTrick
  const advancedResolution: ResolutionView | null =
    advancedResolvedTrickWithTimebomb !== null
      ? resolutionViewFor(settled, advancedResolvedTrickWithTimebomb, advanced.round.tricksPlayed)
      : settled.resolution
  return {
    ...settled,
    round: liftDetonatedMark(
      advanced.round,
      detonatedByQuarryFollow && advanced.resolvedTrick !== null
        ? advanced.resolvedTrick.cards
        : [],
    ),
    resolvedTrick: advancedResolvedTrickWithTimebomb,
    resolution: advancedResolution,
    cpuFault: advanced.cpuFault,
    encounter: quarryFolded ? quarryFolded.encounter : settled.encounter,
    // DLR-154 FIX B — clears `timebombBuff` when the marked LEAD card's detonation resolves only
    // now, via the Quarry's follow. `settled.timebombBuff` already reflects the settled step's own
    // clearing (`fuseExpired`/`detonatedByPlay`), so this only narrows it further, never reopens it.
    timebombBuff: detonatedByQuarryFollow ? null : settled.timebombBuff,
    blastGuardHeld: advanced.resolvedTrick?.resolution.blastGuardSpent
      ? false
      : settled.blastGuardHeld,
  }
}

/**
 * DLR-156 AC5 — the resolution screen's Apply choice: deals `potValue(total, roll)` to the
 * Quarry, zeroes the streak, and closes the screen.
 *
 * TOTAL and GUARDED, per `plan.md` → Runtime quality notes: a `null` resolution is a no-op
 * returning `state` unchanged rather than a throw, because a throw inside an event handler
 * unmounts the tree (the discipline `primeTapped` already documents). An already-resolved
 * encounter is inert rather than a `RangeError` — `applyDamage` throws on one, exactly the
 * shape `applyResolution`'s own `isEncounterResolved` short-circuit exists to prevent, so this
 * function repeats that guard rather than trusting the caller never to reach it.
 *
 * DLR-156 Assumption 11 — the cut, unconstructible Debt Collector family's `applyDamagePressed`
 * trigger moves here: this is the only place a cash-out can happen now.
 */
export function applyPotAction(state: RoundUiState): RoundUiState {
  if (state.resolution === null) return state
  if (isEncounterResolved(state.encounter)) {
    return { ...state, resolution: null }
  }
  const { streak, dealt } = applyPot({ total: state.round.total, roll: state.round.roll })
  return {
    ...state,
    round: { ...state.round, total: streak.total, roll: streak.roll },
    encounter: applyDamage(state.encounter, incomingFromPot(dealt)),
    buffHand: { ...state.buffHand, applyDamagePressed: true },
    resolution: null,
  }
}

/** DLR-156 AC6 — the resolution screen's Roll over choice, and the hurt branch's only exit
 *  ("Onward"). Leaves `round.total`/`round.roll` exactly as they stand — already zero on the
 *  hurt branch (AC7) — and only closes the screen. `null`-guarded for `applyPotAction`'s stated
 *  reason. */
export function rollOverAction(state: RoundUiState): RoundUiState {
  if (state.resolution === null) return state
  return { ...state, resolution: null }
}
