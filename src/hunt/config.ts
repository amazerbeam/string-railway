import { HuntDeclaration, QuarryCharacter, DuelSide, type Health } from './types'

export const StandingBandName = {
  Humble: 'humble',
  Defeated: 'defeated',
  Victorious: 'victorious',
  Greedy: 'greedy',
} as const
export type StandingBandName = (typeof StandingBandName)[keyof typeof StandingBandName]

export interface StandingBand {
  readonly minTricks: number
  readonly maxTricks: number
  readonly name: StandingBandName
  readonly multiplier: number
}

/**
 * The direction section's two mirrored tables — one per declaration, both sides reading
 * whichever is in force. Decided 2026-08-11 (§9 "The multipliers"): designed, not
 * transcribed from the printed table, and capped at ×5 on either path.
 *
 * The two tables' BAND BOUNDARIES genuinely differ — Win groups 7–9 in one row, Lose groups
 * 4–6 — which is why boundaries are per-row data here and never a shared list or an `if`
 * branch (DLR-66 AC1). §1 derives why the Lose table peaks at 4–6: on that path every trick
 * you win is material handed to the opponent.
 *
 * Their defining property is exact complementarity — Lose(k) = Win(13 − k) at all fourteen
 * splits. That is load-bearing, not decorative: it is what makes §1's same-path rule hold,
 * and `__tests__/config.test.ts` asserts it over whatever pair is configured here, so a
 * hand-edit that breaks it fails loudly.
 *
 * VALUES: the developer's to overturn. Swapping the whole pair — different multipliers AND
 * different boundaries — is an edit to this one literal.
 */
export const HUNT_MULTIPLIER_TABLES: Readonly<Record<HuntDeclaration, readonly StandingBand[]>> = {
  [HuntDeclaration.Win]: [
    { minTricks: 0, maxTricks: 3, name: StandingBandName.Humble, multiplier: 1 },
    { minTricks: 4, maxTricks: 4, name: StandingBandName.Defeated, multiplier: 2 },
    { minTricks: 5, maxTricks: 5, name: StandingBandName.Defeated, multiplier: 3 },
    { minTricks: 6, maxTricks: 6, name: StandingBandName.Defeated, multiplier: 4 },
    { minTricks: 7, maxTricks: 9, name: StandingBandName.Victorious, multiplier: 5 },
    { minTricks: 10, maxTricks: 13, name: StandingBandName.Greedy, multiplier: 0.5 },
  ],
  [HuntDeclaration.Lose]: [
    { minTricks: 0, maxTricks: 3, name: StandingBandName.Humble, multiplier: 0.5 },
    { minTricks: 4, maxTricks: 6, name: StandingBandName.Defeated, multiplier: 5 },
    { minTricks: 7, maxTricks: 7, name: StandingBandName.Victorious, multiplier: 4 },
    { minTricks: 8, maxTricks: 8, name: StandingBandName.Victorious, multiplier: 3 },
    { minTricks: 9, maxTricks: 9, name: StandingBandName.Victorious, multiplier: 2 },
    { minTricks: 10, maxTricks: 13, name: StandingBandName.Greedy, multiplier: 1 },
  ],
}

/**
 * AC2's declaration-aware accessor — the only way a consumer outside this module gets a
 * table. Nothing outside `src/hunt/` names `HUNT_MULTIPLIER_TABLES` or any table identifier;
 * callers name a declaration and this resolves it.
 */
export function standingTableFor(declaration: HuntDeclaration): readonly StandingBand[] {
  return HUNT_MULTIPLIER_TABLES[declaration]
}

/**
 * Resolves a trick count to its Standing band by scanning `table`.
 *
 * `table` is REQUIRED — it was optional, defaulting to the retired single table. With two
 * tables in play a default would let a Lose-path caller who omits the argument score off the
 * Win table and get a plausible number with nothing failing anywhere; requiring it turns
 * every such omission into a compile error (DLR-66 AC2). Use `standingTableFor` to get one.
 *
 * Still throws a `RangeError` outside 0–13: inside that range there is exactly one match by
 * construction in both tables, so an out-of-range call is a caller bug, not a data gap.
 */
export function resolveStanding(tricks: number, table: readonly StandingBand[]): StandingBand {
  const band = table.find((b) => tricks >= b.minTricks && tricks <= b.maxTricks)
  if (!band) {
    throw new RangeError(`No Standing band configured for trick count ${tricks}`)
  }
  return band
}

// §9 "Card base values" — provisional: a card's value is its printed rank,
// not flat 1 (§3, §9 — flat 1 collapses Spoils×Standing to the
// single-variable function 2k×f(k); rank weighting keeps the two terms
// independent).
export function cardBaseValue(rank: number): number {
  return rank
}

// DLR-63 AC3's `12 − r`. NOT a tuning value: 12 is max(RANKS) + 1 for the 1-11 deck,
// so the inversion is symmetric (rank 1 <-> 11) and its own inverse. Named rather than
// inlined so a future deck-size change has exactly one place to look.
export const RANK_INVERSION_PIVOT = 12

/**
 * DLR-63 AC3 — a card's value on the Lose path. Deliberately the same
 * `(rank: number) => number` signature as `cardBaseValue`, so it drops into `spoils`'s
 * injectable value parameter with no new plumbing.
 */
export function invertedCardValue(rank: number): number {
  return RANK_INVERSION_PIVOT - rank
}

/**
 * §1's additive term, per declaration: a card is worth its printed rank on Win and `12 − r`
 * on Lose (DLR-66 AC6). Both functions already existed and are unchanged; this is the
 * accessor that pairs with `standingTableFor`, so a consumer names a declaration once and
 * gets both terms of §1's equation.
 *
 * NO modifier of any kind is applied. The Treasure `+1` and Poison `−1` are Decided-removed
 * (§1, §9 2026-08-11) — at ×5 a ±1 card modifier moves a Hunt by 5 out of 540.
 */
export function cardValueFor(declaration: HuntDeclaration): (rank: number) => number {
  return declaration === HuntDeclaration.Lose ? invertedCardValue : cardBaseValue
}

/**
 * The two settings §9's "Rounding of the ×0.5 bands" row leaves open. `None` is the doubling
 * dissolution that row offers: double every multiplier in both tables and both health totals
 * and every product is an integer, so there is nothing left to round — the same table in a
 * different presentation, not a different table.
 */
export const DamageRounding = {
  HalfAwayFromZero: 'halfAwayFromZero',
  None: 'none',
} as const
export type DamageRounding = (typeof DamageRounding)[keyof typeof DamageRounding]

/**
 * §9 records this row Undecided; DLR-65 says it cannot be deferred past phase 2, so DLR-66
 * ships a stated default rather than a null. THE DEVELOPER'S TO OVERTURN — switching to the
 * doubled presentation is this constant plus both tables plus both health totals, every one
 * of them in this file.
 */
export const DAMAGE_ROUNDING: DamageRounding = DamageRounding.HalfAwayFromZero

/**
 * Applies the rule to one side's raw `card value × Standing`. Nothing calls this yet — DLR-65
 * T3 owns the damage arithmetic. The rule is a defaulted parameter rather than something the
 * function closes over, so a test proves both settings without mutating module state, the
 * same injectable pattern `resolveStanding`'s table already uses.
 *
 * `Math.sign(raw) * Math.round(Math.abs(raw))`, never bare `Math.round`: JS breaks ties toward
 * +∞, so `Math.round(-0.5)` is `-0` and the rule would not be the one it is named after.
 * Throws on a non-finite input — a NaN rounded into a health bar renders nothing and logs
 * nothing, which is the failure mode that never gets reported.
 */
export function roundDamage(raw: number, rule: DamageRounding = DAMAGE_ROUNDING): number {
  if (!Number.isFinite(raw)) {
    throw new RangeError(`Cannot round a non-finite damage value: ${raw}`)
  }
  return rule === DamageRounding.None ? raw : Math.sign(raw) * Math.round(Math.abs(raw))
}

// §9 "Player health P" — DECIDED 2026-08-11, the developer's value. Equal to the Quarry's
// first-encounter health by design: `P = H` is what puts the win/lose boundary exactly on the
// 6/7 line the declaration commits to (7 tricks a Hunt wins on Hunt 4, 6 tricks loses on
// Hunt 4), and §5 states that property survives any later rescaling of health.
// UNIT: health points, depleted by damage.
export const PLAYER_START_HEALTH: Health = 1350

// Per-encounter Quarry health, in encounter order. NEW TO DLR-65 — §9 decides only the 1,350
// of the first bar (Quarry health H, 2026-08-11); the 1,600 second encounter is the epic's,
// and which character carries it is an assumption (the Monarch, the only one with round-long
// enforcement on disk — src/warCouncil/quarryRuleBreak.ts).
// UNIT: health points per encounter. A `readonly Health[]` rather than a fixed pair so a third
// encounter is one more entry, not a type change.
export const QUARRY_ENCOUNTER_HEALTH: readonly Health[] = [1350, 1600]

/**
 * Throws a `RangeError` rather than returning `undefined`: an out-of-range index would
 * otherwise become `NaN` on the first subtraction and vanish from a health bar with no error
 * logged anywhere. Same posture as `resolveStanding` — a bad index is a caller bug.
 */
export function quarryHealthForEncounter(index: number): Health {
  const health = QUARRY_ENCOUNTER_HEALTH[index]
  if (health === undefined) {
    throw new RangeError(
      `No Quarry health configured for encounter ${index} (${QUARRY_ENCOUNTER_HEALTH.length} configured)`,
    )
  }
  return health
}

// Health restored to the player entering the next encounter. NEW TO DLR-65 — the epic states
// no restore, and the breakdown names this the single thing most likely to change, so it
// exists as a tunable precisely so testing a restore is a one-line edit.
// UNIT: health points, added once between encounters. VALUE: the developer's.
export const ENCOUNTER_PLAYER_RESTORE: Health = 0

// §5 / §9 "Simultaneous depletion" — DECIDED 2026-08-11: both bars empty on the same Hunt and
// the player loses. Data rather than a hardcoded branch, so DLR-65 T5 reads an attributed
// ruling instead of an unexplained `if`.
export const SIMULTANEOUS_DEPLETION_WINNER: DuelSide = DuelSide.Quarry

// §9 "Forage budget per encounter" — decided, provisional (developer decision,
// 2026-08-09 per DLR-48 AC3): 4 edits.
export const FORAGE_BUDGET_PER_ENCOUNTER = 4

// §9 "Encounters per run" — undecided in §9 itself; DLR-48 AC3 sets a
// provisional 5 so the prototype is playable.
export const ENCOUNTERS_PER_RUN = 5

export const TelegraphFidelity = {
  Suit: 'suit', // narrowest — only the lead suit is telegraphed
  SuitAndStance: 'suitAndStance', // §4's stated default — suit plus pressing/ducking
} as const
export type TelegraphFidelity = (typeof TelegraphFidelity)[keyof typeof TelegraphFidelity]

// §4's visibility table / DLR-52 AC4 — the Quarry's next-trick intent is telegraphed at this
// fidelity, never as the exact card, so §4's hidden-hand row is never violated. Conservative
// default named at the DLR-52 planning gate; the single value most likely to move after T8's
// playtest.
export const TELEGRAPH_FIDELITY: TelegraphFidelity = TelegraphFidelity.SuitAndStance

// §11 "any single character is sufficient; which of the five is not load-bearing". Not a
// tuning value: DLR-51 enforces only the Monarch's rule-break and QUARRY_CHARACTERS holds
// only its copy, so this is forced by what is implemented. It exists as a key so T13 has
// exactly one place to change when the other four characters land.
export const SLICE_QUARRY_CHARACTER: QuarryCharacter = QuarryCharacter.Monarch
