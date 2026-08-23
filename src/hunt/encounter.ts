import {
  TIMEBOMB_PLAYER_DAMAGE,
  TIMEBOMB_QUARRY_DAMAGE,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
} from './config'
import {
  DuelSide,
  type Damage,
  type EncounterState,
  type Health,
  type IncomingDamage,
} from './types'

/**
 * AC1 — a fresh encounter, both bars read from DLR-66's configured totals.
 *
 * `encounterIndex` selects the Quarry's bar from `QUARRY_ENCOUNTER_HEALTH`; it does NOT
 * sequence anything. Running the encounters in order is `src/hunt/run.ts`'s (DLR-82), which calls
 * this function once per fight and passes the health the player carried out of the last one. Any
 * restore between them (`ENCOUNTER_PLAYER_RESTORE`) remains DELIBERATELY UNREAD — DLR-82 forbids
 * wiring it in, and DLR-93 landed the flask WITHOUT it: the flask is a separate, player-triggered
 * between-fights heal (`run.ts`'s `drinkFlask`), not this tunable finally being wired in.
 *
 * `playerHealth` is a defaulted parameter rather than something the function closes over — the
 * same injectable pattern this module's other configuration-derived values use — so a spec can
 * vary it without mutating module state.
 */
export function startEncounter(
  encounterIndex: number,
  playerHealth: Health = PLAYER_START_HEALTH,
): EncounterState {
  if (!Number.isFinite(playerHealth) || playerHealth <= 0) {
    throw new RangeError(
      `Cannot start an encounter with a player health of ${playerHealth}: it must be a positive finite number`,
    )
  }
  return {
    health: {
      [DuelSide.Player]: playerHealth,
      [DuelSide.Quarry]: quarryHealthForEncounter(encounterIndex),
    },
    damageEventsApplied: 0,
    winner: null,
    pendingTimebomb: NO_PENDING_TIMEBOMB,
  }
}

/** Nothing owed. Shared and only ever spread from, never assigned into — its `IncomingDamage`
 *  type is deeply `readonly`, the same discipline `duelHealthBars.ts`'s `NO_BREAKING` uses. */
export const NO_PENDING_TIMEBOMB: IncomingDamage = {
  [DuelSide.Player]: 0,
  [DuelSide.Quarry]: 0,
}

/**
 * AC6/AC8 — one damage event applied as it happens, which may fire several times across a
 * hand. `incoming` is already keyed by the side it depletes (`incomingFrom` performs that
 * crossing), so this function does not invert anything and cannot get it backwards.
 *
 * D7 — Quarry FIRST, then the player, and a Quarry that goes down means the player takes no
 * damage from this event. Replaces DLR-70's deplete-both-then-inspect, which existed to keep the
 * simultaneous case reachable; the developer overturned §9's tie ruling on 2026-08-19 and the tie
 * is now unreachable by construction.
 *
 * Returns a new state; the input is never mutated. That is what lets a caller preview an event
 * by applying it to a copy, rather than writing a second projection routine that could drift
 * from this one.
 */
export function applyDamage(encounter: EncounterState, incoming: IncomingDamage): EncounterState {
  if (encounter.winner !== null) {
    throw new RangeError(
      `Cannot apply damage to an encounter already resolved in favour of the ${encounter.winner} after ${encounter.damageEventsApplied} damage events`,
    )
  }
  assertApplicable(incoming[DuelSide.Player], DuelSide.Player)
  assertApplicable(incoming[DuelSide.Quarry], DuelSide.Quarry)

  // D7 — the Quarry FIRST. A Quarry that goes down to this event ends the encounter, and the
  // player takes nothing from it: the killing blow is its own protection. Replaces DLR-70's
  // deplete-both-then-inspect, which existed only to keep the simultaneous case reachable —
  // the developer overturned §9's tie ruling on 2026-08-19 and the tie is now unreachable by
  // construction rather than decided by a constant.
  const quarryHealth = deplete(encounter.health[DuelSide.Quarry], incoming[DuelSide.Quarry])
  const quarryDown = quarryHealth <= 0
  const playerHealth = quarryDown
    ? encounter.health[DuelSide.Player]
    : deplete(encounter.health[DuelSide.Player], incoming[DuelSide.Player])

  const health = {
    [DuelSide.Player]: playerHealth,
    [DuelSide.Quarry]: quarryHealth,
  }

  return {
    health,
    damageEventsApplied: encounter.damageEventsApplied + 1,
    winner: resolveWinner(health),
    pendingTimebomb: encounter.pendingTimebomb,
  }
}

/** One statement of what "resolved" means, so DLR-71's render guard and DLR-73's loop
 *  condition cannot disagree about it. */
export function isEncounterResolved(encounter: EncounterState): boolean {
  return encounter.winner !== null
}

/** Whether anything is owed. ONE statement, so a queue check and a payment cannot disagree.
 *  Also the predicate D6 (2026-08-19) reserves: Apply Damage must be disabled while Timebomb is
 *  pending. That control does not exist yet — version-4-scope.md §3 — so this has no caller for
 *  that purpose today and is kept deliberately rather than re-derived then. */
export function hasPendingTimebomb(encounter: EncounterState): boolean {
  return (
    encounter.pendingTimebomb[DuelSide.Player] > 0 || encounter.pendingTimebomb[DuelSide.Quarry] > 0
  )
}

/** D2 — the amount owed depends on WHICH SIDE will pay it. Stated here, once, beside the booking:
 *  a caller that had to choose the figure itself is a caller that can choose the wrong one.
 *  EXPORTED on DLR-101: the copy layer needs the figure for the reveal's Timebomb clause, and a
 *  caller that chose between the two constants itself is a caller that can choose the wrong one
 *  — the same reason this function exists at all. */
export function timebombDamageFor(target: DuelSide): Damage {
  return target === DuelSide.Player ? TIMEBOMB_PLAYER_DAMAGE : TIMEBOMB_QUARRY_DAMAGE
}

/**
 * D1/D3 — book Timebomb against one side, to be paid at the resolution of the NEXT TRICK.
 *
 * ACCUMULATES rather than overwrites (D4), so two bookings against one side sum. Returns the
 * encounter UNCHANGED when it is already resolved — a hit must never be carried into a fight that
 * is over. NEVER throws: the reducer calls this during an event handler, and a throw there
 * unmounts the tree.
 */
export function queueTimebomb(encounter: EncounterState, target: DuelSide): EncounterState {
  if (isEncounterResolved(encounter)) return encounter
  return {
    ...encounter,
    pendingTimebomb: {
      ...encounter.pendingTimebomb,
      [target]: encounter.pendingTimebomb[target] + timebombDamageFor(target),
    },
  }
}

/**
 * THE single clamp point (AC6) — and therefore also the single place surplus damage is
 * discarded (AC5). Those two acceptance criteria are one line of code seen from two
 * directions: nothing else in this module writes a health value, so a bar cannot go negative
 * and overkill cannot leave a trace anywhere in the returned state.
 *
 * §9 records the overkill question Deferred — wasted for now, possibly paid out later. When
 * that is designed, this is the one function that changes.
 */
function deplete(current: Health, damage: Damage): Health {
  return Math.max(0, current - damage)
}

/**
 * D7's two cases, over bars already depleted Quarry-first.
 *
 * There is no tie branch and no `SIMULTANEOUS_DEPLETION_WINNER`: `applyDamage` leaves the player's
 * health untouched whenever the Quarry goes down, so both-bars-empty is unreachable. §9's dated
 * ruling (2026-08-11 — the player loses) was overturned by the developer on 2026-08-19.
 *
 * `<= 0` rather than `=== 0` states the rule's own wording. `deplete` makes zero the only reachable
 * floor today, so the two are equivalent; the comparison survives a future path that does not
 * clamp.
 */
function resolveWinner(health: Readonly<Record<DuelSide, Health>>): DuelSide | null {
  if (health[DuelSide.Quarry] <= 0) return DuelSide.Player
  if (health[DuelSide.Player] <= 0) return DuelSide.Quarry
  return null
}

/**
 * There is no division anywhere in this module, so the classic `NaN` source is absent — but a
 * caller can still hand one in, and `NaN - x` is `NaN` while `Math.max(0, NaN)` is `NaN`. A
 * `NaN` health renders as an empty bar and logs nothing, so it is refused before the
 * subtraction rather than diagnosed afterwards.
 *
 * Finite and non-negative, NOT integral: under `DAMAGE_ROUNDING = None` a ×0.5 band
 * legitimately produces a half-point total, and an integer guard would break a supported
 * configuration.
 */
function assertApplicable(damage: Damage, side: DuelSide): void {
  if (!Number.isFinite(damage) || damage < 0) {
    throw new RangeError(
      `Damage applied to the ${side} must be a non-negative finite number, received ${damage}`,
    )
  }
}
