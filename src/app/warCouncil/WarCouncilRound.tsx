import { useReducer } from 'react'
import { DuelSide, isEncounterResolved, payableCashOutBonus, quarryCharacterInfo } from '../../hunt'
import {
  applyDamageRefusalFor,
  cashValue,
  discardRefusalFor,
  PlayerSide,
  RoundPhase,
  currentTurn,
  legalMoves,
  suitShape,
  type Card,
} from '../../warCouncil'
import type { WarCouncilMountProps } from '../warCouncilMount'
import ActionBar from './ActionBar'
import BankMeter from './BankMeter'
import { loadoutBarRefusalFor, loadoutDoorOpen } from './buffHandlers'
import BuffGallery from './BuffGallery'
import BuffRidingList from './BuffRidingList'
import { ridingTimebombId } from './buffRideModel'
import { useBuffRide } from './buffRideProps'
import CardBuffBreakdown from './CardBuffBreakdown'
import { cardDamagePreview } from './cardDamage'
import FeltRail from './FeltRail'
import FeltStage from './FeltStage'
import HandFan from './HandFan'
import { sortHandForDisplay } from './handOrder'
import { cardKey } from './labels'
import QuarryDossier from './QuarryDossier'
import QuarryShape from './QuarryShape'
import { barsForRound } from './roundBars'
import { deriveHint } from './roundHint'
import { roundReducer } from './roundReducer'
import { roundResultFor } from './roundResult'
import {
  actionBarProps,
  buffGalleryProps,
  feltRailProps,
  feltStageProps,
} from './roundControlsProps'
import {
  applyDamageStock,
  canAct,
  cheatArmed,
  createRoundUiState,
  discardSelecting,
  discardStock,
  loadoutOpen,
  offeredBuffs,
  timebombArmed,
  timebombLive,
  RoundUiActionKind,
  type RoundUiAction,
} from './roundUiState'
import RoundStatusBand from './RoundStatusBand'
import { CardArtSheet } from './CardArtSheet'
import { SuitSymbolSheet } from './SuitMark'
import { useDebugRoundState } from './useDebugRoundState'
import './warCouncil.css'
import './warCouncilTable.css'
import './warCouncilCards.css'
import './warCouncilCardFace.css'
import './warCouncilCardTip.css'
import './warCouncilHunt.css'
import './warCouncilBankMeter.css'
import './warCouncilHealthBars.css'
import './warCouncilHand.css'
import './warCouncilActionBar.css'
import './warCouncilFeltRail.css'
import './warCouncilBuffGallery.css'

/**
 * The round mount, implementing SCRUM-37's `WarCouncilMountProps`. Owns exactly one piece of
 * state — the reducer below, seeded by a lazy initializer that is a pure restructuring of
 * `{ round: initialState, encounter }` (DLR-53 AC3: the Quarry's opening lead is left
 * uncommitted so it can be telegraphed before it lands; `handleCarryOn` commits it). That
 * initializer, like the reducer itself, is pure, so StrictMode's development
 * double-invocation simply recomputes an identical value. There is no effect anywhere in this
 * component: every other transition is a tap, a keypress, or a callback fired from one of the
 * felt's own controls.
 *
 * `encounter` (the prop) is this hand's OPENING figure — `warCouncilMount.ts`'s own docblock — and
 * it is read in exactly one place: seeding the reducer. Everything else reads the reducer's own
 * state, which holds BOTH the live encounter (`ui.encounter`, updated in place as each trick's
 * damage lands, AC6/AC8) and the frozen baseline (`ui.openingEncounter`) that `handSummary` is a
 * delta against.
 *
 * The baseline is state rather than the prop because the prop is not stable for this component's
 * whole life. On the hand that ends the encounter, `handleCarryOn` calls `onComplete`, and `App`
 * adopts that encounter and returns early WITHOUT changing the `key` that would remount this
 * component — so the prop becomes the live value while the terminal panel is still on screen. A
 * prop-based delta therefore zeroed itself under the player, which is what the tally regression in
 * `WarCouncilRound.duelHealthBars.test.tsx` pins.
 */
export default function WarCouncilRound({
  initialState,
  hunt,
  encounter,
  maxHealth,
  runLabel,
  coins,
  quarryLabel,
  blastGuardHeld,
  discardsRemaining,
  bankClimbBonus,
  buffs,
  apCapacity,
  rankTiers,
  feederCarry,
  onComplete,
}: WarCouncilMountProps) {
  const [ui, dispatch] = useReducer(
    roundReducer,
    {
      round: initialState,
      encounter,
      blastGuardHeld,
      discardsRemaining,
      bankClimbBonus,
      buffs,
      apCapacity,
      rankTiers,
      coins,
      feederCarry,
    },
    createRoundUiState,
  )

  const encounterOver = isEncounterResolved(ui.encounter)
  const roundComplete = ui.round.phase === RoundPhase.Complete
  // The SAME predicate the reducer gates on — moved to `roundUiState.ts` on DLR-94, where
  // `cheatArmed` and `timebombArmed` already live, because this component and `roundReducer.ts`
  // were computing the identical six clauses separately. Two readings of one gate is how a greyed
  // control and a reducer branch drift apart.
  const interactive = canAct(ui)

  // The SAME predicate the reducer commits with (`cheatArmed`), not a second reading of the
  // selection — two readings is how the fan's greying and a rejection reason drift apart.
  const legal = legalMoves(
    ui.round,
    PlayerSide.Player,
    cheatArmed(ui) ? { ignoreFollowSuit: true } : undefined,
  )

  // DLR-94 — both derived, no new state. `applyDamageRefusalFor` is the one statement of
  // availability, so the plate's disabled state and `handleTapApplyDamage`'s guard cannot disagree.
  const applyRefusal = applyDamageRefusalFor(applyDamageStock(ui))
  const applyCash = cashValue(ui.round.bank, ui.round.multiplier)

  // DLR-100 — mirrors `applyRefusal` above. `handInteractive` keeps the fan tappable during the
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
    applyCash,
    applyRefusal,
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

  // This hand's own tally, as the delta against the encounter this component was mounted with.
  // Both sides of the subtraction come from the reducer: `ui.openingEncounter` is frozen at mount,
  // `ui.encounter` moves on every trick that cashes or hits — so the difference is exactly what
  // this hand did.
  //
  // The baseline is deliberately NOT the `encounter` prop. On the hand that ends the encounter,
  // `handleCarryOn` calls `onComplete`, and `App` sets its own encounter and returns early without
  // changing the `key` that would remount this component — so the prop turns into the live value
  // while the terminal panel is still on screen, and a prop-based delta reads 0 for a hand that
  // plainly did damage.
  const handSummary = {
    healthLost: ui.openingEncounter.health[DuelSide.Player] - ui.encounter.health[DuelSide.Player],
    dealtToQuarry:
      ui.openingEncounter.health[DuelSide.Quarry] - ui.encounter.health[DuelSide.Quarry],
  }

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

  // DLR-153 Phase 8 Correction 1 — the touch path into a hover-only breakdown: `HandFan.tsx`
  // gates `onEnterCard` to a mouse pointer, so a tap pins the readout here instead (a SELECTION,
  // per the mockup's own rule for touch), through the same tap event.
  function handleTap(card: Card) {
    buffRide.breakdownTarget.onEnterCard(card)
    dispatchClearingAnnouncement({ kind: RoundUiActionKind.TapCard, card })
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
      <SuitSymbolSheet />
      <CardArtSheet />
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
        <QuarryDossier
          info={quarryCharacterInfo(hunt.quarry.character)}
          tricksWon={ui.round.tricksWon[PlayerSide.Cpu]}
        />
        <QuarryShape shape={shape} />
        <BankMeter
          bank={ui.round.bank}
          multiplier={ui.round.multiplier}
          lastResolution={ui.round.lastResolution}
          pendingBonus={payableCashOutBonus(ui.buffHand.accrual)}
          carriedIn={ui.buffHand.accrual.carriedIn}
          carryOut={ui.buffHand.accrual.carryOut}
        />
      </aside>
      <section
        className={`wc-table${ui.resolvedTrick || quarryToLead || encounterOver ? ' wc-is-waiting' : ''}`}
        aria-live="polite"
        onClick={ui.resolvedTrick || quarryToLead || encounterOver ? handleCarryOn : undefined}
      >
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
      {/* DLR-153 Assumption 6 — outside `.wc-table` deliberately: `BuffGallery` replaces the
          stage and unmounts the moment the door closes, but the hand zone renders unconditionally,
          so anchoring the riding list and the (hover-only, Phase 8) breakdown here is what keeps
          them reachable across the gallery closing.
          DLR-153 Fix 2 — a REAL positioning class, not an unclassed div: the panel's nearest
          positioned ancestor used to be `.wc-table`, a SIBLING rather than a parent. */}
      <div
        className="wc-buff-ride-zone"
        onMouseEnter={buffRide.breakdownTarget.onEnterPanel}
        onMouseLeave={buffRide.breakdownTarget.onLeaveCard}
      >
        <HandFan
          hand={displayHand}
          legal={legal}
          armed={ui.armed}
          interactive={handInteractive}
          hint={buffRide.removedAnnouncement ?? hint}
          rejected={ui.rejection !== null}
          promptOpen={ui.prompt !== null}
          primedCards={ui.round.primedCards}
          timebombFuseRemaining={ui.timebombFuseRemaining}
          timebombArmed={timebombArmed(ui)}
          discardSelecting={discardSelecting(ui)}
          discardSelection={ui.discardSelection ?? []}
          damageForCard={(card) => cardDamagePreview(ui, card)}
          buffLightForCard={(card) => buffRide.lights.get(cardKey(card)) ?? null}
          onCardEnter={buffRide.breakdownTarget.onEnterCard}
          onCardLeave={buffRide.breakdownTarget.onLeaveCard}
          onTap={handleTap}
          onCancel={handleCancel}
        />
        <BuffRidingList rows={buffRide.riding} onRemove={buffRide.handleRemoveBuff} />
        <CardBuffBreakdown
          breakdown={buffRide.breakdown}
          riding={buffRide.riding}
          onEnter={buffRide.breakdownTarget.onEnterPanel}
          onLeave={buffRide.breakdownTarget.onLeavePanel}
          onEscape={buffRide.breakdownTarget.onEscape}
          onRemove={buffRide.handleRemoveBuff}
        />
      </div>
      <ActionBar
        {...actionBarProps({
          ui,
          dispatch: dispatchClearingAnnouncement,
          handleTap,
          offered,
          loadoutRefusal,
          interactive,
          applyCash,
          applyRefusal,
          discardRefusal,
        })}
      />
    </div>
  )
}
