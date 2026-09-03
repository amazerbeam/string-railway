import { DuelSide, isEncounterResolved, type Coins, type Health } from '../../hunt'
import {
  discardRefusalFor,
  CardRank,
  PlayerSide,
  RoundPhase,
  currentTurn,
  legalMoves,
  sameCard,
  suitShape,
  type Card,
} from '../../warCouncil'
import type { WarCouncilRoundResult } from '../warCouncilMount'
import ActionBar from './ActionBar'
import { loadoutBarRefusalFor, loadoutDoorOpen } from './buffHandlers'
import BuffGallery from './BuffGallery'
import { ridingTimebombId } from './buffRideModel'
import { useBuffRide } from './buffRideProps'
import BuffRideZone from './BuffRideZone'
import FeltRail from './FeltRail'
import FeltStage from './FeltStage'
import { sortHandForDisplay } from './handOrder'
import { telegraphedLeadSuit } from './quarryTelegraph'
import QuarryShape from './QuarryShape'
import { barsForRound } from './roundBars'
import { handSummaryFor } from './roundHandSummary'
import { deriveHint } from './roundHint'
import PotCard from './PotCard'
import { roundResultFor } from './roundResult'
import {
  actionBarProps,
  buffGalleryProps,
  feltRailProps,
  feltStageProps,
} from './roundControlsProps'
import {
  canAct,
  cheatArmed,
  discardSelecting,
  discardStock,
  loadoutOpen,
  offeredBuffs,
  timebombArmed,
  timebombLive,
  RoundUiActionKind,
  type ResolutionView,
  type RoundUiAction,
  type RoundUiState,
} from './roundUiState'
import RoundStatusBand from './RoundStatusBand'
import { useTableCardMotion } from './useTableCardMotion'
import { useDebugRoundState } from './useDebugRoundState'
import './warCouncil.css'
import './warCouncilTable.css'
import './warCouncilCards.css'
import './warCouncilCardFace.css'
import './warCouncilCardTip.css'
import './warCouncilHunt.css'
import './warCouncilHealthBars.css'
import './warCouncilHand.css'
import './warCouncilActionBar.css'
import './warCouncilFeltRail.css'
import './warCouncilBuffGallery.css'

export interface WarCouncilTableProps {
  readonly ui: RoundUiState
  readonly dispatch: (action: RoundUiAction) => void
  readonly maxHealth: Readonly<Record<DuelSide, Health>>
  readonly runLabel: string
  readonly coins: Coins
  readonly quarryLabel: string
  /** DLR-160 (widened) — the resolution to show on the pot card, or `null` while the felt is up.
   *  `WarCouncilRound.tsx` is what gates this on `ui.resolution !== null && showResolution` (the
   *  trick dwell): this component decides nothing about WHEN a resolution is shown, only HOW. */
  readonly resolution: ResolutionView | null
  readonly onComplete: (result: WarCouncilRoundResult) => void
}

/**
 * DLR-156 Task 14 — the felt itself, split wholesale out of `WarCouncilRound.tsx` (that file's
 * own docblock explains why it could not absorb a second screen). PURE MOVE: every derivation and
 * handler below is verbatim from the mount component, retargeted to read `ui`/`dispatch` from
 * props rather than from a reducer this component owns. `WarCouncilRound.tsx` owns the reducer and
 * the switch between this component and `TrickResolutionScreen`; this component decides nothing
 * about which screen is showing.
 */
export default function WarCouncilTable({
  ui,
  dispatch,
  maxHealth,
  runLabel,
  coins,
  quarryLabel,
  resolution,
  onComplete,
}: WarCouncilTableProps) {
  const encounterOver = isEncounterResolved(ui.encounter)
  const roundComplete = ui.round.phase === RoundPhase.Complete

  // DLR-156 AC15 — the played card's own flight, hand to table. `flyPlayedCard` clones the armed
  // card's registered anchor and calls its landing callback once landed — see `handleTap` for the
  // commit-tap gate. Declared before `interactive` because that now reads `inFlight` directly.
  // DLR-156 review fix (Defender Critical) — the commit tap's dispatch is deferred to landing,
  // closed over the card that started the flight, while `ui.armed` does not change until then. A
  // still-enabled hand let a second tap on a DIFFERENT card land mid-flight: read as a fresh arm
  // (since `ui.armed` still pointed at the first card), it raced the first card's deferred
  // dispatch, which re-armed the first card instead of playing it — visually flown, nothing
  // committed. `inFlight` folding into `interactive` below is the fix: smaller than making the
  // dispatch stale-aware, and the hand is disabled the whole ~380ms flight regardless.
  // DLR-157 Task 7 — lifted into `useTableCardMotion.ts`, which itself wraps the shared
  // `useCardMotion` primitive; no behaviour changed in the move.
  const { flyPlayedCard, inFlight } = useTableCardMotion()

  // The SAME predicate the reducer gates on — moved to `roundUiState.ts` on DLR-94. Two readings
  // of one gate is how a greyed control and a reducer branch drift apart. `!inFlight` ANDs in
  // here (DLR-156 review fix) so every consumer — fan, action bar, hint — agrees flight blocks acting.
  const interactive = canAct(ui) && !inFlight

  // The SAME predicate the reducer commits with (`cheatArmed`), not a second reading of the
  // selection — two readings is how the fan's greying and a rejection reason drift apart.
  const legal = legalMoves(
    ui.round,
    PlayerSide.Player,
    cheatArmed(ui) ? { ignoreFollowSuit: true } : undefined,
  )

  // DLR-100 — `handInteractive` keeps the fan tappable during the
  // Quarry-to-lead gap, where `interactive` is false but a selection may still be open or opening.
  // DLR-154 FIX 1 — `timebombArmed(ui)` joins the OR for the same reason: an armed Timebomb
  // reinterprets the very next hand-card tap into a prime, and that targeting is reachable in the
  // same gap. Without this term every hand card rendered `disabled` and untabbable there.
  const discardRefusal = discardRefusalFor(discardStock(ui))
  const handInteractive = interactive || discardSelecting(ui) || timebombArmed(ui)

  useDebugRoundState({
    ui,
    interactive,
    legalCount: legal.length,
    discardRefusal,
    encounterOver,
    roundComplete,
  })

  // DLR-114 AC2 — the pile offered to the panel, and the ONE refusal the bar's own Apply Buff
  // button reads. `loadoutBarRefusalFor` lives in `buffHandlers.ts` rather than inline here: it is
  // its own small rule (a stand-in buff when the pile is non-empty, `discardWindowOpen` directly
  // when it is not), not a value merely assembled from state.
  const offered = offeredBuffs(ui)
  const loadoutRefusal = loadoutBarRefusalFor(ui)

  // DLR-101 — the whole assembly, including the booked-Timebomb band, lives in `roundBars.ts`.
  const bars = barsForRound(ui, maxHealth)

  const shape = suitShape(ui.round.hands[PlayerSide.Cpu], ui.round.skulledCards)

  // DLR-155 — extracted to `roundHandSummary.ts`, which carries the derivation's own reasoning.
  const handSummary = handSummaryFor(ui)

  const displayHand = sortHandForDisplay(ui.round.hands[PlayerSide.Player])

  // DLR-153 — the buff-ride surface, bundled behind one hook (`buffRideProps.ts`'s own docblock
  // says why it is a hook rather than a plain assembler like `actionBarProps`). Takes the RAW
  // reducer `dispatch` — it is the origin `dispatchClearingAnnouncement` below wraps, not a second
  // wrapped copy, and `handleRemoveBuff`'s own dispatch is what SETS the announcement this ticket
  // is about, so it must not clear the very message it is about to write.
  const buffRide = useBuffRide({ ui, dispatch, legal })

  // DLR-153 Fix 4 — every dispatch OTHER than the removal's own clears the transient "buff
  // removed" announcement, so it cannot outlive the very next player action and sit in place of
  // the hand's real hint (a rejection, whose turn it is) for an arbitrary number of further taps.
  // A single wrapper around `dispatch`, used everywhere `dispatch` reaches a control below, is
  // what makes this true of EVERY action — `ToggleLoadout`, `TapBuff`, applying damage, opening a
  // discard selection — rather than only the two hand actions this used to be scoped to.
  function dispatchClearingAnnouncement(action: RoundUiAction) {
    buffRide.clearRemovedAnnouncement()
    dispatch(action)
  }

  // The Quarry has chosen its lead but has not committed it, so the telegraph can be read
  // before the card lands. `currentTrick.length === 0` is what keeps this to leads only.
  const quarryToLead =
    !roundComplete &&
    !encounterOver &&
    ui.resolvedTrick === null &&
    ui.prompt === null &&
    ui.cpuFault === null &&
    currentTurn(ui.round) === PlayerSide.Cpu &&
    ui.round.currentTrick.length === 0

  const hint = deriveHint(ui, interactive, quarryToLead)

  // DLR-155 — ONE call per render, deliberately outside `QuarryShape`'s own row loop:
  // `quarryIntent` runs `chooseCpuCard` on every poll. No `useMemo` — no profiling evidence.
  const leadSuit = telegraphedLeadSuit(ui.round, quarryToLead)

  // DLR-153 Phase 8 Correction 1 — the touch path into a hover-only breakdown: `HandFan.tsx`
  // gates `onEnterCard` to a mouse pointer, so a tap pins the readout here instead (a SELECTION,
  // per the mockup's own rule for touch), through the same tap event.
  //
  // DLR-156 AC15 — the SECOND tap on an already-armed card is the one that actually plays it
  // (`roundReducer.ts`'s own `handleTapCard`, unchanged), so THAT is the tap the flight is wired
  // to: the dispatch that commits the card is deferred to `fly`'s landing callback, so the trick
  // resolves only once the card visibly arrives at the table (`ui-notes.md` §2). Every other tap
  // — arming a card, cancelling, marking a Timebomb, toggling a discard, or the Fox/Woodcutter
  // rank's own second tap (which OPENS A PROMPT rather than playing — `roundReducer.ts`'s SAME
  // rank check, mirrored here so a flight is never started for a card that is not about to leave
  // the hand) — dispatches immediately, exactly as before.
  function handleTap(card: Card) {
    // DLR-156 review fix — belt-and-suspenders alongside `interactive`'s `!inFlight` above: every
    // UI path here is already disabled mid-flight; this refuses a re-arm/commit regardless.
    if (inFlight) return
    buffRide.breakdownTarget.onEnterCard(card)
    const isCommitTap =
      ui.armed !== null &&
      sameCard(ui.armed, card) &&
      card.rank !== CardRank.Fox &&
      card.rank !== CardRank.Woodcutter &&
      !timebombArmed(ui) &&
      !discardSelecting(ui)
    if (!isCommitTap) {
      dispatchClearingAnnouncement({ kind: RoundUiActionKind.TapCard, card })
      return
    }
    // DLR-157 Task 7 — no source/target box to fly between (an unresolvable anchor) is no longer
    // a branch here: `useCardMotion`'s own instant-landing path calls `onLanded` synchronously in
    // that case, so this always reads as "commit exactly as before".
    flyPlayedCard(card, () =>
      dispatchClearingAnnouncement({ kind: RoundUiActionKind.TapCard, card }),
    )
  }

  function handleCancel() {
    // AC13 — Escape while priming must not strand a paid-for card. Routed through
    // `buffRide.handleRemoveBuff` ITSELF (DLR-154 FIX 3), not a raw `RemoveBuff` dispatch — that
    // hook is the ONLY place `removedAnnouncement` is set, so dispatching the action directly (as
    // this used to) reversed the felt but announced nothing to a screen reader.
    const timebombId = ridingTimebombId(ui)
    if (timebombId !== null && timebombLive(ui)) {
      buffRide.handleRemoveBuff(timebombId)
      return
    }
    dispatchClearingAnnouncement({ kind: RoundUiActionKind.CancelSelection })
  }

  /**
   * Shared by the held trick's own carry-on control, the pending Quarry lead's own control, and
   * the round-over panel's single control.
   *
   * Checked first and unconditionally: once the encounter has resolved, this reports the finished
   * hand upward regardless of what the felt is currently showing (DLR-82) — including the deciding
   * trick's own reveal, which now renders like any other before the tap that clears it lands here.
   * Otherwise this clears a held trick reveal and/or commits the Quarry's pending lead — or, once
   * nothing is held or pending and the round is complete, reports the finished hand the same way.
   */
  function handleCarryOn() {
    if (encounterOver) {
      onComplete(roundResultFor(ui))
      return
    }
    if (ui.resolvedTrick !== null || quarryToLead) {
      dispatchClearingAnnouncement({ kind: RoundUiActionKind.CarryOn })
      return
    }
    if (roundComplete) {
      onComplete(roundResultFor(ui))
    }
  }

  return (
    <div className="wc-shell">
      <RoundStatusBand
        tricksWon={ui.round.tricksWon}
        tricksPlayed={ui.round.tricksPlayed}
        opponentHandCount={ui.round.hands[PlayerSide.Cpu].length}
        roundComplete={roundComplete}
        bars={bars}
        runLabel={runLabel}
        coins={coins}
        quarryLabel={quarryLabel}
      />
      <aside className="wc-dossier">
        <QuarryShape shape={shape} leadSuit={leadSuit} />
        <PotCard
          total={ui.round.total}
          roll={ui.round.roll}
          lastResolution={ui.round.lastResolution}
          carriedIn={ui.buffHand.accrual.carriedIn}
          carryOut={ui.buffHand.accrual.carryOut}
          resolution={resolution}
          dispatch={dispatch}
          quarryHealth={ui.encounter.health[DuelSide.Quarry]}
        />
      </aside>
      {/* DLR-160 AC1 — the region click is GONE (it fired `handleCarryOn` for any click in the
          play area while a trick was held or the Quarry pending, costing the buff-arming window).
          `TrickWell.tsx` has a real button for both states. `wc-is-waiting` went with it. */}
      <section className="wc-table" aria-live="polite">
        {/* `loadoutOpen(ui)` alone is not enough: the panel's OWN toggle state survives a trick
            resolving under it (nothing clears `ui.loadout`), but `loadoutDoorOpen` — the same
            gate `handleToggleLoadout` reads — goes false on exactly the four states the gallery
            must never contend with (a held reveal, an open prompt, an engine fault, a complete
            round). Reading both is what makes "the gallery can only coexist with an empty or an
            in-progress trick" true, rather than merely asserted.

            DELIBERATE, not a leak: the drawer remembers it was open. Dismissing a held reveal
            (`handleCarryOn`) does not clear `ui.loadout`, so once the door reopens between tricks
            the gallery pops back without a new tap — that is the between-tricks window the
            gallery is meant to be available in. `CancelLoadout` is the only action that closes it
            outright; see `WarCouncilRound.loadoutReopen.test.tsx` for the pinned sequence. */}
        <FeltRail {...feltRailProps({ ui, galleryOpen: loadoutOpen(ui) && loadoutDoorOpen(ui) })} />
        {loadoutOpen(ui) && loadoutDoorOpen(ui) ? (
          <BuffGallery
            {...buffGalleryProps({ ui, dispatch: dispatchClearingAnnouncement, offered })}
          />
        ) : (
          <FeltStage
            {...feltStageProps({
              ui,
              dispatch: dispatchClearingAnnouncement,
              offered,
              quarryToLead,
              handSummary,
              displayHand,
              onCarryOn: handleCarryOn,
              onCancel: handleCancel,
            })}
          />
        )}
      </section>
      {/* DLR-160 Task 14 — the hand/riding/breakdown zone, split into `BuffRideZone.tsx` to keep
          this file under its 400-line budget; see that file's own docblock for why it sits
          outside `.wc-table` and for its `BreakdownTopContext` provider. */}
      <BuffRideZone
        ui={ui}
        legal={legal}
        displayHand={displayHand}
        handInteractive={handInteractive}
        hint={hint}
        buffRide={buffRide}
        onTap={handleTap}
        onCancel={handleCancel}
      />
      <ActionBar
        {...actionBarProps({
          ui,
          dispatch: dispatchClearingAnnouncement,
          handleTap,
          offered,
          loadoutRefusal,
          interactive,
          discardRefusal,
        })}
      />
    </div>
  )
}
