# Tasks: Manage Buffs screen — combine two identical buff cards into one of the next tier

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: PLANNED
Started: 2026-09-01

**Goal:** Give the player a free way, at the shop, to turn two cards that are the same card at the same tier into one card of the next tier up — with the rule in the pure engine tree and a new full-viewport screen that groups the held pile, puts the combinable piles first, and confirms each combine on the pile itself before it destroys anything.

**Spec:** `plan.md` in this folder. Layout, gesture and copy reference: `mockup.html` in this folder.

---

## File map

**Created:**
- `src/hunt/buffCombine.ts` — the combine rule: identity key, next-tier step, refusal codes, and the `combineBuffs` run transition.
- `src/hunt/__tests__/buffCombine.test.ts` — AC9's six cases plus the tier-union pin.
- `src/app/run/manageBuffs.ts` — the screen's pure view model: groups with counts, ids, refusal and the produced-card preview, ordered ready-first.
- `src/app/run/__tests__/manageBuffs.test.ts` — grouping, ordering and refusal attachment.
- `src/app/run/manageBuffsLabels.ts` — every word the screen prints, including the total `Record<CombineRefusal, string>`.
- `src/app/run/useManageBuffs.ts` — the hook that owns the run write and returns the panel's props.
- `src/app/run/ManageBuffsPanel.tsx` — the screen: status strip, the two bands, the ledger, the roving tabindex.
- `src/app/run/CombineGroupCard.tsx` — one pile tile, including its armed confirmation face.
- `src/app/run/manageBuffs.css` — the shell and the tiles.
- `src/app/run/__tests__/ManageBuffsPanel.test.tsx` — grouping on screen, refusal wording, the two-tap gesture, `Escape`, arrow keys, the produced-card announcement.
- `src/app/run/__tests__/ShopPanel.manageBuffs.test.tsx` — the shop's entry control.

**Modified:**
- `src/hunt/buffTemplates.ts` — extract the id grammar into `templateIdFor`; add `templateIdForBuff` and `templateForBuff`.
- `src/hunt/index.ts` — export the new combine surface and the template lookups.
- `src/app/warCouncil/buffGalleryModel.ts:99-110` — `buffStackKey` delegates to `buffCombineKey`.
- `src/app/run/heldBuffs.ts:19-54` — `HeldBuffStack` gains `ids`.
- `src/app/screenFor.ts` — `RunPhase.ManageBuffs`, the `AppScreen` member, the `screenFor` case.
- `src/app/run/ShopPanel.tsx` — the `onManageBuffs` prop and the control that calls it.
- `src/app/run/shopLabels.ts` — the entry control's label.
- `src/App.tsx` — the `useManageBuffs` call, the phase branch, the shop's new prop.
- `src/app/__tests__/screenFor.test.ts` — the new phase's case.
- `src/hunt/__tests__/buffTemplates.test.ts` — `templateIdForBuff` round-trips every template in the pool.

**Deleted:** (none)

**Developer decides or observes:**
- Whether two taps on the tile (arm, then Combine) is the right gesture, versus select-then-confirm elsewhere. Only playing settles it.
- The screen's copy: the confirmation's wording, the two refusal sentences ("Already gold — nothing above it" / "Only one — nothing to pair it with"), and the "Just made" badge's word.
- The pile-tile size bounds. The tasks reuse the loadout grid's existing `clamp()` bounds rather than choosing new numbers; if a dozen tiles reads cramped or sparse at your viewport, the new bounds are yours.
- Whether the "Just made" badge plus the status line is enough to answer "where did my card go" in a grid of a dozen tiles — AC10's hand pass.
- The accepted risk the ticket names: with today's reward ladder most combines measure as a downgrade. Nothing here compensates for it, by design.

---

## Phase 1 — The combine rule, in the pure engine tree

Everything in this phase is DOM-free `src/hunt/` code with no consumer yet, so the phase ends type-checking with the app untouched and the new module fully unit-tested. It goes first because the screen's view model reads its refusal codes, and because the template lookup it needs is a change to a file the Vault also depends on.

### Task 1: Derive a card's template — `src/hunt/buffTemplates.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffTemplates.ts:143-160`
- Test: `src/hunt/__tests__/buffTemplates.test.ts`

- [ ] **Step 1: Extract the id grammar out of `makeTemplate` so one expression writes it**

Replace the id expression inside `makeTemplate` with a call to a new module-private helper declared directly above it. The format `<kind>[:<param>]:<axis>` is PERSISTED by the Vault (see `ConditionBuffTemplate.id`'s docblock), so it must keep being written in exactly one place.

```ts
/** The persisted id grammar `<kind>[:<param>]:<axis>`, written ONCE. `makeTemplate` composes an
 *  id with it and `templateIdForBuff` recomposes the same id from a minted card; a second copy of
 *  this expression is how the two would silently drift apart. */
function templateIdFor(kind: BuffKind, axis: string | null, paramLabel: string | undefined): string {
  const head = paramLabel === undefined ? String(kind) : `${kind}:${paramLabel}`
  return axis === null ? head : `${head}:${axis}`
}
```

Then, in `makeTemplate`, replace:

```ts
  const id = paramLabel === undefined ? `${kind}:${axis}` : `${kind}:${paramLabel}:${axis}`
```

with:

```ts
  const id = templateIdFor(kind, axis, paramLabel)
```

- [ ] **Step 2: Add the reverse lookup — card to template**

Append below `templateById`:

```ts
/** DLR-159 — which template minted this card, as an id. An ACTIVATED card's id is the bare kind
 *  (`ACTIVATED_TEMPLATES` above), a condition card's is the `<kind>[:<suit>]:<axis>` grammar
 *  `templateIdFor` writes for the generator — so this recomposes rather than inventing a format.
 *  Reads `buff.reward.axis` and `condition.target?.suit`, the only two fields that vary within a
 *  family. */
export function templateIdForBuff(buff: Buff): string {
  if (BUFF_CADENCE[buff.kind] === BuffCadence.Activated) return templateIdFor(buff.kind, null, undefined)
  const suit = buffTargetSuitOf(buff)
  return templateIdFor(buff.kind, buff.reward.axis, suit ?? undefined)
}

/** The template itself, or `undefined` when this build no longer has one — exactly what
 *  `reconcileVault` already tests a stale id against. A caller must handle `undefined` rather
 *  than assert: a pruned family is not a programming error. */
export function templateForBuff(buff: Buff): BuffTemplate | undefined {
  return templateById(templateIdForBuff(buff))
}
```

Add `BuffCadence`, `BUFF_CADENCE` and `buffTargetSuitOf` to this file's existing import from `./buffs`.

- [ ] **Step 3: Pin the round-trip over the whole pool**

Append to `src/hunt/__tests__/buffTemplates.test.ts`:

```ts
describe('templateIdForBuff', () => {
  it('round-trips every template in the pool at every tier', () => {
    for (const template of BUFF_TEMPLATES) {
      for (const tier of [BuffTier.Bronze, BuffTier.Silver, BuffTier.Gold]) {
        const minted = mintFromTemplate(template, tier, 1)
        expect(templateIdForBuff(minted)).toBe(template.id)
        expect(templateForBuff(minted)).toBe(template)
      }
    }
  })
})
```

- [ ] **Step 4: Run the spec**

Run: `npx vitest run src/hunt/__tests__/buffTemplates.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 2: The combine rule — `src/hunt/buffCombine.ts`

- Skill: react-frontend

**Files:**
- Create: `src/hunt/buffCombine.ts`
- Test: `src/hunt/__tests__/buffCombine.test.ts`

- [ ] **Step 1: Write the failing spec for AC9's six cases**

Create `src/hunt/__tests__/buffCombine.test.ts`. It mints its cards through `mintFromTemplate` — never hand-built literals — so a card in a test is the same object a run holds.

```ts
import { describe, expect, it } from 'vitest'
import {
  BuffTier,
  BUFF_TEMPLATES,
  CombineRefusal,
  buffCombineKey,
  combineBuffs,
  combineRefusalFor,
  mintFromTemplate,
  nextBuffTierAfter,
  startRun,
  templateById,
  type Buff,
} from '../index'
import { PLAYER_START_HEALTH } from '../config'

const MOON_FEEDER_BLADE = templateById('feeder:moons:magnitude')!
const BELL_FEEDER_BLADE = templateById('feeder:bells:magnitude')!

function card(template = MOON_FEEDER_BLADE, tier: BuffTier = BuffTier.Bronze, id = 1): Buff {
  return mintFromTemplate(template, tier, id)
}

function runHolding(buffs: readonly Buff[]) {
  const base = startRun(PLAYER_START_HEALTH, [], 1)
  return { ...base, buffs, nextBuffId: 900 }
}

describe('the combine rule', () => {
  it('turns two identical bronzes into one silver of the same card', () => {
    const run = runHolding([card(MOON_FEEDER_BLADE, BuffTier.Bronze, 1), card(MOON_FEEDER_BLADE, BuffTier.Bronze, 2)])
    const next = combineBuffs(run, buffCombineKey(run.buffs[0]))
    expect(next.buffs).toHaveLength(1)
    expect(next.buffs[0].tier).toBe(BuffTier.Silver)
    expect(next.buffs[0].kind).toBe(run.buffs[0].kind)
    expect(next.buffs[0].condition).toEqual(run.buffs[0].condition)
    expect(next.buffs[0].id).toBe(900)
    expect(next.nextBuffId).toBe(901)
  })

  it('turns two identical silvers into one gold', () => {
    const run = runHolding([card(MOON_FEEDER_BLADE, BuffTier.Silver, 1), card(MOON_FEEDER_BLADE, BuffTier.Silver, 2)])
    const next = combineBuffs(run, buffCombineKey(run.buffs[0]))
    expect(next.buffs[0].tier).toBe(BuffTier.Gold)
  })

  it('drops the pile count by exactly one per combine', () => {
    const run = runHolding([
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 1),
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 2),
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 3),
      card(BELL_FEEDER_BLADE, BuffTier.Bronze, 4),
    ])
    const next = combineBuffs(run, buffCombineKey(run.buffs[0]))
    expect(next.buffs).toHaveLength(3)
  })

  it('refuses a gold pile — there is no rung above it', () => {
    const gold = [card(MOON_FEEDER_BLADE, BuffTier.Gold, 1), card(MOON_FEEDER_BLADE, BuffTier.Gold, 2)]
    expect(combineRefusalFor(gold, buffCombineKey(gold[0]))).toBe(CombineRefusal.AtMaxTier)
    expect(() => combineBuffs(runHolding(gold), buffCombineKey(gold[0]))).toThrow(RangeError)
  })

  it('refuses two copies of the same card at different tiers', () => {
    const mixed = [card(MOON_FEEDER_BLADE, BuffTier.Bronze, 1), card(MOON_FEEDER_BLADE, BuffTier.Silver, 2)]
    expect(combineRefusalFor(mixed, buffCombineKey(mixed[0]))).toBe(CombineRefusal.NoPair)
  })

  it('refuses two different cards at the same tier', () => {
    const different = [card(MOON_FEEDER_BLADE, BuffTier.Bronze, 1), card(BELL_FEEDER_BLADE, BuffTier.Bronze, 2)]
    expect(buffCombineKey(different[0])).not.toBe(buffCombineKey(different[1]))
    expect(combineRefusalFor(different, buffCombineKey(different[0]))).toBe(CombineRefusal.NoPair)
  })

  it('consumes the two lowest ids and leaves the rest', () => {
    const three = [
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 5),
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 1),
      card(MOON_FEEDER_BLADE, BuffTier.Bronze, 3),
    ]
    const next = combineBuffs(runHolding(three), buffCombineKey(three[0]))
    expect(next.buffs.map((b) => b.id).sort((a, b) => a - b)).toEqual([5, 900])
  })

  it('steps the tier ladder and stops at gold', () => {
    expect(nextBuffTierAfter(BuffTier.Bronze)).toBe(BuffTier.Silver)
    expect(nextBuffTierAfter(BuffTier.Silver)).toBe(BuffTier.Gold)
    expect(nextBuffTierAfter(BuffTier.Gold)).toBeNull()
  })

  it('combines an activated card on the same rule, and its own ladder moves', () => {
    const cheat = templateById('cheat')!
    const pair = [mintFromTemplate(cheat, BuffTier.Bronze, 1), mintFromTemplate(cheat, BuffTier.Bronze, 2)]
    const next = combineBuffs(runHolding(pair), buffCombineKey(pair[0]))
    expect(next.buffs[0].tier).toBe(BuffTier.Silver)
    expect(next.buffs[0].reward.value).toBeGreaterThan(pair[0].reward.value)
  })

  it('produces a card that stacks with one the pool could already have dealt', () => {
    const pair = [card(MOON_FEEDER_BLADE, BuffTier.Bronze, 1), card(MOON_FEEDER_BLADE, BuffTier.Bronze, 2)]
    const dealt = mintFromTemplate(MOON_FEEDER_BLADE, BuffTier.Silver, 77)
    const next = combineBuffs(runHolding(pair), buffCombineKey(pair[0]))
    expect(buffCombineKey(next.buffs[0])).toBe(buffCombineKey(dealt))
  })

  it('every template in the pool is combinable from bronze', () => {
    for (const template of BUFF_TEMPLATES) {
      const pair = [mintFromTemplate(template, BuffTier.Bronze, 1), mintFromTemplate(template, BuffTier.Bronze, 2)]
      expect(combineRefusalFor(pair, buffCombineKey(pair[0]))).toBeNull()
    }
  })
})
```

- [ ] **Step 2: Run the spec and watch it fail for the right reason**

Run: `npx vitest run src/hunt/__tests__/buffCombine.test.ts`
Expected: fails to resolve `buffCombine`'s exports from `../index` — a transform/collection error naming `CombineRefusal`, `buffCombineKey`, `combineBuffs`, `combineRefusalFor` or `nextBuffTierAfter`. No assertion failure yet.

- [ ] **Step 3: Write the module**

Create `src/hunt/buffCombine.ts`:

```ts
import { BuffTier, buffTargetRankOf, buffTargetSuitOf, type Buff } from './buffs'
import { mintFromTemplate, templateForBuff } from './buffTemplates'
import { nextTierAfter } from './rankTiers'
import type { RunState } from './run'

/**
 * DLR-159 — combining two identical cards into one of the next tier. Lives in its own module
 * rather than in `runTransitions.ts`: that file stands at 396 lines against the 400-line blocking
 * budget, and one more transition would breach it in the same commit.
 *
 * Pure, like everything in `src/hunt/` — no React, no DOM, no `Math.random()`. The produced card's
 * id comes from `run.nextBuffId`, exactly as `withMintedBuff` mints a bought one.
 */

/** Why a pile cannot be combined. A reason CODE, not a sentence — `src/hunt/` holds no
 *  user-facing copy; `src/app/run/manageBuffsLabels.ts` maps these to words, exactly as
 *  `PURCHASE_REFUSAL_MESSAGE` maps `PurchaseRefusal`. */
export const CombineRefusal = {
  /** AC3 — the pile is gold and there is no rung above it. */
  AtMaxTier: 'atMaxTier',
  /** AC6 — fewer than two copies of this exact card at this exact tier, or a card whose template
   *  this build no longer has. Both read to the player as "nothing to pair it with". */
  NoPair: 'noPair',
} as const
export type CombineRefusal = (typeof CombineRefusal)[keyof typeof CombineRefusal]

/** How many copies one combine consumes. Not a tunable — AC2 is about a PAIR; the name exists so
 *  the two places that read it cannot disagree. */
const COPIES_PER_COMBINE = 2

/**
 * AC2's "identical in every respect" — two cards share this string exactly when they are the same
 * card at the same tier. THE statement of that rule: `buffStackKey` in
 * `src/app/warCouncil/buffGalleryModel.ts` delegates here rather than composing its own, so what
 * stacks on the felt and what combines in the shop cannot drift apart.
 */
export function buffCombineKey(buff: Buff): string {
  return [
    buff.kind,
    buff.tier,
    buffTargetSuitOf(buff) ?? '',
    buffTargetRankOf(buff) ?? '',
    buff.reward.axis,
    buff.reward.value,
  ].join('|')
}

/**
 * The next rung up, or `null` at gold. Delegates to `rankTiers.ts`'s `nextTierAfter` so
 * `TIER_LADDER` stays the codebase's ONE statement of tier order. `AbilityTier` and `BuffTier` are
 * the same three-member string union structurally, which is what makes the delegation type-check;
 * `buffCombine.test.ts` pins the two unions member-for-member, exactly as `buffs.test.ts` pins
 * `BuffTargetSuit` against the card layer's `Suit`.
 */
export function nextBuffTierAfter(tier: BuffTier): BuffTier | null {
  return nextTierAfter(tier)
}

/** Every held copy of the card named by `key`, in ascending id order — the order a combine
 *  consumes from, so repeated combines on one pile are deterministic. */
function copiesOf(buffs: readonly Buff[], key: string): readonly Buff[] {
  return buffs.filter((buff) => buffCombineKey(buff) === key).sort((a, b) => a.id - b.id)
}

/** `null` when the pile named by `key` can be combined right now. */
export function combineRefusalFor(buffs: readonly Buff[], key: string): CombineRefusal | null {
  const copies = copiesOf(buffs, key)
  if (copies.length === 0) return CombineRefusal.NoPair
  if (nextBuffTierAfter(copies[0].tier) === null) return CombineRefusal.AtMaxTier
  if (copies.length < COPIES_PER_COMBINE) return CombineRefusal.NoPair
  // A card this build has no template for cannot be re-minted. Impossible from a live pile today;
  // the guard is what stops a future pruning turning the screen into a crash.
  if (templateForBuff(copies[0]) === undefined) return CombineRefusal.NoPair
  return null
}

/**
 * Two copies destroyed, one card of the next tier minted in their place, `nextBuffId` advanced by
 * one. The produced card goes through `mintFromTemplate`, so it is indistinguishable from one the
 * slot machine could have dealt — which is what makes it stack with one, and what gives Cheat and
 * Timebomb (AC5) their own tier ladders with no branch here that knows they are special.
 *
 * THROWS a `RangeError` naming the refusal rather than returning `run` unchanged, exactly as
 * `buyFromShop` and `pullSlotMachine` do: a silent no-op on a destructive action is the failure
 * this module refuses to allow. Reaching the throw is a driver bug — the tile is not armable while
 * `combineRefusalFor` is non-null.
 */
export function combineBuffs(run: RunState, key: string): RunState {
  const refusal = combineRefusalFor(run.buffs, key)
  if (refusal !== null) {
    throw new RangeError(
      `Cannot combine ${key} — ${refusal} (holding ${run.buffs.length} cards, ${copiesOf(run.buffs, key).length} of this card)`,
    )
  }
  const copies = copiesOf(run.buffs, key)
  const spent = copies.slice(0, COPIES_PER_COMBINE)
  const tier = nextBuffTierAfter(spent[0].tier)
  const template = templateForBuff(spent[0])
  if (tier === null || template === undefined) {
    // Unreachable: `combineRefusalFor` above has already refused both cases. Stated rather than
    // asserted away, so a future edit to the refusal cannot silently mint a wrong card.
    throw new RangeError(`Cannot combine ${key} — the refusal check and the mint disagree`)
  }
  const destroyed = new Set(spent.map((buff) => buff.id))
  return {
    ...run,
    buffs: [...run.buffs.filter((buff) => !destroyed.has(buff.id)), mintFromTemplate(template, tier, run.nextBuffId)],
    nextBuffId: run.nextBuffId + 1,
  }
}
```

- [ ] **Step 4: Add the tier-union pin to the spec**

Append to `src/hunt/__tests__/buffCombine.test.ts`, so the structural coupling `nextBuffTierAfter` relies on cannot drift silently:

```ts
describe('BuffTier and AbilityTier', () => {
  it('are the same three rungs, member for member', () => {
    expect(Object.values(BuffTier).sort()).toEqual(Object.values(AbilityTier).sort())
  })
})
```

Add `AbilityTier` to the spec's import from `../index`.

- [ ] **Step 5: Export the new surface from the module barrel**

In `src/hunt/index.ts`, add the combine module's exports alongside the existing buff exports, and add `templateIdForBuff` / `templateForBuff` to the `buffTemplates` export block:

```ts
export { CombineRefusal, buffCombineKey, nextBuffTierAfter, combineRefusalFor, combineBuffs } from './buffCombine'
```

- [ ] **Step 6: Run the spec and the typecheck**

Run: `npx vitest run src/hunt/__tests__/buffCombine.test.ts src/hunt/__tests__/buffTemplates.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed on both files; `tsc -b` exits 0 with no errors.

### Task 3: Point the felt's stacking rule at the combine key — `src/app/warCouncil/buffGalleryModel.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/buffGalleryModel.ts:99-110`

- [ ] **Step 1: Delegate `buffStackKey` rather than composing a second key**

Replace the body of `buffStackKey` — the exported name and signature are UNCHANGED, so its four call sites and `buffGalleryModel.test.ts`'s existing guard need no edit:

```ts
/** AC7's "exact ×N" is only true if the collapse key is exact: two cards merge only when they are
 *  the same card in EVERY respect a player could tell apart. DLR-159 moved that composition into
 *  `src/hunt/buffCombine.ts` — the shop combines on exactly this rule, and two answers to "is this
 *  the same card" is the drift this delegation exists to prevent. */
export function buffStackKey(buff: Buff): string {
  return buffCombineKey(buff)
}
```

Add `buffCombineKey` to this file's existing import from `'../../hunt'`. Remove the now-unused `buffTargetRankOf` import if nothing else in the file uses it.

- [ ] **Step 2: Run the loadout grid's specs and the typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/buffGalleryModel.test.ts src/app/warCouncil/__tests__/BuffGallery.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

---

## Phase 2 — The screen's pure view model and its copy

Grouping, ordering, refusal attachment and every word the screen prints, all with no renderer and no React. The phase ends type-checking with the model tested and nothing yet rendering it, which is the point: everything decidable about this screen is decided here rather than inside a component.

### Task 4: Widen the shop tray's stack with its ids — `src/app/run/heldBuffs.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/app/run/heldBuffs.ts:19-54`
- Test: `src/app/run/__tests__/heldBuffs.test.ts`

- [ ] **Step 1: Add `ids` to the stack and populate it**

The Manage Buffs model reuses this grouping rather than writing a second one, and a combine has to know which copies it holds. `heldBuffStacks` is the ONLY construction site (audit: 4 annotated sites, 1 construction site), so this is a one-place change.

In the interface:

```ts
export interface HeldBuffStack {
  /** The copy whose wording and tier the pile is drawn from. */
  readonly buff: Buff
  readonly count: number
  /** DLR-159 — every held copy's id, ascending. The shop's combine consumes the two lowest, and
   *  the tray itself ignores this. `count` stays rather than becoming `ids.length`: the tray reads
   *  a count and should not have to know it is reading a list. */
  readonly ids: readonly BuffId[]
}
```

In `heldBuffStacks`, change the accumulator and the mapping so each pile carries its ids in ascending order:

```ts
export function heldBuffStacks(buffs: readonly Buff[]): readonly HeldBuffStack[] {
  const byKey = new Map<string, { buff: Buff; ids: BuffId[] }>()
  for (const buff of buffs) {
    const key = buffStackKey(buff)
    const existing = byKey.get(key)
    if (existing === undefined) byKey.set(key, { buff, ids: [buff.id] })
    else existing.ids.push(buff.id)
  }
  return [...byKey.entries()]
    .sort(([keyA, a], [keyB, b]) => {
      const byTier = TIER_RANK[b.buff.tier] - TIER_RANK[a.buff.tier]
      return byTier !== 0 ? byTier : keyA.localeCompare(keyB)
    })
    .map(([, stack]) => ({
      buff: stack.buff,
      count: stack.ids.length,
      ids: [...stack.ids].sort((a, b) => a - b),
    }))
}
```

Add `type BuffId` to this file's existing import from `'../../hunt'`.

- [ ] **Step 2: Cover the new field**

Append to `src/app/run/__tests__/heldBuffs.test.ts`:

```ts
it('carries every copy id, ascending, however the pile was ordered', () => {
  const stacks = heldBuffStacks([mint(0, BuffTier.Bronze, 7), mint(0, BuffTier.Bronze, 2)])
  expect(stacks[0].ids).toEqual([2, 7])
  expect(stacks[0].count).toBe(2)
})
```

- [ ] **Step 3: Run the tray's specs**

Run: `npx vitest run src/app/run/__tests__/heldBuffs.test.ts src/app/run/__tests__/ShopHeld.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 5: The screen's view model — `src/app/run/manageBuffs.ts`

- Skill: react-frontend

**Files:**
- Create: `src/app/run/manageBuffs.ts`
- Test: `src/app/run/__tests__/manageBuffs.test.ts`

- [ ] **Step 1: Write the failing spec**

Create `src/app/run/__tests__/manageBuffs.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { BuffTier, CombineRefusal, mintFromTemplate, templateById, type Buff } from '../../../hunt'
import { manageBuffsView } from '../manageBuffs'

const MOON_FEEDER = templateById('feeder:moons:magnitude')!
const BELL_TAKER = templateById('taker:bells:multiplier')!

function card(template = MOON_FEEDER, tier: BuffTier = BuffTier.Bronze, id = 1): Buff {
  return mintFromTemplate(template, tier, id)
}

describe('manageBuffsView', () => {
  it('counts identical copies into one pile', () => {
    const view = manageBuffsView([card(MOON_FEEDER, BuffTier.Bronze, 1), card(MOON_FEEDER, BuffTier.Bronze, 2)])
    expect(view.groups).toHaveLength(1)
    expect(view.groups[0].count).toBe(2)
    expect(view.groups[0].ids).toEqual([1, 2])
    expect(view.held).toBe(2)
    expect(view.readyCount).toBe(1)
  })

  it('keeps two different cards apart even at the same tier', () => {
    const view = manageBuffsView([card(MOON_FEEDER, BuffTier.Bronze, 1), card(BELL_TAKER, BuffTier.Bronze, 2)])
    expect(view.groups).toHaveLength(2)
    expect(view.readyCount).toBe(0)
  })

  it('names the produced card on a ready pile and nothing on a refused one', () => {
    const view = manageBuffsView([card(MOON_FEEDER, BuffTier.Bronze, 1), card(MOON_FEEDER, BuffTier.Bronze, 2)])
    expect(view.groups[0].refusal).toBeNull()
    expect(view.groups[0].produces?.tier).toBe(BuffTier.Silver)
  })

  it('refuses a lone copy and a gold pile, each with its own reason', () => {
    const view = manageBuffsView([
      card(MOON_FEEDER, BuffTier.Bronze, 1),
      card(BELL_TAKER, BuffTier.Gold, 2),
      card(BELL_TAKER, BuffTier.Gold, 3),
    ])
    const lone = view.groups.find((g) => g.buff.tier === BuffTier.Bronze)!
    const gold = view.groups.find((g) => g.buff.tier === BuffTier.Gold)!
    expect(lone.refusal).toBe(CombineRefusal.NoPair)
    expect(lone.produces).toBeNull()
    expect(gold.refusal).toBe(CombineRefusal.AtMaxTier)
    expect(gold.produces).toBeNull()
  })

  it('puts every ready pile before every refused one', () => {
    const view = manageBuffsView([
      card(BELL_TAKER, BuffTier.Gold, 1),
      card(BELL_TAKER, BuffTier.Gold, 2),
      card(MOON_FEEDER, BuffTier.Bronze, 3),
      card(MOON_FEEDER, BuffTier.Bronze, 4),
    ])
    expect(view.groups.map((g) => g.refusal)).toEqual([null, CombineRefusal.AtMaxTier])
  })

  it('draws the same screen however the pile was ordered', () => {
    const pile = [card(MOON_FEEDER, BuffTier.Silver, 1), card(BELL_TAKER, BuffTier.Bronze, 2), card(BELL_TAKER, BuffTier.Bronze, 3)]
    const forwards = manageBuffsView(pile).groups.map((g) => g.key)
    const backwards = manageBuffsView([...pile].reverse()).groups.map((g) => g.key)
    expect(forwards).toEqual(backwards)
  })

  it('reports an empty pile without inventing a group', () => {
    expect(manageBuffsView([])).toEqual({ groups: [], held: 0, readyCount: 0 })
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/app/run/__tests__/manageBuffs.test.ts`
Expected: fails to resolve `../manageBuffs` — the module does not exist yet.

- [ ] **Step 3: Write the model**

Create `src/app/run/manageBuffs.ts`:

```ts
import {
  buffCombineKey,
  combineRefusalFor,
  mintFromTemplate,
  nextBuffTierAfter,
  templateForBuff,
  type Buff,
  type BuffId,
  type CombineRefusal,
} from '../../hunt'
import { heldBuffStacks } from './heldBuffs'

/**
 * DLR-159 — what the Manage Buffs screen reads. Pure: no React, no DOM, tested with no renderer
 * under the `node` Vitest project.
 *
 * Reuses `heldBuffStacks` for the grouping rather than writing a second one — the shop tray and
 * this screen show the same piles of the same cards, and the only thing this screen adds is
 * whether a pile can be combined. `src/hunt/buffCombine.ts` owns the answer to that; this module
 * attaches it and orders the result.
 */

/** One pile, as the screen reads it. */
export interface CombineGroup {
  readonly key: string
  /** The copy the tile's wording and tier are drawn from. */
  readonly buff: Buff
  readonly count: number
  readonly ids: readonly BuffId[]
  /** `null` when this pile can be combined right now. */
  readonly refusal: CombineRefusal | null
  /** The card two copies would produce — non-null exactly when `refusal` is null. A real minted
   *  card, with a throwaway id, so the tile prints the produced card's OWN name, tier and payoff
   *  rather than a tier word and a guess at what it will pay. */
  readonly produces: Buff | null
}

export interface ManageBuffsView {
  /** Ready piles first, then refused ones, keeping `heldBuffStacks`'s tier-descending order within
   *  each band — the loadout grid's own rule: what you can act on sits where you look first, and
   *  what you cannot moves to the end carrying its reason. */
  readonly groups: readonly CombineGroup[]
  /** Copies held. The screen's headline figure and the N in "N → N−1". */
  readonly held: number
  readonly readyCount: number
}

/** The id the produced-card preview is minted with. Never reaches a run — the preview exists only
 *  so the tile can word the card. The real card is minted by `combineBuffs` from
 *  `run.nextBuffId`. */
const PREVIEW_ID = -1

function previewFor(buff: Buff): Buff | null {
  const tier = nextBuffTierAfter(buff.tier)
  const template = templateForBuff(buff)
  if (tier === null || template === undefined) return null
  return mintFromTemplate(template, tier, PREVIEW_ID)
}

export function manageBuffsView(buffs: readonly Buff[]): ManageBuffsView {
  const groups = heldBuffStacks(buffs).map((stack) => {
    const key = buffCombineKey(stack.buff)
    const refusal = combineRefusalFor(buffs, key)
    return {
      key,
      buff: stack.buff,
      count: stack.count,
      ids: stack.ids,
      refusal,
      produces: refusal === null ? previewFor(stack.buff) : null,
    }
  })
  const ready = groups.filter((group) => group.refusal === null)
  const refused = groups.filter((group) => group.refusal !== null)
  return { groups: [...ready, ...refused], held: buffs.length, readyCount: ready.length }
}
```

- [ ] **Step 4: Run the spec and the typecheck**

Run: `npx vitest run src/app/run/__tests__/manageBuffs.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 6: The screen's words — `src/app/run/manageBuffsLabels.ts`

- Skill: react-frontend

**Files:**
- Create: `src/app/run/manageBuffsLabels.ts`
- Modify: `src/app/run/shopLabels.ts`

- [ ] **Step 1: Write the copy module**

Every sentence the screen prints lives here, so `src/hunt/` keeps holding reason codes and no user-facing words — the split `PURCHASE_REFUSAL_MESSAGE` already establishes. Wording per `mockup.html`; all of it is the developer's to retune.

Create `src/app/run/manageBuffsLabels.ts`:

```ts
import { CombineRefusal, type Buff } from '../../hunt'
import { buffName, buffPayoff } from '../warCouncil/buffLabels'

const TIER_WORD: Readonly<Record<string, string>> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
}

export const MANAGE_BUFFS_TITLE = 'Manage Buffs'
export const MANAGE_BUFFS_OPEN_LABEL = 'Manage Buffs'
export const MANAGE_BUFFS_BACK_LABEL = 'Back to the shop'
export const MANAGE_BUFFS_HELD_LABEL = 'cards held'
export const MANAGE_BUFFS_READY_LABEL = 'piles ready'
export const MANAGE_BUFFS_EMPTY = 'You are carrying no cards.'
/** AC4 — free, and what it actually costs, said once at the top rather than on every tile. */
export const MANAGE_BUFFS_RULE =
  'Two of the same card at the same tier become one of the next tier. It costs no coins — it costs a card.'
export const MANAGE_BUFFS_SPEND = 'Every combine spends 2 cards and returns 1.'
export const MANAGE_BUFFS_READY_BAND = 'Ready to combine'
export const MANAGE_BUFFS_REFUSED_BAND = 'Nothing to combine'
export const MANAGE_BUFFS_DESTROY_LABEL = 'Destroy'
export const MANAGE_BUFFS_MAKE_LABEL = 'Make'
export const MANAGE_BUFFS_COMMIT_LABEL = 'Combine'
export const MANAGE_BUFFS_CANCEL_LABEL = 'Cancel'
export const MANAGE_BUFFS_JUST_MADE = 'Just made'

/** Total over the union, so a third refusal code fails to compile here rather than rendering
 *  blank on the face of a card. */
export const COMBINE_REFUSAL_MESSAGE: Readonly<Record<CombineRefusal, string>> = {
  [CombineRefusal.AtMaxTier]: 'Already gold — nothing above it',
  [CombineRefusal.NoPair]: 'Only one — nothing to pair it with',
}

/** `Bronze Moon-Feeder (Blade)` — the card named the way every other surface names it. */
export function combineCardText(buff: Buff): string {
  return `${TIER_WORD[buff.tier]} ${buffName(buff)}`
}

/** `+3 damage` / `+8 damage, −4 to you` — the full unabbreviated sentence, not the card face's
 *  clipped numeral. */
export function combinePayoffText(buff: Buff): string {
  const payoff = buffPayoff(buff)
  return payoff.risk === null ? payoff.gain : `${payoff.gain}, ${payoff.risk}`
}

/** AC7 — what a combine destroys and what it produces, in the cards' own terms. */
export function combineConfirmDestroyText(buff: Buff): string {
  return `2 × ${combineCardText(buff)}`
}

export function combineConfirmMakeText(made: Buff): string {
  return `1 × ${combineCardText(made)} — ${combinePayoffText(made)}`
}

/** `21 → 20 cards` — the cost of the combine, stated as the resource it actually spends. */
export function combineCostText(held: number): string {
  return `${held} → ${held - 1} cards`
}

/** The `role="status"` sentence after a combine commits, so the produced card announces itself
 *  rather than the player being expected to spot that something changed. */
export function combineDoneText(spent: Buff, made: Buff): string {
  return `Two ${combineCardText(spent)} became one ${combineCardText(made)} — ${combinePayoffText(made)}.`
}

/** The tile's own accessible name — one string, so what a sighted player reads and what a screen
 *  reader announces cannot drift. */
export function combineTileAccessibleName(
  buff: Buff,
  count: number,
  refusal: CombineRefusal | null,
  made: Buff | null,
): string {
  const head = `${combineCardText(buff)}, ${count} held.`
  if (refusal !== null) return `${head} ${COMBINE_REFUSAL_MESSAGE[refusal]}`
  return `${head} Combine two into one ${combineCardText(made!)}, ${combinePayoffText(made!)}`
}
```

- [ ] **Step 2: Add the shop's entry-control label**

Append to `src/app/run/shopLabels.ts`, beside the other shop control labels:

```ts
/** DLR-159 AC1 — the control that opens the Manage Buffs screen from the shop. */
export const SHOP_MANAGE_BUFFS_LABEL = 'Manage Buffs'
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: `tsc -b` exits 0, no errors.

---

## Phase 3 — The screen, and the way in and out of it

The React half: the hook that writes the run, the panel, the tile, the stylesheet, the phase, and the shop's entry control. The phase ends with the screen reachable and usable, its component specs green, and `App.tsx` measured against the 400-line budget.

### Task 7: The hook that owns the run write — `src/app/run/useManageBuffs.ts`

- Skill: react-frontend

**Files:**
- Create: `src/app/run/useManageBuffs.ts`

- [ ] **Step 1: Write the hook**

Shaped like `useShopSlot`: called unconditionally at `App.tsx`'s top level, returning a view plus the callbacks the panel needs, so the panel itself computes nothing about the run.

```ts
import type { Dispatch, SetStateAction } from 'react'
import { buffCombineKey, combineBuffs, type RunState } from '../../hunt'
import { manageBuffsView, type ManageBuffsView } from './manageBuffs'

export interface ManageBuffsHandle {
  readonly view: ManageBuffsView
  /** Commits the combine and returns the produced pile's key, so the panel can badge the pile the
   *  new card landed in. Returns the key rather than the card: the panel deals in piles. */
  readonly combine: (key: string) => string
}

/**
 * DLR-159 — the Manage Buffs screen's run-facing half, extracted from the panel exactly as
 * `useShopSlot` is extracted from `ShopPanel`. Holds no state of its own: the pile lives on
 * `RunState` and the armed/just-made state is the panel's own ephemeral view state.
 */
export function useManageBuffs(
  run: RunState,
  setRun: Dispatch<SetStateAction<RunState>>,
): ManageBuffsHandle {
  const view = manageBuffsView(run.buffs)

  function combine(key: string): string {
    // The produced pile's key is derived from the pile being spent, not from the new run — the
    // functional update has not run yet, and reading `run` after `setRun` would read the stale
    // one. Two cards of tier T always produce one of `nextBuffTierAfter(T)` of the same card, so
    // the key is knowable before the write.
    const group = view.groups.find((candidate) => candidate.key === key)
    if (group === undefined || group.produces === null) {
      throw new RangeError(`Cannot combine ${key} — no such pile is ready on this screen`)
    }
    const producedKey = buffCombineKey(group.produces)
    setRun((current) => combineBuffs(current, key))
    return producedKey
  }

  return { view, combine }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: `tsc -b` exits 0, no errors.

### Task 8: One pile tile — `src/app/run/CombineGroupCard.tsx`

- Skill: react-frontend

**Files:**
- Create: `src/app/run/CombineGroupCard.tsx`

- [ ] **Step 1: Write the tile**

Layout, gesture and copy per `mockup.html`'s pile tile. It borrows `warCouncilBuffCard.css`'s classes exactly as `HeldBuffCard` does, so a pile here is visibly the same object as the card on the felt, and tier reads as a roman numeral rather than as a hue. A ready pile is a `<button>`; a refused pile is a `<li>` with its reason on its face and no affordance, because a card rendered as a button that cannot act is an affordance that lies.

```tsx
import { CombineRefusal, type Buff } from '../../hunt'
import type { CombineGroup } from './manageBuffs'
import {
  COMBINE_REFUSAL_MESSAGE,
  MANAGE_BUFFS_CANCEL_LABEL,
  MANAGE_BUFFS_COMMIT_LABEL,
  MANAGE_BUFFS_DESTROY_LABEL,
  MANAGE_BUFFS_JUST_MADE,
  MANAGE_BUFFS_MAKE_LABEL,
  combineConfirmDestroyText,
  combineConfirmMakeText,
  combineCostText,
  combineTileAccessibleName,
} from './manageBuffsLabels'

export interface CombineGroupCardProps {
  readonly group: CombineGroup
  readonly armed: boolean
  readonly justMade: boolean
  /** Copies held right now — the tile prints `held → held − 1` while armed. */
  readonly held: number
  readonly tabStop: boolean
  readonly onArm: () => void
  readonly onCommit: () => void
  readonly onCancel: () => void
}
```

The component renders, in order: the `MANAGE_BUFFS_JUST_MADE` badge when `justMade`; the card face (reusing `HeldBuffCard`'s tier-numeral, suit-class and payoff structure — extract that face into a shared child if duplicating it would push either file past 400 lines); the strip under the card, which prints `Combine → <numeral>` on a ready pile and `COMBINE_REFUSAL_MESSAGE[refusal]` on a refused one; and, when `armed`, the confirmation face over the tile with `MANAGE_BUFFS_DESTROY_LABEL` + `combineConfirmDestroyText`, `MANAGE_BUFFS_MAKE_LABEL` + `combineConfirmMakeText`, `combineCostText(held)`, and the `Combine` / `Cancel` buttons wired to `onCommit` / `onCancel`. The ready tile's `aria-label` is `combineTileAccessibleName(...)` and its `tabIndex` is `tabStop ? 0 : -1`.

- [ ] **Step 2: Measure the file and typecheck**

Run: `(Get-Content src\app\run\CombineGroupCard.tsx).Count; npm run typecheck`
Expected: the count is under 400; `tsc -b` exits 0.

### Task 9: The screen — `src/app/run/ManageBuffsPanel.tsx` and `manageBuffs.css`

- Skill: react-frontend, game-ux

**Files:**
- Create: `src/app/run/ManageBuffsPanel.tsx`
- Create: `src/app/run/manageBuffs.css`
- Test: `src/app/run/__tests__/ManageBuffsPanel.test.tsx`

- [ ] **Step 1: Write the panel**

Layout per `mockup.html`: a three-row full-viewport grid — a status strip on the top edge (title, cards held, piles ready, the free-but-costs-a-card rule, and the back control), the two bands of piles in the middle, and a ledger on the bottom edge carrying the `role="status"` line and the spend note. A band renders only when it holds something, per `game-ux`'s rule against a panel that exists to report nothing.

```tsx
export interface ManageBuffsPanelProps {
  readonly view: ManageBuffsView
  /** Returns the produced pile's key, which the panel badges. */
  readonly onCombine: (key: string) => string
  readonly onLeave: () => void
}
```

Two pieces of component-local `useState`, both ephemeral view state that dies with the screen exactly as `BuffGallery`'s tier filter does: `armedKey: string | null` and `justMade: { key: string; text: string } | null`. Arming replaces any armed pile; committing calls `onCombine`, clears `armedKey`, and sets `justMade` from `combineDoneText`. No timer clears the badge — it stands until the next combine, because a mark that has faded by the time the player looks is the same as no mark.

`useRovingTabIndex` from `../warCouncil/useRovingTabIndex` runs over the ready piles: one tab stop, arrow keys to move, `Home`/`End` to jump, `Escape` cancelling an armed pile or leaving the screen when nothing is armed. Nothing registers a listener outside React's own `onKeyDown`, so there is no effect and no cleanup in this file.

- [ ] **Step 2: Write the stylesheet**

Port `mockup.html`'s CSS into `src/app/run/manageBuffs.css`, keeping the shell's `100dvh`, `overflow: hidden`, `env(safe-area-inset-*)` padding and `clamp()` bounds, and using no `100vh` and no `100vw` anywhere. The tile bounds reuse the loadout grid's existing `clamp()` figures rather than new numbers — see "Developer decides or observes".

- [ ] **Step 3: Write the component spec**

Create `src/app/run/__tests__/ManageBuffsPanel.test.tsx`, querying by role and label only. It covers: identical copies rendering as one tile with its count; a ready pile offering a combine and a refused pile carrying `COMBINE_REFUSAL_MESSAGE`'s exact sentence with no button; the first click arming and showing both the destroyed and produced cards plus the `held → held − 1` line; the second click calling `onCombine` with the pile's key; `Escape` cancelling an armed pile without calling `onCombine`; `Escape` with nothing armed calling `onLeave`; arrow keys moving focus across the ready piles; and the produced pile carrying the "Just made" mark with the `role="status"` sentence naming both halves after a commit.

- [ ] **Step 4: Run the spec and measure both files**

Run: `npx vitest run src/app/run/__tests__/ManageBuffsPanel.test.tsx; (Get-Content src\app\run\ManageBuffsPanel.tsx).Count; (Get-Content src\app\run\manageBuffs.css).Count; npm run typecheck`
Expected: Vitest reports 0 failed; both counts are under 400; `tsc -b` exits 0.

### Task 10: The phase — `src/app/screenFor.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/app/screenFor.ts`
- Test: `src/app/__tests__/screenFor.test.ts`

- [ ] **Step 1: Add the phase, the screen name and the case**

```ts
export const RunPhase = {
  Start: 'start',
  Verdict: 'verdict',
  Warned: 'warned',
  Shop: 'shop',
  // DLR-159 — reachable ONLY from the shop, and returning ONLY to the shop.
  ManageBuffs: 'manageBuffs',
  Map: 'map',
  Vault: 'vault',
} as const

export type AppScreen = 'start' | 'map' | 'shop' | 'manageBuffs' | 'vault' | 'verdict' | 'warCouncil'
```

and, in `screenFor`, directly after the `Shop` line so the shop and its sub-screen sit together:

```ts
  if (phase === RunPhase.ManageBuffs) return 'manageBuffs'
```

- [ ] **Step 2: Cover it**

Append to `src/app/__tests__/screenFor.test.ts`:

```ts
it('shows the Manage Buffs screen only once the encounter is over', () => {
  expect(screenFor(RunPhase.ManageBuffs, true)).toBe('manageBuffs')
  expect(screenFor(RunPhase.ManageBuffs, false)).toBe('warCouncil')
})
```

- [ ] **Step 3: Run the spec**

Run: `npx vitest run src/app/__tests__/screenFor.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 11: The way in — `src/app/run/ShopPanel.tsx`

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/run/ShopPanel.tsx`
- Test: `src/app/run/__tests__/ShopPanel.manageBuffs.test.tsx`

- [ ] **Step 1: Add the prop and the control**

Add to `ShopPanelProps`:

```ts
  /** DLR-159 AC1 — opens the Manage Buffs screen. */
  readonly onManageBuffs: () => void
```

Render the control inside the tray's `ShopHeld` heading area, so the way to act on the held cards sits with the held cards rather than beside the Heal — a button using `SHOP_MANAGE_BUFFS_LABEL`, `type="button"`, calling `onManageBuffs`. Pass `onManageBuffs` down through `ShopHeld`'s props rather than duplicating the tray's heading markup in `ShopPanel`.

- [ ] **Step 2: Cover the entry point**

Create `src/app/run/__tests__/ShopPanel.manageBuffs.test.tsx`: rendering the shop with held cards shows a `Manage Buffs` button, and clicking it calls `onManageBuffs` exactly once.

- [ ] **Step 3: Run the shop's specs**

Run: `npx vitest run src/app/run/__tests__/ShopPanel.manageBuffs.test.tsx src/app/run/__tests__/ShopPanel.test.tsx src/app/run/__tests__/ShopHeld.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 12: Wire it into the app — `src/App.tsx`

- Skill: react-frontend

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Call the hook unconditionally and render the branch**

Beside the existing `useShopSlot` call — unconditionally, at the top level, never inside a phase branch, because a hook called conditionally is a hooks-order violation:

```tsx
  // DLR-159 — cheap when the screen is not showing: one grouping of the pile, no state of its own.
  const manageBuffs = useManageBuffs(run, setRun)
```

Add the branch immediately after the `RunPhase.Shop` branch:

```tsx
  if (encounterOver && phase === RunPhase.ManageBuffs) {
    return (
      <ManageBuffsPanel
        view={manageBuffs.view}
        onCombine={manageBuffs.combine}
        onLeave={() => setPhase(RunPhase.Shop)}
      />
    )
  }
```

and pass `onManageBuffs={() => setPhase(RunPhase.ManageBuffs)}` to the existing `<ShopPanel>`.

- [ ] **Step 2: Measure the file against the 400-line budget**

Run: `(Get-Content src\App.tsx).Count`
Expected: under 400 (it stood at 379 before this contract). **If it is 400 or more, fix it in this task** — extract the phase-branch chain into a small `src/app/run/RunScreens.tsx` or move the Vault branch's props assembly into its own component — rather than reporting it as a finding.

- [ ] **Step 3: Typecheck and run the app-level specs**

Run: `npm run typecheck; npx vitest run src/__tests__`
Expected: `tsc -b` exits 0; Vitest reports 0 failed.

---

## Phase 4 — Final verification

No production changes. Confirms the cumulative work is clean, the pure-core boundary still holds, and nothing string-bound was left half-renamed.

### Task 13: Confirm the pure-core boundary still holds

- Skill: none — verification only, no code is written.

**Files:**
- Test: (none — greps only)

- [ ] **Step 1: Grep the new engine module for React and DOM references**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|Math\.random"`
Expected: zero hits.

- [ ] **Step 2: Confirm nothing outside the persistence module touched storage**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "\b(localStorage|sessionStorage)\.(getItem|setItem|removeItem|clear)\("`
Expected: hits only inside `src\persistence\`, exactly as `.claude/rules/save-data-versioning.md` records — this contract adds none.

### Task 14: Confirm no second identity key and no stray tier ladder

- Skill: none — verification only, no code is written.

**Files:**
- Test: (none — greps only)

- [ ] **Step 1: Confirm the combine key is composed in exactly one place**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "buff.reward.axis,"`
Expected: one hit, in `src\hunt\buffCombine.ts` — `buffStackKey` delegates rather than composing its own.

- [ ] **Step 2: Confirm no tier ladder was hard-coded on the new screen**

Run: `Get-ChildItem src\app\run -Recurse -Include *.ts,*.tsx | Select-String -Pattern "'silver'|'gold'|'bronze'"`
Expected: hits only where a tier is used as a lookup key on an existing map (`TIER_NUMERAL`, `TIER_CLASS`, `TIER_WORD`) — no expression that steps a tier by hand instead of calling `nextBuffTierAfter`.

### Task 15: Static gates and the full suite

- Skill: none — verification only, no code is written.

**Files:**
- Test: (none — the whole suite)

- [ ] **Step 1: Warm the transform cache, then typecheck, lint and run everything**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all exit 0; Vitest reports 0 failed. A single cold-cache `Timeout waiting for worker to respond` on the first `dom` run is infrastructure, not a test failure — re-run before reporting it.

- [ ] **Step 2: Check formatting on this contract's files only**

Run: `npx prettier --check src/hunt/buffCombine.ts src/hunt/buffTemplates.ts src/hunt/index.ts src/app/run/manageBuffs.ts src/app/run/manageBuffsLabels.ts src/app/run/useManageBuffs.ts src/app/run/ManageBuffsPanel.tsx src/app/run/CombineGroupCard.tsx src/app/run/manageBuffs.css src/app/run/heldBuffs.ts src/app/run/ShopPanel.tsx src/app/run/shopLabels.ts src/app/screenFor.ts src/App.tsx`
Expected: exits 0. Fix with `npx prettier --write` on the same list — never repo-wide `npm run format`.

- [ ] **Step 3: Measure every file this contract created or grew**

Run: `Get-ChildItem src\hunt\buffCombine.ts,src\hunt\buffTemplates.ts,src\app\run\manageBuffs.ts,src\app\run\manageBuffsLabels.ts,src\app\run\useManageBuffs.ts,src\app\run\ManageBuffsPanel.tsx,src\app\run\CombineGroupCard.tsx,src\app\run\manageBuffs.css,src\app\run\ShopPanel.tsx,src\App.tsx | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count under 400.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 16: Update the PR description

- Skill: none — a document for the developer, no code.

**Files:**
- Create: `.claude/contract/DLR-159-manage-buffs-combine-cards/pr-description.md`

- [ ] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- A link to `plan.md` and `mockup.html` in this folder.
- What shipped: the combine rule in `src/hunt/buffCombine.ts`, the identity key moving down from the felt's `buffStackKey`, and the Manage Buffs screen reached from the shop.
- Every decision the developer must make and every behaviour they must judge by playing — the "Developer decides or observes" list above, verbatim.
- The verification results from Phase 4, with the actual Vitest summary line and the measured line counts.
- A one-line note for future contributors: `buffCombineKey` in `src/hunt/` is now the single answer to "are these the same card", and `buffStackKey` delegates to it.

---

## Self-review

**Spec coverage:**
- AC1 — the shop has a Manage Buffs screen, reachable and returnable — Tasks 9, 10, 11, 12.
- AC2 — combinable only when identical in every respect — Task 2 (`buffCombineKey`, `combineRefusalFor`), Task 3 (one key, not two).
- AC3 — bronze pair → silver, silver pair → gold, gold refuses and says so — Task 2, Task 5 (`refusal` on the group), Task 6 (`COMBINE_REFUSAL_MESSAGE`), Task 8 (the strip).
- AC4 — free, uncapped, the cost is the card count — Task 2 (no coin field is touched), Task 6 (`MANAGE_BUFFS_RULE`, `MANAGE_BUFFS_SPEND`, `combineCostText`).
- AC5 — Cheat and Timebomb combine on the same rule and gain their own tier meaning — Task 2 (minting through `mintFromTemplate`, plus its activated-card spec).
- AC6 — grouped, counted, ready-first, reason on the ones that are not — Task 5 (ordering and refusal), Task 9 (the two bands).
- AC7 — every combine confirmed, stating destroyed and produced in the cards' terms — Task 6 (`combineConfirmDestroyText` / `combineConfirmMakeText`), Task 8 (the armed face), Task 9 (the two-tap gesture).
- AC8 — the pile survives whatever the run persists — no task: the audit in `plan.md` established that nothing about a run is persisted, that the Vault is the only save section, and that no `SAVE_SCHEMA_VERSION` bump is engaged. Task 13 Step 2 confirms this contract added no storage access.
- AC9 — the six unit-test cases plus the per-combine count drop — Task 2 Step 1, one `it` block each.
- AC10 — exercisable by hand, end to end — Tasks 11 and 12 make the route real; the hand pass itself is in "Developer decides or observes".

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact edit, or a runnable command with its expected result. Tasks 8, 9 and 11 describe their components structurally rather than transcribing every line, and each names the exact props, labels and CSS file it builds against plus `mockup.html` as the layout reference.

**Type / name consistency:** `CombineRefusal`, `buffCombineKey`, `nextBuffTierAfter`, `combineRefusalFor`, `combineBuffs`, `templateIdFor`, `templateIdForBuff`, `templateForBuff`, `CombineGroup`, `ManageBuffsView`, `manageBuffsView`, `ManageBuffsHandle`, `useManageBuffs`, `ManageBuffsPanelProps`, `CombineGroupCardProps`, `COMBINE_REFUSAL_MESSAGE`, `SHOP_MANAGE_BUFFS_LABEL`, `RunPhase.ManageBuffs` and the `'manageBuffs'` screen name are each spelled identically in every task that names them, and every one appears in `plan.md` Part 2 → Data shapes. `HeldBuffStack.ids` is introduced in Task 4 and consumed in Task 5.

**Phase boundary cleanliness:**
- Phase 1 ends with `src/hunt/` type-checking, its new module fully specced, and `buffStackKey` delegating with its existing callers untouched — no half-applied rename, and the app layer compiles because nothing there changed.
- Phase 2 ends with `HeldBuffStack` widened at its single construction site, the view model and the copy module written and specced, and no component importing either yet — so the tree type-checks with the new modules unreferenced.
- Phase 3 ends with the screen reachable, its specs green, and every file measured against the 400-line budget, `App.tsx` included with an in-task remedy if it breaches.
- Phase 4 changes no production code at all: greps, gates, the full suite, the build, and the PR description.
