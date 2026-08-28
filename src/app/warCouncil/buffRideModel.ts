/**
 * DLR-153 — the buff-side twin of `cardDamage.ts`. THE ONE RULE THIS MODULE OBEYS: every firing
 * question is answered by `projectBuffBranches`, which is the SAME function `cardDamage.ts`'s
 * buff-side sibling (`src/warCouncil/buffProjection.ts`) answers it with — no `switch` over
 * `BuffConditionKind` and no accrual arithmetic anywhere in this file.
 *
 * `rideInputFor` assembles `BuffProjectionInput` (minus the two per-card fields) from the SAME
 * `buffHandInputFor(state)` the real commit threads into `resolveTrickBank` — the preview and the
 * commit therefore cannot disagree about what is riding.
 *
 * The one place this module makes a real decision is `skullReadingFor`, and it makes it PER
 * CANDIDATE CARD rather than once per trick: a card the player holds that is itself skulled makes
 * the trick skulled whatever the Quarry does, so its reading is knowable even on a lead. The
 * Quarry's face-down card is what makes the reading `null` — "not knowable", never "no skull".
 */
import { HAND_SIZE, isRevocableBuff, type Buff, type BuffId } from '../../hunt'
import {
  containsCard,
  PlayerSide,
  projectBuffBranches,
  trickIsSkulled,
  type BuffProjection,
  type BuffProjectionInput,
  type Card,
} from '../../warCouncil'
import { buffHandInputFor } from './buffRoundState'
import { cardKey } from './labels'
import { offeredBuffs, type RoundUiState } from './roundUiState'

/** One hand card's lit state. `count` is the HIGHER of the two branches' ceilings
 *  (`fired.length + mayFire.length`), which is AC4's figure; `estimate` is true when either
 *  branch contributed a `mayFire` buff, so the badge can render in the `~n` form. A card that is
 *  illegal this trick, or that no riding buff reaches, gets `null` and no lit state at all. */
export interface CardBuffLight {
  readonly count: number
  readonly estimate: boolean
  readonly projection: BuffProjection
}

/** One row of "Riding this trick". `reach` counts the LEGAL cards this buff appears in the
 *  projection of — certain or `mayFire` — so an illegal card can never inflate it (AC3). */
export interface RidingBuffRow {
  readonly buff: Buff
  readonly reach: number
  /** `isRevocableBuff(buff)` — whether this row draws a remove control (AC9/AC10). */
  readonly revocable: boolean
}

/** The projection input for this felt, assembled ONCE per render and reused for every card.
 *  `skullTrick` is deliberately absent: it is per-candidate (plan.md Assumptions #4) and is
 *  supplied by `lightsForHand` as it walks the cards. */
export type RideInput = Omit<BuffProjectionInput, 'skullTrick' | 'hand'>

/** Reuses `buffHandInputFor(state)` for `active`/`accrual`/`firedThisHand` and the four fields
 *  that land in `facts`. Adds only `finalTrick` (derived exactly as `cardDamage.ts` derives it)
 *  and the two fields `BuffProjectionFacts`'s own docblock records as deliberately constant
 *  across branches — `playerHit` and `bankAfterTrick` — which is inert only because Hoarder and
 *  Unbloodied are unconstructible (see `CLAUDE.md`'s cut-buffs section before restoring either
 *  family into this module). */
export function rideInputFor(state: RoundUiState): RideInput {
  const buffInput = buffHandInputFor(state)
  return {
    active: buffInput.active,
    accrual: buffInput.accrual,
    firedThisHand: buffInput.firedThisHand,
    facts: {
      playerHit: false,
      finalTrick: state.round.tricksPlayed + 1 === HAND_SIZE,
      bankAfterTrick: state.round.bank,
      tricksWithoutHit: buffInput.tricksWithoutHit,
      coins: buffInput.coins,
      playerHealth: buffInput.playerHealth,
      applyDamagePressed: buffInput.applyDamagePressed,
    },
  }
}

/** `true` when `candidate` ITSELF carries a skull — knowable even while the player leads, because
 *  it is the player's own card. Otherwise, once the Quarry's lead is on the table
 *  (`currentTrick.length === 1`), the full trick is knowable too. Otherwise `null` — NOT "no
 *  skull", but "not knowable": the Quarry's face-down card may still carry one. */
export function skullReadingFor(state: RoundUiState, candidate: Card): boolean | null {
  if (containsCard(state.round.skulledCards, candidate)) return true
  if (state.round.currentTrick.length === 1) {
    return trickIsSkulled(state.round.skulledCards, [
      ...state.round.currentTrick,
      { side: PlayerSide.Player, card: candidate },
    ])
  }
  return null
}

/** `cardKey(card)` → light, for every LEGAL card a riding buff reaches. Absent key = dark. Calls
 *  `projectBuffBranches` exactly once per legal card, with that card's OWN skull reading — never
 *  once for the whole hand, which is what lets the reading vary per candidate. */
export function lightsForHand(
  state: RoundUiState,
  legal: readonly Card[],
): ReadonlyMap<string, CardBuffLight> {
  const rideInput = rideInputFor(state)
  const hand = state.round.hands[PlayerSide.Player]
  const lights = new Map<string, CardBuffLight>()
  for (const card of legal) {
    const input: BuffProjectionInput = {
      ...rideInput,
      skullTrick: skullReadingFor(state, card),
      hand,
    }
    const projection = projectBuffBranches(input, card)
    const count = Math.max(
      projection.won.fired.length + projection.won.mayFire.length,
      projection.lost.fired.length + projection.lost.mayFire.length,
    )
    if (count === 0) continue
    const estimate = projection.won.mayFire.length + projection.lost.mayFire.length > 0
    lights.set(cardKey(card), { count, estimate, projection })
  }
  return lights
}

/** `true` when `id` appears in any of a projection's four fired/mayFire sets — "could fire",
 *  which includes "might", exactly as `buffReach`'s own docblock argues for a single card. */
function projectionHasBuff(projection: BuffProjection, id: BuffId): boolean {
  return (
    hasId(projection.won.fired, id) ||
    hasId(projection.won.mayFire, id) ||
    hasId(projection.lost.fired, id) ||
    hasId(projection.lost.mayFire, id)
  )
}

function hasId(buffs: readonly Buff[], id: BuffId): boolean {
  return buffs.some((buff) => buff.id === id)
}

/** Counts reach OFF the already-built `lights` map — never a second `projectBuffBranches` pass —
 *  so an illegal card (never entered into `lights`) can never inflate it (AC3). */
function reachOf(lights: ReadonlyMap<string, CardBuffLight>, id: BuffId): number {
  let count = 0
  for (const light of lights.values()) {
    if (projectionHasBuff(light.projection, id)) count++
  }
  return count
}

export function ridingRowsFor(
  state: RoundUiState,
  legal: readonly Card[],
): readonly RidingBuffRow[] {
  const lights = lightsForHand(state, legal)
  return activatedBuffs(state).map((buff) => ({
    buff,
    reach: reachOf(lights, buff.id),
    revocable: isRevocableBuff(buff),
  }))
}

/** Resolves `activatedThisTrick`'s ids back to `Buff`s through the same `offeredBuffs ∪
 *  spentThisTrick` union `buffHandInputFor` and `firedOncePerHandIds` already use — a card
 *  consumed on activation is no longer offered, and looking in the pile alone would silently
 *  drop it. An id this union cannot resolve is skipped rather than throwing, matching this
 *  codebase's "never throw from a render-reachable path" discipline. EXPORTED so
 *  `buffBreakdownModel.ts` can build the same riding list without a second `projectBuffBranches`
 *  pass. */
export function activatedBuffs(state: RoundUiState): readonly Buff[] {
  const candidates = [...offeredBuffs(state), ...state.buffActivation.spentThisTrick]
  return state.buffActivation.activatedThisTrick.flatMap((id) => {
    const buff = candidates.find((candidate) => candidate.id === id)
    return buff === undefined ? [] : [buff]
  })
}

// Re-exported (beyond `plan.md`'s literal export list) so `buffBreakdownModel.ts` can ask the
// SAME "does this buff appear in this card's projection" and "how many legal cards does it reach"
// questions off an already-computed `lights` map, without a second `projectBuffBranches` pass —
// the exact call-count discipline that module's own docblock states. Reported as a deviation in
// the Implementer Report.
export { projectionHasBuff, reachOf }
