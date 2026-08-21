# Tasks: Visual and interaction polish pass

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-21

**Goal:** Give every new interactive surface from DLR-89 through DLR-95 (the shop tabs, the poison-marking interaction, the flask control, the Apply Damage plate) a deliberate CSS/copy/motion pass — real hover/focus/active states, motion where controls currently snap, and a "Coming Soon" treatment on the refused tab that reads as intentional — without changing any behaviour, refusal logic, or already-verified acceptance criterion. **Follow-up scope (2026-08-21):** four more legibility fixes triaged from direct playtest feedback via `game-ux`/`game-designer` — an entrance animation on the ability prompt, a visible crossfade on the decree swap, the damage figure named in the trick-resolution sentence, and the felt-rail plates (Cheat/Envenom/Apply Damage) reshaped away from the playing-card silhouette. Two further notes (mine-reveal telegraphing, three "boring" screens) are recorded as open developer questions and have no task here.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** (none — no new files)

**Modified:**
- `src/app/warCouncil/warCouncil.css:61` — add `--wc-ui-transition-ms` to the `:root` token block
- `src/app/run/shop.css:167-214` — `.shop-tab*` transitions, hover/active refinement, refused-tab lock glyph
- `src/app/run/shopLabels.ts:102` — `SHOP_CATEGORY_COMING_SOON` copy
- `src/app/run/shopItems.css:32-72` — `.shop-list-item` transitions
- `src/app/run/shopFlask.css:35-58` — `.is-flask` row and icon polish
- `src/app/warCouncil/warCouncilEnvenom.css` — motion/colour polish across the whole file, plus the missing `prefers-reduced-motion` guard
- `src/app/warCouncil/warCouncilCards.css:140-155` — `.wc-venom-mark` colour tied to the existing `--wc-poison`/`--wc-poison-edge` tokens instead of an untied hex
- `src/app/warCouncil/warCouncilApplyDamage.css` — motion polish (the `filter` hover is currently untransitioned)
- `src/app/warCouncil/warCouncilCards.css` (`.wc-prompt`) — (follow-up) entrance animation for the ability prompt
- `src/app/warCouncil/AbilityPrompt.tsx` — (follow-up) apply the new entrance class
- `src/app/warCouncil/DecreePile.tsx` — (follow-up) `key` prop on the rendered decree card
- `src/app/warCouncil/warCouncilTable.css` (`.wc-pile-cards .wc-card`) — (follow-up) crossfade keyframe for the decree swap
- `src/app/warCouncil/TrickWell.tsx` — (follow-up) name the damage figure in the resolution sentence
- `src/app/warCouncil/warCouncilCheats.css`, `warCouncilEnvenom.css`, `warCouncilApplyDamage.css` — (follow-up) reshape the three felt-rail plates away from the 2:3 card aspect ratio

**Deleted:** (none)

**Developer decides or observes:**
- Every concrete colour, spacing, and motion-duration figure this pass adds — read them in `npm run dev` and retune by eye (`CLAUDE.md` → Developer-owned work: visual judgement).
- The rewritten `SHOP_CATEGORY_COMING_SOON` copy (Task 3) — read the proposed sentence and correct the tone if it's wrong.
- Whether the new transitions on the tabs and shop rows feel right in pacing, once played.
- (Follow-up) Whether the felt-rail plates' new shape reads right, or whether the cheaper material-only alternative would have been enough — see `plan.md` → Risks.
- (Follow-up) Whether the Jira ticket description should be updated to cover this expanded scope, or the follow-up items split into their own ticket — nothing here has touched Jira's content yet.
- (Follow-up, not built) Whether the mine/skull should telegraph before commit, or only the flip-moment needs to register better.
- (Follow-up, not built) Which of pacing, reward, or presentation is behind each "boring" screen — home/map, win/lose, between-hands tally.

---

## Phase 1 — Shared motion token and the shop tablist

This phase adds the one shared motion-duration token the rest of the plan reads, then applies it to the shop tablist, including the refused "game-permanent" tab's treatment (AC2). The tree type-checks and lints clean at the end of this phase; the tablist is visually complete on its own.

### Task 1: Add the shared UI transition-duration token ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/warCouncil.css:61` (immediately after the existing `--wc-hp-flash-ms: 900ms;` line, inside the same `:root` block)

- [x] **Step 1: Add `--wc-ui-transition-ms` beside the existing `--wc-hp-*-ms` pair**

```css
  --wc-hp-broken: #3a4a52;
  --wc-hp-atrisk-opacity: 0.55;
  --wc-hp-break-ms: 520ms;
  --wc-hp-flash-ms: 900ms;
  /* DLR-97 — shared hover/active/state-change duration for controls that previously had no
     transition at all (shop tabs, shop list rows) or an untransitioned filter (the felt-rail
     plates' hover brightness). Matches the felt-rail plates' existing 140ms transform/box-shadow
     pace so both screens' controls move at one shared speed. Developer's to retune. */
  --wc-ui-transition-ms: 140ms;
}
```

- [x] **Step 2: Typecheck (CSS has no type surface, but confirm nothing else in the tree broke)**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Polish `.shop-tab`'s interactive states ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/run/shop.css:167-218`
- Test: `src/app/run/__tests__/ShopCategoryTabs.test.tsx` (scoped run only — no assertion changes expected, this task is CSS-only)

- [x] **Step 1: Add a transition and a selected-state lift so the tab reads as pressed-in, not just recoloured**

Replace the existing `.shop-tab` rule (the block ending at `touch-action: manipulation;`) with:

```css
.shop-tab {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 44px;
  padding: 0.5rem clamp(0.4rem, 1.6vmin, 0.9rem);
  border: 1px solid var(--wc-brass-dim);
  border-bottom-width: 2px;
  border-radius: 4px 4px 0 0;
  background: none;
  color: var(--wc-chalk-dim);
  font-family: var(--wc-sans);
  font-size: clamp(0.62rem, 1.5vmin, 0.8rem);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    color var(--wc-ui-transition-ms) ease,
    border-color var(--wc-ui-transition-ms) ease,
    background-color var(--wc-ui-transition-ms) ease,
    transform var(--wc-ui-transition-ms) ease;
}
```

- [x] **Step 2: Lift the selected tab, so "open" reads in form as well as colour, matching `.shop-tab[aria-selected='true']`'s existing brass-edge treatment**

Add immediately after the existing `.shop-tab[aria-selected='true']` rule:

```css
.shop-tab[aria-selected='true'] {
  color: var(--wc-brass);
  border-color: var(--wc-brass);
  background: #ffffff0d;
  transform: translateY(-1px);
}
```

- [x] **Step 3: Add the refused tab's lock glyph, so "Coming Soon" reads as a considered dead-end rather than a disabled control that broke (AC2)**

Add immediately after the existing `.shop-tab[aria-disabled='true']` rule:

```css
.shop-tab[aria-disabled='true']::after {
  content: '🔒';
  margin-left: 0.4em;
  font-size: 0.85em;
  opacity: 0.65;
}
```

- [x] **Step 4: Run the scoped test and typecheck**

Run: `npx vitest run src/app/run/__tests__/ShopCategoryTabs.test.tsx; npm run typecheck`
Expected: both exit 0; Vitest reports the same pass count as before this task (no assertion touched the tab's visual styling).

### Task 3: Rewrite the refused tab's reason sentence ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/run/shopLabels.ts:102`
- Test: `src/app/run/__tests__/shopLabels.test.ts` (scoped run only — the existing assertions check length and containment via the constant, not a literal string, so no assertion changes)

- [x] **Step 1: Replace the generic refusal-style sentence with one that reads as a roadmap note**

```ts
/** AC4 — the refused rung's stated reason. Nothing is designed for game-permanent yet. */
export const SHOP_CATEGORY_COMING_SOON =
  'Locked for now — game-permanent items are still being designed.'
```

- [x] **Step 2: Run the scoped test**

Run: `npx vitest run src/app/run/__tests__/shopLabels.test.ts src/app/run/__tests__/ShopCategoryTabs.test.tsx src/app/run/__tests__/ShopPanel.test.tsx`
Expected: exits 0, same pass count as before — every assertion reads the constant, not the literal.

---

## Phase 2 — Shop list rows: priced items and the flask

This phase polishes the two remaining shop-screen surfaces named in AC1 that Phase 1 didn't touch: the priced `.shop-list-item` rows and the free `.is-flask` row. The tree type-checks cleanly at the end; the whole shop screen is visually complete.

### Task 4: Add a transition to `.shop-list-item` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/run/shopItems.css:32-51`
- Test: `src/app/run/__tests__/ShopPanel.test.tsx` (scoped run only)

- [x] **Step 1: Add the shared transition so hover/active no longer snap**

Replace the existing `.shop-list-item` rule (ending at `text-align: left;`) with:

```css
.shop-list-item {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  column-gap: clamp(0.4rem, 1.4vmin, 0.8rem);
  row-gap: 0.1rem;
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  padding: clamp(0.25rem, 0.9vmin, 0.45rem) clamp(0.3rem, 1vmin, 0.5rem);
  border: none;
  border-bottom: 1px solid var(--wc-brass-dim);
  background: none;
  color: var(--wc-chalk);
  font-family: var(--wc-sans);
  cursor: pointer;
  touch-action: manipulation;
  text-align: left;
  transition:
    background-color var(--wc-ui-transition-ms) ease,
    border-color var(--wc-ui-transition-ms) ease,
    transform var(--wc-ui-transition-ms) ease;
}
```

- [x] **Step 2: Run the scoped test and typecheck**

Run: `npx vitest run src/app/run/__tests__/ShopPanel.test.tsx; npm run typecheck`
Expected: both exit 0, same pass count as before.

### Task 5: Polish the flask row's icon and tag ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/run/shopFlask.css:42-58`
- Test: `src/app/run/__tests__/ShopPanel.test.tsx` (scoped run only)

- [x] **Step 1: Give the flask icon its own transition so the disabled-opacity change and a hover lift don't snap**

Replace the `.shop-flask-icon` and `.shop-flask-icon svg` rules with:

```css
.shop-flask-icon {
  flex: 0 0 auto;
  width: clamp(1rem, 2.4vmin, 1.4rem);
  height: clamp(1rem, 2.4vmin, 1.4rem);
  transition: transform var(--wc-ui-transition-ms) ease;
}

/* `stroke-width` set here, not on the paths, so it reaches the cloned symbol through `<use>`. */
.shop-flask-icon svg {
  width: 100%;
  height: 100%;
  display: block;
  stroke-width: 1.5;
}
```

- [x] **Step 2: Add a hover lift on the icon, guarded the same way `.shop-tab` and `.shop-list-item` already guard their own hover rules**

Add after the existing `.shop-list-item:disabled .shop-flask-icon svg` rule:

```css
@media (hover: hover) {
  .shop-list-item.is-flask:not(:disabled):hover .shop-flask-icon {
    transform: scale(1.08);
  }
}
```

- [x] **Step 3: Run the scoped test and typecheck**

Run: `npx vitest run src/app/run/__tests__/ShopPanel.test.tsx; npm run typecheck`
Expected: both exit 0, same pass count as before.

---

## Phase 3 — The poison-marking interaction: Envenom rail and card mark

This phase covers AC1's "poison-marking interaction": the felt-rail Envenom plate (held/poised/armed) and the on-card venom mark it produces. It also ties the card mark's colour to the project's existing `--wc-poison`/`--wc-poison-edge` tokens instead of an untied hex, which is a direct AC1 "colour against this project's existing palette" fix. The tree type-checks cleanly at the end.

### Task 6: Add the reduced-motion guard and a transitioned filter to the Envenom plate ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/warCouncilEnvenom.css`
- Test: `src/app/warCouncil/__tests__/EnvenomCharge.test.tsx` (scoped run only)

- [x] **Step 1: Add `filter` to the existing transition list, so the hover brightness change added below doesn't snap**

Replace the `.wc-envenom-plate` rule's `transition` block:

```css
  transition:
    transform 140ms ease,
    box-shadow 140ms ease,
    filter var(--wc-ui-transition-ms) ease;
```

- [x] **Step 2: Add the `prefers-reduced-motion` guard this file is missing, matching `.wc-apply-plate`'s and `.wc-card`'s existing guard**

Append at the end of the file:

```css

@media (prefers-reduced-motion: reduce) {
  .wc-envenom-plate {
    transition: none;
  }
}
```

- [x] **Step 3: Run the scoped test and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/EnvenomCharge.test.tsx; npm run typecheck`
Expected: both exit 0, same pass count as before.

### Task 7: Tie the on-card venom mark to the existing poison token family ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/warCouncilCards.css:140-155`
- Test: `src/app/warCouncil/__tests__/PlayingCard.test.tsx` (scoped run only)

- [x] **Step 1: Replace the untied `#4a7c3a` fill with `--wc-poison-edge`, the darker member of the pair `warCouncil.css` already defines for exactly this state**

```css
.wc-card .wc-venom-mark {
  position: absolute;
  bottom: calc(var(--wc-card-w) * 0.07);
  left: calc(var(--wc-card-w) * 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--wc-card-w) * 0.24);
  height: calc(var(--wc-card-w) * 0.24);
  border-radius: 50%;
  border: 2px solid var(--wc-parchment);
  background: var(--wc-poison-edge);
  color: var(--wc-parchment);
  font-size: calc(var(--wc-card-w) * 0.13);
  line-height: 1;
}
```

- [x] **Step 2: Run the scoped test and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/PlayingCard.test.tsx; npm run typecheck`
Expected: both exit 0, same pass count as before.

---

## Phase 4 — The Apply Damage plate

This phase covers AC1's fourth named surface. The tree type-checks cleanly at the end; every surface AC1 names is now polished.

### Task 8: Add a transitioned filter to the Apply Damage plate ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/warCouncilApplyDamage.css`
- Test: `src/app/warCouncil/__tests__/ApplyDamagePlate.test.tsx` (scoped run only)

- [x] **Step 1: Add `filter` to the existing transition list, so the existing hover brightness change stops snapping — the same fix as Task 6's, on this plate's sibling**

Replace the `.wc-apply-plate` rule's `transition` block:

```css
  transition:
    transform 140ms ease,
    box-shadow 140ms ease,
    filter var(--wc-ui-transition-ms) ease;
```

- [x] **Step 2: Run the scoped test and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/ApplyDamagePlate.test.tsx; npm run typecheck`
Expected: both exit 0, same pass count as before.

---

## Phase 5 — The ability prompt's entrance and the decree swap's visibility

Follow-up scope (2026-08-21). Both fixes close the same playtest note — motion currently doesn't exist on either surface, so neither reads as having changed at all. Both are mount-triggered CSS `@keyframes`, no new component state. The tree type-checks cleanly at the end.

### Task 13: Add the shared follow-up motion tokens ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/warCouncil.css:61` (immediately after `--wc-ui-transition-ms`, inside the same `:root` block)

- [x] **Step 1: Add the two named durations this phase's keyframes read**

```css
  --wc-ui-transition-ms: 140ms;
  /* DLR-97 follow-up — named durations for the two mount-triggered entrance/swap keyframes
     below, so neither is a magic number repeated across warCouncilCards.css and
     warCouncilTable.css. Developer's to retune. */
  --wc-prompt-enter-ms: 180ms;
  --wc-decree-swap-ms: 220ms;
}
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 14: Animate the ability prompt's entrance ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/warCouncilCards.css` (add near `.wc-prompt`)
- Test: `src/app/warCouncil/__tests__/AbilityPrompt.test.tsx` (scoped run only — no assertion changes expected)

- [x] **Step 1: Add a fade-and-rise keyframe that plays once the prompt mounts**

Add immediately after the existing `.wc-prompt` rule:

```css
.wc-prompt {
  animation: wc-prompt-enter var(--wc-prompt-enter-ms) ease-out both;
}

@keyframes wc-prompt-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .wc-prompt {
    animation: none;
  }
}
```

- [x] **Step 2: Run the scoped test and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/AbilityPrompt.test.tsx; npm run typecheck`
Expected: both exit 0, same pass count as before.

### Task 15: Give the decree swap a visible crossfade ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/DecreePile.tsx:37`
- Modify: `src/app/warCouncil/warCouncilTable.css` (`.wc-pile-cards .wc-card`)
- Test: `src/app/warCouncil/__tests__/QuarryDossier.test.tsx` is unrelated — no existing `DecreePile` test file was found; this task adds none since the change is presentational-only and the roving-tabindex/keyboard behaviour of the pile is untouched. Confirm via a full-project scoped run instead (Step 2).

- [x] **Step 1: Key the decree card so React remounts it on a genuine change, and give the remount an animation**

In `DecreePile.tsx`, change the rendered decree card:

```tsx
        <PlayingCard key={`${decree.suit}-${decree.rank}`} card={decree} variant="pile" envenomed={envenomed} />
```

In `warCouncilTable.css`, add immediately after the existing `.wc-pile-cards .wc-card` rule:

```css
.wc-pile-cards .wc-card {
  animation: wc-decree-swap var(--wc-decree-swap-ms) ease-out both;
}

@keyframes wc-decree-swap {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .wc-pile-cards .wc-card {
    animation: none;
  }
}
```

- [x] **Step 2: Run the War Council round tests and typecheck (no dedicated `DecreePile` test file exists — the round-level tests exercise a Fox exchange end to end)**

Run: `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx; npm run typecheck`
Expected: both exit 0, same pass count as before — the `key` change affects only remount identity, not any queried role, label, or state.

---

## Phase 6 — The skull/poison damage causality signal

Follow-up scope. Names the damage figure already computed by the reducer in the resolution sentence `TrickWell.tsx` already renders, closing the "hard to tell if I did damage or took damage" note without adding any new derivation. The tree type-checks cleanly at the end.

### Task 16: Name the damage figure in the trick-resolution sentence ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/TrickWell.tsx:79`
- Test: `src/app/warCouncil/__tests__/TrickWell.test.tsx` (scoped run — this task changes rendered text, so this test's own assertions on that line may need a matching update)

- [x] **Step 1: Read `resolvedTrick.resolution` for the figure that actually changed and name it**

Replace the existing resolution line:

```tsx
        <p className="wc-table-line">
          {winnerLabel} take the trick.
          {resolvedTrick.resolution.cashOut > 0 && ` They take ${resolvedTrick.resolution.cashOut}.`}
          {resolvedTrick.resolution.damageToPlayer > 0 &&
            ` You take ${resolvedTrick.resolution.damageToPlayer}.`}
        </p>
```

- [x] **Step 2: Update `TrickWell.test.tsx`'s existing assertion on this line, if any, to match the new sentence shape, then run it**

Run: `npx vitest run src/app/warCouncil/__tests__/TrickWell.test.tsx; npm run typecheck`
Expected: both exit 0. If the existing test asserted the exact old sentence text, update that one assertion to match — no other test in this file should need to change, since `resolution`'s fields are unchanged.

---

## Phase 7 — The felt-rail plates' shape, away from the playing-card silhouette

Follow-up scope. The Cheat slot, the Envenom plate, and the Apply Damage plate all currently share `.wc-card`'s exact `aspect-ratio: 2 / 3` — this phase reshapes all three together, since they're an established family (`warCouncilEnvenom.css` and `warCouncilApplyDamage.css` both say they mirror the Cheat slot), so a fix to one without the others would break the family resemblance the developer's own prior tickets deliberately built. The tree type-checks cleanly at the end; this is the last visual change before Final verification.

### Task 17: Reshape the Cheat slot ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/warCouncilCheats.css:49-65`
- Test: `src/app/warCouncil/__tests__/CheatSlots.test.tsx` (scoped run only — no assertion changes expected, presentational only)

- [x] **Step 1: Replace the card-matching `aspect-ratio: 2 / 3` with a squat rounded rectangle, distinct from `.wc-card`'s silhouette at any size**

Replace the `.wc-cheat-slot` rule's `aspect-ratio` declaration:

```css
  aspect-ratio: 4 / 3;
  border-radius: 10px;
```

- [x] **Step 2: Run the scoped test and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/CheatSlots.test.tsx; npm run typecheck`
Expected: both exit 0, same pass count as before.

### Task 18: Reshape the Envenom plate to match ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/warCouncilEnvenom.css:16-21`
- Test: `src/app/warCouncil/__tests__/EnvenomCharge.test.tsx` (scoped run only)

- [x] **Step 1: Apply the same `aspect-ratio`/`border-radius` change as Task 17, so the family stays consistent**

Replace the `.wc-envenom-plate` rule's `aspect-ratio` declaration:

```css
  aspect-ratio: 4 / 3;
  border-radius: 10px;
```

- [x] **Step 2: Run the scoped test and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/EnvenomCharge.test.tsx; npm run typecheck`
Expected: both exit 0, same pass count as before.

### Task 19: Reshape the Apply Damage plate to match ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/warCouncilApplyDamage.css:17-22`
- Test: `src/app/warCouncil/__tests__/ApplyDamagePlate.test.tsx` (scoped run only)

- [x] **Step 1: Apply the same `aspect-ratio`/`border-radius` change, completing the three-plate family**

Replace the `.wc-apply-plate` rule's `aspect-ratio` declaration:

```css
  aspect-ratio: 4 / 3;
  border-radius: 10px;
```

- [x] **Step 2: Run the scoped test and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/ApplyDamagePlate.test.tsx; npm run typecheck`
Expected: both exit 0, same pass count as before.

---

## Phase 8 — Final verification

The closing phase. No further visual changes — only sanity-checks that the cumulative polish pass is clean and changed nothing it wasn't meant to.

### Task 20: Confirm no tunable was hard-coded and no stale colour remains ✓

- [x] **Step 1: Confirm every file this plan touched reads `--wc-ui-transition-ms` rather than repeating `140ms` as a new literal**

Run: `Get-ChildItem src\app\run\shop.css,src\app\run\shopItems.css,src\app\run\shopFlask.css,src\app\warCouncil\warCouncilEnvenom.css,src\app\warCouncil\warCouncilApplyDamage.css | Select-String -Pattern "var\(--wc-ui-transition-ms\)"`
Expected: at least one hit in each of `shop.css`, `shopItems.css`, `shopFlask.css`, `warCouncilEnvenom.css`, and `warCouncilApplyDamage.css` — the five files Tasks 2, 4, 5, 6, and 8 added a transition to.
Confirmed: 4 hits in `shop.css`, 3 in `shopItems.css`, 1 in `shopFlask.css`, 1 in `warCouncilEnvenom.css`, 1 in `warCouncilApplyDamage.css`.

- [x] **Step 2: Confirm the untied `#4a7c3a` hex is gone from the venom mark**

Run: `Select-String -Path src\app\warCouncil\warCouncilCards.css -Pattern "#4a7c3a"`
Expected: zero hits.
Confirmed: zero hits.

- [x] **Step 3 (follow-up): Confirm the two new motion tokens are read, not repeated as literals**

Run: `Get-ChildItem src\app\warCouncil\warCouncilCards.css,src\app\warCouncil\warCouncilTable.css | Select-String -Pattern "var\(--wc-prompt-enter-ms\)|var\(--wc-decree-swap-ms\)"`
Expected: one hit for `--wc-prompt-enter-ms` in `warCouncilCards.css` and one hit for `--wc-decree-swap-ms` in `warCouncilTable.css`.
Confirmed: exactly one hit each, in the expected files.

- [x] **Step 4 (follow-up): Confirm all three felt-rail plates reshaped together, not just one or two**

Run: `Get-ChildItem src\app\warCouncil\warCouncilCheats.css,src\app\warCouncil\warCouncilEnvenom.css,src\app\warCouncil\warCouncilApplyDamage.css | Select-String -Pattern "aspect-ratio: 4 / 3;"`
Expected: exactly one hit in each of the three files — `.wc-cheat-slot`, `.wc-envenom-plate`, and `.wc-apply-plate` all reshaped, none left on the old `2 / 3` ratio.
Confirmed: exactly one hit each, in `warCouncilCheats.css`, `warCouncilEnvenom.css`, `warCouncilApplyDamage.css`.

### Task 21: Static gates and full suite ✓

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. Two tests are expected to need an updated assertion, not a failure: `TrickWell.test.tsx` (Task 16 changed the resolution sentence) — confirm any assertion on the old exact text was updated in that task, not left failing here.
Confirmed by QA (round 1 and round 2): typecheck 0 errors, lint 0 errors/0 warnings, `npm test` — 74 test files / 957 tests, all passing. Round 1 found `TrickWell.test.tsx`'s existing assertion was a substring match that didn't actually verify the new damage-figure clauses (`ac-test-gap`); fixed in the combined fix pass with two new assertions, sanity-checked as non-tautological, re-confirmed passing in round 2.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.
Confirmed by QA: exits 0, `dist/index.html` + CSS/JS assets written, no bundler errors or warnings (both review rounds).

### Task 22: QA browser pass on all eight polished surfaces ✓

- [x] **Step 1: Drive the app through the original four surfaces and confirm the new states render and the console stays clean**

QA starts the dev server detached per `web-project.md` and, through the `chrome-devtools` MCP: opens the shop screen and tabs through all four categories (confirming the refused tab shows the lock glyph and the new copy), hovers and buys a priced item and the flask, opens a fight and arms an Envenom charge onto a card, plays it face up to confirm the on-card mark renders in the new colour, and poises then triggers Apply Damage. Confirms no console error and no visual regression against AC3 (nothing here should change what any control does, only how it reads).
Expected: all five interactions complete with no console error; QA reports the viewport sizes checked.
QA report: reused the developer's own dev server on `localhost:5173` at 1280×800. Apply Damage confirmed fully live (health dropped by the exact stated amount, repeatedly). Envenom plate and Cheat slot shape confirmed live via screenshot. Console stayed clean throughout. Shop tabs, the flask row, and the on-card venom mark were **not reached live** within the session (QA chose not to push the fight further once its own health dropped to 4/10, to avoid restarting the run) — these three are backed by matching diffs, passing scoped tests, and correct production-bundle output instead of a live interaction. Disclosed explicitly by QA as weaker evidence, not a judgement call and not a failure.

- [x] **Step 2 (follow-up): Drive the four follow-up surfaces**

Through the same session: draw into a Woodcutter or play a Fox to trigger the ability prompt and confirm it now fades/rises in rather than snapping; force a Fox exchange and confirm the decree card crossfades rather than swapping instantly; resolve a trick that deals damage either way and confirm the resolution sentence now names the figure; and look at the Cheat slot, Envenom plate, and Apply Damage plate together and confirm none reads as a fourth playing card in the rail.
Expected: all four interactions complete with no console error; QA reports whether the resolution sentence read correctly for both a player-damage and a Quarry-damage trick, since that branch needs a specific hand to reach.
QA report: all four confirmed live. Ability prompt entrance rendered cleanly post-mount. Decree pile remounted and crossfaded across several Fox exchanges with a clean console each time. Trick-resolution wording confirmed for both branches: player-damage read "They take the trick. You take 1.", Quarry-damage/cash-out read "You take the trick. They take 1." All three felt-rail plates visually confirmed as squat, distinct shapes beside a played card.

### Task 23: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: a CSS/copy/motion-only polish pass across the shop tabs, the poison-marking interaction, the flask control, and the Apply Damage plate, plus four follow-up legibility fixes (ability-prompt entrance, decree-swap crossfade, damage-causality wording, felt-rail reshape) triaged from direct playtest feedback — no behaviour, refusal logic, or acceptance criterion changed anywhere.
- The developer decisions listed in the File map above (every concrete value is a first pass to retune by eye; the rewritten "Coming Soon" copy needs a tone read; the felt-rail reshape is the more decisive of two options and worth a second look).
- The two open questions this contract deliberately did not build against — mine-reveal telegraphing, and the flavour behind each "boring" screen — so they aren't lost between now and whatever picks them up next.
- Whether DLR-97's Jira description should be updated to cover the follow-up scope, or that scope split into its own ticket.
- Verification results from Phase 8.
- One-line note: `--wc-ui-transition-ms`, `--wc-prompt-enter-ms`, and `--wc-decree-swap-ms` are now the shared durations for any future control/animation of their kind — read them rather than inlining a new figure.

---

## Self-review

**Spec coverage:**
- AC1 (deliberate spacing/colour/states/motion pass on every DLR-89–95 surface) — Tasks 2, 4, 5, 6, 7, 8.
- AC2 (Coming Soon reads as intentional) — Tasks 2 (lock glyph), 3 (copy).
- AC3 (no behaviour/refusal/AC change) — every task is CSS-only, a copy-string value, or a `key`/read-only-prop change; Task 22 explicitly checks no functional regression across all eight surfaces.
- AC4 (`game-ux` compliance) — no task changes layout, scroll, keyboard model, or the existing colour-plus-form state signals; Task 7 strengthens the existing token compliance.
- Follow-up note 1 (ability prompt jarring) — Task 14.
- Follow-up note 2 (decree swap invisible) — Task 15.
- Follow-up note 3 (skull/damage causality) — Task 16.
- Follow-up note 4 (abilities/Apply Damage look like cards) — Tasks 17, 18, 19.
- Follow-up notes 5 and 6 (mine-reveal telegraphing, three boring screens) — deliberately not built; recorded in the File map and in `plan.md` → Risks as open developer questions.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact CSS/TS or a runnable command with `Run:`/`Expected:`.

**Type / name consistency:** `--wc-ui-transition-ms` is introduced once (Task 1) and read identically in every task that uses it (2, 4, 5, 6, 8) — confirmed by Task 20's grep. `--wc-prompt-enter-ms`/`--wc-decree-swap-ms` are introduced once (Task 13) and read once each (Tasks 14, 15) — confirmed by Task 20 Step 3. `SHOP_CATEGORY_COMING_SOON` is changed in exactly one place (Task 3) and every consumer reads the constant, not a literal. The `aspect-ratio: 4 / 3` reshape is applied identically across Tasks 17–19 — confirmed by Task 20 Step 4.

**Phase boundary cleanliness:** Phase 1 ends with the token defined and the tablist fully polished. Phase 2 ends with the shop screen fully polished. Phase 3 ends with the Envenom plate and card mark polished. Phase 4 ends with the Apply Damage plate polished, completing every AC1 surface. Phase 5 ends with both motion fixes independently working (the ability prompt does not depend on the decree pile, or vice versa). Phase 6 ends with the resolution sentence updated and its one affected test fixed in the same task, not left for Final verification to discover. Phase 7 ends with all three felt-rail plates reshaped together, so no phase boundary leaves the family visually inconsistent. Each phase's own typecheck step confirms the tree compiles at that boundary.
