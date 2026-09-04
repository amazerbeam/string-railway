export const BuffTier = {
  Bronze: 'bronze',
  Silver: 'silver',
  Gold: 'gold',
} as const
export type BuffTier = (typeof BuffTier)[keyof typeof BuffTier]

/**
 * DLR-107 — WHICH card a buff is. DLR-105 shipped `Buff` with no identity field: `condition.kind`
 * describes a TRIGGER, not a card, and overloading it would make "when this fires" and "what this
 * is" the same string. A closed `as const` map, not an `enum` — `erasableSyntaxOnly` is on
 * (`tsconfig.app.json`), the same reason `BuffTier` above takes this shape.
 *
 * `Unassigned` is a RETAINED SENTINEL — DLR-135 removed the last production path that minted it
 * (the run's opening pile is four real bronze cards now, drawn by `startingPile.ts`), but the
 * member stays as the codebase's canonical unpriced kind, read by name by five guard suites.
 *
 * DLR-108/DLR-111 finding 1 — the 11 shipping condition families and 5 consumables the authored
 * v1 list needs, appended below the three pre-existing members which are UNCHANGED. `Unassigned`,
 * and `Cheat` keep their exact string values, so every existing equality check
 * (`buffCatalog.ts`, the two test files) still passes with no edit of its own.
 */
export const BuffKind = {
  Unassigned: 'unassigned',
  Cheat: 'cheat',
  // 11 shipping condition families (DLR-111 finding 1)
  // DLR-165 — renamed from Taker / Feeder / Sidestep. The condition each names is the MECHANICAL
  // axis: High = the player physically took the cards, Low = they did not. `SuitHigh` rather than
  // a bare `High` because `BuffKind.High` read inside `buffFires` collides with "the higher card",
  // which is the ambiguity this ticket exists to remove.
  // The VALUE change is BREAKING for persisted template ids — `templateIdFor` composes
  // `suitHigh:bells:magnitude` from it, and the Vault has `taker:bells:magnitude` on disk.
  // `SAVE_SCHEMA_VERSION` is bumped to 2 in this same change; see `src/persistence/config.ts`.
  SuitHigh: 'suitHigh',
  SuitLow: 'suitLow',
  MarkOfRank: 'markOfRank',
  SkullLow: 'skullLow',
  Glutton: 'glutton',
  Hoarder: 'hoarder',
  Unbloodied: 'unbloodied',
  DebtCollector: 'debtCollector',
  Keepsake: 'keepsake',
  Miser: 'miser',
  Cornered: 'cornered',
  // 5 consumables
  Ward: 'ward',
  Puppeteer: 'puppeteer',
  SecondThoughts: 'secondThoughts',
  Foresight: 'foresight',
  Spyglass: 'spyglass',
  // DLR-110 — design doc §7a puts Shield alongside Cheat as an activated card.
  Shield: 'shield',
  // DLR-161 — the two protective condition families. Their reward is neither damage nor
  // multiplier: they keep one of the streak's two figures through a trick that hurt you.
  SkullHelmet: 'skullHelmet',
  SkullTether: 'skullTether',
  /** DLR-162 — spent on the Manage Buffs screen to strip a card's suit condition. It has no
   *  condition and no reward of its own, and is refused on the felt by
   *  `BuffActivationRefusal.ShopOnly`. Its template id `'wildcard'` is a bare kind string like
   *  `'cheat'`, and is FROZEN the moment it ships (`ActivatedBuffTemplate`'s own docblock). */
  Wildcard: 'wildcard',
  /** DLR-167 — the player's own skull. An Activated card: the player presses it, so it has no
   *  trigger and gains no `buffFires` case. Its template id `'curse'` is a bare kind string like
   *  `'cheat'`, and is FROZEN the moment it ships (`ActivatedBuffTemplate`'s own docblock). */
  Curse: 'curse',
} as const
export type BuffKind = (typeof BuffKind)[keyof typeof BuffKind]

/** Minted from `RunState.nextBuffId`, never from `Math.random()` — `src/hunt/` is
 *  lint-enforced DOM-free and must stay deterministic, exactly as every id in this tree is. */
export type BuffId = number

/**
 * AC1's three known reward axes, widened by DLR-108/DLR-111 finding 2's 8 more. The three
 * pre-existing members are UNCHANGED. Blade deliberately maps onto the existing `magnitude` axis
 * rather than a new `flatDamage` one — `magnitude` is already the flat-damage axis on the tiered
 * ladder, and a synonym would give one quantity two names.
 */
export const BuffRewardAxis = {
  Magnitude: 'magnitude',
  DurationTricks: 'durationTricks',
  HeartCount: 'heartCount',
  Coins: 'coins',
  ApRefund: 'apRefund',
  Multiplier: 'multiplier',
  CardsRevealed: 'cardsRevealed',
  CandidatesEliminated: 'candidatesEliminated',
  DiscardCharges: 'discardCharges',
  DamageAbsorbed: 'damageAbsorbed',
  None: 'none',
  /** DLR-161 — the first reward that is neither flat damage nor multiplier. `REWARD_TIER_VALUE`'s
   *  figure on this axis is the GOLD BONUS added to the SURVIVING figure (0 / 0 / 1), not the
   *  protection itself: the protection is carried by the buff having fired at all. The zero at
   *  bronze and silver is therefore real and not this codebase's "plausible zero that
   *  type-checks" — `buffProtection.ts`'s docblock is where that reasoning is written down. */
  Protection: 'protection',
} as const
export type BuffRewardAxis = (typeof BuffRewardAxis)[keyof typeof BuffRewardAxis]

/**
 * Hunt-local suit vocabulary. Identical values to `src/warCouncil/types.ts`'s `Suit`, which
 * `src/hunt/` cannot import — `src/warCouncil/` already imports `src/hunt/`, and the reverse edge
 * is the cycle both modules' comments already call out. A test in `buffs.test.ts` pins the two
 * unions together member-for-member, so the two cannot drift silently even though they cannot
 * share a declaration.
 */
export const BuffTargetSuit = {
  Bells: 'bells',
  Keys: 'keys',
  Moons: 'moons',
} as const
export type BuffTargetSuit = (typeof BuffTargetSuit)[keyof typeof BuffTargetSuit]

// DLR-111 finding 3 — the closed bound `target.rank` is validated against. A plain `number`
// bound by these two constants rather than an eleven-member literal union: `src/warCouncil/
// types.ts` already keeps `RANKS` as `readonly number[]`, and an eleven-member union here would be
// the only place in the codebase that models a rank differently.
export const BUFF_TARGET_RANK_MIN = 1
export const BUFF_TARGET_RANK_MAX = 11

/** Present only on suit- or rank-parameterised families (DLR-111 finding 3) — e.g. Bell High
 *  (`suit`) or Mark of the 9 (`rank`). Optional because most families need neither. */
export interface BuffTarget {
  readonly suit?: BuffTargetSuit
  readonly rank?: number
}

/** A data-only descriptor — no evaluator. AC4 defers activation logic to a later ticket;
 *  `kind` is an open string because the real condition catalog (design doc §5) is explicitly
 *  "TO BE REVIEWED, not committed." `target` is a DLR-108/DLR-111 finding 3 addition, optional so
 *  every existing `BuffCondition` value (`UNASSIGNED_BUFF_CONDITION`, `ACTIVATED_BUFF_CONDITION`)
 *  stays valid unchanged. */
export interface BuffCondition {
  readonly kind: string
  readonly target?: BuffTarget
  /** DLR-162 — this condition IGNORES THE SUIT: it is satisfied on a trick of any suit, with the
   *  family's other requirement unchanged. Optional so every existing `BuffCondition` value
   *  (`UNASSIGNED_BUFF_CONDITION`, `ACTIVATED_BUFF_CONDITION`, every template's) stays valid with
   *  no edit. Set ONLY by `buffWild.ts`'s `wildenedBuff` / `mintWildAtTier` — never by a template,
   *  because a wild card is not a card the machine can deal. */
  readonly wild?: boolean
}

/** Whether `target`'s rank (if present) falls within `BUFF_TARGET_RANK_MIN..BUFF_TARGET_RANK_MAX`.
 *  A target with no rank at all is valid — most targets are suit-only. */
export function isValidBuffTarget(target: BuffTarget): boolean {
  if (target.rank === undefined) return true
  return target.rank >= BUFF_TARGET_RANK_MIN && target.rank <= BUFF_TARGET_RANK_MAX
}

/** The suit a buff's condition targets, or `null` if it targets none. Reads
 *  `buff.condition.target?.suit` so a consumer never reaches into the payload directly. */
export function buffTargetSuitOf(buff: Buff): BuffTargetSuit | null {
  return buff.condition.target?.suit ?? null
}

/** DLR-162 — whether this buff's condition ignores the suit. Reads `condition.wild` so no
 *  consumer reaches into the payload directly, exactly as `buffTargetSuitOf` does for the suit. */
export function buffIsWild(buff: Buff): boolean {
  return buff.condition.wild === true
}

/** DLR-162 — whether `buff` can ONLY be spent on the Manage Buffs screen, between fights. TRUE for
 *  the wildcard and nothing else. NEVER THROWS: it is read on a render path.
 *
 *  The plan put this in `consumables.ts` beside `consumableEffectIsLive`; it lives HERE instead
 *  because that file stood at 396 of the 400-line blocking budget and this predicate would have
 *  breached it. `buffs.ts` is the leaf-most module in this tree and the predicate reads nothing but
 *  `kind`, so the import edge still runs one way into `buffActivation.ts`. */
export function isShopOnlyBuff(buff: Buff): boolean {
  return buff.kind === BuffKind.Wildcard
}

/** The rank a buff's condition targets, or `null` if it targets none. */
export function buffTargetRankOf(buff: Buff): number | null {
  return buff.condition.target?.rank ?? null
}

/** The tier-scaled payoff. `axis` names WHICH quantity this buff's tier scales (magnitude,
 *  duration, or heart count); `value` is this buff's current tier's figure on that axis. */
export interface BuffReward {
  readonly axis: BuffRewardAxis
  readonly value: number
}

/** One owned buff. Carries no evaluation logic — condition matching and reward application are
 *  a later ticket's job (T5). */
export interface Buff {
  readonly id: BuffId
  /** DLR-107 — WHICH card this is. Required: every construction site names it, so a buff can never
   *  exist without an identity. */
  readonly kind: BuffKind
  readonly tier: BuffTier
  readonly condition: BuffCondition
  readonly reward: BuffReward
}

/** DLR-124 R4 — how often a family fires. `Event` families fire once per trick their condition is
 *  true on, `Threshold` families fire once per hand on the first trick their condition becomes
 *  true, `Terminal` fires once at hand end, and `Activated` cards (Cheat, the five
 *  consumables) fire on player action rather than a condition at all. */
export const BuffCadence = {
  Event: 'event',
  Threshold: 'threshold',
  Terminal: 'terminal',
  Activated: 'activated',
} as const
export type BuffCadence = (typeof BuffCadence)[keyof typeof BuffCadence]

/**
 * DLR-124 R4 / DLR-111's *Firing cadence* table, transcribed. `Record`-typed over every
 * `BuffKind` — including `Unassigned`, mapped to `Activated` as the closest-shaped bucket for a
 * retained sentinel that never actually fires — so a member added to `BuffKind` later fails to
 * compile at this table rather than silently classifying as `undefined`.
 */
export const BUFF_CADENCE: Readonly<Record<BuffKind, BuffCadence>> = {
  [BuffKind.Unassigned]: BuffCadence.Activated,
  [BuffKind.Cheat]: BuffCadence.Activated,
  [BuffKind.SuitHigh]: BuffCadence.Event,
  [BuffKind.SuitLow]: BuffCadence.Event,
  [BuffKind.MarkOfRank]: BuffCadence.Event,
  [BuffKind.SkullLow]: BuffCadence.Event,
  [BuffKind.Glutton]: BuffCadence.Event,
  [BuffKind.DebtCollector]: BuffCadence.Event,
  [BuffKind.Hoarder]: BuffCadence.Threshold,
  [BuffKind.Unbloodied]: BuffCadence.Threshold,
  [BuffKind.Miser]: BuffCadence.Threshold,
  [BuffKind.Cornered]: BuffCadence.Threshold,
  [BuffKind.Keepsake]: BuffCadence.Terminal,
  [BuffKind.Ward]: BuffCadence.Activated,
  [BuffKind.Puppeteer]: BuffCadence.Activated,
  [BuffKind.SecondThoughts]: BuffCadence.Activated,
  [BuffKind.Foresight]: BuffCadence.Activated,
  [BuffKind.Spyglass]: BuffCadence.Activated,
  // DLR-110 — the player pulls Shield; it has no trigger.
  [BuffKind.Shield]: BuffCadence.Activated,
  [BuffKind.SkullHelmet]: BuffCadence.Event,
  [BuffKind.SkullTether]: BuffCadence.Event,
  // DLR-162 — the player spends it; it has no trigger, exactly like Cheat.
  [BuffKind.Wildcard]: BuffCadence.Activated,
  // DLR-167 — the player presses it; it has no trigger, exactly like Cheat.
  [BuffKind.Curse]: BuffCadence.Activated,
}

/**
 * DLR-135 — NOTHING MINTS THESE ANY MORE. The run's opening pile is four real bronze cards drawn
 * from `BUFF_TEMPLATES` (`startingPile.ts`); DLR-105's placeholder factory is gone.
 *
 * They are KEPT, deliberately, as the codebase's canonical UNPRICED buff — the fixture five guard
 * suites fire against by name (`buffActivation.priced.test.ts`, `buffCosts.test.ts:198`,
 * `consumables.test.ts`, `ErrorBoundary.test.tsx`'s literal error string, and
 * `sim/reachability.ts`'s set exclusions). The `Unassigned` trap was hit three times during V5;
 * this removes its CAUSE while leaving the GUARD that catches the whole class intact. Stated once
 * here so no guard suite invents its own version of the literal.
 */
export const UNASSIGNED_BUFF_CONDITION: BuffCondition = { kind: 'unassigned' }
export const UNASSIGNED_BUFF_REWARD: BuffReward = { axis: BuffRewardAxis.Magnitude, value: 0 }

/**
 * DLR-107 — the condition for a buff the PLAYER pulls rather than one that fires on a trigger.
 * Cheat is activated deliberately, per design doc §1 ("held in the pile and sprung in response to
 * what's actually happening"), so it has no trigger to describe. Shared by every activated card
 * rather than one per card: there is one thing being said here, not several.
 */
export const ACTIVATED_BUFF_CONDITION: BuffCondition = { kind: 'activated' }
