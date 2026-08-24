import { type KeyboardEvent } from 'react'
import {
  type ActionPoints,
  type Buff,
  type BuffActivationRefusal,
  type BuffActivationState,
  type BuffId,
  type CheatCard,
  type CheatCardId,
} from '../../hunt'
import { LOADOUT_EMPTY_MESSAGE, LOADOUT_PANEL_LABEL } from './actionBarLabels'
import { BUFF_ACTIVATION_REFUSAL_MESSAGE, buffLine, buffRowAccessibleName } from './buffLabels'
import CheatSlots from './CheatSlots'
import { type CheatSelection, type TimebombStage } from './roundUiState'
import TimebombCharge from './TimebombCharge'
import { useRovingTabIndex } from './useRovingTabIndex'
import './warCouncilActionBar.css'

/** A stable no-op — the inner roving-tabindex group's own `Escape` handling is unused here (see
 *  the component docblock), but `useRovingTabIndex` still requires a callback. Module-level rather
 *  than recreated per render, so the hook's dependency never looks like it changed. */
function noop() {}

export interface BuffLoadoutPanelProps {
  readonly buffs: readonly Buff[]
  readonly activation: BuffActivationState
  readonly poised: BuffId | null
  readonly refusalFor: (buff: Buff) => BuffActivationRefusal | null
  readonly apCostFor: (buff: Buff) => ActionPoints
  readonly cheats: readonly CheatCard[]
  readonly cheatSelection: CheatSelection | null
  readonly timebombCharges: number
  readonly timebombStage: TimebombStage | null
  readonly interactive: boolean
  readonly onTapBuff: (id: BuffId) => void
  readonly onTapCheat: (id: CheatCardId) => void
  readonly onCancelCheat: () => void
  readonly onTapTimebomb: () => void
  readonly onCancelTimebomb: () => void
  readonly onClose: () => void
}

/**
 * DLR-114 AC2 — opened by Apply Buff. One glanceable line per owned, priced buff
 * (`activatableBuffs` has already dropped the `Unassigned` placeholders before this component ever
 * sees `buffs`), the hand's remaining AP, and the relocated Cheat/Timebomb controls below a divider.
 *
 * `onClick` STOPS PROPAGATION for the load-bearing reason the retired felt-rail plates this
 * panel supersedes always carried: this mounts inside `.wc-table`, which fires `handleCarryOn` on
 * click whenever the felt is waiting.
 *
 * `Escape` is handled ONCE, on this outer container, rather than also being handled by the inner
 * roving-tabindex group — the group's own `onCancel` is a no-op so a press inside the buff-row list
 * bubbles up and closes the panel exactly once rather than twice.
 *
 * TRAP: `useRovingTabIndex` indexes `groupRef.current.querySelectorAll('button')` POSITIONALLY, so
 * the ref is attached ONLY to the buff-row list — `CheatSlots` and `TimebombCharge` sit outside it,
 * or arrow-key navigation would silently land on the wrong control.
 */
export default function BuffLoadoutPanel({
  buffs,
  activation,
  poised,
  refusalFor,
  apCostFor,
  cheats,
  cheatSelection,
  timebombCharges,
  timebombStage,
  interactive,
  onTapBuff,
  onTapCheat,
  onCancelCheat,
  onTapTimebomb,
  onCancelTimebomb,
  onClose,
}: BuffLoadoutPanelProps) {
  // Guards against `refusalFor(undefined)` — `useRovingTabIndex` probes `isFocusable(0)`
  // unconditionally even when `buffs` is empty (mirrors `HandFan`'s own `hand[index] !==
  // undefined` guard for the identical reason).
  const isFocusable = (index: number) =>
    buffs[index] !== undefined && refusalFor(buffs[index]) === null
  const { groupRef, tabStopIndex, handleKeyDown } = useRovingTabIndex(
    buffs.length,
    isFocusable,
    noop,
  )

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') onClose()
  }

  return (
    <div
      className="wc-loadout"
      role="dialog"
      aria-label={LOADOUT_PANEL_LABEL}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handlePanelKeyDown}
    >
      <p className="wc-loadout-ap">
        {activation.apPool} action {activation.apPool === 1 ? 'point' : 'points'} left
      </p>
      {buffs.length === 0 ? (
        <p className="wc-loadout-empty">{LOADOUT_EMPTY_MESSAGE}</p>
      ) : (
        <div className="wc-loadout-rows" ref={groupRef} onKeyDown={handleKeyDown}>
          {buffs.map((buff, index) => {
            const refusal = refusalFor(buff)
            const isPoised = poised === buff.id
            return (
              <div key={buff.id} className="wc-loadout-row">
                <button
                  type="button"
                  className={`wc-loadout-buff${isPoised ? ' is-poised' : ''}`}
                  aria-pressed={poised === buff.id}
                  aria-label={buffRowAccessibleName(buff, apCostFor(buff), isPoised, refusal)}
                  disabled={refusal !== null}
                  tabIndex={index === tabStopIndex ? 0 : -1}
                  onClick={() => onTapBuff(buff.id)}
                >
                  {buffLine(buff, apCostFor(buff))}
                </button>
                {refusal !== null && (
                  <p className="wc-loadout-refusal">{BUFF_ACTIVATION_REFUSAL_MESSAGE[refusal]}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
      <div className="wc-loadout-divider" aria-hidden="true" />
      <CheatSlots
        cheats={cheats}
        selection={cheatSelection}
        interactive={interactive}
        onTap={onTapCheat}
        onCancel={onCancelCheat}
      />
      <TimebombCharge
        charges={timebombCharges}
        stage={timebombStage}
        interactive={interactive}
        onTap={onTapTimebomb}
        onCancel={onCancelTimebomb}
      />
    </div>
  )
}
