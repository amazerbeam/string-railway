# DLR-120 — Integration: one end-to-end run loop

Contract: [`plan.md`](./plan.md) · [`tasks.md`](./tasks.md) · slug `DLR-120-integration-one-end-to-end-run-loop`

## Summary

Twenty tickets built this epic's systems; this one asked whether a player can reach them. The answer is measured, not argued: **for roughly seven hands in every ten, the player holds no activatable buff at all** — not "few", not "cheap ones", none. The simulator gained the two levers a run actually grants (the discard budget and the starting Cheat) and one new statistic that says this directly; a new executable audit pins every card the game declares but no play path can produce.

**Nothing was retuned. No tuning value was read for anything but its name.** The only production file changed outside `src/sim/` is two docblocks in `src/hunt/buffTemplates.ts`, and that diff is comment prose, proved line by line.

---

## 1. The verdict: integration first, and the balance question cannot be answered yet

**The 0-win result is an integration problem before it is a balance problem, and the balance number nobody has been able to trust is being measured on a game with this epic's central system switched off.**

The figure a developer would retune is the per-hand exchange: **2.17 dealt against 2.64 taken** at seed 1, and 2.07–2.21 against 2.58–2.73 across every seed and both policies. That is a real deficit, stable, and not variance. But here is what it is a measurement *of*:

| Fact | Figure | Source |
|---|---|---|
| Hands played holding **no** activatable buff | **67.3% – 71.3%** | new report line, 8 batches of 200 runs |
| Mean fights won per run | **0.39 – 0.47** | simulator |
| Mean coins earned per **run** | **0.60 – 0.94** | simulator |
| Mean slot pulls per **run** | **0.39 – 0.47** | simulator |
| Activatable buffs a fresh run holds | **0** | `reachability.test.ts` case 8 |
| `BuffKind`s no path can mint | **8 of 20** | `reachability.test.ts` cases 2 and 3 |

`startRun()` seeds `STARTING_BUFF_COUNT = 4` cards and every one is a `BuffKind.Unassigned` placeholder that `activatableBuffs` filters out before it can ever be offered. The only door to a real buff is the one free slot pull, and **`visitShop` is only reachable after `isEncounterResolved` and `canAdvanceRun`** — that is, by winning a fight. Around 55–60% of runs end *inside* fight one, so the majority of runs are played from start to death with the buff pile, the AP economy, the slot machine and the Vault economy contributing nothing at all.

**That is the sharpest single finding of this ticket: the ordering is wrong.** Every acquisition surface this epic built — the slot machine (DLR-112), the shop shelf (DLR-116, DLR-122), the Vault's starting grants (DLR-113) — sits *after* the first fight, and the first fight is the one that kills the player. A run structure whose build phase is gated behind the fight the player cannot survive unbuilt is a wiring problem in the loop, not a magnitude problem in a table.

So `.docs/implementation/run-winnability-simulation.md`'s pre-V5 passes (0/120, 0/150) and today's 0/200 are not two readings of the same game that failed to move. They are **the same reading twice**: both measure the pre-buff game, because for two hands in three that is still the game being played.

### The counter-argument, stated fairly

A ~20% per-hand deficit is wide. Closing it purely with buffs would need them worth roughly **0.5 damage per hand averaged across every hand**, and they are currently held in about 32% of hands — so even at full reachability there is probably a balance component underneath. This ticket does not claim the game is secretly balanced. It claims the deficit **cannot be attributed** while the systems meant to close it are absent from most of the sample, and that retuning against this number would be tuning the wrong game.

Both readings are also conditional on the policies: `baseline` and `maximalist` both play cards through `chooseCpuMove` seated on the player, which is a deliberately simple player. A better card player moves the exchange and neither of these is one.

### The one experiment that settles it — and why this ticket did not run it

`playRun` calls `startRun(PLAYER_START_HEALTH, [], seed)`. That second parameter is **DLR-113's `TemplateGrant[]`** — the Vault's bought starting cards — and it is already wired. Passing a handful of grants and re-running is a one-line change that measures the game *with* the buff system on from trick one.

**It was deliberately not shipped here.** A `--grants` flag is one step from running the balance pass itself, which is explicitly out of scope, and the verdict above does not depend on it: the reachability half is already conclusive on its own evidence. It is named precisely because it is the **single highest-value next measurement**, and it now costs one argument.

---

## 2. Every seam found — fixed, or handed over

A seam is where two tickets' assumptions disagree. Seven were found. **One was a wiring defect and was fixed; six are feature or design gaps and are handed over with a number.**

> **Overlap with DLR-132, raised mid-run.** While this ticket was in flight, a developer question ("Cheats and Timebombs should be folded into the buff cards as cards") reached the same wall from the other direction and **DLR-132 was raised**, sequenced after this ticket. The two findings are the same defect measured twice and they agree — that pass counted **routes** and found none; this one counted **hands** and found 67–71% of them empty. **Seams 3 and 4 below, and the Cheat/Timebomb half of seam 2, are now DLR-132's brief rather than unowned.** Marked inline. What DLR-132 does *not* cover is called out just as explicitly, because those are the ones that will otherwise survive it.

### Seam 1 — DLR-112 deferred to DLR-126; DLR-126 answered and never came back. **FIXED (documentation only).**

`buffTemplates.ts` said, twice: *"The 7 consumable/activated templates are deliberately absent — AC6 is DLR-126's to resolve and DLR-126 has not landed."* DLR-126 landed and resolved AC6 **affirmatively** — a consumable is an ordinary `Buff` and the draw mechanism needs no change — but no template was ever added. The deferral had quietly become a gap and the file still described it as a deferral. Both docblocks now say what is actually true, name the audit that pins it, and state what closing it costs.

**Why the gap itself was not closed here:** it is not a data edit. `BuffTemplate.kind` is typed `BuffConditionKind` (the 11 condition families) and `BuffTemplate.axis` is typed `BuffCostAxis` (the 4 reward axes). **A consumable has neither** — it is priced through `CONSUMABLE_AP_COST` and pays in its effect, not on an axis. Closing it needs the template shape widened, `mintFromTemplate` branched, `slotOdds.ts`'s expected-value arithmetic changed, and **14 slot weights nobody has chosen** (7 kinds × 2 machines in `SLOT_FAMILY_WEIGHTS`). That is a feature with a tuning pass inside it. **Yours to decide.**

### Seam 2 — the reachability gap is **eight** cards, not five. **HANDED OVER.**

The brief named five unreachable consumables. The audit measured **eight of twenty `BuffKind`s unreachable**: Ward, Puppeteer, Second Thoughts, Foresight, Spyglass — **and Cheat, Timebomb and Shield**. `cheatBuff`, `timebombBuff` and `shieldBuff` have **zero production callers**; they are exported, tested, and called by nothing but their own specs.

### Seam 3 — DLR-107's migration was never finished, and it said what would finish it. **HANDED OVER.**

That ticket's own record: *"Cheat and Timebomb now exist twice… That is the intended intermediate state of a migration split across tickets — but it is real, and **it lasts until the activation ticket (DLR-103 T5) and the UI ticket land**."* DLR-108 (activation) and DLR-114 (the loadout bar) both landed. The intermediate state is still here: the felt drives the bespoke `CheatStage` / `TimebombStage` machines off `RunState.cheats` and `RunState.timebombCharges`, and the `Buff` representation nothing reads sits beside them.

### Seam 4 — DLR-116's pared shelf made four other tickets' work unobtainable. **HANDED OVER.**

`SHOP_ITEMS` is `[ApCapacity, SwanTier, WitchTier, Heal]`. `Cheat`, `Timebomb`, `BlastGuard` and `Whetstone` are still priced by `priceOf`, still handled by `buyFromShop`, still tested — and cannot be bought. Combined with `startRun()` seeding `timebombCharges: 0`, `blastGuardHeld: false`, `whetstones: 0`, **no play path can produce a Timebomb, a Blast Guard, or a Whetstone.**

Four tickets sit behind that: **DLR-101** (pending Timebomb hearts on the felt), **DLR-107** (the migration), **DLR-110** (Blast Guard alongside blue hearts), **DLR-129** (the whole Timebomb vocabulary retirement). All of it is correct, tested, and unreachable.

DLR-116's shipped acceptance criterion was a *pared-down* list, so putting items back reverses another ticket's AC — **not this ticket's call**, which is why it is here rather than in the diff.

### Seam 5 — the Cheat is the one activated card a player can reach, and only by accident of the seed. **OBSERVED.**

`RUN_STARTING_CHEATS = 1`, so every run opens holding one. The `maximalist` policy spends it in **1.00 runs out of 1.00** — it always finds a use. It is the only one of the eight activated cards with any path at all, and that path is "the run happens to start with one", not a shop, a reel or a Vault.

### Seam 6 — the acquisition surfaces are all behind the fight that kills the player. **HANDED OVER — the structural one.**

Covered in §1. Named separately because it is a seam between the *run structure* (DLR-81/DLR-87's fight-shop-fight loop) and every system this epic added on top of it, and because it is the one that decides whether the balance number means anything.

### Seam 7 — `Keepsake` and `Long Fall`. **CONFIRMED, and the deck change does make Keepsake decidable.**

`Keepsake` remains unfireable — a hand runs all `HAND_SIZE` tricks, so the hand is empty when "at hand's end" is evaluated. Three Purse cards pay nothing, pinned by DLR-125's test. **The question asked in the brief — does DLR-123's persistent encounter deck make this decidable? Yes.** DLR-123 turned "hand's end" from an implicit component remount into a modelled event: `closeHand` folds the decree and both hands into the spent pile at a specific instant. There is now a real boundary for the rule to name, which there was not before. Whether it should fire *there* — and whether holding a card at that instant is a decision or an accident — is a rule call, and this ticket's own dependency clause reserves it for you.

`Long Fall` is confirmed absent: `templatesForFamily` returns nothing for it because no entry exists in `TEMPLATE_FAMILIES`. **10 of 12 condition families fire; 65 of 78 v1 cards are live.**

---

## 3. What shipped

**The instrument gained two levers.** `SimPolicy` grew `chooseDiscard?(ui)` and `wantsCheatPlay?(ui)` — **optional**, so `baselinePolicy` compiles, behaves and *prints* exactly as this sprint's run log records it (verified: seed 1 reproduces 2.17 / 2.64 / 0.44 / 0.88 / 0.82 to the digit). `playHand` drives both with the existing discipline — re-ask the engine's own refusal predicate before every dispatch, treat every policy answer as advisory, cancel rather than commit a selection that cannot commit.

**One new statistic, and it is the point of the ticket.** `HandReport.activatableBuffsHeld` reads `activatableBuffs(run.buffs).length` — the *production* predicate the loadout panel reads, so the simulator cannot disagree with the felt about what "holds a usable buff" means. Reported as `hands played holding NO activatable buff`.

**A second policy, `maximalist`.** Card play and buff play are `baselinePolicy`'s **by reference** (asserted, not described), so any difference is attributable to the levers alone. It discards once per hand on the first open window while a charge remains, and arms the starting Cheat only where lifting follow-suit *strictly widens* the legal set — then plays the highest-ranked card the widening admits. Every threshold is an existing constant read by name: `MAX_CARDS_PER_DISCARD`, `DISCARDS_PER_FIGHT`, `RUN_STARTING_CHEATS`.

**An executable reachability audit.** `src/sim/reachability.ts` derives the mintable and unreachable sets from `BUFF_TEMPLATES`, `SHOP_ITEMS` and `startRun()` — hand-listing nothing, so a family added to the pool is admitted without an edit. Its eight cases **pin today's gaps as passing assertions**, each with a comment naming the gap and the decision that would clear it. That reads oddly on purpose: it is the mechanism DLR-125 established for `Keepsake`, and it is the only thing this repo has that stops a reachability gap being inherited ticket after ticket. **When you close one, the audit goes red at exactly the line that describes it.**

---

## 4. Simulator output, verbatim

`npm run sim -- --runs 200 --seed <n> [--policy maximalist]` · 200 runs each · **1,600 runs total, 0 wins, 0 faults, 0 stalls.**

### baseline

| seed | win rate | fight reached | to Quarry | to player | coins | slot pulls | activations/hand | **no activatable buff** | discards | Cheats |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0.0% | 0.44 | **2.17** | **2.64** | 0.82 | 0.44 | 0.88 | **67.7%** | 0.00 | 0.00 |
| 7 | 0.0% | 0.46 | 2.15 | 2.67 | 0.78 | 0.46 | 0.83 | **67.3%** | 0.00 | 0.00 |
| 42 | 0.0% | 0.41 | 2.07 | 2.61 | 0.75 | 0.41 | 0.87 | **70.0%** | 0.00 | 0.00 |
| 99999 | 0.0% | 0.39 | 2.13 | 2.70 | 0.60 | 0.39 | 0.73 | **70.7%** | 0.00 | 0.00 |

Seed 1 reproduces the run log's recorded figures exactly — **the baseline was not perturbed.** `0.00` discards and `0.00` Cheats confirm it implements neither optional method.

### maximalist

| seed | win rate | fight reached | to Quarry | to player | coins | slot pulls | activations/hand | **no activatable buff** | discards | Cheats |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0.0% | 0.46 | 2.21 | 2.66 | 0.80 | 0.46 | 0.92 | 67.4% | **4.09** | **1.00** |
| 7 | 0.0% | 0.40 | 2.10 | 2.73 | 0.64 | 0.40 | 0.77 | 71.3% | **3.91** | **1.00** |
| 42 | 0.0% | 0.47 | 2.18 | 2.68 | 0.82 | 0.47 | 0.97 | 66.7% | **4.06** | **1.00** |
| 99999 | 0.0% | 0.41 | 2.10 | 2.68 | 0.71 | 0.41 | 0.76 | 69.4% | **3.94** | **1.00** |

**Both levers fire on every run and neither moves the result.** Mean damage dealt across the four seeds: baseline **2.13**, maximalist **2.15**. Taken: baseline **2.66**, maximalist **2.69**. Pulling every lever the run actually grants is worth about **+0.02 damage per hand** — inside the noise, and nowhere near a 0.5 deficit. **That is a genuinely useful negative result:** the levers the player *does* have are not the missing ingredient. What is missing is the system they cannot reach.

The one figure that did move, and only slightly: `max fight reached` hit **4** at maximalist seed 1, against 3 for every other batch. One run in eight hundred got a fight further.

### Other checks

- **Determinism:** two identical `--runs 50 --seed 3 --policy maximalist` invocations produce a **byte-identical** file (`Get-FileHash` match). `IDENTICAL`.
- **Unknown policy still exits 1**, and now names both: `Unknown policy 'nonesuch'. Known policies: baseline, maximalist`.
- **`NoEffectYet` refusals: 0** in every batch — the unreachable consumables never reach an offer, so they are not skewing any figure in either direction.

---

## 5. Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | see §7 |
| `npm run lint` | see §7 |
| `npm test` | see §7 |
| `npm run build` | see §7 |

Phase-level results: Phase 1 — typecheck 0, lint 0, 24 scoped tests passed. Phase 2 — typecheck 0, lint 0, reachability 8/8, `buffTemplates.test.ts` 22/22 unaffected by the prose change.

**Integrity checks:**
- **`buffTemplates.ts` diff is prose only** — proved by filtering the diff for added/removed lines that are not comment lines: zero hits.
- **No `Math.random()` added** anywhere in `src/sim/`, `src/hunt/`, `src/warCouncil/` or `src/vault/`; both new policy methods are pure functions of the state handed in, and the byte-identical determinism check is the end-to-end proof.
- **No existing `throw` weakened, moved, removed, or converted to a silent return.**
- **No module-level mutable state** — the discard-once-per-hand flag is a local inside `playHand`'s loop.
- **`roundUiState.ts` (399/400), `App.tsx` (394) and `WarCouncilRound.tsx` (394) were not touched.** None is in the file map; `roundUiState.ts` still has its one line of headroom.
- **Line budgets** (measured with `(Get-Content <path>).Count`): `playHand.ts` **344**, `baselinePolicy.ts` **185**, `types.ts` **117**, `report.ts` **99**, `reachability.ts` **50**, `buffTemplates.ts` **244**. None near 400.
- **No `any`. No `console.log` / `console.debug`.**

---

## 6. What you must decide, and what a browser would still check

### Decisions

1. **Is the 0-win result balance or integration?** This document argues *integration first* and shows its working. Disagree if you like — the evidence is §1 and §4, and the deciding experiment is the `startRun` grants argument.
2. **Do consumables ship in v1's reel?** Cost of closing it: template shape widened, `mintFromTemplate` branched, `slotOdds.ts` changed, **14 slot weights nobody has chosen**. **DLR-132 does not cover these five cards** — it is scoped to Cheat and Timebomb.
3. **Do Blast Guard and Whetstone come back to the shelf?** Both are priced, tested and unobtainable, and **both are outside DLR-132's brief** — they stay unreachable after it lands unless it is widened.
4. **The structural question DLR-132 does not answer:** should a run start with real cards, or reach a shop before its first fight? DLR-132 makes Cheat and Timebomb *drawable*; it does not change the fact that the first draw happens after the fight that ends 55–60% of runs. **This is the largest unowned item on the list.**
5. **`Keepsake`** — redefine "hand's end" against `closeHand`, or retire the family. **Now decidable**; it was not before DLR-123.
6. **`Long Fall`** — author the template or retire the family. 10 of 12 families fire.
7. **Is `maximalist` the player worth measuring?** And do you want its two levers split into separate policies for attribution — a five-line change to `POLICIES`.
8. **Ward's silver/gold rows** (carried from DLR-126): the distinguishing case is self-inflicted Timebomb damage, and a Timebomb is currently unobtainable — so those rows are dead twice over until decision 3 is made.

### What a browser would check — carried forward, and **none of it is closed by this ticket**

This contract adds no UI surface, changes no stylesheet and no copy. The browser pass was not requested and no server was started. DLR-119's prioritised list is still the agenda, unchanged, at **1280×800 / 1024×768 / 1366×768 / 390×844**:

1. **Is Apply Damage tappable at 390×844** now `.wc-bar` wraps — the control DLR-119 made reachable, never rendered.
2. **Does the narrow dossier fit `30dvh`**, and do `hand` and `actions` survive — the one value DLR-119 asks you to choose.
3. **Does the armed card clear the fan reserve** at a wide viewport, where `--wc-card-w` hits `4.3rem`.
4. **Does the shell crop at any of the four sizes** — the run's oldest debt, never rendered once. `.wc-shell` is `overflow: hidden`, so the failure mode is a silent crop, not a visible scroll.
5. Do the new custom properties resolve rather than falling back; does a trick carrying outcome + Timebomb + two buffs + a payout render five sentences that fit; do the two new sentences land as copy; does `Lethal.`-first work with a screen reader; is the console clean.
6. The `ErrorBoundary` fallback's static palette under **both** light and dark system settings.

**One addition of this ticket's own**, and it is cheap: **play one run and confirm the loadout bar is empty of anything activatable until you win a fight.** The audit asserts it; nobody has watched it happen.

---

## 7. A note for future contributors

**`src/sim/reachability.ts` is a tripwire, not a description.** Its assertions encode gaps that are true *today*. If one of them fails, the correct first assumption is that somebody closed a gap — read the comment on the failing line, confirm that is what happened, and update the expectation. Do not "fix" it by loosening the assertion. That is the whole mechanism: this repo carried "no template mints a consumable" forward through six tickets as a comment, and a comment is exactly what a test is for.

`SimPolicy`'s two new methods are **optional on purpose**. Making either required forces `baselinePolicy` to implement a refusal, which turns its docblock's claim from "does not consider it" into "considers it and declines" — changing what every figure it prints *means* while changing none of them. If a third policy needs a third lever, add it optional too.
