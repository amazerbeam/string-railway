import {
  buffCombineKey,
  combinePairFor,
  combineProductFor,
  combineRefusalFor,
  isWildcardCard,
  nextBuffTierAfter,
  wildRefusalFor,
  wildenedBuff,
  type Buff,
  type BuffId,
  type CombineRefusal,
  type WildRefusal,
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
 *
 * DLR-162 — the screen now has TWO gestures rather than one: combine a pile, and spend a wildcard
 * on a card to take its suit off. Both are arm-then-confirm-on-the-tile, and both take every
 * arithmetic answer from here. `wildTargets` lists EVERY held pile, refused ones included with
 * their reason, because a player who holds four Skull Lows needs to see why they cannot be targeted.
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
  /** DLR-162 — the SECOND card this combine consumes, when it is not another copy of `buff`:
   *  the suited card a wild pile eats. `null` for an ordinary same-card combine. */
  readonly partner: Buff | null
}

/** DLR-162 — one tile in the wildcard's target grid. Every held card appears, refused ones
 *  included, so a player can see WHY a card cannot be targeted (AC5). */
export interface WildTargetTile {
  readonly key: string
  readonly buff: Buff
  readonly ids: readonly BuffId[]
  readonly count: number
  readonly refusal: WildRefusal | null
  /** What the target becomes — non-null exactly when `refusal` is null, minted for wording only. */
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
  /** DLR-162 — every held wildcard's id, ascending. `length` is the band's count; empty means no
   *  band at all. */
  readonly wildcards: readonly BuffId[]
  /** DLR-162 — selectable targets first, then refused ones, each band keeping the same
   *  tier-descending order the combine bands use. */
  readonly wildTargets: readonly WildTargetTile[]
}

/** The id the produced-card preview is minted with. Never reaches a run — the preview exists only
 *  so the tile can word the card. The real card is minted by `combineBuffs` from
 *  `run.nextBuffId`. */
const PREVIEW_ID = -1

/** DLR-162 — the preview reads the SAME `combineProductFor` the commit reads, through the same
 *  pair, so what a tile promises and what a commit mints cannot disagree — including the wild case,
 *  which has no template to go through at all. */
function previewFor(pair: readonly [Buff, Buff] | null): Buff | null {
  if (pair === null) return null
  const tier = nextBuffTierAfter(pair[0].tier)
  if (tier === null) return null
  return combineProductFor(pair[0], pair[1], tier, PREVIEW_ID)
}

export function manageBuffsView(buffs: readonly Buff[]): ManageBuffsView {
  const stacks = heldBuffStacks(buffs)
  const groups = stacks.map((stack) => {
    const key = buffCombineKey(stack.buff)
    const refusal = combineRefusalFor(buffs, key)
    const pair = refusal === null ? combinePairFor(buffs, key) : null
    return {
      key,
      buff: stack.buff,
      count: stack.count,
      ids: stack.ids,
      refusal,
      produces: previewFor(pair),
      // The partner is stated only when it is a DIFFERENT card from the pile's own head — an
      // ordinary same-card combine eats two of the tile's own copies and says "2 ×".
      partner:
        pair !== null && buffCombineKey(pair[1]) !== key ? pair[1] : null,
    }
  })
  const ready = groups.filter((group) => group.refusal === null)
  const refused = groups.filter((group) => group.refusal !== null)

  // DLR-162 — the wildcard band and the target grid, built off the SAME grouping the combine bands
  // use rather than a second one.
  const wildcards = buffs
    .filter(isWildcardCard)
    .map((buff) => buff.id)
    .sort((a, b) => a - b)
  const targets: WildTargetTile[] = stacks.map((stack) => {
    const wildRefusal = wildRefusalFor(stack.buff)
    return {
      key: buffCombineKey(stack.buff),
      buff: stack.buff,
      ids: stack.ids,
      count: stack.count,
      refusal: wildRefusal,
      produces: wildRefusal === null ? wildenedBuff({ ...stack.buff, id: PREVIEW_ID }) : null,
    }
  })
  const wildTargets = [
    ...targets.filter((tile) => tile.refusal === null),
    ...targets.filter((tile) => tile.refusal !== null),
  ]

  return {
    groups: [...ready, ...refused],
    held: buffs.length,
    readyCount: ready.length,
    wildcards,
    wildTargets,
  }
}
