# DLR-90 — Envenom, the poison consumable and the delayed-hit rule

Plan: [`plan.md`](./plan.md) · Mockup (interaction grammar and rail placement only — appearance comes from the live stylesheets): [`mockup.html`](./mockup.html)

## Summary

Adds a second one-time-use shop consumable, Envenom: for 2 coins the player marks one card in
their hand before playing it, and the trick that card is played into pays 4 damage to whichever
side won it — landing at the deal of the *next* hand rather than immediately. If the Quarry wins
a marked trick cleanly, the player pays nothing for the loss (no damage; bank and multiplier
survive uncashed) instead of the usual clean-loss cost. A queued hit is discarded rather than
carried forward if the fight ends before the next deal.

Layer by layer:

- **`src/hunt/config.ts`** — two new tunables, `ENVENOM_PRICE` (2) and `ENVENOM_DAMAGE` (4), both
  transcribed from `version-4-scope.md` with attribution comments.
- **`src/hunt/shop.ts`** — `ShopItem.Envenom` added to the `ShopCategory.OneTimeUse` rung, wired
  into `SHOP_ITEMS`, `priceOf`, and `categoryOf`.
- **`src/hunt/types.ts` + `src/hunt/encounter.ts`** — `EncounterState.pendingEnvenom`, an
  `IncomingDamage`-shaped per-side accumulator, with `NO_PENDING_ENVENOM`, `queueEnvenom`,
  `applyPendingEnvenom`, and `hasPendingEnvenom`; `startEncounter` seeds the queue empty.
- **`src/hunt/run.ts`** — `RunState.envenomCharges` carries the charge across fights;
  `recordEncounter` takes a required fourth parameter; `beginNextHand` is the single point where a
  queued hit is actually paid.
- **`src/warCouncil/types.ts` + `src/warCouncil/envenom.ts`** — `RoundState.envenomedCards` plus a
  new module (`isEnvenomed`, `trickIsEnvenomed`, `envenomCard`) deliberately kept separate from
  `skulls.ts`.
- **`src/warCouncil/bank.ts`** — the new `TrickFacts` parameter object, `TrickResolution.envenomTarget`,
  and the replaced-`CleanLoss` rule inside `resolveTrickBank` (a marked Quarry-side clean loss no
  longer costs the player anything).
- **`src/app/warCouncil/`** — the reducer's stage selection (`EnvenomStage`, `TapEnvenom`,
  `CancelEnvenom`, `handleTapEnvenom`, `commitEnvenom`, the marking branch of `handleTapCard`,
  mutual exclusion with the Cheat), and `applyResolution`'s queue write, ordered so the trick's own
  damage is applied first and `queueEnvenom` then correctly refuses to queue against an
  already-over encounter (AC7).
- **Surfaces** — `PlayingCard`'s `envenomed` prop and its `.wc-venom-mark`; `cardAccessibleName`'s
  new `marks` object; the mark rendered on all four card surfaces (`HandFan`, `TrickWell`,
  `AbilityPrompt`, `DecreePile`); the `EnvenomCharge` plate in the felt rail beneath the Cheat rail;
  the shop's purse cell showing `envenomCharges`; `App.tsx` paying the queued hit through
  `beginNextHand` at the hand boundary and adopting `result.envenomCharges`.

## Refactors carried by this ticket

Three refactors were needed to land the feature cleanly, each forced rather than discretionary:

1. **`resolveTrickBank`'s four positional booleans became a `TrickFacts` object.** A fifth
   positional boolean would have made the call read as `resolveTrickBank(START, true, false,
   false, false)` — unreadable at the call site, and a transposed pair of booleans type-checks
   cleanly while producing plausible-looking wrong numbers.
2. **`cardAccessibleName`'s `skulled` boolean became a `marks` object.** A second positional
   boolean on an accessible-name builder is exactly how the wrong marker ends up announced to a
   screen reader.
3. **`roundReducer.ts` was split into `roundUiState.ts` (state/seed/action/selection types plus
   `createRoundUiState`, `cheatArmed`, `envenomArmed`) and `roundHint.ts` (`deriveHint`)**, forced
   by the blocking 400-line file budget — the reducer was already at 382 lines before a line of
   this work landed.

## In-scope defect fixed

`buyFromShop` returned the heal as an unconditional fallback rather than switching exhaustively
over `ShopItem`, so adding a third shop item would have silently healed the player on purchase and
type-checked cleanly. It is now an exhaustive `switch` with no `default`, so a future fourth item
that's missed a case fails to compile instead of failing silently at runtime.

## Defects fixed in the review pass

Two reducer/wiring defects surfaced by the parallel review (Code-Evaluator, Defender, QA), fixed
in the same pass and each pinned by a new regression test:

1. **`DecreePile` never received `envenomed`.** `WarCouncilRound.tsx`'s one `<DecreePile>` mount
   never passed the prop, so the plate always rendered `false` regardless of whether the decree
   card was actually marked — reachable by marking a card and then exchanging it into the decree
   via the Fox. Found independently by all three reviewers; QA filed it as `ac-not-met` against
   AC2, since AC2 and this file's own docblock both require the mark wherever a card renders,
   including the decree pile. Fixed by wiring `envenomed={isEnvenomed(ui.round.envenomedCards,
   ui.round.decree)}` into the mount and importing `isEnvenomed` from `../../warCouncil`. Pinned by
   a new case in `WarCouncilRound.envenom.test.tsx` that marks a card, leads the Fox, exchanges the
   marked card into the decree, and asserts the plate still announces the mark — a test on the
   `DecreePile` prop alone would not have caught this, since the prop itself was always correct.
2. **`roundReducer.ts`'s `commit()` never cleared `envenomStage`.** Poising Envenom (one tap) and
   then playing an ordinary, unrelated card left `envenomStage` stuck at `Poised` through that
   trick and into the next, so the very next tap on the plate silently skipped straight to `Armed`
   — quietly consuming one of AC2's three required taps before the irreversible mark, alongside a
   stale `ENVENOM_POISED_HINT` and a stuck `is-poised` plate style. Found by the Defender; a genuine
   asymmetry against the Cheat this mirrors, since `cheatSelection: null` was already present in
   the same `settled` object. Fixed by adding `envenomStage: null` alongside it. Pinned by a new
   case in `roundReducer.envenom.test.ts`.

## Developer decides or observes

Copied verbatim from `tasks.md`'s "Developer decides or observes" list:

- **Nothing on screen says the delayed hit landed.** After this contract the 4 damage arrives
  between hands and the hearts simply start lower. Judge it by playing; the two costed options are
  one mount prop plus a line in the hint cascade (~15 lines) or a beat on the status band. Not
  built here — no AC asks for it and the surface is a visual call. **This is worth flagging
  explicitly: 4 damage against `PLAYER_START_HEALTH` (10) is 40% of the player's starting health
  appearing to vanish for no visible on-screen reason, and it will read as a bug in a play-test
  unless someone is told to expect it.**
- **The marker glyph and its position.** `⚗` is a placeholder beside the skull's `☠`. Judge whether
  both marks stay legible on a card carrying each, and whether the badge reads at a glance in the
  fan.
- **Whether three taps to mark a card feels deliberate rather than fiddly** (Envenom → Envenom →
  card, then the usual two to play it).
- **Whether the felt rail reads well with a second consumable plate** beneath the Cheat rail, at
  the viewport sizes you play at.
- **Whether a marked trick the player wins that is *also* a skull trick should still cost the
  skull's damage** on top of the delayed hit. Implemented as "yes" — the harshest reading of a case
  no AC names.
- **Whether Envenom charges should have a cap.** Implemented as "no cap; coins are the limiter". A
  cap is a config key, one `refusalFor` clause, and a `PurchaseRefusal` code.
- **All placeholder copy:** `SHOP_ITEM_NAME[Envenom]`, `SHOP_ITEM_BLURB[Envenom]`,
  `SHOP_ENVENOM_LABEL`, `VENOM_MARK_LABEL`, `ENVENOM_RAIL_LABEL`, `ENVENOM_EMPTY_LABEL`,
  `ENVENOM_POISED_HINT`, `ENVENOM_ARMED_HINT`, and `envenomAccessibleName`'s wording.
- **Whether 2 coins is the right price** against a 1-coin Cheat and 1 coin per fight won.
  Transcribed from `version-4-scope.md`, so nothing is blocked — but it is a play-test question.

## Verification — Phase 5 (this pass)

Numbers below are what was actually measured in this pass. Task 20 (the unfiltered suite, the
scoped Prettier check, and the production build) is QA's alone in this pipeline and was **not**
run here — see the QA report for those numbers. Nothing below is fabricated.

**Task 17 — pure-core boundary:**

- `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts,*.tsx | Select-String -Pattern
  "from 'react'|from ""react""|\bwindow\.|\bdocument\.|localStorage|sessionStorage|\bfetch\("` →
  **zero hits.** The pure-core boundary holds; the recursive `Get-ChildItem | Select-String` form
  was used, not the single-level `-Path` form.
- `npm run lint` → **exit code 0.**

**Task 18 — no hard-coded tunable, no stale name:**

- Grep for `ENVENOM_DAMAGE|ENVENOM_PRICE` followed by `= *[0-9]` → **exactly two hits**, both in
  `src\hunt\config.ts`:
  - `src\hunt\config.ts:231: export const ENVENOM_PRICE: Coins = 2`
  - `src\hunt\config.ts:239: export const ENVENOM_DAMAGE: Damage = 4`

  Matches expectation exactly — no other file states either figure as a literal.
- Grep for `poisonedCards|pendingPoison|poisonTrick|poisonTarget|isPoisoned|poisonCard|PoisonStage`
  → **zero hits.** `CardRank.Poison` and the user-facing word "poisoned" were not matched (the
  grep's identifier list deliberately excludes them) and both remain in the codebase correctly.
- Grep for the old positional-boolean `resolveTrickBank(x, true|false, …)` call shape → **one
  textual hit, not a live call site:** `src\warCouncil\bank.ts:44`, inside a doc comment on the
  `TrickFacts` interface that *illustrates* the old unreadable shape as the stated reason for the
  refactor (`resolveTrickBank(START, true, false, false, false)` is unreadable at the call
  site`). No actual call anywhere in `src/` uses positional booleans — every call site passes a
  `TrickFacts` object. Judged as a permitted hit; flagging it here rather than silently treating
  the grep as "zero hits" since the raw command output was one line.

**Task 19 — 400-line budget:**

Production files this contract created or grew (`(Get-Content <path>).Count`, the array-length
form, not `Measure-Object -Line`):

| Lines | File |
|---|---|
| 362 | `src\hunt\config.ts` |
| 272 | `src\hunt\run.ts` |
| 193 | `src\hunt\encounter.ts` |
| 150 | `src\hunt\shop.ts` |
| 168 | `src\warCouncil\bank.ts` |
| 48  | `src\warCouncil\envenom.ts` |
| 359 | `src\app\warCouncil\roundReducer.ts` |
| 158 | `src\app\warCouncil\roundUiState.ts` |
| 33  | `src\app\warCouncil\roundHint.ts` |
| 340 | `src\app\warCouncil\WarCouncilRound.tsx` |
| 67  | `src\app\warCouncil\EnvenomCharge.tsx` |
| 133 | `src\app\warCouncil\HandFan.tsx` |
| 211 | `src\app\run\ShopPanel.tsx` |
| 283 | `src\App.tsx` |

Every file is under 400. In the 200–400 band, worth a second look per the audit's own criterion:
`config.ts` (362), `roundReducer.ts` (359), `WarCouncilRound.tsx` (340), `App.tsx` (283), `run.ts`
(272), `ShopPanel.tsx` (211). (`roundReducer.ts` and `WarCouncilRound.tsx` grew by one and two lines
respectively in the review-pass fix for the two defects above — still well inside budget.)

Spec files across the whole repo, sorted descending (top of the range only; every file is under
400):

| Lines | File |
|---|---|
| 398 | `src\app\warCouncil\__tests__\WarCouncilRound.test.tsx` |
| 396 | `src\warCouncil\__tests__\playCard.test.ts` |
| 383 | `src\warCouncil\__tests__\cpuPlayer.test.ts` |
| 380 | `src\app\warCouncil\__tests__\roundReducer.test.ts` |
| 365 | `src\app\warCouncil\__tests__\roundReducer.envenom.test.ts` |
| 343 | `src\hunt\__tests__\run.test.ts` |
| 296 | `src\app\warCouncil\__tests__\WarCouncilRound.duelHealthBars.test.tsx` |
| 277 | `src\warCouncil\__tests__\quarryIntent.test.ts` |
| 255 | `src\hunt\__tests__\envenom.test.ts` |
| 233 | `src\app\run\__tests__\ShopPanel.test.tsx` |
| 230 | `src\hunt\__tests__\config.test.ts` |
| 220 | `src\app\warCouncil\__tests__\labels.test.ts` |
| 214 | `src\warCouncil\__tests__\skulls.test.ts` |
| 210 | `src\hunt\__tests__\shop.test.ts` |

`WarCouncilRound.test.tsx` is the tightest file at **398 lines against the 400-line budget** — no
headroom left; worth naming for a second look, exactly as flagged after Phase 4. `playCard.test.ts`
sits at 396, one line under where a new `describe` block was deliberately routed instead into
`playCard.envenom.test.ts` (81 lines) rather than pushing it over budget.

## Per-phase results carried forward from Phases 1–4 (for context — not re-run in this pass)

- Phase 1: `npx vitest run src/hunt src/app/run/__tests__/shopLabels.test.ts
  src/app/run/__tests__/ShopPanel.test.tsx` → 10 test files passed, 216 tests passed.
- Phase 2: `npx vitest run src/warCouncil` → 16 test files passed, 285 tests passed.
- Phase 3: `npx vitest run src/app/warCouncil` → 22 test files passed, 197 tests passed.
- Phase 4: `npx vitest run src/app/warCouncil src/app/run src/__tests__/App.test.tsx` → 32 test
  files passed, 323 tests passed.
- `npm run typecheck` and `npm run lint` exited 0 at the end of every phase.

## Deviations recorded by earlier phases

- Phase 2 created an extra spec file, `src/warCouncil/__tests__/playCard.envenom.test.ts`, because
  appending Task 7's new `describe` block to `playCard.test.ts` would have taken it to 442 lines,
  over the blocking 400-line budget.
- Phase 3 added a placeholder `envenomCharges: 0` to `WarCouncilRound.tsx`'s `useReducer` seed so
  that phase would type-check; Phase 4 Task 14 replaced it with the real mount prop, and Phase 4
  confirmed the placeholder is gone.
- `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx` sits at 398 lines against the 400-line
  budget — no headroom left in that file. Named above as a file wanting a second look.

## Delegated to QA (Task 20 — not run in this pass)

- `npx vitest run --project node; npx vitest run --project dom` (cache warm), then
  `npm run typecheck; npm run lint; npm test` (unfiltered suite) — expected all exit 0, `0 failed`.
  QA's prior run of these (before this fix pass) reported them green; they are stale now that this
  pass changed production code and test files, and QA re-runs them.
- `npm run build` — expected exit 0, `dist/` written, no bundler errors. Also stale for the same
  reason and QA's alone to re-run.

Step 3 (`npx prettier --check src/hunt src/warCouncil src/app src/App.tsx`) is no longer delegated
— see "Defects fixed in the review pass" and Task 20 Step 3 in `tasks.md`: this fix pass ran it,
fixed the 8 contract-touched spec files it reported, and confirmed it now exits 0 for everything
this contract touched. The two remaining flagged files (`src/warCouncil/__tests__/skulls.test.ts`,
`src/app/warCouncil/__tests__/duelHealthBars.test.ts`) are pre-existing and untouched by any
contract here, per `web-project.md`'s standing note, and were deliberately left unformatted.

These numbers must come from the QA report, not from this document.

## Conventions for future contributors

- **Never name an identifier in this feature `poison`.** `CardRank.Poison` already owns that word
  in this codebase (see `.docs/game_rules/the-hunt.md` §1's open question on card ranks), so this
  feature's queue, marker, and stage names are all `envenom*` — checked by Task 18 Step 2's grep.
- **`pendingEnvenom` is `IncomingDamage`-shaped**, the same shape used for other queued damage
  elsewhere in the hunt layer, specifically so a second delayed effect can accumulate into the same
  field later without reshaping `EncounterState`.
