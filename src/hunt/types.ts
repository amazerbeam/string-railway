export const QuarryCharacter = {
  Swan: 'swan',
  Fox: 'fox',
  Woodcutter: 'woodcutter',
  Witch: 'witch',
  Monarch: 'monarch',
} as const
export type QuarryCharacter = (typeof QuarryCharacter)[keyof typeof QuarryCharacter]

/** The CPU opponent for one encounter — a character cast from the deck's odd ranks (§4). */
export interface Quarry {
  readonly character: QuarryCharacter
}

/** Summed value of cards captured — the additive term of §1's equation. */
export type Spoils = number

/** The multiplier read off the trick-count band — the multiplicative term of §1's equation. */
export type Standing = number

/** A side's card value × its Standing for one Hunt — what depletes the other side's health
 *  (§1's vocabulary table). Renamed from `Score` on DLR-67: there is no target to score
 *  against any more. Nothing applies it yet; DLR-68 owns that. */
export type Damage = number

/**
 * §5/§10 — the two combatants in the duel, each holding a health bar. Deliberately NOT
 * `src/warCouncil/`'s `PlayerSide` ('player' | 'cpu'): that union names the engine's two
 * seats at a trick, this one names the two sides that hold health. `src/hunt/` cannot import
 * from `src/warCouncil/` without a cycle — warCouncil already imports hunt — and §10's
 * vocabulary calls the opponent the Quarry.
 */
export const DuelSide = {
  Player: 'player',
  Quarry: 'quarry',
} as const
export type DuelSide = (typeof DuelSide)[keyof typeof DuelSide]

/** A side's remaining health — the pool damage depletes, replacing the rising Demand (§5). */
export type Health = number

/** DLR-63 AC1: the path declared off the dealt hand, before the first trick. */
export const HuntDeclaration = {
  Win: 'win',
  Lose: 'lose',
} as const
export type HuntDeclaration = (typeof HuntDeclaration)[keyof typeof HuntDeclaration]

/** One 13-trick round — the inner loop. Each side's `card value × Standing` is damage to the
 *  other (§1, §10). Narrowed on DLR-67: the Demand and the Lose-credit pool are both retired. */
export interface Hunt {
  readonly quarry: Quarry
}

/**
 * One Hunt's damage, keyed by the side it is APPLIED TO — never by the side that dealt it.
 * The same convention as `HuntOutcome.incoming` in src/warCouncil/scoring.ts, carried across
 * the module boundary deliberately: the crossing is performed exactly once, there, by
 * `duelSideDamage`. A dealer-keyed record would let the first caller who forgot subtract a
 * side's own damage from its own health, type-check, and produce plausible numbers forever.
 */
export type IncomingDamage = Readonly<Record<DuelSide, Damage>>

/**
 * A sequence of Hunts fought until a bar empties (§5) — the state that outlives one
 * `RoundState`. Immutable: `applyHunt` returns a new one, so a caller previews a Hunt by
 * applying it to a copy rather than projecting health through a second arithmetic path.
 *
 * Holds no `RoundState` and no `PlayerSide`. `src/hunt/` cannot import `src/warCouncil/`
 * without a cycle (types.ts:26-32), which is why damage arrives as two numbers.
 */
export interface EncounterState {
  readonly health: Readonly<Record<DuelSide, Health>>
  /** How many Hunts have been applied. NOT a cap — DLR-70 AC7 states there deliberately is
   *  none; the stall is the evidence a cap is needed (§11). */
  readonly huntsApplied: number
  /** `null` while the encounter is live. `Player` — the encounter is won; `Quarry` — the run
   *  ends. Typed `DuelSide` so the simultaneous-depletion tie is a direct read of
   *  `SIMULTANEOUS_DEPLETION_WINNER` rather than a translation onto a second vocabulary. */
  readonly winner: DuelSide | null
}
