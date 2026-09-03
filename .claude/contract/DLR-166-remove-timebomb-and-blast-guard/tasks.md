# Tasks: Remove Timebomb and the Blast Guard, and all the delayed-damage machinery behind both

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: PLANNED
Started: 2026-09-03

**Goal:** Delete the Timebomb and the Blast Guard from the game outright, along with every mechanism that exists only to serve them — the fuse, the pending-damage queue, the ticking-heart preview, the one-at-a-time activation refusal, the shop entries, the streak-reset and payout-fold ordering, and the simulator policies and fixtures that drive them — leaving the codebase ready for DLR-167 to build Curse.

**Spec:** `plan.md` in this folder. Layout reference for the presentational phase: `mockup.html` in this folder (approved 2026-09-03).

---

## File map

**Created:** (none — no new files)

**Modified:**

- `src/hunt/buffs.ts` — drop the `BuffKind.Timebomb` variant and its `BUFF_CADENCE` row
- `src/hunt/buffTemplates.ts` — drop the `ACTIVATED_TEMPLATES` timebomb row; `BUFF_TEMPLATE_COUNT` falls 18 → 17
- `src/hunt/config.ts` — delete `TIMEBOMB_PRICE`, `TIMEBOMB_QUARRY_DAMAGE`, `TIMEBOMB_PLAYER_DAMAGE`, `BLAST_GUARD_PRICE`, `TIMEBOMB_FUSE_TRICKS`
- `src/hunt/buffCatalog.ts` — delete the whole Timebomb block (type, tables, two exported functions, one helper)
- `src/hunt/buffActivation.ts` — delete the `TimebombLive` refusal, the `timebombLive` stock field, and the trailing parameter on three functions
- `src/hunt/shop.ts` — delete two `ShopItem` variants, `ShopStock.blastGuardHeld`, and the Blast Guard refusal
- `src/hunt/buffCombine.ts`, `buffCosts.ts`, `buffEvaluation.ts`, `consumables.ts`, `encounter.ts`, `index.ts`, `rankTiers.ts`, `run.ts`, `runTransitions.ts`, `slotWeights.ts`, `types.ts` — drop timebomb/blast-guard cases, rows, re-exports and fields
- `src/warCouncil/streak.ts` — delete `timebombToPlayer`, `blastGuarded`, `blastGuardSpent` and the `timebombResets` gate
- `src/warCouncil/legalMoves.ts:51`, `playCard.ts:130` — drop the `blastGuarded` option
- `src/warCouncil/encounterDeck.ts`, `index.ts`, `rankTierRules.ts`, `types.ts` — drop remaining references
- `src/app/warCouncil/roundUiState.ts` — delete five `RoundUiState` fields, `TrickResolution.timebombDamage`, and two exported predicates
- `src/app/warCouncil/roundReducer.ts`, `buffHandlers.ts`, `commitHandlers.ts`, `discardHandlers.ts`, `quarryAdvance.ts`, `roundUiSeed.ts`, `roundResult.ts`, `roundBars.ts`, `resolutionBeats.ts`, `resolutionLethal.ts`, `cardDamage.ts` — drop the fields' readers and writers
- `src/app/warCouncil/duelHealthBars.ts` — delete `HeartState.Ticking` and `HealthBarOverlays.ticking`; **keep `HeartState.AtRisk`**
- `src/app/warCouncil/labels.ts`, `roundHint.ts`, `buffLabels.ts`, `buffRideLabels.ts`, `buffRideModel.ts`, `buffRideProps.ts` — delete the copy constant and its branches
- `src/app/warCouncil/WarCouncilRound.tsx`, `WarCouncilTable.tsx`, `HandFan.tsx`, `PlayingCard.tsx`, `BuffGallery.tsx`, `BuffRideZone.tsx`, `BuffRidingList.tsx`, `AbilityPrompt.tsx`, `TrickResolutionScreen.tsx`, `TrickWell.tsx` — drop props, branches and imports
- `src/app/ErrorBoundary.tsx`, `src/app/warCouncilMount.ts`, `src/app/run/shopLabels.ts`, `SlotGlyph.tsx`, `slotSymbols.ts` — drop the two shop items and the glyph
- `src/app/warCouncil/warCouncil.css` — rename `--wc-timebomb`/`--wc-timebomb-edge` to `--wc-gain`/`--wc-gain-edge`
- `src/app/warCouncil/warCouncilHealthBars.css`, `warCouncilHand.css`, `warCouncilBankMeter.css`, `warCouncilBuffCard.css`, `warCouncilCardFace.css`, `warCouncilHunt.css`, `warCouncilTable.css`, `src/app/run/run.css`, `shopSlot.css`, `shopSlotReel.css` — delete Timebomb rules, repoint the renamed token
- `src/sim/fixtures.ts`, `baselinePolicy.ts`, `cardAwarePolicy.ts`, `skilledPolicy.ts`, `policies.ts`, `playHand.ts`, `playHandWindows.ts`, `playRun.ts`, `report.ts`, `index.ts` — delete the Timebomb fixtures and policy behaviour
- **98 test files** across the four modules — drop timebomb/blast-guard fixtures, fields and assertions
- `.docs/game_rules/the-hunt.md`, `.docs/implementation/**` — via the `implementation-doc-writer` skill only

**Deleted:**

- `src/warCouncil/timebomb.ts`
- `src/app/warCouncil/TimebombMark.tsx`
- `src/app/warCouncil/timebombMarks.ts`
- `src/app/warCouncil/warCouncilTimebombMark.css`
- `src/hunt/__tests__/timebomb.test.ts`
- `src/hunt/__tests__/timebombFuseConfig.test.ts`
- `src/hunt/__tests__/buffActivation.timebombLive.test.ts`
- `src/warCouncil/__tests__/timebomb.test.ts`
- `src/warCouncil/__tests__/playCard.timebomb.test.ts`
- `src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts`
- `src/app/warCouncil/__tests__/roundReducer.timebombQueue.test.ts`
- `src/app/warCouncil/__tests__/timebombFuse.test.ts`
- `src/app/warCouncil/__tests__/TimebombMark.test.tsx`
- `src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx`
- `src/app/warCouncil/__tests__/WarCouncilRound.timebombRevoke.test.tsx`

**Developer decides or observes:**

- **The renamed colour token's name.** `plan.md` proposes `--wc-gain` / `--wc-gain-edge` for `#8fb04e`. Copy judgement — if you want something else, say so before Phase 3 runs.
- **Whether the emptied fight-long shop shelf disappears or stays.** The Blast Guard was its only stock. `game-ux` says do not render a panel with nothing to say; the default taken in Task 14 is to render no shelf when it has no items. Overturn it if you want the label kept.
- **How the felt rail and health bar read once a control and a heart state are gone.** QA confirms nothing is orphaned and the console is clean; whether the rail looks unbalanced is your eye. Compare against `mockup.html`'s After view.
- **How hard a line to take on docblocks that name the Timebomb while recording why a design is what it is.** Task 18's default keeps historical docblocks and deletes behavioural ones.

---

## Phase 1 — The pure engine: types, constants, catalogue, shop

The deepest layer, and the one every later phase depends on. Each task takes one shape or one constant group **together with all of its readers**, so the phase never leaves a field declared with no writer or a reader of a deleted name. `src/hunt/` and `src/warCouncil/` are lint-enforced React-free and DOM-free — every edit here stays inside that boundary. The phase ends type-checking.

### Task 1: Delete the `BuffKind.Timebomb` variant and its template row

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/buffs.ts` — remove the `Timebomb` entry from the `BuffKind` map and its `BUFF_CADENCE` row
- Modify: `src/hunt/buffTemplates.ts:122` — remove the `ACTIVATED_TEMPLATES` row
- Modify: `src/hunt/buffCosts.ts`, `src/hunt/buffEvaluation.ts`, `src/hunt/buffCombine.ts` — remove `BuffKind.Timebomb` cases and `CONDITION_MODIFIER` / `buffFires` entries
- Test: `src/hunt/__tests__/buffTemplates.test.ts` — update `BUFF_TEMPLATE_COUNT` from 18 to 17

- [ ] **Step 1: Remove the variant from the `BuffKind` map**

`src/hunt/buffs.ts` — delete the line, keeping every other variant untouched. Do **not** touch the eight cut condition families (`MarkOfRank`, `Glutton`, `Hoarder`, `Unbloodied`, `DebtCollector`, `Keepsake`, `Miser`, `Cornered`); they are deliberately retained.

```ts
  Sidestep: 'sidestep',
-  Timebomb: 'timebomb',
  Cheat: 'cheat',
```

- [ ] **Step 2: Remove the activated-template row**

`src/hunt/buffTemplates.ts` — `ACTIVATED_TEMPLATES` drops to one entry.

```ts
export const ACTIVATED_TEMPLATES: readonly ActivatedBuffTemplate[] = [
  { form: 'activated', id: 'cheat', kind: BuffKind.Cheat },
-  { form: 'activated', id: 'timebomb', kind: BuffKind.Timebomb },
]
```

- [ ] **Step 3: Remove every `BuffKind.Timebomb` case the compiler now flags**

Run: `npm run typecheck`
Expected: errors listing each remaining `BuffKind.Timebomb` reference. Delete each case, `CONDITION_MODIFIER` row, `BUFF_CADENCE` row and `buffFires` branch it names, in `buffCosts.ts`, `buffEvaluation.ts` and `buffCombine.ts`.

- [ ] **Step 4: Update the template-count assertion**

Find the assertion naming `BUFF_TEMPLATE_COUNT` and change the expected value from `18` to `17`, with the family arithmetic in the comment updated to match (6 Taker + 6 Feeder + 2 Sidestep + 1 Skull Helmet + 1 Skull Tether + 1 Cheat).

Run: `npx vitest run src/hunt/__tests__/buffTemplates.test.ts`
Expected: exits 0.

- [ ] **Step 5: Confirm the vault still reconciles a stale grant**

The persisted id string `'timebomb'` now fails to resolve through `templateById`. `reconcileVault` already drops it and counts it in `droppedCount` — no code change, but confirm the behaviour is covered.

Run: `npx vitest run src/vault/__tests__ --project node`
Expected: exits 0. If no spec asserts that an unresolvable `templateId` is dropped and counted, add one to the existing vault reconciliation spec using the literal `'timebomb'` as the stale id.

### Task 2: Delete the Timebomb and Blast Guard configuration constants

- Skill: `react-frontend`

**Files:**

- Config: `src/hunt/config.ts` — delete `TIMEBOMB_PRICE` (line 257), `TIMEBOMB_QUARRY_DAMAGE` (269), `TIMEBOMB_PLAYER_DAMAGE` (270), `BLAST_GUARD_PRICE`, `TIMEBOMB_FUSE_TRICKS`
- Test: `src/hunt/__tests__/config.test.ts` — drop assertions naming the deleted constants

- [ ] **Step 1: Delete the five constants and their docblocks**

```ts
-export const TIMEBOMB_PRICE: Coins = 2
-export const BLAST_GUARD_PRICE: Coins = 1
-export const TIMEBOMB_QUARRY_DAMAGE: Damage = 4
-export const TIMEBOMB_PLAYER_DAMAGE: Damage = 2
-export const TIMEBOMB_FUSE_TRICKS = 2
```

Delete the surrounding explanatory comments with them — including the note at line 262 explaining why `TIMEBOMB_QUARRY_DAMAGE` was renamed from `TIMEBOMB_DAMAGE`, which documents a constant that no longer exists.

- [ ] **Step 2: Verify no reader survives**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "TIMEBOMB_PRICE|TIMEBOMB_QUARRY_DAMAGE|TIMEBOMB_PLAYER_DAMAGE|BLAST_GUARD_PRICE|TIMEBOMB_FUSE_TRICKS"`
Expected: zero hits.

### Task 3: Delete the Timebomb damage catalogue

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/buffCatalog.ts` — delete `TimebombDamage`, `TIMEBOMB_TIER_MULTIPLIER`, `TIMEBOMB_DAMAGE`, `timebombBuff`, `timebombDamageOf`, `timebombRow`
- Modify: `src/hunt/index.ts` — drop the re-exports of all six
- Test: `src/hunt/__tests__/buffCatalog.test.ts` — drop the Timebomb describe block

- [ ] **Step 1: Delete the whole Timebomb block and its long design docblock**

Remove the `TimebombDamage` type, the `TIMEBOMB_TIER_MULTIPLIER` table, the `TIMEBOMB_DAMAGE` table, `timebombBuff`, `timebombDamageOf` and the private `timebombRow` helper — together with the multi-paragraph comment above `TIMEBOMB_TIER_MULTIPLIER` that argues why a higher tier raises both sides. That reasoning documents a deleted mechanic. Leave `cheatBuff` and everything Cheat-related exactly as it is.

- [ ] **Step 2: Drop the re-exports**

`src/hunt/index.ts` — remove all six names from the export list.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: remaining errors name only files later tasks in this phase cover (`buffActivation.ts`, `shop.ts`, `streak.ts`) plus `src/app/` and `src/sim/`, which Phases 2–4 own.

### Task 4: Delete the `TimebombLive` refusal and the `timebombLive` stock field

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/buffActivation.ts` — delete the refusal variant, the `BuffActivationStock` field, the refusal branch, and the trailing parameter on `buffActivationStockFor`, `activateBuff` and `activateFromPile`
- Modify: `src/hunt/index.ts` — drop any re-export of the deleted names
- Test: `src/hunt/__tests__/buffActivation.test.ts` and every other spec constructing a `BuffActivationStock` — **16 construction sites, 11 of them in tests**

- [ ] **Step 1: Delete the refusal variant and its docblock**

```ts
export const BuffActivationRefusal = {
  NoEffectYet: 'noEffectYet',
  WindowClosed: 'windowClosed',
-  /** R2 — one Timebomb at a time. … */
-  TimebombLive: 'timebombLive',
  AlreadyActive: 'alreadyActive',
  InsufficientAp: 'insufficientAp',
} as const
```

Update the ordering docblock above `buffActivationRefusalFor` — it currently reads `NoEffectYet → WindowClosed → TimebombLive → AlreadyActive → InsufficientAp`. Remove the `TimebombLive` term and the sentence explaining why it reports ahead of `AlreadyActive`.

- [ ] **Step 2: Delete the stock field and the branch that reads it**

```ts
export interface BuffActivationStock {
  readonly effectLive: boolean
  readonly windowOpen: boolean
  readonly apPool: ActionPoints
  readonly apCost: ActionPoints
  readonly alreadyActive: boolean
-  readonly timebombLive: boolean
}
```

```ts
-  if (stock.timebombLive) return BuffActivationRefusal.TimebombLive
```

- [ ] **Step 3: Drop the trailing parameter from the three functions**

`buffActivationStockFor`, `activateBuff` and `activateFromPile` each take a defaulted `timebombLive: boolean = false` as their last parameter. Remove the parameter and every argument passed to it, including the DLR-154 FIX 5 comments explaining why it was defaulted.

- [ ] **Step 4: Fix every construction site the compiler flags**

Excess-property checking fires on each object literal still passing `timebombLive`. There are **16**; the type name appears at only 9 sites, so do not stop when the annotated ones are clean.

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "timebombLive"`
Expected: zero hits.

- [ ] **Step 5: Also remove `BuffKind.Timebomb` from the revocable-activated list**

The same file exports a list of activated kinds that may be taken back off a trick. It names `BuffKind.Timebomb` with a docblock explaining the DLR-154 FIX D caveat. Delete both the member and the caveat.

Run: `npx vitest run src/hunt/__tests__ --project node`
Expected: exits 0.

### Task 5: Delete the two `ShopItem` variants and the Blast Guard stock

- Skill: `react-frontend`
- Read first: `.claude/rules/save-data-versioning.md` — confirm for yourself that no persisted shape changes here. `plan.md`'s audit concluded no `SAVE_SCHEMA_VERSION` bump is needed because only a *value* stops resolving and `reconcileVault` already drops it; verify that reading rather than inheriting it.

**Files:**

- Modify: `src/hunt/shop.ts:15-16` (the variants), `:97` (`ShopStock.blastGuardHeld`), `:247` (the refusal)
- Modify: `src/hunt/run.ts`, `src/hunt/runTransitions.ts`, `src/hunt/encounter.ts`, `src/hunt/types.ts`, `src/hunt/slotWeights.ts`, `src/hunt/consumables.ts`, `src/hunt/rankTiers.ts`, `src/hunt/index.ts` — drop the two items from shelves, price maps, run state and re-exports
- Test: `src/hunt/__tests__/shop*.test.ts` and every spec constructing a `ShopStock`

- [ ] **Step 1: Remove the two variants**

```ts
export const ShopItem = {
-  Timebomb: 'timebomb',
-  BlastGuard: 'blastGuard',
  // …surviving items…
} as const
```

The union narrows. Every exhaustive `switch` over `ShopItem` must lose its two cases — `buyFromShop` is documented as total over the union, so the compiler finds each one.

- [ ] **Step 2: Remove the stock field and its refusal**

```ts
export interface ShopStock {
-  readonly blastGuardHeld: boolean
}
```

```ts
-  if (item === ShopItem.BlastGuard && stock.blastGuardHeld) {
-    return ShopRefusal.AlreadyHeld
-  }
```

If `ShopRefusal.AlreadyHeld` (or whatever the refusal is named) has no other producer after this deletion, delete the refusal variant too — a declared refusal nothing can return is exactly the "type compiling with no behaviour behind it" state acceptance criterion 1 exists to prevent. If it *does* have another producer, leave it.

- [ ] **Step 3: Remove both items from the shelf ladder**

The four-shelf ladder sorts by how long a purchase lasts. Timebomb sits on **one-time use** and the Blast Guard on **fight-long**. Remove both entries. The fight-long shelf now has no stock — leave the shelf data empty here and let Task 14 decide what renders.

- [ ] **Step 4: Typecheck and run the hunt specs**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__ --project node`
Expected: `src/hunt/` reports no errors of its own; remaining errors name `src/warCouncil/`, `src/app/` or `src/sim/` only. Vitest exits 0.

### Task 6: Delete the streak's Timebomb gate and the Blast Guard fold

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/streak.ts:73` (`blastGuardSpent`), `:105` (`blastGuarded`), `:224` (`timebombResets`), `:296` (the gate), `:349` (the fold), plus `timebombToPlayer` on the trick input
- Modify: `src/warCouncil/legalMoves.ts:51`, `src/warCouncil/playCard.ts:130` — drop the `blastGuarded` option
- Modify: `src/warCouncil/rankTierRules.ts:50` — update the docblock that explains it is handed `blastGuarded`
- Modify: `src/warCouncil/types.ts`, `src/warCouncil/encounterDeck.ts`, `src/warCouncil/index.ts`
- Delete: `src/warCouncil/timebomb.ts`
- Delete: `src/warCouncil/__tests__/timebomb.test.ts`, `src/warCouncil/__tests__/playCard.timebomb.test.ts`
- Test: `src/warCouncil/__tests__/streak.test.ts` — drop the timebomb-reset and guard cases

- [ ] **Step 1: Simplify the reset gate**

```ts
-  const timebombResets = trick.timebombToPlayer > 0 && !trick.blastGuarded
   …
-  if (trickHit || timebombResets) {
+  if (trickHit) {
```

- [ ] **Step 2: Delete the three fields and the guard fold**

```ts
-  readonly blastGuardSpent: boolean          // line 73, on the resolution
-  readonly blastGuarded: boolean             // line 105, on the trick input
-  readonly timebombToPlayer: Damage          // on the trick input
   …
-    blastGuardSpent: trick.timebombToPlayer > 0 && trick.blastGuarded,   // line 349
```

Remove the docblocks at lines 112 and 123 that cite `blastGuarded` as the precedent for how a figure is handed in — they explain a parameter that no longer exists. `baseDamageBonus` keeps its own docblock.

- [ ] **Step 3: Drop the `blastGuarded` play option**

```ts
// legalMoves.ts:51
-  readonly blastGuarded?: boolean
// playCard.ts:130
-      blastGuarded: options?.blastGuarded ?? false,
```

- [ ] **Step 4: Delete the dedicated module and its two specs**

Run: `Remove-Item src\warCouncil\timebomb.ts, src\warCouncil\__tests__\timebomb.test.ts, src\warCouncil\__tests__\playCard.timebomb.test.ts`
Expected: no output; the three files are gone.

- [ ] **Step 5: Verify the module is clean and typechecks**

Run: `Get-ChildItem src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "timebomb|blastGuard" -CaseSensitive:$false`
Expected: zero hits.

Run: `npx vitest run src/warCouncil/__tests__ --project node`
Expected: exits 0.

---

## Phase 2 — Round state, its reducer, and its handlers

The largest single surface: five fields on `RoundUiState`, one on `TrickResolution`, one on the encounter, and their readers across the reducer and every handler. Each task moves one shape with all its readers, so the phase never leaves a written-but-unread field. `src/app/` may import React freely — the pure-core boundary does not apply here. The phase ends type-checking with the round state carrying no Timebomb or Blast Guard field.

### Task 7: Delete the five `RoundUiState` fields and the two predicates

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/roundUiState.ts` — delete `timebombArmedDamage` (82), `primedTimebombDamage` (86), `timebombFuseRemaining` (99), `timebombBuff` (109), `blastGuardHeld` (113), `TrickResolution.timebombDamage` (49), and the exported `timebombArmed` (247) and `timebombFuseLive` (253)
- Modify: `src/app/warCouncil/roundUiSeed.ts` — drop the fields from the seed
- Test: every spec constructing a `RoundUiState` or `RoundUiSeed` literal — **40 sites name `timebombArmedDamage`, 31 name `timebombFuseRemaining`, 12 name `primedTimebombDamage`, 150 name `blastGuardHeld`**

- [ ] **Step 1: Delete the fields and their docblocks**

```ts
export interface RoundUiState {
-  readonly timebombArmedDamage: TimebombDamage | null
-  readonly primedTimebombDamage: TimebombDamage | null
-  readonly timebombFuseRemaining: number
-  readonly timebombBuff: Buff | null
-  readonly blastGuardHeld: boolean
}
```

Also delete `TrickResolution.timebombDamage` at line 49 and the `TimebombDamage` import at line 35. Preserve the docblocks on `discardsRemaining` and the other hand-scoped fields that currently say "the same contract `blastGuardHeld` documents" — rewrite those to stand on their own rather than citing a deleted field.

- [ ] **Step 2: Delete the two exported predicates**

```ts
-export function timebombArmed(state: RoundUiState): boolean { … }
-export function timebombFuseLive(state: RoundUiState): boolean { … }
```

Leave the 2026-08-26 docblock at line 334 that explains Cheat's exception, but delete its two paragraphs about the Timebomb *not* sharing that exception — they describe a card that no longer exists.

- [ ] **Step 3: Fix every construction site**

Run: `npm run typecheck`
Expected: an error for each literal still supplying a deleted field. Work through them; `RoundUiSeed` in particular is built by hand-written fixtures that carry no type annotation.

- [ ] **Step 4: Verify zero survivors**

Run: `Get-ChildItem src\app -Recurse -Include *.ts,*.tsx | Select-String -Pattern "timebombArmedDamage|primedTimebombDamage|timebombFuseRemaining|timebombBuff|blastGuardHeld"`
Expected: zero hits.

### Task 8: Delete the pending-damage queue and the fuse from the reducer

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/roundReducer.ts` — delete the queue and fuse transitions and the `RoundUiActionKind` variants that drive them
- Modify: `src/hunt/encounter.ts` — delete `EncounterState.pendingTimebomb` (**55 sites, 28 in tests**)
- Modify: `src/app/warCouncil/quarryAdvance.ts:53-54` — delete the `timebombDamage: null` write and its comment
- Delete: `src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts`, `roundReducer.timebombQueue.test.ts`, `timebombFuse.test.ts`
- Test: `src/app/warCouncil/__tests__/roundReducer.test.ts` — drop queue and fuse cases

- [ ] **Step 1: Delete `pendingTimebomb` from the encounter**

```ts
export interface EncounterState {
-  readonly pendingTimebomb: Readonly<Record<DuelSide, Damage>>
}
```

Remove its initialiser in the encounter factory and every read.

- [ ] **Step 2: Delete the fuse countdown and the queue transitions from the reducer**

Remove the branch that decrements `timebombFuseRemaining` at each trick boundary, the branch that moves an armed Timebomb to primed, and the branch that folds `pendingTimebomb` into health at the next resolution. Delete any `RoundUiActionKind` variant that exists only to drive one of these; leave every other action alone.

- [ ] **Step 3: Delete the three dedicated reducer specs**

Run: `Remove-Item src\app\warCouncil\__tests__\roundReducer.timebomb.test.ts, src\app\warCouncil\__tests__\roundReducer.timebombQueue.test.ts, src\app\warCouncil\__tests__\timebombFuse.test.ts`
Expected: no output.

- [ ] **Step 4: Typecheck and run the reducer specs**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts`
Expected: Vitest exits 0.

### Task 9: Delete the Timebomb branches from the buff and commit handlers

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/buffHandlers.ts` — delete the `timebombDamageOf` import (21), the `timebombLive` import (32), the arming writes (178-183), the revoke interception (206), and the Timebomb halves of the docblocks at 41, 52, 55, 85, 140, 148, 170
- Modify: `src/app/warCouncil/commitHandlers.ts:72` (`blastGuarded: state.blastGuardHeld`), `:298`, `:357` (the `blastGuardSpent` clears)
- Modify: `src/app/warCouncil/discardHandlers.ts`, `cardDamage.ts:109`, `roundResult.ts`, `roundBars.ts`
- Test: `src/app/warCouncil/__tests__/buffHandlers.test.ts`, `commitHandlers` specs, `cardDamage.test.ts`

- [ ] **Step 1: Delete the arming writes**

```ts
-    timebombArmedDamage:
-      buff.kind === BuffKind.Timebomb ? timebombDamageOf(buff) : state.timebombArmedDamage,
-    timebombBuff: buff.kind === BuffKind.Timebomb ? buff : state.timebombBuff,
```

- [ ] **Step 2: Delete the revoke interception**

```ts
-  if (state.timebombBuff !== null && state.timebombBuff.id === id) { … }
```

This is the branch the DLR-154 FIX D docblock in `buffActivation.ts` referred to; that docblock went in Task 4, so nothing is left describing a branch that no longer exists.

- [ ] **Step 3: Delete the Blast Guard threading in the commit handlers**

```ts
// :72
-    blastGuarded: state.blastGuardHeld,
// :298 and :357 — the field is gone from RoundUiState, so delete both spread entries
-    blastGuardHeld: resolvedTrick?.resolution.blastGuardSpent ? false : state.blastGuardHeld,
```

- [ ] **Step 4: Prune the docblocks that describe both cards at once**

Several comments in `buffHandlers.ts` read "a Cheat or a Timebomb". Rewrite each to name Cheat alone rather than deleting the whole comment — the Cheat behaviour they describe is unchanged and still needs explaining.

- [ ] **Step 5: Typecheck and run the handler specs**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/buffHandlers.test.ts src/app/warCouncil/__tests__/cardDamage.test.ts`
Expected: Vitest exits 0.

### Task 10: Remove the Timebomb term from the resolution path

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/resolutionBeats.ts:70` — the docblock citing `trickHit`/`timebombResets`
- Modify: `src/app/warCouncil/resolutionLethal.ts:15` — the comment listing a Timebomb detonation as a damage source
- Modify: `src/app/warCouncil/TrickResolutionScreen.tsx` — delete the Timebomb damage beat and the 60% payout-reduction term
- Test: `src/app/warCouncil/__tests__/` resolution specs

- [ ] **Step 1: Delete the Timebomb beat and the payout-reduction term from the screen**

Per `mockup.html`'s resolution panel: the rows "Timebomb detonation → you", "Payout reduced by Timebomb (60%)" and "Blast Guard spent — streak saved" all go. The base damage, buff, overlap-bonus and pot rows are untouched.

- [ ] **Step 2: Update the two docblocks**

`resolutionBeats.ts:70` currently explains that either `trickHit` or `timebombResets` being true always makes a beat fire. After Task 6 there is only `trickHit` — rewrite the sentence rather than deleting the docblock.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: `src/app/warCouncil/` reports no remaining errors from Phase 2's deletions; anything left names `src/sim/` or CSS-adjacent components Phase 3 covers.

---

## Phase 3 — The presentational layer

Everything the player sees: the ticking heart and its CSS, the dedicated mark component, the shop glyphs, the hint copy, and the one colour-token rename. `mockup.html` in this folder is the approved layout reference for what each surface looks like after the removal. This phase carries the contract's only non-subtractive change — the token rename — and the single most dangerous line, keeping `HeartState.AtRisk` while deleting `HeartState.Ticking`. The phase ends type-checking.

### Task 11: Delete the ticking heart state and its CSS

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/duelHealthBars.ts:76` (the `Ticking` member), `:98-101` (`HealthBarOverlays.ticking`), `:128-129`, `:169`, `:205`, `:210`, `:223-224`, `:238` (the clamp, the absorb call and the state selection)
- Modify: `src/app/warCouncil/warCouncilHealthBars.css:42-49` — delete `--wc-hp-ticking-fill`, `--wc-hp-ticking-opacity`, `--wc-hp-shield-ticking-opacity` and every `[data-state='ticking']` selector
- Test: `src/app/warCouncil/__tests__/duelHealthBars.test.ts`, `BankMeter.test.tsx`

- [ ] **Step 1: Delete `Ticking` — and only `Ticking` — from the heart-state map**

```ts
export const HeartState = {
  Whole: 'whole',
  AtRisk: 'atRisk',       // ← KEEP. This is the streak preview, not the Timebomb.
-  Ticking: 'ticking',
  Breaking: 'breaking',
  Broken: 'broken',
} as const
```

Update the map's docblock, which currently ends "`Ticking` was added on DLR-101 for a standing heart that booked Timebomb has already claimed."

- [ ] **Step 2: Delete the overlay and the arithmetic that reads it**

```ts
export interface HealthBarOverlays {
  readonly breaking?: Readonly<Record<DuelSide, Damage>>   // keep
-  readonly ticking?: Readonly<Record<DuelSide, Damage>>
  readonly shield?: Health                                  // keep
}
```

Delete the clamp at line 205 (documented as "the ONE clamp on booked Timebomb"), the `atRiskEnd` subtraction of `ticking` at line 210, the `absorbWithShield` call at 223-224 that routes a booked Timebomb through the shield, and the `HeartState.Ticking` branch at 238. **The `AtRisk` branch stays** — recompute `atRiskEnd` from the streak alone.

- [ ] **Step 3: Delete the CSS custom properties and selectors**

The `HeartState` values are written into the DOM as `data-state` and matched by attribute selectors, so this must land in the same task as Step 1 or the stylesheet silently keeps a dead rule.

- [ ] **Step 4: Verify `AtRisk` survived**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "HeartState\.AtRisk|atRisk"`
Expected: **non-zero** hits — this is an inverted check. Zero hits means the streak preview was deleted by mistake, which is a scope breach, not a clean removal.

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "ticking"`
Expected: zero hits.

- [ ] **Step 5: Run the health-bar specs**

Run: `npx vitest run src/app/warCouncil/__tests__/duelHealthBars.test.ts`
Expected: exits 0.

### Task 12: Delete the Timebomb mark component and its stylesheet

- Skill: `react-frontend`

**Files:**

- Delete: `src/app/warCouncil/TimebombMark.tsx`, `src/app/warCouncil/timebombMarks.ts`, `src/app/warCouncil/warCouncilTimebombMark.css`
- Delete: `src/app/warCouncil/__tests__/TimebombMark.test.tsx`, `WarCouncilRound.timebomb.test.tsx`, `WarCouncilRound.timebombRevoke.test.tsx`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx`, `WarCouncilTable.tsx`, `HandFan.tsx`, `PlayingCard.tsx`, `TrickWell.tsx` — drop the import, the props and the render branch
- Modify: `src/app/warCouncil/warCouncilHand.css:126-127` — delete `.wc-fan.wc-is-marking`

- [ ] **Step 1: Delete the six files**

Run: `Remove-Item src\app\warCouncil\TimebombMark.tsx, src\app\warCouncil\timebombMarks.ts, src\app\warCouncil\warCouncilTimebombMark.css, src\app\warCouncil\__tests__\TimebombMark.test.tsx, src\app\warCouncil\__tests__\WarCouncilRound.timebomb.test.tsx, src\app\warCouncil\__tests__\WarCouncilRound.timebombRevoke.test.tsx`
Expected: no output.

- [ ] **Step 2: Remove the stylesheet import and every render branch the compiler flags**

Run: `npm run typecheck`
Expected: errors naming each component that imported the deleted module. Remove the import, the prop, and the branch — including the marking-mode predicate that put `wc-is-marking` on the hand fan.

- [ ] **Step 3: Delete the marking-mode CSS**

`warCouncilHand.css:126-127` — delete the `.wc-fan.wc-is-marking` rule and the comment above it explaining that the tint is presentational only and `TIMEBOMB_ARMED_HINT` carries the mode to a player who cannot see colour.

- [ ] **Step 4: Confirm no dangling stylesheet import**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "warCouncilTimebombMark|TimebombMark|timebombMarks|wc-is-marking"`
Expected: zero hits.

### Task 13: Delete the hint copy and the buff-label branches

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/labels.ts:223` — delete `TIMEBOMB_ARMED_HINT`
- Modify: `src/app/warCouncil/roundHint.ts:5` (the import), `:34` (the branch)
- Modify: `src/app/warCouncil/buffLabels.ts`, `buffRideLabels.ts`, `buffRideModel.ts`, `buffRideProps.ts`, `BuffGallery.tsx`, `BuffRideZone.tsx`, `BuffRidingList.tsx`, `AbilityPrompt.tsx`
- Modify: `src/app/ErrorBoundary.tsx`
- Test: `src/app/warCouncil/__tests__/buffLabels.test.ts`, `buffRideLabels.test.ts`, `buffRideModel.test.ts`, `BuffRidingList.test.tsx`, `BuffGallery.test.tsx`, `buffGalleryModel.test.ts`

- [ ] **Step 1: Delete the copy constant and its only reader**

```ts
// labels.ts:223
-export const TIMEBOMB_ARMED_HINT = '…'
// roundHint.ts:34
-  if (ui.timebombArmedDamage !== null) return TIMEBOMB_ARMED_HINT
```

- [ ] **Step 2: Remove the Timebomb rows from every label and gallery map**

`buffLabels.ts` and its siblings hold per-`BuffKind` records. With the variant gone in Phase 1 these are compile errors — remove each row. **Do not touch the Sidestep rows**: its `'dodge a skull with this card'` description and its `'DODGE'` face are corrected on DLR-167, not here.

- [ ] **Step 3: Typecheck and run the label specs**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/buffLabels.test.ts src/app/warCouncil/__tests__/buffRideLabels.test.ts`
Expected: Vitest exits 0.

### Task 14: Remove the two items from the shop screen

- Skill: `react-frontend`, and `game-ux` for the empty-shelf decision

**Files:**

- Modify: `src/app/run/shopLabels.ts`, `src/app/run/SlotGlyph.tsx`, `src/app/run/slotSymbols.ts`
- Modify: `src/app/run/shopSlot.css:112-113`, `src/app/run/shopSlotReel.css:119-120` — delete `[data-glyph='timebomb']`
- Test: `src/app/run/__tests__/ShopPanel.test.tsx`, `ShopPanel.manageBuffs.test.tsx`, `shopLabels.test.ts`, `shopPrices.test.ts`, `shopRefusals.test.ts`, `ShopCardMotion.test.tsx`

- [ ] **Step 1: Delete the labels, glyphs and symbols for both items**

Both `ShopItem` variants went in Task 5, so every per-item record is a compile error. Remove each row and the `timebomb` glyph from the symbol map.

- [ ] **Step 2: Render no fight-long shelf when it has no stock**

The Blast Guard was the fight-long shelf's only item. Per `game-ux` — *do not render a panel that has nothing to say* — an empty labelled shelf becomes furniture that teaches the player to stop looking. Render the shelf only when it has at least one item, rather than showing an empty frame or a "nothing available" row.

This is flagged under **Developer decides or observes**; implement the default and surface it in the final report so it can be overturned by eye.

- [ ] **Step 3: Delete the glyph CSS**

Both `[data-glyph='timebomb']` rules and their `--wc-timebomb`/`--wc-timebomb-edge` reads go. Task 15 renames the token; deleting these first means Task 15 has two fewer call sites to repoint.

- [ ] **Step 4: Run the shop specs**

Run: `npx vitest run src/app/run/__tests__ --project dom`
Expected: exits 0.

### Task 15: Rename the shared colour token

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/warCouncil.css:70-71` — the two declarations
- Modify: `src/app/run/run.css:70`, `src/app/warCouncil/warCouncilBankMeter.css:133,135,139`, `src/app/warCouncil/warCouncilBuffCard.css:304` — the three surviving consumers
- Modify: `src/app/warCouncil/warCouncilCardFace.css`, `warCouncilHunt.css`, `warCouncilTable.css` — any remaining read

- [ ] **Step 1: Rename the two declarations**

```css
-  --wc-timebomb: #8fb04e;
-  --wc-timebomb-edge: #5c7a2e;
+  --wc-gain: #8fb04e;
+  --wc-gain-edge: #5c7a2e;
```

The hex values do not change — this is a rename, not a retune. **The name is the developer's call** and is listed under Developer decides or observes; if they chose differently at the gate, use their name here.

- [ ] **Step 2: Repoint every surviving consumer**

Three surfaces borrow this colour with no connection to the deleted mechanic and must keep rendering identically: the won-verdict headline (`run.css:70`), the feeder carry-out row (`warCouncilBankMeter.css`), and the buff card's payoff-gain chip (`warCouncilBuffCard.css:304`).

- [ ] **Step 3: Verify the token is fully renamed, not half-renamed**

Run: `Get-ChildItem src -Recurse -Include *.css,*.ts,*.tsx | Select-String -Pattern "wc-timebomb"`
Expected: zero hits.

Run: `Get-ChildItem src -Recurse -Include *.css | Select-String -Pattern "wc-gain"`
Expected: non-zero hits — the two declarations plus the surviving consumers. A CSS custom property that is read but never declared fails silently and renders an unstyled element, so both directions matter.

---

## Phase 4 — The simulator

`src/sim/` depends on everything above and nothing depends on it, so it goes last among the code phases. It is lint-enforced pure. Removing the Timebomb fixtures changes how many draws are taken from the seeded generator, so seeded expectations downstream will shift — that is a fixture update, not a regression, and each new value must be reasoned about rather than pasted from a failing run. The phase ends with `npx vitest run src/sim/__tests__` green.

### Task 16: Delete the Timebomb fixtures and policy behaviour

- Skill: `react-frontend`

**Files:**

- Modify: `src/sim/fixtures.ts:113-230` — delete `attemptPrimedTimebomb` and `fixtureHandWithPrimedTimebomb`, and the docblock at lines 4-5
- Modify: `src/sim/baselinePolicy.ts:22`, `cardAwarePolicy.ts:28` — the docblocks stating each never arms a Timebomb
- Modify: `src/sim/skilledPolicy.ts`, `policies.ts` — delete the `skilledWithTimebomb` and `sharpshooterNoTimebomb` policy entries
- Modify: `src/sim/playHand.ts`, `playHandWindows.ts`, `playRun.ts`, `report.ts`, `index.ts` — drop Timebomb instrumentation and re-exports
- Test: `src/sim/__tests__/` — six spec files

- [ ] **Step 1: Delete the two fixture builders**

`attemptPrimedTimebomb` (line 126) and `fixtureHandWithPrimedTimebomb` (line 221) both exist only to drive a Timebomb to detonation. Delete both, their retry loops, and the long docblocks at lines 113-125 and 208-220 explaining the narrow window they hunt for.

- [ ] **Step 2: Delete the two named policies**

`skilledWithTimebomb` and `sharpshooterNoTimebomb` are policy variants distinguished only by whether they arm a Timebomb. With the card gone, `sharpshooterNoTimebomb` is a duplicate of its base and `skilledWithTimebomb` is unimplementable. Delete both entries from the policy registry, keeping the base policies.

- [ ] **Step 3: Delete the Timebomb instrumentation from the report**

Any counter or column in `report.ts` tracking Timebomb arms, detonations or guard saves goes with them.

- [ ] **Step 4: Rebase the seeded expectations**

Run: `npx vitest run src/sim/__tests__ --project node`
Expected: any failure is a **seeded-value shift**, not a logic error. For each, confirm the new value follows from removing draws from the seeded sequence before updating the expectation — do not paste the actual output without that reasoning. Report each rebased value in the final report.

- [ ] **Step 5: Confirm the module is clean and still pure**

Run: `Get-ChildItem src\sim -Recurse -Include *.ts | Select-String -Pattern "timebomb|blastGuard" -CaseSensitive:$false`
Expected: zero hits.

Run: `npm run lint`
Expected: exits 0 — `src/sim/` is lint-enforced pure and the purity override must still be firing.

### Task 17: Sweep the remaining test files across all four modules

- Skill: `react-frontend`

**Files:**

- Test: the remaining specs under `src/app/warCouncil/__tests__/`, `src/app/run/__tests__/`, `src/hunt/__tests__/`, `src/warCouncil/__tests__/`, `src/sim/__tests__/` that mention either mechanic among other things — **98 test files named one of the two at the start of this contract**, minus the eleven deleted outright

- [ ] **Step 1: Find every test file still naming either mechanic**

Run: `Get-ChildItem src -Recurse -Include *.test.ts,*.test.tsx | Select-String -Pattern "timebomb|blastGuard" -CaseSensitive:$false | Select-Object -ExpandProperty Path -Unique`
Expected: a list. Each is a spec covering Timebomb or Blast Guard **among other things** — edit it in place, removing the fixture, field or assertion, rather than deleting the file.

- [ ] **Step 2: Remove the test helper that builds a guarded fixture**

`blastGuardHeldFixture` appears at 32 sites. Delete the helper and every call, along with any `describe` block whose whole subject was the guard.

- [ ] **Step 3: Confirm the sweep is complete**

Run: `Get-ChildItem src -Recurse -Include *.test.ts,*.test.tsx | Select-String -Pattern "timebomb|blastGuard" -CaseSensitive:$false`
Expected: zero hits.

- [ ] **Step 4: Run both Vitest projects separately to warm the cache**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. Running them separately first is what avoids the cold-cache worker-start timeout on the `dom` project — a single cold timeout is infrastructure, not a failing test.

---

## Phase 5 — Documentation

The ruleset and the per-module implementation docs, both owned by the `implementation-doc-writer` skill and never edited by hand. This phase changes no code, so it cannot break a gate — but it is the phase that stops the game's own rules from describing a card that no longer exists.

### Task 18: Update the ruleset and the implementation docs

- Skill: `implementation-doc-writer`

**Files:**

- Modify: `.docs/game_rules/the-hunt.md` — the Timebomb rules in section 4, the Blast Guard rules in sections 7 and 10, the Status register, Known tensions, and the last-reviewed date
- Modify: `.docs/implementation/` — the module folders for `hunt`, `war-council`, `app` and `sim`, plus the top-level `README.md`

- [ ] **Step 1: Invoke the skill and let it run its own workflow**

Invoke `implementation-doc-writer` via the `Skill` tool. Hand it the cumulative changed-files list from Phases 1–4 and this contract's `plan.md`. Do not pre-empt its decisions about which docs to touch — its Step 1 check decides that, including the cross-module stale-reference sweep, which matters here because this contract deletes vocabulary (`Timebomb`, `Blast Guard`, `ticking heart`, `fuse`, `pending damage`) that docs for **untouched** modules may still name.

- [ ] **Step 2: Confirm the ruleset no longer describes either card**

The rules to remove from `the-hunt.md`: the whole "Timebomb — priming a card before you play it" section in section 4; "A primed trick the Quarry wins cleanly costs you nothing" and "Timebomb landing on you wipes your streak" in section 7; "A Blast Guard buys back the streak, not the health" in section 7; and the Blast Guard's shop entry in section 10.

Retire the Known tension recording that **the Timebomb name is actively misleading** — it is resolved by deletion, which is a genuine resolution, not a quiet drop. Also retire the tension about a held Guard costing you health.

The dated change-notes at the top of the file are the ruleset's own record of what changed and are **kept** — that is the AC5 carve-out for deliberately historical prose. Add one new dated note naming this removal and pointing at Curse as the replacement.

- [ ] **Step 3: Confirm the doc pass reported what it did**

Expected: the skill reports which module docs were created versus updated, which rules were removed from `the-hunt.md` and which markers moved, and confirms every path in the Status register still resolves to a real file. A silent pass fails this step — the register in particular names files this contract deleted.

---

## Phase 6 — Final verification

No production changes. Only cumulative sanity checks, including the two inverted greps that catch a removal which went too far. Every recursive grep uses the `Get-ChildItem … | Select-String` form — `Select-String -Path` does not recurse, and its `**` matches exactly one directory level, which would report a false zero for exactly the names this phase exists to prove are gone.

### Task 19: Prove the mechanics are gone — and that the survivors survived

- Skill: `none — verification only, no code is written`

**Files:**

- (no file changes)

- [ ] **Step 1: The headline acceptance grep**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "timebomb|blast.?guard" -CaseSensitive:$false`
Expected: zero hits. Quote the command and the count in the final report — acceptance criterion 5 asks for both. If a hit survives inside a docblock deliberately recording project history, quote it and justify it explicitly rather than letting it pass silently.

- [ ] **Step 2: The inverted checks — confirm nothing adjacent was deleted by mistake**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "atRisk"`
Expected: **non-zero** hits. `HeartState.AtRisk` is the streak preview and must survive; zero hits means a scope breach.

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "BuffKind\.Cheat"`
Expected: **non-zero** hits. Cheat is out of scope and is the shape DLR-167 copies.

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "BuffKind\.Sidestep"`
Expected: **non-zero** hits, including its `'dodge a skull with this card'` description and `'DODGE'` face, both of which are DLR-167's to change and must be untouched here.

- [ ] **Step 3: Confirm the cut condition families were not disturbed**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "MarkOfRank|Glutton|Hoarder|Unbloodied|DebtCollector|Keepsake|Miser|Cornered"`
Expected: non-zero hits. These eight are deliberately retained-but-unmintable and get the opposite treatment from the Timebomb; deleting or restoring any of them is out of contract.

### Task 20: Confirm the architectural boundaries still hold

- Skill: `none — verification only, no code is written`

**Files:**

- (no file changes)

- [ ] **Step 1: The pure-core boundary grep**

Run: `Get-ChildItem src\warCouncil, src\hunt, src\sim -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

- [ ] **Step 2: Confirm `eslint.config.js` was not edited**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git diff --name-only -- eslint.config.js`
Expected: no output. The two `no-restricted-globals` blocks' ordering is load-bearing — flat config replaces rather than merges same-key options, and the second block's `ignores` for `src/warCouncil/**` and `src/hunt/**` exist solely to stop it overwriting the first block's full DOM ban. That regression shipped once, on DLR-106.

- [ ] **Step 3: Confirm the save schema was not bumped and no storage call escaped**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "SAVE_SCHEMA_VERSION = "`
Expected: exactly one hit, `src/persistence/config.ts`, still reading `1`. This contract changes no persisted shape — only a stored template-id value stops resolving, which `reconcileVault` already handles.

- [ ] **Step 4: Confirm no file grew past the budget**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Where-Object { (Get-Content $_.FullName).Count -gt 400 } | Select-Object FullName, @{n='Lines';e={(Get-Content $_.FullName).Count}}`
Expected: no output. Use `(Get-Content).Count`, never `Measure-Object -Line`, which drops blank lines and has hidden a real breach before.

### Task 21: Static gates, full suite, and the build

- Skill: `none — verification only, no code is written`

**Files:**

- (no file changes)

- [ ] **Step 1: Warm the Vitest cache, then run the gates**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. This warms the transform cache so the full run below does not hit the cold-start worker timeout on the `dom` project.

- [ ] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0. Vitest reports 0 failed. **The test count will be lower than before this contract** — eleven spec files were deleted along with the behaviour they covered. Quote the summary line and state the drop as expected, not as a regression.

- [ ] **Step 3: Formatting, scoped to this contract's files**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; $f = git diff --name-only --diff-filter=d | Where-Object { $_ -match '\.(ts|tsx|css)$' }; npx prettier --check @f`
Expected: exits 0. (`@f` splats the file list as separate arguments; passing the array directly would hand prettier one space-joined string.) Run repo-wide `npm run format:check` as well and report its result, but **do not gate on it** — it fails on ~59 pre-existing `.docs/**` files no contract here has touched. Never run `npm run format`, which would rewrite every design document.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. Note that `build` runs `lint` first, so a lint regression fails here too.

### Task 22: Write the PR description

- Skill: `none — documentation hand-off, no code is written`

**Files:**

- Create: `.claude/contract/DLR-166-remove-timebomb-and-blast-guard/pr-description.md`

- [ ] **Step 1: Write `pr-description.md` for the developer to paste**

Include:

- A link to `plan.md` in this folder, and the mockup's path.
- What was removed, in one paragraph, and the fact that it is purely subtractive apart from the colour-token rename.
- The acceptance grep from Task 19 Step 1, quoted with its count, plus the three inverted checks and their non-zero results.
- The final test counts and the size of the drop, stated as expected.
- Every seeded simulator expectation rebased in Task 16, with the reasoning.
- The four items under **Developer decides or observes**, restated: the colour token's name, the emptied fight-long shelf, how the rail and health bar read by eye, and the docblock line.
- A one-line note that DLR-167 rebuilds a card-in-hand targeting surface for Curse, and that the deleted one is recoverable with `git show <commit>:src/app/warCouncil/timebombMarks.ts`.

---

## Self-review

**Spec coverage:**

- Delete `BuffKind.Timebomb` and its template row — Task 1.
- Delete the `ShopItem` variants, prices, shelf, refusals — Tasks 2, 5, 14.
- Delete the fuse, queue, previews, `TimebombLive` refusal — Tasks 4, 8, 11.
- Delete the resolution/fold ordering — Tasks 6, 10.
- Delete `blastGuardHeld` / `blastGuarded` / `blastGuardSpent` — Tasks 5, 6, 7, 9.
- Delete the four dedicated source files and eleven test files — Tasks 6, 8, 12.
- Timebomb-only CSS deleted; shared token renamed — Tasks 11, 12, 14, 15.
- Simulator no longer models a Timebomb — Task 16.
- Ruleset and implementation docs — Task 18.
- Zero-hit grep with the command and count reported — Task 19.
- Gates, suite, build — Task 21.
- 400-line budget — Task 20 Step 4.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact deletion, or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `BuffKind.Timebomb`, `ShopItem.Timebomb`, `ShopItem.BlastGuard`, `ShopStock.blastGuardHeld`, `BuffActivationStock.timebombLive`, `BuffActivationRefusal.TimebombLive`, `HeartState.Ticking`, `HeartState.AtRisk`, `HealthBarOverlays.ticking`, `RoundUiState.{timebombArmedDamage, primedTimebombDamage, timebombFuseRemaining, timebombBuff, blastGuardHeld}`, `TrickResolution.timebombDamage`, `EncounterState.pendingTimebomb`, `TIMEBOMB_ARMED_HINT`, `--wc-timebomb` → `--wc-gain` are each spelled identically here and in `plan.md` Part 2 → Data shapes. `HeartState.AtRisk` is named in three separate places as a **survivor**, deliberately.

**Phase boundary cleanliness:**

- **Phase 1** ends with `src/hunt/` and `src/warCouncil/` free of both mechanics and type-checking on their own; remaining compiler errors name only `src/app/` and `src/sim/`, which later phases own. No half-applied rename: each shape moves with all its readers inside one task.
- **Phase 2** ends with the round state, reducer and handlers carrying no Timebomb or Blast Guard field, and `npm run typecheck` clean except for presentational components Phase 3 covers.
- **Phase 3** ends with the app type-checking fully, no dangling stylesheet import, and the renamed colour token both declared and read — verified in both directions, since a read-but-undeclared custom property fails silently.
- **Phase 4** ends with the whole suite green and `src/sim/` still lint-enforced pure.
- **Phase 5** changes no code and cannot break a gate.
- **Phase 6** makes no production change at all.
