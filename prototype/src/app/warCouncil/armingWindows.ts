/**
 * DLR-174 — the arming surface's window predicates, split out of `roundUiState.ts` the moment
 * this task's four additions pushed that file past its 400-line budget (`react-frontend` skill /
 * `CLAUDE.md`), mirroring `roundUiSeed.ts`'s own split for the same reason. `roundUiState.ts`
 * re-exports every name below so no importer has to know the seam moved.
 *
 * This module sits in a three-file VALUE cycle, not a two-file one: `armingWindows.ts` ->
 * `buffHandlers.ts` -> `roundUiState.ts` -> `armingWindows.ts` (the last edge being this file's
 * own re-export from `roundUiState.ts`). `buffHandlers.ts` does not import from this file at all
 * — it is `roundUiState.ts`'s re-export that closes the loop. A genuine circular import, but a
 * safe one: every cross-module reference in the cycle is used only inside a function body,
 * resolved at CALL time once every module in the cycle has finished evaluating, never at a
 * module's top level. That top-level shape is the one that throws a TDZ error; see
 * `armingLabels.ts`'s own docblock for the case that does NOT survive it.
 */
import { BuffActivationRefusal, BuffKind, type Buff } from '../../hunt'
import { legalMoves, PlayerSide, type Card } from '../../warCouncil'
import { loadoutDoorOpen, loadoutRefusalFor } from './buffHandlers'
import {
  cheatArmed,
  curseArmed,
  loadoutOpen,
  offeredBuffs,
  type RoundUiState,
} from './roundUiState'

/** DLR-174 — a card may be RAISED here — free, commits nothing, and deliberately wider than
 *  `canAct` so the Quarry-to-lead gap (where arming is already legal today) is reachable. Playing
 *  still requires `canAct`; see `handleTapCard` (`roundReducer.ts`). Delegates to `loadoutDoorOpen`
 *  rather than restating its two terms — one owner for "reaching for it is not a move". */
export function cardRaiseWindowOpen(state: RoundUiState): boolean {
  return loadoutDoorOpen(state)
}

/** DLR-174 AC7 — a held Cheat that could be armed RIGHT NOW, so an off-suit card after the Quarry
 *  has led is a LOCK the player can pay to open rather than a refusal. Asks `loadoutRefusalFor`,
 *  the same predicate the row's own disabled state asks, so the fan's refusal and the surface's
 *  offer cannot disagree.
 *
 *  ASSUMPTION (latent, not live today — flagged rather than guarded further, per review): this
 *  only excludes a Cheat refused for `WindowClosed`. A Cheat refused for `InsufficientAp` or
 *  `AlreadyActive` would still be returned here and offered as an "unlocking" row, even though it
 *  cannot actually be armed. Neither reading is reachable while `AP_ENABLED` is off and a Cheat
 *  still in `offeredBuffs` cannot structurally be `AlreadyActive` — but if AP gating is ever
 *  turned back on, this stops being vacuously true and needs the narrower `=== WindowClosed`
 *  swapped for an explicit "is this refusal one an arm could still clear" question. */
export function unlockingCheat(state: RoundUiState): Buff | null {
  return (
    offeredBuffs(state).find(
      (buff) =>
        buff.kind === BuffKind.Cheat &&
        loadoutRefusalFor(state, buff) !== BuffActivationRefusal.WindowClosed,
    ) ?? null
  )
}

/** DLR-174 AC1/AC11 — the arming surface holds the stage. A raised card, or an armed Curse whose
 *  claimed-hand-tap mode must be stated in words. Gated on `loadoutDoorOpen` (through
 *  `cardRaiseWindowOpen`) so the fault, held-reveal, prompt and round-over stage branches all
 *  still win — those states make `discardWindowOpen`/`canAct` both false, and a Curse cannot
 *  survive into any of them by construction (`handleCarryOn` refuses to advance while one is
 *  armed). */
export function armingSurfaceOpen(state: RoundUiState): boolean {
  return cardRaiseWindowOpen(state) && (state.armed !== null || curseArmed(state))
}

/** DLR-174 — THE one statement of "the gallery holds the stage", replacing the two-term
 *  expression `WarCouncilTable.tsx` used to inline (`loadoutOpen(ui) && loadoutDoorOpen(ui)`).
 *  The arming surface wins when both could show — see `armingSurfaceOpen` above — so this is
 *  `false` whenever that one is `true`. */
export function galleryOpen(state: RoundUiState): boolean {
  return loadoutOpen(state) && cardRaiseWindowOpen(state) && !armingSurfaceOpen(state)
}

/** DLR-174 review fix (Code-Evaluator Issue 2) — THE one reading of "what can the player legally
 *  play right now", through the SAME `cheatArmed` option `commit` plays with. Before this, both
 *  `WarCouncilTable.tsx`'s fan-greying `legal` and `roundReducer.ts`'s own `legalNow` re-typed
 *  the identical expression — two hand-written copies a future cheat-adjacent option could update
 *  in one place and not the other, silently desyncing the fan's greying from the reducer's
 *  refusal. One function, one import path, called from both. */
export function legalMovesFor(state: RoundUiState): readonly Card[] {
  return legalMoves(
    state.round,
    PlayerSide.Player,
    cheatArmed(state) ? { ignoreFollowSuit: true } : undefined,
  )
}
