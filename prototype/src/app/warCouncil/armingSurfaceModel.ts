/**
 * DLR-174 — the arming surface's pure view-model: the per-card buff filter, the window
 * statement, and the surface's three modes.
 *
 * THE ONE RULE THIS MODULE OBEYS, exactly as `buffRideModel.ts`'s own docblock states it: every
 * firing question is answered by `projectBuffBranches` — no `switch` over `BuffConditionKind` and
 * no condition arithmetic anywhere in this file. `armingReachOf` asks that question of a HELD
 * buff (one the player has not yet armed) by appending it to the trick's already-active set and
 * projecting again — the same projection `buffRideModel.ts` runs for an already-active buff,
 * asked here one step earlier.
 *
 * No React, no DOM — tested without a renderer under the `node` Vitest project.
 */
import {
  BUFF_CADENCE,
  BuffActivationRefusal,
  BuffCadence,
  BuffKind,
  type Buff,
  type BuffId,
} from '../../hunt'
import {
  containsCard,
  PlayerSide,
  projectBuffBranches,
  type BuffProjectionInput,
  type Card,
} from '../../warCouncil'
import { buildBuffGallery, type BuffStack } from './buffGalleryModel'
import { cardDamagePreview, type CardDamagePreview } from './cardDamage'
import { ARMING_FOLLOW_SUIT_REASON, ARMING_NO_CHEAT_REMEDY } from './armingLabels'
import { loadoutRefusalFor } from './buffHandlers'
import { rideInputFor, skullReadingFor, type RidingBuffRow } from './buffRideModel'
import { curseArmed, discardWindowOpen, unlockingCheat, type RoundUiState } from './roundUiState'

/** Which of the two windows the surface is in — printed on its face, and differing by border
 *  style as well as tone. Derived from `discardWindowOpen`, the SAME predicate
 *  `buffActivationWindowOpen` reads for every non-Cheat row, never from a second reading of the
 *  trick's length. */
export const ArmingWindow = {
  BetweenTricks: 'betweenTricks',
  CheatOnly: 'cheatOnly',
} as const
export type ArmingWindow = (typeof ArmingWindow)[keyof typeof ArmingWindow]

/** The surface's states. */
export const ArmingMode = {
  Card: 'card',
  NoValidCards: 'noValidCards',
  CurseClaimed: 'curseClaimed',
} as const
export type ArmingMode = (typeof ArmingMode)[keyof typeof ArmingMode]

/** One row. Wraps `BuffStack` rather than widening it, so `src/app/run/`'s 25 references to
 *  that shape are untouched. */
export interface ArmingRow {
  readonly stack: BuffStack
  /** Appears only in the projection's `mayFire` set for this card, never in `fired`. Rendered as
   *  "may fire", never as a figure. */
  readonly mayFire: boolean
  /** Arming this row widens the legal set so the raised card becomes playable. True only for a
   *  held Cheat over a card that is currently illegal. */
  readonly unlocksCard: boolean
}

export interface ArmingSurfaceView {
  readonly mode: ArmingMode
  /** The raised card, or `null` in `CurseClaimed` mode. */
  readonly card: Card | null
  /** Only buffs that could still pay on `card`. Empty is a legitimate state ("Nothing pays on
   *  this card"), distinct from `NoValidCards`. */
  readonly rows: readonly ArmingRow[]
  readonly window: ArmingWindow
  /** Reused from `cardDamagePreview`, never re-derived. `null` in `CurseClaimed`. */
  readonly damage: CardDamagePreview | null
  /** The same rows `BuffRideZone` renders when the surface is closed. */
  readonly riding: readonly RidingBuffRow[]
  /** The reason and the remedy, `null` outside `NoValidCards` mode. */
  readonly refusal: { readonly reason: string; readonly remedy: string } | null
}

/** `true` when `id` appears in `buffs` — the same membership test `buffRideModel.ts`'s own
 *  `hasId` runs, kept local here rather than imported so this module's one call to
 *  `projectBuffBranches` stays self-contained. */
function hasId(buffs: readonly Buff[], id: BuffId): boolean {
  return buffs.some((buff) => buff.id === id)
}

/** THE filter. Projects with `candidate` APPENDED to the active set — the question `buffReach`
 *  asks of an ALREADY-ACTIVE buff, asked here of a HELD one. Returns `null` when the buff could
 *  not pay on this card at all. NO switch over `BuffConditionKind` anywhere in this file:
 *  `buffProjection.ts`'s own docblock forbids the second table, and a family restored later
 *  would silently never appear on this surface. */
export function armingReachOf(
  state: RoundUiState,
  card: Card,
  candidate: Buff,
): { readonly fires: boolean; readonly mayFire: boolean } | null {
  // Activated-cadence cards carry no condition, so `buffFires` is false for all of them by
  // design — running them through the projection would hide Cheat, the wildcard and Curse.
  if (BUFF_CADENCE[candidate.kind] === BuffCadence.Activated) {
    return { fires: true, mayFire: false }
  }
  const rideInput = rideInputFor(state)
  const input: BuffProjectionInput = {
    ...rideInput,
    active: [...rideInput.active, candidate],
    skullTrick: skullReadingFor(state, card),
    hand: state.round.hands[PlayerSide.Player],
  }
  const projection = projectBuffBranches(input, card)
  const fires =
    hasId(projection.won.fired, candidate.id) || hasId(projection.lost.fired, candidate.id)
  const mayFire =
    hasId(projection.won.mayFire, candidate.id) || hasId(projection.lost.mayFire, candidate.id)
  return fires || mayFire ? { fires, mayFire: !fires && mayFire } : null
}

export function buildArmingSurface(options: {
  readonly ui: RoundUiState
  readonly legal: readonly Card[]
  readonly offered: readonly Buff[]
  readonly riding: readonly RidingBuffRow[]
}): ArmingSurfaceView {
  const { ui, legal, offered, riding } = options
  const window = discardWindowOpen(ui) ? ArmingWindow.BetweenTricks : ArmingWindow.CheatOnly

  if (curseArmed(ui)) {
    return {
      mode: ArmingMode.CurseClaimed,
      card: null,
      rows: [],
      window,
      damage: null,
      riding,
      refusal: null,
    }
  }

  const card = ui.armed
  const cardLegal = card !== null && containsCard(legal, card)
  const cheat = card !== null && !cardLegal ? unlockingCheat(ui) : null
  const mode: ArmingMode =
    card !== null && (cardLegal || cheat !== null) ? ArmingMode.Card : ArmingMode.NoValidCards

  if (mode === ArmingMode.NoValidCards) {
    return {
      mode,
      card,
      rows: [],
      window,
      damage: null,
      riding,
      refusal: { reason: ARMING_FOLLOW_SUIT_REASON, remedy: ARMING_NO_CHEAT_REMEDY },
    }
  }

  // `card` is non-null here: `mode` is only `Card` when `card !== null` above.
  const raisedCard = card as Card
  const gallery = buildBuffGallery(offered, (buff) => loadoutRefusalFor(ui, buff))
  const allStacks: readonly BuffStack[] = [
    ...gallery.runs.flatMap((run) => run.stacks),
    ...gallery.fence.stacks,
  ]
  const rows: ArmingRow[] = allStacks.flatMap((stack) => {
    if (stack.refusal === BuffActivationRefusal.WindowClosed) return []
    const reach = armingReachOf(ui, raisedCard, stack.buff)
    if (reach === null) return []
    return [
      {
        stack,
        mayFire: reach.mayFire,
        unlocksCard: stack.buff.kind === BuffKind.Cheat && !cardLegal,
      },
    ]
  })

  return {
    mode,
    card: raisedCard,
    rows,
    window,
    damage: cardDamagePreview(ui, raisedCard),
    riding,
    refusal: null,
  }
}
