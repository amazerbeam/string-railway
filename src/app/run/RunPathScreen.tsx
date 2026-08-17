import type { PathStage } from '../../hunt'
import RunMap from './RunMap'
import './run.css'
import './runMap.css'

interface RunPathScreenProps {
  readonly title: string
  readonly stages: readonly PathStage[]
  /** Already worded by `runGoalText`. */
  readonly goalText: string
  /** Already worded — `fightLabel(firstName)` on the start screen, `MAP_BACK_LABEL` on the map. */
  readonly actionLabel: string
  readonly onAction: () => void
}

/**
 * The path, full-viewport, with one forward control (DLR-85 AC1, AC9).
 *
 * ONE component for BOTH surfaces — the start screen before fight one and the map reached
 * between fights — because they are the same layout and differ only in their title and their
 * button's label. Two near-identical siblings would be duplication for a two-string
 * difference.
 *
 * Computes NOTHING; mounts inside `run.css`'s existing `.run-shell` rather than defining a
 * second full-viewport shell, so there is one `100dvh` grid in the codebase to keep right.
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
}: RunPathScreenProps) {
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
        <div className="run-actions">
          <button type="button" className="run-btn is-primary" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
