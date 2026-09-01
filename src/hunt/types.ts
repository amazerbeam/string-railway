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

/** A side's health lost to one damage event — what depletes the other side's health
 *  (§3.2's four-outcome table). Renamed from `Score` on DLR-67: there is no target to score
 *  against any more. */
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

/** The run's spendable currency (DLR-84). A whole number of coins, never fractional and never
 *  negative — `buyFromShop` refuses a purchase it cannot pay for rather than going below zero. */
export type Coins = number

/** DLR-104 AC1 — the resource buff activation (T5) and Apply Damage (T6) will draw against.
 *  A whole number, never fractional or negative in practice — spendAp in actionPoints.ts
 *  refuses rather than going below zero, exactly as Coins already does for coins. */
export type ActionPoints = number

/** One six-trick hand — the inner loop. Every trick's outcome cashes into the bank or into
 *  damage (§3.2, §10). Narrowed on DLR-80: the declaration, the Standing multiplier and the
 *  card-value schemes are all retired along with the round they scored. */
export interface Hunt {
  readonly quarry: Quarry
}

/**
 * One damage event, keyed by the side it is APPLIED TO — never by the side that dealt it.
 * The same convention `src/warCouncil/bank.ts`'s `incomingFrom` produces, carried across the
 * module boundary deliberately: the crossing is performed exactly once, there. A dealer-keyed
 * record would let the first caller who forgot subtract a side's own damage from its own
 * health, type-check, and produce plausible numbers forever.
 */
export type IncomingDamage = Readonly<Record<DuelSide, Damage>>

/**
 * A sequence of damage events fought until a bar empties (§5) — the state that outlives one
 * `RoundState`. Immutable: `applyDamage` returns a new one, so a caller previews an event by
 * applying it to a copy rather than projecting health through a second arithmetic path.
 *
 * Holds no `RoundState` and no `PlayerSide`. `src/hunt/` cannot import `src/warCouncil/`
 * without a cycle (types.ts:26-32), which is why damage arrives as two numbers.
 */
export interface EncounterState {
  readonly health: Readonly<Record<DuelSide, Health>>
  /** How many damage events have been applied. Damage now lands several times a hand (AC6,
   *  AC8), so a Hunt-shaped counter would be wrong on its face. NOT a cap. */
  readonly damageEventsApplied: number
  /** `null` while the encounter is live. `Player` — the encounter is won; `Quarry` — the run
   *  ends. Typed `DuelSide` so a screen reads the winning side directly rather than translating
   *  onto a second vocabulary. Since D7 (2026-08-19) a Quarry killed by an event spares the
   *  player that event's damage, so `Quarry` here means the player went down alone. */
  readonly winner: DuelSide | null
  /** DLR-90 AC3/AC4/AC7 — damage owed to each side at the START OF THE NEXT HAND, keyed by the
   *  side it is APPLIED TO, exactly as `IncomingDamage` is and for exactly its reason: the
   *  `PlayerSide` -> `DuelSide` crossing is performed once, in `bank.ts`, and a dealer-keyed
   *  record would let a caller deplete the wrong bar and produce plausible numbers forever.
   *
   *  An ACCUMULATOR rather than a single side, so two marked tricks in one hand — or one on each
   *  side — need no second field and no branch. `startEncounter` seeds it to zeros, which is what
   *  discards it at an encounter boundary (AC7) with no explicit clear step to forget; that is
   *  why this lives here and not on `RunState`. */
  readonly pendingTimebomb: IncomingDamage
  /** DLR-110 — the player's blue hearts (design doc §7a). A second pool of hit points that is
   *  NOT part of `health`, cannot be restored by any heal path, and is spent before red health
   *  (AC4). A scalar rather than a `Record<DuelSide, Health>` because only the player can hold
   *  them — a side-keyed field would model a Quarry shield nothing can create and every reader
   *  would have to handle, unlike `pendingTimebomb`, which is side-keyed because Timebomb
   *  genuinely hits both sides. Seeded to `NO_SHIELD_HEARTS` by `startEncounter`, which is what
   *  clears it at an encounter boundary with no explicit clear step to forget — the reason
   *  `pendingTimebomb` lives here too. NOT PERSISTED. */
  readonly shieldHearts: Health
  /** DLR-126 — a Ward held: how much damage it will absorb on the NEXT hit taken, after which it
   *  BREAKS regardless of whether that hit was fully absorbed (`v1-buff-card-list.md` → *Ward*).
   *  That "breaks regardless" is the whole difference from `shieldHearts` above, which is spent one
   *  point at a time and survives with a remainder — the two are deliberately not one field.
   *
   *  A scalar rather than a `Record<DuelSide, Damage>` for `shieldHearts`' reason: only the player
   *  can hold a Ward. Spent inside `applyDamage` BEFORE blue hearts, because a Ward perishes on
   *  contact and a blue heart does not, so spending the perishable pool first is the only order
   *  under which a Ward is ever worth more than the heart behind it. Seeded to `NO_WARD` by
   *  `startEncounter`, which is what clears it at an encounter boundary with no explicit clear step
   *  to forget. NOT PERSISTED. UNIT: damage. */
  readonly wardAbsorbs: Damage
}
