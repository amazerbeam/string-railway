# DLR-123 — Persistent deck across hands: the spent pile, pile counts, and one reshuffle per cycle

Plan: [`plan.md`](./plan.md) in this folder. Execution checklist: [`tasks.md`](./tasks.md).
Layout reference: [`mockup.html`](./mockup.html) — **built but UNSEEN.** No developer reviewed it; the mockup gate was skipped under the 2026-08-23 unattended sprint run. Treat it as the plan's own intent, not as an approved design.

---

## What changed

Every hand used to rebuild and reshuffle a full 33-card deck, so a read the player earned in one hand was worth nothing in the next. The deck's lifetime moves from **hand-scoped to encounter-scoped**: one shuffled 33 is dealt from repeatedly, cards resolved to tricks accumulate face-down in a **spent pile** that is never dealt from, and only when the draw pile can no longer cover a full 13-card deal does everything fold back together, shuffle once, and start again. The deal is also now **seeded** off the run's existing `runSeed` — it was previously handed `Math.random` directly, which meant no deal and no reshuffle in this game was ever reproducible.

## The deck arithmetic — start here for the balance pass

**Deck: 33 cards** (3 suits × 11 ranks). **A hand costs 13**: 6 to the player, 6 to the Quarry, 1 decree. `CARDS_PER_DEAL = HAND_SIZE * 2 + 1` — derived, never written as a literal.

| Hand of the fight | Draw pile at the deal | Spent pile | Reshuffle? |
|---|---|---|---|
| 1 | 33 → **20** after dealing | 0 → 13 at hand end | no |
| 2 | 20 → **7** after dealing | 13 → 26 at hand end | no |
| 3 | 7 is below 13 → fold 26 + 7 = 33, shuffle → **20** after dealing | 0 → 13 | **YES** |
| 4 | 20 → **7** | 13 → 26 | no |

Verified on disk, not asserted: `deckCycle.test.ts` observes `draws = [20, 7, 20, 7]` and `reshuffles = [false, false, true, false]`.

**Cards seen per cycle: 26 of 33** — two hands' worth, before knowledge is wiped.

**What that buys the player, which is the whole point of the ticket:**

- At **hand 1's** deal the player knows their own 6 and the decree. Unseen = 6 (Quarry) + 20 (draw pile) = **26**. Any specific card is 6/26 ≈ **1-in-4.3** to be in the Quarry's hand.
- At **hand 2's** deal, 13 cards are already spent and were seen. Unseen = 6 (Quarry) + 7 (draw pile) = **13**. The same card is 6/13 ≈ **1-in-2.2** — and half the cards the player feared are provably gone.

An encounter runs about 3.3 hands, so a typical fight sees **exactly one reshuffle**: card-tracking spikes in hand two and is wiped once, mid-fight. That is the intended shape.

## How determinism is preserved through the reshuffle

This is the constraint the ticket turns on, and the reshuffle is exactly where `Math.random()` gets added by reflex — with nothing failing to catch it.

The seed path is `App.tsx` → `dealSeedFor(run.runSeed, run.encounterIndex, run.handOfFight)` → `createSeededRng` (mulberry32) → `dealRound` → `shuffle` / `assignSkulls`. Because the reshuffle happens **inside** `dealRound` under that same injected generator, seeding the deal seeds the reshuffle with it — there is no second RNG to remember. `dealSeedFor` mirrors `slotMachine.ts`'s `slotSeedFor` field for field.

`src/App.tsx` now has exactly **three** `Math.random()` calls, all `Math.floor(Math.random() * 0x100000000)` feeding `startRun`'s seed. **None reaches a deal.** The pure-core ESLint override on `src/warCouncil/**` and `src/hunt/**` makes reintroducing one a lint failure rather than a silent regression.

## Design decisions taken as defaults — each is the developer's to overturn

The plan gate was auto-approved under the sprint run, so **none of these was developer-confirmed.** Full rationale in `plan.md` Part 1 → Assumptions made (D1–D13).

- **D1 — the naming collision is resolved at the NEW name.** "Discard" continues to mean the player's swap everywhere; the new pile is `spentPile`. Renaming the player action instead would have touched three string reason codes, `DISCARDS_PER_FIGHT`, `MAX_CARDS_PER_DISCARD`, `RunState.discardsRemaining`, `recordEncounter`'s sixth parameter, four `roundUiState.ts` predicates and their copy — ~25 files of string-bound churn inside a ticket already changing where cards come from. The component file is `DiscardPile.tsx` (it is the standard card-game discard pile); the field, copy and CSS all say **spent**.
- **D2 — "Spent" is a descriptive placeholder.** The flavour noun is yours. Changing it is one entry in `labels.ts` and two CSS class names.
- **D3 — at a reshuffle the leftover draw pile is folded INTO the shuffle**, not left on top. Discarding it would lose cards from a 33-card deck; stacking it on top is a second ordering rule with no observable difference, since those cards were never seen either way.
- **D5 — "the deck runs out mid-hand" cannot happen.** The draw pile's length is invariant for the life of a hand: the Woodcutter returns a card for every card it takes, and the swap puts cards on the bottom as it draws the same number off the front. So the reshuffle is only ever checked at the deal — which is what "one reshuffle per cycle" means. Pinned by a spec.
- **D6 — at hand's end every card not in the draw pile goes to the spent pile.** One total rule, of which AC4's decree clause is a case. It covers a Fox exchange (whatever the Fox left in the decree slot is what gets spent) and a hand ended early by a mid-hand cash-out, without three coordinated special cases.
- **D7 — Timebomb marks do NOT survive a hand boundary** and do not ride a card into the spent pile. A mark that came back through a reshuffle would be an invisible mark on a face-down card. `EncounterState.pendingTimebomb` still crosses the boundary untouched (DLR-91 D5) — a different thing, unchanged.
- **D9 — skulls are re-rolled, never remembered.** A card that carried a skull in hand 1 and returns after a reshuffle is re-rolled from scratch.
- **D13 — the spent count ticks at the trick's resolution**, not when the player dismisses the trick well, so the two cards are counted while still visible in `TrickWell`. The count reflects state; a lagging count would be a second source of truth.

## What you must decide or judge by playing

- **The flavour word for "Spent"** — copy judgement.
- **Whether one reshuffle per fight is the right cadence**, or arrives too early.
- **Whether the spent count is legible at a glance** without becoming the card-counting aid the ticket explicitly forbids.
- **Whether the reshuffle notice is loud enough to register** and quiet enough not to interrupt.
- **Encounter tuning must be RE-MEASURED.** PIMC at ~49% and random at ~10% were measured under reshuffle-every-hand and are invalidated. This hands the player a large hand-two inference edge and hands the Quarry nothing, because the CPU does not count cards.
- **The rank-conditioned families' new variance.** See below.

## Two systems the ticket asked about explicitly

**`Keepsake` does not move, but it becomes decidable.** It stays unfireable at the same rate — zero in any hand that runs its full six tricks, because the player's hand is empty by then and this ticket changes neither hand size nor trick count. What changes is that "hand's end" stops being an implicit component remount and becomes a **modelled event** with an explicit state transition (`closeHand` folding the decree and both hands into the spent pile). The three candidate fixes `v1-buff-card-list.md` lists — a reworded condition, a different end-of-hand instant, or deleting the three rows — are now expressible against a real boundary. Still your call; this contract invents no replacement.

**`Mark of the R` (22 of 71 pooled templates) keeps its mean and loses its independence.** Each rank has 3 copies in 33.
- *Old rule:* each hand independently dealt 13 of 33, so a given rank appeared with probability 1 − C(30,13)/C(33,13) = 1 − 0.209 = **0.791 per hand**, every hand alike.
- *New rule:* hands 1 and 2 together deal 26 of the 33, so the expected number of a rank's copies across the cycle is 3 × 26/33 = **2.36 — identical to before. The mean does not move.**
- *What does change:* a rank whose three copies all landed in hand 1 is now **impossible** in hand 2, where before it was still 79%. Rank-conditioned buffs become **negatively autocorrelated** across a cycle — more swingy hand to hand, the same in expectation over the cycle. Whether that variance is wanted is a design read.

**Two systems confirmed undisturbed, by test rather than assertion:** `Whetstone` pays per trick and the tricks per hand (6) and hands per encounter (~3.3) are unchanged. The slot machine's `expectedCardsPerPull()` = 2.640625 comes from a reel pool with no contact with `createDeck`, `shuffle` or any `Card`; `slotOdds.test.ts` was re-run green to prove it. `cardDamage.ts`'s preview cannot lie: it builds no `RoundState` and never reads `drawPile` or `spentPile` — it hands a hypothetical `TrickFacts` to the real `applyResolution`, and none of the six fields it reads changed meaning.

## Verification results

| Gate | Result |
|---|---|
| `npm run typecheck` | exits 0 |
| `npm run lint` | exits 0 |
| `npm test` | **1655 passed of 1655, 127 files** (baseline 1624/123 → +31 tests, +4 spec files, 0 regressions) |
| `npm run build` | exits 0, `dist/` written |
| Pure-core boundary grep | zero React/DOM hits in `src/warCouncil/**`, `src/hunt/**` |
| `Math.random(` in pure core | zero live calls (all matches are docblock prose) |
| 400-line budget | every touched file under: `App.tsx` 394, `WarCouncilRound.tsx` 387, `labels.ts` 379 |

**Specs rewritten, and why — no assertion was weakened and no case deleted.**
- **11 files at `+2/−0`** — mechanical widening of a `RoundState` literal with the two new required fields. Not one assertion touched.
- **`deal.test.ts`** — the single deletion in the entire diff: the 33-card conservation array, replaced by a **wider** one that also spans `spentPile`. A strengthening. Plus four new AC cases.
- **`playCard.test.ts`** — one new AC3 case, pure addition.
- **`WarCouncilRound.telegraph.test.tsx`** — three `getByRole('status')` queries narrowed by accessible name, because `DiscardPile` legitimately adds a **second `role="status"`** live region to the felt. The `aria-label` assertions are untouched; the queries got *stricter*.

## What a browser would have checked

**No browser pass was requested for this invocation**, so this is your eyes-on agenda rather than a verified list:

- Play a fight through hands 1 → 2 → 3 and watch the draw count read **20, then 7, then 20**, while the Spent count climbs **0 → 13 → 26** and resets to 0 at the reshuffle.
- Confirm the reshuffle notice appears **exactly once**, at the hand-3 deal, and that the standing "Spent cards stay spent" line is what shows the rest of the time.
- Confirm **no card face is ever visible** in the Spent plate, including in the moment right after a trick resolves.
- Confirm a Woodcutter bury and a hand-swap during hand 2 (7-card draw pile) do **not** move the Spent count — and note that a buried card now plausibly comes back in the same fight, which is the accepted weakening this ticket names.
- Check the felt rail does not crop or overflow at real viewport sizes with the second plate added — jsdom has no layout engine, so no test here can prove it.

## One note for future contributors

`spentPile` is the new pile; `discard` still means the player's swap; the two must never be conflated. The component file is named `DiscardPile.tsx` because it renders the standard card-game discard pile, but every field, label and class it touches says **spent**. That split is deliberate (D1) — do not "make it consistent" in either direction without re-reading why.

Also worth knowing: the felt now carries **two `role="status"` live regions** (the intent telegraph and the spent plate). Any new `getByRole('status')` query must disambiguate by accessible name.
