import { canAffordAp, refreshActionPointsForNewHand, spendAp } from './actionPoints'
import { apCostOf, isConditionFamily, isConsumableKind } from './buffCosts'
import { consumableEffectIsLive, isConsumableItem, spendConsumable } from './consumables'
import type { Buff, BuffId } from './buffs'
import { AP_REFRESH_CADENCE, ApRefreshCadence, STARTING_AP } from './apConfig'
import type { ActionPoints } from './types'

/**
 * DLR-108 — why "Apply Buff" cannot be pressed. A reason CODE, not a sentence: `src/hunt/` holds
 * no user-facing copy, exactly `src/warCouncil/voluntaryCashOut.ts`'s `ApplyDamageRefusal` and
 * `src/hunt/flask.ts`'s `FlaskRefusal`.
 */
export const BuffActivationRefusal = {
  /** DLR-126 — the card can never do anything IN THIS BUILD: it is a consumable whose effect needs
   *  a player-choice surface no screen provides (Puppeteer, Foresight, Spyglass). Read FIRST,
   *  before every other refusal, because it is true of the CARD rather than of the felt — the
   *  same reason `applyDamageRefusalFor` reports `NotYourMove` before a cost. NOT a redundancy
   *  check: a Ward spent on a trick that turns out to be safe is a legitimate player mistake and
   *  is allowed. See `consumables.ts`'s `CONSUMABLE_EFFECT_LIVE`. */
  NoEffectYet: 'noEffectYet',
  /** AC1 — the felt is not between tricks; the discard/buff window `discardWindowOpen` already
   *  opens is closed. No new timing gate is built — this reads that same signal. */
  WindowClosed: 'windowClosed',
  /** Paying twice for one card in one trick is a duplicate-payment bug wearing a stacking rule's
   *  clothes (`plan.md` Part 1 → Assumptions made). */
  AlreadyActive: 'alreadyActive',
  /** AC5 — the per-hand pool does not cover this buff's tiered AP cost. */
  InsufficientAp: 'insufficientAp',
} as const
export type BuffActivationRefusal =
  (typeof BuffActivationRefusal)[keyof typeof BuffActivationRefusal]

/**
 * Everything the rule needs and nothing else — PLAIN VALUES, never a `RoundUiState`. The same
 * discipline `ApplyDamageStock`/`FlaskStock`/`ShopStock` already state: this module owns the rule
 * and must not learn the shape of the layer that calls it. `roundUiState.ts`'s
 * `buffActivationStock` builds it.
 */
export interface BuffActivationStock {
  /** DLR-126 — whether spending this card would do anything at all in this build. `false` only for
   *  a consumable whose effect surface is not built yet; `true` for every other card. */
  readonly effectLive: boolean
  readonly windowOpen: boolean
  readonly apPool: ActionPoints
  readonly apCost: ActionPoints
  readonly alreadyActive: boolean
}

/**
 * A budget of `capacity` AP, plus the buffs activated for the CURRENT trick. Under
 * `ApRefreshCadence.PerHand` that budget is drawn down across up to six per-trick windows (AC4);
 * under `ApRefreshCadence.PerTrick` (the DEVELOPER-SET default since 2026-08-25) `openBuffWindow`
 * refills `apPool` back to `capacity` at every trick boundary instead. `capacity` itself never
 * changes mid-hand either way — only the shop's AP-capacity purchase moves it, at the next hand's
 * `startBuffActivation` call. Lives as a pure value with no home on `RunState` yet — whichever
 * ticket builds the felt-rail button decides where it lives (`plan.md` Part 1 → Assumptions made).
 */
export interface BuffActivationState {
  readonly apPool: ActionPoints
  /** 2026-08-25 — the pool's full value, so a per-trick refill knows what "full" means.
   *  `STARTING_AP` plus any bought AP-capacity bonus (`apCapacityFor`). Read-only after
   *  `startBuffActivation` sets it; nothing in this module ever changes it mid-hand. */
  readonly capacity: ActionPoints
  readonly activatedThisTrick: readonly BuffId[]
}

/** A fresh per-hand activation state, pool at `capacity`, nothing activated yet. DLR-116 —
 *  `capacity` defaults to `STARTING_AP`, reproducing the pre-DLR-116 value exactly, so every
 *  existing call site is unchanged. */
export function startBuffActivation(capacity: ActionPoints = STARTING_AP): BuffActivationState {
  return { apPool: capacity, capacity, activatedThisTrick: [] }
}

/**
 * THE single statement of whether a buff can be activated — read by the reducer's guard and by
 * the plate's disabled state, so the two can never read availability differently (the same
 * discipline `applyDamageRefusalFor` sets).
 *
 * Order — `NoEffectYet → WindowClosed → AlreadyActive → InsufficientAp` — reports the reason true
 * of the CARD, then the reason true of the whole felt, then the reasons true of this card on this
 * felt, exactly as `applyDamageRefusalFor` reports `NotYourMove` first. A Foresight is refused for
 * having no effect even on a wide-open felt with a full pool, because opening the window would not
 * make it usable.
 */
export function buffActivationRefusalFor(stock: BuffActivationStock): BuffActivationRefusal | null {
  if (!stock.effectLive) return BuffActivationRefusal.NoEffectYet
  if (!stock.windowOpen) return BuffActivationRefusal.WindowClosed
  if (stock.alreadyActive) return BuffActivationRefusal.AlreadyActive
  if (!canAffordAp(stock.apPool, stock.apCost)) return BuffActivationRefusal.InsufficientAp
  return null
}

/** Assembles the plain values `buffActivationRefusalFor` needs from the pure activation state and
 *  the buff being considered — the same "one place" discipline `roundUiState.ts`'s stocks follow,
 *  moved into `src/hunt/` because `buff.id` membership is `src/hunt/`'s own state to read. */
export function buffActivationStockFor(
  state: BuffActivationState,
  buff: Buff,
  windowOpen: boolean,
): BuffActivationStock {
  return {
    effectLive: consumableEffectIsLive(buff),
    windowOpen,
    apPool: state.apPool,
    apCost: apCostOf(buff),
    alreadyActive: state.activatedThisTrick.includes(buff.id),
  }
}

/**
 * Activates `buff` against `state`'s pool. Refuses through `buffActivationRefusalFor` FIRST and
 * THROWS naming the refusal code rather than silently returning the unchanged state — a caller
 * that skipped the guard cannot commit a free (or duplicate, or out-of-window) activation. Spends
 * through `spendAp` — the ONLY subtraction path, never a second one — so `AP_ENABLED` is honoured
 * exactly as every other AP-gated consumer honours it.
 */
export function activateBuff(
  state: BuffActivationState,
  buff: Buff,
  windowOpen: boolean,
): BuffActivationState {
  const stock = buffActivationStockFor(state, buff, windowOpen)
  const refusal = buffActivationRefusalFor(stock)
  if (refusal !== null) {
    throw new RangeError(`Cannot activate buff ${buff.id} — ${refusal}`)
  }
  return {
    apPool: spendAp(state.apPool, stock.apCost),
    capacity: state.capacity,
    activatedThisTrick: [...state.activatedThisTrick, buff.id],
  }
}

/** The pool AND the pile after one activation. A pair rather than two return values because the
 *  two must move together: AP spent without the card removed is a duplicate-payment bug, and the
 *  card removed without AP spent is a free spend. */
export interface BuffActivationResult {
  readonly activation: BuffActivationState
  readonly buffs: readonly Buff[]
}

/**
 * DLR-126 — THE one call the felt makes to activate anything. Spends AP through `activateBuff`
 * above and, when the card is a one-shot CONSUMABLE ITEM, also removes it from the owned pile.
 *
 * Why one function rather than leaving the caller to make two calls: the failure mode of the split
 * version is silent and permanent — AP spent, card kept, and the card back on the rail next trick,
 * which is precisely the class of bug `activateBuff`'s own throw-rather-than-no-op contract exists
 * to prevent. `activateBuff` runs FIRST, so a refused activation throws before the pile is touched
 * and neither half lands.
 *
 * Cheat, Timebomb and Shield pass through with the pile UNCHANGED. They are `Activated` cards with
 * their own live mechanics, not items held until used — see `consumables.ts`'s own docblock on why
 * "consumable" is narrower here than `buffCosts.ts`'s pricing bucket of the same name.
 */
export function activateFromPile(
  state: BuffActivationState,
  buffs: readonly Buff[],
  buff: Buff,
  windowOpen: boolean,
): BuffActivationResult {
  const activation = activateBuff(state, buff, windowOpen)
  return {
    activation,
    buffs: isConsumableItem(buff) ? spendConsumable(buffs, buff.id) : buffs,
  }
}

/**
 * AC4's per-trick boundary — clears the current trick's activations, and under
 * `ApRefreshCadence.PerHand` leaves `apPool` UNTOUCHED. 2026-08-25: under `PerTrick` (the
 * DEVELOPER-SET default since 2026-08-25), refills `apPool` back to `capacity` here instead —
 * `capacity` itself is never touched, so a bought AP-capacity purchase still carries forward
 * unchanged. The separation from `refreshBuffsForNewHand` below stays load-bearing under
 * `PerHand`: AC4's own test is what that mode's "no silent mid-hand refresh" asserts against.
 */
export function openBuffWindow(state: BuffActivationState): BuffActivationState {
  return {
    ...state,
    apPool: AP_REFRESH_CADENCE === ApRefreshCadence.PerTrick ? state.capacity : state.apPool,
    activatedThisTrick: [],
  }
}

/**
 * AC4's per-hand boundary — the ONLY function in this module that resets the pool through
 * `refreshActionPointsForNewHand` rather than through `capacity`. Delegates to that function, the
 * same one every other AP consumer resets through, so a change to the PerHand refresh value needs
 * no edit here. Preserves `capacity` untouched, exactly as `openBuffWindow` does.
 */
export function refreshBuffsForNewHand(state: BuffActivationState): BuffActivationState {
  return {
    apPool: refreshActionPointsForNewHand(state.apPool),
    capacity: state.capacity,
    activatedThisTrick: [],
  }
}

/**
 * DLR-114 — whether `apCostOf` can price this buff. TRUE for the 11 condition families and the 8
 * consumable/activated cards; FALSE for `BuffKind.Unassigned`, which no production path mints as of
 * DLR-135 and which this guard still correctly refuses — `buffApCost` throws a `RangeError` on it.
 *
 * The predicate is a MIRROR of `buffApCost`'s own two branches rather than a second rule, so a
 * kind added to one table is admitted here automatically and a kind added to neither is refused
 * here rather than throwing at a render.
 */
export function isPricedBuff(buff: Buff): boolean {
  return isConsumableKind(buff.kind) || isConditionFamily(buff.kind)
}

/**
 * The subset of an owned pile that may be offered to the player. THE guard between
 * `RunState.buffs` — which opens every run holding `STARTING_BUFF_COUNT` real bronze cards since
 * DLR-135 — and `apCostOf`'s `RangeError`. Order is preserved: the pile's order is the player's
 * mental order.
 */
export function activatableBuffs(buffs: readonly Buff[]): readonly Buff[] {
  return buffs.filter(isPricedBuff)
}
