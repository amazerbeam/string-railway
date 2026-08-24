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
import { cheatBuff, timebombBuff } from './buffCatalog'

/**
 * DLR-112 — the 71-template v1 condition-card pool, GENERATED at module load from two small
 * crossing tables rather than hand-listed. `.docs/design/Balatro-Forbidden-Solitaire/
 * v1-buff-card-list.md` → *Condition templates* is the authoritative table this file transcribes;
 * cited, never re-derived.
 *
 * DLR-132 — the shape problem this docblock used to state as open is now CLOSED for Cheat and
 * Timebomb: `BuffTemplate` is a discriminated union tagged `form`, `ConditionBuffTemplate` keeps
 * this file's 71 generated templates exactly as they were, and `ActivatedBuffTemplate` carries the
 * two activated cards (`ACTIVATED_TEMPLATES`, appended below) — 73 templates total. The five
 * consumables (Ward, Second Thoughts, Puppeteer, Foresight, Spyglass) are DELIBERATELY STILL
 * ABSENT: the `form` tag is exactly what makes them trivially addable — five more
 * `ActivatedBuffTemplate` literals, one more `mintFromTemplate` branch each, and ten unchosen slot
 * weights — but that is DLR-120's scope boundary and a separate decision with its own weights, not
 * this ticket's.
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
  readonly kind: BuffConditionKind
  readonly axis: BuffCostAxis
  /** Present only on the suit- or rank-parameterised families. */
  readonly target?: BuffTarget
}

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
function templatesForTemplateFamily(family: TemplateFamily): readonly ConditionBuffTemplate[] {
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
): ConditionBuffTemplate {
  const id = paramLabel === undefined ? `${kind}:${axis}` : `${kind}:${paramLabel}:${axis}`
  return target === undefined
    ? { form: 'condition', id, kind, axis }
    : { form: 'condition', id, kind, axis, target }
}

/** The v1 pool: 73 templates — the 71 GENERATED condition templates plus the 2 activated ones
 *  (`ACTIVATED_TEMPLATES`). The 5 consumable templates (Ward and its four siblings) are still
 *  absent — see this file's own docblock above for why that is a scope boundary, not a gap. */
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
