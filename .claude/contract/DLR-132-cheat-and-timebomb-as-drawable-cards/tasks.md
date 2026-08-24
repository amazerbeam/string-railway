# Tasks: DLR-132 — Cheat and Timebomb as drawable buff cards

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-24

> **`plan.md` was NOT developer-confirmed.** This is an unattended sprint run; the Step 3 approval gate was auto-approved by the coordinator, and the UI mockup gate was skipped, so `<plan>/mockup.html` does not exist and **nobody has seen the redesigned panel**. Every judgement call is recorded in `plan.md` → Risks for the developer to red-line after the fact.

**Goal:** Cheat and Timebomb become ordinary buff cards — two templates the reel can draw, two rows in `BuffLoadoutPanel`'s roving-tabindex list, spent through the same two-tap `activateFromPile` flow every other card uses — with `CheatSlots`, `TimebombCharge`, `CheatStage`, `TimebombStage` and the parallel `RunState.cheats` / `RunState.timebombCharges` counters deleted.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/hunt/__tests__/buffTemplates.activated.test.ts` — the two activated templates, their minting, and their weights

> **AMENDED MID-RUN, 2026-08-24.** `src/app/warCouncil/roundPredicates.ts` and its spec were listed here and are **not created** — see Task 9's blockquote for the measurement. The split was written against a file expected to breach the blocking 400-line budget (`roundUiState.ts` was at 399 at `c116afa`, and this ticket adds three fields to it). Phase 3 deleted `CheatStage`, `CheatSelection`, `TimebombStage`, four action kinds and four state fields — more than the three additions cost — and the file measured **389** at the end of Phase 4. Splitting a 389-line file to satisfy a trigger that never fired is churn, not hygiene. Task 14 Step 2 re-measures after the final Prettier pass; the split becomes blocking again only if that number reaches 400.

**Modified:**
- `src/hunt/buffTemplates.ts` — `BuffTemplate` becomes a discriminated union; two activated templates added; `mintFromTemplate` switches on `form`
- `src/hunt/slotWeights.ts` — `SlotTemplateKind`; four new family weights; `templateWeightFor` gains an activated branch
- `src/hunt/buffCatalog.ts` — `TimebombDamage` retyped `Readonly<Record<DuelSide, Damage>>`
- `src/hunt/encounter.ts` — `timebombDamageFor` deleted; `queueTimebomb` takes the damage pair
- `src/hunt/config.ts` — `CHEAT_SLOT_COUNT` deleted; `RUN_STARTING_CHEATS` re-homed
- `src/hunt/run.ts` — `RunState` loses `cheats`, `nextCheatId`, `timebombCharges`; `startRun` seeds a bronze Cheat buff
- `src/hunt/runTransitions.ts` — shop branches mint buffs; `recordEncounter` loses two parameters
- `src/hunt/index.ts` — barrel updated for every deleted and added export
- `src/app/warCouncilMount.ts` — mount and result props lose `cheats` and `timebombCharges`
- `src/App.tsx` — stops threading the two deleted fields
- `src/app/warCouncil/roundUiState.ts` — stages deleted, new fields added, predicates moved out
- `src/app/warCouncil/buffHandlers.ts` — Cheat and Timebomb effect branches beside Ward's
- `src/app/warCouncil/roundReducer.ts` — four actions and three handlers deleted; prime folds into `handleTapCard`
- `src/app/warCouncil/commitHandlers.ts` — Cheat decrements instead of being removed; `queueTimebomb` gets the pair
- `src/app/warCouncil/BuffLoadoutPanel.tsx` — nine props removed; rows are the whole panel
- `src/app/warCouncil/roundControlsProps.ts` — panel props narrowed
- `src/app/warCouncil/WarCouncilRound.tsx` — stops threading the deleted props
- `src/app/warCouncil/roundHint.ts` — Cheat and Timebomb hint branches collapse to one
- `src/app/warCouncil/labels.ts` — rail copy deleted; `timebombBookedText` takes the amount
- `src/sim/baselinePolicy.ts`, `src/sim/playHand.ts`, `src/sim/playRun.ts`, `src/sim/fixtures.ts`, `src/sim/reachability.ts` — the policy drives both cards through `TapBuff`
- ~49 spec files whose seed and expectation literals name a deleted field (enumerated per task)
- `.docs/implementation/hunt/*`, `.docs/implementation/war-council-ui/*`, `.docs/game_rules/the-hunt.md` — via `implementation-doc-writer`

**Deleted:**
- `src/hunt/cheats.ts`
- `src/hunt/__tests__/cheats.test.ts` — confirmed present; it tests only the deleted module
- `src/app/warCouncil/CheatSlots.tsx`
- `src/app/warCouncil/TimebombCharge.tsx`
- `src/app/warCouncil/warCouncilCheats.css`
- `src/app/warCouncil/warCouncilTimebomb.css`
- `src/app/warCouncil/__tests__/CheatSlots.test.tsx`
- `src/app/warCouncil/__tests__/TimebombCharge.test.tsx`

**Developer decides or observes:**
- `SLOT_FAMILY_WEIGHTS` → `Skirmisher.cheat = 3`, `Skirmisher.timebomb = 3`, `Strongbox.cheat = 1`, `Strongbox.timebomb = 1` — **four agent-chosen weights nobody approved.** Trades reel frequency of the two tactical cards against the eleven condition families. Only ratios matter within a machine's table.
- `RUN_STARTING_CHEATS = 1` — preserved, not answered. Setting it to `0` makes the Cheat purely reel-drawn. The standing open question is whether a run should open holding one at all.
- **Only one Timebomb tier is remembered per hand** (`primedTimebombDamage`). Two different-tier Timebombs primed in one hand both detonate at the second's figure. Say whether that matters.
- **A gold Cheat is now reachable** at 7 AP — three tricks of no follow-suit, which `buffCatalog.ts` already flags as "NOT SAFE TO SHIP ACTIVE". A costing question, not retuned here.
- **Visual and copy judgement on the redesigned panel** — the mockup gate was skipped and nobody has seen a buff list containing a Cheat row and a Timebomb row. Does `Cheat (Free Rein) — play any card, ignoring follow-suit: 1 trick of no follow-suit. 3 AP.` read well beside a condition card's line? Does losing the ⚗ glyph and the two slot frames cost the felt anything at a glance?
- **The before/after `npm run sim -- --runs 200 --seed 1` figures** are an observation, not a result. The balance pass is the developer's.

---

## Phase 1 — The pure pool layer

Everything in `src/hunt/` that has to change before a card can be drawn: the template union, the two new templates, their weights, and the four-ticket-old damage collapse. The phase boundary is safe because the templates are purely additive to the pool and the `TimebombDamage` retype is source-compatible at every existing read; only `queueTimebomb`'s new parameter reaches upward, and both production call sites are fixed inside this phase. `src/app/` still drives the old widgets at the end of Phase 1 and the app still compiles and runs.

### Task 1: Make `BuffTemplate` a discriminated union and add the two activated templates ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/buffTemplates.ts`
- Modify: `src/hunt/index.ts`
- Modify: `src/app/vault/VaultScreen.tsx:59` — confirm `BuffTemplate['kind']` still resolves (expected: no edit needed)
- Test: `src/hunt/__tests__/buffTemplates.activated.test.ts` (create)
- Test: `src/hunt/__tests__/buffTemplates.test.ts:28-50` — the `71` assertions become `73`
- Test: `src/sim/__tests__/reachability.test.ts:34,57` — the `71` assertion and the "no template mints one" comment

- [x] **Step 1: Write the failing test for the two activated templates**

Create `src/hunt/__tests__/buffTemplates.activated.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { BuffKind, BuffRewardAxis, BuffTier } from '../buffs'
import { BUFF_TEMPLATES, mintFromTemplate, templateById } from '../buffTemplates'
import { CHEAT_DURATION_TRICKS, TIMEBOMB_DAMAGE } from '../buffCatalog'
import { apCostOf } from '../buffCosts'
import { DuelSide } from '../types'

describe('the activated templates', () => {
  it('puts exactly two activated templates in the pool', () => {
    expect(BUFF_TEMPLATES.filter((t) => t.form === 'activated')).toHaveLength(2)
  })

  it('resolves both by their frozen persisted ids', () => {
    expect(templateById('cheat')?.kind).toBe(BuffKind.Cheat)
    expect(templateById('timebomb')?.kind).toBe(BuffKind.Timebomb)
  })

  it('mints a Cheat whose reward is that tier of no-follow-suit duration', () => {
    const buff = mintFromTemplate(templateById('cheat')!, BuffTier.Silver, 42)
    expect(buff).toMatchObject({
      id: 42,
      kind: BuffKind.Cheat,
      tier: BuffTier.Silver,
      reward: { axis: BuffRewardAxis.DurationTricks, value: CHEAT_DURATION_TRICKS[BuffTier.Silver] },
    })
  })

  it('mints a Timebomb carrying that tier of Quarry-side damage', () => {
    const buff = mintFromTemplate(templateById('timebomb')!, BuffTier.Gold, 7)
    expect(buff.reward.value).toBe(TIMEBOMB_DAMAGE[BuffTier.Gold][DuelSide.Quarry])
  })

  it('prices every activated template at every tier without throwing', () => {
    for (const template of BUFF_TEMPLATES.filter((t) => t.form === 'activated')) {
      for (const tier of [BuffTier.Bronze, BuffTier.Silver, BuffTier.Gold]) {
        expect(apCostOf(mintFromTemplate(template, tier, 1))).toBeGreaterThan(0)
      }
    }
  })
})
```

Run: `npx vitest run src/hunt/__tests__/buffTemplates.activated.test.ts`
Expected: fails — `form` does not exist on `BuffTemplate` and `templateById('cheat')` is `undefined`.

- [x] **Step 2: Split `BuffTemplate` into the tagged union and tag every generated condition template**

In `src/hunt/buffTemplates.ts`, replace the single `BuffTemplate` interface with `ConditionBuffTemplate`, `ActivatedBuffTemplate`, `BuffActivatedTemplateKind` and the `BuffTemplate` union exactly as `plan.md` → Data shapes declares them. `makeTemplate` returns `{ form: 'condition', id, kind, axis }` (plus `target` when present). Add `ACTIVATED_TEMPLATES` and append it to `BUFF_TEMPLATES`:

```ts
export const BUFF_TEMPLATES: readonly BuffTemplate[] = [
  ...TEMPLATE_FAMILIES.flatMap(templatesForTemplateFamily),
  ...ACTIVATED_TEMPLATES,
]
```

Widen `templatesForFamily(kind: BuffTemplate['kind'])`.

- [x] **Step 3: Switch `mintFromTemplate` on `form` and delegate the activated branch to `buffCatalog.ts`**

```ts
export function mintFromTemplate(template: BuffTemplate, tier: BuffTier, id: BuffId): Buff {
  if (template.form === 'activated') {
    // DLR-132 — DLR-107's `cheatBuff`/`timebombBuff` ARE the minting path. Reproducing their
    // expressions here would give one card two answers, which is the discipline
    // `cheatDurationTricksOf` sets three files away.
    return template.kind === BuffKind.Cheat ? cheatBuff(tier, id) : timebombBuff(tier, id)
  }
  // …today's body, verbatim…
}
```

Import `cheatBuff` and `timebombBuff` from `./buffCatalog`. **Confirm this creates no import cycle** — `buffCatalog.ts` imports `./buffs`, `./config`, `./shield` and `./types`, and does not import `./buffTemplates`.

- [x] **Step 4: Rewrite the module docblock and the `BUFF_TEMPLATES` docblock**

Both currently state the shape problem as open ("`BuffTemplate.kind` is typed `BuffConditionKind` … a consumable has neither"). Replace with the resolution: the `form` tag closes it for Cheat and Timebomb; **the five consumables remain absent and are now a data edit plus one mint branch plus ten unchosen slot weights**, and that is a separate decision (DLR-120's scope boundary). Say so in the code, so the next ticket finds it.

- [x] **Step 5: Update the three pinned counts**

`src/hunt/__tests__/buffTemplates.test.ts:30-31` — `toHaveLength(71)` → `toHaveLength(73)`, `toBe(71)` → `toBe(73)`. Line 43's "every template has an axis" loop must be narrowed to `form === 'condition'`. `src/sim/__tests__/reachability.test.ts:57` — `toBe(71)` → `toBe(73)`, and the comment at line 34 explaining that no template mints a Cheat is deleted along with whatever assertion depends on it.

- [x] **Step 6: Export the new types from the barrel**

`src/hunt/index.ts:332` — add `ConditionBuffTemplate`, `ActivatedBuffTemplate`, `BuffActivatedTemplateKind` beside the existing `BuffTemplate` type export.

- [x] **Step 7: Verify**

Run: `npx vitest run src/hunt/__tests__/buffTemplates.activated.test.ts src/hunt/__tests__/buffTemplates.test.ts src/hunt/__tests__/buffTemplates.grants.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

### Task 2: Weight the two activated templates on both machines ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/slotWeights.ts`
- Test: `src/hunt/__tests__/slotWeights.test.ts`
- Test: `src/hunt/__tests__/slotMachine.test.ts:70`

- [x] **Step 1: Add the failing assertion that both activated families can be drawn**

Append to `src/hunt/__tests__/slotWeights.test.ts`:

```ts
describe('activated templates', () => {
  it.each([SlotMachineId.Skirmisher, SlotMachineId.Strongbox])(
    'gives %s a positive weight to both activated templates',
    (machineId) => {
      for (const id of ['cheat', 'timebomb']) {
        expect(templateWeightFor(machineId, templateById(id)!)).toBeGreaterThan(0)
      }
    },
  )

  it.each([SlotMachineId.Skirmisher, SlotMachineId.Strongbox])(
    "makes an activated family's strip share equal its family weight on %s",
    (machineId) => {
      for (const kind of [BuffKind.Cheat, BuffKind.Timebomb]) {
        const total = templatesForFamily(kind).reduce(
          (sum, t) => sum + templateWeightFor(machineId, t),
          0,
        )
        expect(total).toBeCloseTo(SLOT_FAMILY_WEIGHTS[machineId][kind], 10)
      }
    },
  )
})
```

Run: `npx vitest run src/hunt/__tests__/slotWeights.test.ts`
Expected: fails — `SLOT_FAMILY_WEIGHTS[machineId].cheat` is `undefined` and `templateWeightFor` returns 0.

- [x] **Step 2: Widen the weight-table key type and add the four rows**

```ts
/** Every kind a template can carry — DLR-112's 11 condition families plus DLR-132's 2 activated
 *  cards. `SLOT_AXIS_WEIGHTS` is deliberately NOT widened: an activated template has no axis. */
export type SlotTemplateKind = BuffConditionKind | BuffActivatedTemplateKind
export type SlotFamilyWeights = Readonly<Record<SlotTemplateKind, number>>
```

Add to `SLOT_FAMILY_WEIGHTS`, with the comment recording that these four are agent-chosen and unapproved:

```ts
// DLR-132 — NOBODY CHOSE THESE FOUR NUMBERS. Both cards are in-hand tactical plays rather than
// run-permanent rewards, so they sit mid-table on the trick-lean machine beside MarkOfRank (3)
// and DebtCollector (3), and at the floor on the upgrade-lean one beside Keepsake (1). Only
// RATIOS matter within one machine's table. UNIT: relative weight, >= 0, unitless.
[SlotMachineId.Skirmisher]: { …, [BuffKind.Cheat]: 3, [BuffKind.Timebomb]: 3 },
[SlotMachineId.Strongbox]:  { …, [BuffKind.Cheat]: 1, [BuffKind.Timebomb]: 1 },
```

- [x] **Step 3: Give `templateWeightFor` its activated branch and guard the new divisor**

```ts
/** Templates per activated family, derived ONCE at module load beside `FAMILY_AXIS_TOTAL`, so an
 *  activated family's share of a strip equals its family weight regardless of how many templates
 *  it grows to hold — the same invariant the condition branch's normalisation gives. */
const ACTIVATED_FAMILY_SIZE: Readonly<Record<string, number>> = /* counted from BUFF_TEMPLATES */

export function templateWeightFor(machineId: SlotMachineId, template: BuffTemplate): number {
  const familyWeight = SLOT_FAMILY_WEIGHTS[machineId][template.kind] ?? 0
  if (template.form === 'activated') {
    const size = ACTIVATED_FAMILY_SIZE[template.kind] ?? 0
    // Guarded for `familyAxisTotal`'s stated reason: no NaN may reach a running weight total.
    return size <= 0 ? 0 : familyWeight / size
  }
  // …today's condition body, verbatim…
}
```

`familyAxisTotalsFor` must skip activated templates (`if (template.form !== 'condition') continue`), or an activated template with no axis would contribute `?? 0` to a condition family's total.

- [x] **Step 4: Verify**

Run: `npx vitest run src/hunt/__tests__/slotWeights.test.ts src/hunt/__tests__/slotMachine.test.ts src/hunt/__tests__/slotOdds.test.ts src/vault/__tests__/vaultOdds.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

### Task 3: Collapse `timebombDamageFor` into `timebombDamageOf` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/buffCatalog.ts:25-32,88-92,171-191`
- Modify: `src/hunt/encounter.ts:195-222`
- Modify: `src/hunt/index.ts:104,113,213`
- Modify: `src/app/warCouncil/labels.ts:13,232-241`
- Modify: `src/app/warCouncil/commitHandlers.ts:130-135`
- Modify: `src/warCouncil/bank.ts:46-52` — docblock reference only
- Test: `src/hunt/__tests__/timebomb.test.ts` (15 `queueTimebomb` call sites)
- Test: `src/hunt/__tests__/buffCatalog.test.ts:100-130`
- Test: `src/app/warCouncil/__tests__/roundReducer.timebombQueue.test.ts` (6), `roundBars.test.ts` (3), `roundReducer.applyDamage.test.ts` (3), `roundReducer.delayedApply.test.ts` (3), `cardDamage.test.ts` (2), `labels.test.ts`

- [x] **Step 1: Retype `TimebombDamage` as a `DuelSide`-keyed record**

In `src/hunt/buffCatalog.ts`, replace the interface with the type alias from `plan.md` → Data shapes, and rewrite `timebombRow` to build `{ [DuelSide.Quarry]: …, [DuelSide.Player]: … }`. Import `DuelSide` from `./types`. **Every existing read (`TIMEBOMB_DAMAGE[tier].quarry`) still compiles** — `DuelSide.Quarry === 'quarry'` — so this step is source-compatible by construction. Rewrite the docblock to record that the two field names are now the two `DuelSide` values and that this is what lets `timebombDamageFor` be deleted rather than duplicated.

- [x] **Step 2: Delete `timebombDamageFor` and give `queueTimebomb` the pair**

In `src/hunt/encounter.ts`, delete `timebombDamageFor` (lines 195-203) and change `queueTimebomb`:

```ts
export function queueTimebomb(
  encounter: EncounterState,
  target: DuelSide,
  damage: TimebombDamage,
): EncounterState {
  if (isEncounterResolved(encounter)) return encounter
  return {
    ...encounter,
    pendingTimebomb: {
      ...encounter.pendingTimebomb,
      [target]: encounter.pendingTimebomb[target] + damage[target],
    },
  }
}
```

Keep the `isEncounterResolved` guard and the never-throws contract verbatim. Remove `timebombDamageFor` from `src/hunt/index.ts:213`.

- [x] **Step 3: Make `timebombBookedText` take the amount**

`src/app/warCouncil/labels.ts` — drop the `timebombDamageFor` import (line 13) and change the signature to `timebombBookedText(target: DuelSide, amount: Damage)`, deleting the internal lookup. Update its caller and `labels.test.ts`.

- [x] **Step 4: Thread the pair at `applyResolution`'s booking site**

`src/app/warCouncil/commitHandlers.ts:133-134` — `applyResolution` gains a `timebombDamage: TimebombDamage` parameter, threaded from `commit`'s `state.primedTimebombDamage`. **Until Phase 3 introduces that field**, pass `TIMEBOMB_DAMAGE[BuffTier.Bronze]` — which is today's exact pair by construction (`buffCatalog.ts`'s `timebombRow` multiplies the live constants by 1 at bronze), so this phase changes no behaviour. Leave a `// DLR-132 Phase 3 threads the primed card's own tier here` marker.

- [x] **Step 5: Update every `queueTimebomb` call site in the specs**

All 6 spec files listed in `**Files:**`. Each call gains a third argument `TIMEBOMB_DAMAGE[BuffTier.Bronze]`, preserving today's figures exactly so no expectation changes.

- [x] **Step 6: Verify**

Run: `npx vitest run src/hunt/__tests__/timebomb.test.ts src/hunt/__tests__/buffCatalog.test.ts src/app/warCouncil/__tests__/roundReducer.timebombQueue.test.ts src/app/warCouncil/__tests__/labels.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

- [x] **Step 7: Confirm the collapsed name is genuinely gone**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "timebombDamageFor"`
Expected: zero hits.

---

## Phase 2 — Retire the parallel run state

`RunState.cheats`, `RunState.nextCheatId` and `RunState.timebombCharges` are the second record of "do you hold a Cheat", and they go. This is the widest phase — 66 files carry one of the deleted names — but every one of them fails at `tsc` as an excess property or a missing field, so there is no silent-failure mode. The phase ends with `src/hunt/` and `src/App.tsx` consistent and the felt still compiling against its own (now unfed) fields, which Phase 3 removes.

### Task 4: Delete `cheats.ts`, re-home `RUN_STARTING_CHEATS`, and strip the three `RunState` fields ✓

- Skill: `react-frontend`

**Files:**
- Delete: `src/hunt/cheats.ts`
- Delete: `src/hunt/__tests__/cheats.test.ts`
- Modify: `src/hunt/config.ts:190-201`
- Modify: `src/hunt/run.ts:50-90,168-195`
- Modify: `src/hunt/runTransitions.ts:19,44-120,190-240`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/run.test.ts` (17), `run-buffs.test.ts` (8), `run.quickKill.test.ts` (6), `run.flask.test.ts` (5), `run.integration.test.ts` (4), `run.discard.test.ts` (4), `run.purchaseIsolation.test.ts` (3), `run.beatenCount.test.ts` (3), `run.shop.test.ts` (5), `run.whetstone.test.ts` (1), `run.slot.test.ts` (1), `run.rankTier.test.ts` (1), `blastGuard.test.ts` (3), `config.test.ts`

- [x] **Step 1: Delete the module and its config key**

Delete `src/hunt/cheats.ts`. In `src/hunt/config.ts`, delete `CHEAT_SLOT_COUNT` and rewrite `RUN_STARTING_CHEATS`'s comment:

```ts
// DLR-132 — how many bronze Cheat BUFFS `startRun` seeds into `RunState.buffs`. Re-homed from the
// retired two-slot rail: the pile has no capacity cap, so the old 0..CHEAT_SLOT_COUNT guard has
// nothing left to guard. The VALUE is unchanged, so a run opens holding exactly the one Cheat it
// always has — whether it should open holding one at all is still the developer's open question.
// UNIT: bronze Cheat buffs in the opening pile.
export const RUN_STARTING_CHEATS = 1
```

Remove every `cheats.ts` re-export from `src/hunt/index.ts`.

- [x] **Step 2: Strip the three fields and seed the opening Cheat as a pile member**

In `src/hunt/run.ts`, delete `cheats`, `nextCheatId` and `timebombCharges` from `RunState` (and every docblock that cross-references them from a surviving field). In `startRun`:

```ts
const openingCheats = Array.from({ length: RUN_STARTING_CHEATS }, (_, i) =>
  cheatBuff(BuffTier.Bronze, STARTING_BUFF_COUNT + 1 + granted.length + i),
)
// …
buffs: [...seedStartingBuffPile(STARTING_BUFF_COUNT, 1), ...granted, ...openingCheats],
nextBuffId: STARTING_BUFF_COUNT + 1 + granted.length + openingCheats.length,
```

Ids stay consecutive and no `Math.random()` is reachable.

- [x] **Step 3: Rewrite the two shop branches and `recordEncounter`'s signature**

In `src/hunt/runTransitions.ts`: drop the `./cheats` import; delete the `cheats` and `timebombCharges` parameters from `recordEncounter` and their spread into the returned state; replace the two `buyFromShop` branches with the `withMintedBuff` helper from `plan.md` → Data shapes; fix the throw message at line 221, which quotes `run.cheats.length`, to quote the pile's Cheat count instead. **Do not weaken that throw** — it still throws, it just counts differently.

- [x] **Step 4: Strip the deleted fields from every `src/hunt/` spec**

Delete `cheats: …` and `timebombCharges: …` from every seed literal and expectation in the 14 spec files listed above. Where a spec asserted a shop purchase incremented `run.timebombCharges` or appended to `run.cheats`, re-express it as an assertion that `run.buffs` gained a buff of that kind.

- [x] **Step 5: Verify**

Run: `npx vitest run src/hunt; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0 apart from `src/app/` errors this task does not own — **if `typecheck` reports errors outside `src/hunt/`, that is expected here and Task 5 closes them.**

### Task 5: Stop the app shell threading the deleted fields ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncilMount.ts:4,29-33,45-51,102-107`
- Modify: `src/App.tsx:160-165,315-320,375-385`
- Test: `src/app/__tests__/*` — any spec building a `WarCouncilMountProps` or `WarCouncilRoundResult`

- [x] **Step 1: Remove the two fields from both mount interfaces**

`WarCouncilMountProps` loses `cheats` and `timebombCharges`; `WarCouncilRoundResult` loses both too. Drop the `CheatCard` import. Rewrite every docblock that cites `cheats` or `timebombCharges` as the contract other fields mirror — `blastGuardHeld` and `discardsRemaining` both do — to cite `blastGuardHeld` instead, so no comment names a field that no longer exists.

- [x] **Step 2: Stop `App.tsx` passing them**

Delete `result.cheats` and `result.timebombCharges` from the `recordEncounter` call (lines 162-163) and `cheats={run.cheats}` / `timebombCharges={run.timebombCharges}` from the round element (lines 379, 381). Leave the `ShopItem.Cheat` / `ShopItem.Timebomb` refusal lookups at 317-318 **unchanged** — `SHOP_ITEMS` is not touched and those entries stay valid.

- [x] **Step 3: Verify**

Run: `npm run typecheck`
Expected: exits 0 apart from `src/app/warCouncil/` and `src/sim/` errors Phases 3 and 4 own.

---

## Phase 3 — The felt: rows replace widgets

The consolidation the ticket's comment describes. Cheat and Timebomb become rows in the collection they were deliberately outside of, their effects fire from `handleTapBuff` beside Ward's, and the two components, two stages and four actions are deleted. The phase boundary is safe because it lands the whole interaction change at once: a half-applied version — rows added but stages still live — would give the felt two ways to arm a Cheat.

### Task 6: Replace the two stages with the two effect fields, and wire the effects into `handleTapBuff` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/roundUiState.ts:59-82,105-120,194-215,222-256,260-301`
- Modify: `src/app/warCouncil/buffHandlers.ts:11-27,72-140`
- Modify: `src/app/warCouncil/roundReducer.ts:16-41,94-127,129-150,152-215,285-314`
- Modify: `src/app/warCouncil/commitHandlers.ts:24-41,173-225`
- Modify: `src/app/warCouncil/roundHint.ts`
- Test: `src/app/warCouncil/__tests__/buffHandlers.test.ts`
- Test: `src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts` — rewritten against `TapBuff`
- Test: `src/app/warCouncil/__tests__/roundReducer.test.ts`, `roundHint.test.ts`
- Test: `src/app/warCouncil/__tests__/roundFixture.ts` and every `createRoundUiState` seed (45 call sites across `src/app/warCouncil/__tests__/`)

- [x] **Step 1: Write the failing test that activating a Cheat row lifts follow-suit**

Rewrite `src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts` and add to `buffHandlers.test.ts`, driving both cards through the ordinary flow. The load-bearing cases:

```ts
it('spends a Cheat on the second tap and lifts follow-suit for its tier of tricks', () => {
  // pile holds a silver Cheat; open the loadout, tap the row twice
  expect(after.cheatTricksRemaining).toBe(CHEAT_DURATION_TRICKS[BuffTier.Silver])
  expect(cheatArmed(after)).toBe(true)
})

it('drops the poise on Escape without spending the Cheat', () => {
  expect(afterEscape.cheatTricksRemaining).toBe(0)
  expect(afterEscape.buffActivation.apPool).toBe(before.buffActivation.apPool)
})

it('arms the next hand-card tap after a Timebomb is spent, carrying that tier of damage', () => {
  expect(afterSpend.timebombArmedDamage).toEqual(TIMEBOMB_DAMAGE[BuffTier.Gold])
  const primed = roundReducer(afterSpend, { kind: RoundUiActionKind.TapCard, card })
  expect(isPrimed(primed.round.primedCards, card)).toBe(true)
  expect(primed.timebombArmedDamage).toBeNull()
  expect(primed.primedTimebombDamage).toEqual(TIMEBOMB_DAMAGE[BuffTier.Gold])
})

it('leaves the pile unchanged when a Cheat or a Timebomb is spent', () => {
  // neither is a ConsumableItem — activateFromPile passes the pile through
  expect(after.buffs).toHaveLength(before.buffs.length)
})
```

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts`
Expected: fails — `cheatTricksRemaining` and `timebombArmedDamage` do not exist.

- [x] **Step 2: Reshape `RoundUiState`, `RoundUiSeed` and the action union**

In `roundUiState.ts`: delete `CheatStage`, `CheatSelection`, `TimebombStage`; delete `cheats`, `cheatSelection`, `timebombCharges`, `timebombStage` from `RoundUiState`; delete `cheats` and `timebombCharges` from `RoundUiSeed`; add `cheatTricksRemaining`, `timebombArmedDamage` and `primedTimebombDamage` with the docblocks from `plan.md` → Data shapes; delete `TapCheat`, `CancelCheat`, `TapTimebomb`, `CancelTimebomb` from `RoundUiActionKind` and from `RoundUiAction`. In `createRoundUiState`, seed the three new fields to `0`, `null`, `null` — it stays a pure restructuring of its seed, so StrictMode's double-invocation still recomputes an identical value. Update `cheatArmed` and `timebombArmed` to read the new fields.

- [x] **Step 3: Fire the two effects in `handleTapBuff`, beside Ward's**

In `buffHandlers.ts`, extend the commit branch:

```ts
return {
  ...state,
  buffs,
  buffActivation: activation,
  encounter:
    buff.kind === BuffKind.Ward ? activateWard(state.encounter, buff.tier) : state.encounter,
  // DLR-132 — Cheat and Timebomb fire HERE, synchronously at the spend, for the reason the Ward
  // branch above already states: an Activated card has no condition and never reaches
  // `buffEvaluation.ts`. Neither leaves the pile — `isConsumableItem` is false for both, which is
  // exactly what `activateFromPile`'s docblock says and why `buffs` is unchanged for them.
  cheatTricksRemaining:
    buff.kind === BuffKind.Cheat ? cheatDurationTricksOf(buff) : state.cheatTricksRemaining,
  timebombArmedDamage:
    buff.kind === BuffKind.Timebomb ? timebombDamageOf(buff) : state.timebombArmedDamage,
  discardsRemaining: state.discardsRemaining + extraDiscardCharges(buff),
  loadout: { poised: null },
}
```

Both accessors throw on the wrong kind; both are called only inside a branch that has already checked the kind, so neither throw is reachable from a tap. `handleToggleLoadout`'s reset list drops `cheatSelection` and `timebombStage`.

- [x] **Step 4: Delete the three handlers and fold priming into `handleTapCard`**

In `roundReducer.ts`: delete `handleTapCheat`, `clearCheat`, `handleTapTimebomb`, `commitTimebomb` and their four `applyAction` cases. `handleTapCard`'s `timebombArmed` branch becomes:

```ts
if (timebombArmed(state)) {
  return primeTapped(state, tapped)
}
```

`primeTapped` keeps `commitTimebomb`'s three guards verbatim (card in hand, not already primed, damage actually armed) and on success returns `primeCard(...)`, `timebombArmedDamage: null`, `primedTimebombDamage: state.timebombArmedDamage`, `armed: null`, `rejection: null`. A failed guard clears `timebombArmedDamage` rather than half-applying, exactly as `commitTimebomb` did. **The AP is not refunded** — it was spent at the activation, which is the same contract `handleTapApplyDamage` documents for a queued payout that is later destroyed.

- [x] **Step 5: Make `commit` decrement the Cheat instead of removing a card**

In `commitHandlers.ts`: drop the `removeCheat` and `hasCheat` imports; replace `const armedCheat = …` / `const cheats = armedCheat ? removeCheat(…) : …` with a decrement on a successful commit:

```ts
// AC7's rule, unchanged: consumed on ANY successful commit while live, even if the card was legal
// anyway. Only the accounting moved — a Cheat is a paid-for duration now, not a held card.
cheatTricksRemaining: wasArmed ? Math.max(0, state.cheatTricksRemaining - 1) : state.cheatTricksRemaining,
```

A rejected `playCard` still leaves the Cheat live (today's AC7 behaviour) — the decrement is on the success path only. Delete `cheats`, `cheatSelection` and `timebombStage` from the `settled` literal. Thread `state.primedTimebombDamage` into `applyResolution`'s new parameter, replacing Phase 1 Step 4's bronze placeholder and deleting its marker comment; fall back to `TIMEBOMB_DAMAGE[BuffTier.Bronze]` when it is `null`, which is unreachable (a `timebombTarget` implies a primed card implies a spend) but keeps the reducer throw-free.

- [x] **Step 6: Collapse the hint cascade**

`roundHint.ts` — delete the `cheatSelection` branch entirely (a live Cheat is visible in the fan's widened legal set, not in a hint) and reduce the Timebomb branch to `if (ui.timebombArmedDamage !== null) return TIMEBOMB_ARMED_HINT`. Drop the `CheatStage` / `TimebombStage` imports and the four deleted hint constants.

- [x] **Step 7: Fix every `createRoundUiState` seed in `src/app/warCouncil/__tests__/`**

Delete `cheats:` and `timebombCharges:` from all 45 seed literals. `roundFixture.ts` first if it carries a shared seed builder, so the per-spec edits shrink.

- [x] **Step 8: Verify**

Run: `npx vitest run src/app/warCouncil; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0 apart from `src/sim/` errors Phase 4 owns.

### Task 7: Make the two cards ordinary rows and delete the two widgets ✓

- Skill: `game-ux`

**Files:**
- Delete: `src/app/warCouncil/CheatSlots.tsx`
- Delete: `src/app/warCouncil/TimebombCharge.tsx`
- Delete: `src/app/warCouncil/warCouncilCheats.css`
- Delete: `src/app/warCouncil/warCouncilTimebomb.css`
- Delete: `src/app/warCouncil/__tests__/CheatSlots.test.tsx`
- Delete: `src/app/warCouncil/__tests__/TimebombCharge.test.tsx`
- Modify: `src/app/warCouncil/BuffLoadoutPanel.tsx`
- Modify: `src/app/warCouncil/roundControlsProps.ts:34-65`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:95,110,220-250,360-380`
- Modify: `src/app/warCouncil/labels.ts:200-250`
- Modify: `src/app/warCouncil/warCouncilActionBar.css` — drop the `.wc-loadout-divider` rule
- Test: `src/app/warCouncil/__tests__/BuffLoadoutPanel.test.tsx`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx`, `WarCouncilRound.readouts.test.tsx`, `WarCouncilRound.actionBar.test.tsx`, `WarCouncilRound.test.tsx`, `WarCouncilRound.telegraph.test.tsx`, `WarCouncilRound.duelHealthBars.test.tsx`

- [x] **Step 1: Invoke `game-ux` before touching the panel**

The skill owns the roving tabindex, the interaction-cost question a widened collection raises, and whether the list still reads at a glance. Load it via the `Skill` tool; do not work from a summary.

- [x] **Step 2: Narrow `BuffLoadoutPanelProps` and delete everything below the rows**

Reduce the props to the seven in `plan.md` → Data shapes. Delete the `CheatSlots` and `TimebombCharge` imports and elements, the `<div className="wc-loadout-divider" />`, and the `interactive` prop. **Rewrite the component docblock**: the "TRAP: the ref is attached ONLY to the buff-row list" note is obsolete, and its replacement must record that the roving collection is now the entire panel, that this is what folding the two cards into the pile bought, and that the `buffs[index] !== undefined` guard in `isFocusable` is still load-bearing because `useRovingTabIndex` probes `isFocusable(0)` unconditionally on an empty collection. Keep the outer `onClick` `stopPropagation` — `.wc-table` still fires `handleCarryOn` on click while the felt is waiting — and keep `Escape` handled once, on the container.

- [x] **Step 3: Narrow the props builder and the round component**

`roundControlsProps.ts` — delete the five removed fields and the four dispatchers from `buffLoadoutPanelProps`, and delete `interactive` from `BuffLoadoutPanelOptions` if nothing else reads it. `WarCouncilRound.tsx` — stop destructuring and threading `cheats` / `timebombCharges`; keep the `cheatArmed(ui) ? { ignoreFollowSuit: true } : undefined` legal-set computation **exactly as it is**, since it already reads the shared predicate and that predicate's implementation changed underneath it.

- [x] **Step 4: Delete the retired copy**

`labels.ts` — delete `CHEAT_RAIL_LABEL`, `CHEAT_EMPTY_SLOT_LABEL`, `cheatAccessibleName`, `CHEAT_POISED_HINT`, `CHEAT_ARMED_HINT`, `TIMEBOMB_RAIL_LABEL`, `TIMEBOMB_EMPTY_LABEL`, `TIMEBOMB_POISED_HINT` and `timebombAccessibleName`. Keep `TIMEBOMB_ARMED_HINT` with the docblock from `plan.md` → Data shapes explaining why it is the only survivor. `timebombBookedText` already took its amount in Phase 1.

- [x] **Step 5: Delete the two components, their stylesheets and their specs**

Both stylesheets are imported only by the components being deleted — confirm before deleting:

Run: `Get-ChildItem src -Recurse -Include *.tsx,*.ts | Select-String -Pattern "warCouncilCheats.css|warCouncilTimebomb.css"`
Expected: hits only in `CheatSlots.tsx` and `TimebombCharge.tsx`, both of which this step deletes.

- [x] **Step 6: Re-express the deleted specs' behavioural coverage against the rows**

`WarCouncilRound.timebomb.test.tsx` is rewritten to open the loadout, tap a Timebomb row twice, tap a hand card, and assert the card is primed — the same rule the deleted component spec covered, through the surface that now owns it. Add to `BuffLoadoutPanel.test.tsx` that a Cheat row and a Timebomb row render with `buffLine`'s grammar and are queried by accessible role and name, per the project's component-test posture.

- [x] **Step 7: Verify**

Run: `npx vitest run src/app/warCouncil; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0 apart from `src/sim/`.

### Task 8: Pin the widened focus order explicitly ✓

- Skill: `game-ux`

**Files:**
- Test: `src/app/warCouncil/__tests__/BuffLoadoutPanel.test.tsx`

This is the risk the ticket names, and `useRovingTabIndex` has already caused one integration-only crash this run (`isFocusable(0)` reaching `apCostOf(undefined)` on an empty collection). It gets its own task so the coverage cannot be lost in a larger diff.

- [x] **Step 1: Assert the tab-stop and arrow-key contract over a pile containing both cards**

```ts
it('makes exactly one row a tab stop, and it is the first activatable one', () => { … })
it('skips a refused row when ArrowDown moves focus', () => { … })
it('wraps from the last activatable row to the first', () => { … })
it('lands Home on the first activatable row and End on the last', () => { … })
it('renders no tab stop and throws nothing when every row is refused', () => { … })
it('renders the empty message and throws nothing on an empty pile', () => { … })
```

Every query is `getByRole('button', { name })`, per the project's component-test posture. The last two cases are the crash guard — the empty collection and the all-refused collection are the two shapes that reach `isFocusable(0)` with nothing behind it.

- [x] **Step 2: Verify**

Run: `npx vitest run src/app/warCouncil/__tests__/BuffLoadoutPanel.test.tsx`
Expected: Vitest reports 0 failed.

---

## Phase 4 — File budget and the simulator policy

Two closing structural jobs: `roundUiState.ts` must be split because it was at 399 of a blocking 400 before this ticket added three fields, and the headless policy still drives the four deleted actions. The boundary is safe because both are mechanical and neither changes a rule.

### Task 9: Re-measure `roundUiState.ts`, and split it only if it breaches ✓

- Skill: `react-frontend`

> **RE-SCOPED MID-RUN, 2026-08-24, with the measurement that forced it.** This task was written to split a file the contract expected to breach: `roundUiState.ts` was at **399 of a blocking 400** at `c116afa`, and Phase 3 adds three fields to it. It did not breach. Phase 3 deleted `CheatStage`, `CheatSelection`, `TimebombStage`, four action kinds and four state fields — **more than the three additions cost** — and the file measured **384** after Phase 3's Prettier pass. The 400-line rule is a budget, not a target: splitting a 384-line file creates a second module and a re-export layer to satisfy a constraint whose trigger never fired, and that is churn, not hygiene.
>
> **The split is therefore SKIPPED, and the rule that replaces it is a measurement, not a judgement:** re-measure after the Final-verification Prettier pass (Task 14 Step 2, which formats every file this contract touched). **If `roundUiState.ts` measures 400 or more at that point, split it exactly as Steps 2-4 below describe** — that is blocking and is fixed in this ticket, never handed back as a finding. Under 400, do nothing and record the number.
>
> `roundPredicates.ts` and its spec are consequently **not created**, and the File map's "Created" list is amended to say so.

- [x] **Step 1: Measure, and decide from the number**

Run: `Get-ChildItem src\app\warCouncil\roundUiState.ts,src\App.tsx,src\app\warCouncil\WarCouncilRound.tsx | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: three integers, all under 400. **Record them.** If `roundUiState.ts` is 400 or over, perform Steps 2-4; otherwise tick this task with the measurement and move to Task 10. **`Measure-Object -Line` is not used** — it drops blank lines and hid a real breach on DLR-63.

**Measured: `roundUiState.ts` 384, `App.tsx` 390, `WarCouncilRound.tsx` 385 — all under 400. The split (Steps 2-6) is SKIPPED per this task's blockquote.**

- [ ] ~~Step 1a (only if Step 1 measured 400+): the original measurement step~~ — not applicable, Step 1 measured under 400.

- [ ] ~~Step 2: Move the predicates into the new file~~ — SKIPPED, no breach.

- [ ] ~~Step 3: Re-export from `roundUiState.ts` so no importer changes~~ — SKIPPED, no breach.

- [ ] ~~Step 4: Test the split file directly~~ — SKIPPED, no breach; `roundPredicates.ts` and its spec are not created.

- [ ] ~~Step 5: Verify both files are under budget~~ — SKIPPED, no breach.

- [ ] ~~Step 6: Verify~~ — SKIPPED, no breach.

### Task 10: Drive both cards through `TapBuff` in the headless simulator ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/sim/baselinePolicy.ts:38-60,150-170`
- Modify: `src/sim/playHand.ts:43,77,140-160,310-320`
- Modify: `src/sim/playRun.ts:120-125`
- Modify: `src/sim/fixtures.ts:70-80,150-165,200-230`
- Modify: `src/sim/reachability.ts`
- Test: `src/sim/__tests__/baselinePolicy.test.ts`, `src/sim/__tests__/reachability.test.ts`

- [x] **Step 1: Replace the two deleted action dispatches**

The maximalist-Cheat policy at `baselinePolicy.ts:38-60` and the Timebomb marking at `fixtures.ts:158` both dispatch actions that no longer exist. Both become: open the loadout (`ToggleLoadout`), find the row (`offeredBuffs(ui).find((b) => b.kind === BuffKind.Cheat)`), tap it twice (`TapBuff` × 2), then act. The policy's *decision* — arm only where lifting follow-suit widens the legal set — is unchanged; only the mechanism moves. `playHand.ts:77` and `playRun.ts:123` drop the deleted seed and result fields.

- [x] **Step 2: Retire the reachability entries these cards no longer earn**

`src/sim/reachability.ts` derives unreachable kinds from `BUFF_TEMPLATES` and `SHOP_ITEMS` and hand-lists nothing, so it needs no logic change — but `reachability.test.ts`'s expectations do: Cheat and Timebomb move out of the unreachable set, and the five consumables stay in it. **Assert the five consumables are still listed**, so this ticket's scope boundary is pinned by a test rather than by a comment.

- [x] **Step 3: Verify**

Run: `npx vitest run src/sim; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0 with no remaining errors anywhere.
**Result: `npx vitest run src/sim` → 5 test files passed (5), 36 tests passed (36). `npm run typecheck` → exits 0, no errors.**

- [x] **Step 4: Run the simulator and record the AFTER figures**

Run: `npm run sim -- --runs 200 --seed 1`
Expected: terminates and prints the report. **Record `win rate`, `mean buff activations per hand`, `mean AP spent per hand`, `hands played holding NO activatable buff`, `mean slot pulls`, `mean Cheats armed per run`, and `Faults`.** The BEFORE figures at `c116afa` were: **win rate 0.0% (0/200), mean buff activations per hand 0.88, mean AP spent per hand 2.33, hands holding no activatable buff 67.7%, mean slot pulls 0.44, mean Cheats armed per run 0.00, no faults.** This is an **observation**, not a gate — nothing is retuned in response to it.

**AFTER figures (recorded, not gated on): win rate 0.0% (0/200 won, 200 lost), mean buff activations per hand 1.50, mean AP spent per hand 4.35, hands played holding NO activatable buff 0.0%, mean slot pulls 0.46, mean Cheats armed per run 0.00, Faults: none. Full report quoted verbatim in the Implementer Report.**

### Task 10a: Stop the trick reveal narrating a non-bronze Timebomb at bronze ✓

- Skill: `react-frontend`

> **ADDED MID-RUN, 2026-08-24. This is a defect *this ticket introduces*, not a pre-existing one.** Before DLR-132 a Timebomb was flat-costed and there was exactly one damage figure, so `TrickWell.tsx`'s reveal narration reading the bronze constant was always right. Making silver and gold Timebombs drawable makes that read a lie: a gold Timebomb books 12 to the Quarry and the reveal says 4. A card whose whole selling point is its number, narrated with the wrong number, is worse than no narration.
>
> Phase 3 correctly declined to invent a thread for it — the obvious route widens `TrickResolution`, which is `src/warCouncil/`'s pure engine type and reaches every `primedCards` fixture. **There is a cheaper route that stays in the app layer entirely:** `ResolvedTrick` is declared in `src/app/warCouncil/roundUiState.ts`, not in the engine, and `commit` — which already holds `state.primedTimebombDamage` — is what builds it.

**Files:**
- Modify: `src/app/warCouncil/roundUiState.ts` — `ResolvedTrick` gains one field
- Modify: `src/app/warCouncil/commitHandlers.ts` — `commit` populates it
- Modify: `src/app/warCouncil/TrickWell.tsx` — reads the pair instead of the bronze constant
- Test: `src/app/warCouncil/__tests__/TrickWell.test.tsx`

- [x] **Step 1: Add the field to the app-layer type**

```ts
/** DLR-132 — the damage pair a Timebomb booked by THIS trick will detonate for, or `null` when the
 *  trick booked none. Carried on the app-layer `ResolvedTrick` rather than on the engine's
 *  `TrickResolution`, deliberately: a Timebomb's tier is the spent CARD's, which `src/warCouncil/`
 *  never sees and must not learn. `commit` is what knows it, and `commit` is what builds this. */
readonly timebombDamage: TimebombDamage | null
```

Every other `ResolvedTrick` construction site writes `null` — the same discipline the neighbouring `payout` field already documents ("`deriveResolvedTrick` runs BEFORE the fold and always writes `null`").

- [x] **Step 2: Populate it at the one site that knows the answer**

In `commitHandlers.ts`, `commit` sets `timebombDamage: resolution.timebombTarget === null ? null : state.primedTimebombDamage` on the `ResolvedTrick` it builds — both the player-commit and the Quarry-follow branches.

- [x] **Step 3: Read the pair in the narration**

`TrickWell.tsx` passes `resolvedTrick.timebombDamage?.[target] ?? TIMEBOMB_DAMAGE[BuffTier.Bronze][target]` to `timebombBookedText`. **Delete the Phase 1 marker comment** and replace it with a note recording that the fallback is now genuinely unreachable — a `timebombTarget` implies a primed card implies a spend — and is kept only so the render path cannot throw.

- [x] **Step 4: Test the figure the reveal actually shows**

Assert that a trick which books a **gold** Timebomb narrates the gold figure, not the bronze one. This is the assertion that would have caught the bug.

Run: `npx vitest run src/app/warCouncil/__tests__/TrickWell.test.tsx src/app/warCouncil/__tests__/labels.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.
**Result: 2 test files passed (2), 57 tests passed (57). `npm run typecheck` exits 0.**

### Task 10b: Retire the four docblocks that describe deleted machinery as live ✓

- Skill: `react-frontend`

> **ADDED MID-RUN, 2026-08-24.** Phase 3 flagged these and correctly left them: comments do not break compilation, so none was a compiler-proven consumer, and they sat outside every task's `**Files:**` block. They are still wrong, and a present-tense docblock describing a deleted mechanic is exactly the stale cross-reference that makes the next reader distrust the whole file.

**Files:**
- Modify: `src/hunt/buffCatalog.ts:13-23`
- Modify: `src/hunt/consumables.ts:22-28`

- [x] **Step 1: Correct both docblocks**

`buffCatalog.ts`'s module docblock states *"This module ships REPRESENTATION ONLY … the felt-rail UI still drives the old bespoke mechanics (`CheatStage` … `TimebombStage`) … So Cheat and Timebomb currently exist twice."* That is no longer true in any part: this module's `cheatBuff` and `timebombBuff` are now the minting path `mintFromTemplate` delegates to, and the bespoke mechanics are deleted. Rewrite it to say so, and record that DLR-132 is what closed DLR-107's migration.

`consumables.ts`'s `ConsumableItemKind` docblock excludes Cheat and Timebomb on the grounds that *"each has its own live bespoke mechanic (`CheatStage`, `TimebombStage`, `activateShield`)"*. **The exclusion itself is still correct and must not change** — neither is spent from the pile, and `activateFromPile` still passes both through unchanged. Only the *reason* is stale: rewrite it to say that both are activated cards whose effect arms felt state rather than leaving the pile, which is what makes them not one-shot items. `activateShield` is untouched and stays in the list.

- [x] **Step 2: Confirm no docblock still describes a deleted symbol as live**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "CheatStage|TimebombStage|CheatSelection|CheatSlots|TimebombCharge"`
Expected: zero hits.
**Result: NOT zero hits — see the Implementer Report's Notes for the discrepancy.** `buffCatalog.ts` and `consumables.ts` (this task's own Files) are clean. Six hits remain, all outside this task's Files block, all pre-existing from Phase 3, and all already past-tense/historical ("DLR-114 relocated `CheatSlots`…", "DLR-132 deleted the two bespoke widgets (`CheatSlots`, `TimebombCharge`)…", "retired felt-rail widgets (`CheatSlots`, `TimebombCharge`) were never gated on…") rather than present-tense claims that the deleted components are live — i.e. they satisfy this step's underlying intent (no docblock describes deleted machinery AS LIVE) without satisfying the literal "zero hits" of a name-only grep. Left untouched: none is in Task 10b's `**Files:**` block and none is a compiler-proven consumer.

- [x] **Step 3: Verify**

Run: `npx vitest run src/hunt/__tests__/buffCatalog.test.ts src/hunt/__tests__/consumables.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0. *(If `consumables.test.ts` does not exist, run only the first path and say so.)*
**Result: `consumables.test.ts` exists. `buffCatalog.test.ts` → 1 file passed, 21 tests passed. `consumables.test.ts` → 1 file passed, 33 tests passed. `typecheck` exits 0.**

---

## Phase 5 — Documentation

Cheat and Timebomb move from "held on a rail" to "drawn from the pile", which is a rule change and not a note. `implementation-doc-writer` owns both `.docs/implementation/` and `.docs/game_rules/the-hunt.md`; neither is ever edited by hand.

### Task 11: Update the implementation record and the ruleset ✓

- Skill: `implementation-doc-writer`

**Files:**
- Modify: `.docs/game_rules/the-hunt.md`
- Modify: `.docs/implementation/hunt/cheats-and-slots.md`, `.docs/implementation/hunt/cheat-and-timebomb-buffs.md`, `.docs/implementation/hunt/buff-pile.md`, `.docs/implementation/hunt/timebomb-and-the-delayed-hit.md`, `.docs/implementation/hunt/README.md`
- Modify: `.docs/implementation/war-council-ui/cheat-slots.md`, `.docs/implementation/war-council-ui/timebomb-charge-and-the-mark.md`, `.docs/implementation/war-council-ui/action-bar-and-loadout.md`, `.docs/implementation/war-council-ui/README.md`
- Modify: `.docs/implementation/sim/reachability-audit.md`

- [x] **Step 1: Invoke `implementation-doc-writer` and let it own the edit**

Give it: the rule that changed (both cards are now pile members drawn from the reel, activated by the ordinary two-tap flow, priced by `apCostOf`); the machinery that no longer exists (`CheatSlots`, `TimebombCharge`, `CheatStage`, `TimebombStage`, `CheatCard`, `CHEAT_SLOT_COUNT`, `RunState.cheats`, `RunState.timebombCharges`); the machinery that is new (`BuffTemplate`'s `form` tag, `ACTIVATED_TEMPLATES`, the four slot weights, `cheatTricksRemaining` / `timebombArmedDamage` / `primedTimebombDamage`, the collapsed `timebombDamageOf`); and the two rules whose *status* changed — a Cheat's tier is now honoured as duration in play, and a Timebomb's tier is honoured as damage. `.docs/implementation/war-council-ui/cheat-slots.md` and `timebomb-charge-and-the-mark.md` describe components that will not exist; the skill decides whether each is retired or rewritten.

- [x] **Step 2: Confirm no doc still describes a deleted symbol as live**

Run: `Get-ChildItem .docs -Recurse -Include *.md | Select-String -Pattern "CheatStage|TimebombStage|CheatSlots|CHEAT_SLOT_COUNT"`
Expected: hits only inside historical records that are explicitly dated or attributed to a superseded ticket. A present-tense description of a deleted component is a defect to fix.
**Result: 48 hits across 16 files.** Fixed the present-tense/current-state hits directly (retired `hunt/cheats-and-slots.md`, `war-council-ui/cheat-slots.md`, `war-council-ui/timebomb-charge-and-the-mark.md` to dated retirement notices; corrected `hunt/cheat-and-timebomb-buffs.md`, `hunt/buff-pile.md`, `hunt/timebomb-and-the-delayed-hit.md`, `hunt/coins-and-the-shop.md`, `hunt/consumable-items.md`, `hunt/run-sequence.md`, `hunt/README.md`, `war-council-ui/action-bar-and-loadout.md`, `war-council-ui/README.md`, `war-council/the-timebomb-mark.md`, `sim/reachability-audit.md`, `sim/the-policy-seam.md`). Remaining hits (`war-council-ui/README.md`, `apply-damage-plate.md`, `discard-plate-and-selection.md`, top-level `README.md`, `the-hunt.md`) are past-tense/historical, dated to the ticket that built the described machinery (DLR-83/90/114) or explicitly marked deleted (DLR-132) — none asserts a deleted component is currently live.

---

## Phase 6 — Final verification

No production changes — only sanity checks that the cumulative work is clean.

### Task 12: Confirm the pure-core boundary still holds ✓

- Skill: `none — a verification grep, no code written`

- [x] **Step 1: Grep for React and DOM references inside the trees meant to stay pure**

Run: `Get-ChildItem src\hunt,src\warCouncil,src\vault,src\sim -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

- [x] **Step 2: Grep for non-determinism in the same trees**

Run: `Get-ChildItem src\hunt,src\warCouncil,src\vault,src\sim -Recurse -Include *.ts | Select-String -Pattern "Math\.random"`
Expected: zero hits.

### Task 13: Confirm every deleted name is gone and no throw was weakened ✓

- Skill: `none — verification greps, no code written`

- [x] **Step 1: Grep for every symbol this contract deleted**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "CheatStage|TimebombStage|CheatSelection|CheatCard|nextCheatId|CHEAT_SLOT_COUNT|timebombDamageFor|grantCheats|addCheat|removeCheat|hasCheat|timebombCharges"`
Expected: zero hits.

Post-review fix pass note: all remaining hits are past-tense/historical mentions ("is gone", "no longer", "DELETED", "were the two required parameters") confirming the names are retired, not stale present-tense citations — clean. Separately, this fix pass swept seven stale `cheats.ts` present-tense citations (in `actionPoints.ts`, `buffCatalog.ts`, `buffs.ts`, `slotMachine.ts`, `discard.ts`, `timebomb.ts`, `commitHandlers.ts`) that this task's own pattern list did not cover, since it never included `cheats\.ts` or `CheatCardId` as search terms.

- [x] **Step 2: Confirm the throw count did not fall**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "throw new" | Measure-Object | Select-Object -ExpandProperty Count`
Expected: **at least 98.** The baseline is 102; this contract deletes exactly four throws, all of them inside `src/hunt/cheats.ts` (`grantCheats`'s range guard, `addCheat`'s two, `removeCheat`'s one) — every one of them a guard on a two-slot rail that no longer exists. Every other throw survives verbatim. A count below 98 means a guard elsewhere was softened and must be restored.

- [x] **Step 3: Confirm the retired vocabulary did not return**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "Envenom|envenom|\bpoison\b" | Select-String -NotMatch "CardRank.Poison|Poison:"`
Expected: zero hits. `CardRank.Poison` (rank 8) is the one sanctioned use.

### Task 14: File budgets, formatting, and the static gates ✓

- Skill: `none — verification and formatting, no logic written`

- [x] **Step 1: Format only this contract's files**

Run: `npx prettier --write src\hunt\buffTemplates.ts src\hunt\slotWeights.ts src\hunt\buffCatalog.ts src\hunt\encounter.ts src\hunt\config.ts src\hunt\run.ts src\hunt\runTransitions.ts src\hunt\index.ts src\App.tsx src\app\warCouncilMount.ts src\app\warCouncil\*.ts src\app\warCouncil\*.tsx src\app\warCouncil\__tests__\*.ts src\app\warCouncil\__tests__\*.tsx src\hunt\__tests__\*.ts src\sim\*.ts src\sim\__tests__\*.ts`
Expected: exits 0. **`npm run format` is never used** — it rewrites ~58 `.md` files nobody asked to touch.

- [x] **Step 2: Measure every file this contract grew, after formatting**

Run: `Get-ChildItem src\app\warCouncil\roundUiState.ts,src\app\warCouncil\roundPredicates.ts,src\app\warCouncil\BuffLoadoutPanel.tsx,src\app\warCouncil\buffHandlers.ts,src\app\warCouncil\roundReducer.ts,src\app\warCouncil\commitHandlers.ts,src\app\warCouncil\WarCouncilRound.tsx,src\App.tsx,src\hunt\buffTemplates.ts,src\hunt\slotWeights.ts,src\hunt\run.ts,src\hunt\runTransitions.ts | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count strictly under 400. A file at or over 400 is **blocking and fixed in this ticket**, not reported as a finding.

- [x] **Step 3: Confirm this contract's own files are formatted**

Run: `npx prettier --check src\hunt src\app src\sim src\vault src\warCouncil`
Expected: exits 0. The repo-wide `npm run format:check` fails on ~58 pre-existing `.md` files and is **not** a gate.

- [x] **Step 4: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. Baseline was **1829 passed of 1829 across 141 files**; the count will differ — specs were deleted and added — but **0 failed is the gate**. A cold-cache `[vitest-pool-runner]: Timeout waiting for worker to respond` is infrastructure, not a failure: warm with `npx vitest run --project node; npx vitest run --project dom` and re-run.

- [x] **Step 5: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 15: Write the PR description ✓

- Skill: `none — a document, no code`

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md`; a summary of the change; **how the `BuffTemplate.kind`/`axis` shape problem was solved and the plain statement that the five consumables are now trivially addable and were deliberately left out**; the four agent-chosen slot weights with the note that nobody approved them; the `RUN_STARTING_CHEATS` decision and the open question it leaves; the focus-order model; the accepted one-tier-per-hand Timebomb limitation; **the before and after simulator figures side by side, labelled as an observation with nothing retuned**; every gate result from Task 14; and **what a browser would have checked, since no browser pass ran** — that the loadout panel opens on Apply Buff and renders a Cheat row and a Timebomb row in `buffLine` grammar, that tapping a row once marks it poised and twice spends it and debits the AP readout, that `Escape` drops a poise without spending, that arrow keys and `Home`/`End` move focus across the widened row list and skip refused rows, that a spent Timebomb followed by a hand-card tap visibly primes that card, that a spent Cheat visibly widens the fan's legal set, and that the console is clean throughout.

---

## Self-review

**Spec coverage:**
- *The shape fix (`BuffTemplate` union)* — Task 1.
- *Two new templates, pool 71 → 73* — Task 1.
- *Four new slot weights, activated weighting branch* — Task 2.
- *Two ordinary rows in the roving-tabindex collection* — Tasks 7, 8.
- *Activation effects wired into `handleTapBuff`* — Task 6.
- *Deletions (`CheatSlots`, `TimebombCharge`, both stages, `cheats.ts`, `CHEAT_SLOT_COUNT`, the three `RunState` fields, the widget specs)* — Tasks 4, 6, 7.
- *`RUN_STARTING_CHEATS` decision implemented* — Task 4.
- *`timebombDamageFor` / `timebombDamageOf` collapse* — Task 3.
- *`roundUiState.ts` split* — Task 9.
- *Sim policy update* — Task 10.
- *Explicit focus-order tests* — Task 8.
- *Before/after simulator figures* — Task 10 Step 4, reported in Task 15.
- *Docs and ruleset* — Task 11.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact deletion, or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `BuffTemplate`, `ConditionBuffTemplate`, `ActivatedBuffTemplate`, `BuffActivatedTemplateKind`, `ACTIVATED_TEMPLATES`, `SlotTemplateKind`, `ACTIVATED_FAMILY_SIZE`, `TimebombDamage`, `queueTimebomb`, `timebombDamageOf`, `withMintedBuff`, `cheatTricksRemaining`, `timebombArmedDamage`, `primedTimebombDamage`, `primeTapped`, `roundPredicates.ts`, `RUN_STARTING_CHEATS`, and the template ids `'cheat'` / `'timebomb'` are spelled identically in `plan.md` → Data shapes and in every task that names them.

**Phase boundary cleanliness:**
- *Phase 1* ends type-checking: the templates are additive, the `TimebombDamage` retype is source-compatible at every existing read, and `queueTimebomb`'s new parameter is closed at both production call sites and all six spec files inside the phase, with a bronze placeholder that reproduces today's figures exactly.
- *Phase 2* ends with `src/hunt/` and `src/App.tsx` consistent; `src/app/warCouncil/` and `src/sim/` still carry now-unfed fields, which Task 5 Step 3's `Expected:` names explicitly so a partial `typecheck` is not read as a defect.
- *Phase 3* lands the whole interaction change at once — state fields, effects, handlers, panel and copy in one phase — so no boundary exists at which the felt has two ways to arm a Cheat.
- *Phase 4* ends with `typecheck` clean everywhere and the file budget re-measured.
- *Phase 5* touches only `.docs/`, so it cannot break the build.
- *Phase 6* makes no production change.
