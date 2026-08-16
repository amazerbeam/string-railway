import { useReducer, type ReactNode } from 'react'
import { DuelSide, isEncounterResolved, quarryCharacterInfo } from '../../hunt'
import {
  CardRank,
  incomingFrom,
  PlayerSide,
  RoundPhase,
  currentTurn,
  legalMoves,
  quarryIntent,
  sameCard,
  suitShape,
  type Card,
  type QuarryIntent,
} from '../../warCouncil'
import type { WarCouncilMountProps } from '../warCouncilMount'
import AbilityPrompt from './AbilityPrompt'
import BankMeter from './BankMeter'
import DecreePile from './DecreePile'
import { duelHealthBars, NO_BREAKING, projectedFromStreak } from './duelHealthBars'
import HandFan from './HandFan'
import { sortHandForDisplay } from './handOrder'
import { previewQuarryIntent } from './intentPreview'
import IntentTelegraph from './IntentTelegraph'
import { cardAccessibleName, ILLEGAL_MOVE_MESSAGE } from './labels'
import QuarryDossier from './QuarryDossier'
import QuarryShape from './QuarryShape'
import RoundOverPanel from './RoundOverPanel'
import {
  createRoundUiState,
  roundReducer,
  RoundUiActionKind,
  type RoundUiState,
} from './roundReducer'
import RoundStatusBand from './RoundStatusBand'
import { SuitSymbolSheet } from './SuitMark'
import TrickWell from './TrickWell'
import './warCouncil.css'
import './warCouncilCards.css'
import './warCouncilHunt.css'
import './warCouncilHealthBars.css'
import './warCouncilHand.css'

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
  onComplete,
}: WarCouncilMountProps) {
  const [ui, dispatch] = useReducer(
    roundReducer,
    { round: initialState, encounter },
    createRoundUiState,
  )

  const encounterOver = isEncounterResolved(ui.encounter)
  const roundComplete = ui.round.phase === RoundPhase.Complete
  const interactive =
    !roundComplete &&
    !encounterOver &&
    ui.resolvedTrick === null &&
    ui.prompt === null &&
    ui.cpuFault === null &&
    currentTurn(ui.round) === PlayerSide.Player

  const legal = legalMoves(ui.round, PlayerSide.Player)

  // Both bars read straight off the reducer. Two derivations, no new state:
  //
  //  · the AT-RISK preview (AC3) is `projectedFromStreak` over `bank` and `multiplier`, which the
  //    engine already writes on every trick — it resets itself when they reset (AC5), because it
  //    is a view of them rather than a copy.
  //  · the BREAKING hearts (AC2) are the damage of the trick currently held on screen.
  //    `roundReducer` never applies damage without setting `resolvedTrick` in the same transition
  //    (`commit` calls `applyResolution` only when `deriveResolvedTrick` returned one), so the
  //    held reveal IS the damage event. Reading it rather than diffing a remembered previous
  //    health keeps this a pure function of committed state — no effect, no StrictMode hazard —
  //    and ties the crack to the cards that caused it, which is F2's whole finding.
  //
  // AC4 needs no code: a cash-out zeroes bank and multiplier and sets `resolvedTrick` in ONE
  // transition, so the same hearts at the same indices go atRisk → breaking in one render.
  const bars = duelHealthBars(
    ui.encounter.health,
    projectedFromStreak(ui.encounter.health, ui.round.bank, ui.round.multiplier),
    maxHealth,
    ui.resolvedTrick ? incomingFrom(ui.resolvedTrick.resolution) : NO_BREAKING,
  )

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

  // Two readings of the same telegraph, never both at once. An armed card is a selection, not
  // a commitment, so previewing the Quarry's answer to it is still "before the player commits"
  // (AC3). With nothing armed, `quarryIntent` self-guards and returns null unless it is
  // genuinely the Quarry's turn. Both are pure and cheap enough to derive every render —
  // storing either could only make it stale against `ui.round`.
  const speculative = ui.armed !== null
  const intent: QuarryIntent | null =
    ui.armed !== null ? previewQuarryIntent(ui.round, ui.armed) : quarryIntent(ui.round)

  const hint = deriveHint(ui, interactive, quarryToLead)
  const promptCard = ui.prompt

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
      onComplete({ finalState: ui.round, encounter: ui.encounter })
      return
    }
    if (ui.resolvedTrick !== null || quarryToLead) {
      dispatch({ kind: RoundUiActionKind.CarryOn })
      return
    }
    if (roundComplete) {
      onComplete({ finalState: ui.round, encounter: ui.encounter })
    }
  }

  // DLR-82: a resolved encounter NO LONGER renders a terminal panel here. The run verdict is
  // `src/app/run/RunOutcomePanel.tsx`, owned by `App`, and the tap that clears the deciding
  // trick reports upward through `handleCarryOn` — whose first line already tests `encounterOver`.
  // Consequence worth knowing: the trick that ends a fight now gets its own reveal beat, which
  // the old branch ordering deliberately skipped.
  let felt: ReactNode
  if (ui.cpuFault) {
    felt = (
      <p className="wc-fault" role="alert">
        The engine rejected the opponent&rsquo;s own move — reason: {ui.cpuFault}. That is a bug,
        not a rule, so play stops here rather than retrying.
      </p>
    )
  } else if (ui.resolvedTrick) {
    // Held regardless of `roundComplete` — the deciding sixth trick resolves and completes the
    // hand in the same reducer transition, so without this branch running first the winning
    // card of the final trick would never be shown.
    felt = (
      <TrickWell
        currentTrick={ui.round.currentTrick}
        resolvedTrick={ui.resolvedTrick}
        skulledCards={ui.round.skulledCards}
        quarryToLead={quarryToLead}
        onCarryOn={handleCarryOn}
      />
    )
  } else if (roundComplete) {
    felt = (
      <RoundOverPanel
        tricksWon={ui.round.tricksWon}
        handSummary={handSummary}
        onFinish={handleCarryOn}
      />
    )
  } else if (promptCard) {
    felt = (
      <AbilityPrompt
        card={promptCard}
        decree={ui.round.decree}
        hand={displayHand.filter((c) => !sameCard(c, promptCard))}
        drawnCard={promptCard.rank === CardRank.Woodcutter ? (ui.round.drawPile[0] ?? null) : null}
        onChoose={(choice) => dispatch({ kind: RoundUiActionKind.ChooseAbility, choice })}
        onCancel={handleCancel}
      />
    )
  } else {
    felt = (
      <TrickWell
        currentTrick={ui.round.currentTrick}
        resolvedTrick={null}
        skulledCards={ui.round.skulledCards}
        quarryToLead={quarryToLead}
        onCarryOn={handleCarryOn}
      />
    )
  }

  return (
    <div className="wc-shell">
      <SuitSymbolSheet />
      <RoundStatusBand
        tricksWon={ui.round.tricksWon}
        tricksPlayed={ui.round.tricksPlayed}
        opponentHandCount={ui.round.hands[PlayerSide.Cpu].length}
        roundComplete={roundComplete}
        bars={bars}
        runLabel={runLabel}
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
        />
        <IntentTelegraph intent={intent} speculative={speculative} />
      </aside>
      <section
        className={`wc-table${ui.resolvedTrick || quarryToLead || encounterOver ? ' wc-is-waiting' : ''}`}
        aria-live="polite"
        onClick={ui.resolvedTrick || quarryToLead || encounterOver ? handleCarryOn : undefined}
      >
        <DecreePile
          decree={ui.round.decree}
          trumpSuit={ui.round.trumpSuit}
          drawPileCount={ui.round.drawPile.length}
        />
        <div className="wc-table-inner">{felt}</div>
      </section>
      <HandFan
        hand={displayHand}
        legal={legal}
        armed={ui.armed}
        interactive={interactive}
        hint={hint}
        rejected={ui.rejection !== null}
        promptOpen={ui.prompt !== null}
        onTap={handleTap}
        onCancel={handleCancel}
      />
    </div>
  )
}

/** Priority mirrors the mockup's hint cascade: a rejection or an armed card
 * always says the most specific thing; otherwise the hint names whose turn
 * it is to lead or follow. */
function deriveHint(ui: RoundUiState, interactive: boolean, quarryToLead: boolean): string {
  if (ui.rejection) return ILLEGAL_MOVE_MESSAGE[ui.rejection]
  if (ui.prompt) return 'Choose what the card does'
  if (ui.resolvedTrick) return 'Trick resolved'
  if (quarryToLead) return 'They are choosing their lead'
  if (ui.armed) return `Tap ${cardAccessibleName(ui.armed)} again to play it`
  if (interactive) return ui.round.currentTrick.length > 0 ? 'Follow their lead' : 'Your lead'
  return ''
}
