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

/** The encounter's score target; rises per encounter (§5). */
export type Demand = number

/** The equation's result — Spoils × Standing, checked against the Demand (§1). */
export type Score = number

/** DLR-63 AC1: the path declared off the dealt hand, before the first trick. */
export const HuntDeclaration = {
  Win: 'win',
  Lose: 'lose',
} as const
export type HuntDeclaration = (typeof HuntDeclaration)[keyof typeof HuntDeclaration]

/** One 13-trick round — the inner loop, scored once via Spoils × Standing checked against the Demand (§1, §10). */
export interface Hunt {
  readonly quarry: Quarry
  readonly demand: Demand
  /**
   * DLR-63 AC3: the capped pool a Lose declaration hands the player. Required for the
   * same reason `demand` is — an optional count would let a caller render a Lose path
   * with `undefined` credits and no error anywhere.
   */
  readonly loseCredits: number
}
