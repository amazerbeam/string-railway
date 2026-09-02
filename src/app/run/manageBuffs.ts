import {
  buffCombineKey,
  combineRefusalFor,
  mintFromTemplate,
  nextBuffTierAfter,
  templateForBuff,
  type Buff,
  type BuffId,
  type CombineRefusal,
} from '../../hunt'
import { heldBuffStacks } from './heldBuffs'

/**
 * DLR-159 — what the Manage Buffs screen reads. Pure: no React, no DOM, tested with no renderer
 * under the `node` Vitest project.
 *
 * Reuses `heldBuffStacks` for the grouping rather than writing a second one — the shop tray and
 * this screen show the same piles of the same cards, and the only thing this screen adds is
 * whether a pile can be combined. `src/hunt/buffCombine.ts` owns the answer to that; this module
 * attaches it and orders the result.
 */

/** One pile, as the screen reads it. */
export interface CombineGroup {
  readonly key: string
  /** The copy the tile's wording and tier are drawn from. */
  readonly buff: Buff
  readonly count: number
  readonly ids: readonly BuffId[]
  /** `null` when this pile can be combined right now. */
  readonly refusal: CombineRefusal | null
  /** The card two copies would produce — non-null exactly when `refusal` is null. A real minted
   *  card, with a throwaway id, so the tile prints the produced card's OWN name, tier and payoff
   *  rather than a tier word and a guess at what it will pay. */
  readonly produces: Buff | null
}

export interface ManageBuffsView {
  /** Ready piles first, then refused ones, keeping `heldBuffStacks`'s tier-descending order within
   *  each band — the loadout grid's own rule: what you can act on sits where you look first, and
   *  what you cannot moves to the end carrying its reason. */
  readonly groups: readonly CombineGroup[]
  /** Copies held. The screen's headline figure and the N in "N → N−1". */
  readonly held: number
  readonly readyCount: number
}

/** The id the produced-card preview is minted with. Never reaches a run — the preview exists only
 *  so the tile can word the card. The real card is minted by `combineBuffs` from
 *  `run.nextBuffId`. */
const PREVIEW_ID = -1

function previewFor(buff: Buff): Buff | null {
  const tier = nextBuffTierAfter(buff.tier)
  const template = templateForBuff(buff)
  if (tier === null || template === undefined) return null
  return mintFromTemplate(template, tier, PREVIEW_ID)
}

export function manageBuffsView(buffs: readonly Buff[]): ManageBuffsView {
  const groups = heldBuffStacks(buffs).map((stack) => {
    const key = buffCombineKey(stack.buff)
    const refusal = combineRefusalFor(buffs, key)
    return {
      key,
      buff: stack.buff,
      count: stack.count,
      ids: stack.ids,
      refusal,
      produces: refusal === null ? previewFor(stack.buff) : null,
    }
  })
  const ready = groups.filter((group) => group.refusal === null)
  const refused = groups.filter((group) => group.refusal !== null)
  return { groups: [...ready, ...refused], held: buffs.length, readyCount: ready.length }
}
