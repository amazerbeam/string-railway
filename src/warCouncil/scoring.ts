import {
  cardValueSchemeFor,
  DuelSide,
  resolveStanding,
  roundDamage,
  standingTableFor,
  type CardValueScheme,
  type Damage,
  type HuntDeclaration,
  type IncomingDamage,
  type Spoils,
  type Standing,
  type StandingBand,
} from '../hunt'
import { spoils } from './spoils'
import {
  declaredPath,
  otherSide,
  PlayerSide,
  RoundPhase,
  TRICKS_PER_ROUND,
  type RoundState,
} from './types'

/** One side's finished Hunt — every field derived once from a final `RoundState`, never
 *  accumulated per trick. Renamed from `HuntScore` on DLR-67: the product is damage to the
 *  other side, not a score checked against a target.
 *
 *  `spoils` is deliberately NOT renamed to `cardValue`. DLR-68 AC1 asked for that rename and
 *  the developer withdrew it (2026-08-12): the three read sites are in `.tsx` files that
 *  ticket may not touch, so renaming would have failed its own typecheck gate or breached its
 *  own scope boundary. `hybrid-design.md` §1 retires "Spoils" as a design term; the code and
 *  the on-screen copy keep it for the prototype. See `.claude/contract/DLR-68-two-sided-damage/plan.md`. */
export interface HuntDamage {
  readonly spoils: Spoils
  readonly tricks: number
  readonly band: StandingBand
  readonly standing: Standing
  readonly damage: Damage
}

/**
 * Why a Hunt cannot be scored. A closed set, shaped like `DeclareRejection`
 * (declareHunt.ts:4-8) and `IllegalMoveReason` (types.ts:124-135), so a test can assert
 * WHICH guard fired without matching a message string.
 */
export const HuntNotScorable = {
  Unfinished: 'unfinished',
  Undeclared: 'undeclared',
} as const
export type HuntNotScorable = (typeof HuntNotScorable)[keyof typeof HuntNotScorable]

/**
 * AC5 requires a throw rather than a zero: a `damage: 0` return is indistinguishable from a
 * legitimately scoreless Hunt and would be applied to a health bar as authorised damage.
 *
 * The first `Error` subclass in `src/` — a deliberate deviation from the three bare
 * `RangeError` throws in src/hunt/config.ts, taken because AC5 distinguishes three failure
 * modes and a result union would let a caller ignore the failure entirely. Approved at the
 * DLR-68 plan gate.
 *
 * `reason` is declared and assigned rather than written as a constructor parameter property:
 * `erasableSyntaxOnly` is on and forbids that form.
 */
export class HuntNotScorableError extends Error {
  readonly reason: HuntNotScorable

  constructor(reason: HuntNotScorable, message: string) {
    super(message)
    this.name = 'HuntNotScorableError'
    this.reason = reason
  }
}

/**
 * Both sides' damage for one finished Hunt (AC1).
 *
 * `incoming` is keyed by the side the damage is APPLIED TO, never by the side that dealt it
 * (AC3) — `incoming[PlayerSide.Player]` is what the Quarry dealt and what depletes the
 * player's health. The crossing is performed once, in `huntDamage`, so no consumer has to
 * remember to invert. A dealer-keyed record was rejected for exactly that reason: the first
 * caller that forgot would subtract the player's own damage from the player's own health, and
 * it would type-check and produce plausible numbers indefinitely.
 */
export interface HuntOutcome {
  /** The one declaration BOTH sides were scored under (AC2). */
  readonly declaration: HuntDeclaration
  readonly incoming: Readonly<Record<PlayerSide, HuntDamage>>
}

/**
 * Computes §1's equation once for `side`, from `state`'s already-final `tricksWon` /
 * `capturedCards`.
 *
 * Both terms default off the state's OWN declaration via `declaredPath`. DLR-69 replaced the bare
 * card-value function with a `CardValueScheme` carrying both the value function and the pile it is
 * summed over, so no caller can inject one half and let the other default from a different source.
 * Scheme and table stay injectable so a test can hold one term flat while varying the other,
 * mirroring `resolveStanding`'s pattern in src/hunt/config.ts.
 */
export function scoreHunt(
  state: RoundState,
  side: PlayerSide,
  scheme: CardValueScheme = cardValueSchemeFor(declaredPath(state)),
  standingTable: readonly StandingBand[] = standingTableFor(declaredPath(state)),
): HuntDamage {
  const tricks = state.tricksWon[side]
  const band = resolveStanding(tricks, standingTable)
  const spoilsValue = spoils(state, side, scheme)
  return {
    spoils: spoilsValue,
    tricks,
    band,
    standing: band.multiplier,
    // AC4's single rounding point. Every `HuntDamage` in the program therefore means
    // rounded, applicable damage — including the ones `huntDamage` returns, which call
    // through here rather than rounding again.
    damage: roundDamage(spoilsValue * band.multiplier),
  }
}

/**
 * AC1's entry point: both sides' damage for one finished Hunt, computed once from a final
 * `RoundState` and never accumulated per trick.
 *
 * The declaration is read straight off `state.declaration` and NOT through `declaredPath`.
 * That helper defaults an undeclared round to Win so the mid-round readouts have a table to
 * display before the player declares — correct for a readout, and wrong here: routed through
 * it, an undeclared Hunt would score cleanly off the Win table and deal real damage no rule
 * authorised. AC5 requires a refusal instead.
 *
 * Both terms are resolved ONCE and handed to both seats, which is AC2 made structural: there
 * is one declaration, it is read once, and the Quarry reading a different table is not a bug
 * that could occur and be caught but a state the code cannot express (hybrid-design.md lines
 * 67-72 for why that is load-bearing). DLR-69: the pile a side is paid for travels in that same
 * scheme, so "the two sides read different piles" is one crossing performed in `spoils`, not a
 * per-seat decision either caller could get wrong.
 */
export function huntDamage(finalState: RoundState): HuntOutcome {
  if (finalState.phase !== RoundPhase.Complete) {
    throw new HuntNotScorableError(
      HuntNotScorable.Unfinished,
      `Cannot compute damage for a Hunt in phase "${finalState.phase}": damage is read off the final trick count, so no total exists until all ${TRICKS_PER_ROUND} tricks have resolved`,
    )
  }

  const declaration = finalState.declaration?.path
  if (declaration === undefined) {
    throw new HuntNotScorableError(
      HuntNotScorable.Undeclared,
      'Cannot compute damage for an undeclared Hunt: both sides read the value scheme and multiplier table of the declared path, and no default is authorised by any rule',
    )
  }

  return outcomeFor(finalState, declaration)
}

/**
 * THE one arithmetic path for a Hunt's two-sided damage. `huntDamage` and `pendingHuntDamage`
 * both call it and neither computes anything of its own, so DoD 7's "no second arithmetic
 * path that could drift from the applied total" is structural rather than a promise —
 * scoring.test.ts asserts the two agree exactly on a finished Hunt.
 *
 * Both terms are resolved ONCE from the single declaration and handed to both seats: the
 * Quarry reading a different table is not a bug that could occur and be caught, it is a state
 * this code cannot express (hybrid-design.md lines 67-72).
 */
function outcomeFor(state: RoundState, declaration: HuntDeclaration): HuntOutcome {
  const scheme = cardValueSchemeFor(declaration)
  const standingTable = standingTableFor(declaration)

  // Keyed by the side that DEALT it. Crossed below — never returned in this form.
  const dealt: Readonly<Record<PlayerSide, HuntDamage>> = {
    [PlayerSide.Player]: scoreHunt(state, PlayerSide.Player, scheme, standingTable),
    [PlayerSide.Cpu]: scoreHunt(state, PlayerSide.Cpu, scheme, standingTable),
  }

  return {
    declaration,
    // The crossing, performed once, here. `otherSide` states the rule in the code: the damage
    // that depletes a side is the damage the OTHER side dealt.
    incoming: {
      [PlayerSide.Player]: dealt[otherSide(PlayerSide.Player)],
      [PlayerSide.Cpu]: dealt[otherSide(PlayerSide.Cpu)],
    },
  }
}

/**
 * DLR-70 AC3 — the same equation evaluated early, for a readout drawn every trick.
 *
 * No phase guard, deliberately: this is the mid-Hunt figure, and §6 names it the catch-up
 * route the equation already pays for at zero new rules. Because nothing is applied until
 * trick 13, no Hunt is decided until the last trick, and a Quarry sitting on 9 tricks with
 * lethal pending damage can still be pushed to a 10th.
 *
 * `null` — not a zero-valued outcome — when the Hunt is undeclared. A `damage: 0` return is
 * indistinguishable from a legitimately scoreless Hunt (DLR-68 AC5's own reasoning), and a
 * figure no declaration authorises is exactly what `huntDamage`'s Undeclared guard exists to
 * prevent. This is NOT routed through `declaredPath`: that helper's undeclared-reads-as-Win
 * default is right for the Standing track, which shows which TABLE is in force, and wrong for
 * a number the player will read as damage about to land.
 */
export function pendingHuntDamage(state: RoundState): HuntOutcome | null {
  const declaration = state.declaration?.path
  return declaration === undefined ? null : outcomeFor(state, declaration)
}

/**
 * THE one `PlayerSide` -> `DuelSide` crossing (DLR-70). `src/hunt/` cannot import
 * `src/warCouncil/` without a cycle (hunt/types.ts:26-32), so the encounter module takes two
 * plain numbers and this is what produces them — on the warCouncil side, which is the side
 * allowed to know both vocabularies.
 *
 * Keyed by the side the damage is APPLIED TO, preserving `incoming`'s convention end to end.
 * Existing as one function is the point: a call site writing
 * `outcome.incoming[PlayerSide.Cpu].damage` by hand is one typo away from depleting the wrong
 * bar, type-checking cleanly, and producing plausible numbers indefinitely.
 */
export function duelSideDamage(outcome: HuntOutcome): IncomingDamage {
  return {
    [DuelSide.Player]: outcome.incoming[PlayerSide.Player].damage,
    [DuelSide.Quarry]: outcome.incoming[PlayerSide.Cpu].damage,
  }
}
