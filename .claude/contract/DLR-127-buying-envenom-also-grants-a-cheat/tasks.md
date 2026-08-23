# Tasks: DLR-127 — Buying Envenom also grants a Cheat

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-23

> **Not developer-confirmed.** This contract runs inside the 2026-08-23 unattended sprint run, which overrides the `/fb-plan` approval gate. `plan.md` was self-reviewed but never presented to the developer, and no `AskUserQuestion` gate was raised. Every default taken in place of a pause is recorded in `.claude/sprint-runs/2026-08-23-sprint/log.md` under `## DLR-127`. The plan's Risks section names two readings the developer still owns.

**Goal:** Make `envenom.test.ts :: "does NOT add a Cheat"` green by asserting a strictly stronger invariant than it does today, and add a table-driven guard that every shop purchase and the flask change exactly the run fields they are meant to change.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/hunt/__tests__/run.purchaseIsolation.test.ts` — the cross-item regression guard: each purchase and `drinkFlask` changes an exact, asserted set of `RunState` fields and nothing else.

**Modified:**
- `src/hunt/__tests__/envenom.test.ts:112-114` — re-point `"does NOT add a Cheat"` at the pre-purchase Cheat list instead of a hard-coded `[]`, plus one added import.

**Deleted:** (none)

**Developer decides or observes:**
- **Whether DLR-127's stated root cause is accepted as refuted.** The ticket says the Envenom purchase grants a Cheat; `src/hunt/runTransitions.ts:205-206` shows it does not, and this contract therefore changes a spec rather than the shop. If a purchase really is meant to bundle a Cheat, this contract fixes the wrong file.
- **`RUN_STARTING_CHEATS` — whether a run opens holding a Cheat.** Currently `1` (`src/hunt/config.ts:201`), set deliberately in commit `ccc07ec`. The alternative diagnosis is that this value is the bug and the original absolute assertion was right. A tuning value and a gameplay change, so this contract does not touch it.
- Nothing here can be judged only by running the app: no rendered surface changes and no tuning value moves.

---

## Phase 1 — Re-point the failing assertion

The one red test in the suite. This phase changes a single `it` block plus its import line and leaves the rest of `envenom.test.ts` — twenty passing cases — untouched. The boundary is safe because the file type-checks and runs standalone before and after, and no other file imports it.

### Task 1: Assert the Envenom purchase leaves the Cheat list untouched, not empty ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/__tests__/envenom.test.ts:1-19` (import), `src/hunt/__tests__/envenom.test.ts:112-114` (the assertion)
- Test: `src/hunt/__tests__/envenom.test.ts`

- [x] **Step 1: Confirm the test is red for the reason the plan states, before changing anything**

Run: `npx vitest run src/hunt/__tests__/envenom.test.ts -t "does NOT add a Cheat"`
Expected: exits non-zero; the failure reads `expected [ { id: 1 } ] to deeply equal []` at `envenom.test.ts:113`. A different message means the plan's diagnosis is wrong — stop and re-read `runTransitions.ts` rather than editing the assertion.

- [x] **Step 2: Import `RUN_STARTING_CHEATS` so the non-vacuity check tracks configuration**

In the existing `from '../config'` import block at the top of the file, add `RUN_STARTING_CHEATS` in alphabetical position. The block becomes:

```ts
import {
  ENVENOM_PLAYER_DAMAGE,
  ENVENOM_PRICE,
  ENVENOM_QUARRY_DAMAGE,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  RUN_STARTING_CHEATS,
} from '../config'
```

- [x] **Step 3: Replace the assertion body with the stronger, relative form**

Replace exactly this:

```ts
  it('does NOT add a Cheat', () => {
    expect(buyFromShop(funded(3), ShopItem.Envenom).cheats).toEqual([])
  })
```

with exactly this:

```ts
  it('does NOT add a Cheat', () => {
    const before = funded(3)
    // Non-vacuity guard (DLR-127): the original assertion was `toEqual([])`, which silently
    // stopped testing anything the moment `RUN_STARTING_CHEATS` moved 0 -> 1 and the run began
    // opening with a Cheat in hand — it then failed on the OPENING GRANT rather than on
    // anything the purchase did. Asserting the fixture actually holds Cheats keeps the check
    // below meaningful whatever that key is retuned to.
    expect(before.cheats).toHaveLength(RUN_STARTING_CHEATS)
    const after = buyFromShop(before, ShopItem.Envenom)
    // Stronger than the original on three counts: it fails on a Cheat ADDED (all the original
    // caught), on a Cheat REMOVED, and on the list being needlessly rebuilt — the Envenom branch
    // spreads `run`, so an untouched `cheats` must be the very same array.
    expect(after.cheats).toEqual(before.cheats)
    expect(after.cheats).toBe(before.cheats)
  })
```

- [x] **Step 4: Run the whole file and confirm every case passes**

Run: `npx vitest run src/hunt/__tests__/envenom.test.ts`
Expected: exits 0; Vitest reports `Tests  21 passed (21)`.

- [x] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 2 — The cross-item regression guard

The ticket asks for the sibling purchase paths to be checked. This phase answers that with a test rather than a reading, so the class of defect cannot come back silently for any item. It adds one new file and modifies nothing, so the boundary is safe by construction: the phase cannot break an existing spec.

### Task 2: Add the purchase-isolation spec covering every shop item and the flask ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/hunt/__tests__/run.purchaseIsolation.test.ts`
- Test: `src/hunt/__tests__/run.purchaseIsolation.test.ts`

- [x] **Step 1: Write the spec**

Create the file with exactly this content:

```ts
import { describe, expect, it } from 'vitest'
import { PLAYER_START_HEALTH } from '../config'
import { startEncounter } from '../encounter'
import { buyFromShop, drinkFlask, startRun, type RunState } from '../run'
import { ShopItem } from '../shop'
import { DuelSide } from '../types'

// DLR-127. The ticket reported that buying an Envenom charge also granted a Cheat. It does not —
// `buyFromShop`'s Envenom branch returns `{ ...paid, envenomCharges: run.envenomCharges + 1 }` and
// never touches `cheats`; the red assertion was reading the run's OPENING Cheat grant. But "a
// purchase quietly handed over something it did not charge for" is a real class of defect and had
// no guard at all, so this file adds one for every item at once rather than for Envenom alone.
//
// Each case asserts the EXACT set of `RunState` fields a transition writes. An exact set, not a
// spot-check, is what makes this catch the next one: a branch that starts writing a field nobody
// thought to name fails here, and so does a field added to `RunState` later and written by
// accident.

/**
 * The top-level `RunState` keys whose values differ between two runs, sorted.
 *
 * Compares by REFERENCE (`Object.is`), which is exact for this module rather than merely cheap:
 * every transition in `runTransitions.ts` is an immutable spread, so a field the transition did
 * not write is the very same object — never a rebuilt equal one. A deep-equality diff would be
 * strictly worse here, because it would report the Heal's rebuilt `encounter` as unchanged
 * whenever the player was already at full health, which is exactly a case worth failing on.
 */
function changedFields(before: RunState, after: RunState): readonly string[] {
  return (Object.keys(before) as (keyof RunState)[])
    .filter((key) => !Object.is(before[key], after[key]))
    .sort()
}

/** A run at fight 0 with coins to spend and three hearts of damage taken, so the Heal and the
 *  flask both have something to restore and neither is refused for being at full health. */
function hurtAndFunded(coins: number): RunState {
  const run = startRun()
  return { ...run, coins, encounter: startEncounter(0, PLAYER_START_HEALTH - 3) }
}

/** `hurtAndFunded`, with the fight won — `drinkFlask` refuses an unresolved encounter, because
 *  AC4 makes drinking a between-fights action. */
function afterAWonFight(coins: number): RunState {
  const run = hurtAndFunded(coins)
  return {
    ...run,
    encounter: {
      ...run.encounter,
      health: { ...run.encounter.health, [DuelSide.Quarry]: 0 },
      winner: DuelSide.Player,
    },
  }
}

describe('changedFields — the helper itself is honest', () => {
  it('reports nothing for a run compared with itself', () => {
    const run = hurtAndFunded(9)
    expect(changedFields(run, run)).toEqual([])
  })

  it('reports a field that was written', () => {
    const run = hurtAndFunded(9)
    expect(changedFields(run, { ...run, coins: 0 })).toEqual(['coins'])
  })

  it('reports a field rebuilt to an equal value, so a needless rebuild cannot hide', () => {
    const run = hurtAndFunded(9)
    expect(changedFields(run, { ...run, cheats: [...run.cheats] })).toEqual(['cheats'])
  })
})

describe('buyFromShop — one purchase changes exactly one thing, plus the coins it cost', () => {
  it('Cheat: coins, the held list, and the id counter — and nothing else', () => {
    const before = hurtAndFunded(9)
    expect(changedFields(before, buyFromShop(before, ShopItem.Cheat))).toEqual([
      'cheats',
      'coins',
      'nextCheatId',
    ])
  })

  it('Envenom: coins and the charge count — and NOTHING else (the DLR-127 report)', () => {
    const before = hurtAndFunded(9)
    expect(changedFields(before, buyFromShop(before, ShopItem.Envenom))).toEqual([
      'coins',
      'envenomCharges',
    ])
  })

  it('Poison Guard: coins and the held flag — and nothing else', () => {
    const before = hurtAndFunded(9)
    expect(changedFields(before, buyFromShop(before, ShopItem.PoisonGuard))).toEqual([
      'coins',
      'poisonGuardHeld',
    ])
  })

  it('Whetstone: coins and the stone count — and nothing else', () => {
    const before = hurtAndFunded(9)
    expect(changedFields(before, buyFromShop(before, ShopItem.Whetstone))).toEqual([
      'coins',
      'whetstones',
    ])
  })

  it('Heal: coins and the encounter it restores health on — and nothing else', () => {
    const before = hurtAndFunded(9)
    expect(changedFields(before, buyFromShop(before, ShopItem.Heal))).toEqual([
      'coins',
      'encounter',
    ])
  })
})

describe('drinkFlask — the sibling that is not a purchase', () => {
  it('spends a charge and restores health, and grants no item on the way', () => {
    const before = afterAWonFight(9)
    expect(changedFields(before, drinkFlask(before))).toEqual(['encounter', 'flaskCharges'])
  })
})

describe('no purchase touches another item’s holding', () => {
  it('buying every item in turn leaves each holding at exactly what its own purchase set', () => {
    const opened = hurtAndFunded(20)
    const all = [
      ShopItem.Cheat,
      ShopItem.Envenom,
      ShopItem.PoisonGuard,
      ShopItem.Whetstone,
    ].reduce((run, item) => buyFromShop(run, item), opened)
    expect(all.cheats).toHaveLength(opened.cheats.length + 1)
    expect(all.envenomCharges).toBe(1)
    expect(all.poisonGuardHeld).toBe(true)
    expect(all.whetstones).toBe(1)
    // The one the ticket is about, stated once more against a run that bought everything.
    expect(all.flaskCharges).toBe(opened.flaskCharges)
  })
})
```

- [x] **Step 2: Run the new spec**

Run: `npx vitest run src/hunt/__tests__/run.purchaseIsolation.test.ts`
Expected: exits 0; Vitest reports `Tests  10 passed (10)`. A failure on the Cheat case would mean `CHEAT_SLOT_COUNT` no longer leaves room for a purchase on top of the opening grant — read `src/hunt/config.ts` before touching the assertion.

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 3 — Final verification

No production changes. Only sanity-checks that the cumulative work is clean, plus the boundary and file-budget checks this project's reviewers enforce.

### Task 3: Confirm the pure-core boundary still holds for the new spec ✓

- Skill: `none — a verification grep, no code written`

**Files:**
- Test: `src/hunt/__tests__/run.purchaseIsolation.test.ts`

- [x] **Step 1: Grep the hunt tree for a React import or a DOM global**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. `npm run lint` is the real gate (`eslint.config.js` restricts both on `src/hunt/**`); this grep is the cheap confirmation that the new file did not introduce one.

- [x] **Step 2: Confirm neither file breaches the 400-line budget**

Run: `(Get-Content src\hunt\__tests__\envenom.test.ts).Count; (Get-Content src\hunt\__tests__\run.purchaseIsolation.test.ts).Count`
Expected: both well under 400. Use `(Get-Content …).Count`, never `Measure-Object -Line`, which drops blank lines and undercounts.

### Task 4: Confirm no production file was touched ✓

- Skill: `none — a verification grep, no code written`

**Files:**
- Test: (none — inspects the working tree)

- [x] **Step 1: Confirm the diff is confined to the two spec files**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain src`
Expected: exactly two entries — a modification to `src/hunt/__tests__/envenom.test.ts` and an untracked `src/hunt/__tests__/run.purchaseIsolation.test.ts`. Any entry naming `runTransitions.ts`, `shop.ts`, `cheats.ts`, or `config.ts` is out of contract and must be reverted: the plan's finding is that the production purchase path is already correct.

### Task 5: Static gates, full suite, and build ✓

- Skill: `none — verification only, no code written`

**Files:**
- Test: (none — whole-repo gates)

- [x] **Step 1: Warm the Vitest transform cache one project at a time**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. This is not optional cosmetics — `web-project.md` records that a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is infrastructure, not a failing test, and must never be reported as one.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. The run's baseline was 1061 passed / 1 failed of 1062, and this contract adds 10 new cases, so expect **1072 passed, 0 failed of 1072**. Quote the actual summary line rather than this projection.

- [x] **Step 3: Confirm formatting of the two changed files only**

Run: `npx prettier --check src/hunt/__tests__/envenom.test.ts src/hunt/__tests__/run.purchaseIsolation.test.ts`
Expected: exits 0. Scoped deliberately — repo-wide `npm run format:check` fails on pre-existing `.docs/**` files no current contract has touched, and fixing that is not this ticket's job.

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 6: Write the PR description ✓

- Skill: `none — a document, not code`

**Files:**
- Create: `.claude/contract/DLR-127-buying-envenom-also-grants-a-cheat/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- **The finding, stated first and plainly: no production defect was found.** `buyFromShop`'s Envenom branch grants no Cheat; the assertion was reading the run's opening Cheat grant after `RUN_STARTING_CHEATS` moved `0 → 1` in commit `ccc07ec`. Name the sibling items explicitly — Cheat, Poison Guard, Whetstone, Heal and the flask were all checked and none shares the defect, now covered by `run.purchaseIsolation.test.ts`.
- Why the replacement assertion is stronger than `toEqual([])`, not weaker.
- The two decisions the developer owns, from the File map above.
- Verification results from Phase 3, quoting the actual Vitest summary line.
- A one-line note for future contributors: a spec that asserts an absolute run field is asserting the opening loadout as well as the transition — assert against the pre-transition value instead.

---

## Self-review

**Spec coverage:**
- Re-point `"does NOT add a Cheat"` at the pre-purchase list — Task 1.
- Make the assertion non-vacuous against a future `RUN_STARTING_CHEATS` retune — Task 1, Step 3 (`toHaveLength(RUN_STARTING_CHEATS)`, imported in Step 2).
- Regression spec covering every shop purchase and the flask — Task 2.
- Written finding that no production defect exists, with the sibling items named — Task 6.
- Production purchase path left untouched (plan's "Explicitly out of scope") — enforced by Task 4's `git status` check, not merely asserted.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or the exact command with its expected result. No step runs bare `vitest`, `npm run dev`, or edits `package-lock.json`; no step invents a tuning value; no step proposes an `eslint-disable`.

**Type / name consistency:** `changedFields`, `hurtAndFunded`, `afterAWonFight`, `RunState`, `ShopItem`, `RUN_STARTING_CHEATS`, `buyFromShop`, `drinkFlask`, `startRun`, `startEncounter`, `DuelSide` and `PLAYER_START_HEALTH` are spelled identically in `plan.md` Part 2 → Data shapes and in every task step. `changedFields` matches its signature in Data shapes exactly. The two file paths are identical everywhere they appear.

**Phase boundary cleanliness:**
- Phase 1 ends type-checking: one `it` body and one import line changed in a file nothing imports, with the whole file re-run green at Step 4.
- Phase 2 ends type-checking: one new file added, nothing modified, so no existing spec can be left half-changed.
- Phase 3 makes no production change at all — greps, gates, and a document.
