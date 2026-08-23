import {
  BUFF_TARGET_RANK_MAX,
  BUFF_TARGET_RANK_MIN,
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  BuffTier,
  type Buff,
  type BuffCondition,
  type BuffId,
  type BuffTarget,
} from './buffs'
import type { BuffConditionKind, BuffCostAxis } from './buffCosts'

/**
 * DLR-112 — the 71-template v1 condition-card pool, GENERATED at module load from two small
 * crossing tables rather than hand-listed. `.docs/design/Balatro-Forbidden-Solitaire/
 * v1-buff-card-list.md` → *Condition templates* is the authoritative table this file transcribes;
 * cited, never re-derived. The 7 consumable/activated templates are deliberately absent — AC6 is
 * DLR-126's to resolve and DLR-126 has not landed.
 */

/** One distinct card template — a (family, reward axis, optional parameter) crossing. Carries NO
 *  tier: the tier is decided at draw time by the reel-match rules. Carries NO `apCost`: that stays
 *  a derived lookup through `apCostOf`, per the coordinator's standing decision. */
export interface BuffTemplate {
  /** Stable identifier, `<kind>[:<param>]:<axis>` — e.g. `taker:bells:magnitude`. NOT persisted. */
  readonly id: string
  readonly kind: BuffConditionKind
  readonly axis: BuffCostAxis
  /** Present only on the suit- or rank-parameterised families. */
  readonly target?: BuffTarget
}

const ALL_FOUR_AXES: readonly BuffCostAxis[] = [
  BuffRewardAxis.Magnitude,
  BuffRewardAxis.Coins,
  BuffRewardAxis.ApRefund,
  BuffRewardAxis.Multiplier,
]
const BLADE_AND_MOMENTUM: readonly BuffCostAxis[] = [
  BuffRewardAxis.Magnitude,
  BuffRewardAxis.Multiplier,
]

/** How one family fans out. `param` names the axis the family is parameterised over — DLR-111
 *  finding 3's suit- and rank-carrying families — and `undefined` means one generic template. */
interface TemplateFamily {
  readonly kind: BuffConditionKind
  readonly axes: readonly BuffCostAxis[]
  readonly param?: 'suit' | 'rank'
}

const TEMPLATE_FAMILIES: readonly TemplateFamily[] = [
  { kind: BuffKind.Taker, axes: ALL_FOUR_AXES, param: 'suit' },
  { kind: BuffKind.Feeder, axes: ALL_FOUR_AXES, param: 'suit' },
  { kind: BuffKind.MarkOfRank, axes: BLADE_AND_MOMENTUM, param: 'rank' },
  { kind: BuffKind.Sidestep, axes: BLADE_AND_MOMENTUM },
  { kind: BuffKind.Glutton, axes: ALL_FOUR_AXES },
  { kind: BuffKind.Hoarder, axes: ALL_FOUR_AXES },
  { kind: BuffKind.Unbloodied, axes: ALL_FOUR_AXES },
  { kind: BuffKind.DebtCollector, axes: ALL_FOUR_AXES },
  { kind: BuffKind.Keepsake, axes: [BuffRewardAxis.Coins], param: 'suit' },
  { kind: BuffKind.Miser, axes: BLADE_AND_MOMENTUM },
  { kind: BuffKind.Cornered, axes: BLADE_AND_MOMENTUM },
]

const ALL_TARGET_SUITS: readonly BuffTargetSuit[] = [
  BuffTargetSuit.Bells,
  BuffTargetSuit.Keys,
  BuffTargetSuit.Moons,
]

/** `BUFF_TARGET_RANK_MIN..BUFF_TARGET_RANK_MAX` inclusive — the eleven ranks Mark of the R fans
 *  out over (DLR-111 finding 3). */
const ALL_TARGET_RANKS: readonly number[] = Array.from(
  { length: BUFF_TARGET_RANK_MAX - BUFF_TARGET_RANK_MIN + 1 },
  (_, i) => BUFF_TARGET_RANK_MIN + i,
)

/** One family's templates, crossing its axes with its parameter (suit, rank, or none). */
function templatesForTemplateFamily(family: TemplateFamily): readonly BuffTemplate[] {
  if (family.param === 'suit') {
    return ALL_TARGET_SUITS.flatMap((suit) =>
      family.axes.map((axis) => makeTemplate(family.kind, axis, { suit }, suit)),
    )
  }
  if (family.param === 'rank') {
    return ALL_TARGET_RANKS.flatMap((rank) =>
      family.axes.map((axis) => makeTemplate(family.kind, axis, { rank }, String(rank))),
    )
  }
  return family.axes.map((axis) => makeTemplate(family.kind, axis, undefined, undefined))
}

function makeTemplate(
  kind: BuffConditionKind,
  axis: BuffCostAxis,
  target: BuffTarget | undefined,
  paramLabel: string | undefined,
): BuffTemplate {
  const id = paramLabel === undefined ? `${kind}:${axis}` : `${kind}:${paramLabel}:${axis}`
  return target === undefined ? { id, kind, axis } : { id, kind, axis, target }
}

/** The v1 pool: exactly 71 condition templates. GENERATED from the crossing tables at module load,
 *  never hand-listed. The 7 consumable/activated templates are deliberately absent — AC6 is
 *  DLR-126's to resolve and DLR-126 has not landed. */
export const BUFF_TEMPLATES: readonly BuffTemplate[] = TEMPLATE_FAMILIES.flatMap(
  templatesForTemplateFamily,
)
export const BUFF_TEMPLATE_COUNT: number = BUFF_TEMPLATES.length

export function templatesForFamily(kind: BuffConditionKind): readonly BuffTemplate[] {
  return BUFF_TEMPLATES.filter((template) => template.kind === kind)
}

/** DLR-111 → *Reward master tier list*, transcribed. Blade 1/3/5, Purse 2/5/10, Second Wind 1/2/3,
 *  Momentum 2/3/5. This is the reward VALUE ladder — distinct from `buffCosts.ts`'s `REWARD_BASE`,
 *  which is the AP COST base. UNIT: per axis (damage, coins, action points, multiplier points). */
export const REWARD_TIER_VALUE: Readonly<Record<BuffCostAxis, Readonly<Record<BuffTier, number>>>> =
  {
    [BuffRewardAxis.Magnitude]: { [BuffTier.Bronze]: 1, [BuffTier.Silver]: 3, [BuffTier.Gold]: 5 },
    [BuffRewardAxis.Coins]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 5, [BuffTier.Gold]: 10 },
    [BuffRewardAxis.ApRefund]: { [BuffTier.Bronze]: 1, [BuffTier.Silver]: 2, [BuffTier.Gold]: 3 },
    [BuffRewardAxis.Multiplier]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 3, [BuffTier.Gold]: 5 },
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
 *  Throws `RangeError` on a template whose axis has no reward ladder rather than minting a
 *  zero-value card — the `cheatDurationTricksOf` discipline: a plausible-looking zero is the bug
 *  that type-checks. */
export function mintFromTemplate(template: BuffTemplate, tier: BuffTier, id: BuffId): Buff {
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
