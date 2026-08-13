import { useReducer, type ReactNode } from 'react'
import { DuelSide, isEncounterResolved, quarryCharacterInfo } from '../../hunt'
import {
  CardRank,
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
import { duelHealthBars } from './duelHealthBars'
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
 * `encounter` (the prop) is this hand's OPENING figure — `warCouncilMount.ts`'s own docblock —
 * and the reducer's own `ui.encounter` is the live value, updated in place as each trick's
 * damage lands (AC6/AC8). Both are read here: the prop as the hand's fixed starting point for
 * `handSummary`'s deltas, the reducer's copy for everything that must track the hand live.
 */
export default function WarCouncilRound({
  initialState,
  hunt,
  encounter,
  maxHealth,
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

  // Both bars read straight off the reducer's own encounter — there is no projection any more,
  // because damage has already landed by the time this renders. The pending segment retired with
  // `pendingHuntDamage`: it was the non-monotonic figure the redesign exists to remove.
  const bars = duelHealthBars(ui.encounter.health, ui.encounter.health, maxHealth)

  const shape = suitShape(ui.round.hands[PlayerSide.Cpu], ui.round.skulledCards)

  // This hand's own tally, as the delta against the encounter this component was mounted with.
  // `encounter` (the prop) never changes across this hand's life; `ui.encounter` does, on every
  // trick that cashes or hits — so the difference is exactly what this hand did.
  const handSummary = {
    healthLost: encounter.health[DuelSide.Player] - ui.encounter.health[DuelSide.Player],
    dealtToQuarry: encounter.health[DuelSide.Quarry] - ui.encounter.health[DuelSide.Quarry],
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
   * both the round-over and terminal panels' single control.
   *
   * Checked first and unconditionally: once the encounter has resolved, the felt no longer shows
   * a held reveal to clear (the branch order below puts the terminal panel ahead of the resolved
   * trick, matching the deciding cash-out's own trick never being shown separately from the
   * outcome it produced), so every tap from here on reports the finished hand upward rather than
   * dispatching a `CarryOn` that would just clear a reveal nothing renders. Otherwise this clears
   * a held trick reveal (including the deciding sixth, so its cards and outcome are seen before
   * the round-over panel) and/or commits the Quarry's pending lead — or, once nothing is held or
   * pending and the round is complete, reports the finished hand the same way.
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

  let felt: ReactNode
  if (encounterOver) {
    // AC6/AC8's cash-out can resolve the encounter mid-hand, on any trick — so this is checked
    // ahead of `resolvedTrick` rather than after it. The trick that finished the encounter
    // never gets its own reveal beat; the terminal panel is what the player sees next.
    felt = (
      <RoundOverPanel
        tricksWon={ui.round.tricksWon}
        handSummary={handSummary}
        winner={ui.encounter.winner}
        onFinish={handleCarryOn}
      />
    )
  } else if (ui.cpuFault) {
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
        winner={null}
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
        className={`wc-table${ui.resolvedTrick || quarryToLead ? ' wc-is-waiting' : ''}`}
        aria-live="polite"
        onClick={ui.resolvedTrick || quarryToLead ? handleCarryOn : undefined}
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
