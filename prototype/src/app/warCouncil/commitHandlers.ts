/**
 * The player's own commit — assembling the bank-climb options a resolving trick
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
  CardRank,
  incomingFrom,
  incomingFromPot,
  playCard,
  potValue,
  PlayerSide,
  sameCard,
  type AbilityChoice,
  type Card,
  type PlayCardOptions,
  type StreakState,
  type Suit,
  type TrickCard,
  type TrickResolution,
} from '../../warCouncil'
import {
  applyDamage,
  BASE_DAMAGE,
  DuelSide,
  isEncounterResolved,
  swapPileAfterWoodcutter,
  TREASURE_BASE_DAMAGE_STEP,
  type EncounterState,
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
import { deadBuffsFor } from './resolutionDeadBuffs'
import { potIsLethal } from './resolutionLethal'

/**
 * Every `PlayCardOptions` field a resolving trick needs: DLR-92 AC4's bank-climb bonus and
 * DLR-122's rank-tier ladder, both mirrored straight from state.
 *
 * One statement, read by both `playCard` call sites: the player's follow in `commit` and the
 * Quarry's in `advanceQuarryFollow`. Two readings of the same figure is exactly how a bonus
 * applies to one side's follow and not the other's.
 *
 * EXPORTED on DLR-117: a THIRD reader, `cardDamage.ts`'s preview, which must assemble the
 * same fields the two commit call sites do. A preview that read state itself would
 * be exactly the second reading this docblock already warns about.
 */
export function playOptions(state: RoundUiState): PlayCardOptions {
  return {
    // DLR-163 AC8 — the Whetstone's run-permanent figure PLUS this fight's earned figure, summed
    // in the ONE assembly all three readers share: the player's commit, the Quarry's follow, and
    // `cardDamage.ts`'s preview. That is what makes the preview inherit the 7 with no arithmetic
    // of its own. Kept as two fields on the state and summed here rather than merged into one:
    // a Whetstone lasts the run and this dies at the fight boundary.
    baseDamageBonus: state.baseDamageBonus + state.treasureDamageBonus,
    // DLR-122 — in the one assembly all three readers share. A preview or a
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
 * One trick's whole effect on the encounter, in the one place it is stated: the trick's own damage
 * is applied, and nothing else.
 *
 * DLR-156 Phase 4 — the queued Apply Damage payout's tick is GONE with the queue itself: applying
 * now happens once, immediately, through `applyPot` on the resolution screen (Phase 5), not
 * through a delayed settle folded in here.
 *
 * The all-zero skip avoids bumping `damageEventsApplied` for nothing.
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
): FoldedResolution {
  if (isEncounterResolved(encounter)) return { encounter }
  const incoming = incomingFrom(resolution)
  const paid =
    incoming[DuelSide.Player] === 0 && incoming[DuelSide.Quarry] === 0
      ? encounter
      : applyDamage(encounter, incoming)
  return { encounter: paid }
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
  /** DLR-160 AC6 — the encounter AFTER this trick's damage was folded in, never `state.encounter`.
   *  The pot has not been dealt yet (only `applyPot` deals it), but the trick's own damage has. */
  encounterAfterFold: EncounterState,
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
    // AC2 — the cards in THIS trick carrying a skull. DLR-167 fix pass: READ off the resolved
    // trick rather than re-derived here, so the felt's well and this panel share ONE value and
    // cannot word the same trick two ways. `deriveResolvedTrick` captures it from the PRE-play
    // state, which is the only state that still carries a curse.
    skulledInTrick: resolvedTrick.skulledInTrick,
    // AC7 — the decree in force as the trick resolved.
    decree: state.round.decree,
    // AC3 — armed minus fired, against the SAME candidate union the beats resolve against.
    deadBuffs: deadBuffsFor(
      state.buffActivation.activatedThisTrick,
      resolution.firedBuffIds,
      candidates,
    ),
    // AC6 — asked of the same path `applyPotAction` takes, never a comparison of two numbers.
    potIsLethal: potIsLethal(encounterAfterFold, potValue(resolution.total, resolution.roll)),
  }
}

/**
 * DLR-163 AC7 — the suit a skull was minted into by this transition, or `null`.
 *
 * A comparison of the two `skulledCards` lists rather than a flag threaded out of `playCard`: the
 * engine's rule is "the drawn card joins `skulledCards`", and asking the state what changed keeps
 * the felt from having to learn the Quarry's swap. A pure derivation of two values, so StrictMode's
 * double render recomputes the same answer.
 */
function skullArrivedSuit(before: readonly Card[], after: readonly Card[]): Suit | null {
  if (after.length <= before.length) return null
  const minted = after.find((card) => !before.some((b) => sameCard(b, card)))
  return minted?.suit ?? null
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
    // DLR-174 — `loadout: null` too: a rejected commit must not leave the shared poise holder
    // set behind it, or the gallery pops open uninvited on the next render.
    return { ...state, armed: null, prompt: null, rejection: result.reason, loadout: null }
  }

  // AC7's rule, unchanged: consumed on ANY successful commit while live, even if the card was
  // legal anyway. No "was it needed" check: that would put a legality judgement in the reducer
  // that `legalMoves` already owns, and would make arming free. Only the accounting moved — a
  // Cheat is a paid-for duration now, not a held card, so `Math.max` guards the floor instead of
  // how the retired src/hunt/cheats.ts's `removeCheat` guarded membership.
  const cheatTricksRemaining = wasArmed
    ? Math.max(0, state.cheatTricksRemaining - 1)
    : state.cheatTricksRemaining

  const playedCard: TrickCard = { side: PlayerSide.Player, card: cardToPlay }
  const resolvedTrick = deriveResolvedTrick(state.round, result.state, playedCard)
  const folded = resolvedTrick ? applyResolution(state.encounter, resolvedTrick.resolution) : null
  // DLR-156 AC3/AC14 — the ONE `null` -> non-null edge for THIS commit's own resolving play.
  // Reused for both `resolvedTrick` (the felt's existing hold-until-CarryOn reveal) and
  // `resolution` (the new screen), so the two can never disagree about which trick this is.
  const resolution: ResolutionView | null =
    resolvedTrick !== null && folded !== null
      ? resolutionViewFor(
          state,
          resolvedTrick,
          result.state.tricksPlayed,
          folded.encounter ?? state.encounter,
        )
      : state.resolution
  // DLR-163 AC5 — the PLAYER'S 5 only. The rule itself is `swapPileAfterWoodcutter`, in
  // `src/hunt/`, so the arithmetic is unit-testable with no renderer and the reducer holds no
  // reading of its own. `commit` is the single place a player's card is committed, which is what
  // makes one call site sufficient. The discard action's own decrement (`discardHandlers.ts`) is
  // untouched: the two never run in the same transition.
  const raisedSwap = cardToPlay.rank === CardRank.Woodcutter
  const swap = raisedSwap
    ? swapPileAfterWoodcutter({
        discardsRemaining: state.discardsRemaining,
        discardCapBonus: state.discardCapBonus,
      })
    : { discardsRemaining: state.discardsRemaining, discardCapBonus: state.discardCapBonus }

  const settled: RoundUiState = {
    ...state,
    round: result.state,
    armed: null,
    prompt: null,
    rejection: null,
    // DLR-174 — a played card must not leave the gallery popping open behind it: without this,
    // `loadoutOpen` stayed true after a commit (the raise that armed this very card had already
    // set it), and the panel would render onto the stage the instant the next trick's window
    // opened.
    loadout: null,
    resolvedTrick,
    resolution,
    encounter: folded ? folded.encounter : state.encounter,
    cheatTricksRemaining,
    discardsRemaining: swap.discardsRemaining,
    discardCapBonus: swap.discardCapBonus,
    // DLR-163 AC6/AC7 — both set here and cleared by the NEXT commit, not by a timer.
    swapJustRaised: raisedSwap,
    skullArrivedIn: skullArrivedSuit(state.round.skulledCards, result.state.skulledCards),
    // DLR-163 AC8 — the fight's figure climbs only AFTER this trick resolved, which is what makes
    // "for the rest of the fight" true: `playOptions(state)` above was read with the figure as it
    // stood BEFORE this trick, so the trick that earned the bonus does not also spend it.
    treasureDamageBonus:
      resolvedTrick?.resolution.treasureBonusEarned === true
        ? state.treasureDamageBonus + TREASURE_BASE_DAMAGE_STEP
        : state.treasureDamageBonus,
  }

  if (resolvedTrick) {
    return settled
  }

  // The player led — advance the opponent in the same commit. `settled`, not `state`, so the
  // Quarry's follow reads the felt as the player's own commit left it.
  const advanced = advanceQuarryFollow(settled.round, playOptions(settled))
  const quarryFolded = advanced.resolvedTrick
    ? applyResolution(settled.encounter, advanced.resolvedTrick.resolution)
    : null
  // DLR-156 AC3/AC14 — the SECOND `null` -> non-null edge: a trick the player LED that only
  // resolves once the Quarry's automatic follow lands, later in this same commit.
  const advancedResolution: ResolutionView | null =
    advanced.resolvedTrick !== null && quarryFolded !== null
      ? resolutionViewFor(
          settled,
          advanced.resolvedTrick,
          advanced.round.tricksPlayed,
          quarryFolded.encounter ?? settled.encounter,
        )
      : settled.resolution
  return {
    ...settled,
    round: advanced.round,
    resolvedTrick: advanced.resolvedTrick,
    resolution: advancedResolution,
    cpuFault: advanced.cpuFault,
    encounter: quarryFolded ? quarryFolded.encounter : settled.encounter,
    // DLR-163 AC8 — the SECOND resolution site, and the ordering is load-bearing for the same
    // reason: `playOptions(settled)` above was read with `settled.treasureDamageBonus`, which has
    // NOT yet climbed for the trick it is about to resolve. Swapping these two would let a 7 pay
    // its own trick, which contradicts "for the rest of the fight".
    treasureDamageBonus:
      advanced.resolvedTrick?.resolution.treasureBonusEarned === true
        ? settled.treasureDamageBonus + TREASURE_BASE_DAMAGE_STEP
        : settled.treasureDamageBonus,
    // DLR-163 AC7 — the Quarry's own 5 lands HERE, in its automatic follow, which is the common
    // case. Compared against `settled.round`, the state the player's commit left.
    skullArrivedIn:
      skullArrivedSuit(settled.round.skulledCards, advanced.round.skulledCards) ??
      settled.skullArrivedIn,
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
