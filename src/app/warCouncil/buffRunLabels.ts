/**
 * DLR-160 Phase 5 — the run word and suit lookup shared by `BuffRunTab.tsx` (the grid's run
 * header) and `BuffSuitFilter.tsx` (AC8's suit filter chip row), so the five runs' names and
 * suits are stated once. Split out of `BuffRunTab.tsx` because a component file that also exports
 * a plain constant trips `react-refresh/only-export-components` — this file exports no component
 * at all, so Fast Refresh has nothing to complain about.
 */
import { BuffTargetSuit } from '../../hunt'
import { BuffRunKind } from './buffGalleryModel'

export const RUN_LABEL: Readonly<Record<BuffRunKind, string>> = {
  [BuffRunKind.Bells]: 'Bells',
  [BuffRunKind.Keys]: 'Keys',
  [BuffRunKind.Moons]: 'Moons',
  [BuffRunKind.Suitless]: 'No suit',
  [BuffRunKind.Press]: 'Press',
}

export const RUN_SUIT: Readonly<Partial<Record<BuffRunKind, BuffTargetSuit>>> = {
  [BuffRunKind.Bells]: BuffTargetSuit.Bells,
  [BuffRunKind.Keys]: BuffTargetSuit.Keys,
  [BuffRunKind.Moons]: BuffTargetSuit.Moons,
}
