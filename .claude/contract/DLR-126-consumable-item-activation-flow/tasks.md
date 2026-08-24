# Tasks: DLR-126 — Engine: consumable-item activation flow

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Note:** this is an unattended sprint run. `plan.md` was **not** developer-confirmed at an `AskUserQuestion` gate — the run's dispatch instructed the planner to take each stated default and log it. Every such default is in `plan.md` Part 1 → Assumptions made and in the sprint log. No mockup was produced: Step 1.5b classified this as pure logic + config, the only `.tsx` edit in the file map is the two `onComplete({…})` object literals a new required result field forces, and no surface is designed here.

Status: COMPLETE
Started: 2026-08-24

**Goal:** Make spending a one-shot consumable real — the item leaves the owned pile at the spend and never returns, a counted-stack view is derivable, each of DLR-111's five consumables carries a typed effect descriptor, and the two whose effects are pure engine (Ward, Second Thoughts) actually fire.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/hunt/consumables.ts` — the whole consumable model: which kinds are one-shot items, each one's timing window and tier ladder, `ConsumableEffect`, the counted-stack view, `spendConsumable`, `absorbWithWard`.
- `src/hunt/__tests__/consumables.test.ts` — every rule in that module.
- `src/hunt/__tests__/ward.encounter.test.ts` — Ward's absorption inside `applyDamage`, mirroring `shield.encounter.test.ts`.

**Modified:**
- `src/hunt/buffActivation.ts` — `NoEffectYet` refusal, `BuffActivationStock.effectLive`, `activateFromPile`.
- `src/hunt/types.ts:105` — `EncounterState.wardAbsorbs`.
- `src/hunt/encounter.ts` — `NO_WARD`, seed in `startEncounter`, absorb in `applyDamage` ahead of blue hearts, `activateWard`, `hasWard`.
- `src/hunt/run.ts:70-120` — `recordEncounter`'s optional ninth parameter `buffs`.
- `src/hunt/index.ts` — public exports for everything new.
- `src/app/warCouncil/roundUiState.ts:381-392` — `buffActivationStock` delegates to `buffActivationStockFor` instead of restating it.
- `src/app/warCouncil/buffHandlers.ts:100-116` — `handleTapBuff` commits through `activateFromPile` and applies Ward / Second Thoughts.
- `src/app/warCouncil/buffLabels.ts:150-154` — copy row for `NoEffectYet`.
- `src/app/warCouncilMount.ts:90-127` — `WarCouncilRoundResult.buffs`.
- `src/app/warCouncil/WarCouncilRound.tsx:220-248` — both `onComplete({…})` literals carry `buffs`.
- `src/App.tsx:158-168` — pass `result.buffs` to `recordEncounter`.
- `src/hunt/__tests__/buffActivation.test.ts` — `NoEffectYet` ordering and `activateFromPile`.
- `src/app/warCouncil/__tests__/buffActivationStock.test.ts` — the new `effectLive` field.
- `src/app/warCouncil/__tests__/buffLabels.test.ts` — the new copy row.
- `src/app/warCouncil/__tests__/buffHandlers.test.ts` — a spend removes the row and fires its effect.
- `src/hunt/__tests__/run-buffs.test.ts` — `recordEncounter` adopts a shrunken pile.
- `.docs/implementation/hunt/` and `.docs/game_rules/the-hunt.md` — owned by `implementation-doc-writer`, never hand-edited.

**Deleted:** (none)

**Developer decides or observes:**
- **Ward's silver and gold tiers.** They are kept and shipped at 1/3/5 (`plan.md` Part 2 → Risks, first bullet). The one case that distinguishes them is a Timebomb the player primed detonating against them (3/5/7 damage). Decide whether that is enough to justify two extra rows, or whether the damage spread should widen — a tuning read, not an engine one. `DAMAGE_PER_HIT` was deliberately not touched.
- **`'Not usable yet.'`** — the `NoEffectYet` copy row. Placed because the `Record` type forces one, not because it was designed. Unreachable in play today.
- **Ward absorbing ahead of blue hearts.** A rules reading with no source document behind it; reasoning in `plan.md` Part 1 → Assumptions made.
- **Puppeteer's `BeforeOwnCard` window.** Declared, not opened — no reducer provides a window after the Quarry has led and before the player commits. Whoever builds it owns that reducer change.
- **Nothing in this diff is player-reachable.** No template mints a consumable (`grep -c "BuffKind.Ward" src/hunt/buffTemplates.ts` → 0), so a browser cannot exercise one new path by playing. What a browser *would* have checked is recorded in `pr-description.md`.

---

## Phase 1 — The consumable model

The whole of `src/hunt/consumables.ts`, built test-first. It is a leaf module — it imports `./buffs`, `./buffCosts` and `./types` and nothing else — so this phase adds a file, changes no existing behaviour, and ends type-checking with the module fully covered and not yet called by anything.

### Task 1: Create `src/hunt/consumables.ts` — kinds, timing, ladders, effects

- Skill: react-frontend

**Files:**
- Create: `src/hunt/consumables.ts`
- Test: `src/hunt/__tests__/consumables.test.ts`

- [ ] **Step 1: Write the failing spec for kind membership, timing, and the effect descriptors**

Create `src/hunt/__tests__/consumables.test.ts`. It must assert, at minimum:

- `isConsumableItemKind` is `true` for exactly `Ward`, `Puppeteer`, `SecondThoughts`, `Foresight`, `Spyglass`, and `false` for `Cheat`, `Timebomb`, `Shield` and `Unassigned` — iterate `Object.values(BuffKind)` so a member added later is covered without an edit.
- `CONSUMABLE_TIMING` maps Puppeteer to `ConsumableTiming.BeforeOwnCard` and the other four to `BetweenTricks`.
- `consumableEffectOf` returns `{ kind: BuffKind.Ward, absorbs: 1 | 3 | 5 }` across bronze/silver/gold, and the analogous shape for each of the other four, matching `WARD_ABSORPTION` / `SECOND_THOUGHTS_CHARGES` / `FORESIGHT_CARDS` / `SPYGLASS_CANDIDATES` / `PUPPETEER_FORCED_CARDS`.
- `consumableEffectOf` and `consumableTimingOf` each throw `RangeError` on a `Cheat` buff.
- `CONSUMABLE_EFFECT_LIVE` is `true` for Ward and Second Thoughts and `false` for the other three, and `consumableEffectIsLive` returns `false` for a non-consumable.
- Every one of the five kinds is priced — `apCostOf` does not throw for any of them — pinning `consumables.ts`'s membership against `buffCosts.ts`'s `CONSUMABLE_AP_COST`.

Build fixtures with an inline helper in the spec, not by importing a minting function that does not exist:

```ts
function itemBuff(kind: ConsumableItemKind, tier: BuffTier): Buff {
  return { id: 1, kind, tier, condition: ACTIVATED_BUFF_CONDITION, reward: { axis: BuffRewardAxis.None, value: 0 } }
}
```

- [ ] **Step 2: Run the spec and confirm it fails to resolve the module**

Run: `npx vitest run src/hunt/__tests__/consumables.test.ts`
Expected: non-zero exit; the failure is a transform/collection error naming `src/hunt/consumables.ts` as unresolvable, not an assertion failure.

- [ ] **Step 3: Write `src/hunt/consumables.ts` up to the effect descriptors**

Create the module with the imports, `ConsumableItemKind`, `isConsumableItemKind`, `isConsumableItem`, `ConsumableTiming`, `CONSUMABLE_TIMING`, `consumableTimingOf`, the four tier ladders plus `PUPPETEER_FORCED_CARDS`, `ConsumableEffect`, `consumableEffectOf`, `CONSUMABLE_EFFECT_LIVE` and `consumableEffectIsLive`, exactly as `plan.md` Part 2 → Data shapes declares them.

Every ladder carries a UNIT comment and cites `v1-buff-card-list.md` → *Utilities, consumables and activated cards*. Model membership on `buffCosts.ts`'s `CONDITION_FAMILY_KINDS` pattern — a `ReadonlySet` built from the timing table's keys, so a kind added to one table is admitted by the predicate automatically rather than needing a second edit:

```ts
const CONSUMABLE_ITEM_KINDS: ReadonlySet<BuffKind> = new Set(
  Object.keys(CONSUMABLE_TIMING) as ConsumableItemKind[],
)
```

`consumableEffectOf` is a total `switch` over `ConsumableItemKind` behind a `isConsumableItemKind` guard that throws, so a sixth consumable fails to compile here rather than silently returning `undefined`.

- [ ] **Step 4: Run the spec green**

Run: `npx vitest run src/hunt/__tests__/consumables.test.ts`
Expected: exits 0; Vitest reports 0 failed.

### Task 2: Add the counted inventory, the spend, and Ward's arithmetic

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/consumables.ts`
- Test: `src/hunt/__tests__/consumables.test.ts`

- [ ] **Step 1: Extend the spec with AC1's stack view, AC3's spend, and `absorbWithWard`**

Add to `src/hunt/__tests__/consumables.test.ts`:

- **AC1 / AC3, the ticket's named test:** a pile holding two bronze Wards plus one `Unassigned` and one `Cheat` yields exactly one `ConsumableStack` with `count: 2`; after `spendConsumable(pile, wardId)` the same call yields `count: 1`, the returned pile is one shorter, and the `Cheat` and `Unassigned` are untouched.
- `consumableStacks` groups by `(kind, tier)` — a bronze and a gold Ward are two stacks, not one — and preserves pile order by first appearance.
- `consumableStacks` returns `[]` for a pile of only `Unassigned` placeholders.
- `spendConsumable` throws `RangeError` for an id not in the pile, and for an id naming a `Cheat`.
- `spendConsumable` removes exactly one when two cards share a `(kind, tier)`, leaving the other's id present.
- `extraDiscardCharges` returns 1/2/3 for a bronze/silver/gold Second Thoughts and `0` for a Ward, a Cheat and an `Unassigned`.
- `absorbWithWard(3, 1)` → `{ absorbed: 1, throughToHealth: 0 }`; `absorbWithWard(1, 3)` → `{ absorbed: 1, throughToHealth: 2 }`; `absorbWithWard(3, 0)` → `{ absorbed: 0, throughToHealth: 0 }`.
- `absorbWithWard` throws `RangeError` on a negative or non-finite `wardAbsorbs`, and on a negative or non-finite `damage`.

- [ ] **Step 2: Run the spec and confirm the new assertions fail**

Run: `npx vitest run src/hunt/__tests__/consumables.test.ts`
Expected: non-zero exit; failures name the missing exports.

- [ ] **Step 3: Implement `ConsumableStack`, `consumableStacks`, `spendConsumable`, `extraDiscardCharges`, `absorbWithWard`**

Signatures exactly as `plan.md` Part 2 → Data shapes declares. `consumableStacks` is one pass building an ordered array of stacks keyed on `` `${kind}:${tier}` ``. `spendConsumable` locates the card first and throws naming the id and the reason before returning `buffs.filter((b) => b !== found)`. `absorbWithWard` copies `shield.ts`'s `absorbWithShield` guard pair verbatim — non-finite/negative on both arguments, worded for a Ward — and returns no remaining-guard field, because a Ward that took part in a hit is gone.

- [ ] **Step 4: Run the spec green and typecheck**

Run: `npx vitest run src/hunt/__tests__/consumables.test.ts; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed.

---

## Phase 2 — Activation spends the card

`activateFromPile` becomes the single call that spends AP and removes the item, and `NoEffectYet` makes the three unimplemented consumables unspendable. This phase widens `BuffActivationStock` by a required field, which the compiler enumerates at its two construction sites, and widens `BuffActivationRefusal`, which the compiler enumerates at the one `Record`-typed copy table. The phase ends with every consumer updated together, so no boundary leaves the app half-widened.

### Task 3: Widen the refusal and the stock, and add `activateFromPile`

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffActivation.ts`
- Modify: `src/app/warCouncil/roundUiState.ts:381-392`
- Modify: `src/app/warCouncil/buffLabels.ts:150-154`
- Test: `src/hunt/__tests__/buffActivation.test.ts`
- Test: `src/app/warCouncil/__tests__/buffActivationStock.test.ts`
- Test: `src/app/warCouncil/__tests__/buffLabels.test.ts`

- [ ] **Step 1: Write the failing spec for `NoEffectYet` and `activateFromPile`**

Add to `src/hunt/__tests__/buffActivation.test.ts`:

- `buffActivationRefusalFor` returns `NoEffectYet` for a stock with `effectLive: false` **even when the window is closed and the pool is empty** — pinning that `NoEffectYet` is read first, because it is true of the card rather than of the felt.
- The existing order below it is unchanged: `WindowClosed → AlreadyActive → InsufficientAp`.
- `buffActivationStockFor` sets `effectLive: true` for a Ward and a Cheat, `false` for a Foresight.
- `activateFromPile` on a bronze Ward returns an `activation` with the pool down by `apCostOf(buff)` and the Ward's id in `activatedThisTrick`, **and** a `buffs` array one shorter with that id gone.
- `activateFromPile` on a `Cheat` leaves `buffs` **unchanged** — a Cheat is an Activated card, not a consumable item, and is not spent from the pile.
- `activateFromPile` throws `RangeError` when `windowOpen` is `false`, and the pile it was handed is not mutated.

Add to `src/app/warCouncil/__tests__/buffActivationStock.test.ts` an assertion that `buffActivationStock` reports `effectLive: false` for a Foresight and `true` for a Cheat, and to `src/app/warCouncil/__tests__/buffLabels.test.ts` an assertion that `BUFF_ACTIVATION_REFUSAL_MESSAGE` has a non-empty row for every member of `BuffActivationRefusal` (iterate `Object.values`).

- [ ] **Step 2: Run the three specs and confirm they fail**

Run: `npx vitest run src/hunt/__tests__/buffActivation.test.ts src/app/warCouncil/__tests__/buffActivationStock.test.ts src/app/warCouncil/__tests__/buffLabels.test.ts`
Expected: non-zero exit; failures name the missing `NoEffectYet` member, the missing `effectLive` field and the missing `activateFromPile` export.

- [ ] **Step 3: Widen `BuffActivationRefusal` and `BuffActivationStock`, and add `activateFromPile`**

In `src/hunt/buffActivation.ts`: add the `NoEffectYet` member **first** in the `as const` object with a docblock stating why it is read before `WindowClosed`; add `readonly effectLive: boolean` as the first field of `BuffActivationStock`; add the `if (!stock.effectLive) return BuffActivationRefusal.NoEffectYet` line as the first check in `buffActivationRefusalFor`; set `effectLive: consumableEffectIsLive(buff) || !isConsumableItem(buff)` in `buffActivationStockFor` — a non-consumable is always live, since `NoEffectYet` is a statement about unbuilt consumable surfaces only; and add:

```ts
export interface BuffActivationResult {
  readonly activation: BuffActivationState
  readonly buffs: readonly Buff[]
}

export function activateFromPile(
  state: BuffActivationState,
  buffs: readonly Buff[],
  buff: Buff,
  windowOpen: boolean,
): BuffActivationResult {
  const activation = activateBuff(state, buff, windowOpen)
  return {
    activation,
    buffs: isConsumableItem(buff) ? spendConsumable(buffs, buff.id) : buffs,
  }
}
```

Import from `./consumables`. **Do not** add an import of `./buffActivation` to `consumables.ts` — the edge is one-way.

- [ ] **Step 4: Delegate `roundUiState.ts`'s `buffActivationStock` and add the copy row**

Replace the body of `buffActivationStock` in `src/app/warCouncil/roundUiState.ts` with a delegation, deleting the duplicated four-field literal:

```ts
export function buffActivationStock(
  state: RoundUiState,
  activation: BuffActivationState,
  buff: Buff,
): BuffActivationStock {
  return buffActivationStockFor(activation, buff, discardWindowOpen(state))
}
```

Update that function's docblock to say it now delegates, and drop any import (`apCostOf`) the delegation leaves unused. Add `[BuffActivationRefusal.NoEffectYet]: 'Not usable yet.',` as the first row of `BUFF_ACTIVATION_REFUSAL_MESSAGE` in `src/app/warCouncil/buffLabels.ts`.

- [ ] **Step 5: Run the three specs green and typecheck**

Run: `npx vitest run src/hunt/__tests__/buffActivation.test.ts src/app/warCouncil/__tests__/buffActivationStock.test.ts src/app/warCouncil/__tests__/buffLabels.test.ts; npm run typecheck`
Expected: all exit 0; Vitest reports 0 failed.

---

## Phase 3 — Ward on the encounter, and the felt

Ward becomes a real second guard on `EncounterState`, spent inside `applyDamage` ahead of blue hearts; then `handleTapBuff` switches to `activateFromPile` and applies the two live effects; then the spend rides up through `onComplete` into `RunState.buffs`. Each task ends type-checking. The phase is ordered engine-outward so no task depends on a field the previous one has not added.

### Task 4: Add `wardAbsorbs` to `EncounterState` and absorb it in `applyDamage`

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/types.ts:105`
- Modify: `src/hunt/encounter.ts`
- Test: `src/hunt/__tests__/ward.encounter.test.ts`

- [ ] **Step 1: Write the failing spec for Ward's absorption**

Create `src/hunt/__tests__/ward.encounter.test.ts`, modelled on `src/hunt/__tests__/shield.encounter.test.ts`. Assert:

- `startEncounter(0)` seeds `wardAbsorbs` to `NO_WARD` (0) and `hasWard` is `false`.
- `activateWard(encounter, BuffTier.Silver)` sets `wardAbsorbs` to `WARD_ABSORPTION[BuffTier.Silver]` (3); a following `activateWard(…, BuffTier.Bronze)` **sets it down to 1** rather than adding.
- `activateWard` returns the encounter unchanged when `isEncounterResolved` holds.
- A 1-damage hit against a silver Ward leaves red health untouched and `wardAbsorbs` at 0 — **it breaks regardless of full absorption**, which is the assertion that separates a Ward from a blue heart.
- A 5-damage hit against a bronze Ward (absorbs 1) leaves red health down by 4 and `wardAbsorbs` at 0.
- **Ordering:** an encounter holding a bronze Ward *and* 2 blue hearts takes a 4-damage hit — the Ward absorbs 1, the blue hearts absorb 2, red health drops by 1, `wardAbsorbs` is 0 and `shieldHearts` is 0.
- A hit that resolves the encounter in the player's favour (`quarryDown`) spends **no** Ward, matching the existing D7 carve-out for blue hearts.

- [ ] **Step 2: Run the spec and confirm it fails**

Run: `npx vitest run src/hunt/__tests__/ward.encounter.test.ts`
Expected: non-zero exit; failures name the missing `wardAbsorbs` field and the missing `activateWard` / `hasWard` / `NO_WARD` exports.

- [ ] **Step 3: Add the field, the seed, the absorption and the two functions**

In `src/hunt/types.ts`, add `readonly wardAbsorbs: Damage` to `EncounterState` with the docblock `plan.md` Part 2 → Data shapes gives.

In `src/hunt/encounter.ts`:
- Export `export const NO_WARD: Damage = 0` beside `NO_PENDING_TIMEBOMB`.
- Add `wardAbsorbs: NO_WARD` to `startEncounter`'s returned literal.
- In `applyDamage`, compute the Ward split **before** the existing shield split and feed its remainder into `absorbWithShield`:

```ts
const wardSplit: WardAbsorption = quarryDown
  ? { absorbed: 0, throughToHealth: 0 }
  : absorbWithWard(encounter.wardAbsorbs, incoming[DuelSide.Player])
// A Ward breaks whenever it took part in a hit, absorbed in full or not
// (v1-buff-card-list.md -> Ward). A quarryDown event is not a hit taken.
const wardAfter = quarryDown || incoming[DuelSide.Player] === 0 ? encounter.wardAbsorbs : NO_WARD
const absorption: ShieldAbsorption = quarryDown
  ? { absorbed: 0, throughToHealth: 0, shieldHeartsRemaining: encounter.shieldHearts }
  : absorbWithShield(encounter.shieldHearts, wardSplit.throughToHealth)
```

and add `wardAbsorbs: wardAfter` to the returned literal.
- Add `activateWard(encounter, tier)` beside `activateShield`, copying its resolved-encounter guard and its SETS-not-adds rule verbatim, reading `WARD_ABSORPTION[tier]`; and `hasWard(encounter)` beside `hasShieldHearts`.

- [ ] **Step 4: Run the Ward spec plus every existing encounter spec, and typecheck**

Run: `npx vitest run src/hunt/__tests__/ward.encounter.test.ts src/hunt/__tests__/encounter.test.ts src/hunt/__tests__/shield.encounter.test.ts src/hunt/__tests__/shield.test.ts src/hunt/__tests__/applyDamagePayout.test.ts src/hunt/__tests__/blastGuard.test.ts; npm run typecheck`
Expected: all exit 0; Vitest reports 0 failed. A fully-absorbed hit must still leave `pendingApplyPayout` intact — that is `applyDamagePayout.test.ts`'s existing assertion and Ward must not change it.

### Task 5: Commit a consumable through `handleTapBuff`

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/buffHandlers.ts:100-116`
- Test: `src/app/warCouncil/__tests__/buffHandlers.test.ts`

- [ ] **Step 1: Write the failing spec for the felt-level spend**

Add to `src/app/warCouncil/__tests__/buffHandlers.test.ts`:

- Seeding a felt whose pile holds two bronze Wards, `handleTapBuff` twice on the same id (poise then commit) leaves `state.buffs` one shorter, the other Ward still present, the AP pool down by 2, and `state.encounter.wardAbsorbs` at 1.
- The same double-tap on a bronze Second Thoughts leaves `state.discardsRemaining` up by 1 and the card gone from `state.buffs`.
- A double-tap on a Foresight is **refused** — `loadoutRefusalFor` returns `NoEffectYet`, the pile is unchanged and the AP pool is unchanged.
- Committing a `Cheat` leaves `state.buffs` unchanged (unchanged behaviour, pinned so a later edit cannot start eating Cheats).

- [ ] **Step 2: Run the spec and confirm it fails**

Run: `npx vitest run src/app/warCouncil/__tests__/buffHandlers.test.ts`
Expected: non-zero exit; failures show the pile and the encounter unchanged after a commit.

- [ ] **Step 3: Switch the commit branch to `activateFromPile` and apply the two live effects**

Replace the commit branch at the end of `handleTapBuff` in `src/app/warCouncil/buffHandlers.ts`:

```ts
  const { activation, buffs } = activateFromPile(
    state.buffActivation,
    state.buffs,
    buff,
    discardWindowOpen(state),
  )
  return {
    ...state,
    buffs,
    buffActivation: activation,
    // AC3 — the effect fires HERE, synchronously at the spend, never at trick resolution: a
    // consumable has no condition and never reaches buffEvaluation.ts's evaluator.
    encounter: buff.kind === BuffKind.Ward ? activateWard(state.encounter, buff.tier) : state.encounter,
    discardsRemaining: state.discardsRemaining + extraDiscardCharges(buff),
    loadout: { poised: null },
  }
```

Import `activateFromPile`, `activateWard`, `extraDiscardCharges` and `BuffKind` from `'../../hunt'`. Leave the two guard branches above it untouched — the refusal is still re-read on both taps, so `activateFromPile`'s throw stays a guard rather than a live path. Update the function's docblock to state that a consumable leaves the pile here and that its effect fires at the spend.

- [ ] **Step 4: Run the handler spec plus its siblings, and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/buffHandlers.test.ts src/app/warCouncil/__tests__/buffRoundState.test.ts src/app/warCouncil/__tests__/BuffLoadoutPanel.test.tsx; npm run typecheck`
Expected: all exit 0; Vitest reports 0 failed.

### Task 6: Hand the spent pile up to the run

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncilMount.ts:90-127`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:220-248`
- Modify: `src/App.tsx:158-168`
- Modify: `src/hunt/run.ts:70-120`
- Test: `src/hunt/__tests__/run-buffs.test.ts`

- [ ] **Step 1: Write the failing spec for `recordEncounter`'s ninth parameter**

Add to `src/hunt/__tests__/run-buffs.test.ts`:

- `recordEncounter(run, …, buffCoinsEarned, shrunkenPile)` returns a run whose `buffs` **is** `shrunkenPile`.
- The same call with the ninth argument **omitted** returns a run whose `buffs` is `run.buffs`, unchanged — pinning that all 52 existing call sites are unaffected.
- `nextBuffId` is **not** decremented by a spend: ids are minted forward-only, so a spent id is never reissued.

- [ ] **Step 2: Run the spec and confirm it fails**

Run: `npx vitest run src/hunt/__tests__/run-buffs.test.ts`
Expected: non-zero exit; the pile comes back unchanged because the parameter does not exist.

- [ ] **Step 3: Add the parameter, the result field, and the two hand-back sites**

In `src/hunt/run.ts`, add `buffs?: readonly Buff[]` as `recordEncounter`'s ninth parameter with the docblock `plan.md` Part 2 → Data shapes gives, and `buffs: buffs ?? run.buffs` to the returned object. Note in the comment that `nextBuffId` is deliberately untouched.

In `src/app/warCouncilMount.ts`, add `readonly buffs: readonly Buff[]` to `WarCouncilRoundResult` with its docblock, immediately after `discardsRemaining`. `Buff` is already imported by that file.

In `src/app/warCouncil/WarCouncilRound.tsx`, add `buffs: ui.buffs,` to **both** `onComplete({…})` literals (the `encounterOver` branch and the `roundComplete` branch) — the Step 1.6 audit counted exactly two and the compiler will confirm it.

In `src/App.tsx`, add `result.buffs,` as `recordEncounter`'s ninth argument in `handleComplete`.

- [ ] **Step 4: Run the run spec plus every round-result consumer, and typecheck**

Run: `npx vitest run src/hunt/__tests__/run-buffs.test.ts src/hunt/__tests__/run.test.ts src/hunt/__tests__/run.integration.test.ts src/app/warCouncil/__tests__/WarCouncilRound.test.tsx; npm run typecheck`
Expected: all exit 0; Vitest reports 0 failed.

---

## Phase 4 — Final verification

No production changes. Confirm the purity boundary still holds, no tunable was inlined, no file breached the 400-line ceiling, and every gate is green.

### Task 7: Confirm the pure-core boundary and the leaf-module edge

- Skill: none — verification only, no code is written.

**Files:**
- (none — read-only checks)

- [ ] **Step 1: Grep the pure tree for React and DOM references**

Run: `Get-ChildItem src\hunt,src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|Math\.random"`
Expected: zero hits. `Math.random` is included because DLR-130's simulator depends on `src/hunt/` staying deterministic.

- [ ] **Step 2: Confirm `consumables.ts` stayed a leaf — no edge back into `buffActivation.ts`**

Run: `Select-String -Path src\hunt\consumables.ts -Pattern "buffActivation"`
Expected: zero hits. The dependency runs `buffActivation.ts` → `consumables.ts` only; the reverse edge is a cycle.

### Task 8: Confirm no tier ladder was inlined and no file breached the ceiling

- Skill: none — verification only, no code is written.

**Files:**
- (none — read-only checks)

- [ ] **Step 1: Confirm every consumable ladder is read through its constant, never re-typed**

Run: `Get-ChildItem src\hunt,src\app -Recurse -Include *.ts,*.tsx | Select-String -Pattern "WARD_ABSORPTION|SECOND_THOUGHTS_CHARGES|FORESIGHT_CARDS|SPYGLASS_CANDIDATES"`
Expected: every hit is either the declaration in `src/hunt/consumables.ts`, an export line in `src/hunt/index.ts`, a single reader, or a spec asserting against the constant. No literal `1 / 3 / 5` or `1 / 2 / 3` triple appears outside `consumables.ts`.

- [ ] **Step 2: Normalise formatting on the files this contract changed, then measure every file near the ceiling**

Run: `npx prettier --write src/hunt/consumables.ts src/hunt/buffActivation.ts src/hunt/encounter.ts src/hunt/types.ts src/hunt/run.ts src/hunt/index.ts src/app/warCouncil/roundUiState.ts src/app/warCouncil/buffHandlers.ts src/app/warCouncil/buffLabels.ts src/app/warCouncilMount.ts src/app/warCouncil/WarCouncilRound.tsx src/App.tsx src/hunt/__tests__/consumables.test.ts src/hunt/__tests__/ward.encounter.test.ts; (Get-Content src\App.tsx).Count; (Get-Content src\app\warCouncil\roundUiState.ts).Count; (Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count; (Get-Content src\hunt\consumables.ts).Count; (Get-Content src\hunt\encounter.ts).Count; (Get-Content src\hunt\buffActivation.ts).Count`
Expected: every figure is 400 or below. `Measure-Object -Line` is **not** used — it drops blank lines and hid a real breach on DLR-63. A breach is refactored in this ticket, never reported as a finding. Prettier is scoped to this contract's files: repo-wide `npm run format` is forbidden.

### Task 9: Static gates, full suite, and build

- Skill: none — verification only, no code is written.

**Files:**
- (none — read-only checks)

- [ ] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed against a baseline of 1702 passed across 131 files, plus this contract's new specs. If `npm test` reports `[vitest-pool-runner]: Timeout waiting for worker to respond` on a cold cache, warm it with `npx vitest run --project node; npx vitest run --project dom` and re-run — a single cold timeout is infrastructure, not a failing test.

- [ ] **Step 2: Formatting of the files this contract changed**

Run: `npx prettier --check src/hunt/consumables.ts src/hunt/buffActivation.ts src/hunt/encounter.ts src/hunt/types.ts src/hunt/run.ts src/hunt/index.ts src/app/warCouncil/roundUiState.ts src/app/warCouncil/buffHandlers.ts src/app/warCouncil/buffLabels.ts src/app/warCouncilMount.ts src/app/warCouncil/WarCouncilRound.tsx src/App.tsx src/hunt/__tests__/consumables.test.ts src/hunt/__tests__/ward.encounter.test.ts`
Expected: exits 0. Repo-wide `npm run format:check` fails on ~58 pre-existing `.md` files and is not a gate.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 10: Update the implementation record and the ruleset

- Skill: implementation-doc-writer

**Files:**
- Modify: `.docs/implementation/hunt/` — the module docs for the consumable model, Ward, and the widened activation flow
- Modify: `.docs/game_rules/the-hunt.md` — the rules this run changes

- [ ] **Step 1: Invoke `implementation-doc-writer` and let it own both outputs**

Invoke the skill and hand it this contract's diff. Rules that moved and must land in `the-hunt.md` in playing order, each marked and citing `hybrid-design.md` / `v1-buff-card-list.md` rather than reproducing the reasoning:

- Spending a consumable removes it from the owned pile permanently `[settled]`.
- Ward absorbs up to 1/3/5 on the next hit taken, ahead of blue hearts, then breaks regardless `[provisional]` — the ordering is a reading, not a transcription.
- Second Thoughts adds 1/2/3 to the fight's discard budget `[settled]`.
- Puppeteer, Foresight and Spyglass are declared and priced but not usable `[not built]`.
- Puppeteer's window is before the player's own card, not the between-tricks window `[provisional]`.

Never hand-edit `the-hunt.md`, and never add a per-ticket section to it.

### Task 11: Write the PR description

- Skill: none — a hand-off document, not code.

**Files:**
- Create: `.claude/contract/DLR-126-consumable-item-activation-flow/pr-description.md`

- [ ] **Step 1: Write `pr-description.md` in this plan folder**

Include:
- A link to `plan.md` in this folder.
- **What already existed versus what was built** — the generic activation flow (DLR-108/DLR-114) was reused unchanged; what was missing was consumption and every effect.
- The `Ward` decision and its evidence (`bank.ts:258`, `TIMEBOMB_DAMAGE`'s 2/4/6 player column).
- Every entry from this file's "Developer decides or observes" list.
- The verification results from Phase 4, quoted with real numbers.
- **What a browser would have checked, and why it could not:** with a consumable in the pile, that the loadout panel lists it with its AP price; that one tap poises and a second spends; that the row disappears after the spend and does not return next trick or next hand; that a Foresight row reads `Not usable yet.` and cannot be committed; that a Ward's absorption shows on the health bars when the next hit lands. **None of it is reachable today** — no template mints a consumable, so nothing player-facing can produce one. That becomes reachable when DLR-112 lands.
- A one-line note for future contributors: `activateFromPile` is the entry point, not `activateBuff`; a new consumable needs a row in `CONSUMABLE_TIMING`, one in `CONSUMABLE_EFFECT_LIVE`, a ladder, and a `ConsumableEffect` arm — the compiler enumerates all four.

---

## Self-review

**Spec coverage:**
- `plan.md` In-scope 1 (the `consumables.ts` module: kinds, timing, ladders, effects, stacks, spend) — Tasks 1, 2.
- `plan.md` In-scope 2 (`activateFromPile`) — Task 3.
- `plan.md` In-scope 3 (`NoEffectYet` refusal) — Task 3.
- `plan.md` In-scope 4 (Ward wired live) — Tasks 4, 5.
- `plan.md` In-scope 5 (Second Thoughts wired live) — Tasks 2, 5.
- `plan.md` In-scope 6 (removal surviving the hand) — Task 6.
- `plan.md` In-scope 7 (AC5 — DLR-112's AC6) — answered in `plan.md` Part 2 → Approach, final paragraph; recorded in Task 11's `pr-description.md` and in the sprint log.
- Jira AC1 (counted inventory) — Task 2 Step 1, the two-bronze-Wards stack test. Jira AC2 (timing gate) — Task 1 Step 1, `CONSUMABLE_TIMING`. Jira AC3 (2-count becomes 1, effect synchronous) — Task 2 Step 1 and Task 5 Step 1. Jira AC4 (five effects) — Tasks 1, 2, 4, 5, with three deferred and refused per `plan.md` Part 1 → Explicitly out of scope.

**Placeholder scan:** no `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step is a concrete code change or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `ConsumableItemKind`, `isConsumableItemKind`, `isConsumableItem`, `ConsumableTiming`, `CONSUMABLE_TIMING`, `consumableTimingOf`, `WARD_ABSORPTION`, `SECOND_THOUGHTS_CHARGES`, `FORESIGHT_CARDS`, `SPYGLASS_CANDIDATES`, `PUPPETEER_FORCED_CARDS`, `ConsumableEffect`, `consumableEffectOf`, `CONSUMABLE_EFFECT_LIVE`, `consumableEffectIsLive`, `ConsumableStack`, `consumableStacks`, `spendConsumable`, `extraDiscardCharges`, `WardAbsorption`, `absorbWithWard`, `NO_WARD`, `activateWard`, `hasWard`, `BuffActivationResult`, `activateFromPile`, `BuffActivationRefusal.NoEffectYet`, `BuffActivationStock.effectLive`, `EncounterState.wardAbsorbs`, `WarCouncilRoundResult.buffs` — each spelled identically in `plan.md` Part 2 → Data shapes and in every task that uses it.

**Phase boundary cleanliness:**
- **Phase 1** adds one leaf module and its spec; nothing imports it yet, so the tree type-checks with the module fully covered and inert.
- **Phase 2** widens two shapes and updates every consumer of both inside the same phase — the refusal union with its one `Record`-typed copy table, and the stock with both construction sites (one of which is deleted by the delegation). No half-widened boundary is left.
- **Phase 3** adds `wardAbsorbs` and its three `encounter.ts` construction sites in Task 4, then consumes it in Task 5, then adds the result field and both its construction sites in Task 6 — each task self-contained and type-checking, with no task depending on a field a later one adds.
- **Phase 4** writes no production code; its Prettier step is scoped to this contract's `**Files:**` union.
