# Tasks: Skull Helmet and Skull Tether — two buff cards that protect a streak from a skull you could not dodge

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-09-02

**Goal:** Two new buff-card families whose reward is protection rather than damage or multiplier — when a trick hurts you, the Helmet keeps your `total` and the Tether keeps your `roll`, the health always lands, and gold adds one to whichever figure survived.

**Spec:** `plan.md` in this folder. Layout, glyph and copy reference: `mockup.html` in this folder.

---

## File map

**Created:**
- `src/hunt/buffProtection.ts` — the protection derivation, the no-stacking rule, and the one statement of the tier widening
- `src/hunt/__tests__/buffProtection.test.ts` — its truth table
- `src/warCouncil/pot.ts` — `potValue` / `applyPot` / `incomingFromPot`, lifted out of `streak.ts` for the 400-line budget
- `src/app/run/__tests__/slotSymbols.test.ts` — the reel-face spec; `slotSymbols.ts` has none today

**Modified:**
- `src/hunt/buffs.ts` — two `BuffKind` members, one `BuffRewardAxis` member, two `BUFF_CADENCE` rows
- `src/hunt/buffCosts.ts` — `BuffMintedAxis`, the widened `BuffConditionKind`, a `REWARD_BASE` Protection row, two `CONDITION_MODIFIER` rows, `narrowToMintedAxis`, `isProtectiveAxis`
- `src/hunt/buffTemplates.ts` — the two `MintableConditionKind` members, the `MintableRewardAxis` member, `REWARD_TIER_VALUE`'s Protection ladder, two `TEMPLATE_FAMILIES` rows
- `src/hunt/buffEvaluation.ts` — two cases in `buffFires`' total switch
- `src/hunt/buffAccrual.ts` — a protective buff is skipped above `narrowToCostAxis` in both `resolveFiredBuffs` and `trickBonusFor`, and still counted toward the Overlap Bonus
- `src/hunt/slotWeights.ts` — two family weights per machine, one axis weight per machine
- `src/hunt/index.ts` — barrel exports for the new module, types and predicates
- `src/warCouncil/streak.ts` — the pot moves out; the reset block becomes two independent guards
- `src/warCouncil/index.ts` — the four pot symbols re-exported from `./pot`
- `src/app/warCouncil/buffLabels.ts` — family words, the widened condition sentence table, the reward suffix, the reward-phrase case, the cadence pill words
- `src/app/warCouncil/resolutionBeats.ts` — `potLost` becomes the pot actually lost
- `src/app/run/slotSymbols.ts` — two glyph variants, `conditionGlyphFor`, two family words, one axis word
- `src/app/run/SlotGlyph.tsx` — two drawn marks
- `src/app/run/shopSlot.css` — two `[data-glyph]` colour rows
- `src/app/run/shopSlotReel.css` — two `[data-glyph]` colour rows
- `src/app/warCouncil/warCouncil.css` — a `--wc-guard` colour token, only if no existing token fits
- `src/hunt/__tests__/buffTemplates.test.ts` — the template count moves 16 → 18
- `src/sim/__tests__/reachability.test.ts` — mintable kinds 5 → 7, template count 16 → 18
- `src/warCouncil/__tests__/streak.test.ts` — pot imports move to `../pot`
- `src/warCouncil/__tests__/streak.formula.test.ts` — pot imports move to `../pot`

**Deleted:** (none)

**Developer decides or observes:**
- `src/hunt/slotWeights.ts` → `SLOT_FAMILY_WEIGHTS` — the Skull Helmet and Skull Tether weight on each of the two machines. Placeholder 3 / 2 on Skirmisher and 1 / 1 on Strongbox. Trades how often either card is offered against how often a damage card is. `ideas.md` names this open, including whether a protective card belongs on the damage strip at all.
- `src/hunt/slotWeights.ts` → `SLOT_AXIS_WEIGHTS` — the Protection axis weight on each machine. Placeholder 3 / 1. Inert today, because each of the two families has exactly one axis and the weight cancels out of `templateWeightFor`; it exists to keep the table total.
- `src/hunt/buffCosts.ts` → `REWARD_BASE[Protection]` — the AP price base per tier. Placeholder 2 / 3 / 4.
- `src/hunt/buffCosts.ts` → `CONDITION_MODIFIER` for the two families — the reliability discount or surcharge. Placeholder 0 for both.
- `src/hunt/buffTemplates.ts` → `REWARD_TIER_VALUE[Protection]`'s gold figure. Built as AC6's `+1`; the ticket and `ideas.md` both flag `+1` as possibly undersized against the game's own 1/3/5 and 2/3/5 ladders. Judge after playing.
- All placeholder copy: `Skull Helmet` / `Skull Tether` as card names, `Helmet` / `Tether` as reel words, `Guard` as the reward suffix, `HURT` as the cadence pill, and the two condition sentences.
- The two glyph drawings, judged against `mockup.html`'s greyscale button: the helmet and the tether marks share a colour and must still be distinguishable from each other and from Sidestep with colour removed.
- Whether the pair feels like counterplay in a real hand — the whole point of the ticket, and only answerable by playing.

---

## Phase 1 — The two kinds, the new axis, and every table the compiler forces

This phase adds the vocabulary and fills every total `Record` and total `switch` that the union widening breaks. It is one phase rather than several because a widened `BuffKind` does not type-check until all three of its total tables are filled, and two of those live in `src/app/`. Safe stopping point: the whole tree type-checks, the pool is 18 templates, and the two cards can be minted, priced, armed, evaluated and rendered — they simply do not protect anything yet, because the streak's reset path is Phase 2.

### Task 1: Confirm DLR-160's dead-buff module before relying on it ✓

- Skill: none — a read-only preflight check, no code written.

**Files:**
- (none — inspection only)

- [x] **Step 1: Check whether the generic "armed and did not fire" mechanism exists yet**

Run: `Get-ChildItem src\app\warCouncil\resolutionDeadBuffs.ts -ErrorAction SilentlyContinue`
Expected: the file is listed. It is DLR-160's Task 8 and it composes its reason text from `buffName` + `buffConditionSentence`, so this contract's Task 10 (the two families' name and condition sentence) satisfies acceptance criterion 10 with no further code.

If the file is **absent**, DLR-160 has not landed. Do **not** build a second copy of that mechanism — the two would drift, which is exactly what that module's own docblock is written against. Record in the final report that acceptance criterion 10 is unmet pending DLR-160, and continue with every other task in this contract unchanged.

### Task 2: Two kinds and one reward axis, in `src/hunt/buffs.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffs.ts:24-49,58-72,168-190`

- [x] **Step 1: Add the two `BuffKind` members**

Append to the `BuffKind` map, below the `Shield` row, leaving every existing member's string value untouched:

```ts
  // DLR-161 — the two protective condition families. Their reward is neither damage nor
  // multiplier: they keep one of the streak's two figures through a trick that hurt you.
  SkullHelmet: 'skullHelmet',
  SkullTether: 'skullTether',
```

- [x] **Step 2: Add the `Protection` reward axis**

Append to the `BuffRewardAxis` map, below `None`:

```ts
  /** DLR-161 — the first reward that is neither flat damage nor multiplier. `REWARD_TIER_VALUE`'s
   *  figure on this axis is the GOLD BONUS added to the SURVIVING figure (0 / 0 / 1), not the
   *  protection itself: the protection is carried by the buff having fired at all. The zero at
   *  bronze and silver is therefore real and not this codebase's "plausible zero that
   *  type-checks" — `buffProtection.ts`'s docblock is where that reasoning is written down. */
  Protection: 'protection',
```

- [x] **Step 3: Add the two `BUFF_CADENCE` rows**

`BUFF_CADENCE` is `Readonly<Record<BuffKind, BuffCadence>>` and will not compile without them. Both are per-trick condition families, like Taker, Feeder and Sidestep:

```ts
  [BuffKind.SkullHelmet]: BuffCadence.Event,
  [BuffKind.SkullTether]: BuffCadence.Event,
```

- [x] **Step 4: Confirm this file alone is consistent**

Run: `npx vitest run src/hunt/__tests__/buffs.test.ts`
Expected: exits 0, 0 failed. The rest of the tree does not type-check yet — that is Task 3 onward.

### Task 3: The axis split and the two prices, in `src/hunt/buffCosts.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffCosts.ts:31-50,63-83,135-160`
- Test: `src/hunt/__tests__/buffCosts.test.ts`

- [x] **Step 1: Add `BuffMintedAxis` beside the unchanged `BuffCostAxis`**

Leave `BuffCostAxis`'s four members exactly as they are — it keeps owning the four per-hand accrual switches — and add below it:

```ts
/** DLR-161 — every axis a TEMPLATE can be minted on: the four accrual axes plus Protection.
 *  Protection has an AP price base and a reward ladder but NO per-hand accrual counter, because
 *  it pays into the streak's reset rather than into a pool. Split from `BuffCostAxis` rather
 *  than widening it deliberately: widening would compile-force `accrualCapFor`,
 *  `accrueAxisBonus`, `accrueCarry` and `trickBonusFor` to each grow a Protection case that
 *  returns "nothing" — a plausible zero in four places, instead of one honest exclusion in two. */
export type BuffMintedAxis = BuffCostAxis | typeof BuffRewardAxis.Protection
```

- [x] **Step 2: Widen `BuffConditionKind` by the two families**

Append to the union, below `Cornered`:

```ts
  | typeof BuffKind.SkullHelmet
  | typeof BuffKind.SkullTether
```

This is what makes `isConditionFamily` return `true` for both, which is what lets `activatableBuffs` offer them in the arming window (AC1).

- [x] **Step 3: Re-key `REWARD_BASE` and add its Protection row**

```ts
export const REWARD_BASE: Readonly<Record<BuffMintedAxis, Readonly<Record<BuffTier, number>>>> = {
  // …the four existing rows UNCHANGED…
  // DLR-161 — NOBODY CHOSE THESE THREE NUMBERS. No source document prices a protective axis.
  // The ladder shape is copied from Coins'. UNIT: action points, added to CONDITION_MODIFIER
  // before the clamp. See `tasks.md` → Developer decides or observes.
  [BuffRewardAxis.Protection]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 3, [BuffTier.Gold]: 4 },
}
```

- [x] **Step 4: Add the two `CONDITION_MODIFIER` rows**

```ts
  // DLR-161 — NOBODY CHOSE THESE TWO NUMBERS. 0 is the neutral row Taker and Glutton already
  // take. UNIT: action points. See `tasks.md` → Developer decides or observes.
  [BuffKind.SkullHelmet]: 0,
  [BuffKind.SkullTether]: 0,
```

- [x] **Step 5: Add `narrowToMintedAxis` and `isProtectiveAxis`, and repoint `buffApCost`**

Leave `narrowToCostAxis` exactly as it is — `buffAccrual.ts`'s two call sites still need the narrow four — and add beside it:

```ts
/** DLR-161 — an axis that pays by protecting a streak figure. It contributes to NO per-hand
 *  accrual counter and to NO trick's damage, so `buffAccrual.ts` checks this ABOVE
 *  `narrowToCostAxis` rather than asking that function to grow a fifth case. */
export function isProtectiveAxis(
  axis: BuffRewardAxis,
): axis is typeof BuffRewardAxis.Protection {
  return axis === BuffRewardAxis.Protection
}

/** Narrows to the axes the two reward LADDERS (`REWARD_BASE`, `REWARD_TIER_VALUE`) are keyed by.
 *  Throws rather than defaulting to zero, for `narrowToCostAxis`'s own stated reason: a template
 *  minted on an axis with no base is a construction bug, and a silent zero would price it at the
 *  clamp floor and look reasonable. */
export function narrowToMintedAxis(axis: BuffRewardAxis, contextLabel: string): BuffMintedAxis {
  if (axis === BuffRewardAxis.Protection) return axis
  return narrowToCostAxis(axis, contextLabel)
}
```

and change the one line in `buffApCost`:

```ts
  const base = REWARD_BASE[narrowToMintedAxis(axis, 'Reward axis')][tier]
```

- [x] **Step 6: Extend the cost spec**

Add cases asserting that `buffApCost(BuffKind.SkullHelmet, BuffRewardAxis.Protection, tier)` returns the clamped `REWARD_BASE + CONDITION_MODIFIER` figure at all three tiers, that `isConditionFamily` is `true` for both new kinds, that `isProtectiveAxis` is `true` only for `Protection`, and that `narrowToMintedAxis` still throws a `RangeError` on `BuffRewardAxis.HeartCount`.

Run: `npx vitest run src/hunt/__tests__/buffCosts.test.ts`
Expected: exits 0, 0 failed.

### Task 4: The two template families, in `src/hunt/buffTemplates.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffTemplates.ts:60-80,105-130,240-250`
- Test: `src/hunt/__tests__/buffTemplates.test.ts:18-20,69-75`
- Test: `src/sim/__tests__/reachability.test.ts:14-28,73-76`

- [x] **Step 1: Widen the two mintable unions**

```ts
export type MintableConditionKind =
  | typeof BuffKind.Taker
  | typeof BuffKind.Feeder
  | typeof BuffKind.Sidestep
  // DLR-161 — the two protective families. This is the widening the ticket names as the
  // mechanism; the other eight cut families stay unconstructible and Glutton in particular is
  // NOT restored — these two carry their own `buffFires` cases (AC2).
  | typeof BuffKind.SkullHelmet
  | typeof BuffKind.SkullTether

export type MintableRewardAxis =
  | typeof BuffRewardAxis.Magnitude
  | typeof BuffRewardAxis.Multiplier
  | typeof BuffRewardAxis.Protection
```

- [x] **Step 2: Re-key `REWARD_TIER_VALUE` and add the Protection ladder**

```ts
export const REWARD_TIER_VALUE: Readonly<
  Record<BuffMintedAxis, Readonly<Record<BuffTier, number>>>
> = {
  // …the four existing rows UNCHANGED…
  // DLR-161 AC6, TRANSCRIBED, not chosen: the figure added to the SURVIVING streak figure.
  // Zero below gold because protection at bronze and silver is the survival itself.
  // UNIT: damage for the Helmet's total, tricks for the Tether's roll.
  [BuffRewardAxis.Protection]: { [BuffTier.Bronze]: 0, [BuffTier.Silver]: 0, [BuffTier.Gold]: 1 },
}
```

Import `BuffMintedAxis` from `./buffCosts` beside the existing `BuffCostAxis` import.

- [x] **Step 3: Add the two `TEMPLATE_FAMILIES` rows**

```ts
const PROTECTION_ONLY: readonly MintableRewardAxis[] = [BuffRewardAxis.Protection]

const TEMPLATE_FAMILIES: readonly TemplateFamily[] = [
  // …the three existing rows UNCHANGED…
  // DLR-161 — no `param`: neither card targets a suit. One template each, three tiers apiece
  // decided at draw time by the reel-match rules, exactly like Sidestep. Persisted ids:
  // `skullHelmet:protection`, `skullTether:protection`, composed by `templateIdFor`.
  { kind: BuffKind.SkullHelmet, axes: PROTECTION_ONLY },
  { kind: BuffKind.SkullTether, axes: PROTECTION_ONLY },
]
```

Update this file's module docblock with a DLR-161 paragraph in the style of the DLR-145 and DLR-150 ones, and update `BUFF_TEMPLATES`' own comment from 16 to 18.

- [x] **Step 4: Move the two pinned counts**

In `src/hunt/__tests__/buffTemplates.test.ts`, change the `it('holds exactly the 16 templates…')` case to 18 and rename it to name DLR-161. Add an assertion that `REWARD_TIER_VALUE[BuffRewardAxis.Protection]` equals `{ bronze: 0, silver: 0, gold: 1 }`, and one that both new template ids resolve through `templateById`.

In `src/sim/__tests__/reachability.test.ts`, change `expect(mintable.size).toBe(5)` to `7` and add `BuffKind.SkullHelmet` and `BuffKind.SkullTether` to the sorted expectation; change `expect(BUFF_TEMPLATES.length).toBe(16)` to `18`. Leave `expect(unreachable.size).toBe(14)` alone — the eight cut families and the six unbuilt cards are unchanged, and the partition assertion still balances because `BuffKind` grew by exactly the two kinds that became mintable.

Run: `npx vitest run src/hunt/__tests__/buffTemplates.test.ts src/sim/__tests__/reachability.test.ts`
Expected: both exit 0, 0 failed.

### Task 5: The protection derivation, in `src/hunt/buffProtection.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/buffProtection.ts`
- Test: `src/hunt/__tests__/buffProtection.test.ts`

- [x] **Step 1: Write the failing spec**

Cases: an empty `fired` array returns `NO_STREAK_PROTECTION`; a bronze Helmet gives `keepsTotal` with `totalBonus` 0; a gold Helmet gives `totalBonus` 1; **two gold Helmets give `totalBonus` 1, not 2** (AC8); a gold and a bronze Helmet together give 1; a Tether moves `keepsRoll` / `rollBonus` and never touches the total; one of each sets both flags (AC9); a fired Taker changes nothing. Plus `protectionCoversCleanLoss` false at bronze and true at silver and gold, and `conditionIsWidened` false for a silver Taker. Mint every buff through `mintFromTemplate` rather than hand-building a `Buff` literal.

Run: `npx vitest run src/hunt/__tests__/buffProtection.test.ts`
Expected: fails to resolve `../buffProtection`.

- [x] **Step 2: Write the module**

```ts
import { BuffKind, BuffRewardAxis, BuffTier, type Buff } from './buffs'

/**
 * DLR-161 — which of the streak's two figures a trick's fired buffs save, and by how much.
 *
 * States NO condition of its own. It receives buffs that `firedBuffs` has already decided fired,
 * exactly as `resolveFiredBuffs` does, and reads only their kind, axis and reward value — the
 * discipline `buffProjection.ts`'s docblock sets out, and the reason there is no second copy of
 * `buffFires` anywhere in this tree.
 *
 * On the reward VALUE being 0 at bronze and silver: that zero is real, not this codebase's
 * "plausible zero that type-checks". Protection is binary and is carried by the buff having fired
 * at all; the value is AC6's gold bonus added on top of the figure that survived. There is
 * deliberately no way to express "protects by N" — a total either survives or it does not.
 */

/** The two families whose reward axis is `Protection`. */
export type BuffProtectiveKind = typeof BuffKind.SkullHelmet | typeof BuffKind.SkullTether

export interface StreakProtection {
  /** A Skull Helmet fired: `total` survives the reset. */
  readonly keepsTotal: boolean
  /** A Skull Tether fired: `roll` survives the reset. */
  readonly keepsRoll: boolean
  /** AC6 — added to the surviving `total`. 0 below gold. UNIT: damage. */
  readonly totalBonus: number
  /** AC6 — added to the surviving `roll`. 0 below gold. UNIT: tricks. */
  readonly rollBonus: number
}

export const NO_STREAK_PROTECTION: StreakProtection = {
  keepsTotal: false,
  keepsRoll: false,
  totalBonus: 0,
  rollBonus: 0,
}

const PROTECTIVE_KINDS: ReadonlySet<BuffKind> = new Set([
  BuffKind.SkullHelmet,
  BuffKind.SkullTether,
])

export function isProtectiveKind(kind: BuffKind): kind is BuffProtectiveKind {
  return PROTECTIVE_KINDS.has(kind)
}

/** AC5 — silver and gold widen the condition from an eaten skull to ANY trick that hurt you. A
 *  total `Record` rather than `tier !== Bronze`, so a fourth tier is a compile error here. */
const COVERS_CLEAN_LOSS: Readonly<Record<BuffTier, boolean>> = {
  [BuffTier.Bronze]: false,
  [BuffTier.Silver]: true,
  [BuffTier.Gold]: true,
}

/** THE one statement of AC5's widening. `buffFires` reads it to decide whether the card fires;
 *  `buffConditionSentence` reads it to decide which sentence the card face prints. Two readers,
 *  one rule — the shape `conditionThresholdOf` already established for a tier-scaled condition. */
export function protectionCoversCleanLoss(tier: BuffTier): boolean {
  return COVERS_CLEAN_LOSS[tier]
}

/** The same question for a whole buff, so the label layer asks once rather than composing two. */
export function conditionIsWidened(buff: Buff): boolean {
  return isProtectiveKind(buff.kind) && protectionCoversCleanLoss(buff.tier)
}

/** AC8 — protection does not stack. Bonuses fold with `Math.max`, never a sum: two gold Helmets
 *  on one trick add 1, not 2, because a total either survives or it does not. Both copies are
 *  still SPENT, which is the arming layer's business and deliberately not this function's. */
export function streakProtectionFor(fired: readonly Buff[]): StreakProtection {
  return fired.reduce<StreakProtection>((running, buff) => {
    if (buff.reward.axis !== BuffRewardAxis.Protection) return running
    if (buff.kind === BuffKind.SkullHelmet) {
      return {
        ...running,
        keepsTotal: true,
        totalBonus: Math.max(running.totalBonus, buff.reward.value),
      }
    }
    if (buff.kind === BuffKind.SkullTether) {
      return {
        ...running,
        keepsRoll: true,
        rollBonus: Math.max(running.rollBonus, buff.reward.value),
      }
    }
    return running
  }, NO_STREAK_PROTECTION)
}
```

Run: `npx vitest run src/hunt/__tests__/buffProtection.test.ts`
Expected: exits 0, 0 failed.

### Task 6: The two condition cases, in `src/hunt/buffEvaluation.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffEvaluation.ts:1-15,72-95`
- Test: `src/hunt/__tests__/buffEvaluation.test.ts`

- [x] **Step 1: Write the failing spec cases**

Eight cases, one per (family × tier-band × outcome) that matters: a bronze Helmet fires on a skull the player took and on nothing else — not on a dodge, not on a clean loss, not on a clean win; a silver Helmet fires on the skull win **and** on the clean loss, and still not on a dodge or a clean win; the same pair for the Tether. Build the four outcomes as `BuffTrickContext` literals varying only `playerWon` and `skullTrick`.

Run: `npx vitest run src/hunt/__tests__/buffEvaluation.test.ts`
Expected: fails — `buffFires` has no case for `'skullHelmet'`.

- [x] **Step 2: Add the cases to the total switch**

Import `protectionCoversCleanLoss` from `./buffProtection` alongside the existing `conditionThresholdOf` import, then add below the `sidestep` / `glutton` cases:

```ts
    // DLR-161 AC2/AC5 — bronze fires on an EATEN SKULL only, which is `glutton`'s predicate; the
    // family is NOT restored, these two carry their own case. Silver and gold widen it to any
    // trick that HURT the player, and the union of a skull win and a clean loss is exactly
    // `skullTrick === playerWon` on the mechanical axis this context reads:
    //   skull win   true  === true   -> fires
    //   clean loss  false === false  -> fires
    //   dodge       true  === false  -> does not
    //   clean win   false === true   -> does not
    case 'skullHelmet':
    case 'skullTether':
      return protectionCoversCleanLoss(buff.tier)
        ? ctx.skullTrick === ctx.playerWon
        : ctx.skullTrick && ctx.playerWon
```

Run: `npx vitest run src/hunt/__tests__/buffEvaluation.test.ts`
Expected: exits 0, 0 failed.

### Task 7: A protective buff pays into no pool, in `src/hunt/buffAccrual.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffAccrual.ts:1-5,168-182,210-230`
- Test: `src/hunt/__tests__/buffAccrual.test.ts`

- [x] **Step 1: Write the failing spec cases**

Two cases: `resolveFiredBuffs(EMPTY_BUFF_ACCRUAL, [goldHelmet], false)` leaves all four counters at zero and does not throw; `trickBonusFor([goldHelmet, blade], false)` reports the Blade's `flatDamageBonus` and an `overlapBonus` of **1**, proving AC9 — the protective card is excluded from the axis totals but still counted by `overlapBonusFor`.

Run: `npx vitest run src/hunt/__tests__/buffAccrual.test.ts`
Expected: fails with `RangeError: Fired buff reward axis protection has no AP cost base`.

- [x] **Step 2: Guard both reduce callbacks above the narrowing**

Import `isProtectiveAxis` from `./buffCosts` beside `narrowToCostAxis`. In `resolveFiredBuffs`, insert as the callback's first statement:

```ts
    // DLR-161 — a protective card pays into NO per-hand pool: its reward is the streak figure
    // `resolveTrickBank` keeps through the reset. Excluded here rather than by widening
    // `BuffCostAxis`, so the four accrual switches keep exactly the four cases they can answer.
    // It is still counted by `overlapBonusFor` below — AC9's "the second card fired earns the
    // Overlap Bonus exactly as any other pair would".
    if (isProtectiveAxis(buff.reward.axis)) return running
```

In `trickBonusFor`, insert the same guard immediately after the existing Feeder-carry early return, with a one-line comment pointing at the paragraph above rather than repeating it.

Run: `npx vitest run src/hunt/__tests__/buffAccrual.test.ts`
Expected: exits 0, 0 failed.

### Task 8: Stocking weights, in `src/hunt/slotWeights.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/slotWeights.ts:44-80`
- Config: `src/hunt/slotWeights.ts` — `SLOT_FAMILY_WEIGHTS` and `SLOT_AXIS_WEIGHTS` (values are a developer decision)
- Test: `src/hunt/__tests__/slotWeights.test.ts`

- [x] **Step 1: Add the four family rows and the two axis rows**

`SlotFamilyWeights` is `Record<SlotTemplateKind, number>` and `SlotAxisWeights` is `Record<MintableRewardAxis, number>`; neither compiles without them.

```ts
  [SlotMachineId.Skirmisher]: {
    // …existing rows UNCHANGED…
    // DLR-161 — NOBODY CHOSE THESE FOUR NUMBERS. Both cards are in-hand tactical plays like
    // Cheat and Timebomb, and the Helmet is the stronger of the pair by design, so it is
    // weighted no higher than the Tether. Only RATIOS matter within one machine's table.
    // UNIT: relative weight, >= 0, unitless. See `tasks.md` → Developer decides or observes.
    [BuffKind.SkullHelmet]: 3,
    [BuffKind.SkullTether]: 2,
  },
  [SlotMachineId.Strongbox]: {
    // …existing rows UNCHANGED…
    [BuffKind.SkullHelmet]: 1,
    [BuffKind.SkullTether]: 1,
  },
```

```ts
  [SlotMachineId.Skirmisher]: { /* …existing… */ [BuffRewardAxis.Protection]: 3 },
  [SlotMachineId.Strongbox]:  { /* …existing… */ [BuffRewardAxis.Protection]: 1 },
```

Add a comment on the axis rows recording that the figure is **inert today**: each protective family has exactly one axis, so `familyAxisTotal` equals the axis weight and it cancels out of `templateWeightFor`; the row exists to keep the table total, and a second protective axis is what would make it bite.

- [x] **Step 2: Assert the weights are reachable and no template weighs zero by accident**

Extend the spec with a case walking every template in `BUFF_TEMPLATES` on both machines and asserting `templateWeightFor` returns a finite number greater than 0, and one asserting the two new templates' weight on Skirmisher equals their family weight exactly (the axis cancellation above).

Run: `npx vitest run src/hunt/__tests__/slotWeights.test.ts`
Expected: exits 0, 0 failed.

### Task 9: Barrel exports, in `src/hunt/index.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/index.ts:122-134,325-350`

- [x] **Step 1: Export the new types, predicates and module**

Add `BuffMintedAxis` to the `export type { BuffCostAxis } from './buffCosts'` line, and `narrowToMintedAxis` plus `isProtectiveAxis` to the `buffCosts` value export block. Add a new block:

```ts
export type { StreakProtection, BuffProtectiveKind } from './buffProtection'
export {
  NO_STREAK_PROTECTION,
  isProtectiveKind,
  protectionCoversCleanLoss,
  conditionIsWidened,
  streakProtectionFor,
} from './buffProtection'
```

- [x] **Step 2: Typecheck the engine trees**

Run: `npm run typecheck`
Expected: the only remaining errors are in `src/app/warCouncil/buffLabels.ts` (two total tables and one total switch missing the new members) and `src/app/run/slotSymbols.ts` (two total tables). Task 10 and Task 15 close them.

### Task 10: Card copy, in `src/app/warCouncil/buffLabels.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/buffLabels.ts:21-45,48-72,74-86,120-145,205-220`
- Test: `src/app/warCouncil/__tests__/buffLabels.test.ts`

- [x] **Step 1: Fill the three total tables and add the widened-sentence table**

```ts
// BUFF_FAMILY_WORD — PLACEHOLDER copy, as this table's docblock already says of every
// non-transcribed row.
  [BuffKind.SkullHelmet]: 'Skull Helmet',
  [BuffKind.SkullTether]: 'Skull Tether',

// BUFF_CONDITION_SENTENCE — the BRONZE reading for both.
  [BuffKind.SkullHelmet]: 'eat a skull with this card',
  [BuffKind.SkullTether]: 'eat a skull with this card',

// BUFF_REWARD_SUFFIX
  [BuffRewardAxis.Protection]: 'Guard',
```

and, immediately below `BUFF_CONDITION_SENTENCE`:

```ts
/** DLR-161 AC5 — silver and gold print a WIDER sentence than bronze, because they fire on a clean
 *  loss as well as an eaten skull. A `Partial` beside the total table above, selected by
 *  `conditionIsWidened`, so the tier rule is READ from `src/hunt/buffProtection.ts` and never
 *  restated here — the drift this codebase repeatedly designs against. PLACEHOLDER copy. */
export const BUFF_WIDENED_CONDITION_SENTENCE: Partial<Readonly<Record<BuffKind, string>>> = {
  [BuffKind.SkullHelmet]: 'eat a skull, or lose a trick',
  [BuffKind.SkullTether]: 'eat a skull, or lose a trick',
}
```

- [x] **Step 2: Select the widened sentence in `buffConditionSentence`**

```ts
export function buffConditionSentence(buff: Buff): string {
  const suit = buffTargetSuitOf(buff)
  const rank = buffTargetRankOf(buff)
  const sentence = conditionIsWidened(buff)
    ? (BUFF_WIDENED_CONDITION_SENTENCE[buff.kind] ?? BUFF_CONDITION_SENTENCE[buff.kind])
    : BUFF_CONDITION_SENTENCE[buff.kind]
  return sentence
    .replace('{suit}', suit !== null ? SUIT_WORD[suit] : 'any suit')
    .replace('{rank}', rank !== null ? String(rank) : 'named rank')
}
```

The `??` is safe rather than silent: `conditionIsWidened` is true only for the two kinds the `Partial` names, so the fallback is unreachable and exists to satisfy the index signature. Import `conditionIsWidened` from `'../../hunt'`.

- [x] **Step 3: Add the reward-phrase case**

`buffRewardPhrase`'s switch is total over `BuffRewardAxis` and will not compile without it. It reads `buff.kind` because one axis serves two families:

```ts
    // DLR-161 — one axis, two families, so the FIGURE saved comes from the kind. The value is
    // AC6's gold bonus and is 0 below gold, which is why the phrase has two shapes rather than
    // always printing "+0".
    case BuffRewardAxis.Protection: {
      const figure = buff.kind === BuffKind.SkullTether ? 'roll' : 'total'
      return v > 0 ? `your ${figure} survives, +${v}` : `your ${figure} survives`
    }
```

- [x] **Step 4: Add the two cadence pill words**

`BUFF_EVENT_WORD` is a `Partial` and will **not** fail to compile without these — leaving them out silently falls back to `WHEN`. Add explicitly:

```ts
  // DLR-161 — the mechanical word for the branch these fire on. Bronze fires on an eaten skull
  // and silver/gold on any hurt trick; `HURT` covers both without claiming the wider one at
  // bronze, and the card's own condition sentence states the difference. PLACEHOLDER copy.
  [BuffKind.SkullHelmet]: 'HURT',
  [BuffKind.SkullTether]: 'HURT',
```

- [x] **Step 5: Pin all four in the spec**

Add cases asserting: a bronze gold-minted pair — `buffLine(bronzeHelmet)` reads `Bronze Skull Helmet (Guard) — eat a skull with this card: your total survives.`; `buffLine(silverTether)` uses the widened sentence; `buffLine(goldHelmet)` ends `your total survives, +1.`; and `buffCadenceWord` returns `HURT` for both, not `WHEN`. Mint through `mintFromTemplate`.

Run: `npx vitest run src/app/warCouncil/__tests__/buffLabels.test.ts`
Expected: exits 0, 0 failed.

- [x] **Step 6: The line budget**

Run: `(Get-Content src\app\warCouncil\buffLabels.ts).Count`
Expected: under 400. It was 291 before this task.

---

## Phase 2 — The streak keeps what the card saved

This is the engine change the cards exist for, and it is the phase with the real regression risk: the reset block is load-bearing for four existing Swan cases. It is split from Phase 1 so that the vocabulary lands and type-checks before the behaviour changes, and it opens by making room — `streak.ts` stands at 390 lines against a blocking 400-line budget. Safe stopping point: the pot extraction is behaviour-neutral and verified on its own before a single rule changes.

### Task 11: Move the pot out of `src/warCouncil/streak.ts` into `src/warCouncil/pot.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/pot.ts`
- Modify: `src/warCouncil/streak.ts:300-390`
- Modify: `src/warCouncil/index.ts:49-66`
- Test: `src/warCouncil/__tests__/streak.test.ts:1-20`
- Test: `src/warCouncil/__tests__/streak.formula.test.ts:1-25`

- [x] **Step 1: Move the four symbols verbatim**

Cut `potValue`, `PotApplication`, `applyPot` and `incomingFromPot` — **with their docblocks unchanged**, they carry the reasoning — out of `streak.ts` and into a new `src/warCouncil/pot.ts`. It imports `EMPTY_STREAK` and `type StreakState` from `./streak`, and `DuelSide` / `type IncomingDamage` from `../hunt`. `streak.ts` imports nothing back, so there is no cycle. Give the new file a module docblock stating that the split was made for the line budget and that what a streak is worth when cashed is a separable concept from what one trick does to it. `incomingFrom` stays in `streak.ts` — it is a trick resolution's crossing, not the pot's.

- [x] **Step 2: Repoint the barrel and the two direct importers**

In `src/warCouncil/index.ts`, move `potValue`, `applyPot`, `incomingFromPot` and `PotApplication` out of the two `from './streak'` blocks into new `from './pot'` blocks. Every other consumer imports through this barrel and does not move — 19 of the 21 referencing files. The two that import directly are `src/warCouncil/__tests__/streak.test.ts` and `streak.formula.test.ts`; split their `from '../streak'` import lines so the pot symbols come `from '../pot'`.

- [x] **Step 3: Prove the move changed nothing, and check the budget**

Run: `npx vitest run src/warCouncil/__tests__ src/app/warCouncil/__tests__/roundReducer.resolution.test.ts; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed. No assertion anywhere should have needed a change other than an import path.

Run: `(Get-Content src\warCouncil\streak.ts).Count`
Expected: under 360. It was 390 before this task.

### Task 12: The reset block keeps a protected figure, in `src/warCouncil/streak.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/streak.ts:1-15,250-300`
- Test: `src/warCouncil/__tests__/streak.buffs.test.ts`

- [x] **Step 1: Write the failing spec**

Two groups. **Regression**, pinning the de-nesting is behaviour-neutral: all four existing Swan combinations on a clean loss — neither rung (both figures zero), silver only (roll survives, total zeroes), gold only and gold-implies-silver (both survive) — must be unchanged. **New**, against the plan's worked table, starting from `{ total: 8, roll: 2 }` on a skull the player took: a bronze Helmet gives `{ 8, 0 }`; a bronze Tether gives `{ 0, 2 }`; both bronze gives `{ 8, 2 }`; both gold gives `{ 9, 3 }`; two gold Helmets give `{ 9, 0 }` and not `{ 10, 0 }` (AC8); and in every one of those cases `damageToPlayer` is `DAMAGE_PER_HIT` (AC7). Plus: a silver Helmet on a **clean loss** protects (AC5), a bronze Helmet on the same clean loss does not, and neither protects a clean win or a dodge — both of which bank anyway and never reach this block.

Run: `npx vitest run src/warCouncil/__tests__/streak.buffs.test.ts`
Expected: fails — the protective cases report `{ 0, 0 }`.

- [x] **Step 2: Derive the protection beside the fired buffs**

Import `streakProtectionFor` from `'../hunt'` in the existing import block, and add immediately below the existing `const fired: readonly Buff[] = …`:

```ts
  // DLR-161 — derived HERE, from the buffs this trick actually fired, rather than handed in on
  // `TrickFacts` the way the Swan's two booleans are. The Swan comes from a run permanent the
  // caller genuinely knows about; this depends on condition evaluation that happens inside this
  // function, so passing it in would force the caller to evaluate the conditions a second time —
  // the second copy of the rules `buffProjection.ts`'s docblock exists to prevent.
  const protection = streakProtectionFor(fired)
```

- [x] **Step 3: Replace the nested Swan guard with two independent guards**

Replace, inside `if (trickHit || timebombResets) { … }`:

```ts
    if (!swanKeepsBank) {
      total = 0
      // DLR-122 AC4 — silver spares the ROLL, not the total: the total above still resets to
      // zero, and only the streak length survives.
      if (!swanKeepsMultiplier) {
        roll = 0
      }
    }
```

with:

```ts
    // DLR-161 — the nested Swan guard becomes two INDEPENDENT guards. The old nesting encoded
    // "gold implies silver" as structure, and structure cannot express "the roll survives but the
    // total does not" — which is exactly Skull Tether. Behaviour-identical for all four Swan
    // cases (DLR-122 AC4: silver spares the roll only; AC5: gold spares both), and a regression
    // spec pins each of them.
    const keepsTotal = swanKeepsBank || protection.keepsTotal
    const keepsRoll = swanKeepsBank || swanKeepsMultiplier || protection.keepsRoll

    if (!keepsTotal) {
      total = 0
    } else if (protection.keepsTotal) {
      // AC6 — the gold bonus is added only where the PROTECTION saved the figure. A Swan that
      // already spared it does not also pay the card's +1: one save, one bonus.
      total += protection.totalBonus
    }

    if (!keepsRoll) {
      roll = 0
    } else if (protection.keepsRoll) {
      roll += protection.rollBonus
    }
```

`damageToPlayer` is computed above this block and is **not touched** — that is AC7, and no rung of either card changes it.

Update `resolveTrickBank`'s docblock with a DLR-161 paragraph naming the two cards and stating that they spare the streak and never the health, in the register the DLR-122 Swan paragraph already uses.

- [x] **Step 4: The spec, the neighbours, and the budget**

Run: `npx vitest run src/warCouncil/__tests__ src/hunt/__tests__; npm run typecheck`
Expected: all exit 0; Vitest reports 0 failed.

Run: `(Get-Content src\warCouncil\streak.ts).Count`
Expected: under 400.

---

## Phase 3 — The screens say what happened

Everything player-facing. The buff grid and the loadout rows already render these cards correctly from Phase 1's copy, so what remains is the resolution panel's one wrong figure and the slot machine's two missing marks. Safe stopping point: each task is independent of the others and each ends with its own spec green.

### Task 13: The pot actually lost, in `src/app/warCouncil/resolutionBeats.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/resolutionBeats.ts:60-112`
- Test: `src/app/warCouncil/__tests__/resolutionBeats.test.ts`

- [x] **Step 1: Write the failing spec**

Three cases: a hurt trick with nothing protecting it still reports the whole pre-trick pot as lost (unchanged); a hurt trick where a Helmet kept a total of 8 at a roll of 2 reports `16` lost, not the full pot, because the post-trick pot is `8 × 0 = 0` — and a hurt trick where **both** cards fired reports `0` lost, since `8 × 2` survived intact.

Run: `npx vitest run src/app/warCouncil/__tests__/resolutionBeats.test.ts`
Expected: the second and third cases fail; the figure reported is the whole pre-trick pot.

- [x] **Step 2: Compute the difference**

Replace:

```ts
    const potLost = potValue(before.total, before.roll)
```

with:

```ts
    // DLR-161 — the pot ACTUALLY lost, not the whole pre-trick pot. A Skull Helmet, a Skull
    // Tether or a Swan rung can carry a figure through the reset, and the old expression narrated
    // the full pot as gone on a trick where most of it survived. Both terms come from
    // `potValue`, which already floors a non-integer, non-positive, NaN or infinite input to 0,
    // so this difference is a finite non-negative integer: on a hurt trick the post-trick pot can
    // only be less than or equal to the pre-trick one. This module still runs no rule of its own
    // — it subtracts two figures the engine decided.
    const potLost = potValue(before.total, before.roll) - potValue(resolution.total, resolution.roll)
```

Update the function's docblock, which currently states that the pot lost "is computed from `before`, the streak this trick wiped", so it names the difference instead.

Run: `npx vitest run src/app/warCouncil/__tests__/resolutionBeats.test.ts`
Expected: exits 0, 0 failed.

### Task 14: Two reel faces, in `src/app/run/slotSymbols.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/run/slotSymbols.ts:20-78`
- Test: `src/app/run/__tests__/slotSymbols.test.ts` — **created by this task**; this module has no spec today

- [x] **Step 1: Widen the glyph union and the two tables**

```ts
export type SlotGlyph =
  | { readonly kind: 'suit'; readonly suit: BuffTargetSuit }
  | { readonly kind: 'sidestep' }
  | { readonly kind: 'cheat' }
  | { readonly kind: 'timebomb' }
  | { readonly kind: 'skullHelmet' }
  | { readonly kind: 'skullTether' }
```

`FAMILY_WORD` gains `[BuffKind.SkullHelmet]: 'Helmet'` and `[BuffKind.SkullTether]: 'Tether'` — the short forms, because this word is read in a moving reel window and the full card name is `slotLabels.ts`'s job; `AXIS_WORD` gains `[BuffRewardAxis.Protection]: 'Guard'`, matching `BUFF_REWARD_SUFFIX`. Both are PLACEHOLDER copy and the tables already say so.

- [x] **Step 2: Replace the suitless ternary with a total switch**

The existing `suit === undefined ? { kind: 'sidestep' } : { kind: 'suit', suit }` silently assumed Sidestep was the only suitless family, and would now paint a Sidestep chevron on both new cards. Replace with:

```ts
/** DLR-161 — the glyph a condition template carries. A total switch over the kinds a condition
 *  template can be, so a sixth family is a compile error here rather than a blank or a borrowed
 *  mark in a reel window. Throws on a suit-parameterised family that arrived without a suit —
 *  `mintFromTemplate`'s discipline: a plausible-looking wrong glyph is the bug that type-checks. */
function conditionGlyphFor(template: ConditionBuffTemplate): SlotGlyph {
  const suit = template.target?.suit
  if (suit !== undefined) return { kind: 'suit', suit }
  switch (template.kind) {
    case BuffKind.Sidestep:
      return { kind: 'sidestep' }
    case BuffKind.SkullHelmet:
      return { kind: 'skullHelmet' }
    case BuffKind.SkullTether:
      return { kind: 'skullTether' }
    case BuffKind.Taker:
    case BuffKind.Feeder:
      throw new RangeError(
        `Template ${template.id} is suit-parameterised but carries no suit`,
      )
  }
}
```

and call it from `slotSymbolFace`'s condition branch. Import `ConditionBuffTemplate` as a type from `'../../hunt'`.

- [x] **Step 3: Assert every real template produces a face**

Add a spec case mapping `slotSymbolFace` over the whole of `BUFF_TEMPLATES` and asserting none throws, every `id` is unique, and no two templates share a glyph-plus-family-plus-axis triple. Add a case pinning the two new faces' glyph kind, family word and axis word.

Run: `npx vitest run src/app/run/__tests__/slotSymbols.test.ts`
Expected: exits 0, 0 failed.

### Task 15: Two drawn marks, in `src/app/run/SlotGlyph.tsx` and the two stylesheets ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/run/SlotGlyph.tsx:15-50`
- Modify: `src/app/run/shopSlot.css:107-114`
- Modify: `src/app/run/shopSlotReel.css:112-122`
- Modify: `src/app/warCouncil/warCouncil.css` — the token file that declares `--wc-timebomb` and `--wc-chalk-dim`, if a new `--wc-guard` token is needed
- Test: `src/app/run/__tests__/SlotMachinePanel.test.tsx`

- [x] **Step 1: Widen `SlotGlyphKind` and draw the two marks**

```ts
export type SlotGlyphKind =
  'sidestep' | 'cheat' | 'timebomb' | 'skullHelmet' | 'skullTether'
```

Add two branches inside the existing `<g fill="none" stroke="currentColor" …>`, matching the paths in `mockup.html` (a dome over a skull for the Helmet; a taut line to an anchor for the Tether) and the file's existing stroke conventions. Extend the module docblock — it currently reads "the three drawn marks that are NOT a suit" — to five, and record that both new marks are shaped rather than only tinted, because they share one colour token and must separate in greyscale.

- [x] **Step 2: Add the two colour rows to both stylesheets**

These two values bind by string with no compiler check, so both files change in this task and a final-verification grep checks both. In `shopSlot.css`, beside the existing `[data-glyph='sidestep']` / `[data-glyph='cheat']` rule:

```css
.shop-strip-chip-glyph[data-glyph='skullHelmet'],
.shop-strip-chip-glyph[data-glyph='skullTether'] {
  color: var(--wc-guard);
}
```

and the matching `.shop-reel-glyph[data-glyph='skullHelmet'], .shop-reel-glyph[data-glyph='skullTether']` rule in `shopSlotReel.css`. Add `--wc-guard` to `src/app/warCouncil/warCouncil.css`, which is the file that declares `--wc-timebomb` and `--wc-chalk-dim`, giving it a value in the same family as the mockup's `#7fae8c`; if a suitable token already exists, reuse it rather than adding a synonym. **The colour value is the developer's** — record it under Developer decides or observes if a new token is introduced.

- [x] **Step 3: Confirm the machine still renders and the console is clean**

Run: `npx vitest run src/app/run/__tests__/SlotMachinePanel.test.tsx src/app/run/__tests__/SlotMachineCabinet.test.tsx; npm run typecheck`
Expected: all exit 0; Vitest reports 0 failed.

Run: `(Get-Content src\app\run\SlotGlyph.tsx).Count`
Expected: under 200. It was 51 before this task.

---

## Phase 4 — Final verification

No production changes. Only cumulative sanity checks.

### Task 16: Confirm the pure-core boundaries still hold ✓

- Skill: none — verification only, no code written.

**Files:**
- (none — inspection only)

- [x] **Step 1: No React and no DOM global in the two new pure modules**

Run: `Get-ChildItem src\hunt,src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage"`
Expected: zero hits. `src/hunt/buffProtection.ts` and `src/warCouncil/pot.ts` sit inside the existing `eslint.config.js` pure-core override, so `npm run lint` in Task 18 is the real gate; this grep is the cheap confirmation that neither new file needed an exemption.

Result: zero hits — confirmed.

- [x] **Step 2: No storage access was introduced anywhere**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "globalThis\.(localStorage|sessionStorage)\b|\b(localStorage|sessionStorage)\.(getItem|setItem|removeItem|clear)\("`
Expected: exactly the three known hits, all under `src/persistence/` — two in `browserStorage.ts` and one docblock mention in `saveStore.ts`. No file this contract touched appears. This is `.claude/rules/save-data-versioning.md`'s manual check; `SAVE_SCHEMA_VERSION` is correctly unbumped because this contract adds two new persisted template ids and renames none.

Result: exactly three hits, all in `src/persistence/browserStorage.ts` and `src/persistence/saveStore.ts` — matches expected.

### Task 17: Confirm every string-bound name landed on both sides ✓

- Skill: none — verification only, no code written.

**Files:**
- (none — inspection only)

- [x] **Step 1: Both glyph values exist in both stylesheets**

Run: `Get-ChildItem src\app\run -Recurse -Include *.css | Select-String -Pattern "data-glyph='skullHelmet'|data-glyph='skullTether'"`
Expected: four hits — one of each value in `shopSlot.css` and one of each in `shopSlotReel.css`. Fewer than four means a glyph renders with no colour rule.

Result: four hits, two in `shopSlot.css` and two in `shopSlotReel.css` — matches expected.

- [x] **Step 2: The two persisted template ids are composed, not concatenated**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "'skullHelmet:protection'|'skullTether:protection'"`
Expected: hits only inside `__tests__` files. A hit in production code would mean a call site hand-wrote an id instead of going through `templateIdFor`, which is reject condition 2 of the save-data rule.

Result: all hits are inside `__tests__` files — matches expected.

- [x] **Step 3: The pool is 18 and nothing still claims 16**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "16 templates|toBe\(16\)|toHaveLength\(16\)"`
Expected: zero hits.

Result: **one hit** — `src/hunt/startingPile.ts:65`, a docblock reading "the pool is 16 templates", a leftover from before this contract widened the pool to 18. This is verification-only (no production edits in this phase); reported as a finding in `pr-description.md` rather than fixed here.

### Task 18: Static gates and full suite ✓

- Skill: none — verification only, no code written.

**Files:**
- (none — inspection only)

- [x] **Step 1: Warm the Vitest cache, then typecheck, lint and run the whole suite**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all exit 0; Vitest reports 0 failed. The two scoped project runs first are deliberate — a cold transform cache has produced a `[vitest-pool-runner]: Timeout waiting for worker to respond` on the `dom` project, which is infrastructure and not a test failure.

Result: `--project node` — 160 files / 2027 tests passed. `--project dom` — 52 files / 490 tests passed. `npm run typecheck` — exit 0. `npm run lint` — exit 0. `npm test` — 212 files / 2517 tests passed. All exit 0.

- [x] **Step 2: Formatting, scoped to this contract's files**

Run: `npx prettier --check src/hunt/buffProtection.ts src/hunt/buffs.ts src/hunt/buffCosts.ts src/hunt/buffTemplates.ts src/hunt/buffEvaluation.ts src/hunt/buffAccrual.ts src/hunt/slotWeights.ts src/hunt/index.ts src/warCouncil/pot.ts src/warCouncil/streak.ts src/warCouncil/index.ts src/app/warCouncil/buffLabels.ts src/app/warCouncil/resolutionBeats.ts src/app/run/slotSymbols.ts src/app/run/SlotGlyph.tsx src/app/run/shopSlot.css src/app/run/shopSlotReel.css src/app/warCouncil/warCouncil.css src/app/run/__tests__/slotSymbols.test.ts`
Expected: exits 0. Do **not** run repo-wide `npm run format` — it rewrites ~58 pre-existing markdown files nobody asked to touch.

Result: initial run exited 1, flagging `src/hunt/buffCosts.ts`, `src/warCouncil/streak.ts` and `src/app/warCouncil/resolutionBeats.ts` — all three modified by this contract. Ran `npx prettier --write` on those three files only, per the phase's stated exception, then re-checked: exit 0, "All matched files use Prettier code style!" Re-ran `npm run typecheck` and `npm run lint` (both clean) plus a scoped Vitest run over the tests touching those three files (5 files / 134 tests passed) to confirm the reformat was whitespace-only.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

Result: exit 0. `dist/index.html`, `dist/assets/index-CwAlVXpK.css`, `dist/assets/index-DrvAPiDq.js` written. No bundler errors.

### Task 19: Update the PR description ✓

- Skill: none — a written hand-off, no code.

**Files:**
- Create: `.claude/contract/DLR-161-skull-helmet-and-skull-tether/pr-description.md`

- [x] **Step 1: Write `pr-description.md` for the developer to paste**

Include:
- A link to `plan.md` and `mockup.html` in this folder.
- What the two cards do, in one paragraph, in the four-outcome vocabulary `CLAUDE.md` sets — naming which axis each sentence is on, since "win" and "lose" mean two different things here.
- The five figures under **Developer decides or observes**, each with its placeholder and what it trades off.
- Whether acceptance criterion 10 was satisfied by DLR-160's `resolutionDeadBuffs.ts` or is still outstanding, per Task 1's finding.
- Verification results from Phase 4, quoting the actual Vitest summary line and the exit codes.

Result: written to `.claude/contract/DLR-161-skull-helmet-and-skull-tether/pr-description.md`.
- A one-line note for future contributors on the new convention: `BuffMintedAxis` is the set of axes a template can be minted on, `BuffCostAxis` stays the four axes with a per-hand accrual counter, and a protective axis is excluded above `narrowToCostAxis` rather than by widening it.

---

## Self-review

**Spec coverage:**
- Two new mintable cards at three tiers, armed and spent normally (AC1) — Tasks 2, 3, 4.
- The eaten-skull condition restored for these two families only, with no other cut family re-enabled (AC2) — Tasks 4, 6.
- Helmet bronze keeps the total, roll to zero (AC3) — Tasks 5, 12.
- Tether bronze keeps the roll, total to zero (AC4) — Tasks 5, 12.
- Silver widens both to a clean loss (AC5) — Tasks 5, 6, 10.
- Gold adds one to the surviving figure (AC6) — Tasks 4, 5, 12.
- The health always lands (AC7) — Task 12 leaves `damageToPlayer` untouched and its spec asserts it in every protective case.
- They do not stack; the second copy is still spent (AC8) — Task 5's `Math.max`, pinned in Tasks 5 and 12.
- One of each protects both figures and the Overlap Bonus still counts both (AC9) — Tasks 7, 12.
- An armed card that did not fire says so, with the reason (AC10) — Task 1 confirms DLR-160's generic mechanism; Task 10 supplies the two families' name and condition sentence, which is everything it consumes.
- Both cards on the strip and in the grid, in the same shape as every other card (AC11) — Tasks 8, 10, 14, 15. The grid needs no markup change: `BuffCard.tsx` composes from `buffLabels.ts` and `buffCardVisuals.ts` is keyed by tier and suit, neither of which these families change.
- The pot-lost figure stops lying about a saved streak (plan's in-scope bullet, no AC) — Task 13.
- The 400-line budget on `streak.ts` (plan's in-scope bullet) — Task 11.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact table row, or a runnable command with its expected result. No step runs bare `vitest`, `npm run dev`, repo-wide `npm run format`, or hand-edits `package-lock.json`. Every unchosen tuning value is placed as a documented placeholder and routed to the File map's Developer-decides list; none is invented in a step and presented as settled.

**Type / name consistency:** `BuffKind.SkullHelmet` / `BuffKind.SkullTether` (Tasks 2, 3, 4, 5, 6, 8, 10, 14, 15); `BuffRewardAxis.Protection` (Tasks 2, 3, 4, 7, 10, 14); `BuffMintedAxis` (Tasks 3, 4, 9); `narrowToMintedAxis` and `isProtectiveAxis` (Tasks 3, 7, 9); `StreakProtection`, `NO_STREAK_PROTECTION`, `isProtectiveKind`, `protectionCoversCleanLoss`, `conditionIsWidened`, `streakProtectionFor` (Tasks 5, 6, 9, 10, 12); `BUFF_WIDENED_CONDITION_SENTENCE` (Task 10); `conditionGlyphFor` and the `'skullHelmet'` / `'skullTether'` glyph values (Tasks 14, 15, 17); `potValue` / `applyPot` / `incomingFromPot` / `PotApplication` in `src/warCouncil/pot.ts` (Tasks 11, 13). Every identifier matches `plan.md` Part 2 → Data shapes. Every `- Skill:` value is `react-frontend`, `game-ux`, or `none` on a task that writes no code.

**Phase boundary cleanliness:**
- **Phase 1** ends with the whole tree type-checking: the two `BuffKind` members' three total tables (`BUFF_CADENCE`, `BUFF_FAMILY_WORD`, `BUFF_CONDITION_SENTENCE`) and the `Partial` `BUFF_EVENT_WORD` are all filled, `BUFF_REWARD_SUFFIX` and `buffRewardPhrase` carry the new axis, both reward ladders are re-keyed, and both pinned template counts move in the same task as the templates themselves — so no spec is left asserting a stale number. The two cards can be minted, priced, armed and rendered; they simply protect nothing yet, which is a coherent state, not a half-applied change.
- **Phase 2** ends type-checking with the pot extraction verified independently of the rule change: Task 11 changes no behaviour and its spec run proves it, and Task 12's regression group pins all four Swan cases against the de-nesting before any protective case is asserted. `streak.ts` is measured under 400 at both ends.
- **Phase 3** ends type-checking; its three tasks touch disjoint files (`resolutionBeats.ts`, `slotSymbols.ts`, `SlotGlyph.tsx` plus two stylesheets) and each closes with its own spec green, so stopping between any two leaves no dangling import and no table half-filled.
- **Phase 4** changes no production code at all.
