# Tasks: Rewrite hybrid-design.md to the duel direction — both sides deal damage, health replaces the Demand

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-11

**Goal:** Rewrite `hybrid-design.md` so it argues for the game actually being built — the player declares Win or Lose before the first card, both sides read that same declaration's card values and multiplier table, each side's product is damage to the other's health, and it all lands once at the thirteenth trick — converting the document's existing self-criticism rather than overwriting it, and reconciling `ideas.md` so the repository holds one live account of the direction.

**Spec:** `plan.md` in this folder. Its *Decisions taken in the design session* section is the authority for the two multiplier tables, the card-value schemes, the same-path rule, and the fourteen-split enumeration. **Every figure written into the document comes from there, not from `ideas.md`** — see Part 2 → Approach for why that rule replaced the first draft's.

---

## File map

**Created:** (none — no new files)

**Modified:**

- `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — a new un-numbered opening section, plus §1, §3, §5, §6, §7, §8, §9, §10, §11 and §12 rewritten or modified. §2 and §4 are not touched.
- `.docs/design/Balatro-Forbidden-Solitaire/ideas.md` — six entries promoted, one superseded in place, one rejected, three new entries, and one annotation to the fight-length entry already on disk.

**Deleted:** (none)

**Developer decides or observes:**

- **The ×0.5 rounding rule** — the one number still gating the first fight. Either pick a rounding direction, or take the offered alternative of doubling every entry in both tables (`×2/×4/×6/×8/×10/×1`), which makes all arithmetic integer and deletes the question. §9 carries both readings; the executor picks neither.
- **The Hunt cap `R`** — deferred, not chosen. §9 states the derivable range at `H = 1,350` (above 2.5, well under 17.3, so 3 to 5) and records that the slice is what decides whether a cap is needed at all.
- **AC 7's placement** — the declaration lands in a `###` under §1 because §1 owns what the additive term reads. A reader might expect it under §8. Cross-referenced either way.
- **The boss's deck attack, specific form** — stated as suppressing a subset of the player's Forage edits for that Hunt, with removing cards outright buried as the discarded branch. AC 6 forces the category; the form is a design reading to red-line, and there is a second candidate beside it (the character that best punishes a correct declaration read).
- **The band names** — Humble / Defeated / Victorious / Greedy describe the Win path and misdescribe the Lose path, where 4–6 is the peak. §10 flags this and does not rename; renaming would ripple into `the-hunt.md` and the built `STANDING_BANDS`.
- **Whether the declaration free option gets a mitigation** — §12 ranks it first and names two cheap levers (declare before the decree is turned; sort the roster so each character punishes a declaration). Neither is taken.
- **Whether the Jira description should be rewritten** to match the AC re-readings and the §3 scope increase. Not a task in this contract; raised so the plan is not the only record.
- **The prose itself** — no behaviour ships, so nothing is verifiable by running the app. The judgement is whether the three kinds of reversal read as conversions rather than overwrites, and whether one page states the direction clearly enough to decompose the next epic against.

---

## Phase 1 — The direction, the equation, and the arithmetic

Establishes the vocabulary and the numbers every later section reads against: the un-numbered opening section, §1's retirement of `Spoils` and its new declaration subsection, and §3's replaced ceiling. **This phase's boundary is honest rather than clean** — a prose document has only two fully coherent states, before and after, so at the end of Phase 1 §5–§12 still argue the old direction. What the boundary guarantees is that the opening section and §1–§3 are internally consistent with each other and with `plan.md`'s enumeration, and that the twelve numbered headings still carry their original numbers. The document is not publishable until Phase 3 closes.

### Task 1: Add the un-numbered opening section stating the direction ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — insert between the "Read alongside" list and `## 1. The equation`

- [x] **Step 1: Insert `## The direction: both sides deal damage, both hold health` after the "Read alongside" block's closing `---`, before `## 1. The equation`**

One page, no more. It must state, in this order:

1. The player declares **Win or Lose** before the first card, pre-Hunt, after the deal (as built).
2. **Both sides read that same declaration's** card values and multiplier table — the Quarry never declares for itself.
3. Card value is the **printed rank** on Win and **`12 − r`** on Lose, with no modifier of any kind (no Treasure `+1`, no Poison `−1`).
4. On the Lose path **the capture piles swap both ways** — you are paid for the Quarry's pile, it is paid for yours, both inverted.
5. Both multiplier tables, reproduced from `plan.md` → decision 3, with the statement that **they are exact complements**: `Lose(k) = Win(13 − k)` at all fourteen splits.
6. Both sides hold **health** (1,350 each, per §9), and each side's `card value × multiplier` is **damage** to the other.
7. Damage is applied **once, at the end of the thirteenth trick** — forced, not chosen, because the multiplier is read off the final trick count.
8. **The same-path rule with its reason**, per `plan.md` → decision 5: opposite paths make the two mirrored tables and the two mirrored value schemes cancel exactly, netting zero in every split, so free declaration for both sides deletes the game. A later reader will read the asymmetry as a bug; this sentence is what stops them "fixing" it.
9. One closing line stating that **every figure keyed to the old 108 ceiling or to a `×6` multiplier is void**, so §3's arithmetic is restated rather than carried.

Write it so §5–§12 are readable against it. Do **not** number this section — see Step 2.

- [x] **Step 2: Confirm the insertion did not renumber anything**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "^## " | Select-Object -ExpandProperty Line`
Expected: the new heading appears with no leading number, and the twelve numbered headings still read `## 1. The equation` through `## 12. Critique` in order — twelve numbered headings, unchanged.

**Confirmed.** Output showed the un-numbered heading first, then all twelve numbered headings in order, unchanged.

### Task 2: Rewrite §1 — retire `Spoils`, cut the dead component rows, and add the declaration subsection ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — `## 1. The equation` and its component table

- [x] **Step 1: Retire `Spoils` as a named term and restate the additive term**

`Score = Spoils × Standing` becomes damage from `card value × multiplier`. State outright, because it is a simplification worth naming: **the additive term is now exactly the printed ranks of the cards on your side, with no modifier of any kind.** Keep the growth-class argument (one term adds, one multiplies) — it survives the rename and is still the reason the equation works.

- [x] **Step 2: Delete three rows from the component table and add the reason for each**

- **The Demand row** — deleted, not converted. It was the table's one entry that was not an intervention on a term ("it is the comparator"), and there is no comparator now.
- **The Treasure (7) row** and **the Poison (8) row** — deleted. Rank 7 keeps its identity as a named card and does nothing for now; rank 8's `−1` goes. Record the arithmetic that justifies it: at ×5 a ±1 card modifier moves a Hunt by 5 damage out of 540, under 1%, so both rules were paying rules budget for a rounding error.

Every surviving row must still be an intervention on one of the two terms — that rule is what §1 exists to enforce and it does not relax.

- [x] **Step 3: Add `### The declaration, the two tables, and what each side is paid for`**

A `###` inside §1 — **not** a new numbered section. It owns AC 7 and must carry:

- Why the declaration exists at all, citing `the-hunt.md §3` for the procedure and **not restating it** — no step-by-step, no function names.
- Both tables, and the mirror property as a *property* rather than a coincidence.
- **Why the Lose table peaks at 4–6 rather than 0–3**, derived rather than asserted: on the Lose path every trick you win is material handed to the opponent, so taking a trick lowers your own multiplier *and* raises their damage, and the peak sits where those two costs are still worth paying. The table's shape is a consequence of the pile-swap rule, not a tuning choice on top of it.
- **The three-credit mechanic and its four guards recorded as replaced**, with the arithmetic that motivated the original: the capped Lose path scored off 6 cards against the Win path's 18 at `k=9`. State plainly that the motivating figures in `ideas.md` (918 / 936 / 378 / 216) were computed against a fixed Demand of 220 and are **void** under two-sided damage, where the comparison is nets — so the mechanism is adopted and its arithmetic is not.
- **The discarded branch, per the house style**: both sides counting the Quarry's pile. It pays one pile out twice and inverts the incentive at the edge — a player who declares Lose and wins zero tricks, executing the plan perfectly, would finish 78 behind instead of 78 ahead.

- [x] **Step 4: Add the per-trick combo bonus as a discarded branch (AC 11, first of two)**

One paragraph in §1's existing discarded-branch idiom. `Spoils = Σranks + 2k²` — each trick captured is a "combo", every card in the pile gaining +1 per combo. Rejected because it fixes no documented problem (its job was feel, and pending damage does that job better and for free), because `2k²` depends on trick count alone so it escalates the numbers without escalating the choices, and because it forces a recomputation of a value the developer owns. **Mark its ×18 → ×30 break-even arithmetic as void** — it was computed against the single ×6-family table.

- [x] **Step 5: Confirm no `Spoils` reference survives in §1 and the section still type-checks as prose**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "Spoils"`
Expected: hits only where `Spoils` is explicitly named as a **retired** term (§10's removal note, §8's converted rows, §12's historical notes). No hit presents it as a live term of the equation. Review each hit rather than expecting zero.

**Reviewed.** Within §1 the only two hits are the retirement statement itself and the combo-bonus discarded branch's "old vocabulary" tag — both explicitly marked retired. All other hits sit in §2 (out of scope always) and §3/§4–§12 (not yet rewritten at this point in the phase) — the expected, honest boundary this phase states up front.

### Task 3: Rewrite §3 — replace the void ceiling, the bimodality finding, and the Forage conclusion ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — `## 3. What the run rewrites`

**This task is the scope increase flagged in `plan.md` → Risks.** The ticket scopes the rewrite to "sections 1 and 5 through 12"; §3 is in because leaving it out would leave the document deriving a 108 ceiling that it contradicts four sections later.

- [x] **Step 1: Delete the void derivations and replace the ceiling**

Work from `plan.md` → Data shapes → *§3's replaced figures*, which is the authoritative row-by-row list. Remove: the `Spoils = 2k` premise, the `2k × f(k)` fourteen-column table, the `max = 18 × 6 = 108, at k = 9` derivation, the "naive product `26 × 6 = 156` is not reachable" paragraph, the "the curve is bimodal" finding, the "What the 108 is contingent on" paragraph, and "The one dependency, stated".

Replace with: **540 per side per Hunt** at average card values (`k = 9` on Win, `k = 4` on Lose), **765 in a best-case pile** (the eighteen fattest cards, `Σ = 153`, at ×5), a maximum net swing of **±444**, and **one peak per path** — 7–9 on Win, 4–6 on Lose — in place of bimodality.

- [x] **Step 2: Keep the two arguments that survive, and say that they survive**

- **"Standing is a gate, not a term you can build"** — survives unchanged. Nothing in the new component table raises a multiplier directly.
- **The Cook's-loop argument for Forage as the outer loop's only verb** — survives unchanged.
- Restate the old Demand-crossing force in the new unit: a bigger health bar cannot be met by winning more tricks, because 7–9 is the Win ceiling and 10+ collapses to ×0.5.

- [x] **Step 3: Reverse the Forage variance conclusion, keeping its percentages**

The 39.4% / 39.4% / 21.2% split of where a Foraged card lands **survives**; the conclusion drawn from it reverses. The document currently argues "a value edit in the Quarry's hand is not a loss — arguably the best case". Under two-sided damage a card is worth its value to whoever's pile it lands in, so a Foraged card the Quarry captures is damage aimed at the player. And because any captured card can end up on either side, **no value edit is safe** — every one becomes a bet on capture rather than a raise to your own ceiling.

- [x] **Step 4: Record the new unasked question this exposes**

**How a Forage value edit interacts with the Lose path's inversion is unspecified.** If a card is edited to value 20, is its inverted value `12 − 20`? Or does inversion read the printed rank regardless of edits? The two readings differ by the whole size of an edit and neither is decided. Route it to §9 as deferred — it blocks Forage, not the first fight.

- [x] **Step 5: Extend §3's existing shop discarded branch to cover money and cross-run power (AC 11, second of two)**

§3 already buries a Balatro-style shop selling flat score bonuses. Extend it to name the fuller proposal — random per-run upgrades plus permanent ones (more health, higher card damage) bought with money earned in the run — and its reasons: money earned from encounter performance is §2's already-discarded "each trick becomes N resource" branch with a different noun; `+N per card` is the additive-only build the design engineers the health bar to kill; and §1's component table forbids a third scoring channel. Point the cross-run *power* half at §7 (Task 6). Record that its "Planets, not Jokers" variant — levelling a multiplier band for a run — is now **closer to reachable** than it was, since the multipliers are designed rather than transcribed, but that it breaks §1's *Standing cannot be built* invariant and moves the ceiling. Recorded, not adopted.

- [x] **Step 6: Confirm the void figures are gone from §3**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "\b108\b|\b156\b|2k × f\(k\)"`
Expected: no hit inside §3 presents these as live arithmetic. Any surviving hit must sit in a sentence explicitly marking the figure as retired or historical — review each rather than expecting zero, because §12 legitimately refers back to them.

**Reviewed.** Both hits inside §3 (the opening section's void notice and the in-round-edit-resource subsection's parenthetical) explicitly mark the figure retired/void. All remaining hits sit in §5, §6, §8, §9, and §12 — none rewritten yet in this phase — and correctly still state the old arithmetic as current, per this phase's stated boundary that §5–§12 argue the old direction until Phases 2–3 close them out.

---

## Phase 2 — Escalation, catch-up, the run, and the ruleset

The four sections where the direction reverses a stated position. Each carries a conversion rather than an overwrite, and `plan.md` → Approach names which of three kinds applies to each: §8 is **validated and flipped**, §6 is **retired as a historical note**, and §5 and §7 are ordinary modifications. At this boundary §1–§8 argue the new direction consistently; §9–§12 are the downstream registers Phase 3 brings into line.

### Task 4: Rewrite §5 — health and the cap replace the rising Demand, and the boss attacks the deck ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — `## 5. Escalation`

- [x] **Step 1: Replace the Demand's rising curve with Quarry health and the encounter's end conditions**

Keep the section's two-independent-dials argument (how hard the round is, versus what rule is broken) — it survives and is still load-bearing. Replace the Demand's shape with: the Quarry holds health, the player's damage depletes it, the player holds health too, and the encounter ends when a bar empties. State **health is not a toll booth**, citing §2: it is an accumulator rather than a system with its own play — the Demand with memory, same number, same source, checked cumulatively instead of once.

State the end conditions completely, including the one that previously had a reachable gap: **if both bars empty on the same Hunt, the player loses.**

- [x] **Step 2: State the cap, and state its real job**

The cap is the maximum number of Hunts one encounter may run. Its justification is **not** the fast-lane-versus-slow-lane framing the ticket's AC 3 carries — those lanes do not exist under two tables. Its real job is **bounding the low-stakes extremes**: a Hunt at the 6/7 boundary puts 708 damage on the table and one at an extreme puts 78–96, a 7.4× to 9.1× slowdown, so an encounter spent at the extremes barely moves either bar. Cite `ideas.md` → *Fight length is symmetric about the middle, and bimodal* for the worked arithmetic rather than restating it, and state the lengths at the decided `H = 1,350`: the fast band (4–9 tricks) resolves in **3–4 Hunts**, everything outside takes **18–23**, and there is nothing in between. Note the top end is additionally **unloseable** — an unbounded tail rather than a dominant strategy, since landing 10+ tricks needs the cards rather than the intent.

- [x] **Step 3: State the `P = H` boundary property, so a later tuning pass does not break it by accident**

Equal bars put the win/lose boundary **exactly on the 6/7 line the declaration commits to**: 7 tricks a Hunt wins on Hunt 4 with 486 of 1,350 left, 6 tricks loses on Hunt 4. Write it as a consequence of `P = H` rather than of 1,350, so it survives a rescaling.

- [x] **Step 4: Restate the Quarry's job, and specify the boss's escalation as an attack on deck contents**

The Quarry's round-long rule-break now has a single precise job for the first time: **push the player across the 6/7 line.** Keep the five-inputs mapping and the four worked characters. Then specify the boss against the **fifth and unattacked input, deck contents** — the player's engine *is* the Foraged deck, so it is the only escalation that tests what a run actually built. State the form: suppressing a subset of the player's Forage edits for that Hunt, with **removing cards outright buried as the discarded branch** (it attacks the deal rather than the build, so it tests luck rather than what the run assembled). Record the risk `ideas.md` flags on the whole idea — a deck attack can read as theft rather than a test, and Balatro's debuffs survive because its engine has redundancy where 33 cards with 16 edits may not — and note the second candidate the developer may prefer: the character that best punishes a *correct* declaration read.

- [x] **Step 5: Confirm no Demand curve survives as live design in §5**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "the Demand"`
Expected: every hit is either a converted reference explaining what the Demand *was*, or §10's removal note. No hit states a rising Demand as current design.

**Confirmed.** Ran after Tasks 4–7. Remaining hits sit at lines 149 and 632 (both converted/historical references) and inside §9–§12 (lines 1046+), which this phase's own framing states are Phase 3's territory and expected to still argue the old direction. No hit in §5–§8 states a rising Demand as current design.

### Task 5: Rewrite §6 — retire the Humble-dominance proof, state the one failure mode, install the free option ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — `## 6. Catch-up`

- [x] **Step 1: Replace the opening claim and retire the superset proof as a historical note**

The section currently opens "this is the design's weakest claim". That framing goes. The superset proof — a nine-trick pile contains a three-trick pile, so the band sharing a top multiplier is dominated — is **retired, not reversed**: it depended on two bands *sharing* a top multiplier, and the two new tables have one peak each, so the problem is dissolved by construction. Keep the proof as the historical note that explains **why the multiplier table stopped being a transcription and became designed**, which is the most useful thing it can now do. Do not delete it — that is the ticket's named risk.

While here, correct what `the-hunt.md`'s Known-tensions block already reports about this section: §6's exit (b) leaned on the Poison 8s as cards a player would rather leave behind, and under printed rank a Poison 8 is worth 7 on Win and 3 on Lose. With the Poison modifier now removed entirely (Task 2), **there are zero cards worth declining, permanently rather than incidentally** — so exit (b) has no existing foothold at all. Record it as retired with the reason, not as open.

- [x] **Step 2: State the real structure — one disaster and one slow leak**

Overreaching in the direction you declared is nearly harmless: declare Win and sweep all 13 and you still deal +78 net; declare Lose and take none, likewise. The **disaster** is being pushed across the line you declared against into the opponent's peak band — declare Win, land on 4, and the swing is 444 against you, a loss on Hunt 3 at 1,350 health. The **slow leak** is undershooting all the way past the opponent's peak into their tail: declare Win, land on 0–3, and you are only −24 a Hunt, but it is still a loss, taking 18–23 Hunts. **Both must be stated** — a document claiming both extremes are safe would be wrong in the direction that costs a player a 299-trick session.

- [x] **Step 3: Install pending damage as the catch-up route, and say what it costs in new rules**

Damage accumulates visibly through the Hunt on both bars and lands only at trick 13. Because nothing is applied until then, **no Hunt is decided until the last trick**: a Quarry sitting on 9 tricks with lethal pending damage can be pushed to a 10th, collapsing its pending bar to a ×0.5 band. The endgame objective becomes *force them to take one more*, with the player deliberately dumping tricks. **Cost in new rules: zero** — it is a presentation of a number the equation already produces. Record what to watch: four figures move every trick (both pending totals, both bars), and whether that reads as tension or as noise is a feel question and the developer's, with the cheap fallback of showing only the net.

- [x] **Step 4: Install the declaration free option as the section's live problem**

This is the finding the session produced and the ticket does not cover. Card strength is an asset on the Win path and a liability on the Lose path, and the player chooses which regime applies **after seeing their hand** — while the Quarry cannot choose. Carry the worked hand: a player on a weak hand declares Lose, lands on 5 tricks, deals 480, takes 180, **+300 for holding the worse hand.** Then both things that keep it honest:

- **The option is only worth what the read is worth.** What makes a hand good at Win (high cards, trump length) is not the opposite of what makes it good at Lose (low cards, short suits). A hand of middling ranks is bad at both, and that is most hands — so the interesting case is the common one, committing before trick one without knowing which side of 6/7 you will land on.
- **The character roster is already the counterweight**, and the document has never noticed it. The **Monarch** forces the player's Swan or highest card of a led suit, which forces trick wins — an anti-Lose tool that shoves the player past 6. The **Swan** forces the lowest card when void, so the player cannot trump in — an anti-Win tool that drags them below 7. Two of five characters already punish one declaration each, at zero new rules. **Record the gap that follows: which declaration do the Woodcutter, the Fox and the Witch punish?** If the answer is "neither", that is a design hole rather than a detail. Record it here rather than editing §4, which is out of scope.

Name the two cheap levers and **choose neither**: declaring before the decree is turned (trump is the biggest single factor in whether a trick count can be steered, so this cuts read quality at zero rules — a sequencing change to a built step, recorded as a discarded branch per the third-pass decision), and sorting the roster so each character punishes a declaration.

### Task 6: Modify §7 — resolve the defeated-opponent gap and state the run's shape ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — `## 7. Run length and depth budget`

- [x] **Step 1: Mark the "a run has no defeated opponent" gap resolved**

The section records that the Quarry has no score, no health and no failure state, so clearing the final Demand wins the run while nothing is beaten. Mark it **resolved** and say by what: the Quarry now holds health and a stake, so the run ends with an opponent defeated rather than an opponent that stops. Keep the observation that the *reveal* is an aesthetic this design has not claimed and would have to build deliberately — health answers the structural half, not the emotional one.

- [x] **Step 2: State the run's shape (AC 5)**

**Four characters plus a boss — five encounters, the no-repeat length — with the encounter order randomised.** State what it closes for free: five encounters is exactly §4's roster, so the pigeonhole problem behind §12's Problem 3 disappears by construction, and randomising the order gives **24 distinct sequences** with the boss fixed, or **120** if the boss is drawn too. That also closes §7's own "every run shows the same five characters" gap, at zero cost.

- [x] **Step 3: Resolve the banked-progress open item against power, and leave it open for options (AC 11)**

The section currently holds banked progress across runs open. Split it: carrying **power** across runs (more health, higher card damage) is **rejected**, because it dissolves the growth-class lesson the health bar exists to teach — enough runs and the starting deck is strong enough that build quality stops mattering. Carrying **options** stays open: Balatro's middle path, where beating content adds characters or kinds of Forage edit *to the pool*, so runs gain variety rather than a head start, and the deck still resets. Note Hades' model as the third weighing — banked progress is real, and difficulty is a separate dial the player opts into, so the test stays re-armable.

- [x] **Step 4: Confirm §7 no longer describes the Quarry as stakeless**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "no score, no health|nothing is beaten|has no failure state"`
Expected: every hit is inside a converted passage explaining the position the design *held*, not one asserting it.

**Confirmed.** One hit, at "the design as it stood did not permit that: the Quarry had no score, no health, and no failure state" — inside the converted "A run has no defeated opponent — resolved" passage, not a live assertion.

### Task 7: Modify §8 — reverse "the Quarry does not score" and rebuild the fourteen-row table ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — `## 8. The ruleset: kept, modified, dropped` and its `### The trick curve without a scoring opponent` subsection

- [x] **Step 1: Reverse the position, carrying the original reasoning and what it cost (AC 2)**

This is the **validated and flipped** case. The fourteen-row enumeration's arithmetic is untouched and its proof stands: the mirrored-band tension is a property of a **symmetric** contest. What changes is that the contest is back, so the conclusion goes from *"half of the table is now read by nobody"* to *"the tug is restored"*. Write it in the house style — the position taken, the reason it was taken, the premise that moved, the new position — and **do not delete the original argument**; it is the record of why the direction changed.

- [x] **Step 2: Rebuild the fourteen-row table against the two multiplier tables**

Replace the old table's two Standing columns with the enumeration from `plan.md` → *The resulting arithmetic*, both declarations. State the conclusion that replaces "exactly one side scores ×6 and the other never rises above ×3": **the mirror is now graded rather than binary**, so no split simply zeroes one side, and the net is perfectly antisymmetric — `Net(k) = −Net(13 − k)`, with the Lose column the exact negative of the Win column.

State the winner property **carefully**, because the obvious phrasing overclaims: at average card values no split in the table comes out even, so the tables give every split a winner. Antisymmetry alone does not forbid a zero — it permits a zero *pair* at `k` and `13 − k` — and the odd round length only rules out a single self-paired split. **A real deal can tie**, because actual pile sums diverge from the mean. Say that, and record the tie as reachable in play.

- [x] **Step 3: Correct the 21-point-match row's now-void reason**

The row currently reads "dropped — match-to-21 is the ending condition of a symmetric two-player contest, which no longer exists once the opponent does not score." That reason is void: the contest exists again, and a race to deplete two health bars **is** match-to-21 with the sign flipped. Correct it to dropped-and-restored-in-a-new-form rather than leaving a reason that contradicts the section above it.

- [x] **Step 4: Update the rows the direction changed, and add one**

- **Trick-count scoring curve** — the "bands preserved verbatim; only the curve's role changes" claim needs qualifying: the **boundaries** are still the base game's `{0–3} {4} {5} {6} {7–9} {10–13}`, but the **values** are now designed rather than transcribed, and there are two tables, with the Lose path reading the same boundary set in mirror.
- **Poison 8s** — was "Kept"; now dropped as a modifier. Rank 8 is an ordinary card.
- **Add a row for the declaration**, cross-referencing §1's new `###` so a reader coming from the base game finds it.

- [x] **Step 5: Confirm the reversed line is gone and its reasoning is not**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "the Quarry does not score"`
Expected: any hit is a quotation of the retired position inside its own conversion, never a live assertion. Zero hits is also acceptable provided Step 1's converted passage exists.

**Confirmed.** Zero hits. Step 1's converted passage ("What happened when the Quarry stopped scoring, and why the position changed rather than merely weakened") exists and carries the original reasoning.

---

## Phase 3 — The registers, the slice, the critique, and the parking lot

The downstream readers: §9's value register, §10's vocabulary, §11's slice, §12's re-run critique, and the `ideas.md` reconciliation. At this boundary the document argues one direction end to end and the repository holds one live account of it.

### Task 8: Rewrite §9 — two rows to Decided, one deleted, and the genuinely open rows added ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — `## 9. First-pass values`

- [x] **Step 1: Transcribe the register from `plan.md` → Data shapes → *§9 after the rewrite***

That table is the authoritative content, row for row, including each row's status and its note or settling measurement. Two rows move to **Decided** with their reasons (card base value at printed rank; the two mirrored tables), the **Demand base and growth rate** row is **deleted** rather than marked Undecided, and the remaining rows are added.

- [x] **Step 2: Keep the section's own standing rule intact**

§9 opens by stating that no number in it is a chosen value. That is no longer true — several are now the developer's decisions, recorded. Rewrite the preamble so it distinguishes three states honestly: **Decided** (a developer decision, dated), **Undecided** (open, with the measurement that would settle it), and **Deferred** (open but not blocking the first fight). The rule that survives unchanged is that **this document chooses nothing on its own authority**.

- [x] **Step 3: State the two health values and what they buy**

`H = P = 1,350`, decided 2026-08-11. Record the two consequences, both of which are properties rather than preferences: equal bars put the win/lose boundary exactly on the 6/7 line (7 tricks wins on Hunt 4 with 486 left, 6 loses on Hunt 4), and `1,350 / 540 = 2.5` puts the fast lane at 3–4 Hunts, which is why it was chosen over a smaller bar — the declaration has to be made several times for the slice to say anything about it. Cite `ideas.md`'s fight-length entry for the worked table rather than restating it.

- [x] **Step 4: State the one remaining blocking number, and its dissolution**

The ×0.5 bands produce half-point damage on any odd card sum. Record both routes and **choose neither**: pick a rounding direction, or double every entry in both tables (`×2/×4/×6/×8/×10/×1`), which makes every multiplier an integer, preserves the ratios and the exact complementarity, doubles the health totals, and deletes the question. Mark it a developer decision.

- [x] **Step 5: Confirm no new row carries an invented number**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "Undecided|Deferred|Decided"`
Expected: every **Undecided** and **Deferred** row states a shape and a measurement and no value; every **Decided** row carries a date and attributes the choice to the developer. Review each hit — this is the check that keeps the register honest.

**Confirmed.** Every Decided row in §9's new table carries `(2026-08-11)` and attributes the value to the developer; every Undecided/Deferred row states a shape and settling measurement with no value chosen. Remaining hits sit in §3 (already-rewritten, describing the closed card-value fork), §6 (the Forage-inversion deferral), §5 (`H = 1,350` restated as decided), §7 (the banked-progress decision), §10 (the Snare placeholder name, unaffected), and §12 (old, references "the Demand's shape as undecided" — Task 11 rewrites §12 next).

### Task 9: Modify §10 — remove the retired terms, add the new ones, flag the band names ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — `## 10. Vocabulary`

- [x] **Step 1: Remove `Spoils` and `the Demand`, and add the rows the direction introduces**

Take the seven rows from `plan.md` → Data shapes → *vocabulary changes to §10*: health, damage, pending damage, the declaration, the line, the cap, the boss. Keep the section's existing rule that every row is first-pass and the developer's to red-line, since naming is a copy judgement.

- [x] **Step 2: Flag the band-name mismatch without renaming**

Humble / Defeated / Victorious / Greedy name the base game's *values*. Under two tables they describe the Win path and **misdescribe the Lose path**, where 4–6 — the base game's "Defeated" — is the peak. State the problem, state that renaming would ripple into `the-hunt.md` and the built configuration's band constants, and mark it the developer's. **Do not rename them** — the third-pass decision was that the names stand for now.

**Note beyond the listed steps:** `Standing` was initially dropped from the table in error — it is still `§1`'s live name for the multiplicative term — and was restored with a note pointing at the two mirrored tables it now covers.

### Task 10: Rewrite §11 — the slice becomes one fight against the Monarch Quarry ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — `## 11. Smallest testable slice`

- [x] **Step 1: Restate the one question the slice answers**

Not "does a single Hunt against a CPU stay a live decision" — that was the old headline risk. The new question is **"is the declaration a live read, and does the Monarch make it a hard one?"** Everything in the slice exists to answer that; anything that would not help answer it is cut.

- [x] **Step 2: State what is in**

One encounter against the **Monarch**, the only built character. Two health bars at 1,350 each. The declaration made pre-Hunt after the deal, as built. Both multiplier tables. Card value = printed rank, no modifiers. Damage applied once at the thirteenth trick in **both** directions. Pending damage shown on both bars. Repeated Hunts until a bar empties. A draw going to the Quarry.

- [x] **Step 3: Name the band-position CPU as the slice's largest engineering item**

The shipped CPU favours winning a trick cheaply over winning it expensively — it maximises tricks. Under these tables that is close to the worst available policy for it: on either declaration a trick-maximising Quarry lands near its own `k = 10–13` and deals roughly 24–78 against a competent player's 420–540. State the consequence plainly — **a Quarry that never plays toward a band never threatens the 6/7 line the declaration commits to**, so the slice's own question would be measured against an opponent that cannot make it a hard one. Record that this is materially harder to build than the CPU that ships today, citing `ideas.md` → *The Quarry deals damage too*, which flagged it first. Do **not** list the Monarch as though the existing CPU were sufficient.

- [x] **Step 4: State what is out, each with its reason**

Forage, the run, escalation, the other four characters, and overkill (wasted for now; may later pay out as cash or similar — recorded as deferred, not as designed). And **the cap**, with the reason worth writing down: both bars drain every Hunt so a single encounter self-terminates, the cap is a run-pacing device and there is no run, and more usefully **the slice is what decides whether a cap is needed at all** — if Hunts keep landing at the extremes the fight stalls, and that observation is the evidence, collected for free.

- [x] **Step 5: Restate the kill criterion against the new question**

Written so it can actually fire. If a playtester who has never read this document declares, watches both pending bars move, visibly plays toward or away from the 6/7 line — and still reports across a small sample that the declaration felt like a coin flip they were not equipped to make, then the free option is not a decision and the declaration needs one of §6's two mitigations or it needs removing. Keep the section's existing honesty about what tuning cannot repair.

- [x] **Step 6: Update the "what already exists" inventory against the current engine**

The existing inventory is accurate about the deck, the deal, legal moves, the abilities, trick resolution and the CPU, and DLR-63 since added the declaration. Correct the one claim the direction voids: `scoring.ts`'s band table is **no longer** the transcribed six values doing a second job for free — the values are now designed and there are two tables, so it is a changed lookup rather than a reused one. State what is genuinely new for the slice: two health bars and damage application, the second multiplier table and the pile swap, pending totals surfaced per trick, and the band-position CPU.

**Note on the boundary rule:** the previous version of this section named several files and functions (`abilities.ts`, `cpuPlayer.ts`, `scoring.ts`'s `tricksToPoints`, `chooseCpuMove`, `RoundState`) despite `implementation-doc-writer`'s standing rule that `hybrid-design.md`'s prose names no function or file. The rewrite removes all of them, describing the same inventory procedurally instead — not only the one claim Step 6's own text calls out, since the rewrite touched the whole section and the boundary applies throughout it.

### Task 11: Rewrite §12 — re-run the critique against `design-principles.md §6` ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — `## 12. Critique`

- [x] **Step 1: Re-run the fourteen checks and rank the problems by severity × likelihood**

Read `.docs/design/design-principles.md §6` and run its checks over the rewritten §1–§11 as a finished argument. Keep the section's existing shape: strengths first, then ranked problems each carrying evidence, what the player experiences, what it connects to, and options rather than prescriptions. Every framework or precedent named must be unpacked in one plain sentence on first use.

- [x] **Step 2: Rank the declaration free option first**

It is the design's largest unresolved balance question and it displaces the old Problem 1. Evidence: the worked hand (+300 for holding the worse hand), the asymmetry that the player chooses the regime after seeing their hand while the Quarry cannot, and the roster counterweight that already exists for two of five characters. Its falsifier is the measurement in §11.

- [x] **Step 3: Close Problem 1 and Problem 3, each with its reason**

- **Problem 1 (Standing as a dominant strategy)** closes — but **not** for the reason AC 10 gives. It closes because the two tables remove any single dominant band: each path has one peak, and the peaks sit on opposite sides of the 6/7 line, so "which band do I aim for" is answered by the declaration rather than fixed at 7–9. The Quarry acquiring a stake helps; the table shape is what actually closes it.
- **Problem 3 (Quarry repeats)** closes by construction: five encounters is the roster and the no-repeat length, with the order randomised (§7).

- [x] **Step 4: Restate Problem 2 rather than closing it**

Health makes the decline **visible**, which is the fix. A multi-Hunt encounter makes a dying run **longer**, which is the cost — and at 1,350 a losing tail runs 18–23 Hunts. So the problem is partly improved and partly worsened, and the honest statement says both. Note the coupling that survives: strengthening the Quarry's pressure to make the declaration a hard read increases how often a build is pushed across its declared line, which is exactly Problem 2's variance.

- [x] **Step 5: Record the smaller findings, including the two the session produced**

Keep the surviving smaller findings and update the void ones. The surplus-Spoils finding is now answered — against health every point carries — but overkill past a depleted bar is wasted, so record that as the residual. Add: **the middling-hand question** (most hands cannot steer to either band, so the declaration is often a commitment made with no read; whether that reads as tension or as a coin flip is a feel question and the developer's), and **the three unassigned characters** (which declaration do the Woodcutter, the Fox and the Witch punish?).

- [x] **Step 6: Rewrite the one-line summary against the new exposure**

The old summary said the design's real exposure was whether removing a scoring opponent turns Standing into a fixed answer. That exposure is closed. The new one is the declaration: a free option taken with the hand visible, against an opponent that cannot answer in kind.

**Numbering note:** `Problem 1` and `Problem 2`'s numbers were only ever self-referenced inside §12, so `Problem 1` was reassigned to the new top-ranked finding (the free option) and the original Standing-dominance finding moved into a "Closed since the last pass" subsection. `Problem 3` keeps its number and its own heading text inside that same subsection, because §7 cites "§12's Problem 3" by that string in two places (its "a run has no defeated opponent" and "every run shows the same five characters" passages) and that citation still needs to resolve.

### Task 12: Reconcile `ideas.md` so the repository holds one live account ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/ideas.md`

- [x] **Step 1: Move the promoted entries, following `plan.md` → Data shapes → *the reconciliation, entry by entry***

That table is authoritative. Six entries move to **Promoted** behind a pointer to the section each became; one moves to **Superseded in place**; the shop entry moves to **Rejected**; the combo-bonus entry stays Rejected and gains a pointer. **Delete nothing** — the file's own rule is *"Move entries down rather than deleting them."* Use its documented Promoted comment format: title, the section it became, the date, and one line on what changed in the trip.

- [x] **Step 2: Mark every superseded figure, rather than leaving it readable as current**

This is the point of the reconciliation and the ticket's named risk. Specifically: the *Poison as the Lose path's damage source* entry's 918 / 936 / 378 / 216 table and its "the two paths become competitive" conclusion were computed against a fixed Demand of 220 and are **void**; the *full net-damage enumeration* entry's Findings 1 and 2 are void (there is no Humble lane, and 4–6 is the Lose path's *peak*), while its Finding 3 survives in a new form and is promoted separately; the combo-bonus entry's ×18 → ×30 break-even is void.

- [x] **Step 3: Annotate the fight-length entry, which was written during the design session and predates the health decision**

*Fight length is symmetric about the middle, and bimodal* illustrates at `P = H = 1,620` and says outright that 1,620 is "not a proposed value". Health is now **decided at 1,350**, so annotate it: the fast band stays **3–4 Hunts** (which is why 1,350 was chosen), the tail shortens from 21–27 to **18–23**, and the derived cap range 4–10 becomes **3–5**. Every structural finding survives unchanged, including that the slowest line is 10 tricks rather than 13. Do not rewrite the entry — annotate it, so the parked finding stays findable and no superseded number reads as current.

- [x] **Step 4: Add the three new entries the session produced**

- **The declaration as a free option** — *Worth costing*. The session's largest finding, carrying the worked hand, the two mitigations, and the measurement.
- **The character roster as declaration counterweight** — *Worth costing*. Monarch = anti-Lose, Swan = anti-Win, three characters unassigned. Zero new rules.
- **Declaring before the decree is turned** — *Raw*. A sequencing change to a built step that cuts read quality at zero rules; recorded as a discarded branch in the design, kept here as the lever if the free option needs one.

- [x] **Step 5: Confirm every `§N` pointer in the file resolves**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\ideas.md -Pattern "§(1[3-9]|[2-9][0-9])"`
Expected: zero hits. `hybrid-design.md` has exactly twelve numbered sections, so any citation of §13 or higher is a broken pointer.

**Confirmed.** Zero hits.

**Note on the Superseded net-damage entry:** its own body text still cites `§12`'s (old) Problem numbers and quotes them — left as-is per "annotate, don't rewrite," since the entry itself is explicitly marked Superseded in place at the top and the annotation states which numbers are void.

---

## Phase 4 — Final verification

No content changes. Only checks that the cumulative work is internally consistent, that nothing out of scope moved, and that the formatting gate passes.

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` are **not applicable to this contract** — no TypeScript is in the diff and no file under `src/` is in any task's file list. That is not an `N/A` on a code change; Task 13 proves it by showing the working tree holds no `src/` modification. One typecheck is run anyway as a zero-cost confirmation the tree is sound.

### Task 13: Confirm nothing out of scope changed ✓

- Skill: `none — verification commands only, no prose authored`

**Files:**

- (no files modified — verification only)

- [x] **Step 1: Show the working tree and confirm only the two in-scope documents changed**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain`
Expected: modifications to `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` and `.docs/design/Balatro-Forbidden-Solitaire/ideas.md`, plus this contract's own folder. **No entry under `src/`, no `.docs/game_rules/`, no `.docs/implementation/`, no `package.json`, no `package-lock.json`.**

**Confirmed.** Output: ` M .docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md`, ` M .docs/design/Balatro-Forbidden-Solitaire/ideas.md`, `?? .claude/contract/DLR-64-rewrite-hybrid-design-to-duel-direction/`. No other entry.

- [x] **Step 2: Confirm the tree still type-checks, as a zero-cost sanity check**

Run: `npm run typecheck`
Expected: exits 0, no errors. This proves nothing about the documents; it confirms no code was touched incidentally.

**Confirmed.** `tsc -b` exited 0 with no output.

### Task 14: Confirm the section-numbering invariant held ✓

- Skill: `none — verification commands only, no prose authored`

**Files:**

- (no files modified — verification only)

- [x] **Step 1: List every `##` heading and confirm the twelve numbered ones are unchanged**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "^## " | Select-Object -ExpandProperty Line`
Expected: `## 1. The equation`, `## 2. The shared object`, `## 3. What the run rewrites`, `## 4. The Quarry`, `## 5. Escalation`, `## 6. Catch-up`, `## 7. Run length and depth budget`, `## 8. The ruleset: kept, modified, dropped`, `## 9. First-pass values`, `## 10. Vocabulary`, `## 11. Smallest testable slice`, `## 12. Critique` — all present, all with their original numbers and titles — plus exactly one **un-numbered** heading, the new opening section. **Thirteen `##` headings total.** This is the check that protects the 148 `§N` citations across the eight live referring files.

**Confirmed.** All thirteen headings present in order: `## The direction: both sides deal damage, both hold health` followed by `## 1.` through `## 12.`, titles unchanged.

- [x] **Step 2: Confirm no heading added inside a numbered section is a `##`**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "^#{2}\s" | Measure-Object | Select-Object -ExpandProperty Count`
Expected: `13`. Any higher count means a subsection was added at `##` and now reads as a fourteenth top-level section.

**Confirmed.** Count returned exactly `13`.

### Task 15: Confirm no void figure survives as live arithmetic ✓

- Skill: `none — verification commands only, no prose authored`

**Files:**

- (no files modified — verification only)

- [x] **Step 1: Grep for the retired figures**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "\b108\b|\b156\b|\b918\b|\b648\b|\b936\b|\b816\b|\b220\b|×18|×6\b"`
Expected: **this is a review step, not a zero-hit step.** Every surviving hit must sit in a sentence that explicitly marks the figure as retired, historical, or void — §6's historical note and §12's converted findings legitimately refer back to them. Any hit presenting one as current arithmetic is a defect. Report the hit count and the disposition of each.

**Reviewed — 11 hits, all correctly disposed.** Line 74 (opening section's void notice), 170–171 (§1 combo-bonus discarded branch, "is void"), 203–206 (§1 declaration subsection, credit-mechanic figures marked "void"), 462 (§3 Forage in-round-edit note, explicitly "void"), 474 (§3 dominant-strategy note, "this used to carry ... is void"), 703–729 (§6's historical note, explicitly framed "as it stood" / "retired, not reversed"), 974–1021 (§8's converted passage, "the position this section held" / "the old table"). No hit presents a void figure as current arithmetic.

- [x] **Step 2: Confirm the new figures are present and consistent**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "540|765|444|708|1,350"`
Expected: the ceiling (540 typical, 765 best case), the maximum net swing (±444), the boundary-Hunt total (708) and the health value (1,350) all appear, and no variant figure contradicts them. `1,350` must never appear as `900` or `1,620`.

**Confirmed.** 28 hits across the document. `900` does not appear at all; the two `1,620` hits (§9's health and cap rows) both explicitly cite it as the figure `ideas.md`'s fight-length entry illustrates at, with the document's own value stated as `1,350` in the same sentence — not a contradiction.

- [x] **Step 3: Record the deliberate divergence rather than fixing it**

Run: `Select-String -Path .docs\game_rules\the-hunt.md,.docs\implementation\war-council\scoring.md -Pattern "×6|220|LOSE_CREDITS|Demand"`
Expected: hits, and they are **correct**. Those two files describe built code and current rules, neither of which this contract changes, so they will continue to state the single ×6-family table, the Demand of 220, and the three-credit Lose path. Record the hit counts in the report as a known, deliberate design-versus-ruleset divergence that the next implementation ticket inherits — do **not** edit either file.

**Confirmed.** 21 hits in `the-hunt.md` (its Standing table's `×6` bands, its Demand of `220`, its `LOSE_CREDITS_PER_HUNT` Status-register row, its Known-tensions and Status-register Demand entries), 10 hits in `scoring.md` (its `checkDemand` / `DEMAND_CURVE` / `FIXED_DEMAND` documentation). Neither file was edited — confirmed by Task 13's clean `git status`.

### Task 16: Record the rule-change check ✓

- Skill: `implementation-doc-writer`

**Files:**

- (no files modified — the check's outcome is reported, not written)

- [x] **Step 1: Run the skill's Step 1 rule-change check and state its outcome in one line**

Ask the question from the player's side: does anything in this diff change what a player may do, must do, or is scored on? **The answer is no** — the diff is two design documents, no procedure gained enforcement, no tunable's value moved in code, no constant named in `the-hunt.md`'s Status register was renamed or deleted, and no rule graduated from `[not built]`. The direction this contract documents is entirely unbuilt.

Expected: a one-line statement in the report that the check ran, that `the-hunt.md` was correctly **not** edited, and why. Per that skill's success criteria, a silent absence is indistinguishable from a skipped check and fails the criterion — so the line is required even though nothing changed.

**Ran.** The `implementation-doc-writer` skill's Step 1 rule-change check was invoked and run against this contract's diff: nothing in `hybrid-design.md`'s or `ideas.md`'s changes alters what a player may do, must do, or is scored on — no procedure gained enforcement, no tunable moved in code, no Status-register constant was renamed or deleted, and no rule graduated from `[not built]` — because the diff is design prose describing a direction that is entirely unbuilt. `the-hunt.md` was correctly **not** edited, confirmed by Task 13's clean `git status`.

### Task 17: Formatting gate ✓

- Skill: `none — verification commands only, no prose authored`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md`, `.docs/design/Balatro-Forbidden-Solitaire/ideas.md` — Prettier reformat only

- [x] **Step 1: Reformat the two changed files in place**

Run: `npx prettier --write .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md .docs\design\Balatro-Forbidden-Solitaire\ideas.md`
Expected: exits 0, both files reported as written. **Scoped deliberately** — `npm run format` writes across the whole repository and would reformat 21 files unrelated to this contract, which `.claude/workflow/web-project.md` forbids as a side effect of unrelated work. Both files already failed Prettier before this contract, so expect cosmetic changes beyond the rewrite (`*emphasis*` → `_emphasis_`, table-column padding).

**Confirmed.** Output: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md 153ms`, `.docs/design/Balatro-Forbidden-Solitaire/ideas.md 57ms`. Re-ran Task 14's heading-invariant checks afterward per this task's own instruction — thirteen `##` headings, all unchanged — confirming the reformat broke no citation or heading.

- [x] **Step 2: Confirm the formatting gate passes on the two changed files**

Run: `npx prettier --check .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md .docs\design\Balatro-Forbidden-Solitaire\ideas.md`
Expected: exits 0, "All matched files use Prettier code style!"

**Confirmed.** Output: "Checking formatting... All matched files use Prettier code style!"

- [x] **Step 3: Run the repo-wide script and report it honestly without acting on it**

Run: `npm run format:check`
Expected: **fails**, listing the pre-existing offenders. Report the count and confirm that neither of this contract's two files is among them. This is AC 12 as narrowed: the repo-wide script cannot pass without touching 21 unrelated files, so the gate is the scoped check in Step 2 and this step exists to prove the contract did not make the repo-wide state worse.

**Confirmed — fails, as expected.** Exit code 1, "Code style issues found in 21 files." The 21 listed files are `.docs/design/Balatro-Forbidden-Solitaire/{balatro-play-notes.md, balatro.md, forbidden-solitaire.md}`, `.docs/design/design-principles.md`, ten files under `.docs/implementation/{app,hunt,war-council,war-council-ui}/`, `.docs/implementation/README.md`, and `.github/{copilot-instructions.md, instructions/mermaid.instructions.md}`. Neither `hybrid-design.md` nor `ideas.md` is among them — `git status --porcelain` after the Prettier write still shows only those two files modified.

### Task 18: Update the PR description ✓

- Skill: `none — a hand-off document, no code`

**Files:**

- Create: `.claude/contract/DLR-64-rewrite-hybrid-design-to-duel-direction/pr-description.md`

- [x] **Step 1: Write `pr-description.md` for the developer to paste**

**Written.** Includes the plan link, the per-section reversal-kind summary, every open developer
decision, the §3 scope-increase rationale, the AC-drift note, Phase 4's actual verification output
(not the predicted output), and the citation-surface convention line.

Include:

- A link to `plan.md` in this folder.
- A summary of the change: which sections were rewritten, and which of the three kinds of reversal each carried (§8 validated and flipped, §6 retired as a historical note, §3 void and replaced).
- **Every decision the developer must still make**, from the File map's "Developer decides or observes" list — chiefly the ×0.5 rounding rule (or the doubling that dissolves it), the Hunt cap, the boss's specific deck attack, the band names, and whether the declaration free option gets a mitigation.
- **The scope increase**: §3 came into scope against the ticket's "sections 1 and 5 through 12", and why leaving it out was not viable.
- **The AC drift**: AC 1, 3 and 4 as written could not be executed; the plan's AC-drift table carries the reading used for each. Note that the Jira description should be updated to match, or the plan is the only record the criteria were re-read rather than missed.
- Verification results from Phase 4, including the deliberate `the-hunt.md` divergence and the honest repo-wide `format:check` failure.
- One line for future contributors on the convention this contract establishes: **`hybrid-design.md`'s twelve numbered sections are a stable citation surface** — 148 `§N` references across eight live files point at them, so a future rewrite adds un-numbered or `###` headings rather than renumbering.

---

## Self-review

**Spec coverage:**

- Opening section stating the direction (AC 1) — Task 1.
- §8's "the Quarry does not score" reversed, reasoning converted (AC 2) — Task 7.
- §5's health plus the cap, with the cap's real justification (AC 3, as re-read) — Task 4.
- §6 rewritten around the real structure, free option installed (AC 4, as re-read) — Task 5.
- §7's defeated-opponent gap resolved, run shape stated (AC 5) — Task 6.
- The boss's escalation as an attack on deck contents (AC 6) — Task 4, Step 4.
- The Win/Lose declaration documented, Lose path in its new form, credit mechanic retired (AC 7) — Task 2, Step 3.
- §9's rows for the newly open values, no value chosen (AC 8) — Task 8.
- §11 rescoped to one fight with both pending totals (AC 9) — Task 10.
- §12's critique re-run; Problems 1 and 3 closed, Problem 2 restated (AC 10) — Task 11.
- The combo bonus and the shop recorded as rejected (AC 11) — Task 2 Step 4 and Task 3 Step 5, with the cross-run-power half in Task 6 Step 3.
- Formatting (AC 12, as narrowed) — Task 17.
- §3's void arithmetic replaced (the plan's scope increase) — Task 3.
- `ideas.md` reconciled (the ticket's second in-scope item) — Task 12.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step names the exact content to write or gives a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** The new identifiers are used identically across every task that touches them — the un-numbered heading `## The direction: both sides deal damage, both hold health`; the `###` heading `The declaration, the two tables, and what each side is paid for`; the vocabulary terms *health*, *damage*, *pending damage*, *the declaration*, *the line*, *the cap*, *the boss*; the symbols `H`, `P`, `R`, `k`; and the figures 540, 765, ±444, 708, 78–96, 1,350, 3–4 Hunts, 18–23 Hunts. `Spoils` and `the Demand` appear only as retired terms after Task 2 and Task 9.

**Phase boundary cleanliness:**

- **Phase 1** ends with the opening section and §1–§3 internally consistent with each other and with `plan.md`'s enumeration, and the twelve numbered headings intact. §5–§12 still argue the old direction — stated in the phase framing rather than papered over, because a prose document has only two fully coherent states.
- **Phase 2** ends with §1–§8 arguing the new direction consistently, every reversal carrying its converted reasoning. §9–§12 are the remaining downstream readers.
- **Phase 3** ends with the document coherent end to end and `ideas.md` holding no figure that reads as current when it is superseded.
- **Phase 4** changes no content except Prettier's reformat, so it cannot break a boundary; it verifies the numbering invariant, the void-figure disposition, the out-of-scope untouched set, and the formatting gate.
