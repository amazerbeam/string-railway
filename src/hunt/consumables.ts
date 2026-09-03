import { BuffKind, BuffTier, type Buff, type BuffId } from './buffs'
import type { Damage } from './types'

/**
 * DLR-126 — everything true of a ONE-SHOT ITEM, and nothing else. Cites, never restates:
 * `.docs/design/Balatro-Forbidden-Solitaire/v1-buff-card-list.md` → *Utilities, consumables and
 * activated cards*, rows 1–5, and the five prose paragraphs immediately under that table.
 *
 * A LEAF MODULE. It imports `./buffs` and `./types` and nothing else — in particular NOT
 * `./buffActivation`, which imports THIS. The edge runs one way: activation knows what a
 * consumable is, a consumable knows nothing about activation. Reversing it is a cycle.
 *
 * The distinction this module exists to draw: DLR-108 shipped the generic activation flow — a
 * window, a tiered AP price, refusal codes, a poise/commit UI — and every one of those applies to
 * Cheat and Shield too. What none of that does is make a card a CONSUMABLE. Before this
 * module, activating a Ward spent 2 AP, recorded the id in `activatedThisTrick`, had that record
 * wiped by `openBuffWindow` at the next trick boundary, and did nothing at all — the card stayed in
 * the pile forever and could be re-bought every trick. A consumable is spent ONCE, leaves the pile,
 * and applies its effect AT THE SPEND rather than at a condition it does not have.
 *
 * DLR-145 — a THIRD toggle, `CONDITION_CARD_SINGLE_USE`, extends the idea to Taker, Feeder and
 * Sidestep: condition families that fire on a TRIGGER rather than a player spend, but which this
 * pass makes leave the pile once fired. `isConsumableItem` is where all three toggles converge.
 */

/**
 * The five one-shot items DLR-111 names. Cheat and Shield are a SEPARATE, additive rule
 * layered on top of this fixed five-member set, not folded into it — see
 * `ACTIVATED_CARD_SINGLE_USE` below. Both are `BuffCadence.Activated` and both are
 * priced through `buffCosts.ts`'s `CONSUMABLE_AP_COST`, but each ARMS FELT STATE at the spend
 * rather than (or in addition to) leaving the pile — a Cheat sets `cheatTricksRemaining`,
 * `activateShield` credits shield hearts. Whether the spent
 * card ALSO leaves the pile is `ACTIVATED_CARD_SINGLE_USE`'s question, not this union's — DLR-142
 * defaults both to single-use, reversible per card with a one-line edit to that toggle.
 * "Consumable" here means the narrower thing DLR-111 names — spent ONCE and gone from the pile —
 * not the wider `CONSUMABLE_AP_COST` pricing bucket that happens to share the word.
 */
export type ConsumableItemKind =
  | typeof BuffKind.Ward
  | typeof BuffKind.Puppeteer
  | typeof BuffKind.SecondThoughts
  | typeof BuffKind.Foresight
  | typeof BuffKind.Spyglass

/**
 * AC2 — the window a consumable needs. TWO values rather than one because Puppeteer genuinely
 * needs a different one, and saying so is the honest answer AC2 asks for.
 */
export const ConsumableTiming = {
  /** `discardWindowOpen`'s window — the felt is between tricks. Four of the five.  */
  BetweenTricks: 'betweenTricks',
  /** After the Quarry has led and BEFORE the player commits their own card. Puppeteer only:
   *  DLR-111's worked example steers the opponent's next legal move, and there are no legal moves
   *  to steer until they have led. NO REDUCER OPENS THIS WINDOW TODAY — `discardWindowOpen`
   *  requires `currentTrick.length === 0`, which is the opposite condition. Declared rather than
   *  forced through the between-tricks window, where Puppeteer would be inert. */
  BeforeOwnCard: 'beforeOwnCard',
} as const
export type ConsumableTiming = (typeof ConsumableTiming)[keyof typeof ConsumableTiming]

/** Which window each consumable needs. `Record`-typed over `ConsumableItemKind`, so a sixth
 *  consumable fails to compile HERE rather than silently defaulting to a window it cannot use. */
export const CONSUMABLE_TIMING: Readonly<Record<ConsumableItemKind, ConsumableTiming>> = {
  [BuffKind.Ward]: ConsumableTiming.BetweenTricks,
  [BuffKind.Puppeteer]: ConsumableTiming.BeforeOwnCard,
  [BuffKind.SecondThoughts]: ConsumableTiming.BetweenTricks,
  [BuffKind.Foresight]: ConsumableTiming.BetweenTricks,
  [BuffKind.Spyglass]: ConsumableTiming.BetweenTricks,
}

// The four tier ladders, TRANSCRIBED from `v1-buff-card-list.md` → *Utilities, consumables and
// activated cards*, rows 1–5. NOT CHOSEN HERE. Each has exactly one reader — `consumableEffectOf`
// or `activateWard` — so one card has exactly one answer, the discipline `buffCosts.ts` sets for
// `CONSUMABLE_AP_COST` and `buffCatalog.ts` sets for `CHEAT_DURATION_TRICKS`.

/** Row 1 — "absorbs up to N on the next hit, then breaks regardless". UNIT: damage. */
export const WARD_ABSORPTION: Readonly<Record<BuffTier, Damage>> = {
  [BuffTier.Bronze]: 1,
  [BuffTier.Silver]: 3,
  [BuffTier.Gold]: 5,
}

/** Row 3 — "extra discard charges this fight", stacking onto `DISCARDS_PER_FIGHT`.
 *  UNIT: discard charges. */
export const SECOND_THOUGHTS_CHARGES: Readonly<Record<BuffTier, number>> = {
  [BuffTier.Bronze]: 1,
  [BuffTier.Silver]: 2,
  [BuffTier.Gold]: 3,
}

/** Row 4 — "peek the draw pile", 1/3/5 cards. UNIT: cards revealed. */
export const FORESIGHT_CARDS: Readonly<Record<BuffTier, number>> = {
  [BuffTier.Bronze]: 1,
  [BuffTier.Silver]: 3,
  [BuffTier.Gold]: 5,
}

/** Row 5 — "rule out N candidates of a chosen suit", 1/2/3. UNIT: candidate cards eliminated. */
export const SPYGLASS_CANDIDATES: Readonly<Record<BuffTier, number>> = {
  [BuffTier.Bronze]: 1,
  [BuffTier.Silver]: 2,
  [BuffTier.Gold]: 3,
}

/** Row 2 — Puppeteer is SINGLE TIER in the source document: one forced card at every tier, which
 *  is why `CONSUMABLE_AP_COST` prices it flat at 4. A scalar rather than a tier table, because
 *  there is one number, not three. UNIT: cards forced. */
export const PUPPETEER_FORCED_CARDS = 1

/**
 * AC4 — what ONE spend does. Tagged by the `BuffKind` itself rather than by a second parallel
 * string union, so a consumable has one vocabulary and a reader cannot hold a `kind` from one
 * union while switching on the other.
 */
export type ConsumableEffect =
  | { readonly kind: typeof BuffKind.Ward; readonly absorbs: Damage }
  | { readonly kind: typeof BuffKind.Puppeteer; readonly forcedCards: number }
  | { readonly kind: typeof BuffKind.SecondThoughts; readonly discardCharges: number }
  | { readonly kind: typeof BuffKind.Foresight; readonly cardsRevealed: number }
  | { readonly kind: typeof BuffKind.Spyglass; readonly candidatesEliminated: number }

/**
 * Whether spending this kind does anything IN THIS BUILD. `false` for the three whose effects need
 * a player-choice surface no screen provides: Puppeteer must offer the Quarry's legal moves,
 * Foresight must reveal N of the draw pile, Spyglass must eliminate N candidates of a suit chosen
 * at use time (design §5a). Read by `buffActivationStockFor` into `BuffActivationStock.effectLive`
 * and refused as `BuffActivationRefusal.NoEffectYet`.
 *
 * A card that can never do anything is refused rather than allowed to be spent for nothing.
 * DLR-112 is about to mint these cards, so a silently inert 4-AP Puppeteer would become a live
 * defect on a DATA change rather than a code one. **The ticket that builds each surface flips one
 * boolean here and changes nothing else.**
 *
 * This is NOT a redundancy check. A Ward spent on a trick that turns out to be safe is a legitimate
 * player mistake and is allowed — no consumable is ever provably redundant at the moment of use.
 */
export const CONSUMABLE_EFFECT_LIVE: Readonly<Record<ConsumableItemKind, boolean>> = {
  [BuffKind.Ward]: true,
  [BuffKind.SecondThoughts]: true,
  [BuffKind.Puppeteer]: false,
  [BuffKind.Foresight]: false,
  [BuffKind.Spyglass]: false,
}

/** Membership derived from `CONSUMABLE_TIMING`'s own keys rather than restated, so a kind added to
 *  that table is admitted here automatically — the mirror discipline `buffCosts.ts`'s
 *  `CONSUMABLE_KINDS` already sets against `CONSUMABLE_AP_COST`. */
const CONSUMABLE_ITEM_KINDS: ReadonlySet<BuffKind> = new Set(
  Object.keys(CONSUMABLE_TIMING) as ConsumableItemKind[],
)

/** Whether `kind` is one of the five one-shot items. FALSE for Cheat and Shield. */
export function isConsumableItemKind(kind: BuffKind): kind is ConsumableItemKind {
  return CONSUMABLE_ITEM_KINDS.has(kind)
}

/** The Activated cards whose single-use-ness is a developer-owned toggle rather than the
 *  fixed DLR-111 five-item set's rule. */
type ActivatedItemKind = typeof BuffKind.Cheat | typeof BuffKind.Shield

/**
 * Whether spending this Activated card ALSO removes it from the pile, on top of the felt-state
 * effect it always arms (`handleTapBuff`'s `cheatTricksRemaining` / `activateShield`). Default
 * `true` for both as of 2026-08-25 — a player who spams a card now runs out of copies of it.
 * TO REVERT ONE CARD to "stays in the pile, spend it again next trick,"
 * flip that entry to `false` here. Nothing else in this module, and no other file, needs to change
 * — `isConsumableItem` below is the only reader.
 */
export const ACTIVATED_CARD_SINGLE_USE: Readonly<Record<ActivatedItemKind, boolean>> = {
  [BuffKind.Cheat]: true,
  [BuffKind.Shield]: true,
}

const ACTIVATED_ITEM_KINDS: ReadonlySet<BuffKind> = new Set(
  Object.keys(ACTIVATED_CARD_SINGLE_USE) as ActivatedItemKind[],
)

function isActivatedSingleUseKind(kind: BuffKind): kind is ActivatedItemKind {
  return ACTIVATED_ITEM_KINDS.has(kind)
}

/** The three CONDITION families whose single-use-ness is a developer-owned toggle. A SIBLING of
 *  `ACTIVATED_CARD_SINGLE_USE`, not a member of `ConsumableItemKind`: these cards have a TRIGGER,
 *  not a timing window and an effect, so neither `CONSUMABLE_TIMING` nor `CONSUMABLE_EFFECT_LIVE`
 *  admits them and neither `consumableTimingOf` nor `consumableEffectOf` may be called on one. */
type ConsumedConditionKind =
  typeof BuffKind.Taker | typeof BuffKind.Feeder | typeof BuffKind.Sidestep

/**
 * DLR-145 AC1 — whether activating this condition card ALSO removes it from the pile. Default
 * `true` for all three as of 2026-08-25: this is the change that turns a rented buff into a spent
 * one, and it is the whole point of the Version 6 pass. Before it, a Taker was re-activated and
 * re-paid every trick and the correct play was to dump the pool every trick, because the pool came
 * back before the next one.
 *
 * TO REVERT ONE CARD to "stays in the pile", flip that entry to `false`. Nothing else in this
 * module, and no other file, needs to change — `isConsumableItem` below is the only reader.
 */
export const CONDITION_CARD_SINGLE_USE: Readonly<Record<ConsumedConditionKind, boolean>> = {
  [BuffKind.Taker]: true,
  [BuffKind.Feeder]: true,
  [BuffKind.Sidestep]: true,
}

const CONSUMED_CONDITION_KINDS: ReadonlySet<BuffKind> = new Set(
  Object.keys(CONDITION_CARD_SINGLE_USE) as ConsumedConditionKind[],
)

function isConsumedConditionKind(kind: BuffKind): kind is ConsumedConditionKind {
  return CONSUMED_CONDITION_KINDS.has(kind)
}

/** Whether `buff` is a one-shot item — the predicate `activateFromPile` branches on to decide
 *  whether an activation also SPENDS the card. TRUE for the five DLR-111 items, true for
 *  Cheat/Shield exactly when `ACTIVATED_CARD_SINGLE_USE` says so for that kind, and TRUE
 *  for Taker/Feeder/Sidestep exactly when `CONDITION_CARD_SINGLE_USE` says so for that kind —
 *  see each constant's own docblock for how to revert one card. FALSE for every other condition
 *  family (still declared, no longer mintable — DLR-145 Phase 1 does not touch the union). */
export function isConsumableItem(buff: Buff): boolean {
  if (isConsumableItemKind(buff.kind)) return true
  if (isActivatedSingleUseKind(buff.kind)) return ACTIVATED_CARD_SINGLE_USE[buff.kind]
  return isConsumedConditionKind(buff.kind) && CONDITION_CARD_SINGLE_USE[buff.kind]
}

/** The window `buff` needs. THROWS on a non-consumable rather than defaulting to
 *  `BetweenTricks` — a Cheat's window is DLR-108's business, not this module's, and a plausible
 *  default here would silently answer a question this module has no right to answer. */
export function consumableTimingOf(buff: Buff): ConsumableTiming {
  if (!isConsumableItemKind(buff.kind)) {
    throw new RangeError(
      `Buff ${buff.id} is a ${buff.kind}, not a consumable item — it has no use window`,
    )
  }
  return CONSUMABLE_TIMING[buff.kind]
}

/**
 * AC4 — what spending `buff` does. A TOTAL `switch` over `ConsumableItemKind` behind a throwing
 * guard, so a sixth consumable added to `CONSUMABLE_TIMING` fails to compile HERE rather than
 * falling through to `undefined`.
 *
 * THROWS on any other kind, `cheatDurationTricksOf`'s discipline and a sharper version of its
 * reason: every figure below is a small integer, so a swallowed version would read a Cheat's
 * duration as a Ward's absorption and look entirely reasonable doing it.
 */
export function consumableEffectOf(buff: Buff): ConsumableEffect {
  if (!isConsumableItemKind(buff.kind)) {
    throw new RangeError(
      `Buff ${buff.id} is a ${buff.kind}, not a consumable item — it has no effect`,
    )
  }
  switch (buff.kind) {
    case BuffKind.Ward:
      return { kind: BuffKind.Ward, absorbs: WARD_ABSORPTION[buff.tier] }
    case BuffKind.Puppeteer:
      return { kind: BuffKind.Puppeteer, forcedCards: PUPPETEER_FORCED_CARDS }
    case BuffKind.SecondThoughts:
      return { kind: BuffKind.SecondThoughts, discardCharges: SECOND_THOUGHTS_CHARGES[buff.tier] }
    case BuffKind.Foresight:
      return { kind: BuffKind.Foresight, cardsRevealed: FORESIGHT_CARDS[buff.tier] }
    case BuffKind.Spyglass:
      return { kind: BuffKind.Spyglass, candidatesEliminated: SPYGLASS_CANDIDATES[buff.tier] }
  }
}

/** Whether spending `buff` would do anything. TRUE for every non-consumable — `NoEffectYet` is a
 *  statement about unbuilt CONSUMABLE surfaces only, and a Cheat's availability is decided by
 *  DLR-108's three refusals, not by this one. NEVER THROWS: it is read on a render path. */
export function consumableEffectIsLive(buff: Buff): boolean {
  return isConsumableItemKind(buff.kind) ? CONSUMABLE_EFFECT_LIVE[buff.kind] : true
}

/**
 * AC1 — one line of the counted inventory: "2x Protect 3". DERIVED from the owned pile, never a
 * second store (`plan.md` Part 1 → Assumptions made): a separate inventory would fork ownership in
 * two, and `activatableBuffs` — the documented cure for the `Unassigned` trap — would only ever
 * see half of it.
 */
export interface ConsumableStack {
  readonly kind: ConsumableItemKind
  readonly tier: BuffTier
  /** How many of this exact `(kind, tier)` the pile holds. Always at least 1. */
  readonly count: number
  /** Their ids, in pile order. `spendConsumable` takes one of these. */
  readonly ids: readonly BuffId[]
}

/**
 * AC1 — the pile as counted stacks, one per `(kind, tier)`. Non-consumables are dropped entirely,
 * so `Unassigned` placeholders and Cheats never appear. ORDER IS THE PILE'S: a stack sits where its
 * first member does, because the pile's order is the player's mental order — the rule
 * `activatableBuffs` already states.
 *
 * A bronze and a gold Ward are TWO stacks, not one: tier is what the count is of, and merging them
 * would report "2x Ward" for two cards that absorb different amounts.
 */
export function consumableStacks(buffs: readonly Buff[]): readonly ConsumableStack[] {
  const order: string[] = []
  const byKey = new Map<string, { kind: ConsumableItemKind; tier: BuffTier; ids: BuffId[] }>()
  for (const buff of buffs) {
    if (!isConsumableItemKind(buff.kind)) continue
    const key = `${buff.kind}:${buff.tier}`
    const found = byKey.get(key)
    if (found === undefined) {
      order.push(key)
      byKey.set(key, { kind: buff.kind, tier: buff.tier, ids: [buff.id] })
    } else {
      found.ids.push(buff.id)
    }
  }
  return order.map((key) => {
    // Non-null by construction: `order` only ever receives a key the same iteration just set.
    const entry = byKey.get(key) as { kind: ConsumableItemKind; tier: BuffTier; ids: BuffId[] }
    return { kind: entry.kind, tier: entry.tier, count: entry.ids.length, ids: entry.ids }
  })
}

/**
 * AC3 — the pile minus EXACTLY ONE card. The whole of what makes a consumable consumable: before
 * this, a Ward could be re-activated every trick forever.
 *
 * THROWS rather than returning the pile unchanged when `id` is absent or names a non-consumable.
 * A silent no-op here is the duplicate-payment bug in its purest form — AP spent, card kept — and
 * `activateFromPile` is the only caller, so a throw is a guard rather than a live path.
 *
 * Removes by IDENTITY, not by `(kind, tier)`: two bronze Wards are two cards, and spending one must
 * leave the other's id in the pile.
 */
export function spendConsumable(buffs: readonly Buff[], id: BuffId): readonly Buff[] {
  const found = buffs.find((buff) => buff.id === id)
  if (found === undefined) {
    throw new RangeError(`Cannot spend buff ${id}: it is not in the pile`)
  }
  if (!isConsumableItem(found)) {
    throw new RangeError(`Cannot spend buff ${id}: a ${found.kind} is not a consumable item`)
  }
  return buffs.filter((buff) => buff !== found)
}

/** Discard charges `buff` grants, or `0` for anything that is not a Second Thoughts — so a caller
 *  adds unconditionally rather than branching on kind at the call site. UNIT: discard charges. */
export function extraDiscardCharges(buff: Buff): number {
  return buff.kind === BuffKind.SecondThoughts ? SECOND_THOUGHTS_CHARGES[buff.tier] : 0
}

/**
 * One hit split by a held Ward. Deliberately carries NO remaining-guard field, which is the whole
 * difference from `shield.ts`'s `ShieldAbsorption`: a blue heart is spent per point and survives
 * with a remainder, whereas a Ward BREAKS whenever it took part in a hit at all. Modelling a
 * remainder would invite a caller to carry one forward.
 */
export interface WardAbsorption {
  /** Taken by the Ward. Never exceeds `wardAbsorbs`, never exceeds `damage`. */
  readonly absorbed: Damage
  /** The remainder, for blue hearts and then red health. */
  readonly throughToHealth: Damage
}

/**
 * THE single statement of Ward's arithmetic: it absorbs up to N of one hit
 * (`v1-buff-card-list.md` → *Ward*). Whether it then breaks is `applyDamage`'s to state, not this
 * function's — this one does arithmetic and nothing else, exactly as `absorbWithShield` does.
 *
 * GUARDS rather than diagnoses, mirroring `absorbWithShield`'s pair for its reason: `applyDamage`'s
 * `assertApplicable` already rejects a negative or non-finite `damage` upstream, so both throws are
 * guards for a future direct caller. A `NaN` here would produce `NaN` remaining health, reach a
 * rendered heart row as nothing at all, and log nothing.
 *
 * Finite and non-negative, NOT integral — under `DAMAGE_ROUNDING = None` a ×0.5 band legitimately
 * produces a half-point total, and an integer guard would break a supported configuration.
 */
export function absorbWithWard(wardAbsorbs: Damage, damage: Damage): WardAbsorption {
  if (!Number.isFinite(wardAbsorbs) || wardAbsorbs < 0) {
    throw new RangeError(
      `Cannot absorb damage against a Ward of ${wardAbsorbs}: it must be a non-negative finite number`,
    )
  }
  if (!Number.isFinite(damage) || damage < 0) {
    throw new RangeError(
      `Cannot absorb ${damage} damage with a Ward: damage must be a non-negative finite number`,
    )
  }
  const absorbed = Math.min(wardAbsorbs, damage)
  return { absorbed, throughToHealth: damage - absorbed }
}

/** How much `tier`'s Ward absorbs. THE only reader of `WARD_ABSORPTION`, so one tier has exactly
 *  one answer — `shieldHeartsForTier`'s discipline, including its throw on a tier outside the
 *  table, which would otherwise flow into `activateWard` and hold a Ward of `undefined`. */
export function wardAbsorptionForTier(tier: BuffTier): Damage {
  const absorbs = WARD_ABSORPTION[tier]
  if (absorbs === undefined) {
    throw new RangeError(`No Ward absorption is defined for tier ${tier}`)
  }
  return absorbs
}
