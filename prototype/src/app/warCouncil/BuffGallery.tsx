import { Fragment, useState, type KeyboardEvent } from 'react'
import { BuffActivationRefusal, BuffTier, type BuffId } from '../../hunt'
import { LOADOUT_PANEL_LABEL } from './actionBarLabels'
import BuffCard from './BuffCard'
import { buffStackKey, type BuffGalleryView, type BuffRun } from './buffGalleryModel'
import { BUFF_ACTIVATION_REFUSAL_MESSAGE } from './buffLabels'
import BuffRunTab from './BuffRunTab'
import BuffSuitFilter from './BuffSuitFilter'
import BuffTierFilter from './BuffTierFilter'
import {
  ALL_FILTERS,
  matchesFilter,
  runCountsFor,
  type BuffGalleryFilter,
} from './buffSuitFilterModel'
import { PlaceKind } from './cardPlacement'
import { anchorKeyFor, useMotionAnchors } from './motionAnchorContext'
import { useRovingTabIndex } from './useRovingTabIndex'
import './warCouncilBuffGallery.css'
import './warCouncilBuffCard.css'

export interface BuffGalleryProps {
  readonly view: BuffGalleryView
  readonly poised: BuffId | null
  readonly onTapBuff: (id: BuffId) => void
  readonly onCancelPoise: () => void
  readonly onClose: () => void
}

/** A stable no-op — `Escape` is handled once, on the outer container (see the component
 *  docblock), so the roving-tabindex group's own `onCancel` is never wired to anything.
 *  Module-level rather than recreated per render, mirroring the retired `BuffLoadoutPanel`'s
 *  identical precaution. */
function noop() {}

/** "3 cards — not between tricks" / "5 cards — for different reasons" when the fenced stacks
 *  do not share one reason. Reuses `BUFF_ACTIVATION_REFUSAL_MESSAGE` rather than authoring a
 *  second copy of the same sentence. */
function fenceReasonText(count: number, reason: BuffActivationRefusal | null): string {
  const noun = count === 1 ? 'card' : 'cards'
  const clause =
    reason !== null
      ? BUFF_ACTIVATION_REFUSAL_MESSAGE[reason].replace(/\.$/, '').toLowerCase()
      : 'for different reasons'
  return `${count} ${noun} — ${clause}`
}

/**
 * DLR-148 Phase 3 — replaces `BuffLoadoutPanel`. Renders a `BuffGalleryView` it never builds
 * itself (`buffGallery.ts` owns run grouping, duplicate collapse and the fence) and decides
 * nothing about a card's own state.
 *
 * Keeps `role="dialog"` and `aria-label={LOADOUT_PANEL_LABEL}` — **load-bearing**:
 * `WarCouncilRound.actionBar.test.tsx` reaches this
 * panel through `getByRole('dialog', { name: 'Your buffs' })`. Keeps the outer
 * `onClick={(e) => e.stopPropagation()}` too — this mounts inside `.wc-table`, which fires
 * `handleCarryOn` on click whenever the felt is waiting.
 *
 * The tier and suit filters are ONE component-local `useState<BuffGalleryFilter>` — ephemeral view
 * state that dies with the panel, not round state — so `buildBuffGallery` is never re-run here:
 * this component only FILTERS the `BuffGalleryView` it was given, locally, once per render. A
 * single filter object rather than two independent `useState` calls means a pair the counts were
 * never recomputed over is unexpressible — the same argument `roundUiState.ts` makes for
 * `discardSelection` and `loadout` being single nullable fields (DLR-160 AC8).
 *
 * The roving collection is the GRID's cards and nothing else. `useRovingTabIndex` indexes
 * `groupRef.current.querySelectorAll('button')` POSITIONALLY with no typed contract, so every
 * focusable control inside `groupRef` must be a native `<button>` in DOM order — which is why the
 * run tabs are `<div>`s and BOTH filter rows render ABOVE this element, outside the ref.
 */
export default function BuffGallery({
  view,
  poised,
  onTapBuff,
  onCancelPoise,
  onClose,
}: BuffGalleryProps) {
  const [filter, setFilter] = useState<BuffGalleryFilter>(ALL_FILTERS)
  // DLR-157 — one anchor per gallery card, slotted by the id a tap actually activates
  // (`stack.ids[0]`, the same id `BuffCard`'s own `onClick` uses). `register`, not the
  // `useMotionAnchor` hook: this component attaches one per stack inside a `.map`.
  const { register } = useMotionAnchors()

  const counts: Record<BuffTier | 'all', number> = {
    all: view.held,
    [BuffTier.Bronze]: 0,
    [BuffTier.Silver]: 0,
    [BuffTier.Gold]: 0,
  }
  for (const run of view.runs) {
    for (const stack of run.stacks) counts[stack.buff.tier] += stack.count
  }
  for (const stack of view.fence.stacks) counts[stack.buff.tier] += stack.count

  // The suit chips' own counts follow the TIER filter alone (`runCountsFor`'s contract) — picking
  // Gold narrows what the suit row reports before a suit is even picked.
  const runCounts = runCountsFor(view, filter.tier)

  const runs: readonly BuffRun[] = view.runs
    .map((run) => ({
      ...run,
      stacks: run.stacks.filter((stack) => matchesFilter(stack, filter)),
    }))
    .filter((run) => run.stacks.length > 0)
  const fenceStacks = view.fence.stacks.filter((stack) => matchesFilter(stack, filter))
  const fenceHeld = fenceStacks.reduce((sum, stack) => sum + stack.count, 0)
  // Recomputed over the FILTERED stacks, not read from `view.fence.reason` — the tier and suit
  // filters together can narrow a mixed-reason fence down to one that shares a single reason, or
  // the reverse, and the fence's own note must follow what is actually on screen under BOTH axes.
  const fenceReasons = new Set(fenceStacks.map((stack) => stack.refusal))
  const fenceReason = fenceReasons.size === 1 ? (fenceStacks[0]?.refusal ?? null) : null

  const cards = runs.flatMap((run) => run.stacks)
  // Guards against `cards[index]` being undefined: the hook probes `isFocusable(0)`
  // unconditionally even when the collection is empty. This exact gap caused an
  // integration-only crash before; it is load-bearing, not defensive noise.
  const isFocusable = (index: number) => cards[index] !== undefined && cards[index].refusal === null
  const { groupRef, tabStopIndex, handleKeyDown } = useRovingTabIndex(
    cards.length,
    isFocusable,
    noop,
  )

  function handleGalleryKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    if (poised !== null) onCancelPoise()
    else onClose()
  }

  // Looked up rather than incremented inside the JSX below — mutating a variable captured by a
  // render-time closure is exactly what the immutability lint rule (and the eventual React
  // Compiler) forbids, so the index-per-stack lookup is built as an ordinary map beforehand.
  const cardIndexByKey = new Map<string, number>(
    cards.map((stack, index) => [buffStackKey(stack.buff), index]),
  )

  return (
    <div
      className="wc-gallery"
      role="dialog"
      aria-label={LOADOUT_PANEL_LABEL}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={handleGalleryKeyDown}
    >
      <header className="wc-gallery-head">
        <h2>{LOADOUT_PANEL_LABEL}</h2>
        <span className="wc-gallery-fig">
          <b>{view.held}</b> held
        </span>
        <span className="wc-gallery-fig">
          <b>{view.usable}</b> usable now
        </span>
      </header>
      <div className="wc-gallery-body">
        <BuffTierFilter
          counts={counts}
          selected={filter.tier}
          onSelect={(tier) => setFilter({ ...filter, tier })}
        />
        <BuffSuitFilter
          counts={runCounts}
          selected={filter.run}
          onSelect={(run) => setFilter({ ...filter, run })}
        />
        <div className="wc-gallery-scroll">
          <div
            className="wc-gallery-grid"
            role="group"
            aria-label="Usable buffs"
            ref={groupRef}
            onKeyDown={handleKeyDown}
          >
            {runs.map((run) => (
              <Fragment key={run.kind}>
                <BuffRunTab kind={run.kind} held={run.held} />
                {run.stacks.map((stack) => {
                  const key = buffStackKey(stack.buff)
                  const index = cardIndexByKey.get(key) ?? -1
                  return (
                    <BuffCard
                      key={key}
                      stack={stack}
                      poised={poised !== null && stack.ids[0] === poised}
                      tabIndex={index === tabStopIndex ? 0 : -1}
                      onTap={onTapBuff}
                      ref={register(
                        anchorKeyFor({ kind: PlaceKind.BuffGallery, slot: String(stack.ids[0]) }),
                      )}
                    />
                  )
                })}
              </Fragment>
            ))}
          </div>
          {/* Two filters together can narrow to an intersection a single filter could not reach
              on its own — say a line rather than an empty grid, which reads as broken rather than
              deliberate. Never shown for the unfiltered view: an empty pile has its own quiet
              empty grid, per `game-ux`'s rule against a panel that reports nothing every turn. */}
          {cards.length === 0 &&
            fenceStacks.length === 0 &&
            (filter.tier !== 'all' || filter.run !== 'all') && (
              <p className="wc-gallery-empty">No buffs match this filter.</p>
            )}
          {fenceStacks.length > 0 && (
            <div className="wc-fence">
              <div className="wc-fence-row">
                {fenceStacks.map((stack) => (
                  <BuffCard
                    key={buffStackKey(stack.buff)}
                    stack={stack}
                    poised={false}
                    tabIndex={-1}
                    onTap={onTapBuff}
                    ref={register(
                      anchorKeyFor({ kind: PlaceKind.BuffGallery, slot: String(stack.ids[0]) }),
                    )}
                  />
                ))}
              </div>
              <div className="wc-fence-why">
                <span className="wc-fence-why-label">NOT USABLE NOW</span>
                <span className="wc-fence-why-reason">
                  {fenceReasonText(fenceHeld, fenceReason)}
                </span>
                <span className="wc-fence-why-note">
                  They keep their place at the end of the list until they can be used.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
