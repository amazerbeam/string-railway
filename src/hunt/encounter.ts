import {
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  SIMULTANEOUS_DEPLETION_WINNER,
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
 * wiring it in, and the flask stories own it.
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
  }
}

/**
 * AC6/AC8 — one damage event applied as it happens, which may fire several times across a
 * hand. `incoming` is already keyed by the side it depletes (`incomingFrom` performs that
 * crossing), so this function does not invert anything and cannot get it backwards.
 *
 * Both bars are depleted BEFORE either is inspected. Resolving after the first subtraction
 * would make AC4's simultaneous case unreachable and §9's tie ruling dead code.
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

  const health = {
    [DuelSide.Player]: deplete(encounter.health[DuelSide.Player], incoming[DuelSide.Player]),
    [DuelSide.Quarry]: deplete(encounter.health[DuelSide.Quarry], incoming[DuelSide.Quarry]),
  }

  return {
    health,
    damageEventsApplied: encounter.damageEventsApplied + 1,
    winner: resolveWinner(health),
  }
}

/** One statement of what "resolved" means, so DLR-71's render guard and DLR-73's loop
 *  condition cannot disagree about it. */
export function isEncounterResolved(encounter: EncounterState): boolean {
  return encounter.winner !== null
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
 * AC4's three cases, over bars that have already been depleted.
 *
 * The tie reads `SIMULTANEOUS_DEPLETION_WINNER` rather than returning `DuelSide.Quarry`
 * directly, so §9's dated ruling (2026-08-11 — the player loses) stays attributable from the
 * code and is overturned by editing `config.ts` alone.
 *
 * `<= 0` rather than `=== 0` states AC4's own wording. `deplete` makes zero the only reachable
 * floor today, so the two are equivalent; the comparison survives a future path that does not
 * clamp.
 */
function resolveWinner(health: Readonly<Record<DuelSide, Health>>): DuelSide | null {
  const playerDown = health[DuelSide.Player] <= 0
  const quarryDown = health[DuelSide.Quarry] <= 0
  if (playerDown && quarryDown) {
    return SIMULTANEOUS_DEPLETION_WINNER
  }
  if (quarryDown) {
    return DuelSide.Player
  }
  if (playerDown) {
    return DuelSide.Quarry
  }
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
