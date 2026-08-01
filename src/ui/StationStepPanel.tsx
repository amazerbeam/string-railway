import { STATION_STEP_STAGE } from '../constants/game'
import { describeDrawEvent, describeRejection } from './placementMessages'
import './StationStepPanel.css'
import type {
  GameState,
  StationId,
  StationRejectionReason,
  StationStepStage,
  StationType,
} from '../rules/types'

interface StationStepPanelProps {
  state: GameState
  stage: StationStepStage
  reason: StationRejectionReason | null
  blockingStationId: StationId | null
  /** Whether the pending card has been positioned at least once. Distinguishes
   *  "no verdict yet" from "positioned and legal" — both otherwise present as
   *  reason === null, which would render "Legal position." before the player
   *  had touched the board even once. */
  hasPosition: boolean
  onBeginTurn(): void
  onSkipStationStep(): void
}

function StationStepPanel({
  state,
  stage,
  reason,
  blockingStationId,
  hasPosition,
  onBeginTurn,
  onSkipStationStep,
}: StationStepPanelProps) {
  const card = state.pendingCard

  return (
    <section className="station-step" aria-label="Station step">
      {/* AC10 — visible at every stage, not only while a card is in hand. */}
      <p className="station-step__deck">
        Deck: <strong>{state.deck.length}</strong> cards remaining
      </p>

      {stage === STATION_STEP_STAGE.AWAITING_DRAW && (
        <button type="button" className="station-step__button" onClick={onBeginTurn}>
          Draw station
        </button>
      )}

      {card !== null && (
        <div className="station-step__card">
          <h3 className="station-step__type">{card.type}</h3>
          <p className="station-step__bonus">
            <span className="station-step__bonus-first">{card.bonusFirst}</span>
            <span className="station-step__bonus-later">{card.bonusLater}</span>
            <span className="station-step__bonus-label">
              connection bonus — black if you connect first, grey otherwise (§7.2)
            </span>
          </p>
          <p className="station-step__limit">
            Player limit: <strong>{card.playerLimit}</strong> (§7.1)
          </p>
          <p className="station-step__hint">Press on the board to position it, release to place.</p>
        </div>
      )}

      {stage === STATION_STEP_STAGE.SKIPPED && (
        <button type="button" className="station-step__button" onClick={onSkipStationStep}>
          Continue to string placement
        </button>
      )}

      {/* AC2/AC3 — the live verdict, named rather than generic. */}
      <p
        className={`station-step__verdict${reason === null ? '' : ' station-step__verdict--illegal'}`}
        role="status"
      >
        {reason === null
          ? card !== null && hasPosition
            ? 'Legal position.'
            : ''
          : describeRejection(reason, blockingStationType(state, blockingStationId))}
      </p>

      {/* AC5/AC7/AC8/AC9 — the recycles, shown rather than silent. */}
      {state.lastDraw.length > 0 && (
        <ul className="station-step__trace" aria-label="Draw log">
          {state.lastDraw.map((event, index) => (
            <li key={`${event.kind}-${String(event.cardId)}-${index}`}>
              {describeDrawEvent(event)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** The blocking station's printed type, for AC3's "touching another station". */
function blockingStationType(state: GameState, stationId: StationId | null): StationType | null {
  if (stationId === null) {
    return null
  }
  return state.stations.find((station) => station.card.id === stationId)?.card.type ?? null
}

export default StationStepPanel
