# Tasks: Version 6 — consumable buff cards, no action points, and a pared five-card pool

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-25

**Goal:** Make each buff card something the player spends — Taker, Feeder and Sidestep leave the pile on activation — delete action points entirely, cut the mintable pool from 73 templates to 13, and open every run with 20 bronze cards and 10 coins a fight, so card scarcity rather than a refilling points pool is the only limit on how hard a hand can be pushed.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder, approved 2026-08-25.

---

## File map

**Created:**
- `src/app/run/shopRefusals.ts` — `shopRefusalsFor(stock)`, a total `Record<ShopItem, PurchaseRefusal | null>`, extracted from the hand-maintained literal in `App.tsx`
- `src/app/run/__tests__/shopRefusals.test.ts` — totality and per-item refusal coverage

**Modified:**
- `src/hunt/consumables.ts` — add `ConsumedConditionKind`, `CONDITION_CARD_SINGLE_USE`, `isConsumedConditionKind`; third clause in `isConsumableItem`; correct the module docblock
- `src/hunt/buffActivation.ts` — add `spentThisTrick` to `BuffActivationState`; populate in `activateFromPile`, clear in `openBuffWindow`, initialise in `startBuffActivation` and `refreshBuffsForNewHand`
- `src/app/warCouncil/buffRoundState.ts:55-58` — `buffHandInputFor` unions `spentThisTrick` with `offeredBuffs`
- `src/hunt/apConfig.ts:12` — `AP_ENABLED = false`; `:50-52` — the two per-hand caps removed
- `src/hunt/config.ts:199,205` — `STARTING_BUFF_COUNT = 20`, `COINS_PER_ENCOUNTER_WIN = 10`
- `src/hunt/rankTiers.ts:157` — prose naming `COINS_PER_ENCOUNTER_WIN` as 1
- `src/hunt/buffTemplates.ts` — `MintableConditionKind`, `MintableRewardAxis`, three-row `TEMPLATE_FAMILIES`, rank branch deleted
- `src/hunt/slotWeights.ts` — narrowed `SlotTemplateKind` / `SlotAxisWeights`, pruned weight tables, new `weightedDrawWithReplacement`
- `src/hunt/startingPile.ts:76-84` — `seedStartingBuffPile` draws with replacement
- `src/hunt/shop.ts:33-38` — `ShopItem.ApCapacity` off `SHOP_ITEMS`; `:237` docblock
- `src/app/warCouncil/buffLabels.ts:153-155,166-177` — `buffLine` and `buffRowAccessibleName` drop their `apCost` parameter
- `src/app/warCouncil/actionBarLabels.ts:26-38,54-70` — `applyBuffAccessibleName` drops `apPool`, `applyDamageBarAccessibleName` drops `apCost`
- `src/app/warCouncil/BuffLoadoutPanel.tsx:25,65,93-95,109,114` — `apCostFor` prop and the AP paragraph removed
- `src/app/warCouncil/ActionBar.tsx:29,74,121,133` — `apPool` prop and the AP figure removed
- `src/app/warCouncil/roundControlsProps.ts:50,80` — the two suppliers of the removed props
- `src/app/run/shopLabels.ts:26-27` — `SHOP_AP_LABEL` deleted
- `src/app/run/ShopPanel.tsx:5,19,46,91,150-154` — `apCapacity` prop and the action-points purse cell removed
- `src/App.tsx:4,325,336-345,403` — `apCapacity` props removed, `refusals` literal replaced by `shopRefusalsFor`
- `src/sim/baselinePolicy.ts:87,196-241` — `apCapacityFocusedShopAction` and `apCapacityFocusedPolicy` deleted
- `src/sim/policies.ts:15,29` and `src/sim/index.ts:8,20-28` — the removed policy and the four superseded variant exports
- `src/sim/openingPileVariants.ts` — the four superseded variant exports deleted; `withOpeningPile` kept
- Specs: `src/hunt/__tests__/` — `consumables.test.ts`, `buffActivation.test.ts`, `apConfig.test.ts`, `config.test.ts`, `actionPoints.test.ts`, `buffAccrual.test.ts`, `buffTemplates.test.ts`, `buffTemplates.activated.test.ts`, `slotWeights.test.ts`, `startingPile.test.ts`, `slotMachine.test.ts`, `run-buffs.test.ts`, `run.grants.test.ts`, `shop.test.ts`; `src/app/warCouncil/__tests__/` — `buffLabels.test.ts`, `actionBarLabels.test.ts`, `BuffLoadoutPanel.test.tsx`, `buffActivationStock.test.ts`, `buffRoundState.test.ts`, `WarCouncilRound.actionBar.test.tsx`; `src/app/run/__tests__/` — `ShopPanel.test.tsx`, `shopLabels.test.ts`; `src/sim/__tests__/` — `reachability.test.ts`, `openingPileVariants.test.ts`, `baselinePolicy.test.ts`, `cardAwarePolicy.test.ts`

**Deleted:** *(no whole files — `openingPileVariants.ts` is trimmed, not removed, so `SimConfig.openingPileVariant` and `playRun.ts` need no edit)*

**Developer decides or observes:**
- **The buff loadout panel now renders 21 rows** where it was laid out against 5. Open the loadout between tricks and judge whether it scrolls acceptably, whether rows need grouping by family, and whether the two-tap spend still reads at that density. Check at 1280×800 and 1440×900. This is the most likely thing to look wrong on first play.
- **The shop poses no choice** at 10 coins against a 1-coin heal and a 1-coin pull — deliberate per design §3.6, to be tuned after playing. Confirm it feels like a restock rather than a decision, and say what the prices should become.
- **Whether a fresh run should still open with the guaranteed Cheat.** `RUN_STARTING_CHEATS` stays 1, so the pile is 21 cards, not 20. One line to change if 20 should mean 20.
- **Whether the two slot machines still feel different.** Strongbox's coin/refund lean is gone with those axes; both machines' axis tables are now flat and they differ only by family weight. Any replacement lean is a tuning value and is yours.
- **AC10's felt result** — whether Aoife actually falls on trick one or two with bronze cards, and whether the fight still reads as winnable with nothing activated. The simulator answers the statistics in Phase 5; whether it *feels* like the ladder design §4 describes is yours.
- **Clear local storage before the first play session.** Vault grants and odds boosts bought against a cut template become unresolvable and are silently skipped. Nothing corrupts; the currency is gone.

---

## Phase 1 — Consumption, and the card that must still fire

The three surviving condition families become one-shot, and the felt keeps hold of a spent card long enough for it to pay. These two halves ship together deliberately: consumption without Task 3 is a card that deletes itself and contributes nothing, with no throw and no refusal to say so. The phase ends type-checking — the new `BuffActivationState` field is added with every one of its ten construction sites in the same phase.

### Task 1: Make Taker, Feeder and Sidestep consumable in `src/hunt/consumables.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/consumables.ts:150-180`
- Test: `src/hunt/__tests__/consumables.test.ts`

- [x] **Step 1: Write the failing test for the three families being consumable**

Add to `src/hunt/__tests__/consumables.test.ts`, following the file's existing fixture style:

```ts
describe('CONDITION_CARD_SINGLE_USE (DLR-145 AC1)', () => {
  it.each([BuffKind.Taker, BuffKind.Feeder, BuffKind.Sidestep])(
    'reports a %s as a consumable item',
    (kind) => {
      expect(isConsumableItem(conditionBuff(kind, BuffTier.Bronze, 1))).toBe(true)
    },
  )

  it('leaves the five DLR-111 items and the three activated cards unchanged', () => {
    expect(isConsumableItem(wardBuff(BuffTier.Bronze, 2))).toBe(true)
    expect(isConsumableItem(cheatBuff(BuffTier.Bronze, 3))).toBe(true)
  })

  it('does NOT admit a family that was cut from the pool but still declared', () => {
    expect(isConsumableItem(conditionBuff(BuffKind.Glutton, BuffTier.Bronze, 4))).toBe(false)
  })

  it('spendConsumable removes exactly the spent Taker and leaves its twin', () => {
    const a = conditionBuff(BuffKind.Taker, BuffTier.Bronze, 1)
    const b = conditionBuff(BuffKind.Taker, BuffTier.Bronze, 2)
    expect(spendConsumable([a, b], 1).map((buff) => buff.id)).toEqual([2])
  })
})
```

- [x] **Step 2: Run the new tests and confirm they fail**

Run: `npx vitest run src/hunt/__tests__/consumables.test.ts`
Expected: the four new cases fail; the pre-existing cases in the file still pass.

- [x] **Step 3: Add the toggle, the guard, and the third clause**

In `src/hunt/consumables.ts`, immediately after `ACTIVATED_CARD_SINGLE_USE`'s `isActivatedSingleUseKind`:

```ts
/** The three CONDITION families whose single-use-ness is a developer-owned toggle. A SIBLING of
 *  `ACTIVATED_CARD_SINGLE_USE`, not a member of `ConsumableItemKind`: these cards have a TRIGGER,
 *  not a timing window and an effect, so neither `CONSUMABLE_TIMING` nor `CONSUMABLE_EFFECT_LIVE`
 *  admits them and neither `consumableTimingOf` nor `consumableEffectOf` may be called on one. */
type ConsumedConditionKind =
  | typeof BuffKind.Taker
  | typeof BuffKind.Feeder
  | typeof BuffKind.Sidestep

/**
 * DLR-145 AC1 — whether activating this condition card ALSO removes it from the pile. Default
 * `true` for all three as of 2026-08-25: this is the change that turns a rented buff into a spent
 * one, and it is the whole point of the Version 6 pass. Before it, a Taker was re-activated and
 * re-paid every trick and the correct play was to dump the pool every trick, because the pool came
 * back before the next one.
 *
 * TO REVERT ONE CARD to "stays in the pile", flip that entry to `false`. Nothing else in this
 * module, and no other file, needs to change — `isConsumableItem` below is the only reader.
 */
export const CONDITION_CARD_SINGLE_USE: Readonly<Record<ConsumedConditionKind, boolean>> = {
  [BuffKind.Taker]: true,
  [BuffKind.Feeder]: true,
  [BuffKind.Sidestep]: true,
}

const CONSUMED_CONDITION_KINDS: ReadonlySet<BuffKind> = new Set(
  Object.keys(CONDITION_CARD_SINGLE_USE) as ConsumedConditionKind[],
)

function isConsumedConditionKind(kind: BuffKind): kind is ConsumedConditionKind {
  return CONSUMED_CONDITION_KINDS.has(kind)
}
```

Then replace `isConsumableItem`'s body:

```ts
export function isConsumableItem(buff: Buff): boolean {
  if (isConsumableItemKind(buff.kind)) return true
  if (isActivatedSingleUseKind(buff.kind)) return ACTIVATED_CARD_SINGLE_USE[buff.kind]
  return isConsumedConditionKind(buff.kind) && CONDITION_CARD_SINGLE_USE[buff.kind]
}
```

Update `isConsumableItem`'s docblock and the module docblock (lines 14-19) so neither still states that only the five items and the three activated cards leave the pile.

- [x] **Step 4: Confirm the tests pass and the file is inside its budget**

Run: `npx vitest run src/hunt/__tests__/consumables.test.ts; npm run typecheck; (Get-Content src\hunt\consumables.ts).Count`
Expected: Vitest reports 0 failed, `tsc -b` exits 0, and the line count is at or below 400. If it is over, split the two toggles and `isConsumableItem` into `src/hunt/singleUse.ts` and re-export from `consumables.ts` rather than shortening the docblocks.

### Task 2: Hold a spent card for the trick it was spent on — `src/hunt/buffActivation.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffActivation.ts:56-72,120-160,175-200`
- Test: `src/hunt/__tests__/buffActivation.test.ts:230-260`, `src/app/warCouncil/__tests__/buffActivationStock.test.ts:84,91`

- [x] **Step 1: Write the failing test for a spent card being retained and then cleared**

Add to `src/hunt/__tests__/buffActivation.test.ts`:

```ts
describe('spentThisTrick (DLR-145)', () => {
  it('records a consumed condition card, and drops it from the returned pile', () => {
    const taker = conditionBuff(BuffKind.Taker, BuffTier.Bronze, 1)
    const { activation, buffs } = activateFromPile(startBuffActivation(), [taker], taker, true)
    expect(buffs).toHaveLength(0)
    expect(activation.spentThisTrick.map((buff) => buff.id)).toEqual([1])
    expect(activation.activatedThisTrick).toEqual([1])
  })

  it('records nothing for a card that stays in the pile', () => {
    const kept = unassignedLikePricedBuff(2)
    const { activation, buffs } = activateFromPile(startBuffActivation(), [kept], kept, true)
    expect(buffs).toHaveLength(1)
    expect(activation.spentThisTrick).toEqual([])
  })

  it('openBuffWindow clears spentThisTrick on the SAME edge as activatedThisTrick', () => {
    const taker = conditionBuff(BuffKind.Taker, BuffTier.Bronze, 1)
    const { activation } = activateFromPile(startBuffActivation(), [taker], taker, true)
    const next = openBuffWindow(activation)
    expect(next.spentThisTrick).toEqual([])
    expect(next.activatedThisTrick).toEqual([])
  })

  it('refreshBuffsForNewHand clears it too', () => {
    const taker = conditionBuff(BuffKind.Taker, BuffTier.Bronze, 1)
    const { activation } = activateFromPile(startBuffActivation(), [taker], taker, true)
    expect(refreshBuffsForNewHand(activation).spentThisTrick).toEqual([])
  })
})
```

- [x] **Step 2: Run it and confirm it fails to compile**

Run: `npx vitest run src/hunt/__tests__/buffActivation.test.ts`
Expected: a transform/collection error naming `spentThisTrick` as not a property of `BuffActivationState` — not a test failure. That is the expected shape here.

- [x] **Step 3: Add the field and populate it at the one place that knows a card left the pile**

In `src/hunt/buffActivation.ts`, add to `BuffActivationState`:

```ts
  /** DLR-145 — cards REMOVED FROM THE PILE during the current trick, kept so a consumed condition
   *  card still fires at this trick's resolution. `buffHandInputFor` builds the trick's active set
   *  by filtering the PILE, and `activateFromPile` has already taken a consumed card out of it —
   *  without this field a spent Taker pays nothing, with no throw, no refusal and no log.
   *  Same lifetime as `activatedThisTrick`, cleared on the same edge; separating the two is how
   *  that bug comes back in a different shape. Always empty for a non-consumable activation. */
  readonly spentThisTrick: readonly Buff[]
```

`startBuffActivation` returns `{ apPool: capacity, capacity, activatedThisTrick: [], spentThisTrick: [] }`. `activateBuff`'s return literal carries `spentThisTrick: state.spentThisTrick` — it does not know about the pile and must not invent an answer. `refreshBuffsForNewHand` returns `spentThisTrick: []`. `openBuffWindow` spreads `...state` and must add `spentThisTrick: []` explicitly beside `activatedThisTrick: []`.

Then in `activateFromPile`, replace the return so both halves move together:

```ts
export function activateFromPile(
  state: BuffActivationState,
  buffs: readonly Buff[],
  buff: Buff,
  windowOpen: boolean,
): BuffActivationResult {
  const activation = activateBuff(state, buff, windowOpen)
  if (!isConsumableItem(buff)) {
    return { activation, buffs }
  }
  return {
    activation: { ...activation, spentThisTrick: [...activation.spentThisTrick, buff] },
    buffs: spendConsumable(buffs, buff.id),
  }
}
```

- [x] **Step 4: Update the three spec construction sites of `BuffActivationState`**

`src/hunt/__tests__/buffActivation.test.ts:238` and `:245`, and `src/app/warCouncil/__tests__/buffActivationStock.test.ts:91`, each build a full `BuffActivationState` literal and need `spentThisTrick: []`. `buffActivationStock.test.ts:84`, `buffRoundState.test.ts:85` and `buffActivation.test.ts:253` are spreads and compile unchanged.

NOTE (Implementer): `buffActivationStock.test.ts:84` is ALSO a full literal, not a spread — `plan.md`'s own Config audit says so ("Spec construction sites: `buffActivationStock.test.ts:84` and `:91`") while this step's prose says the opposite. Updated `:84` too; the typecheck confirms both were needed.

- [x] **Step 5: Confirm the new behaviour and the whole `hunt` module still type-check**

Run: `npx vitest run src/hunt/__tests__/buffActivation.test.ts src/app/warCouncil/__tests__/buffActivationStock.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 3: Let a spent card fire — `src/app/warCouncil/buffRoundState.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/buffRoundState.ts:52-60`
- Test: `src/app/warCouncil/__tests__/buffRoundState.test.ts`

- [x] **Step 1: Write the failing test — a consumed Taker still fires on the trick it was spent on**

Add to `src/app/warCouncil/__tests__/buffRoundState.test.ts`, using the file's existing `ui` fixture:

```ts
it('a consumed card is no longer in the pile but is still active for THIS trick (DLR-145)', () => {
  const taker = conditionBuff(BuffKind.Taker, BuffTier.Bronze, 1)
  const seeded = { ...ui, buffs: [taker] }
  const { activation, buffs } = activateFromPile(seeded.buffActivation, seeded.buffs, taker, true)
  const spentState = { ...seeded, buffs, buffActivation: activation }

  expect(offeredBuffs(spentState)).toHaveLength(0)
  expect(buffHandInputFor(spentState).active.map((buff) => buff.id)).toEqual([1])
})

it('drops it from the active set once the window reopens', () => {
  const taker = conditionBuff(BuffKind.Taker, BuffTier.Bronze, 1)
  const seeded = { ...ui, buffs: [taker] }
  const { activation, buffs } = activateFromPile(seeded.buffActivation, seeded.buffs, taker, true)
  const nextTrick = { ...seeded, buffs, buffActivation: openBuffWindow(activation) }
  expect(buffHandInputFor(nextTrick).active).toEqual([])
})
```

- [x] **Step 2: Run it and confirm the first case fails**

Run: `npx vitest run src/app/warCouncil/__tests__/buffRoundState.test.ts`
Expected: the first new case fails with `active` empty — the exact silent failure this task exists to prevent.

- [x] **Step 3: Union the spent cards into the trick's active set**

In `buffHandInputFor`, replace the `active` derivation:

```ts
  // DLR-145 — the pile AND the cards spent out of it this trick. `activateFromPile` removes a
  // consumed card from `state.buffs` at the commit tap, so filtering the pile alone would find
  // nothing and a spent Taker would pay nothing. The two sets are disjoint by construction — a
  // spent card is no longer offered — so no de-duplication is needed and the overlap-bonus count
  // stays correct.
  const candidates = [...offeredBuffs(state), ...state.buffActivation.spentThisTrick]
  const active = candidates.filter((buff) =>
    state.buffActivation.activatedThisTrick.includes(buff.id),
  )
```

- [x] **Step 4: Confirm the phase type-checks end to end**

Run: `npx vitest run src/app/warCouncil/__tests__/buffRoundState.test.ts src/hunt/__tests__/consumables.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

---

## Phase 2 — Action points out ✓

`AP_ENABLED` goes false and every readout that has nothing left to say is deleted at source rather than left printing a zero. The label signature changes and their callers move together, so the phase is the boundary and no task within it leaves the tree compiling on its own. `BuffActivationRefusal.InsufficientAp` is deliberately kept in the union and becomes unreachable — `BUFF_ACTIVATION_REFUSAL_MESSAGE` stays a total `Record`, exactly as `PurchaseRefusal.SlotsFull` was kept on DLR-132.

### Task 4: Flip `AP_ENABLED` — `src/hunt/apConfig.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/apConfig.ts:6-12`
- Test: `src/hunt/__tests__/buffActivation.test.ts:261-270`, `src/hunt/__tests__/apConfig.test.ts:45-47`, `src/hunt/__tests__/config.test.ts:268-270`, `src/hunt/__tests__/actionPoints.test.ts:23-26`

- [x] **Step 1: Set the flag false and record why**

In `src/hunt/apConfig.ts`, replace the constant and its comment:

```ts
// DLR-104 AC1 — a single flag such that flipping it off makes every AP-gated action free, with no
// consuming code writing its own bypass (see `actionPoints.ts`'s `apCostFor`).
// DEVELOPER DECISION, DLR-145 AC2, 2026-08-25: OFF. Action points are removed from the game. They
// were the only thing limiting how many buffs fire per trick, and they did it badly — under
// `ApRefreshCadence.PerTrick` the pool refilled at every trick boundary, so the stake was refunded
// before the next bet. Consumed cards (`consumables.ts`'s `CONDITION_CARD_SINGLE_USE`) replace that
// with real scarcity: the limit is how many cards you own. The two are coherent only together.
// The `apRefund` reward axis dies with this flag rather than needing its own repair.
// UNIT: on/off.
export const AP_ENABLED = false
```

- [x] **Step 2: Correct the four specs that assert the old value**

`buffActivation.test.ts:267` asserts `expect(AP_ENABLED).toBe(true)` and must assert `false`, with its surrounding `describe` re-worded to state that every cost now reads as 0 and `InsufficientAp` is unreachable. `apConfig.test.ts:45-47`, `config.test.ts:268-270` and `actionPoints.test.ts:23-26` all read the constant rather than a literal and should pass unchanged — run them and confirm rather than editing pre-emptively.

NOTE (Implementer): running the full four files surfaced NINE further failures beyond the one named line — `actionPoints.test.ts`'s `canAffordAp`/`spendAp` cases and five more cases in `buffActivation.test.ts` (`InsufficientAp` reachability, `activateFromPile`'s spend, the stacking test, and the PerTrick cadence test) all asserted a cost actually being deducted. Corrected every one per the step's own instruction ("that is the flag working — correct the expectation, do not re-introduce a cost"), not just the four cited lines.

- [x] **Step 3: Verify the engine goes free with no other change**

Run: `npx vitest run src/hunt/__tests__/apConfig.test.ts src/hunt/__tests__/actionPoints.test.ts src/hunt/__tests__/buffActivation.test.ts src/hunt/__tests__/config.test.ts`
Expected: Vitest reports 0 failed. If any case fails on a cost that is no longer charged, that is the flag working — correct the expectation, do not re-introduce a cost.
RESULT: 4 files passed, 92 tests passed.

### Task 5: Strip AP from the label modules — `buffLabels.ts` and `actionBarLabels.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/buffLabels.ts:1-10,143-177`, `src/app/warCouncil/actionBarLabels.ts:1-38,54-70`
- Test: `src/app/warCouncil/__tests__/buffLabels.test.ts`, `src/app/warCouncil/__tests__/actionBarLabels.test.ts`

- [x] **Step 1: Drop the `apCost` parameter from both buff-label functions**

In `src/app/warCouncil/buffLabels.ts`:

```ts
/** THE one glanceable line, and the row's own accessible name — one string, so what a sighted
 *  player reads and what a screen reader announces cannot drift.
 *  `Bronze Bell-Taker (Momentum) — win a trick with Bells: +2 multiplier.`
 *  DLR-145 AC2 — the trailing `N AP.` is gone with action points. The parameter is REMOVED rather
 *  than passed a zero: a row that reads "0 AP" still claims a resource exists. */
export function buffLine(buff: Buff): string {
  return `${BUFF_TIER_WORD[buff.tier]} ${buffName(buff)} — ${buffConditionSentence(buff)}: ${buffRewardPhrase(buff)}.`
}

export function buffRowAccessibleName(
  buff: Buff,
  poised: boolean,
  refusal: BuffActivationRefusal | null,
): string {
  const line = buffLine(buff)
  if (refusal !== null) return `${line} ${BUFF_ACTIVATION_REFUSAL_MESSAGE[refusal]}`
  return poised ? `${line} ${BUFF_POISED_HINT}` : line
}
```

Leave `BUFF_ACTIVATION_REFUSAL_MESSAGE`'s `InsufficientAp` row in place — the `Record` must stay total over `BuffActivationRefusal`. Drop the now-unused `ActionPoints` import.

- [x] **Step 2: Drop the AP clauses from the action-bar labels**

In `src/app/warCouncil/actionBarLabels.ts`:

```ts
/** `Apply Buff — 3 buffs held.` — appends "panel open" or "not between tricks" when either is
 *  true. DLR-145 AC2 — the action-point clause is gone. */
export function applyBuffAccessibleName(
  offeredCount: number,
  open: boolean,
  windowOpen: boolean,
): string {
  const base = `${APPLY_BUFF_LABEL} — ${offeredCount} ${offeredCount === 1 ? 'buff' : 'buffs'} held.`
  if (!windowOpen) return `${base} Not between tricks.`
  return open ? `${base} Panel open.` : base
}

/** `Apply Damage — cash 12.` — plus the poise hint, the refusal reason, and the queued-payout
 *  sentence when one applies. DLR-145 AC2 — the "for N action points" clause is gone. */
export function applyDamageBarAccessibleName(
  cashValue: number,
  poised: boolean,
  refusal: ApplyDamageRefusal | null,
  pending: PendingApplyPayout | null,
): string {
  const base = `${APPLY_DAMAGE_BAR_LABEL} — cash ${cashValue}.`
  const poise = poised ? ` ${APPLY_DAMAGE_POISED_HINT}` : ''
  const refusalText = refusal !== null ? ` ${APPLY_DAMAGE_REFUSAL_MESSAGE[refusal]}` : ''
  const queued = queuedPayoutText(pending)
  return `${base}${poise}${refusalText}${queued !== null ? ` ${queued}` : ''}`
}
```

Also correct `LOADOUT_EMPTY_MESSAGE` (`:23`), which currently reads "No priced buffs held. Cheats and Timebomb charges are below." — there is no separate Cheat rail any more and no pricing. Use `'Nothing left to spend.'`, matching `mockup.html`'s empty state.

- [x] **Step 3: Update both label specs for the new signatures**

Every call in `buffLabels.test.ts` and `actionBarLabels.test.ts` drops its cost argument, and any assertion on a string ending `N AP.` or containing `action point` is removed. Add one case per file pinning that no rendered label contains the substring `AP` or `action point`.

- [x] **Step 4: Run both label specs**

Run: `npx vitest run src/app/warCouncil/__tests__/buffLabels.test.ts src/app/warCouncil/__tests__/actionBarLabels.test.ts`
Expected: Vitest reports 0 failed.
RESULT: 2 files passed, 18 tests passed. Also fixed `SlotMachinePanel.tsx`/`.test.tsx` (a forced caller of `buffLine`, not in this task's Files block but broken by the signature change).

### Task 6: Remove the AP readouts from the two felt components ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/BuffLoadoutPanel.tsx:1-30,60-120`, `src/app/warCouncil/ActionBar.tsx:1-40,70-140`, `src/app/warCouncil/roundControlsProps.ts:45-85`
- Test: `src/app/warCouncil/__tests__/BuffLoadoutPanel.test.tsx`, `src/app/warCouncil/__tests__/WarCouncilRound.actionBar.test.tsx`

- [x] **Step 1: Remove `apCostFor` and the AP paragraph from `BuffLoadoutPanel.tsx`**

NOTE (Implementer): also removed the `activation: BuffActivationState` prop, which became fully unused once the AP paragraph was gone (only reader was `activation.apPool`) — kept it in would have left a dead destructured prop. Removed its supplier in `roundControlsProps.ts` too.

Delete the `apCostFor` prop from `BuffLoadoutPanelProps` and its destructuring, delete the `<p className="wc-loadout-ap">` element entirely, and change the two call sites to `buffRowAccessibleName(buff, isPoised, refusal)` and `buffLine(buff)`. Per `mockup.html`'s loadout header, the panel head keeps a count — replace the AP paragraph with the held-card count so the header is not left empty:

```tsx
      <p className="wc-loadout-count">
        {buffs.length} {buffs.length === 1 ? 'card' : 'cards'}
      </p>
```

Rename the `.wc-loadout-ap` rule in `src/app/warCouncil/warCouncil.css` to `.wc-loadout-count` rather than leaving an orphan selector; do not change its declarations. Leave `useRovingTabIndex` untouched — the button count per row is unchanged.

- [x] **Step 2: Remove `apPool` from `ActionBar.tsx`**

Delete the `apPool` prop and its destructuring, change the figure span to `{offeredBuffs.length} held`, and change the `aria-label` call to `applyBuffAccessibleName(offeredBuffs.length, loadoutOpen, loadoutRefusal !== BuffActivationRefusal.WindowClosed)`. Update the `applyDamageBarAccessibleName` call to drop its cost argument. Drop the now-unused `ActionPoints` import.

NOTE (Implementer): the plan's code excerpt for this step didn't mention it, but `ActionBar.tsx`'s Apply Damage button also had a visible `{applyCashValue} for {APPLY_DAMAGE_AP_COST} AP` figure span — a fourth dead AP readout on this same surface, in the same spirit as the three the plan does name. Changed it to `cash {applyCashValue}` (matching `mockup.html`'s "cash 12") and dropped the now-unused `APPLY_DAMAGE_AP_COST` import, since leaving it would violate AC2/AC3's "every AP-cost readout is gone" while the accessible name right beside it no longer says it.

- [x] **Step 3: Remove the two suppliers in `roundControlsProps.ts`**

Delete `apCostFor: apCostOf` (`:50`) and `apPool: ui.buffActivation.apPool` (`:80`), plus the `apCostOf` import if nothing else in the file uses it.

- [x] **Step 4: Update the component specs and pin the absence**

In `BuffLoadoutPanel.test.tsx` and `WarCouncilRound.actionBar.test.tsx`, drop the removed props from every render and remove assertions on AP text. Add one case asserting the loadout dialog's text content contains neither `'AP'` nor `'action point'`, queried by role and label per the skill's testing rule.

NOTE (Implementer): also fixed `ActionBar.test.tsx`, a forced caller (compiler-broken by the `ActionBarProps` change, not named in this task's Files block), the same way.

- [x] **Step 5: Verify the felt components**

Run: `npx vitest run src/app/warCouncil/__tests__/BuffLoadoutPanel.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.actionBar.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.
RESULT: 51 tests passed across the 4 affected component/label spec files; `tsc -b` exit 0.

### Task 7: Take the action-point purchase off the shelf — `shop.ts`, `shopLabels.ts`, `ShopPanel.tsx` ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/hunt/shop.ts:26-38,230-240`, `src/app/run/shopLabels.ts:1-30`, `src/app/run/ShopPanel.tsx:1-60,85-95,145-158`
- Test: `src/hunt/__tests__/shop.test.ts`, `src/app/run/__tests__/ShopPanel.test.tsx`, `src/app/run/__tests__/shopLabels.test.ts`

- [x] **Step 1: Drop `ApCapacity` from `SHOP_ITEMS`**

In `src/hunt/shop.ts`:

```ts
/** DLR-145 AC3 — the action-point purchase leaves the shelf: with `AP_ENABLED` false it has
 *  nothing to sell. It keeps its `ShopItem` member, its `priceOf` row, its `categoryOf` rung and
 *  its `refusalFor` handling, exactly as DLR-116 kept Cheat, Timebomb, Blast Guard and Whetstone —
 *  no mechanic is deleted, only this list changed. */
export const SHOP_ITEMS: readonly ShopItem[] = [
  ShopItem.SwanTier,
  ShopItem.WitchTier,
  ShopItem.Heal,
]
```

Correct `canBuyAnything`'s docblock (`:230-240`), which currently states "AP capacity has no cap, so a coin always buys it" — that is no longer true and it is the predicate the verdict's Continue warning fires on.

- [x] **Step 2: Remove the AP purse cell and its label**

Delete `SHOP_AP_LABEL` from `src/app/run/shopLabels.ts:26-27`. Keep `SHOP_ITEM_NAME[ShopItem.ApCapacity]` and `SHOP_ITEM_BLURB[ShopItem.ApCapacity]` — both `Record`s are total over `ShopItem`. In `ShopPanel.tsx`, delete the `apCapacity` prop, its destructuring, its `ActionPoints` import and the whole second `<span className="shop-purse-cell">`. Per `mockup.html`'s purse, the remaining cells are Coins and Health; confirm the `.shop-purse` flex row still reads as a deliberate group at two cells rather than as one with a gap.

NOTE (Implementer): the real `ShopPanel.tsx` (unlike the mockup) already renders Health as its own `.shop-health` meter row outside `.shop-purse` — a prior ticket's deliberate design ("it is what a heal is bought against, so it gets the width to be counted at a glance"). `.shop-purse` after this step therefore carries exactly one cell (Coins), not two. I left that structure alone rather than folding Health into the purse to match the mockup's simplified wireframe, since the mockup's own callout states it is "not standing in for the visual identity of the real screens, which already exist and are not being restyled." Whether a one-cell `.shop-purse` group reads as deliberate rather than as a gap is a browser-only question — flagged under Developer Decisions below.

- [x] **Step 3: Update the three specs**

`shop.test.ts` — assert `SHOP_ITEMS` excludes `ApCapacity` while `priceOf(ShopItem.ApCapacity)` still returns `AP_CAPACITY_PRICE`. `ShopPanel.test.tsx` — drop the `apCapacity` prop and any assertion on the AP cell; add one asserting the purse group's text contains no `'Action points'`. `shopLabels.test.ts` — remove the `SHOP_AP_LABEL` case.

NOTE (Implementer): `shopLabels.test.ts` had no `SHOP_AP_LABEL` case to remove — nothing to do there.

- [x] **Step 4: Run the shop specs**

Run: `npx vitest run src/hunt/__tests__/shop.test.ts src/app/run/__tests__/ShopPanel.test.tsx src/app/run/__tests__/shopLabels.test.ts`
Expected: Vitest reports 0 failed.
RESULT: 3 files passed, 80 tests passed.

### Task 8: Extract `shopRefusalsFor` and bring `src/App.tsx` under budget ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/run/shopRefusals.ts`
- Create: `src/app/run/__tests__/shopRefusals.test.ts`
- Modify: `src/App.tsx:1-15,320-345,395-405`

- [x] **Step 1: Write the failing test for a total refusal map**

```ts
import { describe, expect, it } from 'vitest'
import { ShopItem, PurchaseRefusal, ALL_BRONZE } from '../../../hunt'
import { shopRefusalsFor } from '../shopRefusals'

const stock = { coins: 5, playerHealth: 10, maxPlayerHealth: 20, blastGuardHeld: false, rankTiers: ALL_BRONZE }

describe('shopRefusalsFor', () => {
  it('answers for every ShopItem the union declares', () => {
    const refusals = shopRefusalsFor(stock)
    for (const item of Object.values(ShopItem)) {
      expect(Object.prototype.hasOwnProperty.call(refusals, item)).toBe(true)
    }
  })

  it('refuses a heal at full health and nothing else for that reason', () => {
    const full = shopRefusalsFor({ ...stock, playerHealth: 20 })
    expect(full[ShopItem.Heal]).toBe(PurchaseRefusal.AlreadyFullHealth)
  })

  it('refuses everything priced above the purse for want of coins', () => {
    expect(shopRefusalsFor({ ...stock, coins: 0 })[ShopItem.Heal]).toBe(PurchaseRefusal.NotEnoughCoins)
  })
})
```

- [x] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/app/run/__tests__/shopRefusals.test.ts`
Expected: a collection error — `shopRefusals.ts` does not exist yet.
RESULT: confirmed — `Error: Cannot find module '../shopRefusals'`.

- [x] **Step 3: Write the module**

```ts
import { refusalFor, ShopItem, type PurchaseRefusal, type ShopStock } from '../../hunt'

/**
 * Every `ShopItem`'s refusal in one pass. DERIVED from the union rather than hand-listed: this was
 * an eight-row literal inside `App.tsx` that had to be edited by hand whenever `ShopItem` gained a
 * member, and a missing row was an `undefined` the panel rendered as "buyable". Pure, and testable
 * with no renderer. Reads `refusalFor` — never a second reading of the shop's rules.
 */
export function shopRefusalsFor(
  stock: ShopStock,
): Readonly<Record<ShopItem, PurchaseRefusal | null>> {
  const refusals = {} as Record<ShopItem, PurchaseRefusal | null>
  for (const item of Object.values(ShopItem)) {
    refusals[item] = refusalFor(stock, item)
  }
  return refusals
}
```

- [x] **Step 4: Use it in `App.tsx` and remove both `apCapacity` props**

Replace the eight-row `refusals={{ … }}` literal with `refusals={shopRefusalsFor(stock)}`, delete `apCapacity={apCapacityFor(run.apCapacityBonus)}` at both `:325` and `:403`, and drop the `apCapacityFor` import if nothing else uses it.

NOTE (Implementer): `:403`'s `apCapacity` prop is `WarCouncilRound`'s, not `ShopPanel`'s a second time — it was already optional on `WarCouncilMountProps` (defaulted inside `createRoundUiState`), so deleting the JSX prop needed no interface change.

- [x] **Step 5: Measure `App.tsx` against the blocking budget**

Run: `npx vitest run src/app/run/__tests__/shopRefusals.test.ts; npm run typecheck; (Get-Content src\App.tsx).Count`
Expected: Vitest reports 0 failed, `tsc -b` exits 0, and the count is at or below 400 (it was 410 before this task). If it is still over, extract the next cohesive block — the run-verdict branch is the largest remaining one — rather than leaving the breach.
RESULT: 3 tests passed, `tsc -b` exit 0, `App.tsx` is 399 lines — under budget without needing the run-verdict extraction.

---

## Phase 3 — The pared pool

73 templates become 13 by narrowing the template's own kind and axis types, so a cut family or a cut axis is unconstructible rather than merely unweighted. The eight cut families keep their `BuffKind` members, prices, `buffFires` cases and cadence rows — see `plan.md` Part 1 → Assumptions made. The phase ends type-checking because the two `src/sim/` consumers that stop compiling under the narrowing are fixed inside it.

### Task 9: Narrow the template pool to 13 — `src/hunt/buffTemplates.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffTemplates.ts:1-160`
- Test: `src/hunt/__tests__/buffTemplates.test.ts`, `src/hunt/__tests__/buffTemplates.activated.test.ts`

- [x] **Step 1: Write the failing test for AC4's exact 13**

Replace the pool-size expectations in `src/hunt/__tests__/buffTemplates.test.ts`:

```ts
it('holds exactly the 13 templates DLR-145 AC4 names', () => {
  expect(BUFF_TEMPLATES).toHaveLength(13)
  expect(BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.Taker)).toHaveLength(6)
  expect(BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.Feeder)).toHaveLength(3)
  expect(BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.Sidestep)).toHaveLength(2)
  expect(BUFF_TEMPLATES.filter((t) => t.form === 'activated')).toHaveLength(2)
})

it('mints no card on a cut reward axis', () => {
  for (const template of BUFF_TEMPLATES) {
    if (template.form !== 'condition') continue
    expect([BuffRewardAxis.Magnitude, BuffRewardAxis.Multiplier]).toContain(template.axis)
  }
})

it('every Feeder pays on Blade only', () => {
  const feeders = BUFF_TEMPLATES.filter((t) => t.kind === BuffKind.Feeder)
  expect(feeders.every((t) => t.form === 'condition' && t.axis === BuffRewardAxis.Magnitude)).toBe(true)
})
```

- [x] **Step 2: Run it and confirm it fails at 73**

Run: `npx vitest run src/hunt/__tests__/buffTemplates.test.ts`
Expected: the length case fails reporting 73.
RESULT: confirmed — the new suite failed with `BUFF_TEMPLATES` at 73 before the narrowing.

- [x] **Step 3: Narrow the types and prune the family table**

In `src/hunt/buffTemplates.ts`, add above `ConditionBuffTemplate`:

```ts
/** DLR-145 AC5 — the three condition families a template can still mint. The other eight stay
 *  DECLARED on `BuffKind`, keep their `CONDITION_MODIFIER` price, their `buffFires` case and their
 *  `BUFF_CADENCE` row; they are simply unreachable, exactly as DLR-116 left Cheat, Timebomb, Blast
 *  Guard and Whetstone priced but off the shelf. Restoring one is a row in `TEMPLATE_FAMILIES`. */
export type MintableConditionKind =
  | typeof BuffKind.Taker
  | typeof BuffKind.Feeder
  | typeof BuffKind.Sidestep

/** DLR-145 AC5 — Blade and Momentum. `coins` and `apRefund` stay on `BuffRewardAxis` and keep
 *  their `REWARD_BASE` and `REWARD_TIER_VALUE` ladders; narrowing HERE is what makes a
 *  coins-paying card unconstructible rather than merely unweighted. */
export type MintableRewardAxis =
  | typeof BuffRewardAxis.Magnitude
  | typeof BuffRewardAxis.Multiplier
```

Change `ConditionBuffTemplate.kind` to `MintableConditionKind` and `.axis` to `MintableRewardAxis`. Change `TemplateFamily.kind` to `MintableConditionKind`, its `param` to `'suit'` only, and `makeTemplate`'s two parameters to match. Delete `ALL_FOUR_AXES`, `ALL_TARGET_RANKS` and the `family.param === 'rank'` branch of `templatesForTemplateFamily`. Replace `TEMPLATE_FAMILIES`:

```ts
const TEMPLATE_FAMILIES: readonly TemplateFamily[] = [
  { kind: BuffKind.Taker, axes: BLADE_AND_MOMENTUM, param: 'suit' },
  // Feeder is Blade-only: `buffFires` reads it as `!ctx.playerWon`, which covers BOTH a clean loss
  // and a dodge. Momentum pays on the dodge half and is wiped by the clean loss, which resets the
  // multiplier it just raised. Blade pays on both. Restoring its Momentum version is one entry.
  { kind: BuffKind.Feeder, axes: [BuffRewardAxis.Magnitude], param: 'suit' },
  { kind: BuffKind.Sidestep, axes: BLADE_AND_MOMENTUM },
]
```

Update the module docblock and `BUFF_TEMPLATES`' own docblock: both still claim 71 generated and 73 total. `REWARD_TIER_VALUE`, `CONDITION_THRESHOLD`, `BuffThresholdFamily`, `conditionThresholdOf`, `TemplateGrant`, `templateById` and `mintGrants` are all unchanged — `buffFires` still reads the threshold table for the four families it still declares.

- [x] **Step 4: Confirm the pool and check what the narrowing broke**

Run: `npx vitest run src/hunt/__tests__/buffTemplates.test.ts src/hunt/__tests__/buffTemplates.activated.test.ts; npm run typecheck`
Expected: both specs report 0 failed. `tsc -b` is expected to FAIL here, naming `src/hunt/slotWeights.ts` and `src/sim/openingPileVariants.ts` — that is the narrowing proving it has teeth, and Tasks 10 and 11 close it inside this phase.
RESULT: both specs 0 failed (17 tests). `tsc -b` failed as predicted, naming `src/sim/__tests__/cardAwarePolicy.test.ts`, `src/sim/__tests__/openingPileVariants.test.ts` and `src/sim/openingPileVariants.ts` — `slotWeights.ts` itself still compiled at this point (its `SlotFamilyWeights`/`SlotAxisWeights` types were still keyed on the WIDE `BuffConditionKind`/`BuffCostAxis`, a superset of the narrowed template types, so assignment stayed legal until Task 10 narrowed them on purpose).

### Task 10: Prune the weight tables and add a with-replacement draw — `src/hunt/slotWeights.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/slotWeights.ts:18-100,140-174`
- Test: `src/hunt/__tests__/slotWeights.test.ts`

- [x] **Step 1: Narrow the two weight tables, keeping every surviving number**

```ts
export type SlotTemplateKind = MintableConditionKind | BuffActivatedTemplateKind
export type SlotFamilyWeights = Readonly<Record<SlotTemplateKind, number>>
export type SlotAxisWeights = Readonly<Record<MintableRewardAxis, number>>
```

`SLOT_FAMILY_WEIGHTS` drops the eight cut families, keeping Skirmisher at Taker 5 / Feeder 4 / Sidestep 2 / Cheat 3 / Timebomb 3 and Strongbox at Taker 2 / Feeder 2 / Sidestep 1 / Cheat 1 / Timebomb 1. `SLOT_AXIS_WEIGHTS` drops Coins and ApRefund, keeping Skirmisher at Magnitude 3 / Multiplier 3 and Strongbox at Magnitude 1 / Multiplier 1. **No figure is chosen or changed** — every surviving value is the one already on disk. Add a comment recording that Strongbox's coin/refund lean went with those axes and that no replacement lean has been chosen (`tasks.md` → Developer decides or observes).

- [x] **Step 2: Write the failing test for the with-replacement draw**

```ts
describe('weightedDrawWithReplacement (DLR-145)', () => {
  const scripted = (values: number[]): Rng => { let i = 0; return () => values[i++ % values.length] }

  it('draws MORE items than there are candidates', () => {
    expect(weightedDrawWithReplacement(['a', 'b'], () => 1, scripted([0.1, 0.9, 0.1]), 5)).toHaveLength(5)
  })

  it('can return the same candidate twice', () => {
    expect(weightedDrawWithReplacement(['a', 'b'], () => 1, scripted([0.1]), 3)).toEqual(['a', 'a', 'a'])
  })

  it('never draws a zero-weighted candidate', () => {
    const drawn = weightedDrawWithReplacement(['a', 'b'], (x) => (x === 'a' ? 0 : 1), scripted([0.1, 0.5, 0.9]), 3)
    expect(drawn).toEqual(['b', 'b', 'b'])
  })

  it('returns empty rather than dividing when the total weight is zero', () => {
    expect(weightedDrawWithReplacement(['a', 'b'], () => 0, scripted([0.5]), 3)).toEqual([])
  })

  it('does not mutate the candidate array', () => {
    const candidates = ['a', 'b']
    weightedDrawWithReplacement(candidates, () => 1, scripted([0.5]), 4)
    expect(candidates).toEqual(['a', 'b'])
  })
})
```

- [x] **Step 3: Run it and confirm it fails**

Run: `npx vitest run src/hunt/__tests__/slotWeights.test.ts`
Expected: a collection error naming `weightedDrawWithReplacement` as not exported.
RESULT: confirmed — collection failed, `weightedDrawWithReplacement` not exported by `../slotWeights`.

- [x] **Step 4: Write the draw, as `weightedDrawWithoutReplacement`'s stated sibling**

```ts
/**
 * DLR-145 — `weightedDrawWithoutReplacement`'s sibling, for a draw where a REPEAT IS THE POINT
 * rather than a bug: an opening pile of 20 from a 13-template pool, where three Bell-Takers is the
 * intended shape (design §3.4). EXACTLY ONE `rng()` call per item drawn, with the same
 * last-candidate fallback that catches float drift, and the total computed once because — unlike
 * the without-replacement version — the pool never changes.
 *
 * Returns EMPTY, not a short draw, when the candidates or the total positive weight are zero: a
 * caller asking for 20 from an all-zero table must not receive 19. Never mutates `candidates` and
 * never divides, so no `NaN` can reach a running weight total.
 */
export function weightedDrawWithReplacement<T>(
  candidates: readonly T[],
  weightOf: (item: T) => number,
  rng: Rng,
  count: number,
): readonly T[] {
  const total = candidates.reduce((sum, item) => sum + (weightOf(item) ?? 0), 0)
  if (candidates.length === 0 || total <= 0) return []

  const drawn: T[] = []
  while (drawn.length < count) {
    let threshold = rng() * total
    let index = candidates.length - 1
    for (let i = 0; i < candidates.length; i++) {
      threshold -= weightOf(candidates[i]) ?? 0
      if (threshold < 0) {
        index = i
        break
      }
    }
    drawn.push(candidates[index])
  }
  return drawn
}
```

- [x] **Step 5: Verify the module**

Run: `npx vitest run src/hunt/__tests__/slotWeights.test.ts src/hunt/__tests__/slotMachine.test.ts`
Expected: Vitest reports 0 failed. `drawReelPool` still draws `REEL_POOL_SIZE` (8) distinct templates from 13 with every surviving family weighted ≥ 1 on both machines.
RESULT: 40 tests passed (2 files). The pre-existing "leans the two machines in opposite directions" case was replaced with a comment — it compared `Glutton`'s share against `Hoarder`/`Unbloodied`'s, all three now pruned from `SLOT_FAMILY_WEIGHTS`, and Strongbox's coin/refund axis lean is gone with those axes; there is no lean left in the surviving 5-family/2-axis tables to assert, and inventing a replacement lean is a developer decision this ticket does not make.

### Task 11: Update `src/sim/` for the reduced pool ✓

- Skill: react-frontend

**Files:**
- Modify: `src/sim/openingPileVariants.ts:20-115`, `src/sim/baselinePolicy.ts:80-95,190-245`, `src/sim/policies.ts:10-32`, `src/sim/index.ts:5-30`
- Test: `src/sim/__tests__/reachability.test.ts`, `src/sim/__tests__/openingPileVariants.test.ts`, `src/sim/__tests__/baselinePolicy.test.ts`, `src/sim/__tests__/cardAwarePolicy.test.ts`

- [x] **Step 1: Trim the superseded opening-pile variants**

Delete `EXCLUDED_OPENING_KINDS`, `EXCLUDED_OPENING_AXIS`, `COINS_WEIGHT_FACTOR`, `SIDESTEP_WEIGHT_FACTOR`, `conditionsOnlyOpeningWeightOf` and `recommendedOpeningWeightOf` from `src/sim/openingPileVariants.ts`, and empty `OPENING_PILE_VARIANTS`. **Keep `withOpeningPile` and the exported `OPENING_PILE_VARIANTS` map**, so `SimConfig.openingPileVariant`, `playRun.ts:36` and the `--pile` flag need no edit. Replace the module docblock: the reduced pool now *is* the recommendation those variants existed to measure, and two of them cannot compile against the narrowed template axis. Remove the matching exports from `src/sim/index.ts:20-28` and rewrite `src/sim/__tests__/openingPileVariants.test.ts` down to `withOpeningPile`'s own determinism and pile-length cases.

- [x] **Step 2: Delete the AP-capacity-focused policy**

Remove `apCapacityFocusedShopAction` and `apCapacityFocusedPolicy` from `src/sim/baselinePolicy.ts`, the `ShopItem.ApCapacity` entry at `:87`, the `apCapacityFocused` key from `src/sim/policies.ts:29`, and both imports. It exists only to exercise the lever this ticket removes; left in place it would spend coins on nothing and distort every future comparison. Drop its cases from `baselinePolicy.test.ts` and `cardAwarePolicy.test.ts`.

NOTE (Implementer): `cardAwarePolicy.test.ts` had no `apCapacityFocused` cases to drop (it never imported that policy) — nothing to do there for this step. It DID need a separate fix: its `markOfRankFor` fixture built a Buff through `BUFF_TEMPLATES.find(kind === MarkOfRank)`, and Mark of Rank has no surviving template after Task 9 — changed it to construct the `Buff` literal directly (Mark of Rank stays declared on `BuffKind`, just unmintable).

- [x] **Step 3: Update the reachability audit's expectations**

In `src/sim/__tests__/reachability.test.ts`, the mintable set becomes the five kinds `taker`, `feeder`, `sidestep`, `cheat`, `timebomb`; `BUFF_TEMPLATES.length` becomes 13; the unreachable set grows from 6 to 14 (the previous 6 plus the 8 cut families) and the partition case must still hold. Add `ShopItem.ApCapacity` to the "not on the shelf" case. Rewrite each PINNED GAP comment to name DLR-145 as the ticket that widened the gap and to state that the eight cut families are deliberately declared-but-unreachable, not a defect.

- [x] **Step 4: Confirm the phase type-checks and the sim specs pass**

Run: `npx vitest run src/sim; npm run typecheck`
Expected: Vitest reports 0 failed and `tsc -b` exits 0 — closing the failure Task 9 Step 4 predicted.
RESULT: `tsc -b` exits 0 (confirmed twice). `npx vitest run src/sim` initially reported 18 failed across 4 files — 16 of those were fixture breakage in files OUTSIDE this task's list (`src/hunt/__tests__/buffEvaluation.test.ts`, `run.test.ts`, `timebomb.test.ts`), all constructing buffs via `templatesForFamily`/`templateById` for now-cut families or a now-cut axis; fixed the same way as `cardAwarePolicy.test.ts` above (direct `Buff` literals for the eight still-declared, no-longer-mintable families) and, for `run.test.ts`/`timebomb.test.ts`, loosened two seed-42-specific Cheat-count assertions that the pool's smaller candidate set now legitimately breaks (the opening draw can itself pick a `cheat` template, on top of the guaranteed `RUN_STARTING_CHEATS` tail). Final count for `src/sim` alone: 2 failed, 748 passed — see Notes for the two `src/sim/__tests__/playHand.test.ts` failures left OPEN, in a file outside every task in this phase.

---

## Phase 4 — Twenty cards, ten coins, and no cap ✓

**Carried-forward repairs (Tasks A–C, dispatched alongside this phase, not tracked as numbered tasks in this file per the dispatch instructions):**

- **Task A** — `src/sim/playHand.ts`'s `pendingActive` snapshot looked up an activated id in `offeredBuffs(ui)` alone, missing the union with `ui.buffActivation.spentThisTrick` that `buffHandInputFor` already applies — a consumed Taker/Feeder/Sidestep was silently dropped from `buffFireOutcomes` even though `buffsActivated` counted it. Diagnosis confirmed against `buffRoundState.ts`'s `buffHandInputFor` before editing, matched the dispatch's own diagnosis exactly. Fixed with the same union, reusing `offeredBuffs` plus `ui.buffActivation.spentThisTrick` directly (no third helper was reachable from `src/sim/` without breaking the pure-core boundary, since `buffHandInputFor` itself lives in `src/app/warCouncil/`, a DOM-adjacent tree `src/sim/` already imports selectively but which is not a pure-core-boundary concern here — the union is two array spreads, not enough logic to warrant extracting a shared helper across the boundary). Comment added naming DLR-145 and `buffHandInputFor` as the sibling. Second failing case's premise repaired by overriding `chooseBuffs: () => []` on the test policy, isolating the `wantsCheatPlay` lever under test from the ordinary buff window's own (now-real) Cheat consumption — not weakened to a tautology; still asserts `cheatsArmed === 0` and the held-Cheat-count invariant.
- **Task B** — folded into Task 12: the "73 templates" docblock paragraph in `startingPile.ts` was rewritten as part of the WITH-REPLACEMENT docblock rewrite Task 12 Step 3 already required (same paragraph's neighbourhood).
- **Task C** — grep run per the dispatch's `Expected: zero hits` after Tasks 12–14 and B; returned zero hits both before the timebomb.test.ts repair and after. No stale-figure hit required a fix under this task's own grep.
- **`src/sim/playHand.ts`'s 400-line budget** — Task A's fix grew the file from 443 to 448 measured lines (`(Get-Content <path>).Count`), and it was already over budget (443) before this phase touched it. Per the skill's hard floor ("no file created or grown past 400 lines... over 400 is blocking, split it in the same change") and this project's standing rule to fix a breach in-ticket rather than hand it back, split the three between-tricks window helpers (`seedFor`, `runDiscard`, `runCheatPlay`, `runBuffWindow`, plus their private outcome interfaces) into a new file, `src/sim/playHandWindows.ts` (211 lines). `playHand.ts` now measures 255 lines and imports the four functions from the new file; `seedFor` is re-exported from `playHand.ts` so `fixtures.ts`'s existing `import { playHand, seedFor } from './playHand'` needed no change. Both files typecheck and lint clean (the pure-core/lint-enforced-pure boundary on `src/sim/` is unaffected — no new React or DOM import).
- **`src/hunt/__tests__/timebomb.test.ts`** — four cases broke as a direct, in-scope consequence of Task 13's `STARTING_BUFF_COUNT: 4 → 20` change: Timebomb is an ordinary weighted-pool member (`SLOT_FAMILY_WEIGHTS`), exactly as Cheat already was under DLR-132, so `startRun()`'s default-seed opening pile can now legitimately draw one before the shop is ever reached. Fixed the same way `run.test.ts` and this same file's own "does NOT add a Cheat" case were already fixed under DLR-132/Task 11 — before/after diffs against the pile's own Timebomb count rather than an assumed zero baseline. One test ("opens a run holding no Timebomb buffs") asserted an invariant that is simply no longer true and was removed with a comment explaining why, mirroring the existing DLR-127/DLR-145 comment pattern in the same file. Net: 754 → 753 tests in `src/hunt` (one test removed, not weakened).



The three tuning constants the ticket names, plus the draw change that has to land before one of them. `STARTING_BUFF_COUNT = 20` against a 13-template pool would make `seedStartingBuffPile` throw at every `startRun`, so Task 12 comes first and Task 13 second — that ordering is load-bearing, not cosmetic.

### Task 12: Draw the opening pile with replacement — `src/hunt/startingPile.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/startingPile.ts:60-85`
- Test: `src/hunt/__tests__/startingPile.test.ts`

- [x] **Step 1: Write the failing test for a pile larger than the pool**

```ts
it('draws more cards than there are templates, with duplicates (DLR-145 AC6)', () => {
  const pile = seedStartingBuffPile(20, 1, createSeededRng(startingPileSeedFor(1)))
  expect(pile).toHaveLength(20)
  expect(pile.every((buff) => buff.tier === BuffTier.Bronze)).toBe(true)
  expect(pile.map((buff) => buff.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  expect(new Set(pile.map((buff) => buff.kind)).size).toBeLessThanOrEqual(5)
})

it('is reproducible from the same seed', () => {
  const first = seedStartingBuffPile(20, 1, createSeededRng(startingPileSeedFor(42)))
  const second = seedStartingBuffPile(20, 1, createSeededRng(startingPileSeedFor(42)))
  expect(first.map((b) => b.kind + b.reward.axis)).toEqual(second.map((b) => b.kind + b.reward.axis))
})

it('still throws on an all-zero weight table', () => {
  expect(() => seedStartingBuffPile(20, 1, createSeededRng(1), () => 0)).toThrow(RangeError)
})
```

- [x] **Step 2: Run it and confirm the first case throws**

NOTE (Implementer): per the batching policy, the red-check collapsed into the phase-end run (Step 4) rather than a separate interim invocation — the source edit (Step 3) was applied in the same pass as the test edit. Confirmed instead that Task 12's own Vitest run (Step 4) is 0 failed, and separately re-ran the pre-existing `npx vitest run src/sim/__tests__/playHand.test.ts` before touching anything, which showed the two carried-forward failures Task A fixes — establishing the starting state was observed, just not this specific interim red.

- [x] **Step 3: Switch the draw**

In `seedStartingBuffPile`, replace `weightedDrawWithoutReplacement` with `weightedDrawWithReplacement` and update the import. Rewrite the paragraph of its docblock that promises distinct cards:

```
 * Drawn WITH REPLACEMENT as of DLR-145: the pool is 13 templates and the opening pile is 20 cards,
 * so distinctness is arithmetically impossible — and it is also not wanted. Three bronze Bell-Takers
 * is exactly the shape design §3.4's "one fight's ammunition" describes. The short-draw THROW is
 * kept and still means what it always meant: an all-zero weight table, which is a configuration bug
 * rather than a legal state.
```

Keep the `drawn.length !== count` guard and its error message.

- [x] **Step 4: Verify**

Run: `npx vitest run src/hunt/__tests__/startingPile.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.
RESULT: 14 tests passed (1 file); `tsc -b` exit 0.

### Task 13: Set the two run constants — `src/hunt/config.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/config.ts:194-206`, `src/hunt/rankTiers.ts:157`
- Test: `src/hunt/__tests__/config.test.ts`, `src/hunt/__tests__/run-buffs.test.ts`, `src/hunt/__tests__/run.grants.test.ts`

- [x] **Step 1: Move both values and record their source**

```ts
// DLR-105 AC3, superseded by DLR-145 AC6 — the run's opening buff-pile size, all bronze.
// TRANSCRIBED FROM DLR-145 (design §3.4): a fight runs two to four hands at six tricks each, so
// firing about one card a trick makes twenty close to exactly one fight's ammunition — the player
// reaches the first shop nearly empty, with coins to restock. Drawn WITH REPLACEMENT from a
// 13-template pool (`startingPile.ts`), so the pile holds duplicates by design.
// UNIT: buffs granted once, at the start of a run, all at BuffTier.Bronze.
export const STARTING_BUFF_COUNT = 20

// DLR-84 AC1, superseded by DLR-145 AC7 — what beating an opponent pays. TRANSCRIBED FROM DLR-145,
// not chosen here. Credited by `recordEncounter`.
// UNIT: coins, credited once per encounter won.
export const COINS_PER_ENCOUNTER_WIN: Coins = 10
```

- [x] **Step 2: Correct the prose that quotes the old figure**

`src/hunt/rankTiers.ts:157` states "`COINS_PER_ENCOUNTER_WIN` is 1, a slot reroll is 1, Heal / Cheat / Blast Guard are 1, Timebomb…". Update the figure to 10 and the sentence's conclusion, which currently reasons from a one-coin income about what a rank step is worth.

- [x] **Step 3: Confirm every reader follows the constants**

Run: `npx vitest run src/hunt/__tests__/config.test.ts src/hunt/__tests__/run-buffs.test.ts src/hunt/__tests__/run.grants.test.ts src/hunt/__tests__/run.test.ts src/hunt/__tests__/run.quickKill.test.ts src/hunt/__tests__/run.integration.test.ts`
Expected: Vitest reports 0 failed — every one of these reads the constant rather than the literal, so they should follow without edits. Any failure names a spec that hard-coded `4` or `1`; fix it to read the constant.
RESULT: 96 tests passed (6 files) — every listed spec followed the constant change with no edit needed. NOTE (Implementer): a seventh file OUTSIDE this task's list, `src/hunt/__tests__/timebomb.test.ts`, broke on the same change (its `startRun()` default-seed fixture could now legitimately draw a Timebomb into the 20-card opening pile, the same way `run.test.ts`/`timebomb.test.ts` already had to tolerate for Cheat under DLR-132/Task 11). Fixed in-ticket under the "breach caused by this ticket's own change" rule — see the phase's Notes below and Task A's report.

### Task 14: Remove the two per-hand reward caps — `src/hunt/apConfig.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/apConfig.ts:44-54`
- Test: `src/hunt/__tests__/apConfig.test.ts:24-40,60-75`, `src/hunt/__tests__/buffAccrual.test.ts`

- [x] **Step 1: Uncap the multiplier and flat-damage axes**

```ts
// UNIT: multiplier points per hand.
// DLR-145 AC9 — NO CAP. With rented cards a clipped contribution was harmless; with CONSUMED cards
// it silently destroys an irreplaceable card, and it bites hardest on exactly the high-tier cards
// that are the reward for reaching the shop. Design §3.3 option 1, in its "removed entirely" form:
// this is deliberately NOT a large chosen number — card scarcity is the only limit now. `Math.min`
// against Infinity is the identity for any finite total, so `accrueAxisBonus` needs no change.
// TO RESTORE A CAP, put a finite number back here; this is still the one place it lives.
export const MAX_MULTIPLIER_BONUS_PER_HAND = Number.POSITIVE_INFINITY
// UNIT: damage per hand.
export const MAX_FLAT_DAMAGE_BONUS_PER_HAND = Number.POSITIVE_INFINITY
```

`MAX_REFUND_PER_HAND` and `MAX_COIN_BONUS_PER_HAND` are untouched — their axes no longer mint.

- [x] **Step 2: Correct the caps' spec, which asserts every cap is an integer**

`src/hunt/__tests__/apConfig.test.ts:26-27` pins the two values at 6 and 12, and `:31-36` asserts `Number.isInteger(cap)` over all four. Replace with the two new values and split the loop: the two coin/refund caps stay integer and positive; the two uncapped axes assert `=== Number.POSITIVE_INFINITY`, with a comment naming DLR-145 AC9 so the next reader does not "fix" it back to an integer. Leave `:65-70`'s re-export mirror cases alone — they compare the two import paths and are value-agnostic.

- [x] **Step 3: Add the accrual case AC9 exists for**

In `src/hunt/__tests__/buffAccrual.test.ts`:

```ts
it('never clips a Momentum or Blade contribution, however many cards fire (DLR-145 AC9)', () => {
  const gold = (axis: BuffCostAxis, id: number) => buffPaying(axis, 5, id)
  let accrual = startHandAccrual()
  for (let i = 0; i < 12; i++) {
    accrual = accrueAxisBonus(accrual, BuffRewardAxis.Multiplier, 5)
    accrual = accrueAxisBonus(accrual, BuffRewardAxis.Magnitude, 5)
  }
  expect(accrual.multiplierBonus).toBe(60)
  expect(accrual.flatDamageBonus).toBe(60)
  expect(Number.isFinite(accrual.multiplierBonus)).toBe(true)
})
```

Correct any existing case in that file that asserts a contribution IS clipped at 6 or 12 on those two axes — that behaviour is what this task removes.

NOTE (Implementer): the plan's snippet for this step declares an unused `gold` helper referencing `BuffCostAxis`/`buffPaying`, neither imported nor used anywhere else in the file — dropped it as dead code rather than adding a fresh unused import. No hardcoded `toBe(6)`/`toBe(12)` case existed in this file to correct (grep confirmed), but one hardcoded-cap case DID exist under the DLR-125 cash-out `describe` block (`the accrued total still clips at its cap after a spend`), using `MAX_MULTIPLIER_BONUS_PER_HAND` as its expected value rather than a numeral — now failing because that value is `Infinity`. Rewrote it to assert the surviving invariant (`markCashOutPaid` deducts what was paid rather than resetting the running total) instead of a cap that no longer exists for this axis.

- [x] **Step 4: Verify the phase**

Run: `npx vitest run src/hunt/__tests__/apConfig.test.ts src/hunt/__tests__/buffAccrual.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.
RESULT: 26 tests passed (2 files); `tsc -b` exit 0.

---

## Phase 5 — Final verification

No production changes. Only checks that the cumulative work is clean, that the boundaries this project enforces still hold, and that AC10's statistical claim has been put to the simulator rather than assumed.

### Task 15: Confirm the pure-core boundary still holds ✓

- Skill: react-frontend

**Files:**
- Test: *(verification only — no file is edited)*

- [x] **Step 1: Grep the pure trees for React and DOM references**

Run: `Get-ChildItem src\hunt,src\warCouncil,src\sim -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage|Math\.random"`
Expected: zero hits. `Math.random` is included because this phase added a draw function to `src/hunt/` and the opening pile must stay reproducible from `runSeed`.
RESULT: 15 hits, all prose comments (`buffCatalog.ts`, `buffs.ts`, `buffTemplates.ts`, `rankTiers.ts`, `run.ts`, `seededRng.ts`, `slotMachine.ts`, `startingPile.ts`, `skulls.test.ts`, `encounterDeck.ts`, `fixtures.ts`) documenting that the module does NOT call `Math.random()` — no real `from 'react'`, `window.`/`document.`, storage global, or live `Math.random()` call anywhere in the three trees. Boundary holds.

### Task 16: Confirm no AP readout and no cut-family template survives ✓

- Skill: react-frontend

**Files:**
- Test: *(verification only — no file is edited)*

- [x] **Step 1: Grep the rendered app layer for action-point copy**

Run: `Get-ChildItem src\app,src\App.tsx -Recurse -Include *.ts,*.tsx | Select-String -Pattern "action point|\bAP\b|apPool|apCostFor|apCapacity|SHOP_AP_LABEL"`
Expected: zero hits outside `__tests__` files that assert the absence. A hit in `shopLabels.ts`'s `SHOP_ITEM_BLURB[ShopItem.ApCapacity]` row is expected and correct — that `Record` stays total over `ShopItem` while the item is off the shelf; confirm it is the only one.
RESULT: many more non-test hits than the one named — see the Notes section of the Implementer Report for the full classification. Every one of them is either (a) a doc comment explaining the `AP_ENABLED` design, (b) an internal identifier for the AP mechanism that is DELIBERATELY kept live under the hood (`apPool`/`apCapacity` fields on `BuffActivationState`/`roundUiState`/`warCouncilMount` — gated to free by `AP_ENABLED`, never displayed), or (c) a total-`Record`/exhaustive-`switch` entry for an unreachable member, the SAME pattern as the one hit this step names (`SHOP_ITEM_NAME[ShopItem.ApCapacity]`, `BUFF_ACTIVATION_REFUSAL_MESSAGE[InsufficientAp]`, `APPLY_DAMAGE_REFUSAL_MESSAGE[InsufficientAp]`, `buffRewardPhrase`'s `ApRefund` case). No actual rendered AP figure, label, or reachable refusal text was found — the readout removal itself holds; the step's "confirm it is the only one" undercounted how many total-map entries this same sanctioned pattern produces. Flagging as a planner-precision finding, not a regression.

- [x] **Step 2: Confirm the cut families reach no template and no weight table**

Run: `Get-ChildItem src\hunt\buffTemplates.ts,src\hunt\slotWeights.ts | Select-String -Pattern "MarkOfRank|Glutton|Hoarder|Unbloodied|DebtCollector|Miser|Cornered|Keepsake|BuffRewardAxis.Coins|BuffRewardAxis.ApRefund"`
Expected: hits ONLY in `buffTemplates.ts`'s `CONDITION_THRESHOLD` / `BuffThresholdFamily` block, which `buffFires` still reads for the four threshold families that remain declared. Zero hits in `slotWeights.ts`.
RESULT: `buffTemplates.ts` — hits in `CONDITION_THRESHOLD`/`BuffThresholdFamily` as expected, PLUS two hits in the separate `REWARD_TIER_VALUE` table (`BuffRewardAxis.Coins`/`BuffRewardAxis.ApRefund` rows) — a different but adjacent total-`Record` kept exhaustive over the whole `BuffRewardAxis` union for the same reason `CONDITION_THRESHOLD` stays exhaustive; no template can construct a Coins- or ApRefund-axis card (`MintableRewardAxis` excludes both). `slotWeights.ts` — one hit, NOT zero: line 41-42, a comment explaining that the eight cut families "simply have no row here any more". No cut family reaches an actual weight row in either file. Benign; not a regression.

### Task 17: Static gates, full suite, and the build ✓

- Skill: react-frontend

**Files:**
- Test: *(verification only — no file is edited)*

- [x] **Step 1: Warm the Vitest transform cache, then typecheck, lint and run the whole suite**

RESULT (QA, verification round): PASS. `npx vitest run --project node` 115 files / 1603 tests passed; `--project dom` 28 files / 270 tests passed; `npm run typecheck` clean; `npm run lint` clean; `npm test` unfiltered **143 files / 1873 tests passed, 0 failed**.

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all exit 0; Vitest reports 0 failed. The two project-scoped runs first are deliberate — a cold-cache `npm test` can report a `[vitest-pool-runner]` worker-start timeout on the `dom` project, which is infrastructure and not a failing test.

- [x] **Step 2: Check formatting of the files this contract changed only**

RESULT (QA, verification round): PASS — "All matched files use Prettier code style!". Round 1 failed here on 14 files; the fix pass ran `prettier --write` on exactly those paths.

Run: `npx prettier --check src/hunt src/sim src/app/run src/app/warCouncil src/App.tsx`
Expected: exits 0. Do NOT run `npm run format` — it is `prettier --write` across the whole repo and rewrites ~59 untouched markdown files.

- [x] **Step 3: Production build**

RESULT (QA, verification round): PASS — exit 0, `dist/` written (`index.html`, `index-BWLlzYWt.css` 41.67 kB, `index-DNDpeZ09.js` 304.19 kB), no bundler errors.

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 18: Put AC10 and AC11 to the simulator ✓

- Skill: play-tester

**Files:**
- Test: *(verification only — no file is edited)*

- [x] **Step 1: Run the simulator against the reduced pool**

Run: `npm run sim -- --runs 200 --seed 1`
Expected: completes with a report and a zero exit code — AC11's second half. A `RangeError` naming the opening pile means Task 12 did not land before Task 13.
RESULT: completed, exit 0. `won: 0  lost: 200  stalled: 0` (full-run win rate — see Step 2's per-fight breakdown, which is the figure AC10 actually asks about), `mean fight reached: 1.60`, `mean AP spent per hand: 0.00`, `NoEffectYet refusals: 0`, `Faults: none`, `stalled runs: 0`. No `RangeError` — the opening pile drew fine.

- [x] **Step 2: Measure AC10's two claims through the `play-tester` skill**

Invoked `play-tester`. Every fact needed (`RunReport.fightsWon`, `HandReport.handOfFight`/`tricksPlayed`/`buffsActivated`) already exists on `SimSummary` — no engine or instrumentation change was needed, so a small disposable query script (deleted after use, per the skill's data-lifecycle rule) drove `simulate` from `src/sim` directly, at 200 runs, seed 1 (and a second batch at seed 7 to rule out one unlucky batch), against `baseline` and `noBuffs` (`src/sim/baselinePolicy.ts`'s existing zero-activation policy).

**Measured, baseline policy, 200 runs, seed 1 (seed 7 batch below in Notes, same shape):**
- Fight 0 (Aoife) won at all: 177/200 (88.5%).
- **(a) beat Aoife on trick 1 or 2 of hand 1 while activating a bronze card: 0/200 (0.0%).** The earliest observed win across every sampled run was trick 3 of hand 1; most winning hand-1s ran 4–6 tricks even with a maximal-activation policy (7–13 buffs activated that hand). Re-run at seed 7 confirmed the same 0.0%.
- **(b) beat Aoife with zero buffs activated the whole fight, `noBuffs` policy: 102/200 (51.0%).** Seed 7 confirmed 52.5%.

**AC10 does NOT hold as stated.** Design §4's arithmetic predicts (a) is reachable on trick 1 or 2 — measured, it never happens, at either seed, under a policy that activates every legal buff every window. (b)'s "remains possible" claim is well supported (over half of runs), so that half of AC10 is fine; (a)'s specific "trick one or two" claim is the part contradicted. Flagging this as the single most important finding this phase produced, per the phase's own instruction — not glossing over it.

- [x] **Step 3: Record what a browser pass would have checked**

No browser pass runs on this contract unless `--browser` was requested. Record, for the developer's eyes-on list: the buff loadout panel at 21 rows (does it scroll, do rows stay ≥44px, does the two-tap spend still read); the action bar's Apply Buff figure now reading only a held count; the shop purse — CORRECTION per Task 7's own note, `.shop-purse` carries exactly ONE cell (Coins; Health is its own meter row outside the group) after this contract, not two, so the eyes-on question is whether that one-cell group still reads as deliberate rather than as a gap; and that spending a card visibly removes its row while the trick still pays out. No browser pass was run — none of this was observed, only listed, per this contract's off-by-default browser policy.

### Task 19: Write the PR description ✓

- Skill: none — a hand-off document, no TypeScript

**Files:**
- Create: `.claude/contract/DLR-145-consumable-buffs-no-action-points-pared-pool/pr-description.md`

- [x] **Step 1: Write `pr-description.md` for the developer to paste**

Include:
- A link to `plan.md` and `mockup.html` in this folder.
- A summary of the change: cards are spent, action points are gone, 73 templates become 13, 20 opening cards, 10 coins a fight, two reward caps removed.
- **The `spentThisTrick` addition and why it exists** — it is not in the ticket, and a reviewer who does not know that `buffHandInputFor` filters the pile will not see why it is needed.
- Every decision the developer must make and every behaviour they must judge by playing, copied from the File map's "Developer decides or observes" list.
- The measured AC10 figures from Task 18, and the verification results from Tasks 15–17.
- A note for future contributors on the convention this introduces: a card's single-use-ness is a per-family developer toggle (`ACTIVATED_CARD_SINGLE_USE`, `CONDITION_CARD_SINGLE_USE`) read only by `isConsumableItem`, and reverting one card is a one-line edit.
- A warning to clear local storage before playing, because Vault grants against cut templates are silently skipped.

---

## Self-review

**Spec coverage:**
- AC1 — `isConsumableItem` true for taker/feeder/sidestep, consumed via `activateFromPile`, does not return — Task 1; the retention that makes it actually pay, Tasks 2 and 3.
- AC2 — `AP_ENABLED` false, no rendered AP cost or pool, `InsufficientAp` unreachable — Tasks 4, 5, 6, 7; verified Task 16.
- AC3 — action-point purchase off the shelf, no dead control or empty region — Tasks 7 and 8.
- AC4 — exactly 13 templates in the named shape — Task 9.
- AC5 — eight families and two axes unmintable, reachability audit passes — Tasks 9, 10, 11.
- AC6 — `STARTING_BUFF_COUNT` 20, 20 activatable bronze cards drawn from the AC4 pool — Tasks 12 and 13.
- AC7 — `COINS_PER_ENCOUNTER_WIN` 10 — Task 13.
- AC8 — tier ladder unchanged; no task adds a tier, and `BuffTier` is not in any `Files:` block.
- AC9 — caps no longer destroy a consumed card — Task 14.
- AC10 — measured, not asserted — Task 18 Step 2.
- AC11 — typecheck, lint, test, and `npm run sim` — Tasks 17 and 18.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with an `Expected:` line.

**Type / name consistency:** `CONDITION_CARD_SINGLE_USE`, `ConsumedConditionKind`, `isConsumedConditionKind`, `spentThisTrick`, `MintableConditionKind`, `MintableRewardAxis`, `SlotTemplateKind`, `SlotAxisWeights`, `weightedDrawWithReplacement`, `shopRefusalsFor`, `AP_ENABLED`, `STARTING_BUFF_COUNT`, `COINS_PER_ENCOUNTER_WIN`, `MAX_MULTIPLIER_BONUS_PER_HAND` and `MAX_FLAT_DAMAGE_BONUS_PER_HAND` are spelled identically in every task that names them and match `plan.md` Part 2 → Data shapes. `buffLine`, `buffRowAccessibleName`, `applyBuffAccessibleName` and `applyDamageBarAccessibleName` keep their existing names and lose only parameters.

**Phase boundary cleanliness:**
- Phase 1 ends type-checking: the required `spentThisTrick` field lands with all ten of its construction sites (Task 2 Steps 3–4), and its one consumer in Task 3.
- Phase 2 ends type-checking: the four changed label signatures and all of their callers move inside the phase, and `App.tsx` compiles against the new `ShopPanel` props in Task 8.
- Phase 3 ends type-checking: Task 9's narrowing deliberately breaks `slotWeights.ts` and `openingPileVariants.ts`, and Tasks 10 and 11 close both before the phase ends — Task 11 Step 4 is the explicit confirmation.
- Phase 4 ends type-checking: Task 12 precedes Task 13, so `STARTING_BUFF_COUNT = 20` never meets a without-replacement draw, and Task 14 touches only two constant values and their specs.
- Phase 5 makes no production change at all.
