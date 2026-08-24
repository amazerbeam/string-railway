# DLR-132 — Cheat and Timebomb are unobtainable: fold them into the buff pool as drawable cards

Contract: [`plan.md`](plan.md) · [`tasks.md`](tasks.md) — same folder.
Epic DLR-103. Base `c116afa`, branch `Version-5`.

## What changed

Cheat and Timebomb could not be acquired by a player **at all**. Three tickets closed three routes independently, each correct in isolation: DLR-116 pared `SHOP_ITEMS`, DLR-112 built the buff pool without them, and `RUN_STARTING_CHEATS = 1` / `timebombCharges: 0` were pre-existing. A run opened with exactly one Cheat and zero Timebombs and could never obtain another of either — **the Timebomb was entirely unreachable in play**, despite shipping tier damage tables, a ticking health-bar state, Blast Guard built to counter it, and a detonation rule.

They were also two bespoke widgets. `BuffLoadoutPanel.tsx:57` said it exactly: *"the ref is attached ONLY to the buff-row list — `CheatSlots` and `TimebombCharge` sit outside it."* Two special-cased components beside the row list, outside its roving tabindex, driven by `CheatStage` / `TimebombStage` rather than the ordinary activation flow.

Both are now **ordinary buff cards**: two templates the reel draws, two rows in the same roving-tabindex list, spent by the same two-tap poise-then-spend gesture, priced by the same `apCostOf`, committed through the same `activateFromPile`.

Net **−859 lines** across 90 files (+1,278 / −2,137). A consolidation, not a build.

## How the shape problem was solved

`BuffTemplate.kind` was typed `BuffConditionKind` and `axis` was `BuffCostAxis`. **An activated card has neither** — a Cheat pays in `DurationTricks` and a Timebomb reads a separate damage table — which is why the pool never contained one, and why DLR-120 named this as the substance of the ticket.

`BuffTemplate` became a **discriminated union tagged `form`**:

```ts
export type BuffTemplate = ConditionBuffTemplate | ActivatedBuffTemplate
//  { form: 'condition', id, kind: BuffConditionKind, axis: BuffCostAxis, target? }
//  { form: 'activated', id, kind: BuffActivatedTemplateKind }
```

`mintFromTemplate` switches on the tag and **delegates the activated branch to `cheatBuff` / `timebombBuff` in `buffCatalog.ts`** — the functions DLR-107 built and left inert. That module's own docblock called itself "REPRESENTATION ONLY"; it is now the minting path, and the docblock says so.

**The alternative rejected:** making `axis` optional. It type-checks, but it pushes an invisible `?? 0` into `templateWeightFor`'s multiplication — and a silently-zero weight is a card that is *in the pool and can never be drawn*, the exact failure mode `mintFromTemplate`'s existing `RangeError` guard was written to prevent. A tag makes every consumer's branch mandatory at compile time.

### Consumables became trivially addable, and were deliberately left out

Adding Ward, Second Thoughts, Puppeteer, Foresight and Spyglass is now **five `ActivatedBuffTemplate` literals, one mint branch each, and ten slot weights** — a data edit plus a small switch, where before it was a type-system problem. That is stated in `buffTemplates.ts`'s own docblock so the next ticket finds it.

**They are not added here.** DLR-120 scoped this ticket to Cheat and Timebomb only; the five need their own weights and their own decision, and three of them are still `CONSUMABLE_EFFECT_LIVE: false` (their effects need player-choice surfaces no screen provides). `src/sim/__tests__/reachability.test.ts` now **pins that boundary with a test** rather than a comment: Cheat and Timebomb moved out of the unreachable set; the five consumables and Shield are asserted still in it.

## Decisions taken, and who owns them

### `RUN_STARTING_CHEATS` — preserved, not answered

The constant **keeps its name and its value `1`**, re-homed to mean "how many bronze Cheat **buffs** `startRun` seeds into the opening pile". Today's behaviour is bit-for-bit preserved — a run opens holding exactly one bronze Cheat — which is what makes the before/after simulator comparison legible.

`RunState.cheats`, `RunState.nextCheatId` and `RunState.timebombCharges` are **deleted**, along with `src/hunt/cheats.ts` in full and `CHEAT_SLOT_COUNT`. Leaving them would have left a second record of "do you hold a Cheat", which is the duplication this ticket exists to end. A run still opens with **zero** Timebombs; granting one would have been a balance change.

> **The developer decides:** whether a run should open holding a Cheat at all. That standing open question is now **one integer**, not a mechanic.

### Tiers are honoured in play for the first time

- **Cheat's tier is duration** — 1 / 2 / 3 tricks of no-follow-suit (`CHEAT_DURATION_TRICKS`, transcribed by DLR-107, not chosen here). Bronze is exactly today's one-card lift.
- **Timebomb's tier is damage** — `TIMEBOMB_DAMAGE` scales both sides on the existing multiplier, so bronze is today's live 4/2 pair *by construction*.

> **The developer decides:** a **gold Cheat is now reachable** at 7 AP — above `STARTING_AP`, so only affordable with bought AP capacity. `buffCatalog.ts` has carried a standing warning since DLR-107 that three tricks of no-follow-suit is "close to a guaranteed run of wins" and needs a costing pass. Nothing was retuned.

### Four slot weights — **nobody approved these**

| Machine | `Cheat` | `Timebomb` |
|---|---|---|
| Skirmisher (trick/fight lean) | 3 | 3 |
| Strongbox (permanent-upgrade lean) | 1 | 1 |

Agent-chosen under the sprint-run tuning override, never played. Reasoning, so it is cheap to red-line: both are in-hand tactical plays rather than run-permanent rewards, so they sit mid-table on Skirmisher beside `MarkOfRank` (3) and `DebtCollector` (3), below the headline `Taker` (5); and at the floor on Strongbox beside `Keepsake` (1). Only ratios matter within a machine's table, so either row reshapes without renormalising anything. `SLOT_AXIS_WEIGHTS` is **not** widened — an activated template has no axis.

### The focus-order model

The two cards are now rows inside `wc-loadout-rows`, the collection they were deliberately outside of. **One tab stop**, on the first activatable row; arrow keys move among activatable rows only and **skip refused ones**; `Home`/`End` jump to first/last; wrap at both ends; `Escape` closes the panel. `Escape` is now handled in **exactly one place** — the two deleted widgets each carried their own `stopPropagation` to avoid closing the panel around themselves, and that whole workaround is gone.

The risk was real: `useRovingTabIndex` probes `isFocusable(0)` **unconditionally**, and an earlier ticket in this sprint run shipped an integration-only crash where that reached `apCostOf(undefined)`. The `buffs[index] !== undefined` guard is kept, and six explicit focus-order tests pin it — including **empty pile** and **every row refused**, the two shapes that reach the probe with nothing behind it.

### One rule fix found by a failing test, not by inspection

Ordinary buff rows gate on `discardWindowOpen` (between tricks). The retired widgets gated on `canAct` — deliberately, because **the only moment either card has value is while following an already-committed lead**, which is exactly when `discardWindowOpen` is false. Folding them into ordinary rows without preserving that would have made a Cheat's follow-suit break unreachable at the one trick it can matter. `buffActivationWindowOpen(state, buff)` states the exception once; both the refusal guard and the commit read it, so they cannot disagree.

## Simulator — an observation, nothing retuned

`npm run sim -- --runs 200 --seed 1`, before at `c116afa` and after:

| Metric | Before | After |
|---|---|---|
| Win rate | 0.0% (0 won / 200 lost) | **0.0% (0 won / 200 lost)** |
| Hands played holding **no** activatable buff | 67.7% | **0.0%** |
| Mean buff activations per hand | 0.88 | **1.50** |
| Mean AP spent per hand | 2.33 | **4.35** |
| Mean slot pulls | 0.44 | 0.46 |
| Mean damage to Quarry per hand | 2.17 | 2.29 |
| Mean damage to player per hand | 2.64 | 2.64 |
| Faults / stalled runs | none / 0 | none / 0 |

**Balance was explicitly out of scope and nothing was retuned in response to these numbers.** The 67.7% → 0.0% collapse is the direct consequence of the run's opening Cheat becoming a real activatable pile member instead of an inert placeholder. `mean Cheats armed per run` reads 0.00 on both sides because that counter only increments through a policy's optional `wantsCheatPlay`, which `maximalistPolicy` implements and `baselinePolicy` — the policy this run uses — does not.

DLR-120 measured 1,600 runs at 0 wins and found 67.3%–71.3% of hands played with nothing activatable. Making these two obtainable moved that figure, which was the point. **The balance pass is the developer's.**

## Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | exits 0 |
| `npm run lint` | exits 0, zero warnings |
| `npm test` | **1808 passed, 0 failed, 139 files** (baseline 1829/141 — the delta is exactly the specs this contract deleted and added) |
| `npm run build` | exits 0, `dist/` written |

Also verified: pure-core boundary grep clean (`src/hunt`, `src/warCouncil`, `src/vault`, `src/sim`); no `Math.random()` reachable; **`throw new` count 99** against a baseline of 102, the delta being exactly the four guards deleted with `cheats.ts`, which protected a two-slot rail that no longer exists — **no surviving throw was weakened**; every file under the blocking 400-line budget, measured with `(Get-Content).Count`; retired "Envenom"/"poison" vocabulary absent except `CardRank.Poison`.

**Reviewers:** Code-Evaluator **APPROVED**, Defender **APPROVED** (0 Critical / 0 Warning / 0 Info), QA **FAILURES FOUND** — all three QA failures were process gaps (documentation, this PR description, and stale comment citations), not logic; all are closed.

## What the developer must do

1. **Look at the panel.** The mockup gate was skipped and **nobody has seen this screen.** Does `Cheat (Free Rein) — play any card, ignoring follow-suit: 1 trick of no follow-suit. 3 AP.` read well beside a condition card's line? Does losing the ⚗ glyph and the two slot frames cost the felt anything at a glance?
2. **Decide the four slot weights** and whether a run should open holding a Cheat.
3. **Decide the gold Cheat's price**, now that three tricks of no-follow-suit is reachable.
4. **Run the balance pass.** These figures moved and nobody tuned them.
5. **Accept or reject the one-tier-per-hand Timebomb limitation:** priming two different-tier Timebombs in one hand makes both detonate at the second's figure. Fixing it properly means widening `WarCouncilState.primedCards` to carry a per-card tier, which reaches into the pure engine and every `primedCards: []` fixture.

## What a browser would have checked

**No browser pass ran — it was not requested.** This list is an agenda, not a gap:

- The loadout opens on **Apply Buff** and renders a Cheat row and a Timebomb row in `buffLine` grammar.
- One tap poises a row (pressed state); a second spends it and **visibly debits the AP readout**.
- `Escape` drops a poise **without** spending — AP readout unchanged.
- Arrow keys and `Home`/`End` move focus across the widened row list and **skip refused rows**; exactly one row is a tab stop.
- A spent **Timebomb** followed by a hand-card tap **visibly primes that card**.
- A spent **Cheat** visibly widens the fan's legal set — an off-suit card becomes clickable mid-trick.
- The trick reveal narrates a **gold** Timebomb's own figure, not bronze (unit-tested, but worth seeing).
- Console clean throughout, including after a remount.

## Note for future contributors

**`BuffTemplate` is a discriminated union tagged `form`.** Anything reading `.axis` or `.kind` off a template must branch on it — the compiler enforces this, and that is the point. Adding a new activated card is now: one `ActivatedBuffTemplate` literal, one branch in `mintFromTemplate`, one row per machine in `SLOT_FAMILY_WEIGHTS`, and a price in `CONSUMABLE_AP_COST`. Do not reach for an optional `axis`; a silently-zero weight is a card that can never be drawn.
