import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Buff } from '../../hunt'
import CombineGroupCard from './CombineGroupCard'
import type { ManageBuffsView } from './manageBuffs'
import {
  MANAGE_BUFFS_BACK_LABEL,
  MANAGE_BUFFS_EMPTY,
  MANAGE_BUFFS_HELD_LABEL,
  MANAGE_BUFFS_READY_BAND,
  MANAGE_BUFFS_READY_LABEL,
  MANAGE_BUFFS_REFUSED_BAND,
  MANAGE_BUFFS_RULE,
  MANAGE_BUFFS_SPEND,
  MANAGE_BUFFS_TITLE,
  combineDoneText,
} from './manageBuffsLabels'
import { useRovingTabIndex } from '../warCouncil/useRovingTabIndex'
import './manageBuffs.css'

export interface ManageBuffsPanelProps {
  readonly view: ManageBuffsView
  /** Returns the produced pile's key, which the panel badges. */
  readonly onCombine: (key: string) => string
  readonly onLeave: () => void
}

/** What just landed — which pile, and the sentence the ledger's `role="status"` line announces.
 *  Stands until the next combine replaces it: no timer, because a mark that has faded by the time
 *  the player looks is the same as no mark. */
interface JustMade {
  readonly key: string
  readonly text: string
}

/**
 * DLR-159 — the Manage Buffs screen. A three-row full-viewport grid: a status strip on the top
 * edge, the two bands of piles in the middle, and a ledger on the bottom edge. Computes nothing
 * about the run — `view` arrives whole from `useManageBuffs`, and this component owns three
 * pieces of ephemeral view state: which pile is armed, which pile was just made, and which tile a
 * cancel or a commit owes focus to once its DOM lands.
 *
 * `Escape` and the arrow keys are plain `onKeyDown` handlers with no effect behind them. The one
 * effect this component does register — restoring focus after a cancel or a commit swaps or
 * removes the tile that had it — creates no subscription, timer, or observer, so it has nothing
 * for a cleanup to release.
 */
export default function ManageBuffsPanel({ view, onCombine, onLeave }: ManageBuffsPanelProps) {
  const [armedKey, setArmedKey] = useState<string | null>(null)
  const [justMade, setJustMade] = useState<JustMade | null>(null)
  // Keys to try, in order, for the tile that should receive focus once the DOM this action just
  // changed has actually re-rendered — a cancel or a commit swaps or removes the focused node, so
  // the browser would otherwise drop focus to `document.body`. A ref rather than state: the effect
  // below only reads and clears it, and never calls `setState` from inside itself — `focusTick` is
  // the piece of state that schedules the effect to run once more.
  const focusRequestRef = useRef<readonly string[] | null>(null)
  const [focusTick, setFocusTick] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)

  function requestFocus(keys: readonly string[]) {
    focusRequestRef.current = keys
    setFocusTick((tick) => tick + 1)
  }

  const readyGroups = view.groups.filter((group) => group.refusal === null)
  const refusedGroups = view.groups.filter((group) => group.refusal !== null)

  function cancelArmedOrLeave() {
    if (armedKey !== null) setArmedKey(null)
    else onLeave()
  }

  // The roving collection is the READY piles only — a refused pile carries no button at all, so
  // it never occupies a slot in the group's positional button query.
  const { groupRef, tabStopIndex, handleKeyDown } = useRovingTabIndex(
    readyGroups.length,
    (index) => readyGroups[index] !== undefined,
    cancelArmedOrLeave,
  )

  // Runs after a cancel or a commit has re-rendered the grid — never synchronously in the click or
  // keydown handler, since the tile being focused may not exist in the DOM until this render lands.
  // Reads and clears the ref rather than calling `setState`, so the effect body updates only the
  // DOM (the external system a focus effect is meant to synchronise with) and creates no
  // subscription — nothing for a cleanup to release.
  useEffect(() => {
    const keys = focusRequestRef.current
    if (keys === null) return
    focusRequestRef.current = null
    let target: HTMLElement | null = null
    for (const key of keys) {
      target = panelRef.current?.querySelector<HTMLElement>(`[data-combine-key="${key}"]`) ?? null
      if (target !== null) break
    }
    target = target ?? groupRef.current ?? backRef.current
    target?.focus()
  }, [focusTick, groupRef])

  function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // While a pile is armed its tile is no longer a roving-tabindex member — it has become its
    // own two-button confirmation face, with focus already on `Combine`. Arrow-key movement is
    // withheld here so it cannot steal focus off that face; `Escape` still cancels.
    if (armedKey !== null) {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestFocus([armedKey])
        setArmedKey(null)
      }
      return
    }
    handleKeyDown(event)
  }

  function handleCancel(key: string) {
    requestFocus([key])
    setArmedKey(null)
  }

  function handleCommit(key: string) {
    const group = view.groups.find((candidate) => candidate.key === key)
    if (group === undefined || group.produces === null) return
    const spent: Buff = group.buff
    const made: Buff = group.produces
    const producedKey = onCombine(key)
    setArmedKey(null)
    setJustMade({ key: producedKey, text: combineDoneText(spent, made) })
    // Prefer the tile that was armed — a pile with more than two copies is still there, just
    // shorter by two — and fall back to the produced pile's own tile otherwise.
    requestFocus([key, producedKey])
  }

  return (
    <div className="mb-shell" ref={panelRef}>
      <header className="mb-status">
        <span className="mb-title">{MANAGE_BUFFS_TITLE}</span>
        <span className="mb-stat">
          <span className="mb-stat-value">{view.held}</span>
          <span className="mb-stat-label">{MANAGE_BUFFS_HELD_LABEL}</span>
        </span>
        <span className="mb-stat">
          <span className="mb-stat-value">{view.readyCount}</span>
          <span className="mb-stat-label">{MANAGE_BUFFS_READY_LABEL}</span>
        </span>
        <p className="mb-rule">{MANAGE_BUFFS_RULE}</p>
        <button type="button" className="mb-back" onClick={onLeave} ref={backRef}>
          {MANAGE_BUFFS_BACK_LABEL}
        </button>
      </header>

      <main className="mb-stage">
        {view.groups.length === 0 ? (
          // `game-ux` — a panel with nothing to say says nothing, plainly, and points at the
          // thing to do about it.
          <p className="mb-empty">{MANAGE_BUFFS_EMPTY}</p>
        ) : (
          <>
            {readyGroups.length > 0 && (
              <section className="mb-bandrow">
                <h2 className="mb-bandhead">
                  <span className="mb-pip" aria-hidden="true" />
                  {MANAGE_BUFFS_READY_BAND} · {readyGroups.length}
                </h2>
                <div
                  className="mb-grid"
                  role="group"
                  aria-label={MANAGE_BUFFS_READY_BAND}
                  ref={groupRef}
                  tabIndex={-1}
                  onKeyDown={handleGridKeyDown}
                >
                  {readyGroups.map((group, index) => (
                    <CombineGroupCard
                      key={group.key}
                      group={group}
                      armed={armedKey === group.key}
                      justMade={justMade !== null && justMade.key === group.key}
                      held={view.held}
                      tabStop={index === tabStopIndex}
                      onArm={() => setArmedKey(group.key)}
                      onCommit={() => handleCommit(group.key)}
                      onCancel={() => handleCancel(group.key)}
                    />
                  ))}
                </div>
              </section>
            )}
            {refusedGroups.length > 0 && (
              <section className="mb-bandrow mb-bandrow-refused">
                <h2 className="mb-bandhead is-refused">
                  <span className="mb-pip" aria-hidden="true" />
                  {MANAGE_BUFFS_REFUSED_BAND} · {refusedGroups.length}
                </h2>
                <ul className="mb-grid" role="group" aria-label={MANAGE_BUFFS_REFUSED_BAND}>
                  {refusedGroups.map((group) => (
                    <CombineGroupCard
                      key={group.key}
                      group={group}
                      armed={false}
                      justMade={justMade !== null && justMade.key === group.key}
                      held={view.held}
                      tabStop={false}
                      onArm={() => {}}
                      onCommit={() => {}}
                      onCancel={() => {}}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="mb-foot">
        <span className="mb-log" role="status" aria-live="polite">
          {justMade?.text ?? ''}
        </span>
        <span className="mb-spend">{MANAGE_BUFFS_SPEND}</span>
      </footer>
    </div>
  )
}
