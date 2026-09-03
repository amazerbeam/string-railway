# Tasks: Readability and interaction fixes from the first narrated play session

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-09-02

**Goal:** Twelve interface defects from one recorded play session, across four surfaces, none of them a rule change — the felt stops advancing itself and says which of the four outcomes a trick was, the resolution screen becomes a smaller panel that explains the pot, the tooltip stops covering the breakdown, and the gallery, the shop and the Fox prompt each gain the one thing the session found missing.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder.

---

## File map

**Created:**
- `src/app/warCouncil/resolutionOutcome.ts` — the four-outcome kind and its two copy tables
- `src/app/warCouncil/__tests__/resolutionOutcome.test.ts` — its truth table
- `src/app/warCouncil/resolutionLethal.ts` — would this pot end the fight
- `src/app/warCouncil/__tests__/resolutionLethal.test.ts`
- `src/app/warCouncil/resolutionDeadBuffs.ts` — armed minus fired, and each dead row's reason
- `src/app/warCouncil/__tests__/resolutionDeadBuffs.test.ts`
- `src/app/warCouncil/resolutionView.ts` — `ResolutionView`, moved out of `roundUiState.ts` and widened
- `src/app/warCouncil/ResolutionBreakdown.tsx` — the panel's beat rows and dead rows
- `src/app/warCouncil/warCouncilResolvePanel.css` — the panel chrome, split out of `warCouncilResolve.css`
- `src/app/warCouncil/breakdownRectContext.ts` — the breakdown panel's measured top edge
- `src/app/warCouncil/buffSuitFilterModel.ts` — the gallery's composed tier+suit filter (renamed from `buffSuitFilter.ts`, which collides case-insensitively with `BuffSuitFilter.tsx` on this Windows filesystem — the same trap `buffGalleryModel.ts` was already renamed to avoid)
- `src/app/warCouncil/__tests__/buffSuitFilterModel.test.ts`
- `src/app/warCouncil/BuffSuitFilter.tsx` — the suit chip row
- `src/app/warCouncil/buffRunLabels.ts` — `RUN_LABEL`/`RUN_SUIT`, split out of `BuffRunTab.tsx` (not in the original file map; `react-refresh/only-export-components` forbids a component file also exporting plain constants)
- `src/app/run/slotTier.ts` — per-reel awarded tier
- `src/app/run/__tests__/slotTier.test.ts`
- `src/app/run/PathScreens.tsx` — the start / map / pre-fight branches lifted out of `App.tsx`

**Modified:**
- `src/app/warCouncil/WarCouncilTable.tsx:170-180` — delete the `.wc-table` region `onClick` and `wc-is-waiting`
- `src/app/warCouncil/roundReducer.ts:118-125` — `ApplyPot` / `RollOver` stop tail-calling `handleCarryOn`
- `src/app/warCouncil/TrickWell.tsx` — the four-outcome verdict; both carry-on controls become real buttons
- `src/app/warCouncil/roundControlsProps.ts` — thread `skulledInTrick` to `TrickWell`
- `src/app/warCouncil/roundUiState.ts:180-190` — `ResolutionView` moves out, re-exported
- `src/app/warCouncil/commitHandlers.ts:157-178,247-250` — `resolutionViewFor` fills the four new fields
- `src/app/warCouncil/TrickResolutionScreen.tsx` — outcome, skull, decree, lethal marking, inverted figures
- `src/app/warCouncil/WarCouncilRound.tsx:95-120` — the panel overlays the table instead of replacing it
- `src/app/warCouncil/warCouncilResolve.css` — invert the type hierarchy; `--wc-trick-dwell` to `1000ms`
- `src/app/warCouncil/warCouncilTable.css` — the carry-on button chrome; drop the waiting cursor
- `src/app/warCouncil/CardBuffBreakdown.tsx` — publish the panel's measured top edge
- `src/app/warCouncil/useBuffBreakdownAnchor.ts` — return the measured top alongside its existing write
- `src/app/warCouncil/CardAbilityTip.tsx` — place the bubble above the breakdown when one is open
- `src/app/warCouncil/BuffGallery.tsx` — compose the two filters, render the suit row
- `src/app/warCouncil/warCouncilBuffGallery.css` — the suit chip row
- `src/app/warCouncil/AbilityPrompt.tsx` — a visible cancel control on both prompt branches
- `src/app/warCouncil/warCouncil.css` — the prompt's cancel-control chrome
- `src/app/run/SlotMachinePanel.tsx:200-280` — tier badge on each landed window and each award
- `src/app/run/shopSlotReel.css` — the tier badge
- `src/app/run/RunPathScreen.tsx` — optional read-only held-buff tray
- `src/app/run/run.css` — the tray region on the path screen
- `src/app/screenFor.ts` — `RunPhase.PreFight`, `AppScreen` gains `preFight`
- `src/app/debugState.ts:17` — import `AppScreen` instead of restating its literals
- `src/App.tsx:200-300` — `leaveForNextFight` stops at the pre-fight screen; branches move out
- `src/app/__tests__/screenFor.test.ts` — the new phase's two cases
- `src/app/warCouncil/__tests__/roundReducer.resolution.test.ts:185` — the widened fixture
- `src/app/warCouncil/__tests__/TrickResolutionScreen.test.tsx:78,112` — the two widened fixtures
- `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx` — carry-on copy and the removed region click
- `src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx:170-190` — the region-click assertion inverts

**Deleted:** *(none)*

**Developer decides or observes:**
- `warCouncilResolvePanel.css` → `--wc-resolve-panel-w` and `--wc-resolve-panel-inset` — the panel's width and its distance from the corner. Ships as a documented placeholder; trades legibility of the panel against how much felt stays visible behind it.
- `warCouncilResolve.css` → the three font-size bounds AC5's inversion needs: the pot's `clamp()`, the trick contribution's, and the outcome word's.
- `warCouncilMotion.css` → `--wc-flight` (380ms), `warCouncilResolve.css` → `--wc-beat` (520ms) and `--wc-resolve-hold` (700ms). `--wc-trick-dwell` is settled at `1000ms` by the developer's own words; these three are not.
- The lethal marking's visual treatment — it must read in greyscale, so it ships as a word plus a colour, never a colour alone. Whether the word is right is a copy call.
- `resolutionOutcome.ts` → `TRICK_OUTCOME_WORD` and `TRICK_OUTCOME_WHY`. Ships with `the-hunt.md` §7's own terms; whether *ate the skull* reads well on a panel only playing settles.
- Whether the dead-buff rows need a cap, a scroll region, or a collapsed count once there are three of them in a shrinking panel. Judge at 640px of viewport height, where an overflow is already recorded on this screen.
- Whether the AC1b reading is right: Apply / Roll-over now close the panel and lay no card, leaving the arming window open. Play one trick where the Quarry leads and confirm Apply Buff is reachable before their card lands.
- Whether the pre-fight stop earns its place in the run flow, or the review should instead be reachable from inside the fight.

---

## Phase 1 — The felt stops advancing itself, and says what happened

The two defects behind *"I can't actually play the game"*, plus the developer's red-line that the verdict belongs where the card lands. Both fixes are deletions of existing behaviour plus one new pure module, so the phase ends with the felt strictly less able to act on its own. Safe to stop here: nothing downstream of this phase depends on it, and `npm run typecheck` passes at the boundary because the new module has no consumers yet beyond `TrickWell`.

### Task 1: The four-outcome derivation, in `src/app/warCouncil/resolutionOutcome.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/resolutionOutcome.ts`
- Test: `src/app/warCouncil/__tests__/resolutionOutcome.test.ts`

- [x] **Step 1: Write the failing truth table for all four outcomes**

Four cases plus the two copy tables' totality. `the-hunt.md` §7 owns the vocabulary — cite it, do not re-derive which combination is which.

```ts
import { describe, expect, it } from 'vitest'
import {
  TRICK_OUTCOME_WHY,
  TRICK_OUTCOME_WORD,
  TrickOutcomeKind,
  trickOutcomeKindFor,
} from '../resolutionOutcome'

describe('trickOutcomeKindFor', () => {
  it('took it, no skull — a clean win', () => {
    expect(trickOutcomeKindFor(true, false)).toBe(TrickOutcomeKind.CleanWin)
  })
  it('took it, skull — ate the skull', () => {
    expect(trickOutcomeKindFor(true, true)).toBe(TrickOutcomeKind.AteTheSkull)
  })
  it('did not take it, no skull — a clean loss', () => {
    expect(trickOutcomeKindFor(false, false)).toBe(TrickOutcomeKind.CleanLoss)
  })
  it('did not take it, skull — a dodge', () => {
    expect(trickOutcomeKindFor(false, true)).toBe(TrickOutcomeKind.Dodge)
  })
  it('words and reasons cover every kind', () => {
    for (const kind of Object.values(TrickOutcomeKind)) {
      expect(TRICK_OUTCOME_WORD[kind]).toBeTruthy()
      expect(TRICK_OUTCOME_WHY[kind]).toBeTruthy()
    }
  })
})
```

Run: `npx vitest run src/app/warCouncil/__tests__/resolutionOutcome.test.ts`
Expected: fails to resolve `../resolutionOutcome`.

- [x] **Step 2: Write the module**

Pure, no React, no DOM. The two tables are PLACEHOLDER copy carrying `the-hunt.md` §7's own terms.

```ts
/**
 * DLR-160 AC2 — the four outcomes `.docs/game_rules/the-hunt.md` §7 names, as a kind plus its
 * words. Runs no rule of its own: it crosses two facts the engine already decided — the MECHANICAL
 * axis (`playerTook`, i.e. `winner === PlayerSide.Player`, before the skull inverts what that is
 * worth) with whether the trick carried a skull. Lives under `src/app/` rather than
 * `src/warCouncil/` because it produces user-facing copy, the same reason `resolutionBeats.ts`
 * does.
 *
 * Read by BOTH the trick well (`TrickWell.tsx`, as the cards land) and the resolution panel
 * (`TrickResolutionScreen.tsx`), so one trick can never be worded two ways.
 */
export const TrickOutcomeKind = {
  CleanWin: 'cleanWin',
  Dodge: 'dodge',
  CleanLoss: 'cleanLoss',
  AteTheSkull: 'ateTheSkull',
} as const
export type TrickOutcomeKind = (typeof TrickOutcomeKind)[keyof typeof TrickOutcomeKind]

export function trickOutcomeKindFor(playerTook: boolean, skullTrick: boolean): TrickOutcomeKind {
  if (playerTook) return skullTrick ? TrickOutcomeKind.AteTheSkull : TrickOutcomeKind.CleanWin
  return skullTrick ? TrickOutcomeKind.Dodge : TrickOutcomeKind.CleanLoss
}

/** PLACEHOLDER copy — `the-hunt.md` §7's own terms, the developer's to retune. */
export const TRICK_OUTCOME_WORD: Readonly<Record<TrickOutcomeKind, string>> = {
  [TrickOutcomeKind.CleanWin]: 'Clean win',
  [TrickOutcomeKind.Dodge]: 'Dodge',
  [TrickOutcomeKind.CleanLoss]: 'Clean loss',
  [TrickOutcomeKind.AteTheSkull]: 'Ate the skull',
}

/** PLACEHOLDER copy. Says the CAUSE, which is the half the session found missing. */
export const TRICK_OUTCOME_WHY: Readonly<Record<TrickOutcomeKind, string>> = {
  [TrickOutcomeKind.CleanWin]: 'you took it, and it carried no skull — so it banks',
  [TrickOutcomeKind.Dodge]:
    'they took it, and it carried a skull — so it banks, and costs you nothing',
  [TrickOutcomeKind.CleanLoss]: 'they took it, and it carried no skull — your streak resets',
  [TrickOutcomeKind.AteTheSkull]: 'you took it, and it carried a skull — your streak resets',
}
```

Run: `npx vitest run src/app/warCouncil/__tests__/resolutionOutcome.test.ts`
Expected: exits 0, 5 tests passed.

### Task 2: Delete the felt's region click, in `src/app/warCouncil/WarCouncilTable.tsx` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/WarCouncilTable.tsx:170-180`
- Modify: `src/app/warCouncil/warCouncilTable.css`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx:170-190`

- [x] **Step 1: Remove the `onClick` and the waiting class from the table section**

Replace the opening tag of the `.wc-table` section:

```tsx
      <section
        className={`wc-table${ui.resolvedTrick || quarryToLead || encounterOver ? ' wc-is-waiting' : ''}`}
        aria-live="polite"
        onClick={ui.resolvedTrick || quarryToLead || encounterOver ? handleCarryOn : undefined}
      >
```

with:

```tsx
      {/* DLR-160 AC1 — the region click is GONE. It fired `handleCarryOn` for any click landing
          anywhere in the play area while a trick was held or the Quarry was pending, which is what
          repeatedly cost the developer the buff-arming window mid-fight. `TrickWell.tsx` already
          renders a real, keyboard-reachable button for both of those states, so deleting this
          leaves a strictly better interaction rather than an unreachable one. `wc-is-waiting` went
          with it — its only job was the cursor affordance advertising this gesture. */}
      <section className="wc-table" aria-live="polite">
```

`handleCarryOn` stays — `feltStageProps` still threads it to the well's own button.

- [x] **Step 2: Remove the `.wc-is-waiting` rule from the stylesheet**

Delete the `.wc-table.wc-is-waiting` block (the cursor affordance) from `src/app/warCouncil/warCouncilTable.css`. Leave every other `.wc-table` rule alone.

- [x] **Step 3: Invert the pinned region-click assertion**

`WarCouncilRound.timebomb.test.tsx:170-190` currently pins that a click bubbling to `.wc-table` does NOT commit the Quarry's lead while a Timebomb is armed, and its comments name `.wc-table`'s `onClick` as the thing being defended against. Rewrite the test to assert the stronger property this task establishes: a click on `.wc-table` never commits the lead, in any state. Keep the Timebomb setup; change the claim and the comments.

- [x] **Step 4: Confirm no other reader of the removed class**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "wc-is-waiting"`
Expected: zero hits.

- [x] **Step 5: Typecheck and the touched specs**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx`
Expected: both exit 0; Vitest reports 0 failed.

### Task 3: Apply and Roll-over stop laying the Quarry's lead, in `src/app/warCouncil/roundReducer.ts` ✓

- Skill: react-frontend, game-designer

**Files:**
- Modify: `src/app/warCouncil/roundReducer.ts:118-125`
- Test: `src/app/warCouncil/__tests__/roundReducer.resolution.test.ts`

- [x] **Step 1: Write the failing test for the arming window surviving a dismissal**

Drive a trick to resolution in a state where the Quarry is next to lead, dispatch `RollOver`, and assert the lead has NOT been committed — `state.round.currentTrick` is still empty and `discardWindowOpen(state)` is `true`. Add the sibling case for `ApplyPot`. Use the file's existing round-building helpers rather than a new fixture.

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.resolution.test.ts`
Expected: the two new cases fail — `currentTrick` has one card, because `handleCarryOn` advanced the lead in the same dispatch.

- [x] **Step 2: Stop both actions tail-calling `handleCarryOn`** — implemented with the
  `isEncounterResolved` carve-out preserved (see Notes in the Implementer Report): the literal
  snippet below unconditionally clears `resolvedTrick`, which strands a mid-hand encounter-ending
  Apply/Roll-over with no control left to reach `onComplete`. The shipped code keeps `applied`/
  `rolled` untouched when the choice itself ends the encounter, exactly as `handleCarryOn` used to.

Replace:

```ts
    case RoundUiActionKind.ApplyPot: {
      const applied = applyPotAction(state)
      return isEncounterResolved(applied.encounter) ? applied : handleCarryOn(applied)
    }
    case RoundUiActionKind.RollOver: {
      const rolled = rollOverAction(state)
      return isEncounterResolved(rolled.encounter) ? rolled : handleCarryOn(rolled)
    }
```

with:

```ts
    // DLR-160 AC1 — these two used to tail-call `handleCarryOn`, which calls `advanceQuarryLead`
    // in the SAME dispatch whenever the Quarry is next to lead. Dismissing the resolution screen
    // therefore laid the Quarry's card before the player ever saw the felt, and the between-tricks
    // window closed unseen. `the-hunt.md` §4 already grants that window — "activating is only
    // available between tricks, the same window the Swap uses, before a trick's first card is
    // laid" — so nothing about the RULE changes here; the code was closing it early. Both actions
    // now close the resolution screen and stop. `CarryOn`, reached only from the well's own
    // explicit control, keeps sole responsibility for laying the lead.
    //
    // `resolvedTrick` still has to be cleared, which is the ONLY thing `handleCarryOn` did that
    // these two needed — `applyPotAction`/`rollOverAction` clear `resolution` but not the felt's
    // own held reveal.
    case RoundUiActionKind.ApplyPot:
      return clearResolvedTrick(applyPotAction(state))
    case RoundUiActionKind.RollOver:
      return clearResolvedTrick(rollOverAction(state))
```

and add the helper beside `handleCarryOn`:

```ts
/** DLR-160 AC1 — the one thing `ApplyPot`/`RollOver` needed out of `handleCarryOn`: the felt's
 *  held reveal is dropped so the table renders the between-tricks state. Deliberately does NOT
 *  touch `currentTrick`, the turn, or the Quarry's pending lead. */
function clearResolvedTrick(state: RoundUiState): RoundUiState {
  return state.resolvedTrick === null ? state : { ...state, resolvedTrick: null }
}
```

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.resolution.test.ts`
Expected: exits 0, 0 failed — including the two new cases.

- [x] **Step 3: Run the round's whole spec set for regressions** — fixed
  `WarCouncilRound.duelHealthBars.test.tsx` (needed an explicit "Let them lead" tap between tricks
  A and B, since the lead no longer auto-commits) in addition to the copy-query fixes. This edit
  pushed the file to 409 lines; the QA fix pass split its "the Quarry's at-risk preview (DLR-86)"
  describe block out to a new sibling, `WarCouncilRound.quarryAtRiskPreview.test.tsx` (147 lines),
  bringing the original back to 308.

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__`
Expected: both exit 0; Vitest reports 0 failed. Any spec that asserted the lead landing on an Apply or Roll-over dispatch is asserting the defect — fix the spec to press the well's own control first.

### Task 4: The verdict where the cards land, in `src/app/warCouncil/TrickWell.tsx` ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/TrickWell.tsx`
- Modify: `src/app/warCouncil/roundControlsProps.ts`
- Modify: `src/app/warCouncil/warCouncilTable.css`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`

- [x] **Step 1: Add the optional `skulledInTrick` prop and thread it**

`TrickWellProps` gains, defaulting to `[]` the way `skulledCards` and `primedCards` already do:

```ts
  /** DLR-160 AC2 — the cards in THIS trick that carry a skull, so the well words the outcome on
   *  the same two facts `TrickResolutionScreen` does. Defaults to `[]`. */
  readonly skulledInTrick?: readonly Card[]
```

In `roundControlsProps.ts`'s `feltStageProps`, derive it once from the values already in scope —
`ui.resolvedTrick.cards` filtered through the existing `isSkulled` against `ui.round.skulledCards`
— and pass it down. Do not re-derive skull membership with a new comparison.

- [x] **Step 2: Replace the mechanical line with the outcome word and its reason**

In the `resolvedTrick` branch, replace:

```tsx
        <p className="wc-table-line">
          {winnerLabel} take the trick.
```

with the outcome derived from the two facts, keeping the damage and Timebomb clauses that follow:

```tsx
        {/* DLR-160 AC2 (developer red-line, 2026-09-02) — the well used to say only who
            physically took it, which is exactly the half that misleads on a skull trick. Same
            module the resolution panel reads, so one trick cannot be worded two ways. */}
        <p className="wc-well-outcome">{TRICK_OUTCOME_WORD[outcomeKind]}</p>
        <p className="wc-table-line">
          {TRICK_OUTCOME_WHY[outcomeKind]}.
```

with `outcomeKind` computed once above the return of that branch:

```tsx
    const outcomeKind = trickOutcomeKindFor(
      resolvedTrick.winner === PlayerSide.Player,
      resolvedTrick.cards.some((played) => isSkulled(skulledInTrick, played.card)),
    )
```

- [x] **Step 3: Both carry-on controls become real buttons** — also removed the now-dead
  `.wc-is-carry-on` rule (and its mention in the shared `:focus-visible` selector) from
  `warCouncilCards.css`, since `.wc-carry-btn` carries its own full chrome.

Change both `<button className="wc-table-hint wc-is-carry-on">` to `className="wc-carry-btn"`, and change the resolved branch's copy from `Tap the table to carry on` to `Carry on` — the gesture it named no longer exists. `Let them lead` keeps its words. Add `.wc-carry-btn` to `warCouncilTable.css` with a ≥44px min-height, `:focus-visible`, a hover state wrapped in `@media (hover: hover)`, and `touch-action: manipulation`, following the `.run-btn` rules already in `run.css` for chrome. Layout per `mockup.html`'s tab 1.

- [x] **Step 4: Update the specs that query the old copy** — also retargeted the same query in
  `WarCouncilRound.duelHealthBars.test.tsx` and `WarCouncilRound.trickDwell.test.tsx` (both grep
  hits outside this task's named file), and `TrickWell.test.tsx`'s own "names the winning side"
  case, which asserted the deleted mechanical wording directly.

`WarCouncilRound.test.tsx` queries `Tap the table to carry on` by role and name. Retarget it to `Carry on`, and add a case asserting the outcome word appears in the well for a skull trick the player did not take — `getByText('Dodge')` — since that is the case the session got wrong.

- [x] **Step 5: Typecheck, the touched specs, and the line budget**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`
Expected: both exit 0; Vitest reports 0 failed.

Run: `(Get-Content src\app\warCouncil\TrickWell.tsx).Count`
Expected: under 400. It was 188 before this task.

### Task 5: The dwell holds a full second ✓

- Skill: react-frontend

**Files:**
- Config: `src/app/warCouncil/warCouncilResolve.css` — `--wc-trick-dwell`

- [x] **Step 1: Set the transcribed value**

Change `--wc-trick-dwell: 800ms;` to `1000ms`, and extend its existing comment rather than replacing it:

```css
  /* PLACEHOLDER — the developer's to set by playing. DLR-160, 2026-09-02: raised 800ms -> 1000ms
     on the developer's own words at the approval gate, "wait a second before moving to the
     resolution screen". The dwell now carries more than a card settling: with DLR-160's outcome
     verdict in the trick well, this is the window in which that line is read. Read by
     `useTrickDwell.ts`'s own `dwellMs`. */
  --wc-trick-dwell: 1000ms;
```

`useTrickDwell.ts`'s `FALLBACK_DWELL_MS` stays at 800 — it is the jsdom fallback, not the value, and changing it would make a test assert a duration no browser uses.

Run: `Select-String -Path src\app\warCouncil\warCouncilResolve.css -Pattern "--wc-trick-dwell"`
Expected: exactly one hit, reading `1000ms`.

---

## Phase 2 — The resolution panel knows what happened

Widen `ResolutionView` with the four facts the panel needs, and fill them at the one producer. Every field is added to the interface, the producer, and all three spec fixtures in the same task, because the fixtures are untyped literals that break only at `tsc` (`plan.md` → audit). The phase ends type-checking with the panel still rendering exactly as before — the new fields are carried but not yet read, which is what makes this a safe boundary.

### Task 6: Move `ResolutionView` out of `roundUiState.ts` and widen it ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/resolutionView.ts`
- Modify: `src/app/warCouncil/roundUiState.ts:180-190`
- Test: `src/app/warCouncil/__tests__/roundReducer.resolution.test.ts:185`
- Test: `src/app/warCouncil/__tests__/TrickResolutionScreen.test.tsx:78,112`

- [x] **Step 1: Create the module with the widened interface**

Move the existing `ResolutionView` declaration verbatim into `src/app/warCouncil/resolutionView.ts`, keeping every docblock, then add the four fields from `plan.md` → Data shapes: `skulledInTrick`, `decree`, `deadBuffs`, `potIsLethal`. Give the module a docblock naming why it moved (`roundUiState.ts` reached its 400-line budget).

- [x] **Step 2: Re-export from `roundUiState.ts` so no importer moves**

Delete the `ResolutionView` interface from `roundUiState.ts` and add beside the existing `RoundUiSeed` re-export, following its precedent exactly:

```ts
// `ResolutionView` lives in `resolutionView.ts` now (DLR-160 — this file was at its 400-line
// budget) and is re-exported here so no importer has to know the seam moved.
export type { ResolutionView } from './resolutionView'
```

- [x] **Step 3: Widen all three spec fixtures in this same task**

`roundReducer.resolution.test.ts:185`, `TrickResolutionScreen.test.tsx:78` and `:112` each build a `ResolutionView` as an untyped object literal. Add all four new fields to each — `skulledInTrick: []`, `decree: <the fixture's existing decree card or a plain card literal>`, `deadBuffs: []`, `potIsLethal: false`. Splitting this across tasks leaves a phase boundary where the app does not compile.

- [x] **Step 4: Typecheck and the line budget**

Run: `npm run typecheck`
Expected: exits 0. A `Property 'decree' is missing` error here means a construction site was missed — every one is listed in `plan.md`'s audit.

Run: `(Get-Content src\app\warCouncil\roundUiState.ts).Count; (Get-Content src\app\warCouncil\resolutionView.ts).Count`
Expected: both under 400.

### Task 7: The lethality predicate, in `src/app/warCouncil/resolutionLethal.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/resolutionLethal.ts`
- Test: `src/app/warCouncil/__tests__/resolutionLethal.test.ts`

- [x] **Step 1: Write the failing test**

Three cases against a real `EncounterState`: a pot below the Quarry's health is not lethal, a pot exactly equal to it is, and a pot above it is. Build the encounter through `src/hunt/`'s own constructors, not a hand-written literal, so the shield fields cannot drift.

Run: `npx vitest run src/app/warCouncil/__tests__/resolutionLethal.test.ts`
Expected: fails to resolve `../resolutionLethal`.

- [x] **Step 2: Write the module**

```ts
/**
 * DLR-160 AC6 — would applying this pot end the fight? Composes the SAME two calls
 * `applyPotAction` (`commitHandlers.ts`) makes when the player actually presses Apply, so the
 * Quarry's shields and the zero floor are INHERITED rather than restated. `duelHealthBars.ts`'s
 * `projectedDepletion` is the cautionary case this follows: it carried its own absorption
 * arithmetic and lied until DLR-115.
 *
 * Pure — no React, no DOM, no clock.
 */
import { applyDamage, incomingFromPot, isEncounterResolved, type EncounterState } from '../../hunt'

export function potIsLethal(encounter: EncounterState, pot: number): boolean {
  return isEncounterResolved(applyDamage(encounter, incomingFromPot(pot)))
}
```

Confirm the three imported names' real module paths against `src/hunt/index.ts` before writing the import — `applyPotAction` in `commitHandlers.ts` is the reference for all three.

**Correction from the plan's literal snippet:** `incomingFromPot` is exported from `../../warCouncil` (`src/warCouncil/streak.ts`), not `../../hunt` — confirmed against `commitHandlers.ts`'s own import list before writing this module. `applyDamage` and `isEncounterResolved` are from `../../hunt` as the snippet said.

Run: `npx vitest run src/app/warCouncil/__tests__/resolutionLethal.test.ts`
Expected: exits 0, 3 tests passed.

**QA fix pass correction:** the shipped body above crashes with a `RangeError` whenever
`encounter` is already resolved by the time this is called — routinely true, since
`commitHandlers.ts` calls it with the encounter AFTER the deciding trick's own damage (a skull's
health loss, a Timebomb detonation, or earlier pot damage) has already been folded in, and
`applyDamage` throws deliberately on an already-resolved encounter. Fixed by guarding on
`isEncounterResolved(encounter)` first and returning `true` without calling `applyDamage` at all —
a finished fight cannot be un-ended by applying more pot. Added a fourth test case building an
already-resolved `EncounterState` through `applyDamage`/`incomingFromPot`/`startEncounter`, the
real shape `resolutionViewFor` hands in. Now 4 tests pass.

### Task 8: The dead-buff derivation, in `src/app/warCouncil/resolutionDeadBuffs.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/resolutionDeadBuffs.ts`
- Test: `src/app/warCouncil/__tests__/resolutionDeadBuffs.test.ts`

- [x] **Step 1: Write the failing test**

Four cases: armed-and-fired is excluded; armed-and-not-fired is returned; an armed id with no matching `Buff` in `candidates` is dropped rather than yielding `undefined` (the rule `resolveFired` in `resolutionBeats.ts` already sets); and an empty armed list returns an empty array. Plus one case pinning that `deadBuffReasonText` contains the buff's name and its condition sentence. Mint the buffs through `mintFromTemplate` rather than hand-building `Buff` literals.

Run: `npx vitest run src/app/warCouncil/__tests__/resolutionDeadBuffs.test.ts`
Expected: fails to resolve `../resolutionDeadBuffs`.

- [x] **Step 2: Write the module**

```ts
/**
 * DLR-160 AC3 — the buffs armed for a trick that did not fire, and why. A SET DIFFERENCE and a
 * label, never a second reading of `buffFires`: composing the reason out of `buffLabels.ts`'s
 * existing `buffConditionSentence` is what keeps this from becoming a parallel table of per-family
 * miss reasons that would drift from `src/hunt/buffEvaluation.ts`'s total switch. The discipline
 * `buffProjection.ts`'s docblock sets out.
 *
 * This is the fix for the session's false bug report: a Key-Feeder was armed, pays only on a trick
 * the player loses, and the player won — so it correctly paid nothing, and nothing on screen said
 * so.
 */
import { type Buff, type BuffId } from '../../hunt'
import { buffConditionSentence, buffName } from './buffLabels'

/** An id with no match in `candidates` is DROPPED rather than rendering `undefined` — the same
 *  rule `resolveFired` in `resolutionBeats.ts` and `buffFiredLabels.ts` already apply. */
export function deadBuffsFor(
  armedIds: readonly BuffId[],
  firedIds: readonly BuffId[],
  candidates: readonly Buff[],
): readonly Buff[] {
  return armedIds.flatMap((id) => {
    if (firedIds.includes(id)) return []
    const buff = candidates.find((candidate) => candidate.id === id)
    return buff === undefined ? [] : [buff]
  })
}

/** PLACEHOLDER copy. `needed:` plus the card's own condition — one grammar, not a second table. */
export function deadBuffReasonText(buff: Buff): string {
  return `${buffName(buff)} — needed: ${buffConditionSentence(buff)}`
}
```

Run: `npx vitest run src/app/warCouncil/__tests__/resolutionDeadBuffs.test.ts`
Expected: exits 0, 5 tests passed.

### Task 9: Fill the four new fields at the producer, in `src/app/warCouncil/commitHandlers.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/commitHandlers.ts:157-178,247-250,290-310`
- Test: `src/app/warCouncil/__tests__/roundReducer.resolution.test.ts`

- [x] **Step 1: Widen `resolutionViewFor`'s signature and fill the fields**

It already receives `state`, so `state.round.skulledCards`, `state.round.decree` and
`state.buffActivation.activatedThisTrick` are all in scope, and `candidates` is already the
`offeredBuffs + spentThisTrick` union. Only the encounter must be threaded in, because lethality
must be asked of the POST-fold encounter, not the pre-commit one:

```ts
function resolutionViewFor(
  state: RoundUiState,
  resolvedTrick: ResolvedTrick,
  trickNumber: number,
  /** DLR-160 AC6 — the encounter AFTER this trick's damage was folded in, never `state.encounter`.
   *  The pot has not been dealt yet (only `applyPot` deals it), but the trick's own damage has. */
  encounterAfterFold: EncounterState,
): ResolutionView {
```

and the four new fields on the returned object:

```ts
    // AC2 — the cards in THIS trick carrying a skull, filtered from the round's own list.
    skulledInTrick: resolvedTrick.cards
      .map((played) => played.card)
      .filter((card) => isSkulled(state.round.skulledCards, card)),
    // AC7 — the decree in force as the trick resolved.
    decree: state.round.decree,
    // AC3 — armed minus fired, against the SAME candidate union the beats resolve against.
    deadBuffs: deadBuffsFor(
      state.buffActivation.activatedThisTrick,
      resolution.firedBuffIds,
      candidates,
    ),
    // AC6 — asked of the same path `applyPotAction` takes, never a comparison of two numbers.
    potIsLethal: potIsLethal(encounterAfterFold, potValue(resolution.total, resolution.roll)),
```

- [x] **Step 2: Pass the post-fold encounter at both call sites**

There are two `resolutionViewFor` calls in this file — the player's own resolving play (~line 249) and the trick the player LED that only resolves on the Quarry's follow (~line 300). Pass `folded?.encounter ?? state.encounter` and `quarryFolded?.encounter ?? settled.encounter` respectively. Both `folded` values are already computed above their call site.

- [x] **Step 3: Assert the four fields at the reducer level**

Extend `roundReducer.resolution.test.ts` with a case driving a real skull trick and asserting `view.skulledInTrick` is non-empty, `view.decree` matches the round's decree, `view.deadBuffs` names an armed buff whose condition the trick missed, and `view.potIsLethal` is `true` when the pot exceeds the Quarry's health. Split into three cases (skull/decree/dead-buff together, lethal-true, lethal-false) for a clearer failure signal.

- [x] **Step 4: Typecheck, the spec, and the line budget**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/roundReducer.resolution.test.ts`
Expected: both exit 0; Vitest reports 0 failed.

Run: `(Get-Content src\app\warCouncil\commitHandlers.ts).Count`
Expected: under 400. It was 369 before this task — if it crosses, split `resolutionViewFor` into its own module and import it back.

---

## Phase 3 — The panel says it, and stops taking the whole screen

The panel reads the four fields Phase 2 carries, inverts its type hierarchy, and becomes an overlay over a still-mounted felt. This is the phase with the real layout risk, and every size and duration in it is the developer's. Safe boundary: the panel's content and its placement are independent changes to one component tree, and the phase ends with `npm run typecheck` and the round's spec set green.

### Task 10: Split the panel chrome out of `warCouncilResolve.css` ✓

- Skill: react-frontend, game-ux

**Files:**
- Create: `src/app/warCouncil/warCouncilResolvePanel.css`
- Modify: `src/app/warCouncil/warCouncilResolve.css`
- Modify: `src/app/warCouncil/TrickResolutionScreen.tsx`

- [x] **Step 1: Move the shell rules and add the two new tunables**

Move `.wc-resolve`'s own shell block out of `warCouncilResolve.css` into the new file, and rewrite it from a full-viewport screen to a corner panel. The `:root` token block stays in `warCouncilResolve.css` with the other durations; the two NEW keys are declared in the new file beside the rule that reads them:

```css
/* DLR-160 AC11 — PLACEHOLDERS, the developer's to set by playing, not chosen values. The
   developer's own words are "just put it into the corner somewhere", so the felt stays behind it.
   The trade is legibility of the panel against how much felt stays visible. */
:root {
  --wc-resolve-panel-w: 22rem;
  --wc-resolve-panel-inset: 1.1rem;
}

.wc-resolve {
  position: fixed;
  right: var(--wc-resolve-panel-inset);
  bottom: var(--wc-resolve-panel-inset);
  width: var(--wc-resolve-panel-w);
  max-width: calc(100% - 2 * var(--wc-resolve-panel-inset));
  max-height: calc(100dvh - 2 * var(--wc-resolve-panel-inset));
  overflow: hidden;
  z-index: 40;
  /* … border, radius, background, shadow per `mockup.html`'s `.resolve-panel` … */
}
```

Keep `100dvh`/`100%` only — no `100vh`, no `100vw` anywhere in the diff (`game-ux` hard floor). Keep the safe-area padding on whichever element still needs it.

- [x] **Step 2: Import the new stylesheet from the component**

Add `import './warCouncilResolvePanel.css'` beside the existing `import './warCouncilResolve.css'` in `TrickResolutionScreen.tsx`.

- [x] **Step 3: Confirm both files are under budget and no viewport-unit regression crept in**

Run: `(Get-Content src\app\warCouncil\warCouncilResolve.css).Count; (Get-Content src\app\warCouncil\warCouncilResolvePanel.css).Count`
Expected: both under 400. `warCouncilResolve.css` was 389 before this task.

Run: `Get-ChildItem src\app\warCouncil -Include *.css -Recurse | Select-String -Pattern "100vh|100vw"`
Expected: zero hits.

### Task 11: Invert the type hierarchy ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/warCouncilResolve.css:225-260`

- [x] **Step 1: Move the large treatment and the impact animation onto the pot**

`.wc-resolve-big-value` currently carries `clamp(2.1rem, 6.2vmin, 3.6rem)` for the trick's own contribution while `.wc-resolve-figure-value` — which renders the pot — declares no `font-size` at all. Swap which element is large, and move the `wc-resolve-impact` animation with it so the beat lands on the figure the player is deciding about. Add a small explicit size to the contribution so it is subordinate rather than merely unstyled. All three `clamp()` bounds carry a PLACEHOLDER comment naming them as the developer's, following this file's existing token comments:

```css
/* DLR-160 AC5 — PLACEHOLDER bounds, the developer's to set. The pot is what the Apply-or-roll
   decision is about, and it was set smaller than the trick's own contribution: a contribution of
   1 rendered roughly three times the size of a pot of 12. */
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. (CSS is not type-checked; this confirms nothing else in the tree broke.)

### Task 12: The panel's new content, in `TrickResolutionScreen.tsx` and `ResolutionBreakdown.tsx` ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/TrickResolutionScreen.tsx`
- Create: `src/app/warCouncil/ResolutionBreakdown.tsx`
- Modify: `src/app/warCouncil/warCouncilResolvePanel.css`
- Test: `src/app/warCouncil/__tests__/TrickResolutionScreen.test.tsx`

- [x] **Step 1: Extract the beat rows and dead rows into `ResolutionBreakdown.tsx`**

The component is 195 lines and gains an outcome line, a decree mark, a skull statement, a dead list and a lethal marking. Move the `ResolutionLedger` call and the new dead rows into a sibling that takes `beats`, `landed` and `deadBuffs` and renders both groups. Dead rows use `deadBuffReasonText`, are wrapped in `<s>` and carry a class distinct from the paying rows, per AC3 and `mockup.html`'s `.row.dead`.

- [x] **Step 2: Replace the mechanical verdict with the outcome word**

Replace:

```tsx
        <p className={`wc-resolve-verdict${hurt ? ' wc-is-hurt' : ''}`}>
          {winner === PlayerSide.Player ? 'You took it' : 'They took it'}
        </p>
```

with the four-outcome word plus its reason, derived from the same module `TrickWell` uses:

```tsx
        <p className={`wc-resolve-outcome${hurt ? ' wc-is-hurt' : ''}`}>
          {TRICK_OUTCOME_WORD[outcomeKind]}
        </p>
        <p className="wc-resolve-outcome-why">{TRICK_OUTCOME_WHY[outcomeKind]}</p>
```

with `outcomeKind` from `trickOutcomeKindFor(winner === PlayerSide.Player, skulledInTrick.length > 0)`.

- [x] **Step 3: Show the skull on the card face and the decree on the header**

Pass `skulled={skulledInTrick.some((card) => sameCard(card, played.card))}` to each `PlayingCard` in the trick cluster — the prop already exists and `TrickWell` already uses it. Add the decree to the header line as a `SuitMark` plus the suit word, per `mockup.html`'s `.decree-chip`.

- [x] **Step 4: Mark a lethal pot on the Apply control**

When `potIsLethal`, render a tag on the Apply button and fold the fact into its `aria-label`, so a screen-reader user hears it in the control's own name rather than beside it. It must read in greyscale — a word plus a colour, never a colour alone (`game-ux` hard floor):

```tsx
            aria-label={`Apply Damage — deal ${pot} to the Quarry now${potIsLethal ? ', which ends the fight' : ', total and roll reset'}`}
```

- [x] **Step 5: Cover the four new behaviours by role and text**

Extend `TrickResolutionScreen.test.tsx`: the outcome word appears for a dodge; a skulled card renders its skull; the decree suit appears in the header; a dead buff renders struck through with its condition; and the Apply control's accessible name says the fight ends when `potIsLethal` is `true`. Query by role and accessible name, not by class.

- [x] **Step 6: Typecheck, the spec, and both files' budgets**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/TrickResolutionScreen.test.tsx`
Expected: both exit 0; Vitest reports 0 failed.

Run: `(Get-Content src\app\warCouncil\TrickResolutionScreen.tsx).Count; (Get-Content src\app\warCouncil\ResolutionBreakdown.tsx).Count`
Expected: both under 400.

### Task 13: The panel overlays the felt, in `src/app/warCouncil/WarCouncilRound.tsx` ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:95-120`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`

- [x] **Step 1: Render both instead of switching between them**

Replace the ternary:

```tsx
        {ui.resolution !== null && showResolution ? (
          <TrickResolutionScreen resolution={ui.resolution} dispatch={dispatch} />
        ) : (
          <WarCouncilTable … />
        )}
```

with the table rendered unconditionally and the panel beside it:

```tsx
        {/* DLR-160 AC11 — the table is ALWAYS mounted now; the resolution panel overlays it rather
            than replacing it ("just put it into the corner somewhere"). Two consequences worth
            stating. The felt needs nothing new disabling: `canAct` is already false while
            `ui.resolvedTrick !== null`, so no hand card is tappable behind the panel. And the
            table is no longer torn down and remounted at every trick, which means
            `useTableCardMotion` and `useCardMotionDriver` keep their identity across a resolution
            — strictly fewer mounts than before, not more. */}
        <WarCouncilTable … />
        {ui.resolution !== null && showResolution && (
          <TrickResolutionScreen resolution={ui.resolution} dispatch={dispatch} />
        )}
```

- [x] **Step 2: Check `TrickResolutionScreen`'s docblock claims that are now false**

Its docblock says the screen replaces the felt "rather than overlaying it" and that "the felt is not mounted while this screen is up, so there is nothing to move them FROM". Both are now wrong. Rewrite those two paragraphs; the cards are still cloned rather than moved, and the reason is now that the panel owns its own rendering of the same two cards, not that the felt is absent.

- [x] **Step 3: Confirm no duplicate motion anchor is registered**

`TrickResolutionScreen` registers no `useMotionAnchor` today, so mounting it alongside the table introduces no duplicate key in the shared registry.

Run: `Select-String -Path src\app\warCouncil\TrickResolutionScreen.tsx,src\app\warCouncil\ResolutionBreakdown.tsx -Pattern "useMotionAnchor|register\("`
Expected: zero hits. A hit means the panel would contend with the table for a place key and this task needs an anchor decision first.

- [x] **Step 4: Typecheck and the round's spec set**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__`
Expected: both exit 0; Vitest reports 0 failed. A spec asserting the table is absent while a trick is resolving is asserting the old structure — retarget it to assert the panel is present.

---

## Phase 4 — The tooltip clears the breakdown

One number crossing one boundary. The phase touches three files and adds no listener, timer or observer — the measurement it publishes is one the breakdown panel's existing `useLayoutEffect` already takes. Safe boundary: with the context defaulting to `null`, the tooltip behaves exactly as today until the panel actually publishes a value.

### Task 14: Publish the breakdown panel's top edge ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/breakdownRectContext.ts`
- Modify: `src/app/warCouncil/useBuffBreakdownAnchor.ts`
- Modify: `src/app/warCouncil/CardBuffBreakdown.tsx`
- Modify: `src/app/warCouncil/WarCouncilTable.tsx`
- Create: `src/app/warCouncil/BuffRideZone.tsx` — split out of `WarCouncilTable.tsx` to stay under the 400-line budget once the provider was added (see Step 4's note)
- Modify: `src/app/warCouncil/buffRideProps.ts` — `useBuffRide` now holds the published top edge in state
- Modify: `src/app/warCouncil/__tests__/CardBuffBreakdown.test.tsx` — pass the newly-required `onTopChange` prop

- [x] **Step 1: Write the context module**

```ts
/**
 * DLR-160 AC4 — the card-breakdown panel's measured top edge in VIEWPORT coordinates, or `null`
 * when no panel is open. ONE number crossing ONE boundary, so `CardAbilityTip` can place its
 * bubble above whichever of the card and the panel is higher.
 *
 * Both surfaces anchor to the top edge of the same hovered card — `useBuffBreakdownAnchor` sets
 * the panel's `bottom` from the card's measured rect, `useCardTip` sets the bubble's `top` from the
 * same rect — so they land on the same line EVERY time, not occasionally. That collision is the
 * ticket's fourth screenshot: the Witch's rule bubble sitting on top of the Key-Feeder line that
 * explained the number, which cost a trick and produced a false bug report.
 */
export const BreakdownTopContext = createContext<number | null>(null)
export function useBreakdownTop(): number | null {
  return useContext(BreakdownTopContext)
}
```

- [x] **Step 2: Have the anchor hook return what it already measures**

`useBuffBreakdownAnchor` already measures the panel and writes `left`, `--point` and `bottom` in a `useLayoutEffect`. Return the panel's resulting top edge as state so the provider can publish it. Do NOT add a second measurement, a `ResizeObserver`, or a poll — `useCardTip`'s "measured once on open" contract is the standard on this surface.

- [x] **Step 3: Provide it from the table, set it from the panel** — `useBuffRide` (`buffRideProps.ts`)
  holds the published value in `useState` and exposes `breakdownTop`/`onBreakdownTopChange` on the
  bundle; `CardBuffBreakdown` reports its measured top up via the new `onTopChange` prop, called
  from an effect keyed on the value. Wrapping `WarCouncilTable`'s own `.wc-buff-ride-zone` in
  `BreakdownTopContext.Provider` pushed the file to 406 lines, so per Step 4's own instruction the
  whole zone (`HandFan` + `BuffRidingList` + `CardBuffBreakdown` + the provider) moved into a new
  sibling component, `BuffRideZone.tsx` — a pure move plus the one new provider line, following the
  same split pattern `FeltStage`/`FeltRail` already use. The value returns to `null` when
  `breakdown` is `null` — the same edge the panel's own early return already handles.

- [x] **Step 4: Typecheck and the buff-ride specs**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.buffRide.test.tsx`
Expected: both exit 0; Vitest reports 0 failed. **Confirmed** — typecheck exit 0, Vitest 22 passed
across the buffRide and `CardBuffBreakdown` specs (the latter needed the new required prop).

Run: `(Get-Content src\app\warCouncil\WarCouncilTable.tsx).Count`
Expected: under 400. Task 2 removed lines from it; if this task pushes it over, move the provider into `buffRideProps.ts`'s hook rather than growing the component. **Confirmed** — 362 lines after extracting `BuffRideZone.tsx` (90 lines).

### Task 15: Place the bubble above the panel, in `src/app/warCouncil/CardAbilityTip.tsx` ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/CardAbilityTip.tsx`
- Modify: `src/app/warCouncil/warCouncilCardTip.css`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.buffRide.test.tsx`
- Modify: `src/app/warCouncil/__tests__/CardAbilityTip.test.tsx` — two pinned cases retargeted from
  `style.top` to the new `--wc-tip-anchor-y` custom property (see Step 1's deviation note)

- [x] **Step 1: Read the published top and use the higher of the two** — DEVIATION from the
  literal snippet: `anchorTop` is written to a NEW `--wc-tip-anchor-y` custom property, not a plain
  inline `top`, because Step 2 asks for a CSS floor on `top` and a CSS rule cannot out-rank a plain
  inline style with no `!important` — the exact reason `left` already goes through
  `--wc-tip-anchor-x` instead of an inline `left`. `warCouncilCardTip.css`'s `.wc-card-tip` now
  reads `top: max(6rem, var(--wc-tip-anchor-y))`. This broke two PRE-EXISTING pinned assertions in
  `CardAbilityTip.test.tsx` that read `style.top` directly (`'anchors the bubble to the card…'` and
  `'re-measures on the card's transitionend…'`) — retargeted both to read
  `style.getPropertyValue('--wc-tip-anchor-y')` instead; the values they pin are unchanged.

```tsx
  const breakdownTop = useBreakdownTop()
  // DLR-160 AC4 — anchor above whichever is higher: the card, or the breakdown panel describing
  // it. Both are anchored to the card's top edge, so with no adjustment the bubble lands exactly
  // on the panel every time.
  const anchorTop = breakdownTop === null ? anchor.top : Math.min(anchor.top, breakdownTop)
```

and pass `anchorTop` via `--wc-tip-anchor-y` (see the deviation note above), mirroring the horizontal `--wc-tip-anchor-x` and its `clamp()`, both unchanged in shape.

- [x] **Step 2: Keep the bubble on screen at the top edge** — `top: max(6rem, var(--wc-tip-anchor-y))`,
  reusing the SAME `6rem` the horizontal clamp already derives (half the `11rem` width floor plus
  an edge gap), rather than a new invented number. PLACEHOLDER comment in place; the developer's to
  retune.

**In this same step, replaced the two live `100vw` occurrences** with `100dvw` (the dynamic
viewport width, per `game-ux`'s hard floor) in both the live `max-width`/`left` rules, and rewrote
the surrounding prose so it explains the change without the literal substring `100vw` reappearing —
the Phase 8 grep audit matches inside comments too. Confirmed clean (see Step 4).

- [x] **Step 3: Pin the behaviour in a component test** — three cases added to
  `WarCouncilRound.buffRide.test.tsx` (a new `describe` block at the end of the file), rendering
  `CardAbilityTip` (via `PlayingCard`) directly under a `BreakdownTopContext.Provider` rather than
  through the full round — jsdom's `offsetParent`/layout gaps mean `useBuffBreakdownAnchor` cannot
  be driven to a real non-null value through the round's own DOM, so this asserts the contract this
  task actually owns (`CardAbilityTip`'s own placement rule) directly, the same way
  `CardAbilityTip.test.tsx` already does for its other placement rules. Reads
  `style.getPropertyValue('--wc-tip-anchor-y')` per Step 1's deviation, not `style.top`.

- [x] **Step 4: Typecheck and the spec**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.buffRide.test.tsx`
Expected: both exit 0; Vitest reports 0 failed. **Confirmed** — typecheck exit 0, Vitest 13 passed.

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include *.css | Select-String -Pattern "100vh|100vw"`
Expected: zero hits. **Confirmed** — zero hits.

---

## Phase 5 — Filter the pile by suit

Self-contained: one pure module, one chip-row component, and the gallery composing them. Nothing outside `BuffGallery` changes, so the phase boundary is clean by construction.

### Task 16: The composed filter, in `src/app/warCouncil/buffSuitFilter.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/buffSuitFilterModel.ts` (renamed from the plan's `buffSuitFilter.ts` — see Notes)
- Test: `src/app/warCouncil/__tests__/buffSuitFilterModel.test.ts`

- [x] **Step 1: Write the failing test**

Cases: `ALL_FILTERS` matches every stack; a tier-only filter matches on tier alone; a run-only filter matches on run alone; both together are an intersection (a silver Keys card passes `{tier: Silver, run: Keys}` and a bronze Keys card does not); and `runCountsFor` counts over the stacks the TIER filter already allows, so the suit chips' numbers follow what is actually on screen. Build stacks through `buildBuffGallery` over minted buffs, not hand-written `BuffStack` literals.

Run: `npx vitest run src/app/warCouncil/__tests__/buffSuitFilterModel.test.ts`
Expected: fails to resolve `../buffSuitFilterModel`.

- [x] **Step 2: Write the module**

Per `plan.md` → Data shapes. One `BuffGalleryFilter` value rather than two independent `useState` calls, so a pair the counts were never recomputed over is unexpressible — the same argument `roundUiState.ts` makes for `discardSelection` and `loadout` being single nullable fields.

Run: `npx vitest run src/app/warCouncil/__tests__/buffSuitFilterModel.test.ts`
Expected: exits 0, 5 tests passed. **Confirmed: 5 passed.**

### Task 17: The suit chip row, in `src/app/warCouncil/BuffSuitFilter.tsx` ✓

- Skill: react-frontend, game-ux

**Files:**
- Create: `src/app/warCouncil/BuffSuitFilter.tsx`
- Create: `src/app/warCouncil/buffRunLabels.ts` (not in the plan's file map — see Notes)
- Modify: `src/app/warCouncil/BuffRunTab.tsx` (moved its two lookup maps into `buffRunLabels.ts`)
- Modify: `src/app/warCouncil/warCouncilBuffGallery.css`

- [x] **Step 1: Write the component as a sibling of `BuffTierFilter`**

Same shape: real `<button>`s with `aria-pressed`, a live count, a ≥44px hit area, and a `nav` carrying `aria-label="Filter by suit"`. Chips are `all`, the three suits, `Suitless` and `Press`, using `BuffRunKind` and the run words `BuffRunTab` already owns rather than a second naming. Suit is carried by a `SuitMark` glyph plus the word, never colour alone — `game-ux`'s greyscale rule, and `warCouncilBuffGallery.css` already records that Bells' amber sits 28.7 RGB units from the bronze tier field.

Copy `BuffTierFilter`'s docblock warning verbatim in substance: this renders OUTSIDE `BuffGallery`'s roving-tabindex `groupRef`, because that hook indexes `querySelectorAll('button')` positionally and any button inside the group that is not a buff card shifts every arrow-key index after it.

- [x] **Step 2: Style the row beneath the tier row**

Add `.wc-suit-filter` and `.wc-suit-chip` rules to `warCouncilBuffGallery.css`, reusing `.wc-tier-chip`'s existing hit-area floor rather than restating a size. Layout per `mockup.html`'s tab 4.

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. **Confirmed.**

### Task 18: Compose both filters in `src/app/warCouncil/BuffGallery.tsx` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/BuffGallery.tsx`
- Modify: `src/app/warCouncil/warCouncilBuffGallery.css` (the empty-state line's rule)
- Test: `src/app/warCouncil/__tests__/BuffGallery.test.tsx` (the gallery's own existing spec — see Notes on the plan's `WarCouncilRound.actionBar.test.tsx` listing)

- [x] **Step 1: Replace the local tier state with the composed filter**

`const [tierFilter, setTierFilter] = useState<BuffTier | 'all'>('all')` becomes
`const [filter, setFilter] = useState<BuffGalleryFilter>(ALL_FILTERS)`, and the local
`matchesTier` helper is deleted in favour of `matchesFilter`. Render `BuffSuitFilter` immediately
after `BuffTierFilter`, both above `.wc-gallery-scroll` and both outside `groupRef`.

The fence's recomputed reason must follow the intersection, not just the tier — the existing
comment explaining why it is recomputed over the FILTERED stacks stays true and its reasoning now
covers both axes.

- [x] **Step 2: Add the empty state**

Two filters can produce an intersection with nothing in it, which one filter could not. Render a short line saying so rather than an empty grid — `game-ux`'s rule is against a panel that reports nothing *every* turn, not against saying why a deliberate filter is empty.

- [x] **Step 3: Cover it by role**

Extend the gallery's existing spec: pressing a suit chip narrows the grid; pressing a tier chip and a suit chip together shows only their intersection; the empty intersection renders its line. Query chips by role and accessible name.

- [x] **Step 4: Typecheck, the spec, and the budget**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/BuffGallery.test.tsx`
Expected: both exit 0; Vitest reports 0 failed. **Confirmed: typecheck exit 0; 16 passed (0 failed).**

Run: `(Get-Content src\app\warCouncil\BuffGallery.tsx).Count`
Expected: under 400. It was 212 before this task. **Confirmed: 235.**

---

## Phase 6 — The shop: a look at your cards, and what a pull was worth

Two independent surfaces. The pre-fight screen adds a `RunPhase` member and an `AppScreen` value, and both places that declare the screen set change in the same task because the second binds by string. Safe boundary: the phase ends with the run flow type-checking and `screenFor`'s spec covering the new phase in both encounter states.

### Task 19: Per-reel awarded tier, in `src/app/run/slotTier.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/run/slotTier.ts`
- Test: `src/app/run/__tests__/slotTier.test.ts`

- [x] **Step 1: Write the failing test**

Three cases mirroring `resolvePull`'s three outcomes: three matched symbols all read Gold; two matched read Silver, Silver, Bronze in reel order; all different read three Bronze. Plus one case that a symbol with no matching award yields `null` rather than `undefined`. Build the awards by calling `resolvePull` itself, so the test cannot encode a second copy of the match rule.

Run: `npx vitest run src/app/run/__tests__/slotTier.test.ts`
Expected: fails to resolve `../slotTier`.

- [x] **Step 2: Write the module**

A lookup from each symbol's template id into the pull's own `awards`. Its docblock must state plainly that it never re-derives `resolvePull`'s match rule and that a strip symbol has no tier of its own — the tier is decided by the match, which is why AC10's figure lands here and not on the face-up strip.

Run: `npx vitest run src/app/run/__tests__/slotTier.test.ts`
Expected: exits 0, 4 tests passed. **Confirmed: 4 passed.**

### Task 20: Tier badges on the machine, in `src/app/run/SlotMachinePanel.tsx` ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/run/SlotMachinePanel.tsx:200-280`
- Modify: `src/app/run/shopSlotReel.css`
- Modify: `src/app/run/useShopSlot.ts` — added `SlotPullView.rawAwards`, the plumbing `reelTiers` needs and the strict Files list did not name (see the Implementer report)
- Test: `src/app/run/__tests__/SlotMachinePanel.test.tsx`, `src/app/run/__tests__/SlotMachineCabinet.test.tsx`, `src/app/run/__tests__/ShopCardMotion.test.tsx` (both existing `SlotPullView` literals needed the new required field)

- [x] **Step 1: Badge each landed window and each award row**

Call `reelTiers(lastPull.symbols, lastPull.rawAwards)` once beside the existing `matchedReels` call (`rawAwards`, not `awards` — see Implementer report on why `SlotPullView.awards`'s minted `Buff`s cannot carry a template id), and render a tier badge in each window while `showResult` is true — never during the spin, when nothing has been decided. Each award row keeps its `buffLine` sentence, which already opens with the tier word, and gains the same badge so the two surfaces read alike. Tier word plus a metal swatch, never a swatch alone (`game-ux` greyscale rule; `BuffTierFilter`'s existing swatch classes are the reference; the badge reuses the `--wc-m-bronze/-silver/-gold` metal tokens `warCouncilBuffCard.css` already defines).

- [x] **Step 2: Style the badge**

Added `.shop-reel-slot`, `.shop-reel-tier`, `.shop-reel-tier-dot(-bronze/-silver/-gold)` to `shopSlotReel.css`. Layout per `mockup.html`'s tab 6.

- [x] **Step 3: Cover it**

Extended `SlotMachinePanel.test.tsx`: after a two-match pull, the two matched windows read Silver and the odd one reads Bronze; nothing is badged before a pull resolves. Relaxed two pre-existing award-row assertions from `textContent === buffLine(award)` to `.endsWith(buffLine(award))` since the badge now precedes the sentence.

- [x] **Step 4: Typecheck, the spec, and the budget**

Run: `npm run typecheck; npx vitest run src/app/run/__tests__/SlotMachinePanel.test.tsx`
Expected: both exit 0; Vitest reports 0 failed. **Confirmed: 11 passed (9 pre-existing + 2 new).**

Run: `(Get-Content src\app\run\SlotMachinePanel.tsx).Count`
Expected: under 400. It was 295 before this task. **Confirmed: 343.**

### Task 21: The new phase, in `src/app/screenFor.ts` and `src/app/debugState.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/screenFor.ts`
- Modify: `src/app/debugState.ts:17`
- Test: `src/app/__tests__/screenFor.test.ts`

- [x] **Step 1: Write the failing cases**

```ts
  it('shows the pre-fight screen even though the next encounter is already live', () => {
    expect(screenFor(RunPhase.PreFight, false)).toBe('preFight')
  })
  it('shows the pre-fight screen when the encounter reads over too', () => {
    expect(screenFor(RunPhase.PreFight, true)).toBe('preFight')
  })
```

Run: `npx vitest run src/app/__tests__/screenFor.test.ts`
Expected: the two new cases fail. **Confirmed — `RunPhase.PreFight` did not exist yet, so this failed to compile/resolve before Step 2.**

- [x] **Step 2: Add the phase and the screen value**

Added `PreFight: 'preFight'` to `RunPhase` and `'preFight'` to `AppScreen`, per `plan.md` → Data shapes. The branch goes **immediately after `Start` and before the `!encounterOver` line** — `leaveForNextFight` sets this phase after `advanceRun`, so the next encounter is already live and every later branch is unreachable:

```ts
  if (phase === RunPhase.Start) return 'start'
  // DLR-160 AC9 — before the `!encounterOver` line, exactly as `Start` is, and for the same
  // reason: the next encounter is already live by the time this phase is set.
  if (phase === RunPhase.PreFight) return 'preFight'
  if (!encounterOver) return 'warCouncil'
```

- [x] **Step 3: Make `debugState.ts` import the union instead of restating it**

`debugState.ts:17` restated the seven literals inline. Replaced that type with `AppScreen`, imported from `./screenFor`, so the two can never drift again — they bind by string and the compiler now connects them.

- [x] **Step 4: Typecheck and the spec**

Run: `npm run typecheck; npx vitest run src/app/__tests__/screenFor.test.ts`
Expected: both exit 0; Vitest reports 11 passed. **Confirmed: 10 passed, not 11 — the file on disk had 8 pre-existing `it` blocks (not 9, as the plan's audit stated), and 8 + 2 = 10. See the Implementer report; this is a plan/disk mismatch, not a shortfall.**

### Task 22: The pre-fight screen, in `RunPathScreen.tsx` and `PathScreens.tsx` ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/run/RunPathScreen.tsx`
- Create: `src/app/run/PathScreens.tsx`
- Modify: `src/app/run/run.css`
- Modify: `src/App.tsx:200-300`
- Test: `src/app/run/__tests__/RunPathScreen.test.tsx`

- [x] **Step 1: Give `RunPathScreen` an optional held-buff tray**

Added the optional `heldBuffs` prop from `plan.md` → Data shapes. When present, renders a read-only tray beneath the map using the existing `heldBuffStacks` grouping and `HeldBuffCard`, so the cards read as the same metal cards the shop and the felt show rather than a list of agent-authored names. When absent (`undefined`), renders nothing — no empty frame — on the start and map screens. When present but empty (the pre-fight screen at zero holdings), states "You hold nothing yet." plainly rather than an empty frame, mirroring `ShopHeld`'s own discipline for the same situation. Styled per `mockup.html`'s tab 5, in `run.css`.

`ShopHeld` itself is NOT reused directly: it carries the shop's Manage Buffs control and its motion anchor, neither of which belongs on this screen.

- [x] **Step 2: Lift the three path branches out of `App.tsx`**

`src/App.tsx` was at 399 of 400 lines. Created `src/app/run/PathScreens.tsx` exporting `StartScreen`, `MapScreen` and `PreFightScreen` — three thin wrappers over `RunPathScreen`, each taking the props its branch already computes — and replaced the three inline blocks in `App.tsx` with calls to them.

- [x] **Step 3: Stop `leaveForNextFight` dropping straight onto the felt**

Changed its `setPhase(RunPhase.Verdict)` to `setPhase(RunPhase.PreFight)`. The pre-fight screen's one control sets `RunPhase.Verdict`, which is where the flow used to land — so the fight begins on the player's press rather than on leaving the shop. Nothing else in `leaveForNextFight` changed: the run still advances and the hand is still dealt at the same moment.

- [x] **Step 4: Cover both shapes**

Extended `RunPathScreen.test.tsx`: with `heldBuffs` supplied the tray renders one card per held stack; without it no tray region exists in the tree at all; with an empty array it states the plain "nothing held" sentence. Queried by role and accessible name.

- [x] **Step 5: Typecheck, the spec, and both budgets**

Run: `npm run typecheck; npx vitest run src/app/run/__tests__/RunPathScreen.test.tsx`
Expected: both exit 0; Vitest reports 0 failed. **Confirmed: 7 passed.**

Run: `(Get-Content src\App.tsx).Count; (Get-Content src\app\run\PathScreens.tsx).Count; (Get-Content src\app\run\RunPathScreen.tsx).Count`
Expected: all three under 400, and `App.tsx` lower than the 399 it started at. **Confirmed: 397, 70, 99.**

**Closing check for Phase 6** — `npm run typecheck; npm run lint; npx vitest run src/app` all exited 0; Vitest reported 107 files / 1103 tests passed. No spec was found driving shop → fight in one step (a grep for `Next fight`/`leaveForNextFight`/`onLeave` outside `src/app` turned up only `src/__tests__/App.test.tsx`, which exercises the Start → Verdict path, not the shop, and was re-run individually — 4 passed).

---

## Phase 7 — A way out of the Fox exchange

The smallest change in the contract: the reducer action already exists and already does the right thing, and the prompt already receives the handler. Only the control is missing.

### Task 23: A visible cancel control, in `src/app/warCouncil/AbilityPrompt.tsx` ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/AbilityPrompt.tsx`
- Modify: `src/app/warCouncil/warCouncilCards.css` (task named `warCouncil.css`; `.wc-prompt`/`.wc-decline` actually live in `warCouncilCards.css` — `warCouncil.css` holds only tokens/`:root`. Adapted, per the phase's own escape hatch for a snippet that doesn't match disk.)
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.abilityCancel.test.tsx` (new sibling file, not an edit to `WarCouncilRound.test.tsx` — see Step 3 note)

- [x] **Step 1: Render a cancel button on both prompt branches**

Both branches already receive `onCancel`, and `WarCouncilTable.handleCancel` already routes it to `CancelSelection`, which clears `armed` and `prompt` together — the card is never removed from hand until commit, so nothing else is needed to make this correct. Added a `.wc-prompt-cancel` button to both branches, rendered as the last child of the group (after `.wc-prompt-row` and the hint paragraph) rather than merely "outside `.wc-prompt-row`" — verified on disk that `useRovingTabIndex`'s `focusIndex` calls `groupRef.current.querySelectorAll('button')` against the *whole* `.wc-prompt` group container (the ref `attachGroup` attaches), not scoped to the row, so a button anywhere earlier in DOM order would have shifted every index after it. Appending last leaves it un-addressed by any arrow-key index (`count` never includes it) while it remains reachable in normal document order via Tab. Documented this reasoning inline in the component. The Fox branch's hint now names all three exits and states plainly that "Keep the decree" still plays the card while cancel does not.

- [x] **Step 2: Style it as a secondary control**

Added `.wc-prompt-cancel` to `warCouncilCards.css`: no border (vs. `.wc-decline`'s bordered box), dimmer `--wc-chalk-dim` text, same 44px `min-height` and `touch-action: manipulation` as `.wc-decline`, hover brightening under `@media (hover: hover)` paired with an `:active` state, and added to the existing shared `:is(.wc-card, .wc-decline, .wc-prompt-cancel):focus-visible` rule rather than a new one.

- [x] **Step 3: Cover it**

Extended AC12 coverage, but as a new sibling file `WarCouncilRound.abilityCancel.test.tsx` (mirroring `WarCouncilRound.test.tsx`'s own `renderRound` helper, the same pattern `WarCouncilRound.timebomb.test.tsx` already uses) rather than growing `WarCouncilRound.test.tsx` itself — appending the two cases in place measured at 414 lines, over the 400-line budget, so the split happened in the same change per the budget rule. Two tests: cancel via the visible control, and cancel via `Escape`; both assert the prompt is gone, the trick count is untouched (nothing played), and the Fox is back in the hand with `aria-pressed` no longer `"true"`.

- [x] **Step 4: Typecheck, the spec, and the budget**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.abilityCancel.test.tsx src/app/warCouncil/__tests__/AbilityPrompt.test.tsx`
Result: Vitest — 3 files, 24 tests, all passed. `npm run typecheck` fails, but **not on any file this task touched** — the only errors are in `src/app/warCouncil/buffLabels.ts` and `src/hunt/buffEvaluation.ts`, both modified by an unrelated, uncommitted, in-progress contract (`DLR-161-skull-helmet-and-skull-tether`) sitting in the same working tree (`git diff --stat` confirms `src/hunt/buffs.ts` gained two new `BuffKind` members that `buffLabels.ts` hasn't been updated to cover). A scoped `tsc --noEmit` run confirms zero errors reference `AbilityPrompt` or `abilityCancel`. Not fixed here — out of this phase's file map and owned by the other contract.

Run: `(Get-Content src\app\warCouncil\AbilityPrompt.tsx).Count`
Result: 197 lines (was 174 before this task) — under 400.

---

## Phase 8 — Final verification

No production changes. Sanity-checks that the cumulative work is clean, that nothing this ticket deleted survives anywhere, and that no file crossed the budget.

### Task 24: Confirm the deleted behaviours left nothing behind ✓

- Skill: none — verification only, no code is written

- [x] **Step 1: The felt's region click and its cursor class are gone**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "wc-is-waiting|Tap the table to carry on"`
Expected: zero hits.

- [x] **Step 2: No full-viewport unit crept into the resolution panel's stylesheets**

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include *.css | Select-String -Pattern "100vh|100vw"`
Expected: zero hits.

- [x] **Step 3: The pure-core boundary was not crossed**

Run: `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. This ticket adds no module to either tree; a hit means one was misplaced.

### Task 25: Confirm every tunable is still a tunable ✓

- Skill: none — verification only, no code is written

- [x] **Step 1: The six duration and size keys are declared once each and read, never inlined**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "wc-resolve-panel-w|wc-resolve-panel-inset|wc-trick-dwell|wc-resolve-hold"`
Expected: each key appears in exactly one `:root` declaration plus its readers. No literal `1000ms`, `22rem` or `1.1rem` appears anywhere outside those declarations.

- [x] **Step 2: No file crossed the 400-line budget**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | ForEach-Object { $n = (Get-Content $_.FullName).Count; if ($n -gt 400) { "$n  $($_.FullName)" } }`
Expected: no output. Measured with `(Get-Content).Count`, not `Measure-Object -Line`, which drops blank lines and hid a real breach on DLR-63.

### Task 26: Static gates and full suite ✓

- Skill: none — verification only, no code is written

- [x] **Step 1: Warm the transform cache, then typecheck, lint and the unfiltered suite**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all exit 0; Vitest reports 0 failed. A single cold `[vitest-pool-runner]: Timeout waiting for worker to respond` on the `dom` project is infrastructure, not a test failure — the two warming runs exist to avoid it. Treat a second consecutive timeout as real.

- [x] **Step 2: Formatting of the files this contract changed**

Run: `npx prettier --check src/app/warCouncil src/app/run src/app/screenFor.ts src/app/debugState.ts src/App.tsx`
Expected: exits 0. Do NOT run `npm run format` — it rewrites the whole repo including the design documents.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 27: Update the PR description ✓

- Skill: none — documentation, no code is written

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- A link to `plan.md` and `mockup.html` in this folder.
- A summary organised by acceptance criterion, saying for each what changed and where.
- **Every decision the developer must make**, copied from the File map's *Developer decides or observes* block — the two new panel tunables, the three remaining durations, the three font-size bounds, the lethal marking's treatment, the four-outcome copy, and whether the dead rows need capping.
- **What only playing can settle**, with the exact interaction to try: play one trick where the Quarry leads, dismiss the resolution panel with Apply or Roll over, and confirm Apply Buff is reachable before the Quarry's card lands. That is the AC1b reading the whole plan rests on.
- Verification results from Phase 8, quoting the Vitest summary line and the build's exit code.
- A one-line note for future contributors on the new convention: `resolutionOutcome.ts` is the single source of the four-outcome vocabulary, read by both the trick well and the resolution panel, and neither surface may word an outcome itself.

---

## Self-review

**Spec coverage:**
- AC1 (dismissal cannot advance; arming window survives) — Tasks 2, 3; the well's own buttons in Task 4.
- AC2 (skull and the four outcomes) — Tasks 1, 4 (the felt, per the developer's red-line), 9, 12.
- AC3 (armed-and-did-not-fire, with reasons) — Tasks 8, 9, 12.
- AC4 (tooltip never overlaps the breakdown) — Tasks 14, 15.
- AC5 (inverted type hierarchy) — Task 11.
- AC6 (lethal pot marked) — Tasks 7, 9, 12.
- AC7 (trump visible) — Tasks 9, 12.
- AC8 (suit filter) — Tasks 16, 17, 18.
- AC9 (review cards before the fight) — Tasks 21, 22.
- AC10 (tier on the machine) — Tasks 19, 20.
- AC11 (slower transition; not full-viewport) — Tasks 5, 10, 13; the remaining three durations routed to the developer in the File map.
- AC12 (Fox exchange cancellable) — Task 23.
- In-scope file splits — Tasks 6 (`roundUiState.ts`), 10 (`warCouncilResolve.css`), 12 (`TrickResolutionScreen.tsx`), 22 (`App.tsx`).

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact diff, or a runnable command with `Run:` / `Expected:`. Every unchosen value is named in the File map's *Developer decides or observes* block rather than invented in a step.

**Type / name consistency:** `ResolutionView`'s four new fields — `skulledInTrick`, `decree`, `deadBuffs`, `potIsLethal` — are spelled identically in Tasks 6, 9 and 12 and in `plan.md` → Data shapes. `trickOutcomeKindFor` / `TrickOutcomeKind` / `TRICK_OUTCOME_WORD` / `TRICK_OUTCOME_WHY` are spelled identically in Tasks 1, 4 and 12. `potIsLethal` names both the module's function and the view's field, deliberately, so the derivation and the carried value cannot drift. `deadBuffsFor` / `deadBuffReasonText` are spelled identically in Tasks 8, 9 and 12. `BuffGalleryFilter` / `ALL_FILTERS` / `matchesFilter` / `runCountsFor` in Tasks 16 and 18. `reelTiers` in Tasks 19 and 20. `RunPhase.PreFight` / `'preFight'` in Tasks 21 and 22. `BreakdownTopContext` / `useBreakdownTop` in Tasks 14 and 15. New CSS classes `.wc-carry-btn`, `.wc-well-outcome`, `.wc-resolve-outcome`, `.wc-suit-chip`, `.shop-reel-tier`, `.wc-prompt-cancel` each appear in exactly one TSX task and its paired CSS step.

**Phase boundary cleanliness:**
- **Phase 1** ends type-checking: the new outcome module has exactly one consumer (`TrickWell`), both deleted behaviours are removed together with their specs, and the dwell value change touches no code.
- **Phase 2** ends type-checking because Task 6 widens the interface and all three untyped spec fixtures in one task, and Task 9 fills the fields at the producer in the same phase — the panel carries the new fields without reading them yet, which compiles cleanly.
- **Phase 3** ends type-checking: the panel's content, its stylesheet split and its overlay structure are three independent edits to one component tree, each verified before the next.
- **Phase 4** ends type-checking with the context defaulting to `null`, so the tooltip's behaviour is unchanged until the panel publishes a value — no half-applied state exists at the boundary.
- **Phase 5** ends type-checking: the pure filter module and the chip row are both complete before `BuffGallery` composes them, and the deleted local `matchesTier` helper has no other caller.
- **Phase 6** ends type-checking because Task 21 changes both places that declare the screen set in one task, and Task 22 lifts three branches out of `App.tsx` in the same task that adds the fourth, so the file never sits over budget between tasks.
- **Phase 7** ends type-checking: one component, one stylesheet, one spec, and the reducer action it dispatches already existed.
- **Phase 8** writes no production code at all.
