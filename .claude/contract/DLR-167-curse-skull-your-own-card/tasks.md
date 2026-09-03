# Tasks: Curse — an activated buff card that puts a skull on one of your own cards

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: PLANNED
Started: 2026-09-03

**Goal:** Give the player a drawable, activated card that puts a skull on a card in their own hand, turning a trick they were going to throw away into a dodge that banks — through the skull-trick rule that already exists, with the mark lapsing at that trick's resolution.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder, approved at the plan gate on 2026-09-03.

**Two things about this contract that are easy to get wrong:**

- **The Timebomb is still on disk and stays there.** DLR-166 removes it; that ticket has an *empty* contract folder and has not run. Do not delete, refactor, or "tidy" any Timebomb code. Curse is built as a parallel path beside it — see `plan.md` Part 1 → Task reference for the developer's decision.
- **`plan.md` was revised once after its approval gate** (Assumption 3, and Part 2 → Approach): Curse's damage and multiplier are **derived inside `resolveTrickBank`** from the buffs already riding the trick. There is **no** new `TrickFacts` field. If you find yourself editing `baseDamageBonus:` construction sites, stop — you are building the rejected design.

---

## File map

**Created:**

- `src/warCouncil/curse.ts` — the mark: `isCursed`, `curseCard`, `uncurseCard`, and `skullsOn`, the one place a dealt skull and a player's curse are read as one.
- `src/warCouncil/__tests__/curse.test.ts` — the mark's invariants and the union.
- `src/hunt/__tests__/curseCard.test.ts` — the template, the tier figures, the price, the minting.
- `src/app/warCouncil/__tests__/roundReducer.curse.test.ts` — arming, marking an illegal card, the refusals, non-revocability.
- `src/warCouncil/__tests__/playCard.curse.test.ts` — the skull-trick flip, the dodge, the lapse, and the Sidestep combination (AC9).

**Modified:**

- `src/warCouncil/types.ts` — `RoundState` gains `cursedCards`.
- `src/warCouncil/index.ts` — re-export the curse module.
- `src/warCouncil/deal.ts:57`, `abilities.ts:39`, `discard.ts:98`, `encounterDeck.ts:148,163`, `playCard.ts:174` — the six production `RoundState` literals.
- 15 test `RoundState` literals — listed in Task 1.
- `src/warCouncil/playCard.ts:125,131` — read the union for `skullTrick`; clear `cursedCards` at resolution.
- `src/warCouncil/streak.ts` — `resolveTrickBank`'s banked branch gains Curse's two terms.
- `src/hunt/buffs.ts` — `BuffKind.Curse`, its `BUFF_CADENCE` row.
- `src/hunt/buffCatalog.ts` — `CurseBonus`, `CURSE_REWARD`, `curseBuff`, `curseRewardOf`.
- `src/hunt/buffTemplates.ts` — the activated template, the kind widening, `mintFromTemplate`'s narrowing.
- `src/hunt/buffCosts.ts` — Curse's `CONSUMABLE_AP_COST` row and the `BuffConsumableKind` widening.
- `src/hunt/consumables.ts` — Curse's `ACTIVATED_CARD_SINGLE_USE` row.
- `src/hunt/buffAccrual.ts` — `curseBonusOf`.
- `src/hunt/buffActivation.ts` — the `CurseLive` refusal and its stock field.
- `src/hunt/index.ts` — re-exports.
- `src/app/warCouncil/roundUiState.ts` — `curseArmedBuff`, `curseArmed`, `curseLive`, the stock wiring.
- `src/app/warCouncil/buffHandlers.ts` — spending a Curse arms it.
- `src/app/warCouncil/roundReducer.ts` — the `curseTapped` branch.
- `src/app/warCouncil/HandFan.tsx` — `skulledCards` and `curseArmed` props.
- `src/app/warCouncil/roundControlsProps.ts` — thread `skullsOn(ui.round)` and `curseArmed`.
- `src/app/warCouncil/buffRideModel.ts`, `cardDamage.ts`, `commitHandlers.ts`, `trickConsequenceModel.ts` — read the union.
- `src/app/warCouncil/buffLabels.ts` — Curse's two rows; Sidestep's corrected copy.
- `src/sim/playHand.ts`, `skilledCardPlay.ts`, `playHandWindows.ts`, `fixtures.ts` — the union, and the simulator learning Curse.

**Deleted:** (none)

**Developer decides or observes:**

- `src/hunt/buffCosts.ts` → Curse's three `CONSUMABLE_AP_COST` figures. The plan ships `{ bronze: 2, silver: 3, gold: 4 }` copied from Shield's ladder shape. **Nobody has chosen these.** The trade-off to price against: unlike any other card, a misread Curse costs the card, the action points *and* the whole streak at once.
- `src/app/warCouncil/buffLabels.ts` → Sidestep's replacement wording. The plan ships `'a skull trick you do not take'` and the face word `SKULL LOSS`. AC10 says only what the copy must **stop** saying; both replacements are copy judgement.
- **Whether the skull on a card in your own hand reads as *yours*** rather than as something you were dealt. The plan reuses the dealt-skull face exactly (AC4's requirement) and adds only a dashed red edge. Look at a marked card beside an unmarked one.
- **Whether arming Curse and then marking feels like one action or two.** Two taps in the panel to spend, then one on the card. Compare with how a Cheat feels.
- **Whether the wasted-Curse case reads as friction or as a feel-bad** — cursing into a trick whose Quarry card turns out to already be skulled. The ticket calls this intended friction; only playing settles it.

---

## Phase 1 — The mark, and the skull rule that already exists

The engine half. `RoundState` gains `cursedCards`, a new module owns it, every reader whose question is "is this a skull trick" reads the union, and the mark lapses at trick resolution. The phase is a safe stopping point because it ends with the whole tree type-checking and the new field defaulted to empty everywhere — nothing yet writes a curse, so behaviour is unchanged and every existing test still passes. Task 1 deliberately changes the shape and all 21 construction sites together: splitting them leaves a boundary where the app does not compile.

### Task 1: Add `cursedCards` to `RoundState` and fill every construction site

- Skill: react-frontend

**Files:**

- Modify: `src/warCouncil/types.ts` — add the field to `RoundState`
- Modify: `src/warCouncil/deal.ts:57`, `src/warCouncil/abilities.ts:39`, `src/warCouncil/discard.ts:98`, `src/warCouncil/encounterDeck.ts:148`, `src/warCouncil/encounterDeck.ts:163`, `src/warCouncil/playCard.ts:174`
- Test: `src/app/warCouncil/__tests__/roundFixture.ts:49`, `src/warCouncil/__tests__/abilities.test.ts:29`, `src/warCouncil/__tests__/cpuPlayer.test.ts:39`, `src/warCouncil/__tests__/cpuPlayer.test.ts:297`, `src/warCouncil/__tests__/discard.test.ts:34`, `src/warCouncil/__tests__/drawCards.test.ts:24`, `src/warCouncil/__tests__/handRefill.test.ts:140`, `src/warCouncil/__tests__/legalMoves.test.ts:20`, `src/warCouncil/__tests__/legalMovesQuarry.test.ts:17`, `src/warCouncil/__tests__/playCard.bank.test.ts:26`, `src/warCouncil/__tests__/playCard.test.ts:29`, `src/warCouncil/__tests__/playCard.timebomb.test.ts:29`, `src/warCouncil/__tests__/quarryIntent.test.ts:31`, `src/warCouncil/__tests__/rankTiers.playCard.test.ts:125`, `src/warCouncil/__tests__/types.test.ts:16`

- [ ] **Step 1: Add the field to `RoundState`, directly below `primedCards`**

```ts
  /** DLR-167 AC3/AC7 — cards the PLAYER has cursed for the COMING TRICK. Unlike `skulledCards`
   *  above, which `dealRound` writes once and nothing changes mid-hand, this list is written
   *  mid-hand by `curseCard` and CLEARED by `playCard` at every trick's resolution: the mark is
   *  for one trick and lapses whether or not the card was played (AC7). That is exactly why it
   *  is a SEPARATE list and not an append to `skulledCards` — inside one list nothing could tell
   *  a dealt skull from a curse, so nothing would know what to lift.
   *
   *  `skullsOn` (`curse.ts`) is the ONE place this and `skulledCards` are read as one. Two
   *  readers deliberately do NOT use it — `cpuPlayer`'s card choice and `suitShape`'s readout —
   *  because both reason about the QUARRY's own dealt skulls, which a curse is not. */
  readonly cursedCards: readonly Card[]
```

- [ ] **Step 2: Add `cursedCards: []` to all 21 literals listed above**

Every one is a complete `RoundState` object literal. Add the field beside the existing `primedCards: []` (or `primedCards: [...]`) entry in each. In `playCard.ts:174` the value is **not** `[]` — Task 3 replaces it; write `cursedCards: next.cursedCards` for now so this task is behaviour-neutral.

- [ ] **Step 3: Typecheck — the compiler is the authority on the count, not this plan**

Run: `npm run typecheck`
Expected: exits 0. If it names a literal not listed above, add the field there too and note it — the plan's count of 21 came from a proxy grep and `tsc` is the real list.

### Task 2: The curse module — the mark and the one union

- Skill: react-frontend

**Files:**

- Create: `src/warCouncil/curse.ts`
- Modify: `src/warCouncil/index.ts` — re-export `isCursed`, `curseCard`, `uncurseCard`, `skullsOn`
- Test: `src/warCouncil/__tests__/curse.test.ts`

- [ ] **Step 1: Write the failing test for the mark's four invariants and the union**

```ts
import { describe, expect, it } from 'vitest'
import { curseCard, isCursed, skullsOn, uncurseCard } from '../curse'
import { PlayerSide, Suit } from '../types'
import { makeRound } from './roundFixture'   // if unavailable here, build a literal in-file

const bells2 = { suit: Suit.Bells, rank: 2 }
const keys3 = { suit: Suit.Keys, rank: 3 }

describe('curseCard', () => {
  it('marks a card held by that side', () => {
    const next = curseCard(base, PlayerSide.Player, bells2)
    expect(isCursed(next.cursedCards, bells2)).toBe(true)
  })
  it('marks a card that is ILLEGAL to play — marking is not a move (AC3)', () => { /* … */ })
  it('throws when the card is not in that side\'s hand', () => {
    expect(() => curseCard(base, PlayerSide.Player, keys3)).toThrow(RangeError)
  })
  it('throws when the card is already cursed', () => { /* … */ })
})

describe('skullsOn', () => {
  it('returns dealt skulls and curses as one list', () => {
    const state = { skulledCards: [keys3], cursedCards: [bells2] }
    expect(skullsOn(state)).toEqual(expect.arrayContaining([keys3, bells2]))
  })
  it('returns the dealt skulls unchanged when nothing is cursed', () => { /* … */ })
})
```

Run: `npx vitest run src/warCouncil/__tests__/curse.test.ts`
Expected: fails to resolve `../curse` — the module does not exist yet.

- [ ] **Step 2: Write `src/warCouncil/curse.ts`**

Mirror `src/warCouncil/timebomb.ts` in shape, naming and docblock discipline. `curseCard` and `uncurseCard` **throw** (`RangeError`) exactly as `primeCard`/`unprimeCard` do — a silent no-op would let the player spend a card for a mark that was never made — and the docblock must say the reducer guards both conditions first, because a reducer must not throw during an event handler.

```ts
import { containsCard, sameCard } from './cardUtils'
import type { Card, PlayerSide, RoundState } from './types'

export function isCursed(cursedCards: readonly Card[], card: Card): boolean {
  return containsCard(cursedCards, card)
}

/** AC4/AC5 — every card that SHOWS a skull and makes a trick a skull trick, from both sources.
 *  THE single union. `isSkulled` and `trickIsSkulled` keep their plain-list signatures and are
 *  called WITH this rather than changed to know about two lists. */
export function skullsOn(
  state: Pick<RoundState, 'skulledCards' | 'cursedCards'>,
): readonly Card[] {
  return state.cursedCards.length === 0
    ? state.skulledCards
    : [...state.skulledCards, ...state.cursedCards]
}

export function curseCard(state: RoundState, side: PlayerSide, card: Card): RoundState
export function uncurseCard(state: RoundState, card: Card): RoundState
```

Run: `npx vitest run src/warCouncil/__tests__/curse.test.ts`
Expected: exits 0, all cases pass.

### Task 3: Read the union for the skull trick, and lapse the mark at resolution

- Skill: react-frontend

**Files:**

- Modify: `src/warCouncil/playCard.ts:125` (the `skullTrick` read), `src/warCouncil/playCard.ts:174` (the lapse)
- Test: `src/warCouncil/__tests__/playCard.curse.test.ts`

- [ ] **Step 1: Write the failing test for the flip and the lapse**

Three cases, all against the real `playCard`: a cursed player card played into a trick the player **loses** resolves as a **dodge** (banks, no health lost); the same card played into a trick the player **wins** is an eaten skull (hurts, banks nothing); and `cursedCards` is **empty** on the returned state after any trick resolves, including when the cursed card was never played.

Run: `npx vitest run src/warCouncil/__tests__/playCard.curse.test.ts`
Expected: fails — `skullTrick` still reads `skulledCards` alone, so the cursed trick resolves as a clean loss.

- [ ] **Step 2: Read the union at line 125**

```ts
      skullTrick: trickIsSkulled(skullsOn(next), completedTrick),
```

- [ ] **Step 3: Clear the mark where the trick resolves, at line 174**

```ts
    // AC7 — the mark is for ONE trick and lapses at its resolution, whether or not the cursed
    // card was played. Clearing the whole list covers both branches with no per-card bookkeeping
    // and no fuse counter: unlike a Timebomb's mark, a curse never spans more than one trick.
    cursedCards: [],
```

Run: `npx vitest run src/warCouncil/__tests__/playCard.curse.test.ts src/warCouncil/__tests__/playCard.test.ts src/warCouncil/__tests__/playCard.bank.test.ts`
Expected: exits 0. The two pre-existing suites must be unaffected — nothing curses anything yet outside the new spec.

### Task 4: Convert the remaining skull readers to the union

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/buffRideModel.ts:115,117`, `src/app/warCouncil/cardDamage.ts:104`, `src/app/warCouncil/commitHandlers.ts:186`, `src/app/warCouncil/trickConsequenceModel.ts:146`, `src/app/warCouncil/roundControlsProps.ts:126,183,190,216`, `src/sim/playHand.ts:200`, `src/sim/skilledCardPlay.ts:153,302,310`

- [ ] **Step 1: Replace each `…round.skulledCards` with `skullsOn(…round)`**

Twelve sites in this task (the thirteenth, `playCard.ts:125`, was Task 3). Each becomes e.g. `trickIsSkulled(skullsOn(state.round), visible)` and `isSkulled(skullsOn(ui.round), card)`. Import `skullsOn` from `../../warCouncil` (app) or `../warCouncil` (sim).

- [ ] **Step 2: Leave the six Quarry-side readers alone, and say why in a comment**

Do **not** convert `src/app/warCouncil/WarCouncilTable.tsx:154`, `src/sim/skilledCardPlay.ts:81,267,283`, `src/warCouncil/cpuPlayer.ts:66`, or `deal.ts`'s write. Add this one-line comment above each of the five reads:

```ts
// DLR-167 — `skulledCards`, NOT `skullsOn`: this reasons about the QUARRY's own dealt skulls.
// A skull the player just put on their own card is not something the Quarry knows or is shown.
```

- [ ] **Step 3: Prove no skull-trick reader was missed**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "\.skulledCards"`
Expected: every remaining hit is one of the six commented Quarry-side sites, `deal.ts`'s write, `skulls.ts`'s own parameters, `resolutionView.ts:23`'s docblock, or a test literal. No uncommented reader outside that set.

- [ ] **Step 4: Typecheck and run the affected suites**

Run: `npm run typecheck; npx vitest run src/warCouncil src/app/warCouncil`
Expected: both exit 0; Vitest reports 0 failed.

---

## Phase 2 — The card itself

The pure `src/hunt/` half: Curse becomes a real, mintable, priced card with tier figures, single-use and non-revocable. Nothing on the felt can reach it yet, so the phase ends type-checking with the card constructible and fully unit-tested but unreachable by a player — the same state DLR-161 left its two cards in before its own UI task.

### Task 5: `BuffKind.Curse` and the three total maps

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/buffs.ts` — the `BuffKind` member and its `BUFF_CADENCE` row
- Modify: `src/app/warCouncil/buffLabels.ts` — `BUFF_FAMILY_WORD` and `BUFF_CONDITION_SENTENCE`

- [ ] **Step 1: Add the member and its cadence row**

```ts
  /** DLR-167 — the player's own skull. An Activated card: the player presses it, so it has no
   *  trigger and gains no `buffFires` case. */
  Curse: 'curse',
```

```ts
  [BuffKind.Curse]: BuffCadence.Activated,
```

- [ ] **Step 2: Add Curse's two label rows**

```ts
  [BuffKind.Curse]: 'Curse',
```

```ts
  [BuffKind.Curse]: 'put a skull on a card in your hand',
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. All three `Record<BuffKind, …>` maps are total, so a missed row fails here — that is the designed behaviour and the reason this is one task.

### Task 6: Curse's tier figures and its minting function

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/buffCatalog.ts`
- Modify: `src/hunt/index.ts` — export `CurseBonus`, `CURSE_REWARD`, `curseBuff`, `curseRewardOf`
- Test: `src/hunt/__tests__/curseCard.test.ts`

- [ ] **Step 1: Write the failing test for the tier figures and the throw**

```ts
it('pays AC6 figures at each tier', () => {
  expect(CURSE_REWARD.bronze).toEqual({ damage: 1, multiplier: 0 })
  expect(CURSE_REWARD.silver).toEqual({ damage: 2, multiplier: 0 })
  expect(CURSE_REWARD.gold).toEqual({ damage: 2, multiplier: 1 })
})
it('carries the damage half as the minted reward value', () => {
  expect(curseBuff(BuffTier.Gold, 7).reward.value).toBe(2)
})
it('throws on a buff that is not a Curse', () => {
  expect(() => curseRewardOf(cheatBuff(BuffTier.Bronze, 1))).toThrow(RangeError)
})
```

Run: `npx vitest run src/hunt/__tests__/curseCard.test.ts`
Expected: fails — none of the three symbols exists.

- [ ] **Step 2: Add the pair type and the tier table**

```ts
/** Curse's two figures at one tier. A PAIR, not one number, for `TimebombDamage`'s stated reason:
 *  `BuffReward` is deliberately one axis and one value (DLR-105), and widening it for one card is
 *  a type change this codebase has twice declined to make.
 *  UNIT: `damage` in damage points added to the cursed trick's base; `multiplier` in multiplier
 *  points added to that trick's `buffMult`. */
export interface CurseBonus {
  readonly damage: number
  readonly multiplier: number
}

/** DLR-167 AC6, TRANSCRIBED verbatim — "bronze +1 damage; silver +2 damage; gold +2 damage and
 *  +1 multiplier". NOT chosen here, and the ticket's scope boundaries forbid retuning them in
 *  this contract: they ship as specified and get tuned by playing. */
export const CURSE_REWARD: Readonly<Record<BuffTier, CurseBonus>> = {
  [BuffTier.Bronze]: { damage: 1, multiplier: 0 },
  [BuffTier.Silver]: { damage: 2, multiplier: 0 },
  [BuffTier.Gold]: { damage: 2, multiplier: 1 },
}
```

- [ ] **Step 3: Add `curseBuff` and `curseRewardOf`**

`curseBuff` mirrors `timebombBuff` — `condition: ACTIVATED_BUFF_CONDITION`, and `reward: { axis: BuffRewardAxis.Magnitude, value: CURSE_REWARD[tier].damage }`, the damage half as the headline figure. `curseRewardOf` throws a `RangeError` naming the kind on any other card, for `timebombDamageOf`'s stated reason.

Run: `npx vitest run src/hunt/__tests__/curseCard.test.ts`
Expected: exits 0.

### Task 7: The template — Curse is minted from the slot machine

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/buffTemplates.ts`
- Test: `src/hunt/__tests__/curseCard.test.ts` (extend)

- [ ] **Step 1: Extend the spec for the pool and the minting path**

```ts
it('mints Curse from its activated template', () => {
  const template = templateById('curse')
  expect(template).toBeDefined()
  expect(mintFromTemplate(template!, BuffTier.Silver, 3).kind).toBe(BuffKind.Curse)
})
it('takes the pool to 19 templates', () => {
  expect(BUFF_TEMPLATE_COUNT).toBe(19)
})
it('round-trips a minted Curse back to its template id', () => {
  expect(templateIdForBuff(curseBuff(BuffTier.Gold, 4))).toBe('curse')
})
```

Run: `npx vitest run src/hunt/__tests__/curseCard.test.ts`
Expected: fails — no `curse` template.

- [ ] **Step 2: Widen the activated kind and add the row**

```ts
export type BuffActivatedTemplateKind =
  | typeof BuffKind.Cheat
  | typeof BuffKind.Timebomb
  // DLR-167 AC1 — the widening that makes Curse CONSTRUCTIBLE rather than merely unweighted,
  // which is the mechanism `MintableConditionKind`'s docblock names for the condition families.
  | typeof BuffKind.Curse
```

```ts
  // PERSISTED id (DLR-113) — ADDITIVE, never a rename, so no saved grant is orphaned and no
  // SAVE_SCHEMA_VERSION bump is needed. Frozen the moment it ships, exactly like the two above.
  { form: 'activated', id: 'curse', kind: BuffKind.Curse },
```

- [ ] **Step 3: Replace `mintFromTemplate`'s two-way ternary with a total narrowing**

The current activated branch is `template.kind === BuffKind.Cheat ? cheatBuff(…) : timebombBuff(…)`, which would silently mint a Timebomb for a Curse. Replace it with a `switch` over `template.kind` that returns `cheatBuff` / `timebombBuff` / `curseBuff`, so a fourth activated kind fails to compile here rather than minting the wrong card.

- [ ] **Step 4: Update this file's own docblock and `BUFF_TEMPLATES`' count comment**

Both currently say 18. State 19, and that DLR-167 adds one **activated** template — not a `TEMPLATE_FAMILIES` row, and not a restoration of any cut condition family.

Run: `npx vitest run src/hunt`
Expected: exits 0; Vitest reports 0 failed. Any pre-existing spec asserting a count of 18 is updated in this task.

### Task 8: Curse's price, its single use, and its non-revocability

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/buffCosts.ts` — `BuffConsumableKind` widening, `CONSUMABLE_AP_COST` row
- Modify: `src/hunt/consumables.ts` — `ActivatedItemKind` widening, `ACTIVATED_CARD_SINGLE_USE` row
- Config: `src/hunt/buffCosts.ts` — Curse's three AP figures (**a developer decision**, see the File map)
- Test: `src/hunt/__tests__/curseCard.test.ts` (extend)

- [ ] **Step 1: Extend the spec for the price, the single use, and the non-revocability**

```ts
it('is priced through the existing consumable table (AC2)', () => {
  expect(apCostOf(curseBuff(BuffTier.Silver, 1))).toBe(CONSUMABLE_AP_COST.curse.silver)
})
it('is spent on use (AC8)', () => {
  expect(isConsumableItem(curseBuff(BuffTier.Bronze, 1))).toBe(true)
})
it('cannot be taken back off the trick (AC8)', () => {
  expect(isRevocableBuff(curseBuff(BuffTier.Bronze, 1))).toBe(false)
})
```

Run: `npx vitest run src/hunt/__tests__/curseCard.test.ts`
Expected: fails — `apCostOf` throws on an unpriced kind.

- [ ] **Step 2: Add the price row, with the placeholder marked**

```ts
  // DLR-167 AC2 — "a tiered action-point cost from the existing cost table". That table had no
  // Curse row, and `apCostOf` THROWS on an unpriced kind, so a row is forced by the type system:
  // the choice could only be made invisibly or made visibly. Made visibly.
  // NOBODY CHOSE THESE THREE NUMBERS. The ladder shape is copied from Shield's. Worth pricing
  // against the card's own asymmetry: a misread Curse costs the card, the AP and the whole
  // streak at once. See `tasks.md` -> Developer decides or observes. UNIT: action points.
  [BuffKind.Curse]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 3, [BuffTier.Gold]: 4 },
```

- [ ] **Step 3: Add the single-use row, and add NOTHING to `REVOCABLE_BUFF_KINDS`**

```ts
  // DLR-167 AC8 — spent on use, matching Cheat: putting a skull on a card has already changed
  // the felt.
  [BuffKind.Curse]: true,
```

AC8's other half is an **omission**: Curse must NOT be added to `REVOCABLE_BUFF_KINDS` in `buffActivation.ts`. Leave that set untouched, and add a one-line note there recording that the absence is deliberate so a later reader does not "fix" it.

Run: `npx vitest run src/hunt`
Expected: exits 0; Vitest reports 0 failed.

### Task 9: Curse's payoff reaches the trick's damage

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/buffAccrual.ts` — add `curseBonusOf`
- Modify: `src/hunt/index.ts` — export it
- Modify: `src/warCouncil/streak.ts` — `resolveTrickBank`'s banked branch
- Test: `src/warCouncil/__tests__/playCard.curse.test.ts` (extend)

**Do not add a field to `TrickFacts`.** See this file's header.

- [ ] **Step 1: Extend the spec for the two figures and the self-gating**

```ts
it('adds a silver Curse\'s +2 to the dodged trick\'s damage', () => { /* base 5 -> 7 */ })
it('adds a gold Curse\'s +1 multiplier as well', () => { /* (5 + 2) * 2 */ })
it('pays NOTHING on a trick the player won with the curse — self-gating (AC6)', () => {
  // The trick hurts, so it banks nothing at all; no "only on a dodge" condition exists.
})
```

Run: `npx vitest run src/warCouncil/__tests__/playCard.curse.test.ts`
Expected: fails — the dodged trick banks the base figure only.

- [ ] **Step 2: Add `curseBonusOf` to `buffAccrual.ts`**

```ts
const EMPTY_CURSE_BONUS: CurseBonus = { damage: 0, multiplier: 0 }

/** DLR-167 AC6 — the two figures the Curses riding THIS trick pay into it, summed.
 *
 *  Reads the ACTIVATED set, not the fired set, and that is the whole point: a Curse is
 *  `BuffCadence.Activated`, so `firedBuffs` excludes it by design and it has no `buffFires` case
 *  to gain. Its payoff is owed for the trick it was ACTIVATED for, not for a condition coming
 *  true. The zero pair for "no Curse riding" is a real answer rather than this codebase's
 *  plausible-zero trap — no Curse genuinely pays nothing. */
export function curseBonusOf(active: readonly Buff[]): CurseBonus {
  return active
    .filter((buff) => buff.kind === BuffKind.Curse)
    .reduce((sum, buff) => {
      const reward = curseRewardOf(buff)
      return {
        damage: sum.damage + reward.damage,
        multiplier: sum.multiplier + reward.multiplier,
      }
    }, EMPTY_CURSE_BONUS)
}
```

- [ ] **Step 3: Fold the two terms into the banked branch of `resolveTrickBank`**

Beside the existing `trickBonusFor(fired, false)` and `streakProtectionFor(fired)` derivations — which is where a figure derived from this trick's own buffs belongs, per `streakProtectionFor`'s own docblock:

```ts
    // DLR-167 AC6 — DERIVED here from the buffs riding this trick, for the reason the
    // `streakProtectionFor` note above gives: they are already in scope, and handing this in on
    // `TrickFacts` would make the caller evaluate the same set a second time.
    // Only a BANKED trick reaches this branch at all, which is what makes AC6's reward
    // self-gating with no "only on a dodge" condition written anywhere.
    const curse = trick.buffs === null ? EMPTY_CURSE_BONUS : curseBonusOf(trick.buffs.active)
    const base = BASE_DAMAGE + safeBonus(trick.baseDamageBonus) + safeBonus(curse.damage)
    const buffMult = 1 + bonus.multiplierBonus + bonus.overlapBonus + safeBonus(curse.multiplier)
```

`safeBonus` on both, so a mistyped negative in the tier table cannot subtract from a trick's damage.

Run: `npx vitest run src/warCouncil src/hunt`
Expected: both exit 0; Vitest reports 0 failed.

---

## Phase 3 — The felt: arming Curse, and marking a card

The interaction. Activation is entirely existing machinery — Curse rides the same two-tap loadout row as every other card — so the new work is the arming flag, the tap that marks rather than plays, and the skull reaching the hand. The phase ends with the card fully playable end to end. Layout and interaction throughout follow `mockup.html` in this folder.

### Task 10: The armed-Curse state and its refusal

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/buffActivation.ts` — the `CurseLive` refusal, the stock field, the refusal order
- Modify: `src/app/warCouncil/roundUiState.ts` — `curseArmedBuff`, `curseArmed`, `curseLive`, the stock wiring
- Test: `src/app/warCouncil/__tests__/roundReducer.curse.test.ts`

- [ ] **Step 1: Write the failing test for the mutual refusal**

A Curse armed refuses a Timebomb and a second Curse with `CurseLive`; a Timebomb armed still refuses a Curse with `TimebombLive`; neither refuses anything once the trick has resolved and the state is cleared.

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.curse.test.ts`
Expected: fails — `CurseLive` does not exist.

- [ ] **Step 2: Add the refusal member, the stock field, and the order**

```ts
  /** DLR-167 — a Curse is armed and waiting for a hand card, or a card is already cursed. Refuses
   *  a Timebomb and a second Curse for `TimebombLive`'s reason: both re-point the NEXT HAND TAP,
   *  and two armed at once makes that tap ambiguous — `handleToggleLoadout`'s own stated rule. */
  CurseLive: 'curseLive',
```

Order becomes `NoEffectYet → WindowClosed → TimebombLive → CurseLive → AlreadyActive → InsufficientAp`, and `buffActivationStockFor` gains `curseLive` alongside `timebombLive`. Set `timebombLive` true for a **Curse** as well when a Timebomb is live, and `curseLive` true for a **Timebomb** as well when a Curse is live — the point is that either armed card blocks the other, not that each blocks only itself.

- [ ] **Step 3: Add the felt state and its two predicates**

```ts
  /** DLR-167 AC3 — the Curse that has been PAID FOR and is waiting for a hand card, or `null`.
   *  Mirrors `timebombArmedDamage`'s role, but holds the `Buff` itself rather than a figure,
   *  because `curseRewardOf` needs the TIER when the cursed trick resolves. */
  readonly curseArmedBuff: Buff | null
```

```ts
export function curseArmed(state: RoundUiState): boolean {
  return state.curseArmedBuff !== null
}
/** Either half of "a hand tap is already claimed by a Curse" — armed and waiting, or a card
 *  already marked. Both the disabled row and the reducer branch read THIS, never one half. */
export function curseLive(state: RoundUiState): boolean {
  return curseArmed(state) || state.round.cursedCards.length > 0
}
```

Add `curseArmedBuff: null` to every `RoundUiState` construction site the typechecker names.

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/roundReducer.curse.test.ts`
Expected: both exit 0.

### Task 11: Spending a Curse arms it

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/buffHandlers.ts` — the Curse branch of the commit path
- Test: `src/app/warCouncil/__tests__/roundReducer.curse.test.ts` (extend)

- [ ] **Step 1: Extend the spec — spending a Curse costs AP, removes the card, and arms the mode**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.curse.test.ts`
Expected: fails — `curseArmedBuff` stays `null` after the spend.

- [ ] **Step 2: Set `curseArmedBuff` on the commit, beside the existing Cheat and Timebomb branches**

`activateFromPile` already spends the AP and removes the single-use card; the only addition is `curseArmedBuff: buff` on the returned state when `buff.kind === BuffKind.Curse`. Follow the Timebomb branch's shape exactly. Thread the real `curseLive(state)` fact into `activateFromPile`'s guard the way DLR-154's fix threads `timebombLive`, so the throw-guard is a real re-check rather than an assumed one.

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.curse.test.ts src/app/warCouncil/__tests__/buffHandlers.test.ts`
Expected: exits 0; Vitest reports 0 failed.

### Task 12: The tap that marks rather than plays

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/roundReducer.ts` — `handleTapCard`'s new branch and a `curseTapped` helper
- Test: `src/app/warCouncil/__tests__/roundReducer.curse.test.ts` (extend)

- [ ] **Step 1: Extend the spec — the illegal card is a legal target (AC3)**

Assert that with a Curse armed, tapping a card that `legalMoves` excludes still marks it; that a second tap on an already-cursed card is a no-op that keeps the mode open; and that a tap on a card not in hand clears `curseArmedBuff` rather than throwing.

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.curse.test.ts`
Expected: fails — the tap arms/plays instead of marking.

- [ ] **Step 2: Add the branch, beside the Timebomb's, above the `canAct` guard**

```ts
  // DLR-167 AC3 — NOT `canAct`-gated, for the reason the Timebomb branch above gives: a Curse can
  // be armed during the Quarry-to-lead gap, where `canAct` is false because the Quarry is next to
  // move. `curseTapped`'s own guards are what keep this safe to reach from there.
  if (curseArmed(state)) {
    return curseTapped(state, tapped)
  }
```

- [ ] **Step 3: Write `curseTapped`, mirroring `primeTapped`'s three guards**

Guard hand membership and the existing mark **before** calling `curseCard`, which throws — a reducer must not throw during an event handler. A failed membership guard clears `curseArmedBuff` rather than half-applying, so the player is never left armed with no visible cause. A tap on an already-cursed card is a **no-op that keeps the mode open**, matching `primeTapped`'s Assumption 5. **Legality is deliberately not checked** — say so in the docblock, because it is the whole point of the card.

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.curse.test.ts src/app/warCouncil/__tests__/roundReducer.test.ts`
Expected: exits 0; Vitest reports 0 failed.

### Task 13: The skull on a card in your own hand

- Skill: react-frontend, game-ux

**Files:**

- Modify: `src/app/warCouncil/HandFan.tsx` — `skulledCards` and `curseArmed` props
- Modify: `src/app/warCouncil/roundControlsProps.ts` — thread `skullsOn(ui.round)` and `curseArmed(ui)`
- Test: `src/app/warCouncil/__tests__/HandFan.test.tsx`

Layout per `mockup.html` in this folder — specifically its hand row, where a cursed card keeps its corner rank and suit while the skull replaces the art, and where every held card becomes tappable while a Curse is armed.

- [ ] **Step 1: Write the failing component test, querying by accessible role and label (AC11)**

```tsx
it('renders a cursed card with the skull in its accessible name', () => {
  render(<HandFan {...props} skulledCards={[bells2]} />)
  expect(screen.getByRole('button', { name: /Bells 2.*skulled/i })).toBeDefined()
})
it('leaves an illegal card tappable while a Curse is armed (AC3)', () => {
  render(<HandFan {...props} curseArmed legal={[moons5]} />)
  expect(screen.getByRole('button', { name: /Keys 3/i })).not.toBeDisabled()
})
```

Run: `npx vitest run src/app/warCouncil/__tests__/HandFan.test.tsx`
Expected: fails — `HandFan` takes no `skulledCards` prop.

- [ ] **Step 2: Add the two props and pass `skulled` through**

`HandFan` computes nothing about a card's state — it takes both as answers, exactly as it already takes `legal` from the engine. On each rendered card set `skulled={isSkulled(skulledCards, card)}`. `PlayingCard`'s existing `skulled` branch and its `wc-is-skulled` class already hide the art window and keep the corner index; **no new rendering and no new CSS is needed for AC4.**

- [ ] **Step 3: Widen the tap-target and focus gates to include `curseArmed`**

Everywhere `timebombArmed` currently makes every held card a valid target — the `containsCard(legal, …)` drop-out and the focusability gate — the condition becomes `timebombArmed || curseArmed`. The roving tabindex must therefore admit a card that is illegal to play but legal to mark; a `disabled` button cannot take focus, so failing to widen this makes those cards unreachable by keyboard.

- [ ] **Step 4: Thread both props from `roundControlsProps.ts`**

`skulledCards: skullsOn(ui.round)` and `curseArmed: curseArmed(ui)` at each of the `HandFan` prop sites.

Run: `npx vitest run src/app/warCouncil; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed.

### Task 14: Curse's card face, and Sidestep's corrected wording

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/buffLabels.ts` — Curse's payoff, Sidestep's condition sentence and event word
- Config: `src/app/warCouncil/buffLabels.ts` — Sidestep's replacement copy (**a developer decision**, see the File map)
- Test: `src/app/warCouncil/__tests__/buffLabels.test.ts` (or the nearest existing labels spec)

- [ ] **Step 1: Correct Sidestep's two strings (AC10)**

```ts
  // DLR-167 AC10 — was 'dodge a skull with this card'. NO BUFF ATTACHES TO A CARD: a buff is
  // activated FOR A TRICK and checked when that trick resolves. The old wording came from the
  // unbuilt "Apply-to-card" category in `v1-buff-card-list.md`, which was never built.
  // COPY IS THE DEVELOPER'S CALL — see `tasks.md` -> Developer decides or observes.
  [BuffKind.Sidestep]: 'a skull trick you do not take',
```

```ts
  // DLR-167 AC10 — was 'DODGE', which collided with the card's own name AND with "dodge" as the
  // name of a trick outcome. Still MECHANICAL vocabulary, per this table's own docblock: it names
  // the branch the buff fires on, not the outcome.
  [BuffKind.Sidestep]: 'SKULL LOSS',
```

Do **not** rename Sidestep itself — the ticket rules that out explicitly.

- [ ] **Step 2: Give Curse its payoff phrase**

Curse pays two figures at gold, so `buffPayoff` needs a Curse branch beside the Timebomb's — reading `CURSE_REWARD[buff.tier]` from `src/hunt`, never a literal, so a retuned ladder cannot leave the card advertising a figure the engine will not honour. Gold reads as gain `+2 damage, +1 mult`; bronze and silver carry damage alone and no risk half.

- [ ] **Step 3: Assert the old wording is gone**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "dodge a skull with this card|'DODGE'"`
Expected: zero hits.

Run: `npx vitest run src/app/warCouncil`
Expected: exits 0; Vitest reports 0 failed. Any pre-existing spec asserting the old Sidestep strings is updated in this task.

---

## Phase 4 — The simulator learns Curse

So the card can be measured. The simulator is lint-enforced pure and drives the real reducer, so this is a fixture and a window action, not a new judgement policy — teaching a policy *when* to Curse is a tuning question the ticket does not ask for. The phase ends with the simulator able to reach a Curse and the whole suite still green.

### Task 15: A Curse fixture and the buff window offering it

- Skill: react-frontend

**Files:**

- Modify: `src/sim/fixtures.ts` — a `fixtureHandWithCursedCard` builder
- Modify: `src/sim/playHandWindows.ts` — let `runBuffWindow` spend a Curse and mark a card
- Test: `src/sim/__tests__/curse.test.ts`

- [ ] **Step 1: Write the failing test — a simulated run can reach a cursed trick**

Assert that the fixture produces a state whose `round.cursedCards` is non-empty and whose next resolved trick reads as a skull trick.

Run: `npx vitest run src/sim/__tests__/curse.test.ts`
Expected: fails — no fixture exists.

- [ ] **Step 2: Add the fixture, mirroring `fixtureHandWithPrimedTimebomb`**

Same shape: `ToggleLoadout`, `TapBuff` twice (poise, commit — this arms the Curse), then `TapCard` on a held card to mark it. Retry across seeds with a bounded attempt count and **throw** with a message naming the range when none lands, exactly as the Timebomb fixture does — never return a silently-unmarked state.

- [ ] **Step 3: Let the buff window spend a Curse**

In `runBuffWindow`, a Curse offered by `offeredBuffs` is spendable in the same `discardWindowOpen` window as every other activated card, and the follow-up `TapCard` marks the policy's chosen card. Gate on `discardWindowOpen`, not `canAct` alone.

Run: `npx vitest run src/sim; npm run lint`
Expected: both exit 0. Lint matters here specifically: `src/sim/**` is purity-enforced and a React or DOM reference fails the build.

---

## Phase 5 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task 16: Confirm the pure-core boundary still holds

- Skill: none — verification only, no code is written

- [ ] **Step 1: Grep the three pure trees for React and DOM references**

Run: `Get-ChildItem src\hunt,src\warCouncil,src\sim -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

- [ ] **Step 2: Confirm the storage boundary is untouched**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "globalThis\.(localStorage|sessionStorage)\b"`
Expected: one hit, in `src/persistence/browserStorage.ts` — the sanctioned access. This contract persists nothing new; the template id `'curse'` is additive, so no `SAVE_SCHEMA_VERSION` bump is expected in the diff.

### Task 17: Confirm no tuning value was hard-coded and no stale name remains

- Skill: none — verification only, no code is written

- [ ] **Step 1: Confirm Curse's figures live only in their tables**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "CURSE_REWARD|CONSUMABLE_AP_COST"`
Expected: every hit is a declaration in `buffCatalog.ts` / `buffCosts.ts`, a read through `curseRewardOf` / `apCostOf`, or a spec asserting against the table. No inline `1`, `2` or `3` standing in for a Curse figure at any call site.

- [ ] **Step 2: Confirm the corrected Sidestep copy left nothing behind**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "dodge a skull with this card|'DODGE'"`
Expected: zero hits.

- [ ] **Step 3: Confirm no skull-trick reader was left on the un-unioned list**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "\.skulledCards"`
Expected: every remaining hit is a test literal, `deal.ts`'s write, `resolutionView.ts`'s docblock, or one of the six Quarry-side readers carrying the `DLR-167 — skulledCards, NOT skullsOn` comment from Task 4.

- [ ] **Step 4: Confirm no file was pushed past the 400-line budget**

Run: `Get-ChildItem src\hunt\buffCatalog.ts,src\hunt\buffTemplates.ts,src\hunt\buffActivation.ts,src\app\warCouncil\buffLabels.ts,src\app\warCouncil\roundUiState.ts,src\app\warCouncil\roundReducer.ts,src\app\warCouncil\HandFan.tsx,src\warCouncil\streak.ts | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count ≤ 400. `(Get-Content).Count`, **not** `Measure-Object -Line`, which drops blank lines and hides a real breach. Any file over budget is split **in this contract**, not reported as a finding.

### Task 18: Static gates and the full suite

- Skill: none — verification only, no code is written

- [ ] **Step 1: Warm the transform cache, then run the gates and the full suite**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all exit 0; Vitest reports 0 failed. The two scoped project runs come first deliberately — a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is a worker-start timeout, **not** a failing test. Only a second consecutive timeout is a real problem.

- [ ] **Step 2: Check formatting of the files this contract changed, not the repo**

Run: `npx prettier --check src/warCouncil/curse.ts src/warCouncil/types.ts src/warCouncil/playCard.ts src/warCouncil/streak.ts src/hunt/buffs.ts src/hunt/buffCatalog.ts src/hunt/buffTemplates.ts src/hunt/buffCosts.ts src/hunt/consumables.ts src/hunt/buffAccrual.ts src/hunt/buffActivation.ts src/app/warCouncil/roundUiState.ts src/app/warCouncil/roundReducer.ts src/app/warCouncil/buffHandlers.ts src/app/warCouncil/HandFan.tsx src/app/warCouncil/buffLabels.ts src/app/warCouncil/roundControlsProps.ts src/sim/fixtures.ts src/sim/playHandWindows.ts`
Expected: exits 0. Rewrite with `npx prettier --write <the same paths>` if it fails. **Never run `npm run format`** — it rewrites ~59 files across `.docs/**` that no contract touched. Run `npm run format:check` and report its result, but do not gate on it: it fails on pre-existing files.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 19: Update the PR description

- Skill: none — a written hand-off, no code

**Files:**

- Create: `.claude/contract/DLR-167-curse-skull-your-own-card/pr-description.md`

- [ ] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- Link to `plan.md` and `mockup.html` in this folder.
- Summary of the change: Curse as a drawable activated card, the skull mark, the union read, the lapse, the payoff, and Sidestep's corrected wording.
- **Every decision the developer must make** — Curse's three AP prices, Sidestep's replacement copy — and **every behaviour they must judge by playing**: whether the skull on your own card reads as yours, whether arming-then-marking feels like one action, and whether the wasted-Curse case reads as friction or a feel-bad.
- Verification results from the prior phases, quoting the Vitest summary line and the line counts.
- A one-line note for future contributors on the new convention: **`skullsOn` is the single place a dealt skull and a player's curse are read as one**, and the six Quarry-side readers that deliberately do not use it.
- A note that the Timebomb is untouched and DLR-166 still removes it, listing the small residue DLR-166 will need to clear: the `TimebombLive` refusal, `timebombArmed`/`timebombLive`, and the Timebomb branch of `handleTapCard`.

---

## Self-review

(Filled by the planner before handing off, so the executor can confirm coverage.)

**Spec coverage:**

- AC1, a new activated Curse minted from the slot machine — Tasks 5, 7.
- AC2, the existing between-tricks window and a tiered cost from the existing table — Tasks 8, 10, 11.
- AC3, activating then tapping marks a card, illegal ones included — Tasks 2, 12, 13.
- AC4, the full skull card face in hand — Task 13.
- AC5, the skull trick through the rule that already exists — Tasks 3, 4.
- AC6, the tier rewards feeding the cursed trick's own damage terms — Tasks 6, 9.
- AC7, the mark lapses at that trick's resolution — Task 3.
- AC8, spent on use, non-revocable, still in the riding list — Task 8.
- AC9, Sidestep fires on a Curse-made dodge, with a test on exactly that combination — Task 3 (spec), Task 9.
- AC10, Sidestep's wording corrected — Task 14.
- AC11, the five gates and test coverage — Tasks 16–18, plus a test step in every code task.
- AC12, the ruleset and per-module docs — **not a task here**: `CLAUDE.md` makes `implementation-doc-writer` a standing step of every `/fb-apply` run, and the developer unticked it as a plan-scheduled skill for that reason. Recorded in `plan.md` Part 2.
- In-scope bullet "the simulator learning Curse" — Task 15.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step is a concrete code change or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `cursedCards`, `curse.ts`, `isCursed`, `curseCard`, `uncurseCard`, `skullsOn`, `CurseBonus`, `CURSE_REWARD`, `curseBuff`, `curseRewardOf`, `curseBonusOf`, `BuffKind.Curse`, the template id `'curse'`, `BuffActivationRefusal.CurseLive`, `curseArmedBuff`, `curseArmed`, `curseLive`, `curseTapped` — each is spelled identically in every task that names it and in `plan.md` Part 2 → Data shapes. `curseBonusOf` lives in `buffAccrual.ts` and is called from `streak.ts`; there is **no** `TrickFacts.curseBonus` field anywhere in this contract.

**Phase boundary cleanliness:**

- *Phase 1* ends type-checking with `cursedCards` present and empty at all 21 sites and every skull reader converted. Nothing writes a curse yet, so behaviour is unchanged and every pre-existing suite passes — no half-applied rename, no dead import.
- *Phase 2* ends with Curse constructible, priced and unit-tested but unreachable by a player, which is the same state DLR-161 left its two cards in before its UI work. The three total `BuffKind` maps are completed inside Task 5, so no phase boundary sits between a widened union and an incomplete map.
- *Phase 3* ends with the card playable end to end and the felt's own suites green.
- *Phase 4* ends with the simulator green and `npm run lint` clean, which is the real gate on `src/sim/**`'s purity.
- *Phase 5* changes no production code at all.
