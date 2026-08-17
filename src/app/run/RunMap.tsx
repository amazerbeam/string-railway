import { OpponentKind, PathNodeStatus, type PathStage } from '../../hunt'
import { RUN_MAP_GROUP_LABEL } from './runLabels'
import './runMap.css'

interface RunMapProps {
  /** From `runPath(beatenCount(run))`. Derived by the driver, NEVER here. */
  readonly stages: readonly PathStage[]
  /** From `runGoalText(...)` — already worded, so this component holds no copy rule. */
  readonly goalText: string
}

/**
 * The run's path (DLR-85 AC3-AC7): one horizontal line, a short tick per ordinary opponent
 * and a filled block per stage boss, in run order, every node named.
 *
 * Computes NOTHING — a `ShopPanel` clone in discipline. Stage grouping and node status both
 * arrive already decided by `src/hunt/runPath.ts`, so this component cannot disagree with the
 * run module about who has been beaten.
 *
 * A STATUS DISPLAY, not a control group: nothing on the path is clickable, because route
 * choice is out of scope for this ticket. So there are no tab stops and no roving tabindex —
 * twenty-five tab stops would breach `game-ux`'s own threshold rather than satisfy it.
 *
 * All three states read WITHOUT colour: a beaten node's name sits in `<s>`, a boss is a block
 * against an ordinary opponent's thin tick, and the current node carries a caret and a taller
 * glyph. A greyscale screenshot still tells them apart.
 *
 * Layout per `.claude/contract/DLR-85-start-screen-and-run-map/mockup.html`, screens 1 and 3.
 */
export default function RunMap({ stages, goalText }: RunMapProps) {
  const total = stages.reduce((n, stage) => n + stage.nodes.length, 0)
  return (
    <>
      <p className="run-path-goal">{goalText}</p>
      <ol className="run-path" aria-label={RUN_MAP_GROUP_LABEL}>
        {stages.map((stage) => (
          <li key={stage.stageNumber} className="run-path-stage">
            <ol className="run-path-stage-nodes">
              {stage.nodes.map((node) => (
                <li
                  key={node.index}
                  className="run-path-node"
                  data-status={node.status}
                  data-final={node.index === total - 1 ? 'true' : undefined}
                  {...(node.status === PathNodeStatus.Current ? { 'aria-current': 'step' } : {})}
                >
                  <span className="run-path-glyph" aria-hidden="true">
                    <span
                      className={
                        node.kind === OpponentKind.Boss ? 'run-path-block' : 'run-path-tick'
                      }
                    />
                  </span>
                  <span className="run-path-name">
                    {node.status === PathNodeStatus.Beaten ? <s>{node.name}</s> : node.name}
                  </span>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </>
  )
}
