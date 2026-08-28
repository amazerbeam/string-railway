# Tasks: Activate buffs for the trick — every card they can fire on lights up, with a live per-card breakdown

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [x]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-27

**Goal:** One tap puts a buff on the trick with no target; every legal-to-play card it could fire on lights up with a halo, a travelling cell and a numeral badge; a "riding this trick" list states each buff's reach and lets you take it back off; and an always-open per-card breakdown reads bottom-up from two unemphasised branch totals through the Overlap Bonus to the struck-through rows — every figure from DLR-152's projection, none re-derived in the view.

**Spec:** `plan.md` in this folder.

**Layout and interaction reference:** `.claude/contract/DLR-147-full-ui-pass/mockup-buff-loading.html` (the model in isolation) and `mockup-buff-gallery.html` (the same design folded into the full screen). **Approved upstream on this ticket; open and drive them, do not read their source, and do not port their CSS** — re-author under `react-frontend`. `plan.md` Part 2 → *Data shapes* and *Approach* remain authoritative over anything the mockups imply.

**Run this contract with `/fb-apply DLR-153-activate-buffs-for-the-trick --browser`.** AC5, AC6, AC7, AC8 and AC15–AC19 are computed-style, layout and screenshot claims; `vite.config.ts` sets no `css` option and jsdom has no layout engine, so no Vitest run can settle them. Phase 7 lists them as QA's browser agenda.

---

## File map

**Created:**

- `src/app/warCouncil/buffRideModel.ts` — the projection input assembly, the per-card light map, and the reach rows
- `src/app/warCouncil/buffBreakdownModel.ts` — one card's branch groups, overlap row, totals and struck-through rows
- `src/app/warCouncil/buffRideLabels.ts` — every sentence this surface prints
- `src/app/warCouncil/buffRideProps.ts` — the prop assembly, so `WarCouncilRound.tsx` stays under its 400-line budget
- `src/app/warCouncil/CardBuffHalo.tsx` — the four stacked SVG strokes and the travelling cell
- `src/app/warCouncil/BuffRidingList.tsx` — "Riding this trick", one row per activated buff
- `src/app/warCouncil/CardBuffBreakdown.tsx` — the anchored, bottom-up per-card panel
- `src/app/warCouncil/useBuffBreakdownTarget.ts` — the open-by-default target and the hover bridge
- `src/app/warCouncil/warCouncilBuffRide.css` — halo, cell, badge, riding list and breakdown styles
- `src/hunt/__tests__/buffActivation.deactivate.test.ts`
- `src/app/warCouncil/__tests__/buffRideModel.test.ts`
- `src/app/warCouncil/__tests__/buffBreakdownModel.test.ts`
- `src/app/warCouncil/__tests__/buffRideLabels.test.ts`
- `src/app/warCouncil/__tests__/buffRideCss.test.ts`
- `src/app/warCouncil/__tests__/roundReducer.removeBuff.test.ts`
- `src/app/warCouncil/__tests__/BuffRidingList.test.tsx`
- `src/app/warCouncil/__tests__/CardBuffBreakdown.test.tsx`
- `src/app/warCouncil/__tests__/useBuffBreakdownTarget.test.tsx`
- `src/app/warCouncil/__tests__/WarCouncilRound.buffRide.test.tsx`

**Modified:**

- `src/hunt/actionPoints.ts` — add `refundAp`
- `src/hunt/buffActivation.ts` — add `isRevocableBuff` and `deactivateFromPile`
- `src/hunt/index.ts` — re-export the three new engine symbols
- `src/warCouncil/buffProjection.ts:67-78,145-172` — add `mayFire` to `BuffBranchProjection`, stop discarding the per-branch set
- `src/warCouncil/index.ts` — no new export needed for `mayFire` (a field, not a symbol); confirm the existing `BuffBranchProjection` re-export at line 40 still resolves
- `src/app/warCouncil/PlayingCard.tsx` — two optional props, `buffCount` / `buffEstimate`, and the halo child
- `src/app/warCouncil/HandFan.tsx` — one required prop, `buffLightForCard`
- `src/app/warCouncil/warCouncil.css` — three `--wc-lift-*` tokens plus the buff-ride tokens on `:root`
- `src/app/warCouncil/warCouncilCards.css:267-300` — the three lift rules read the tokens instead of literals
- `src/app/warCouncil/roundUiState.ts:176-206` — the `RemoveBuff` action kind and union member
- `src/app/warCouncil/roundReducer.ts:96-118` — the thirteenth `case`
- `src/app/warCouncil/buffHandlers.ts` — `handleRemoveBuff`
- `src/app/warCouncil/WarCouncilRound.tsx:305-330` — render the riding list and the breakdown, pass the light map
- `src/app/warCouncil/__tests__/handRowCss.test.ts` — the lift assertions follow the literals into the tokens
- `src/app/warCouncil/__tests__/HandFan.test.tsx:23-43` — `renderFan` supplies the new required prop
- `src/app/warCouncil/__tests__/contrast.test.ts` — the badge and totals pairs join the existing table
- `src/warCouncil/__tests__/buffProjection.test.ts` — `mayFire`'s own block

**Deleted:** (none)

**Developer decides or observes:**

- CSS token `--wc-buff-halo` — **red or brass.** Red was asked for and `--wc-alarm` already means damage; `--wc-brass` already means yours-and-selected. `update-log.md` OPEN #9. Ship with a documented placeholder until chosen.
- CSS tokens for the four halo stroke widths and their four opacities — all must start non-zero and grow with the count; a stroke scaled purely by the count is invisible at one buff.
- CSS token `--wc-buff-lap-base` — the lap-time slope's intercept (`3.2 − 0.5n` seconds in the mockup). **The 0.9s floor is not this**: it is a flash-safety limit and is fixed.
- The badge's size and its tally dots · the breakdown panel's width bound and its clearance over the lifted card · the hover-bridge close delay (160ms in the mockup).
- **Whether activation should collapse from two taps to one.** AC1's "one tap" is read as "no target"; the poise/commit pair is DLR-126's reversibility model, and AC10's undo weakens the case for it. Separable change, not in this contract.
- **Whether a suitless buff lighting the entire hand reads well**, with the glow no longer discriminating and the numeral badge carrying the state alone. Named by the ticket as the case to look at. Feel, not function.
- **Whether the two-branch totals read as clarity or as arithmetic homework** (`update-log.md` OPEN #10). Correct but four figures where the brief asked for two; the obvious fix leaks the Quarry's card.
- **Whether a revoked card appended to the end of the pile is acceptable** rather than restored to its original index (`plan.md` Assumptions #3) — it moves under the player's finger.

---

## Phase 1 — Engine: take a buff back off the trick

`the-hunt.md` line 207 records today's rule as "no way to un-activate", so AC10 is a rule change and it lands where the rule lives. Two tasks, both pure `src/hunt/` logic with no React and no felt: a symmetric AP refund, then the pool-and-pile pair that mirrors `activateFromPile`. The phase boundary is safe because nothing calls either function yet — the app layer still compiles unchanged.

### Task 1: Add `refundAp` to `src/hunt/actionPoints.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/actionPoints.ts:32-50`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/actionPoints.test.ts`

- [x] **Step 1: Write the failing test for a refund that honours `AP_ENABLED` and never exceeds what was charged**

Append to `src/hunt/__tests__/actionPoints.test.ts`:

```ts
describe('refundAp', () => {
  it('returns the pool a spend took from it, so spend-then-refund is the identity', () => {
    expect(refundAp(spendAp(5, 2), 2)).toBe(5)
  })

  it('honours AP_ENABLED through the same apCostFor path spendAp honours it through', () => {
    expect(refundAp(5, 2)).toBe(5 + apCostFor(2))
  })
})
```

- [x] **Step 2: Run the new test and watch it fail on the missing export**

Run: `npx vitest run src/hunt/__tests__/actionPoints.test.ts -t "refundAp"`
Expected: fails — `refundAp is not a function` or a TypeScript transform error naming the missing export.

- [x] **Step 3: Implement `refundAp` beside `spendAp`**

```ts
/**
 * The inverse of `spendAp`, for an activation the player takes back (DLR-153 AC10). Routes through
 * `apCostFor` — the SAME gate `spendAp` routes through — so a refund can never exceed what was
 * actually charged, and flipping `AP_ENABLED` to `true` cannot make a revocation free. Clamping to
 * the pool's capacity is the CALLER's job: this module holds no capacity.
 */
export function refundAp(pool: ActionPoints, cost: ActionPoints): ActionPoints {
  return pool + apCostFor(cost)
}
```

- [x] **Step 4: Re-export it and verify**

Add `refundAp` to the `actionPoints.ts` export block in `src/hunt/index.ts`, beside `spendAp`.

Run: `npx vitest run src/hunt/__tests__/actionPoints.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 2: Add `isRevocableBuff` and `deactivateFromPile` to `src/hunt/buffActivation.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/buffActivation.ts:140-190` (after `activateFromPile`)
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/buffActivation.deactivate.test.ts`

- [x] **Step 1: Write the failing spec**

Create `src/hunt/__tests__/buffActivation.deactivate.test.ts` covering, at minimum:

- `isRevocableBuff` is `true` for a Taker, a Feeder and a Sidestep, and `false` for a Cheat, a Timebomb, a Ward and a Shield.
- Activating a Taker then deactivating it returns `activatedThisTrick` to `[]`, returns `spentThisTrick` to `[]`, restores the card into `buffs`, and returns `apPool` to its pre-activation value.
- The restored card is **appended**: activate the first of a three-card pile, deactivate it, and assert the card is now last (`plan.md` Assumptions #3).
- A card that never left the pile (one whose `isConsumableItem` is `false`) is not added a second time — the pile length is unchanged across activate-then-deactivate.
- `deactivateFromPile` **throws** a `RangeError` naming the reason for a non-revocable buff, and for a revocable buff that is not in `activatedThisTrick`.
- Deactivating one of two activated buffs leaves the other in `activatedThisTrick`.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/hunt/__tests__/buffActivation.deactivate.test.ts`
Expected: fails on the two missing exports.

- [x] **Step 3: Implement both, beside `activateFromPile`**

```ts
/**
 * DLR-153 AC10 — THE one statement of which activated cards may be taken back off the trick.
 *
 * TRUE for the three CONDITION families: activating one touches only the AP pool and the pile, both
 * of which `deactivateFromPile` can put back exactly. FALSE for every Activated card, because its
 * spend ALSO arms felt state the felt has already adopted — `cheatTricksRemaining`,
 * `timebombArmedDamage`, `activateShield`'s credited hearts, `activateWard`'s guard — and this
 * module cannot reach any of it. Reversing those is a second rule change and its own ticket.
 *
 * Read by the riding row's own control AND by `handleRemoveBuff`'s guard, so the two cannot read
 * revocability differently — the discipline `buffActivationRefusalFor` sets for activation.
 */
export function isRevocableBuff(buff: Buff): boolean {
  return isConditionFamily(buff.kind)
}

/**
 * The mirror of `activateFromPile`: the pool AND the pile after one revocation, returned as the
 * same pair for the identical reason — a refund without the card returned is a free spend, and a
 * card returned without a refund is a double charge.
 *
 * THROWS a `RangeError` naming the reason when `buff` is not revocable or is not in
 * `activatedThisTrick`, exactly as `activateBuff` throws on a refused activation, so a caller that
 * skipped `isRevocableBuff` cannot commit an incoherent pool/pile pair. `handleRemoveBuff` is that
 * caller's guard and returns unchanged state rather than letting this throw inside a dispatch.
 *
 * Only a card actually REMOVED at activation comes back: membership of `spentThisTrick` is the
 * test, so a card that never left the pile is not added a second time. It is APPENDED rather than
 * reinserted at its old index — `plan.md` Part 1, Assumptions made #3.
 */
export function deactivateFromPile(
  state: BuffActivationState,
  buffs: readonly Buff[],
  buff: Buff,
): BuffActivationResult {
  if (!isRevocableBuff(buff)) {
    throw new RangeError(`Cannot take buff ${buff.id} back off — a ${buff.kind} is not revocable`)
  }
  if (!state.activatedThisTrick.includes(buff.id)) {
    throw new RangeError(`Cannot take buff ${buff.id} back off — it is not riding this trick`)
  }
  const spent = state.spentThisTrick.some((b) => b.id === buff.id)
  return {
    activation: {
      apPool: Math.min(state.capacity, refundAp(state.apPool, apCostOf(buff))),
      capacity: state.capacity,
      activatedThisTrick: state.activatedThisTrick.filter((id) => id !== buff.id),
      spentThisTrick: state.spentThisTrick.filter((b) => b.id !== buff.id),
    },
    buffs: spent ? [...buffs, buff] : buffs,
  }
}
```

Add `refundAp` to this file's `./actionPoints` import and `isConditionFamily` to its `./buffCosts` import.

- [x] **Step 4: Re-export and verify**

Add `isRevocableBuff` and `deactivateFromPile` to the `buffActivation.ts` export block in `src/hunt/index.ts`.

Run: `npx vitest run src/hunt/__tests__/buffActivation.deactivate.test.ts src/hunt/__tests__/buffActivation.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed across both files; `tsc -b` exits 0.

---

## Phase 2 — The projection keeps its branch attribution

`branchFor` already computes each branch's indeterminate set and then merges it away, so a consumer cannot tell which branch a "may fire" buff belongs to — which makes AC4's "the higher of its two branches" uncomputable without re-deriving the rules in the view. One additive field fixes that. The phase is a safe boundary because the field is required and there is exactly one construction site, in the file being edited.

### Task 3: Add `mayFire` to `BuffBranchProjection` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/buffProjection.ts:67-78` (the interface) and `:145-172` (`branchFor`)
- Modify: `.docs/implementation/war-council/buff-projection.md` — the "`indeterminate` falls out of a diff" section gains the branch-attributed sibling
- Test: `src/warCouncil/__tests__/buffProjection.test.ts`

- [x] **Step 1: Write the failing assertions**

Add a `mayFire` block to `src/warCouncil/__tests__/buffProjection.test.ts` asserting:

- On a **lead** (`skullTrick: null`) with a Sidestep riding, `lost.mayFire` contains that Sidestep and `won.mayFire` is empty — the branch attribution the projection-level `indeterminate` cannot express.
- On a **follow** (`skullTrick: false` or `true`), both branches' `mayFire` are empty and every fired buff is certain.
- `projection.indeterminate` still equals the deduped union of `won.mayFire` and `lost.mayFire`, so the existing field's contract is unchanged.
- `fired` and `mayFire` are disjoint on each branch.

- [x] **Step 2: Run and watch it fail**

Run: `npx vitest run src/warCouncil/__tests__/buffProjection.test.ts -t "mayFire"`
Expected: fails — `mayFire` is `undefined` / a TypeScript error on the missing property.

- [x] **Step 3: Add the field to the interface**

```ts
export interface BuffBranchProjection {
  readonly playerWon: boolean
  readonly fired: readonly Buff[]
  /** DLR-153 — buffs that fire on THIS branch under some still-possible skull reading but not
   *  all. Deduped by `BuffId`, and disjoint from `fired` by construction. The projection-level
   *  `indeterminate` remains the deduped UNION of both branches' sets and is unchanged; this is
   *  the same value `branchFor` already computed and previously discarded, kept so a consumer can
   *  count one branch's ceiling without re-deriving which family reads the skull. Empty whenever
   *  `skullKnown` is true. */
  readonly mayFire: readonly Buff[]
  readonly outcomes: readonly BuffBranchOutcome[]
}
```

- [x] **Step 4: Stop discarding the value in `branchFor`**

In `branchFor`, hoist the existing `const indeterminate = …` above the `return` (it already is), then set `mayFire: dedupeById(indeterminate)` inside the `branch` literal. Keep the function's own `indeterminate` return field as-is so `projectBuffBranches`'s union is unchanged.

```ts
  const deduped = dedupeById(indeterminate)
  return {
    branch: {
      playerWon,
      fired: certain,
      mayFire: deduped,
      outcomes: readings.map((skullTrick) => {
        // …unchanged…
      }),
    },
    indeterminate: deduped,
  }
```

- [x] **Step 5: Update the implementation doc and verify**

In `.docs/implementation/war-council/buff-projection.md`, extend the "`indeterminate` falls out of a diff, not out of a name" section with one paragraph: the same diff is now surfaced per branch as `mayFire`, `indeterminate` stays the deduped union, and the split is still a set difference so no family is named.

Run: `npx vitest run src/warCouncil/__tests__/buffProjection.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

---

## Phase 3 — The pure ride model

Everything with a testable invariant, in three DOM-free modules under `src/app/warCouncil/`, tested with no renderer. Nothing here imports React and nothing here contains a `switch` over `BuffConditionKind` — every firing question goes to `projectBuffBranches`. The phase ends type-checking with three new modules that nothing imports yet, which is a clean stopping point.

### Task 4: Author the copy in `buffRideLabels.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/buffRideLabels.ts`
- Test: `src/app/warCouncil/__tests__/buffRideLabels.test.ts`

- [x] **Step 1: Write the module**

Follow `buffLabels.ts`'s shape — frozen `Record` tables plus small functions, reusing `buffName`, `buffConditionSentence` and `buffPayoff` from it rather than authoring second copies. Export exactly the signatures in `plan.md` Part 2 → *Data shapes* → `buffRideLabels.ts`. The two sentences that are load-bearing and must be written as specified:

```ts
/** AC9. The zero case is stated explicitly and NOT as "0 cards" — a buff that reaches nothing is
 *  dead GLOBALLY, not dead on one card, and that is the real dead case. */
export function buffReachText(reach: number): string {
  if (reach === 0) return 'no card in your hand can fire it'
  return `lights up ${reach} of your ${reach === 1 ? 'card' : 'cards'}`
}

/** AC10. Says the buff comes off the TRICK and names what else goes dark, so nobody reads it as
 *  unloading a single card. */
export function removeBuffLabel(buff: Buff, reach: number): string {
  const tail = reach === 0 ? 'nothing goes dark' : `${reach} ${reach === 1 ? 'card goes' : 'cards go'} dark`
  return `Take ${buffName(buff)} off the trick — ${tail}`
}
```

AC12's dead row is two clauses, and both are required — the strike says "not here", the second clause stops it reading as "wasted":

```ts
/** "Needs Bells — this card is Keys." */
export function deadRowReasonText(buff: Buff, card: Card): string
/** " It is lighting your 2 Bells cards instead." — or the zero-reach sentence when reach is 0. */
export function deadRowElsewhereText(buff: Buff, reach: number): string
```

- [x] **Step 2: Write the spec**

Create `src/app/warCouncil/__tests__/buffRideLabels.test.ts` asserting: singular vs plural at reach 1 and 3; the exact zero-reach sentence; that `removeBuffLabel` contains the word `trick` and never the word `card` in the singular-unload sense; that `deadRowElsewhereText` falls back to the zero-reach sentence at reach 0; and that `deadRowReasonText` names both the buff's target suit and the card's own suit.

- [x] **Step 3: Run it**

Run: `npx vitest run src/app/warCouncil/__tests__/buffRideLabels.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 5: Build `buffRideModel.ts` — input assembly, lights, reach ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/buffRideModel.ts`
- Test: `src/app/warCouncil/__tests__/buffRideModel.test.ts`

- [x] **Step 1: Write the failing spec against the acceptance criteria**

Create `src/app/warCouncil/__tests__/buffRideModel.test.ts`, building state with `createRoundUiState` over `makeRound` from `./roundFixture` the way `cardDamage.test.ts` does. Assert:

- **AC2** — with a Bells Taker riding, `lightsForHand` has an entry for each legal Bells card and for no other card.
- **AC2** — with a suitless Sidestep riding, every legal card has an entry.
- **AC3** — a card that is in `hand` and would match the buff perfectly but is absent from `legal` has **no** entry, and `ridingRowsFor` reports a reach that excludes it.
- **AC4** — a card reached by a Taker (won branch) and a Feeder (lost branch) on the same suit has `count === 1`, not 2: the branches are a max, never a sum.
- **AC4** — a card reached by two buffs on the SAME branch has `count === 2`.
- **Assumption 4** — with the player leading and the candidate itself skulled, `skullReadingFor` returns `true`, not `null`; with the player leading an unskulled card it returns `null`; with the Quarry's card already on the table it returns the visible-trick reading.
- **Assumption 5** — on a lead with a Sidestep riding, the reached cards have `estimate === true`.
- **AC9** — `ridingRowsFor` returns one row per id in `activatedThisTrick`, with `revocable` true for the condition families and false for a Cheat.
- **AC9** — a buff whose suit is absent from the legal hand gets `reach === 0` and still appears in the rows.
- **AC13** — `bestLitCard` returns the highest-`count` legal card, and resolves a tie by hand order rather than by map iteration order.
- `rideInputFor` returns `firedThisHand`, `accrual`, `coins`, `playerHealth`, `tricksWithoutHit` and `applyDamagePressed` **identical** to `buffHandInputFor(state)`'s, so the preview and the commit cannot disagree.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/app/warCouncil/__tests__/buffRideModel.test.ts`
Expected: fails on the missing module.

- [x] **Step 3: Implement the module**

Export exactly the signatures in `plan.md` Part 2 → *Data shapes* → `buffRideModel.ts`. Constraints the code must obey, each stated in a docblock at the point it applies:

- `rideInputFor` reuses `buffHandInputFor(state)` for seven of its fields and adds only `finalTrick` (`state.round.tricksPlayed + 1 === HAND_SIZE`, derived exactly as `cardDamage.ts` derives it), `playerHit: false` and `bankAfterTrick: state.round.bank`. The last two are held constant across branches, which is **inert only because Hoarder and Unbloodied are unconstructible** — cite `BuffProjectionFacts`'s own docblock rather than restating the reason.
- `skullReadingFor(state, candidate)` returns `true` when `containsCard(state.round.skulledCards, candidate)`; otherwise `trickIsSkulled(state.round.skulledCards, [...state.round.currentTrick, { side: PlayerSide.Player, card: candidate }])` when `state.round.currentTrick.length === 1`; otherwise `null`. `null` means **not knowable**, never "no skull".
- `lightsForHand` walks `legal`, calls `projectBuffBranches` once per card with that card's own reading, and keys the map by `cardKey(card)`. `count` is `Math.max(won.fired.length + won.mayFire.length, lost.fired.length + lost.mayFire.length)`; `estimate` is `won.mayFire.length + lost.mayFire.length > 0`. A card whose `count` is 0 is **omitted** — an absent key means dark.
- `ridingRowsFor` counts reach off that same map (a buff appears in a card's `won.fired`, `lost.fired`, `won.mayFire` or `lost.mayFire`), so an illegal card can never inflate it. It resolves each id in `activatedThisTrick` through the `offeredBuffs(state) ∪ state.buffActivation.spentThisTrick` union — the **same** union `buffHandInputFor` and `firedOncePerHandIds` already use, because a card consumed on activation is no longer offered and looking in the pile alone would silently drop it.
- **No `switch` over `BuffConditionKind` and no accrual arithmetic anywhere in this file.**

- [x] **Step 4: Verify and measure**

Run: `npx vitest run src/app/warCouncil/__tests__/buffRideModel.test.ts; npm run typecheck; (Get-Content src\app\warCouncil\buffRideModel.ts).Count`
Expected: Vitest reports 0 failed; `tsc -b` exits 0; the line count is under 400.

### Task 6: Build `buffBreakdownModel.ts` — one card's rows ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/buffBreakdownModel.ts`
- Test: `src/app/warCouncil/__tests__/buffBreakdownModel.test.ts`

- [x] **Step 1: Write the failing spec**

Create `src/app/warCouncil/__tests__/buffBreakdownModel.test.ts` asserting:

- **AC11** — `totals` has exactly two entries, in branch order, and **no field on `BreakdownTotals` marks either as preferred**; the type carries no such flag and the spec asserts its absence by shape.
- **AC11** — the Overlap Bonus is `firedCount - 1` on the branch it belongs to, and `overlapText` is `null` when that is 0 (`game-ux` forbids a row that reports nothing).
- **AC11** — every `BreakdownConditionRow` carries a non-empty `buffNameText`, and a Blade Taker and a Momentum Taker on the same suit produce two rows with the **same** `conditionText` and **different** `buffNameText`.
- **AC12** — a riding buff that cannot fire on the focused card appears in `dead`, with `reasonText` naming both suits and `elsewhereText` naming its reach elsewhere; at reach 0 `elsewhereText` is the zero-reach sentence instead.
- **DLR-150** — on a branch whose outcome is a Clean Loss, a Feeder's reward shows as carried (`carryText` non-null); on a Dodge it does not. Read off `BuffBranchOutcome.accrual`, never recomputed.
- `breakdownFor` returns `null` for a card with no entry in the light map.
- The `dead` array is first in the returned shape, so DOM order matches the bottom-up reading (furthest from the card renders topmost).

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/app/warCouncil/__tests__/buffBreakdownModel.test.ts`
Expected: fails on the missing module.

- [x] **Step 3: Implement it**

Export exactly the signatures in `plan.md` Part 2 → *Data shapes* → `buffBreakdownModel.ts`. It reads the `CardBuffLight.projection` the map already holds — **it never calls `projectBuffBranches` a second time**. Damage and multiplier deltas are `outcome.accrual` minus `state.buffHand.accrual`, which is the subtraction DLR-152's doc explicitly leaves to the consumer; nothing else is computed. Every sentence comes from `buffRideLabels.ts`.

- [x] **Step 4: Verify and measure**

Run: `npx vitest run src/app/warCouncil/__tests__/buffBreakdownModel.test.ts; npm run typecheck; (Get-Content src\app\warCouncil\buffBreakdownModel.ts).Count`
Expected: Vitest reports 0 failed; `tsc -b` exits 0; under 400 lines.

---

## Phase 4 — The reducer transition

One action, one handler, one `case`. The action kind, its union member, the handler and the reducer arm all land in **one task** because `roundReducer.ts`'s switch is exhaustive over `RoundUiAction` — splitting them leaves a phase boundary where `tsc` fails on a missing arm.

### Task 7: `RemoveBuff` — the action, the handler, the reducer arm ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/roundUiState.ts:176-206`
- Modify: `src/app/warCouncil/buffHandlers.ts`
- Modify: `src/app/warCouncil/roundReducer.ts:96-118`
- Test: `src/app/warCouncil/__tests__/roundReducer.removeBuff.test.ts`

- [x] **Step 1: Write the failing spec**

Create `src/app/warCouncil/__tests__/roundReducer.removeBuff.test.ts`, mirroring `roundReducer.cancelBuffPoise.test.ts`'s shape. Assert:

- **AC10** — activating a Taker then dispatching `RemoveBuff` puts the card back in `state.buffs`, clears the id from `activatedThisTrick` and `spentThisTrick`, and restores `apPool`.
- Dispatching `RemoveBuff` for a **Cheat** returns the state object **itself** (`toBe`, not `toEqual`), so an idle removal cannot even cause a re-render, and `cheatTricksRemaining` is untouched.
- Dispatching `RemoveBuff` for an id that is not riding returns the state itself.
- **Nothing throws** on either refused path — `deactivateFromPile`'s `RangeError` is unreachable through the reducer.
- `RemoveBuff` is distinct from `CancelBuffPoise`: with a poise open and a different buff riding, removing the riding one leaves the poise intact.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.removeBuff.test.ts`
Expected: fails on the missing action kind.

- [x] **Step 3: Add the action kind and its union member**

In `src/app/warCouncil/roundUiState.ts`, after `CancelBuffPoise`:

```ts
  /** DLR-153 AC10 — take an activated CONDITION buff back off the trick. Distinct from
   *  `CancelBuffPoise`, which drops an UNSPENT poise: this reverses a COMMITTED activation, which
   *  the ruleset had no way to do before this ticket (`the-hunt.md`, "no way to un-activate"). */
  RemoveBuff: 'removeBuff',
```

and to `RoundUiAction`:

```ts
  | { readonly kind: typeof RoundUiActionKind.RemoveBuff; readonly id: BuffId }
```

- [x] **Step 4: Add `handleRemoveBuff` to `buffHandlers.ts`**

```ts
/**
 * AC10. Asks `isRevocableBuff` and membership FIRST and returns `state` itself on a no —
 * `deactivateFromPile` throws by design, and a throw inside a reducer during an event handler
 * unmounts the tree, which is the discipline `handleTapBuff` already sets. Returning the state
 * object itself rather than a copy means an idle removal cannot cause a re-render, mirroring
 * `handleCancelBuffPoise`.
 *
 * Touches the pool and the pile ONLY. The hand re-lights from the new state on the next render,
 * so nothing here knows anything about which cards were lit — that stays `buffRideModel.ts`'s.
 */
export function handleRemoveBuff(state: RoundUiState, id: BuffId): RoundUiState {
  if (!state.buffActivation.activatedThisTrick.includes(id)) return state
  const buff = [...offeredBuffs(state), ...state.buffActivation.spentThisTrick].find(
    (b) => b.id === id,
  )
  if (buff === undefined || !isRevocableBuff(buff)) return state
  const { activation, buffs } = deactivateFromPile(state.buffActivation, state.buffs, buff)
  return { ...state, buffs, buffActivation: activation }
}
```

- [x] **Step 5: Add the thirteenth reducer arm and verify**

In `src/app/warCouncil/roundReducer.ts`, beside `case RoundUiActionKind.TapBuff`:

```ts
    case RoundUiActionKind.RemoveBuff:
      return handleRemoveBuff(state, action.id)
```

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.removeBuff.test.ts src/app/warCouncil/__tests__/buffHandlers.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed across both files; `tsc -b` exits 0 (the exhaustive switch proves the arm is wired).

---

## Phase 5 — The lit hand

The card's three carriers and the lift ladder. CSS first, because the lift-token change also moves an existing assertion in `handRowCss.test.ts` and doing it alone keeps that diff readable; then the halo component, then the two prop changes that light it. The phase ends with the hand lit and every existing hand and card spec still green.

### Task 8: The lift ladder and the buff-ride stylesheet ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/warCouncilBuffRide.css`
- Modify: `src/app/warCouncil/warCouncil.css` (the `:root` block near line 74)
- Modify: `src/app/warCouncil/warCouncilCards.css:267-300`
- Modify: `src/app/warCouncil/__tests__/handRowCss.test.ts`
- Test: `src/app/warCouncil/__tests__/buffRideCss.test.ts`

- [x] **Step 1: Add the tokens to `:root` in `warCouncil.css`**

```css
  /* DLR-153 AC8 — ONE typed lift, and a ladder derived from it. `--wc-lift-rest` is NEVER set
     independently: the hand rests at half the hover lift so the cards read as the subject of the
     screen the moment it opens, and hover still has somewhere to go. Retune `--wc-lift-hover` and
     rest follows. Both figures are TRANSCRIBED from the literals this replaces, not new choices. */
  --wc-lift-hover: -9%;
  --wc-lift-rest: calc(var(--wc-lift-hover) / 2);
  --wc-lift-armed: -20%;

  /* DLR-153 — the lit card. PLACEHOLDER hue: red was asked for and `--wc-alarm` already means
     damage; `--wc-brass` already means yours-and-selected. update-log.md OPEN #9, the developer's. */
  --wc-buff-halo: var(--wc-alarm);
  /* The lap-time slope's intercept. PLACEHOLDER — the developer's to retune freely. */
  --wc-buff-lap-base: 3.2s;
  /* NOT a tuning value. A bright cell passing a point more than ~3 times a second is a flash
     hazard; at a 0.9s lap it passes once. Do not lower it. */
  --wc-buff-lap-floor: 0.9s;
```

- [x] **Step 2: Point the three lift rules at the tokens**

In `warCouncilCards.css`, replace the three literals — `.wc-fan .wc-card { transform: translateY(0%) }` becomes `translateY(var(--wc-lift-rest))`, the `@media (hover: hover)` rule's `-9%` becomes `var(--wc-lift-hover)`, and the armed rule's `-20%` becomes `var(--wc-lift-armed)`. Leave the `:active` `-5%` and the armed `scale(1.05)` alone — neither is on the ladder AC8 names.

- [x] **Step 3: Follow the assertions into the tokens in `handRowCss.test.ts`**

That spec reads the stylesheet text and asserts the literal percentages. Update it to assert the token references in the three rules, **and add the ladder claim**: parse `--wc-lift-hover` and `--wc-lift-armed` out of `warCouncil.css`, confirm `--wc-lift-rest` is literally `calc(var(--wc-lift-hover) / 2)`, and assert `|rest| < |hover| < |armed|` is monotonic. State in a comment that this is a **source** assertion and that AC8's real check — the **resolved** transform, since `getPropertyValue('--wc-lift-rest')` returns the literal `calc(…)` string and `parseFloat` gives `NaN` — is QA's in a browser.

- [x] **Step 4: Write `warCouncilBuffRide.css`**

Re-author from the mockup's behaviour, not its source. The rules that are constraints rather than taste:

- The halo is **four stacked wide, soft, low-opacity SVG strokes plus a `box-shadow`**. **No `filter: blur()` and no `mix-blend-mode` anywhere in this file** — a per-card filter and a per-card compositing layer each stalled Chrome's rasteriser badly enough on this epic to time out screenshots. Comment both at the point of use, because both get "helpfully" reintroduced.
- Every halo stroke width and every halo opacity **starts non-zero and grows** with the count. A stroke scaled purely by the count renders ~3.6px at 12% opacity for one buff, which reads as nothing.
- The travelling cell is a `stroke-dashoffset` animation on the rounded `<rect>`, whose lap time is `max(var(--wc-buff-lap-floor), calc(var(--wc-buff-lap-base) - <n> * 0.5s))`. **The `max()` is what makes the floor un-defeatable by any count** — do not compute the lap time in TypeScript.
- `@media (prefers-reduced-motion: reduce)` sets `animation: none` and a solid dash pattern, so the cell becomes a **continuous rail at full brightness**. The halo and the badge are untouched by that block, so all three carriers survive.
- The badge is ink on parchment at the card's bottom-right — top-right is the skull's, top-left the corner index, bottom-left the primed mark.
- The riding list's rows and the breakdown's rows are `min-height: 44px`. **Expand the row, not just the control.** A 44px pseudo-element expander on a 33px row overhangs ~5px top and bottom, which both inflates a scrollable ancestor's `scrollHeight` (a one-row panel grew a scrollbar) and makes stacked rows' controls steal each other's taps.
- The breakdown's width is capped against the **measured stage box**, never `min(30rem, 100%)` — `100%` resolves against the parent, which here is the full-width hand and includes the rail, and `overflow: hidden` on the shell turns the resulting overflow into a silent clip rather than a scrollbar.
- The breakdown's clearance over the lifted card is **measured**, not derived from `--wc-lift-armed`: the panel is positioned against a padded container whose height includes its own padding, so a token-derived offset lands partway up the card. That happened.
- `border-top: none` is a **shorthand** — never use it to remove a rule between groups; set `border-top-style: none` or redeclare the whole border, or a later style-only rule resurrects a 3px `currentColor` bar.
- The two branch groups differ in **form** — one solid rule, one dotted — not only in hue: a green-grey and a purple-grey are identical in greyscale, which is the thing the greyscale screenshot caught last time.

- [x] **Step 5: Write the source-level CSS spec**

Create `src/app/warCouncil/__tests__/buffRideCss.test.ts`, following `handRowCss.test.ts`'s `readFileSync` + `ruleBody` pattern (a `node`-project spec, so it needs the same `/// <reference types="node" />` directive `contrast.test.ts` carries). Assert:

- **AC7** — the lap-time declaration contains `max(` and `var(--wc-buff-lap-floor)`, and `--wc-buff-lap-floor` is `0.9s`.
- **AC6** — a `@media (prefers-reduced-motion: reduce)` block exists, sets `animation` to `none` on the cell, and mentions **neither** the badge nor the halo selector.
- **AC5** — the badge rule exists and sets no `color` that resolves through the halo token, so it cannot go invisible when the hue is retuned.
- The file contains **no** `filter:` blur and **no** `mix-blend-mode`.
- Every row selector that carries an interactive control declares `min-height: 44px`.
- The two branch-group rules differ in `border-*-style`, not only in colour.

- [x] **Step 6: Verify**

Run: `npx vitest run src/app/warCouncil/__tests__/buffRideCss.test.ts src/app/warCouncil/__tests__/handRowCss.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed across both files; `tsc -b` exits 0.

### Task 9: `CardBuffHalo.tsx` — the SVG halo and the travelling cell ✓

- Skill: `react-frontend`, `game-ux`

**Files:**

- Create: `src/app/warCouncil/CardBuffHalo.tsx`

- [x] **Step 1: Write the component**

```tsx
interface CardBuffHaloProps {
  /** ≥1 — how many riding buffs could fire on this card, the higher of its two branches. Drives
   *  the four stroke widths and opacities AND the travelling cell's lap time, both through CSS
   *  custom properties set here rather than through inline geometry, so retuning is a stylesheet
   *  edit. Saturates at five, above which the halo stops gaining. */
  readonly count: number
}
```

It renders one `<svg aria-hidden="true">` containing four `<rect>` halo strokes and one `<rect>` travelling cell, each with `pathLength="1000"` and `vector-effect: non-scaling-stroke` so the stroke follows the card's real border radius and holds its weight at every card size. **Not a rotating `conic-gradient`** — that needs `@property` to animate and repaints the whole box every frame. The count reaches CSS as a custom property on the `<svg>`'s `style`; **no lap time, opacity or width is computed in TypeScript**, so the 0.9s floor cannot be defeated from here.

It is `aria-hidden` because the numeral badge is the accessible carrier — the halo would otherwise announce the same fact twice.

- [x] **Step 2: Verify it compiles**

Run: `npm run typecheck; (Get-Content src\app\warCouncil\CardBuffHalo.tsx).Count`
Expected: `tsc -b` exits 0; under 400 lines.

### Task 10: `PlayingCard.tsx` — the two optional props and the badge ✓

- Skill: `react-frontend`, `game-ux`

**Files:**

- Modify: `src/app/warCouncil/PlayingCard.tsx`
- Test: `src/app/warCouncil/__tests__/PlayingCard.test.tsx`

- [x] **Step 1: Write the failing assertions**

Append to `src/app/warCouncil/__tests__/PlayingCard.test.tsx`:

- With no `buffCount`, the card renders **no** badge and **no** halo — the 25 existing sites in this file and the 17 in `CardAbilityTip.test.tsx` prove that by continuing to pass.
- With `buffCount={2}`, the card's accessible name or description carries the badge text, and the visible badge shows `2`.
- With `buffCount={2} buffEstimate`, the badge carries the `~` form and the estimate class.
- **AC5** — the badge is a real text node, not a background image or a pseudo-element, so it survives a greyscale screenshot. Assert by querying its text content.

- [x] **Step 2: Run and watch it fail**

Run: `npx vitest run src/app/warCouncil/__tests__/PlayingCard.test.tsx -t "buff"`
Expected: fails on the missing props.

- [x] **Step 3: Add the props and the render**

Add `buffCount?: number` and `buffEstimate?: boolean` to `PlayingCardProps` with the docblocks from `plan.md` Part 2 → *Data shapes*, both **optional** for the reason `primed` / `discardSelected` / `describedBy` are optional. When `buffCount` is defined and `> 0`, add `wc-card-buff` to the className list, render `<CardBuffHalo count={buffCount} />` before `<CardFace />`, and render the badge as a `<span className="wc-card-buff-badge">` carrying the numeral plus a `wc-sr-only` sentence from `buffBadgeText`. Import `./warCouncilBuffRide.css` here or in `WarCouncilRound.tsx` alongside the other sheets — pick one and say which in the docblock.

- [x] **Step 4: Verify and measure**

Run: `npx vitest run src/app/warCouncil/__tests__/PlayingCard.test.tsx src/app/warCouncil/__tests__/CardAbilityTip.test.tsx; npm run typecheck; (Get-Content src\app\warCouncil\PlayingCard.tsx).Count`
Expected: Vitest reports 0 failed across both files; `tsc -b` exits 0; under 400 lines.

### Task 11: `HandFan.tsx` — pass the light through ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/HandFan.tsx`
- Test: `src/app/warCouncil/__tests__/HandFan.test.tsx:23-43`

- [x] **Step 1: Write the failing assertions**

In `src/app/warCouncil/__tests__/HandFan.test.tsx`, add `buffLightForCard: () => null` to the `renderFan` helper's defaults, then assert:

- **AC2** — with `buffLightForCard` returning a light for exactly the Bells cards, only those cards carry the badge.
- **AC3** — an illegal card is never passed a light: the fan calls `buffLightForCard` for it, but `HandFan` does not render a badge on a card it marks `illegal`. (Assert by supplying a light for every card and checking the illegal one is still dark.)
- The existing damage-strip and roving-tabindex assertions still pass unchanged.

- [x] **Step 2: Run and watch it fail**

Run: `npx vitest run src/app/warCouncil/__tests__/HandFan.test.tsx`
Expected: fails on the missing prop.

- [x] **Step 3: Add the prop and wire it**

Add `buffLightForCard` to `HandFanProps` with the docblock from `plan.md` Part 2 → *Data shapes*, **required and deliberately not defaulted**, for the reason `damageForCard`'s own docblock gives. In the `hand.map`, read the light beside `damageForCard`'s call and pass `buffCount`/`buffEstimate` down — gated on the same `illegal` expression the card already computes, so an illegal card can never light.

- [x] **Step 4: Verify and measure**

Run: `npx vitest run src/app/warCouncil/__tests__/HandFan.test.tsx; npm run typecheck; (Get-Content src\app\warCouncil\HandFan.tsx).Count`
Expected: Vitest reports 0 failed; `tsc -b` exits 0; under 400 lines. `WarCouncilRound.tsx` will not compile until Task 15 — that is expected and is why Phase 5's boundary is Task 11 plus Task 15's wiring landing in Phase 6.

**Implementer note:** `WarCouncilRound.tsx` was given the temporary `buffLightForCard={() => null}` call-site prop in this task (see Phase note below), so the whole tree — including `WarCouncilRound.tsx` — typechecks cleanly at the end of this phase rather than only at Task 15.

**Phase note:** adding a required prop to `HandFan` breaks `WarCouncilRound.tsx` until Task 15 supplies it. To keep this phase's boundary clean, add the prop to the `<HandFan>` call site in `WarCouncilRound.tsx` in **this** task with a temporary `() => null`, and replace it with the real map in Task 15. Say so in a `// DLR-153 Task 15 replaces this` comment so the placeholder cannot survive the contract.

---

## Phase 6 — The riding list and the breakdown

The two panels and the hook that keeps one of them reachable. Everything they render is a model value built in Phase 3; these three components decide nothing. The phase ends with the surface complete and wired.

### Task 12: `BuffRidingList.tsx` ✓

- Skill: `react-frontend`, `game-ux`

**Files:**

- Create: `src/app/warCouncil/BuffRidingList.tsx`
- Test: `src/app/warCouncil/__tests__/BuffRidingList.test.tsx`

- [x] **Step 1: Write the failing spec**

Create `src/app/warCouncil/__tests__/BuffRidingList.test.tsx`, querying by role and label. Assert:

- **AC9** — one row per `RidingBuffRow`, each naming the buff and carrying its reach sentence.
- **AC9** — a row with `reach: 0` renders the explicit "no card in your hand can fire it" text, not "0 cards".
- **AC9/AC10** — a `revocable` row has a button whose accessible name says the buff comes off the **trick** and names how many cards go dark; a non-revocable row has **no** such button and instead states why.
- **`game-ux`** — with nothing riding, the component renders **nothing at all**: no empty frame, no placeholder row, no "nothing riding" text.
- Clicking a remove control calls `onRemove` once with that buff's id.

- [x] **Step 2: Run and watch it fail**

Run: `npx vitest run src/app/warCouncil/__tests__/BuffRidingList.test.tsx`
Expected: fails on the missing module.

- [x] **Step 3: Implement it**

Props: `{ rows: readonly RidingBuffRow[]; onRemove: (id: BuffId) => void }`. A `role="group"` with `aria-label={RIDING_LIST_LABEL}`. Every sentence comes from `buffRideLabels.ts`. Returns `null` when `rows` is empty. Each remove control is a genuine 44×44 `<button>` **with no pseudo-element expander** — side by side, two expanders overlap across the gap between rows and quietly steal each other's taps.

- [x] **Step 4: Verify and measure**

Run: `npx vitest run src/app/warCouncil/__tests__/BuffRidingList.test.tsx; npm run typecheck; (Get-Content src\app\warCouncil\BuffRidingList.tsx).Count`
Expected: Vitest reports 0 failed; `tsc -b` exits 0; under 400 lines.

### Task 13: `useBuffBreakdownTarget.ts` — the hover bridge ✓

- Skill: `react-frontend`, `game-ux`

**Files:**

- Create: `src/app/warCouncil/useBuffBreakdownTarget.ts`
- Test: `src/app/warCouncil/__tests__/useBuffBreakdownTarget.test.tsx`

- [x] **Step 1: Write the failing spec**

Create `src/app/warCouncil/__tests__/useBuffBreakdownTarget.test.tsx`, driving the hook through a tiny host component with `@testing-library/react` and `vi.useFakeTimers()`. Assert:

- **AC13** — `target` equals `fallback` immediately on mount, with no interaction at all.
- **AC13** — `onEnterCard(other)` switches the target; `onLeaveCard()` then advancing past the delay returns it to `fallback` rather than to `null`.
- **AC14** — `onLeaveCard()` followed by `onEnterPanel()` **before** the delay elapses cancels the close; advancing well past the delay leaves the target unchanged.
- **AC14/AC18** — the hook exposes no blur handler at all, so tabbing into the panel cannot close it. Assert by shape.
- **AC13** — `onEscape()` closes to `null` even while `fallback` is non-null, and a subsequent `fallback` change reopens it.
- **AC13** — `fallback` going `null` (an empty trick) closes it.
- **StrictMode** — unmounting with a close pending and then advancing the timers changes nothing and logs no warning; the timer was cleared in cleanup.

- [x] **Step 2: Run and watch it fail**

Run: `npx vitest run src/app/warCouncil/__tests__/useBuffBreakdownTarget.test.tsx`
Expected: fails on the missing module.

- [x] **Step 3: Implement it**

Export `useBuffBreakdownTarget(fallback: Card | null): BreakdownTarget` per `plan.md` Part 2 → *Data shapes*. One `useState` for the explicit target (`undefined` = follow `fallback`, `null` = dismissed by `Escape`), one `useRef` for the pending `setTimeout` id, and one `useEffect` whose **only** job is to clear that timer on unmount. Every cancel path clears it too. **No document-level listener** — `Escape` arrives through the hand's existing `useRovingTabIndex` keydown handler and the panel's own. The close delay is read from a named constant with a `PLACEHOLDER` comment, not typed inline.

- [x] **Step 4: Verify and measure**

Run: `npx vitest run src/app/warCouncil/__tests__/useBuffBreakdownTarget.test.tsx; npm run typecheck; (Get-Content src\app\warCouncil\useBuffBreakdownTarget.ts).Count`
Expected: Vitest reports 0 failed; `tsc -b` exits 0; under 400 lines.

### Task 14: `CardBuffBreakdown.tsx` ✓

- Skill: `react-frontend`, `game-ux`

**Files:**

- Create: `src/app/warCouncil/CardBuffBreakdown.tsx`
- Test: `src/app/warCouncil/__tests__/CardBuffBreakdown.test.tsx`

- [x] **Step 1: Write the failing spec**

Create `src/app/warCouncil/__tests__/CardBuffBreakdown.test.tsx`, querying by role and label. Assert:

- **AC11** — both totals rows render, and **neither carries an emphasis class, `aria-current`, or any other marker** distinguishing it from the other. Assert the absence.
- **AC11** — the Overlap Bonus is its own row immediately above the totals; when it is 0 **no such row exists**.
- **AC11** — each condition row shows its buff's name as well as its condition sentence.
- **AC12** — dead rows render struck through (assert the class *and* that both clauses of the text are present), and appear **before** the branch groups in DOM order.
- **AC13** — the panel renders fully expanded with no expand control and no collapsed state.
- **AC18** — every control inside the panel is reachable by `Tab` and the panel does not close on blur: fire `blur` on a control and assert the panel is still rendered.
- **`game-ux`** — with a `null` breakdown the component renders nothing.

- [x] **Step 2: Run and watch it fail**

Run: `npx vitest run src/app/warCouncil/__tests__/CardBuffBreakdown.test.tsx`
Expected: fails on the missing module.

- [x] **Step 3: Implement it**

Props: `{ breakdown: CardBuffBreakdown | null; onEnter: () => void; onLeave: () => void; onEscape: () => void }`. Renders, in DOM order and therefore top to bottom: the header, the `dead` rows, the branch groups, the overlap row, then the two totals rows — which is the bottom-up reading, nearest the card last. Layout per `.claude/contract/DLR-147-full-ui-pass/mockup-buff-loading.html`'s readout. Returns `null` on a `null` breakdown. `onMouseEnter`/`onMouseLeave` wire the hover bridge; `onKeyDown` handles `Escape`. **No blur handler.**

- [x] **Step 4: Verify and measure**

Run: `npx vitest run src/app/warCouncil/__tests__/CardBuffBreakdown.test.tsx; npm run typecheck; (Get-Content src\app\warCouncil\CardBuffBreakdown.tsx).Count`
Expected: Vitest reports 0 failed; `tsc -b` exits 0; under 400 lines.

### Task 15: Wire it — `buffRideProps.ts` and `WarCouncilRound.tsx` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/buffRideProps.ts`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:305-330`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.buffRide.test.tsx`

- [x] **Step 1: Write the failing integration spec**

Create `src/app/warCouncil/__tests__/WarCouncilRound.buffRide.test.tsx`, following `WarCouncilRound.loadoutReopen.test.tsx`'s shape. Assert end to end:

- **AC1** — opening the buff panel and activating a Taker requires **no** card selection first, and no refusal about choosing a card appears anywhere in the tree.
- **AC2** — after activation, exactly the legal cards of that suit carry a badge.
- **AC9/AC13** — the riding list appears with the reach sentence, and the breakdown appears **without any hover or click**, targeting the highest-count card.
- **AC10** — clicking the row's remove control returns the card to the gallery, clears every badge from the hand, and announces what went dark through the hand's existing `aria-live` region.
- **AC13** — the breakdown survives the pointer leaving the hand row.

- [x] **Step 2: Run and watch it fail**

Run: `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.buffRide.test.tsx`
Expected: fails.

- [x] **Step 3: Build `buffRideProps.ts`**

Export `buffRideView({ ui, dispatch, legal, displayHand })` returning `BuffRideView` per `plan.md` Part 2 → *Data shapes*. It calls `lightsForHand`, `ridingRowsFor` and `bestLitCard` once each and wires `onRemoveBuff` to `dispatch({ kind: RoundUiActionKind.RemoveBuff, id })`. Like `roundControlsProps.ts`, this file **decides nothing** — it assembles.

- [x] **Step 4: Wire `WarCouncilRound.tsx`**

Call `buffRideView` once beside the existing `legal` derivation; call `useBuffBreakdownTarget(view.defaultTarget)`; replace Task 11's placeholder `buffLightForCard` with a lookup into `view.lights`; render `<BuffRidingList>` and `<CardBuffBreakdown>` in the hand zone, **outside `.wc-table`**, so both survive the gallery closing (`plan.md` Assumptions #6). Extend the hand's existing hint region rather than adding a second `aria-live`.

- [x] **Step 5: Verify, and measure the file that is closest to its budget**

Run: `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.buffRide.test.tsx; npm run typecheck; (Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count; (Get-Content src\app\warCouncil\buffRideProps.ts).Count`
Expected: Vitest reports 0 failed; `tsc -b` exits 0; **both counts under 400** — `WarCouncilRound.tsx` was at 346 before this task, so if it is over, move more assembly into `buffRideProps.ts` in this task rather than handing the breach back.

- [x] **Step 6: Confirm Task 11's placeholder is gone**

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include *.tsx | Select-String -Pattern "DLR-153 Task 15 replaces this"`
Expected: zero hits.

---

## Phase 7 — Final verification

No production changes. Static gates, the boundary and hard-coded-tunable greps, the file-size sweep, the browser agenda that AC5–AC8 and AC14–AC19 can only be settled by, and the PR description.

### Task 16.1: Confirm the pure-core boundary and the no-second-copy rule still hold

- Skill: `none — verification only, no TypeScript written`

**Files:** (none — read-only checks)

- [x] **Step 1: No DOM or React reached the pure core**

Run: `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

- [x] **Step 2: The firing rules were not copied into the view layer**

Run: `Get-ChildItem src\app -Recurse -Include *.ts,*.tsx | Select-String -Pattern "BuffConditionKind|case 'taker'|case 'feeder'|case 'sidestep'"`
Expected: zero hits. A `switch` over the condition families anywhere under `src/app/` is the exact defect DLR-152 exists to prevent, and it is a blocking finding, not a style note.

- [x] **Step 3: No lit-state arithmetic escaped into TypeScript**

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include *.ts,*.tsx | Select-String -Pattern "0\.9|3\.2|lapTime|blur\(|mix-blend"`
Expected: zero hits. The lap slope and its floor live in `warCouncilBuffRide.css` only; `blur()` and `mix-blend-mode` appear nowhere at all.

### Task 16.2: Confirm no tunable was hard-coded and no stale name remains

- Skill: `none — verification only, no TypeScript written`

**Files:** (none — read-only checks)

- [x] **Step 1: The lift literals are gone from the stylesheets**

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include *.css | Select-String -Pattern "translateY\(-9%\)|translateY\(-20%\)|translateY\(0%\)"`
Expected: zero hits — all three now read `var(--wc-lift-*)`.

- [x] **Step 2: The new class and token names are used identically everywhere**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "wc-card-buff|wc-riding|wc-breakdown|--wc-lift-|--wc-buff-"`
Expected: every hit is in `warCouncilBuffRide.css`, `warCouncil.css`, `warCouncilCards.css`, the four components, or their specs. No name appears in only one of the CSS/TSX pair — a class declared and never used, or used and never declared, is a defect these names bind by string rather than by type.

### Task 16.3: File-size sweep

- Skill: `none — verification only, no TypeScript written`

**Files:** (none — read-only checks)

- [x] **Step 1: Measure every file this contract created or grew**

Run: `Get-ChildItem src\app\warCouncil,src\hunt,src\warCouncil -Recurse -Include *.ts,*.tsx | ForEach-Object { [pscustomobject]@{ n = (Get-Content $_.FullName).Count; f = $_.Name } } | Where-Object { $_.n -gt 400 } | Sort-Object n -Descending`
Expected: no rows. `(Get-Content).Count` and **not** `Measure-Object -Line`, which drops blank lines and hid a real breach on DLR-63. A file over budget is split **in this contract**, never handed back as a finding.

### Task 16.4: Static gates and the full suite

- Skill: `none — verification only, no TypeScript written`

**Files:** (none — read-only checks)

- [x] **Step 1: Warm the transform cache, then run the projects separately**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. Running them separately first is what avoids the cold-cache `[vitest-pool-runner]: Timeout waiting for worker to respond` on the `dom` project, which is infrastructure and **must never be reported as a test failure**.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports `0 failed`. Quote the `Tests  N passed` line.

- [x] **Step 3: Formatting, scoped to what this contract changed**

Run: `npx prettier --check src/hunt/actionPoints.ts src/hunt/buffActivation.ts src/hunt/index.ts src/warCouncil/buffProjection.ts src/app/warCouncil/*.ts src/app/warCouncil/*.tsx src/app/warCouncil/*.css src/app/warCouncil/__tests__/*.ts src/app/warCouncil/__tests__/*.tsx src/warCouncil/__tests__/buffProjection.test.ts src/hunt/__tests__/*.ts`
Expected: exits 0. Then run `npm run format:check` and **report** its result — it fails on ~58 pre-existing `.md` files no contract has touched, which is not this contract's defect. **Never run `npm run format`** to clear it: it is `prettier --write` across the whole repo and rewrites every design document.

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 16.5: The browser agenda — what only a running app can settle ✓ — AC5/6/7/8/19 verified live and PASS. AC17: the breakdown panel overlaps the live trick row and captures its clicks at 1440x900 and the ~500px shell. Root cause measured (`.wc-trick-row` sits outside `.wc-felt-rail`, so the panel's rail-width subtraction does not protect it); unresolvable mechanically at the narrow shell (panel min-width 288px vs ~117px clear). **Developer decision 2026-08-27: accepted** — "if I can't see it I can't fix it, if it's an issue I'll fix it after". Recorded as a provisional rule in `the-hunt.md`, not as a defect.

- Skill: `game-ux`

**Files:** (none — read-only checks)

**QA drives this through `chrome-devtools` when the contract is run with `--browser`.** Every item has a right answer, so none of it is a developer observation; if the browser pass did not run, this whole list transfers to the developer's own hands and **AC5's greyscale screenshot does not get taken at all**. Check at **1440×900**, **1280×720** and an emulated **~430px touch viewport**, and name the sizes in the summary.

- [x] **Step 1: The three carriers, including the screenshot AC5 demands**

Activate one buff, then three. **Take the greyscale screenshot** and confirm a 1-buff card is distinguishable from a 3-buff card in it. Confirm the halo, the travelling cell and the numeral badge are all present on each lit card. Note plainly that the halo's *energy* channel contributes nothing in greyscale — it is reinforcement for colour-sighted players, and that is acceptable but must be said out loud.

- [x] **Step 2: `prefers-reduced-motion` (AC6) and the lap floor (AC7)**

Force the media rule through the CSSOM rather than reading it off the CSS. Confirm the cell **stops and becomes a continuous rail at full brightness**, and that the halo and badge are unchanged. Then read the computed `animation-duration` on the cell at counts 1 through 6 and confirm **none is below 0.9s**.

- [x] **Step 3: The lift ladder (AC8)**

Read the **resolved transform** off a real card — `new DOMMatrix(getComputedStyle(el).transform).m42` — at rest, on hover, and armed, and confirm the ladder is monotonic with rest at half the hover lift. Do **not** parse `--wc-lift-rest`: it holds a `calc()` and reads back as literal text, so `parseFloat` gives `NaN` and the assertion silently passes. Wait out the transition **and then a frame or two** before reading; reading immediately after adding a class returns the pre-transition value, which produced three wrong readings last time.

- [x] **Step 4: Reachability on hover and on touch (AC14)**

Cross the gap from a card into the breakdown and confirm it stays open under the pointer; remove a buff from inside it and watch the affected cards go dark. Then on the emulated touch viewport, where there is **no hover at all**, confirm tapping a card reaches the panel and its controls.

- [x] **Step 5: Touch targets (AC15)**

Compute every interactive control's **hit rectangle** — including any pseudo-element expander, not the painted box — across the riding list, the breakdown and the hand. Confirm each is ≥44px and test **all pairs** for intersection. Expect zero overlaps.

- [x] **Step 6: Scroll, overflow and occlusion (AC16, AC17)**

Confirm no page scroll and no horizontal scroll at all three sizes. Then, separately, **assert the breakdown panel's box against its container's** — `overflow: hidden` on the shell turns an overflow into a silent clip, so a no-scroll assertion is not a no-overflow assertion. Confirm the panel never occludes the decree, the trick or the spent pile by testing **rectangle intersection on all four edges**: an x-only test is meaningless at 430px, where the shell restacks and the rail sits above the hand.

- [x] **Step 7: Contrast on the real ground (AC19)**

Measure the totals row's text and the badge's numeral against the ground each **actually sits on**, not against a token that passed elsewhere. Floor is 4.5:1. Extend `src/app/warCouncil/__tests__/contrast.test.ts` with the pairs that are token-vs-token so the check survives a retune, and report by measurement the ones that are not.

- [x] **Step 8: Console**

Confirm the console is clean across the whole pass — no warning, no error, no React key or act warning.

### Task 16.6: Update the PR description

- Skill: `none — documentation, no TypeScript written`

**Files:**

- Create: `.claude/contract/DLR-153-activate-buffs-for-the-trick/pr-description.md`

- [x] **Step 1: Write `pr-description.md` for the developer to paste**

Include:

- A link to `plan.md` in this folder.
- A summary of the change: activation takes no target, the hand becomes the readout, and a buff can now be taken back off the trick.
- **The rule change, stated plainly**: `the-hunt.md` recorded "no way to un-activate"; there now is one, for the three condition families only, and `implementation-doc-writer` must update §2 and the Status register.
- **The one engine amendment to DLR-152**: `BuffBranchProjection` gained `mayFire`, additive, so a branch keeps its own indeterminate set.
- Every decision the developer must make — the six placeholder groups from the File map, the one-tap question, and the append-vs-reinsert reading.
- Every behaviour only play settles: the suitless-buff case, and whether the two-branch totals read as clarity or homework.
- Verification results from every phase, plus the three viewport sizes the browser pass used and whether the greyscale screenshot was taken.
- One line for future contributors: **the view layer never re-derives which buffs fire** — `buffRideModel.ts` and `buffBreakdownModel.ts` delegate to `projectBuffBranches`, and the Task 16.1 Step 2 grep is what keeps it that way.

---

## Self-review

**Spec coverage:**

- AC1 (one tap, no target, no refusal) — Task 15 Step 1; Assumption 10 records the poise/commit reading.
- AC2 (every legal card it could fire on lights up) — Tasks 5, 11, 15.
- AC3 (an illegal card never lights and never counts) — Tasks 5, 11.
- AC4 (intensity and badge from the projection, higher branch, no re-derivation) — Tasks 3, 5; enforced by Task 16.1 Step 2.
- AC5 (three carriers, greyscale screenshot) — Tasks 8, 9, 10; screenshot in Task 16.5 Step 1.
- AC6 (`prefers-reduced-motion`) — Task 8 Steps 4-5; forced through the CSSOM in Task 16.5 Step 2.
- AC7 (0.9s lap floor) — Task 8 Step 4's `max()`; asserted in Task 8 Step 5 and Task 16.5 Step 2.
- AC8 (lift ladder, resolved transform) — Task 8 Steps 1-3; resolved reading in Task 16.5 Step 3.
- AC9 (riding list, reach, zero case, remove control) — Tasks 4, 5, 12.
- AC10 (removal returns the card, re-lights, says what went dark) — Tasks 1, 2, 4, 7, 12, 15.
- AC11 (two branches unemphasised, overlap row, rows name their buff) — Tasks 6, 14.
- AC12 (struck-through rows, both clauses) — Tasks 4, 6, 14.
- AC13 (visible without interaction, survives leaving, switches on hover, expanded) — Tasks 13, 14, 15.
- AC14 (hover bridge; reachable on touch) — Task 13; touch in Task 16.5 Step 4.
- AC15 (44px hit areas, no overlaps) — Tasks 8, 12; measured in Task 16.5 Step 5.
- AC16 / AC17 (no scroll, no overflow, no occlusion) — Task 8 Step 4's width cap; measured in Task 16.5 Step 6.
- AC18 (roving tabindex; panel controls reachable without closing) — Tasks 11, 13, 14.
- AC19 (4.5:1 on the real ground) — Task 16.5 Step 7.
- AC20 (typecheck, lint, format:check, test) — Task 16.4.

**Placeholder scan:** no `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" reference. Every step is either a concrete code block or a runnable command with `Run:` / `Expected:`. Every unchosen tuning value is routed to the File map's *Developer decides or observes* block and to `plan.md` → *Risks*, and no step invents one — the two lift figures are transcribed from the literals they replace, and the lap floor is a fixed safety limit rather than a choice.

**Type / name consistency:** `refundAp`, `isRevocableBuff`, `deactivateFromPile`, `mayFire`, `CardBuffLight`, `RidingBuffRow`, `RideInput`, `rideInputFor`, `skullReadingFor`, `lightsForHand`, `ridingRowsFor`, `bestLitCard`, `BreakdownBranch`, `BreakdownConditionRow`, `BreakdownDeadRow`, `BreakdownTotals`, `CardBuffBreakdown`, `breakdownFor`, `buffReachText`, `removeBuffLabel`, `deadRowReasonText`, `deadRowElsewhereText`, `buffRemovedText`, `buffBadgeText`, `buffCount`, `buffEstimate`, `buffLightForCard`, `useBuffBreakdownTarget`, `BreakdownTarget`, `buffRideView`, `BuffRideView`, `handleRemoveBuff`, `RoundUiActionKind.RemoveBuff`, and the CSS names `wc-card-buff` / `wc-card-buff-badge` / `wc-card-buff-halo` / `wc-riding` / `wc-breakdown` / `--wc-lift-rest` / `--wc-lift-hover` / `--wc-lift-armed` / `--wc-buff-halo` / `--wc-buff-lap-base` / `--wc-buff-lap-floor` are each spelled identically in `plan.md` Part 2 → *Data shapes* and in every task that names them. Task 16.2 Step 2 greps the string-bound half, which the compiler cannot check.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking: two new pure functions in `src/hunt/`, re-exported, called by nothing yet.
- **Phase 2** ends type-checking: the one construction site of `BuffBranchProjection` is in the file being edited, and every reader is a field access that keeps compiling.
- **Phase 3** ends type-checking: three DOM-free modules with full specs, imported by nothing yet.
- **Phase 4** ends type-checking, and `roundReducer.ts`'s exhaustive switch is what proves the arm is wired rather than a test asserting it separately.
- **Phase 5** ends type-checking **because Task 11 supplies `WarCouncilRound.tsx`'s new required prop with an explicitly-commented placeholder** that Task 15 replaces and Task 15 Step 6 greps for. Without that, adding a required `HandFan` prop would leave this boundary failing `tsc`.
- **Phase 6** ends with the surface complete, wired, and every existing hand, card, gallery and round spec still green.
- **Phase 7** changes no production code.

---

## Phase 8 — Corrections after the developer compared the build to the mockup

Added 2026-08-27, after the developer drove `mockup-buff-loading.html` beside the running app. Three
gaps, all of them the build diverging from a decision `update-log.md` had already recorded. None is a
new feature; each restores something the reasoning record settled and the implementation missed.

### Task 17: The breakdown becomes hover-only ✓

- Skill: `react-frontend`, `game-ux`

**Files:**

- Modify: `src/app/warCouncil/useBuffBreakdownTarget.ts`
- Modify: `src/app/warCouncil/buffRideProps.ts`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx`
- Test: `src/app/warCouncil/__tests__/useBuffBreakdownTarget.test.tsx`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.buffRide.test.tsx`

**AC13 is REVERSED by developer decision.** It read "visible without any interaction"; it is now
"visible while the pointer is on a lit card". The original reading came from `update-log.md`'s
CORRECTION "the readout stays up", which was decided on a standalone sheet where nothing sat beneath
the panel. On the real felt the panel covers the played cards (the occlusion accepted earlier today),
so open-by-default means permanently covering the trick. Hover-only confines that to the moments the
player is actually comparing cards.

- [x] **Step 1: Drop the fallback-opens behaviour, keep the bridge**

`useBuffBreakdownTarget(fallback)` no longer opens on `fallback`. The target is set by
`onEnterCard` and cleared by the existing scheduled close. **The hover bridge stays exactly as it
is** — it now does the job it was built for, holding the panel open while the pointer crosses the gap
to reach a control inside it. `Escape` still closes. Blur still schedules nothing.

- [x] **Step 2: Keep a way in where there is no hover (AC14)**

Hover-only must not mean unreachable on touch. Follow the mockup's own rule — it pins the readout
open on **selection** rather than hover for exactly this reason (`mockup-buff-loading.html`, "The
readout is pinned, not hovered, because it contains controls"). A tapped/selected lit card shows its
breakdown and keeps it.

- [x] **Step 3: Update the specs**

`useBuffBreakdownTarget.test.tsx`'s "target equals fallback immediately on mount" assertions invert:
mount with something riding and assert the target is `null` until a card is entered.
`WarCouncilRound.buffRide.test.tsx`'s AC13 assertion changes from "appears without any hover or
click" to "appears on hovering a lit card, and not before". The target-switch and hover-bridge tests
stay as they are.

### Task 18: Every readout row carries its own remove control ✓

- Skill: `react-frontend`, `game-ux`

**Files:**

- Modify: `src/app/warCouncil/CardBuffBreakdown.tsx`
- Modify: `src/app/warCouncil/buffRideProps.ts`
- Modify: `src/app/warCouncil/warCouncilBuffRide.css`
- Test: `src/app/warCouncil/__tests__/CardBuffBreakdown.test.tsx`

`update-log.md`'s CORRECTION "the hover readout was unreachable, and taking the ✕ out of it was
pedantry" settles this: the ✕ was removed from the per-card readout on the reasoning that a buff is
not *on* a card, and that was judged "true about the rule and useless about the interaction — the
buff is listed there, so that is where the hand goes." The build shipped the control only in
`BuffRidingList`, which also left the hover bridge with nothing to reach and made AC18's
"reachable by Tab" assertion vacuous, as QA reported.

- [x] **Step 1: Add the control to every row, including the struck-through ones**

The mockup includes `rm(b)` in its `row dead` template as well as its live rows — a dead row is still
a riding buff and still removable. Wording comes from `removeBuffLabel` unchanged: it names the
**trick** and what else goes dark, never a single card.

- [x] **Step 2: The riding list keeps its own ✕**

Not redundant, and the reason is in the log: **a buff that reaches zero cards never appears in any
card's readout**, so the list is the only place it can be removed from.

- [x] **Step 3: Spec it**

`CardBuffBreakdown.test.tsx` asserts a remove control on every condition row and every dead row, that
clicking one calls `onRemove` with that buff's id, and that AC18's Tab assertion is now real rather
than vacuous — the panel has focusable controls and does not close on blur.

### Task 19: The halo is the mockup's red ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/warCouncil.css`

The build set `--wc-buff-halo: var(--wc-alarm)` — `#d1705f`, the muted damage colour. That is
precisely the token `update-log.md`'s OPEN #9 names as the meaning a red halo would fight with, and
it is not the mockup's red. The mockup wires `--load-red: #ff3326` (vivid) as its live default, with
brass as the toggle.

- [x] **Step 1: Use the mockup's figure, transcribed not chosen**

`--wc-buff-halo: #ff3326` with its deep companion for the outer strokes, both transcribed from
`mockup-buff-loading.html`. Still a **placeholder** — OPEN #9's red-vs-brass judgement remains the
developer's, and the comment must keep saying so.

**File-size finding (not fixed here, out of Phase 8's "these three only" scope):**
`warCouncil.css` measures 412 lines (`(Get-Content ...).Count`), over the 400-line budget. This
predates Phase 8 — it was already at 411 lines from Phases 1-7's `--wc-lift-*`/`--wc-buff-lap-*`
token additions before this task touched the file; this task's own net contribution is +2 lines
(the halo comment/token swap). Not corrected here because doing so means relocating unrelated
`:root` token groups (e.g. the DLR-71 health-bar block), which is a real change beyond the three
named corrections. Flagged for a follow-up ticket or the next contract that touches this file.

### Task 20: Verify ✓ (Step 1 only — Step 2 delegated, no browser pass ran)

- Skill: `none — verification only`

- [x] **Step 1: Gates**

Run: `npm run typecheck; npm run lint; npx vitest run --project node; npx vitest run --project dom`
Expected: all green; the suite total moves with the spec changes above.
Confirmed 2026-08-27 (Implementer, Phase 8 re-run): typecheck clean, lint clean, node 1832/1832,
dom 347/347 (baseline was 344 dom / 2176 total — net +3 from this phase's spec changes).

- [x] **Step 2: Browser** ✓ — QA verified live 2026-08-27: hover opens and switches, the bridge holds crossing into the panel, tap opens it on the emulated narrow viewport, remove works on both live and struck-through rows, all 6 remove controls measure 44px with zero pairwise overlaps, halo resolves to rgb(255, 51, 38) with #8e1409 on the outer ring, console clean.

Hover a lit card and confirm the breakdown appears; leave and confirm it goes; cross into the panel
and confirm the bridge holds; remove a buff from a readout row and from a struck-through row; confirm
the halo reads as red.

**Not run.** No `--browser` pass was requested for this dispatch and `npm run dev` is never the
Implementer's to start — this step is QA's or the developer's eyes-on agenda, unchanged from the
main contract's own Phase 7 handling of the browser-only ACs.

### Task 21: Phase 8 cleanup — `warCouncil.css` under 400 lines, and `bestLitCard` removed ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/warCouncil.css` — moved the `--wc-hp-*` (DLR-71 health-bar) tokens out of `:root`
- Modify: `src/app/warCouncil/warCouncilHealthBars.css` — the tokens' new home, in their own `:root` block, beside their only consumer
- Modify: `src/app/warCouncil/buffRideModel.ts` — deleted `bestLitCard`
- Modify: `src/app/warCouncil/buffRideProps.ts` — updated the comment that referenced `bestLitCard` as retained
- Modify: `src/app/warCouncil/__tests__/buffRideModel.test.ts` — deleted the `bestLitCard` describe block and its now-unused imports

- [x] **Step 1: Relocate the `--wc-hp-*` tokens**

`warCouncilHealthBars.css` was already the sole consumer of every `--wc-hp-*` token (confirmed by
grep before moving) — its rules read them, and no other file does. Moved the 27-line token block,
byte-identical, into a new `:root` block in that file, and updated both files' docblocks so neither
claims a now-false fact about where `:root` is declared.

- [x] **Step 2: Delete `bestLitCard`**

Confirmed by grep it had exactly one production reference (a comment in `buffRideProps.ts` noting
it was untouched) and one test block, both now stale after Phase 8 Correction 1 removed its only
caller. Deleted the function, its test `describe` block, and the now-unused `Card`/`bestLitCard`
imports in the test file.

- [x] **Step 3: Verify**

Run: `npm run typecheck; npm run lint; npx prettier --check <touched files>; npx vitest run --project node; npx vitest run --project dom`
Expected: all green.
Confirmed 2026-08-27 (Implementer): typecheck clean, lint clean, prettier clean on all five touched
files, node 1830/1830 (baseline 1832 — the two deleted `bestLitCard` tests), dom 347/347 (unchanged
— the deleted tests were in the node project). File-size sweep: `warCouncil.css` 393 lines,
`warCouncilHealthBars.css` 256 lines, both under 400. No other file in `src/app/warCouncil`,
`src/hunt` or `src/warCouncil` breached 400 except the two pre-existing, out-of-scope files noted in
the dispatch (`cpuPlayer.test.ts` 417, `consumables.test.ts` 407).
