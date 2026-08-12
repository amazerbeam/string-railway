import { useReducer, type ReactNode } from 'react'
import { quarryCharacterInfo } from '../../hunt'
import {
  CardRank,
  PlayerSide,
  RoundPhase,
  currentTurn,
  legalMoves,
  quarryIntent,
  sameCard,
  scoreHunt,
  type Card,
  type HuntDamage,
  type QuarryIntent,
} from '../../warCouncil'
import type { WarCouncilMountProps } from '../warCouncilMount'
import AbilityPrompt from './AbilityPrompt'
import DeclareGate from './DeclareGate'
import DecreePile from './DecreePile'
import HandFan from './HandFan'
import { sortHandForDisplay } from './handOrder'
import { previewQuarryIntent } from './intentPreview'
import IntentTelegraph from './IntentTelegraph'
import { cardAccessibleName, ILLEGAL_MOVE_MESSAGE } from './labels'
import QuarryDossier from './QuarryDossier'
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
import './warCouncilDeclare.css'

/**
 * The round mount, implementing SCRUM-37's `WarCouncilMountProps`. Owns
 * exactly one piece of state — the reducer below, seeded by a lazy initializer that is a
 * pure restructuring of `initialState` (DLR-53 AC3: the Quarry's opening lead is left
 * uncommitted so it can be telegraphed before it lands; `handleCarryOn` commits it). That
 * initializer, like the reducer itself, is pure, so StrictMode's development
 * double-invocation simply recomputes an identical value. There is no effect anywhere in
 * this component: every other transition is a tap, a keypress, or a callback fired from
 * one of the felt's own controls.
 */
export default function WarCouncilRound({ initialState, hunt, onComplete }: WarCouncilMountProps) {
  const [ui, dispatch] = useReducer(roundReducer, initialState, createRoundUiState)

  const roundComplete = ui.round.phase === RoundPhase.Complete
  const interactive =
    !roundComplete &&
    ui.resolvedTrick === null &&
    ui.prompt === null &&
    ui.cpuFault === null &&
    ui.round.declaration !== undefined &&
    currentTurn(ui.round) === PlayerSide.Player

  const legal = legalMoves(ui.round, PlayerSide.Player)

  // Both sides derived every render from already-final state, then reused three ways — the
  // status band's readout, the end panel, and `onComplete` — so the number the player reads and
  // the number the mount reports cannot diverge. `spoils` reduces over at most 26 captured cards
  // and `resolveStanding` scans a six-row table: bounded work, no memo.
  const huntDamage: Readonly<Record<PlayerSide, HuntDamage>> = {
    [PlayerSide.Player]: scoreHunt(ui.round, PlayerSide.Player),
    [PlayerSide.Cpu]: scoreHunt(ui.round, PlayerSide.Cpu),
  }

  const displayHand = sortHandForDisplay(ui.round.hands[PlayerSide.Player])

  // The Quarry has chosen its lead but has not committed it, so the telegraph can be read
  // before the card lands. `currentTrick.length === 0` is what keeps this to leads only.
  const quarryToLead =
    !roundComplete &&
    ui.resolvedTrick === null &&
    ui.prompt === null &&
    ui.cpuFault === null &&
    ui.round.declaration !== undefined &&
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

  /** Shared by the held trick's own carry-on control, the pending Quarry lead's own
   * control, and the round-over panel's "Finish the round" control: reads the current
   * render's state and either carries on — clearing a held trick (including the deciding
   * thirteenth, so its cards and winner are seen before the panel appears) and/or
   * committing the Quarry's pending lead — or, once nothing is held or pending and the
   * round is complete, reports it. `quarryToLead` is only ever true while `roundComplete`
   * is false, so this never fires `onComplete` twice for one click. */
  function handleCarryOn() {
    if (ui.resolvedTrick !== null || quarryToLead) {
      dispatch({ kind: RoundUiActionKind.CarryOn })
      return
    }
    if (roundComplete) {
      onComplete({
        finalState: ui.round,
        damage: {
          [PlayerSide.Player]: huntDamage[PlayerSide.Player].damage,
          [PlayerSide.Cpu]: huntDamage[PlayerSide.Cpu].damage,
        },
      })
    }
  }

  let felt: ReactNode
  if (ui.round.declaration === undefined) {
    felt = <DeclareGate onDeclare={(path) => dispatch({ kind: RoundUiActionKind.Declare, path })} />
  } else if (ui.cpuFault) {
    felt = (
      <p className="wc-fault" role="alert">
        The engine rejected the opponent&rsquo;s own move — reason: {ui.cpuFault}. That is a bug,
        not a rule, so play stops here rather than retrying.
      </p>
    )
  } else if (ui.resolvedTrick) {
    // Held regardless of `roundComplete` — the deciding thirteenth trick resolves and
    // completes the round in the same reducer transition, so without this branch running
    // first the winning card of the final trick would never be shown.
    felt = (
      <TrickWell
        currentTrick={ui.round.currentTrick}
        resolvedTrick={ui.resolvedTrick}
        quarryToLead={quarryToLead}
        onCarryOn={handleCarryOn}
      />
    )
  } else if (roundComplete) {
    felt = (
      <RoundOverPanel
        tricksWon={ui.round.tricksWon}
        huntDamage={huntDamage}
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
        spoils={huntDamage[PlayerSide.Player].spoils}
        band={huntDamage[PlayerSide.Player].band}
      />
      <aside className="wc-dossier">
        <QuarryDossier
          info={quarryCharacterInfo(hunt.quarry.character)}
          tricksWon={ui.round.tricksWon[PlayerSide.Cpu]}
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
  if (ui.round.declaration === undefined) return 'Declare Win or Lose'
  if (ui.rejection) return ILLEGAL_MOVE_MESSAGE[ui.rejection]
  if (ui.prompt) return 'Choose what the card does'
  if (ui.resolvedTrick) return 'Trick resolved'
  if (quarryToLead) return 'They are choosing their lead'
  if (ui.armed) return `Tap ${cardAccessibleName(ui.armed)} again to play it`
  if (interactive) return ui.round.currentTrick.length > 0 ? 'Follow their lead' : 'Your lead'
  return ''
}
