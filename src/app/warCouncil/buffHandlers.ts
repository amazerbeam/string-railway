/**
 * DLR-114 — the loadout panel's three reducer transitions, separated from the reducer that calls
 * them, mirroring `discardHandlers.ts`'s own split for that file's stated reason: this is a
 * self-contained block that decides nothing about the rest of the felt.
 *
 * Nothing here throws. `activateBuff` throws by design on a refused activation, so every path
 * below asks `buffActivationRefusalFor` FIRST — a throw inside a reducer during an event handler
 * unmounts the tree, which is the discipline `handleTapApplyDamage` and `handleTapCheat` already
 * set.
 */
import {
  activateBuff,
  buffActivationRefusalFor,
  BuffActivationRefusal,
  type Buff,
  type BuffId,
} from '../../hunt'
import {
  buffActivationStock,
  canAct,
  discardWindowOpen,
  offeredBuffs,
  type RoundUiState,
} from './roundUiState'

/** THE one statement of whether a given buff can be activated right now. Both the panel's row
 *  `disabled` state and `handleTapBuff`'s guard call this, so they cannot read availability
 *  differently — the discipline `applyDamageRefusalFor` sets. UNCHANGED by the DLR-114 door-widening
 *  fix below: activating a buff is genuinely a between-tricks decision (AC1), so a row stays gated
 *  on `discardWindowOpen` exactly as it always has. */
export function loadoutRefusalFor(state: RoundUiState, buff: Buff) {
  return buffActivationRefusalFor(buffActivationStock(state, state.buffActivation, buff))
}

/**
 * Whether the loadout panel can be OPENED at all — deliberately wider than `discardWindowOpen`,
 * which gates only whether a ROW inside can be activated.
 *
 * Before DLR-114 relocated `CheatSlots` and `TimebombCharge` off the felt rail and into this panel,
 * both were gated on `canAct` alone, reachable on any of the player's own turns — including while
 * following a card the Quarry had already led, which is the only moment a Cheat has value (breaking
 * follow-suit) and the only moment marking an illegal card with Timebomb makes sense. Gating the
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
 * Open or close the panel. Opening clears `armed`, `cheatSelection`, `timebombStage` and
 * `discardSelection`: all four reinterpret the next hand-card tap, and allowing two at once makes
 * that tap ambiguous — `handleTapDiscard`'s own rule, extended by one control. Closing drops any
 * poise unspent. Refused (no-op) unless `loadoutDoorOpen` holds — the same widened gate
 * `loadoutBarRefusalFor` reads for the button, so the two cannot disagree.
 */
export function handleToggleLoadout(state: RoundUiState): RoundUiState {
  if (state.loadout !== null) return handleCancelLoadout(state)
  if (!loadoutDoorOpen(state)) return state
  return {
    ...state,
    loadout: { poised: null },
    armed: null,
    cheatSelection: null,
    timebombStage: null,
    discardSelection: null,
  }
}

/** Close without spending, dropping any poise — `Escape`'s transition, mirroring
 *  `handleCancelDiscard`. */
export function handleCancelLoadout(state: RoundUiState): RoundUiState {
  return state.loadout === null ? state : { ...state, loadout: null }
}

/**
 * Three outcomes on one row, mirroring `handleTapApplyDamage`'s shape. A refusal drops the poise
 * and changes nothing else; nothing poised (or a different buff poised) poises this one; the same
 * buff poised COMMITS through `activateBuff` and leaves the panel OPEN, because AC2 allows one or
 * more activations per trick.
 *
 * The refusal is re-read on BOTH taps, for `handleTapApplyDamage`'s stated reason: the felt can
 * change under a poised row — the Quarry leads, a reveal is held — and re-reading is what stops a
 * poise made while the row was live from committing after it stopped being.
 */
export function handleTapBuff(state: RoundUiState, id: BuffId): RoundUiState {
  if (state.loadout === null) return state
  const buff = offeredBuffs(state).find((b) => b.id === id)
  if (buff === undefined) return { ...state, loadout: { poised: null } }
  if (loadoutRefusalFor(state, buff) !== null) return { ...state, loadout: { poised: null } }
  if (state.loadout.poised !== id) return { ...state, loadout: { poised: id } }
  return {
    ...state,
    buffActivation: activateBuff(state.buffActivation, buff, discardWindowOpen(state)),
    loadout: { poised: null },
  }
}
