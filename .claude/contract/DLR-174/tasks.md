# Tasks: Arm buffs from the card you are about to play

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-09-04

**Goal:** Tapping a card in hand raises it and replaces the felt stage with an arming surface showing that card's live win/lose figures and only the buffs that could still pay if it is played — keeping a plain card at exactly two taps and a card with a buff at four.

**Spec:** `plan.md` in this folder. Layout, copy and the four states: `mockup.html` in this folder.

---

## File map

**Created:**

- `src/app/warCouncil/armingSurfaceModel.ts` — the pure view-model: the per-card buff filter, the window statement, the four modes.
- `src/app/warCouncil/ArmingSurface.tsx` — the surface itself: head thumbnail + win/lose slip + window statement, the filtered buff list as one roving-tabindex group, the riding strip at its foot.
- `src/app/warCouncil/armingLabels.ts` — the surface's copy, transcribed from `mockup.html`.
- `src/app/warCouncil/FeltRegion.tsx` — the `<section className="wc-table">` block moved out of `WarCouncilTable.tsx` plus the three-way stage choice, so that file stays under its 400-line budget.
- `src/app/warCouncil/warCouncilArming.css` — the surface's styles and the two developer-owned custom properties.
- `src/app/warCouncil/__tests__/armingSurfaceModel.test.ts` — the filter's spec, no renderer (`node` project).
- `src/app/warCouncil/__tests__/ArmingSurface.test.tsx` — the surface's four states and its keyboard model (`dom` project).
- `src/app/warCouncil/__tests__/roundReducer.arming.test.ts` — the raise window, the Cheat lock, the no-Cheat rejection, the Curse claim (`node` project).
- `src/app/warCouncil/__tests__/handFanRefusal.test.tsx` — an illegal card is enabled, focusable and refuses (`dom` project).

**Modified:**

- `src/app/warCouncil/roundUiState.ts` — add `armingSurfaceOpen`, `galleryOpen`, `cardRaiseWindowOpen`, `unlockingCheat`.
- `src/app/warCouncil/roundReducer.ts:150-178` — `handleTapCard`: the wider raise window, the poise holder, the Cheat lock, the rejection branch.
- `src/app/warCouncil/commitHandlers.ts:197,238-250` — clear `loadout` on both the rejection and the settled branch.
- `src/app/warCouncil/buffHandlers.ts:83-95` — `handleToggleLoadout` lowers a raised card when opening the gallery.
- `src/app/warCouncil/roundControlsProps.ts:113-130` — `FeltRailOptions.galleryOpen` → `stageReplaced`; add `armingSurfaceProps`.
- `src/app/warCouncil/FeltRail.tsx:22-27` — the `trick` prop's docblock, which names the gallery.
- `src/app/warCouncil/WarCouncilTable.tsx:290-320` — the stage block moves to `FeltRegion.tsx`.
- `src/app/warCouncil/PlayingCard.tsx:12-46,115` — `illegal` becomes presentational; new optional `disabled`.
- `src/app/warCouncil/HandFan.tsx:11-60,120-135,205-225` — the new `refusing` prop, the widened `isFocusable`, the split `illegal`/`disabled` pass-through.
- `src/app/warCouncil/BuffRideZone.tsx:50-80` — pass `refusing`; mount `BuffRidingList` only while the arming surface is closed.
- `src/sim/playHandWindows.ts:120-200` — re-check the two drivers against `loadoutOpen`'s changed meaning.
- `src/app/warCouncil/__tests__/HandFan.test.tsx`, `src/app/warCouncil/__tests__/MotionAnchors.test.tsx` — the two other `HandFan` construction sites gain the required `refusing` prop.

**Deleted:** (none)

**Developer decides or observes:**

- `warCouncilArming.css` → `--wc-arming-card-w` — the buff-card size bound on this surface. The mockup keys it off felt height rather than viewport width, since the felt is the container that actually constrains it. Ships with the mockup's value as a documented placeholder; retune against a measurement.
- `warCouncilArming.css` → `--wc-arming-reject-ms` — the rejection animation's duration. Too short and the shake is not read; too long and it delays the retry. Ships with the mockup's value as a documented placeholder.
- Whether listing a skull-reading buff on every card while you lead (AC3) reveals more than intended. Design call, not a UI one — goes to `game-designer` and a follow-up ticket if it is wrong, never patched here.
- Whether the arming surface feels right to use — the raise, the two-tap arm, the shake on a refused card, and whether four taps for a buffed card reads as cheap. QA can confirm it *works*; only you can judge how it feels.
- Whether Apply Buff lowering a raised card (rather than being disabled while the surface is open) is the right interaction.

---

## Phase 1 — The filter, with no renderer

The pure layer, first and alone, because the filter is the one thing here that can be subtly and invisibly wrong and a hidden buff reads as a buff the player does not hold. Nothing in this phase imports React or renders anything; the phase ends with the filter proven by spec and no consumer wired to it, which type-checks cleanly.

### Task 1: Add the arming surface's copy in `armingLabels.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/armingLabels.ts`

- [x] **Step 1: Transcribe the surface's copy from `mockup.html`, verbatim**

Read the strings out of `mockup.html` in this folder and declare them once. Do not re-author them — they are the developer's own copy, already read on screen (`plan.md` Part 1 → Assumptions #12). Mirror `buffLabels.ts`'s shape: `as const` maps and small functions, no component import.

```ts
/** The arming surface's copy (DLR-174), transcribed from `mockup.html`. Authored by the
 *  developer and read on screen, so it is transcribed rather than re-worded. */
export const ARMING_SURFACE_LABEL = 'Arm for this card'
export const ARMING_WINDOW_TEXT: Readonly<Record<ArmingWindow, string>> = {
  [ArmingWindow.BetweenTricks]: 'Between tricks',
  [ArmingWindow.CheatOnly]: 'Cheat only',
}
export const ARMING_EMPTY_TEXT = 'Nothing pays on this card'
export const ARMING_NO_VALID_CARDS_TEXT = 'No valid cards to play'
export const ARMING_FOLLOW_SUIT_REASON = 'Follow-suit binds while you hold the led suit'
export const ARMING_NO_CHEAT_REMEDY = 'A Cheat breaks it — you are not holding one'
export const ARMING_CURSE_CLAIMED_TEXT = 'Hand tap claimed'
export const ARMING_CURSE_MODE_TEXT = 'One tap ends this'
/** AC7 — stated on the Cheat's own row when arming it would make the raised card playable. */
export const ARMING_UNLOCKS_CARD_TEXT = 'Arming this makes the card playable'
/** AC3 — a buff that lands in the projection's indeterminate set. Never a figure. */
export const ARMING_MAY_FIRE_TEXT = 'may fire'
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported. (`ArmingWindow` is imported from `armingSurfaceModel.ts`, created in Task 2 — write Task 2 first if the executor prefers, or accept one failing typecheck here and re-run at the end of Task 2. Prefer the latter and say which was done.) — **Deferred to the end of Task 3**, per the note's own allowance; confirmed clean there.

### Task 2: Write the failing spec for the per-card buff filter ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/__tests__/armingSurfaceModel.test.ts`

- [x] **Step 1: Write the spec against the exports `plan.md` Part 2 → Data shapes declares**

Build state with `createRoundUiState` exactly as `src/app/warCouncil/__tests__/buffRideModel.test.ts` does — copy that file's fixture setup rather than inventing a second one. Assert, at minimum, the four cases `plan.md` Part 2 → Risks names as the filter's correctness pins:

1. A Bells Suit High buff (a buff that pays when you take a trick you played a Bells card into) appears in `rows` for a Bells card and is **absent** for a Moons card.
2. A Suit Low buff (a buff that pays when you do **not** take the trick and played that suit) appears for its suit on **both** branches — it must be present whether the trick would be a Low Victory (a skulled trick you stayed out of, which banks) or a Low Defeat (a clean trick you stayed out of, which hurts). No outcome-quality term may narrow it.
3. Skull Low (pays when the trick carries a skull and you did not take it) appears with `mayFire: true` while the player leads, and with `mayFire: false` — fired or absent — once the Quarry's card is on the table.
4. Cheat, the wildcard and Curse appear whenever their own window is open, despite carrying no condition at all. This is the carve-out that must not regress: `buffFires` returns `false` for every activated-cadence kind by design.

Also assert that `mode` is `NoValidCards` for an illegal card with no Cheat held, `Card` with a Cheat held (and that Cheat's row carries `unlocksCard: true`), and `CurseClaimed` while a Curse is armed.

- [x] **Step 2: Run it and confirm it fails for the right reason**

Run: `npx vitest run src/app/warCouncil/__tests__/armingSurfaceModel.test.ts`
Expected: the run fails to collect the file — `Failed to load` / `Cannot find module './armingSurfaceModel'`. That is the expected failure at this step; a *passing* run here means the spec is asserting nothing.

### Task 3: Implement `armingSurfaceModel.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/armingSurfaceModel.ts`
- Test: `src/app/warCouncil/__tests__/armingSurfaceModel.test.ts`

- [x] **Step 1: Write the module to the signatures in `plan.md` Part 2 → Data shapes**

Model the file on `src/app/warCouncil/buffRideModel.ts` — same docblock discipline, same "this module performs no rule arithmetic" statement at the top. The load-bearing body of `armingReachOf`:

```ts
/** THE filter. Projects with `candidate` APPENDED to the active set — the question
 *  `buffReach` asks of an ALREADY-ACTIVE buff, asked here of a HELD one. Returns `null`
 *  when the buff could not pay on this card at all. NO switch over `BuffConditionKind`
 *  anywhere in this file: `buffProjection.ts`'s own docblock forbids the second table, and a
 *  family restored later would silently never appear on this surface. */
export function armingReachOf(state: RoundUiState, card: Card, candidate: Buff) {
  // Activated-cadence cards carry no condition, so `buffFires` is false for all of them by
  // design — running them through the projection would hide Cheat, the wildcard and Curse.
  if (BUFF_CADENCE[candidate.kind] === BuffCadence.Activated) {
    return { fires: true, mayFire: false }
  }
  const rideInput = rideInputFor(state)
  const input: BuffProjectionInput = {
    ...rideInput,
    active: [...rideInput.active, candidate],
    skullTrick: skullReadingFor(state, card),
    hand: state.round.hands[PlayerSide.Player],
  }
  const projection = projectBuffBranches(input, card)
  const fires =
    hasId(projection.won.fired, candidate.id) || hasId(projection.lost.fired, candidate.id)
  const mayFire =
    hasId(projection.won.mayFire, candidate.id) || hasId(projection.lost.mayFire, candidate.id)
  return fires || mayFire ? { fires, mayFire: !fires && mayFire } : null
}
```

`buildArmingSurface` composes the view: mode from `curseArmed(ui)` / whether the raised card is in `legal` / whether `unlockingCheat(ui)` is non-null; `window` from `buffActivationWindowOpen`; rows from `offered` filtered by `armingReachOf` and by `loadoutRefusalFor` (drop `WindowClosed`, keep every other refusal on a disabled row — `plan.md` Part 1 → Assumptions #8); `damage` from `cardDamagePreview(ui, card)`; `riding` passed straight through. Reuse `buildBuffGallery`'s `BuffStack` shape so `BuffCard` renders unchanged. Import `projectionHasBuff` from `buffRideModel.ts` if it fits, or use the local `hasId` above — do not write a second `projectBuffBranches` pass for a question already answered.

- [x] **Step 2: Run the spec and confirm it passes**

Run: `npx vitest run src/app/warCouncil/__tests__/armingSurfaceModel.test.ts`
Expected: exits 0, Vitest reports `Tests  N passed` with 0 failed.

- [x] **Step 3: Typecheck, and confirm the module is renderer-free**

Run: `npm run typecheck; Select-String -Path src\app\warCouncil\armingSurfaceModel.ts -Pattern "from 'react'|\bwindow\.|\bdocument\."`
Expected: typecheck exits 0; the grep returns zero hits. The spec ran under the `node` project in Step 2, which is the real proof — this grep is the cheap standing check.

- [x] **Step 4: Measure the new file against the 400-line budget**

Run: `(Get-Content src\app\warCouncil\armingSurfaceModel.ts).Count`
Expected: under 400. Use `.Count`, never `Measure-Object -Line` — that form drops blank lines and has hidden a real breach here before.

---

## Phase 2 — The reducer: raising, locking, refusing

The state layer. No component changes, so the felt still renders exactly as it does today at the end of this phase — the new predicates and transitions exist and are proven by spec, with nothing reading them yet. That is a safe stopping point: the app type-checks, the suite passes, and the only visible behaviour change is that an illegal card sets a named rejection when tapped, which today's `disabled` button prevents reaching anyway.

### Task 4: Add the four predicates to `roundUiState.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/roundUiState.ts` — append beside `loadoutOpen` / `discardWindowOpen`
- Create: `src/app/warCouncil/armingWindows.ts` — the four predicates moved here per Step 2's own budget allowance, re-exported from `roundUiState.ts`

- [x] **Step 1: Add `cardRaiseWindowOpen`, `unlockingCheat`, `armingSurfaceOpen`, `galleryOpen`**

Signatures and docblocks per `plan.md` Part 2 → Data shapes. `cardRaiseWindowOpen` delegates to `loadoutDoorOpen` in `buffHandlers.ts` rather than restating its two terms — one owner for "reaching for it is not a move". `galleryOpen` is the single statement replacing the two-term expression `WarCouncilTable.tsx:307` inlines today, and it must return `false` whenever `armingSurfaceOpen` is `true`, so the two surfaces cannot both claim the stage.

```ts
/** AC7 — a held Cheat that could be armed RIGHT NOW, so an off-suit card after the Quarry
 *  has led is a LOCK the player can pay to open rather than a refusal. Asks
 *  `loadoutRefusalFor`, the same predicate the row's own disabled state asks, so the fan's
 *  refusal and the surface's offer cannot disagree. */
export function unlockingCheat(state: RoundUiState): Buff | null
```

- [x] **Step 2: Measure the file — it was at 359 lines before this task**

Run: `(Get-Content src\app\warCouncil\roundUiState.ts).Count`
Expected: under 400. If four predicates push it past, split them into a sibling `armingWindows.ts` in this same task rather than reporting the breach — this project fixes a 400-line breach in-ticket.

Measured: adding the four predicates inline pushed `roundUiState.ts` to 408 lines, so they moved to a new sibling `armingWindows.ts` (55 lines) and are re-exported from `roundUiState.ts` (now 370 lines) — the exact allowance this step names. `armingWindows.ts` and `buffHandlers.ts` import values from each other; confirmed safe (not a TDZ crash) by running the existing `armingSurfaceModel.test.ts` and `roundReducer.curse.test.ts` specs, both green.

**Additional step (single-source-of-truth fix, done alongside Task 4):** `buildArmingSurface` (`src/app/warCouncil/armingSurfaceModel.ts`) now calls the new `unlockingCheat` predicate instead of its own local `heldUnlockingCheat` derivation, which is deleted. No import cycle: `armingSurfaceModel.ts` already imported `roundUiState.ts`. `npx vitest run src/app/warCouncil/__tests__/armingSurfaceModel.test.ts` re-run — still 8 passed.

### Task 5: Write the failing spec for the reducer's four new tap outcomes ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/__tests__/roundReducer.arming.test.ts`

- [x] **Step 1: Write the spec, copying the fixture setup from `roundReducer.curse.test.ts`**

Assert:

1. A `TapCard` on a legal card in the Quarry-to-lead gap (where `canAct` is false) sets `armed` and `loadout: { poised: null }` — the raise reaches the gap.
2. A second `TapCard` on that same raised card in the gap does **not** commit — playing still needs `canAct`.
3. A `TapCard` on an illegal card while a Cheat is held and armable raises it (`armed` set, `rejection` still `null`).
4. A `TapCard` on an illegal card with no armable Cheat leaves `armed` unchanged and sets `rejection` to `MustFollowLeadSuit` (or `MustFollowMonarch` where the Monarch rule is what binds).
5. A `TapCard` while a Curse is armed still marks the card and never sets `armed` — AC11's lock-out, unchanged from `curseTapped`'s existing behaviour.
6. After a successful `commit`, `loadout` is `null` — a played card must not leave the gallery popping open behind it.
7. `ToggleLoadout` with a card raised clears `armed` and opens the gallery.
8. **AC6, structurally:** with the Quarry's card on the table, `buildArmingSurface` offers no non-Cheat row — and assert it by driving the *window predicate*, not by naming Skull Low, so the guarantee survives a family being restored.

- [x] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.arming.test.ts`
Expected: failures on the assertions above (not a collection error — `roundReducer` and the Task 4 predicates already exist).

Ran: 4 failed, 4 passed — real assertion failures (raise not reaching the gap, no rejection reason set, `loadout` not cleared on commit), not a collection error. Confirmed.

### Task 6: Rework `handleTapCard` and clear the poise holder on commit ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/roundReducer.ts:150-178` — `handleTapCard`
- Modify: `src/app/warCouncil/commitHandlers.ts:197,238-250` — both the rejection return and the `settled` literal
- Modify: `src/app/warCouncil/buffHandlers.ts:83-95` — `handleToggleLoadout`
- Test: `src/app/warCouncil/__tests__/roundReducer.arming.test.ts`

- [x] **Step 1: Replace `handleTapCard`'s `canAct` gate with the raise/play split**

The discard and Curse branches keep their position and their reasoning verbatim — both are deliberately *not* `canAct`-gated and both must still precede everything below. Then:

```ts
  // DLR-174 — RAISING is free and commits nothing, so it takes the wider
  // `cardRaiseWindowOpen` (= `loadoutDoorOpen`) window, which reaches the Quarry-to-lead gap
  // where arming is already legal today. PLAYING still requires `canAct`. Two acts, two gates
  // — the same distinction `loadoutDoorOpen`'s own docblock draws for opening the drawer.
  if (!cardRaiseWindowOpen(state)) {
    return state
  }

  if (state.armed && sameCard(state.armed, tapped)) {
    if (!canAct(state)) return state // raised in the gap; the play waits for the turn
    if (tapped.rank === CardRank.Fox) {
      return { ...state, armed: null, prompt: tapped }
    }
    return commit(state, tapped)
  }

  // AC7/AC8 — an illegal card is a LOCK when a Cheat could open it and a REFUSAL otherwise.
  // The legality question is `legalMoves`', asked through the SAME `cheatArmed` option the
  // commit uses, never a local suit comparison.
  if (!containsCard(legalNow(state), tapped) && unlockingCheat(state) === null) {
    return { ...state, rejection: refusalReasonFor(state, tapped) }
  }

  return { ...state, armed: tapped, loadout: { poised: null }, rejection: null }
```

`legalNow(state)` and `refusalReasonFor(state, card)` are small local helpers in this file: the first calls `legalMoves(state.round, PlayerSide.Player, cheatArmed(state) ? { ignoreFollowSuit: true } : undefined)` — the identical expression `WarCouncilTable.tsx:118` already builds, so the fan's greying and this rejection cannot drift; the second returns `MustFollowMonarch` when the Monarch rule is what binds and `MustFollowLeadSuit` otherwise.

- [x] **Step 2: Clear `loadout` on both commit exits**

In `commitHandlers.ts`, add `loadout: null` to the rejection return at line 197 and to the `settled` literal. Without it, `loadoutOpen` stays true after a played card and the gallery pops onto the stage behind the next trick.

- [x] **Step 3: Make `handleToggleLoadout` lower a raised card**

`handleToggleLoadout` already clears `armed` when it opens; confirm that still holds after Step 1's change and that the surface therefore closes. Extend its docblock with the one-line reason (`plan.md` Part 1 → Assumptions #6): the button consistently means "show me everything", swapping the filtered surface for the full one.

**Deviation from "confirm only":** raising a card now also sets `ui.loadout`, so the pre-existing guard `if (state.loadout !== null) return handleCancelLoadout(state)` started mis-routing a raised card into the CLOSE branch (never reaching the "clears armed" open branch at all — see the failing spec run in Step 4 before this fix). Changed the guard to `if (state.armed === null && state.loadout !== null) return handleCancelLoadout(state)`, so only the plain gallery-open case (no card raised) still closes; a raised card now falls through to the existing open branch, which already clears `armed`. This is exactly Assumption 6's "swap the filtered surface for the full one," not a new behaviour — flagging it because the step's own wording implied no code change.

- [x] **Step 4: Run the new spec plus every existing reducer spec**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.arming.test.ts src/app/warCouncil/__tests__/roundReducer.test.ts src/app/warCouncil/__tests__/roundReducer.curse.test.ts src/app/warCouncil/__tests__/roundReducer.bank.test.ts src/app/warCouncil/__tests__/roundReducer.discard.test.ts`
Expected: exits 0, `Tests  N passed`, 0 failed.

Ran: `Test Files 5 passed (5)`, `Tests 70 passed (70)`.

- [x] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

Ran: exits 0, no errors.

### Task 7: Re-check the simulator against `loadoutOpen`'s changed meaning ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/sim/playHandWindows.ts:120-200` — `runCheatPlay` and `runBuffWindow`
- Test: `src/sim/__tests__/baselinePolicy.test.ts`, `src/sim/__tests__/cardAwarePolicy.test.ts`

- [x] **Step 1: Read both drivers against the new semantics and correct what has actually changed**

`ui.loadout` is now the shared poise holder, so `loadoutOpen(ui)` is true after a card is raised as well as after `ToggleLoadout`. Both drivers guard on it at four sites (`:128`, `:133`, `:181`, `:196`). `runCheatPlay` closes the loadout before its two `TapCard` dispatches, then the arm re-opens it — check that the trailing state is what the caller expects. `runBuffWindow`'s `if (!loadoutOpen(ui)) Toggle` now sometimes skips a toggle it used to perform, which is correct (`handleTapBuff` needs `loadout !== null`, which is already satisfied) — confirm it rather than assuming it. Change the drivers only where the behaviour genuinely differs; do not restate the reducer's rules here.

**Read, and traced through both drivers — no code change made, and here is why each site is unaffected:**

- `runCheatPlay` (`:119-147`): its two `TapCard` dispatches (arm, then commit) run back-to-back with no reader in between, so the fact that the arm transiently re-opens `loadout` (`{ poised: null }`) is invisible to the caller — the very next dispatch is the commit, and `commit`'s new `loadout: null` (Task 6 Step 2) clears it again before `runCheatPlay` returns, on both its success and rejection exits. The `apSpent` diff is captured BEFORE either `TapCard` dispatch, so it is untouched. Confirmed by tracing `commitHandlers.ts`'s two exits, not by assumption.
- `runBuffWindow` (`:167-220`): its `chooseBuffs` loop never dispatches `TapCard` at all (only `ToggleLoadout`/`TapBuff`), and the trailing Curse-mark `TapCard` (`:204-211`) runs AFTER the loop's own `CancelLoadout` (`:196-198`), by which point `loadout` is `null` again — so the loop's `if (!loadoutOpen(ui)) Toggle` guard is reached with `loadout` in the SAME state it always was pre-ticket (a raise never happens inside this function, and `commit`/rejection already reset `loadout` to `null` before any window opens — every card play in `playHand.ts`'s own driver loop is a paired arm+commit that always resolves before the next window is read). The step's own hypothesis ("sometimes skips a toggle") does not materialise in this driver's actual call graph.

- [x] **Step 2: Run both simulator specs**

Run: `npx vitest run src/sim/__tests__/baselinePolicy.test.ts src/sim/__tests__/cardAwarePolicy.test.ts`
Expected: exits 0, 0 failed. A shifted buff-activation count is a defect in this change, not a tuning artefact — fix it here rather than updating the expectation.

Ran, unmodified: `Test Files 2 passed (2)`, `Tests 24 passed (24)` — no shifted counts, confirming Step 1's reading.

---

## Phase 3 — The surface, and the hand that reaches it

The view layer. This phase makes the change visible: the surface renders, the rail shows the lead behind it, and an illegal card becomes clickable and focusable. It ends with `WarCouncilTable.tsx` split back under its budget, so the codebase is internally consistent with no half-applied move.

### Task 8: Make an illegal card enabled-but-refusing ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/PlayingCard.tsx:12-46,115`
- Modify: `src/app/warCouncil/HandFan.tsx:11-60,120-135,205-225`
- Modify: `src/app/warCouncil/BuffRideZone.tsx:50-80`
- Modify: `src/app/warCouncil/__tests__/HandFan.test.tsx`, `src/app/warCouncil/__tests__/MotionAnchors.test.tsx`
- Test: `src/app/warCouncil/__tests__/handFanRefusal.test.tsx`

- [x] **Step 1: Split `illegal` from `disabled` on `PlayingCard`**

```ts
  /** DLR-174 AC9 — PRESENTATIONAL ONLY. It no longer feeds `disabled`: an illegal hand card
   *  must be clickable (so it can refuse and shake) and focusable (so the keyboard can reach
   *  it). "Cannot be tapped at all" is `disabled` below, a separate fact. */
  readonly illegal?: boolean
  /** DLR-174 AC9 — the card cannot be tapped at all: the Quarry's turn, a held reveal, a card
   *  in flight. Optional and defaulting to `false`, so all 46 construction sites keep
   *  compiling and only `HandFan` passes it. */
  readonly disabled?: boolean
```

and at line 115: `disabled={condensed || disabled}`.

- [x] **Step 2: Widen `HandFan`'s focusability and split what it passes down**

Add the required `refusing: boolean` prop with a docblock, then:

```ts
  // DLR-174 AC9 — every card in an interactive fan is focusable now, legal or not. A
  // `disabled` button cannot take focus, cannot be clicked and cannot refuse, so an illegal
  // card was unreachable by keyboard and could not shake. Legality no longer gates focus at
  // all; `discardSelecting` and `curseArmed` fall out of this predicate as redundant terms.
  const isFocusable = (index: number) => hand[index] !== undefined && interactive
```

and per card: `illegal={!playable && !curseArmed}` (the grey stays exactly where it was) with `disabled={!interactive}`. `playable` keeps its existing meaning and its existing role gating the buff light, the badge and the breakdown target — do not fold `refusing` into it.

- [x] **Step 3: Add the two missing `refusing` props at the other construction sites**

`BuffRideZone.tsx` passes the live value; `HandFan.test.tsx` and `MotionAnchors.test.tsx` pass whatever their fixture needs. Three sites total — the audit's larger count, and all three are here.

- [x] **Step 4: Write and run the spec**

`handFanRefusal.test.tsx` asserts, by accessible role and label: an illegal card renders as an **enabled** button; it can receive focus via the fan's arrow keys; clicking it calls `onTap`; and a card in a non-interactive fan is still `disabled`.

Run: `npx vitest run src/app/warCouncil/__tests__/handFanRefusal.test.tsx src/app/warCouncil/__tests__/HandFan.test.tsx src/app/warCouncil/__tests__/MotionAnchors.test.tsx src/app/warCouncil/__tests__/PlayingCard.test.tsx`
Expected: exits 0, 0 failed.

Ran: `Test Files 4 passed (4)`, `Tests 64 passed (64)` (later re-confirmed as part of the full `--project dom` run, 481 passed).

- [x] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

Ran: exits 0, no errors.

### Task 9: Build `ArmingSurface.tsx` and its stylesheet ✓

- Skill: `react-frontend`, and `game-ux` for the layout and keyboard model

**Files:**

- Create: `src/app/warCouncil/ArmingSurface.tsx`
- Create: `src/app/warCouncil/warCouncilArming.css`
- Test: `src/app/warCouncil/__tests__/ArmingSurface.test.tsx`

- [x] **Step 1: Write the component to the props in `plan.md` Part 2 → Data shapes**

Layout, information density and copy per `mockup.html` in this folder — its `.arming` block (head slot, head title/sub, `wl-slip`, `window-tag`, `arming-body`, `riding`) is the structure to build. Model the component on `BuffGallery.tsx`: it renders a view it never builds, keeps `onClick={(event) => event.stopPropagation()}` for the same reason (it mounts inside `.wc-table`), and takes its own distinct `role`/`aria-label` — **not** `LOADOUT_PANEL_LABEL`, which seven existing specs reach the gallery by.

The buff list is one `useRovingTabIndex` group over `BuffCard` children (reused unchanged), so every focusable control inside `groupRef` stays a native `<button>` in DOM order — that hook indexes `querySelectorAll('button')` positionally with no typed contract. `Escape` unwinds one level: `onCancelPoise()` when a poise is held, `onCancelSelection()` otherwise (AC13). Render `BuffRidingList` at the foot with the passed rows; it already returns `null` on an empty list, which is AC12's "renders nothing at all when nothing is riding".

- [x] **Step 2: Write the stylesheet with the two developer-owned properties**

Written as `--wc-arming-card-w: clamp(5.4rem, 15vh, 11.5rem)` (the mockup's own `--wc-buffcard-w`, `mockup.html:53`) and `--wc-arming-reject-ms: 280ms` (the mockup's own `.card.is-refused` duration, `mockup.html:324`) — both transcribed verbatim, both flagged as developer decisions in the file's own comment and in this report.

No `100vh`/`100vw` anywhere in the file; the one scrollable region is `.wc-arming-body`/`.wc-arming-grid` (the buff list), commented as such. Every state readable without colour or motion alone: the window tag differs by border STYLE (solid / dashed / dotted) as well as tone, and the rejection shake is suppressed under `prefers-reduced-motion`.

- [x] **Step 3: Write and run the surface's spec**

`ArmingSurface.test.tsx` covers the four states and the keyboard model, querying by accessible role and label throughout: the `Card` state lists the filtered rows and pins the card at the head; `NoValidCards` shows the reason and the remedy; `CurseClaimed` states the mode **in words** — assert the text is present, not merely that the list is empty, because an absence is not a signal; the window statement reads "Cheat only" after a lead. Keyboard: arrow keys move within the buff group, Enter activates, `Escape` calls `onCancelPoise` when poised and `onCancelSelection` when not.

Run: `npx vitest run src/app/warCouncil/__tests__/ArmingSurface.test.tsx`
Expected: exits 0, 0 failed.

Ran: `Test Files 1 passed (1)`, `Tests 8 passed (8)`.

- [x] **Step 4: Measure the new component**

Run: `(Get-Content src\app\warCouncil\ArmingSurface.tsx).Count`
Expected: under 400.

Measured: 251 lines.

### Task 10: Assemble the surface's props and rename the rail's flag ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/roundControlsProps.ts:113-130` — rename `galleryOpen` → `stageReplaced`; add `armingSurfaceProps`
- Modify: `src/app/warCouncil/FeltRail.tsx:22-27` — the `trick` prop's docblock

- [x] **Step 1: Rename `FeltRailOptions.galleryOpen` to `stageReplaced` at all four hits**

The field, its destructure, its read (`trick: stageReplaced ? ui.round.currentTrick : null`), and the one call site (now inside `FeltRegion.tsx`, since it moved there in Task 11 in the same phase). Updated `FeltRail.tsx`'s `trick` docblock. Grepped `galleryOpen` before and after: the only hits left are the `armingWindows.ts` **predicate** and its readers — the old `FeltRailOptions` field name is gone.

- [x] **Step 2: Add `armingSurfaceProps`, beside `buffGalleryProps`**

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

Ran: exits 0 (confirmed together with Task 11's typecheck, since the call site this options object feeds lives in `FeltRegion.tsx`, written in the same phase).

### Task 11: Split the stage out of `WarCouncilTable.tsx` and wire the three-way choice ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/FeltRegion.tsx`
- Modify: `src/app/warCouncil/WarCouncilTable.tsx:290-320`
- Modify: `src/app/warCouncil/BuffRideZone.tsx:50-80` — mount `BuffRidingList` only while the surface is closed

- [x] **Step 1: Move the `<section className="wc-table">` block into `FeltRegion.tsx`**

A **pure move** of the existing markup and its comments — the long `loadoutOpen`/`loadoutDoorOpen` docblock moves with it, unreworded. `FeltRegion.tsx` also carries the two stylesheet imports (`warCouncilFeltRail.css`; `BuffGallery.tsx` and `ArmingSurface.tsx` already self-import their own) that used to sit in `WarCouncilTable.tsx`, since neither `FeltRail.tsx` nor this move's other components self-import them and `WarCouncilTable.tsx` no longer renders them directly — flagged as a deviation from a byte-for-byte move, made necessary by the split itself.

- [x] **Step 2: Replace the two-way ternary with the three-way choice**

```tsx
      <FeltRail {...feltRailProps({ ui, stageReplaced: armingSurfaceOpen(ui) || galleryOpen(ui) })} />
      {armingSurfaceOpen(ui) ? (
        <ArmingSurface {...armingSurfaceProps({ … })} />
      ) : galleryOpen(ui) ? (
        <BuffGallery {...buffGalleryProps({ ui, dispatch: dispatchClearingAnnouncement, offered })} />
      ) : (
        <FeltStage {...feltStageProps({ … })} />
      )}
```

`galleryOpen` already returns `false` whenever `armingSurfaceOpen` is true (Task 4), so the ordering here is belt-and-braces rather than the rule.

- [x] **Step 3: Move the riding strip's mount point**

In `BuffRideZone.tsx`, render `BuffRidingList` only while `!armingSurfaceOpen(ui)` — the surface's own foot renders it otherwise. One component, one `RidingBuffRow[]`, one mount point chosen by a ternary; never both at once (`plan.md` Part 1 → Assumptions #10). `CardBuffBreakdown` and `HandFan` stay where they are.

- [x] **Step 4: Measure both files**

Run: `(Get-Content src\app\warCouncil\WarCouncilTable.tsx).Count; (Get-Content src\app\warCouncil\FeltRegion.tsx).Count; (Get-Content src\app\warCouncil\roundControlsProps.ts).Count`
Expected: all three under 400. `WarCouncilTable.tsx` was 351 before this contract; if it is still over after the move, split further in this task rather than reporting it.

Measured: `WarCouncilTable.tsx` 317, `FeltRegion.tsx` 107, `roundControlsProps.ts` 268 — all under 400.

- [x] **Step 5: Run the felt's existing integration specs**

Run: `npx vitest run --project dom`
Expected: exits 0, 0 failed. The gallery's own specs reach it by `getByRole('dialog', { name: 'Your buffs' })` — if any now fails, the surface has taken a name it must not have (Task 9 Step 1).

Ran, after fixing five pre-existing specs whose `!button.disabled` assumption the AC9 behaviour change invalidated (see Notes): `Test Files 52 passed (52)`, `Tests 481 passed (481)`. `BuffGallery.test.tsx`'s own `getByRole('dialog', { name: 'Your buffs' })` query is among the 481 — confirmed `ArmingSurface` did not take that name.

- [x] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

Ran: exits 0, no errors.

---

## Phase 4 — Final verification

No production changes — only sanity-checks that the cumulative work is clean, plus the two checks that need a real browser because jsdom has no layout engine.

### Task 12: Confirm no second condition table was introduced ✓

- Skill: none — verification greps only, no code written.

- [x] **Step 1: Grep the new model for a condition switch**

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include armingSurfaceModel.ts,ArmingSurface.tsx,armingLabels.ts | Select-String -Pattern "BuffConditionKind|buffFires|CONDITION_MODIFIER"`
Expected: zero hits. Every firing question goes through `projectBuffBranches`; a hit here is the exact drift `buffProjection.ts`'s docblock forbids.

Ran: 3 hits, all in `armingSurfaceModel.ts` docblock/comment prose stating the rule ("no switch over `BuffConditionKind`", "`buffFires` is false for all of them by design") — no actual switch, import, or code usage of either identifier. Extended to `armingWindows.ts` per the note below: zero hits. Confirmed clean.

- [x] **Step 2: Confirm the pure model stays renderer-free**

Run: `Select-String -Path src\app\warCouncil\armingSurfaceModel.ts,src\app\warCouncil\armingLabels.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

Ran: zero hits. Confirmed.

**Extended Step 1 to `armingWindows.ts`:** `Get-ChildItem src\app\warCouncil -Recurse -Include armingWindows.ts | Select-String -Pattern "BuffConditionKind|buffFires|CONDITION_MODIFIER"` — zero hits.

### Task 13: Confirm no tunable was hard-coded and no stale name remains ✓

- Skill: none — verification greps only, no code written.

- [x] **Step 1: Confirm the two developer-owned values live only in the stylesheet**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "wc-arming-card-w|wc-arming-reject-ms"`
Expected: zero hits — both are CSS custom properties and no TypeScript file may name a value for either.

Ran: zero hits. Confirmed.

- [x] **Step 2: Confirm the renamed rail flag is gone**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "galleryOpen"`
Expected: hits only for the new `galleryOpen` **predicate** in `roundUiState.ts` and its readers — zero hits for the old `FeltRailOptions` field name. Use the recursive `Get-ChildItem … | Select-String` form, never `Select-String -Path 'src\**\*.ts'`, which reaches exactly one directory level and reports a false zero.

Ran: 6 hits — the `galleryOpen` predicate's definition in `armingWindows.ts`, its re-export and comment in `roundUiState.ts`, its import/reads in `FeltRegion.tsx`, and one prose mention in `roundControlsProps.ts`'s docblock ("Renamed from `galleryOpen`") documenting the rename itself. No hit is the old `FeltRailOptions.galleryOpen` field. Confirmed clean.

- [x] **Step 3: Confirm no viewport-unit regression in the new stylesheet**

Run: `Select-String -Path src\app\warCouncil\warCouncilArming.css -Pattern "100vh|100vw"`
Expected: zero hits.

Ran: 1 hit — the docblock's own sentence stating the rule ("No `100vh`/`100vw` anywhere in this file"). No actual CSS declaration uses either unit. Confirmed clean.

### Task 14: Static gates and full suite ✓

- Skill: none — runner commands only, no code written.

- [x] **Step 1: Warm the transform cache, then typecheck, lint, and the unfiltered suite**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all exit 0; Vitest reports 0 failed. The two scoped runs first are deliberate — a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is jsdom start-up starving the pool, not a failing test. A **second consecutive** timeout is a real problem; a single cold one is not, and must never be reported as a test failure.

- [x] **Step 2: Check formatting of this contract's files only**

Run: `npx prettier --check src/app/warCouncil/armingSurfaceModel.ts src/app/warCouncil/ArmingSurface.tsx src/app/warCouncil/armingLabels.ts src/app/warCouncil/FeltRegion.tsx src/app/warCouncil/warCouncilArming.css src/app/warCouncil/roundUiState.ts src/app/warCouncil/roundReducer.ts src/app/warCouncil/roundControlsProps.ts src/app/warCouncil/HandFan.tsx src/app/warCouncil/PlayingCard.tsx src/app/warCouncil/BuffRideZone.tsx src/app/warCouncil/WarCouncilTable.tsx src/app/warCouncil/FeltRail.tsx src/app/warCouncil/commitHandlers.ts src/app/warCouncil/buffHandlers.ts src/sim/playHandWindows.ts`
Expected: exits 0. Scoped deliberately — repo-wide `npm run format:check` fails on pre-existing `.docs/**` files this contract never touched, and `npm run format` must never be run at all.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

**Result (2026-09-04):** all three steps green. `npm test` — 221 files / 2542 tests passed, 0 failed. Typecheck, lint and the scoped prettier check all exit 0. `npm run build` exits 0, `dist/` written (392 KB JS / 110 KB CSS), no bundler errors.

### Task 15: Browser checks that no test can make — DEFERRED TO THE DEVELOPER

- Skill: game-ux — it owns the no-scroll floor, the tap-count check and the greyscale pass this task performs.

**No browser pass was requested on this `/fb-apply` invocation, so this task was not run.** It is not a failure and not a gap in verification — it is the eyes-on agenda, carried into `pr-description.md` for the developer. Nothing below has been checked.

- [ ] **Step 1: Record the tap counts and the layout checks a browser must settle**

jsdom has no layout engine, so nothing above proves the felt still fits. These are QA's on a `--browser` run and the developer's otherwise, and either way the result is written into `pr-description.md`:

- No page scroll at **1920×960** and **1366×720** — the two sizes the mockup was already checked at — in all four surface states.
- The plain-card path is **exactly two taps** (raise, play) and the buffed path **exactly four** (raise, poise, arm, play). Count them; the ticket's own text says the design has failed if the plain case ever costs three.
- The greyscale screenshot is **actually taken**, and armed vs. poised, and the two window statements, are all still distinguishable in it. This check has failed before on this project after being claimed as passed.
- The console is clean through a full trick with a buff armed and removed.

### Task 16: Update the PR description ✓

- Skill: none — a markdown hand-off document, not code.

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include: a link to `plan.md` in this folder; a summary of the change; every decision the developer must make and every behaviour they must judge by playing (the File map's "Developer decides or observes" list, verbatim); the verification results from the prior phases with real numbers; and a one-line note for future contributors on the two conventions this ticket introduces — that `illegal` on `PlayingCard` is presentational only and `disabled` is the tappability fact, and that `ui.loadout` is now the shared poise holder for both arming surfaces rather than "the gallery is open".

---

## Review fix pass

Defender + QA + Code-Evaluator ran once, in parallel, against the finished implementation (per
`.claude/workflow/web-project.md`'s pipeline). Findings and fixes are recorded in full in
`pr-description.md` → "Review fix pass" — summary here for the checklist trail:

- Defender Critical 1/2, QA Finding 1/2, Code-Evaluator Issues 1/2/4, and Defender Info 1/2 were
  all fixed in this pass. New/changed tests: `WarCouncilRound.armingGap.test.tsx` (new — the
  Quarry-to-lead-gap DOM click), `roundReducer.arming.test.ts` (a new `CancelSelection` test, the
  AC8 assertion corrected, the AC6 assertion strengthened with a non-Cheat buff), `ArmingSurface.test.tsx`
  (the "Cheat only" test strengthened the same way), `HandFan.tsx`/`BuffRideZone.tsx` and their
  three test fixtures (the `refusing` prop removed).
- Defender Warning 2 / Code-Evaluator Issue 3 (`refusalReasonFor` duplicating `playCard.ts`'s
  Monarch derivation) is **deliberately not fixed** — `src/warCouncil/**` is READ-ONLY in this
  contract. Recorded as a follow-up in `pr-description.md`.
- Post-fix verification: `npx vitest run --project node` 168 files / 2057 passed;
  `npx vitest run --project dom` 53 files / 482 passed; `npm run typecheck` exits 0;
  `npm run lint` exits 0.

## Self-review

**Spec coverage:**

- The pure filter model derived from `projectBuffBranches` (AC2, AC3) — Tasks 2, 3; guarded by Task 12.
- The surface, its head figures and its window statement (AC1, AC4, AC5) — Tasks 1, 9, 10, 11.
- The stage-precedence rule and the reducer's raise transition (AC1, AC11) — Tasks 4, 5, 6, 11.
- The `loadoutDoorOpen` raise widening (AC5's between-tricks reach) — Tasks 4, 6; simulator fallout, Task 7.
- The Cheat lock path (AC7) and the no-Cheat refusal (AC8) — Tasks 4, 5, 6, 9.
- Illegal card enabled-but-refusing, widened focusability (AC9) — Task 8.
- The Quarry's lead on the rail while the surface holds the stage (AC10) — Tasks 10, 11.
- The Curse lock-out stated in words (AC11) — Tasks 2, 3, 5, 9.
- The riding strip with per-row removal, rendering nothing when empty (AC12) — Tasks 9, 11.
- The keyboard model and the one-level `Escape` unwind (AC13) — Task 9.
- Every state readable without colour or motion, greyscale actually taken (AC14) — Tasks 9, 15.
- `WarCouncilTable.tsx`'s 400-line breach fixed in-ticket — Task 11.
- The window rule unchanged, AC6 enforced structurally — Task 5 Step 1 assertion 8, Task 12.

**Placeholder scan:** no `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step is a concrete code change or a runnable command with `Run:` / `Expected:`. The two `<mockup value>` markers in Task 9 Step 2 are deliberate and named as developer decisions in both `plan.md` Part 2 → Risks and the File map — the executor transcribes the mockup's current number as a documented placeholder and must not invent one.

**Type / name consistency:** `ArmingWindow`, `ArmingMode`, `ArmingRow`, `ArmingSurfaceView`, `armingReachOf`, `buildArmingSurface`, `ArmingSurfaceProps`, `armingSurfaceProps`, `armingSurfaceOpen`, `galleryOpen`, `cardRaiseWindowOpen`, `unlockingCheat`, `stageReplaced`, `refusing`, `disabled`, `--wc-arming-card-w`, `--wc-arming-reject-ms` are each spelled identically in every task that names them and match `plan.md` Part 2 → Data shapes exactly.

**Phase boundary cleanliness:**

- **Phase 1** ends with a new pure module and its passing spec, imported by nothing. The app renders exactly as before; typecheck is clean. (Task 1's typecheck depends on Task 2's type exports — the step names that ordering explicitly rather than leaving a red gate.)
- **Phase 2** ends with the reducer's new transitions proven by spec and the simulator re-checked. No component reads the new predicates yet, so the only visible change is a named rejection on a tap that today's `disabled` button makes unreachable. Typecheck and every reducer spec are clean.
- **Phase 3** ends with the surface rendering, the rail rename applied at all four sites in one task, the riding strip at exactly one mount point, and `WarCouncilTable.tsx` split back under budget in the same task that pushes it over — no half-applied move, no dead import, no spec importing a module that does not exist.
- **Phase 4** makes no production change.
