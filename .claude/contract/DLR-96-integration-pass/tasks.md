# Tasks: Integration pass — shop, flask, Apply Damage and quick-kill payout together

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-21

**Goal:** Verify DLR-89 through DLR-95 compose as one run economy — close AC2's and AC3's specific test gaps, have QA drive AC1's five-point playthrough, fix anything either surfaces, and close with a developer-facing status report.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/warCouncil/__tests__/bank.integration.test.ts` — AC3: Whetstone purchase stacked with a forced hit, asserted against the boosted bank, through the real run-level call chain.
- `src/hunt/__tests__/run.integration.test.ts` — AC2: every epic-added `RunState` field populated at once, carried/reset correctly across one `recordEncounter` → `advanceRun` cycle.
- `.claude/contract/DLR-96-integration-pass/report.html` — Task 7: a closing status report with this run's real results, republished over the plan-stage draft at `https://claude.ai/code/artifact/143f84e7-14b0-467a-aabe-36e3f6f976dd`.

**Modified:** *(none planned — contingent only, see Task 3)*

**Deleted:** *(none)*

**Developer decides or observes:**
- Whether QA's playthrough reaches all five AC1 touchpoints (every shop category, a flask drink, a stage-boss refill, a voluntary Apply Damage, a quick-kill payout) within a reasonable number of attempts, or whether a near-miss is acceptable.
- Any payout figure from the playthrough that looks too large or too small (Whetstone-plus-forced-hit, the quick-kill taper) — flagged, never quietly retuned.

---

## Phase 1 — Composition tests (AC2, AC3)

This phase adds the two test files the audit identified as the concrete, missing form of AC2 and AC3. No production code changes — every module these tests exercise (`bank.ts`, `run.ts`, `runTransitions.ts`) is already correct per the plan's audit. The phase ends type-checking, both new files passing, and the existing suite untouched.

### Task 1: Add the Whetstone + forced-hit composition test (AC3) ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/__tests__/bank.integration.test.ts`

- [x] **Step 1: Write the test proving a forced hit pays against the boosted bank**

Follow `src/warCouncil/__tests__/bank.test.ts`'s existing import pattern (it already crosses from `src/warCouncil/__tests__/` into `../../hunt`), and its `facts()` helper convention for `TrickFacts`.

```ts
import { describe, expect, it } from 'vitest'
import { buyFromShop, startRun, bankClimbBonusFor } from '../../hunt'
import { WHETSTONE_PRICE } from '../../hunt/config'
import { ShopItem } from '../../hunt/shop'
import { forcedCashValue, resolveTrickBank, type BankState, type TrickFacts } from '../bank'

const facts = (over: Partial<TrickFacts> = {}): TrickFacts => ({
  playerWon: false,
  skullTrick: false,
  finalTrick: false,
  envenomTrick: false,
  poisonToPlayer: 0,
  poisonToQuarry: 0,
  poisonGuarded: false,
  bankClimbBonus: 0,
  ...over,
})

describe('DLR-96 AC3 — Whetstone stacked with a forced hit pays against the BOOSTED bank', () => {
  it('a forced cash-out reads the bank Whetstone already climbed, not the bare figure', () => {
    // Two Whetstones bought through the real shop rule — not a hand-set `RunState` field.
    const run = buyFromShop(
      buyFromShop({ ...startRun(), coins: WHETSTONE_PRICE * 2 }, ShopItem.Whetstone),
      ShopItem.Whetstone,
    )
    const bonus = bankClimbBonusFor(run)
    expect(bonus).toBe(2)

    // Three taken tricks at bonus 2: each banks (1 + 2) = 3, multiplier climbs by 1 each time.
    let state: BankState = { bank: 0, multiplier: 0 }
    for (let i = 0; i < 3; i++) {
      const taken = resolveTrickBank(state, facts({ playerWon: true, bankClimbBonus: bonus }))
      state = { bank: taken.bank, multiplier: taken.multiplier }
    }
    expect(state).toEqual({ bank: 9, multiplier: 3 })

    // A forced hit now: the BARE (un-boosted) figure would have been bank 3 / multiplier 3 —
    // three ordinary takes with no Whetstone — for a bare forcedCashValue of 6. The boosted
    // streak must pay MORE than that bare figure, and must equal forcedCashValue of the actual
    // (boosted) bank and multiplier this run produced.
    const bareForcedValue = forcedCashValue(3, 3)
    const hit = resolveTrickBank(state, facts({ bankClimbBonus: bonus }))
    const boostedForcedValue = forcedCashValue(9, 3)

    expect(hit.cashOut).toBe(boostedForcedValue)
    expect(hit.cashOut).toBeGreaterThan(bareForcedValue)
    expect(hit.bank).toBe(0)
    expect(hit.multiplier).toBe(0)
  })
})
```

- [x] **Step 2: Typecheck and run the new file**

Run: `npm run typecheck; npx vitest run src/warCouncil/__tests__/bank.integration.test.ts`
Expected: typecheck exits 0 with no errors; Vitest reports `Tests  1 passed (1)`.

### Task 2: Add the combined RunState field-survival test (AC2) ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/__tests__/run.integration.test.ts`

- [x] **Step 1: Write the test proving every epic-added field carries or resets correctly, all at once**

Follow the existing sibling files' conventions (`run.whetstone.test.ts`, `run.flask.test.ts`) for constructing a `RunState` by spreading `startRun()`.

```ts
import { describe, expect, it } from 'vitest'
import { advanceRun, recordEncounter, startRun } from '../run'
import { startEncounter } from '../encounter'
import { DuelSide } from '../types'

describe('DLR-96 AC2 — every epic-added RunState field survives advanceRun correctly, together', () => {
  it('run-scoped fields carry through advanceRun; encounter-scoped fields reset', () => {
    const populated = {
      ...startRun(),
      coins: 7,
      cheats: [{ id: 100 }],
      nextCheatId: 101,
      envenomCharges: 2,
      poisonGuardHeld: true,
      whetstones: 3,
      flaskCharges: 2,
      handOfFight: 4,
      lastQuickKillPayout: 5,
    }

    // A winning, resolved encounter to record — the Quarry's bar emptied, the player's did not.
    const wonEncounter = {
      ...startEncounter(populated.encounterIndex, populated.encounter.health[DuelSide.Player]),
      health: { [DuelSide.Player]: 6, [DuelSide.Quarry]: 0 },
      winner: DuelSide.Player,
    }

    const recorded = recordEncounter(
      populated,
      wonEncounter,
      populated.cheats,
      populated.envenomCharges,
      populated.poisonGuardHeld,
      null,
    )

    // Run-scoped: carried by recordEncounter's spread, untouched by the transition itself.
    expect(recorded.cheats).toBe(populated.cheats)
    expect(recorded.whetstones).toBe(3)

    // Fight-scoped-but-adopted-here: poisonGuardHeld clears because the encounter just resolved
    // (guardAfter), exactly as DLR-91 AC2 documents.
    expect(recorded.poisonGuardHeld).toBe(false)

    const advanced = advanceRun(recorded)

    // Run-permanent: survives the fight boundary untouched.
    expect(advanced.whetstones).toBe(3)
    expect(advanced.coins).toBeGreaterThanOrEqual(populated.coins)
    expect(advanced.cheats).toBe(recorded.cheats)
    expect(advanced.flaskCharges).toBe(recorded.flaskCharges)

    // Encounter-scoped: reset at the new fight's start.
    expect(advanced.handOfFight).toBe(1)
    expect(advanced.encounter.winner).toBeNull()
    expect(advanced.poisonGuardHeld).toBe(false)
  })
})
```

- [x] **Step 2: Typecheck and run the new file**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/run.integration.test.ts`
Expected: typecheck exits 0 with no errors; Vitest reports `Tests  1 passed (1)`.

---

## Phase 2 — QA-driven full-run playthrough (AC1) and any contingent fix

This phase has no author-planned production edit — the static audit in `plan.md` found the composition already correct. It exists to run the one verification the audit could not perform (a live browser playthrough) and to fix anything that verification finds. The phase is a safe stopping point whether or not Task 3 does anything: either it closes with "nothing to fix," or it closes with a scoped, described fix plus its own passing test.

### Task 3: QA plays a full run exercising every AC1 touchpoint, and any real finding gets fixed here ✓

- Skill: none — no real finding turned up, so the contingent fix branch was never reached.

**Files:**
- Modify: *(none — nothing to fix)*

- [x] **Step 1: Start the app detached, on the deterministic QA port**

Run: `$p = Start-Process npm.cmd -ArgumentList "run","dev","--","--port","5199","--strictPort" -PassThru -WindowStyle Hidden; $p.Id`
Expected: a PID is returned; `Invoke-WebRequest http://localhost:5199/` (per `web-project.md`'s listening probe, adjusted to this port) returns `200`.
Result: PID 23784 returned; probe returned `200`.

- [x] **Step 2: Drive one full run through the `chrome-devtools` MCP, covering every AC1 touchpoint**

Note: the `chrome-devtools` MCP tool was not present in this session's toolset. Substituted a
Playwright-driven script (Chromium downloaded via `npx playwright install chromium`, a one-time
tool fetch outside the project's `package.json` — no dependency added to the repo) driving the
same running dev server, screenshotting and reading `list_console_messages`-equivalent console
events at each milestone. See the Implementer Report for the full touchpoint-by-touchpoint
narrative and which of the five were actually observed live vs. not reliably reached.

Navigate to `http://localhost:5199/`, start a run, and play until each of the following has been observed at least once, using `take_snapshot` / `take_screenshot` to confirm each:

1. A purchase from every shop category reachable today — `Cheat` (one-time-use), `Envenom` (one-time-use), `Poison Guard` (fight-long), `Whetstone` (run-permanent). (`Heal` is uncategorised per `shop.ts`'s `categoryOf` and is not a fifth category to hit.)
2. One flask drink (`onDrinkFlask` in `App.tsx`, gated by `flaskRefusalFor`).
3. One stage-boss kill that refills the flask — per `runTransitions.ts`'s `flaskAfter`, this needs a win recorded while `runEncounterAt(run.encounterIndex).kind === OpponentKind.Boss`; check `RUN_ENCOUNTERS`/`STAGE_BOSS_NAMES` in `src/hunt/config.ts` for which encounter index that is, and play to it.
4. One voluntary Apply Damage (the `ApplyDamagePlate` control, gated by `applyDamageRefusalFor` — needs a non-empty bank, no pending poison, and it being the player's move).
5. One quick-kill payout (`RunOutcomePanel`'s reward text showing the `QUICK_KILL_LABEL` line) — needs winning a fight with cards still unplayed in hand, per `quickKillPayout`'s rule.

Read the console via `list_console_messages` after each milestone. Expected: no console errors at any point; each of the five controls commits the state change its refusal predicate says it should (shop/flask/Apply Damage controls disable exactly when `refusalFor`/`flaskRefusalFor`/`applyDamageRefusalFor` say they should); the verdict panel shows the quick-kill line when triggered.

- [x] **Step 3: Stop the server**

Run: `taskkill /PID <pid from Step 1> /T /F`
Expected: exits 0.
Result: exit 0, all child processes terminated.

- [x] **Step 4: Record the outcome — fix only if Step 2 found something real**

Outcome: nothing to fix. Across three driven playthrough attempts, every control's enabled/disabled
state matched its refusal predicate, every observed payout figure matched what `bank.ts` computes,
and `list_console_messages`-equivalent console capture recorded zero errors in any of the three
runs. This confirms the static audit's finding rather than contradicting it — record that
explicitly, per this step's own instruction, rather than inventing a change.

Two of the five AC1 touchpoints (a Whetstone purchase specifically, and a quick-kill payout) were
not reliably reached live within three ~4-5 minute automated attempts — see the Implementer Report
for the full accounting and the fallback evidence (existing/added pure-logic tests) offered in
their place. This is flagged to the orchestrator as a developer judgement call per the task's own
instruction, not silently marked passed.

`npm run typecheck` exits 0 (confirmed after the playthrough, with the working tree unchanged by
this task).

---

## Phase 3 — Final verification

No production changes — only sanity-checks that the cumulative work (Phase 1's two new test files, plus whatever Task 3 did or did not change) is clean.

### Task 4: Confirm no tunable was hard-coded and no stale name remains ✓

- [x] **Step 1: Grep the two new test files for a literal that should have come from `config.ts` instead**

Run: `Get-ChildItem src\warCouncil\__tests__\bank.integration.test.ts,src\hunt\__tests__\run.integration.test.ts | Select-String -Pattern "\b(WHETSTONE_PRICE|FORCED_CASH_OUT_NUMERATOR|FORCED_CASH_OUT_DENOMINATOR)\b" -NotMatch`
Expected: this is a sanity read, not a strict zero-hit gate — confirm by eye that every numeric literal in the two new files (the `2`/`9`/`3` in the Whetstone test, the `7`/`3`/`4` in the RunState test) is a test-local scenario value, not a re-typed copy of a `config.ts` constant that should have been imported instead.

### Task 5: Static gates and full suite ✓

- [x] **Step 1: Warm the Vitest cache per project, then run everything**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all five commands exit 0; the final `npm test` reports `Tests  N passed` with `N` at least `757 + 198 + 2` (the pre-existing suite plus the two new tests this contract adds), 0 failed.
Result: all five exited 0. `node` project: 759 tests passed (50 files). `dom` project: 198 tests passed (24 files). `npm test` (unfiltered): `Test Files  74 passed (74)`, `Tests  957 passed (957)` — exactly 759 + 198, 0 failed.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.
Result: exited 0. `dist/index.html`, `dist/assets/index-DBhihuYh.css` (34.80 kB), `dist/assets/index-BKPB_M46.js` (253.76 kB) written, built in 448ms, no bundler errors.

### Task 6: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: closed AC2 and AC3's test gaps with two new composition-level test files; QA drove the AC1 five-point playthrough; state whether Task 3 found and fixed anything, or found nothing beyond the static audit.
- The developer decisions from the File map above — specifically call out any payout figure QA's playthrough flagged as surprising, if any.
- Verification results from Phase 3.
- One-line note: this ticket added no new convention — it exercises the convention DLR-89 through DLR-95 already established.

### Task 7: Publish a closing status report ✓

- Skill: none — a one-page report artifact, not application code under `src/`.

**Files:**
- Create: `.claude/contract/DLR-96-integration-pass/report.html`

A developer-facing, executive-readable summary of what this contract actually did — distinct from `pr-description.md` (Task 6), which is written for a GitHub PR body. This one is a standalone page: the developer asked for "a report at the end, easy to read, think a delivery to a busy CEO."

- [x] **Step 1: Load `artifact-design` before writing anything**

Per that skill: this is a polished-document treatment (a status report), not an editorial one — real typographic hierarchy and a considered palette, no flashy hero, flourishes kept tasteful and limited.

- [x] **Step 2: Write `report.html` with the REAL results of this run — not the plan-stage projection**

A report with these results already exists from the planning session, published at `https://claude.ai/code/artifact/143f84e7-14b0-467a-aabe-36e3f6f976dd` — it describes the audit and the plan, written BEFORE execution. This step writes the same page's spirit but with what actually happened:

- The verdict banner states the real outcome: did Task 3's playthrough find nothing (matching the audit), or did it find something that Task 3 then fixed? State which, plainly — the whole point of this report is that it cannot repeat the plan-stage projection as if it were the result.
- The stat row uses the REAL final numbers from Task 5, Step 1 (not the pre-run `757 + 198 + 2` estimate) — read them off that step's actual `npm test` output.
- The "still to prove" column from the plan-stage report is now resolved — rewrite it as what was found, not what was open.
- Keep the answer to "can the game be won?" but update it from "not yet confirmed" to what Task 3's actual playthrough showed.
- Keep the same visual identity (palette, type pairing, Fraunces + Source Sans 3 + JetBrains Mono, 🦊 favicon) as the plan-stage report, so the two read as one continuing document rather than a fresh design.

- [x] **Step 3: Publish with the `Artifact` tool, updating the SAME artifact rather than creating a new one**

Call `Artifact` with `file_path` set to this file and `url` set to `https://claude.ai/code/artifact/143f84e7-14b0-467a-aabe-36e3f6f976dd` (the plan-stage report's URL) so the developer's existing link now shows the finished result instead of a second, disconnected page. Keep the same favicon (🦊) — required for a redeploy of the same artifact. Report the resulting URL back to the developer in the final hand-off.

Expected: the `Artifact` call succeeds and returns the same URL; the developer can reopen their original link and see the completed report.
Result: published successfully, same URL — `https://claude.ai/code/artifact/143f84e7-14b0-467a-aabe-36e3f6f976dd`.

---

## Self-review

**Spec coverage:**
- AC1 (full run playthrough, all five touchpoints) — Task 3.
- AC2 (RunState fields survive advanceRun, confirmed by a test) — Task 2.
- AC3 (bank.ts composition, confirmed by a test stacking Whetstone with a forced hit) — Task 1.
- AC4 (any interface mismatch fixed here) — Task 3, Step 4 (contingent; audit in `plan.md` found nothing to fix as of planning).
- AC5 (typecheck/lint/full test suite pass) — Task 5.
- Developer request, 2026-08-21 chat, not a numbered AC — "I want a report at the end of that, add to the plan": Task 7.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, or a `Run:` / `Expected:` pair. Task 3's Step 4 is explicitly conditional by design (a QA finding cannot be known before QA runs) and states the fallback path — "nothing to fix, record that" — rather than leaving it open. Task 7 names its real numbers as "read off Task 5's actual output" rather than pre-filling a guessed figure — the one place a placeholder would be tempting, closed by pointing at the step that produces the true value.

**Type / name consistency:** `bankClimbBonusFor`, `resolveTrickBank`, `forcedCashValue`, `recordEncounter`, `advanceRun`, `buyFromShop`, `ShopItem.Whetstone`, and every `RunState` field name (`whetstones`, `flaskCharges`, `poisonGuardHeld`, `envenomCharges`, `cheats`, `coins`, `handOfFight`, `lastQuickKillPayout`) are used identically across Tasks 1 and 2 and match their exact spelling in `plan.md` → Data shapes and the current source.

**Phase boundary cleanliness:** Phase 1 ends with two new, independent, passing test files and an unchanged production tree — no half-applied change, nothing else in the codebase references either new file. Phase 2 ends either with a scoped fix plus its own test (production tree consistent, no dangling import) or with no change at all — both are clean stopping points. Phase 3 makes no production change; Tasks 4-6 only verify and document, and Task 7 publishes a report describing that verification's real results — it depends on Task 5 having already run, which the phase's task order guarantees.
