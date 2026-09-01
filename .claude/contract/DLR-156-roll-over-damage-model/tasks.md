# Tasks: Roll-over damage — a per-trick pot the player cashes or pushes, on its own resolution screen

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-09-01

**Goal:** Replace `bank × multiplier` with a per-trick roll-over pot — each banked trick computes `(baseDamage + buffDamage) × buffMult` into a running `total` at a climbing `roll`, a hit wipes both and pays nothing, the streak crosses hand boundaries and dies only at a fight boundary — and move the cash-out off the action bar onto a second full-viewport resolution screen that derives the damage one term at a time and asks apply-or-roll.

**Spec:** `plan.md` in this folder. The design sources it cites — `spec.md`, `ui-notes.md`, `mockup.html` — are in this folder too.

---

## File map

**Created:**
- `src/warCouncil/streak.ts` — the renamed `bank.ts`: `StreakState`, `potValue`, `applyPot`, `resolveTrickBank`
- `src/app/warCouncil/resolutionBeats.ts` — pure derivation of the build-up's ordered beats
- `src/app/warCouncil/useBeatSequence.ts` — plays the beats on a timer; owns the reduced-motion branch
- `src/app/warCouncil/useCardFlight.ts` — the hand-to-table flight with three landing paths
- `src/app/warCouncil/TrickResolutionScreen.tsx` — the second full-viewport shell
- `src/app/warCouncil/ResolutionLedger.tsx` — the two-row fixed window that follows the newest term
- `src/app/warCouncil/WarCouncilTable.tsx` — the felt, extracted out of `WarCouncilRound.tsx`
- `src/app/warCouncil/resolutionLabels.ts` — the beats' and the prompt's wording
- `src/app/warCouncil/warCouncilResolve.css` — the resolution screen's stylesheet and its four PLACEHOLDER tokens
- `src/warCouncil/__tests__/streak.formula.test.ts`
- `src/hunt/__tests__/trickBonus.test.ts`
- `src/hunt/__tests__/run.streak.test.ts`
- `src/app/warCouncil/__tests__/resolutionBeats.test.ts`
- `src/app/warCouncil/__tests__/roundReducer.resolution.test.ts`
- `src/app/warCouncil/__tests__/useBeatSequence.test.tsx`
- `src/app/warCouncil/__tests__/useCardFlight.test.tsx`
- `src/app/warCouncil/__tests__/TrickResolutionScreen.test.tsx`
- `src/app/warCouncil/__tests__/ResolutionLedger.test.tsx`

**Modified:**
- `src/warCouncil/types.ts` — `RoundState.bank`/`multiplier` → `total`/`roll`
- `src/warCouncil/deal.ts` — seeds `total`/`roll`
- `src/warCouncil/playCard.ts` — threads `StreakState`, `baseDamageBonus`
- `src/warCouncil/voluntaryCashOut.ts` — reduced to `applyPot`'s crossing, then deleted
- `src/warCouncil/index.ts` — re-exports follow every rename and deletion
- `src/warCouncil/discard.ts` — refusal-code neighbour that names `ApplyDamageRefusal` in prose
- `src/hunt/config.ts` — adds `BASE_DAMAGE`; drops the forced-cash and apply-delay constants
- `src/hunt/apConfig.ts` — drops `APPLY_DAMAGE_*`
- `src/hunt/buffAccrual.ts` — adds `trickBonusFor`; drops the cash-out spend model
- `src/hunt/encounter.ts` — drops `pendingApplyPayout` and its two transitions
- `src/hunt/types.ts` — drops `EncounterState.pendingApplyPayout`
- `src/hunt/run.ts` — adds `RunState.streak`
- `src/hunt/runTransitions.ts` — adds `streakAfter` and `recordEncounter`'s ninth parameter
- `src/hunt/index.ts` — re-exports follow every addition and deletion
- `src/hunt/actionPoints.ts`, `src/hunt/buffActivation.ts`, `src/hunt/quickKill.ts` — drop apply-cost references
- `src/app/warCouncilMount.ts` — `streak` prop in, `streak` result field out
- `src/app/warCouncil/roundUiState.ts` — `resolution` field, the two new actions; drops the apply-damage stock
- `src/app/warCouncil/roundUiSeed.ts` — seeds `resolution: null` and the streak
- `src/app/warCouncil/roundReducer.ts` — `ApplyPot` / `RollOver`; drops the two apply actions
- `src/app/warCouncil/commitHandlers.ts` — builds the `ResolutionView`; drops the payout fold
- `src/app/warCouncil/roundResult.ts` — hands the streak back
- `src/app/warCouncil/WarCouncilRound.tsx` — becomes the two-screen switch
- `src/app/warCouncil/ActionBar.tsx`, `actionBarLabels.ts` — the Apply Damage plate goes
- `src/app/warCouncil/roundControlsProps.ts`, `roundHint.ts`, `labels.ts` — follow the removals
- `src/app/warCouncil/BankMeter.tsx`, `buffBreakdownModel.ts`, `cardDamage.ts`, `duelHealthBars.ts` — read `total`/`roll`
- `src/app/warCouncil/TrickWell.tsx` — drops the payout band
- `src/app/warCouncil/HandFan.tsx` — wires the flight
- `src/app/warCouncil/warCouncil.css`, `warCouncilHand.css` — the flight layer
- `src/App.tsx` — threads `run.streak` in and `result.streak` out
- `src/sim/playHand.ts`, `playHandWindows.ts`, `playRun.ts`, `types.ts`, `baselinePolicy.ts` — the simulator follows every engine change
- Every spec named in each task's `**Files:**` block

**Deleted:**
- `src/warCouncil/bank.ts` — renamed to `streak.ts`
- `src/warCouncil/voluntaryCashOut.ts` — `applyPot` and its damage crossing move into `streak.ts`; nothing else survives
- `src/hunt/applyDamagePayout.ts` — the delayed-payout queue, no caller left
- `src/app/warCouncil/payoutLabels.ts` — words for a queue that no longer exists
- `src/warCouncil/__tests__/voluntaryCashOut.test.ts`
- `src/hunt/__tests__/applyDamagePayout.test.ts`
- `src/app/warCouncil/__tests__/payoutLabels.test.ts`
- `src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts`

**Developer decides or observes:**
- `--wc-beat` — transcribed `520ms`. About three seconds a trick, six times a hand. `ui-notes.md` §7 calls it the single number most worth setting from a play-through. Trades derivation legibility against pace.
- `--wc-resolve-hold` — transcribed `700ms`. How long the screen holds after a choice so the payout is seen before the felt returns.
- `--wc-flight` — transcribed `380ms`. The card's travel time from hand to table.
- `--wc-ledger-row` — transcribed `2.5rem`. AC17's pinned row height; two rows is exactly two rows.
- **The Whetstone reading** — `baseDamageBonus` folded inside the bracket, so a long streak multiplies it. Confirm before Task 4.
- **Whether a whole screen six times a hand wears out**, and whether it should skip a bare trick or move faster. Only answerable by playing.
- **How the new payout feels** at roughly 2.5–3× today's for identical cards, with nothing capping a streak. The counterweight is a later ticket; this is the play that sizes it.
- **The table's residual overhang** — the trick well overhangs the felt's lip by 7–55px below 640px of viewport height. Not fixed here; your call whether it becomes its own ticket.

---

## Phase 1 — The rename, with no behaviour change

Nothing about the game changes in this phase. `bank` becomes `total`, `multiplier` becomes `roll`, `BankState` becomes `StreakState`, `cashValue` becomes `potValue`, `TrickFacts.bankClimbBonus` becomes `baseDamageBonus`, and `bank.ts` becomes `streak.ts` — a purely mechanical rename across every reader and every fixture. The boundary is safe precisely because the full suite must still pass unchanged at the end of it: any assertion that breaks here is a rename that was missed, not a rule that moved. Doing it first means the behaviour diff in Phase 2 is readable instead of buried in 230 renamed identifiers.

### Task 1: Rename the two counters and their type across the engine ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/streak.ts` (content of `bank.ts`, renamed)
- Delete: `src/warCouncil/bank.ts`
- Modify: `src/warCouncil/types.ts`, `src/warCouncil/deal.ts:55-62`, `src/warCouncil/playCard.ts:118-192`, `src/warCouncil/voluntaryCashOut.ts`, `src/warCouncil/index.ts`
- Test: `src/warCouncil/__tests__/bank.test.ts`, `src/warCouncil/__tests__/bank.buffs.test.ts`, `src/warCouncil/__tests__/bank.integration.test.ts`, `src/warCouncil/__tests__/rankTiers.resolution.test.ts`, `src/warCouncil/__tests__/rankTiers.playCard.test.ts`, `src/warCouncil/__tests__/voluntaryCashOut.test.ts`

- [x] **Step 1: Move the file, then rename the exported type and function**

`git mv src/warCouncil/bank.ts src/warCouncil/streak.ts` is not available (git is not on this shell's `PATH` by default); create `streak.ts` with `bank.ts`'s content and delete `bank.ts`. Inside it:

```ts
/** The two running figures a STREAK carries. Replaces DLR-80's `BankState`: the pair no longer
 *  counts tricks twice — `total` accumulates DAMAGE and `roll` counts the tricks it is
 *  multiplied by. */
export interface StreakState {
  readonly total: number
  readonly roll: number
}

export const EMPTY_STREAK: StreakState = { total: 0, roll: 0 }

/** Renamed from `cashValue`. Guard and reasoning kept verbatim. */
export function potValue(total: number, roll: number): number {
  if (!Number.isInteger(total) || !Number.isInteger(roll) || total <= 0 || roll <= 0) {
    return 0
  }
  return total * roll
}
```

`TrickResolution extends StreakState`. Every internal `let bank` / `let multiplier` becomes `let total` / `let roll`. `forcedCashValue` keeps its body and simply reads the renamed arguments — it is deleted in Phase 2, not here.

- [x] **Step 2: Rename the two `RoundState` fields and `TrickFacts.bankClimbBonus`**

In `src/warCouncil/types.ts`, `readonly bank: number` → `readonly total: number` and `readonly multiplier: number` → `readonly roll: number`, keeping each docblock and updating its wording. In `streak.ts`, `TrickFacts.bankClimbBonus` → `baseDamageBonus` with its docblock updated to say "extra bank climb" only in the historical DLR-92 reference.

`src/warCouncil/deal.ts` seeds `total: 0, roll: 0`. `src/warCouncil/playCard.ts` passes `{ total: next.total, roll: next.roll }` at line 122 and reads `lastResolution.total` / `lastResolution.roll` at 188-189, and `options?.baseDamageBonus ?? 0` at 131.

- [x] **Step 3: Follow the rename through `src/warCouncil/index.ts` and both remaining engine callers**

`index.ts` re-exports `./streak` rather than `./bank`, exporting `StreakState`, `EMPTY_STREAK`, `potValue`, `forcedCashValue`, `resolveTrickBank`, `trickOutcomeFor`, `isTaken`, `TrickOutcome`, `TrickResolution`, `TrickFacts`, `incomingFrom`. `voluntaryCashOut.ts` imports `potValue` from `./streak` and its `ApplyDamageStock` renames `bank`/`multiplier` to `total`/`roll`.

- [x] **Step 4: Update the six engine specs to the new names**

Every `{ bank: N, multiplier: M }` literal handed to `resolveTrickBank` becomes `{ total: N, roll: M }` — 78 call sites across `bank.test.ts` (45), `rankTiers.resolution.test.ts` (15), `bank.buffs.test.ts` (12), `bank.integration.test.ts` (2), plus `cardDamage.ts` and `playCard.ts`. Every `bankClimbBonus:` in a `TrickFacts` literal becomes `baseDamageBonus:`. **Assertions and expected numbers are unchanged in this task** — if one fails, a rename was missed.

Rename the spec files themselves: `bank.test.ts` → `streak.test.ts`, `bank.buffs.test.ts` → `streak.buffs.test.ts`, `bank.integration.test.ts` → `streak.integration.test.ts`.

- [x] **Step 5: Verify the engine still behaves identically**

Run: `npx vitest run --project node src/warCouncil src/hunt`
Expected: exits 0, Vitest reports 0 failed. Every previously-passing assertion still passes with no expected value edited.

### Task 2: Follow the rename through the app layer and the simulator ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/roundUiState.ts`, `src/app/warCouncil/roundUiSeed.ts`, `src/app/warCouncil/BankMeter.tsx`, `src/app/warCouncil/buffBreakdownModel.ts`, `src/app/warCouncil/cardDamage.ts:106-110`, `src/app/warCouncil/duelHealthBars.ts`, `src/app/warCouncil/commitHandlers.ts`, `src/app/warCouncil/WarCouncilRound.tsx`, `src/app/warCouncil/roundControlsProps.ts`, `src/app/warCouncilMount.ts`, `src/sim/playHandWindows.ts`, `src/sim/playHand.ts`, `src/sim/types.ts`, `src/sim/baselinePolicy.ts`, `src/sim/cardAwarePolicy.ts`
- Test: every spec under `src/app/warCouncil/__tests__/` and `src/sim/__tests__/` that names `bank:`, `multiplier:`, `.bank`, `.multiplier` or `bankClimbBonus` — 34 files by the plan's audit, including the shared builder `src/app/warCouncil/__tests__/roundFixture.ts`

- [x] **Step 1: Rename every read and every literal**

Mechanical: `state.round.bank` → `state.round.total`, `state.round.multiplier` → `state.round.roll`, `cashValue(` → `potValue(`, `bankClimbBonus` → `baseDamageBonus`, `BankState` → `StreakState`. `BankMeter.tsx` keeps its filename and its component name for now — the readout it renders is retitled in Phase 5 when the pot has a screen of its own.

- [x] **Step 2: Prove no old name survives anywhere**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "\bBankState\b|\bcashValue\b|\bbankClimbBonus\b|from '\./bank'|from '\.\./bank'"`
Expected: zero hits. (Recursive form deliberately — `Select-String -Path 'src\**\*.ts'` reaches exactly one directory level and would report a false green, per `web-project.md`.)

- [x] **Step 3: Verify the whole rename compiles and behaves identically**

Run: `npm run typecheck; npx vitest run --project node; npx vitest run --project dom`
Expected: typecheck exits 0; both Vitest projects exit 0 with 0 failed, and no expected value in any spec was edited to make them pass.

---

## Phase 2 — The new equation

The arithmetic changes here and nowhere else. `resolveTrickBank` gains the per-trick damage expression and loses three whole branches — the forced two-thirds cash-out, the end-of-hand fold, and the pooled cash-out bonus. The boundary is safe because the engine and the simulator are self-contained: the app layer reads `TrickResolution` fields that still exist, and the payout and the prompt do not move until Phases 4 and 5. Expect engine specs to change their *expected numbers* in this phase — that is the behaviour change landing, and it is the diff a reviewer should read.

### Task 3: Add `BASE_DAMAGE` as the one configured base ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/config.ts`, `src/hunt/index.ts`
- Test: `src/hunt/__tests__/config.test.ts`
- Config: `src/hunt/config.ts` — add `BASE_DAMAGE`

- [x] **Step 1: Declare the constant beside `DAMAGE_PER_HIT`**

```ts
/** DLR-156 AC10 — the damage every BANKED trick starts from, before any buff and before the
 *  run's `baseDamageBonus`. THE single statement of it: `resolveTrickBank` is the only reader,
 *  and nothing else may write a bare 1 into the damage equation.
 *
 *  A CONSTANT, deliberately. `roll-over-damage-model.md` → Out of scope: a card family that
 *  raises the base — paying back only if the streak survives — is a separate design, and
 *  nothing in this ticket may make this figure a variable. UNIT: damage. */
export const BASE_DAMAGE: Damage = 1
```

Export it from `src/hunt/index.ts` alongside `DAMAGE_PER_HIT`.

- [x] **Step 2: Pin it in the config spec**

Add to `src/hunt/__tests__/config.test.ts`:

```ts
it('DLR-156 AC10 — BASE_DAMAGE is the configured 1', () => {
  expect(BASE_DAMAGE).toBe(1)
})
```

- [x] **Step 3: Verify**

Run: `npx vitest run --project node src/hunt/__tests__/config.test.ts`
Expected: exits 0, 0 failed.

### Task 4: Give a trick its own buff bonus, pooling nothing ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffAccrual.ts`, `src/hunt/index.ts`
- Test: `src/hunt/__tests__/trickBonus.test.ts` (create), `src/hunt/__tests__/buffAccrual.test.ts`, `src/hunt/__tests__/buffCarry.test.ts`

- [x] **Step 1: Write the failing spec for a per-trick bonus that does not pool**

`src/hunt/__tests__/trickBonus.test.ts`, asserting: a bronze Blade alone gives `{ flatDamageBonus: 1, multiplierBonus: 0, overlapBonus: 0 }`; a bronze Momentum alone gives `{ flatDamageBonus: 0, multiplierBonus: 2, overlapBonus: 0 }` (AC12's unchanged tier values); three fired buffs give `overlapBonus: 2` (`firedCount - 1`); a Feeder firing on a Loss contributes **nothing** to this trick's figures, because its reward carries instead (DLR-150 AC1); and two successive calls with the same `fired` array return identical values — nothing accumulates.

- [x] **Step 2: Run it and see it fail**

Run: `npx vitest run --project node src/hunt/__tests__/trickBonus.test.ts`
Expected: fails — `trickBonusFor` is not exported.

- [x] **Step 3: Implement `trickBonusFor`**

```ts
/** DLR-156 AC11 — ONE trick's buff contribution, for THAT trick only. Nothing pools across
 *  tricks any more: a Blade fired on trick 1 and the same Blade fired on trick 6 both pay into
 *  their own trick's `(base + bd) x bm` and neither survives it.
 *
 *  Reads `buff.reward` through the same `narrowToCostAxis` and the same `BuffKind.Feeder` /
 *  `trickIsLoss` split `resolveFiredBuffs` uses, so cadence, the Feeder carry and the tier
 *  table are inherited rather than restated. The Overlap Bonus is returned SEPARATELY rather
 *  than folded into `multiplierBonus`, so the resolution screen can give it its own beat
 *  (AC16) without re-deriving `overlapBonusFor`.
 *
 *  R6's four per-hand caps are deliberately NOT applied here. They bound what a HAND may pay,
 *  and this figure is per TRICK; both damage caps are `Number.POSITIVE_INFINITY` today, so no
 *  number moves either way. Coins, the AP refund and the Feeder carry still run through
 *  `resolveFiredBuffs` and its caps, untouched. */
export function trickBonusFor(fired: readonly Buff[], trickIsLoss: boolean): TrickBuffBonus
```

- [x] **Step 4: Delete the cash-out spend model**

Remove `CashOutBonus`, `payableCashOutBonus`, `markCashOutPaid`, and the `multiplierPaid` / `flatDamagePaid` fields from `BuffBonusAccrual` and `EMPTY_BUFF_ACCRUAL`. Keep `startHandAccrual`, `accrueAxisBonus`, `accrueCarry`, `overlapBonusFor`, `accrualCapFor`, `BuffCarry`, `EMPTY_BUFF_CARRY` and `resolveFiredBuffs` exactly as they are — the coin, AP-refund and Feeder-carry axes are untouched by this ticket. Follow the deletions through `src/hunt/index.ts` and update `buffAccrual.test.ts` and `buffCarry.test.ts`.

- [x] **Step 5: Verify**

Run: `npx vitest run --project node src/hunt`
Expected: exits 0, 0 failed.

### Task 5: Rewrite `resolveTrickBank` to the roll-over formula ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/streak.ts`, `src/warCouncil/index.ts`, `src/warCouncil/voluntaryCashOut.ts`
- Test: `src/warCouncil/__tests__/streak.formula.test.ts` (create), `src/warCouncil/__tests__/streak.test.ts`, `src/warCouncil/__tests__/streak.buffs.test.ts`, `src/warCouncil/__tests__/streak.integration.test.ts`, `src/warCouncil/__tests__/rankTiers.resolution.test.ts`

- [x] **Step 1: Write the failing spec for the formula and its two branches**

`src/warCouncil/__tests__/streak.formula.test.ts`, pinning `spec.md`'s own worked examples:

- **AC13, the bare six-trick hand.** Six banked tricks with no buffs and `baseDamageBonus: 0` produce pots of `1, 4, 9, 16, 25, 36` — the same figures as today.
- **`spec.md`'s worked example.** Every trick firing +2 flat damage and +2 multiplier points, six banked tricks, produces trick damage `9` each and pots `9, 36, 81, 144, 225, 324`.
- **AC11, no pooling.** A Blade fired on trick 1 and nothing thereafter leaves tricks 2-6 paying the bare base.
- **AC7, the hurt branch.** A clean loss and an eaten skull each set `total` and `roll` to `0`, report `cashOut === 0`, `damageToPlayer === DAMAGE_PER_HIT`, and `trickDamage === null`.
- **The outcome axis, not the mechanical one.** A **dodge** (a skull trick the player did not take) BANKS — it adds damage and increments the roll. Eating a skull (a skull trick the player took) HURTS. This is the assertion most likely to be got backwards.
- **AC8, no hand-end cash.** `finalTrick: true` on a banked trick leaves `total` and `roll` standing and `cashOut === 0`.
- **AC10.** The trick's base is `BASE_DAMAGE + facts.baseDamageBonus`, with `baseDamageBonus: 2` on a bare banked trick giving trick damage `3`.

- [x] **Step 2: Run it and see it fail** — *(process deviation, see Implementer Report Notes: the spec was run against the already-implemented formula and passed immediately rather than failing first)*

Run: `npx vitest run --project node src/warCouncil/__tests__/streak.formula.test.ts`
Expected: fails on the arithmetic — the old `bank × multiplier` figures come back.

- [x] **Step 3: Replace the banked branch, the hurt branch and the cash-out**

Inside `resolveTrickBank`, the `isTaken(outcome)` branch becomes:

```ts
// AC1 — the trick's OWN damage. `bd` and `bm` come from the buffs fired on THIS trick and
// nothing else (AC11). The Overlap Bonus joins `bm` here, and is carried out separately on
// `TrickDamage` so the resolution screen can beat it alone (AC16).
const bonus = trick.buffs === null ? EMPTY_TRICK_BONUS : trickBonusFor(fired, false)
const base = BASE_DAMAGE + safeBonus(trick.baseDamageBonus)
const buffMult = 1 + bonus.multiplierBonus + bonus.overlapBonus
trickDamage = {
  base,
  buffDamage: bonus.flatDamageBonus,
  buffMult,
  overlapBonus: bonus.overlapBonus,
  dealt: (base + bonus.flatDamageBonus) * buffMult,
}
total += trickDamage.dealt
roll += 1
```

`safeBonus` keeps `bankAdded`'s existing floor-to-zero-unless-a-positive-integer guard verbatim, for the reason its docblock already gives: this figure feeds damage, then a rendered heart row.

Delete outright: the `trickHit || timebombResets` cash-out block, the `finalTrick` end-of-hand fold, `handEndCash`, `cashedAtHandEnd`, `bankAdded`, `forcedCashValue`, `NO_CASH_OUT_BONUS`, and the `payableCashOutBonus` / `markCashOutPaid` calls. On the hurt branch, `total = 0; roll = 0` and `cashOut` stays `0`. The Swan ladder's `swanKeepsBank` / `swanKeepsMultiplier` clauses keep their existing shape — they now spare the `total` and the `roll` respectively, and their docblocks say so.

Add `applyPot` and `incomingFromPot` to `streak.ts`, lifted from `voluntaryCashOut.ts`'s `cashBankNow` / `incomingFromCashOut`, and delete those two functions from `voluntaryCashOut.ts`. **The file itself stays until Task 9** — `applyDamageRefusalFor` and `ApplyDamageStock` still have callers in `roundUiState.ts` and `roundReducer.ts` at this point, and deleting the module here would leave Phase 2 failing to type-check.

- [x] **Step 4: Update the three renamed engine specs to the new expected numbers**

`streak.test.ts`, `streak.buffs.test.ts`, `streak.integration.test.ts` and `rankTiers.resolution.test.ts` all assert `bank × multiplier` figures and two-thirds reductions. Rewrite each expected value against the new formula; delete the cases that pinned `forcedCashValue`, `cashedAtHandEnd` and the end-of-hand fold, which are rules that no longer exist.

- [x] **Step 5: Verify the engine**

Run: `npm run typecheck; npx vitest run --project node src/warCouncil src/hunt`
Expected: typecheck exits 0 (the app layer still compiles — `TrickResolution.cashOut` and `damageToPlayer` are unchanged); Vitest exits 0, 0 failed.

### Task 6: Retire the forced cash-out constants ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/config.ts:340-350`, `src/hunt/index.ts`
- Test: `src/hunt/__tests__/config.test.ts`

- [x] **Step 1: Delete the two constants and their re-exports**

Remove `FORCED_CASH_OUT_NUMERATOR` and `FORCED_CASH_OUT_DENOMINATOR` from `config.ts`, their entries from the file's own summary block, and their lines from `src/hunt/index.ts`. Drop any `config.test.ts` case that pinned them. (No `config.test.ts` case pinned them — nothing to drop there. Three stray prose references in `buffCatalog.ts`, `quickKill.ts` and `skullWeights.ts` also named the deleted constants and were reworded, since Step 2's grep is repo-wide.)

- [x] **Step 2: Prove they are gone**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "FORCED_CASH_OUT|forcedCashValue"`
Expected: zero hits.

- [x] **Step 3: Verify**

Run: `npm run typecheck`
Expected: exits 0.

---

## Phase 3 — The streak crosses hands and dies at the fight boundary

AC8 and AC9. The streak becomes a run-carried figure following DLR-150's `feederCarry` field for field: a `RunState` field, an optional mount prop, a required result field, and a `streakAfter` that wipes it the moment the encounter resolves. The boundary is safe because the new prop is optional and defaulted to `EMPTY_STREAK`, so all 65 `createRoundUiState` sites and every fixture keep compiling and reproducing today's behaviour until the wiring in Task 8 lands.

### Task 7: Carry the streak on the run and wipe it at the fight boundary ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/run.ts`, `src/hunt/runTransitions.ts:85-135,325-340`, `src/hunt/index.ts`
- Test: `src/hunt/__tests__/run.streak.test.ts` (create)

- [x] **Step 1: Write the failing spec for the carry and the wipe**

`src/hunt/__tests__/run.streak.test.ts`, mirroring `run.feederCarry.test.ts` case for case: `startRun()` opens on `EMPTY_STREAK`; `recordEncounter` with an unresolved encounter carries the streak handed to it; `recordEncounter` with a **resolved** encounter returns `EMPTY_STREAK` (AC9), whichever side won; and omitting the parameter keeps `run.streak` untouched.

- [x] **Step 2: Run it and see it fail**

Run: `npx vitest run --project node src/hunt/__tests__/run.streak.test.ts`
Expected: fails — `RunState.streak` does not exist.

- [x] **Step 3: Add the field, the parameter and `streakAfter`**

```ts
// run.ts — beside RunState.feederCarry
/** DLR-156 AC8/AC9 — the streak carried between the HANDS of one fight. Lives on the run
 *  rather than on `EncounterState` for `feederCarry`'s stated reason: the card layer owns it
 *  for the life of a hand and hands it back, and the run is what survives between hands.
 *  Wiped at the fight boundary by `streakAfter`. NEVER persisted, exactly as `coins` above. */
readonly streak: StreakState
```

`startRun()` seeds `EMPTY_STREAK`. `recordEncounter` gains an optional ninth parameter `streak?: StreakState` and writes `streak: streakAfter(encounter, streak ?? run.streak)`. `streakAfter` mirrors `feederCarryAfter` exactly — `isEncounterResolved(encounter) ? EMPTY_STREAK : streak`.

- [x] **Step 4: Verify**

Run: `npx vitest run --project node src/hunt; npm run typecheck`
Expected: both exit 0, 0 failed.

### Task 8: Thread the streak through the mount, the seed, the result and the simulator ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncilMount.ts`, `src/app/warCouncil/roundUiSeed.ts:40-80`, `src/app/warCouncil/roundResult.ts`, `src/app/warCouncil/WarCouncilRound.tsx:100-130`, `src/App.tsx:150-170,360-370`, `src/sim/playHandWindows.ts:45-55`, `src/sim/playHand.ts:245-255`, `src/sim/playRun.ts:130-145`, `src/sim/types.ts`
- Test: `src/app/warCouncil/__tests__/roundFixture.ts`, `src/app/warCouncil/__tests__/roundResult.test.ts`, `src/sim/__tests__/playHand.test.ts`, `src/sim/__tests__/simulate.test.ts`

- [x] **Step 1: Add the prop, the seed field and the result field**

`WarCouncilMountProps.streak?: StreakState` (optional, defaulted to `EMPTY_STREAK`, following `feederCarry` and `apCapacity`). `RoundUiSeed.streak?: StreakState`, and `createRoundUiState` seeds `round: { ...seed.round, total: seed.streak?.total ?? 0, roll: seed.streak?.roll ?? 0 }` — the deal's hard zeros are overwritten here rather than in `dealRound`, so the engine stays ignorant of the run. `WarCouncilRoundResult.streak: StreakState`, **required**, so the compiler enumerates every construction site; `roundResultFor` returns `{ total: ui.round.total, roll: ui.round.roll }`.

**Deviation, flagged rather than silently fixed:** `createRoundUiState` only overwrites `round.total`/`round.roll` when `seed.streak` is actually supplied (`seed.streak === undefined` leaves `seed.round` untouched). The plan's literal `seed.streak?.total ?? 0` form was tried first and broke `roundReducer.applyDamage.test.ts` and `roundReducer.delayedApply.test.ts` — both build a `round` literal with a non-zero `total`/`roll` directly (e.g. `streakRound()`) and never pass `streak`, so the `?? 0` form silently zeroed their seeded streak. The guarded form reproduces the plan's stated behaviour whenever `streak` is passed (which is every real mount, via `App.tsx`/`playHandWindows.ts`) and leaves every pre-existing seed literal exactly as it was otherwise.

- [x] **Step 2: Wire `App.tsx` and the simulator**

`App.tsx` passes `streak={run.streak}` at the mount and `result.streak` as `recordEncounter`'s ninth argument. `playHandWindows.ts` passes `streak: run.streak`; `playHand.ts` reports `streakIn`/`streakOut` on its report shape; `playRun.ts` passes `outcome.result.streak` through to `recordEncounter`. Added `streakIn` / `streakOut` to `src/sim/types.ts`'s hand report, following `feederCarriedIn` / `feederCarryOut`; `src/sim/__tests__/simulate.test.ts`'s `handFixture` builder needed the two new required fields to keep compiling.

- [x] **Step 3: Add the regression the `feederCarry` spec exists to prevent**

`WarCouncilRound.feederCarry.test.tsx` was written because a carry can reach the run and never reach the felt. Added the sibling case to `src/app/warCouncil/__tests__/roundResult.test.ts`: seeding `createRoundUiState` with `streak: { total: 12, roll: 2 }` and completing a trick on top of it hands back a `roundResultFor` result whose `streak` reflects the tricks played on top of that opening (21/3), not a streak that started at zero — crossing both the seeding seam and the read-back seam in one case.

- [x] **Step 4: Verify**

Run: `npm run typecheck; npx vitest run --project node; npx vitest run --project dom`
Expected: all three exit 0, 0 failed — except the seven pre-existing deliberate failures named at the top of this phase's dispatch (confirmed: exactly those eight test cases across the seven listed groups, no new ones).

---

## Phase 4 — Remove Apply Damage and the delayed-payout queue

AC4, plus the machinery behind it that now has no caller: the button, its five refusal reasons, the two reducer actions, the poise flag, and the whole `PendingApplyPayout` queue with `EncounterState.pendingApplyPayout`, `PayoutOutcome` and `TrickPayoutEvent`. This is a deletion phase and the compiler drives it — every removed name surfaces as an error at each reader. The boundary is safe because the pot is unreachable at the end of it: nothing can cash, which is correct until Phase 5 gives the player the prompt that can. **The game is deliberately not playable-to-completion between Phase 4 and Phase 5**; that is the one phase seam in this contract where the codebase is internally consistent but the feature is half-landed, and it is called out here so the executor does not stop and re-evaluate.

### Task 9: Remove the Apply Damage control and its refusals ✓

- Skill: react-frontend

**Files:**
- Delete: `src/warCouncil/voluntaryCashOut.ts`, `src/warCouncil/__tests__/voluntaryCashOut.test.ts`
- Modify: `src/app/warCouncil/ActionBar.tsx:1-60,170-195`, `src/app/warCouncil/actionBarLabels.ts`, `src/app/warCouncil/labels.ts`, `src/app/warCouncil/roundControlsProps.ts`, `src/app/warCouncil/roundHint.ts`, `src/app/warCouncil/roundUiState.ts`, `src/app/warCouncil/roundUiSeed.ts`, `src/app/warCouncil/roundReducer.ts:100-200`, `src/app/warCouncil/WarCouncilRound.tsx`, `src/warCouncil/index.ts`, `src/warCouncil/discard.ts`, `src/sim/baselinePolicy.ts`
- Test: `src/app/warCouncil/__tests__/ActionBar.test.tsx`, `src/app/warCouncil/__tests__/labels.test.ts`, `src/app/warCouncil/__tests__/roundHint.test.ts`, `src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts`, `src/app/warCouncil/__tests__/WarCouncilRound.actionBar.test.tsx`

- [x] **Step 1: Delete the plate and its props**

Remove the fourth `<button>` from `ActionBar.tsx` and the `applyCashValue`, `applyPoised`, `applyRefusal`, `pendingPayout`, `onTapApplyDamage`, `onCancelApplyDamage` props; remove `applyDamageBarAccessibleName` from `actionBarLabels.ts` and the apply-refusal wording from `labels.ts`. `ActionBar`'s `Escape` handler drops its Apply Damage branch and keeps the Swap one. Update the bar's own docblock, which currently names four buttons.

- [x] **Step 2: Delete the reducer's two actions and the poise flag**

Remove `TapApplyDamage`, `CancelApplyDamage` from `RoundUiActionKind` and `RoundUiAction`; remove `handleTapApplyDamage`; remove `RoundUiState.applyPoised` and its seed. Remove `applyDamageStock` from `roundUiState.ts`. `src/warCouncil/voluntaryCashOut.ts` now has no exports left with a caller — delete the file and its spec, and drop `applyDamageRefusalFor` / `ApplyDamageRefusal` / `ApplyDamageStock` from `src/warCouncil/index.ts`. `WarCouncilRound.tsx` drops `applyRefusal`, `applyCash` and their `useDebugRoundState` entries. `src/sim/baselinePolicy.ts` drops whatever policy branch presses the button.

- [x] **Step 3: Rewrite or delete the affected specs**

`roundReducer.applyDamage.test.ts` tested a control that no longer exists — delete it; its successor is `roundReducer.resolution.test.ts` in Phase 5. Strip the Apply Damage cases from `ActionBar.test.tsx`, `labels.test.ts`, `roundHint.test.ts` and `WarCouncilRound.actionBar.test.tsx`, keeping every case about the three surviving buttons.

- [x] **Step 4: Prove the control is gone**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "applyDamageRefusalFor|ApplyDamageStock|ApplyDamageRefusal|applyPoised|TapApplyDamage|CancelApplyDamage"`
Expected: zero hits. **Confirmed zero hits.**

- [x] **Step 5: Verify**

Run: `npm run typecheck; npx vitest run --project dom src/app/warCouncil`
Expected: both exit 0, 0 failed. **Confirmed at phase-end (both tasks verified together — see Task 10 Step 5).**

### Task 10: Remove the delayed-payout queue and its AP cost ✓

- Skill: react-frontend

**Files:**
- Delete: `src/hunt/applyDamagePayout.ts`, `src/hunt/__tests__/applyDamagePayout.test.ts`, `src/app/warCouncil/payoutLabels.ts`, `src/app/warCouncil/__tests__/payoutLabels.test.ts`, `src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts`
- Modify: `src/hunt/types.ts`, `src/hunt/encounter.ts:1-20,45-55,180-230`, `src/hunt/apConfig.ts:60-95`, `src/hunt/config.ts:365-380`, `src/hunt/index.ts`, `src/hunt/actionPoints.ts`, `src/hunt/buffActivation.ts`, `src/hunt/quickKill.ts`, `src/app/warCouncil/commitHandlers.ts:115-180`, `src/app/warCouncil/roundUiState.ts`, `src/app/warCouncil/roundControlsProps.ts`, `src/app/warCouncil/TrickWell.tsx`, `src/app/warCouncil/actionBarLabels.ts`, `src/sim/playHand.ts`, `src/sim/types.ts`
- Test: `src/hunt/__tests__/encounter.test.ts`, `src/hunt/__tests__/shield.encounter.test.ts`, `src/hunt/__tests__/ward.encounter.test.ts`, `src/app/warCouncil/__tests__/actionBarLabels.test.ts`, `src/app/warCouncil/__tests__/TrickWell.test.tsx`
- Config: `src/hunt/apConfig.ts` — remove `APPLY_DAMAGE_AP_COST`, `APPLY_DAMAGE_DELAY_TRICKS`, `APPLY_DAMAGE_HIT_RETENTION`

- [x] **Step 1: Delete the module and the encounter field**

Delete `src/hunt/applyDamagePayout.ts`. Remove `EncounterState.pendingApplyPayout` from `src/hunt/types.ts`, its seed from `startEncounter`, its `reduceApplyPayoutOnHit` call from `applyDamage`, and `hasPendingApplyPayout`, `queueApplyDamagePayout` and `settleApplyPayout` from `encounter.ts`. Remove every re-export of those names from `src/hunt/index.ts`.

- [x] **Step 2: Delete the app-layer fold and the payout band**

`commitHandlers.ts`'s `applyResolution` drops its `queued` / `paid` / `payout` bookkeeping and its `FoldedResolution.payout` and `unplayedAtPress` fields; `ResolvedTrick.payout` goes from `roundUiState.ts`; `TrickWell.tsx` drops the payout band it renders from it; `payoutLabels.ts` and its spec are deleted. `src/sim/playHand.ts` and `src/sim/types.ts` drop any payout figure from the hand report.

- [x] **Step 3: Remove the three configured constants**

Delete `APPLY_DAMAGE_AP_COST`, `APPLY_DAMAGE_DELAY_TRICKS` and `APPLY_DAMAGE_HIT_RETENTION` from `apConfig.ts`, their entries from `config.ts`'s summary block, and their lines from `src/hunt/index.ts`. `actionPoints.ts`, `buffActivation.ts` and `quickKill.ts` drop the references their docblocks and code carry. **Per `plan.md` Assumption 4 the apply choice now costs no AP; this is the deletion that makes that true, and it is flagged for the developer under "Developer decides or observes".**

- [x] **Step 4: Prove the queue is gone**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "PendingApplyPayout|pendingApplyPayout|PayoutOutcome|TrickPayoutEvent|APPLY_DAMAGE_"`
Expected: zero hits. **Confirmed zero hits.**

- [x] **Step 5: Verify**

Run: `npm run typecheck; npx vitest run --project node; npx vitest run --project dom`
Expected: all three exit 0, 0 failed. **Deviation: typecheck exits 0; both Vitest projects exit 1 with exactly the 8 pre-existing deliberate failures named at the top of this phase's dispatch (4 in `--project node`: `roundReducer.bank.test.ts` x2, `roundReducer.quickKill.test.ts` x1, `roundReducer.timebombQueue.test.ts` x1; 4 in `--project dom`: `WarCouncilRound.duelHealthBars.test.tsx` x1, `WarCouncilRound.readouts.test.tsx` x2, `WarCouncilRound.test.tsx` x1) — no new failures. One additional failure surfaced during this phase's own work (`WarCouncilRound.test.tsx`'s DLR-109 Apply-Damage-queue test) and was fixed by deleting the test, since its subject — the queued press — no longer exists; see Implementer Report.**

---

## Phase 5 — The resolution screen

AC2, AC3, AC5, AC6, AC14, AC16, AC17, AC18. The beat derivation lands first as a pure module with its own spec, then the hook that plays it, then the reducer state that carries it, then the split of `WarCouncilRound.tsx`, then the screen itself. Each task type-checks on its own; the screen is reachable and the pot cashable from the end of Task 15. Layout is per `mockup.html` — its CSS is a draft of the real stylesheet, not something to re-author.

### Task 11: Derive the build-up's beats, purely ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/resolutionBeats.ts`, `src/app/warCouncil/resolutionLabels.ts`
- Test: `src/app/warCouncil/__tests__/resolutionBeats.test.ts`

- [x] **Step 1: Write the failing spec against `ui-notes.md`'s worked run**

`ui-notes.md` §3's table is the fixture: three Bell-Takers riding, a Bells trick taken, opening total 12 at roll 2. Assert the six beats land in order with running numbers `1, 2, 6, 10, 14` and a final pot of `78` at roll 3 — `Base +1`, `Blade +1 DMG`, `Momentum +2 MULT`, `Momentum +2 MULT`, `Overlap +2 MULT`, `Banked`. Also assert: a bare banked trick produces exactly two beats (Base, Banked); a single fired buff produces **no** Overlap beat, because `overlapBonusFor(1)` is 0; a hurt trick produces exactly one beat, `Hurt`, carrying the health taken and the pot lost; and a Momentum beat leaves `damage` unchanged while moving `mult` — `ui-notes.md`'s "a Momentum card never touches the damage number".

- [x] **Step 2: Run it and see it fail** — *(process deviation: the spec and `resolutionBeats.ts`/`resolutionLabels.ts` were designed together from `ui-notes.md`'s fixture and the first run already passed all 8 cases; see Implementer Report.)*

Run: `npx vitest run --project node src/app/warCouncil/__tests__/resolutionBeats.test.ts`
Expected: fails — `resolutionBeatsFor` is not exported.

- [x] **Step 3: Implement the derivation and its wording**

`resolutionBeatsFor(resolution, fired, before)` reads `resolution.trickDamage` and `resolution.firedBuffIds`, resolves each id to its `Buff` in the supplied `fired` array, and emits `BeatKind.Blade` or `BeatKind.Momentum` per card by its reward axis. It computes **nothing**: `damage`, `mult` and `running` are accumulated from the terms the engine already decided, and the final `running` must equal `resolution.trickDamage.dealt` — assert that invariant in the spec. Wording lives in `resolutionLabels.ts`, following `buffFiredLabels.ts`'s existing shape, because `src/warCouncil/` holds no user-facing copy.

- [x] **Step 4: Verify**

Run: `npx vitest run --project node src/app/warCouncil/__tests__/resolutionBeats.test.ts`
Expected: exits 0, 0 failed. **Confirmed: 8 passed.**

### Task 12: Play the beats on a timer, and keep the stagger under reduced motion ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/useBeatSequence.ts`
- Test: `src/app/warCouncil/__tests__/useBeatSequence.test.tsx`

- [x] **Step 1: Write the failing spec for the timer, the cleanup and reduced motion**

Using `vi.useFakeTimers()` and a stubbed `matchMedia`: beats land one at a time as the clock advances by `--wc-beat`; `landed` never exceeds `beats.length` and `done` flips true at the last; unmounting mid-sequence clears the pending timer and lands nothing further; **and with `prefers-reduced-motion: reduce` the sequence still runs beat by beat** (AC18) with `reducedMotion` reported true. Mount inside `<StrictMode>` for one case and assert the beat count is not doubled.

- [x] **Step 2: Run it and see it fail**

Run: `npx vitest run --project dom src/app/warCouncil/__tests__/useBeatSequence.test.tsx`
Expected: fails — `useBeatSequence` is not exported. **Confirmed: failed with "does not provide an export named 'useBeatSequence'" before Step 3's implementation landed.**

- [x] **Step 3: Implement the hook**

One `setTimeout` per beat, scheduled off a `landed` index held in state, cleared in the effect's cleanup. One `matchMedia('(prefers-reduced-motion: reduce)')` listener, added and removed in its own effect. Read the interval from the CSS custom property via `getComputedStyle` so `--wc-beat` stays the single statement of the pace, falling back to the transcribed `520` when the property is absent (jsdom computes no custom properties). Nothing is appended to and no module-level state is introduced, so StrictMode's double mount recomputes an identical schedule.

**Deviation, flagged:** the reduced-motion initial value is read in `useState`'s lazy initialiser rather than inside the effect body — `npm run lint`'s `react-hooks/set-state-in-effect` rule flags a synchronous `setState` in an effect body as the cascading-render anti-pattern it is. The effect still owns exactly one listener (`change`), added and removed in its own cleanup; only the FIRST read moved out of the effect and into the initialiser.

- [x] **Step 4: Verify**

Run: `npx vitest run --project dom src/app/warCouncil/__tests__/useBeatSequence.test.tsx`
Expected: exits 0, 0 failed. **Confirmed: 5 passed.**

### Task 13: Carry the resolution on the reducer, and give the player the two choices ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/roundUiState.ts`, `src/app/warCouncil/roundUiSeed.ts`, `src/app/warCouncil/roundReducer.ts`, `src/app/warCouncil/commitHandlers.ts`, `src/app/warCouncil/buffRoundState.ts`
- Test: `src/app/warCouncil/__tests__/roundReducer.resolution.test.ts` (create), `src/app/warCouncil/__tests__/roundReducer.bank.test.ts`

- [x] **Step 1: Write the failing spec for the three transitions**

`roundReducer.resolution.test.ts`: a banked trick sets `ui.resolution` to a non-null view carrying both played cards, the winner, the trick's beats and the trick number (AC14); `ApplyPot` deals `potValue(total, roll)` to the Quarry, zeroes both, and clears `ui.resolution` (AC5); `RollOver` leaves both standing and clears `ui.resolution` (AC6); a hurt trick sets a view whose only choice is the exit, and `RollOver` on it is a no-op on already-zero figures (AC7); `ApplyPot` or `RollOver` dispatched with `ui.resolution === null` returns the state unchanged and does not throw; and applying into an already-resolved encounter is inert rather than a `RangeError`.

- [x] **Step 2: Run it and see it fail**

Run: `npx vitest run --project node src/app/warCouncil/__tests__/roundReducer.resolution.test.ts`
Expected: fails — `ResolutionView` and the two actions do not exist. **Deviation, same shape as Task 11: written and implemented together against the file list's known shapes; first run passed all 6 cases. See Implementer Report.**

- [x] **Step 3: Add the state, the actions and the hand-off**

`RoundUiState.resolution: ResolutionView | null`, seeded `null`. `RoundUiActionKind` gains `ApplyPot` and `RollOver`. `commitHandlers.ts`'s `commit` builds the view on the same `null -> non-null` edge of `resolvedTrick` that `foldBuffOutcome` fires on, calling `resolutionBeatsFor` **once** there — not per render. `nextPotFloor` is `potValue(total + BASE_DAMAGE, roll + 1)`, the bare rule, because the player may fire nothing next trick. `ApplyPot` calls `applyPot`, folds `incomingFromPot` through `applyDamage`, and sets `buffHand.applyDamagePressed` — the cut Debt Collector family's trigger, moved to the only place a cash-out can now happen (`plan.md` Assumption 11).

`roundReducer.bank.test.ts`'s two pre-existing deliberate failures (pinned on the deleted forced two-thirds cash-out) were rewritten against AC7's actual rule, rather than left broken: one now asserts a clean loss pays the Quarry nothing and only resets total/roll; the other now drives its mid-hand kill through a WIN plus `ApplyPot` instead of a LOSS's forced cash-out, since a loss can no longer touch the Quarry at all.

- [x] **Step 4: Verify**

Run: `npm run typecheck; npx vitest run --project node src/app/warCouncil`
Expected: both exit 0, 0 failed. **Confirmed: typecheck exits 0; `--project node` exits 1 with exactly 2 of the 6 remaining pre-existing known failures (`roundReducer.quickKill.test.ts` x1, `roundReducer.timebombQueue.test.ts` x1 — both outside this task's file list, untouched). The other 4 (`WarCouncilRound.duelHealthBars.test.tsx` x1, `WarCouncilRound.readouts.test.tsx` x2, `WarCouncilRound.test.tsx` x1) are in `--project dom`, also re-run and confirmed unchanged. `roundReducer.bank.test.ts`'s 2 are now fixed and passing. No new failures anywhere in `src/app/warCouncil`. `npm run lint` also run and confirmed clean (1 pre-existing violation in `useBeatSequence.ts` found and fixed in Task 12, not a Task 13 finding).**

### Task 14: Split the felt out of `WarCouncilRound.tsx` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/WarCouncilTable.tsx`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx`
- Test: existing `src/app/warCouncil/__tests__/WarCouncilRound.*.test.tsx` — all should pass untouched

- [x] **Step 1: Move the felt wholesale**

Everything currently returned inside `<div className="wc-shell">` moves to `WarCouncilTable.tsx`, taking its derivations (`bars`, `shape`, `handSummary`, `displayHand`, `hint`, `leadSuit`, `quarryToLead`, `buffRide`, the three handlers) with it. `WarCouncilRound.tsx` keeps the `useReducer` call, `dispatchClearingAnnouncement`, `handleCarryOn`'s `onComplete` path, and becomes the switch. **No behaviour changes in this step** — the existing component specs are the proof, and they must pass with no edit.

- [x] **Step 2: Measure both files against the budget**

Run: `(Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count; (Get-Content src\app\warCouncil\WarCouncilTable.tsx).Count`
Expected: both under 400. (`(Get-Content).Count`, not `Measure-Object -Line`, which drops blank lines and hid a real breach on DLR-63.)

- [x] **Step 3: Verify the split changed nothing**

Run: `npm run typecheck; npx vitest run --project dom src/app/warCouncil`
Expected: both exit 0, 0 failed, with no spec edited.

### Task 15: Build the resolution screen and its ledger ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/TrickResolutionScreen.tsx`, `src/app/warCouncil/ResolutionLedger.tsx`, `src/app/warCouncil/warCouncilResolve.css`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx`, `src/app/warCouncil/BankMeter.tsx`
- Test: `src/app/warCouncil/__tests__/TrickResolutionScreen.test.tsx` (create), `src/app/warCouncil/__tests__/ResolutionLedger.test.tsx` (create)
- Config: `src/app/warCouncil/warCouncilResolve.css` — the four PLACEHOLDER tokens

- [x] **Step 1: Write the ledger's failing spec**

`ResolutionLedger.test.tsx`: the container renders **exactly two row slots at every beat count** — one term, two terms, six terms (AC17); the newest row is the one scrolled to, asserted by reading `scrollTop` after each beat and confirming it equals `scrollHeight - clientHeight`; and the follow is an **assignment**, asserted by confirming `scrollIntoView` is never called and no `behavior: 'smooth'` appears in the component (`ui-notes.md`'s recorded failure — the smooth version silently never ran).

- [x] **Step 2: Run it and see it fail**

Run: `npx vitest run --project dom src/app/warCouncil/__tests__/ResolutionLedger.test.tsx`
Expected: fails — the component does not exist.

- [x] **Step 3: Build the ledger**

Fixed `height: calc(2 * var(--wc-ledger-row))`, `overflow-y: auto`, a masked top edge while it overflows, and an effect that sets `ref.current.scrollTop = ref.current.scrollHeight` after each beat lands. Row height is pinned to the token, never to content.

- [x] **Step 4: Write the screen's failing spec**

`TrickResolutionScreen.test.tsx`, querying by role and accessible label: both played cards are on screen (AC14); the header names the trick and its outcome; the pot and its parts — total, roll, product — are all legible (AC2); the banked branch offers exactly two controls, **Apply** stating the pot in full and **Roll over** carrying the new roll and the floor payout with its risk line (AC3); pressing each dispatches `ApplyPot` / `RollOver`; and the hurt branch offers exactly one control, **Onward** (AC7). Assert the two prompt buttons are told apart by **shape and words**, not colour — a solid vs dashed edge class and distinct accessible names — per `game-ux`'s greyscale rule.

- [x] **Step 5: Run it and see it fail**

Run: `npx vitest run --project dom src/app/warCouncil/__tests__/TrickResolutionScreen.test.tsx`
Expected: fails — the component does not exist.

- [x] **Step 6: Build the screen and its stylesheet**

Layout per `mockup.html`'s `.resolve` section, adapted into `warCouncilResolve.css`. A full-viewport grid: `height: 100dvh`, `overflow: hidden`, `padding` carrying `env(safe-area-inset-*)`, no `100vh` and no `100vw` anywhere. The header, the trick's two cloned cards, the verdict, the ledger and the registers are **one grid child**, per `ui-notes.md` §3's note that a three-row grid distributes them evenly down the screen, which is not composition. The four tokens are declared here with a `PLACEHOLDER` comment on each naming `ui-notes.md` as their source:

```css
:root {
  /* PLACEHOLDER — transcribed from mockup.html; the developer's to set by playing.
     ui-notes.md §7 calls --wc-beat the single number most worth setting from a play-through. */
  --wc-beat: 520ms;
  --wc-resolve-hold: 700ms;
  --wc-flight: 380ms;
  --wc-ledger-row: 2.5rem;
}
```

Under `@media (prefers-reduced-motion: reduce)` drop the travel, the scale and the ring and replace the impact with a colour-and-weight flash; **the beat's stagger is untouched**, because one term at a time is information rather than decoration (AC18). No `filter: url()` and no `mix-blend-mode` on any card (DLR-147). `display: block` on the card face — it is a `<span>` and width does not apply to an inline box. Card sizing in **container** units, never `vw` or `vh`.

- [x] **Step 7: Wire the switch and retitle the meter**

`WarCouncilRound.tsx` renders `<TrickResolutionScreen>` when `ui.resolution !== null` and `<WarCouncilTable>` otherwise. `BankMeter.tsx`'s copy is retitled to name the total, the roll and the pot rather than the bank and the multiplier.

- [x] **Step 8: Verify**

Run: `npm run typecheck; npx vitest run --project dom src/app/warCouncil`
Expected: both exit 0, 0 failed.

*(Both exit 0 except the three PRE-EXISTING pinned failures the contract already names as deliberate: `WarCouncilRound.readouts.test.tsx`'s "changes the readout live…" (dom), and the node-project `roundReducer.quickKill.test.ts` / `roundReducer.timebombQueue.test.ts` — see the Implementer Report for the full accounting.)*

---

## Phase 6 — The card's flight

AC15. The card travels from the hand to the table instead of appearing there, and — the part that is a real defect rather than a nicety — the landing is reachable three ways, so a hidden tab cannot strand it. The phase is last because the flight is independent of the formula and the screen: it can be added or reverted without touching either.

### Task 16: The flight hook, with three ways to land ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/useCardFlight.ts`
- Test: `src/app/warCouncil/__tests__/useCardFlight.test.tsx`

- [x] **Step 1: Write the failing spec, led by the hidden-tab case**

`useCardFlight.test.tsx`: `fly()` calls `onLanded` exactly once when the animation's `onfinish` runs; **it still calls `onLanded` exactly once when `onfinish` never fires and only the timer elapses** — the hidden-tab case `ui-notes.md` §2 records, and the reason this hook exists; it still calls it once when a `visibilitychange` to visible arrives before the timer; when all three paths fire it is called **once**, not three times; and unmounting mid-flight cancels the animation, clears the timer and removes the listener, after which none of the three lands anything.

- [x] **Step 2: Run it and see it fail** — *(process deviation, same shape as Tasks 5/11/13: `useCardFlight.ts` was implemented before the spec was run, so the first run passed all 5 cases rather than failing on a missing export. Flagged rather than fabricating a red run — see Implementer Report.)*

Run: `npx vitest run --project dom src/app/warCouncil/__tests__/useCardFlight.test.tsx`
Expected: fails — `useCardFlight` is not exported.

- [x] **Step 3: Implement the hook**

Clone the source element into a `position: fixed` layer appended to the shell — above everything, so it is never clipped by the hand's or the felt's overflow. Animate it on an arc with Web Animations, lifting clear before it travels. `land()` is guarded by a ref flag so it is idempotent, and is called from `animation.onfinish`, from a `setTimeout` matched to `--wc-flight`, and from a `document` `visibilitychange` handler. All three are released in the effect's cleanup, along with the cloned node.

**Deviation, flagged:** jsdom implements no Web Animations API at all (`Element.prototype.animate` is `undefined`), so `fly()` feature-detects it and lands **immediately, synchronously** when it is absent — real browsers always have it; the dozens of pre-existing two-click commit specs across this test tree rely on the commit dispatch staying synchronous and do not stub `animate`, and none of them are in this task's file list to rewrite. Every spec that wants the real onfinish/timer/`visibilitychange` race (this hook's own spec, and Task 17's regression case) stubs `Element.prototype.animate` itself.

- [x] **Step 4: Verify**

Run: `npx vitest run --project dom src/app/warCouncil/__tests__/useCardFlight.test.tsx`
Expected: exits 0, 0 failed. **Confirmed: 5 passed.**

### Task 17: Fly the played card from the hand to the table ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/WarCouncilTable.tsx`, `src/app/warCouncil/warCouncil.css`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`

- [x] **Step 1: Wire the flight into the commit path**

The second tap on an armed card calls `fly(cardEl, wellSlotEl, () => dispatch({ kind: TapCard, card }))`. The gap the card left in the hand collapses **after** the landing, never during, so the hand does not reflow under the player's finger mid-flight. Added the fixed flight-layer rule (`.wc-card-flyer`) to `warCouncil.css`.

**Deviation, flagged:** `HandFan.tsx` and `warCouncilHand.css` were listed in the plan's file map but were not touched — `HandFan.tsx` already carries a `data-buff-anchor={cardKey(card)}` wrapper around every card (DLR-153), which is enough for `WarCouncilTable.tsx`'s `handleTap` to locate the tapped card's own button via `document.querySelector` without any change to `HandFan.tsx` itself, and the "gap collapses after landing, never during" behaviour falls out for free from deferring the dispatch to `fly`'s landing callback — the hand's data does not change until then, so no CSS collapse rule was needed. `cardEl`/`wellSlotEl` resolution and the commit-tap gate (armed, same card, not Fox/Woodcutter, not mid-Timebomb-mark, not mid-discard-selection — the SAME rank check `roundReducer.ts`'s `handleTapCard` already makes, mirrored here to decide whether to fly rather than duplicating the reducer's own play/prompt branch) live in `WarCouncilTable.tsx`'s `handleTap`.

- [x] **Step 2: Add the regression case**

To `WarCouncilRound.test.tsx`: with Web Animations stubbed so `onfinish` never fires, playing a card still resolves the trick and the hand stays interactive — the exact session-long lock-up `ui-notes.md` §2 records.

- [x] **Step 3: Verify**

Run: `npm run typecheck; npx vitest run --project dom src/app/warCouncil`
Expected: both exit 0, 0 failed. **Confirmed: typecheck exits 0; `--project dom` exits 1 with exactly the ONE pre-existing pinned failure this contract already names (`WarCouncilRound.readouts.test.tsx`'s "changes the readout live…", DLR-117 AC2 — B1's target below, not this task's). 286 passed, 1 failed. No new failures.**

**Note:** `WarCouncilTable.tsx` measured at 390 lines after this task — under the 400-line budget.

---

## Phase 7 — Final verification

No production changes. Only sanity checks that the cumulative work is clean, that no deleted name survives, that no tunable was hard-coded, and that the pure-core boundary still holds.

### Task 18: Confirm the pure-core boundary still holds ✓

- Skill: none — a verification grep, no code written

- [x] **Step 1: Grep the two pure trees for React and DOM references**

Run: `Get-ChildItem src\warCouncil,src\hunt,src\sim -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|matchMedia|requestAnimationFrame"`
Expected: zero hits.

- [x] **Step 2: Confirm lint's own enforcement of it passes**

Run: `npm run lint`
Expected: exits 0.

### Task 19: Confirm no deleted name survives and no tunable was hard-coded ✓

- Skill: none — verification greps, no code written

- [x] **Step 1: Grep for every removed name**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "BankState|cashValue|forcedCashValue|FORCED_CASH_OUT|bankClimbBonus|bankAdded|cashedAtHandEnd|applyDamageRefusalFor|ApplyDamageStock|ApplyDamageRefusal|applyPoised|TapApplyDamage|CancelApplyDamage|PendingApplyPayout|pendingApplyPayout|PayoutOutcome|TrickPayoutEvent|APPLY_DAMAGE_|payableCashOutBonus|markCashOutPaid|CashOutBonus"`
Expected: zero hits.

- [x] **Step 2: Confirm the four tunables are read from the stylesheet, not written inline**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "\b520\b|\b700\b|\b380\b"`
Expected: hits only in `useBeatSequence.ts`'s and `useCardFlight.ts`'s documented `getComputedStyle` fallbacks, each with a `PLACEHOLDER` comment naming `--wc-beat` / `--wc-flight` as the real source. Any other hit is a hard-coded tunable and is a defect.

- [x] **Step 3: Confirm `BASE_DAMAGE` has exactly one reader**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "BASE_DAMAGE"`
Expected: its declaration in `config.ts`, its re-export in `index.ts`, its read in `streak.ts`'s damage expression, `commitHandlers.ts`'s `nextPotFloor`, and specs. No sixth production reader, and no bare `1` substituted for it anywhere in the damage path (AC10).

- [x] **Step 4: Confirm the shell uses no forbidden viewport unit**

Run: `Get-ChildItem src -Recurse -Include *.css | Select-String -Pattern "100vh|100vw"`
Expected: zero hits in `warCouncilResolve.css`. Pre-existing hits in `warCouncilCardTip.css` are outside this contract's file map and are not touched.

### Task 20: Static gates and full suite ✓

- Skill: none — verification only, no code written

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all exit 0; Vitest reports 0 failed. The two scoped project runs come first deliberately — they warm the Vite transform cache, and a cold `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is infrastructure and not a failing test.

- [x] **Step 2: Formatting of the files this contract changed**

Run: `npx prettier --check src\warCouncil src\hunt src\app src\sim`
Expected: exits 0. If it fails, `npx prettier --write` **the failing paths only** — never `npm run format`, which rewrites ~58 pre-existing `.md` files nobody asked for.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 21: Update the PR description ✓

- Skill: none — a document for the developer, no code written

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include:
- A link to `plan.md` in this folder, and to `spec.md` / `ui-notes.md` / `mockup.html` beside it.
- The change in a paragraph: the new formula, the streak crossing hands, the button and queue removed, the resolution screen.
- **Every decision the developer must make**: the Whetstone reading, the removed AP cost, and the four PLACEHOLDER tokens with their transcribed values.
- **Every behaviour only judgeable by playing**: whether a whole screen six times a hand wears out; whether `--wc-beat` at 520ms is right; how the roughly 2.5–3× payout feels with nothing capping a streak; and the table's residual overhang below 640px of viewport height.
- Verification results from Phase 7, quoted as the commands printed them.
- A one-line note for future contributors: the vocabulary is now `total`, `roll` and `pot`, and `bank` / `multiplier` mean nothing in this codebase any more.

---

## Self-review

**Spec coverage:**
- AC1 (per-trick damage into a running total, roll +1) — Tasks 3, 5.
- AC2 (the pot is total × roll and is on screen with its parts legible) — Tasks 5, 15.
- AC3 (apply-or-roll offered after a banked trick, the only place the pot can cash) — Tasks 13, 15.
- AC4 (the Apply Damage button and its refusals removed) — Task 9.
- AC5 (applying deals the pot and zeroes both) — Tasks 5, 13.
- AC6 (rolling over leaves both untouched) — Task 13.
- AC7 (a hurt trick wipes both, pays the Quarry nothing, offers no choice) — Tasks 5, 13, 15.
- AC8 (the hand end does not cash; total and roll carry) — Tasks 5, 7, 8.
- AC9 (everything resets at a fight boundary) — Task 7.
- AC10 (`baseDamage` one configured constant, read in one place) — Tasks 3, 5, verified in Task 19.
- AC11 (Blade and Momentum contribute to their own trick only) — Tasks 4, 5.
- AC12 (tier values unchanged) — Task 4's spec pins 1/3/5 and 2/3/5.
- AC13 (bare play pays 1, 4, 9, 16, 25, 36) — Task 5's spec.
- AC14 (a separate full-viewport screen carrying the two played cards) — Tasks 13, 14, 15.
- AC15 (the card travels; the landing does not depend on an animation finishing) — Tasks 16, 17.
- AC16 (one term per beat, Overlap on its own beat) — Tasks 11, 12, 15.
- AC17 (the ledger is exactly two rows, scrolls, follows the newest) — Task 15.
- AC18 (reduced motion keeps the stagger, drops travel/scale/ring) — Tasks 12, 15.
- Splitting `WarCouncilRound.tsx` under its budget — Task 14.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step is either a concrete code change or a runnable command with `Run:` / `Expected:`. Every value described as PLACEHOLDER is a value transcribed from the approved mockup and routed to the developer, never one invented here.

**Type / name consistency:** `StreakState`, `EMPTY_STREAK`, `potValue`, `applyPot`, `incomingFromPot`, `TrickDamage`, `TrickBuffBonus`, `trickBonusFor`, `BASE_DAMAGE`, `baseDamageBonus`, `streakAfter`, `ResolutionView`, `ResolutionBeat`, `BeatKind`, `resolutionBeatsFor`, `useBeatSequence`, `useCardFlight`, `ApplyPot`, `RollOver`, and the four CSS tokens `--wc-beat` / `--wc-resolve-hold` / `--wc-flight` / `--wc-ledger-row` are each spelled identically in every task that names them and match `plan.md` Part 2 → Data shapes exactly. `RoundState.total` / `RoundState.roll` are introduced in Task 1 and used under those names in every later task.

**Phase boundary cleanliness:**
- **Phase 1** ends with a pure rename: it type-checks, and every previously-passing assertion still passes with no expected value edited.
- **Phase 2** ends with the new formula in the engine and the engine's specs rewritten to the new numbers; the app layer still compiles because it reads only `TrickResolution` fields that survive.
- **Phase 3** ends with the streak carried on the run and threaded through mount, seed, result and simulator, with the new prop optional so no fixture breaks.
- **Phase 4** ends with the button and the queue fully deleted and no dangling import; the pot is deliberately uncashable at this seam, which is stated in the phase's framing so the executor does not stop.
- **Phase 5** ends with the resolution screen reachable and the pot cashable, both files under 400 lines (measured, not estimated).
- **Phase 6** ends with the flight wired and its three landing paths pinned.
- **Phase 7** changes no production code.
