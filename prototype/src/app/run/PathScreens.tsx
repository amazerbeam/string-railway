import type { Buff, PathStage } from '../../hunt'
import RunPathScreen from './RunPathScreen'
import { MAP_BACK_LABEL, MAP_TITLE, START_TITLE } from './runLabels'

/** Shared by every `RunPathScreen` wrapper below, so `App.tsx` computes the path once for all
 *  three surfaces rather than each wrapper re-deriving it. */
interface PathScreenProps {
  readonly stages: readonly PathStage[]
  readonly goalText: string
}

/**
 * DLR-160 — three thin wrappers over `RunPathScreen`, lifted out of `App.tsx`'s inline branch
 * chain (400-line budget) so the pre-fight branch had somewhere to land. Each takes only the
 * props its own branch already computes; none of the three holds any logic of its own.
 */

export function StartScreen({
  stages,
  goalText,
  actionLabel,
  onAction,
}: PathScreenProps & { readonly actionLabel: string; readonly onAction: () => void }) {
  return (
    <RunPathScreen
      title={START_TITLE}
      stages={stages}
      goalText={goalText}
      actionLabel={actionLabel}
      onAction={onAction}
    />
  )
}

export function MapScreen({
  stages,
  goalText,
  onAction,
}: PathScreenProps & { readonly onAction: () => void }) {
  return (
    <RunPathScreen
      title={MAP_TITLE}
      stages={stages}
      goalText={goalText}
      actionLabel={MAP_BACK_LABEL}
      onAction={onAction}
    />
  )
}

/** DLR-160 AC9 — the pre-fight review, reached only from `leaveForNextFight` and left only by
 *  starting the fight. The one screen of the three that carries a held-buff tray. */
export function PreFightScreen({
  stages,
  goalText,
  actionLabel,
  onAction,
  heldBuffs,
}: PathScreenProps & {
  readonly actionLabel: string
  readonly onAction: () => void
  readonly heldBuffs: readonly Buff[]
}) {
  return (
    <RunPathScreen
      title={START_TITLE}
      stages={stages}
      goalText={goalText}
      actionLabel={actionLabel}
      onAction={onAction}
      heldBuffs={heldBuffs}
    />
  )
}
