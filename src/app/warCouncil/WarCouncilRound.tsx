import { useEffect, useReducer } from 'react'
import { DuelSide, isEncounterResolved, payableCashOutBonus, quarryCharacterInfo } from '../../hunt'
import { clearDebugRoundState, setDebugRoundState } from '../debugState'
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
import { cardDamagePreview } from './cardDamage'
import FeltRail from './FeltRail'
import FeltStage from './FeltStage'
import HandFan from './HandFan'
import { sortHandForDisplay } from './handOrder'
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
  RoundUiActionKind,
} from './roundUiState'
import RoundStatusBand from './RoundStatusBand'
import { CardArtSheet } from './CardArtSheet'
import { SuitSymbolSheet } from './SuitMark'
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
  const discardRefusal = discardRefusalFor(discardStock(ui))
  const handInteractive = interactive || discardSelecting(ui)

  // Dev-only mirror for browser automation (`.claude/skills/ai-play-tester`) — see
  // `../debugState.ts`. Two effects, not one: the write runs on every render that changes this
  // slice, the clear runs ONLY on unmount (empty deps) — `App` switches screens by conditionally
  // rendering this component out entirely, and that's the one moment this slice actually goes
  // stale, not merely re-renders.
  useEffect(() => {
    setDebugRoundState({
      ui,
      interactive,
      legalCount: legal.length,
      applyCash,
      applyRefusal,
      discardRefusal,
      encounterOver,
      roundComplete,
    })
  }, [
    ui,
    interactive,
    legal,
    applyCash,
    applyRefusal,
    discardRefusal,
    encounterOver,
    roundComplete,
  ])
  useEffect(() => clearDebugRoundState, [])

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

  function handleTap(card: Card) {
    dispatch({ kind: RoundUiActionKind.TapCard, card })
  }

  function handleCancel() {
    dispatch({ kind: RoundUiActionKind.CancelSelection })
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
      dispatch({ kind: RoundUiActionKind.CarryOn })
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
          <BuffGallery {...buffGalleryProps({ ui, dispatch, offered })} />
        ) : (
          <FeltStage
            {...feltStageProps({
              ui,
              dispatch,
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
      <HandFan
        hand={displayHand}
        legal={legal}
        armed={ui.armed}
        interactive={handInteractive}
        hint={hint}
        rejected={ui.rejection !== null}
        promptOpen={ui.prompt !== null}
        primedCards={ui.round.primedCards}
        timebombArmed={timebombArmed(ui)}
        discardSelecting={discardSelecting(ui)}
        discardSelection={ui.discardSelection ?? []}
        damageForCard={(card) => cardDamagePreview(ui, card)}
        onTap={handleTap}
        onCancel={handleCancel}
      />
      <ActionBar
        {...actionBarProps({
          ui,
          dispatch,
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
