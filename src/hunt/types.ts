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

/** One 13-trick round — the inner loop, scored once via Spoils × Standing checked against the Demand (§1, §10). */
export interface Hunt {
  readonly quarry: Quarry
  readonly demand: Demand
}
