# Tasks: The wildcard — spend it on a buff card to take its suit off

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE

> **Execution notes (batch run 2026-09-03).** Four spec files this plan names as "Modify" did not
> exist on disk: `src/hunt/__tests__/buffActivation.timebombLive.test.ts` (deleted by DLR-166 along
> with the card it covered), `src/app/warCouncil/__tests__/BuffCard.test.tsx`,
> `src/app/run/__tests__/CombineGroupCard.test.tsx` and
> `src/app/run/__tests__/manageBuffsLabels.test.ts`. The last was CREATED; BuffCard's wild-face
> assertion went into `BuffGallery.test.tsx` (the spec that actually renders `BuffCard`) and the
> combine tile's partner assertions into `ManageBuffsPanel.wild.test.tsx`. Two files outside the
> declared map needed a one-line edit to compile: `src/App.tsx` (pass `onSpendWild` to the panel)
> and `src/app/warCouncil/BuffRunTab.tsx` (a `RUN_CLASS` row compile-forced by `BuffRunKind.Wild`).
> `isShopOnlyBuff` lives in `buffs.ts`, not `consumables.ts`: that file stood at 396 of the
> 400-line blocking budget and the addition breached it. The pool count is 18, not the plan's 19,
> and `templateWeightFor('taker:bells:magnitude')` is 5/6, not the plan's 2.5 — both plan figures
> were measured before DLR-166 and DLR-150 respectively.
Started: 2026-09-03

**Goal:** Add a scarce card the slot machine deals and the player spends on the Manage Buffs screen to strip the suit condition off a card they own, so that card fires on a trick of any suit — with wild cards climbing the tier ladder by eating suited cards of the same family, and wildness absorbing so it can never be merged away.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (approved 2026-09-03).

---

## File map

**Created:**

- `src/hunt/buffWild.ts` — the wild flag's transition: refusals, `mintWildAtTier`, `wildenedBuff`, `spendWildcard`
- `src/hunt/__tests__/buffWild.test.ts` — refusals, the conversion, and the spend
- `src/app/warCouncil/WildMark.tsx` — the wild glyph, where a suit mark sits; also the machine strip's `wildcard` symbol
- `src/app/run/ManageBuffsCardFace.tsx` — `CombineGroupCard.tsx`'s local `CardFace`, extracted for its second consumer
- `src/app/run/WildcardBand.tsx` — the wildcard band and its arm control
- `src/app/run/WildTargetCard.tsx` — one tile in the target grid: selectable, refused, or armed
- `src/app/run/__tests__/manageBuffs.wild.test.ts` — the view model's wildcard band and target grid
- `src/app/run/__tests__/ManageBuffsPanel.wild.test.tsx` — the target mode's gesture, focus and `Escape`

**Modified:**

- `src/hunt/buffs.ts` — `BuffCondition.wild`, `buffIsWild`, `BuffKind.Wildcard`, a `BUFF_CADENCE` row
- `src/hunt/buffEvaluation.ts:74-79` — the `taker` and `feeder` cases skip the suit term when wild
- `src/hunt/buffCosts.ts` — `BuffConsumableKind` and a `CONSUMABLE_AP_COST` row
- `src/hunt/buffCatalog.ts` — `wildcardBuff`
- `src/hunt/buffTemplates.ts` — `BuffActivatedTemplateKind`, an `ACTIVATED_TEMPLATES` row, `mintFromTemplate`'s activated branch as a total lookup
- `src/hunt/buffCombine.ts` — `buffCombineFamilyKey`, `combinePairFor`, `combineProductFor`, `CombineRefusal.Untiered`, and `buffCombineKey` gaining a `wild` segment
- `src/hunt/buffActivation.ts` — `BuffActivationRefusal.ShopOnly` and `BuffActivationStock.shopOnly`
- `src/hunt/consumables.ts` — `isShopOnlyBuff`
- `src/hunt/slotWeights.ts` — a wildcard row in both machines' `SLOT_FAMILY_WEIGHTS` tables
- `src/hunt/index.ts` — the new exports (**at 388 of 400 lines; measure before and after**)
- `src/app/warCouncil/roundUiState.ts:359-373` — the felt's activation stock passes `shopOnly`
- `src/app/warCouncil/buffLabels.ts` — the `Wild` name prefix, two `Record<BuffKind>` rows, the `ShopOnly` message
- `src/app/warCouncil/buffGalleryModel.ts` — `BuffRunKind.Wild`, `BUFF_RUN_ORDER`, `buffRunOf`
- `src/app/warCouncil/buffRunLabels.ts` — a `RUN_LABEL` row
- `src/app/warCouncil/buffSuitFilterModel.ts` — a `ZERO_RUN_COUNTS` row
- `src/app/warCouncil/BuffCard.tsx:47-72` — the wild mark takes the empty suit slot
- `src/app/warCouncil/warCouncilBuffCard.css` — a `.wc-buffcard-wild` frame class
- `src/app/run/HeldBuffCard.tsx:24-40` — the same wild mark in the shop tray
- `src/app/run/CombineGroupCard.tsx` — imports the extracted face; the confirm face names the partner card
- `src/app/run/manageBuffs.ts` — `CombineGroup.partner`, `WildTargetTile`, `ManageBuffsView.wildcards` / `.wildTargets`
- `src/app/run/manageBuffsLabels.ts` — the `Untiered` message, `WILD_REFUSAL_MESSAGE`, and the band's copy
- `src/app/run/useManageBuffs.ts` — `spendWild`
- `src/app/run/ManageBuffsPanel.tsx` — the band, the target mode, and the mode's `Escape`
- `src/app/run/manageBuffs.css` — the band, the target bands, and the wild frame accent
- `src/app/run/slotSymbols.ts` — the activated glyph branch as a total lookup, plus a `FAMILY_WORD` row
- `src/app/run/SlotGlyph.tsx` — a `wildcard` case rendering `WildMark`
- `src/hunt/__tests__/buffActivation.test.ts` — the stock literal gains `shopOnly`
- `src/hunt/__tests__/buffActivation.timebombLive.test.ts` — the same
- `src/hunt/__tests__/buffEvaluation.test.ts` — the wild condition cases
- `src/hunt/__tests__/buffCombine.test.ts` — the widened rule and AC7's property
- `src/hunt/__tests__/buffTemplates.test.ts` — the pool count and the wildcard's mint path
- `src/hunt/__tests__/buffs.test.ts` — `buffIsWild` and the cadence row
- `src/app/warCouncil/__tests__/buffGalleryModel.test.ts` — the Wild run
- `src/app/warCouncil/__tests__/buffLabels.test.ts` — the `Wild` prefix
- `src/sim/__tests__/reachability.test.ts` — `BuffKind.Wildcard` becomes reachable

**Deleted:** (none)

**Developer decides or observes:**

- config → `SLOT_FAMILY_WEIGHTS[Skirmisher][BuffKind.Wildcard]` and `SLOT_FAMILY_WEIGHTS[Strongbox][BuffKind.Wildcard]` — the wildcard's stocking weight (criterion 10). Placeholder `1` on both. Trades scarcity of *wild lines* against how often the card shows up at all; because wildness is absorbing, one wildcard seeds a whole line, so this rations lines started, not wild cards held.
- Whether a silver or gold wildcard should do more than a bronze one (today all three convert exactly one card). A design question, not a value to pick blind.
- Every word on the new surfaces: `MANAGE_BUFFS_WILD_BAND`, `MANAGE_BUFFS_WILD_RULE`, `MANAGE_BUFFS_WILD_TARGET_BAND`, `MANAGE_BUFFS_WILD_REFUSED_BAND`, `MANAGE_BUFFS_WILD_COMMIT_LABEL`, both `WILD_REFUSAL_MESSAGE` strings, `COMBINE_REFUSAL_MESSAGE[Untiered]`, `BUFF_CONDITION_SENTENCE[Wildcard]`, and `BUFF_ACTIVATION_REFUSAL_MESSAGE[ShopOnly]` — all placeholder copy.
- The wild mark's drawing, and whether it wants a tint of its own rather than borrowing `--wc-brass`. Wildness is encoded in glyph and in the word "Wild" so it survives greyscale; the shape is a visual judgement.
- **Does it feel right that the wild pile owns the combine?** A lone Bell-Taker will read "nothing to pair it with" while the wild Taker beside it offers the combine that eats it. Judge it on the running screen.
- **Does the auto-picked fodder feel right?** Every eligible partner differs only in suit and the combine discards the suit, so the lowest id is taken and named on the confirm face. Whether you want to choose it explicitly is a feel call.
- Whether the whole pile eventually becomes raw material for wild lines — the end state the ticket says to watch in play.

---

## Phase 1 — Wildness on a condition, and the condition check

The flag and the two `buffFires` cases, with no new card in the game yet. This is a safe stopping point because every change is additive and every existing pile still behaves exactly as it does today: nothing can construct a wild card at the end of this phase, so the new branches are provably unreachable from a live run and the whole suite must still pass unchanged.

### Task 1: Add the wild flag and its accessor to `src/hunt/buffs.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/buffs.ts:100-135`
- Modify: `src/hunt/index.ts` — export `buffIsWild`
- Test: `src/hunt/__tests__/buffs.test.ts`

- [x] **Step 1: Write the failing test for `buffIsWild` on both shapes**

Append to `src/hunt/__tests__/buffs.test.ts`, following that file's existing fixture style:

```ts
describe('buffIsWild', () => {
  it('is false for a card whose condition names a suit', () => {
    const buff: Buff = {
      id: 1,
      kind: BuffKind.Taker,
      tier: BuffTier.Bronze,
      condition: { kind: BuffKind.Taker, target: { suit: BuffTargetSuit.Bells } },
      reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
    }
    expect(buffIsWild(buff)).toBe(false)
  })

  it('is false for a card whose condition names no suit and is not wild', () => {
    const buff: Buff = {
      id: 2,
      kind: BuffKind.Sidestep,
      tier: BuffTier.Bronze,
      condition: { kind: BuffKind.Sidestep },
      reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
    }
    expect(buffIsWild(buff)).toBe(false)
  })

  it('is true only when the condition carries the flag', () => {
    const buff: Buff = {
      id: 3,
      kind: BuffKind.Taker,
      tier: BuffTier.Bronze,
      condition: { kind: BuffKind.Taker, wild: true },
      reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
    }
    expect(buffIsWild(buff)).toBe(true)
    expect(buffTargetSuitOf(buff)).toBeNull()
  })
})
```

- [x] **Step 2: Run it and watch it fail on the missing export**

Run: `npx vitest run src/hunt/__tests__/buffs.test.ts`
Expected: non-zero exit; the failure names `buffIsWild` as not exported (a transform/collection error, not an assertion failure — that is the expected shape here).

- [x] **Step 3: Add the optional field and the accessor**

In `src/hunt/buffs.ts`, widen `BuffCondition` and add the accessor beside `buffTargetSuitOf`:

```ts
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

/** DLR-162 — whether this buff's condition ignores the suit. Reads `condition.wild` so no
 *  consumer reaches into the payload directly, exactly as `buffTargetSuitOf` does for the suit. */
export function buffIsWild(buff: Buff): boolean {
  return buff.condition.wild === true
}
```

Add `buffIsWild` to the `export { … } from './buffs'` block in `src/hunt/index.ts`.

- [x] **Step 4: Run the spec and the fast gate**

Run: `npx vitest run src/hunt/__tests__/buffs.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

### Task 2: Make the Taker and Feeder conditions wild-aware in `src/hunt/buffEvaluation.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/buffEvaluation.ts:64-80`
- Test: `src/hunt/__tests__/buffEvaluation.test.ts`

- [x] **Step 1: Write the failing tests for the four wild cases**

Append to `src/hunt/__tests__/buffEvaluation.test.ts`, reusing that file's existing context builder:

```ts
describe('a wild condition ignores the suit but nothing else (AC3)', () => {
  const wildTaker: Buff = {
    id: 40,
    kind: BuffKind.Taker,
    tier: BuffTier.Bronze,
    condition: { kind: BuffKind.Taker, wild: true },
    reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
  }
  const wildFeeder: Buff = { ...wildTaker, id: 41, kind: BuffKind.Feeder, condition: { kind: BuffKind.Feeder, wild: true } }

  it('fires a wild Taker on a won trick of a suit it never named', () => {
    expect(buffFires(wildTaker, ctx({ playerWon: true, playerSuits: [BuffTargetSuit.Moons] }))).toBe(true)
    expect(buffFires(wildTaker, ctx({ playerWon: true, playerSuits: [BuffTargetSuit.Keys] }))).toBe(true)
  })

  it('still refuses a wild Taker on a LOST trick — the mechanical term is untouched', () => {
    expect(buffFires(wildTaker, ctx({ playerWon: false, playerSuits: [BuffTargetSuit.Moons] }))).toBe(false)
  })

  it('fires a wild Feeder on a lost trick of any suit, and never on a won one', () => {
    expect(buffFires(wildFeeder, ctx({ playerWon: false, playerSuits: [BuffTargetSuit.Bells] }))).toBe(true)
    expect(buffFires(wildFeeder, ctx({ playerWon: true, playerSuits: [BuffTargetSuit.Bells] }))).toBe(false)
  })

  it('fires a wild card even when the player played NO suit this trick', () => {
    expect(buffFires(wildTaker, ctx({ playerWon: true, playerSuits: [] }))).toBe(true)
  })
})
```

- [x] **Step 2: Run it and watch the wild cases fail**

Run: `npx vitest run src/hunt/__tests__/buffEvaluation.test.ts`
Expected: non-zero exit; the three `toBe(true)` assertions fail because the suit term still refuses.

- [x] **Step 3: Add the wild term to exactly two cases**

In `src/hunt/buffEvaluation.ts`, read the flag once beside the suit and rank, then widen only `taker` and `feeder`:

```ts
export function buffFires(buff: Buff, ctx: BuffTrickContext): boolean {
  if (!isConditionFamily(buff.kind)) return false
  const suit = buffTargetSuitOf(buff)
  const rank = buffTargetRankOf(buff)
  const threshold = conditionThresholdOf(buff)
  // DLR-162 AC3 — a wild condition drops the SUIT term and nothing else. The `playerWon` term
  // below is the mechanical axis (`BuffTrickContext.playerWon`'s own docblock) and is untouched:
  // a wild Taker still has to take the trick, a wild Feeder still has to lose one.
  const wild = buffIsWild(buff)
  switch (buff.kind) {
    case 'taker':
      return ctx.playerWon && (wild || (suit !== null && ctx.playerSuits.includes(suit)))
    case 'feeder':
      return !ctx.playerWon && (wild || (suit !== null && ctx.playerSuits.includes(suit)))
    // …every other case UNCHANGED. `markOfRank` and `keepsake` are deliberately NOT widened:
    // wildening is refused on a card that names no suit (`wildRefusalFor`), so neither family can
    // ever carry the flag, and Mark of Rank is unconstructible anyway (CLAUDE.md's cut buffs).
```

Import `buffIsWild` from `./buffs` in that file's existing import block.

- [x] **Step 4: Run the spec plus the two suites that read this function**

Run: `npx vitest run src/hunt/__tests__/buffEvaluation.test.ts src/warCouncil/__tests__/buffProjection.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed across both files; `typecheck` exits 0. If `buffProjection.test.ts` is not at that path, run `Get-ChildItem src\warCouncil\__tests__ | Select-String -Pattern "buffProjection"` first and use the real filename.

---

## Phase 2 — The wildcard itself, dealt by the machine

The new card: its kind, its price row, its wording, its minting function, its template, its reel glyph and its stocking weight. The boundary is safe because a wildcard is inert at the end of it — it can be dealt and rendered, but nothing spends it and the felt already refuses to activate an unpriced card only through the refusal added in Phase 3, so this phase deliberately ends with the felt able to *offer* it. That gap closes in Phase 3 and is the reason these two phases are adjacent.

### Task 3: Declare `BuffKind.Wildcard` and every total table it forces ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/buffs.ts:20-55` (the `BuffKind` map) and `:178-205` (`BUFF_CADENCE`)
- Modify: `src/hunt/buffCosts.ts:55-70` (`BuffConsumableKind`) and `:105-128` (`CONSUMABLE_AP_COST`)
- Modify: `src/app/warCouncil/buffLabels.ts:22-46` (`BUFF_FAMILY_WORD`) and `:52-80` (`BUFF_CONDITION_SENTENCE`)
- Test: `src/hunt/__tests__/buffs.test.ts`

One task, not four: `BuffKind` is read by three `Readonly<Record<BuffKind, …>>` tables and by `BuffConsumableKind`'s price lookup, and splitting them leaves a phase boundary at which the app does not compile.

- [x] **Step 1: Add the kind and its cadence row**

In `src/hunt/buffs.ts`:

```ts
export const BuffKind = {
  // …every existing member UNCHANGED…
  /** DLR-162 — spent on the Manage Buffs screen to strip a card's suit condition. It has no
   *  condition and no reward of its own, and is refused on the felt by
   *  `BuffActivationRefusal.ShopOnly`. Its template id `'wildcard'` is a bare kind string like
   *  `'cheat'`, and is FROZEN the moment it ships (`ActivatedBuffTemplate`'s own docblock). */
  Wildcard: 'wildcard',
} as const
```

and in `BUFF_CADENCE`:

```ts
  // DLR-162 — the player spends it; it has no trigger, exactly like Cheat and Timebomb.
  [BuffKind.Wildcard]: BuffCadence.Activated,
```

- [x] **Step 2: Add the mandatory price row**

In `src/hunt/buffCosts.ts`, widen `BuffConsumableKind` with `| typeof BuffKind.Wildcard` and add:

```ts
  // DLR-162 — UNREACHABLE BY CONSTRUCTION, and a row is nonetheless MANDATORY:
  // `buffActivationStockFor` calls `apCostOf` eagerly for every card in the loadout gallery, and
  // `buffApCost` throws on an unpriced kind — an omitted row here would take the felt down the
  // first time a player was dealt a wildcard. Zero is the honest figure rather than a plausible
  // default: action points left the buff layer on DLR-145, and `BuffActivationRefusal.ShopOnly`
  // refuses this card ahead of `InsufficientAp` in any case. UNIT: action points.
  [BuffKind.Wildcard]: { [BuffTier.Bronze]: 0, [BuffTier.Silver]: 0, [BuffTier.Gold]: 0 },
```

- [x] **Step 3: Add the two wording rows**

In `src/app/warCouncil/buffLabels.ts` — PLACEHOLDER copy, as that file's own docblocks already say of every non-transcribed row:

```ts
  // BUFF_FAMILY_WORD
  [BuffKind.Wildcard]: 'Wildcard',

  // BUFF_CONDITION_SENTENCE — it has no trigger, so it reads as the action the player takes,
  // exactly as Cheat's and Timebomb's rows do.
  [BuffKind.Wildcard]: 'spend it on a suited card between fights',
```

- [x] **Step 4: Assert the cadence row rather than trusting the type**

Append to `src/hunt/__tests__/buffs.test.ts`:

```ts
it('the wildcard is an Activated card — the player spends it, it has no trigger', () => {
  expect(BUFF_CADENCE[BuffKind.Wildcard]).toBe(BuffCadence.Activated)
})
```

- [x] **Step 5: Verify the tables are total and nothing else moved**

Run: `npx vitest run src/hunt/__tests__/buffs.test.ts src/hunt/__tests__/buffCosts.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0. A `Record<BuffKind, …>` left without its new row fails at `typecheck`, which is the mechanism this step exists to exercise.

### Task 4: Mint a wildcard in `src/hunt/buffCatalog.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/buffCatalog.ts` — add `wildcardBuff` beside `timebombBuff`
- Modify: `src/hunt/index.ts` — export `wildcardBuff`
- Test: `src/hunt/__tests__/buffCatalog.test.ts`

- [x] **Step 1: Write the failing test**

Append to `src/hunt/__tests__/buffCatalog.test.ts`:

```ts
describe('wildcardBuff', () => {
  it('mints an activated card with no condition and no reward, at the caller id and tier', () => {
    const card = wildcardBuff(BuffTier.Silver, 77)
    expect(card).toEqual({
      id: 77,
      kind: BuffKind.Wildcard,
      tier: BuffTier.Silver,
      condition: ACTIVATED_BUFF_CONDITION,
      reward: { axis: BuffRewardAxis.None, value: 0 },
    })
  })

  it('is not itself wild — it is the card you spend, not a card made wild by one', () => {
    expect(buffIsWild(wildcardBuff(BuffTier.Bronze, 1))).toBe(false)
  })

  it('carries the tier it was dealt at every rung', () => {
    for (const tier of [BuffTier.Bronze, BuffTier.Silver, BuffTier.Gold]) {
      expect(wildcardBuff(tier, 1).tier).toBe(tier)
    }
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/hunt/__tests__/buffCatalog.test.ts`
Expected: non-zero exit; the failure names `wildcardBuff`.

- [x] **Step 3: Add the minting function**

```ts
/** DLR-162 AC1 — mint a Wildcard at `tier`. NO condition and NO reward, which is what AC1 says:
 *  `ACTIVATED_BUFF_CONDITION` is the shared "the player pulls this" condition Cheat and Timebomb
 *  already use, and the `None` axis at 0 is the honest pair — `buffRewardPhrase` already words
 *  that axis as "nothing", so no placeholder figure is invented.
 *
 *  The TIER IS CARRIED, not pinned: the reels award a tier and a three-of-a-kind readout says so,
 *  and handing over a bronze card under a "1 gold" line would make that readout a lie. All three
 *  tiers convert exactly one card (AC4) — whether a higher tier should do more is a design
 *  question this ticket routes to the developer, not a default to invent.
 *
 *  `id` is the CALLER's, from `RunState.nextBuffId`; this module never invents one and never calls
 *  `Math.random()`, because `src/hunt/` must stay deterministic. */
export function wildcardBuff(tier: BuffTier, id: BuffId): Buff {
  return {
    id,
    kind: BuffKind.Wildcard,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.None, value: 0 },
  }
}
```

Export it from `src/hunt/index.ts`'s `from './buffCatalog'` block.

- [x] **Step 4: Run the spec and the fast gate**

Run: `npx vitest run src/hunt/__tests__/buffCatalog.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

### Task 5: Put the wildcard on the machine's template pool in `src/hunt/buffTemplates.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/buffTemplates.ts:95-115` (`BuffActivatedTemplateKind`, `ACTIVATED_TEMPLATES`) and the activated branch of `mintFromTemplate`
- Test: `src/hunt/__tests__/buffTemplates.test.ts`

- [x] **Step 1: Write the failing tests for the pool and the mint route**

Append to `src/hunt/__tests__/buffTemplates.test.ts`:

```ts
describe('the wildcard template (DLR-162 AC1)', () => {
  it('takes the pool to 19 — one more ACTIVATED template, no new condition template', () => {
    expect(BUFF_TEMPLATE_COUNT).toBe(19)
    expect(BUFF_TEMPLATES.filter((t) => t.form === 'condition')).toHaveLength(16)
    expect(BUFF_TEMPLATES.filter((t) => t.form === 'activated')).toHaveLength(3)
  })

  it('is resolvable by its frozen bare-kind id', () => {
    const template = templateById('wildcard')
    expect(template).toEqual({ form: 'activated', id: 'wildcard', kind: BuffKind.Wildcard })
  })

  it('mints a Wildcard and NOT a Timebomb — the activated branch is total, not a binary', () => {
    const template = templateById('wildcard')!
    const minted = mintFromTemplate(template, BuffTier.Gold, 5)
    expect(minted.kind).toBe(BuffKind.Wildcard)
    expect(minted.tier).toBe(BuffTier.Gold)
  })

  it('recomposes its own template id from a minted card', () => {
    expect(templateIdForBuff(wildcardBuff(BuffTier.Bronze, 1))).toBe('wildcard')
  })
})
```

- [x] **Step 2: Run it and watch the count and the mint route fail**

Run: `npx vitest run src/hunt/__tests__/buffTemplates.test.ts`
Expected: non-zero exit; the count assertion fails at 18 and the mint assertion reports a `timebomb` kind — which is exactly the silent failure this task removes.

- [x] **Step 3: Widen the activated kind and the template list**

```ts
export type BuffActivatedTemplateKind =
  | typeof BuffKind.Cheat
  | typeof BuffKind.Timebomb
  // DLR-162 — the third activated card. Widening this type is what compile-forces the two
  // Cheat-or-else-Timebomb binaries (this file's `mintFromTemplate` and
  // `src/app/run/slotSymbols.ts`'s `slotSymbolFace`) to become total lookups.
  | typeof BuffKind.Wildcard

export const ACTIVATED_TEMPLATES: readonly ActivatedBuffTemplate[] = [
  { form: 'activated', id: 'cheat', kind: BuffKind.Cheat },
  { form: 'activated', id: 'timebomb', kind: BuffKind.Timebomb },
  // DLR-162 — a bare kind string like its two siblings. PERSISTED by the Vault as a grant id, so
  // the format is frozen the moment it ships.
  { form: 'activated', id: 'wildcard', kind: BuffKind.Wildcard },
]
```

- [x] **Step 4: Replace the activated binary with a total lookup**

Above `mintFromTemplate`, and reading `cheatBuff` / `timebombBuff` / `wildcardBuff` from `./buffCatalog`:

```ts
/** DLR-162 — was `template.kind === BuffKind.Cheat ? cheatBuff : timebombBuff`, which type-checked
 *  perfectly with a THIRD activated kind flowing through it and minted that kind as a Timebomb.
 *  A `Record` over the closed union instead, so a fourth activated card is a compile error here.
 *  Still delegates to `buffCatalog.ts`'s minting functions rather than reproducing them — one card,
 *  one answer, the discipline `cheatDurationTricksOf` sets three files away. */
const ACTIVATED_MINT: Readonly<
  Record<BuffActivatedTemplateKind, (tier: BuffTier, id: BuffId) => Buff>
> = {
  [BuffKind.Cheat]: cheatBuff,
  [BuffKind.Timebomb]: timebombBuff,
  [BuffKind.Wildcard]: wildcardBuff,
}
```

and in `mintFromTemplate`, replace the activated branch's ternary with `return ACTIVATED_MINT[template.kind](tier, id)`. Update this file's header docblock with a DLR-162 paragraph in the style of the DLR-150 and DLR-161 ones already there, stating the pool is now 19 and that no condition template was added.

- [x] **Step 5: Run the spec and the suites that count the pool**

Run: `npx vitest run src/hunt/__tests__/buffTemplates.test.ts src/hunt/__tests__/slotWeights.test.ts src/hunt/__tests__/slotMachine.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed. If a spec asserts a hard-coded 18, update it to 19 in the same step — that figure is the pool's size, not a behaviour. `typecheck` exits 0.

### Task 6: Draw the wild mark, and make the reel glyph branch total ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/WildMark.tsx`
- Modify: `src/app/run/slotSymbols.ts:22-30` (the `SlotGlyph` union), `:48-60` (`FAMILY_WORD`), `:88-100` (`slotSymbolFace`'s activated branch)
- Modify: `src/app/run/SlotGlyph.tsx:21-30` (`SlotGlyphKind` and the component's head)
- Test: `src/app/run/__tests__/slotSymbols.test.ts`

- [x] **Step 1: Write the failing test for the wildcard's glyph and family word**

Append to `src/app/run/__tests__/slotSymbols.test.ts`:

```ts
it('gives the wildcard its OWN glyph and word, not the Timebomb it used to fall through to', () => {
  const face = slotSymbolFace(templateById('wildcard')!)
  expect(face).toEqual({ id: 'wildcard', glyph: { kind: 'wildcard' }, family: 'Wildcard', axis: null })
})
```

- [x] **Step 2: Run it and watch it report a timebomb glyph**

Run: `npx vitest run src/app/run/__tests__/slotSymbols.test.ts`
Expected: non-zero exit; the received glyph is `{ kind: 'timebomb' }`.

- [x] **Step 3: Create the wild mark — one drawing, two hosts**

`src/app/warCouncil/WildMark.tsx`:

```tsx
/**
 * DLR-162 — the wild mark, drawn where a suit mark sits. `SuitMark`'s contract exactly: every path
 * is `aria-hidden`, takes its tint from the surrounding `color`, and naming is the call site's job.
 *
 * ONE DRAWING, TWO HOSTS. `src/app/run/SlotGlyph.tsx` renders this same component for its
 * `wildcard` case rather than carrying a second copy of the path data — the reason `SlotGlyph`
 * itself exists (a chip and a reel window must show the same symbol) applied one level up.
 *
 * A six-armed asterisk: it reads as "any of these" rather than as one of the three suits, and it
 * survives greyscale, which is what AC9 needs of it — wildness is carried by this SHAPE and by the
 * `Wild` prefix in the card's name, never by a colour of its own. The tint it borrows is the
 * developer's to change (`tasks.md` → Developer decides or observes).
 */
interface WildMarkProps {
  readonly className?: string
}

export function WildMark({ className }: WildMarkProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M12 3.2v17.6" />
        <path d="M4.2 7.6l15.6 8.8" />
        <path d="M19.8 7.6 4.2 16.4" />
      </g>
    </svg>
  )
}
```

- [x] **Step 4: Widen both glyph unions and make the activated branch total**

In `src/app/run/slotSymbols.ts`, add `| { readonly kind: 'wildcard' }` to `SlotGlyph`, add `[BuffKind.Wildcard]: 'Wildcard'` to `FAMILY_WORD`, and replace the activated ternary with a total lookup for `mintFromTemplate`'s stated reason:

```ts
/** DLR-162 — was `template.kind === BuffKind.Cheat ? { kind: 'cheat' } : { kind: 'timebomb' }`,
 *  which rendered a third activated card as a Timebomb in a reel window with no error at all.
 *  Total over the closed union, so a fourth activated card is a compile error here. */
const ACTIVATED_GLYPH: Readonly<Record<BuffActivatedTemplateKind, SlotGlyph>> = {
  [BuffKind.Cheat]: { kind: 'cheat' },
  [BuffKind.Timebomb]: { kind: 'timebomb' },
  [BuffKind.Wildcard]: { kind: 'wildcard' },
}
```

In `src/app/run/SlotGlyph.tsx`, add `| 'wildcard'` to `SlotGlyphKind` and early-return the shared drawing before the component's own `<svg>`, so no path data is duplicated:

```tsx
export default function SlotGlyph({ kind, className }: SlotGlyphProps) {
  // DLR-162 — the wild mark is `WildMark`'s drawing, not a second copy of it. Returned ahead of
  // this component's own <svg> because WildMark brings its own, exactly as SuitMark does for the
  // three suits this module deliberately does not draw.
  if (kind === 'wildcard') return <WildMark className={className} />
  return (
    // …unchanged…
```

- [x] **Step 5: Run the spec and the fast gate**

Run: `npx vitest run src/app/run/__tests__/slotSymbols.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

### Task 7: Stock the wildcard on both machines in `src/hunt/slotWeights.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/slotWeights.ts:44-75` (both `SLOT_FAMILY_WEIGHTS` tables)
- Config: `src/hunt/slotWeights.ts` — add `SLOT_FAMILY_WEIGHTS[…][BuffKind.Wildcard]` (**the value is a developer decision**)
- Test: `src/hunt/__tests__/slotWeights.test.ts`

- [x] **Step 1: Add the two rows with a documented placeholder**

`SlotTemplateKind` already resolves to `MintableConditionKind | BuffActivatedTemplateKind`, so Task 5's widening compile-forces both rows. Add to each machine's table:

```ts
    // DLR-162 AC10 — NOBODY HAS CHOSEN THIS NUMBER. AC10 asks for a LOW weight and says the exact
    // figure is the developer's. `1` is a PLACEHOLDER: it is the lowest weight either table
    // already carries, chosen only so this total `Record` compiles. Only RATIOS matter within one
    // machine's table. UNIT: relative weight, >= 0, unitless.
    //
    // Worth reading before it is set: because wildness is absorbing, one wildcard seeds an entire
    // wild line, so what this rations is how many INDEPENDENT WILD LINES a player can start, not
    // how many wild cards they end up holding. And the machine has no per-card rarity — a low
    // weight makes the card rarely APPEAR, but on a visit where it does appear it is as likely as
    // anything else on that strip. See `tasks.md` → Developer decides or observes.
    [BuffKind.Wildcard]: 1,
```

`SLOT_AXIS_WEIGHTS` is deliberately NOT touched: an activated template has no axis, so `templateWeightFor` takes its `familyWeight / templates-in-family` branch.

- [x] **Step 2: Assert the wildcard is stockable and every suited card's weight is unchanged**

Append to `src/hunt/__tests__/slotWeights.test.ts`:

```ts
describe('the wildcard on the strip (DLR-162 AC1/AC10)', () => {
  it('carries positive weight, so the machine can stock it', () => {
    expect(templateWeightFor(SlotMachineId.Skirmisher, templateById('wildcard')!)).toBeGreaterThan(0)
  })

  it('leaves every CONDITION template weight untouched — no condition template was added', () => {
    // The wildcard is an ACTIVATED template, so it never enters `FAMILY_AXIS_TOTAL`. A Bell-Taker
    // (Blade) on the Skirmisher is family 5, axis 3, family-axis total 6 -> 2.5, exactly as before.
    expect(templateWeightFor(SlotMachineId.Skirmisher, templateById('taker:bells:magnitude')!)).toBeCloseTo(2.5)
  })

  it('shares its family weight across nothing — one template in the family', () => {
    expect(templateWeightFor(SlotMachineId.Skirmisher, templateById('wildcard')!)).toBeCloseTo(1)
  })
})
```

- [x] **Step 3: Run the spec and the odds suite**

Run: `npx vitest run src/hunt/__tests__/slotWeights.test.ts src/hunt/__tests__/slotOdds.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0. `slotOdds`'s figures are derived rather than quoted, so no expected number there should need editing — if one does, read it before changing it.

---

## Phase 3 — Spending a wildcard, and refusing it on the felt

The conversion itself and the two refusals AC5 names, plus the felt-side refusal that stops a wildcard being tapped to no effect in the loadout. The boundary is safe because both halves land together: at the end of this phase a wildcard can be converted through the engine and cannot be tapped on the felt, so no screen offers an action that does nothing.

### Task 8: The wild transition in a new `src/hunt/buffWild.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/hunt/buffWild.ts`
- Modify: `src/hunt/index.ts` — export `WildRefusal`, `wildRefusalFor`, `isWildcardCard`, `mintWildAtTier`, `wildenedBuff`, `spendWildcard`
- Test: `src/hunt/__tests__/buffWild.test.ts`

- [x] **Step 1: Write the failing spec for the refusals, the conversion and the spend**

`src/hunt/__tests__/buffWild.test.ts` — the cases AC2, AC4 and AC5 name:

```ts
describe('wildRefusalFor (AC5)', () => {
  it('allows a suit-specific card', () => {
    expect(wildRefusalFor(bellTaker(BuffTier.Bronze, 1))).toBeNull()
  })
  it('refuses a card that names no suit — Sidestep needs nothing in return', () => {
    expect(wildRefusalFor(sidestep(BuffTier.Bronze, 2))).toBe(WildRefusal.NoSuit)
  })
  it('refuses an already-wild card — there is no second suit to take off', () => {
    expect(wildRefusalFor(wildenedBuff(bellTaker(BuffTier.Bronze, 3)))).toBe(WildRefusal.AlreadyWild)
  })
  it('refuses an activated card, which names no suit either', () => {
    expect(wildRefusalFor(cheatBuff(BuffTier.Bronze, 4))).toBe(WildRefusal.NoSuit)
  })
  it('refuses a wildcard being spent on another wildcard', () => {
    expect(wildRefusalFor(wildcardBuff(BuffTier.Bronze, 5))).toBe(WildRefusal.NoSuit)
  })
})

describe('wildenedBuff (AC2, AC4)', () => {
  it('keeps the id, kind, tier and reward, and drops only the suit', () => {
    const before = bellTaker(BuffTier.Silver, 9)
    const after = wildenedBuff(before)
    expect(after.id).toBe(before.id)
    expect(after.kind).toBe(before.kind)
    expect(after.tier).toBe(before.tier)
    expect(after.reward).toEqual(before.reward)
    expect(buffTargetSuitOf(after)).toBeNull()
    expect(buffIsWild(after)).toBe(true)
  })
})

describe('spendWildcard (AC4)', () => {
  it('removes the wildcard, keeps the target as the same card made wild, and does not advance nextBuffId', () => {
    const run = { ...startRun(), buffs: [wildcardBuff(BuffTier.Bronze, 1), bellTaker(BuffTier.Bronze, 2)], nextBuffId: 3 }
    const next = spendWildcard(run, 1, 2)
    expect(next.buffs.map((b) => b.id)).toEqual([2])
    expect(buffIsWild(next.buffs[0])).toBe(true)
    expect(next.nextBuffId).toBe(3)
  })

  it('converts exactly ONE card — a second held copy of the target is untouched', () => {
    const run = {
      ...startRun(),
      buffs: [wildcardBuff(BuffTier.Bronze, 1), bellTaker(BuffTier.Bronze, 2), bellTaker(BuffTier.Bronze, 3)],
      nextBuffId: 4,
    }
    const next = spendWildcard(run, 1, 2)
    expect(next.buffs.filter((b) => buffIsWild(b)).map((b) => b.id)).toEqual([2])
    expect(next.buffs.filter((b) => !buffIsWild(b)).map((b) => b.id)).toEqual([3])
  })

  it('THROWS naming the refusal rather than returning the run unchanged', () => {
    const run = { ...startRun(), buffs: [wildcardBuff(BuffTier.Bronze, 1), sidestep(BuffTier.Bronze, 2)], nextBuffId: 3 }
    expect(() => spendWildcard(run, 1, 2)).toThrow(RangeError)
  })

  it('THROWS when the spent card is not a wildcard, or is not in the pile at all', () => {
    const run = { ...startRun(), buffs: [bellTaker(BuffTier.Bronze, 1), bellTaker(BuffTier.Bronze, 2)], nextBuffId: 3 }
    expect(() => spendWildcard(run, 1, 2)).toThrow(RangeError)
    expect(() => spendWildcard(run, 99, 2)).toThrow(RangeError)
  })
})

describe('mintWildAtTier', () => {
  it('reads the same reward ladder mintFromTemplate reads', () => {
    const card = mintWildAtTier(BuffKind.Taker, BuffRewardAxis.Magnitude, BuffTier.Gold, 50)
    expect(card.reward).toEqual({ axis: BuffRewardAxis.Magnitude, value: 5 })
    expect(buffIsWild(card)).toBe(true)
  })

  it('THROWS on an axis with no ladder rather than minting a zero-value card', () => {
    expect(() => mintWildAtTier(BuffKind.Taker, BuffRewardAxis.None, BuffTier.Bronze, 1)).toThrow(RangeError)
  })
})
```

Write the three small fixture helpers (`bellTaker`, `sidestep`) at the top of the file by minting real templates through `mintFromTemplate`, the way `src/sim/fixtures.ts` does — never by hand-building a `Buff` literal, so a future field on `Buff` cannot leave this spec constructing a shape production never produces.

- [x] **Step 2: Run it and watch the module fail to resolve**

Run: `npx vitest run src/hunt/__tests__/buffWild.test.ts`
Expected: non-zero exit; the failure names `./buffWild` as unresolved.

- [x] **Step 3: Write the module**

`src/hunt/buffWild.ts`, with a header docblock in this tree's style stating that it is pure, that ids come from the caller, and that a wild card is deliberately mintable only here and never from a template:

```ts
export const WildRefusal = {
  /** The target names no suit at all — Sidestep, the two protective families, an activated card,
   *  or another wildcard. AC5: Sidestep already asks for no suit and needs nothing in return. */
  NoSuit: 'noSuit',
  /** The target is already wild; there is no second suit to take off. */
  AlreadyWild: 'alreadyWild',
} as const
export type WildRefusal = (typeof WildRefusal)[keyof typeof WildRefusal]

export function isWildcardCard(buff: Buff): boolean {
  return buff.kind === BuffKind.Wildcard
}

/** `null` when a wildcard may be spent on `target` right now. Order: AlreadyWild before NoSuit,
 *  because a wild card reports no suit and "already wild" is the more informative of the two
 *  true reasons — the same ordering argument `combineRefusalFor` makes for gold over NoPair. */
export function wildRefusalFor(target: Buff): WildRefusal | null {
  if (buffIsWild(target)) return WildRefusal.AlreadyWild
  if (buffTargetSuitOf(target) === null) return WildRefusal.NoSuit
  return null
}

/** A wild card at `tier`, minted from the SAME `REWARD_TIER_VALUE` ladder `mintFromTemplate`
 *  reads, so a wild silver Taker pays exactly what a suited silver Taker pays. THROWS a
 *  `RangeError` on an axis with no ladder rather than minting a zero-value card —
 *  `mintFromTemplate`'s own discipline, and a plausible-looking zero is the bug that type-checks.
 *  `id` is the CALLER's. */
export function mintWildAtTier(
  kind: BuffKind,
  axis: BuffRewardAxis,
  tier: BuffTier,
  id: BuffId,
): Buff {
  const ladder = REWARD_TIER_VALUE[narrowToMintedAxis(axis, `A wild card's reward axis`)]
  if (ladder === undefined) {
    throw new RangeError(`A wild ${kind} pays on axis ${axis}, which has no REWARD_TIER_VALUE ladder`)
  }
  return { id, kind, tier, condition: { kind, wild: true }, reward: { axis, value: ladder[tier] } }
}

/** AC2/AC4 — `target` with its suit condition removed, KEEPING its own id: it is the same card,
 *  so `RunState.nextBuffId` must not advance for it and two runs on one seed stay identical. */
export function wildenedBuff(target: Buff): Buff {
  return mintWildAtTier(target.kind, target.reward.axis, target.tier, target.id)
}

/** The pile with `wildcardId` removed and `targetId` replaced by its wild self, in place.
 *  THROWS a `RangeError` naming the reason rather than returning `run` unchanged, exactly as
 *  `combineBuffs` and `buyFromShop` do: a silent no-op on a destructive action is the failure this
 *  tree refuses to allow. Reaching a throw is a driver bug — no control is armable while
 *  `wildRefusalFor` is non-null. */
export function spendWildcard(run: RunState, wildcardId: BuffId, targetId: BuffId): RunState
```

Implement `spendWildcard` by finding both cards by id, throwing when either is absent, when the spent card is not a wildcard, or when `wildRefusalFor(target)` is non-null; then returning `{ ...run, buffs: run.buffs.filter(b => b.id !== wildcardId).map(b => b.id === targetId ? wildenedBuff(b) : b) }` — preserving pile order, because the pile's order is the player's mental order.

Add the six names to `src/hunt/index.ts`.

- [x] **Step 4: Run the spec, then measure the barrel**

Run: `npx vitest run src/hunt/__tests__/buffWild.test.ts; npm run typecheck; (Get-Content src\hunt\index.ts).Count`
Expected: Vitest reports 0 failed; `typecheck` exits 0; the line count is **under 400**. If it is 400 or more, split the barrel in this task — `CLAUDE.md`'s budget is blocking and the fix belongs in this ticket, not in a finding. Do NOT measure with `Measure-Object -Line`, which drops blank lines and has hidden a real breach in this repo before.

### Task 9: Refuse a wildcard on the felt with a reason that says where to spend it ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/consumables.ts` — add `isShopOnlyBuff` beside `consumableEffectIsLive`
- Modify: `src/hunt/buffActivation.ts:11-33` (`BuffActivationRefusal`), `:42-56` (`BuffActivationStock`), `:98-105` (`buffActivationRefusalFor`), `:108-125` (`buffActivationStockFor`)
- Modify: `src/app/warCouncil/roundUiState.ts:359-373` — pass `shopOnly` through the felt's stock builder
- Modify: `src/app/warCouncil/buffLabels.ts:194-201` — the `ShopOnly` message
- Modify: `src/hunt/__tests__/buffActivation.test.ts`, `src/hunt/__tests__/buffActivation.timebombLive.test.ts` — the base stock literals gain the field
- Test: `src/hunt/__tests__/buffActivation.test.ts`

One task, not three: `BuffActivationStock` gains a **required** field, and every builder and every spec literal must gain it together or the phase boundary does not compile.

- [x] **Step 1: Write the failing tests for the new refusal and its precedence**

Append to `src/hunt/__tests__/buffActivation.test.ts`:

```ts
describe('ShopOnly (DLR-162)', () => {
  it('refuses a shop-only card even on a wide-open felt', () => {
    expect(buffActivationRefusalFor({ ...openStock, shopOnly: true })).toBe(BuffActivationRefusal.ShopOnly)
  })

  it('reports ShopOnly ahead of every other reason — it is true of the CARD, not of the felt', () => {
    const worst = { ...openStock, shopOnly: true, windowOpen: false, alreadyActive: true, timebombLive: true }
    expect(buffActivationRefusalFor(worst)).toBe(BuffActivationRefusal.ShopOnly)
  })

  it('is set for a wildcard and for nothing else', () => {
    expect(isShopOnlyBuff(wildcardBuff(BuffTier.Bronze, 1))).toBe(true)
    expect(isShopOnlyBuff(cheatBuff(BuffTier.Bronze, 2))).toBe(false)
    expect(isShopOnlyBuff(bellTaker(BuffTier.Bronze, 3))).toBe(false)
  })

  it('prices a wildcard rather than throwing on a render path', () => {
    expect(() => apCostOf(wildcardBuff(BuffTier.Gold, 4))).not.toThrow()
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/hunt/__tests__/buffActivation.test.ts`
Expected: non-zero exit; the failure names `shopOnly` / `isShopOnlyBuff` as unknown.

- [x] **Step 3: Add the predicate to the leaf module**

In `src/hunt/consumables.ts`, beside `consumableEffectIsLive`:

```ts
/** DLR-162 — whether `buff` can ONLY be spent on the Manage Buffs screen, between fights. TRUE for
 *  the wildcard and nothing else. Declared HERE rather than in `buffWild.ts` because this module is
 *  a declared LEAF (`./buffs` + `./types` only) and `buffActivation.ts` already imports it — the
 *  edge runs one way, exactly as this file's own docblock states. NEVER THROWS: read on a render
 *  path, for `consumableEffectIsLive`'s reason. */
export function isShopOnlyBuff(buff: Buff): boolean {
  return buff.kind === BuffKind.Wildcard
}
```

- [x] **Step 4: Add the refusal, the stock field, and the precedence line**

In `src/hunt/buffActivation.ts`:

```ts
export const BuffActivationRefusal = {
  /** DLR-162 — this card is spent on the Manage Buffs screen, between fights, and has no effect on
   *  the felt at all. Read FIRST, ahead of `NoEffectYet`, because it is true of the CARD rather
   *  than of the felt — and deliberately NOT folded into `NoEffectYet`, whose copy reads "Not
   *  usable yet" and would be false of a card that is perfectly usable one screen away. */
  ShopOnly: 'shopOnly',
  NoEffectYet: 'noEffectYet',
  // …the other four UNCHANGED…
} as const

export interface BuffActivationStock {
  /** DLR-162 — `isShopOnlyBuff(buff)`. `false` for every card but the wildcard. */
  readonly shopOnly: boolean
  // …the six existing fields UNCHANGED…
}
```

Add `if (stock.shopOnly) return BuffActivationRefusal.ShopOnly` as the FIRST line of `buffActivationRefusalFor`, update that function's docblock's stated order, and add `shopOnly: isShopOnlyBuff(buff)` to `buffActivationStockFor`'s returned object.

- [x] **Step 5: Carry the field through the felt's builder and word the refusal**

In `src/app/warCouncil/roundUiState.ts`'s stock builder, pass the new field through (or delegate to `buffActivationStockFor`, if it already does). In `src/app/warCouncil/buffLabels.ts`:

```ts
  // DLR-162 — PLACEHOLDER copy. Says WHERE the card is spent, not merely that it cannot be:
  // the row renders this on its own face, and a player holding a card they cannot use is exactly
  // who this sentence is for.
  [BuffActivationRefusal.ShopOnly]: 'Spend this on the Manage Buffs screen.',
```

- [x] **Step 6: Add the field to both spec base literals and run everything that reads the stock**

Run: `npx vitest run src/hunt/__tests__/buffActivation.test.ts src/hunt/__tests__/buffActivation.timebombLive.test.ts src/app/warCouncil/__tests__/buffActivationStock.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0. Every `tsc` error naming a missing `shopOnly` is a literal to fix in this step — the plan's audit expects them in the two `src/hunt/__tests__/buffActivation*.test.ts` files, and whatever `tsc` actually reports is the real list.

---

## Phase 4 — The widened combine rule

The one place the engine needs real design: pairing two cards with different exact keys, and making wildness absorbing. The boundary is safe because the rule's three new functions land with `combineRefusalFor` and `combineBuffs` rewritten over them in the same task, so the answer a tile shows and the cards a commit destroys can never disagree.

### Task 10: Widen the pairing rule in `src/hunt/buffCombine.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/buffCombine.ts` (whole file)
- Modify: `src/hunt/index.ts` — export `buffCombineFamilyKey`, `combinePairFor`, `combineProductFor`
- Modify: `src/app/run/manageBuffsLabels.ts:31-36` — the `Untiered` message
- Test: `src/hunt/__tests__/buffCombine.test.ts`

- [x] **Step 1: Write the failing tests, including AC7 as a property**

Append to `src/hunt/__tests__/buffCombine.test.ts`. The property test is the one the ticket asks for by name:

```ts
describe('the widened rule (AC6, AC8)', () => {
  it('pairs a wild card with a suited card of the same family, axis and tier', () => {
    const pile = [wildBronzeTaker(1), bellTaker(BuffTier.Bronze, 2)]
    expect(combineRefusalFor(pile, buffCombineKey(pile[0]))).toBeNull()
    expect(combinePairFor(pile, buffCombineKey(pile[0]))?.map((b) => b.id)).toEqual([1, 2])
  })

  it('produces a card that is still wild, one tier up, paying what that tier pays (AC6)', () => {
    const pile = [wildBronzeTaker(1), bellTaker(BuffTier.Bronze, 2)]
    const next = combineBuffs({ ...startRun(), buffs: pile, nextBuffId: 3 }, buffCombineKey(pile[0]))
    expect(next.buffs).toHaveLength(1)
    expect(buffIsWild(next.buffs[0])).toBe(true)
    expect(next.buffs[0].tier).toBe(BuffTier.Silver)
    expect(next.buffs[0].reward).toEqual({ axis: BuffRewardAxis.Magnitude, value: 3 })
    expect(next.nextBuffId).toBe(4)
  })

  it('refuses across families, across axes and across tiers even when one side is wild (AC8)', () => {
    const wild = wildBronzeTaker(1)
    for (const other of [bellFeeder(BuffTier.Bronze, 2), bellTakerMomentum(BuffTier.Bronze, 3), bellTaker(BuffTier.Silver, 4)]) {
      expect(combineRefusalFor([wild, other], buffCombineKey(wild))).toBe(CombineRefusal.NoPair)
    }
  })

  it('does NOT offer the combine from the suited pile — the wild pile owns it', () => {
    const pile = [wildBronzeTaker(1), bellTaker(BuffTier.Bronze, 2)]
    expect(combineRefusalFor(pile, buffCombineKey(pile[1]))).toBe(CombineRefusal.NoPair)
  })

  it('prefers a suited partner over a second wild copy, so the player keeps more wild cards', () => {
    const pile = [wildBronzeTaker(1), wildBronzeTaker(2), bellTaker(BuffTier.Bronze, 3)]
    expect(combinePairFor(pile, buffCombineKey(pile[0]))?.map((b) => b.id)).toEqual([1, 3])
  })

  it('still combines two wild copies when there is no suited partner', () => {
    const pile = [wildBronzeTaker(1), wildBronzeTaker(2)]
    expect(combinePairFor(pile, buffCombineKey(pile[0]))?.map((b) => b.id)).toEqual([1, 2])
  })

  it('leaves the ordinary same-card rule exactly as DLR-159 shipped it', () => {
    const pile = [bellTaker(BuffTier.Bronze, 1), bellTaker(BuffTier.Bronze, 2)]
    const next = combineBuffs({ ...startRun(), buffs: pile, nextBuffId: 3 }, buffCombineKey(pile[0]))
    expect(buffIsWild(next.buffs[0])).toBe(false)
    expect(buffTargetSuitOf(next.buffs[0])).toBe(BuffTargetSuit.Bells)
  })
})

describe('wildness is absorbing (AC7)', () => {
  // The PROPERTY, not the two cases: for every pile drawn from a mixed set, whatever any sequence
  // of combines produces is wild if either of its inputs was, and no reachable sequence ever
  // yields a suited card from a wild one.
  it('holds over every pair in a mixed pile', () => {
    const pile = [
      wildBronzeTaker(1), wildBronzeTaker(2),
      bellTaker(BuffTier.Bronze, 3), keysTaker(BuffTier.Bronze, 4), moonsTaker(BuffTier.Bronze, 5),
      bellFeeder(BuffTier.Bronze, 6),
    ]
    for (const key of new Set(pile.map(buffCombineKey))) {
      const pair = combinePairFor(pile, key)
      if (pair === null) continue
      const product = combineProductFor(pair[0], pair[1], BuffTier.Silver, 999)
      expect(product).not.toBeNull()
      expect(buffIsWild(product!)).toBe(buffIsWild(pair[0]) || buffIsWild(pair[1]))
    }
  })

  it('never lets a repeated combine walk a wild card back to a suit', () => {
    let run = {
      ...startRun(),
      buffs: [wildBronzeTaker(1), bellTaker(BuffTier.Bronze, 2), keysTaker(BuffTier.Bronze, 3)],
      nextBuffId: 4,
    }
    // One combine to silver, then no further pair exists at silver — assert wildness at each step.
    run = combineBuffs(run, buffCombineKey(run.buffs[0]))
    expect(run.buffs.every((b) => !buffIsWild(b) || buffIsWild(b))).toBe(true)
    expect(run.buffs.filter((b) => buffIsWild(b))).toHaveLength(1)
    expect(run.buffs.some((b) => buffIsWild(b) && buffTargetSuitOf(b) !== null)).toBe(false)
  })
})

describe('a wildcard cannot be combined', () => {
  it('refuses a wildcard pile with its own reason, so a supply cannot be halved for nothing', () => {
    const pile = [wildcardBuff(BuffTier.Bronze, 1), wildcardBuff(BuffTier.Bronze, 2)]
    expect(combineRefusalFor(pile, buffCombineKey(pile[0]))).toBe(CombineRefusal.Untiered)
    expect(() => combineBuffs({ ...startRun(), buffs: pile, nextBuffId: 3 }, buffCombineKey(pile[0]))).toThrow(RangeError)
  })
})

describe('buffCombineKey', () => {
  it('tells a wild card apart from a suitless one', () => {
    expect(buffCombineKey(wildBronzeTaker(1))).not.toBe(buffCombineKey(sidestep(BuffTier.Bronze, 2)))
  })
})
```

- [x] **Step 2: Run it and watch the wild cases fail**

Run: `npx vitest run src/hunt/__tests__/buffCombine.test.ts`
Expected: non-zero exit. The wild-pairing cases fail as `NoPair` (today's rule needs two exact copies) and `combinePairFor` / `combineProductFor` / `CombineRefusal.Untiered` are unknown.

- [x] **Step 3: Add the looser key, the pair function and the product function**

In `src/hunt/buffCombine.ts`:

```ts
export const CombineRefusal = {
  AtMaxTier: 'atMaxTier',
  NoPair: 'noPair',
  /** DLR-162 — a wildcard has nothing that scales: every tier converts exactly one card, so
   *  combining two would halve the player's supply for no gain. Refused rather than allowed and
   *  then regretted — AC7's concern (a player cannot accidentally merge a wildcard's value away)
   *  applied to the wildcard itself rather than to a card made wild by one. */
  Untiered: 'untiered',
} as const

/** AC2's "identical in every respect", plus DLR-162's wild flag. Two cards share this string
 *  exactly when they are the same card at the same tier. */
export function buffCombineKey(buff: Buff): string {
  return [
    buff.kind,
    buff.tier,
    buffTargetSuitOf(buff) ?? '',
    buffTargetRankOf(buff) ?? '',
    // DLR-162 — no suitless Taker or Feeder exists today except a wild one, so nothing collides
    // right now. Included anyway: a key that cannot tell a wild card from a suitless one is a key
    // that stacks them together the moment something else changes.
    buffIsWild(buff) ? 'wild' : '',
    buff.reward.axis,
    buff.reward.value,
  ].join('|')
}

/** AC6/AC8's "same family and reward axis, suits may differ". The LOOSER sibling of
 *  `buffCombineKey`: kind, tier, rank, reward axis and reward value, with the suit and the wild
 *  flag dropped. ONLY a wild pile is allowed to pair on it — AC8 keeps family and axis mandatory,
 *  and it is only the suit that is relaxed. */
export function buffCombineFamilyKey(buff: Buff): string {
  return [buff.kind, buff.tier, buffTargetRankOf(buff) ?? '', buff.reward.axis, buff.reward.value].join('|')
}

/** The two cards a combine on `key` would actually consume, or `null` when there is no pair.
 *  THE one statement of what pairs with what — `combineRefusalFor` and `combineBuffs` both read
 *  it, so what a tile offers and what a commit destroys cannot disagree.
 *
 *  For a WILD pile a suited partner is preferred over a second wild copy: both produce the same
 *  card, and pairing wild-with-suited leaves the player holding MORE wild cards. Lowest ids
 *  throughout, so repeated combines on one pile are deterministic. */
export function combinePairFor(buffs: readonly Buff[], key: string): readonly [Buff, Buff] | null

/** The card a pair produces at `tier`, or `null` when neither input is wild and the pair's
 *  template is gone from this build. WILD IF EITHER INPUT IS WILD — this ONE conditional is AC7,
 *  and no other branch in this module can produce a suited card from a wild one. */
export function combineProductFor(a: Buff, b: Buff, tier: BuffTier, id: BuffId): Buff | null {
  if (buffIsWild(a) || buffIsWild(b)) return mintWildAtTier(a.kind, a.reward.axis, tier, id)
  const template = templateForBuff(a)
  return template === undefined ? null : mintFromTemplate(template, tier, id)
}
```

Implement `combinePairFor` as: take the exact copies of `key` in ascending id order; return `null` when there are none; when the head is wild, look first for the lowest-id card whose `buffCombineFamilyKey` matches and which is **not** wild, and pair with it if found; otherwise pair the first two exact copies when there are two; otherwise `null`. A **suited** head takes only the two-exact-copies branch.

- [x] **Step 4: Rewrite the refusal and the commit over the pair**

`combineRefusalFor` becomes: `Untiered` when the pile's card is a wildcard (`isWildcardCard`), read before everything else because it is true of the card; then `AtMaxTier` when there is no tier above (keeping DLR-159's deliberate gold-before-count ordering); then `NoPair` when `combinePairFor` is `null` **or** when `combineProductFor` would return `null`, which is the guard today's `templateForBuff === undefined` check performs. `combineBuffs` destroys exactly the two ids `combinePairFor` returns and appends `combineProductFor(...)` minted at `run.nextBuffId`, advancing it by one — keeping its existing throw, its message shape, and its `nextBuffId` discipline. Update the module's header docblock with a DLR-162 paragraph recording the widening and naming AC7 as the property `combineProductFor` enforces.

- [x] **Step 5: Word the third refusal**

In `src/app/run/manageBuffsLabels.ts` — the table is `Readonly<Record<CombineRefusal, string>>`, so the row is compile-forced:

```ts
  // DLR-162 — PLACEHOLDER copy. Says why it would be a LOSS, not merely that it is refused.
  [CombineRefusal.Untiered]: 'Every wildcard is the same — combining one would waste it',
```

- [x] **Step 6: Run the combine suite plus everything that reads the key**

Run: `npx vitest run src/hunt/__tests__/buffCombine.test.ts src/app/run/__tests__/manageBuffs.test.ts src/app/warCouncil/__tests__/buffGalleryModel.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0. `buffStackKey` delegates to `buffCombineKey`, so the gallery suite is the check that the added key segment did not change how identical cards stack.

---

## Phase 5 — Wildness, visible everywhere a buff card is drawn

AC9's four surfaces. The boundary is safe because every change here is presentational and additive: a suited card renders exactly as it does today, and each surface is covered by a test asserting both the wild and the suited reading.

### Task 11: Give a wild card its name in `src/app/warCouncil/buffLabels.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/buffLabels.ts:110-125` (`buffName`)
- Test: `src/app/warCouncil/__tests__/buffLabels.test.ts`

- [x] **Step 1: Write the failing tests for the name and the condition line**

```ts
describe('a wild card names itself (DLR-162 AC9)', () => {
  it('takes a Wild prefix where the suit prefix would go', () => {
    expect(buffName(wildBronzeTaker(1))).toBe('Wild Taker (Blade)')
    expect(buffName(wildBronzeFeederMomentum(2))).toBe('Wild Feeder (Momentum)')
  })

  it('leaves every suited and suitless name exactly as it was', () => {
    expect(buffName(bellTaker(BuffTier.Bronze, 3))).toBe('Bell-Taker (Blade)')
    expect(buffName(sidestep(BuffTier.Bronze, 4))).toBe('Sidestep (Blade)')
  })

  it('words its condition as "any suit" with no new copy — the substitution already exists', () => {
    expect(buffConditionSentence(wildBronzeTaker(5))).toBe('win a trick with any suit')
  })
})
```

- [x] **Step 2: Run it and watch the prefix cases fail**

Run: `npx vitest run src/app/warCouncil/__tests__/buffLabels.test.ts`
Expected: non-zero exit; `buffName` returns `Taker (Blade)` for the wild card.

- [x] **Step 3: Add the prefix to the naming grammar**

```ts
export function buffName(buff: Buff): string {
  const suit = buffTargetSuitOf(buff)
  const rank = buffTargetRankOf(buff)
  const family = BUFF_FAMILY_WORD[buff.kind]
  // DLR-162 AC9 — a wild card carries its wildness in the NAME as well as in its mark, so a
  // greyscale screenshot and a screen reader both read it. The prefix sits exactly where the suit
  // prefix would, because it is what replaced the suit. A wild card reports no suit and no rank,
  // so the three branches stay mutually exclusive.
  const head = buffIsWild(buff)
    ? `Wild ${family}`
    : rank !== null
      ? `${family} ${rank}`
      : suit !== null
        ? `${SUIT_WORD[suit].replace(/s$/, '')}-${family}`
        : family
  return `${head} (${BUFF_REWARD_SUFFIX[buff.reward.axis]})`
}
```

- [x] **Step 4: Run the label suite and everything that quotes a card name**

Run: `npx vitest run src/app/warCouncil/__tests__/buffLabels.test.ts src/app/run/__tests__/manageBuffsLabels.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

### Task 12: Give wild cards their own run in the loadout grid ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/buffGalleryModel.ts:28-45` (`BuffRunKind`, `BUFF_RUN_ORDER`) and `:86-96` (`buffRunOf`)
- Modify: `src/app/warCouncil/buffRunLabels.ts:11-18` (`RUN_LABEL`)
- Modify: `src/app/warCouncil/buffSuitFilterModel.ts:31-40` (`ZERO_RUN_COUNTS`)
- Test: `src/app/warCouncil/__tests__/buffGalleryModel.test.ts`

One task: `BuffRunKind` is read by three total tables, and a missing row renders a blank chip or crashes a count.

- [x] **Step 1: Write the failing test**

```ts
describe('the Wild run (DLR-162 AC9)', () => {
  it('puts a wild card in its own run, not in Suitless beside Sidestep', () => {
    expect(buffRunOf(wildBronzeTaker(1))).toBe(BuffRunKind.Wild)
    expect(buffRunOf(sidestep(BuffTier.Bronze, 2))).toBe(BuffRunKind.Suitless)
  })

  it('leaves the wildcard itself in Press — it is a card you spend, not a wild card', () => {
    expect(buffRunOf(wildcardBuff(BuffTier.Bronze, 3))).toBe(BuffRunKind.Press)
  })

  it('orders Wild after the three suits and before Suitless', () => {
    expect(BUFF_RUN_ORDER.indexOf(BuffRunKind.Wild)).toBeGreaterThan(BUFF_RUN_ORDER.indexOf(BuffRunKind.Moons))
    expect(BUFF_RUN_ORDER.indexOf(BuffRunKind.Wild)).toBeLessThan(BUFF_RUN_ORDER.indexOf(BuffRunKind.Suitless))
  })

  it('counts wild cards in the chip row', () => {
    const view = buildBuffGallery([wildBronzeTaker(1), wildBronzeTaker(2)], () => null)
    expect(runCountsFor(view, 'all')[BuffRunKind.Wild]).toBe(2)
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/app/warCouncil/__tests__/buffGalleryModel.test.ts`
Expected: non-zero exit; `BuffRunKind.Wild` is unknown.

- [x] **Step 3: Add the run and its three rows**

```ts
export const BuffRunKind = {
  Bells: 'bells',
  Keys: 'keys',
  Moons: 'moons',
  /** DLR-162 — a card whose condition ignores the suit. Its OWN run rather than `Suitless`: these
   *  runs answer "which of my cards are live on this trick", and a card live on every trick is a
   *  different answer from Sidestep, which never cared about suits in the first place. */
  Wild: 'wild',
  Suitless: 'suitless',
  Press: 'press',
} as const

export const BUFF_RUN_ORDER: readonly BuffRunKind[] = [
  BuffRunKind.Bells, BuffRunKind.Keys, BuffRunKind.Moons,
  BuffRunKind.Wild, BuffRunKind.Suitless, BuffRunKind.Press,
]

export function buffRunOf(buff: Buff): BuffRunKind {
  const suit = buffTargetSuitOf(buff)
  if (suit !== null) return RUN_FOR_SUIT[suit]
  // DLR-162 — read BEFORE the cadence split: a wild card is an Event-cadence condition card, so
  // without this it would fall into `Suitless`.
  if (buffIsWild(buff)) return BuffRunKind.Wild
  return BUFF_CADENCE[buff.kind] === BuffCadence.Activated ? BuffRunKind.Press : BuffRunKind.Suitless
}
```

Add `[BuffRunKind.Wild]: 'Wild'` to `RUN_LABEL` (PLACEHOLDER copy) and `[BuffRunKind.Wild]: 0` to `ZERO_RUN_COUNTS`. `RUN_SUIT` is a `Partial` and takes no row — a wild card has no suit to hand a `SuitMark`.

- [x] **Step 4: Run the gallery and filter suites**

Run: `npx vitest run src/app/warCouncil/__tests__/buffGalleryModel.test.ts src/app/warCouncil/__tests__/buffSuitFilterModel.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0. If either spec asserts a five-member `BUFF_RUN_ORDER`, update the figure — it is the roster's size, not a behaviour.

### Task 13: Put the wild mark on every card face ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/run/ManageBuffsCardFace.tsx`
- Modify: `src/app/warCouncil/BuffCard.tsx:47-72`
- Modify: `src/app/run/HeldBuffCard.tsx:24-40`
- Modify: `src/app/run/CombineGroupCard.tsx:1-70` — import the extracted face, delete the local one
- Modify: `src/app/warCouncil/warCouncilBuffCard.css` — a `.wc-buffcard-wild` class
- Test: `src/app/warCouncil/__tests__/BuffCard.test.tsx`

- [x] **Step 1: Extract the shared face rather than adding a fourth copy**

Move `CombineGroupCard.tsx`'s local `CardFace` function verbatim into `src/app/run/ManageBuffsCardFace.tsx` as a default-exported component, with a docblock stating it was extracted once a second consumer (Task 16's target tile) made the duplication real — the same reasoning `buffCardVisuals.ts` records for its own extraction. Import it in `CombineGroupCard.tsx` and delete the local copy. **No markup or class changes in the move** — a pure extraction, so any visual difference afterwards is a defect.

- [x] **Step 2: Write the failing test for the wild card's face**

Append to `src/app/warCouncil/__tests__/BuffCard.test.tsx`:

```tsx
it('draws the wild mark where a suit mark would go, and says Wild in its accessible name', () => {
  render(<BuffCard stack={stackOf(wildBronzeTaker(1))} poised={false} tabIndex={0} onTap={() => {}} />)
  const card = screen.getByRole('button')
  expect(card).toHaveAccessibleName(/Wild Taker \(Blade\)/)
  expect(card.querySelector('.wc-buffcard-wild-mark')).not.toBeNull()
  expect(card.querySelector('.wc-buffcard-suit-none')).toBeNull()
})
```

- [x] **Step 3: Run it and watch it fail**

Run: `npx vitest run src/app/warCouncil/__tests__/BuffCard.test.tsx`
Expected: non-zero exit; the wild mark is absent and the empty suit slot is present.

- [x] **Step 4: Render the mark in all three faces**

In each of `BuffCard.tsx`, `HeldBuffCard.tsx` and `ManageBuffsCardFace.tsx`, replace the two-branch suit slot with a three-branch one, reading `buffIsWild` beside `buffTargetSuitOf`:

```tsx
  const wild = buffIsWild(buff)
  const className = `wc-buffcard ${TIER_CLASS[buff.tier]}${
    wild ? ' wc-buffcard-wild' : suit !== null ? ` ${SUIT_CLASS[suit]}` : ''
  }`
  // …in the card's top row:
  {wild ? (
    <span className="wc-buffcard-suit wc-buffcard-wild-mark">
      <WildMark />
    </span>
  ) : suit !== null ? (
    <span className="wc-buffcard-suit">
      <SuitMark suit={suit} />
    </span>
  ) : (
    <span className="wc-buffcard-suit wc-buffcard-suit-none" />
  )}
```

- [x] **Step 5: Add the frame class**

In `src/app/warCouncil/warCouncilBuffCard.css`, beside `.wc-buffcard-bells` / `-keys` / `-moons`:

```css
/* DLR-162 — a wild card sets the same three custom properties a suit does, so the payoff chip and
   the mark tint resolve exactly as a suited card's do rather than falling back to an unset value.
   It BORROWS --wc-brass rather than introducing a fourth field colour: tier already owns the
   metallic frame and suit already owns the field, and `game-ux` forbids a second categorical axis
   in a field colour. Wildness is carried by the MARK and by the `Wild` prefix in the name, so it
   survives greyscale. The tint is the developer's to change (`tasks.md` → Developer decides). */
.wc-buffcard-wild {
  --wc-buffcard-payoff-bg: var(--wc-brass);
  --wc-buffcard-payoff-fg: #221a08;
  --wc-buffcard-suit-color: var(--wc-brass-dim);
}
```

- [x] **Step 6: Run the three faces' suites**

Run: `npx vitest run src/app/warCouncil/__tests__/BuffCard.test.tsx src/app/run/__tests__/CombineGroupCard.test.tsx; npm run typecheck; (Get-Content src\app\warCouncil\BuffCard.tsx).Count`
Expected: Vitest reports 0 failed; `typecheck` exits 0; the line count is under 400. If a `CombineGroupCard.test.tsx` does not exist at that path, run `Get-ChildItem src\app\run\__tests__ | Select-String -Pattern "Combine"` and run whatever spec covers that component.

---

## Phase 6 — The Manage Buffs screen: the band, the target mode, and the widened tile

The screen the wildcard is spent on. Every arithmetic answer comes from `manageBuffs.ts`, which is pure and tested with no renderer; the components render it and own one piece of mode state between them. Layout and interaction follow `mockup.html` in this folder. The boundary is safe because the view model lands before the components that read it, and the panel is the last thing to change.

### Task 14: Teach the view model about wildcards and targets ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/run/manageBuffs.ts` (whole file)
- Test: `src/app/run/__tests__/manageBuffs.wild.test.ts`

- [x] **Step 1: Write the failing spec for the band and the target grid**

`src/app/run/__tests__/manageBuffs.wild.test.ts`:

```ts
describe('the wildcard band', () => {
  it('lists every held wildcard id, ascending, and is empty when none are held', () => {
    expect(manageBuffsView([bellTaker(BuffTier.Bronze, 1)]).wildcards).toEqual([])
    expect(manageBuffsView([wildcardBuff(BuffTier.Bronze, 5), wildcardBuff(BuffTier.Silver, 2)]).wildcards).toEqual([2, 5])
  })
})

describe('the target grid (AC5)', () => {
  const pile = [
    wildcardBuff(BuffTier.Bronze, 1),
    bellTaker(BuffTier.Bronze, 2),
    sidestep(BuffTier.Bronze, 3),
    wildBronzeTaker(4),
  ]

  it('includes every held card, refused ones with their reason', () => {
    const tiles = manageBuffsView(pile).wildTargets
    const byId = new Map(tiles.map((t) => [t.ids[0], t]))
    expect(byId.get(2)?.refusal).toBeNull()
    expect(byId.get(3)?.refusal).toBe(WildRefusal.NoSuit)
    expect(byId.get(4)?.refusal).toBe(WildRefusal.AlreadyWild)
    expect(byId.get(1)?.refusal).toBe(WildRefusal.NoSuit)
  })

  it('previews exactly what a selectable target becomes, and nothing for a refused one', () => {
    const tiles = manageBuffsView(pile).wildTargets
    const ready = tiles.find((t) => t.refusal === null)!
    expect(ready.produces).not.toBeNull()
    expect(buffIsWild(ready.produces!)).toBe(true)
    expect(tiles.filter((t) => t.refusal !== null).every((t) => t.produces === null)).toBe(true)
  })

  it('puts selectable targets first, refused ones after', () => {
    const tiles = manageBuffsView(pile).wildTargets
    const firstRefused = tiles.findIndex((t) => t.refusal !== null)
    expect(tiles.slice(0, firstRefused).every((t) => t.refusal === null)).toBe(true)
  })
})

describe('a wild pile names the card it eats', () => {
  it('reports the suited partner on the group, and null for an ordinary combine', () => {
    const wildPile = manageBuffsView([wildBronzeTaker(1), bellTaker(BuffTier.Bronze, 2)]).groups
    const wildGroup = wildPile.find((g) => g.refusal === null)!
    expect(wildGroup.partner?.id).toBe(2)

    const plain = manageBuffsView([bellTaker(BuffTier.Bronze, 1), bellTaker(BuffTier.Bronze, 2)]).groups
    expect(plain.find((g) => g.refusal === null)!.partner).toBeNull()
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/app/run/__tests__/manageBuffs.wild.test.ts`
Expected: non-zero exit; `wildcards`, `wildTargets` and `partner` are unknown.

- [x] **Step 3: Extend the view model**

Add `WildTargetTile` and the two `ManageBuffsView` fields exactly as `plan.md` Part 2 → Data shapes declares them. Build `wildTargets` from the same `heldBuffStacks` grouping the combine bands use — one grouping, not a second — attaching `wildRefusalFor(stack.buff)` and, when it is null, `wildenedBuff(stack.buff)` re-minted at `PREVIEW_ID` for wording only. Derive `CombineGroup.partner` from `combinePairFor`: the second card when its id differs from the pile's own head, `null` otherwise. Keep the existing ready-then-refused ordering and the existing `held` / `readyCount` figures untouched, and add a paragraph to the module docblock recording that the screen now has two gestures rather than one.

- [x] **Step 4: Run both view-model suites and the fast gate**

Run: `npx vitest run src/app/run/__tests__/manageBuffs.wild.test.ts src/app/run/__tests__/manageBuffs.test.ts; npm run typecheck; (Get-Content src\app\run\manageBuffs.ts).Count`
Expected: Vitest reports 0 failed; `typecheck` exits 0; the line count is under 400.

### Task 15: Word the screen and wire the spend through the hook ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/run/manageBuffsLabels.ts` — `WILD_REFUSAL_MESSAGE`, the band's copy, the confirm-face text, and `combineConfirmDestroyPairText`
- Modify: `src/app/run/useManageBuffs.ts` — `spendWild`
- Test: `src/app/run/__tests__/manageBuffsLabels.test.ts`

- [x] **Step 1: Add the copy and its tests**

Add every string and helper `plan.md` Part 2 → Data shapes lists for this file, each marked PLACEHOLDER copy in the style the file already uses, with `WILD_REFUSAL_MESSAGE` typed `Readonly<Record<WildRefusal, string>>` so a third refusal fails to compile rather than rendering blank on a card face. `combineConfirmDestroyPairText(buff, partner)` returns `2 × <card>` when `partner` is null and `1 × <card> + 1 × <partner>` when it is not — so the confirm face never says "2 ×" of a card the player owns one of.

Test each: the two refusal messages resolve, the pair text takes both shapes, and `wildConfirmMakeText` names the produced card with its payoff.

- [x] **Step 2: Add `spendWild` to the hook**

```ts
  /** DLR-162 — spends the LOWEST-ID held wildcard on `targetId` and returns the converted card's
   *  pile key, so the panel can badge where it landed. The key is derived from the tile's own
   *  preview, not from the new run: the functional update has not run yet, and reading `run` after
   *  `setRun` would read the stale one — the reasoning `combine` above already records. */
  function spendWild(targetId: BuffId): string {
    const tile = view.wildTargets.find((candidate) => candidate.ids.includes(targetId))
    const wildcardId = view.wildcards[0]
    if (tile === undefined || tile.produces === null || wildcardId === undefined) {
      throw new RangeError(`Cannot make ${targetId} wild — no such target is selectable on this screen`)
    }
    const producedKey = buffCombineKey(tile.produces)
    setRun((current) => spendWildcard(current, wildcardId, targetId))
    return producedKey
  }
```

- [x] **Step 3: Run the label suite and the fast gate**

Run: `npx vitest run src/app/run/__tests__/manageBuffsLabels.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

### Task 16: Build the band and the target mode ✓

- Skill: `react-frontend`, and `game-ux` for the layout and the keyboard model

**Files:**

- Create: `src/app/run/WildcardBand.tsx`, `src/app/run/WildTargetCard.tsx`
- Modify: `src/app/run/ManageBuffsPanel.tsx`
- Modify: `src/app/run/manageBuffs.css`
- Test: `src/app/run/__tests__/ManageBuffsPanel.wild.test.tsx`

Layout, band position, tile shape and the two-tap gesture follow `mockup.html` in this folder — in particular its wildcard band above the two combine bands, and its confirmation living **on the target tile** rather than at a distant control.

- [x] **Step 1: Write the failing component spec for the gesture, focus and `Escape`**

`src/app/run/__tests__/ManageBuffsPanel.wild.test.tsx`, querying by role and accessible name throughout:

```tsx
it('renders no band at all when the player holds no wildcard', () => { /* game-ux: a panel with nothing to say says nothing */ })
it('arms the target mode from the band, replacing the combine bands', () => { /* … */ })
it('puts the confirmation on the target tile, naming what is destroyed and what is made', () => { /* … */ })
it('commits the spend and announces it through the ledger', () => { /* … */ })
it('renders a refused target as a non-interactive tile carrying its reason', () => { /* … */ })
it('moves between targets with the arrow keys, one tab stop for the whole grid', () => { /* … */ })
it('cancels the armed target with Escape, then leaves the mode with a second Escape', () => { /* … */ })
it('returns focus to the tile that had it after a cancel, and to the band after leaving the mode', () => { /* … */ })
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/app/run/__tests__/ManageBuffsPanel.wild.test.tsx`
Expected: non-zero exit; the band and its control do not exist.

- [x] **Step 3: Build the two components**

`WildcardBand.tsx` renders the held-wildcard count, the rule sentence, one card face for the wildcard itself, and the arm control — and renders **nothing at all** when `wildcards.length === 0`, per `game-ux`'s rule against a panel that reports that nothing is happening. `WildTargetCard.tsx` renders one target tile in the three faces `CombineGroupCard.tsx` already establishes: refused as a non-interactive `<li>` with the reason on its face, selectable as a `<button>` whose accessible name states what it would become, and armed as its own confirmation face with `Make wild` carrying `autoFocus` and a `Cancel` beside it. Both reuse `ManageBuffsCardFace.tsx` from Task 13 rather than drawing a card.

- [x] **Step 4: Add the mode to the panel**

Add one piece of ephemeral state — the mode, plus which target is armed — to `ManageBuffsPanel.tsx`, feed the target grid through the existing `useRovingTabIndex` over the **selectable** targets only (a refused tile carries no button, exactly as in the combine bands), extend the existing `Escape` handler to cancel an armed target and then leave the mode, and add the target keys to the existing post-render focus request list. Register **no new effect, listener, timer or observer** — the panel's one existing effect is a focus restore and keeps its exact shape.

- [x] **Step 5: Style the band and the target bands**

Extend `src/app/run/manageBuffs.css` with the band and the two target bands, following `mockup.html`'s CSS as the draft of these rules. Every `clamp()` bound is a PLACEHOLDER the developer owns, and the tile width reuses `--wc-buffcard-w` rather than inventing a number — the reasoning that sheet's own header already records. Keep the shell's `100dvh` / `overflow: hidden` / safe-area grid untouched: the band is a row inside `.mb-stage`, not a fourth shell row.

- [x] **Step 6: Run the panel suites and measure every file this task grew**

Run: `npx vitest run src/app/run/__tests__/ManageBuffsPanel.wild.test.tsx src/app/run/__tests__/ManageBuffsPanel.test.tsx; npm run typecheck; (Get-Content src\app\run\ManageBuffsPanel.tsx).Count; (Get-Content src\app\run\WildcardBand.tsx).Count; (Get-Content src\app\run\WildTargetCard.tsx).Count`
Expected: Vitest reports 0 failed; `typecheck` exits 0; every line count under 400. If `ManageBuffsPanel.tsx` breaches, split the target mode into its own component in this task.

### Task 17: Name both destroyed cards on the combine tile's confirm face ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/run/CombineGroupCard.tsx` — the armed face and the ready strip
- Test: `src/app/run/__tests__/CombineGroupCard.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
it('names both cards a wild combine destroys, not "2 ×" of a card the player owns one of', () => {
  render(<CombineGroupCard group={wildGroupWithBellTakerPartner()} armed={true} /* … */ />)
  expect(screen.getByText(/1 × Bronze Wild Taker \(Blade\) \+ 1 × Bronze Bell-Taker \(Blade\)/)).toBeInTheDocument()
})

it('still says "2 ×" for an ordinary same-card combine', () => { /* … */ })
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/app/run/__tests__/CombineGroupCard.test.tsx`
Expected: non-zero exit; the armed face still reads `2 × Bronze Wild Taker (Blade)`.

- [x] **Step 3: Read the partner on the confirm face and the ready strip**

Replace `combineConfirmDestroyText(buff)` with `combineConfirmDestroyPairText(buff, group.partner)` in the armed face, and where `group.partner` is non-null add its name to the ready strip so the player knows what a combine will eat before arming it — `mockup.html`'s `⇧ Combine → II · eats a Bell-Taker`.

- [x] **Step 4: Run the tile's suite and the fast gate**

Run: `npx vitest run src/app/run/__tests__/CombineGroupCard.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

---

## Phase 7 — Final verification

No production changes — only sanity checks that the cumulative work is clean.

### Task 18: Confirm the pure-core boundary still holds ✓

- Skill: `none — a verification grep, no code`

**Files:**

- Test: (none — read-only checks)

- [x] **Step 1: Grep the two lint-enforced pure trees for React and DOM references**

Run: `Get-ChildItem src\hunt,src\sim -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|Math\.random"`
Expected: zero hits. `src/hunt/buffWild.ts` is the new file this exists to check; `src/sim/**` gained no import and must still be clean. Note the recursive form — `Select-String -Path` with a `**` glob reaches exactly one directory level and would report a false zero.

- [x] **Step 2: Confirm nothing new touches browser storage**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "globalThis\.(localStorage|sessionStorage)\b|\b(localStorage|sessionStorage)\.(getItem|setItem|removeItem|clear)\("`
Expected: exactly the three pre-existing hits `.claude/rules/save-data-versioning.md` records — two in `src/persistence/browserStorage.ts` and one docblock mention in `src/persistence/saveStore.ts`. Any fourth hit is a rule violation; `npm run lint` is the actual gate and runs in Task 20.

### Task 19: Confirm no tunable was hard-coded and no file breached its budget ✓

- Skill: `none — verification only`

**Files:**

- Test: (none — read-only checks)

- [x] **Step 1: Confirm the wildcard's stocking weight lives only in the weight table**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "Wildcard\]: 1\b"`
Expected: exactly two hits, both in `src/hunt/slotWeights.ts` — the two `SLOT_FAMILY_WEIGHTS` rows. A third hit anywhere else is the figure duplicated at a call site.

- [x] **Step 2: Measure every file this contract created or grew**

Run: `Get-ChildItem src\hunt\buffWild.ts,src\hunt\buffCombine.ts,src\hunt\buffTemplates.ts,src\hunt\buffActivation.ts,src\hunt\index.ts,src\app\run\manageBuffs.ts,src\app\run\ManageBuffsPanel.tsx,src\app\run\manageBuffsLabels.ts,src\app\run\WildcardBand.tsx,src\app\run\WildTargetCard.tsx,src\app\run\ManageBuffsCardFace.tsx,src\app\warCouncil\buffLabels.ts,src\app\warCouncil\WildMark.tsx,src\app\warCouncil\BuffCard.tsx | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count **under 400**. `src/hunt/index.ts` was 388 before this contract and is the one to watch. Any breach is fixed in this ticket, not reported as a finding.

### Task 20: Static gates and the full suite — DELEGATED TO QA

- Skill: `none — verification only`

> **Batch run 2026-09-03:** every step of this task belongs to the central QA pass that runs once
> across all five contracts, not to this contract's Implementer. `npm run typecheck` was run here
> as a signal and exits 0; the unfiltered suite, `npm run lint`, `prettier --check` and
> `npm run build` were NOT run and stay unticked.

**Files:**

- Test: (none — the whole suite)

- [ ] **Step 1: Warm the transform cache, then run the projects separately**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. Running them separately first is what avoids the cold-cache `[vitest-pool-runner]: Timeout waiting for worker to respond` on the `dom` project, which is infrastructure and not a failing test.

- [ ] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed and quotes its `Tests  N passed` line.

- [ ] **Step 3: Formatting, scoped to the files this contract changed**

Run: `npx prettier --check src\hunt\buffWild.ts src\hunt\buffs.ts src\hunt\buffCombine.ts src\hunt\buffTemplates.ts src\hunt\buffCatalog.ts src\hunt\buffCosts.ts src\hunt\buffActivation.ts src\hunt\consumables.ts src\hunt\buffEvaluation.ts src\hunt\slotWeights.ts src\hunt\index.ts src\app\run src\app\warCouncil`
Expected: exits 0. Do **not** run `npm run format` — it rewrites ~59 repo files including every hand-edited design document.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 21: Update the PR description ✓

- Skill: `none — a document for the developer`

**Files:**

- Create: `.claude/contract/DLR-162-the-wildcard/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- A link to `plan.md` in this folder, and to `mockup.html`.
- What the change does, in the game's own words: a scarce card you spend between fights to take the suit off a card you own, so it fires on any trick; wild cards climb tiers by eating suited cards of the same family; wildness can never be lost.
- **Every decision the developer must make**: the wildcard's stocking weight on both machines, whether a higher-tier wildcard should do more than a bronze one, every placeholder string on the new surfaces, and the wild mark's drawing and tint.
- **Every behaviour they must judge by playing**: whether the wild pile owning the combine reads right, whether the auto-picked fodder feels right, and whether the pile eventually becomes nothing but raw material for wild lines.
- Verification results from Task 20, quoting the actual `Tests  N passed` line and the four exit codes.
- A one-line note for future contributors on the two conventions this contract introduces: **wild cards are minted by transformation and never from a template**, and **an activated-card branch is a total `Record` over `BuffActivatedTemplateKind`, never a Cheat-or-else-Timebomb ternary**.
- A one-line note that the headless simulator now sees wildcards it cannot spend, so future simulated win rates slightly under-estimate the real game.

---

## Self-review

(Filled by the planner before handing off, so the executor can confirm coverage.)

**Spec coverage:**

- The wildcard as a new consumable, and its stocking weight — Tasks 3, 4, 5, 7 (criteria 1 and 10).
- A wild flag on a buff card, and the condition check that ignores the suit — Tasks 1, 2 (criteria 2's shape and 3).
- Spending the wildcard, its refusals, and one-card-per-wildcard — Tasks 8, 14, 15, 16 (criteria 2, 4, 5).
- The widened combine rule and wildness being absorbing — Task 10, with criterion 7 asserted as a property over a mixed pile; the confirm face names both destroyed cards in Task 17 (criteria 6, 7, 8).
- Family and reward axis still mandatory — Task 10's across-families / across-axes / across-tiers case (criterion 8).
- Rendering a wild card wherever a buff card is rendered — Task 11 (the name), Task 12 (the loadout run), Task 13 (the three card faces), Task 6 (the machine's strip and reel windows); the lit-card highlighting needs no work and Task 2's tests are what prove it, since the hand's lit state derives through `buffFires` (criterion 9).
- Refusing the wildcard on the felt so no tile lies — Task 9. Not a criterion; a consequence of criterion 1 that would otherwise ship a dead control.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact diff, or a runnable command with `Run:` / `Expected:`. The word "PLACEHOLDER" appears only as required source-comment text marking copy and tuning values the developer owns — which is this repo's own convention, not an unfilled step.

**Type / name consistency:** `buffIsWild`, `WildRefusal`, `wildRefusalFor`, `isWildcardCard`, `mintWildAtTier`, `wildenedBuff`, `spendWildcard`, `wildcardBuff`, `buffCombineFamilyKey`, `combinePairFor`, `combineProductFor`, `CombineRefusal.Untiered`, `BuffActivationRefusal.ShopOnly`, `BuffActivationStock.shopOnly`, `isShopOnlyBuff`, `BuffRunKind.Wild`, `WildTargetTile`, `ManageBuffsView.wildcards` / `.wildTargets`, `CombineGroup.partner`, `spendWild`, `WildMark`, `ManageBuffsCardFace`, `combineConfirmDestroyPairText`, `WILD_REFUSAL_MESSAGE`, the template id `'wildcard'`, and the classes `.wc-buffcard-wild` / `.wc-buffcard-wild-mark` are each spelled identically in every task that touches them and match `plan.md` Part 2 → Data shapes.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking: two additive changes, and nothing in the game can construct a wild card yet, so every existing behaviour is unchanged.
- **Phase 2** ends type-checking: the kind, its four compile-forced table rows, its minting function, its template, its glyph and its weight all land together — Tasks 3, 5 and 6 are in one phase precisely because each widening compile-forces the next.
- **Phase 3** ends type-checking and with no lying control: the conversion works and the felt refuses the card, both in the same phase.
- **Phase 4** ends type-checking: the three new functions and the two rewritten ones land in one task, with the compile-forced wording row beside them.
- **Phase 5** ends type-checking: presentational and additive only, each surface covered by a wild and a suited assertion.
- **Phase 6** ends type-checking: the view model lands before the components that read it, and the panel changes last.
- **Phase 7** makes no production change at all.
