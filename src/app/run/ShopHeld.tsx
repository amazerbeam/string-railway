import type { Buff } from '../../hunt'
import { PlaceKind } from '../warCouncil/cardPlacement'
import { useMotionAnchor } from '../warCouncil/motionAnchorContext'
import HeldBuffCard from './HeldBuffCard'
import { heldBuffStacks } from './heldBuffs'
import {
  SHOP_HELD_EMPTY,
  SHOP_HELD_GROUP_LABEL,
  SHOP_HELD_LABEL,
  SHOP_MANAGE_BUFFS_LABEL,
  heldCountText,
} from './shopLabels'
import './shopHeld.css'

/**
 * 2026-09-01 — the shop's "What you hold" tray.
 *
 * Answers the one question the old shop could not: the developer could see coins and health but had
 * no way to tell what cards they were carrying, because the screen simply never said. It shows the
 * held buffs as the SAME metallic cards the felt uses, not as a list of their names — the names are
 * agent-authored and carry no intuition on their own, so a list of them would restate the problem
 * rather than fix it.
 *
 * Computes nothing beyond grouping: `heldBuffStacks` owns the piling and the order, `buffLabels`
 * owns every word, and this component places them.
 *
 * DLR-157 Task 14 (M21/M22) — registers `PlaceKind.HeldTray` on the outer `<section>` rather than
 * the `<ul>` inside it, so the anchor exists even on an EMPTY tray (the `<ul>` only renders once
 * `stacks.length > 0`) — the very first purchase of a run must still have a destination to fly
 * toward. `ShopPanel.tsx` mounts the `MotionAnchorProvider` this resolves against.
 */
export default function ShopHeld({
  buffs,
  onManageBuffs,
}: {
  readonly buffs: readonly Buff[]
  /** DLR-159 AC1 — opens the Manage Buffs screen. Lives with the heading of the tray it acts on,
   *  rather than duplicated as a second block in `ShopPanel`. */
  readonly onManageBuffs: () => void
}) {
  const stacks = heldBuffStacks(buffs)
  const trayRef = useMotionAnchor({ kind: PlaceKind.HeldTray })

  return (
    <section className="shop-held" aria-label={SHOP_HELD_GROUP_LABEL} ref={trayRef}>
      <h2 className="shop-held-head">
        <span className="shop-held-title">{SHOP_HELD_LABEL}</span>
        {/* The count renders only when there IS something to count — `game-ux`'s rule against a
            readout that exists to report nothing. */}
        {buffs.length > 0 && <span className="shop-held-count">{heldCountText(buffs.length)}</span>}
        <button type="button" className="shop-held-manage" onClick={onManageBuffs}>
          {SHOP_MANAGE_BUFFS_LABEL}
        </button>
      </h2>
      {stacks.length === 0 ? (
        // Said once, plainly, and it points at the thing to do about it — an empty tray with no
        // words reads as a broken tray.
        <p className="shop-held-empty">{SHOP_HELD_EMPTY}</p>
      ) : (
        <ul className="shop-held-cards">
          {stacks.map((stack) => (
            <HeldBuffCard key={stack.buff.id} stack={stack} />
          ))}
        </ul>
      )}
    </section>
  )
}
