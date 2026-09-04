import type { KeyboardEvent, ReactNode } from 'react'
import type { BuffId } from '../../hunt'
import {
  ARMING_CURSE_CLAIMED_TEXT,
  ARMING_CURSE_MODE_TEXT,
  ARMING_EMPTY_TEXT,
  ARMING_MAY_FIRE_TEXT,
  ARMING_NO_CHEAT_REMEDY,
  ARMING_NO_VALID_CARDS_TEXT,
  ARMING_SURFACE_LABEL,
  ARMING_UNLOCKS_CARD_TEXT,
  ARMING_WINDOW_TEXT,
} from './armingLabels'
import { ArmingMode, ArmingWindow, type ArmingSurfaceView } from './armingSurfaceModel'
import BuffCard from './BuffCard'
import { buffStackKey } from './buffGalleryModel'
import BuffRidingList from './BuffRidingList'
import { cardAccessibleName } from './labels'
import PlayingCard from './PlayingCard'
import { useRovingTabIndex } from './useRovingTabIndex'
import './warCouncilArming.css'

export interface ArmingSurfaceProps {
  readonly view: ArmingSurfaceView
  readonly poised: BuffId | null
  /** True while a buff card's activation flight is airborne — disables the riding strip's
   *  remove controls, exactly as `BuffRideZone` already passes it. */
  readonly removeDisabled: boolean
  readonly onTapBuff: (id: BuffId) => void
  readonly onCancelPoise: () => void
  /** `Escape`'s second press: clears the card selection. */
  readonly onCancelSelection: () => void
  readonly onRemoveBuff: (id: BuffId) => void
}

/** A stable no-op — `Escape` is handled once, on the outer container, so the roving-tabindex
 *  group's own `onCancel` is never wired to anything. Module-level rather than recreated per
 *  render, mirroring `BuffGallery`'s identical precaution. */
function noop() {}

/**
 * DLR-174 — the arming surface: tapping a card in hand raises it and this replaces the felt
 * stage with the raised card pinned at its head (its live win/lose figures beside it), the
 * window statement, and only the buffs that could still pay if this card is played this trick.
 *
 * Modelled on `BuffGallery.tsx` line for line: this component renders a view it never builds
 * (`buildArmingSurface`, Phase 1), keeps `onClick={(event) => event.stopPropagation()}` for the
 * identical reason (it mounts inside `.wc-table`, which fires `handleCarryOn` on click whenever
 * the felt is waiting), and takes its OWN distinct `role`/`aria-label` — never
 * `LOADOUT_PANEL_LABEL`, which seven existing specs reach the gallery by (`plan.md` Part 1 →
 * Config and persisted-shape audit).
 *
 * The buff list is ONE `useRovingTabIndex` group over `BuffCard` children, reused UNCHANGED so a
 * buff card looks identical in both surfaces — that hook indexes `groupRef.current.
 * querySelectorAll('button')` POSITIONALLY with no typed contract, so every focusable control
 * inside `groupRef` must stay a native `<button>` in DOM order, which is why the "may fire" note
 * and the row wrapper below are plain `<span>`/`<div>`s, never buttons.
 *
 * `Escape` unwinds ONE level: it drops a held poise first, and clears the card selection only on
 * the second press — a poise is reversible for free, so it goes first.
 *
 * No `useEffect`, no timer, no listener, no observer, no `requestAnimationFrame` — the rejection
 * shake is a CSS keyframe keyed off the head thumbnail's own `illegal` class
 * (`warCouncilArming.css`), not a JS timer, so it needs no cancellation and cannot strand if the
 * felt unmounts mid-shake. The only local state is the roving tabindex's own `focusedIndex`,
 * already inside `useRovingTabIndex`.
 */
export default function ArmingSurface({
  view,
  poised,
  removeDisabled,
  onTapBuff,
  onCancelPoise,
  onCancelSelection,
  onRemoveBuff,
}: ArmingSurfaceProps) {
  const cards = view.rows.map((row) => row.stack)
  // Guards against `cards[index]` being undefined, mirroring `BuffGallery`'s identical guard —
  // the hook probes `isFocusable(0)` unconditionally even when the collection is empty.
  const isFocusable = (index: number) => cards[index] !== undefined && cards[index].refusal === null
  const { groupRef, tabStopIndex, handleKeyDown } = useRovingTabIndex(
    cards.length,
    isFocusable,
    noop,
  )

  function handleSurfaceKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    if (poised !== null) onCancelPoise()
    else onCancelSelection()
  }

  // Looked up rather than incremented inside the JSX below, mirroring `BuffGallery`'s identical
  // precaution against mutating a variable captured by a render-time closure.
  const cardIndexByKey = new Map<string, number>(
    cards.map((stack, index) => [buffStackKey(stack.buff), index]),
  )

  // A held Cheat over an off-suit card widens the legal set rather than merely paying — the
  // lock AC7 exists for. Only ever one such row (Cheat is the sole unlocking kind), so `some`
  // is enough to switch the row-label and to suppress the win/lose slip: those figures describe
  // playing the card, which is not yet possible while it is still locked.
  const unlocking = view.rows.some((row) => row.unlocksCard)
  const headIllegal = view.mode === ArmingMode.NoValidCards || unlocking

  const windowClassName = `wc-arming-window${
    view.mode === ArmingMode.NoValidCards
      ? ' wc-is-shut'
      : view.mode === ArmingMode.CurseClaimed || view.window === ArmingWindow.CheatOnly
        ? ' wc-is-narrow'
        : ''
  }`

  return (
    <div
      className="wc-arming"
      role="dialog"
      aria-label={ARMING_SURFACE_LABEL}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={handleSurfaceKeyDown}
    >
      <div className="wc-arming-head">
        <div className="wc-arming-head-slot">
          {view.card !== null && (
            <PlayingCard card={view.card} variant="hand" illegal={headIllegal} tabIndex={-1} />
          )}
        </div>
        <div className="wc-arming-head-text">
          <p className="wc-arming-head-title">
            {view.card !== null ? cardAccessibleName(view.card) : ARMING_CURSE_CLAIMED_TEXT}
          </p>
          <p className="wc-arming-head-sub">{headSubFor(view, unlocking)}</p>
        </div>
        {view.damage !== null && !unlocking && (
          <div className="wc-arming-slip">
            <span className="wc-arming-slip-cell">
              <span className="wc-arming-slip-k">If you go high</span>
              <span className="wc-arming-slip-v wc-is-up">+{view.damage.winPot.trickDamage}</span>
            </span>
            <span className="wc-arming-slip-cell">
              <span
                className={`wc-arming-slip-v ${view.damage.lose.toPlayer > 0 ? 'wc-is-down' : 'wc-is-up'}`}
              >
                {view.damage.lose.toPlayer > 0 ? `-${view.damage.lose.toPlayer}` : '0'}
              </span>
              <span className="wc-arming-slip-k">If you go low</span>
            </span>
          </div>
        )}
        <div className={windowClassName}>
          <b>
            {view.mode === ArmingMode.NoValidCards
              ? ARMING_NO_VALID_CARDS_TEXT
              : ARMING_WINDOW_TEXT[view.window]}
          </b>
        </div>
      </div>
      <div className="wc-arming-body">
        {view.mode === ArmingMode.CurseClaimed && (
          <>
            <p className="wc-arming-row-label">{ARMING_CURSE_MODE_TEXT}</p>
            <p className="wc-arming-copy">{ARMING_CURSE_CLAIMED_TEXT}</p>
          </>
        )}
        {view.mode === ArmingMode.NoValidCards && view.refusal !== null && (
          <>
            <p className="wc-arming-row-label">{ARMING_NO_VALID_CARDS_TEXT}</p>
            <p className="wc-arming-copy">{view.refusal.reason}</p>
            <p className="wc-arming-copy wc-is-dim">{ARMING_NO_CHEAT_REMEDY}</p>
          </>
        )}
        {view.mode === ArmingMode.Card && view.rows.length === 0 && (
          <p className="wc-arming-row-label">{ARMING_EMPTY_TEXT}</p>
        )}
        {view.mode === ArmingMode.Card && view.rows.length > 0 && (
          <>
            <p className="wc-arming-row-label">
              {unlocking ? (
                ARMING_UNLOCKS_CARD_TEXT
              ) : (
                <>
                  <b>{view.rows.length}</b> {view.rows.length === 1 ? 'buff' : 'buffs'} could pay on
                  this card
                </>
              )}
            </p>
            <div
              className="wc-arming-grid"
              role="group"
              aria-label="Buffs for this card"
              ref={groupRef}
              onKeyDown={handleKeyDown}
            >
              {view.rows.map((row) => {
                const key = buffStackKey(row.stack.buff)
                const index = cardIndexByKey.get(key) ?? -1
                return (
                  <div className="wc-arming-row" key={key}>
                    <BuffCard
                      stack={row.stack}
                      poised={poised !== null && row.stack.ids[0] === poised}
                      tabIndex={index === tabStopIndex ? 0 : -1}
                      onTap={onTapBuff}
                    />
                    {row.mayFire && (
                      <span className="wc-arming-mayfire">{ARMING_MAY_FIRE_TEXT}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
      <BuffRidingList rows={view.riding} onRemove={onRemoveBuff} disabled={removeDisabled} />
    </div>
  )
}

/** The head's contextual sub-line, transcribed from `mockup.html`'s own `sub.innerHTML`
 *  assignments verbatim (lines 687, 704, 761, 764) — this is the developer's own authored copy,
 *  already read on screen, so it is reproduced rather than re-worded. `null` in `NoValidCards`
 *  mode: the reason and the remedy already carry that mode's whole statement in the body. */
function headSubFor(view: ArmingSurfaceView, unlocking: boolean): ReactNode | null {
  if (view.mode === ArmingMode.CurseClaimed) {
    return (
      <>
        Your next tap on a hand card <b>marks</b> it — arming is closed until it lands.
      </>
    )
  }
  if (view.mode === ArmingMode.NoValidCards) {
    return null
  }
  if (unlocking) {
    return (
      <>
        Off-suit — but a <b>Cheat</b> breaks follow-suit, and it is the one card still armable
        mid-trick.
      </>
    )
  }
  if (view.window === ArmingWindow.CheatOnly) {
    return (
      <>
        Arming closed when the lead landed. A held <b>Cheat</b> is the one card that still works.
      </>
    )
  }
  return 'Arm anything that pays on this card, then tap it again to play it.'
}
