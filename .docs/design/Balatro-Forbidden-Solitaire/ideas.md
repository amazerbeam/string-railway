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

| Status | Means | What it owes |
|---|---|---|
| **Raw** | Written down, not yet examined | Nothing. A title and a sentence. |
| **Worth costing** | Someone thinks this might be real | Which problem it solves, what it costs in *new rules*, and what would prove it wrong |
| **Promoted** / **Rejected** | Resolved | The `hybrid-design.md` section it became, or the reason it died |

Ideas that arrive with their own context do not need this file — a thought that comes out of a play
session belongs in that session's notes, where the context is. See `balatro-play-notes.md` §2.4 for
one that was handled that way. This file is for the free-floating ones.

---

## Raw

### Money, a shop, and permanent cross-run upgrades

Random per-run upgrades plus permanent ones — more health, higher card damage — bought with money
earned in the run. Raised 2026-08-11.

Held at Raw rather than costed, because it collides with two stated invariants and the collision has
to be decided before the idea can be specified:

- §2 discards *by name* the branch "each trick won becomes N resource, spent in the outer loop,"
  because it reproduces the *Duet* toll booth. Money earned from encounter performance is that
  branch with a different noun.
- §1's component table: *"Any device that would add a third scoring channel — a resource, a bonus, or
  a track running alongside Spoils and Standing — is a design defect."*
- `+N per card` is specifically the additive-only build §3 engineers the Demand curve to kill at a
  predictable encounter. Selling it is selling the losing line as an upgrade.
- §7 on cross-run power: *"carrying power across runs dissolves the lesson §3 exists to teach."* Both
  named examples — health and damage — are power, not options.

**The want behind it is real and should not be lost with the mechanism.** §7's sharpest
self-criticism is that this design runs **one** progression system against Balatro's four (Jokers,
Tarots, Planets, Vouchers), and Forage is Tarots alone — Balatro's *supporting* system. Asking for a
second progression layer is a correct read of the design's thinnest spot. The constraint is only on
which layer.

Two unspent shapes, neither chosen:

- **Planets, not Jokers.** Planets permanently level a *category of play*, not a number. The
  analogue here is levelling a **Standing band** for the rest of a run — which would make §6's
  dominated Humble lane a genuine build choice and blunt §12's Problem 1 in the same stroke. Cost,
  stated plainly: it breaks §1's invariant that *Standing cannot be built*, and it moves the 108
  ceiling.
- **Unlock options, not power.** §7 already names Balatro's middle path — beating content adds
  Jokers and decks *to the pool*, so runs gain variety rather than a head start. A new Quarry or a
  new kind of Forage edit is the equivalent and costs nothing arithmetically. Hades' model is the
  other one worth weighing: banked progress is real, and difficulty is a separate dial the player
  opts into, so the test stays re-armable.

**Cheapest test, and it needs no shop.** Run one session with a fixed `+N per card` applied from the
start and check whether an additive-only build still dies at a predictable encounter. If it
survives, the upgrade has eaten the lesson.

---

## Worth costing

All five below arrived together on 2026-08-11 as one proposal: the Quarry gets health, cards are
damage, poison is the lose path, four characters plus a boss with a cheat tool, and roguelike
upgrades bought with money. They are recorded separately because they cost different things and
three of them can be taken without the other two. **Nothing here is decided.**

### Health replaces the Demand

**What it is.** The Quarry has a health bar. `Spoils × Standing` is damage dealt to it rather than a
score checked against a threshold. An encounter runs until the bar is empty.

**Problem it solves.** Two, both documented. §7's *"a run has no defeated opponent"* — the Quarry
currently has no score, no health and no failure state, so clearing the final Demand wins the run
while nothing is beaten. And §12's smaller finding that surplus Spoils past the Demand is dead air:
against health, every point carries.

**Not a toll booth, and the reason is worth keeping.** §2 bans a *conversion* — trick outcomes
becoming a number fed to a different system with its own play (the *Duet* failure). Health is an
accumulator, not a system. It is the Demand with memory: same number, same source, checked
cumulatively rather than once.

**Cost in new rules.** One changed rule, no new currency. But the 108 ceiling (§3) is now damage per
*Hunt*, and the figure that matters is damage per *encounter* — every number keyed to 108,
especially §5's Demand crossing point, needs restating in the new unit.

**The consequence that needs deciding with it — session length becomes performance-dependent.** An
encounter now lasts `ceil(H / damage per Hunt)` Hunts. At flat card values a Victorious round pays
108 and a Humble round pays 36 (§3), so the *same* health bar is a 3-Hunt encounter for a strong
build and a 9-Hunt one for a weak build — 195 tricks against 585 across five encounters. **Losing
takes longer than winning**, which inverts Rosewater's inertia check and lengthens §12's Problem 2
(a run dead in substance several encounters before it is over on screen) even as health usefully
makes that death *visible*. `design-principles.md` §7's Culdcept entry is the warning: length is the
first symptom, and the disease is neither layer being allowed to be the point.

The fix that keeps both properties, at one rule: **cap the encounter at a fixed number of Hunts.**
Kill the Quarry inside the cap or the run ends. Accumulation survives (a round scoring 80 against
100 contributes 80 instead of nothing) and so does the clock. The Demand is not removed — it becomes
*deal H damage within R Hunts*. Both numbers are the developer's.

**What would prove it wrong.** Whether the player can still tell a good round from a bad one without
a per-round pass/fail. If every round reads as "some damage happened," the threshold was carrying
more feedback than it looked like. Separately: record Hunts-per-encounter for a strong build and a
deliberately weak one — if the weak build's run is materially longer in wall-clock time, the cap is
needed before health is called settled.

### Poison as the declared Lose path's damage source

**Correction, 2026-08-11.** This entry originally read "lose path" as *how the player dies* and
analysed poison as an incoming tax on player health. That was a misreading. The Lose path is the
**declared** path in `the-hunt.md` §3 — already built, already playable — and the proposal is that
cards the **Quarry** captures are poisoned and damage it. The entry below the next heading is kept
for the health-side analysis it contains; this section is the corrected reading.

**What it is.** On the declared Lose path, the cards you successfully dump onto the Quarry damage it,
at inverted value (`12 − r`). Replaces the Lose-credit mechanic rather than sitting alongside it.

**The problem it solves, quantified.** `the-hunt.md` lists *"whether declaring Lose dominates
declaring Win"* as an open question. It resolves the other way, and not narrowly. The Lose path
scores off **6 cards** (3 credits × 2) against the Win path's **18** at `k=9`:

| Path | Spoils | × Standing | Score |
|---|---|---|---|
| Win, `k=9`, best 18 cards (Σrank 153) | 153 | ×6 | **918** |
| Win, `k=9`, typical (avg rank 6) | 108 | ×6 | **648** |
| Lose, best 3 credits (three 1s → 11, three 2s → 10) | 63 | ×6 | **378** |
| Lose, typical 3 credits (avg inverted 6) | 36 | ×6 | **216** |

Against the built Demand of **220**, a typical Lose round *misses* and a typical Win round clears by
3×. The credit cap is what does it, and no play skill closes a 3:1 card-count gap.

**What poison changes.** At `k=0` the Quarry captures all 26 dealt cards. Σrank over 26 ≈ 156, so
Σ(12−r) = `26×12 − 156` = **156** — identical, because the inversion is its own mirror at mean rank
6. `156 × 6` = **936**, alongside the Win path's 918 ceiling. The two paths become competitive.

**Cost in new rules — negative.** It *removes* the credit cap and its four guards (one credit per
trick, only the just-resolved trick, a won trick credits nothing, no credits left credits nothing).
Simpler than what ships today.

**The brake, and whether it is enough.** Losing all 13 tricks deliberately is hard — follow-suit
forces wins. Realistically a Lose player lands at `k=2–3`: at `k=3` the Quarry takes 20 cards,
inverted ≈ 120, `× 6` = **720**, still strong. At `k=4` Standing drops to ×1 and the same play yields
**108**. So the Lose path inherits the Win path's cliff structure — pick a lane, commit, don't slip.

**What would prove it wrong.** How often a player *trying* to lose is forced to win a trick. If the
forced-win rate pushes `k` into 4–6 regularly, the Lose path is theoretically competitive and
practically a trap. This is the measurement that decides the idea.

### Superseded reading — poison as incoming damage on player health

**What it is.** The player has health too. Poisoned cards damage whoever wins the trick containing
them, so the Quarry's attack lands on the cards rather than on the player's stats.

**Problem it solves.** This is Forbidden Solitaire's enemy design, which `design-principles.md` §8
holds up as the standard and this design has never implemented — enemies there *"curse, poison and
infest tableau cards."* The Quarry currently attacks only the **rules** (§4/§5's round-long
rule-breaks). Nothing attacks the **cards**. It also rescues §9's open negative-card-values row,
which worries that *"the Poison 8s alone (3 of 33) are too thin to carry it"* — under a health bar a
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

### Four characters and a boss

**What it is.** A run is four Quarry encounters plus a boss with a Balatro-style cheat tool.

**What it solves for free.** Five encounters is exactly §4's roster, and it is the no-repeat length —
which closes §12's Problem 3 (past five, some character must repeat, and no section says how) by
construction. Fixing the boss and shuffling the other four gives **24 distinct run sequences**; also
drawing the boss gives **120**. §7's *"every run shows the same five characters"* gap costs nothing
to close.

**The part that does not work as stated.** "A boss with a cheat tool" is redundant — §4 and §5 give
*every* Quarry a round-long rule-break, so breaking a rule is the sixth instance of a thing that has
already happened five times.

**The available answer, at zero new vocabulary.** §5 lists five inputs the base game exposes —
follow-suit, decree and trump, hand size, the odd-rank abilities, and **which cards are in the deck
at all** — then works four examples covering four of the five. Deck contents is attacked by nothing.
The player's engine *is* the Foraged deck (16 edits, roughly half of 33 cards, per §9), so a boss
that attacks it is the one escalation testing what the run actually built.

**Risk.** A deck attack can read as theft rather than a test. Balatro's debuffs survive because the
engine has redundancy; 33 cards with 16 edits may not.

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

### The Quarry deals damage too

**What it is.** Both sides score at the end of the 13 tricks and both apply damage — the player's
`Spoils × Standing` to the Quarry's health, the Quarry's to the player's. Raised 2026-08-11.

**Problem it solves.** §12's **Problem 1**, the design's own top-ranked issue, and it solves it at the
root rather than mitigating it. That problem's evidence is that *"the 'exactly one side scores ×6'
tension is a property of the symmetric contest, and it is gone once the Quarry doesn't score."*
Enumerating all fourteen splits of 13 tricks against the printed bands confirms exactly one side
lands in `{0–3, 7–9}` in every split, without exception. Restoring the Quarry's stake restores the
tug. This is a larger fix than the health bar itself.

**Cost in new rules.** Zero new vocabulary — it runs §1's existing equation on the other side of the
table. It does require the Quarry's Standing band to be tracked and shown, which the base game
already makes public (§4's visibility table: trick counts public, card faces hidden).

**What would prove it wrong.** Whether the player actually plays *against* the Quarry's band rather
than just maximising their own. If the Quarry's number is never the reason a trick is contested, the
symmetry is decorative.

**Implementation consequence, flagged early.** This only pays off if the CPU plays for **band
position**, not for tricks. A CPU that simply tries to win tricks walks itself into Greedy and deals
zero. §11's slice is scoped to test whether a CPU opponent stays interesting; a CPU that knows when
to *dump* a trick is a materially harder opponent to build than the one that slice assumed.

### The full net-damage enumeration, with two-sided damage

All fourteen splits of 13 tricks, at the **built** rules — card value = printed rank, average rank 6,
no combo bonus (dropped 2026-08-11; see Rejected). Both sides score `Spoils × Standing` off their own
capture pile and trick count. This table is the evidence behind the three findings under it.

| Player `k` | Quarry `k` | Player deals | Quarry deals | Net |
|---|---|---|---|---|
| 0 | 13 | 0 | 0 | 0 |
| 1 | 12 | 72 | 0 | +72 |
| 2 | 11 | 144 | 0 | +144 |
| 3 | 10 | 216 | 0 | **+216** |
| 4 | 9 | 48 | 648 | **−600** |
| 5 | 8 | 120 | 576 | −456 |
| 6 | 7 | 216 | 504 | −288 |
| 7 | 6 | 504 | 216 | +288 |
| 8 | 5 | 576 | 120 | +456 |
| 9 | 4 | 648 | 48 | **+600** |
| 10 | 3 | 0 | 216 | −216 |
| 11 | 2 | 0 | 144 | −144 |
| 12 | 1 | 0 | 72 | −72 |
| 13 | 0 | 0 | 0 | 0 |

**Finding 1 — the Humble lane is rescued, by health rather than by score.** At `k ≤ 3` the Quarry is
in Greedy and deals **zero**; it is the only region of the table where the player takes no damage.
Against a Quarry with health `H`, the Victorious route needs `H/648` rounds and costs `H/13.5` of the
player's health, while the Humble route needs `H/216` rounds — 3× slower — and costs nothing. §6
calls catch-up *"the design's weakest claim"* and proves at length that Humble is dominated and that
Forage does not rescue it; it is rescued here by a lever §6 never considered, because health adds a
second axis and Humble is the zero-damage band. **This needs health and Quarry damage together** —
neither alone produces it.

Consequence: the round cap (see the health entry) becomes the dial that prices the two lanes against
each other. Cap short and Humble cannot finish; cap long and Humble is free. That makes it a far
more interesting number than it looked like as a pacing fix.

**Finding 2 — the valley becomes near-lethal.** `k = 4, 5, 6` read −600, −456, −288. Under the
current design the valley is merely a low score. §5's Quarry rule-breaks exist specifically to
displace the player's trick count, and §12 already names the coupling: strengthening Quarry pressure
*"increases how often a build gets pushed toward Defeated or Greedy it didn't choose, raising the
variance."* That sentence was written when the consequence was a low score. **Quarry pressure and
player health must now be tuned as one number, not two.**

**Finding 3 — there is finally an endgame.** At `k=9` with tricks remaining, the player must dodge
every one or fall off an **816-point** cliff (+600 → −216), while the Quarry — now holding a stake —
wants to force tricks on them by leading low. Currently trick 13 plays identically to trick 1. A
self-correcting property helps: winning tricks spends high cards, so a player at `k=9` is naturally
holding the low cards that make dodging possible, and the Quarry has to work for it.

**The ratio worth remembering:** the boundary swing (816) is **2.8×** a typical round's differential
(±288 at the 6/7 split). That ratio is invariant to the combo bonus — the bonus scaled both numbers
by the same factor. See the Rejected entry for the correction that surfaced this.

### Pending damage, shown on the health bar, applied at end of round

**What it is.** Damage accumulates visibly through the Hunt as a transparent-red "potential damage"
chunk on each health bar, and both sides' damage is applied once, at the end of the 13 tricks.
Raised 2026-08-11.

**End-of-round is forced, not chosen.** Standing is read off the *final* trick count, so the
multiplier is unknown until trick 13. Per-trick application would apply an undetermined number.

**What it buys 1 — the bands become legible without a table.** If the pending figure shows Spoils
*with the multiplier applied*, it lurches at every band crossing (Win path, avg rank 6):

| Trick count | Pending | On crossing |
|---|---|---|
| 3 | 216 | → 4 tricks: **48** (collapses to ×1) |
| 6 | 216 | → 7 tricks: **504** (jumps to ×6) |
| 9 | 648 | → 10 tricks: **0** (Greedy ×0) |

`balatro-play-notes.md` §3.1 argues the whole Standing band table needs to be permanently visible,
because *"the decision The Hunt asks every trick is which band to land in"* and the curve is bimodal
so the player cannot infer it. A bar that craters on the fourth trick teaches that better than a
table does. Note 15's *"rising numbers are the payoff… the arithmetic performed rather than
reported"* is the second half of the same win.

**What it buys 2 — a real comeback mechanic, at zero rule cost.** Because nothing is applied until
trick 13, **no round is decided until the last trick.** A Quarry sitting on 9 tricks with lethal
pending damage can be pushed to a 10th, collapsing its entire pending bar to zero. The endgame
objective becomes *"force them to take one more"* — the player deliberately dumping tricks. §6 calls
catch-up *"the design's weakest claim"* and rejected both branches it considered; this is a third
one, and it is free.

**Cost in new rules.** Zero. It is a presentation of a number the equation already produces.

**What to watch.** Four figures move every trick — both pending totals and both health bars. Whether
that reads as tension or as noise is a feel question and the developer's. Cheap fallback if it is
too busy: show only the **net**, one bar, one direction.

### Overkill heals

**What it is.** Damage past the Quarry's remaining health becomes healing for the player.

**Problem it solves.** §12's *"no stated consequence for clearing the Demand with surplus Spoils"* —
the moment a Hunt is arithmetically safe stops being dead air. Gives player health a recovery source
without the comeback mechanic §6 explicitly refused.

**Cost in new rules.** One.

**Risk.** Positive feedback — winning big heals, which makes winning big easier. Sirlin's guidance is
to blend a *limited* slippery slope with tuned catch-up rather than remove either, so a cap is
likely wanted. The cap is a tuning value and it is the developer's.

---

## Promoted

*(nothing yet)*

<!-- ### <title> — became `hybrid-design.md` §N, <date>. One line on what changed in the trip. -->

---

## Rejected

### The combo bonus — rejected 2026-08-11, because the pending-damage bar already delivers what it was for

**What it was.** Each trick captured is a "combo"; every card in the captured pile gains +1 per
combo, so with `k` tricks captured `Spoils = Σranks + 2k²`. Confirmed as a plain count of tricks won
— not a pattern in the two cards. Stated intent: *"a way to reward them for winning more and more."*

**Why it was dropped.** It is the only proposal in this round that fixes no documented problem — its
job was feel, specifically the *"rising numbers are the payoff"* note from `balatro-play-notes.md`
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
against the *flat-card-value* design (136), conflating two separate changes. Measured against the
rules actually built — card value = printed rank — the honest figure is **816 → 1,864, i.e. 2.3×**.
The swing-to-typical-round ratio is **2.8× either way**: the bonus scaled both numbers together and
did not make the game relatively swingier. The rejection does not rest on this number, and the three
costs above are unaffected.

**What would bring it back.** If the game plays flat — if landing a good round produces no felt
escalation once pending damage is on screen — this is the lever, and the gentler triangular variant
(`Σranks + k(k+1)`) is the version to try first.

### The pattern reading of "combo" — not rejected, parked

Distinct from the above and never proposed by the developer: a combo meaning **the two cards in the
trick form a pattern** (same suit, a pair, consecutive ranks). Unlike the count version this *would*
add a decision — "do I want to win this trick *with this card*" — and it is the poker-hand shape the
parent genre is built on. Raised, confirmed not to be what was meant, and kept here because it
remains the answer if the game ever needs a second trick-level decision.
