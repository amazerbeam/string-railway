import { useReducer, type ReactNode } from 'react'
import {
  CardRank,
  PlayerSide,
  RoundPhase,
  currentTurn,
  legalMoves,
  sameCard,
  scoreRound,
  type Card,
} from '../../warCouncil'
import type { WarCouncilMountProps } from '../warCouncilMount'
import AbilityPrompt from './AbilityPrompt'
import DecreePile from './DecreePile'
import HandFan from './HandFan'
import { cardAccessibleName, ILLEGAL_MOVE_MESSAGE } from './labels'
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

/**
 * The round mount, implementing SCRUM-37's `WarCouncilMountProps`. Owns
 * exactly one piece of state — the reducer below, seeded by a lazy
 * initializer that plays the opponent's opening lead when they lead trick 1.
 * That initializer, like the reducer itself, is pure, so StrictMode's
 * development double-invocation simply recomputes an identical value. There
 * is no effect anywhere in this component: every other transition is a tap,
 * a keypress, or a callback fired from one of the felt's own controls.
 */
export default function WarCouncilRound({ initialState, onComplete }: WarCouncilMountProps) {
  const [ui, dispatch] = useReducer(roundReducer, initialState, createRoundUiState)

  const roundComplete = ui.round.phase === RoundPhase.Complete
  const interactive =
    !roundComplete &&
    ui.resolvedTrick === null &&
    ui.prompt === null &&
    ui.cpuFault === null &&
    currentTurn(ui.round) === PlayerSide.Player

  const legal = legalMoves(ui.round, PlayerSide.Player)
  const hint = deriveHint(ui, interactive)
  const promptCard = ui.prompt

  function handleTap(card: Card) {
    dispatch({ kind: RoundUiActionKind.TapCard, card })
  }

  function handleCancel() {
    dispatch({ kind: RoundUiActionKind.CancelSelection })
  }

  /** Shared by the held trick's own carry-on control and the round-over
   * panel's "Finish the round" control: reads the current render's state
   * and either carries on from a held trick — including the deciding
   * thirteenth, so its cards and winner are seen before the panel appears —
   * or, once nothing is held and the round is complete, reports it. Those
   * two conditions are mutually exclusive by construction (the panel only
   * renders once `resolvedTrick` is already `null`), so this never fires
   * `onComplete` twice for one click. */
  function handleCarryOn() {
    if (ui.resolvedTrick !== null) {
      dispatch({ kind: RoundUiActionKind.CarryOn })
      return
    }
    if (roundComplete) {
      onComplete({ finalState: ui.round, score: scoreRound(ui.round.tricksWon) })
    }
  }

  let felt: ReactNode
  if (ui.cpuFault) {
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
        onCarryOn={handleCarryOn}
      />
    )
  } else if (roundComplete) {
    felt = (
      <RoundOverPanel
        tricksWon={ui.round.tricksWon}
        score={scoreRound(ui.round.tricksWon)}
        onFinish={handleCarryOn}
      />
    )
  } else if (promptCard) {
    felt = (
      <AbilityPrompt
        card={promptCard}
        decree={ui.round.decree}
        hand={ui.round.hands[PlayerSide.Player].filter((c) => !sameCard(c, promptCard))}
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
      />
      <section
        className={`wc-table${ui.resolvedTrick ? ' wc-is-waiting' : ''}`}
        aria-live="polite"
        onClick={ui.resolvedTrick ? handleCarryOn : undefined}
      >
        <DecreePile
          decree={ui.round.decree}
          trumpSuit={ui.round.trumpSuit}
          drawPileCount={ui.round.drawPile.length}
        />
        <div className="wc-table-inner">{felt}</div>
      </section>
      <HandFan
        hand={ui.round.hands[PlayerSide.Player]}
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
function deriveHint(ui: RoundUiState, interactive: boolean): string {
  if (ui.rejection) return ILLEGAL_MOVE_MESSAGE[ui.rejection]
  if (ui.prompt) return 'Choose what the card does'
  if (ui.resolvedTrick) return 'Trick resolved'
  if (ui.armed) return `Tap ${cardAccessibleName(ui.armed)} again to play it`
  if (interactive) return ui.round.currentTrick.length > 0 ? 'Follow their lead' : 'Your lead'
  return ''
}
