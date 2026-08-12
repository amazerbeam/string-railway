# Ideas — the parking lot

Raw ideas for The Hunt, before they are arguments. Nothing here is a decision, and nothing here is
load-bearing: if a rule depends on it, it does not belong here — it belongs in
[`hybrid-design.md`](./hybrid-design.md), argued for.

**Why this file exists.** `hybrid-design.md` is a treatment — every section states a position and
buries the discarded branch. That is the right shape for a settled design and the wrong shape for a
thought you had in the shower. An idea forced into a treatment section before it is ready gets
argued for prematurely; an idea left in chat gets lost. This is where it waits.

**The point of Rejected.** An idea killed with its reason recorded stays killed. Without the reason,
the same idea comes back in three months and gets re-litigated from scratch. Move entries down
rather than deleting them.

---

## How to use this

**Adding an idea costs one line.** Title, a sentence on what it is, and — if you know it — the
problem it is reaching for. That is the whole obligation. No table row, no ranking, no cross-
reference. The moment adding an idea requires analysis, ideas stop getting added.

The analysis is opt-in and comes later, when an idea earns it. That is what the three statuses are:

| Status                      | Means                             | What it owes                                                                         |
| --------------------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| **Raw**                     | Written down, not yet examined    | Nothing. A title and a sentence.                                                     |
| **Worth costing**           | Someone thinks this might be real | Which problem it solves, what it costs in _new rules_, and what would prove it wrong |
| **Promoted** / **Rejected** | Resolved                          | The `hybrid-design.md` section it became, or the reason it died                      |

Ideas that arrive with their own context do not need this file — a thought that comes out of a play
session belongs in that session's notes, where the context is. See `balatro-play-notes.md` §2.4 for
one that was handled that way. This file is for the free-floating ones.

---

## Raw

### Declaring before the decree is turned

**What it is.** Move the declaration earlier in the setup sequence — before the decree card is
turned, rather than after it, as built. Raised as a lever for the free-option problem below, not
adopted.

**Problem it solves.** Trump is the single biggest factor in whether a trick count can be steered
toward a band, so declaring before it is visible would cut read quality at zero rules — a
sequencing change over a step that already exists, not a new one. It is one of two cheap levers
`hybrid-design.md` §6 names for the declaration's free-option problem (the other is sorting the
character roster so every character punishes a declaration) and neither is taken there.

**Why it stayed Raw rather than costed.** `hybrid-design.md`'s third-pass decision, 2026-08-11,
already read this branch and discarded it — the declaration is built pre-Hunt, after the deal, with
the decree already visible, and moving it earlier is recorded as a discarded branch with that
reason. Kept here, not in `hybrid-design.md`, as the lever to reach for if the free option ever
needs one and this reading is revisited.

**Cost in new rules.** Zero — it reorders an existing step rather than adding one.

**What would prove it wrong, or right.** The same measurement §11's slice already collects for the
free option: whether a playtester reports the declaration as a read or a coin flip. If the coin-flip
report survives even after this reordering, the lever doesn't fix what it was reached for.

---

## Worth costing

All five below arrived together on 2026-08-11 as one proposal: the Quarry gets health, cards are
damage, poison is the lose path, four characters plus a boss with a cheat tool, and roguelike
upgrades bought with money. They are recorded separately because they cost different things and
three of them can be taken without the other two. **Nothing here is decided.**

### Superseded reading — poison as incoming damage on player health

**Note, 2026-08-11 (DLR-64).** Player health went from an idea in this file to design — `H = P =
1,350`, `hybrid-design.md` §9 — but this entry's _specific mechanism_ (poisoned cards, tracked
independently of what the cards are worth) is not what shipped in the design: the direction pays the
player for the cards the Quarry captures, at inverted printed-rank value, with no separate poison
concept at all. So this entry stays parked rather than promoted. Its blocking finding below is still
live and still worth reading before anyone revisits a card-level damage mechanic.

**What it is.** The player has health too. Poisoned cards damage whoever wins the trick containing
them, so the Quarry's attack lands on the cards rather than on the player's stats.

**Problem it solves.** This is Forbidden Solitaire's enemy design, which `design-principles.md` §8
holds up as the standard and this design has never implemented — enemies there _"curse, poison and
infest tableau cards."_ The Quarry currently attacks only the **rules** (§4/§5's round-long
rule-breaks). Nothing attacks the **cards**. It also rescues §9's open negative-card-values row,
which worries that _"the Poison 8s alone (3 of 33) are too thin to carry it"_ — under a health bar a
poisoned card is a permanent cost carried to the boss, not a dent in a score already banked.

**The blocking constraint — uniform poison is arithmetically a no-op.** If poisoned cards are spread
evenly and each costs 1 health, expected damage taken is `c · 2k` and the round's net is
`2k·(f(k) − c)`. A constant subtracted from every band equally does not move the argmax: `k=9` still
pays `18(6−c)` against Humble's `6(6−c)`. **It shifts no decision and scales the whole curve down** —
arithmetically identical to just lowering damage, for the price of a rule. Poison is only a decision
when it is **concentrated and visible**: a named card, on the table, in a trick the player can
choose to lose.

**Cost in new rules.** One, if player health reads as the negative sum of the same captured pile —
one pile, two readings, which preserves §2's shared-object discipline. Two channels rather than one
if player health is tracked independently of what the cards say, which is what §1's component table
forbids.

**What would prove it wrong.** Count how often a player declines a trick they could win. Zero means
poison is a tax, not a decision. (§9 already proposes this exact count for negative card values.)

### Forage as a draft, instead of random upgrades

**What it is.** Forage offers three edits and the player picks one, four times per encounter, rather
than choosing four edits freely.

**Problem it solves.** The "random per-run upgrades" want, using a system that already exists.
Delivers run-to-run variety (§7's gap), a real decision where there was an open menu, and Balatro's
shop-shaped choice — with no new subsystem and no currency.

**Cost in new rules.** Zero. It is a presentation rule over §3's existing verb.

**Risk.** §9 set the budget to 4 partly so four edits can stack on one card for +12, which is what
makes §6's concentrate-vs-spread fork playable rather than theoretical. A draft can deny that stack,
so the draft and the budget are one decision.

### The full net-damage enumeration, with two-sided damage

**Superseded in place, 2026-08-11 (DLR-64) — not promoted.** This table and its three findings rest
on the single ×6-family table (`Spoils × Standing` off a plain trick-count band), computed before the
direction introduced two mirrored, designed tables. **Findings 1 and 2 below are void**: Finding 1's
"Humble is rescued" has no subject — there is no Humble lane once each declared path has one peak —
and Finding 2's "valley near-lethal" numbers assume 4–6 is a low point rather than the Lose path's
_peak_, which the direction makes it. **Finding 3 survives in a new form** and is promoted
separately, as the one-failure-mode finding in `hybrid-design.md` §6 (see Promoted, below) — its
core observation, that the round's ending needs an endgame where trick 13 plays differently from
trick 1, is exactly what pending damage and the disaster/slow-leak framing deliver. Kept here rather
than deleted, per this file's own rule, because the arithmetic below is a real record of the
single-table model this design no longer uses.

All fourteen splits of 13 tricks, at the **built** rules as they stood before this direction — card
value = printed rank, average rank 6, no combo bonus (dropped 2026-08-11; see Rejected). Both sides
score `Spoils × Standing` off their own capture pile and trick count. This table is the evidence
behind the three findings under it.

| Player `k` | Quarry `k` | Player deals | Quarry deals | Net      |
| ---------- | ---------- | ------------ | ------------ | -------- |
| 0          | 13         | 0            | 0            | 0        |
| 1          | 12         | 72           | 0            | +72      |
| 2          | 11         | 144          | 0            | +144     |
| 3          | 10         | 216          | 0            | **+216** |
| 4          | 9          | 48           | 648          | **−600** |
| 5          | 8          | 120          | 576          | −456     |
| 6          | 7          | 216          | 504          | −288     |
| 7          | 6          | 504          | 216          | +288     |
| 8          | 5          | 576          | 120          | +456     |
| 9          | 4          | 648          | 48           | **+600** |
| 10         | 3          | 0            | 216          | −216     |
| 11         | 2          | 0            | 144          | −144     |
| 12         | 1          | 0            | 72           | −72      |
| 13         | 0          | 0            | 0            | 0        |

**Finding 1 — the Humble lane is rescued, by health rather than by score.** At `k ≤ 3` the Quarry is
in Greedy and deals **zero**; it is the only region of the table where the player takes no damage.
Against a Quarry with health `H`, the Victorious route needs `H/648` rounds and costs `H/13.5` of the
player's health, while the Humble route needs `H/216` rounds — 3× slower — and costs nothing. §6
calls catch-up _"the design's weakest claim"_ and proves at length that Humble is dominated and that
Forage does not rescue it; it is rescued here by a lever §6 never considered, because health adds a
second axis and Humble is the zero-damage band. **This needs health and Quarry damage together** —
neither alone produces it.

Consequence: the round cap (see the health entry) becomes the dial that prices the two lanes against
each other. Cap short and Humble cannot finish; cap long and Humble is free. That makes it a far
more interesting number than it looked like as a pacing fix.

**Finding 2 — the valley becomes near-lethal.** `k = 4, 5, 6` read −600, −456, −288. Under the
current design the valley is merely a low score. §5's Quarry rule-breaks exist specifically to
displace the player's trick count, and §12 already names the coupling: strengthening Quarry pressure
_"increases how often a build gets pushed toward Defeated or Greedy it didn't choose, raising the
variance."_ That sentence was written when the consequence was a low score. **Quarry pressure and
player health must now be tuned as one number, not two.**

**Finding 3 — there is finally an endgame.** At `k=9` with tricks remaining, the player must dodge
every one or fall off an **816-point** cliff (+600 → −216), while the Quarry — now holding a stake —
wants to force tricks on them by leading low. Currently trick 13 plays identically to trick 1. A
self-correcting property helps: winning tricks spends high cards, so a player at `k=9` is naturally
holding the low cards that make dodging possible, and the Quarry has to work for it.

**The ratio worth remembering:** the boundary swing (816) is **2.8×** a typical round's differential
(±288 at the 6/7 split). That ratio is invariant to the combo bonus — the bonus scaled both numbers
by the same factor. See the Rejected entry for the correction that surfaced this.

### Overkill heals

**What it is.** Damage past the Quarry's remaining health becomes healing for the player.

**Problem it solves.** §12's _"no stated consequence for clearing the Demand with surplus Spoils"_ —
the moment a Hunt is arithmetically safe stops being dead air. Gives player health a recovery source
without the comeback mechanic §6 explicitly refused.

**Cost in new rules.** One.

**Risk.** Positive feedback — winning big heals, which makes winning big easier. Sirlin's guidance is
to blend a _limited_ slippery slope with tuned catch-up rather than remove either, so a cap is
likely wanted. The cap is a tuning value and it is the developer's.

### Fight length is symmetric about the middle, and bimodal — 3–4 Hunts, or 21–27

**Annotation, 2026-08-11 (DLR-64) — health is now decided, this entry is not rewritten.** This entry
illustrates at `P = H = 1,620` and says outright that 1,620 is _"not a proposed value."_ Health has
since been **decided at 1,350** (`hybrid-design.md` §9). Rescaled at that number: the fast band (4–9
tricks) stays **3–4 Hunts** — which is exactly why 1,350 was chosen, over a smaller bar, in the same
band as the 1,620 illustrated here — and the tail _shortens_ from 21–27 to **18–23**, up to 299
tricks rather than 351. The derived cap range below, `4 to 10` at 1,620, becomes **3 to 5** at 1,350.
Every structural finding below survives unchanged, including Finding 4 — the slowest line is still
10 tricks, not 13. Annotated rather than rewritten, so the parked finding stays findable and no
superseded count below reads as current: **21–27 Hunts and the 4–10 cap range are the 1,620
figures; 18–23 Hunts and the 3–5 cap range are current, at the decided 1,350.**

**What it is.** Not a proposal. An arithmetic finding about the direction agreed 2026-08-11, recorded
here because it is the thing that decides whether the Hunt cap is needed, and nothing else in this file
carries it. Raised 2026-08-11, parked deliberately — _"we can resolve this later."_

**Computed against.** Card value = printed rank (mean rank 6, so a trick's two cards are worth ~12);
both sides on the player's declared path; piles swapping both ways on the Lose path. The two mirrored
multiplier tables from that session — Win: `0–3 ×1, 4 ×2, 5 ×3, 6 ×4, 7–9 ×5, 10–13 ×0.5`, and Lose as
its exact complement. _Those values are quoted for checkability only. They are owned by
`hybrid-design.md` once DLR-64 lands, and everything below must be rechecked if they move._ Health is
illustrated at `P = H = 1,620` — three perfect Hunts' worth, chosen to make the arithmetic legible and
**not** a proposed value.

**The table. Both bars tracked, not just the Quarry's** — which is the mistake that produced a wrong
answer first time round, because a fight where the Quarry needs six Hunts to die can still end on Hunt
four with the player dead.

| Player's tricks | Deals | Takes | Quarry's bar empties | Player's bar empties | Outcome       |
| --------------- | ----- | ----- | -------------------- | -------------------- | ------------- |
| 0               | 0     | 78    | never                | Hunt 21              | Lose, Hunt 21 |
| 1               | 12    | 72    | Hunt 135             | Hunt 23              | Lose, Hunt 23 |
| 2               | 24    | 66    | Hunt 68              | Hunt 25              | Lose, Hunt 25 |
| 3               | 36    | 60    | Hunt 45              | Hunt 27              | Lose, Hunt 27 |
| 4               | 96    | 540   | Hunt 17              | Hunt 3               | Lose, Hunt 3  |
| 5               | 180   | 480   | Hunt 9               | Hunt 4               | Lose, Hunt 4  |
| 6               | 288   | 420   | Hunt 6               | Hunt 4               | Lose, Hunt 4  |
| 7               | 420   | 288   | Hunt 4               | Hunt 6               | Win, Hunt 4   |
| 8               | 480   | 180   | Hunt 4               | Hunt 9               | Win, Hunt 4   |
| 9               | 540   | 96    | Hunt 3               | Hunt 17              | Win, Hunt 3   |
| 10              | 60    | 36    | Hunt 27              | Hunt 45              | Win, Hunt 27  |
| 11              | 66    | 24    | Hunt 25              | Hunt 68              | Win, Hunt 25  |
| 12              | 72    | 12    | Hunt 23              | Hunt 135             | Win, Hunt 23  |
| 13              | 78    | 0     | Hunt 21              | never                | Win, Hunt 21  |

**Finding 1 — length depends only on distance from the middle; the winner depends only on which side.**
The outcome column is perfectly antisymmetric: `k` and `13 − k` produce the same number of Hunts with
the winner flipped. 6 tricks is a loss on Hunt 4 and 7 tricks is a win on Hunt 4. 3 tricks is a loss on
Hunt 27 and 10 tricks is a win on Hunt 27. So **the trick count sets the clock and the side sets the
result**, which is a much cleaner property than it looks like from the multiplier tables alone.

**Finding 2 — the outcomes are bimodal with nothing in between.** Everything in the 4–9 band resolves
in **3 or 4 Hunts** — roughly 5 to 7 minutes at 13 tricks a Hunt. Everything outside it takes **21 to
27 Hunts**, up to 351 tricks, half an hour or more. There is no 8-Hunt fight. Session length is
therefore not a dial anyone tunes; it is a step function of whether the player lands inside 4–9.

**Finding 3 — the top end cannot be lost, and the bottom end cannot be won.** At 13 tricks the player
takes literally zero (the Quarry holds no cards, so it has nothing to be paid for) and at 12 it takes
12 a Hunt — 276 across the whole fight, 17% of the bar. That is an unloseable 21–23 Hunt grind. Its
mirror at 0–1 tricks is an unwinnable one of the same length.

**Finding 4 — the slowest line is 10 tricks, not 13.** Deals 60 a Hunt against 13's 78, so it runs 27
Hunts. The worst case for session length sits one step past the peak, not at the extreme.

**Calibration, so this is not overstated.** The unloseable grind is **not** a dominant strategy and
should not be written up as one. Landing 10+ tricks means the Quarry lands 0–3, which takes the cards
rather than the intent — and a player able to dominate tricks that hard would reach 9 more profitably.
A realistic player aiming at 9 and mixing in 8s and 10s deals about 405 a Hunt, wins on Hunt 4, and
finishes with three-quarters of the bar. So the finding is about an **unbounded tail**, not a common
case.

**Cost in new rules.** Zero if the tail is acceptable. One — the Hunt cap — if it is not. And the cap's
value is derivable rather than chosen: above `H / 540` (the fast lane's length) and well below `H / 78`
(the slow lane's), biased toward the low end if the player should have to press. At `H = 1,620` that is
roughly 4 to 10.

**What would prove it wrong, and what to measure.** How often a player actually lands outside 4–9. If
overshoot past 9 is rare, no cap is needed and this entry stays parked. If it is common — or if players
discover the grind and choose it — the cap is required and the range above sizes it. The first fight
against the Monarch produces this measurement for free: record the final trick count of every Hunt and
plot the distribution.

### The declaration as a free option

**What it is.** The player declares Win or Lose after seeing their own hand, and that single
declaration fixes which card-value scheme and which multiplier table both sides read for the whole
Hunt (`hybrid-design.md`, the direction). Raised 2026-08-11, the session's largest finding.

**Problem it is, not one it solves.** Card strength is an asset on the Win path and a liability on
the Lose path — high cards and trump length help Win, low cards and short suits help Lose — and the
player picks which regime applies with the hand already visible, while the Quarry cannot choose at
all (it always follows the player's own declaration). Worked: a player holding a weak hand declares
Lose, lands on 5 tricks, deals 480, takes 180 — **+300 for holding the worse hand.** A read taken
for free, with no opponent able to answer in kind, is Sid Meier's dominant-option shape (his test
for an uninteresting decision — is there an option that is always correct, never risky) landing on
the newest mechanic in the design.

**What keeps it from being unconditionally free.** Most hands are middling — not obviously good at
either regime — so the read is only worth what the hand actually supports, and that is most hands
most of the time. The roster is already a partial counterweight at zero new rules: the Monarch
forces trick wins (anti-Lose) and the Swan forces trick losses (anti-Win), so two of five characters
already punish one declaration each. Three do not.

**Two mitigations, neither taken.** Declaring before the decree is turned (see Raw, above) cuts read
quality at zero rules but is a discarded branch in the design itself. Sorting the roster so every
character punishes a declaration stays open and costs nothing arithmetically.

**Cost in new rules.** Zero — the finding is about the declaration already built (DLR-63), not a new
mechanic.

**What would prove it wrong.** The measurement `hybrid-design.md` §11 already collects for its own
kill criterion: whether a playtester who declares and watches both pending bars move still reports
the declaration as a coin flip they were not equipped to make, across a small sample rather than
one round.

### The character roster as declaration counterweight

**What it is.** Of the five Quarry characters, exactly two currently punish a declaration: the
Monarch forces the player's Swan or highest card of a led suit, which forces trick wins — an
anti-Lose tool. The Swan forces the lowest card when void, so the player cannot trump in — an
anti-Win tool. Raised 2026-08-11, alongside the free-option finding above, which it partially
answers.

**Problem it solves, partially.** It is the cheapest available counterweight to the free-option
problem above, at zero new rules — the two characters already exist and already do this. What it
does not solve: the Woodcutter, the Fox and the Witch punish neither declaration, so three-fifths of
the roster offers no resistance to a correct read.

**Cost in new rules.** Zero if left as-is. Zero to extend, too, if the extension is a sorting
question ("which existing rule-break reads as anti-Win or anti-Lose") rather than a new rule per
character — that is the open lever `hybrid-design.md` §6 names and does not take.

**What would prove it wrong.** Whether the Woodcutter, the Fox and the Witch's existing round-long
rule-breaks can be read as punishing one declaration at all, or whether the honest answer is
"neither" for all three — in which case the roster is not actually a counterweight for three-fifths
of encounters, and closing that gap needs a genuinely new rule rather than a relabelling of an old
one.

**Superseded on its Monarch claim, 2026-08-12.** The "Monarch forces trick wins — an anti-Lose tool"
reading above is measured wrong by the entry below. The rest of this entry stands; the Swan is
untested.

### Measured: the declaration is a live 50/50 read, and the Monarch tilts it the wrong way

**What it is.** A simulation of the declaration decision run against the built engine rather than on
paper, 2026-08-12. Not an idea — a measurement of two things `hybrid-design.md` §6 and §11 currently
argue about without numbers: whether the declaration is a genuine read, and which way the Monarch
pushes it.

**Method, so the numbers can be re-derived or disbelieved.** The real modules were driven directly —
`dealRound` (so the deck, the shuffle, the 13/13/7 split and the decree-as-trump are the shipped
ones), `playCard`, `legalMoves` and `resolveTrick`, which means the Witch's odd-card trump, the
Swan's lead-steal, the Fox's mid-Hunt decree swap, the Woodcutter's draw and the Monarch's follow
constraint are all live rather than modelled. 2,500 deals. For each deal, every player trick-count
target 0–13 was swept under both declarations with the Quarry best-responding across its own
targets, and the player's worst case against that response was taken — so these are conservative
numbers, not best-case ones. Damage was computed under **this document's pile-swap rule**, not
`src/warCouncil/spoils.ts`, which still ships the retired three-credit mechanic and the retired
Treasure/Poison ±1 (see the drift note below).

**Finding 1 — the declaration is not a free option in the way the entry above fears.** Under base
rules Win is the better call on **50.6%** of deals and Lose on **49.4%**. Committing to one and
never reading is worth almost exactly nothing: always-Win averages **+6** net damage a Hunt and
always-Lose **−4**. Reading correctly averages **+145**; reading wrongly **−142**. The decision
therefore carries a ~**287** swing per Hunt and has no dominant side — which is the property §6's
free-option entry doubts, measured and found intact.

**Finding 2 — the bands are reachable.** On the best line a Hunt lands 4–6 tricks 37% of the time
and 7–9 tricks 39%, so **76% of hands reach one of the two paying bands**. The dead tails are 11%
(0–3) and 13% (10–13). The "most hands are middling and can steer to neither band" worry in the
entry above is real but much smaller than it reads.

**Finding 3 — the best simple decision rule is hand sum against 78, and it is only 73% accurate.**
Sum the thirteen printed ranks; over 78 call Win, under 78 call Lose. 78 is exactly the deck's
average 13-card hand, which is why it is the threshold. Nothing beat it usefully — counts of 9+
cards, counts of 10+ cards and trump length all scored worse alone, and the best combination found
(`sum ÷ 6 + (cards 9+) + trump length`) reached only 75%, which is not worth the arithmetic. **Trump
length alone is nearly worthless at 59%**, barely above a coin flip: it predicts how many tricks you
take, not which band you land in, and only the band is paid. The 73% rule captures roughly **half**
the value a perfect read would capture (+78 a Hunt against +145), so there is real skill headroom
above the heuristic.

**Finding 4 — the Monarch is an anti-Win tool, not the anti-Lose tool the entry above claims.** With
`QuarryCharacter.Monarch` active, the player's average trick count on the best line **falls** from
6.9 to 6.4, the 10–13 band collapses from 13% of deals to **5%**, Lose becomes the better call on
**58%** of deals rather than 49%, and always-Win drops from +6 to **−45**. The mechanism is visible
in `quarryRuleBreak.ts`: the constraint fires when the **Quarry leads**, forcing the player's Swan or
highest card of a suit the Quarry has already committed to — so it burns the player's winners into
tricks the Quarry chose and usually still takes. It strips trick-winning material without handing
over tricks. Consequences: the roster entry above is wrong on its Monarch half; §6's claim that "two
of five characters already punish one declaration each" needs re-checking, because on this
measurement the Monarch and the Swan may punish the **same** declaration; and §11's slice runs its
declaration test on a board already tilted toward Lose rather than a neutral one.

**Finding 5 — an exact identity worth keeping, because it decides what the read is about.** At a
fixed final trick count `k`, the difference between the two declarations is
`24 × [(13−k)·Win(13−k) − k·Win(k)]` — **card values cancel out of it entirely**. Verified against
§8's fourteen-row table at average values. Two consequences. The declaration is a bet on trick count
alone, never on card strength: §6's worked "+300 for holding the worse hand" is +300 for _landing on
5 tricks_, and a strong hand landing on 5 collects the same. And the two value schemes cancel
_because_ `r` and `12 − r` sum to a constant — so if card values are ever wanted as an input to the
declaration itself, the two schemes have to stop being exact complements, which is the same
complementarity §1 calls load-bearing for the same-path rule. Those two wants are in direct
conflict, and nothing currently records that.

**Cost in new rules.** Zero. Every number above measures what is already built.

**What would prove it wrong.** Both sides play a target-seeking heuristic, not solved cards, so the
point values move under stronger play; the structural results (the ~50/50 split, the 76% band
reachability, the Monarch's direction) should not. The cheapest disproof is re-running the same sweep
with a materially better policy on both sides — if the split stays near 50/50 and the Monarch still
lowers the trick count, the findings hold. Findings 1–4 are policy-dependent; **Finding 5 is
algebraic and holds regardless.**

**Drift noticed while doing this, recorded so it is not re-discovered.** `src/warCouncil/spoils.ts`
still applies the Treasure `+1` and Poison `−1` that §1 and §9 record as Decided-removed
(2026-08-11), and still reads `declaration.creditedCards` for the Lose path — the three-credit
mechanic §1 says the pile-swap "replaces outright". The shipped code therefore scores a different
game from the one this document describes. Not fixed here; this is a parking-lot note, not a ticket.

### Worked declaration examples — real deals, for the tutorial and the declaration screen

**What it is.** Nine deals pulled straight out of `dealRound` during the simulation above, three
each for "Win is clearly right", "Lose is clearly right" and "genuine coin flip", kept because a
tutorial cannot teach the declaration from a rule and a UI cannot decide what to surface without
knowing which features actually carry the read. These are observed hands, not illustrative ones
anybody composed. Trump is marked `*`. **Aim** is the trick count the player plays for; **land** is
where the Quarry's best counter actually puts them — the two differ, and the gap is itself a
finding.

**Win is clearly right.**

```
Win +421 / Lose −450    Bells 11 9 8 7 1   |  Keys* 9 8 7 3      |  Moons 9 5 4 1
                        sum 82 · six cards 8+ · 4 trump · aim 4, land 9

Win +455 / Lose −407    Bells 11 9 6 5 4   |  Keys* 11 10 5 3 1  |  Moons 10 9 3
                        sum 87 · six cards 8+ · 5 trump · aim 8, land 9

Win +349 / Lose −455    Bells* 10 9 7 6 5  |  Keys 8 7 5 1       |  Moons 10 8 6 4
                        sum 86 · five cards 8+ · 5 trump · aim 9, land 9
```

**Lose is clearly right.**

```
Lose +353 / Win −479    Bells 11 10 8 6 4  |  Keys* 7 5 4 1      |  Moons 8 6 3 2
                        sum 75 · four cards 8+ · 4 trump, best a 7 · aim 4, land 4

Lose +433 / Win −343    Bells 11 9 7 4 3 2 |  Keys 8 7 3 1       |  Moons* 8 4 2
                        sum 69 · four cards 8+ · 3 trump · aim 3, land 4

Lose +475 / Win −255    Bells 9 5 4 3 1    |  Keys* 8 2          |  Moons 10 9 8 7 5 1
                        sum 72 · five cards 8+ · 2 trump · aim 4, land 4
```

**Genuine coin flip.**

```
Win −174 / Lose −176    Bells* 10 9 5 3 2  |  Keys 8 3           |  Moons 11 10 7 5 4 3
                        sum 80 · five cards 8+ · 5 trump

Win +281 / Lose +275    Bells 11 10 9 2 1  |  Keys 10 6 5 2      |  Moons* 11 10 2 1
                        sum 80 · six cards 8+ · 4 trump

Win +214 / Lose +221    Bells* 10 6 5 3    |  Keys 9 8 1         |  Moons 9 7 6 4 3 2
                        sum 73 · four cards 8+ · 4 trump
```

**Finding A — the reading order is trump, then sum, then high cards, and that is not the order a
player will guess.** Compare Lose-example 3 (five cards of 8+, Lose right by 730) against
Win-example 3 (five cards of 8+, Win right by 804). The high-card counts are identical; the trump
lengths are 2 and 5. **High cards in a non-trump suit are decoration** — they raise what a pile is
worth but cannot take a trick against a ruff, and only the trick count picks the band. Lose-example
3's power is `Moons 10 9 8 7` with trump in Keys, and it gets trumped all round. Lose-example 1 is
the same trap dressed differently: `Bells 11 10 8` over a trump holding whose best card is a 7.

**Finding B — the trap hand is the one that looks obviously right.** A big-card, no-trump hand is a
Lose hand wearing a Win hand's clothes, and it is the most expensive misread available: the three
Lose-clear examples cost −255 to −479 a Hunt if called Win. Whatever the tutorial teaches, it has to
teach this hand specifically, because the naive read on it is confidently wrong rather than
uncertain.

**Finding C — trick counts are sticky in both directions, which is what makes the declaration a
commitment rather than a plan.** Win-example 1 aims for 4 tricks and lands 9; Lose-example 2's Win
line aims for 0 and lands 5. A strong hand cannot stop winning and a weak one cannot stop losing, so
the declaration is better taught as _"read where this hand is going to end up"_ than as _"choose
what you are going to do"_. That is a different tutorial sentence from the one §1's vocabulary
implies.

**Finding D — the coin-flip hands cluster at sum ~80, just over the 78 break-even, and they are the
common case.** All three sit at 73–80 with respectable high-card counts and adequate trump; they
land on 6 or 7 tricks depending on how the Quarry plays. This band is ~41% of deals. A tutorial that
only shows the two clear cases teaches a read the player will then fail to apply to the hand they
are actually dealt most often.

**What this is for, stated so it is not mistaken for a design proposal.** Three consumers. The
**tutorial** needs a hand sequence — the honest order is Win-clear, Lose-clear, then the big-card
no-trump trap, then a coin flip presented _as_ a coin flip rather than as a puzzle with an answer.
The **declaration screen** needs to know that trump length and hand sum are the two features worth
surfacing and that a raw high-card count is actively misleading on its own (§11's slice can test
whether surfacing either is wanted, or whether the read should stay unaided). The **band-position
CPU** (§9's in-scope deliverable) needs the same features to decide when to dump a trick.

**Cost in new rules.** Zero — worked examples of built behaviour.

**What would prove it wrong.** The same policy caveat as the entry above: both sides play a
target-seeking heuristic, so the exact point values move under stronger play. Findings A and C are
structural and should survive; Finding D's ~41% figure is the one most likely to shift. Re-deriving
these needs the harness rebuilt — it was deliberately not left in `src/`, since it asserts nothing
and would cost every `npm test` run ~30s.

### Tekken-style health bar placement — both bars top of screen, mirrored

**What it is.** A placement proposal, and only that: the player's and the Quarry's health bars sit at
the top of the screen as a mirrored opposed pair, in the fighting-game arrangement, rather than as two
independent readouts placed wherever the layout has room. Raised 2026-08-12. The bars themselves and
the pending-damage overlay on them are already decided (`hybrid-design.md`'s direction section, §6) —
**this proposes no rule and changes no number.**

**Three consequences of the arrangement, which is why it is worth an entry rather than nothing.**

- **It hands the prime slot to the slowest-moving number.** Health changes once per Hunt, at trick 13
  — **3–4 times in a whole fast-band encounter.** Pending damage changes every trick, **39–52 times.**
  Tekken's top-of-screen bar moves on every hit; whatever occupies that position here should be the
  thing that actually moves, which is pending, not health.
- **Two bars adjacent carry the fight's rate; the net bar §6 offers as a fallback does not.** §6's
  cheap fallback if four moving figures read as noise is to show only the net — one bar, one
  direction. Combined depletion across both bars is `708` per Hunt at the 6/7 boundary against
  `78–96` at the extremes, the same 7.4×–9.1× spread §5 cites as its stall diagnostic. Side by side
  that is visible: both bars dropping fast is a fight, both creeping is a stall. A net bar shows
  position only. So the fallback is a real loss, not a neutral simplification.
- **`P = H` is what makes the mirror readable.** Equal-length opposed bars turn "who is ahead" into a
  length comparison rather than a subtraction. §5 already asks a future tuning pass to preserve the
  equality for the 6/7 boundary's sake; this is a second reason.

**One borrowable detail.** Pending damage is the fighting-game **recoverable "grey" segment** — damage
recorded but not yet permanent, drawn by lightness on the same bar rather than as a second widget, and
allowed to *shrink*. That last part matters here, since a tenth trick collapses pending from `540` to
`60`, and a shrinking bar segment is established grammar rather than something to invent
([SFV HUD](https://wiki.supercombo.gg/w/Street_Fighter_V/HUD) ·
[Tekken 8 recoverable health](https://steamcommunity.com/app/1778820/discussions/0/597412189643889679/)).

**Cost in new rules.** Zero. The real cost is **vertical space in a no-scroll shell**, priced against
the hand, the trick well, and the always-visible band table `balatro-play-notes.md` §3.1 asks for.
That trade and the layout itself are `game-ux`'s and the developer's, not this entry's.

**What would prove it wrong.** Whether a playtester can say who is ahead without being told, and can
tell a fast Hunt from a stalling one, from the bars alone. If they manage the first but not the
second, the mirrored pair bought nothing over §6's net-bar fallback and the fallback is free to take.

### A fight timer that pays out — and the arithmetic of what it can read off

**What it is.** A clock on the encounter; time left over when the Quarry dies converts to money.
Raised 2026-08-12, alongside the entry above.

**Both halves collide with something, and neither collision is fatal — but they are different
collisions.** The *timer* half is not new: §9's cap `R` is already exactly this, deferred, with a
derivable range of **3 to 5** Hunts. The *money* half was rejected — but rejected **as power**
(more health, higher card damage: see Rejected, below, and `hybrid-design.md` §3), and two live rows
already park the noun: §9's overkill row says surplus damage _"may later pay out as cash or
similar,"_ and `balatro-play-notes.md` note 12 records Balatro's `$1` per unused hand with the want
_"efficiency paid for"_ marked open. So the idea's genuine content is narrower and better than "add
money": **attach a graded payout to a cap that already exists, and pick what the payout reads off.**
That last question is the whole entry, and it has a computed answer.

**Finding 1 — the timer is aimed at precisely what round timers were invented for.** The arcade
origin was cabinet throughput, but the reason the clock deserved to survive onto consoles is that a
time limit stops a player who is ahead from declining to fight
([Round Timer](https://streetfighter.fandom.com/wiki/Round_Timer) ·
[why fighting games have timers](https://www.tumblr.com/askagamedev/683427677337747456/why-some-fighting-games-have-a-timer-in-select)).
§5 describes the design's own version in almost those words — the top end is _"unloseable"_ and _"an
unbounded tail a patient opponent can wait out."_ The developer's instinct here is pointed at the
right problem.

**Finding 2 — the cap as written kills a player who is winning, and the fighting-game rule fixes it
free.** On time over, a fighting-game round goes to **whoever has more health**; it resolves the
round on the evidence already on the bars rather than voiding it. The cap does the opposite — reach
it and the run ends. Worked, at the low end of §9's range (`R = 4`) on the `k = 13` line: after four
Hunts the player has dealt 312 and taken **zero**, so the Quarry sits at 1,038 and the player at
1,350. **The player is ahead by 312 and the cap ends their run as a loss.** `k = 12` at the same cap
is ahead 1,302 to 1,062 and loses identically. Changing the cap's resolution from _run ends_ to
_higher bar wins_ costs zero new rules, ends the session just as fast, and stops the guard firing on
the wrong side of the result.

**Finding 3 — a timer measured in Hunts has a resolution of two.** A Hunt is always 13 tricks and
cannot end early, so any clock in game-time inherits the bimodality §5 and §9 both record. Every
winning line on the Win path, at average card values, `H = P = 1,350`:

| Player `k` | Deals | Takes | Hunts to win | Player health left |
| ---------- | ----- | ----- | ------------ | ------------------ |
| 7          | 420   | 288   | 4            | **198**            |
| 8          | 480   | 180   | 3            | 810                |
| 9          | 540   | 96    | 3            | **1,062**          |
| 10         | 60    | 36    | 23           | 522                |
| 11         | 66    | 24    | 21           | 846                |
| 12         | 72    | 12    | 19           | 1,122              |
| 13         | 78    | 0     | 18           | **1,350**          |

The Hunt counts reproduce §9's decided figures exactly (fast band 3–4; tail 18–23, slowest at
`k = 10`). Inside the fast band the count takes **two values, 3 or 4**. A payout on Hunts remaining
against a cap of 4 therefore pays one of two amounts. It is a pass/fail wearing a curve's clothes.

**Finding 4 — health remaining has full resolution and the wrong sign: the grind pays best.** Ranked
by the last column above: `k = 13` (1,350) beats `k = 12` (1,122) beats `k = 9` (1,062). The two
top-paying lines in the game are the **18- and 19-Hunt grinds**, and a legitimate 4-Hunt win at
`k = 7` pays 198 — **6.8× less than the grind.** Paying out on health alone is Soren Johnson's
optimise-the-fun-out landing on the exact tail §5 already calls unbounded.

**Finding 5 — the two halves fix each other, which is why the developer proposed the time term and
why it is load-bearing.** `health remaining ÷ Hunts taken`:

| `k`   | 9       | 8   | 13 | 12   | 7    | 11   | 10   |
| ----- | ------- | --- | -- | ---- | ---- | ---- | ---- |
| Index | **354** | 270 | 75 | 59.1 | 49.5 | 40.3 | 22.7 |

The design's intended peak is now top, at **4.7× the best grind**. Time supplies the sign, health
supplies the resolution, and neither works alone. **The cheaper route to the same place: if the cap
ships at all, no tail line ever finishes, so every 18–23 Hunt grind pays zero by construction and
health-remaining is safe on its own** — one rule instead of two, and it is the cap §9 has already
deferred rather than anything new. Which of the two, and the curve's shape, are the developer's.

**Finding 6 — overkill is `H mod D`, so §9's parked basis is noise dressed as a reward.** The row
that already exists suggests surplus damage might pay out as cash. Overkill is
`D − (1,350 mod D)` — an alignment artifact of how the last Hunt happens to land, not a measure of
anything: `k = 7` overkills by **330** and `k = 9` by **270**, so it pays the *worst* win in the fast
band **1.2×** the best one, while the grinds pay 18–54. The sign against the grind is right; the
ordering inside the band is close to arbitrary. If overkill is the basis, that should be a stated
choice rather than a surprise.

**Finding 7 — whether this money is a toll booth is decided by the basis, not by argument.** §2's
test is whether the player can diverge between _playing well_ and _advancing the system that
matters_. Under `health ÷ Hunts` they cannot: the money-maximising line is `k = 9`, which is also the
damage-maximising line. Under health alone they can, and the divergent line is the grind. So §2's
objection lands or does not land depending purely on Findings 4 and 5 — the same question, answered
arithmetically instead of by appeal to the earlier rejection.

**The sink is the harder half, and only one candidate survives §1.** Money must never touch
`card value × Standing`; §1's component table forbids a third channel, and health and card damage are
the rejected power branch by name. What passes: **Snare charges** — §3 already certifies the in-round
edit as an intervention on card value, so money buying charges is a *pricing layer over an existing
verb*, not a new term. It is also a fourth candidate answer to §3's blocking problem (the in-round
edit needs a cost, and money makes that cost *earned by prior performance* rather than traded against
Forage). The stated catch is §3's own: _"if it is bought, that decision is reopened"_ — the no-shop
position. Buying extra Forage edits is the weaker candidate, because §9's test for the budget of 4 is
whether an edit is ever left unspent, and selling a fifth before that is measured is premature.

**One ambiguity this exposes, recorded rather than resolved.** §5 states `k = 7` _"wins the encounter
on Hunt 4 with 486 of 1,350 left."_ 486 is health *entering* Hunt 4 (`1,350 − 3 × 288`); after Hunt
4's simultaneous application it is **198**. Both are defensible phrasings of the same line, but a
payout reading off "health remaining" pays **2.5× more** under one than the other, so the idea forces
the reading to be pinned. Not fixed here — §5 and §9 own that number.

**Cost in new rules.** One, if the cap is adopted anyway and this only changes its resolution rule and
attaches a payout. Two, if the cap is not taken and the time term has to exist for Finding 5. Plus a
sink, which is where the real rules budget goes.

**What would prove it wrong.** §11's slice already records the final trick count of every Hunt; two
more free numbers settle this — **Hunts to resolve** and **health remaining at resolution**, per
encounter. If the fast band's health-remaining spread is narrow in real deals rather than the 198 to
1,062 the average-value table gives, the payout has no resolution either and collapses to a flat
bonus, which §3 rejects on its own terms. That measurement also decides Finding 2's cap question for
free, since it is the same data the slice collects to size the cap.

**All figures above are at the undoubled multiplier table.** §9's open rounding row notes that
doubling every entry removes the ×0.5 half-point problem and reads health as 2,700; ratios and
orderings here are preserved under that change, absolute numbers are not.

---

## Promoted

### Health replaces the Demand — became `hybrid-design.md` §5 and the opening section, 2026-08-11

One line on what changed in the trip: the mechanism is adopted whole — a health bar depleted by
`card value × Standing` rather than a score checked against a threshold — but every number below is
superseded. The **108 and 36 figures**, the `ceil(H / damage per Hunt)` illustration's specific
counts, and the cap-range guess in this entry's own "fix" paragraph are all void; `hybrid-design.md`
§9 and `ideas.md`'s _Fight length_ entry above carry the current figures (540/765 ceiling, 3–4 vs.
18–23 Hunts, cap range 3–5). The `ceil(H / damage per Hunt)` **argument itself** — that session
length is performance-dependent and losing can take longer than winning — survives unchanged; only
its numbers moved.

**What it is.** The Quarry has a health bar. `Spoils × Standing` is damage dealt to it rather than a
score checked against a threshold. An encounter runs until the bar is empty.

**Problem it solves.** Two, both documented. §7's _"a run has no defeated opponent"_ — the Quarry
currently has no score, no health and no failure state, so clearing the final Demand wins the run
while nothing is beaten. And §12's smaller finding that surplus Spoils past the Demand is dead air:
against health, every point carries.

**Not a toll booth, and the reason is worth keeping.** §2 bans a _conversion_ — trick outcomes
becoming a number fed to a different system with its own play (the _Duet_ failure). Health is an
accumulator, not a system. It is the Demand with memory: same number, same source, checked
cumulatively rather than once.

**Cost in new rules.** One changed rule, no new currency. But the 108 ceiling (§3) is now damage per
_Hunt_, and the figure that matters is damage per _encounter_ — every number keyed to 108,
especially §5's Demand crossing point, needs restating in the new unit.

**The consequence that needs deciding with it — session length becomes performance-dependent.** An
encounter now lasts `ceil(H / damage per Hunt)` Hunts. At flat card values a Victorious round pays
108 and a Humble round pays 36 (§3), so the _same_ health bar is a 3-Hunt encounter for a strong
build and a 9-Hunt one for a weak build — 195 tricks against 585 across five encounters. **Losing
takes longer than winning**, which inverts Rosewater's inertia check and lengthens §12's Problem 2
(a run dead in substance several encounters before it is over on screen) even as health usefully
makes that death _visible_. `design-principles.md` §7's Culdcept entry is the warning: length is the
first symptom, and the disease is neither layer being allowed to be the point.

The fix that keeps both properties, at one rule: **cap the encounter at a fixed number of Hunts.**
Kill the Quarry inside the cap or the run ends. Accumulation survives (a round scoring 80 against
100 contributes 80 instead of nothing) and so does the clock. The Demand is not removed — it becomes
_deal H damage within R Hunts_. Both numbers are the developer's.

**What would prove it wrong.** Whether the player can still tell a good round from a bad one without
a per-round pass/fail. If every round reads as "some damage happened," the threshold was carrying
more feedback than it looked like. Separately: record Hunts-per-encounter for a strong build and a
deliberately weak one — if the weak build's run is materially longer in wall-clock time, the cap is
needed before health is called settled.

### The Quarry deals damage too — became `hybrid-design.md`'s opening section and §8, 2026-08-11

One line on what changed in the trip: the argument is validated rather than corrected. The "exactly
one side scores ×6" evidence becomes §8's rebuilt fourteen-row table under the two mirrored tables —
graded rather than binary, but the same restored tug this entry predicted.

**What it is.** Both sides score at the end of the 13 tricks and both apply damage — the player's
`Spoils × Standing` to the Quarry's health, the Quarry's to the player's. Raised 2026-08-11.

**Problem it solves.** §12's **Problem 1**, the design's own top-ranked issue, and it solves it at the
root rather than mitigating it. That problem's evidence is that _"the 'exactly one side scores ×6'
tension is a property of the symmetric contest, and it is gone once the Quarry doesn't score."_
Enumerating all fourteen splits of 13 tricks against the printed bands confirms exactly one side
lands in `{0–3, 7–9}` in every split, without exception. Restoring the Quarry's stake restores the
tug. This is a larger fix than the health bar itself.

**Cost in new rules.** Zero new vocabulary — it runs §1's existing equation on the other side of the
table. It does require the Quarry's Standing band to be tracked and shown, which the base game
already makes public (§4's visibility table: trick counts public, card faces hidden).

**What would prove it wrong.** Whether the player actually plays _against_ the Quarry's band rather
than just maximising their own. If the Quarry's number is never the reason a trick is contested, the
symmetry is decorative.

**Implementation consequence, flagged early.** This only pays off if the CPU plays for **band
position**, not for tricks. A CPU that simply tries to win tricks walks itself into Greedy and deals
zero. §11's slice is scoped to test whether a CPU opponent stays interesting; a CPU that knows when
to _dump_ a trick is a materially harder opponent to build than the one that slice assumed.

### Pending damage, shown on the health bar — became `hybrid-design.md`'s opening section, §6 and §11, 2026-08-11

One line on what changed in the trip: the mechanism and both of its payoffs (legible bands without a
table; a free comeback route because nothing is decided before trick 13) are adopted unchanged. The
worked band-crossing table below (216 → 48, 216 → 504, 648 → 0) is illustrative of the _old_ single
table and needs recomputing against the two mirrored tables if a worked illustration is wanted again
— not done here, since `hybrid-design.md` §1 and §6 already state the new tables directly.

**What it is.** Damage accumulates visibly through the Hunt as a transparent-red "potential damage"
chunk on each health bar, and both sides' damage is applied once, at the end of the 13 tricks.
Raised 2026-08-11.

**End-of-round is forced, not chosen.** Standing is read off the _final_ trick count, so the
multiplier is unknown until trick 13. Per-trick application would apply an undetermined number.

**What it buys 1 — the bands become legible without a table.** If the pending figure shows Spoils
_with the multiplier applied_, it lurches at every band crossing (Win path, avg rank 6):

| Trick count | Pending | On crossing                          |
| ----------- | ------- | ------------------------------------ |
| 3           | 216     | → 4 tricks: **48** (collapses to ×1) |
| 6           | 216     | → 7 tricks: **504** (jumps to ×6)    |
| 9           | 648     | → 10 tricks: **0** (Greedy ×0)       |

`balatro-play-notes.md` §3.1 argues the whole Standing band table needs to be permanently visible,
because _"the decision The Hunt asks every trick is which band to land in"_ and the curve is bimodal
so the player cannot infer it. A bar that craters on the fourth trick teaches that better than a
table does. Note 15's _"rising numbers are the payoff… the arithmetic performed rather than
reported"_ is the second half of the same win.

**What it buys 2 — a real comeback mechanic, at zero rule cost.** Because nothing is applied until
trick 13, **no round is decided until the last trick.** A Quarry sitting on 9 tricks with lethal
pending damage can be pushed to a 10th, collapsing its entire pending bar to zero. The endgame
objective becomes _"force them to take one more"_ — the player deliberately dumping tricks. §6 calls
catch-up _"the design's weakest claim"_ and rejected both branches it considered; this is a third
one, and it is free.

**Cost in new rules.** Zero. It is a presentation of a number the equation already produces.

**What to watch.** Four figures move every trick — both pending totals and both health bars. Whether
that reads as tension or as noise is a feel question and the developer's. Cheap fallback if it is
too busy: show only the **net**, one bar, one direction.

### Four characters and a boss — became `hybrid-design.md` §5 and §7, 2026-08-11

One line on what changed in the trip: nothing — unaffected by the two-table change, since it is
about roster shape and scheduling rather than the damage arithmetic.

**What it is.** A run is four Quarry encounters plus a boss with a Balatro-style cheat tool.

**What it solves for free.** Five encounters is exactly §4's roster, and it is the no-repeat length —
which closes §12's Problem 3 (past five, some character must repeat, and no section says how) by
construction. Fixing the boss and shuffling the other four gives **24 distinct run sequences**; also
drawing the boss gives **120**. §7's _"every run shows the same five characters"_ gap costs nothing
to close.

**The part that does not work as stated.** "A boss with a cheat tool" is redundant — §4 and §5 give
_every_ Quarry a round-long rule-break, so breaking a rule is the sixth instance of a thing that has
already happened five times.

**The available answer, at zero new vocabulary.** §5 lists five inputs the base game exposes —
follow-suit, decree and trump, hand size, the odd-rank abilities, and **which cards are in the deck
at all** — then works four examples covering four of the five. Deck contents is attacked by nothing.
The player's engine _is_ the Foraged deck (16 edits, roughly half of 33 cards, per §9), so a boss
that attacks it is the one escalation testing what the run actually built.

**Risk.** A deck attack can read as theft rather than a test. Balatro's debuffs survive because the
engine has redundancy; 33 cards with 16 edits may not.

### Poison as the declared Lose path's damage source — became `hybrid-design.md` §1's declaration subsection, 2026-08-11 — arithmetic superseded

One line on what changed in the trip: the **mechanism** — pay the player for the cards the Quarry
captures, at inverted value — is adopted outright and generalised (the pile-swap now runs both ways,
not just player-favouring). The **arithmetic below is void**: the 918 / 936 / 378 / 216 table and its
"the two paths become competitive" conclusion were computed against a fixed Demand of 220, where the
question was a total crossing a target; under two-sided damage the question is a net, and none of
these four numbers is a net. `hybrid-design.md` §1 replaces them with the enumeration keyed to the
two mirrored tables.

**Correction, 2026-08-11.** This entry originally read "lose path" as _how the player dies_ and
analysed poison as an incoming tax on player health. That was a misreading. The Lose path is the
**declared** path in `the-hunt.md` §3 — already built, already playable — and the proposal is that
cards the **Quarry** captures are poisoned and damage it. The entry below the next heading is kept
for the health-side analysis it contains; this section is the corrected reading.

**What it is.** On the declared Lose path, the cards you successfully dump onto the Quarry damage it,
at inverted value (`12 − r`). Replaces the Lose-credit mechanic rather than sitting alongside it.

**The problem it solves, quantified.** `the-hunt.md` lists _"whether declaring Lose dominates
declaring Win"_ as an open question. It resolves the other way, and not narrowly. The Lose path
scores off **6 cards** (3 credits × 2) against the Win path's **18** at `k=9`:

| Path                                                | Spoils | × Standing | Score   |
| --------------------------------------------------- | ------ | ---------- | ------- |
| Win, `k=9`, best 18 cards (Σrank 153)               | 153    | ×6         | **918** |
| Win, `k=9`, typical (avg rank 6)                    | 108    | ×6         | **648** |
| Lose, best 3 credits (three 1s → 11, three 2s → 10) | 63     | ×6         | **378** |
| Lose, typical 3 credits (avg inverted 6)            | 36     | ×6         | **216** |

Against the built Demand of **220**, a typical Lose round _misses_ and a typical Win round clears by
3×. The credit cap is what does it, and no play skill closes a 3:1 card-count gap.

**What poison changes.** At `k=0` the Quarry captures all 26 dealt cards. Σrank over 26 ≈ 156, so
Σ(12−r) = `26×12 − 156` = **156** — identical, because the inversion is its own mirror at mean rank 6. `156 × 6` = **936**, alongside the Win path's 918 ceiling. The two paths become competitive.

**Cost in new rules — negative.** It _removes_ the credit cap and its four guards (one credit per
trick, only the just-resolved trick, a won trick credits nothing, no credits left credits nothing).
Simpler than what ships today.

**The brake, and whether it is enough.** Losing all 13 tricks deliberately is hard — follow-suit
forces wins. Realistically a Lose player lands at `k=2–3`: at `k=3` the Quarry takes 20 cards,
inverted ≈ 120, `× 6` = **720**, still strong. At `k=4` Standing drops to ×1 and the same play yields
**108**. So the Lose path inherits the Win path's cliff structure — pick a lane, commit, don't slip.

**What would prove it wrong.** How often a player _trying_ to lose is forced to win a trick. If the
forced-win rate pushes `k` into 4–6 regularly, the Lose path is theoretically competitive and
practically a trap. This is the measurement that decides the idea.

### Finding 3 of the net-damage enumeration — became `hybrid-design.md` §6's one-failure-mode finding, 2026-08-11

Promoted separately from its parent entry (_The full net-damage enumeration_, Superseded in place,
above), because this one finding survives the table it was computed from. One line on what changed
in the trip: "there is finally an endgame" — the observation that trick 13 must not play identically
to trick 1, and that a player near a band edge should be able to dodge or force one more trick —
is exactly what pending damage (visible mid-Hunt) and §6's disaster/slow-leak framing deliver under
the new tables. The specific 816-point cliff and the self-correcting "high cards get spent early"
argument were computed against the old single table and are not carried forward; the finding's
shape is what was promoted, not its numbers.

<!-- ### <title> — became `hybrid-design.md` §N, <date>. One line on what changed in the trip. -->

---

## Rejected

### Money, a shop, and permanent cross-run upgrades — rejected 2026-08-11 (DLR-64) → `hybrid-design.md` §3's discarded branch, §7's banked-progress item

**Note on the trip.** Moved here from Raw, where it sat un-costed pending exactly this decision. The
reasons below are unchanged by the direction — none of them depended on the old single-table model.
One piece of it is worth flagging rather than silently dropping: its **"Planets, not Jokers"**
variant, permanently levelling a Standing band for a run, is **now closer to reachable** than it was
when this entry was written, because the multipliers are designed rather than transcribed and a
level-up is just another way of arriving at a number this design already owns choosing. It still
breaks §1's _Standing cannot be built_ invariant and moves the ceiling by a chosen amount rather than
a derived one — recorded as a candidate in `hybrid-design.md` §3, not adopted there either.

Random per-run upgrades plus permanent ones — more health, higher card damage — bought with money
earned in the run. Raised 2026-08-11.

Held at Raw rather than costed, because it collides with two stated invariants and the collision has
to be decided before the idea can be specified:

- §2 discards _by name_ the branch "each trick won becomes N resource, spent in the outer loop,"
  because it reproduces the _Duet_ toll booth. Money earned from encounter performance is that
  branch with a different noun.
- §1's component table: _"Any device that would add a third scoring channel — a resource, a bonus, or
  a track running alongside Spoils and Standing — is a design defect."_
- `+N per card` is specifically the additive-only build §3 engineers the Demand curve to kill at a
  predictable encounter. Selling it is selling the losing line as an upgrade.
- §7 on cross-run power: _"carrying power across runs dissolves the lesson §3 exists to teach."_ Both
  named examples — health and damage — are power, not options.

**The want behind it is real and should not be lost with the mechanism.** §7's sharpest
self-criticism is that this design runs **one** progression system against Balatro's four (Jokers,
Tarots, Planets, Vouchers), and Forage is Tarots alone — Balatro's _supporting_ system. Asking for a
second progression layer is a correct read of the design's thinnest spot. The constraint is only on
which layer.

Two unspent shapes, neither chosen:

- **Planets, not Jokers.** Planets permanently level a _category of play_, not a number. The
  analogue here is levelling a **Standing band** for the rest of a run — which would make §6's
  dominated Humble lane a genuine build choice and blunt §12's Problem 1 in the same stroke. Cost,
  stated plainly: it breaks §1's invariant that _Standing cannot be built_, and it moves the 108
  ceiling.
- **Unlock options, not power.** §7 already names Balatro's middle path — beating content adds
  Jokers and decks _to the pool_, so runs gain variety rather than a head start. A new Quarry or a
  new kind of Forage edit is the equivalent and costs nothing arithmetically. Hades' model is the
  other one worth weighing: banked progress is real, and difficulty is a separate dial the player
  opts into, so the test stays re-armable.

**Cheapest test, and it needs no shop.** Run one session with a fixed `+N per card` applied from the
start and check whether an additive-only build still dies at a predictable encounter. If it
survives, the upgrade has eaten the lesson.

### The combo bonus — rejected 2026-08-11, because the pending-damage bar already delivers what it was for

**Pointer, 2026-08-11 (DLR-64).** Gains a pointer to `hybrid-design.md` §1's discarded branch, where
the same rejection is now recorded in the live design document rather than only here. Its **×18 →
×30 break-even arithmetic below is void** — it was computed against the single ×6-family table this
design no longer uses — but the rejection itself does not rest on that number, and the entry's other
two costs (adds no decision; forces a recomputation of a value the developer owns) are unaffected.

**What it was.** Each trick captured is a "combo"; every card in the captured pile gains +1 per
combo, so with `k` tricks captured `Spoils = Σranks + 2k²`. Confirmed as a plain count of tricks won
— not a pattern in the two cards. Stated intent: _"a way to reward them for winning more and more."_

**Why it was dropped.** It is the only proposal in this round that fixes no documented problem — its
job was feel, specifically the _"rising numbers are the payoff"_ note from `balatro-play-notes.md`
note 15. **Pending damage on the health bar does that job better and for free**: the pending figure
lurches at every band crossing (216 → 48 on a fourth trick, 648 → 0 on a tenth), which is a larger
and more legible beat than a smoothly climbing bonus. Once pending damage is in, the combo bonus is
paying real costs for something already delivered.

**What it would have cost.**

- **Humble's break-even moves ×18 → ×30.** `k=3` yields 54 Spoils against `k=9`'s 270, so
  `54 × M = 1620 → M = 30`. The band ratio worsens from 3:1 to 5:1. §9 marks the Standing multipliers
  Undecided, so this is a recomputation of a value the developer owns — but the bonus makes it
  mandatory rather than optional.
- **The ceiling moves from 648 to ~1,620** (1,890 best case). Every figure keyed to it needs
  restating.
- **It adds no decision.** `2k²` depends on trick count alone — not on which cards, not on capture
  order — so it escalates the numbers without escalating the choices.

**One correction, recorded because the number was cited in conversation.** The boundary swing under
the combo bonus was stated as a **13.7× amplification**. That compared the combo figure (1,864)
against the _flat-card-value_ design (136), conflating two separate changes. Measured against the
rules actually built — card value = printed rank — the honest figure is **816 → 1,864, i.e. 2.3×**.
The swing-to-typical-round ratio is **2.8× either way**: the bonus scaled both numbers together and
did not make the game relatively swingier. The rejection does not rest on this number, and the three
costs above are unaffected.

**What would bring it back.** If the game plays flat — if landing a good round produces no felt
escalation once pending damage is on screen — this is the lever, and the gentler triangular variant
(`Σranks + k(k+1)`) is the version to try first.

### The pattern reading of "combo" — not rejected, parked

Distinct from the above and never proposed by the developer: a combo meaning **the two cards in the
trick form a pattern** (same suit, a pair, consecutive ranks). Unlike the count version this _would_
add a decision — "do I want to win this trick _with this card_" — and it is the poker-hand shape the
parent genre is built on. Raised, confirmed not to be what was meant, and kept here because it
remains the answer if the game ever needs a second trick-level decision.
