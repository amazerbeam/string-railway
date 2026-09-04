import type { KeyboardEvent, RefObject } from 'react'
import type { BuffTier } from '../../hunt'
import WildTargetCard from './WildTargetCard'
import type { WildTargetTile } from './manageBuffs'
import {
  MANAGE_BUFFS_WILD_CANCEL_LABEL,
  MANAGE_BUFFS_WILD_NO_TARGETS,
  MANAGE_BUFFS_WILD_REFUSED_BAND,
  MANAGE_BUFFS_WILD_TARGET_BAND,
} from './manageBuffsLabels'

export interface WildTargetBandsProps {
  readonly readyTargets: readonly WildTargetTile[]
  readonly refusedTargets: readonly WildTargetTile[]
  /** The tier of the wildcard that would be spent. `null` only if the band above vanished between
   *  renders, in which case each tile falls back to its own tier — `WildTargetCard` needs a tier
   *  to name what is destroyed, and a missing one is not worth a crash. */
  readonly wildcardTier: BuffTier | null
  readonly held: number
  readonly armedKey: string | null
  readonly tabStopIndex: number
  readonly groupRef: RefObject<HTMLDivElement | null>
  readonly onGridKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  readonly onArm: (key: string) => void
  readonly onCommit: (key: string) => void
  readonly onCancelArmed: (key: string) => void
  /** Leaves the target mode entirely, keeping the wildcard. */
  readonly onLeave: () => void
  /** The focus-restore key the panel puts on the cancel control, so it can hand focus back to it. */
  readonly cancelFocusKey: string
}

/**
 * DLR-162 — the wildcard's target mode: the way out, then the targets that can take the spend, then
 * the ones that cannot, each with its reason on its face.
 *
 * Split out of `ManageBuffsPanel.tsx` on the DLR-162..167 fix pass, once that file passed its
 * 400-line budget. The seam is the mode, not the line count: this is the whole of what the screen
 * shows while `targeting` is true, and it decides nothing — every piece of state and every handler
 * arrives as a prop, exactly as `CombineGroupCard` and `WildTargetCard` already work.
 *
 * The cancel control renders UNCONDITIONALLY, ahead of both bands. That is the fix, not a
 * decoration: the mode used to be escapable only by `Escape` on the ready grid, which is a control
 * a mouse-only player cannot reach and which does not render at all when nothing can take the
 * spend.
 */
export default function WildTargetBands({
  readyTargets,
  refusedTargets,
  wildcardTier,
  held,
  armedKey,
  tabStopIndex,
  groupRef,
  onGridKeyDown,
  onArm,
  onCommit,
  onCancelArmed,
  onLeave,
  cancelFocusKey,
}: WildTargetBandsProps) {
  return (
    <>
      {/* A plain `<button>` for the reason every other control on this screen is one: native
          focusability, the button role, and Enter/Space activation for free. */}
      <div className="mb-wild-actions">
        <button
          type="button"
          className="mb-go mb-go-quiet"
          onClick={onLeave}
          data-wild-key={cancelFocusKey}
        >
          {MANAGE_BUFFS_WILD_CANCEL_LABEL}
        </button>
      </div>
      {readyTargets.length === 0 && refusedTargets.length === 0 && (
        // `game-ux` — a screen with nothing to offer says so plainly and points at the way out.
        <p className="mb-empty">{MANAGE_BUFFS_WILD_NO_TARGETS}</p>
      )}
      {readyTargets.length > 0 && (
        <section className="mb-bandrow">
          <h2 className="mb-bandhead">
            <span className="mb-pip" aria-hidden="true" />
            {MANAGE_BUFFS_WILD_TARGET_BAND} · {readyTargets.length}
          </h2>
          <div
            className="mb-grid"
            role="group"
            aria-label={MANAGE_BUFFS_WILD_TARGET_BAND}
            ref={groupRef}
            tabIndex={-1}
            onKeyDown={onGridKeyDown}
          >
            {readyTargets.map((tile, index) => (
              <WildTargetCard
                key={tile.key}
                tile={tile}
                armed={armedKey === tile.key}
                wildcardTier={wildcardTier ?? tile.buff.tier}
                held={held}
                tabStop={index === tabStopIndex}
                onArm={() => onArm(tile.key)}
                onCommit={() => onCommit(tile.key)}
                onCancel={() => onCancelArmed(tile.key)}
              />
            ))}
          </div>
        </section>
      )}
      {refusedTargets.length > 0 && (
        <section className="mb-bandrow mb-bandrow-refused">
          <h2 className="mb-bandhead is-refused">
            <span className="mb-pip" aria-hidden="true" />
            {MANAGE_BUFFS_WILD_REFUSED_BAND} · {refusedTargets.length}
          </h2>
          <ul className="mb-grid" role="group" aria-label={MANAGE_BUFFS_WILD_REFUSED_BAND}>
            {refusedTargets.map((tile) => (
              <WildTargetCard
                key={tile.key}
                tile={tile}
                armed={false}
                wildcardTier={wildcardTier ?? tile.buff.tier}
                held={held}
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
  )
}
