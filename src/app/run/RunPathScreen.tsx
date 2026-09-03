import type { Buff, PathStage } from '../../hunt'
import { heldBuffStacks } from './heldBuffs'
import HeldBuffCard from './HeldBuffCard'
import RunMap from './RunMap'
import './run.css'
import './runMap.css'
// `HeldBuffCard` renders a `.shop-held-card` `<li>` — importing the shop's own stylesheet for it
// (rather than restating its width fix here) is what keeps "the same metal card the shop shows"
// from also needing a second, possibly-drifting copy of that card's sizing rule.
import './shopHeld.css'

interface RunPathScreenProps {
  readonly title: string
  readonly stages: readonly PathStage[]
  /** Already worded by `runGoalText`. */
  readonly goalText: string
  /** Already worded — `fightLabel(firstName)` on the start screen, `MAP_BACK_LABEL` on the map. */
  readonly actionLabel: string
  readonly onAction: () => void
  /** DLR-160 AC9 — the buffs to show in a read-only tray beneath the map. `undefined` on the
   *  start and map screens, which have nothing to review; present only on the pre-fight screen. */
  readonly heldBuffs?: readonly Buff[]
}

/** PLACEHOLDER COPY, the developer's, exactly as every other string this module states is. */
const RUN_PATH_TRAY_HEAD = 'What you hold'
const RUN_PATH_TRAY_EMPTY = 'You hold nothing yet.'

/**
 * The path, full-viewport, with one forward control (DLR-85 AC1, AC9).
 *
 * ONE component for THREE surfaces now — the start screen before fight one, the map reached
 * between fights, and (DLR-160 AC9) the pre-fight review reached from the shop — because all
 * three are the same layout and differ only in title, action label, and whether there is
 * anything to review. Three near-identical siblings would be duplication for a three-string
 * (plus one optional region) difference.
 *
 * Computes NOTHING beyond the tray's own grouping: `heldBuffStacks` owns the piling and the
 * order (the SAME rule the shop's "What you hold" tray uses), `HeldBuffCard` owns every word and
 * every visual, and this component only places them. Mounts inside `run.css`'s existing
 * `.run-shell` rather than defining a second full-viewport shell, so there is one `100dvh` grid
 * in the codebase to keep right.
 *
 * NOT `ShopHeld` reused directly: that component carries the shop's Manage Buffs control and its
 * motion anchor (`useMotionAnchor`, resolved against the `MotionAnchorProvider` `ShopPanel`
 * mounts) — neither belongs on this screen, which can activate nothing and receives no flying
 * card.
 *
 * `Escape` fires the same action as the control, matching `ShopPanel`'s contract. It is a
 * container `onKeyDown`, NOT a document listener — so there is nothing to clean up and no
 * effect in this file at all.
 */
export default function RunPathScreen({
  title,
  stages,
  goalText,
  actionLabel,
  onAction,
  heldBuffs,
}: RunPathScreenProps) {
  const stacks = heldBuffs === undefined ? null : heldBuffStacks(heldBuffs)

  return (
    <div className="run-shell">
      <div
        className="run-path-screen"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onAction()
        }}
      >
        <h1 className="run-path-title">{title}</h1>
        <RunMap stages={stages} goalText={goalText} />
        {/* `game-ux` — no panel renders to say it has nothing to report. Absent entirely on the
            start and map screens (`stacks === null`); on the pre-fight screen it always has
            something to say, even at zero holdings, because "what you hold" is the very question
            this screen answers. */}
        {stacks !== null && (
          <section className="run-path-tray" aria-label={RUN_PATH_TRAY_HEAD}>
            <h2 className="run-path-tray-head">{RUN_PATH_TRAY_HEAD}</h2>
            {stacks.length === 0 ? (
              <p className="run-path-tray-empty">{RUN_PATH_TRAY_EMPTY}</p>
            ) : (
              <ul className="run-path-tray-cards">
                {stacks.map((stack) => (
                  <HeldBuffCard key={stack.buff.id} stack={stack} />
                ))}
              </ul>
            )}
          </section>
        )}
        <div className="run-actions">
          <button type="button" className="run-btn is-primary" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
