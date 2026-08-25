# Tasks: Cheat, Timebomb and Shield become single-use (reversibly); buff tier shown on the loadout rail

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: PLANNED
Started: 2026-08-25

**Goal:** Cheat, Timebomb and Shield stop being infinitely-reusable Activated cards and become one-shot items by default, via a per-card developer-owned toggle (`ACTIVATED_CARD_SINGLE_USE`) rather than a structural merge into the existing five-item consumable set; separately, every buff row on the loadout rail states its tier (Bronze/Silver/Gold).

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** (none — no new files)

**Modified:**
- `src/hunt/consumables.ts` — add `ACTIVATED_CARD_SINGLE_USE`, `ActivatedItemKind`, `isActivatedSingleUseKind`; change `isConsumableItem`'s body; correct the module-level docblock (lines 22–30) that states Cheat/Timebomb/Shield stay in the pile as settled fact
- `src/hunt/buffActivation.ts:152-154` — correct `activateFromPile`'s docblock ("pass through with the pile UNCHANGED") to name the new toggle
- `src/app/warCouncil/buffHandlers.ts` — wire `activateShield` into `handleTapBuff`'s `encounter` field, mirroring the existing Ward line; correct the docblock at lines 148-150 that states Cheat/Timebomb never leave the pile
- `src/app/warCouncil/roundBars.ts` — correct the docblock at line 47 (Shield unreachable because nothing calls `activateShield` → unreachable because nothing mints one)
- `src/app/warCouncil/buffLabels.ts` — add `BUFF_TIER_WORD`, prefix it in `buffLine`
- `src/hunt/__tests__/consumables.test.ts` — update `isConsumableItem` whole-buff test; add `ACTIVATED_CARD_SINGLE_USE` coverage
- `src/hunt/__tests__/buffActivation.test.ts:160-167` — flip the Cheat pile-persistence assertion
- `src/app/warCouncil/__tests__/buffHandlers.test.ts` — flip two Cheat pile-persistence assertions
- `src/app/warCouncil/__tests__/roundReducer.test.ts:352` — flip the two-Cheat pile-count assertion
- `src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts:78-82` — flip the Timebomb pile-persistence assertion
- `src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx:228-254` — flip the `onComplete` pile-contents assertion
- `src/app/warCouncil/__tests__/buffLabels.test.ts:38-41` — update the hard-coded `buffLine` expectation for the new tier prefix

**Deleted:** (none)

**Developer decides or observes:** (none — every value in this contract is a shipped default or a mechanical edit; see `plan.md` Part 2 → Risks and judgement calls for the two judgement calls already made explicit there: wiring `activateShield` now, and the `Bronze`/`Silver`/`Gold` wording)

---

## Phase 1 — The reversible single-use toggle

This phase adds `ACTIVATED_CARD_SINGLE_USE` to `src/hunt/consumables.ts` and makes `isConsumableItem` read it, then corrects the one docblock outside that file whose claim it falsifies. It is a safe stopping point: `isConsumableItem`'s new behaviour is exercised by this phase's own tests, and every other file in the codebase still compiles unchanged because nothing outside `consumables.ts` and `buffActivation.ts`'s docblock references the old claim in a way the type checker sees.

### Task 1: Add `ACTIVATED_CARD_SINGLE_USE` and change `isConsumableItem` in `src/hunt/consumables.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/consumables.ts`
- Test: `src/hunt/__tests__/consumables.test.ts`

- [ ] **Step 1: Write the failing tests for the new toggle and the changed `isConsumableItem` behaviour**

In `src/hunt/__tests__/consumables.test.ts`, add `ACTIVATED_CARD_SINGLE_USE` to the import from `../consumables`, and add two Activated-card helpers beside the existing `cheat()`:

```ts
/** A Timebomb — an Activated card whose single-use-ness is `ACTIVATED_CARD_SINGLE_USE`'s to say. */
function timebomb(id = 92): Buff {
  return {
    id,
    kind: BuffKind.Timebomb,
    tier: BuffTier.Bronze,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
  }
}

/** A Shield — an Activated card whose single-use-ness is `ACTIVATED_CARD_SINGLE_USE`'s to say. */
function shield(id = 93): Buff {
  return {
    id,
    kind: BuffKind.Shield,
    tier: BuffTier.Bronze,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.HeartCount, value: 1 },
  }
}
```

Replace the existing test:

```ts
  it('is true through isConsumableItem for a whole buff', () => {
    expect(isConsumableItem(itemBuff(BuffKind.Ward, BuffTier.Bronze))).toBe(true)
    expect(isConsumableItem(cheat())).toBe(false)
  })
```

with:

```ts
  it('is true through isConsumableItem for a DLR-111 item, unaffected by the new toggle', () => {
    expect(isConsumableItem(itemBuff(BuffKind.Ward, BuffTier.Bronze))).toBe(true)
  })
```

and add a new describe block after the `isConsumableItemKind` block:

```ts
describe('ACTIVATED_CARD_SINGLE_USE — DLR-142, the developer-owned revert switch', () => {
  it('defaults to true for Cheat, Timebomb and Shield', () => {
    expect(ACTIVATED_CARD_SINGLE_USE[BuffKind.Cheat]).toBe(true)
    expect(ACTIVATED_CARD_SINGLE_USE[BuffKind.Timebomb]).toBe(true)
    expect(ACTIVATED_CARD_SINGLE_USE[BuffKind.Shield]).toBe(true)
  })

  it('isConsumableItem now removes Cheat, Timebomb and Shield from the pile, since their toggle defaults true', () => {
    expect(isConsumableItem(cheat())).toBe(true)
    expect(isConsumableItem(timebomb())).toBe(true)
    expect(isConsumableItem(shield())).toBe(true)
  })
})
```

Run: `npx vitest run src/hunt/__tests__/consumables.test.ts`
Expected: fails — `ACTIVATED_CARD_SINGLE_USE` does not exist yet, and the new `isConsumableItem` assertions read `false` from the unchanged implementation.

- [ ] **Step 2: Add the toggle and change `isConsumableItem`'s body in `src/hunt/consumables.ts`**

Replace the module-level docblock at lines 22–30 (the one starting "The five one-shot items. Cheat, Timebomb and Shield are DELIBERATELY EXCLUDED…") with:

```ts
/**
 * The five one-shot items DLR-111 names. Cheat, Timebomb and Shield are a SEPARATE, additive rule
 * layered on top of this fixed five-member set, not folded into it — see
 * `ACTIVATED_CARD_SINGLE_USE` below. All three are `BuffCadence.Activated` and all three are
 * priced through `buffCosts.ts`'s `CONSUMABLE_AP_COST`, but each ARMS FELT STATE at the spend
 * rather than (or in addition to) leaving the pile — a Cheat sets `cheatTricksRemaining`, a
 * Timebomb sets `timebombArmedDamage`, `activateShield` credits shield hearts. Whether the spent
 * card ALSO leaves the pile is `ACTIVATED_CARD_SINGLE_USE`'s question, not this union's — DLR-142
 * defaults all three to single-use, reversible per card with a one-line edit to that toggle.
 * "Consumable" here means the narrower thing DLR-111 names — spent ONCE and gone from the pile —
 * not the wider `CONSUMABLE_AP_COST` pricing bucket that happens to share the word.
 */
```

Immediately after the existing `isConsumableItemKind` function (after line 149, before the current `isConsumableItem`), insert:

```ts
/** The three Activated cards whose single-use-ness is a developer-owned toggle rather than the
 *  fixed DLR-111 five-item set's rule. */
type ActivatedItemKind = typeof BuffKind.Cheat | typeof BuffKind.Timebomb | typeof BuffKind.Shield

/**
 * Whether spending this Activated card ALSO removes it from the pile, on top of the felt-state
 * effect it always arms (`handleTapBuff`'s `cheatTricksRemaining` / `timebombArmedDamage` /
 * `activateShield`). Default `true` for all three as of 2026-08-25 — a player who spams Timebomb
 * now runs out of Timebombs. TO REVERT ONE CARD to "stays in the pile, spend it again next trick,"
 * flip that entry to `false` here. Nothing else in this module, and no other file, needs to change
 * — `isConsumableItem` below is the only reader.
 */
export const ACTIVATED_CARD_SINGLE_USE: Readonly<Record<ActivatedItemKind, boolean>> = {
  [BuffKind.Cheat]: true,
  [BuffKind.Timebomb]: true,
  [BuffKind.Shield]: true,
}

const ACTIVATED_ITEM_KINDS: ReadonlySet<BuffKind> = new Set(
  Object.keys(ACTIVATED_CARD_SINGLE_USE) as ActivatedItemKind[],
)

function isActivatedSingleUseKind(kind: BuffKind): kind is ActivatedItemKind {
  return ACTIVATED_ITEM_KINDS.has(kind)
}
```

Replace `isConsumableItem`'s body:

```ts
/** Whether `buff` is a one-shot item — the predicate `activateFromPile` branches on to decide
 *  whether an activation also SPENDS the card. TRUE for the five DLR-111 items, and true for
 *  Cheat/Timebomb/Shield exactly when `ACTIVATED_CARD_SINGLE_USE` says so for that kind — see that
 *  constant's own docblock for how to revert one card. */
export function isConsumableItem(buff: Buff): boolean {
  if (isConsumableItemKind(buff.kind)) return true
  return isActivatedSingleUseKind(buff.kind) && ACTIVATED_CARD_SINGLE_USE[buff.kind]
}
```

Run: `npx vitest run src/hunt/__tests__/consumables.test.ts`
Expected: all tests in this file pass.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

### Task 2: Correct `activateFromPile`'s stale docblock in `src/hunt/buffActivation.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffActivation.ts:152-154`

- [ ] **Step 1: Replace the stale claim**

Replace:

```ts
 * Cheat, Timebomb and Shield pass through with the pile UNCHANGED. They are `Activated` cards with
 * their own live mechanics, not items held until used — see `consumables.ts`'s own docblock on why
 * "consumable" is narrower here than `buffCosts.ts`'s pricing bucket of the same name.
 */
```

with:

```ts
 * Cheat, Timebomb and Shield are `Activated` cards with their own live mechanics, not items held
 * until used — but DLR-142's `ACTIVATED_CARD_SINGLE_USE` (defaulted `true` for all three) means
 * `isConsumableItem` also removes them from the pile here, same as the five DLR-111 items, unless
 * that toggle is flipped for a given card. See `consumables.ts`'s own docblock for the full
 * distinction and how to revert one card to "stays in the pile."
 */
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

---

## Phase 2 — Wire Shield's effect into the felt layer

This phase wires `activateShield` into `handleTapBuff` so Shield's effect fires for the first time, and corrects the one docblock elsewhere that describes it as never wired. It depends on nothing from Phase 1 and Phase 1 depends on nothing from it — both phases leave the codebase type-checking and internally consistent on their own.

### Task 3: Wire `activateShield` into `handleTapBuff` in `src/app/warCouncil/buffHandlers.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/buffHandlers.ts`

- [ ] **Step 1: Add `activateShield` to the `hunt` import**

In the `import { ... } from '../../hunt'` block near the top of the file, add `activateShield` alongside the existing `activateWard`:

```ts
import {
  activateFromPile,
  activateShield,
  activateWard,
  buffActivationRefusalFor,
  BuffActivationRefusal,
  BuffKind,
  cheatDurationTricksOf,
  extraDiscardCharges,
  timebombDamageOf,
  type Buff,
  type BuffId,
} from '../../hunt'
```

- [ ] **Step 2: Extend the `encounter` field in `handleTapBuff`'s returned object literal**

Replace:

```ts
    encounter:
      buff.kind === BuffKind.Ward ? activateWard(state.encounter, buff.tier) : state.encounter,
```

with:

```ts
    encounter:
      buff.kind === BuffKind.Ward
        ? activateWard(state.encounter, buff.tier)
        : buff.kind === BuffKind.Shield
          ? activateShield(state.encounter, buff.tier)
          : state.encounter,
```

- [ ] **Step 3: Correct the stale comment two lines below**

Replace:

```ts
    // DLR-132 — Cheat and Timebomb fire HERE too, beside Ward, for the reason the comment above
    // already states. Neither leaves the pile — `isConsumableItem` is false for both, which is
    // exactly what `activateFromPile`'s docblock says and why `buffs` is unchanged for them.
    // `cheatDurationTricksOf`/`timebombDamageOf` both throw on the wrong kind; each is called only
    // inside a branch that has already checked `buff.kind`, so neither throw is reachable here.
```

with:

```ts
    // DLR-132/DLR-142 — Cheat and Timebomb fire HERE too, beside Ward and Shield. All three now
    // also leave the pile once spent, by default (`ACTIVATED_CARD_SINGLE_USE`, read through
    // `isConsumableItem` inside `activateFromPile` above) — this block only arms the felt-state
    // effect; pile removal already happened above. `cheatDurationTricksOf`/`timebombDamageOf` both
    // throw on the wrong kind; each is called only inside a branch that has already checked
    // `buff.kind`, so neither throw is reachable here.
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

### Task 4: Correct the stale "unreachable" reasoning in `src/app/warCouncil/roundBars.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/roundBars.ts`

- [ ] **Step 1: Replace the stale claim**

Replace:

```ts
 * Fixing it exactly needs `ResolvedTrick` to record the absorption, which is engine/state work
 * this ticket's Scope Boundaries put out of bounds. Unreachable today because nothing in the app
 * layer calls `activateShield`, so `shieldHearts` is always `0` in real play.
 */
```

with:

```ts
 * Fixing it exactly needs `ResolvedTrick` to record the absorption, which is engine/state work
 * this ticket's Scope Boundaries put out of bounds. Unreachable today because nothing mints a
 * Shield buff into any drawable pool yet (DLR-142) — `activateShield` is wired into
 * `handleTapBuff` and fires correctly once a Shield exists, but `shieldHearts` stays `0` in real
 * play until one does.
 */
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

---

## Phase 3 — Flip every test that asserted the old pile-persistence behaviour

This phase updates the five test files the Step 1.6 audit enumerated, each of which hard-codes an assertion that Cheat, Timebomb or Shield stays in the pile after being spent — now false by construction after Phases 1–2. Each task is independent of the others; together they bring the full suite back to green. The phase ends with the codebase type-checking and every test file internally consistent with the new behaviour.

### Task 5: Flip the Cheat pile-persistence assertion in `src/hunt/__tests__/buffActivation.test.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/__tests__/buffActivation.test.ts:160-167`
- Test: `src/hunt/__tests__/buffActivation.test.ts`

- [ ] **Step 1: Replace the test**

Replace:

```ts
  it('leaves the pile UNCHANGED for a Cheat — an Activated card is not a one-shot item', () => {
    const cheat = cheatBuff(BuffTier.Bronze, 3)
    const pile: readonly Buff[] = [cheat]

    const { activation, buffs } = activateFromPile(startBuffActivation(), pile, cheat, true)

    expect(buffs).toEqual(pile)
    expect(activation.activatedThisTrick).toEqual([3])
  })
```

with:

```ts
  it('removes a Cheat from the pile too — DLR-142, Activated cards default to single-use', () => {
    const cheat = cheatBuff(BuffTier.Bronze, 3)
    const pile: readonly Buff[] = [cheat]

    const { activation, buffs } = activateFromPile(startBuffActivation(), pile, cheat, true)

    expect(buffs).toHaveLength(0)
    expect(activation.activatedThisTrick).toEqual([3])
  })
```

- [ ] **Step 2: Run the scoped test**

Run: `npx vitest run src/hunt/__tests__/buffActivation.test.ts`
Expected: all tests pass.

### Task 6: Flip the two Cheat pile-persistence assertions in `src/app/warCouncil/__tests__/buffHandlers.test.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/__tests__/buffHandlers.test.ts`
- Test: `src/app/warCouncil/__tests__/buffHandlers.test.ts`

- [ ] **Step 1: Replace the first assertion, in the "a consumable item leaves the pile at the spend" describe block**

Replace:

```ts
  it('a Cheat is activated but NOT consumed — an Activated card is not a one-shot item', () => {
    const after = spend(openWith([cheat]), cheat.id)
    expect(after.buffs.map((b) => b.id)).toEqual([cheat.id])
    expect(after.buffActivation.activatedThisTrick).toEqual([cheat.id])
  })
```

with:

```ts
  it('a Cheat is spent and removed from the pile — DLR-142, Activated cards default to single-use', () => {
    const after = spend(openWith([cheat]), cheat.id)
    expect(after.buffs).toHaveLength(0)
    expect(after.buffActivation.activatedThisTrick).toEqual([cheat.id])
  })
```

- [ ] **Step 2: Replace the second assertion, in the "spending a Cheat row" describe block**

Replace:

```ts
  it('leaves the pile unchanged when a Cheat is spent', () => {
    const before = openWith([cheat])
    const after = spend(before, cheat.id)
    expect(after.buffs).toHaveLength(before.buffs.length)
  })
```

with:

```ts
  it('removes the Cheat from the pile once spent — DLR-142', () => {
    const before = openWith([cheat])
    const after = spend(before, cheat.id)
    expect(after.buffs).toHaveLength(before.buffs.length - 1)
  })
```

- [ ] **Step 3: Run the scoped test**

Run: `npx vitest run src/app/warCouncil/__tests__/buffHandlers.test.ts`
Expected: all tests pass.

### Task 7: Flip the two-Cheat pile-count assertion in `src/app/warCouncil/__tests__/roundReducer.test.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/__tests__/roundReducer.test.ts:352`
- Test: `src/app/warCouncil/__tests__/roundReducer.test.ts`

- [ ] **Step 1: Replace the assertion**

Replace:

```ts
    expect(twice.buffs).toHaveLength(2) // not consumed — a Cheat is not a one-shot item
```

with:

```ts
    expect(twice.buffs).toHaveLength(1) // DLR-142 — cheatA is spent and removed; cheatB remains
```

- [ ] **Step 2: Run the scoped test**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts`
Expected: all tests pass.

### Task 8: Flip the Timebomb pile-persistence assertion in `src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts:78-82`
- Test: `src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts`

- [ ] **Step 1: Replace the test**

Replace:

```ts
  it('leaves the pile unchanged when a Timebomb is spent — not a one-shot consumable', () => {
    const before = createRoundUiState(seed())
    const after = spend(before, timebomb.id)
    expect(after.buffs).toHaveLength(before.buffs.length)
  })
```

with:

```ts
  it('removes the Timebomb from the pile once spent — DLR-142, single-use by default', () => {
    const before = createRoundUiState(seed())
    const after = spend(before, timebomb.id)
    expect(after.buffs).toHaveLength(before.buffs.length - 1)
  })
```

- [ ] **Step 2: Run the scoped test**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts`
Expected: all tests pass.

### Task 9: Flip the `onComplete` pile-contents assertion in `src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx`

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx:228-254`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx`

- [ ] **Step 1: Replace the test title and the final assertion**

Replace:

```ts
  it('reports onComplete with the pile still holding the Timebomb — DLR-132, not a one-shot item', () => {
```

with:

```ts
  it('reports onComplete with the Timebomb spent from the pile — DLR-142, single-use by default', () => {
```

Replace:

```ts
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].buffs).toEqual([bronzeTimebomb])
  })
```

with:

```ts
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].buffs).toEqual([])
  })
```

- [ ] **Step 2: Run the scoped test**

Run: `npx vitest run --project dom src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx`
Expected: all tests pass.

---

## Phase 4 — Tier word on the loadout rail

Independent of Phases 1–3: this changes only `buffLabels.ts`'s `buffLine` and its own test's one hard-coded expectation. The phase ends type-checking with the tier word flowing automatically into `buffRowAccessibleName` (which composes `buffLine`) and into every other test that calls `buffLine` directly rather than hard-coding its output.

### Task 10: Add `BUFF_TIER_WORD` and prefix it in `buffLine`

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/buffLabels.ts`
- Modify: `src/app/warCouncil/__tests__/buffLabels.test.ts:38-41`
- Test: `src/app/warCouncil/__tests__/buffLabels.test.ts`

- [ ] **Step 1: Update the failing expectation first**

In `src/app/warCouncil/__tests__/buffLabels.test.ts`, replace:

```ts
  it('states condition and reward in one line, ending with the AP cost', () => {
    expect(buffLine(bellTaker, apCostOf(bellTaker))).toBe(
      `Bell-Taker (Momentum) — win a trick with Bells: +3 multiplier. ${apCostOf(bellTaker)} AP.`,
    )
  })
```

with:

```ts
  it('states condition and reward in one line, prefixed with the tier and ending with the AP cost', () => {
    expect(buffLine(bellTaker, apCostOf(bellTaker))).toBe(
      `Silver Bell-Taker (Momentum) — win a trick with Bells: +3 multiplier. ${apCostOf(bellTaker)} AP.`,
    )
  })
```

Run: `npx vitest run src/app/warCouncil/__tests__/buffLabels.test.ts`
Expected: fails — `buffLine` does not yet prefix the tier word.

- [ ] **Step 2: Add `BuffTier` to the `hunt` import in `src/app/warCouncil/buffLabels.ts`**

Replace:

```ts
import {
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  buffTargetRankOf,
  buffTargetSuitOf,
  type ActionPoints,
  type Buff,
  BuffActivationRefusal,
} from '../../hunt'
```

with:

```ts
import {
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  BuffTier,
  buffTargetRankOf,
  buffTargetSuitOf,
  type ActionPoints,
  type Buff,
  BuffActivationRefusal,
} from '../../hunt'
```

- [ ] **Step 3: Add `BUFF_TIER_WORD` and prefix it in `buffLine`**

Add, immediately above `buffLine`:

```ts
/** The tier word every loadout row states, so a player can tell which copy of a buff they own. */
const BUFF_TIER_WORD: Readonly<Record<BuffTier, string>> = {
  [BuffTier.Bronze]: 'Bronze',
  [BuffTier.Silver]: 'Silver',
  [BuffTier.Gold]: 'Gold',
}
```

Replace:

```ts
export function buffLine(buff: Buff, apCost: ActionPoints): string {
  return `${buffName(buff)} — ${buffConditionSentence(buff)}: ${buffRewardPhrase(buff)}. ${apCost} AP.`
}
```

with:

```ts
export function buffLine(buff: Buff, apCost: ActionPoints): string {
  return `${BUFF_TIER_WORD[buff.tier]} ${buffName(buff)} — ${buffConditionSentence(buff)}: ${buffRewardPhrase(buff)}. ${apCost} AP.`
}
```

- [ ] **Step 4: Run the scoped test, then typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/buffLabels.test.ts; npm run typecheck`
Expected: all tests pass; typecheck exits 0.

---

## Phase 5 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task 11: Confirm the pure-core boundary still holds

- [ ] **Step 1: Grep the touched pure-core files for a React import or a DOM global**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits — `src/hunt/consumables.ts` and `src/hunt/buffActivation.ts` stay inside the pure-core boundary.

### Task 12: Confirm no stale "stays in the pile" claim remains

- [ ] **Step 1: Grep the touched trees for the retired phrasing**

Run: `Get-ChildItem src\hunt,src\app\warCouncil -Recurse -Include *.ts,*.tsx | Select-String -Pattern "not a one-shot item|NOT consumed|pile UNCHANGED|leaves the pile unchanged|pile still holding the Timebomb"`
Expected: zero hits — every docblock and test title this contract touched has been corrected.

### Task 13: Static gates and full suite

- [ ] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 14: Update the PR description

- [ ] **Step 1: Write `pr-description.md` in this plan folder**

Include:
- Link to `plan.md` in this folder.
- Summary: Cheat, Timebomb and Shield are single-use by default via the reversible `ACTIVATED_CARD_SINGLE_USE` toggle in `src/hunt/consumables.ts`; `activateShield` is now wired into the felt layer; every buff row on the loadout rail states its tier.
- The judgement call the developer should sanity-check: wiring `activateShield` and defaulting its toggle to `true` even though nothing mints a Shield yet (see `plan.md` Part 2 → Risks and judgement calls).
- The copy call the developer should sanity-check: the `Bronze`/`Silver`/`Gold` tier-word wording.
- Verification results from Task 13.
- One-line note: reverting any one of Cheat/Timebomb/Shield to "stays in the pile" is a single boolean flip in `ACTIVATED_CARD_SINGLE_USE` (`src/hunt/consumables.ts`) — no other file changes.

---

## Self-review

**Spec coverage:**
- Plan In-scope bullet 1 (`ACTIVATED_CARD_SINGLE_USE` toggle, read from `isConsumableItem`) — Task 1.
- Plan In-scope bullet 2 (wire `activateShield` into `handleTapBuff`) — Task 3.
- Plan In-scope bullet 3 (correct stale docblocks) — Tasks 2, 3 (Step 3), 4.
- Plan In-scope bullet 4 (update every existing test asserting old behaviour, plus new toggle tests) — Tasks 1, 5, 6, 7, 8, 9.
- Plan In-scope bullet 5 (tier word on `buffLine`) — Task 10.
- Plan In-scope bullet 6 (update `buffLabels.test.ts`'s `buffLine` expectation) — Task 10.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or command.

**Type / name consistency:** `ACTIVATED_CARD_SINGLE_USE`, `ActivatedItemKind`, `isActivatedSingleUseKind` are introduced once in Task 1 and referenced nowhere else by name (only through `isConsumableItem`, which Task 1 also changes) — no drift risk. `BUFF_TIER_WORD` is introduced and consumed entirely within Task 10. `activateShield` already exists (`src/hunt/encounter.ts`, re-exported from `src/hunt/index.ts`) and Task 3 is its only new call site.

**Phase boundary cleanliness:** Phase 1 leaves `consumables.ts` and `buffActivation.ts`'s docblock consistent and its own tests green, independent of every later phase. Phase 2 leaves `buffHandlers.ts` and `roundBars.ts` consistent and type-checking; its only dependency is the already-exported `activateShield`. Phase 3 depends on Phases 1–2's behavioural changes and brings every previously-failing test back to green — after this phase the full suite is expected to pass. Phase 4 is independent of Phases 1–3 and leaves `buffLabels.ts` and its test consistent on its own. Phase 5 makes no production change.
