import type { Dispatch, SetStateAction } from 'react'
import { buffCombineKey, combineBuffs, type RunState } from '../../hunt'
import { manageBuffsView, type ManageBuffsView } from './manageBuffs'

export interface ManageBuffsHandle {
  readonly view: ManageBuffsView
  /** Commits the combine and returns the produced pile's key, so the panel can badge the pile the
   *  new card landed in. Returns the key rather than the card: the panel deals in piles. */
  readonly combine: (key: string) => string
}

/**
 * DLR-159 — the Manage Buffs screen's run-facing half, extracted from the panel exactly as
 * `useShopSlot` is extracted from `ShopPanel`. Holds no state of its own: the pile lives on
 * `RunState` and the armed/just-made state is the panel's own ephemeral view state.
 */
export function useManageBuffs(
  run: RunState,
  setRun: Dispatch<SetStateAction<RunState>>,
): ManageBuffsHandle {
  const view = manageBuffsView(run.buffs)

  function combine(key: string): string {
    // The produced pile's key is derived from the pile being spent, not from the new run — the
    // functional update has not run yet, and reading `run` after `setRun` would read the stale
    // one. Two cards of tier T always produce one of `nextBuffTierAfter(T)` of the same card, so
    // the key is knowable before the write.
    const group = view.groups.find((candidate) => candidate.key === key)
    if (group === undefined || group.produces === null) {
      throw new RangeError(`Cannot combine ${key} — no such pile is ready on this screen`)
    }
    const producedKey = buffCombineKey(group.produces)
    setRun((current) => combineBuffs(current, key))
    return producedKey
  }

  return { view, combine }
}
