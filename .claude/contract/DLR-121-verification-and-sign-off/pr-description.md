# PR: DLR-121 — Verification and sign-off against the epic's Definition of Done

Plan: `.claude/contract/DLR-121-verification-and-sign-off/plan.md`

DLR-121 is the epic's closing verification pass. It establishes what is actually true about DLR-103's twelve-item Definition of Done, fixes only provably-stale documentation, and files every shortfall as its own ticket. No tuning value was changed and no browser pass ran.

## Verified counts

All measured twice — by the orchestrator and independently in Phase 1, with zero drift.

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | **1808 passed of 1808, 139 files, 0 failed** |
| `npm run build` | exit 0, `dist/` written |
| `throw new` in `src/` | **99** — the run log's 98 *and* 102 were both stale |
| Real `Math.random()` call sites | **3, all in `src/App.tsx`**; 15 hits in the four pure trees, every one read and confirmed comment prose |
| Files ≥400 lines | **2**, both pre-existing specs: `playCard.test.ts` 418, `rankTiers.resolution.test.ts` 402. Headroom band: `bank.test.ts` 398, `warCouncilHunt.css` 395 |
| Unreachable `BuffKind`s | **6** — Ward, Puppeteer, SecondThoughts, Foresight, Spyglass, Shield |
| Reachable since DLR-132 | Cheat, Timebomb |
| Unshelved shop items | Cheat, Timebomb, BlastGuard, Whetstone |
| Condition families | **10 of 12 pay; 11 of 12 evaluated** (Long Fall unbuilt; Keepsake evaluates but is structurally unfireable) |
| `npm run sim -- --runs 200 --seed 1` | **0 wins / 200**. Damage 2.29 dealt vs 2.64 taken. Hands with no activatable buff **0.0%**. Activations 1.50/hand, AP spent 4.35/hand. Faults none, stalled 0. Matches DLR-132 exactly. |

## The Definition of Done, item by item

**7 MET · 4 PARTIAL · 1 NOT MET**

### 1. AP economy is implemented, toggleable from one place, and governs both buff activation and Apply Damage cost.
**MET** — `AP_ENABLED` in `src/hunt/apConfig.ts` is the single toggle; `apCostFor` honours it; `spendAp` is the only subtraction path; it governs buff activation (`buffActivation.ts`) and Apply Damage.

### 2. Cheat and Timebomb are ordinary owned buff cards with no bespoke felt rail remaining.
**MET** — DLR-132 deleted `cheats.ts` and its two-slot rail; both mint from `ActivatedBuffTemplate` via `mintFromTemplate`; `reachability.test.ts` asserts both reachable. The 3 deleted throw sites were exactly the retired rail's guards.

### 3. Apply Damage queues its payout for a one-trick delay by default, resets on a hit during the window, and the quick-kill payout counting question is explicitly resolved before ship.
**MET** — `applyDamageDelayTricks` is the single statement of the delay, with both modifier paths (`shortenBy`, `removeDelay`). `encounter.ts:151` sets `pendingApplyPayout` to `null` on any trick that cost the player health — the reset-on-hit rule. The quick-kill counting question is explicitly resolved: `unplayedAtPress` captures hand size **at the press**.

### 4. The shop offers Health, AP capacity, a slot-machine buff draw, and the tiered rank abilities; Whetstone, Reflex, the discard-budget increase, and the odds-raising purchase are removed from the shop's purchasable list without their mechanics being deleted.
**PARTIAL** — `SHOP_ITEMS` = `ApCapacity, SwanTier, WitchTier, Heal`, plus `SlotMachinePanel.tsx` on the shop screen. Health ✓, AP capacity ✓, slot machine ✓. **Rank abilities are 2 of 7.** Whetstone stays in the `ShopItem` union but off the shelf with `priceOf`/`categoryOf`/`refusalFor`/`buyFromShop` still total over it — mechanic preserved exactly as required.

Note a premise failure worth the developer's eye: **"Reflex" and the discard-budget increase do not exist anywhere in `src/`** — there was nothing to remove and no mechanic to preserve, so that clause of the DoD never had a referent.

### 5. Shield adds non-stacking, non-healable blue hearts per its tier.
**NOT MET** — The rules are correct and tested: non-stacking (`activateShield` SETS rather than adds), non-healable (`shieldHearts` has exactly three writers — the seed, the absorption result, and `activateShield`; no heal path writes it), and per-tier (1/2/3 via `SHIELD_HEARTS`). **But `shieldBuff` has zero production callers and `activateShield` has no app-layer caller, so `encounter.shieldHearts` is `0` for the whole of a real run and no blue heart is ever drawn.** Pinned by `src/sim/__tests__/reachability.test.ts`. AC1 requires the check be against the running app, which is why this reads NOT MET rather than PARTIAL.

State plainly that a developer reading the DoD as being about the mechanic rather than the reachable feature would call it MET, and that the evidence is recorded both ways so the call can be re-made.

### 6. Rank ability tiers are purchasable, run-permanent, apply to the player only with the Quarry resolving at bronze, and bronze matches the ability printed today so an unspent run is unchanged.
**PARTIAL** — The **mechanism is fully correct**: `tierForSide` in `src/warCouncil/rankTierRules.ts` is the sole read path and returns `AbilityTier.Bronze` for any non-player side (Quarry resolves at bronze), and `startRun` seeds `ALL_BRONZE` so an unspent run is unchanged. **Coverage is 2 of 7** — `TIERED_RANKS = [TieredRank.Swan, TieredRank.Witch]`; Fox, Woodcutter, Treasure, Poison and Monarch have no ladder.

### 7. The Vault exists, banks leftover coin at death, and offers at least the two confirmed spends (raise odds, buy a starting tier).
**MET** — `depositLeftoverCoin` banks at death; both required spends exist with their own refusal predicates — `buyOddsBoost` (raise odds) and `buyStartingTier` (buy a starting tier).

### 8. A fresh run starts with a resolved number of buff cards in the starting pile (not empty-handed).
**PARTIAL** — `STARTING_BUFF_COUNT = 4` is a resolved number and a run is not empty-handed. **But 4 of the 5 opening cards are `Unassigned` placeholders that `activatableBuffs` filters out, leaving one bronze Cheat (`RUN_STARTING_CHEATS = 1`).** DLR-103's own scope text says the larger pile exists "to address the first-fight problem", which four placeholders do not. Literal wording satisfied; stated intent unmet.

### 9. Every card in the pre-hand loadout shows a live win/lose damage readout.
**MET** — `src/app/warCouncil/cardDamage.ts` derives the win/lose readout from the resolution path rather than re-deriving it, and includes buff contributions.

### 10. The deck persists across the hands of an encounter, tricks resolve into a face-down discard pile, both piles show live counts, and the reshuffle happens only when the draw pile cannot cover a deal and is explicitly signalled when it does.
**MET** — `encounterDeck.ts` + `discard.ts`; `DecreePile.tsx` renders `{drawPileCount} in the pile` and `DiscardPile.tsx` renders the spent count plus the reshuffle note in a `role="status"` region; the reshuffle fires only when the draw pile cannot cover a deal.

### 11. The felt rail, health bar, shop, and a new Vault end-of-run screen are all updated to match, per a dedicated UI pass.
**PARTIAL** — DLR-119 changed the felt rail and the health bar, and fixed a genuinely unreachable control (`.wc-bar` needed 395.2px against a 390px viewport — Apply Damage was *gone*, not scrolled off). **But the shop and the Vault got a prose review, not a diff — DLR-119's own `pr-description.md` §7 item 10 says so plainly — and no surface in this epic has been rendered in a browser.**

### 12. `the-hunt.md` and the relevant `.docs/implementation/` module docs are updated to reflect the shipped rules.
**MET, as of this ticket.** Was PARTIAL on arrival: `src/hunt/shield.ts` had no `.docs/implementation/` entry at all, and `the-hunt.md` carried six stale claims. Both closed in Phase 2 — `.docs/implementation/hunt/shield.md` created (127 lines, including a `Known defects` section), six falsified claims corrected, and the Status-register row for the buff-fired announcement flipped `not built` → `settled — since DLR-119`.

## Fixed versus filed

**Fixed (7 files, 114 insertions / 25 deletions; the only `src/` change is 7 comment lines):**
- `src/hunt/encounter.ts` — `hasShieldHearts`' docblock claimed DLR-115 reads it. It does not: `roundBars.ts` reads `encounter.shieldHearts` directly and the predicate has zero app-layer callers. Corrected; export kept, signature and body untouched.
- `.docs/implementation/hunt/shield.md` — **created.** The only `src/hunt/` module that had no doc.
- `.docs/game_rules/the-hunt.md` — six provably-false claims corrected (four "nothing announces a buff fired" + two "tells you" variants, all falsified by `buffFiredText` in `buffFiredLabels.ts` rendered by `TrickWell.tsx:67` since DLR-119), plus one "nothing is saved today" claim falsified by the Vault's persistence, plus the Status-register row.
- `.claude/workflow/web-project.md`, `CLAUDE.md` — source-file counts were 81/six-modules and 53/four-modules; the truth is **271 `.ts`/`.tsx` files across 8 modules with 139 test files**. Corrected where owned, and `CLAUDE.md`'s "rules folder is currently empty" dropped (`save-data-versioning.md` exists).

**Filed — eight tickets created under epic DLR-103**, one per shortfall, per this ticket's AC3. Each carries its evidence in the description so the developer does not re-derive it.

*(Note for the pipeline: the Phase 3 implementer could not create these — subagents on this box are not given the `mcp__atlassian__*` tools, and every call returned "No such tool available." It correctly refused to fabricate keys and reported the gap instead. The orchestrator, which does hold those tools, created them. Worth an `/fb-issue`: a Jira-writing task dispatched to a subagent cannot succeed as the pipeline currently provisions tools.)*

| Key | Finding | DoD item | Label |
|---|---|---|---|
| **DLR-133** | Shield is built, correct, and unreachable in a real run — `shieldBuff` has zero production callers | 5 | `engine` |
| **DLR-134** | Five of seven rank ladders are unshipped — only Swan and Witch have tiers | 4, 6 | `engine` |
| **DLR-135** | Starting pile is four `Unassigned` placeholders and one bronze Cheat — first-fight intent unmet | 8 | `design` |
| **DLR-137** | Shop and Vault got a prose review, not a UI pass, in DLR-119; carries the full consolidated eyes-on agenda | 11 | `ui` |
| **DLR-136** | Five consumables are unreachable — no template mints Ward, Second Thoughts, Puppeteer, Foresight, or Spyglass | (standing finding) | `engine` |
| **DLR-138** | Two spec files (418 / 402 lines) breach the 400-line limit | (standing finding) | `infra` |
| **DLR-139** | `Keepsake` is confirmed dead, `Long Fall` was never shipped — three Purse cards pay nothing | (standing finding) | `design` |
| **DLR-140** | `the-hunt.md` carries per-ticket changelog blockquotes `CLAUDE.md` forbids | (standing finding) | `design` |

Full problem statements, acceptance criteria and evidence are in each ticket. **No ticket was created for balance** — it is named below as the epic's largest hand-forward, and raising it as a task would imply an agent could take it.

## The two over-length spec files

`src/warCouncil/__tests__/playCard.test.ts` (**418**) and `src/warCouncil/__tests__/rankTiers.resolution.test.ts` (**402**), both pre-existing from DLR-123, both over CLAUDE.md's blocking 400-line limit, **deliberately left unsplit by this ticket.**

Reasoning, stated so the developer can overrule it: splitting a spec file redistributes shared fixtures and `describe` scoping — a real regression risk for zero behavioural gain — and it would be taken on the one ticket whose entire value is that its evidence is trustworthy. A verification pass that quietly refactors the tests it verifies against cannot be relied on. Defender and QA independently reached the same conclusion during DLR-120. The breach is real, it is filed as **DLR-138**, and it wants a small dedicated change rather than a rider on a sign-off.

## The consolidated eyes-on agenda

Nothing in this epic has been seen by a human or a browser. jsdom has no layout engine, so **none of the 1808 passing tests speaks to any item below.** Viewports throughout: **1280×800, 1024×768, 1366×768, 390×844.**

### Tier 1 — a control you cannot reach
1. **Apply Damage tappable at 390×844.** `.wc-bar` needed 395.2px against a 390px viewport; the button that cashes your streak was *gone*, not scrolled off. Fixed by wrapping to two rows, never rendered. Does the two-row bar crowd the hand or felt off the bottom?
2. **Does the shell crop at any of the four sizes?** `.wc-shell` is `overflow: hidden`, so the failure mode is a **silent crop, not a scroll**. Bounded by arithmetic (349px of 768 in auto rows, 419px left for the felt) but never rendered once. The run's oldest debt.
3. **Does `.wc-dossier` fit inside `30dvh`** at 390×844 and under 34rem tall, and do the `hand` and `actions` rows survive? **The only tuning value DLR-119 asks you to choose.**
4. **The armed card's top edge at a wide viewport** where `--wc-card-w` reaches 4.3rem — does it clear the fan reserve? It *was* clipping.
5. **The four bar buttons meet the 44×44px hit floor** at the smallest viewport.

### Tier 2 — a screen that does not fit
6. **The shop at all four sizes.** `shop.css` has a documented clipping history at nine rows and DLR-116 moved *both* sides of the budget — removed four purse cells, the tablist, the tabpanel and an aside heading; added a chooser, an odds line, an eight-row strip, a pull control and a result group.
7. **The Vault at all four sizes** — the densest surface in the project, inside `.run-shell`.
8. **The loadout panel's own scroll is contained** and never leaks to the page — now widened by Cheat and Timebomb rows (DLR-132). **The panel nobody has seen; its mockup gate was skipped.**
9. **The felt rail with the Spent plate added** does not crop.
10. **The ErrorBoundary fallback** — centred, fits, and scrolls *inside* its panel. `body` is `overflow: hidden`, so an overflowing panel puts both escape controls out of reach. Analysed as sound, never rendered.

### Tier 3 — a value that silently does not resolve
11. **Do the custom properties resolve rather than falling back?** One list: `warCouncilActionBar.css` (`--wc-brass`, `--wc-brass-dim`, `--wc-alarm`, `--wc-chalk`, `--wc-chalk-dim`, `--wc-chamber-lift`, `--wc-serif`, `--wc-ui-transition-ms`); `warCouncilHealthBars.css` (`--wc-hp-shield-fill` should compute `rgb(79,143,192)`, `--wc-hp-shield-ticking-opacity`, `--wc-hp-shield-gap`); `shopSlot.css`; `vault.css`'s nine; `errorBoundary.css`; `--wc-dossier-narrow-max`. **A name misspelled between two stylesheets compiles, lints and passes all 1808 tests while rendering the wrong thing.**
12. **Card-damage strip legibility at the smallest clamp** — `--wc-card-w: 2.9rem` puts it at ~9.3px, nominated as the single value most likely to be wrong.
13. **Does the fan's −4/−10/−18px overlap occlude an underlying card's strip?**

### Tier 4 — console and lifecycle
14. **A clean console** on load, after a StrictMode remount, on opening the loadout, on activating a buff, after a trick that fires a buff, after Apply Damage, on machine change, on a pull, on a second shop visit, and on the Vault. Watch specifically for `aria-describedby`-target-missing (DLR-117 composes ids per card with `useId()`) and the duplicate-React-key warning on Vault holdings.

### Tier 5 — readout and copy
15. **The resolved-trick readout with every clause at once** — a trick that wins, cashes, damages you, books a Timebomb, fires two buffs *and* settles a payout renders five stacked sentences. Does it fit, and read as one event or a wall?
16. **The two narration sentences as copy** — does naming the Overlap Bonus earn its line? Does `The hit destroyed your queued 12.` land when it appears?
17. **`Lethal.` leading the spoken health value**, with a screen reader: `Lethal. 10 of 10. 2 shielded, 1 of them ticking. 6 at risk. 4 ticking.` Should it also be shortened?
18. **Two `role="status"` live regions now on the felt** — is that the right screen-reader experience?
19. **All Vault copy is placeholder**, including the currency noun "mark"; so is all new shop-card copy, and `'Not usable yet.'`.

### Tier 6 — feel and pacing (only a hand on a pointer answers these)
20. **Does the action bar feel like one ritual or four buttons in a row?** Open Apply Buff, activate a buff, arm a Cheat from inside the panel, Swap, press Apply Damage twice.
21. **Is two taps the right cost to activate a buff?** Is one tap with no confirm right for a slot pull?
22. **Play hands 1 → 2 → 3** and watch draw read **20, 7, 20** while Spent climbs **0 → 13 → 26** and resets at the reshuffle; confirm the notice fires **exactly once** at the hand-3 deal; confirm **no card face is ever visible** in the Spent plate; confirm a Woodcutter bury and a hand-swap in hand 2 do **not** move the Spent count.
23. **Is the Spent count legible at a glance without becoming the card-counting aid the ticket forbids?** Is the reshuffle notice loud enough to register, quiet enough not to interrupt?
24. **Keyboard:** the machine chooser by arrow keys, one tab stop, selection legible without colour; both Vault selects and all four buy controls reachable with a visible `:focus-visible` ring; `Escape` returns cleanly.

### Preconditions — items that CANNOT be reached by playing today. Do not go hunting for these:
- **Any blue heart / Shield pip** — `shieldBuff` has zero production callers. Needs a temporary devtools override, never committed.
- **Any consumable** (Ward, Second Thoughts, Puppeteer, Foresight, Spyglass) — no template mints one.
- **Blast Guard, Whetstone** — off the shelf entirely.
- **The `breaking` overlay over-draw** — only visible once Shield is wired.
- **Reaching the shop by play** — it sits past `canAdvanceRun`, i.e. behind winning a fight, and the win rate is 0.0% with 55–60% of runs dying inside fight one. Use `src/sim/fixtures.ts`'s `fixtureRunAfterFirstFight` rather than trying to play there.

## What was deliberately left

- **Balance. Not one value retuned.** 0 wins in 200 runs, 2.29 dealt vs 2.64 taken. **DLR-132 removed the integration confound** — hands holding no activatable buff went 67.7% → 0.0%, activations 0.88 → 1.50, AP spent 2.33 → 4.35, and the **win rate did not move**. So the remaining deficit is a balance problem, and it is the developer's pass. This is the epic's largest hand-forward.
- **`the-hunt.md` carries per-ticket changelog blockquotes** that `CLAUDE.md` forbids it from holding ("never add a per-ticket section to it"). At least eight dated blocks now sit above the rules. Restructuring is a large judgement-heavy rewrite — filed as **DLR-140**, not done.
- **`CLAUDE.md` and `web-project.md` state the same source-file counts**, a single-source-of-truth violation. Corrected in both, but the duplication itself is recorded in **DLR-140** rather than resolved by deleting text unasked.
- **No browser pass ran.** Opt-in, off by default, and not requested.

## A note for future contributors

A verification ticket's diff should be small enough that its own evidence is not in question. That is why six findings here became tickets rather than fixes, and why two known 400-line breaches were left standing.

No browser pass ran and no tuning value was changed by this ticket. Phase 4's final gate re-confirmation (`typecheck`, `lint`, `npm test -- --run`, `npm run build`) is delegated to that phase — the figures quoted in `## Verified counts` above are Phase 1's measurement, taken twice with zero drift, and this ticket added no test, no source line, and no dependency, so Phase 4 is expected to reproduce them exactly.
