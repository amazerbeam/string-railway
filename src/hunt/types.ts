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
