/**
 * DLR-114 — the loadout panel's three reducer transitions, separated from the reducer that calls
 * them, mirroring `discardHandlers.ts`'s own split for that file's stated reason: this is a
 * self-contained block that decides nothing about the rest of the felt.
 *
 * Nothing here throws. `activateBuff` throws by design on a refused activation, so every path
 * below asks `buffActivationRefusalFor` FIRST — a throw inside a reducer during an event handler
 * unmounts the tree.
 */
import {
  activateFromPile,
  activateShield,
  activateWard,
  buffActivationRefusalFor,
  BuffActivationRefusal,
  BuffKind,
  cheatDurationTricksOf,
  deactivateFromPile,
  extraDiscardCharges,
  isRevocableBuff,
  type Buff,
  type BuffId,
} from '../../hunt'
import {
  buffActivationStock,
  buffActivationWindowOpen,
  canAct,
  curseLive,
  discardWindowOpen,
  offeredBuffs,
  type RoundUiState,
} from './roundUiState'

/** THE one statement of whether a given buff can be activated right now. Both the panel's row
 *  `disabled` state and `handleTapBuff`'s guard call this, so they cannot read availability
 *  differently. UNCHANGED by the DLR-114
 *  door-widening fix below FOR EVERY CONDITION/CONSUMABLE ROW: activating one of those is
 *  genuinely a between-tricks decision (AC1), so it stays gated on `discardWindowOpen` exactly as
 *  it always has. Cheat is the one exception `roundUiState.ts`'s `buffActivationWindowOpen`
 *  carves out — see that function's own docblock for why its window is `canAct`, not
 *  `discardWindowOpen`. */
export function loadoutRefusalFor(state: RoundUiState, buff: Buff) {
  return buffActivationRefusalFor(buffActivationStock(state, state.buffActivation, buff))
}

/**
 * Whether the loadout panel can be OPENED at all — deliberately wider than `discardWindowOpen`,
 * which gates only whether a ROW inside can be activated.
 *
 * Before DLR-114 relocated `CheatSlots` off the felt rail and into this panel,
 * it was gated on `canAct` alone, reachable on any of the player's own turns — including while
 * following a card the Quarry had already led, which is the only moment a Cheat has value (breaking
 * follow-suit). Gating the
 * PANEL DOOR on `discardWindowOpen` — the activation window's own gate — made that reach
 * structurally impossible, since a committed lead means `currentTrick.length !== 0`. `plan.md`
 * promised the relocation would carry "no rule change and no reducer change"; the gate the
 * relocation introduced is what broke that promise, so the gate is what widens back.
 *
 * Opening the drawer is not itself a game action — reading what's inside costs nothing — so it is
 * available whenever the player can act at all, in addition to the discard/activation window.
 * Reaching for the door and using what's behind it are two different questions; see
 * `loadoutRefusalFor` above for the unchanged second one.
 */
export function loadoutDoorOpen(state: RoundUiState): boolean {
  return discardWindowOpen(state) || canAct(state)
}

/**
 * The bar's OWN Apply Buff button reads one refusal, standing for "can the door open at all" — not
 * one per row, and not `loadoutRefusalFor`'s activation-window question. Reads `loadoutDoorOpen`
 * directly so the button and `handleToggleLoadout`'s transition cannot disagree, the same discipline
 * every other stock function in this file documents. AC2's own default holds: `WindowClosed` is the
 * only reading that disables the button itself; a row's own `InsufficientAp`/`AlreadyActive` lives
 * on that row's face inside the panel, never on the bar.
 */
export function loadoutBarRefusalFor(state: RoundUiState): BuffActivationRefusal | null {
  return loadoutDoorOpen(state) ? null : BuffActivationRefusal.WindowClosed
}

/**
 * Open or close the panel. Opening clears `armed` and `discardSelection`: both reinterpret the
 * next hand-card tap, and allowing two at once makes that tap ambiguous — `handleTapDiscard`'s own
 * rule, extended by one control. DLR-132 — a live Cheat is no longer a
 * transient selection that opening must clear: it is a paid-for duration, already committed, and
 * opening the panel again does not touch it. Closing
 * drops any poise unspent. Refused (no-op) unless `loadoutDoorOpen` holds — the same widened gate
 * `loadoutBarRefusalFor` reads for the button, so the two cannot disagree.
 */
export function handleToggleLoadout(state: RoundUiState): RoundUiState {
  if (state.loadout !== null) return handleCancelLoadout(state)
  if (!loadoutDoorOpen(state)) return state
  return {
    ...state,
    loadout: { poised: null },
    armed: null,
    discardSelection: null,
  }
}

/** Close without spending, dropping any poise — `Escape`'s transition, mirroring
 *  `handleCancelDiscard`. */
export function handleCancelLoadout(state: RoundUiState): RoundUiState {
  return state.loadout === null ? state : { ...state, loadout: null }
}

/** Drops an unspent poise, leaving the panel open. A no-op when the panel is shut or nothing
 *  is poised — returning `state` itself, not a fresh object, so an idle `Escape` cannot even
 *  cause a re-render. */
export function handleCancelBuffPoise(state: RoundUiState): RoundUiState {
  if (state.loadout === null || state.loadout.poised === null) return state
  return { ...state, loadout: { ...state.loadout, poised: null } }
}

/**
 * Three outcomes on one row. A refusal drops the poise and changes nothing else; nothing poised
 * (or a different buff poised) poises this one; the same buff poised COMMITS through
 * `activateFromPile` and leaves the panel OPEN, because AC2 allows one or more activations per
 * trick.
 *
 * DLR-126 — the two-tap model IS the reversibility. There is no un-activate in the engine and a
 * spent consumable is gone for the rest of the run, so the only chance to change your mind is
 * before the second tap: `Escape` drops the poise, and the refusal is re-read on BOTH taps.
 *
 * The refusal is re-read on BOTH taps: the felt can change under a poised row — the Quarry leads,
 * a reveal is held — and re-reading is what stops a poise made while the row was live from
 * committing after it stopped being.
 */
export function handleTapBuff(state: RoundUiState, id: BuffId): RoundUiState {
  if (state.loadout === null) return state
  const buff = offeredBuffs(state).find((b) => b.id === id)
  if (buff === undefined) return { ...state, loadout: { poised: null } }
  if (loadoutRefusalFor(state, buff) !== null) return { ...state, loadout: { poised: null } }
  if (state.loadout.poised !== id) return { ...state, loadout: { poised: id } }
  // DLR-126 — `activateFromPile`, never `activateBuff`: a CONSUMABLE ITEM leaves the pile here and
  // does not come back, which is the whole of what makes it one-shot.
  //
  // DLR-132 — `buffActivationWindowOpen`, NOT `discardWindowOpen` directly: `loadoutRefusalFor`
  // (the guard just above) and this commit must ask the SAME window question or a Cheat
  // row can pass its guard and then throw here — `activateBuff` re-checks the window itself and
  // throws on a refusal, which is exactly what a narrower window at this line would trigger on a
  // Cheat's own second tap.
  // DLR-167 — `curseLive(state)` is threaded so `activateBuff`'s own re-check is a REAL one:
  // `loadoutRefusalFor` above asked the same question through the same stock, and a guard that
  // asked a different question there would surface as a thrown `RangeError` on the second tap.
  const { activation, buffs } = activateFromPile(
    state.buffActivation,
    state.buffs,
    buff,
    buffActivationWindowOpen(state, buff),
    curseLive(state),
  )
  return {
    ...state,
    buffs,
    buffActivation: activation,
    // AC3 — the effect fires HERE, synchronously at the spend. A consumable has no condition and
    // never reaches `buffEvaluation.ts`: `buffFires` returns false for every Activated kind and
    // `firedBuffs` filters them out. Applying it at trick resolution would be applying it against
    // a condition it does not have.
    encounter:
      buff.kind === BuffKind.Ward
        ? activateWard(state.encounter, buff.tier)
        : buff.kind === BuffKind.Shield
          ? activateShield(state.encounter, buff.tier)
          : state.encounter,
    // DLR-132/DLR-142 — Cheat fires HERE too, beside Ward and Shield. All of them now
    // also leave the pile once spent, by default (`ACTIVATED_CARD_SINGLE_USE`, read through
    // `isConsumableItem` inside `activateFromPile` above) — this block only arms the felt-state
    // effect; pile removal already happened above. `cheatDurationTricksOf`
    // throws on the wrong kind; it is called only inside a branch that has already checked
    // `buff.kind`, so that throw is not reachable here.
    cheatTricksRemaining:
      buff.kind === BuffKind.Cheat ? cheatDurationTricksOf(buff) : state.cheatTricksRemaining,
    // DLR-167 AC3 — the spend ARMS the card; the mark itself is made by the next hand tap, in
    // `roundReducer.ts`'s `curseTapped`. The whole `Buff` is held, not a figure, because
    // `curseRewardOf` needs the tier when the cursed trick resolves.
    curseArmedBuff: buff.kind === BuffKind.Curse ? buff : state.curseArmedBuff,
    discardsRemaining: state.discardsRemaining + extraDiscardCharges(buff),
    loadout: { poised: null },
  }
}

/**
 * AC10. Asks `isRevocableBuff` and membership FIRST and returns `state` itself on a no —
 * `deactivateFromPile` throws by design, and a throw inside a reducer during an event handler
 * unmounts the tree, which is the discipline `handleTapBuff` already sets. Returning the state
 * object itself rather than a copy means an idle removal cannot cause a re-render, mirroring
 * `handleCancelBuffPoise`.
 *
 * Touches the pool and the pile ONLY. The hand re-lights from the new state on the next render,
 * so nothing here knows anything about which cards were lit — that stays `buffRideModel.ts`'s.
 */
export function handleRemoveBuff(state: RoundUiState, id: BuffId): RoundUiState {
  if (!state.buffActivation.activatedThisTrick.includes(id)) return state
  const buff = [...offeredBuffs(state), ...state.buffActivation.spentThisTrick].find(
    (b) => b.id === id,
  )
  if (buff === undefined || !isRevocableBuff(buff)) return state
  const { activation, buffs } = deactivateFromPile(state.buffActivation, state.buffs, buff)
  return { ...state, buffs, buffActivation: activation }
}
