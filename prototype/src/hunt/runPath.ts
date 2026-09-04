import { OpponentKind, RUN_ENCOUNTERS, type RunEncounterConfig } from './config'

/**
 * DLR-85 AC6/AC7 — where one opponent stands relative to the player's progress.
 *
 * `Current` is the opponent about to be fought, and there is at most one: a fully beaten
 * run has none, which is why a caller reads the status rather than comparing indices.
 */
export const PathNodeStatus = {
  Beaten: 'beaten',
  Current: 'current',
  Upcoming: 'upcoming',
} as const
export type PathNodeStatus = (typeof PathNodeStatus)[keyof typeof PathNodeStatus]

/** One opponent on the path. */
export interface PathNode {
  /** 0-based index into the encounter list — stable, unique, and therefore the React key. */
  readonly index: number
  readonly name: string
  readonly kind: OpponentKind
  readonly status: PathNodeStatus
}

/** One group of the path: the opponents up to and including a boss. */
export interface PathStage {
  /** 1-based, for display. */
  readonly stageNumber: number
  readonly nodes: readonly PathNode[]
  /**
   * `true` when this stage ends in a boss. `false` for a trailing group with no boss after
   * it — which is the whole path of a flat run, the shape the ticket requires this render
   * "just as happily" as five stages.
   */
  readonly closedByBoss: boolean
}

/**
 * AC2/AC3/AC6/AC7 — the whole path, grouped into stages, every node tagged.
 *
 * Stages are DERIVED: a stage closes wherever a boss actually sits, so no stage count and
 * no opponents-per-stage figure appears here. Feed it three ordinary opponents and it
 * returns one stage of three ticks; feed it the shipped twenty-five and it returns five.
 *
 * Both guards throw rather than returning a plausible value, because both are caller or
 * configuration bugs and a silent fallback renders a wrong path forever with nothing in the
 * console to find it by. An empty list in particular would render an empty path — visible
 * as nothing at all, logged as nothing at all.
 */
export function runPath(
  beatenCount: number,
  encounters: readonly RunEncounterConfig[] = RUN_ENCOUNTERS,
): readonly PathStage[] {
  if (encounters.length === 0) {
    throw new RangeError('Cannot build a run path from an empty encounter list')
  }
  if (!Number.isInteger(beatenCount) || beatenCount < 0 || beatenCount > encounters.length) {
    throw new RangeError(
      `Cannot build a run path with ${beatenCount} beaten: it must be an integer in 0..${encounters.length}`,
    )
  }

  const stages: PathStage[] = []
  let nodes: PathNode[] = []

  encounters.forEach((encounter, index) => {
    nodes.push({
      index,
      name: encounter.name,
      kind: encounter.kind,
      status:
        index < beatenCount
          ? PathNodeStatus.Beaten
          : index === beatenCount
            ? PathNodeStatus.Current
            : PathNodeStatus.Upcoming,
    })
    if (encounter.kind === OpponentKind.Boss) {
      stages.push({ stageNumber: stages.length + 1, nodes, closedByBoss: true })
      nodes = []
    }
  })

  if (nodes.length > 0) {
    stages.push({ stageNumber: stages.length + 1, nodes, closedByBoss: false })
  }
  return stages
}
