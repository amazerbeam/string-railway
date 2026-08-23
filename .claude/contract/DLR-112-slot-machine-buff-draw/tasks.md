# Tasks: Slot-machine buff draw and templated buff pool

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-23

> **Gate note:** `plan.md` was **not developer-confirmed**. This contract runs under the unattended
> 2026-08-23 sprint run, which auto-approves the plan gate and takes each plan default. Every
> default is logged in `.claude/sprint-runs/2026-08-23-sprint/log.md`. **No mockup was called for**
> — the file map below contains no `.tsx` and this ticket renders nothing.

**Goal:** Turn DLR-111's authored v1 card list into a generated 71-template pool and build the
seeded, deterministic slot machine that draws an 8-template reel strip, spins three reels, and
resolves the match pattern into bronze / silver / gold `Buff` awards at a stated pull cost.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/hunt/seededRng.ts` — mulberry32 PRNG + `mixSeed`; the only randomness source in `src/hunt/`
- `src/hunt/slotConfig.ts` — machine identities and the four slot tunables
- `src/hunt/buffTemplates.ts` — `BuffTemplate`, reward ladder, condition thresholds, the 71-template pool, `mintFromTemplate`
- `src/hunt/slotWeights.ts` — per-machine family/axis weight tables and the generic weighted draw
- `src/hunt/slotMachine.ts` — reel-strip draw, spin, match resolution, award minting, pull cost
- `src/hunt/__tests__/seededRng.test.ts`
- `src/hunt/__tests__/buffTemplates.test.ts`
- `src/hunt/__tests__/slotWeights.test.ts`
- `src/hunt/__tests__/slotMachine.test.ts`

**Modified:**
- `src/hunt/index.ts` — additive re-exports for every new public name; nothing removed or reordered

**Deleted:** (none)

**Developer decides or observes:**
- `src/hunt/slotWeights.ts` → `SLOT_FAMILY_WEIGHTS` (11 entries × 2 machines) — **agent-chosen under
  the sprint-run tuning override, never played.** They set what share of a reel strip each condition
  family occupies. Trades reel legibility against pool coverage.
- `src/hunt/slotWeights.ts` → `SLOT_AXIS_WEIGHTS` (4 entries × 2 machines) — **agent-chosen.** They
  set which reward a machine is likely to offer, and are what makes Strongbox coin-facing and
  Skirmisher damage-facing.
- **Family-weighted vs. flat uniform draw.** Flat is a legitimate v1 and is a one-line change (set
  every weight to `1`). Weighted is shipped because `Mark of the R` is 22 of 71 templates and a flat
  strip would be ~31% rank-conditioned on fan-out alone.
- **Keepsake's future.** Shipped at the floor weight (`1`) on both machines because
  `v1-buff-card-list.md` flags all three Keepsake templates as possibly unfireable
  (`HAND_SIZE = 6`, six tricks, empty hand at hand's end). Reword the condition, redefine the
  end-of-hand instant, or delete the three rows — the document says this is not an agent's call.
- **Miser's future.** Weighted below the other threshold families on Strongbox for DLR-111's stated
  "Miser fights the shop" reason. Flagged there for deletion at the developer's discretion.
- **Machine names.** `Skirmisher` / `Strongbox` are copy placeholders, free to rename — nothing
  persists a `SlotMachineId`.
- **Reroll semantics.** A paid pull re-spins the same strip; it does not redraw the 8 symbols.
  Not stated in the ticket; the developer's to reverse.
- **Reroll cap.** There is none — the coin balance is the cap.
- **A browser would check nothing in this diff.** No surface renders. The real judgement is a
  balance simulation (DLR-130) and a play session; both are what the seeded RNG exists to enable.

---

## Phase 1 — Deterministic randomness

The foundation everything else threads. A safe boundary because it is one self-contained file with
no importer yet: it type-checks and tests on its own, and nothing in `src/` changes behaviour.

### Task 1: Add the seeded PRNG in `src/hunt/seededRng.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/seededRng.ts`
- Test: `src/hunt/__tests__/seededRng.test.ts`

- [x] **Step 1: Write the failing test for seed reproducibility and seed independence**

```ts
import { describe, expect, it } from 'vitest'
import { createSeededRng, mixSeed } from '../seededRng'

describe('createSeededRng', () => {
  it('yields the same sequence for the same seed', () => {
    const a = createSeededRng(12345)
    const b = createSeededRng(12345)
    expect(Array.from({ length: 20 }, a)).toEqual(Array.from({ length: 20 }, b))
  })

  it('yields a different sequence for a different seed', () => {
    const a = createSeededRng(1)
    const b = createSeededRng(2)
    expect(Array.from({ length: 20 }, a)).not.toEqual(Array.from({ length: 20 }, b))
  })

  it('stays inside [0, 1)', () => {
    const rng = createSeededRng(99)
    for (let i = 0; i < 500; i++) {
      const value = rng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
      expect(Number.isFinite(value)).toBe(true)
    }
  })

  it('gives two generators independent state', () => {
    const a = createSeededRng(7)
    const b = createSeededRng(7)
    a()
    a()
    expect(b()).toEqual(createSeededRng(7)())
  })
})

describe('mixSeed', () => {
  it('is pure, order-sensitive, and always a non-negative 32-bit integer', () => {
    expect(mixSeed(1, 2, 3)).toEqual(mixSeed(1, 2, 3))
    expect(mixSeed(1, 2, 3)).not.toEqual(mixSeed(3, 2, 1))
    const seed = mixSeed(4, 0, 11)
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThan(2 ** 32)
  })
})
```

- [x] **Step 2: Run the spec, confirm it fails**

Run: `npx vitest run src/hunt/__tests__/seededRng.test.ts`
Expected: FAIL — `Cannot find module '../seededRng'`

- [x] **Step 3: Implement `createSeededRng` and `mixSeed`**

mulberry32, with the module docblock stating why this exists (determinism is a hard constraint for
DLR-130's headless balance simulator) and that `Math.random()` is barred from `src/hunt/`.

```ts
export type Rng = () => number

export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function mixSeed(...parts: readonly number[]): number {
  let hash = 0x811c9dc5
  for (const part of parts) {
    hash = Math.imul(hash ^ (part | 0), 0x01000193) >>> 0
    hash = (hash ^ (hash >>> 13)) >>> 0
  }
  return hash >>> 0
}
```

- [x] **Step 4: Re-run the spec and typecheck**

Run: `npx vitest run src/hunt/__tests__/seededRng.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0 with no errors.

---

## Phase 2 — The 71-template pool

Generates DLR-111's card list from crossing tables. A safe boundary because `buffTemplates.ts`
imports only `buffs.ts` / `buffCosts.ts`, both already on disk and unchanged, and no existing file
imports it yet.

### Task 2: Generate the condition-template pool in `src/hunt/buffTemplates.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/buffTemplates.ts`
- Test: `src/hunt/__tests__/buffTemplates.test.ts`

- [x] **Step 1: Write the failing test pinning the pool's exact composition**

The per-family counts are DLR-111's *Condition templates* table, transcribed. The test pins each
family individually, not just the total, so a table edit that drops one crossing and adds another
cannot pass.

```ts
import { describe, expect, it } from 'vitest'
import {
  BUFF_TEMPLATES,
  BUFF_TEMPLATE_COUNT,
  CONDITION_THRESHOLD,
  REWARD_TIER_VALUE,
  conditionThresholdOf,
  mintFromTemplate,
  templatesForFamily,
} from '../buffTemplates'
import { BuffKind, BuffRewardAxis, BuffTier } from '../buffs'
import { apCostOf, isConditionFamily } from '../buffCosts'

const EXPECTED_COUNTS: ReadonlyArray<readonly [string, number]> = [
  [BuffKind.Taker, 12],
  [BuffKind.Feeder, 12],
  [BuffKind.MarkOfRank, 22],
  [BuffKind.Sidestep, 2],
  [BuffKind.Glutton, 4],
  [BuffKind.Hoarder, 4],
  [BuffKind.Unbloodied, 4],
  [BuffKind.DebtCollector, 4],
  [BuffKind.Keepsake, 3],
  [BuffKind.Miser, 2],
  [BuffKind.Cornered, 2],
]

describe('BUFF_TEMPLATES', () => {
  it('holds exactly the 71 condition templates DLR-111 decided', () => {
    expect(BUFF_TEMPLATES).toHaveLength(71)
    expect(BUFF_TEMPLATE_COUNT).toBe(71)
  })

  it.each(EXPECTED_COUNTS)('crosses %s into %i templates', (kind, count) => {
    expect(templatesForFamily(kind as never)).toHaveLength(count)
  })

  it('gives every template a unique id', () => {
    expect(new Set(BUFF_TEMPLATES.map((t) => t.id)).size).toBe(BUFF_TEMPLATES.length)
  })

  it('holds no consumable or activated card — AC6 is DLR-126s', () => {
    for (const template of BUFF_TEMPLATES) {
      expect(isConditionFamily(template.kind)).toBe(true)
    }
  })

  it('parameterises exactly the 49 suit- or rank-carrying templates', () => {
    expect(BUFF_TEMPLATES.filter((t) => t.target !== undefined)).toHaveLength(12 + 12 + 22 + 3)
  })

  it('pays Keepsake on coins alone', () => {
    for (const template of templatesForFamily(BuffKind.Keepsake)) {
      expect(template.axis).toBe(BuffRewardAxis.Coins)
    }
  })
})

describe('REWARD_TIER_VALUE', () => {
  it('transcribes DLR-111s reward master tier list', () => {
    expect(REWARD_TIER_VALUE[BuffRewardAxis.Magnitude]).toEqual({ bronze: 1, silver: 3, gold: 5 })
    expect(REWARD_TIER_VALUE[BuffRewardAxis.Coins]).toEqual({ bronze: 2, silver: 5, gold: 10 })
    expect(REWARD_TIER_VALUE[BuffRewardAxis.ApRefund]).toEqual({ bronze: 1, silver: 2, gold: 3 })
    expect(REWARD_TIER_VALUE[BuffRewardAxis.Multiplier]).toEqual({ bronze: 2, silver: 3, gold: 5 })
  })
})

describe('mintFromTemplate', () => {
  it('mints a priceable Buff carrying the callers id and the tiers reward value', () => {
    const template = templatesForFamily(BuffKind.Taker)[0]
    const buff = mintFromTemplate(template, BuffTier.Silver, 42)
    expect(buff.id).toBe(42)
    expect(buff.kind).toBe(BuffKind.Taker)
    expect(buff.tier).toBe(BuffTier.Silver)
    expect(buff.condition.kind).toBe(BuffKind.Taker)
    expect(buff.reward.value).toBe(REWARD_TIER_VALUE[template.axis][BuffTier.Silver])
    expect(() => apCostOf(buff)).not.toThrow()
  })

  it('prices every template at every tier without throwing', () => {
    for (const template of BUFF_TEMPLATES) {
      for (const tier of [BuffTier.Bronze, BuffTier.Silver, BuffTier.Gold]) {
        const cost = apCostOf(mintFromTemplate(template, tier, 1))
        expect(cost).toBeGreaterThanOrEqual(1)
        expect(cost).toBeLessThanOrEqual(6)
      }
    }
  })

  it('carries the suit or rank onto the minted conditions target', () => {
    const mark = templatesForFamily(BuffKind.MarkOfRank).find((t) => t.target?.rank === 9)
    expect(mark).toBeDefined()
    expect(mintFromTemplate(mark!, BuffTier.Gold, 1).condition.target?.rank).toBe(9)
  })
})

describe('conditionThresholdOf', () => {
  it('reads the tier-parameterised threshold for a threshold family', () => {
    const hoarder = templatesForFamily(BuffKind.Hoarder)[0]
    expect(conditionThresholdOf(mintFromTemplate(hoarder, BuffTier.Gold, 1))).toBe(
      CONDITION_THRESHOLD[BuffKind.Hoarder][BuffTier.Gold],
    )
  })

  it('returns null — a real answer — for a family with no threshold', () => {
    const taker = templatesForFamily(BuffKind.Taker)[0]
    expect(conditionThresholdOf(mintFromTemplate(taker, BuffTier.Bronze, 1))).toBeNull()
  })
})
```

- [x] **Step 2: Run the spec, confirm it fails**

Run: `npx vitest run src/hunt/__tests__/buffTemplates.test.ts`
Expected: FAIL — `Cannot find module '../buffTemplates'`

- [x] **Step 3: Implement the crossing tables and the generated pool**

`BUFF_TEMPLATES` is built at module load from a family table plus the axis lists, never hand-listed.
Each entry states its parameter axis (`suit`, `rank`, or none) and the reward axes it crosses with.
Transcribe the reward ladder and the thresholds from `v1-buff-card-list.md`; cite the section, do
not restate its reasoning.

```ts
export interface BuffTemplate {
  readonly id: string
  readonly kind: BuffConditionKind
  readonly axis: BuffCostAxis
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
type TemplateFamily = {
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

export const REWARD_TIER_VALUE: Readonly<
  Record<BuffCostAxis, Readonly<Record<BuffTier, number>>>
> = {
  [BuffRewardAxis.Magnitude]: { bronze: 1, silver: 3, gold: 5 },
  [BuffRewardAxis.Coins]: { bronze: 2, silver: 5, gold: 10 },
  [BuffRewardAxis.ApRefund]: { bronze: 1, silver: 2, gold: 3 },
  [BuffRewardAxis.Multiplier]: { bronze: 2, silver: 3, gold: 5 },
}

export const CONDITION_THRESHOLD: Readonly<
  Record<BuffThresholdFamily, Readonly<Record<BuffTier, number>>>
> = {
  [BuffKind.Hoarder]: { bronze: 2, silver: 3, gold: 4 },
  [BuffKind.Unbloodied]: { bronze: 2, silver: 3, gold: 4 },
  [BuffKind.Miser]: { bronze: 5, silver: 10, gold: 20 },
  [BuffKind.Cornered]: { bronze: 60, silver: 45, gold: 33 },
}
```

`mintFromTemplate` throws `RangeError` on an axis with no ladder row rather than minting a
zero-value card, the `cheatDurationTricksOf` discipline. `conditionThresholdOf` returns `null` for
the seven non-threshold families — a real answer, the way `categoryOf` returns `null` for the Heal.

- [x] **Step 4: Re-run the spec and typecheck**

Run: `npx vitest run src/hunt/__tests__/buffTemplates.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

- [x] **Step 5: Confirm the file is inside the 400-line budget**

Run: `(Get-Content src\hunt\buffTemplates.ts).Count`
Expected: a number below 400. If it is not, split the crossing tables into their own file in this
task — never leave the breach for a later ticket.

---

## Phase 3 — Machine identities and the weighted draw

Adds the tunables and the weight model. A safe boundary because `slotConfig.ts` has no importer
outside `slotWeights.ts` and `slotWeights.ts` has none yet; both type-check standalone.

### Task 3: Add the slot tunables in `src/hunt/slotConfig.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/slotConfig.ts`
- Config: `src/hunt/slotConfig.ts` — the four new slot tunables. **Deliberately NOT `config.ts`**,
  which stands at 374 lines of its 400-line blocking budget; this is the split `apConfig.ts` and
  `skullWeights.ts` already made for the same reason.

- [x] **Step 1: Write the file**

Every constant carries a `UNIT:` comment and cites where its value came from. `REEL_POOL_SIZE`,
`SLOT_FREE_PULLS_PER_VISIT` and `SLOT_REROLL_PRICE` are **transcribed from DLR-112's AC3 and AC5**,
not chosen here — say so in the comment. `REEL_COUNT = 3` is implied by AC2's match rules.

```ts
export const SlotMachineId = {
  Skirmisher: 'skirmisher',
  Strongbox: 'strongbox',
} as const
export type SlotMachineId = (typeof SlotMachineId)[keyof typeof SlotMachineId]

/** THE statement of the machine roster — a screen maps this, it never lists machines itself,
 *  exactly as `SHOP_ITEMS` already does for the shop catalogue. */
export const SLOT_MACHINE_IDS: readonly SlotMachineId[] = [
  SlotMachineId.Skirmisher,
  SlotMachineId.Strongbox,
]

export const REEL_COUNT = 3
export const REEL_POOL_SIZE = 8
export const SLOT_FREE_PULLS_PER_VISIT = 1
export const SLOT_REROLL_PRICE: Coins = 1
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 4: Add the per-machine weights and the weighted draw in `src/hunt/slotWeights.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/slotWeights.ts`
- Test: `src/hunt/__tests__/slotWeights.test.ts`

- [x] **Step 1: Write the failing test for the normalisation invariant and the draw**

The load-bearing invariant is that **a family's share of the pool equals its family weight**,
independent of how many templates the family contains — that is the whole reason the weights exist.

```ts
import { describe, expect, it } from 'vitest'
import {
  SLOT_AXIS_WEIGHTS,
  SLOT_FAMILY_WEIGHTS,
  templateWeightFor,
  weightedDrawWithoutReplacement,
} from '../slotWeights'
import { BUFF_TEMPLATES, templatesForFamily } from '../buffTemplates'
import { SLOT_MACHINE_IDS, SlotMachineId } from '../slotConfig'
import { createSeededRng } from '../seededRng'
import { BuffKind } from '../buffs'

describe('templateWeightFor', () => {
  it.each(SLOT_MACHINE_IDS)('gives each family its stated share on %s', (machineId) => {
    for (const [kind, weight] of Object.entries(SLOT_FAMILY_WEIGHTS[machineId])) {
      const total = templatesForFamily(kind as never).reduce(
        (sum, t) => sum + templateWeightFor(machineId, t),
        0,
      )
      expect(total).toBeCloseTo(weight, 10)
    }
  })

  it.each(SLOT_MACHINE_IDS)('never produces a NaN or negative weight on %s', (machineId) => {
    for (const template of BUFF_TEMPLATES) {
      const weight = templateWeightFor(machineId, template)
      expect(Number.isFinite(weight)).toBe(true)
      expect(weight).toBeGreaterThanOrEqual(0)
    }
  })

  it('leans the two machines in opposite directions', () => {
    const eventFamilies = [BuffKind.Taker, BuffKind.Feeder, BuffKind.Glutton]
    const thresholdFamilies = [BuffKind.Hoarder, BuffKind.Unbloodied]
    const share = (machineId: SlotMachineId, families: readonly string[]) => {
      const all = Object.values(SLOT_FAMILY_WEIGHTS[machineId]).reduce((a, b) => a + b, 0)
      return families.reduce((sum, f) => sum + SLOT_FAMILY_WEIGHTS[machineId][f as never], 0) / all
    }
    expect(share(SlotMachineId.Skirmisher, eventFamilies)).toBeGreaterThan(
      share(SlotMachineId.Strongbox, eventFamilies),
    )
    expect(share(SlotMachineId.Strongbox, thresholdFamilies)).toBeGreaterThan(
      share(SlotMachineId.Skirmisher, thresholdFamilies),
    )
  })
})

describe('weightedDrawWithoutReplacement', () => {
  it('draws distinct items and consumes exactly one rng call per item', () => {
    let calls = 0
    const rng = createSeededRng(5)
    const counted = () => {
      calls++
      return rng()
    }
    const drawn = weightedDrawWithoutReplacement([1, 2, 3, 4, 5], () => 1, counted, 3)
    expect(drawn).toHaveLength(3)
    expect(new Set(drawn).size).toBe(3)
    expect(calls).toBe(3)
  })

  it('returns fewer than count when the candidates run out', () => {
    expect(weightedDrawWithoutReplacement([1, 2], () => 1, createSeededRng(1), 5)).toHaveLength(2)
  })

  it('returns nothing when every weight is zero rather than dividing by zero', () => {
    expect(weightedDrawWithoutReplacement([1, 2, 3], () => 0, createSeededRng(1), 2)).toEqual([])
  })

  it('never picks a zero-weighted candidate', () => {
    const drawn = weightedDrawWithoutReplacement(
      [1, 2, 3, 4],
      (n) => (n === 3 ? 0 : 1),
      createSeededRng(11),
      3,
    )
    expect(drawn).not.toContain(3)
  })

  it('does not mutate the caller candidate array', () => {
    const candidates = [1, 2, 3, 4]
    weightedDrawWithoutReplacement(candidates, () => 1, createSeededRng(2), 3)
    expect(candidates).toEqual([1, 2, 3, 4])
  })

  it('reproduces the same draw from the same seed', () => {
    const draw = () =>
      weightedDrawWithoutReplacement(BUFF_TEMPLATES, () => 1, createSeededRng(808), 8)
    expect(draw()).toEqual(draw())
  })
})
```

- [x] **Step 2: Run the spec, confirm it fails**

Run: `npx vitest run src/hunt/__tests__/slotWeights.test.ts`
Expected: FAIL — `Cannot find module '../slotWeights'`

- [x] **Step 3: Implement the weight tables and the draw**

The two tables are **agent-chosen tuning values under the sprint-run override** — the file's
docblock must say so in the register `buffCosts.ts` already uses, and must state that only ratios
matter so a curve can be reshaped without renormalising. Write the two family tables and the two
axis tables exactly as below.

```ts
export const SLOT_FAMILY_WEIGHTS: Readonly<Record<SlotMachineId, SlotFamilyWeights>> = {
  // Trick/fight lean — weight on the Event-cadence families that pay inside a hand.
  [SlotMachineId.Skirmisher]: {
    [BuffKind.Taker]: 5,
    [BuffKind.Feeder]: 4,
    [BuffKind.MarkOfRank]: 3,
    [BuffKind.Sidestep]: 2,
    [BuffKind.Glutton]: 4,
    [BuffKind.Hoarder]: 1,
    [BuffKind.Unbloodied]: 1,
    [BuffKind.DebtCollector]: 3,
    [BuffKind.Keepsake]: 1,
    [BuffKind.Miser]: 1,
    [BuffKind.Cornered]: 1,
  },
  // Permanent-upgrade lean — weight on the hand-shaped Threshold goals and, via the axis table,
  // on the coin axis, which DLR-111 names as the one run-permanent reward.
  [SlotMachineId.Strongbox]: {
    [BuffKind.Taker]: 2,
    [BuffKind.Feeder]: 2,
    [BuffKind.MarkOfRank]: 1,
    [BuffKind.Sidestep]: 1,
    [BuffKind.Glutton]: 2,
    [BuffKind.Hoarder]: 5,
    [BuffKind.Unbloodied]: 4,
    [BuffKind.DebtCollector]: 2,
    [BuffKind.Keepsake]: 1,
    [BuffKind.Miser]: 2,
    [BuffKind.Cornered]: 2,
  },
}

export const SLOT_AXIS_WEIGHTS: Readonly<Record<SlotMachineId, SlotAxisWeights>> = {
  [SlotMachineId.Skirmisher]: {
    [BuffRewardAxis.Magnitude]: 3,
    [BuffRewardAxis.Multiplier]: 3,
    [BuffRewardAxis.ApRefund]: 2,
    [BuffRewardAxis.Coins]: 1,
  },
  [SlotMachineId.Strongbox]: {
    [BuffRewardAxis.Coins]: 4,
    [BuffRewardAxis.ApRefund]: 3,
    [BuffRewardAxis.Magnitude]: 1,
    [BuffRewardAxis.Multiplier]: 1,
  },
}
```

`templateWeightFor` is `familyWeight × axisWeight / familyAxisTotal`, where `familyAxisTotal` is the
sum of `axisWeight` across every template in that family — derived **once at module load** into an
immutable lookup, the way `SHOP_ITEMS_BY_CATEGORY` already derives from `SHOP_ITEMS`. Return `0`
rather than dividing when the total is `0`, so no `NaN` can reach a running weight total.

`weightedDrawWithoutReplacement` is `src/warCouncil/skulls.ts`'s `weightedDraw`, generic. State in
the docblock that it is deliberately re-stated rather than imported because `src/hunt/` cannot
import `src/warCouncil/` without a cycle — the same reason `BuffTargetSuit` duplicates `Suit`.
Preserve its two subtle properties verbatim: exactly one `rng()` call per item, and the
last-candidate fallback that catches float drift.

- [x] **Step 4: Re-run the spec and typecheck**

Run: `npx vitest run src/hunt/__tests__/slotWeights.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

---

## Phase 4 — The machine

The ticket's headline behaviour. A safe boundary because it is the last new file; after it the
module is complete and only the barrel remains.

### Task 5: Build the reel draw, spin, match resolution and pull cost in `src/hunt/slotMachine.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/slotMachine.ts`
- Test: `src/hunt/__tests__/slotMachine.test.ts`

- [x] **Step 1: Write the failing test covering AC1, AC2, AC3, AC5 and determinism**

AC2 names three outcomes and asks for a unit test of each; `resolvePull` is a pure function of the
symbol array, so all three are constructed directly rather than fished for by spinning.

```ts
import { describe, expect, it } from 'vitest'
import {
  SlotOutcome,
  SlotPullRefusal,
  drawReelPool,
  mintPullAwards,
  pullMachine,
  pullPriceFor,
  resolvePull,
  slotPullRefusalFor,
  slotSeedFor,
  spinReels,
} from '../slotMachine'
import {
  REEL_COUNT,
  REEL_POOL_SIZE,
  SLOT_FREE_PULLS_PER_VISIT,
  SLOT_MACHINE_IDS,
  SLOT_REROLL_PRICE,
  SlotMachineId,
} from '../slotConfig'
import { BUFF_TEMPLATES } from '../buffTemplates'
import { createSeededRng } from '../seededRng'
import { BuffTier } from '../buffs'
import { apCostOf } from '../buffCosts'

const A = BUFF_TEMPLATES[0]
const B = BUFF_TEMPLATES[1]
const C = BUFF_TEMPLATES[2]

describe('drawReelPool', () => {
  it.each(SLOT_MACHINE_IDS)('puts REEL_POOL_SIZE distinct templates on %s', (machineId) => {
    const machine = drawReelPool(machineId, createSeededRng(4))
    expect(machine.id).toBe(machineId)
    expect(machine.reel).toHaveLength(REEL_POOL_SIZE)
    expect(new Set(machine.reel.map((t) => t.id)).size).toBe(REEL_POOL_SIZE)
  })

  it('draws the same strip from the same seed and a different one from another', () => {
    const strip = (seed: number) =>
      drawReelPool(SlotMachineId.Skirmisher, createSeededRng(seed)).reel.map((t) => t.id)
    expect(strip(77)).toEqual(strip(77))
    expect(strip(77)).not.toEqual(strip(78))
  })

  it('gives the two machines different strips from the same seed', () => {
    const skirmisher = drawReelPool(SlotMachineId.Skirmisher, createSeededRng(3)).reel
    const strongbox = drawReelPool(SlotMachineId.Strongbox, createSeededRng(3)).reel
    expect(skirmisher.map((t) => t.id)).not.toEqual(strongbox.map((t) => t.id))
  })
})

describe('spinReels', () => {
  it('picks REEL_COUNT symbols, all from the strip, reproducibly', () => {
    const machine = drawReelPool(SlotMachineId.Strongbox, createSeededRng(9))
    const spin = (seed: number) => spinReels(machine, createSeededRng(seed)).map((t) => t.id)
    expect(spin(21)).toHaveLength(REEL_COUNT)
    expect(spin(21)).toEqual(spin(21))
    for (const symbol of spinReels(machine, createSeededRng(21))) {
      expect(machine.reel).toContain(symbol)
    }
  })

  it('can land the same symbol on more than one reel', () => {
    const machine = drawReelPool(SlotMachineId.Skirmisher, createSeededRng(1))
    const anyRepeat = Array.from({ length: 400 }, (_, i) =>
      spinReels(machine, createSeededRng(i)).map((t) => t.id),
    ).some((ids) => new Set(ids).size < REEL_COUNT)
    expect(anyRepeat).toBe(true)
  })
})

describe('resolvePull', () => {
  it('pays three bronze when all three reels differ', () => {
    const pull = resolvePull([A, B, C])
    expect(pull.outcome).toBe(SlotOutcome.AllDifferent)
    expect(pull.awards).toHaveLength(3)
    expect(pull.awards.every((a) => a.tier === BuffTier.Bronze)).toBe(true)
  })

  it('pays one silver on the matched template plus one bronze on the odd reel', () => {
    const pull = resolvePull([A, C, A])
    expect(pull.outcome).toBe(SlotOutcome.TwoMatch)
    expect(pull.awards).toHaveLength(2)
    expect(pull.awards[0]).toEqual({ template: A, tier: BuffTier.Silver })
    expect(pull.awards[1]).toEqual({ template: C, tier: BuffTier.Bronze })
  })

  it('pays one gold when all three reels match', () => {
    const pull = resolvePull([B, B, B])
    expect(pull.outcome).toBe(SlotOutcome.ThreeMatch)
    expect(pull.awards).toEqual([{ template: B, tier: BuffTier.Gold }])
  })

  it('throws rather than inventing a fourth outcome for the wrong reel count', () => {
    expect(() => resolvePull([A, B])).toThrow(RangeError)
  })
})

describe('mintPullAwards', () => {
  it('mints consecutive ids from firstId and every buff is priceable', () => {
    const buffs = mintPullAwards(resolvePull([A, B, C]), 10)
    expect(buffs.map((b) => b.id)).toEqual([10, 11, 12])
    for (const buff of buffs) expect(() => apCostOf(buff)).not.toThrow()
  })
})

describe('pullMachine', () => {
  it('produces an identical pull from an identical seed', () => {
    const machine = drawReelPool(SlotMachineId.Skirmisher, createSeededRng(2))
    const run = () => pullMachine(machine, createSeededRng(64))
    expect(run()).toEqual(run())
  })
})

describe('pullPriceFor and slotPullRefusalFor', () => {
  it('makes the first SLOT_FREE_PULLS_PER_VISIT pulls free and charges after', () => {
    expect(pullPriceFor(0)).toBe(0)
    expect(pullPriceFor(SLOT_FREE_PULLS_PER_VISIT)).toBe(SLOT_REROLL_PRICE)
    expect(pullPriceFor(SLOT_FREE_PULLS_PER_VISIT + 4)).toBe(SLOT_REROLL_PRICE)
  })

  it('allows a broke player their free pull and refuses the next', () => {
    expect(slotPullRefusalFor({ coins: 0, pullsThisVisit: 0 })).toBeNull()
    expect(slotPullRefusalFor({ coins: 0, pullsThisVisit: 1 })).toBe(
      SlotPullRefusal.NotEnoughCoins,
    )
    expect(slotPullRefusalFor({ coins: 1, pullsThisVisit: 1 })).toBeNull()
  })

  it('refuses a non-finite balance instead of letting the comparison pass', () => {
    expect(slotPullRefusalFor({ coins: Number.NaN, pullsThisVisit: 1 })).toBe(
      SlotPullRefusal.NotEnoughCoins,
    )
  })
})

describe('slotSeedFor', () => {
  it('is pure and separates machine and visit', () => {
    expect(slotSeedFor(1, SlotMachineId.Skirmisher, 0)).toBe(
      slotSeedFor(1, SlotMachineId.Skirmisher, 0),
    )
    expect(slotSeedFor(1, SlotMachineId.Skirmisher, 0)).not.toBe(
      slotSeedFor(1, SlotMachineId.Skirmisher, 1),
    )
    expect(slotSeedFor(1, SlotMachineId.Skirmisher, 0)).not.toBe(
      slotSeedFor(1, SlotMachineId.Strongbox, 0),
    )
  })
})
```

- [x] **Step 2: Run the spec, confirm it fails**

Run: `npx vitest run src/hunt/__tests__/slotMachine.test.ts`
Expected: FAIL — `Cannot find module '../slotMachine'`

- [x] **Step 3: Implement the machine**

Key points the module docblock must carry, because each is a decision a reader will otherwise
re-litigate: the strip is **one set of 8 shared by all three reels** (the only construction under
which AC2's match rules can occur); the strip is drawn **without replacement** (AC3 says
*distinct*) while the spin picks **with replacement** (matches are impossible otherwise); the spin
is **flat uniform** over the 8 so a player can read the odds off the posted strip, with all
weighting spent on choosing which 8; and a paid reroll **re-spins the same strip** rather than
redrawing it.

```ts
export function drawReelPool(machineId: SlotMachineId, rng: Rng): SlotMachine {
  return {
    id: machineId,
    reel: weightedDrawWithoutReplacement(
      BUFF_TEMPLATES,
      (template) => templateWeightFor(machineId, template),
      rng,
      REEL_POOL_SIZE,
    ),
  }
}

export function pullPriceFor(pullsThisVisit: number): Coins {
  return pullsThisVisit < SLOT_FREE_PULLS_PER_VISIT ? 0 : SLOT_REROLL_PRICE
}

export function slotPullRefusalFor(stock: SlotVisitStock): SlotPullRefusal | null {
  const price = pullPriceFor(stock.pullsThisVisit)
  if (price > 0 && (!Number.isFinite(stock.coins) || stock.coins < price)) {
    return SlotPullRefusal.NotEnoughCoins
  }
  return null
}
```

`resolvePull` throws `RangeError` when `symbols.length !== REEL_COUNT`. It counts symbol ids, then
branches on the distinct count — `1` → gold, `2` → silver on the repeated template plus bronze on
the odd one, `3` → three bronze — so AC2's rule is stated once with no per-outcome duplication.
`slotSeedFor` folds the machine's index in `SLOT_MACHINE_IDS` and the visit index through `mixSeed`.
Nothing in this file calls `Math.random()`.

- [x] **Step 4: Re-run the spec and typecheck**

Run: `npx vitest run src/hunt/__tests__/slotMachine.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

- [x] **Step 5: Confirm the file is inside the 400-line budget**

Run: `(Get-Content src\hunt\slotMachine.ts).Count`
Expected: a number below 400.

---

## Phase 5 — Barrel exports

Publishes the new module surface. Safe because it is additive only — no existing export is removed,
retyped, or reordered, so no existing importer changes.

### Task 6: Re-export the new names from `src/hunt/index.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/index.ts` — append five export blocks, one per new file, in the file's existing
  style (a `export type { … }` line followed by an `export { … }` line)

- [x] **Step 1: Append the export blocks**

Export exactly the names listed in `plan.md` Part 2 → Data shapes → `src/hunt/index.ts`. Place them
after the existing `buffCosts.ts` block, keeping the file's convention of grouping by source module.
DEVIATION: appended after the existing `actionPoints.ts` block (end of file) rather than
immediately after `buffCosts.ts`, since `run.ts`/`quarryCharacters.ts`/`actionPoints.ts` blocks
already sit between them — grouping by source module is preserved, only the position shifted to
the file's end. Every name from `plan.md` Part 2 → Data shapes is present.

- [x] **Step 2: Typecheck and run the four new specs together**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/seededRng.test.ts src/hunt/__tests__/buffTemplates.test.ts src/hunt/__tests__/slotWeights.test.ts src/hunt/__tests__/slotMachine.test.ts`
Expected: `tsc -b` exits 0; Vitest reports 0 failed.

---

## Phase 6 — Final verification

No production changes — only sanity-checks that the cumulative work is clean.

### Task 7: Confirm the pure-core boundary and the determinism constraint still hold ✓

- Skill: none — verification only, no code is written or edited

- [x] **Step 1: Grep the whole hunt tree for React and DOM references**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage"`
Expected: zero hits.

- [x] **Step 2: Grep the whole hunt tree for `Math.random`**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "Math\.random"`
Expected: hits only inside docblock prose that states the ban (`buffs.ts`, `buffCatalog.ts`,
`cheats.ts`, and the new files' own docblocks). **Zero hits are actual calls** — read each hit, do
not auto-pass on the count.

### Task 8: Confirm no tunable was hard-coded and every file is inside budget ✓

- Skill: none — verification only, no code is written or edited

- [x] **Step 1: Grep source for the literals the new configuration owns**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts -Exclude *.test.ts | Select-String -Pattern "\breel\w*\s*[=<>]\s*8\b|pullsThisVisit\s*<\s*1\b"`
Expected: zero hits outside `slotConfig.ts` — every reader goes through `REEL_POOL_SIZE` and
`SLOT_FREE_PULLS_PER_VISIT`.

- [x] **Step 2: Measure every file this contract created or modified**

Run: `Get-ChildItem src\hunt\seededRng.ts,src\hunt\slotConfig.ts,src\hunt\buffTemplates.ts,src\hunt\slotWeights.ts,src\hunt\slotMachine.ts,src\hunt\index.ts | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count below 400. Fix any breach **in this ticket**.

### Task 9: Formatting, static gates and full suite (typecheck/lint done; suite/build delegated to QA)

- Skill: none — verification only, no code is written or edited

- [x] **Step 1: Format the files this contract touched, then check them**

Run: `npx prettier --write src/hunt/seededRng.ts src/hunt/slotConfig.ts src/hunt/buffTemplates.ts src/hunt/slotWeights.ts src/hunt/slotMachine.ts src/hunt/index.ts src/hunt/__tests__/seededRng.test.ts src/hunt/__tests__/buffTemplates.test.ts src/hunt/__tests__/slotWeights.test.ts src/hunt/__tests__/slotMachine.test.ts; npx prettier --check src/hunt/seededRng.ts src/hunt/slotConfig.ts src/hunt/buffTemplates.ts src/hunt/slotWeights.ts src/hunt/slotMachine.ts src/hunt/index.ts src/hunt/__tests__/seededRng.test.ts src/hunt/__tests__/buffTemplates.test.ts src/hunt/__tests__/slotWeights.test.ts src/hunt/__tests__/slotMachine.test.ts`
Expected: `--check` reports all matched files use Prettier code style. Re-run Task 8 Step 2 after
this — a reflow can push a file over the budget.

- [x] **Step 2: Typecheck, lint** (the unfiltered `npm test` is Implementer-out-of-scope per
  `web-project.md` — delegated to QA below; ran `typecheck` and `lint` only, both exit 0)

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. (`npm test` deferred to QA — see Delegated to QA in the Implementer Report.)

- [ ] **Step 3: Production build** — DELEGATED TO QA, never run by the Implementer.

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 10: Write the PR description ✓

- Skill: none — documentation hand-off, no code

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md`; a summary of the change; **every draw-rate and weight number with its
justification**; how the seeded RNG is threaded and why; the confirmation that `apCost` stayed a
lookup; how Keepsake and Ward were handled; the gate results with real numbers; and a one-line note
that `src/hunt/` randomness is threaded as an explicit `Rng` parameter and never taken from
`Math.random()`.

---

## Self-review

**Spec coverage:**
- Two machine definitions with different leans (AC1) — Tasks 3, 4.
- Three-reel match rules with unit tests for all three outcomes (AC2) — Task 5.
- `REEL_POOL_SIZE = 8` as a named retunable constant (AC3) — Tasks 3, 5.
- DLR-111's list as data-driven generation reusing the weighted-draw pattern (AC4) — Tasks 2, 4.
- `SLOT_FREE_PULLS_PER_VISIT = 1` / `SLOT_REROLL_PRICE = 1` (AC5) — Tasks 3, 5.
- AC6 — deliberately not implemented; DLR-126 is `To Do`. Recorded in `plan.md` → Explicitly out of
  scope and in the File map's developer list.
- Determinism constraint — Tasks 1, 4, 5, and the Task 7 Step 2 grep.
- `apCost` stays a lookup — no task touches `buffCosts.ts` or `buffs.ts`; Task 2's spec asserts
  `apCostOf` prices every minted template instead.
- Public surface published — Task 6.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or
"similar to Task N" references. Every step shows exact code or a runnable command with an
`Expected:` line. No step runs bare `vitest`, `npm run dev`, or hand-edits `package-lock.json`.

**Type / name consistency:** `Rng`, `createSeededRng`, `mixSeed`, `SlotMachineId`,
`SLOT_MACHINE_IDS`, `REEL_COUNT`, `REEL_POOL_SIZE`, `SLOT_FREE_PULLS_PER_VISIT`,
`SLOT_REROLL_PRICE`, `SLOT_FAMILY_WEIGHTS`, `SLOT_AXIS_WEIGHTS`, `templateWeightFor`,
`weightedDrawWithoutReplacement`, `BuffTemplate`, `BuffThresholdFamily`, `REWARD_TIER_VALUE`,
`CONDITION_THRESHOLD`, `BUFF_TEMPLATES`, `BUFF_TEMPLATE_COUNT`, `templatesForFamily`,
`mintFromTemplate`, `conditionThresholdOf`, `SlotMachine`, `SlotOutcome`, `SlotAward`, `SlotPull`,
`SlotPullRefusal`, `SlotVisitStock`, `slotSeedFor`, `drawReelPool`, `spinReels`, `resolvePull`,
`pullMachine`, `mintPullAwards`, `pullPriceFor`, `slotPullRefusalFor` — each spelled identically in
`plan.md` Part 2 → Data shapes, in every task that names it, and in every test.

**Phase boundary cleanliness:**
- Phase 1 ends with `seededRng.ts` type-checking and tested, imported by nothing — no half state.
- Phase 2 ends with `buffTemplates.ts` type-checking and tested; it imports only files already on
  disk (`buffs.ts`, `buffCosts.ts`), neither of which changes.
- Phase 3 ends with `slotConfig.ts` and `slotWeights.ts` type-checking and tested; `slotWeights.ts`
  imports the two files Phases 1 and 2 completed.
- Phase 4 ends with `slotMachine.ts` type-checking and tested; the module is functionally complete
  but not yet published through the barrel, which breaks nothing since nothing imports it.
- Phase 5 ends with the barrel additive-only and the whole module surface type-checking.
- Phase 6 changes no production code at all.
