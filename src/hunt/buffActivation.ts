import { canAffordAp, refreshActionPointsForNewHand, refundAp, spendAp } from './actionPoints'
import { apCostOf, isConditionFamily, isConsumableKind } from './buffCosts'
import { consumableEffectIsLive, isConsumableItem, spendConsumable } from './consumables'
import { BuffKind, type Buff, type BuffId } from './buffs'
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
  /** R2 — one Timebomb at a time. A second spend is REFUSED rather than allowed and then blocked
   *  at the prime, which would strand a paid-for card — the exact failure AC13 exists to prevent.
   *  Distinct from `AlreadyActive` below, which means the SAME card twice in one trick; this is a
   *  DIFFERENT card blocked by state carried from an earlier trick, so reusing that reason would
   *  put "Already active this trick" on a row for which it is false. */
  TimebombLive: 'timebombLive',
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
  /** R2 — a Timebomb is already armed or a card is already primed. Set only for a Timebomb;
   *  `false` for every other kind, so the branch below cannot refuse anything else. */
  readonly timebombLive: boolean
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
  /** DLR-145 — cards REMOVED FROM THE PILE during the current trick, kept so a consumed condition
   *  card still fires at this trick's resolution. `buffHandInputFor` builds the trick's active set
   *  by filtering the PILE, and `activateFromPile` has already taken a consumed card out of it —
   *  without this field a spent Taker pays nothing, with no throw, no refusal and no log.
   *  Same lifetime as `activatedThisTrick`, cleared on the same edge; separating the two is how
   *  that bug comes back in a different shape. Always empty for a non-consumable activation. */
  readonly spentThisTrick: readonly Buff[]
}

/** A fresh per-hand activation state, pool at `capacity`, nothing activated yet. DLR-116 —
 *  `capacity` defaults to `STARTING_AP`, reproducing the pre-DLR-116 value exactly, so every
 *  existing call site is unchanged. */
export function startBuffActivation(capacity: ActionPoints = STARTING_AP): BuffActivationState {
  return { apPool: capacity, capacity, activatedThisTrick: [], spentThisTrick: [] }
}

/**
 * THE single statement of whether a buff can be activated — read by the reducer's guard and by
 * the plate's disabled state, so the two can never read availability differently (the same
 * discipline `applyDamageRefusalFor` sets).
 *
 * Order — `NoEffectYet → WindowClosed → TimebombLive → AlreadyActive → InsufficientAp` — reports
 * the reason true of the CARD, then the reason true of the whole felt, then the reasons true of
 * this card on this felt, exactly as `applyDamageRefusalFor` reports `NotYourMove` first. A
 * Foresight is refused for having no effect even on a wide-open felt with a full pool, because
 * opening the window would not make it usable. `TimebombLive` reports ahead of `AlreadyActive` so
 * a felt-wide reason (the window) still wins over both, and R2's reason wins over a per-card one.
 */
export function buffActivationRefusalFor(stock: BuffActivationStock): BuffActivationRefusal | null {
  if (!stock.effectLive) return BuffActivationRefusal.NoEffectYet
  if (!stock.windowOpen) return BuffActivationRefusal.WindowClosed
  if (stock.timebombLive) return BuffActivationRefusal.TimebombLive
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
  timebombLive: boolean,
): BuffActivationStock {
  return {
    effectLive: consumableEffectIsLive(buff),
    windowOpen,
    apPool: state.apPool,
    apCost: apCostOf(buff),
    alreadyActive: state.activatedThisTrick.includes(buff.id),
    // Only a Timebomb can be refused for this reason; every other kind reads `false`.
    timebombLive: buff.kind === BuffKind.Timebomb && timebombLive,
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
  // R2 — DLR-154 FIX 5 — `activateFromPile` (below) now threads the felt's real `timebombLive`
  // fact through to here. Still defaults `false`, matching `activateFromPile`'s own default, so a
  // caller with no Timebomb fact of its own to report (a fixture, a preview) keeps compiling.
  timebombLive: boolean = false,
): BuffActivationState {
  const stock = buffActivationStockFor(state, buff, windowOpen, timebombLive)
  const refusal = buffActivationRefusalFor(stock)
  if (refusal !== null) {
    throw new RangeError(`Cannot activate buff ${buff.id} — ${refusal}`)
  }
  return {
    apPool: spendAp(state.apPool, stock.apCost),
    capacity: state.capacity,
    activatedThisTrick: [...state.activatedThisTrick, buff.id],
    spentThisTrick: state.spentThisTrick,
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
 * Cheat, Timebomb and Shield are `Activated` cards with their own live mechanics, not items held
 * until used — but DLR-142's `ACTIVATED_CARD_SINGLE_USE` (defaulted `true` for all three) means
 * `isConsumableItem` also removes them from the pile here, same as the five DLR-111 items, unless
 * that toggle is flipped for a given card. See `consumables.ts`'s own docblock for the full
 * distinction and how to revert one card to "stays in the pile."
 */
export function activateFromPile(
  state: BuffActivationState,
  buffs: readonly Buff[],
  buff: Buff,
  windowOpen: boolean,
  // R2 — DLR-154 FIX 5 threads the real felt-supplied fact from `buffHandlers.ts`'s `handleTapBuff`,
  // exactly as `windowOpen` above is threaded, so `activateBuff`'s own throw-guard below is a REAL
  // re-check rather than an assumed one. Defaults `false` only so every OTHER caller (fixtures,
  // previews, and any future one that has no Timebomb of its own to report) keeps compiling and
  // behaving exactly as before — the refusal is still enforced first, and earlier, through
  // `buffActivationStock` (`roundUiState.ts`), which disables the row before this function is ever
  // reached on the production path.
  timebombLive: boolean = false,
): BuffActivationResult {
  const activation = activateBuff(state, buff, windowOpen, timebombLive)
  if (!isConsumableItem(buff)) {
    return { activation, buffs }
  }
  return {
    activation: { ...activation, spentThisTrick: [...activation.spentThisTrick, buff] },
    buffs: spendConsumable(buffs, buff.id),
  }
}

/**
 * DLR-153 AC10 — THE one statement of which activated cards may be taken back off the trick.
 *
 * TRUE for the three REVOCABLE condition families — Taker, Feeder, Sidestep — plus, since DLR-154,
 * `BuffKind.Timebomb`. Deliberately NOT `isConditionFamily` from `buffCosts.ts`: that predicate
 * spans all 11 condition families the type system still declares, eight of which are cut and
 * unmintable (CLAUDE.md → "Cut buffs are cut until a ticket brings them back"). Activating a
 * condition family touches only the AP pool and the pile, both of which `deactivateFromPile` can
 * put back exactly.
 *
 * FALSE for Cheat, Ward and Shield, because their spend ALSO arms felt state this module cannot
 * reach — `cheatTricksRemaining`, `activateShield`'s credited hearts, `activateWard`'s guard.
 * Reversing those is a second rule change and its own ticket (`plan.md` Part 1 → Assumption 2).
 * Timebomb is the ONE Activated card that is revocable (DLR-154 AC5/AC13): with AP off
 * (`AP_ENABLED = false`, R1) the whole of its cost is the card leaving the pile, so returning the
 * card returns everything spent — exactly what `deactivateFromPile` already does. The felt-state
 * reversal this module cannot do — clearing the armed damage, the primed damage, the fuse and the
 * mark — is `handleRemoveBuff`'s.
 *
 * Read by the riding row's own control AND by `handleRemoveBuff`'s guard, so the two cannot read
 * revocability differently — the discipline `buffActivationRefusalFor` sets for activation.
 *
 * DLR-154 FIX D — for a Timebomb specifically, `true` here does NOT mean `deactivateFromPile` can
 * fully reverse one: both of `handleRemoveBuff`'s Timebomb branches intercept the call before the
 * generic path below ever runs, at the app layer. This module has no way to reach
 * `timebombArmedDamage`, `primedTimebombDamage`, `timebombFuseRemaining`, or the felt's own mark —
 * a caller reading `isRevocableBuff`/`deactivateFromPile` alone would wrongly conclude it can undo
 * all of that itself.
 */
const REVOCABLE_BUFF_KINDS: ReadonlySet<BuffKind> = new Set([
  BuffKind.Taker,
  BuffKind.Feeder,
  BuffKind.Sidestep,
  // DLR-154 AC5/AC13 — with AP off, revocation is the card returning; see the docblock above.
  BuffKind.Timebomb,
])

export function isRevocableBuff(buff: Buff): boolean {
  return REVOCABLE_BUFF_KINDS.has(buff.kind)
}

/**
 * The mirror of `activateFromPile`: the pool AND the pile after one revocation, returned as the
 * same pair for the identical reason — a refund without the card returned is a free spend, and a
 * card returned without a refund is a double charge.
 *
 * THROWS a `RangeError` naming the reason when `buff` is not revocable or is not in
 * `activatedThisTrick`, exactly as `activateBuff` throws on a refused activation, so a caller that
 * skipped `isRevocableBuff` cannot commit an incoherent pool/pile pair. `handleRemoveBuff` is that
 * caller's guard and returns unchanged state rather than letting this throw inside a dispatch.
 *
 * Only a card actually REMOVED at activation comes back: membership of `spentThisTrick` is the
 * test, so a card that never left the pile is not added a second time. It is APPENDED rather than
 * reinserted at its old index — `plan.md` Part 1, Assumptions made #3.
 */
export function deactivateFromPile(
  state: BuffActivationState,
  buffs: readonly Buff[],
  buff: Buff,
): BuffActivationResult {
  if (!isRevocableBuff(buff)) {
    throw new RangeError(`Cannot take buff ${buff.id} back off — a ${buff.kind} is not revocable`)
  }
  if (!state.activatedThisTrick.includes(buff.id)) {
    throw new RangeError(`Cannot take buff ${buff.id} back off — it is not riding this trick`)
  }
  const spent = state.spentThisTrick.some((b) => b.id === buff.id)
  return {
    activation: {
      apPool: Math.min(state.capacity, refundAp(state.apPool, apCostOf(buff))),
      capacity: state.capacity,
      activatedThisTrick: state.activatedThisTrick.filter((id) => id !== buff.id),
      spentThisTrick: state.spentThisTrick.filter((b) => b.id !== buff.id),
    },
    buffs: spent ? [...buffs, buff] : buffs,
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
    spentThisTrick: [],
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
    spentThisTrick: [],
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
