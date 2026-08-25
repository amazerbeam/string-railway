# Tasks: A fresh run opens with four real bronze cards

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-25

> **Note:** this contract runs out-of-band after a completed sprint run, with the ticket's blocking design decision pre-answered by the developer. `plan.md` was **not** put through the `AskUserQuestion` approval gate — the coordinator's brief instructs that the gate be skipped because the one decision that would have paused it is already settled ("The player starts with 4 random buff cards, bronze tier"). The three sub-decisions are flagged as one-line reversals in `plan.md` → Risks and judgement calls.

**Goal:** Replace `seedStartingBuffPile`'s four `BuffKind.Unassigned` stubs with four distinct, real, bronze-tier cards drawn from `BUFF_TEMPLATES` under the reel's existing family weights and the run's seeded RNG, so a fresh run opens holding five activatable cards instead of one.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/hunt/startingPile.ts` — the opening draw: `startingPileSeedFor`, `openingPileWeightOf`, `seedStartingBuffPile`, `startingBuffPileFor`
- `src/hunt/__tests__/startingPile.test.ts` — determinism, distinctness, tier, ids, weighting, the short-draw throw

**Modified:**
- `src/hunt/buffs.ts:190-222` — delete `seedStartingBuffPile`; rewrite the `Unassigned`, `BUFF_CADENCE` and `UNASSIGNED_BUFF_*` docblocks to describe a retained sentinel
- `src/hunt/run.ts:14-17,178` — call `startingBuffPileFor(STARTING_BUFF_COUNT, 1, runSeed)`
- `src/hunt/index.ts:97` — move the `seedStartingBuffPile` export to `./startingPile`, add the three new exports
- `src/hunt/buffActivation.ts:180-196` — correct the two docblocks that say the opening pile is placeholders
- `src/hunt/buffCatalog.ts:99` — correct the `seedStartingBuffPile` prose reference
- `src/hunt/slotMachine.ts:183` — correct the `seedStartingBuffPile` prose reference
- `src/sim/reachability.ts:15-36` — correct the two `Unassigned` docblocks
- `src/sim/fixtures.ts:218-222` — correct the stale "a fresh run's pile is `BuffKind.Unassigned` placeholders" comment
- `src/hunt/__tests__/buffs.test.ts:1-59` — remove the `seedStartingBuffPile` describe block and its import
- `src/hunt/__tests__/buffActivation.priced.test.ts` — rewrite the three placeholder-fixture tests against an explicit `Unassigned` sentinel
- `src/hunt/__tests__/buffCatalog.test.ts:169-178` — rewrite the all-bronze assertion honestly
- `src/sim/__tests__/reachability.test.ts:84-96` — rewrite the two opening-pile assertions, strictly stronger
- `src/sim/__tests__/baselinePolicy.test.ts:66-69` — correct the stale comment
- `src/hunt/__tests__/consumables.test.ts:69` — correct the stale "what `seedStartingBuffPile` mints" comment
- `.claude/sprint-runs/2026-08-23-sprint/log.md` — append the DLR-135 out-of-band entry

**Deleted:** *(none — `startingPile.ts` supersedes a function, not a file)*

**Developer decides or observes:**
- Whether the opening pool should stay the **full 73 templates** or become a curated subset — one-line reversal in `openingPileWeightOf`'s caller (`plan.md` → Risks)
- Whether **Cheat and Timebomb** should stay eligible opening draws — one-line reversal, `if (template.form === 'activated') return 0`
- Whether opening weights should stay the **sum across both machines** or take one machine's lean — one-line reversal to `templateWeightFor(SlotMachineId.Skirmisher, template)`
- Whether **five opening cards** (4 random bronze + 1 guaranteed bronze Cheat) is the right number, and whether the guaranteed Cheat should still be one of them. **No value here is changed by this contract.**
- Whether `BuffKind.Unassigned` should be deleted in a follow-up ticket that owns rewriting the five guard suites that read it
- Whether the opening hand *reads* as a hand with a plan in it — four random bronze cards can be four Threshold-cadence cards that never fire in fight one. Only playing answers this.
- The simulator's before/after figures are an **observation**. Retune nothing in response to them.

---

## Phase 1 — The opening draw, as a pure module

This phase adds `src/hunt/startingPile.ts` and its spec without touching a single existing caller, so the tree type-checks throughout: `buffs.ts` still exports the old stub factory and `run.ts` still calls it. The new module is dead code at the end of this phase, which is exactly what makes the boundary safe. TDD shape, because every property here is a testable invariant (determinism, distinctness, tier, id sequence, the short-draw throw).

### Task 1: Create `src/hunt/startingPile.ts` with the opening draw ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/startingPile.ts`
- Test: `src/hunt/__tests__/startingPile.test.ts`

- [x] **Step 1: Write the failing spec for the opening draw**

Create `src/hunt/__tests__/startingPile.test.ts`. Cover, at minimum:

```ts
import { describe, expect, it } from 'vitest'
import { BuffKind, BuffTier } from '../buffs'
import { isPricedBuff } from '../buffActivation'
import { apCostOf } from '../buffCosts'
import { createSeededRng } from '../seededRng'
import { BUFF_TEMPLATES } from '../buffTemplates'
import { SLOT_MACHINE_IDS } from '../slotConfig'
import { templateWeightFor } from '../slotWeights'
import {
  openingPileWeightOf,
  seedStartingBuffPile,
  startingBuffPileFor,
  startingPileSeedFor,
} from '../startingPile'

describe('seedStartingBuffPile', () => {
  it('mints `count` buffs with consecutive ids from `firstId`, all bronze', () => {
    const pile = seedStartingBuffPile(4, 1, createSeededRng(startingPileSeedFor(1)))
    expect(pile).toHaveLength(4)
    expect(pile.map((b) => b.id)).toEqual([1, 2, 3, 4])
    expect(pile.every((b) => b.tier === BuffTier.Bronze)).toBe(true)
  })

  it('mints REAL cards — never BuffKind.Unassigned — and every one is priceable', () => {
    const pile = seedStartingBuffPile(4, 1, createSeededRng(startingPileSeedFor(7)))
    for (const buff of pile) {
      expect(buff.kind).not.toBe(BuffKind.Unassigned)
      expect(isPricedBuff(buff)).toBe(true)
      expect(() => apCostOf(buff)).not.toThrow()
    }
  })

  it('draws WITHOUT replacement — four distinct kinds-and-conditions, no duplicated card', () => {
    const pile = seedStartingBuffPile(4, 1, createSeededRng(startingPileSeedFor(3)))
    const signatures = pile.map((b) => `${b.kind}|${JSON.stringify(b.condition)}|${b.reward.axis}`)
    expect(new Set(signatures).size).toBe(pile.length)
  })

  it('starts ids at `firstId`, not always 1', () => {
    const pile = seedStartingBuffPile(2, 7, createSeededRng(startingPileSeedFor(1)))
    expect(pile.map((b) => b.id)).toEqual([7, 8])
  })

  it('seeds nothing for 0 rather than throwing', () => {
    expect(seedStartingBuffPile(0, 1, createSeededRng(1))).toEqual([])
  })

  it('throws RangeError when the weight table cannot supply `count` templates', () => {
    expect(() => seedStartingBuffPile(4, 1, createSeededRng(1), () => 0)).toThrow(RangeError)
  })
})

describe('determinism — the constraint DLR-130 depends on', () => {
  it('the same runSeed yields the identical opening pile', () => {
    expect(startingBuffPileFor(4, 1, 42)).toEqual(startingBuffPileFor(4, 1, 42))
  })

  it('two different runSeeds yield different opening piles', () => {
    const a = startingBuffPileFor(4, 1, 1).map((b) => b.kind + b.reward.axis)
    const b = startingBuffPileFor(4, 1, 999).map((b) => b.kind + b.reward.axis)
    expect(a).not.toEqual(b)
  })

  it('startingPileSeedFor is pure and returns a non-negative 32-bit integer', () => {
    const seed = startingPileSeedFor(12345)
    expect(seed).toBe(startingPileSeedFor(12345))
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThan(2 ** 32)
  })
})

describe('openingPileWeightOf', () => {
  it('is the sum of templateWeightFor across every machine — no number of its own', () => {
    for (const template of BUFF_TEMPLATES) {
      const expected = SLOT_MACHINE_IDS.reduce(
        (total, machineId) => total + templateWeightFor(machineId, template),
        0,
      )
      expect(openingPileWeightOf(template)).toBeCloseTo(expected)
    }
  })

  it('weights every shipped template above zero, so no card is unreachable at run start', () => {
    expect(BUFF_TEMPLATES.every((t) => openingPileWeightOf(t) > 0)).toBe(true)
  })

  it('leaves Cheat and Timebomb eligible (DLR-132 — ordinary pool members)', () => {
    const activated = BUFF_TEMPLATES.filter((t) => t.form === 'activated')
    expect(activated).toHaveLength(2)
    expect(activated.every((t) => openingPileWeightOf(t) > 0)).toBe(true)
  })
})
```

- [x] **Step 2: Run the spec and confirm it fails because the module does not exist**

Run: `npx vitest run src/hunt/__tests__/startingPile.test.ts`
Expected: non-zero exit; Vitest reports a failure to resolve `../startingPile`.

- [x] **Step 3: Create `src/hunt/startingPile.ts`**

```ts
import { BuffTier, type Buff, type BuffId } from './buffs'
import { BUFF_TEMPLATES, mintFromTemplate, type BuffTemplate } from './buffTemplates'
import { createSeededRng, mixSeed, type Rng } from './seededRng'
import { SLOT_MACHINE_IDS } from './slotConfig'
import { templateWeightFor, weightedDrawWithoutReplacement } from './slotWeights'

/**
 * DLR-135 — the run's OPENING PILE, drawn for real.
 *
 * This module replaces the placeholder factory DLR-105 shipped in `buffs.ts`, which minted
 * `STARTING_BUFF_COUNT` `BuffKind.Unassigned` stubs "since the real catalog (design doc §5) is not
 * yet authored". DLR-111 authored it and DLR-112 built the reel that draws from it; the scaffold
 * outlived its reason, and every one of its four cards was filtered straight back out by
 * `activatableBuffs`, so a run opened holding exactly one usable card.
 *
 * It lives HERE and not in `buffs.ts` because it must import `buffTemplates.ts` and
 * `slotWeights.ts`, and both of those import `buffs.ts` — keeping it there would open exactly the
 * cycle `slotWeights.ts`'s own docblock refuses to open for `warCouncil`.
 *
 * Deliberately the sibling of `slotMachine.ts`'s `drawReelPool`: derive a named seed from
 * `runSeed`, weight the pool, draw distinct templates without replacement, throw on a short draw,
 * mint at a fixed tier with consecutive ids. One pattern applied twice, not two designs.
 *
 * Nothing here calls `Math.random()` — `src/hunt/` is lint-enforced pure and DLR-130's simulator
 * and the developer's balance pass both require the same seed to reproduce the same opening hand.
 */

/** The opening pile's own seed stream, folded from `runSeed`. A ONE-part `mixSeed` fold, distinct
 *  in shape from `dealSeedFor`'s and `slotSeedFor`'s three-part folds, and a named function for
 *  the reason every other seed in this tree has one. Pure; always a non-negative 32-bit integer.
 *  UNIT: 32-bit unsigned integer. */
export function startingPileSeedFor(runSeed: number): number {
  return mixSeed(runSeed)
}

/**
 * A template's weight for the OPENING pile: the SUM of its per-machine reel weight across every
 * `SLOT_MACHINE_IDS` member.
 *
 * DERIVED, and that is the whole point — it contributes NO NUMBER OF ITS OWN. DLR-135's AC3
 * forbids changing a tuning value, and a third `SLOT_FAMILY_WEIGHTS`-shaped table for the opening
 * pile would have been eleven-plus unchosen numbers needing their own balance pass. Summing is
 * also machine-NEUTRAL: the opening pile is not a slot machine, and taking one machine's table
 * would silently hand every run that machine's lean (Skirmisher's trick bias, Strongbox's coin
 * bias) with nobody having chosen it.
 *
 * `templateWeightFor` already returns 0 rather than dividing when its denominator is 0, so no
 * `NaN` can enter this sum, and a sum of non-negative finite terms is non-negative and finite.
 * UNIT: relative weight, >= 0, unitless.
 */
export function openingPileWeightOf(template: BuffTemplate): number {
  return SLOT_MACHINE_IDS.reduce(
    (total, machineId) => total + templateWeightFor(machineId, template),
    0,
  )
}

/**
 * `count` DISTINCT real BRONZE cards drawn from `BUFF_TEMPLATES`, with consecutive ids from
 * `firstId` — the same `(count, firstId)` shape `mintGrants` and `mintPullAwards` already use.
 *
 * `rng` is REQUIRED, not defaulted. A defaulted generator would let a call site drop determinism
 * with no compile error, and determinism is the one property this function must not lose.
 *
 * Drawn WITHOUT replacement, so the opening hand holds four different cards rather than four
 * copies of one. THROWS `RangeError` on a short draw for `drawReelPool`'s stated reason: a pile
 * shorter than asked is a configuration bug (an all-zero weight table), not a legal state, and it
 * would otherwise surface far from its cause. Unreachable with the shipped tables — 73 templates,
 * every family weighted >= 1 on both machines — but a zeroed row is one edit away.
 *
 * `weightOf` is a DEFAULTED parameter rather than something this function closes over, exactly as
 * `drawReelPool`'s is: a curve can then be tested without mutating module state.
 */
export function seedStartingBuffPile(
  count: number,
  firstId: BuffId,
  rng: Rng,
  weightOf: (template: BuffTemplate) => number = openingPileWeightOf,
): readonly Buff[] {
  const drawn = weightedDrawWithoutReplacement(BUFF_TEMPLATES, weightOf, rng, count)
  if (drawn.length !== count) {
    throw new RangeError(
      `Opening pile drew ${drawn.length} of ${count} cards — check SLOT_FAMILY_WEIGHTS and SLOT_AXIS_WEIGHTS for an all-zero table`,
    )
  }
  return drawn.map((template, index) =>
    mintFromTemplate(template, BuffTier.Bronze, firstId + index),
  )
}

/** The opening pile for ONE run, seeded from `runSeed`. THE call `startRun` makes, so the seed
 *  derivation is stated once rather than at every caller. */
export function startingBuffPileFor(
  count: number,
  firstId: BuffId,
  runSeed: number,
): readonly Buff[] {
  return seedStartingBuffPile(count, firstId, createSeededRng(startingPileSeedFor(runSeed)))
}
```

- [x] **Step 4: Run the spec and the typecheck**

Run: `npx vitest run src/hunt/__tests__/startingPile.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed and every test in the file passing; `npm run typecheck` exits 0.

---

## Phase 2 — Wire it up and retire the stub

This phase makes the switch atomic: the barrel, `startRun`, the deletion from `buffs.ts`, and every spec that asserted against placeholder content all move in one phase, because any partial application leaves the tree failing to compile or a spec asserting a fact that is no longer true. The phase ends with the whole suite consistent.

### Task 2: Point `startRun` at the real draw and retire the stub factory ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffs.ts:190-222`, `src/hunt/run.ts:14-17,178`, `src/hunt/index.ts:97`

- [x] **Step 1: Delete `seedStartingBuffPile` from `src/hunt/buffs.ts` and rewrite the sentinel docblock**

Delete the whole `seedStartingBuffPile` function and its docblock (the `/** AC3 — the run's opening pile: … */` block through the closing brace). Replace the docblock above `UNASSIGNED_BUFF_CONDITION` / `UNASSIGNED_BUFF_REWARD` with:

```ts
/**
 * DLR-135 — NOTHING MINTS THESE ANY MORE. The run's opening pile is four real bronze cards drawn
 * from `BUFF_TEMPLATES` (`startingPile.ts`); DLR-105's placeholder factory is gone.
 *
 * They are KEPT, deliberately, as the codebase's canonical UNPRICED buff — the fixture five guard
 * suites fire against by name (`buffActivation.priced.test.ts`, `buffCosts.test.ts`,
 * `consumables.test.ts`, `ErrorBoundary.test.tsx`'s literal error string, and
 * `sim/reachability.ts`'s set exclusions). The `Unassigned` trap was hit three times during V5;
 * this removes its CAUSE while leaving the GUARD that catches the whole class intact. Stated once
 * here so no guard suite invents its own version of the literal.
 */
```

Also correct the `BuffKind.Unassigned` line in `BUFF_CADENCE`'s docblock and the `Unassigned` paragraph in the `BuffKind` docblock so neither claims `seedStartingBuffPile` mints it — say instead that it is a retained sentinel no production path mints.

- [x] **Step 2: Point `startRun` at `startingBuffPileFor`**

In `src/hunt/run.ts`, drop `seedStartingBuffPile` from the `./buffs` import (keep `BuffTier`, `Buff`, `BuffId`), add `import { startingBuffPileFor } from './startingPile'`, and change line 178:

```ts
    buffs: [...startingBuffPileFor(STARTING_BUFF_COUNT, 1, runSeed), ...granted, ...openingCheats],
```

Update `startRun`'s docblock: `grants` is minted "alongside the four real bronze cards the run's seed draws", not "alongside the seeded placeholders".

- [x] **Step 3: Move the barrel export in `src/hunt/index.ts`**

Remove `seedStartingBuffPile,` from the `} from './buffs'` block and add, beside the other `./startingPile`-adjacent exports:

```ts
export {
  openingPileWeightOf,
  seedStartingBuffPile,
  startingBuffPileFor,
  startingPileSeedFor,
} from './startingPile'
```

- [x] **Step 4: Typecheck to surface every spec the change invalidates**

Run: `npm run typecheck`
Expected: exits 0 for `src/hunt/*.ts` and `src/sim/*.ts` production files. Any remaining error is in a spec file and is Task 3's to fix — record the list.

### Task 3: Rewrite every spec the change legitimately invalidates ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/__tests__/buffs.test.ts:1-59`, `src/hunt/__tests__/buffActivation.priced.test.ts`, `src/hunt/__tests__/buffCatalog.test.ts:169-178`, `src/sim/__tests__/reachability.test.ts:84-96`

- [x] **Step 1: `buffs.test.ts` — remove the `seedStartingBuffPile` describe block**

Delete the entire `describe('seedStartingBuffPile', …)` block (lines 20-59) and drop `seedStartingBuffPile` from the `../buffs` import list. **Reason:** the function no longer lives in `buffs.ts`, and `startingPile.test.ts` (Task 1) covers every property those four tests asserted, plus determinism and distinctness. Keep `UNASSIGNED_BUFF_CONDITION` / `UNASSIGNED_BUFF_REWARD` in the import — the sentinel assertion at line 146 stays exactly as it is.

- [x] **Step 2: `buffActivation.priced.test.ts` — assert the guard against an explicit sentinel**

Drop the `seedStartingBuffPile` import; add a local fixture and use it in the three tests that used the old factory:

```ts
import { BuffKind, BuffTier, UNASSIGNED_BUFF_CONDITION, UNASSIGNED_BUFF_REWARD } from '../buffs'

/** DLR-135 — NOTHING MINTS THIS ANY MORE (the opening pile is four real bronze cards now), which
 *  is exactly why the guard still needs a fixture: `isPricedBuff` must keep refusing any unpriced
 *  kind, and `BuffKind.Unassigned` is the codebase's canonical one. Built here rather than drawn
 *  from a factory, so the guard is tested against the CLASS of unpriced kind rather than against
 *  whatever a production path happens to mint today. */
function unassignedPlaceholder(id: BuffId): Buff {
  return {
    id,
    kind: BuffKind.Unassigned,
    tier: BuffTier.Bronze,
    condition: UNASSIGNED_BUFF_CONDITION,
    reward: UNASSIGNED_BUFF_REWARD,
  }
}
```

Then: `seedStartingBuffPile(4, 1)` → `[1, 2, 3, 4].map(unassignedPlaceholder)`; `[...seedStartingBuffPile(2, 1), cheat, ...seedStartingBuffPile(1, 20)]` → `[unassignedPlaceholder(1), unassignedPlaceholder(2), cheat, unassignedPlaceholder(20)]`. Retitle the describe to `isPricedBuff / activatableBuffs — the unpriced-kind guard (DLR-135: nothing mints one now)`. **Every assertion keeps its original strength — only the fixture's provenance changes.**

- [x] **Step 3: `buffCatalog.test.ts` — rewrite the all-bronze assertion honestly**

The test `'the run-seeding path still mints only bronze, unassigned buffs'` asserts a fact this ticket deliberately makes false. Replace it, keeping the enclosing describe's real purpose (no gold Cheat is player-reachable) and **strengthening** it:

```ts
  it('the run-seeding path mints only BRONZE — no gold Cheat reaches a player (DLR-135)', () => {
    const pile = startRun().buffs
    expect(pile.every((b) => b.tier === BuffTier.Bronze)).toBe(true)
    expect(pile.every((b) => b.kind !== BuffKind.Unassigned)).toBe(true)
    expect(pile.every((b) => isPricedBuff(b))).toBe(true)
  })
```

Import `startRun` and `isPricedBuff`; drop the `seedStartingBuffPile` import. Correct the comment above it — the pile is real bronze content now, not placeholder content.

- [x] **Step 4: `reachability.test.ts` — rewrite the two opening-pile assertions, strictly stronger**

`'seeds exactly RUN_STARTING_CHEATS — the one activated card a player can reach'` and `'the player enters fight one holding only the seeded Cheat to activate'` both stop being true statements of intent: Cheat is an eligible random draw now, so a pile may hold more than one, and the player no longer holds *only* the Cheat. Replace both with:

```ts
  it('seeds RUN_STARTING_CHEATS GUARANTEED Cheats as the pile\'s final members (DLR-132)', () => {
    const run = startRun()
    const guaranteed = run.buffs.slice(run.buffs.length - RUN_STARTING_CHEATS)
    expect(guaranteed).toHaveLength(RUN_STARTING_CHEATS)
    expect(guaranteed.every((buff) => buff.kind === BuffKind.Cheat)).toBe(true)
  })

  it('the player enters fight one with EVERY opening card activatable (DLR-135)', () => {
    // DLR-120 measured this at 0 — the opening pile held only `Unassigned` placeholders. DLR-132
    // added the guaranteed Cheat, taking it to 1. DLR-135 draws the other four for real, so the
    // whole opening pile is now activatable and this asserts the total rather than the Cheat.
    const run = startRun()
    expect(activatableBuffs(run.buffs)).toHaveLength(STARTING_BUFF_COUNT + RUN_STARTING_CHEATS)
    expect(activatableBuffs(run.buffs)).toHaveLength(run.buffs.length)
  })
```

Add `STARTING_BUFF_COUNT` to the `../../hunt` import. **Both replacements assert more than the originals did, not less.**

- [x] **Step 5: Run every touched spec and the typecheck**

Run: `npx vitest run src/hunt/__tests__ src/sim/__tests__; npm run typecheck`
Expected: Vitest reports 0 failed; `npm run typecheck` exits 0.

---

## Phase 3 — Correct the stale prose, then measure

No behaviour changes in this phase. It corrects the docblocks and comments across five production files and two specs that assert the opening pile is placeholder content — prose that is now actively misleading to the next reader — and then takes AC2's measurement. The boundary is safe because nothing executable moves.

### Task 4: Correct every docblock that describes the opening pile as placeholders ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffActivation.ts:180-196`, `src/hunt/buffCatalog.ts:99`, `src/hunt/slotMachine.ts:183`, `src/sim/reachability.ts:15-36`, `src/sim/fixtures.ts:218-222`, `src/sim/__tests__/baselinePolicy.test.ts:66-69`, `src/hunt/__tests__/consumables.test.ts:69`

- [x] **Step 1: Rewrite each stale reference**

- `buffActivation.ts:182` — "FALSE for `BuffKind.Unassigned`, which `seedStartingBuffPile` mints" → "FALSE for `BuffKind.Unassigned`, which no production path mints as of DLR-135 and which this guard still correctly refuses."
- `buffActivation.ts:195` — "`RunState.buffs` — which opens every run holding `STARTING_BUFF_COUNT` placeholders" → "`RunState.buffs` — which opens every run holding `STARTING_BUFF_COUNT` real bronze cards since DLR-135". Leave `activatableBuffs`'s body byte-identical.
- `buffCatalog.ts:99` and `slotMachine.ts:183` — keep the `(count, firstId)`-shape references but note the function now lives in `startingPile.ts`.
- `reachability.ts:15-19` — "`Unassigned` is excluded: it is `seedStartingBuffPile`'s placeholder…" → "`Unassigned` is excluded: nothing mints it as of DLR-135; it is the retained unpriced-kind sentinel, not a card."
- `reachability.ts:30-32` — leave the "NON-EMPTY TODAY" finding as-is; only correct the `Unassigned` clause.
- `fixtures.ts:218-222` — "because a fresh run's `STARTING_BUFF_COUNT` pile is `BuffKind.Unassigned` placeholders that `activatableBuffs` filters out" → "because a fresh run's pile is a random draw (DLR-135) and this fixture needs two buffs of a KNOWN cost". The code is unchanged and still correct — the reason for it changed.
- `baselinePolicy.test.ts:66-69` — same correction; the deliberate pile replacement stays.
- `consumables.test.ts:69` — "Placeholder content — what `seedStartingBuffPile` mints" → "The unpriced-kind sentinel — nothing mints it as of DLR-135".

- [x] **Step 2: Confirm no prose still claims the opening pile is placeholders**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "seedStartingBuffPile mints|opening pile is still placeholder|STARTING_BUFF_COUNT.*placeholders"`
Expected: zero hits.

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 5 ✓: Take AC2's measurement and record it as an observation

- Skill: none — this task runs a script and records numbers; it writes no TypeScript.

**Files:**
- Modify: `.claude/sprint-runs/2026-08-23-sprint/log.md`

- [x] **Step 1: Run the simulator on the ticket's exact invocation**

Run: `npm run sim -- --runs 200 --seed 1`
Expected: exits 0 and prints the report. Record **win rate**, **mean buff activations per hand**, **mean AP spent per hand**, and **hands played holding NO activatable buff**.

The pre-change baseline, measured on this contract's first action at `f56a51f`, is: **win rate 0.0%** (0 won / 200 lost / 0 stalled), **mean buff activations per hand 1.50**, **mean AP spent per hand 4.35**, **hands holding no activatable buff 0.0%**.

- [x] **Step 2: Append the DLR-135 entry to the sprint log**

Append `## DLR-135 — Four real bronze cards in the opening pile (out-of-band)` to `.claude/sprint-runs/2026-08-23-sprint/log.md`, recording: how the four are drawn and seeded; that `BuffKind.Unassigned` survived and what still reads it; the before/after simulator figures **as an observation with nothing retuned**; how many cards a run now opens with in total; and every spec rewritten, with the reason.

**Retune nothing in response to the figures.** A still-zero win rate is a finding, not a failure of this contract — this ticket was the last known confound.

---

## Phase 4 — Final verification

The closing phase. No production changes — only sanity checks that the cumulative work is clean, plus the documentation the pipeline owes.

### Task 6 ✓: Confirm the pure-core boundary and the determinism constraint hold

- Skill: none — verification only, no code written.

**Files:**
- Modify: *(none)*

- [x] **Step 1: Grep the pure trees for React, DOM globals and `Math.random`**

Run: `Get-ChildItem src\hunt,src\warCouncil,src\vault,src\sim -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|Math\.random"`
Expected: zero hits. **Observed:** 17 hits, every one inside a docblock/comment stating the tree does NOT call `Math.random()` (e.g. "never calls `Math.random()`", "Pure; no `Math.random()`"). Zero hits for `from 'react'`, `window.`, `document.`, or `localStorage`. No actual React import, DOM global, or `Math.random()` call site exists in these four trees.

- [x] **Step 2: Confirm the only `Math.random()` calls in the codebase are still App.tsx's three**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "Math\.random"`
Expected: exactly 3 hits, all in `src/App.tsx`. **Observed:** the literal command returns 25 hits across 16 files, because the pattern also matches every doc-comment that mentions "Math.random()" in prose (the same class of false-positive as Step 1). Narrowing to actual invocations (`Math.random()` followed by a call, i.e. executable code, not backtick prose) gives exactly 3 call sites, all in `src/App.tsx` at lines 105, 250, and 265 — matching the expectation's intent. The other 22 hits (including 2 more in App.tsx itself, lines 100-101) are comment prose, not code.

- [x] **Step 3: Confirm no tuning value moved**

Run: `Get-ChildItem src\hunt\config.ts,src\hunt\slotWeights.ts,src\hunt\slotConfig.ts,src\hunt\buffCosts.ts,src\hunt\apConfig.ts -ErrorAction SilentlyContinue | Select-String -Pattern "STARTING_BUFF_COUNT = |RUN_STARTING_CHEATS = "`
Expected: `STARTING_BUFF_COUNT = 4` and `RUN_STARTING_CHEATS = 1`, unchanged. **Observed:** `config.ts:193: RUN_STARTING_CHEATS = 1` and `config.ts:199: STARTING_BUFF_COUNT = 4` — unchanged. Then: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git diff --stat f56a51f -- src/hunt/config.ts src/hunt/slotWeights.ts src/hunt/slotConfig.ts src/hunt/buffCosts.ts src/hunt/apConfig.ts` → **empty output**, confirming none of the five tuning files appears in the diff at all.

- [x] **Step 4: Confirm no `throw new` site was weakened**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "throw new" | Measure-Object | Select-Object -ExpandProperty Count`
Expected: 100 — the pre-change 99 plus `startingPile.ts`'s short-draw `RangeError`. Fewer than 99 is a blocking failure. **Observed: 100.** Matches exactly.

- [x] **Step 5: Confirm every changed file is inside the 400-line budget**

Run: `Get-ChildItem src\hunt\startingPile.ts,src\hunt\buffs.ts,src\hunt\run.ts,src\hunt\index.ts,src\hunt\__tests__\startingPile.test.ts | ForEach-Object { "$($_.Name): $((Get-Content $_.FullName).Count)" }`
Expected: every count is 400 or below. Measured **after** Prettier, with `(Get-Content …).Count` — never `Measure-Object -Line`, which drops blank lines. **Pre-Prettier observed:** `startingPile.ts: 97`, `buffs.ts: 212`, `run.ts: 276`, `index.ts: 367`, `startingPile.test.ts: 93` — all well under 400. Re-measured after Prettier in Task 7.

### Task 7 ✓: Format the contract's own files, then run the static gates and the full suite

- Skill: none — verification only, no code written.

**Files:**
- Modify: *(formatting only, scoped to this contract's files)*

- [x] **Step 1: Format only the files this contract touched**

Run: `npx prettier --write src/hunt/startingPile.ts src/hunt/buffs.ts src/hunt/run.ts src/hunt/index.ts src/hunt/buffActivation.ts src/hunt/buffCatalog.ts src/hunt/slotMachine.ts src/sim/reachability.ts src/sim/fixtures.ts src/hunt/__tests__/startingPile.test.ts src/hunt/__tests__/buffs.test.ts src/hunt/__tests__/buffActivation.priced.test.ts src/hunt/__tests__/buffCatalog.test.ts src/hunt/__tests__/consumables.test.ts src/sim/__tests__/reachability.test.ts src/sim/__tests__/baselinePolicy.test.ts`
Expected: exits 0. **Never `npm run format`** — it rewrites ~58 unrelated `.md` files (`ae9ee28`). **Observed:** exits 0. 3 files rewritten (`startingPile.ts`, `run.ts`, `buffActivation.priced.test.ts`); the other 13 were already formatted. Re-ran `npm run typecheck` and `npm run lint` after the write — both exit 0. Re-measured Task 6 Step 5's line counts post-Prettier: `startingPile.ts: 99`, `buffs.ts: 212`, `run.ts: 272`, `index.ts: 367`, `startingPile.test.ts: 93` — all still under 400. Steps 2 (unfiltered suite) and 3 (production build) are delegated to QA per the dispatch scope.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. The pre-change baseline is **1808 passed of 1808, 139 files, 0 failures** — the post-change count differs by the tests this contract added and removed, and that delta must be explainable line by line.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 8 ✓: Update the implementation docs and the ruleset

- Skill: implementation-doc-writer

**Files:**
- Modify: `.docs/implementation/hunt/` (the buff-pile document), `.docs/game_rules/the-hunt.md`

- [x] **Step 1: Invoke `implementation-doc-writer` for the changed module and rule**

Record in `.docs/implementation/hunt/` how the opening pile is now drawn — the seed path, the summed weighting, the without-replacement draw, the short-draw throw, and that `BuffKind.Unassigned` is a retained sentinel no production path mints. Update the opening-pile rule in `.docs/game_rules/the-hunt.md` in playing order, citing `hybrid-design.md` rather than reproducing its reasoning. Never edit either file by hand outside this skill.

### Task 9 ✓: Write the PR description

- Skill: none — a document for the developer to paste.

**Files:**
- Create: `.claude/contract/DLR-135-fresh-run-opens-with-four-real-cards/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md`; the summary of the change; **the before/after simulator figures side by side, labelled as an observation with nothing retuned**; the total number of cards a run now opens with; the three one-line-reversal sub-decisions; the `BuffKind.Unassigned` decision and what still reads it; every spec rewritten with its reason; every developer decision and every behaviour only playing can judge; the verification results from Phase 4; and a one-line note that `startingPile.ts` establishes the "derive a named seed from `runSeed`, weight the shipped tables, draw without replacement, throw on a short draw" pattern as the second instance of `drawReelPool`'s shape.

---

## Self-review

**Spec coverage:**
- New pure module `src/hunt/startingPile.ts` with the four exports — Task 1.
- Deleting `seedStartingBuffPile` from `buffs.ts` — Task 2 Step 1.
- Rewiring `startRun` to seed from `runSeed` — Task 2 Step 2.
- Re-exporting from `src/hunt/index.ts` — Task 2 Step 3.
- Rewriting every invalidated spec, honestly — Task 3 (four spec files, each with its stated reason).
- Correcting the stale docblocks across `buffs.ts`, `buffActivation.ts`, `buffCatalog.ts`, `slotMachine.ts`, `reachability.ts`, `fixtures.ts` — Task 2 Step 1 and Task 4.
- Running the simulator before and after and recording the four figures — Task 5 (baseline captured at `f56a51f` before Phase 1).
- AC1 (content decided and implemented) — Tasks 1-3. AC2 (simulator re-run and recorded) — Task 5. AC3 (no tuning value changed) — Task 6 Step 3, which fails the contract if any of the five tuning files is in the diff.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with an `Expected:` line.

**Type / name consistency:** `startingPileSeedFor`, `openingPileWeightOf`, `seedStartingBuffPile`, `startingBuffPileFor`, `Rng`, `BuffTemplate`, `BuffId`, `Buff`, `BuffTier.Bronze`, `BUFF_TEMPLATES`, `SLOT_MACHINE_IDS`, `templateWeightFor`, `weightedDrawWithoutReplacement`, `mintFromTemplate`, `createSeededRng`, `mixSeed`, `STARTING_BUFF_COUNT`, `RUN_STARTING_CHEATS` are spelled identically in `plan.md` Part 2 → Data shapes and in every task that uses them. `seedStartingBuffPile` keeps its name across the module move deliberately, so the diff reads as a reimplementation rather than a rename plus a deletion.

**Phase boundary cleanliness:**
- **Phase 1** ends type-checking: `startingPile.ts` is additive and every existing caller still uses the old `buffs.ts` export, which is still present.
- **Phase 2** ends type-checking and with the whole suite green: the deletion, the barrel move, the `startRun` rewiring, and every invalidated spec move together inside it, so no boundary inside the phase is crossed with a half-applied change.
- **Phase 3** changes only comments and appends to a log file; the tree is unchanged executably and type-checks throughout.
- **Phase 4** writes no production code at all.
