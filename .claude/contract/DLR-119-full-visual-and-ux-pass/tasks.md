# Tasks: DLR-119 — Full visual and UX pass across the redesigned surfaces

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-24

> **Gate note.** `plan.md` was **not developer-confirmed** — the plan approval gate was auto-approved per the 2026-08-23 sprint run's standing override and no `AskUserQuestion` was presented. `mockup.html` was generated and **went unseen**; it was not published as an Artifact and nobody has looked at it. Every default taken is recorded in `plan.md` Part 1 → Assumptions made.

**Goal:** Fix what is statically provable about the Hunt screen's reachability — a control cropped off the edge, rows pushed out of a shell that clips rather than scrolls — and narrate the two things the engine now does that the screen never mentions: a buff firing (with the Overlap Bonus named) and a queued Apply Damage payout landing or being destroyed.

**Spec:** `plan.md` in this folder. Layout reference: `mockup.html` in this folder (UNSEEN).

---

## File map

**Created:**
- `src/app/warCouncil/payoutLabels.ts` — the queued-payout risk hint and the settled/destroyed sentence
- `src/app/warCouncil/__tests__/payoutLabels.test.ts` — its spec
- `src/app/warCouncil/buffFiredLabels.ts` — fired-buff names, the Overlap Bonus phrase, and the composed sentence
- `src/app/warCouncil/__tests__/buffFiredLabels.test.ts` — its spec
- `.claude/contract/DLR-119-full-visual-and-ux-pass/pr-description.md` — written in Final verification

**Modified:**
- `src/app/warCouncil/warCouncilActionBar.css:10-20` — `.wc-bar` wraps
- `src/app/warCouncil/warCouncil.css:66-85,94-105` — the `--wc-dossier-narrow-max` token; explicit `minmax(0, 1fr)` on the shell's felt row
- `src/app/warCouncil/warCouncilHunt.css:327-348` — the narrow block's row minimums and the dossier's bound
- `src/app/warCouncil/warCouncilHand.css:38-46` — the fan's rotation reserve expressed off `--wc-card-w`
- `src/hunt/applyDamagePayout.ts` — `PayoutOutcome`, `TrickPayoutEvent`
- `src/hunt/index.ts` — re-export both
- `src/app/warCouncil/commitHandlers.ts:90-149,174-227` — `FoldedResolution.payout`, its derivation, and threading onto both fold sites
- `src/app/warCouncil/roundUiState.ts:46-51` — `ResolvedTrick.payout`
- `src/app/warCouncil/quarryAdvance.ts:35-80` — `deriveResolvedTrick` returns `payout: null`
- `src/app/warCouncil/actionBarLabels.ts:44-49` — `queuedPayoutText` names the risk
- `src/app/warCouncil/TrickWell.tsx:13-97` — the two new clauses and the `offeredBuffs` prop
- `src/app/warCouncil/WarCouncilRound.tsx:266-311` — passes `offeredBuffs` to both `TrickWell` branches
- `src/app/warCouncil/labels.ts:132-146` — `healthBarValueText` leads with `Lethal.`
- `src/app/warCouncil/__tests__/buffRoundState.test.ts:64` — the `ResolvedTrick` base literal gains `payout`
- `src/app/warCouncil/__tests__/roundHint.test.ts:55` — same
- `src/app/warCouncil/__tests__/roundReducer.test.ts:120` — same
- `src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts:30` — same
- `src/app/warCouncil/__tests__/TrickWell.test.tsx:17` — same, plus the new clause assertions
- `src/app/warCouncil/__tests__/actionBarLabels.test.ts` — the risk-hint assertion
- `src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts` — the payout-event regression assertions
- `src/warCouncil/__tests__/labels.test.ts` — the `healthBarValueText` order assertions *(confirm the real path with `Get-ChildItem src -Recurse -Filter labels.test.ts` before editing — `healthBarValueText` lives in `src/app/warCouncil/labels.ts`)*

**Deleted:** (none)

**Developer decides or observes:**
- `warCouncil.css` → `--wc-dossier-narrow-max` — ships at the documented placeholder `30dvh`. Too low and the dossier scrolls on a phone; too high and the hand/action rows can still be crowded. **Only a browser at 390×844 settles it.**
- Whether `.wc-bar` wrapping to two rows on a phone — roughly 50-60px of extra `actions` row — is an acceptable price for reachability.
- Whether a scrolling dossier at the narrow breakpoint reads acceptably.
- All new copy, every string of it, exactly as it now reads: `Your queued 12 lands.` · `The hit destroyed your queued 12.` · `Damage to you destroys it.` · `Bell-Taker (Momentum): +2 multiplier.` · `Overlap Bonus +2 Momentum.` — note the last two say the reward axis twice (once inside `buffName`'s parentheses, once in `buffRewardPhrase`), which is `buffLine`'s existing grammar rather than a new one; whether to break from it is yours.
- Whether naming the Overlap Bonus on the felt explains it or just adds a fourth number to a readout that already has three.
- Whether `healthBarValueText` should be **shortened** as well as re-ordered — untouched here and still open.
- **DLR-117 AC1** — hiding the always-visible per-card win/lose readout until a buff is active. A visual judgement, deliberately not implemented.
- Every unseen tuning value carried from earlier tickets: `--wc-hp-shield-fill`, `--wc-hp-shield-ticking-opacity`, `--wc-hp-shield-gap`, `--wc-hp-doomed-opacity`, the card-damage strip's smallest clamp (~9.3px), `vault.css`'s nine `--wc-*` properties and every `clamp()` and hue, `shopSlot.css`'s properties, `errorBoundary.css`'s static palette. **None was touched.**
- The three carried layout risks, seen in a real browser at **1280×800 / 1024×768 / 1366×768 / 390×844** — the arithmetic in this contract bounds them; it does not replace looking.

---

## Phase 1 — Layout reachability

Four stylesheet edits, no TypeScript. The phase boundary is safe because CSS changes cannot break `tsc` and every rule added is either a structural guarantee (`flex-wrap`, `minmax(0, …)`) or a documented placeholder token. This is the priority-1 work: a control cropped out of an `overflow: hidden` shell is unreachable, which outranks everything else in this contract.

### Task 1: Let the action bar wrap instead of clipping its last control ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/warCouncilActionBar.css:8-20`

- [x] **Step 1: Add `flex-wrap: wrap` to `.wc-bar` with the arithmetic that motivates it**

Replace the `/* ---------- the bar: the shell's fourth grid row ---------- */` comment and the `.wc-bar` rule with:

```css
/* ---------- the bar: the shell's fourth grid row ---------- */

/* DLR-119 — `flex-wrap: wrap`, and it is a REACHABILITY fix rather than a cosmetic one.
   Each of the four items floors at `.wc-bar-btn`'s own `min-width: clamp(5.5rem, 14vmin, 8.5rem)`
   — 88px below a 629px vmin — and a flex item's default `min-width: auto` stops it shrinking past
   that. Four of them plus three `clamp(0.5rem, 2vmin, 1.25rem)` gaps (8px each at that size) plus
   2 x 9.6rem-clamped padding needs 395.2px. `.wc-shell` is `overflow: hidden`, so at a 390px
   viewport Apply Damage was clipped away entirely — not scrolled off, GONE, with no way to reach
   it by pointer or by scroll. Wrapping is a structural guarantee at any width and introduces no
   new size number; shrinking the button floor would have been inventing a tuning value. The cost
   is roughly 50-60px of extra `actions` row on a phone, which is the developer's to judge. */
.wc-bar {
  grid-area: actions;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: stretch;
  justify-content: center;
  gap: clamp(0.5rem, 2vmin, 1.25rem);
  padding: clamp(0.4rem, 1.4vmin, 0.9rem) clamp(0.6rem, 2vmin, 1.5rem);
  background: var(--wc-chamber-lift);
  border-top: 1px solid #232c33;
}
```

- [x] **Step 2: Confirm the rule parses and the file is formatted**

Run: `npx prettier --check src\app\warCouncil\warCouncilActionBar.css`
Expected: exits 0, reports the file as formatted. If it reports a difference, run `npx prettier --write src\app\warCouncil\warCouncilActionBar.css` and re-check.

### Task 2: Bound the narrow-breakpoint dossier so the control rows cannot be pushed out ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/warCouncil.css:66-85` (the `:root` token) and `:94-105` (the shell's row list)
- Modify: `src/app/warCouncil/warCouncilHunt.css:327-348`
- Config: none — `--wc-dossier-narrow-max` is a CSS custom property, not a configuration file key, but **its value is a developer decision** and ships as a documented placeholder.

- [x] **Step 1: Declare the placeholder token in `warCouncil.css`'s `:root`**

Insert immediately after the `--wc-decree-swap-ms: 220ms;` line and before the closing `}` of `:root`:

```css
  /* DLR-119 — the ceiling on `.wc-dossier` at the narrow/short breakpoint, where it collapses
     from a column into a wrapping ROW of four unbounded panels and becomes the one term that can
     push the `hand` and `actions` rows out of a shell that clips rather than scrolls. NOBODY HAS
     CHOSEN THIS NUMBER: it is a PLACEHOLDER sized to keep the dossier under a third of a phone
     screen so status + dossier + hand + actions cannot crowd the felt to zero. The developer owns
     it, and only a browser at 390x844 settles it. UNIT: dynamic viewport height. */
  --wc-dossier-narrow-max: 30dvh;
```

- [x] **Step 2: Make the shell's felt row's zero-minimum explicit**

In the same file, in the `.wc-shell` rule, replace:

```css
  grid-template-rows: auto 1fr auto auto;
```

with:

```css
  /* DLR-119 — `minmax(0, 1fr)`, not bare `1fr`. A `1fr` track's automatic minimum is its content's
     min-content size; `.wc-table` currently carries `min-height: 0` (warCouncilTable.css) which
     suppresses that, but the guarantee then depends on a rule in a different file. Stating it on
     the track means the felt yields first — which is what must happen, because this shell is
     `overflow: hidden` and whatever does not fit is clipped from the BOTTOM, i.e. from the rows
     holding every control. */
  grid-template-rows: auto minmax(0, 1fr) auto auto;
```

- [x] **Step 3: Bound the dossier inside `warCouncilHunt.css`'s existing narrow block**

In `warCouncilHunt.css`, inside `@media (max-width: 44rem), (max-height: 34rem)`, replace the `.wc-shell` rule's `grid-template-rows` line:

```css
    grid-template-rows: auto auto 1fr auto auto;
```

with:

```css
    grid-template-rows: auto auto minmax(0, 1fr) auto auto;
```

and replace the `.wc-dossier` rule in that same block:

```css
  .wc-dossier {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
  }
```

with:

```css
  /* DLR-119 — bounded, and given its own scroll. At this breakpoint the dossier stops being a
     narrow column and becomes a wrapping ROW of four panels (dossier card, shape readout, bank
     meter, telegraph) with no ceiling on how tall it wraps. `.wc-shell` clips rather than scrolls
     and its felt row is `minmax(0, 1fr)`, so the felt collapses to zero first and every further
     pixel pushes the `hand` and `actions` rows off the bottom edge — the rows that hold every
     control the player has. This is `game-ux`'s stated exception ("if some region genuinely must
     scroll, scope the overflow to that region and say why"), and `.wc-table-inner` below already
     carries an identical one for the same shell. `--wc-dossier-narrow-max` is a PLACEHOLDER and
     its value is the developer's; see its declaration in `warCouncil.css`. */
  .wc-dossier {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    max-height: var(--wc-dossier-narrow-max);
    overflow-y: auto;
  }
```

- [x] **Step 4: Confirm the token is spelled identically in both files**

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include *.css | Select-String -Pattern "wc-dossier-narrow-max"`
Expected: exactly **3** hits — the declaration in `warCouncil.css`, a prose mention of the token name inside `warCouncilHunt.css`'s new doc comment (which Step 3's own code block supplies verbatim), and the `var()` read in `warCouncilHunt.css`. A misspelling would compile, lint and pass every test while silently falling back to no ceiling. *(Planner defect, corrected after the fact: this line originally said 2 and did not count the comment's own prose mention. The implementer reported the mismatch rather than reconciling it silently — the right call.)*

- [x] **Step 5: Confirm formatting and the 400-line budget on both files**

Run: `npx prettier --check src\app\warCouncil\warCouncil.css src\app\warCouncil\warCouncilHunt.css; (Get-Content src\app\warCouncil\warCouncil.css).Count; (Get-Content src\app\warCouncil\warCouncilHunt.css).Count`
Expected: prettier exits 0; both counts are under 400. `warCouncilHunt.css` starts at 384, so it has 16 lines of headroom — if the new comment breaches it, shorten the comment rather than splitting the file.

### Task 3: Scale the fan's rotation reserve off the card width it reserves for ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/warCouncilHand.css:38-46`

- [x] **Step 1: Replace the fixed reserve with the derived multiple**

Replace the comment and `.wc-fan` rule:

```css
/* Rotation and lift push pixels outside the layout box, and the shell clips
   overflow — so reserve the room explicitly rather than letting cards crop. */
.wc-fan {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(var(--wc-card-w) * 1.5 + 2.1rem);
  padding: 1.3rem 0 0.6rem;
}
```

with:

```css
/* Rotation and lift push pixels outside the layout box, and the shell clips
   overflow — so reserve the room explicitly rather than letting cards crop.

   DLR-119 — the top reserve is now a MULTIPLE OF `--wc-card-w` rather than a fixed `1.3rem`,
   because everything it reserves for scales with the card and the reserve did not. The figure is
   DERIVED from constants already in this codebase, not chosen:

     armed lift        0.20 x cardHeight, and cardHeight is 1.5 x --wc-card-w   -> 0.300w
     armed scale(1.05) 0.025 x cardHeight                                       -> 0.038w
     max fan rotation  sin(5.25deg) / 2, at FAN_ROTATION_STEP_DEG 2.1 and a
                       6-card hand's max |spread| of 2.5 (`fanLayout.ts`)        -> 0.046w
                                                                        total    = 0.384w

   Rounded up to 0.4. At `--wc-card-w`'s lower clamp bound (2.9rem = 46.4px) that is 18.6px
   against the old fixed 20.8px, so the hand row gets 2.2px BACK — a small repayment on the
   7-12px DLR-117 spent. At the upper bound (4.3rem = 68.8px) it is 27.5px against the same
   20.8px, which is where the old fixed value was CLIPPING the top of an armed card. `min-height`
   is left alone: it is a floor the real content already exceeds, so it constrains nothing. */
.wc-fan {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(var(--wc-card-w) * 1.5 + 2.1rem);
  padding: calc(var(--wc-card-w) * 0.4) 0 0.6rem;
}
```

- [x] **Step 2: Confirm formatting**

Run: `npx prettier --check src\app\warCouncil\warCouncilHand.css`
Expected: exits 0.

---

## Phase 2 — The queued payout, reported

The engine already decides whether a queued Apply Damage payout landed or was destroyed; it just discards the answer. This phase captures it where it is made, threads it to the felt, and adds the copy — with no change to damage, health, the queue, or any state transition. The phase boundary is safe once every `ResolvedTrick` construction site carries the new required field, which is what makes `npm run typecheck` the honest gate for it.

### Task 4: Declare the payout outcome beside the payout it describes ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/applyDamagePayout.ts`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/applyDamagePayout.test.ts`

- [x] **Step 1: Add the two exports to `applyDamagePayout.ts`, immediately after the `PendingApplyPayout` interface**

```ts
/**
 * DLR-119 — which of the two things a trick resolution did to a queued payout. Declared here
 * because it names `PendingApplyPayout`'s two terminal fates and nothing else.
 *
 * REPORTING ONLY. Nothing branches on this value: it exists so the felt can narrate an outcome
 * the engine already decided, and DLR-119 is a presentation-only ticket. After the fold, "paid"
 * and "destroyed" are indistinguishable — both leave `pendingApplyPayout: null` — which is
 * exactly why the distinction has to be captured at the point it is made rather than re-derived
 * from two encounter snapshots.
 */
export const PayoutOutcome = {
  /** The delay ran out, or the hand ended, and the frozen `cashOut` was dealt to the Quarry. */
  Paid: 'paid',
  /** Damage to the player wiped it before it could land — DLR-109's resolution order, step 1
   *  nulls the payout before step 4 would pay it. The bomb wins, by design. */
  Destroyed: 'destroyed',
} as const
export type PayoutOutcome = (typeof PayoutOutcome)[keyof typeof PayoutOutcome]

/** What one trick resolution did to a queued payout. `null` wherever nothing was queued. */
export interface TrickPayoutEvent {
  readonly outcome: PayoutOutcome
  /** The payout's own frozen `cashOut`, captured BEFORE the field was nulled — it is not
   *  recoverable afterwards. UNIT: damage. */
  readonly cashOut: number
}
```

- [x] **Step 2: Re-export both from `src/hunt/index.ts`**

Find the existing export line that carries `PendingApplyPayout` and add `PayoutOutcome` (a value, so it belongs on the value-export line) and `TrickPayoutEvent` (a type) alongside it, following whichever export style that file already uses. Do not introduce a second export statement for the same module.

- [x] **Step 3: Assert the shape is what the module says it is**

Append to `src/hunt/__tests__/applyDamagePayout.test.ts`:

```ts
describe('PayoutOutcome', () => {
  it('has exactly two members, so a third fate cannot be added without a compile error here', () => {
    expect(Object.values(PayoutOutcome)).toEqual(['paid', 'destroyed'])
  })
})
```

Add `PayoutOutcome` to that file's existing import from `../applyDamagePayout`.

- [x] **Step 4: Run the scoped spec and the fast gate**

Run: `npx vitest run src/hunt/__tests__/applyDamagePayout.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

### Task 5: Capture the outcome in the fold and thread it onto the resolved trick ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/commitHandlers.ts:90-149,174-227`
- Modify: `src/app/warCouncil/roundUiState.ts:46-51`
- Modify: `src/app/warCouncil/quarryAdvance.ts:35-80`
- Test: `src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts`
- Test: `src/app/warCouncil/__tests__/buffRoundState.test.ts:64`
- Test: `src/app/warCouncil/__tests__/roundHint.test.ts:55`
- Test: `src/app/warCouncil/__tests__/roundReducer.test.ts:120`
- Test: `src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts:30`
- Test: `src/app/warCouncil/__tests__/TrickWell.test.tsx:17`

- [x] **Step 1: Add the field to `FoldedResolution` and derive it in `applyResolution`**

In `commitHandlers.ts`, add to `FoldedResolution`:

```ts
  /** DLR-119 — what this fold did to a queued payout, for the felt to narrate. `null` when
   *  nothing was queued. REQUIRED, not optional: an omitted field narrates nothing, silently. */
  readonly payout: TrickPayoutEvent | null
```

Import `PayoutOutcome` and `type TrickPayoutEvent` from `'../../hunt'` alongside the existing imports from that module.

Then rewrite `applyResolution`'s body, keeping its signature and its four-step order unchanged:

```ts
  if (isEncounterResolved(encounter)) return { encounter, unplayedAtPress: null, payout: null }
  const queued = encounter.pendingApplyPayout
  const incoming = incomingFrom(resolution)
  const paid =
    incoming[DuelSide.Player] === 0 && incoming[DuelSide.Quarry] === 0
      ? encounter
      : applyDamage(encounter, incoming)
  // DLR-109 resolution order, step 1: `applyDamage` nulls a queued payout when the player lost
  // health or the encounter ended. Comparing the field across that call is the ONLY place the
  // difference between "destroyed" and "not yet due" is visible — afterwards both read `null`.
  const destroyed: TrickPayoutEvent | null =
    queued !== null && paid.pendingApplyPayout === null
      ? { outcome: PayoutOutcome.Destroyed, cashOut: queued.cashOut }
      : null
  const cleared = hasPendingTimebomb(paid)
    ? { ...paid, pendingTimebomb: NO_PENDING_TIMEBOMB }
    : paid
  const booked =
    resolution.timebombTarget === null ? cleared : queueTimebomb(cleared, resolution.timebombTarget)
  return settleApplyPayout(booked, handEnding, destroyed)
```

- [x] **Step 2: Report `Paid` from `settleApplyPayout`**

Change its signature to `(encounter: EncounterState, handEnding: boolean, destroyed: TrickPayoutEvent | null): FoldedResolution` and add `payout` to all three of its returns: the two `tick.due === null` returns take `payout: destroyed`, and the final return takes `payout: { outcome: PayoutOutcome.Paid, cashOut: tick.due.cashOut }`.

- [x] **Step 3: Add the field to `ResolvedTrick` and default it in `deriveResolvedTrick`**

In `roundUiState.ts`, add to the `ResolvedTrick` interface:

```ts
  /** DLR-119 — what the fold that produced this trick's damage did to a queued Apply Damage
   *  payout. `null` on every trick that neither settled nor destroyed one. Set by `commit`, which
   *  is where the fold happens; `deriveResolvedTrick` runs BEFORE the fold and always writes
   *  `null`. */
  readonly payout: TrickPayoutEvent | null
```

Import `type TrickPayoutEvent` from `'../../hunt'` in that file. In `quarryAdvance.ts`'s `deriveResolvedTrick`, add `payout: null` to the object it returns.

- [x] **Step 4: Thread the fold's answer onto the trick at both of `commit`'s fold sites**

In `commit`, in the `settled` object literal, replace `resolvedTrick,` with:

```ts
    resolvedTrick:
      resolvedTrick !== null && folded !== null
        ? { ...resolvedTrick, payout: folded.payout }
        : resolvedTrick,
```

and in the final return, replace `resolvedTrick: advanced.resolvedTrick,` with:

```ts
    resolvedTrick:
      advanced.resolvedTrick !== null && quarryFolded !== null
        ? { ...advanced.resolvedTrick, payout: quarryFolded.payout }
        : advanced.resolvedTrick,
```

- [x] **Step 5: Fix the five `ResolvedTrick` construction sites the audit found**

Add `payout: null,` to each of these base literals — they are the five places an object of this shape is built, all of them in specs, and every one will fail `tsc` until it is:

- `src/app/warCouncil/__tests__/buffRoundState.test.ts:64`
- `src/app/warCouncil/__tests__/roundHint.test.ts:55`
- `src/app/warCouncil/__tests__/roundReducer.test.ts:120`
- `src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts:30`
- `src/app/warCouncil/__tests__/TrickWell.test.tsx:17`

- [x] **Step 6: Pin both outcomes, and pin that nothing else moved**

Add to `src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts` three cases, built from the fixtures already in that file:

1. A trick that settles a due payout reports `resolvedTrick.payout` equal to `{ outcome: 'paid', cashOut: <the frozen figure> }`, and the Quarry's health falls by that same figure.
2. A trick that damages the player while a payout is queued reports `{ outcome: 'destroyed', cashOut: <the frozen figure> }`, and the Quarry's health is **unchanged**.
3. A trick with nothing queued reports `payout: null`.

Then add the regression case that guards AC3:

```ts
it('reports the payout outcome without changing a single figure the fold already produced', () => {
  // Same seed, same trick, before and after DLR-119: `encounter.health` on both sides,
  // `pendingApplyPayout`, `pendingTimebomb` and `unplayedAtPress` must all be byte-identical to
  // the values this file already asserts. `payout` is REPORTING — nothing branches on it.
})
```

Implement that case by asserting the existing expected values in the same file against the post-change result, so a behaviour change would fail here rather than passing quietly.

- [x] **Step 7: Run the scoped specs and the fast gate**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts src/app/warCouncil/__tests__/roundReducer.test.ts src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts src/app/warCouncil/__tests__/buffRoundState.test.ts src/app/warCouncil/__tests__/roundHint.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

### Task 6: The payout's copy — the risk while queued, the outcome when it settles ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/payoutLabels.ts`
- Test: `src/app/warCouncil/__tests__/payoutLabels.test.ts`
- Modify: `src/app/warCouncil/actionBarLabels.ts:44-49`
- Test: `src/app/warCouncil/__tests__/actionBarLabels.test.ts`

- [x] **Step 1: Write the failing spec**

Create `src/app/warCouncil/__tests__/payoutLabels.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { PayoutOutcome } from '../../../hunt'
import { PAYOUT_QUEUE_RISK_HINT, payoutEventText } from '../payoutLabels'

describe('payoutEventText', () => {
  it('says nothing when no payout settled or died on this trick', () => {
    expect(payoutEventText(null)).toBeNull()
  })

  it('names the figure that landed', () => {
    expect(payoutEventText({ outcome: PayoutOutcome.Paid, cashOut: 12 })).toBe(
      'Your queued 12 lands.',
    )
  })

  it('names the figure the hit destroyed', () => {
    expect(payoutEventText({ outcome: PayoutOutcome.Destroyed, cashOut: 12 })).toBe(
      'The hit destroyed your queued 12.',
    )
  })

  it('states the risk in one sentence, for the queued note on the bar', () => {
    expect(PAYOUT_QUEUE_RISK_HINT).toBe('Damage to you destroys it.')
  })
})
```

- [x] **Step 2: Run it and watch it fail for the right reason**

Run: `npx vitest run src/app/warCouncil/__tests__/payoutLabels.test.ts`
Expected: fails to resolve `../payoutLabels` — the module does not exist yet. A different failure means the spec is wrong.

- [x] **Step 3: Write the module**

Create `src/app/warCouncil/payoutLabels.ts`:

```ts
/**
 * DLR-119 — the felt's copy for a queued Apply Damage payout: the risk it carries while it is in
 * the air, and what happened to it when a trick settled it. PLACEHOLDER copy, as every string on
 * this screen is; the wording is the developer's.
 *
 * A total function over `PayoutOutcome` — a third fate added to that union is a compile error
 * here rather than an `undefined` sentence on the felt, the same discipline
 * `APPLY_DAMAGE_REFUSAL_MESSAGE` already uses.
 */
import { PayoutOutcome, type TrickPayoutEvent } from '../../hunt'

/** Appended to the queued-payout note on the action bar. DLR-109's rule, stated at the one moment
 *  it can still change what the player does. */
export const PAYOUT_QUEUE_RISK_HINT = 'Damage to you destroys it.'

const PAYOUT_OUTCOME_TEXT: Readonly<Record<PayoutOutcome, (cashOut: number) => string>> = {
  [PayoutOutcome.Paid]: (cashOut) => `Your queued ${cashOut} lands.`,
  [PayoutOutcome.Destroyed]: (cashOut) => `The hit destroyed your queued ${cashOut}.`,
}

/** The one sentence a resolved trick adds about the payout queue. `null` when this trick neither
 *  settled nor destroyed one, so the felt renders no element at all rather than an empty line. */
export function payoutEventText(event: TrickPayoutEvent | null): string | null {
  if (event === null) return null
  return PAYOUT_OUTCOME_TEXT[event.outcome](event.cashOut)
}
```

- [x] **Step 4: Run the spec green**

Run: `npx vitest run src/app/warCouncil/__tests__/payoutLabels.test.ts`
Expected: 4 passed, 0 failed.

- [x] **Step 5: Name the risk in the queued sentence on the bar**

In `actionBarLabels.ts`, import `PAYOUT_QUEUE_RISK_HINT` from `'./payoutLabels'` and change `queuedPayoutText`'s return to append it:

```ts
/** `Payout queued: 12 damage, 2 tricks to go. Damage to you destroys it.` — AC5's indicator, plus
 *  DLR-119's risk clause: the queue's whole hazard is that a hit wipes it, and saying so only
 *  after it has happened is too late to change a decision. `null` when nothing is queued. */
export function queuedPayoutText(pending: PendingApplyPayout | null): string | null {
  if (pending === null) return null
  const tricks = pending.resolutionsOwed === 1 ? 'trick' : 'tricks'
  return `Payout queued: ${pending.cashOut} damage, ${pending.resolutionsOwed} ${tricks} to go. ${PAYOUT_QUEUE_RISK_HINT}`
}
```

- [x] **Step 6: Update the existing assertions on that sentence**

In `src/app/warCouncil/__tests__/actionBarLabels.test.ts`, extend every assertion on `queuedPayoutText` (and on `applyDamageBarAccessibleName`, which composes it) to expect the trailing ` Damage to you destroys it.` clause.

- [x] **Step 7: Run the scoped specs and the fast gate**

Run: `npx vitest run src/app/warCouncil/__tests__/payoutLabels.test.ts src/app/warCouncil/__tests__/actionBarLabels.test.ts src/app/warCouncil/__tests__/ActionBar.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0. `ActionBar.test.tsx` is included because it renders the queued note.

---

## Phase 3 — Nothing announces a buff firing

DLR-125 made buffs pay on all four axes and the player sees a bigger number with no cause named. This phase names the cause on the beat where the player is already reading what the trick did, using the modules that already own each figure. The boundary is safe because the new module is pure and the render is additive — no existing clause moves.

### Task 7: Turn a trick's fired buffs into a sentence ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/buffFiredLabels.ts`
- Test: `src/app/warCouncil/__tests__/buffFiredLabels.test.ts`

- [x] **Step 1: Write the failing spec**

Create `src/app/warCouncil/__tests__/buffFiredLabels.test.ts`. Build `Buff` fixtures the same way `src/app/warCouncil/__tests__/buffRoundState.test.ts` already does — reuse that file's construction idiom rather than inventing a second one. Assert:

```ts
describe('overlapBonusText', () => {
  it('says nothing below two fired buffs, because the bonus is zero there', () => {
    expect(overlapBonusText(0)).toBeNull()
    expect(overlapBonusText(1)).toBeNull()
  })

  it('names the bonus and its figure, taken from overlapBonusFor', () => {
    expect(overlapBonusText(3)).toBe('Overlap Bonus +2 Momentum.')
  })
})

describe('firedBuffNames', () => {
  it('resolves ids against the offered pile, in fired order', () => { /* … */ })

  it('drops an id with no match rather than rendering undefined into a sentence', () => { /* … */ })
})

describe('buffFiredText', () => {
  it('says nothing when nothing fired', () => { /* expects null */ })

  it('names one fired buff and its reward', () => { /* … */ })

  it('names several, and the Overlap Bonus after them', () => { /* … */ })
})
```

- [x] **Step 2: Run it and watch it fail for the right reason**

Run: `npx vitest run src/app/warCouncil/__tests__/buffFiredLabels.test.ts`
Expected: fails to resolve `../buffFiredLabels`.

- [x] **Step 3: Write the module**

Create `src/app/warCouncil/buffFiredLabels.ts`:

```ts
/**
 * DLR-119 — what fired, and what the overlap paid. DLR-125 gave `buffAccrual` a caller, so
 * activated buffs genuinely pay on all four axes now — but nothing on screen names the cause, and
 * the Overlap Bonus (`+(k-1)` Momentum, `hybrid-design.md` §5 R5) fires on real play for the first
 * time and is the least intuitive figure in the stacking rule.
 *
 * Composes only: `buffName` and `buffRewardPhrase` for a card's name and reward (`buffLabels.ts`),
 * and `overlapBonusFor` for the bonus (`src/hunt/buffAccrual.ts`). `k - 1` is NEVER re-derived
 * here — R5's own argument against a quadratic basis lives in that function and this module must
 * not acquire a second reading of it.
 *
 * PLACEHOLDER copy, as every string on this screen is.
 */
import { overlapBonusFor, type Buff, type BuffId } from '../../hunt'
import { buffName, buffRewardPhrase } from './buffLabels'

/** The display names of the buffs that fired, in `firedBuffIds` order, each resolved against the
 *  offered pile. An id with no match is DROPPED — a sentence containing `undefined` is worse than
 *  a shorter sentence, and `firedOncePerHandIds` in `buffRoundState.ts` already treats an
 *  unresolvable id the same way. */
export function firedBuffNames(
  firedBuffIds: readonly BuffId[],
  offered: readonly Buff[],
): readonly string[] {
  return firedBuffIds.flatMap((id) => {
    const buff = offered.find((candidate) => candidate.id === id)
    return buff === undefined ? [] : [buffName(buff)]
  })
}

/** `Overlap Bonus +2 Momentum.` — `null` below two fired buffs, where `overlapBonusFor` is 0. */
export function overlapBonusText(firedCount: number): string | null {
  const bonus = overlapBonusFor(firedCount)
  return bonus > 0 ? `Overlap Bonus +${bonus} Momentum.` : null
}

/** The clause a resolved trick adds when buffs fired on it. `null` when none did — the felt then
 *  renders no element rather than an empty line. */
export function buffFiredText(
  firedBuffIds: readonly BuffId[],
  offered: readonly Buff[],
): string | null {
  const fired = firedBuffIds.flatMap((id) => {
    const buff = offered.find((candidate) => candidate.id === id)
    return buff === undefined ? [] : [buff]
  })
  if (fired.length === 0) return null
  const named = fired.map((buff) => `${buffName(buff)}: ${buffRewardPhrase(buff)}`).join(' ')
  const overlap = overlapBonusText(fired.length)
  const head = `${named}${named.endsWith('.') ? '' : '.'}`
  return overlap === null ? head : `${head} ${overlap}`
}
```

Read `buffRewardPhrase`'s actual return shape in `buffLabels.ts` before finalising the join and the trailing-stop handling, and adjust the spec's expected strings to whatever that function really produces — the spec's exact strings are this task's to settle, not a value to invent.

- [x] **Step 4: Run the spec green and confirm the boundary**

Run: `npx vitest run src/app/warCouncil/__tests__/buffFiredLabels.test.ts; npm run typecheck; npm run lint`
Expected: Vitest 0 failed; both gates exit 0. `lint` is included here because this module imports from `src/hunt/` and the pure-core `no-restricted-imports` override is what proves the direction is legal.

### Task 8: Render both new clauses on the resolved trick ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/TrickWell.tsx:13-97`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:266-311`
- Modify: `src/app/warCouncil/warCouncilTable.css` — two new classes beside `.wc-table-line`
- Test: `src/app/warCouncil/__tests__/TrickWell.test.tsx`

- [x] **Step 1: Add the `offeredBuffs` prop and render the two clauses**

In `TrickWell.tsx`, add to `TrickWellProps`:

```ts
  /** DLR-119 — the pile this trick's `firedBuffIds` are resolved against. Defaults to `[]`, the
   *  same defaulting `skulledCards` and `primedCards` already carry, so a caller that predates
   *  this keeps compiling and simply narrates nothing. */
  readonly offeredBuffs?: readonly Buff[]
```

Destructure it as `offeredBuffs = []`. Inside the `if (resolvedTrick)` branch, after the existing `<p className="wc-table-line">…</p>` and before the carry-on button, render:

```tsx
        {buffFiredText(resolvedTrick.resolution.firedBuffIds, offeredBuffs) !== null && (
          <p className="wc-buff-fired">
            {buffFiredText(resolvedTrick.resolution.firedBuffIds, offeredBuffs)}
          </p>
        )}
        {payoutEventText(resolvedTrick.payout) !== null && (
          <p
            className={`wc-payout-line${resolvedTrick.payout?.outcome === PayoutOutcome.Destroyed ? ' wc-is-destroyed' : ''}`}
          >
            {payoutEventText(resolvedTrick.payout)}
          </p>
        )}
```

Hoist each `…Text(…)` call into a `const` above the `return` rather than calling it twice, so the render reads as two values and not four calls. Both sit inside `.wc-table`, which already carries `aria-live="polite"`, so neither needs its own live region — do not add one.

- [x] **Step 2: Pass the pile from `WarCouncilRound`**

In `WarCouncilRound.tsx`, add `offeredBuffs={offered}` to **both** `<TrickWell …/>` call sites (the `ui.resolvedTrick` branch and the fall-through branch). `offered` is already computed on line 152; do not compute it a second time.

- [x] **Step 3: Style the two clauses, reusing existing tokens only**

Append to `src/app/warCouncil/warCouncilTable.css`, after the `.wc-table-line` rule:

```css
/* DLR-119 — the two clauses that name what the engine just did: which buffs fired (with the
   Overlap Bonus after them) and what became of a queued Apply Damage payout. Quieter than
   `.wc-table-line`, which still owns the trick's own outcome. No new token is invented — every
   colour here is one of `warCouncil.css`'s existing `:root` values, and both sizes copy
   `.wc-table-hint`'s own clamp. A destroyed payout takes the alarm colour AND a distinct
   sentence, so the reading never depends on colour alone. */
.wc-buff-fired,
.wc-payout-line {
  margin: 0.25rem 0 0;
  font-family: var(--wc-sans);
  font-size: clamp(0.62rem, 1.35vmin, 0.78rem);
  line-height: 1.35;
}

.wc-buff-fired {
  color: var(--wc-brass);
}

.wc-payout-line {
  color: var(--wc-chalk-dim);
}

.wc-payout-line.wc-is-destroyed {
  color: var(--wc-alarm);
}
```

Confirm `.wc-table-hint`'s real `font-size` in that file first and copy it verbatim rather than the value written above if it differs — no new size bound may be introduced.

- [x] **Step 4: Cover both clauses in the component spec**

Add to `src/app/warCouncil/__tests__/TrickWell.test.tsx`, querying by accessible text (never by class):

1. A resolved trick with a non-empty `firedBuffIds` and a matching `offeredBuffs` renders the fired-buff sentence.
2. The same trick with `offeredBuffs={[]}` renders **no** fired-buff sentence — an unresolvable id narrates nothing.
3. `payout: { outcome: 'paid', cashOut: 12 }` renders `Your queued 12 lands.`
4. `payout: { outcome: 'destroyed', cashOut: 12 }` renders `The hit destroyed your queued 12.`
5. `payout: null` and empty `firedBuffIds` render neither element — assert absence with `queryBy…` returning `null`, so an empty `<p>` would fail.

- [x] **Step 5: Run the scoped specs and both static gates**

Run: `npx vitest run src/app/warCouncil/__tests__/TrickWell.test.tsx; npm run typecheck; npm run lint`
Expected: Vitest 0 failed; both gates exit 0.

- [x] **Step 6: Confirm the two files that changed are still inside the 400-line budget**

Run: `(Get-Content src\app\warCouncil\TrickWell.tsx).Count; (Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count; (Get-Content src\app\warCouncil\warCouncilTable.css).Count`
Expected: all three under 400. `WarCouncilRound.tsx` starts at 392 and this task adds only two attributes, so it must not gain a line; `warCouncilTable.css` must be measured because the new block is ~20 lines. If either breaches, split the file **in this ticket** rather than reporting it.

---

## Phase 4 — The worst spoken string

One function, re-ordered. It is priority 3 and it is here last deliberately: if the ceiling is reached, this is the task to have lost. The boundary is safe because the change is one return statement and its assertions.

### Task 9: `healthBarValueText` leads with the fatal fact ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/labels.ts:132-146`
- Test: the spec that asserts `healthBarValueText` — locate it with `Get-ChildItem src -Recurse -Include *.test.ts,*.test.tsx | Select-String -Pattern "healthBarValueText" -List`

- [x] **Step 1: Move `Lethal.` to the front of the sentence**

Replace the last two lines of `healthBarValueText`:

```ts
  const body = `${standing}${shielded}${atRisk}${ticking}`
  return view.lethal ? `${body} Lethal.` : body
```

with:

```ts
  const body = `${standing}${shielded}${atRisk}${ticking}`
  // DLR-119 — `Lethal.` LEADS. The worst case on the record was
  // `10 of 10. 2 shielded, 1 of them ticking. 6 at risk. 4 ticking. Lethal.` — five clauses, with
  // the one fact that changes what the player does next arriving last. Nothing is dropped: every
  // clause is load-bearing state and the four descriptive ones keep their outermost-to-innermost
  // order. The defect was ordering, not length. Whether the sentence should also be SHORTENED is
  // a copy judgement and remains the developer's.
  return view.lethal ? `Lethal. ${body}` : body
```

And extend the docblock's DLR-115 paragraph with one sentence recording the re-order and its reason.

- [x] **Step 2: Update every assertion on the lethal form**

In the spec located above, change each expected lethal string from `'… Lethal.'` to `'Lethal. …'`. Every non-lethal assertion is byte-identical and must not change — if one does, the edit was wrong.

- [x] **Step 3: Run the scoped specs and the fast gate**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts src/app/warCouncil/__tests__/DuelHealthBars.test.tsx; npm run typecheck`
Expected: Vitest 0 failed; `typecheck` exits 0. If either path does not exist, substitute the paths Step 1's `Get-ChildItem` located and re-run.

---

## Phase 5 — Final verification

No production changes. Confirms the boundaries this contract relies on, that no throw was weakened, that no tunable was hard-coded, and that the cumulative work is clean.

### Task 10: Confirm the pure-core boundary still holds ✓

- Skill: none — verification only, no code written.

**Files:**
- (none — read-only greps)

- [x] **Step 1: Grep for React and DOM references inside the pure trees**

Run: `Get-ChildItem src\hunt,src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. `src/hunt/applyDamagePayout.ts` gained two exports in this contract and must not have gained an import from outside its own tree.

### Task 11: Confirm no throw was weakened and no tunable was hard-coded ✓

- Skill: none — verification only, no code written.

**Files:**
- (none — read-only greps)

- [x] **Step 1: Count the throw sites and compare against the pre-contract figure**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "throw new" | Measure-Object | Select-Object -ExpandProperty Count`
Expected: **102**, unchanged from the base commit. *(Corrected after QA measured it: this line originally said 98, taken from DLR-131's log entry. QA checked out `c760f78` in a temporary detached worktree and measured **102** there, and confirmed `git diff c760f78 -- src` contains zero added or removed `throw new` lines. **The 98 was a stale planning record, not a regression** — DLR-131's figure excluded spec files or predated later additions. The real invariant this step tests is "the diff adds and removes no throw", which holds.)* This contract adds no throw and weakens none, so any other number must be accounted for before the gates are called green.

- [x] **Step 2: Confirm the one new custom property is read, not duplicated, and no literal escaped it**

Run: `Get-ChildItem src -Recurse -Include *.css | Select-String -Pattern "wc-dossier-narrow-max|30dvh"`
Expected: exactly 3 hits — the declaration line in `warCouncil.css` (which contains both the name and the value), and the single `var()` read in `warCouncilHunt.css`. A fourth hit means the value was pasted somewhere instead of read.

- [x] **Step 3: Confirm the retired vocabulary did not come back**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "Envenom|envenom|poison" | Select-String -NotMatch "CardRank.Poison|Poison:|\[CardRank"`
Expected: zero hits outside `CardRank.Poison` (rank 8), which is the one sanctioned survivor (`6ba6224`).

### Task 12: Static gates and full suite ✓

- Skill: none — verification only, no code written.

**Files:**
- (none)

- [x] **Step 1: Formatting, scoped to this contract's own files**

Run: `npx prettier --check src\app\warCouncil\warCouncilActionBar.css src\app\warCouncil\warCouncil.css src\app\warCouncil\warCouncilHunt.css src\app\warCouncil\warCouncilHand.css src\app\warCouncil\warCouncilTable.css src\app\warCouncil\payoutLabels.ts src\app\warCouncil\buffFiredLabels.ts src\app\warCouncil\actionBarLabels.ts src\app\warCouncil\commitHandlers.ts src\app\warCouncil\roundUiState.ts src\app\warCouncil\quarryAdvance.ts src\app\warCouncil\TrickWell.tsx src\app\warCouncil\WarCouncilRound.tsx src\app\warCouncil\labels.ts src\hunt\applyDamagePayout.ts src\hunt\index.ts`
Expected: exits 0. Fix with `npx prettier --write` on the same explicit list. **Never `npm run format`** — it rewrites ~58 pre-existing `.md` files (`ae9ee28`).

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed, against a pre-contract baseline of **1789 passed of 1789 across 138 files**. A cold-cache `[vitest-pool-runner]: Timeout waiting for worker to respond` on the first run is infrastructure, not a failure — warm with `npx vitest run --project node; npx vitest run --project dom` and re-run.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 13: Write the PR description and the handover list ✓

- Skill: none — a written hand-off, no code.

**Files:**
- Create: `.claude/contract/DLR-119-full-visual-and-ux-pass/pr-description.md`

- [x] **Step 1: Write `pr-description.md`**

Include, in this order:

1. Link to `plan.md` in this folder, and the note that `mockup.html` **went unseen**.
2. What changed, in one paragraph per phase.
3. **The layout arithmetic in full** — the 395.2px-against-390px action-bar figure, the 1024×768 row budget (roughly 75 + 155 + 119 of 768), and the `0.384w` fan-reserve derivation — stated as **arithmetic, not observation**, and explicitly not a substitute for the browser pass.
4. **Where each of the three carried layout risks now stands.** Risk 1: `.wc-shell` cannot scroll (`overflow: hidden`) — the risk was mis-stated and the real one is cropping, now bounded by Tasks 1 and 2 but not proven absent. Risk 2: the `actions` row is present in `warCouncilHunt.css`'s narrow override and confirmed by reading, still never rendered. Risk 3: closed by arithmetic at both `--wc-card-w` clamp bounds.
5. **The `ErrorBoundary` finding, recorded so it is not re-investigated:** `.error-fallback` is `display: grid; place-items: center` with a single implicit `auto` row in a container of definite `100dvh` height. `align-content` defaults to `normal`, which stretches an `auto` track to fill the free space, so the row is the full padded viewport height; `.error-fallback__panel`'s `max-height: 100%` therefore resolves against that definite track and caps the panel, and its `overflow-y: auto` scrolls it. **Both controls stay reachable** — the `body { overflow: hidden }` failure mode does not occur. This is a static reading of grid track sizing, and the palette's legibility under light and dark system settings is still unseen.
6. Every developer decision and every unchosen value, copied from the File map's "Developer decides or observes".
7. **The single prioritised list of what still needs a human's eyes**, ordered so the developer's own pass starts at the top rather than hunting.
8. Verification results with real numbers from Task 12.

---

## Self-review

**Spec coverage:**
- L1 (action bar overflows and crops a control) — Task 1.
- L2 (narrow stack pushes control rows out) — Task 2.
- L3 (fan reserve does not scale) — Task 3.
- L4 (record which risks are closed, with the arithmetic) — Task 13.
- N1 (nothing announces a buff firing; the Overlap Bonus unnamed) — Tasks 7, 8.
- N2 (payout silently landed or destroyed) — Tasks 4, 5, 6, 8.
- N3 (queued sentence does not name the risk) — Task 6.
- C1 (`healthBarValueText` buries `Lethal.`) — Task 9.
- AC1 (review the five surfaces against `game-ux`) — Tasks 1-3 and 8 for the action bar, health bar and card preview; Task 13 item 5 and the shop/Vault review prose for the other two.
- AC2 (log judgement calls for the developer) — the File map's "Developer decides or observes", and Task 13 items 6-7.
- AC3 (no functional behavior change) — Task 5 Step 6's regression case, and Task 11's throw count.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step carries either an exact code block or a `Run:` / `Expected:` pair. Task 7 Step 1 and Task 8 Step 4 describe assertions rather than pasting full fixtures because both must be built from a construction idiom that already exists in a named sibling spec — each names the file to copy it from and the exact behaviours to assert.

**Type / name consistency:** `PayoutOutcome`, `TrickPayoutEvent`, `FoldedResolution.payout`, `ResolvedTrick.payout`, `payoutEventText`, `PAYOUT_QUEUE_RISK_HINT`, `firedBuffNames`, `overlapBonusText`, `buffFiredText`, `--wc-dossier-narrow-max`, `.wc-buff-fired`, `.wc-payout-line`, `.wc-is-destroyed` — each is spelled identically in `plan.md` Part 2 → Data shapes and in every task that references it. `overlapBonusFor` and `buffName`/`buffRewardPhrase` are existing exports, called and never redefined.

**Phase boundary cleanliness:**
- Phase 1 ends with four stylesheet edits and no TypeScript touched — `tsc` is unaffected and the codebase is consistent.
- Phase 2 ends with `FoldedResolution` and `ResolvedTrick` widened and all five construction sites plus both fold sites updated in the same phase, so `npm run typecheck` passes at the boundary rather than one file at a time.
- Phase 3 ends with the new module, its render, its styles and its spec all present; `TrickWell`'s new prop is optional-with-a-default so no other caller breaks.
- Phase 4 ends with one re-ordered return and its assertions updated together.
- Phase 5 writes no production code at all.
