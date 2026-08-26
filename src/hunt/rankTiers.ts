import type { Coins } from './types'

/**
 * DLR-122 — the deck's named ranks gain a bronze/silver/gold ability ladder, bought in the shop
 * and permanent for the rest of the run (`version-5-developer-idea.md` §7b).
 *
 * Deliberately NOT `src/hunt/config.ts`, which stands at 381 of its 400-line blocking budget; this
 * is the split `slotConfig.ts` and `apConfig.ts` already made for the same reason. No existing
 * importer of `config.ts` changes.
 *
 * Pure and DOM-free like everything else in this tree, and free of `Math.random()`: a tier is
 * BOUGHT, never drawn, so nothing here participates in the seeded-draw machinery.
 */

/**
 * The seven ranks that CAN carry a ladder — the deck's named cards (`the-hunt.md` §5). Named by
 * word rather than by number because `src/hunt/` cannot import `src/warCouncil/`'s `CardRank`
 * without a cycle (`types.ts`'s own docblock records why); `src/warCouncil/rankTierRules.ts`
 * performs the one crossing.
 */
export const TieredRank = {
  Swan: 'swan',
  Fox: 'fox',
  Woodcutter: 'woodcutter',
  Treasure: 'treasure',
  Poison: 'poison',
  Witch: 'witch',
  Monarch: 'monarch',
} as const
export type TieredRank = (typeof TieredRank)[keyof typeof TieredRank]

/**
 * The ladder's three rungs. Bronze is the ability PRINTED TODAY in every row, so a run that buys
 * nothing plays exactly as it plays now (AC1).
 *
 * A SEPARATE union from `buffs.ts`'s `BuffTier`, deliberately, even though the two read the same
 * to a player (§7b: "bronze/silver/gold means the same thing here as it does on a buff card").
 * A buff tier is DRAWN and keys `buffCosts.ts`'s `apCostOf`; a rank tier is BOUGHT with coin and
 * costs no AP at all. Sharing one type would let a rank tier be handed to `apCostOf`, which would
 * type-check and then price something that has no AP price.
 */
export const AbilityTier = {
  Bronze: 'bronze',
  Silver: 'silver',
  Gold: 'gold',
} as const
export type AbilityTier = (typeof AbilityTier)[keyof typeof AbilityTier]

/** Low to high. THE statement of the ladder's ORDER — nothing anywhere compares two tiers by
 *  string, because `'gold' < 'silver'` is true and would read as sensible code. */
export const TIER_LADDER: readonly AbilityTier[] = [
  AbilityTier.Bronze,
  AbilityTier.Silver,
  AbilityTier.Gold,
]

/**
 * What the SHELF offers — exactly the convention DLR-116 introduced for `SHOP_ITEMS` versus
 * `ShopItem`: the union above is everything the game CAN tier, this array is what is actually
 * purchasable. Nothing mechanical is missing from the union, and adding a rank here is a
 * one-line change once its effect exists.
 *
 * Swan and Witch ship because their silver and gold rungs resolve entirely inside the card
 * layer's existing seams. The other five are typed, documented and deliberately NOT offered,
 * because each needs a surface DLR-122 does not build:
 *
 *   - Fox        — silver peeks at the top of the draw pile, gold exchanges without giving a
 *                  card up. Both need a new player-choice surface beside `AbilityChoiceKind`.
 *   - Woodcutter — silver and gold draw 2 or 3 and bury 1, which needs a multi-card choice UI.
 *   - Treasure   — pays coins at a trick, which needs a coin channel out of `src/warCouncil/`
 *                  that does not exist; the card layer cannot learn `RunState`.
 *   - Poison     — queues delayed damage, which collides with Timebomb's own vocabulary
 *                  (`the-hunt.md` §1 records rank 8 has nothing to do with the skull or the
 *                  Timebomb) and needs that collision answered first.
 *   - Monarch    — its narrowing is read at five call sites, one of them the Quarry's own move
 *                  choice, and its gold rung needs a new `RoundState` field to survive a trick.
 *
 * A tier that is sold but does nothing would take coins for nothing, which is worse than not
 * offering it. That is the whole reason this array is shorter than the union.
 */
export const TIERED_RANKS: readonly TieredRank[] = [TieredRank.Swan, TieredRank.Witch]

/**
 * Where every tierable rank currently stands, for one run. A TOTAL record rather than a sparse
 * map: a resolution branch reading a missing key would get `undefined`, and `undefined` compared
 * against a tier is the silent-wrong-answer failure this codebase keeps designing out.
 */
export type RankTierTable = Readonly<Record<TieredRank, AbilityTier>>

/** A run that has bought nothing — AC1's "plays exactly as it does now", as a value. Read at
 *  `startRun` and as the default wherever a table is absent. Never written: every step returns a
 *  new table, so this object is shared safely and there is no module-level mutable state. */
export const ALL_BRONZE: RankTierTable = {
  [TieredRank.Swan]: AbilityTier.Bronze,
  [TieredRank.Fox]: AbilityTier.Bronze,
  [TieredRank.Woodcutter]: AbilityTier.Bronze,
  [TieredRank.Treasure]: AbilityTier.Bronze,
  [TieredRank.Poison]: AbilityTier.Bronze,
  [TieredRank.Witch]: AbilityTier.Bronze,
  [TieredRank.Monarch]: AbilityTier.Bronze,
}

/** A tier's rung number, 0-based. THE only place a tier becomes a number. */
export function tierIndexOf(tier: AbilityTier): number {
  return TIER_LADDER.indexOf(tier)
}

/** Whether `tier` stands at `floor` or above it. Every "is this upgraded" test in the codebase
 *  goes through here rather than through `===`, so a fourth rung would need no call-site edit. */
export function tierAtLeast(tier: AbilityTier, floor: AbilityTier): boolean {
  return tierIndexOf(tier) >= tierIndexOf(floor)
}

/** The next rung up, or `null` at the top. `null` is the REAL answer for gold, not a missing
 *  one — `isAtMaxTier` is the predicate a caller usually wants. */
export function nextTierAfter(tier: AbilityTier): AbilityTier | null {
  return TIER_LADDER[tierIndexOf(tier) + 1] ?? null
}

/** Whether `rank` can be upgraded no further. THE statement of "a rank is bought at most twice" —
 *  read by `shop.ts`'s `refusalFor`, so the screen and the transition cannot disagree. */
export function isAtMaxTier(table: RankTierTable, rank: TieredRank): boolean {
  return nextTierAfter(table[rank]) === null
}

/**
 * One step up the ladder for one rank, as a NEW table — the input is never mutated, so a caller
 * previews a purchase by applying it to a copy exactly as `applyDamage` lets a caller preview a
 * damage event.
 *
 * Throws a `RangeError` naming the rank and its tier rather than returning the table unchanged,
 * following `buyFromShop` and `drinkFlask`: a silent no-op after a coin was taken is precisely the
 * "took payment for nothing" failure this codebase refuses to allow. Unreachable through the UI —
 * `refusalFor` returns `RankAtMaxTier` first and the control is disabled, and `buyFromShop`
 * re-checks `refusalFor` before it reaches this call.
 */
export function steppedTo(table: RankTierTable, rank: TieredRank): RankTierTable {
  const next = nextTierAfter(table[rank])
  if (next === null) {
    throw new RangeError(
      `Cannot upgrade ${rank} beyond ${AbilityTier.Gold}: it is already at ${table[rank]}`,
    )
  }
  return { ...table, [rank]: next }
}

/**
 * AC7 — THE pricing configuration point for the whole shelf. One key rather than a per-rank or
 * per-step table, because AC7 asks for one point and a flat step price is the only shape that
 * literally is one.
 *
 * TRANSCRIBED from `version-5-developer-idea.md` §7b's own reading ("Read here as 5 coins per
 * tier step — so a rank taken from bronze to gold costs 10 coins in total, twice a Whetstone,
 * which is deliberately steep for a permanent that never expires"). NOT chosen here.
 *
 * VALUE UNCHOSEN in the sense that matters — never played. Against the rest of the economy:
 * `COINS_PER_ENCOUNTER_WIN` is 10, a slot reroll is 1, Heal / Cheat / Blast Guard are 1, Timebomb
 * is 2, AP capacity is 3, and Whetstone — which `config.ts` calls "the shop's one real splurge" —
 * is 4. At 5, one tier STEP now costs half an encounter win rather than a whole one, so a full
 * ladder is a fraction of a single fight's income instead of a whole run's. §7b names two readings
 * it did not rule out: a flat 5 for the whole ladder, or an escalating 5 / 10 / 15. Both are the
 * developer's to take.
 *
 * UNIT: coins per tier STEP — bronze to silver, and silver to gold, each cost this.
 */
export const RANK_TIER_STEP_PRICE: Coins = 5
