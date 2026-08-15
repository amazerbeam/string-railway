# Tasks: The bank counts tricks, not card values — a cash-out of `n × n`

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-14

**Goal:** Change what the bank counts — 1 per trick taken instead of both cards' printed ranks — so a streak of _n_ cashes `n × n` (1, 4, 9, 16, 25, 36), and drop the Quarry's encounter health to 10 to match the new scale.

**Spec:** `plan.md` in this folder. Layout and copy reference: `mockup.html` in this folder (approved 2026-08-14).

---

## File map

**Created:** (none — no new files)

**Modified:**

- `src/warCouncil/bank.ts:56-109` — `resolveTrickBank` banks 1 per trick; `trickCards` parameter and the `TrickCard` import removed; two doc comments restated
- `src/warCouncil/playCard.ts:105-111` — the single call site drops its `completedTrick` argument
- `src/warCouncil/__tests__/bank.test.ts` — every rank-derived assertion becomes a trick-count assertion
- `src/app/warCouncil/__tests__/roundReducer.test.ts:110-113` — a hand-built `TrickResolution` the new rule can no longer produce
- `src/hunt/config.ts:14-27` — `QUARRY_ENCOUNTER_HEALTH` `[400]` → `[10]`, and its justification comment rewritten
- `src/app/warCouncil/__tests__/roundReducer.bank.test.ts:44-63` — a 40-damage cash-out now empties a 10-health Quarry
- `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx:295-317` — same `bank: 20, multiplier: 2` fixture and the same 40-damage expectation, on the hand's final trick
- `src/app/warCouncil/labels.ts:92-101` — `BANK_LABEL` → `TRICKS_LABEL`, `MULTIPLIER_LABEL`'s value, and the four outcome messages
- `src/app/warCouncil/BankMeter.tsx:1-54` — the imported label constant and the `aria-label` template
- `src/app/warCouncil/__tests__/BankMeter.test.tsx` — the `aria-label` queries and an impossible `cashOut` fixture

**Deleted:** (none)

**Developer decides or observes:**

- `src/hunt/config.ts` → `QUARRY_ENCOUNTER_HEALTH` — **planned as `[10]`, the developer's stated number.** At 10 the encounter is a walkover (random play wins 63.8%, ordinary play 73.3%, 1.9 hands, 36.6% of damage discarded as overkill). The consequence table for 15 / 20 / 25 / 30 is in `plan.md` → Risks. A different number is a one-line edit to this task.
- **The copy** — `TRICKS_LABEL`, `MULTIPLIER_LABEL`, and the four `TRICK_OUTCOME_MESSAGE` strings are the planner's placeholder wording, shown in context in `mockup.html`'s "Copy to red-line" table. `labels.ts` already marks this copy as the developer's.
- **Whether `n × n` feels better than the rank sum.** The measured claim is that the payout becomes predictable; the risk is that predictable reads as flat. Judge by calling the next cash-out before it fires — if you are right most of the time and it feels dull rather than readable, the rank jitter was load-bearing after all.
- **Whether the `bank` engine field should be renamed** (to `streakTricks` or similar) now that it holds a trick count. Deliberately not done here — see `plan.md` → Risks.

---

## Phase 1 — The engine: the bank counts tricks

The whole rule change, and the only phase that alters behaviour. The signature change and its single call site move together in Task 1 because splitting them would leave the phase not type-checking. The phase ends with the new rule enforced and its own spec green, but with the Quarry still at 400 — the game is internally consistent and merely slow, which is a safe place to stop.

### Task 1: `resolveTrickBank` banks 1 per trick, and loses its `trickCards` parameter ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/bank.ts:56-109`
- Modify: `src/warCouncil/playCard.ts:105-111`
- Test: `src/warCouncil/__tests__/bank.test.ts`

- [x] **Step 1: Rewrite `bank.test.ts`'s rank-derived assertions to the trick-count rule, so they fail first**

The existing spec builds tricks from `leadRank`/`followRank` and asserts their sums. Replace the five affected assertions. `trickFor` and its rank arguments are no longer passed to `resolveTrickBank`, so the helper's remaining job is documentation of the scenario, not input — delete it and its uses.

Replace the `AC4` case (currently `expect(r.bankAdded).toBe(20)` / `expect(r.bank).toBe(20)`):

```ts
it('a clean win banks one trick and climbs the multiplier', () => {
  const r = resolveTrickBank({ bank: 0, multiplier: 0 }, true, false, false)
  expect(r.outcome).toBe(TrickOutcome.CleanWin)
  expect(r.bankAdded).toBe(1)
  expect(r.bank).toBe(1)
  expect(r.multiplier).toBe(1)
  expect(r.cashOut).toBe(0)
  expect(r.damageToPlayer).toBe(0)
})
```

Replace the `AC6` cash-out case (currently `expect(r.cashOut).toBe(129)`):

```ts
it('a clean loss cashes bank × multiplier and resets both', () => {
  const r = resolveTrickBank({ bank: 3, multiplier: 3 }, false, false, false)
  expect(r.outcome).toBe(TrickOutcome.CleanLoss)
  expect(r.cashOut).toBe(9)
  expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
  expect(r.bank).toBe(0)
  expect(r.multiplier).toBe(0)
  expect(r.bankAdded).toBe(0)
})
```

Update the two end-of-hand cases (currently `expect(r.cashOut).toBe(44)`) to build from `{ bank: 2, multiplier: 2 }` and expect `4`. Update the dodge/clean-win equality pair and the streak-reset case to the four-argument call. Then add the table this ticket exists to produce:

```ts
it('pays n × n across a whole unbroken streak — 1, 4, 9, 16, 25, 36', () => {
  const payouts: number[] = []
  let state = { bank: 0, multiplier: 0 }
  for (let n = 1; n <= 6; n++) {
    const taken = resolveTrickBank(state, true, false, false)
    state = { bank: taken.bank, multiplier: taken.multiplier }
    payouts.push(resolveTrickBank(state, false, false, false).cashOut)
  }
  expect(payouts).toEqual([1, 4, 9, 16, 25, 36])
})
```

- [x] **Step 2: Run the spec and confirm it fails for the right reason**

Run: `npx vitest run src/warCouncil/__tests__/bank.test.ts --project node`
Expected: exits non-zero. Failures are assertion mismatches (received 20, expected 1) and TypeScript arity errors on the four-argument calls — **not** "Failed to load" or "Transform failed", which would mean a broken import rather than a red test.

- [x] **Step 3: Change the taken branch to bank one trick**

In `src/warCouncil/bank.ts`, replace the `isTaken` branch body:

```ts
  if (isTaken(outcome)) {
    // PT-002 — the bank counts TRICKS, not card values. Both terms climb by exactly 1 per trick
    // taken, so a streak of n cashes n × n: 1, 4, 9, 16, 25, 36 across a six-trick hand.
    // Not a config key: 1 is what counting a trick means, and a later item that grants bonus
    // bank adds to `bank` rather than redefining a trick's worth.
    bankAdded = 1
    bank += bankAdded
    multiplier += 1
  } else {
```

Leave the `else` branch, the `finalTrick` fold, and the returned object exactly as they are.

- [x] **Step 4: Remove the now-unused parameter and its import**

In the same file, delete the `trickCards` parameter from `resolveTrickBank`'s signature and delete the now-unused import on line 2:

```ts
// DELETE this line — TrickCard has no other use in this module
import { type TrickCard } from './types'

// Signature becomes four parameters
export function resolveTrickBank(
  before: BankState,
  playerWon: boolean,
  skullTrick: boolean,
  finalTrick: boolean,
): TrickResolution {
```

- [x] **Step 5: Restate the two doc comments whose stated meaning has changed**

`TrickResolution.bankAdded` and the `BankState.bank` description both describe ranks. In `bank.ts`:

```ts
  /** Tricks added to the bank by this trick — 1 on a take, 0 on a hit. */
  readonly bankAdded: number
```

And on `resolveTrickBank`'s JSDoc, replace the phrase "Pure arithmetic over two integer ranks" with "Pure arithmetic over two integer counters" — the rest of that paragraph (no division, no epsilon, no producible `NaN`) stays true and stays as it is.

- [x] **Step 6: Drop the argument at the single call site**

In `src/warCouncil/playCard.ts`, remove `completedTrick` from the call. `completedTrick` is still used on the lines above for `resolveTrickWinner` and `trickIsSkulled`, so it stays declared:

```ts
  const lastResolution = resolveTrickBank(
    { bank: next.bank, multiplier: next.multiplier },
    winner === PlayerSide.Player,
    trickIsSkulled(next.skulledCards, completedTrick),
    finalTrick,
  )
```

- [x] **Step 7: Confirm the spec is green and the project type-checks**

Run: `npx vitest run src/warCouncil/__tests__/bank.test.ts --project node; npm run typecheck`
Expected: Vitest reports `Tests  N passed` with 0 failed; `npm run typecheck` exits 0 with no errors.

### Task 2: Correct the hand-built resolution fixture the new rule cannot produce ✓

- Skill: `react-frontend`

**Files:**

- Test: `src/app/warCouncil/__tests__/roundReducer.test.ts:104-115`

- [x] **Step 1: Bring the `heldReveal` fixture inside what the engine can now emit**

`bankAdded: 11` and `bank: 11` came from a rank sum (7 + 4). A single taken trick now banks 1, so this fixture describes a state `resolveTrickBank` can never return. The test asserts reducer carry-on behaviour and does not depend on the magnitude, so only the two numbers change:

```ts
      resolution: {
        outcome: TrickOutcome.CleanWin,
        bankAdded: 1,
        cashOut: 0,
        damageToPlayer: 0,
        bank: 1,
        multiplier: 1,
        cashedAtHandEnd: false,
      },
```

- [x] **Step 2: Run the reducer spec**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts --project dom`
Expected: exits 0, `Tests  N passed`, 0 failed.

Note: this spec file is `.test.ts`, which only matches the `node` Vitest project's include glob (`src/**/__tests__/**/*.test.ts` in `vite.config.ts`) — `--project dom` reports "No test files found". Ran `--project node` instead, which is what actually collects it: 19 tests passed, 0 failed.

---

## Phase 2 — The Quarry's health matches the new scale

A hand now pays a mean of ~7 rather than ~84, so 400 health would be roughly 55 hands. This phase moves the value and fixes the two specs that assumed a cash-out could never empty the bar. It is a safe stopping point because the engine rule from Phase 1 is already complete and green — this phase only changes a number and the tests that read consequences from it.

### Task 3: Drop `QUARRY_ENCOUNTER_HEALTH` to 10 and fix the two specs that a 10-health bar now resolves ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/config.ts:14-27`
- Test: `src/app/warCouncil/__tests__/roundReducer.bank.test.ts:44-63`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx:300-320`

- [x] **Step 1: Set the value and rewrite the comment that justified 400**

The existing comment derives 400 from a 136-damage hand measured under the rank-sum bank, which no longer applies — replace the whole comment block, do not merely re-number it:

```ts
// The Quarry's health for encounter 0.
// SET BY THE DEVELOPER 2026-08-14 (PT-002): "the first enemy at 10 hp", chosen alongside the move
// to a trick-counting bank. Replaces 400, which was measured under the retired rank-sum bank where
// a hand dealt ~84; under `n × n` a hand pays a mean of ~7.2 (range 0-36, over 6,000 simulated
// hands — see `.docs/design/Balatro-Forbidden-Solitaire/ideas.md`), so 400 would be ~55 hands.
// KNOWN CONSEQUENCE, accepted: at 10 the encounter lasts ~1.9 hands, random legal play wins 63.8%,
// and ~37% of damage dealt is discarded as overkill because a single good hand can pay 36. The
// developer's own framing is that the shop will raise the player's damage later; the health numbers
// are expected to move after playing.
// UNIT: health points, encounter 0.
export const QUARRY_ENCOUNTER_HEALTH: readonly Health[] = [10]
```

- [x] **Step 2: Confirm the value change compiles and the config spec still passes**

Run: `npx vitest run src/hunt/__tests__/config.test.ts --project node; npm run typecheck`
Expected: both exit 0. `config.test.ts` asserts the array's length and the `RangeError` on a bad index, never the value, so it needs no edit — if it fails here, that assumption was wrong and the failure names the line to fix.

- [x] **Step 3: Rebuild the cash-out assertion in `roundReducer.bank.test.ts` around a bar that survives it**

The spec sets `bank: 20, multiplier: 2` and expects `quarryHealthForEncounter(0) - 40`. Against a 10-health Quarry that cash-out empties the bar and resolves the encounter, so the subtraction underflows the assertion's intent. Rebuild the fixture at the new scale and assert the surviving health directly:

```ts
      bank: 2,
      multiplier: 2,
```

and replace the two health expectations with:

```ts
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanLoss)
    expect(ui.resolvedTrick?.resolution.cashOut).toBe(4)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0) - 4)
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - DAMAGE_PER_HIT)
```

- [x] **Step 4: Apply the same correction in `WarCouncilRound.test.tsx`**

That spec (line 297) sets the same `bank: 20, multiplier: 2` alongside `tricksPlayed: HAND_SIZE - 1`, so the trick it drives is the hand's last and asserts `quarryHealthForEncounter(0) - 40` at line 316. Change the fixture to `bank: 2, multiplier: 2` and the expectation to `quarryHealthForEncounter(0) - 4`, leaving `tricksPlayed`, the two hands, and the `PLAYER_START_HEALTH - DAMAGE_PER_HIT` line exactly as they are. The end-of-hand fold still contributes nothing: the loss zeroes both terms first, so the final `0 × 0` adds 0 and the total stays the single cash-out.

- [x] **Step 5: Run both affected specs**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.bank.test.ts src/app/warCouncil/__tests__/WarCouncilRound.test.tsx --project dom`
Expected: exits 0, `Tests  N passed`, 0 failed.

**⚠️ Same routing defect Phase 1 found.** `vite.config.ts` scopes the `dom` project's `include` to `*.test.tsx` only; `node` handles `*.test.ts`. `--project dom` silently skips `roundReducer.bank.test.ts` (a `.test.ts` file). Ran the corrected commands instead: `npx vitest run src/app/warCouncil/__tests__/roundReducer.bank.test.ts --project node` (1 file, 4 tests passed) and `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx --project dom` (1 file, 18 tests passed) — both genuinely executed.

**Also found and fixed, same file, outside this step's line range:** `WarCouncilRound.test.tsx`'s `'renders the shape readout for the dealt hand, and the bank readout climbs on a taken trick (DLR-80 Task 20)'` test (lines 319-346, untouched by either Phase 1's or Phase 2's file map) asserted `cashes for 11` from a `9 + 2 = 11 banked` comment — a rank-sum figure left over from before Phase 1's engine change, and it failed on the first Step 5 run for a reason unrelated to this task's health-config edit. Corrected the assertion to `cashes for 1` (one clean-win trick under the trick-counting rule: bank 1 × multiplier 1) and rewrote the comment. This is a Phase 1 file-map gap, not a Phase 2 defect — flagged in the Implementer Report as a planner follow-up.

---

## Phase 3 — The readout says what it now shows

Copy and one identifier rename, no behaviour. The `.wc-bank-*` class names and the component's three spans are deliberately untouched, so the layout cannot move. This is the last phase that changes source.

### Task 4: Rename the left-term label constant and rewrite the four outcome messages ✓

- Skill: `game-ux`

**Files:**

- Modify: `src/app/warCouncil/labels.ts:92-101`
- Modify: `src/app/warCouncil/BankMeter.tsx:1-54`
- Test: `src/app/warCouncil/__tests__/BankMeter.test.tsx`

- [x] **Step 1: Change the two label constants**

In `src/app/warCouncil/labels.ts`, replace the `BANK_LABEL` export. The identifier is renamed with its value so the constant does not describe something it no longer holds:

```ts
export const TRICKS_LABEL = 'Tricks'
export const MULTIPLIER_LABEL = 'Multiplier'
```

- [x] **Step 2: Rewrite the four outcome messages so none of them names a banked card**

Same file. "Both cards banked" is false once cards are not what is banked. Wording per `mockup.html`'s "Copy to red-line" table; the existing `/** … Placeholder copy: the wording is the developer's. */` comment above this map stays:

```ts
export const TRICK_OUTCOME_MESSAGE: Readonly<Record<TrickOutcome, string>> = {
  [TrickOutcome.CleanWin]: 'Clean trick, taken. The streak climbs.',
  [TrickOutcome.Dodge]: 'Skull dodged. The streak climbs.',
  [TrickOutcome.CleanLoss]: 'Clean trick lost. 1 damage — the streak cashes.',
  [TrickOutcome.SkullWin]: 'You ate the skull. 1 damage — the streak cashes.',
}
```

- [x] **Step 3: Point `BankMeter` at the renamed constant**

In `src/app/warCouncil/BankMeter.tsx`, update the import and the two places `BANK_LABEL` is read — the eyebrow and the `aria-label`. Layout per `mockup.html`'s readout panel: three spans, the `× ` between them, unchanged:

```ts
import { TRICKS_LABEL, MULTIPLIER_LABEL, TRICK_OUTCOME_MESSAGE } from './labels'
```

```tsx
      <p
        className="wc-bank-figures"
        aria-label={`${TRICKS_LABEL} ${bank}, ${MULTIPLIER_LABEL} ${multiplier}, cashes for ${cash}`}
      >
```

and the eyebrow's `{BANK_LABEL}` becomes `{TRICKS_LABEL}`. Leave every `className` exactly as it is — the `.wc-bank-*` names are string-bound to `warCouncilHunt.css` and are deliberately not renamed.

- [x] **Step 4: Update the component spec's queries and its impossible fixture**

`BankMeter.test.tsx` queries by `aria-label` text and holds a `cashOut: 40` fixture, which exceeds the new maximum cash-out of 36. Change the fixture to `cashOut: 9` and rebuild the three queries around the new scale:

```tsx
  it('shows the tricks, the multiplier, and what the streak would cash for', () => {
    render(<BankMeter bank={3} multiplier={3} lastResolution={null} />)
    expect(screen.getByLabelText(/tricks 3, multiplier 3, cashes for 9/i)).toBeTruthy()
  })

  it('says what the last trick did', () => {
    render(<BankMeter bank={0} multiplier={0} lastResolution={cleanLoss} />)
    expect(screen.getByText(/the streak cashes/i)).toBeTruthy()
  })
```

Leave the third case (`reads zero at the start of a hand`) asserting `/cashes for 0/i`, which is still correct.

- [x] **Step 5: Run the component spec and type-check**

Run: `npx vitest run src/app/warCouncil/__tests__/BankMeter.test.tsx --project dom; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed.

Ran exactly as specified: `--project dom` reported `Test Files 1 passed (1)`, `Tests 3 passed (3)` — the `.tsx` routing assumption held (no "No test files found"). `npm run typecheck` exited 0 with no errors.

**Additional required check for this phase (string-bound rename):** grepped `src/` recursively for `BankMeter`, `Both cards banked`, `the bank cashes`, and the outcome-message wording. Two other spec files touch this surface: `WarCouncilRound.test.tsx` (renders the full round screen, so it renders `BankMeter` transitively) and `roundReducer.bank.test.ts` (a pure reducer test — its one "streak climbs" hit is a code comment, not an assertion, and it imports neither `BankMeter` nor `labels.ts`). Ran `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx --project dom`: `Test Files 1 passed (1)`, `Tests 18 passed (18)`. No edits were needed — its two bank-readout assertions (`getByLabelText(/cashes for 0/i)`, `getByLabelText(/cashes for 1\b/i)`) match only the numeric copy and are indifferent to the `Bank` → `Tricks` label-word change. No stale wording found anywhere else in `src/`.

---

## Phase 4 — Final verification

No production changes. Sanity-checks that the cumulative work is clean and that no stale name or hard-coded figure survived.

### Task 5: Confirm the pure-core boundary still holds ✓

- Skill: `react-frontend`

- [x] **Step 1: Grep the engine trees for React and DOM references**

Run: `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. `-Recurse` is required — `Select-String -Path` with a `**` glob reaches only one directory level and would silently miss `__tests__/`.

Ran as specified. Zero hits — the boundary holds.

### Task 6: Confirm no stale name or retired figure survives ✓

- Skill: `react-frontend`

- [x] **Step 1: Confirm `BANK_LABEL` is gone**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "BANK_LABEL"`
Expected: zero hits.

Ran as specified. Zero hits.

- [x] **Step 2: Confirm no card rank is summed into the bank any more**

Run: `Get-ChildItem src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "card\.rank \+"`
Expected: zero hits.

Ran as specified. Zero hits.

- [x] **Step 3: Confirm the retired copy is gone**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "Both cards banked"`
Expected: zero hits.

Ran as specified. Zero hits.

- [x] **Step 4: Confirm the Quarry's health is the new value**

Run: `Select-String -Path src\hunt\config.ts -Pattern "QUARRY_ENCOUNTER_HEALTH: readonly Health\[\] = \[10\]"`
Expected: exactly one hit. Do **not** grep the whole tree for a bare `400` to prove the old value is gone — eleven files legitimately mention the "400-line budget" in comments, so that pattern returns false positives and the check would fail on clean code.

Ran as specified. Exactly one hit: `src\hunt\config.ts:24:export const QUARRY_ENCOUNTER_HEALTH: readonly Health[] = [10]`. Re-confirmed after Task 7 Step 2's Prettier `--write` on this file — the line survived intact.

- [x] **Step 5: Confirm the `.wc-bank-*` class names were left intact on both sides**

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include *.tsx,*.css | Select-String -Pattern "wc-bank-figures"`
Expected: at least one hit in `BankMeter.tsx` and at least one in `warCouncilHunt.css`. A hit in only one of the two means the component and the stylesheet have drifted apart.

Ran as specified. One hit in each: `BankMeter.tsx:42` and `warCouncilHunt.css:207`.

### Task 7: Static gates, full suite, and the production build ✓

- Skill: `react-frontend`

- [x] **Step 1: Warm the Vitest transform cache, then run the gates and the unfiltered suite** — **DELEGATED TO QA, and run by QA.** Not run by the Implementer per the contract's scope split (the unfiltered suite belongs to QA alone). QA result: `--project node` 26 files / 379 tests passed; `--project dom` 12 files / 67 tests passed; `npm run typecheck` exit 0; `npm run lint` exit 0; `npm test` **38 files / 446 tests passed, 0 failed** — no cold-cache timeout, single clean run.

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all exit 0; Vitest reports 0 failed. The two scoped runs come first deliberately — a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is jsdom start-up starving the pool, not a failing test. Treat only a **second consecutive** timeout as a real problem.

- [x] **Step 2: Confirm formatting of the files this contract changed**

Run: `npx prettier --check src/warCouncil/bank.ts src/warCouncil/playCard.ts src/hunt/config.ts src/app/warCouncil/labels.ts src/app/warCouncil/BankMeter.tsx`
Expected: exits 0, "All matched files use Prettier code style!". Scoped deliberately — the repo-wide `npm run format:check` fails on pre-existing `.docs/**` files this contract did not touch.

Extended to the five test files this contract also changed, per this step's instruction. First run (all ten files) reported `[warn] src/hunt/config.ts` as the only failure — a pre-existing formatting issue in the file unrelated to this contract's own edited lines (multi-key-per-line object literals in the inactive `SKULL_WEIGHTS_*` maps, well outside the `:14-27` range this contract touched). Ran `npx prettier --write src/hunt/config.ts` on that file only, then re-checked all ten files: exit 0, "All matched files use Prettier code style!". Re-confirmed Task 6 Step 4's health-value line and `npm run typecheck` both still hold after the reformat.

- [x] **Step 3: Production build** — **DELEGATED TO QA, and run by QA.** Not run by the Implementer per the contract's scope split (the production build belongs to QA alone). QA result: `npm run build` exit 0 — lint clean → `tsc -b` clean → `vite build` in 440ms, `dist/index.html` + `dist/assets/index-*.css` (17.20 kB) + `dist/assets/index-*.js` (221.10 kB), no bundler errors.

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

- [x] **Step 4: Confirm no file grew past the 400-line budget**

Run: `(Get-Content src\warCouncil\bank.ts).Count; (Get-Content src\app\warCouncil\BankMeter.tsx).Count; (Get-Content src\hunt\config.ts).Count`
Expected: each under 400. Use `(Get-Content <path>).Count`, never `Measure-Object -Line` — the latter drops blank lines and undercounts.

Extended to every other file this contract changed, per this step's instruction. All under 400: `bank.ts` 126, `BankMeter.tsx` 61, `config.ts` 181, `playCard.ts` 126, `labels.ts` 133, `bank.test.ts` 118, `roundReducer.test.ts` 308, `roundReducer.bank.test.ts` 161, `WarCouncilRound.test.tsx` 353, `BankMeter.test.tsx` 34.

### Task 8: Update the PR description ✓

- Skill: `none — a hand-off document, not code`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Written to `.claude/contract/PT-002-trick-count-bank/pr-description.md`. Includes:

- Link to `plan.md` and `mockup.html` in this folder.
- Summary: the bank counts tricks rather than card values, so a streak of _n_ cashes `n × n`; the Quarry's encounter health drops 400 → 10 to match.
- Every decision the developer must make and every behaviour they must judge by playing — the four bullets under "Developer decides or observes" in the File map above, carried across verbatim.
- Verification results from Phase 4, quoting the actual Vitest summary line rather than asserting success.
- A one-line note for future contributors: the `bank` field now holds a **trick count**, not a rank sum, and `bank` and `multiplier` are deliberately kept as two independent fields so a later "+1 ×" item can move one without the other.

---

## Self-review

(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)

**Spec coverage:**

- `resolveTrickBank` banks 1 per trick, cash-out becomes `n × n` — Task 1 (Steps 1, 3), with the 1/4/9/16/25/36 table asserted directly in Step 1.
- `trickCards` parameter and `TrickCard` import removed, call site updated — Task 1 (Steps 4, 6).
- `QUARRY_ENCOUNTER_HEALTH` `[400]` → `[10]` — Task 3 (Step 1).
- Readout keeps its `× ` form and two separate terms; left label changes — Task 4 (Steps 1, 3), layout explicitly unchanged.
- The four `TRICK_OUTCOME_MESSAGE` strings stop saying "Both cards banked" — Task 4 (Step 2), verified gone in Task 6 (Step 3).
- Every test encoding a rank-derived figure or an impossible resolution — Tasks 1 (Step 1), 2, 3 (Steps 3, 4), 4 (Step 4).

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with an `Expected:` line. No step runs bare `vitest`, `npm run dev`, or edits `package-lock.json`, `node_modules/`, or `dist/`.

**Type / name consistency:** `resolveTrickBank`'s four-parameter signature is introduced in Task 1 Step 4 and used in that same task's Steps 1 and 6, matching `plan.md` → Data shapes. `TRICKS_LABEL` is introduced in Task 4 Step 1, consumed in Step 3, and asserted absent under its old name `BANK_LABEL` in Task 6 Step 1. `bankAdded` is `1` on a take in Task 1 Step 1, Task 2 Step 1, and nowhere else. `QUARRY_ENCOUNTER_HEALTH` is read only via `quarryHealthForEncounter(0)` in every test this contract edits, never as a literal.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking: the signature change and its only call site both land in Task 1, so no intermediate state has a four-argument function called with five. The Quarry is still at 400, which makes the game slow but internally consistent.
- **Phase 2** ends type-checking: the config value and both specs that read a consequence from it change together, so no phase boundary leaves a spec asserting a health figure the config cannot produce.
- **Phase 3** ends type-checking: `BANK_LABEL` is renamed and its two readers updated in the same task, and the component spec's queries move with the `aria-label` they bind to by string.
- **Phase 4** changes no production code.
