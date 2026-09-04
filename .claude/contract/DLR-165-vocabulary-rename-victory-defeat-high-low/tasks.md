# Tasks: Vocabulary rename — Victory/Defeat name the outcome, High/Low name the act

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: IN PROGRESS
Started: 2026-09-03

**DLR-165 execution note (batch run, 2026-09-04).** Phases 1–5 are implemented and green except
where noted below. Under the batch-run rules this contract ran with: no reviewer dispatch, no
documentation phase (Task 14 is delegated to a consolidated pass across five tickets), and no
unfiltered suite / lint / build / format gates (Task 16 is QA's). Task 17's PR description is
likewise deferred, since it must quote gate results this run did not produce. Every count and line
number in the file map below was derived before DLR-162, DLR-163, DLR-166 and DLR-167 landed and is
stale; the work was re-derived by grep against the tree as it actually stands.

**Goal:** Give the outcome axis and the mechanical axis their own words — Victory/Defeat for whether a trick banked or hurt, High/Low for whether the player physically took the cards — across the identifiers, the shipped copy, the ruleset, and the pipeline's own prose, changing no mechanic.

**Spec:** `plan.md` in this folder. Layout and copy reference: `mockup.html` in this folder.

---

## File map

**Created:** (none — no new files)

**Modified:**

*Phase 1 — engine identifiers and the save version*
- `src/hunt/buffs.ts:16-19` — `BuffKind.Taker/Feeder/Sidestep` → `SuitHigh/SuitLow/SkullLow`, values `'suitHigh'/'suitLow'/'skullLow'`
- `src/hunt/buffTemplates.ts` — `MintableConditionKind` narrowing, `TEMPLATE_FAMILIES` rows, the `templateIdFor` docblock's example id
- `src/hunt/buffAccrual.ts` — `BuffKind.Feeder` reads; `trickIsLoss` → `trickIsDefeat`
- `src/hunt/buffActivation.ts:233-238` — `REVOCABLE_BUFF_KINDS` members
- `src/hunt/buffCosts.ts:47-55` — the `ConditionFamilyKind` union members
- `src/hunt/buffEvaluation.ts` — the three `buffFires` cases and their comments; `playerWon` → `playerWentHigh` on `BuffTrickContext`
- `src/hunt/buffProtection.ts` — kind references
- `src/hunt/consumables.ts`, `src/hunt/slotConfig.ts`, `src/hunt/slotWeights.ts`, `src/hunt/startingPile.ts` — kind references and `BUFF_CADENCE`/weight rows
- `src/hunt/run.ts:164`, `src/hunt/runCarry.ts:27`, `src/hunt/runTransitions.ts` — `feederCarry` → `lowCarry`, `feederCarryAfter` → `lowCarryAfter`
- `src/hunt/index.ts` — re-exports
- `src/persistence/config.ts:22` — `SAVE_SCHEMA_VERSION` 1 → 2
- `src/vault/vaultStore.ts:15` — the docblock asserting the version has never been bumped
- 15 `src/hunt/__tests__/` specs, `src/persistence/__tests__/saveStore.test.ts`, `src/vault/__tests__/vaultStore.test.ts`

*Phase 2 — the mechanical-axis vocabulary in the engine*
- `src/warCouncil/streak.ts:19-25` — `TrickOutcome` members and values
- `src/warCouncil/playCard.ts`, `src/warCouncil/buffProjection.ts`, `src/warCouncil/index.ts` — `playerWon` → `playerWentHigh`, outcome members
- 8 `src/warCouncil/__tests__/` specs

*Phase 3 — player-facing copy*
- `src/app/warCouncil/buffLabels.ts` — `BUFF_FAMILY_WORD`, `BUFF_CONDITION_SENTENCE`, `BUFF_WIDENED_CONDITION_SENTENCE`, `BUFF_EVENT_WORD`, `buffName` grammar
- `src/app/warCouncil/resolutionOutcome.ts` — `TrickOutcomeKind`, `trickOutcomeKindFor`, `TRICK_OUTCOME_WORD`
- `src/app/warCouncil/labels.ts:174-179` — `TRICK_OUTCOME_MESSAGE`
- `src/app/warCouncil/TrickWell.tsx`, `BankMeter.tsx`, `quarryAdvance.ts`, `cardDamage.ts`, `buffRideLabels.ts`, `buffFiredLabels.ts`, `buffBreakdownModel.ts`, `buffRoundState.ts`, `resolutionDeadBuffs.ts`, `resolutionLabels.ts`, `ResolutionBreakdown.tsx`, `roundResult.ts`, `roundUiSeed.ts`, `WarCouncilRound.tsx`, `breakdownRectContext.ts`
- `src/app/warCouncilMount.ts`, `src/App.tsx:162,388`
- `src/app/run/slotSymbols.ts`, `SlotGlyph.tsx:21`, `SlotStripChips.tsx`, `heldBuffs.ts:63`, `manageBuffsLabels.ts:37`
- `src/app/run/shopSlot.css:107`, `src/app/run/shopSlotReel.css:114` — the `data-glyph='sidestep'` selectors
- 26 `src/app/**/__tests__/` specs

*Phase 4 — the simulator*
- `src/sim/types.ts`, `fixtures.ts`, `playHand.ts`, `playHandWindows.ts`, `playRun.ts`, `report.ts`, `cardAwarePolicy.ts`, `skilledCardPlay.ts`, `skilledPolicy.ts`
- `src/sim/__tests__/playHand.test.ts`, `reachability.test.ts`, `simulate.test.ts`

*Phase 5 — prose*
- `CLAUDE.md:75-122` — the "Win and lose mean two different things" section, and the template count on line 125
- `.claude/agents/implementer.md`, `.claude/commands/fb-plan.md`, `.claude/commands/fb-report.md`, `.claude/rules/save-data-versioning.md`, `.claude/workflow/web-project.md`
- `.claude/skills/ai-play-tester/SKILL.md` + `references/round-driver.md` + `references/strategy-engine.md`
- `.claude/skills/game-designer/SKILL.md`
- `.claude/skills/game-ux/references/feedback-to-redesign.md` + `references/full-viewport-layout.md` + `references/figma-mcp.md`
- `.claude/skills/implementation-doc-writer/SKILL.md`
- `.claude/skills/play-tester/SKILL.md` + `references/sim-architecture.md`
- `.claude/skills/react-frontend/references/engineering-standards.md`
- `.claude/skills/skill-creator/references/type-patterns.md`
- `.claude/sprint-runs/2026-08-23-sprint/log.md`
- `.docs/design/Balatro-Forbidden-Solitaire/ideas.md` — one dated line marking the vocabulary section shipped
- `.docs/game_rules/the-hunt.md` and the affected `.docs/implementation/` files — **regenerated by the `implementation-doc-writer` skill, never hand-edited**

**Deleted:** (none)

**Developer decides or observes:**
- `BUFF_EVENT_WORD` for `SkullHelmet` / `SkullTether` — the plan ships `'SKULL'`. Bronze fires on a High Defeat and silver/gold on any Defeat, so no single High/Low word is true at both tiers. `'HURT'` (today's word) names the outcome axis; `'HIGH'` is wrong above bronze.
- `TRICK_OUTCOME_MESSAGE`'s four sentences — copy judgement. The plan leads each with the four-way name; the rest of the sentence is yours.
- Whether the four-way name *feels* right as the headline where a colour word (*Dodge*) sits today, and whether the two-word structural name loses the punch the colour word had. Judged in `mockup.html` or by playing. (Whether it wraps or clips is QA's, not yours.)
- Three cards will be called Skull-something after this: **Skull Low**, **Skull Helmet**, **Skull Tether** — the first fires going low on a skull, the other two going high on one. Fixing the near-collision means renaming DLR-161's cards, which is a design decision and not in this contract.
- Bumping `SAVE_SCHEMA_VERSION` **resets your Vault once** — balance, odds boosts and starting grants all go on the first load after this ships. Accepted by the ticket; flagged because it happens without a prompt.

---

## Phase 1 — Engine identifiers and the save version

The `BuffKind` string values compose the template ids the Vault has already written to disk, so this phase changes an incompatible persisted shape. `.claude/rules/save-data-versioning.md` reject condition 4 requires the `SAVE_SCHEMA_VERSION` bump in the same task as that change — Task 1 carries both, plus every `src/hunt/` production reader, so no intermediate state exists where the app compiles and silently eats the Vault. Task 2 brings the specs and Vault fixtures with it. The phase is a safe stopping point once both tasks are done: the whole `src/hunt/` tree type-checks and its specs pass. Stopping between Task 1 and Task 2 is not a boundary — the specs will not compile.

Read `.claude/rules/save-data-versioning.md` before starting this phase.

### Task 1: Rename the three `BuffKind` members, their readers in `src/hunt/`, and bump `SAVE_SCHEMA_VERSION` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/buffs.ts:16-19`
- Modify: `src/hunt/buffTemplates.ts`
- Modify: `src/hunt/buffAccrual.ts`
- Modify: `src/hunt/buffActivation.ts:233-238`
- Modify: `src/hunt/buffCosts.ts:47-55`
- Modify: `src/hunt/buffEvaluation.ts`
- Modify: `src/hunt/buffProtection.ts`
- Modify: `src/hunt/consumables.ts`
- Modify: `src/hunt/slotConfig.ts`
- Modify: `src/hunt/slotWeights.ts`
- Modify: `src/hunt/startingPile.ts`
- Modify: `src/hunt/run.ts:164`
- Modify: `src/hunt/runCarry.ts:27`
- Modify: `src/hunt/runTransitions.ts`
- Modify: `src/hunt/index.ts`
- Modify: `src/vault/vaultStore.ts:15`
- Config: `src/persistence/config.ts:22` — `SAVE_SCHEMA_VERSION` 1 → 2

- [x] **Step 1: Rename the three members and their serialised values in `src/hunt/buffs.ts`**

Replace the three rows inside the `// 11 shipping condition families` block:

```ts
  // DLR-165 — renamed from Taker / Feeder / Sidestep. The condition each names is the MECHANICAL
  // axis: High = the player physically took the cards, Low = they did not. `SuitHigh` rather than
  // a bare `High` because `BuffKind.High` read inside `buffFires` collides with "the higher card",
  // which is the ambiguity this ticket exists to remove.
  // The VALUE change is BREAKING for persisted template ids — `templateIdFor` composes
  // `suitHigh:bells:magnitude` from it, and the Vault has `taker:bells:magnitude` on disk.
  // `SAVE_SCHEMA_VERSION` is bumped to 2 in this same task; see Step 6.
  SuitHigh: 'suitHigh',
  SuitLow: 'suitLow',
  MarkOfRank: 'markOfRank',
  SkullLow: 'skullLow',
```

Leave every other member — name and value — untouched.

- [x] **Step 2: Update the narrowing type and the family rows in `src/hunt/buffTemplates.ts`**

`MintableConditionKind` becomes:

```ts
export type MintableConditionKind =
  | typeof BuffKind.SuitHigh
  | typeof BuffKind.SuitLow
  | typeof BuffKind.SkullLow
  | typeof BuffKind.SkullHelmet
  | typeof BuffKind.SkullTether
```

Update every `TEMPLATE_FAMILIES` row that names one of the three, and change the `ConditionBuffTemplate.id` docblock's worked example from `taker:bells:magnitude` to `suitHigh:bells:magnitude`. In the same docblock, replace the sentence *"a future rename must ship a migration"* with a note that DLR-165 performed the rename and bumped `SAVE_SCHEMA_VERSION` to 2 instead of migrating, deliberately, so no dead vocabulary survives in a migration map. Update the file's own header docblock where it names Taker, Feeder and Sidestep in the DLR-145/DLR-150/DLR-161 history paragraphs — the ticket keys and the counts stay, the family words change.

- [x] **Step 3: Rename the mechanical-axis field on `BuffTrickContext` in `src/hunt/buffEvaluation.ts`**

`playerWon` → `playerWentHigh`, and update its docblock:

```ts
  /** The player went HIGH on this trick — they physically took the cards, before the skull
   *  inverts what that is worth. Every buff condition reads this axis and nothing else. */
  readonly playerWentHigh: boolean
```

Update the three renamed families' `buffFires` cases and their comments. **The predicates themselves must not change** — the Low family stays `!playerWentHigh && suit matches` with no skull term, and `SkullLow` stays `skullTrick && !playerWentHigh`. Rewrite the `// "Dodge a skull with this card"` comment as `// "Go low on a skull" — the player did not take a trick that carried one.`

- [x] **Step 4: Rename `trickIsLoss` → `trickIsDefeat` in `src/hunt/buffAccrual.ts`, and its `BuffKind.Feeder` reads**

Both occurrences at `:179` and `:220`, plus the `:208` docblock naming `BuffKind.Feeder`. The branch condition and every figure it computes stay identical.

- [x] **Step 5: Rename the carry field across `src/hunt/`**

`RunState.feederCarry` → `lowCarry` (`run.ts:164`, `:221`), `feederCarryAfter` → `lowCarryAfter` (`runCarry.ts:27`, and its import in `runTransitions.ts:10`), and the `buffAccrual.ts:52` docblock that names `feederCarryAfter`. Re-export names in `src/hunt/index.ts` follow. `RunState` is not persisted — the Vault is the only save store — so this carries no save risk.

- [x] **Step 6: Bump `SAVE_SCHEMA_VERSION` in `src/persistence/config.ts`**

```ts
/** DLR-165 — bumped 1 → 2. The `BuffKind` values that `templateIdFor` composes persisted template
 *  ids from were renamed (`taker:` → `suitHigh:`, `feeder:` → `suitLow:`, `sidestep:` → `skullLow:`),
 *  so every id already on disk is unresolvable. `reconcileVault` would drop each one silently and
 *  the developer's boosts and grants would vanish with no message; the bump makes `saveStore`
 *  return `SaveReadOutcome.VersionMismatch` and the default instead. This RESETS the Vault once,
 *  which is deliberate and preferred to a migration map that would keep the dead vocabulary alive
 *  in code. See `.claude/rules/save-data-versioning.md`. */
export const SAVE_SCHEMA_VERSION = 2
```

- [x] **Step 7: Correct the now-false docblock in `src/vault/vaultStore.ts:15`**

It currently reads *"`SAVE_SCHEMA_VERSION` is NOT bumped here — this is the first shape ever written, at version 1"*. Replace with a statement that the shape is unchanged by DLR-165 but the *content* of its `templateId` strings is, which is why the version moved to 2 and why a version-1 payload is now rejected rather than reconciled.

- [x] **Step 8: Type-check — this will fail in the specs, which is expected**

Run: `npm run typecheck`
Expected: zero errors in any non-test file under `src/hunt/`, `src/persistence/` or `src/vault/`. Errors in `__tests__/` files are expected and are Task 2's work — do not fix production code in response to a spec-only error.

### Task 2: Update the `src/hunt/`, `src/persistence/` and `src/vault/` specs to the new identifiers ✓

- Skill: `react-frontend`

**Files:**
- Test: `src/hunt/__tests__/buffAccrual.test.ts`
- Test: `src/hunt/__tests__/buffActivation.test.ts`
- Test: `src/hunt/__tests__/buffActivation.deactivate.test.ts`
- Test: `src/hunt/__tests__/buffActivation.timebombLive.test.ts`
- Test: `src/hunt/__tests__/buffCarry.test.ts`
- Test: `src/hunt/__tests__/buffCombine.test.ts`
- Test: `src/hunt/__tests__/buffCosts.test.ts`
- Test: `src/hunt/__tests__/buffEvaluation.test.ts`
- Test: `src/hunt/__tests__/buffProtection.test.ts`
- Test: `src/hunt/__tests__/buffs.test.ts`
- Test: `src/hunt/__tests__/buffTemplates.test.ts`
- Test: `src/hunt/__tests__/consumables.test.ts`
- Test: `src/hunt/__tests__/run.feederCarry.test.ts` — **renamed** to `run.lowCarry.test.ts`
- Test: `src/hunt/__tests__/slotWeights.test.ts`
- Test: `src/hunt/__tests__/trickBonus.test.ts`
- Test: `src/persistence/__tests__/saveStore.test.ts`
- Test: `src/vault/__tests__/vaultStore.test.ts`

- [x] **Step 1: Update every `BuffKind`, `playerWon`, `trickIsLoss` and carry reference in the 15 `src/hunt/` specs**

Every assertion is **updated, never deleted** (AC12). Composed-id literals move with them: `'taker:bells:magnitude'` → `'suitHigh:bells:magnitude'`, `'feeder:keys:multiplier'` → `'suitLow:keys:multiplier'`, `'sidestep:magnitude'` → `'skullLow:magnitude'`. Rename the spec file `run.feederCarry.test.ts` to `run.lowCarry.test.ts` and update its `describe` string.

- [x] **Step 2: Add a spec asserting the persisted-id grammar so a future rename cannot slip through silently**

Append to `src/hunt/__tests__/buffTemplates.test.ts`:

```ts
it('composes template ids from the current BuffKind values, which are PERSISTED', () => {
  // DLR-165 — a rename of any of these values orphans every Vault entry keyed on the old id.
  // If this test fails, the fix is a SAVE_SCHEMA_VERSION bump in the same change, not a new
  // expectation string. See `.claude/rules/save-data-versioning.md`.
  const ids = BUFF_TEMPLATES.map((t) => t.id)
  expect(ids).toContain('suitHigh:bells:magnitude')
  expect(ids).toContain('suitLow:bells:multiplier')
  expect(ids).toContain('skullLow:magnitude')
  expect(ids.some((id) => /^(taker|feeder|sidestep)[:$]/.test(id))).toBe(false)
})
```

- [x] **Step 3: Confirm the version-mismatch path in `src/vault/__tests__/vaultStore.test.ts`**

`:74` already builds a payload at `SAVE_SCHEMA_VERSION + 1` and asserts the mismatch outcome — it needs no change beyond compiling. Add one spec asserting that a **version-1** payload carrying an old-vocabulary id is rejected by version rather than reconciled to an empty vault, so the two failure modes are told apart:

```ts
it('rejects a version-1 payload by VERSION, not by reconciling its old-vocabulary ids away', () => {
  const legacy = { balance: 40, oddsBoosts: { 'taker:bells:magnitude': 2 }, startingGrants: [] }
  storage.setItem(key, JSON.stringify({ version: 1, data: legacy }))
  const read = store.read()
  expect(read.outcome).toBe(SaveReadOutcome.VersionMismatch)
  expect(read.value).toEqual(EMPTY_VAULT)
})
```

Match the surrounding specs' setup helpers rather than the placeholder names above — read the file first.

- [x] **Step 4: Run the affected specs and the type gate**

Run: `npx vitest run src/hunt src/persistence src/vault --project node; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0 for every file under those three trees. Errors remaining in `src/app/`, `src/warCouncil/` and `src/sim/` are expected — those are Phases 2 to 4.

- [x] **Step 5: Prove the old family tokens are gone from the three trees**

Run: `Get-ChildItem src\hunt, src\persistence, src\vault -Recurse -Include *.ts,*.tsx | Select-String -Pattern "Taker|Feeder|Sidestep"`
Expected: zero hits. (`Select-String -Path` does not recurse — the `Get-ChildItem -Recurse` form above is required, per `.claude/workflow/web-project.md`.)

---

## Phase 2 — The mechanical-axis vocabulary in the card engine

`src/warCouncil/` declares the engine's own four-outcome union and reads the mechanical-axis field this contract renamed in Phase 1. Renaming both here means the compiler enumerates every consumer in `src/app/` before Phase 3 starts authoring copy against them. The phase closes with `src/hunt/` and `src/warCouncil/` both type-clean and their specs green; `src/app/` and `src/sim/` still fail, which is expected.

### Task 3: Rename `TrickOutcome` onto the four-way scheme and `playerWon` → `playerWentHigh` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/streak.ts:19-25`
- Modify: `src/warCouncil/playCard.ts`
- Modify: `src/warCouncil/buffProjection.ts`
- Modify: `src/warCouncil/index.ts`

- [x] **Step 1: Rename the four members and values in `src/warCouncil/streak.ts`**

```ts
/** §3.2's four rows. Renamed by DLR-165 onto the two-axis scheme: the first word is the
 *  MECHANICAL act (High = the player took the cards), the second is the OUTCOME (Victory = banks,
 *  Defeat = hurts). Named rather than a pair of booleans at every branch, so the rule reads out of
 *  the code the way it reads out of the design's table. */
export const TrickOutcome = {
  HighVictory: 'highVictory', // was CleanWin  — AC4, took a clean trick
  LowVictory: 'lowVictory', // was Dodge     — AC5, did not take a skulled trick
  LowDefeat: 'lowDefeat', // was CleanLoss — AC6, did not take a clean trick
  HighDefeat: 'highDefeat', // was SkullWin  — AC7, took a skulled trick
} as const
export type TrickOutcome = (typeof TrickOutcome)[keyof typeof TrickOutcome]
```

Update `:134`, `:139`, `:198` and `:217` — the derivation, the banks/hurts lookup, and the two comments that reason about a Dodge by name. The comment at `:198` explaining why the reset is keyed on `CleanLoss` rather than "the Quarry won" becomes: keyed on `LowDefeat` rather than on the player going low, deliberately — a Low Victory is also a trick the player did not take.

- [x] **Step 2: Rename `playerWon` → `playerWentHigh` in `playCard.ts` and `buffProjection.ts`**

No predicate changes. Update the `buffProjection.ts:70` docblock — *"which is the OUTCOME axis and counts a Dodge as taken"* becomes *"which is the OUTCOME axis and counts a Low Victory as banked"* — and `:83`, where a Low family *"pays into THIS hand on a Dodge and into the carry on a Clean Loss"* becomes *"on a Low Victory … on a Low Defeat"*.

- [x] **Step 3: Type-check**

Run: `npm run typecheck`
Expected: zero errors in any non-test file under `src/warCouncil/`. Errors in `src/app/`, `src/sim/` and in `__tests__/` are expected.

### Task 4: Update the `src/warCouncil/` specs ✓

- Skill: `react-frontend`

**Files:**
- Test: `src/warCouncil/__tests__/streak.test.ts`
- Test: `src/warCouncil/__tests__/streak.buffs.test.ts`
- Test: `src/warCouncil/__tests__/streak.formula.test.ts`
- Test: `src/warCouncil/__tests__/streak.integration.test.ts`
- Test: `src/warCouncil/__tests__/buffProjection.test.ts`
- Test: `src/warCouncil/__tests__/playCard.bank.test.ts`
- Test: `src/warCouncil/__tests__/playCard.timebomb.test.ts`
- Test: `src/warCouncil/__tests__/rankTiers.resolution.test.ts`

- [x] **Step 1: Update every outcome member, `playerWon` field and composed-id literal in the eight specs**

Updated, never deleted. `describe`/`it` titles that say "dodge", "clean win", "clean loss" or "skull win" move to the four-way names, so a failing test names the outcome the same way the screen does.

- [x] **Step 2: Add a spec pinning the four-way names to their two axes**

Append to `src/warCouncil/__tests__/streak.test.ts`:

```ts
it.each([
  [true, false, TrickOutcome.HighVictory, true],
  [false, true, TrickOutcome.LowVictory, true],
  [false, false, TrickOutcome.LowDefeat, false],
  [true, true, TrickOutcome.HighDefeat, false],
])(
  'went high=%s on a skull=%s -> %s, banks=%s',
  (playerWentHigh, skullTrick, expected, banks) => {
    expect(trickOutcomeFor(playerWentHigh, skullTrick)).toBe(expected)
    expect(OUTCOME_BANKS[expected]).toBe(banks)
  },
)
```

Use the file's real derivation and lookup names — read it first; `trickOutcomeFor` and `OUTCOME_BANKS` above stand for whatever `streak.ts` actually exports at `:134` and `:139`.

- [x] **Step 3: Run the two engine trees' specs**

Run: `npx vitest run src/hunt src/warCouncil --project node`
Expected: Vitest reports 0 failed.

- [x] **Step 4: Prove the old outcome vocabulary is gone from the engine trees**

Run: `Get-ChildItem src\hunt, src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "CleanWin|SkullWin|CleanLoss|\bDodge\b|playerWon"`
Expected: zero hits.

---

## Phase 3 — Player-facing copy

Everything the player reads. The three tables in `buffLabels.ts` carry almost all of the authoring; every other surface — the gallery, the manage-buffs rows, the slot chips, the fired-buff sentences, the accessible names — already composes through `buffName` and `buffConditionSentence` and needs only its identifier references updated. The one edit the compiler cannot check is the `data-glyph` CSS selector pair, which is why Task 8 changes the union and both stylesheets together. The phase closes with the whole `src/app/` tree type-clean and its specs green.

Read `.claude/skills/game-ux/SKILL.md` before Task 7 — the headline is a game surface.

### Task 5: Re-author the buff name and condition tables in `src/app/warCouncil/buffLabels.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/buffLabels.ts`

- [x] **Step 1: Rename the three family words and give `SkullLow` its own full name**

```ts
export const BUFF_FAMILY_WORD: Readonly<Record<BuffKind, string>> = {
  // DLR-165 — the family word is now an adjective naming the card's own condition. The two
  // suit-parameterised families take the suit prefix in `buffName`; `SkullLow` is suitless and so
  // carries its whole name here.
  [BuffKind.SuitHigh]: 'High',
  [BuffKind.SuitLow]: 'Low',
  [BuffKind.SkullLow]: 'Skull Low',
  // …every other row unchanged…
}
```

- [x] **Step 2: Change `buffName`'s join from a hyphen to a space**

```ts
/** `Bell High (Momentum)` / `Skull Low (Blade)` / `Mark of the 9 (Blade)` / `Cheat (Free Rein)`.
 *  DLR-165 replaced DLR-114's hyphenated `Bell-Taker` join with a space: the family word is now an
 *  adjective phrase ("High"), not a noun ("Taker"), and a hyphen reads wrong on one. */
export function buffName(buff: Buff): string {
  const suit = buffTargetSuitOf(buff)
  const rank = buffTargetRankOf(buff)
  const family = BUFF_FAMILY_WORD[buff.kind]
  const head =
    rank !== null
      ? `${family} ${rank}`
      : suit !== null
        ? `${SUIT_WORD[suit].replace(/s$/, '')} ${family}`
        : family
  return `${head} (${BUFF_REWARD_SUFFIX[buff.reward.axis]})`
}
```

- [x] **Step 3: Re-phrase every condition sentence onto the High/Low axis**

```ts
/** DLR-165 AC5 — every row is phrased on the MECHANICAL axis and no row names Victory or Defeat.
 *  The eight CUT families are re-phrased too: no player can reach them, but leaving outcome words
 *  in this table is how the retired vocabulary comes back the day a family is restored. */
export const BUFF_CONDITION_SENTENCE: Readonly<Record<BuffKind, string>> = {
  [BuffKind.SuitHigh]: 'go high on a {suit} trick',
  [BuffKind.SuitLow]: 'go low on a {suit} trick',
  // AC7 — "dodge a skull with this card" was false twice over: no buff attaches to a card, and
  // "dodge" is an outcome word. This is the first text this card has had that is true.
  [BuffKind.SkullLow]: 'go low on a skull',
  [BuffKind.MarkOfRank]: 'go high on a trick with a {rank}',
  [BuffKind.Glutton]: 'go high on a skull',
  [BuffKind.Hoarder]: 'reach a high bank this hand',
  [BuffKind.Unbloodied]: 'go high several tricks running',
  [BuffKind.DebtCollector]: 'apply damage this hand',
  [BuffKind.Keepsake]: "hold a {suit} card at hand's end",
  [BuffKind.Miser]: 'hold enough coins',
  [BuffKind.Cornered]: 'be low on health',
  // DLR-161's two protective families keep their NAMES — neither names an outcome — but their
  // text moves onto the High/Low axis and loses the same false "with this card" as SkullLow.
  [BuffKind.SkullHelmet]: 'go high on a skull',
  [BuffKind.SkullTether]: 'go high on a skull',
  // …the activated and consumable rows unchanged…
}

/** AC5 — "eat a skull, or lose a trick" named the OUTCOME axis on a card face. */
export const BUFF_WIDENED_CONDITION_SENTENCE: Partial<Readonly<Record<BuffKind, string>>> = {
  [BuffKind.SkullHelmet]: 'go high on a skull, or low on a clean trick',
  [BuffKind.SkullTether]: 'go high on a skull, or low on a clean trick',
}
```

- [x] **Step 4: Replace the mechanical pill words**

```ts
/** DLR-165 — the pill was already MECHANICAL vocabulary (TAKE / MISS / DODGE); it now uses the
 *  same two words the cards and the headline do. `SKULL` on the two protective families is a
 *  DEVELOPER DECISION recorded in this contract's file map: they fire going high on a skull at
 *  bronze and on ANY defeat at silver/gold, so no single High/Low word is true at both tiers.
 *  `SKULL` is accurate at bronze and merely incomplete above it; the card's own condition
 *  sentence carries the difference. */
export const BUFF_EVENT_WORD: Partial<Readonly<Record<BuffKind, string>>> = {
  [BuffKind.SuitHigh]: 'HIGH',
  [BuffKind.SuitLow]: 'LOW',
  [BuffKind.SkullLow]: 'LOW',
  [BuffKind.SkullHelmet]: 'SKULL',
  [BuffKind.SkullTether]: 'SKULL',
}
```

Update the table's docblock: the paragraph explaining why a `WIN` pill beside "if you take the trick" was the two axes sharing one pair of words now records that DLR-165 removed the collision at its source, and points at `CLAUDE.md`'s four-way scheme rather than its retired "Win and lose mean two different things" section.

- [x] **Step 5: Update the two worked examples in this file's remaining docblocks**

`buffLine`'s example becomes `Bronze Bell High (Momentum) — go high on a Bells trick: +2 multiplier.` and `buffCardAccessibleName`'s note about `getByRole` queries keeps naming `Cheat \(`, which is unaffected.

- [x] **Step 6: Measure the file and type-check**

Run: `(Get-Content src\app\warCouncil\buffLabels.ts).Count; npm run typecheck`
Expected: the line count is under 400 (it was 326 before this task and this task adds comments, not code — if it crosses 400, split the three tables into a sibling module in this same task rather than reporting it). Type errors remain in other `src/app/` files and in specs; those are Tasks 6 to 9.

### Task 6: Rename the reported outcome and its headline copy in `src/app/warCouncil/resolutionOutcome.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/resolutionOutcome.ts`

- [x] **Step 1: Rename the union, the derivation and the headline table**

```ts
export const TrickOutcomeKind = {
  HighVictory: 'highVictory',
  LowVictory: 'lowVictory',
  LowDefeat: 'lowDefeat',
  HighDefeat: 'highDefeat',
} as const
export type TrickOutcomeKind = (typeof TrickOutcomeKind)[keyof typeof TrickOutcomeKind]

export function trickOutcomeKindFor(
  playerWentHigh: boolean,
  skullTrick: boolean,
): TrickOutcomeKind {
  if (playerWentHigh) return skullTrick ? TrickOutcomeKind.HighDefeat : TrickOutcomeKind.HighVictory
  return skullTrick ? TrickOutcomeKind.LowVictory : TrickOutcomeKind.LowDefeat
}

/** DLR-165 AC3/AC4 — the four-way name is now the load-bearing headline, replacing DLR-160's
 *  Clean win / Dodge / Clean loss / Ate the skull. Those words survive as flavour in
 *  `TRICK_OUTCOME_WHY` below, which is where a colour word belongs and a load-bearing one does
 *  not. Layout reference: this contract's `mockup.html`, first panel. */
export const TRICK_OUTCOME_WORD: Readonly<Record<TrickOutcomeKind, string>> = {
  [TrickOutcomeKind.HighVictory]: 'High Victory',
  [TrickOutcomeKind.LowVictory]: 'Low Victory',
  [TrickOutcomeKind.LowDefeat]: 'Low Defeat',
  [TrickOutcomeKind.HighDefeat]: 'High Defeat',
}
```

- [x] **Step 2: Keep `TRICK_OUTCOME_WHY`'s four sentences verbatim**

AC4 preserves them. Only the four keys change. Do not reword them.

- [x] **Step 3: Update this module's header docblock**

It cites `the-hunt.md` §7 for the four outcomes and explains the mechanical/outcome split — the explanation stands, but it must now say the two axes have separate words rather than warning that they share one, and it must name `playerWentHigh` rather than `playerTook`.

- [x] **Step 4: Type-check**

Run: `npm run typecheck`
Expected: zero errors in `src/app/warCouncil/resolutionOutcome.ts` itself.

### Task 7: Rename the outcome copy on the bank meter and the trick well ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/labels.ts:172-179`
- Modify: `src/app/warCouncil/TrickWell.tsx:96,126-128`
- Modify: `src/app/warCouncil/BankMeter.tsx:25,54`
- Modify: `src/app/warCouncil/quarryAdvance.ts:33`

- [x] **Step 1: Re-word `TRICK_OUTCOME_MESSAGE` to lead with the four-way name**

```ts
/** §3.2's four outcomes, as the player is told them on the bank meter — the second copy of
 *  outcome wording, distinct from the resolution panel's headline. DLR-165 leads each with the
 *  four-way name (AC1: the bank meter is a player-facing surface that named an outcome), then the
 *  consequence. Placeholder copy: the wording after the name is the developer's. */
export const TRICK_OUTCOME_MESSAGE: Readonly<Record<TrickOutcome, string>> = {
  [TrickOutcome.HighVictory]: 'High Victory. The streak climbs.',
  [TrickOutcome.LowVictory]: 'Low Victory. The skull passed you by — the streak climbs.',
  [TrickOutcome.LowDefeat]: 'Low Defeat. 1 damage — the streak is lost.',
  [TrickOutcome.HighDefeat]: 'High Defeat. You took the skull. 1 damage — the streak is lost.',
}
```

- [x] **Step 2: Update `TrickWell.tsx`'s derivation call and its comment**

`:96`'s comment naming *"the SAME two facts `TrickResolutionScreen` derives its own outcome word from"* stands; the argument name at the `trickOutcomeKindFor` call site moves to `playerWentHigh`. The two render sites at `:126` and `:128` need no change — they already read `TRICK_OUTCOME_WORD` and `TRICK_OUTCOME_WHY`.

- [x] **Step 3: Update `BankMeter.tsx` and `quarryAdvance.ts` prose**

`BankMeter.tsx:25`'s docblock and `quarryAdvance.ts:33`'s comment both reason about the outcomes by their old names (*"`CleanWin`/`SkullWin` favour the player, `Dodge`/`CleanLoss` favour the…"*). Rewrite on the new members: a Victory favours the player and a Defeat favours the Quarry, whichever way the player went.

- [x] **Step 4: Type-check**

Run: `npm run typecheck`
Expected: no errors in the four files this task touched.

### Task 8: Rename the slot glyph identifier across its TypeScript union and both stylesheets ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/run/SlotGlyph.tsx:2,19,21,32`
- Modify: `src/app/run/slotSymbols.ts:23,27,38,50-52,77-84`
- Modify: `src/app/run/shopSlot.css:107`
- Modify: `src/app/run/shopSlotReel.css:114`

- [x] **Step 1: Rename the union member and its `data-glyph` producer**

```ts
// src/app/run/SlotGlyph.tsx
export type SlotGlyphKind = 'skullLow' | 'cheat' | 'timebomb' | 'skullHelmet' | 'skullTether'
```

In `slotSymbols.ts`, the variant `{ readonly kind: 'sidestep' }` becomes `{ readonly kind: 'skullLow' }`, its `case BuffKind.SkullLow` returns it, and `SLOT_FAMILY_WORD`'s three rows become `'High'` / `'Low'` / `'Skull Low'`. Update the `:19` comment describing the glyph as reading distinctly *"from Sidestep's three chevrons"* — the mark itself is unchanged, only its name.

- [x] **Step 2: Rename both `data-glyph` selectors in the same task**

```css
/* src/app/run/shopSlot.css:107 */
.shop-strip-chip-glyph[data-glyph='skullLow'],
```

```css
/* src/app/run/shopSlotReel.css:114 */
.shop-reel-glyph[data-glyph='skullLow'],
```

This binding is invisible to `tsc` — renaming the union without both selectors type-checks cleanly and silently unstyles the glyph. `.claude/workflow/web-project.md` → *Correctness traps* names exactly this failure.

- [x] **Step 3: Prove no `data-glyph` value is orphaned on either side**

Run: `Get-ChildItem src\app\run -Recurse -Include *.css | Select-String -Pattern "data-glyph='(\w+)'" -AllMatches | ForEach-Object { $_.Matches.Groups[1].Value } | Sort-Object -Unique`
Expected: exactly `cheat`, `skullHelmet`, `skullLow`, `skullTether`, `timebomb` — the five members of `SlotGlyphKind` and nothing else.

### Task 9: Update the remaining `src/app/` modules and all 26 `src/app/` specs ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/buffRideLabels.ts:33,95`
- Modify: `src/app/warCouncil/buffFiredLabels.ts` (docblock worked examples)
- Modify: `src/app/warCouncil/buffBreakdownModel.ts:173`
- Modify: `src/app/warCouncil/buffRoundState.ts`
- Modify: `src/app/warCouncil/cardDamage.ts`
- Modify: `src/app/warCouncil/resolutionDeadBuffs.ts`
- Modify: `src/app/warCouncil/resolutionLabels.ts:20,27` (the `Bell-Taker` worked examples)
- Modify: `src/app/warCouncil/ResolutionBreakdown.tsx`
- Modify: `src/app/warCouncil/roundResult.ts:17`
- Modify: `src/app/warCouncil/roundUiSeed.ts:44,46,87`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:72,88`
- Modify: `src/app/warCouncil/breakdownRectContext.ts`
- Modify: `src/app/warCouncilMount.ts:80,82,129,130`
- Modify: `src/App.tsx:162,388`
- Modify: `src/app/run/SlotStripChips.tsx:11`
- Modify: `src/app/run/heldBuffs.ts:63`
- Modify: `src/app/run/manageBuffsLabels.ts:37`
- Test: all 26 spec files under `src/app/warCouncil/__tests__/` and `src/app/run/__tests__/` listed in the File map, including the rename of `WarCouncilRound.feederCarry.test.tsx` → `WarCouncilRound.lowCarry.test.tsx`

- [x] **Step 1: Update every identifier reference and worked example in the 17 production files**

`feederCarry` → `lowCarry` on the seed, the mount props, the round result and `App.tsx`'s two call sites. Every `Bell-Taker` / `Moon-Feeder` style example in a docblock becomes `Bell High` / `Moon Low`. `buffRideLabels.ts:33`'s citation of `CLAUDE.md → "Win and lose mean two different things"` must point at that section's replacement instead — the four-way scheme — since Task 12 retires the heading it names.

- [x] **Step 2: Update all 26 specs, renaming the one spec file**

Every assertion updated, never deleted (AC12). Display-name expectations move from `Bell-Taker (Blade)` to `Bell High (Blade)`; condition-sentence expectations from `win a trick with Bells` to `go high on a Bells trick`; headline expectations from `Dodge` to `Low Victory`.

- [x] **Step 3: Add a spec asserting no card face can name the outcome axis (AC5)**

Append to `src/app/warCouncil/__tests__/buffLabels.test.ts`:

```ts
it('no condition sentence names the outcome axis (AC5)', () => {
  const outcomeWords = /\b(victor(y|ious)|defeat|win|won|wins|lose|loses|lost|loss|dodge)\b/i
  for (const kind of Object.values(BuffKind)) {
    expect(BUFF_CONDITION_SENTENCE[kind]).not.toMatch(outcomeWords)
    const widened = BUFF_WIDENED_CONDITION_SENTENCE[kind]
    if (widened !== undefined) expect(widened).not.toMatch(outcomeWords)
  }
})
```

This is the guard that keeps the two vocabularies from re-merging, so it covers **every** `BuffKind` including the cut families, not only the mintable ones.

- [x] **Step 4: Run the whole `src/app/` tree and type-check**

Run: `npx vitest run src/app --project node; npx vitest run src/app --project dom; npm run typecheck`
Expected: both Vitest runs report 0 failed; `typecheck` shows errors only under `src/sim/`, which is Phase 4.

- [x] **Step 5: Prove the old vocabulary is gone from `src/app/`**

Run: `Get-ChildItem src\app, src\App.tsx -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "Taker|Feeder|Sidestep|CleanWin|SkullWin|CleanLoss|playerWon|feederCarry"`
Expected: zero hits.

---

## Phase 4 — The simulator

`src/sim/` carries a second, parallel copy of the vocabulary in its report lines, its per-hand outcome counters, its policy heuristics and its type docblocks — the brief names it explicitly so the simulator does not keep the retired words alive. Only labels and identifiers change: no weight, no policy branch, no draw order, so a given seed produces the same run before and after. That invariance is what Step 3 asserts. The phase closes with the entire `src/` tree type-clean.

### Task 10: Rename the simulator's vocabulary without changing a single decision ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/sim/types.ts:120,121,140,146,152-172,219,299-304`
- Modify: `src/sim/report.ts:80,86,88,143`
- Modify: `src/sim/playHand.ts:97,283`
- Modify: `src/sim/playHandWindows.ts`
- Modify: `src/sim/playRun.ts`
- Modify: `src/sim/fixtures.ts:238,243`
- Modify: `src/sim/cardAwarePolicy.ts`
- Modify: `src/sim/skilledCardPlay.ts:8,143,144,239`
- Modify: `src/sim/skilledPolicy.ts:121,131-136,188,304`
- Test: `src/sim/__tests__/playHand.test.ts`
- Test: `src/sim/__tests__/reachability.test.ts`
- Test: `src/sim/__tests__/simulate.test.ts`

- [x] **Step 1: Rename the outcome counters on `TrickOutcomeCounts` in `src/sim/types.ts`**

`cleanWin` → `highVictory`, `dodge` → `lowVictory`, `cleanLoss` → `lowDefeat`, `skullWin` → `highDefeat`. `hurtLeading` and `hurtFollowing` keep their names — they count a position, not an outcome. Rename `feederCarryIn` / `feederCarryOut` at `:299` and `:303` to `lowCarryIn` / `lowCarryOut`, and rewrite the `:140`, `:152`, `:172` and `:219` docblocks onto the new vocabulary — `:152`'s *"`cleanWin` and `dodge` BANK; `cleanLoss` and `skullWin` HURT"* becomes the statement that the two Victories bank and the two Defeats hurt, which is now what the names say.

- [x] **Step 2: Update the aggregation and the printed report in `src/sim/report.ts`**

The `:86` seed object, the `:88` sum and the `:143` line. That line reads `banked <pct> — clean wins N, dodges N`; it becomes `banked <pct> — high victories N, low victories N`. The percentage arithmetic is unchanged.

- [x] **Step 3: Rename the policy and fixture references, changing no branch**

`skilledPolicy.ts:131-136`'s `case BuffKind.Taker/Feeder/Sidestep` become the new members and their comments move onto High/Low — `:136`'s *"A dodge is a trick LOST to a skull, so Sidestep can only pay when the plan is to lose"* becomes *"A Low Victory is a trick the player did not take, so Skull Low can only pay when the plan is to go low."* `skilledCardPlay.ts`'s dodge-branch comments at `:8`, `:143`, `:144` and `:239` follow. `fixtures.ts:238,243` renames `takerMagnitudeTemplates` and its error string. **No comparison, threshold or ordering changes.**

- [x] **Step 4: Assert seed-for-seed invariance — the simulator must produce the same runs**

Add to `src/sim/__tests__/simulate.test.ts` a spec that runs a fixed seed and asserts the total trick count equals the sum of the four renamed counters plus nothing else, and that a named seed's final outcome is unchanged:

```ts
it('DLR-165 renamed labels only — a fixed seed still resolves the same way', () => {
  const run = simulateRun({ seed: 1234, policy: skilledPolicy })
  const oc = run.trickOutcomes
  expect(oc.highVictory + oc.lowVictory + oc.lowDefeat + oc.highDefeat).toBe(run.trickCount)
  // The rename changes no decision, so this figure is whatever the suite recorded before it.
  expect(run.finalHealth).toBe(EXPECTED_FINAL_HEALTH_SEED_1234)
})
```

Read the file first for the real entry point and result shape. **Capture `EXPECTED_FINAL_HEALTH_SEED_1234` by running the simulator on the pre-rename code — check out the value before Phase 1's changes if needed — rather than by writing down whatever the post-rename run produces.** A figure taken after the change proves nothing.

- [x] **Step 5: Run the simulator specs and the full type gate**

Run: `npx vitest run src/sim --project node; npm run typecheck`
Expected: Vitest reports 0 failed; `npm run typecheck` now exits 0 for the **whole** tree — this is the first point in the contract where it does.

- [x] **Step 6: Prove the old vocabulary is gone from every tree under `src/`**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "Taker|Feeder|Sidestep|CleanWin|SkullWin|CleanLoss|playerWon|feederCarry"`
Expected: zero hits.

---

## Phase 5 — Prose: `CLAUDE.md`, the `.claude/` sweep, and the regenerated docs

No production code changes here. `CLAUDE.md` and the `.claude/` tooling are hand-edited because no skill owns them; `.docs/game_rules/the-hunt.md` and `.docs/implementation/` are regenerated through `implementation-doc-writer` and must not be hand-edited (AC8). The sweep is a judgement pass, not a substitution — many `win`/`lose` hits in the fifteen `.claude/` files are ordinary English and stay. Contract folders under `.claude/contract/`, archived or not, are historical records and are left alone.

### Task 11: Replace `CLAUDE.md`'s two-axis warning with the four-way scheme as a communication rule ✓

- Skill: `none — prose in the project's root instruction file, which no skill owns`

**Files:**
- Modify: `CLAUDE.md:75-122` (the `### "Win" and "lose" mean two different things` section) and `:124-126` (the template count)

- [x] **Step 1: Replace the whole section, heading included**

The new section is headed `### The four names a trick can have — use them in prose, not only in code`. It must state, per AC9:

- Victory and Defeat name the outcome only; High and Low name whether the player physically took the cards; the two combine into High Victory, Low Victory, High Defeat, and Low Defeat.
- The four-outcome table, on the same two axes as today's but with the new names in the cells and the flavour words (dodge, ate the skull) demoted to a parenthetical.
- That a Victory adds the trick's damage to `total` and climbs `roll`; a Defeat costs 1 health, zeroes both, and pays the Quarry nothing. Per DLR-156, keep the statement that the pot is `total × roll` paid only on *apply*.
- **Explicitly, that these are the words to use in conversation with the developer, in a plan, in a ticket, in an agent dispatch prompt and in a reviewer finding** — that "win a trick" is never an acceptable way to describe a Low Victory, and that a sentence about a trick either names one of the four outcomes or says high/low.
- The three consequences the current section lists, restated: a Low Victory is a good outcome reached by going low, and playing a 2 under a skulled 5 is the correct play; the Low family fires on both Low Victory and Low Defeat because its predicate has no skull term; and card text now states its own condition, so the note that a card's printed text may contradict the code is **removed** — DLR-165 fixed it.

**Delete** the closing paragraph beginning *"A vocabulary rename is banked and NOT built"* in full. Delete the sentence naming the `playerWon` field and replace it with `playerWentHigh`.

- [x] **Step 2: Correct the family names and the template count in the cut-buffs section**

Lines 124-129 name Taker, Feeder and Sidestep and claim the pool is **16 templates**. Rename the families, and correct the count to **18** — DLR-161 added Skull Helmet and Skull Tether, and `src/hunt/buffTemplates.ts`'s own docblock says 18. Verify before writing:

Run: `npx vitest run -t "BUFF_TEMPLATES"`
Expected: the template-count assertion in `src/hunt/__tests__/buffTemplates.test.ts` passes and names the real figure — quote *that* number in `CLAUDE.md`, not this task's.

- [x] **Step 3: Confirm the retired heading is gone**

Run: `Select-String -Path CLAUDE.md -Pattern "Win. and .lose. mean two different things|banked and NOT built|Bell-Taker|Sidestep"`
Expected: zero hits.

### Task 12: Sweep `.claude/`'s skills, agents, commands, rules and workflow ✓ (one deliberate exemption: `.claude/sprint-runs/2026-08-23-sprint/log.md` is a completed historical run log, left alone on the same reasoning that exempts contract folders)

- Skill: `none — prose in the pipeline's own instruction files`

**Files:**
- Modify: `.claude/agents/implementer.md`
- Modify: `.claude/commands/fb-plan.md`, `.claude/commands/fb-report.md`
- Modify: `.claude/rules/save-data-versioning.md`
- Modify: `.claude/workflow/web-project.md`
- Modify: `.claude/skills/ai-play-tester/SKILL.md`, `references/round-driver.md`, `references/strategy-engine.md`
- Modify: `.claude/skills/game-designer/SKILL.md`
- Modify: `.claude/skills/game-ux/references/feedback-to-redesign.md`, `references/full-viewport-layout.md`, `references/figma-mcp.md`
- Modify: `.claude/skills/implementation-doc-writer/SKILL.md`
- Modify: `.claude/skills/play-tester/SKILL.md`, `references/sim-architecture.md`
- Modify: `.claude/skills/react-frontend/references/engineering-standards.md`
- Modify: `.claude/skills/skill-creator/references/type-patterns.md`
- Modify: `.claude/sprint-runs/2026-08-23-sprint/log.md`

- [x] **Step 1: Read every hit in context and correct only the game-vocabulary uses**

Run: `Get-ChildItem .claude\skills, .claude\agents, .claude\commands, .claude\rules, .claude\workflow, .claude\sprint-runs -Recurse -Include *.md | Select-String -Pattern "Taker|Feeder|Sidestep|\bwin\b|\bwon\b|\blose\b|\blost\b|\bloss\b|\bdodge\b" -CaseSensitive:$false`
Expected: a hit list to work through. **This is a judgement pass.** A sentence like *"a lost update"*, *"win the argument"* or *"a loss of precision"* is ordinary English and stays exactly as it is. Only a use that means a trick's outcome, or names a retired family, is corrected. Over-correcting readable prose into jargon is a defect this task can introduce and the reviewer should look for it specifically.

- [x] **Step 2: Update `.claude/rules/save-data-versioning.md` with what this contract proved**

Its *When to enforce* section lists queued consumers as of DLR-106. Append DLR-165 as the first ticket that actually tripped reject condition 4 in production, one sentence: renaming a `BuffKind` value changed the persisted template ids the Vault keys on, the bump to 2 was mandatory, and the Vault reset once by design rather than shipping a migration map.

- [x] **Step 3: Re-run the sweep and confirm every remaining hit is deliberate**

Run: `Get-ChildItem .claude\skills, .claude\agents, .claude\commands, .claude\rules, .claude\workflow, .claude\sprint-runs -Recurse -Include *.md | Select-String -Pattern "Taker|Feeder|Sidestep"`
Expected: zero hits. (The `win`/`lose` pattern will legitimately still return ordinary-English hits — record how many and confirm each was read, rather than expecting zero.)

### Task 13: Mark the banked vocabulary section in `ideas.md` as shipped ✓

- Skill: `game-designer`

**Files:**
- Modify: `.docs/design/Balatro-Forbidden-Solitaire/ideas.md:1534` (the `#### The vocabulary — Victory / Defeat, with High and Low naming the act` subsection)

- [x] **Step 1: Add one dated line under the subsection heading**

Immediately under the heading, before its existing first paragraph:

```markdown
> **Shipped by DLR-165, 2026-09-03.** The vocabulary below is live in the code, on the resolution
> screen, in `the-hunt.md` and in `CLAUDE.md`. The Feeder carry described in the next subsection
> shipped separately on DLR-150.
```

Change nothing else in the section — it is a design record and stays one. Do not touch the Feeder-carry subsection beyond what this note says.

### Task 14: Regenerate the ruleset and the implementation docs — NOT DONE, delegated to the batch run's consolidated documentation pass

- Skill: `implementation-doc-writer`

**Files:**
- Modify: `.docs/game_rules/the-hunt.md`
- Modify: the affected files under `.docs/implementation/` — the skill's own Step 1 determines the set by grepping every module doc for each renamed term, not only the touched modules'. The 24 files known to name the old vocabulary today are listed in `plan.md` Part 1 → Config and persisted-shape audit.

- [ ] **Step 1: Invoke the `implementation-doc-writer` skill and walk its five-step workflow** — DEFERRED to the batch run's consolidated documentation pass.

Hand it: this contract's changed-file list, `plan.md` Part 2 (Approach and Data shapes) for the *why*, and the explicit note that **this contract changed a rule's vocabulary but no rule's substance** — every outcome is mechanically identical before and after, so no marker moves from `[provisional]` to `[settled]` and no number changes.

What must land, per AC8: `the-hunt.md` §7's four-outcome table carries the four-way names; its prose uses Victory/Defeat for outcomes and High/Low for the act throughout; its Status register's paths still resolve after the renames (`playerWon` and `feederCarryAfter` both appear in the codebase no longer, and any register row naming them is now stale); and the "last reviewed" date is refreshed.

**Do not hand-edit either document.** AC8 is explicit that they are regenerated through the skill.

- [ ] **Step 2: Confirm no doc still names a retired identifier** — DEFERRED with Step 1.

Run: `Get-ChildItem .docs\implementation, .docs\game_rules -Recurse -Include *.md | Select-String -Pattern "Taker|Feeder|Sidestep|playerWon|CleanWin|SkullWin|feederCarry"`
Expected: zero hits.

- [ ] **Step 3: Confirm every path in the ruleset's Status register resolves** — DEFERRED with Step 1.

Run: `Select-String -Path .docs\game_rules\the-hunt.md -Pattern "src[\\/][\w./\\-]+" -AllMatches | ForEach-Object { $_.Matches.Value } | Sort-Object -Unique | ForEach-Object { if (-not (Test-Path $_)) { "MISSING: $_" } }`
Expected: no `MISSING:` line.

---

## Phase 6 — Final verification

No production changes. Only cumulative sanity checks that the rename is total, that no second vocabulary survives anywhere it matters, and that all five gates are green.

### Task 15: Confirm no retired identifier survives anywhere in the shipped game ✓ (the two token greps return only deliberate migration notes and one guard-test regex — enumerated in the Implementer report)

- [x] **Step 1: Grep the whole source tree for every retired token**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "Taker|Feeder|Sidestep|CleanWin|SkullWin|CleanLoss|playerWon|feederCarry|'taker'|'feeder'|'sidestep'|taker:|feeder:|sidestep:"`
Expected: zero hits.

- [x] **Step 2: Grep the source tree for outcome words that would have to be a mistake**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "win a trick|lose a trick|dodge a skull|Clean win|Clean loss|Ate the skull"`
Expected: zero hits.

- [x] **Step 3: Confirm the pure-core boundary is intact**

Run: `Get-ChildItem src\warCouncil, src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. This contract added no import to either tree, so a hit means something moved that should not have.

- [x] **Step 4: Confirm storage is still reached through one file only**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "globalThis\.(localStorage|sessionStorage)\b|\b(localStorage|sessionStorage)\.(getItem|setItem|removeItem|clear)\("`
Expected: hits only in `src/persistence/browserStorage.ts` and the one docblock mention in `src/persistence/saveStore.ts`, exactly as `.claude/rules/save-data-versioning.md` records. Any other hit is a defect.

- [x] **Step 5: Confirm the persisted version was actually bumped**

Run: `Select-String -Path src\persistence\config.ts -Pattern "SAVE_SCHEMA_VERSION = 2"`
Expected: exactly one hit.

### Task 16: Static gates, full suite, formatting and build — NOT DONE, delegated to QA

- [ ] **Step 1: Warm the Vitest cache, then run the unfiltered suite with typecheck and lint** — DELEGATED to QA. `npm run typecheck` exits 0 and a path-scoped `npx vitest run src` reports 2491 passed / 0 failed; the unfiltered suite and lint are QA's.

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: every command exits 0 and Vitest reports 0 failed. The two scoped runs first are deliberate — a cold-cache `npm test` can emit `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is a worker-start timeout on the `dom` project and not a failing test (`.claude/workflow/web-project.md` → *Hard constraints on runners*). Treat only a second consecutive timeout as real.

- [ ] **Step 2: Check formatting on the files this contract changed** — DELEGATED to QA.

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; $f = git diff --name-only --diff-filter=d master... | Where-Object { $_ -match "\.(ts|tsx|css|md)$" }; npx prettier --check @f`
Expected: exits 0. Git is installed but **not on this shell's `PATH`**, and PowerShell shell state does not persist between tool calls, so the `$env:Path` prefix is required on every git step (`.claude/workflow/web-project.md` → *Verification commands*). If the check fails, run `npx prettier --write @f` on those same paths — **never** `npm run format`, which rewrites ~58 unrelated `.md` files across `.docs/` and buries the feature diff. Then re-run the check.

- [ ] **Step 3: Report the repo-wide format check without gating on it** — DELEGATED to QA.

Run: `npm run format:check`
Expected: this currently fails on pre-existing `.docs/**` files no contract has touched. Report the result and confirm every *new* failure is one this contract introduced; do not fix the pre-existing ones.

- [ ] **Step 4: Production build** — DELEGATED to QA.

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. Note this script runs `npm run lint` first, so a lint regression surfaces here too.

### Task 17: Update the PR description — NOT DONE, deferred until Task 16's gate results exist

- [ ] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste** — DEFERRED: it must quote Task 16's gate results, which are QA's to produce.

Include:
- A link to `plan.md` and `mockup.html` in this folder.
- A summary: the two axes now have separate words; the identifiers, the shipped copy, the ruleset and the pipeline's prose all moved; no mechanic changed.
- **The Vault reset**, stated prominently — `SAVE_SCHEMA_VERSION` 1 → 2 wipes balance, odds boosts and starting grants once, by design.
- Every decision still the developer's: the `SKULL` pill word on the two protective families, the four bank-meter sentences, whether the four-way headline feels right, and the three Skull-named cards.
- Verification results from Phases 1–6, quoting the actual Vitest summary line and each gate's exit status.
- A one-line note for future contributors: a rename of a `BuffKind` value changes a persisted template id and requires a `SAVE_SCHEMA_VERSION` bump in the same change — now guarded by the id-grammar spec added in Task 2, Step 2.

---

## Self-review

**Spec coverage:**
- Victory/Defeat as the only outcome words (AC1) — Tasks 3, 6, 7, 10, 11; guarded by Task 15 Step 2.
- High/Low as the only mechanical words (AC2) — Tasks 1, 3, 5.
- The four trick names, each resolution reported as one (AC3) — Tasks 3, 4, 6.
- The resolution headline is the four-way name; flavour kept as subtitle (AC4) — Task 6 Steps 1–2, Task 7 Step 2.
- No buff card's text names Victory or Defeat (AC5) — Task 5 Step 3; guarded by the spec in Task 9 Step 3.
- Card names and identifiers renamed, old names retired from the game (AC6) — Tasks 1, 5, 8; guarded by Task 15 Step 1.
- Sidestep's false "…with this card" corrected (AC7) — Task 5 Step 3.
- `the-hunt.md` and `.docs/implementation/` regenerated by the skill (AC8) — Task 14.
- `CLAUDE.md` states the vocabulary as a communication rule; banked note removed (AC9) — Task 11.
- `.claude/` swept, archive excluded (AC10) — Task 12.
- `SAVE_SCHEMA_VERSION` bumped to 2 in the same task as the identifier rename (AC11) — Task 1, Steps 1 and 6.
- All five gates green; existing tests updated not deleted (AC12) — Task 16; the "updated, never deleted" instruction is explicit in Tasks 2, 4, 9 and 10.
- The developer's own additions: `ideas.md` marked shipped — Task 13.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact table, or a runnable command with `Run:` / `Expected:`. Where a step names an identifier it has not read (`trickOutcomeFor`, `OUTCOME_BANKS`, the simulator's entry point), it says so explicitly and instructs the executor to read the file first rather than inventing one.

**Type / name consistency:** `BuffKind.SuitHigh` / `SuitLow` / `SkullLow` with values `'suitHigh'` / `'suitLow'` / `'skullLow'` are used identically in Tasks 1, 2, 5, 8, 10 and 15. `TrickOutcome` and `TrickOutcomeKind` both use `HighVictory` / `LowVictory` / `LowDefeat` / `HighDefeat` with matching camelCase values in Tasks 3, 4, 6, 7 and 10. `playerWentHigh` is the field name in Tasks 1, 3, 6 and 7. `lowCarry` / `lowCarryAfter` / `lowCarryIn` / `lowCarryOut` in Tasks 1, 9 and 10. `SlotGlyphKind`'s `'skullLow'` matches the two `data-glyph` selectors in Task 8. `SAVE_SCHEMA_VERSION = 2` in Tasks 1 and 15. Every value in this file appears in `plan.md` Part 2 → Data shapes.

**Phase boundary cleanliness:**
- **Phase 1** ends with `src/hunt/`, `src/persistence/` and `src/vault/` type-clean and their specs green; the persisted shape change and the version bump land in the same task, so no boundary exists where the app compiles and silently drops Vault entries. Remaining type errors are confined to the three trees later phases own.
- **Phase 2** ends with `src/hunt/` and `src/warCouncil/` both type-clean and green, and the old outcome members proven absent from both.
- **Phase 3** ends with the whole `src/app/` tree type-clean, its 26 specs green under both Vitest projects, and both sides of the `data-glyph` string binding renamed together — no half-applied rename, no unstyled glyph.
- **Phase 4** ends with `npm run typecheck` exiting 0 across the entire repository for the first time, and seed-for-seed simulator invariance asserted against a figure captured before the rename.
- **Phase 5** changes no code at all, so it cannot break the build; its outputs are prose and are verified by grep rather than by compilation.
- **Phase 6** adds nothing and only verifies.
