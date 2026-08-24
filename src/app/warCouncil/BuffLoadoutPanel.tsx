import { type KeyboardEvent } from 'react'
import {
  type ActionPoints,
  type Buff,
  type BuffActivationRefusal,
  type BuffActivationState,
  type BuffId,
} from '../../hunt'
import { LOADOUT_EMPTY_MESSAGE, LOADOUT_PANEL_LABEL } from './actionBarLabels'
import { BUFF_ACTIVATION_REFUSAL_MESSAGE, buffLine, buffRowAccessibleName } from './buffLabels'
import { useRovingTabIndex } from './useRovingTabIndex'
import './warCouncilActionBar.css'

/** A stable no-op — `Escape` is handled once, on the outer container (see the component
 *  docblock), so the roving-tabindex group's own `onCancel` is never wired to anything.
 *  Module-level rather than recreated per render, so the hook's dependency never looks like it
 *  changed. */
function noop() {}

export interface BuffLoadoutPanelProps {
  readonly buffs: readonly Buff[]
  readonly activation: BuffActivationState
  readonly poised: BuffId | null
  readonly refusalFor: (buff: Buff) => BuffActivationRefusal | null
  readonly apCostFor: (buff: Buff) => ActionPoints
  readonly onTapBuff: (id: BuffId) => void
  readonly onClose: () => void
}

/**
 * DLR-114 AC2, folded into ordinary rows on DLR-132 — opened by Apply Buff. One glanceable line
 * per owned, priced buff (`activatableBuffs` has already dropped the `Unassigned` placeholders
 * before this component ever sees `buffs`) and the hand's remaining AP. Cheat and Timebomb are
 * members of `buffs` like any other card — DLR-132 deleted the two bespoke widgets (`CheatSlots`,
 * `TimebombCharge`) and the divider that used to separate them from this list, so a row is now the
 * WHOLE of what this panel renders.
 *
 * `onClick` STOPS PROPAGATION for the load-bearing reason the retired felt-rail plates this panel
 * superseded always carried: this mounts inside `.wc-table`, which fires `handleCarryOn` on click
 * whenever the felt is waiting.
 *
 * `Escape` is handled ONCE, on this outer container. Before DLR-132 the inner roving-tabindex
 * group's own `onCancel` was a stubbed no-op specifically so a press inside the row list would
 * bubble up and close the panel exactly once rather than twice — `CheatSlots` and `TimebombCharge`
 * each handled their OWN `Escape` beside it (with a `stopPropagation` to keep it from double-firing
 * against this same container handler). Deleting both widgets is what lets that no-op go too:
 * there is now exactly one `Escape` handler in this component, on this container, full stop.
 *
 * TRAP, updated for DLR-132: `useRovingTabIndex` indexes `groupRef.current.querySelectorAll('button')`
 * POSITIONALLY, and the roving collection is now the WHOLE PANEL, not a sub-list beside two
 * exempted widgets — folding Cheat and Timebomb into the pile is exactly what bought this
 * simplification. Every focusable control in `groupRef` must still be a native `<button>` in DOM
 * order, and the `buffs[index] !== undefined && refusalFor(buffs[index]) === null` guard below is
 * STILL load-bearing: `useRovingTabIndex` probes `isFocusable(0)` unconditionally even when `buffs`
 * is empty (this is what an earlier ticket's integration-only crash — `isFocusable(0)` reaching
 * `apCostOf(undefined)` — was caused by), and the guard is what stands between an empty or
 * all-refused pile and that crash now that nothing else sits beside the list to accidentally mask
 * the gap.
 */
export default function BuffLoadoutPanel({
  buffs,
  activation,
  poised,
  refusalFor,
  apCostFor,
  onTapBuff,
  onClose,
}: BuffLoadoutPanelProps) {
  // Guards against `refusalFor(undefined)` — `useRovingTabIndex` probes `isFocusable(0)`
  // unconditionally even when `buffs` is empty (mirrors `HandFan`'s own `hand[index] !==
  // undefined` guard for the identical reason). Still load-bearing after DLR-132 — see the
  // component docblock's TRAP note.
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
    </div>
  )
}
