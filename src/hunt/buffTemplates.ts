import {
  BuffCadence,
  BUFF_CADENCE,
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  BuffTier,
  buffTargetSuitOf,
  type Buff,
  type BuffCondition,
  type BuffId,
  type BuffTarget,
} from './buffs'
import type { BuffMintedAxis } from './buffCosts'
import { cheatBuff, timebombBuff } from './buffCatalog'

/**
 * DLR-112 — originally the 71-template v1 condition-card pool, GENERATED at module load from two
 * small crossing tables rather than hand-listed. `.docs/design/Balatro-Forbidden-Solitaire/
 * v1-buff-card-list.md` → *Condition templates* is the authoritative table this file transcribed.
 *
 * DLR-132 added `ActivatedBuffTemplate` and its two cards (Cheat, Timebomb), taking the pool to 73.
 *
 * DLR-145 PARED the pool to 13 — 6 Taker + 3 Feeder + 2 Sidestep condition templates plus the same
 * 2 activated ones — so that card scarcity, not a refilling action-points pool, is the limit on how
 * hard a hand can be pushed. `TEMPLATE_FAMILIES` now lists only these three families. The eight cut
 * families (MarkOfRank, Glutton, Hoarder, Unbloodied, DebtCollector, Keepsake, Miser, Cornered) are
 * NOT deleted from `BuffKind`, `CONDITION_MODIFIER`, `buffFires` or `BUFF_CADENCE` — they simply
 * have no row here any more, exactly as DLR-116 left Cheat, Timebomb, Blast Guard and Whetstone
 * priced but off the shop shelf. Restoring one is a `TEMPLATE_FAMILIES` row, not a design from
 * scratch. `MintableConditionKind` and `MintableRewardAxis` (below) are what make a cut family or a
 * cut axis UNCONSTRUCTIBLE rather than merely unweighted — narrowing the template's own types,
 * not zeroing a slot weight, is what the plan calls out as the actual mechanism.
 *
 * DLR-150 RESTORES Feeder's Momentum row, taking the pool to 16 — 6 Taker + 6 Feeder + 2 Sidestep
 * condition templates plus the same 2 activated ones. Feeder was cut to Blade-only by DLR-145
 * because a multiplier raised on a Loss trick was wiped by that same trick's reset before it could
 * ever be spent; the feeder carry (`src/hunt/buffAccrual.ts`'s `BuffCarry`) removes exactly that
 * failure mode by diverting a Loss-fired Feeder's reward out of the hand before the reset runs, so
 * Momentum is safe to mint again. The eight cut families and the two cut reward axes (Purse, Second
 * Wind) stay unreachable — this ticket restores one row, not the pruning itself.
 *
 * DLR-161 ADDS two more condition families, Skull Helmet and Skull Tether, taking the pool to 18 —
 * the same 14 generated condition templates as DLR-150 plus 2 new one-template families (no suit
 * parameter) plus the same 2 activated ones. Their reward axis is `Protection`, the first reward
 * that is neither damage nor multiplier: the card keeps one of the streak's two figures through a
 * trick that hurt the player rather than paying into a per-hand pool. This restores the
 * "eat a skull with this card" condition for these two families ONLY — `BuffKind.Glutton` and the
 * other seven cut families are NOT restored and gain no row here.
 *
 * The five consumables (Ward, Second Thoughts, Puppeteer, Foresight, Spyglass) are still absent —
 * DLR-120's scope boundary, unrelated to this pruning.
 */

/** One distinct card template — a (family, reward axis, optional parameter) crossing. Carries NO
 *  tier: the tier is decided at draw time by the reel-match rules. Carries NO `apCost`: that stays
 *  a derived lookup through `apCostOf`, per the coordinator's standing decision. Today's shape,
 *  unchanged in every field, now tagged `form: 'condition'` (DLR-132). */
export interface ConditionBuffTemplate {
  readonly form: 'condition'
  /** Stable identifier, `<kind>[:<param>]:<axis>` — e.g. `taker:bells:magnitude`. PERSISTED as
   *  of DLR-113: the Vault stores boosts and grants by this id, so the FORMAT is frozen and a
   *  renamed `BuffKind` or `BuffRewardAxis` value orphans saved entries. `reconcileVault` drops
   *  an id it cannot resolve rather than corrupting anything, but the currency spent on it is
   *  gone — a future rename must ship a migration. (Was documented "NOT persisted" by DLR-112;
   *  DLR-113 overturned that deliberately, see that ticket's plan.md → Approach.) */
  readonly id: string
  readonly kind: MintableConditionKind
  readonly axis: MintableRewardAxis
  /** Present only on the suit-parameterised families. */
  readonly target?: BuffTarget
}

/** DLR-145 AC5 — the three condition families a template can still mint. The other eight stay
 *  DECLARED on `BuffKind`, keep their `CONDITION_MODIFIER` price, their `buffFires` case and their
 *  `BUFF_CADENCE` row; they are simply unreachable, exactly as DLR-116 left Cheat, Timebomb, Blast
 *  Guard and Whetstone priced but off the shelf. Restoring one is a row in `TEMPLATE_FAMILIES`. */
export type MintableConditionKind =
  | typeof BuffKind.Taker
  | typeof BuffKind.Feeder
  | typeof BuffKind.Sidestep
  // DLR-161 — the two protective families. This is the widening the ticket names as the
  // mechanism; the other eight cut families stay unconstructible and Glutton in particular is
  // NOT restored — these two carry their own `buffFires` cases (AC2).
  | typeof BuffKind.SkullHelmet
  | typeof BuffKind.SkullTether

/** DLR-145 AC5 — Blade and Momentum. `coins` and `apRefund` stay on `BuffRewardAxis` and keep
 *  their `REWARD_BASE` and `REWARD_TIER_VALUE` ladders; narrowing HERE is what makes a
 *  coins-paying card unconstructible rather than merely unweighted. DLR-161 adds `Protection`. */
export type MintableRewardAxis =
  | typeof BuffRewardAxis.Magnitude
  | typeof BuffRewardAxis.Multiplier
  | typeof BuffRewardAxis.Protection

/** The two kinds an ACTIVATED template can mint. A closed pair, not `BuffConsumableKind`: the
 *  five consumable items and Shield have no template and no slot weight yet (DLR-132 scope). */
export type BuffActivatedTemplateKind = typeof BuffKind.Cheat | typeof BuffKind.Timebomb

/** An activated card's template. Carries NO axis and NO condition family — that is exactly the
 *  shape problem DLR-120 named, and the `form` tag is the answer to it. Its reward axis and value
 *  come from `buffCatalog.ts`'s minting functions (`cheatBuff` / `timebombBuff`) at draw time, not
 *  from anything stored here. PERSISTED as of DLR-113 exactly like `ConditionBuffTemplate.id`: the
 *  Vault stores grants by this id, so `'cheat'` and `'timebomb'` are frozen the moment they ship. */
export interface ActivatedBuffTemplate {
  readonly form: 'activated'
  readonly id: string
  readonly kind: BuffActivatedTemplateKind
}

/** Today's `BuffTemplate` interface, now a discriminated union on `form` rather than a single
 *  shape with an optional field — an optional `axis` would push an invisible `?? fallback` into
 *  `templateWeightFor` and `mintFromTemplate`, which is the "plausible zero that type-checks" this
 *  module already throws about. The tag makes every consumer's branch mandatory at compile time. */
export type BuffTemplate = ConditionBuffTemplate | ActivatedBuffTemplate

/** The two activated templates. Ids are bare kind strings — no axis segment, because there is no
 *  axis — and they are PERSISTED by the Vault, so the format is frozen exactly as DLR-113 froze
 *  `<kind>[:<param>]:<axis>` for a condition template's id. */
export const ACTIVATED_TEMPLATES: readonly ActivatedBuffTemplate[] = [
  { form: 'activated', id: 'cheat', kind: BuffKind.Cheat },
  { form: 'activated', id: 'timebomb', kind: BuffKind.Timebomb },
]

const BLADE_AND_MOMENTUM: readonly MintableRewardAxis[] = [
  BuffRewardAxis.Magnitude,
  BuffRewardAxis.Multiplier,
]

/** How one family fans out. `param` names the axis the family is parameterised over — DLR-111
 *  finding 3's suit-carrying families — and `undefined` means one generic template. DLR-145
 *  dropped `'rank'`: Mark of Rank was the only rank-carrying family and it is no longer minted. */
interface TemplateFamily {
  readonly kind: MintableConditionKind
  readonly axes: readonly MintableRewardAxis[]
  readonly param?: 'suit'
}

const PROTECTION_ONLY: readonly MintableRewardAxis[] = [BuffRewardAxis.Protection]

const TEMPLATE_FAMILIES: readonly TemplateFamily[] = [
  { kind: BuffKind.Taker, axes: BLADE_AND_MOMENTUM, param: 'suit' },
  // DLR-150 AC5 — Momentum restored. Feeder was Blade-only because `buffFires` reads it as
  // `!ctx.playerWon`, covering both a clean loss and a dodge, and a multiplier raised on the
  // loss half was wiped by that loss's own reset. The carry removes exactly that: on the loss
  // half the bonus leaves the hand before the reset, and the dodge half never had the problem.
  { kind: BuffKind.Feeder, axes: BLADE_AND_MOMENTUM, param: 'suit' },
  { kind: BuffKind.Sidestep, axes: BLADE_AND_MOMENTUM },
  // DLR-161 — no `param`: neither card targets a suit. One template each, three tiers apiece
  // decided at draw time by the reel-match rules, exactly like Sidestep. Persisted ids:
  // `skullHelmet:protection`, `skullTether:protection`, composed by `templateIdFor`.
  { kind: BuffKind.SkullHelmet, axes: PROTECTION_ONLY },
  { kind: BuffKind.SkullTether, axes: PROTECTION_ONLY },
]

const ALL_TARGET_SUITS: readonly BuffTargetSuit[] = [
  BuffTargetSuit.Bells,
  BuffTargetSuit.Keys,
  BuffTargetSuit.Moons,
]

/** One family's templates, crossing its axes with its parameter (suit, or none). */
function templatesForTemplateFamily(family: TemplateFamily): readonly ConditionBuffTemplate[] {
  if (family.param === 'suit') {
    return ALL_TARGET_SUITS.flatMap((suit) =>
      family.axes.map((axis) => makeTemplate(family.kind, axis, { suit }, suit)),
    )
  }
  return family.axes.map((axis) => makeTemplate(family.kind, axis, undefined, undefined))
}

/** The persisted id grammar `<kind>[:<param>]:<axis>`, written ONCE. `makeTemplate` composes an
 *  id with it and `templateIdForBuff` recomposes the same id from a minted card; a second copy of
 *  this expression is how the two would silently drift apart. */
function templateIdFor(
  kind: BuffKind,
  axis: string | null,
  paramLabel: string | undefined,
): string {
  const head = paramLabel === undefined ? String(kind) : `${kind}:${paramLabel}`
  return axis === null ? head : `${head}:${axis}`
}

function makeTemplate(
  kind: MintableConditionKind,
  axis: MintableRewardAxis,
  target: BuffTarget | undefined,
  paramLabel: string | undefined,
): ConditionBuffTemplate {
  const id = templateIdFor(kind, axis, paramLabel)
  return target === undefined
    ? { form: 'condition', id, kind, axis }
    : { form: 'condition', id, kind, axis, target }
}

/** DLR-161's widened pool: 18 templates — 16 GENERATED condition templates (6 Taker + 6 Feeder +
 *  2 Sidestep + 1 Skull Helmet + 1 Skull Tether) plus the 2 activated ones (`ACTIVATED_TEMPLATES`).
 *  The 5 consumable templates (Ward and its four siblings) are still absent — see this file's own
 *  docblock above for why that is a scope boundary, not a gap. */
export const BUFF_TEMPLATES: readonly BuffTemplate[] = [
  ...TEMPLATE_FAMILIES.flatMap(templatesForTemplateFamily),
  ...ACTIVATED_TEMPLATES,
]
export const BUFF_TEMPLATE_COUNT: number = BUFF_TEMPLATES.length

export function templatesForFamily(kind: BuffTemplate['kind']): readonly BuffTemplate[] {
  return BUFF_TEMPLATES.filter((template) => template.kind === kind)
}

/** One bought card, as coordinates rather than as a `Buff`. Declared HERE and not in
 *  `src/vault/`: hunt owns how a template becomes a card, and declaring it in vault would force
 *  the reverse import edge. DLR-113 persists this pair — and deliberately nothing else — so no
 *  domain type is ever on disk and `Buff` stays free to widen (DLR-107's note lands nowhere). */
export interface TemplateGrant {
  readonly templateId: string
  readonly tier: BuffTier
}

/** `BUFF_TEMPLATES` keyed by id, derived ONCE at module load in the style `slotWeights.ts`'s
 *  `FAMILY_AXIS_TOTAL` already uses, so a lookup never rescans the pool. */
const TEMPLATES_BY_ID: ReadonlyMap<string, BuffTemplate> = new Map(
  BUFF_TEMPLATES.map((template) => [template.id, template]),
)

/** `undefined` for an id this build has no template for — which is exactly what DLR-113's
 *  `reconcileVault` tests a stale save against. */
export function templateById(id: string): BuffTemplate | undefined {
  return TEMPLATES_BY_ID.get(id)
}

/** DLR-159 — which template minted this card, as an id. An ACTIVATED card's id is the bare kind
 *  (`ACTIVATED_TEMPLATES` above), a condition card's is the `<kind>[:<suit>]:<axis>` grammar
 *  `templateIdFor` writes for the generator — so this recomposes rather than inventing a format.
 *  Reads `buff.reward.axis` and `condition.target?.suit`, the only two fields that vary within a
 *  family. */
export function templateIdForBuff(buff: Buff): string {
  if (BUFF_CADENCE[buff.kind] === BuffCadence.Activated)
    return templateIdFor(buff.kind, null, undefined)
  const suit = buffTargetSuitOf(buff)
  return templateIdFor(buff.kind, buff.reward.axis, suit ?? undefined)
}

/** The template itself, or `undefined` when this build no longer has one — exactly what
 *  `reconcileVault` already tests a stale id against. A caller must handle `undefined` rather
 *  than assert: a pruned family is not a programming error. */
export function templateForBuff(buff: Buff): BuffTemplate | undefined {
  return templateById(templateIdForBuff(buff))
}

/** One `Buff` per grant, consecutive ids from `firstId`, mirroring `mintPullAwards`. A grant
 *  naming an id this build no longer has is SKIPPED rather than throwing: a save written by an
 *  older build is not a programming error, and dropping the one dead card is better than
 *  refusing to start the run. Ids stay consecutive over what was actually minted. */
export function mintGrants(grants: readonly TemplateGrant[], firstId: BuffId): readonly Buff[] {
  const minted: Buff[] = []
  for (const grant of grants) {
    const template = templateById(grant.templateId)
    if (template === undefined) continue
    minted.push(mintFromTemplate(template, grant.tier, firstId + minted.length))
  }
  return minted
}

/** DLR-111 → *Reward master tier list*, transcribed. Blade 1/3/5, Purse 2/5/10, Second Wind 1/2/3,
 *  Momentum 2/3/5. This is the reward VALUE ladder — distinct from `buffCosts.ts`'s `REWARD_BASE`,
 *  which is the AP COST base. UNIT: per axis (damage, coins, action points, multiplier points). */
export const REWARD_TIER_VALUE: Readonly<
  Record<BuffMintedAxis, Readonly<Record<BuffTier, number>>>
> = {
  [BuffRewardAxis.Magnitude]: { [BuffTier.Bronze]: 1, [BuffTier.Silver]: 3, [BuffTier.Gold]: 5 },
  [BuffRewardAxis.Coins]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 5, [BuffTier.Gold]: 10 },
  [BuffRewardAxis.ApRefund]: { [BuffTier.Bronze]: 1, [BuffTier.Silver]: 2, [BuffTier.Gold]: 3 },
  [BuffRewardAxis.Multiplier]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 3, [BuffTier.Gold]: 5 },
  // DLR-161 AC6, TRANSCRIBED, not chosen: the figure added to the SURVIVING streak figure.
  // Zero below gold because protection at bronze and silver is the survival itself.
  // UNIT: damage for the Helmet's total, tricks for the Tether's roll.
  [BuffRewardAxis.Protection]: { [BuffTier.Bronze]: 0, [BuffTier.Silver]: 0, [BuffTier.Gold]: 1 },
}

/** The four families whose CONDITION is parameterised by tier rather than by suit or rank —
 *  Hoarder N (2/3/4 bank), Unbloodied N (2/3/4 tricks), Miser N (5/10/20 coins), Cornered N%
 *  (60/45/33 percent of PLAYER_START_HEALTH). A `(family, tier)` lookup, NOT a field on
 *  `BuffCondition` — the same shape decision already taken for `apCost`. */
export type BuffThresholdFamily =
  | typeof BuffKind.Hoarder
  | typeof BuffKind.Unbloodied
  | typeof BuffKind.Miser
  | typeof BuffKind.Cornered

export const CONDITION_THRESHOLD: Readonly<
  Record<BuffThresholdFamily, Readonly<Record<BuffTier, number>>>
> = {
  [BuffKind.Hoarder]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 3, [BuffTier.Gold]: 4 },
  [BuffKind.Unbloodied]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 3, [BuffTier.Gold]: 4 },
  [BuffKind.Miser]: { [BuffTier.Bronze]: 5, [BuffTier.Silver]: 10, [BuffTier.Gold]: 20 },
  [BuffKind.Cornered]: { [BuffTier.Bronze]: 60, [BuffTier.Silver]: 45, [BuffTier.Gold]: 33 },
}

const THRESHOLD_FAMILY_KINDS: ReadonlySet<BuffKind> = new Set([
  BuffKind.Hoarder,
  BuffKind.Unbloodied,
  BuffKind.Miser,
  BuffKind.Cornered,
])

function isThresholdFamily(kind: BuffKind): kind is BuffThresholdFamily {
  return THRESHOLD_FAMILY_KINDS.has(kind)
}

/** Mint an ordinary `Buff` from a template at `tier`. `id` is the CALLER's, from
 *  `RunState.nextBuffId` — this module never invents one and never calls `Math.random()`.
 *  Throws `RangeError` on a CONDITION template whose axis has no reward ladder rather than minting
 *  a zero-value card — the `cheatDurationTricksOf` discipline: a plausible-looking zero is the bug
 *  that type-checks. An ACTIVATED template cannot reach that throw — it has no axis to be missing
 *  a ladder for — and must not gain a softened version of it. */
export function mintFromTemplate(template: BuffTemplate, tier: BuffTier, id: BuffId): Buff {
  if (template.form === 'activated') {
    // DLR-132 — DLR-107's `cheatBuff`/`timebombBuff` ARE the minting path. Reproducing their
    // expressions here would give one card two answers, which is the discipline
    // `cheatDurationTricksOf` sets three files away.
    return template.kind === BuffKind.Cheat ? cheatBuff(tier, id) : timebombBuff(tier, id)
  }
  const ladder = REWARD_TIER_VALUE[template.axis]
  if (ladder === undefined) {
    throw new RangeError(
      `Template ${template.id} pays on axis ${template.axis}, which has no REWARD_TIER_VALUE ladder`,
    )
  }
  const condition: BuffCondition =
    template.target === undefined
      ? { kind: template.kind }
      : { kind: template.kind, target: template.target }
  return {
    id,
    kind: template.kind,
    tier,
    condition,
    reward: { axis: template.axis, value: ladder[tier] },
  }
}

/** The tier-scaled condition threshold for a threshold-family buff, or `null` for every other
 *  family. Reads `(kind, tier)`, so one buff has exactly one answer — a real answer, matching
 *  `categoryOf`'s handling of the Heal, not a missing one. */
export function conditionThresholdOf(buff: Buff): number | null {
  if (!isThresholdFamily(buff.kind)) return null
  return CONDITION_THRESHOLD[buff.kind][buff.tier]
}
