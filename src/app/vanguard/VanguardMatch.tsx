import { useEffect, useReducer, type ReactNode } from 'react'
import { ClashStatus, VanguardActionKind, type CellKey, type VanguardBoard } from '../../vanguard'
import { PlayerSide } from '../../warCouncil'
import type { VanguardMountProps } from '../vanguardMount'
import ActionPalette from './ActionPalette'
import ClashOverPanel from './ClashOverPanel'
import { REJECTION_MESSAGE } from './labels'
import { allLegalTargets, legalTargetsFor } from './legalTargets'
import {
  createMatchUiState,
  matchReducer,
  MatchActionKind,
  type MatchFault,
  type MatchUiState,
} from './matchReducer'
import VanguardBoardView from './VanguardBoardView'
import './vanguard.css'
import './vanguardPanels.css'

const EMPTY_TARGETS: ReadonlySet<CellKey> = new Set()

/**
 * The mount implementing SCRUM-37's `VanguardMountProps`. Owns exactly one
 * piece of state (the reducer below) and exactly one effect — the request for
 * each round's trick split, which stands in for the War Council happening
 * elsewhere. Everything else rendered here is a derived value read off `ui`.
 *
 * AC3: the board occupies the shell's `1fr` row unconditionally. No branch in
 * this component ever replaces `VanguardBoardView` with a loading state, a
 * panel, or a fault message — the panel and the alert are overlays.
 */
export default function VanguardMatch({
  initialState,
  requestTricksWon,
  onComplete,
}: VanguardMountProps) {
  const [ui, dispatch] = useReducer(matchReducer, initialState, createMatchUiState)

  useEffect(() => {
    if (ui.clash !== null) return
    let cancelled = false

    requestTricksWon(ui.round)
      .then((tricks) => {
        if (cancelled) return
        dispatch({ kind: MatchActionKind.MusterReady, tricks })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        dispatch({
          kind: MatchActionKind.RequestFailed,
          message: error instanceof Error ? error.message : String(error),
        })
      })

    return () => {
      cancelled = true
    }
  }, [ui.clash, ui.round, requestTricksWon])

  const clash = ui.clash
  const board: VanguardBoard = clash?.board ?? ui.board
  const playerTurn =
    clash !== null && clash.status === ClashStatus.InProgress && clash.turn === PlayerSide.Player
  const canAct = playerTurn && ui.fault === null
  const musterAvailable =
    clash !== null && clash.status === ClashStatus.InProgress ? clash.muster[PlayerSide.Player] : 0

  // Computed once per render for all three kinds so `enabled` and the armed
  // action's `legalTargets` share the same dry-run results rather than
  // re-asking the engine for whichever kind happens to be selected.
  const targetsByAction: Readonly<Record<VanguardActionKind, ReadonlySet<CellKey>>> = {
    [VanguardActionKind.Expand]: legalTargetsFor(
      board,
      PlayerSide.Player,
      VanguardActionKind.Expand,
      musterAvailable,
    ),
    [VanguardActionKind.Overwrite]: legalTargetsFor(
      board,
      PlayerSide.Player,
      VanguardActionKind.Overwrite,
      musterAvailable,
    ),
    [VanguardActionKind.Reinforce]: legalTargetsFor(
      board,
      PlayerSide.Player,
      VanguardActionKind.Reinforce,
      musterAvailable,
    ),
  }
  const enabled: Readonly<Record<VanguardActionKind, boolean>> = {
    [VanguardActionKind.Expand]: targetsByAction[VanguardActionKind.Expand].size > 0,
    [VanguardActionKind.Overwrite]: targetsByAction[VanguardActionKind.Overwrite].size > 0,
    [VanguardActionKind.Reinforce]: targetsByAction[VanguardActionKind.Reinforce].size > 0,
  }
  const legalTargets = playerTurn ? allLegalTargets(targetsByAction) : EMPTY_TARGETS

  const hint = deriveHint(ui)

  let outcomePanel: ReactNode = null
  if (clash !== null && clash.status === ClashStatus.Breached) {
    const { board: finalState, winner } = clash
    outcomePanel = (
      <ClashOverPanel
        outcome={{ kind: 'breached', winner }}
        onContinue={() => onComplete({ finalState, winner })}
      />
    )
  } else if (clash !== null && clash.status === ClashStatus.Complete) {
    outcomePanel = (
      <ClashOverPanel
        outcome={{ kind: 'roundOver' }}
        onContinue={() => dispatch({ kind: MatchActionKind.NextRound })}
      />
    )
  }

  return (
    <div className="vg-shell">
      <header className="vg-band">
        <span className="vg-band-round">Round {ui.round} · The Clash</span>
        <span className="vg-band-note">Muster counts and turn indicator are SCRUM-30</span>
      </header>

      <main className="vg-board-area">
        <VanguardBoardView
          board={board}
          legalTargets={legalTargets}
          interactive={canAct}
          onTapCell={(target) => dispatch({ kind: MatchActionKind.TapCell, target })}
          onCancel={() => dispatch({ kind: MatchActionKind.ClearRejection })}
        />
      </main>

      <ActionPalette enabled={enabled} interactive={canAct} hint={hint} />

      {ui.fault !== null && (
        <p role="alert" className="vg-alert">
          {faultMessage(ui.fault)}
        </p>
      )}

      {outcomePanel}
    </div>
  )
}

/** Priority mirrors the mockup's hint cascade: a rejection or an armed action
 * always says the most specific thing; otherwise the hint names whose turn it
 * is, or that the War Council is still deciding this round's Muster. */
function deriveHint(ui: MatchUiState): string {
  if (ui.rejection !== null) return REJECTION_MESSAGE[ui.rejection]
  if (ui.clash === null) return 'The War Council is deciding this round’s Muster'
  if (ui.clash.status !== ClashStatus.InProgress) return ''
  return ui.clash.turn === PlayerSide.Player
    ? 'Tap a cell to act'
    : 'They are spending their Muster'
}

function faultMessage(fault: MatchFault): string {
  switch (fault.kind) {
    case 'cpuDeadEnd':
      return fault.message
    case 'cpuRejected':
      return REJECTION_MESSAGE[fault.reason]
    case 'requestFailed':
      return fault.message
    case 'invalidTricks':
      return 'The War Council returned a trick split that could not have come from a real round.'
  }
}
