/**
 * The round screen's two health bars, assembled from committed reducer state.
 *
 * Split out of `WarCouncilRound.tsx` on DLR-101, the moment the Timebomb wiring pushed it past its
 * 400-line budget — the same forced split that produced `quarryAdvance.ts` (DLR-94),
 * `commitHandlers.ts` and `discardHandlers.ts` (DLR-100). It is also the split that makes this
 * derivation directly testable: as a block inside a component it could only be exercised through
 * a renderer.
 */
import { DuelSide, type Health } from '../../hunt'
import { incomingFrom } from '../../warCouncil'
import {
  duelHealthBars,
  NO_BREAKING,
  projectedDepletion,
  type HealthBarView,
} from './duelHealthBars'
import type { RoundUiState } from './roundUiState'

/**
 * Four derivations, no new state:
 *
 *  · the AT-RISK preview (DLR-86 AC3) is the streak over `bank` and `multiplier`, which the engine
 *    already writes on every trick — it resets itself when they reset (AC5), because it is a view
 *    of them rather than a copy.
 *  · the TICKING hearts (DLR-101) are `encounter.pendingTimebomb`, which the engine books when a
 *    marked trick resolves and clears when it pays. Read rather than remembered, for the same
 *    reason: a copy would need an effect, and an effect would need to survive StrictMode.
 *  · the BREAKING hearts (DLR-86 AC2) are the damage of the trick currently held on screen.
 *    `roundReducer` never applies damage without setting `resolvedTrick` in the same transition,
 *    so the held reveal IS the damage event. Reading it rather than diffing a remembered previous
 *    health keeps this a pure function of committed state and ties the crack to the cards that
 *    caused it.
 *  · the SHIELD pips (DLR-115) are `encounter.shieldHearts`, read rather than remembered for the
 *    same reason the other three are — and the player's projection is routed through
 *    `absorbWithShield` (inside `projectedDepletion`) so the preview cannot contradict what
 *    `applyDamage` will do once a shield stands.
 *
 * DLR-86 AC4 needs no code: a cash-out zeroes bank and multiplier and sets `resolvedTrick` in ONE
 * transition, so the same hearts at the same indices go atRisk -> breaking in one render.
 *
 * RESIDUAL (DLR-115, out of scope): `breaking` above is still the GROSS damage of the event on
 * screen, while `ui.encounter.shieldHearts` is the POST-absorption remainder — so when a shield
 * partially absorbs a landed hit, more red pips render `breaking` than red health actually lost.
 * Fixing it exactly needs `ResolvedTrick` to record the absorption, which is engine/state work
 * this ticket's Scope Boundaries put out of bounds. Unreachable today because nothing mints a
 * Shield buff into any drawable pool yet (DLR-142) — `activateShield` is wired into
 * `handleTapBuff` and fires correctly once a Shield exists, but `shieldHearts` stays `0` in real
 * play until one does.
 */
export function barsForRound(
  ui: RoundUiState,
  maxHealth: Readonly<Record<DuelSide, Health>>,
): readonly HealthBarView[] {
  const pendingTimebombs = ui.encounter.pendingTimebomb
  return duelHealthBars(
    ui.encounter.health,
    projectedDepletion(
      ui.encounter.health,
      ui.round.bank,
      ui.round.multiplier,
      pendingTimebombs,
      ui.encounter.shieldHearts,
    ),
    maxHealth,
    {
      breaking: ui.resolvedTrick ? incomingFrom(ui.resolvedTrick.resolution) : NO_BREAKING,
      ticking: pendingTimebombs,
      shield: ui.encounter.shieldHearts,
    },
  )
}
