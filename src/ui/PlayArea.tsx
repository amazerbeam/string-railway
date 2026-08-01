import { useRef, useState } from 'react'
import Board from './Board'
import DebugPanel from './DebugPanel'
import SeatLegend from './SeatLegend'
import StationGhost from './StationGhost'
import StationStepPanel from './StationStepPanel'
import { DRAW_EVENT, MOVE_KIND, SKIP_REASON, STATION_STEP_STAGE } from '../constants/game'
import { NO_OVERLAYS } from '../constants/overlays'
import { stationStepStage } from '../rules/staging'
import { useStationPlacement } from './useStationPlacement'
import type { OverlayFlags } from './BoardOverlays'
import type { RulesConfig } from '../rules/config'
import type { PlayerCount } from '../rules/setup'
import type { GameState, Move, SkipReason } from '../rules/types'

interface PlayAreaProps {
  state: GameState
  config: RulesConfig
  seed: number
  playerCount: PlayerCount
  dispatchMove: (move: Move) => void
  onRegenerate: (seed: number) => void
}

/**
 * Split out of AppShell so useStationPlacement is called unconditionally: the
 * hook needs a non-null GameState, and AppShell's game block only renders once
 * one exists. A conditional hook call is not allowed, and widening the hook to
 * accept null would push a null check into every line of the drag.
 */
function PlayArea({ state, config, seed, playerCount, dispatchMove, onRegenerate }: PlayAreaProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [overlays, setOverlays] = useState<OverlayFlags>(NO_OVERLAYS)
  const placement = useStationPlacement(state, config, svgRef, dispatchMove)
  const stage = stationStepStage(state)

  const ghost =
    stage === STATION_STEP_STAGE.PLACING && state.pendingCard !== null && placement.dragging ? (
      <StationGhost
        card={state.pendingCard}
        cardSize={config.cardSize}
        illegal={placement.reason !== null}
        ghostRef={placement.ghostRef}
      />
    ) : null

  return (
    <section className="app-shell__game" aria-label="Game board">
      <Board
        state={state}
        config={config}
        overlays={overlays}
        svgRef={svgRef}
        pointerHandlers={placement.handlers}
        ghost={ghost}
      />
      <StationStepPanel
        state={state}
        stage={stage}
        reason={placement.reason}
        blockingStationId={placement.blockingStationId}
        hasPosition={placement.hasPosition}
        onBeginTurn={() => dispatchMove({ kind: MOVE_KIND.BEGIN_TURN })}
        onSkipStationStep={() =>
          dispatchMove({
            kind: MOVE_KIND.SKIP_STATION_STEP,
            reason: skipReasonFor(state),
          })
        }
      />
      <SeatLegend seats={state.seats} turnOrder={state.turnOrder} playerCount={playerCount} />
      <DebugPanel
        state={state}
        seed={seed}
        flags={overlays}
        onFlagsChange={setOverlays}
        onRegenerate={onRegenerate}
      />
    </section>
  )
}

/** The skip reason the engine already determined, taken from the terminal
 *  event rather than re-derived — a component may not decide a rule. */
function skipReasonFor(state: GameState): SkipReason {
  const last = state.lastDraw[state.lastDraw.length - 1]
  return last?.kind === DRAW_EVENT.SKIPPED_DECK_EMPTY
    ? SKIP_REASON.DECK_EMPTY
    : SKIP_REASON.NO_LEGAL_PLACEMENT
}

export default PlayArea
