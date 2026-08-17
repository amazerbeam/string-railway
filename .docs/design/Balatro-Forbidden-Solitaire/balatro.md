# Balatro — rules reference and design reading

Researched 2026-08-09. Two parts: **Part 1** is what the game actually does (numbers, verifiable,
citable). **Part 2** is what those rules *produce* — the structural reading, with the arithmetic
shown.

**Scope and ownership.** `.docs/design/design-principles.md` §8 already owns Balatro's
*transferable lessons* (growth class, escalation-by-rule-break, the hidden-preview problem, familiar
substrate as a rules subsidy) and its Forbidden Solitaire notes. This file does not restate them —
it holds the rules those lessons rest on, and adds the findings §8 does not carry: the round
arithmetic, the interest economy's trade-off, the boss-blind enumeration, and the catch-up problem
that a linear-narrative hybrid inherits without inheriting Balatro's answer to it.

Nothing here is a decision about what this project builds. Part 3 lays out what transfers and what
the open questions are; the choices in it are the developer's.

**The presentation layer is a separate file.** [`balatro-play-notes.md`](./balatro-play-notes.md)
holds a developer play session's observations about how Balatro *presents* itself — its spoken
onboarding, its reference panels, its round-end report, and the one place it loses the player — and
maps each onto The Hunt. This file does not cover that layer.

---

## Part 1 — the rules

### 1.1 The core equation

```
Score = Chips × Mult
```

That is the whole game. Every Joker, Tarot, Planet, Spectral card, enhancement, edition and seal is
an intervention on one of those two numbers. The player's job each round is to make one number
big enough.

### 1.2 The round

| Element | Default |
|---|---|
| Deck | Standard 52-card French deck |
| Hand size (cards held) | 8 |
| Hands per round | 4 |
| Discards per round | 3 |
| Cards played per hand | up to 5 |
| Cards discarded per discard | up to 5 |
| Joker slots | 5 |
| Consumable slots | 2 |

A round is a **Blind**: a score target. Select up to 5 cards from your 8, play them, they are scored
against the target, you draw back to 8. Beat the target within your 4 hands and you win the round;
run out of hands and the run ends. Discards let you throw cards back and redraw — they are the
deck-search resource, not a scoring resource.

Card chip values: number cards score their face value, face cards score 10, Aces score 11.

### 1.3 Poker hands — base values and level scaling

Only cards that *participate* in the named hand are scored (a Pair inside a five-card play scores
two cards, not five) unless a Joker such as Splash overrides it.

| Hand | Base Chips | Base Mult | Chips / level | Mult / level | Cards scored |
|---|---|---|---|---|---|
| High Card | 5 | 1 | +10 | +1 | 1 |
| Pair | 10 | 2 | +15 | +1 | 2 |
| Two Pair | 20 | 2 | +20 | +1 | 4 |
| Three of a Kind | 30 | 3 | +20 | +2 | 3 |
| Straight | 30 | 4 | +30 | +3 | 5 |
| Flush | 35 | 4 | +15 | +2 | 5 |
| Full House | 40 | 4 | +25 | +2 | 5 |
| Four of a Kind | 60 | 7 | +30 | +3 | 4 |
| Straight Flush | 100 | 8 | +40 | +4 | 5 |
| Royal Flush | 100 | 8 | +40 | +4 | 5 |
| **Five of a Kind** | 120 | 12 | +35 | +3 | 5 |
| **Flush House** | 140 | 14 | +40 | +4 | 5 |
| **Flush Five** | 160 | 16 | +50 | +3 | 5 |

The three bold hands are *secret* — impossible in a standard deck, reachable only once the deck has
been edited (duplicated ranks, Wild cards). They are not tutorialised; discovering them is content.

Hand levels are raised by **Planet cards**, one Planet per hand type, each granting that hand's
per-level increment permanently for the run.

### 1.4 Scoring order

The order is not cosmetic — it is a decision surface.

1. **"On played" Jokers** fire first, before any scoring (e.g. scaling counters incrementing).
2. **Played cards score left to right.** Per card: base chips, then enhancement, then seal, then
   edition.
3. **Held-in-hand abilities** trigger left to right (Steel cards, Gold cards, Baron-type Jokers).
4. **Jokers evaluate left to right**, each modifying the running Chips/Mult.

Because step 4 runs in physical left-to-right order, `×Mult` Jokers placed before `+Mult` Jokers
score strictly less than the reverse. **Joker order is a free, always-available, zero-cost decision
with a large consequence** — see §2.5.

### 1.5 Antes and Blinds

A run is 8 **Antes**. Each Ante is three Blinds: Small, Big, Boss.

| Ante | Base (White Stake) | Small (1×) | Big (1.5×) | Boss (2×) |
|---|---|---|---|---|
| 1 | 300 | 300 | 450 | 600 |
| 2 | 800 | 800 | 1,200 | 1,600 |
| 3 | 2,000 | 2,000 | 3,000 | 4,000 |
| 4 | 5,000 | 5,000 | 7,500 | 10,000 |
| 5 | 11,000 | 11,000 | 16,500 | 22,000 |
| 6 | 20,000 | 20,000 | 30,000 | 40,000 |
| 7 | 35,000 | 35,000 | 52,500 | 70,000 |
| 8 | 50,000 | 50,000 | 75,000 | 100,000 |

Beating Ante 8's Boss (a **Showdown Blind**, 6× on some) wins the run. **Endless Mode** continues
from Ante 9 with the requirement growing on a compounding exponential; by Ante 13 the numbers need
scientific notation.

Note the shape: the base requirement is roughly **×2 per Ante** for the first four Antes and then
slightly under, ending at a **333× climb** from the first target (300) to the last (100,000).

**Skipping.** Small and Big Blinds may be skipped for a **Tag**. Boss Blinds may never be skipped.
Skipping forfeits that round's money, interest, and shop.

### 1.6 Boss Blinds — the rule-breakers

A Boss Blind raises the target *and* breaks a rule for that round.

| Boss | Min Ante | Target | Effect |
|---|---|---|---|
| The Hook | 1 | 2× | Discards 2 random held cards after every played hand |
| The Club | 1 | 2× | All Club cards debuffed |
| The Goad | 1 | 2× | All Spade cards debuffed |
| The Window | 1 | 2× | All Diamond cards debuffed |
| The Head | 1 | 2× | All Heart cards debuffed |
| The Psychic | 1 | 2× | Must play exactly 5 cards |
| The Manacle | 1 | 2× | −1 hand size |
| The Pillar | 1 | 2× | Cards already played this Ante are debuffed |
| The House | 2 | 2× | First hand drawn face down |
| The Wall | 2 | **4×** | Oversized target |
| The Wheel | 2 | 2× | 1 in 7 cards drawn face down |
| The Arm | 2 | 2× | Permanently −1 level to the poker hand played |
| The Fish | 2 | 2× | Cards drawn face down after each hand played |
| The Water | 2 | 2× | Start with 0 discards |
| The Mouth | 2 | 2× | Only one hand type may be played all round |
| The Needle | 2 | **1×** | Play only 1 hand |
| The Flint | 2 | 2× | Base Chips *and* Mult halved for the round |
| The Mark | 2 | 2× | All face cards drawn face down |
| The Eye | 3 | 2× | No repeated hand types this round |
| The Tooth | 3 | 2× | Lose $1 per card played |
| The Plant | 4 | 2× | All face cards debuffed |
| The Serpent | 5 | 2× | After any play or discard, always draw exactly 3 |
| The Ox | 6 | 2× | Playing your most-played hand sets money to $0 |

Showdown Blinds (Ante 8 and every 8th thereafter): Amber Acorn, Verdant Leaf, Violet Vessel (6×),
Crimson Heart, Cerulean Bell.

### 1.7 The economy

| Source | Amount |
|---|---|
| Small Blind | $3 |
| Big Blind | $4 |
| Boss Blind | $5 |
| Showdown Blind | $8 |
| Unused hand at round end | $1 each |
| **Interest** | **$1 per $5 held, capped at $5/round** (i.e. cap reached at $25) |

Money cannot go below $0 (the Credit Card Joker permits up to $20 of debt). Jokers and consumables
can be sold back.

**Shop** (opens after each won Blind): 2 card slots (Joker 71.4% / Tarot 14.3% / Planet 14.3%),
2 booster-pack slots, 1 Voucher slot at $10. Reroll starts at $5 and rises $1 per reroll, resetting
each shop. Vouchers persist for the run (Overstock adds a shop slot; Reroll Surplus drops rerolls to
$3; Seed Money raises the interest cap to $10; etc.), and the voucher pool restocks after each Boss.

**Booster packs**: Arcana (Tarot), Celestial (Planet), Standard (playing cards), Buffoon (Jokers),
Spectral. All are $4 / $6 / $8 for Normal / Jumbo / Mega. Normal and Jumbo let you take 1; Mega lets
you take 2. Arcana/Celestial/Standard show 3/5/5 cards; Buffoon/Spectral show 2/4/4.

### 1.8 Jokers

150 Jokers. Rarity and shop weight: **Common 70%** (61 Jokers), **Uncommon 25%** (64),
**Rare 5%** (20), **Legendary** (5) obtainable only from The Soul spectral card.

Effect families: `+Chips` · `+Mult` · `×Mult` · mixed · effect (hand size, card creation) ·
retrigger · economy. Representative:

- **Joker** — +4 Mult, unconditional. The floor.
- **Jolly Joker** — +8 Mult if the hand contains a Pair.
- **Zany Joker** — +12 Mult if the hand contains a Three of a Kind.
- **Blue Joker** — +2 Chips per card remaining in the deck.
- **Abstract Joker** — +3 Mult per Joker held.
- **Photograph** — ×2 Mult on the first scored face card.
- **Cavendish** — ×3 Mult, 1-in-1000 chance to self-destruct each round.
- **Constellation** — gains ×0.1 Mult per Planet card used.
- **Campfire** — gains ×0.25 Mult per card sold; resets after each Boss Blind.
- **Golden Joker** — $4 at end of round.
- **DNA** — if the first hand of a round is a single card, permanently copy it into the deck.
- **Riff-Raff** — creates 2 Common Jokers when a Blind is selected.

**Stickers** (higher Stakes only): Eternal (cannot be sold or destroyed), Perishable (debuffed after
5 rounds), Rental (costs $3 per round).

### 1.9 Card modifiers

**Enhancements** (one per card):

| Enhancement | Effect |
|---|---|
| Bonus | +30 Chips when scored |
| Mult | +4 Mult when scored |
| Wild | Counts as every suit simultaneously |
| Glass | ×2 Mult when scored; 1-in-4 to be destroyed afterwards |
| Steel | ×1.5 Mult while *held in hand* |
| Stone | +50 Chips, no rank or suit, always scores |
| Gold | $3 if held in hand at end of round |
| Lucky | 1-in-5 for +20 Mult, 1-in-15 for $20, rolled independently |

**Editions**: Foil (+50 Chips, +$2), Holographic (+10 Mult, +$3), Polychrome (×1.5 Mult, +$5),
Negative (+1 Joker or Consumable slot; Jokers/consumables only). Permanent once applied.

**Seals** (one per card): Gold (+$3 when played and scoring), Red (retrigger this card once), Blue
(creates the Planet card for the round's final hand, if held), Purple (creates a Tarot when
discarded).

### 1.10 Consumables

Held in 2 slots by default.

- **Planet** (12): permanently level a hand type. Pluto/High Card, Mercury/Pair, Uranus/Two Pair,
  Venus/Three of a Kind, Saturn/Straight, Jupiter/Flush, Earth/Full House, Mars/Four of a Kind,
  Neptune/Straight Flush, Planet X/Five of a Kind, Ceres/Flush House, Eris/Flush Five.
- **Tarot** (22): edit the deck. Enhance cards (The Empress → Mult, The Chariot → Steel, Justice →
  Glass, The Devil → Gold, The Tower → Stone, The Hierophant → Bonus, The Magician → Lucky, The
  Lovers → Wild), convert suits (Star/Moon/Sun/World → Diamonds/Clubs/Hearts/Spades, up to 3 cards),
  change ranks (Strength +1 rank to 2 cards; Death copies one selected card onto another), destroy
  (The Hanged Man, up to 2), or generate money (The Hermit doubles money to a $20 cap; Temperance
  pays the total sell value of your Jokers to a $50 cap).
- **Spectral** (18): high-variance, usually with a cost — destroy cards to create enhanced ones, add
  seals, add editions, copy or destroy Jokers. The Soul creates a Legendary Joker.

### 1.11 Decks and Stakes

15 **Decks**, each a starting-condition modifier: Red (+1 discard), Blue (+1 hand), Yellow (+$10),
Green ($2/unused hand and $1/unused discard, but no interest), Black (+1 Joker slot, −1 hand), Magic
(Crystal Ball voucher + 2× The Fool), Nebula (Telescope voucher, −1 consumable slot), Ghost
(Spectrals in shop, starts with Hex), Abandoned (no face cards in deck), Checkered (26 Spades, 26
Hearts), Zodiac (three merchant vouchers), Painted (+2 hand size, −1 Joker slot), Anaglyph (a Double
Tag after every Boss), Plasma (Chips and Mult averaged together; **2× blind size**), Erratic (all
ranks and suits randomised).

**How the decks unlock — corrected 2026-08-17, and the correction matters.** The 15 decks are not
all available, and they unlock in three distinct ways:

| Group             | Decks                                          | Unlocked by                                            |
| ----------------- | ---------------------------------------------- | ------------------------------------------------------ |
| **From the start** | Red                                            | Nothing — a fresh save holds this deck only            |
| **Discovery**     | Blue, Yellow, Green, Black                     | Discovering _N_ items in the Collection, **cumulative across every run, won or lost** |
| **Paired win**    | Magic, Nebula, Ghost, Abandoned, Checkered      | Winning a run with Red / Blue / Yellow / Green / Black respectively, any Stake |
| **Stake win**     | Zodiac, Painted, Anaglyph, Plasma, Erratic     | Winning at Red / Green / Black / Blue / Orange Stake or harder |

The discovery thresholds are the one figure the sources disagree on — 20/50/75/100 against
20/40/60/80 — so **quote the group, not the number**. Nothing below turns on which is right.

The load-bearing fact is the second row. **Blue (+1 hand) and Yellow (+$10) are unlocked by playing,
not by winning** — the Collection counter accrues from losing runs exactly as it does from winning
ones. Both are unambiguous starting power: +1 hand is a fifth scoring attempt per blind against a
base of four, and +$10 against a $4 opening bankroll buys roughly two extra early Jokers and reaches
the $25 interest cap two antes sooner, so its realised value over a run substantially exceeds $10.
A player who has never won a run can still grind their way to a materially stronger start.

8 **Stakes**, cumulative: White (base) → Red (no Small Blind money) → Green (requirements scale
faster) → Black (30% Eternal stickers) → Blue (−1 discard) → Purple (requirements scale faster
again) → Orange (30% Perishable) → Gold (30% Rental).

---

## Part 2 — the design reading

### 2.1 What is genuinely strong

**The equation is the entire design vocabulary.** Reiner Knizia — the German designer whose method
is to find the single scoring principle that reshapes every decision — argues you design the scoring
first and let the gameplay follow. Balatro takes this further than a scoring *system*: it is a
scoring *equation*, and all 150 Jokers, 52 consumables and 8 enhancements are commentary on two
variables. The mechanism this buys is that a player who understands `Chips × Mult` can evaluate a
card they have never seen before, immediately, without reading the rest of the game.

**The requirement curve teaches by killing you.** Raph Koster's *A Theory of Fun* frames games as
pattern-learning machines — fun is the sensation of grokking a pattern, and the game is over when
the pattern is mastered. Balatro's central pattern is a *growth class*, not a card. Worked:

> Ante 5, Small Blind = 11,000. Suppose a level-5 Flush (35 + 4×15 = 95 chips, 4 + 4×2 = 12 mult),
> five played cards worth ~40 chips, and four `+Mult` Jokers totalling +30.
> `(95 + 40) × (12 + 30)` = **5,670.** Dead, with two hands left and no way to close the gap.
>
> Now sell the weakest `+Mult` Joker (+8) for one `×3 Mult` Joker:
> `(95 + 40) × (12 + 22) × 3` = **13,770.** Clears.

Same cards, same hand, same skill — the run lives or dies on whether one term is additive or
multiplicative. Nothing in the game says this. `.docs/design/design-principles.md` §8
covers this as the transferable device; the point to add here is that it is delivered with **zero
extra rules**. The escalating requirement and the two growth classes were already there.

**Familiar substrate as free tutorial.** LocalThunk describes Balatro as *"my modern indie take on
solitaire with a poker coat of paint"* and is explicit that it has almost no mechanical relationship
to poker — the actual inspiration was Big Two, a Cantonese shedding game. Poker vocabulary supplies
suit, rank, and a ten-entry ranked hand table for free. Mark Rosewater (Magic's head designer) calls
this *resonance* — a rule that matches what the theme implies needs less explaining. The whole
complexity budget therefore goes to the novel layer.

**Escalation by rule-break, not by bigger number.** §8 covers this. The enumeration in §2.3 below is
the part that is new.

### 2.2 The interest system is the game's best-hidden interesting decision

Sid Meier's test for an interesting decision: a trade-off where every option costs something, whose
value changes with board state, and which echoes forward. Balatro's shop looks like the decision
layer. It isn't — **interest is.**

Income per Ante, ignoring unused hands:

| Source | Per Ante |
|---|---|
| Blind payouts ($3 + $4 + $5) | $12 |
| Interest at the $25 cap ($5 × 3 rounds) | $15 |

Holding $25 more than doubles your income. But a Joker costs $4–6, a Voucher $10, and rerolls start
at $5 and escalate. **Spending down from $25 to $0 costs you $15 per Ante, forever, in forgone
interest.** That is a genuine trade-off with situational value — early, an engine piece compounds
harder than the money does; late, with the requirement doubling per Ante, the money is worthless if
your engine is one Joker short.

The skip decision is the same trade in miniature and is computable:

> Skipping a Small Blind forfeits $3 payout + up to $5 interest + $1/unused hand + shop access
> ≈ **$9–10**. An Investment Tag pays **$25** after the next Boss. Net ≈ **+$15** — but only if you
> can still clear the Big Blind and Boss without the shop you skipped.

The answer changes with your build state every single time. This is the strongest decision in the
game and it is expressed in one line of rules text.

### 2.3 Enumerating the Boss Blinds — 20 of 23 attack an input, not the score

Listing the whole space rather than reasoning about themes:

| What it attacks | Count | Bosses |
|---|---|---|
| Debuff by suit | 4 | Club, Goad, Window, Head |
| Debuff by category | 2 | Plant (faces), Pillar (already played) |
| Hide information | 4 | House, Wheel, Fish, Mark |
| Constrain a resource | 5 | Manacle, Water, Needle, Serpent, Hook |
| Constrain hand choice | 3 | Psychic, Eye, Mouth |
| Attack the score directly | 3 | Wall (4×), Flint (halve base), Arm (−1 level) |
| Attack money | 2 | Ox, Tooth |

**Only 3 of 23 touch the score.** The other 20 attack an *input* to the engine — the cards you can
use, the information you have, the resources you spend, or the hand types you may name. This is the
structural reason the boss feels like a test of the build rather than a difficulty spike: the
question it asks is "does your specific machine still function with this part removed?", which is a
different question every run.

The economy row is the interesting outlier. **Only 2 of 23 attack money**, and one of those (The Ox)
requires you to play your most-played hand to trigger. Money is very nearly un-attackable, which is
why economy Jokers are the safest scaling in the game and why the interest decision in §2.2 is never
punished by the boss layer. Whether that is correct is a design question; it is certainly a
deliberate asymmetry.

### 2.4 The catch-up problem Balatro does not solve — it makes losing cheap

David Sirlin's framing: **slippery slope** is positive feedback (being ahead makes you more ahead),
and it is usually bad because it decides the game early and makes the rest a formality. Balatro's
positive feedback is severe and runs in a clean cycle:

```
clear a Blind faster → more unused hands ($1 each) + interest preserved
    → better shop → stronger Joker → clear the next Blind faster
```

Rosewater's completeness checklist asks: *can a player who is behind still believe they can win?*
In Balatro, frequently, **no** — and worse, the player often cannot tell. By Ante 4 a build with no
multiplicative term is arithmetically dead (§2.1) but will still clear Ante 4's Small Blind, so the
run *feels* alive for another two or three rounds after it stopped being winnable.

Balatro's answer is not a comeback mechanic. Its answer is that **a run is ~30 minutes and restarting
is free**. Losing is cheap, so an unwinnable run is a short one and the meta-loop — try another deck,
another Joker line — absorbs the failure.

**Cross-run progression is real here, and the earlier reading of it in this folder was wrong.** It
is tempting — and this document previously implied — that Balatro grants only *options* across runs
while power resets. It does not. Per §1.11, the front of the deck tree is gated on a Collection
counter that accrues from losing runs, and it dispenses flat starting power: an extra hand every
round, an extra $10 at the opening shop. In kind, that is Dead Cells' bargain — failure banks
progress toward a stronger start.

What separates them is **bound, not kind**, and the bound is the transferable lesson:

- **The modifiers never stack.** A player picks exactly one deck per run. Two hundred hours in, they
  start with one starting-condition modifier, the same count as a fresh save. Dead Cells stacks —
  starting health, flask charges, forge quality and runes all apply at once — so its curve rises
  without limit while Balatro's is flat after the first pick.
- **Most later unlocks are trade-offs, not upgrades.** Black buys a Joker slot with a hand; Painted
  buys hand size with a Joker slot; Plasma doubles every blind requirement. The pure-upside decks
  are the early, discovery-gated ones; the tree widens into sidegrades rather than climbing.
- **The Stake ladder is a counterweight the player opts into**, and the completion metagame pushes
  them up it, so the difficulty floor rises alongside the pool.

So the accurate one-line characterisation is **"one bounded, non-stacking power pick, with a
difficulty dial as the counterweight"** — structurally nearer Hades than to a pure clean-test
roguelike. Anything in this folder that reads Balatro as granting *options and never power* is
citing a version of the game that does not exist; see `hybrid-design.md` §7's banked-progress item,
corrected on the same date.

**This is the finding that matters most for anything built here**, and it connects directly to the
other parent in this folder's name. Forbidden Solitaire is explicitly *"a linear narrative experience
rather than an infinitely replayable one,"* 120–180 minutes, no roguelike treadmill (§8). A design
that takes Balatro's escalating requirement and its multiplicative build layer, but sets them inside
a linear narrative, **inherits the slippery slope and discards the only thing that made it
tolerable.** A player 90 minutes into a 3-hour story cannot be told to start over. Either the
escalation curve has to be gentler, or catch-up has to be built in on purpose, or progress has to be
checkpointed below the run level. That is a design decision, not a detail — and it is a decision for
the developer, not for this document.

### 2.5 Two decisions with real consequence and near-invisible feedback

§8 owns the score-preview critique (Mark Brown's point: every input is on screen, so the preview is
hidden but not *absent* — merely tedious, and committed players pay the tax with external
calculators). The part §8 does not carry is that **the same flaw applies a second time, to Joker
order**, and more sharply:

- Jokers evaluate strictly left to right (§1.4). `+Mult` before `×Mult` is correct; the reverse
  loses a large fraction of the score.
- Reordering is free, unlimited, and available at any time.
- The game never states the rule, never shows the delta, and gives no feedback distinguishing a good
  order from a bad one — the score animation looks the same either way.

Meier's list of ways a decision goes wrong includes *the consequence is invisible*. This one is
worse than the score preview, because with the preview the information is at least recoverable by
arithmetic; with ordering, the player must first infer that ordering matters at all. It is a large,
free, permanent decision that a substantial share of players never discover they are making.

The generalisable rule — and this is the honest version of "hidden information is good design":
**withholding a number the player could compute is a tax on your most engaged players; withholding
the existence of a rule is a different thing entirely, and it only works while discovering it is
itself the pleasure.** Balatro gets away with the second because discovery is its stated aesthetic.
A design with a narrative spine and a 2-hour runtime has far less room for that bet.

### 2.6 Coupling — the deck is the shared object

The standard hybrid check: for each pair of subsystems, what flows A→B, and what flows B→A? A
one-way arrow (mode A produces a number mode B consumes) is a toll booth.

- **Hand → build.** Playing a hand clears a Blind, which pays money, which opens the shop.
- **Build → hand.** Tarot cards *edit the deck you draw from* — suits converted, ranks raised, cards
  destroyed, enhancements applied. Planet cards change which hand types are worth naming. Wild cards
  make Flushes trivial. A boss like The Mouth changes which hand you are allowed to play at all.

Both arrows carry, and — this is the part worth stealing — **there is no exchange rate between the
layers.** The shared object is the playing card itself. The outer loop does not hand the inner loop a
number; it rewrites the inner loop's input distribution. Daniel Cook's loop test (does each outer
loop change the conditions of the inner one?) passes cleanly, which is unusual.

There is one genuine tension built from existing pieces, and it is worth noting as a model:
deck-thinning (The Hanged Man destroys cards, making the remaining deck more consistent to draw)
directly fights Blue Joker (+2 Chips per card *remaining* in the deck). No rule was written to create
that conflict. It fell out of two components that already existed.

### 2.7 Smaller findings

- **Discards are the actual skill expression.** 3 discards against 4 hands means most of a round's
  decision-making is deck-search, not hand-selection. The interesting version of "which cards do I
  play" is usually "which cards do I throw away to find the hand I actually want." Any hybrid that
  keeps the scoring layer but drops the discard resource loses more play than it looks like.
- **The secret hands are content, not balance.** Five of a Kind / Flush House / Flush Five are
  unreachable in a 52-card deck. They exist to reward the player who realises the deck is editable —
  a discovery reward disguised as a scoring table row.
- **Plasma Deck is the cleanest illustration of the equation being the design.** It averages Chips
  and Mult toward each other and doubles all blind sizes. That single line is a whole difficulty
  mode, a whole strategy, and a whole rebalance — because it modifies the equation rather than any
  content.
- **The 4×/1× bosses prove the target multiplier is a free tuning dial.** The Wall (4×) and The
  Needle (1×, but one hand only) show that "how hard is this round" and "what rule is broken" are
  independent knobs. Most designs conflate them.
- **Stakes escalate by taxing resources, not by raising numbers — mostly.** 5 of the 8 stake
  modifiers remove money, discards or Joker permanence; only 2 raise the requirement curve. Same
  philosophy as the boss blinds.

### 2.8 Where this research is thin

- Ante base requirements are quoted for **White Stake**; Green and Purple Stakes raise the curve and
  the exact modified values were not verified here. Some secondary sources quote 2,800 / 6,000 for
  Antes 3–4, which appears to be a higher-stake or older-patch figure — the official wiki's White
  Stake values (2,000 / 5,000) are used above.
- The full Voucher and Spectral lists were not transcribed; only the mechanically load-bearing ones.
- Joker counts and rarity weights are as of patch 1.0.1o.
- **Forbidden Solitaire's rules are not transcribed anywhere in this repo.** What exists is the
  design-level summary in `design-principles.md` §8 (Tri Peaks tableau, cards cleared *are* the
  damage, enemies attack the board rather than the player's stats, Gems passive vs Jokers active,
  120–180 minutes linear). If this folder is going to hold a hybrid, that gap is the next thing to
  fill — critiquing a derived mechanic from a remembered version of its parent's rules is exactly
  the failure mode to avoid.

---

## Part 3 — what transfers, and the open questions

Stated as options with consequences. None of these is a decision this document makes.

### The devices worth stealing

1. **One equation, two growth classes, an escalating requirement.** This is the cheapest source of
   depth in the whole design — it costs no rules and produces a lesson (§2.1) that survives many
   hours. It is also the single most portable thing here: it does not require poker.
2. **Escalation by rule-break.** A mandatory encounter that removes one input from the player's
   engine asks a different question every run, at the cost of one line of text per encounter. Note
   that Forbidden Solitaire already does the same thing through enemy intents that attack the
   *tableau* rather than the player, so both parents agree on this.
3. **A shared object rather than an exchange rate.** Balatro's deck and Forbidden Solitaire's tableau
   cards are both the object *both* layers manipulate. Any conversion number between layers is the
   signature of a toll booth.
4. **Interest as the economy's real decision.** A save-versus-spend dial with a hard cap creates a
   trade-off that changes value every round from one line of rules.

### The open questions this raises

- **Catch-up (§2.4) is the load-bearing one.** Balatro's slippery slope is fine because runs are
  short and free to restart. Forbidden Solitaire's structure is the opposite. Whatever this folder
  builds must pick one: gentler curve, explicit comeback, or sub-run checkpointing. All three are
  the developer's call, and they lead to materially different games.
- **How much information is shown.** §2.5 argues the hidden-preview bet is affordable when discovery
  *is* the aesthetic and a run is 30 minutes. It is much less affordable in a narrative-paced game.
  The choice is between Balatro's reveal-drama and a legible preview — and the cheapest way to
  settle it is to build both behind a toggle and watch which one players leave on.
- **Whether the depth budget is roguelike or linear.** Forbidden Solitaire's reviews split precisely
  on this and both halves are describing the same fact (§8): *"has the good sense to get out while
  the going is good"* versus *"runs out of steam quickly."* Length is where a small depth budget
  becomes visible. Picking the runtime is picking which review you get.

### What to measure

The cheapest things that would settle the claims above:

1. **Plot the requirement curve against the best achievable score per Ante for a purely additive
   build.** If the additive build dies at a predictable Ante, the growth-class lesson is being
   taught. If it dies at a random Ante, it is noise, not a lesson.
2. **Count how many runs are arithmetically decided before the player can tell.** Instrument a
   "still winnable" check per round; the gap between when a run becomes unwinnable and when it ends
   is the exact size of the catch-up problem in §2.4.
3. **A/B the score preview.** Measure whether players who see it play faster, and whether they report
   the ending as flatter. Brown's critique predicts the engaged cohort computes it anyway.
4. **Log whether players ever reorder their Jokers** (or the equivalent). If the reorder rate is near
   zero, §2.5's claim holds and the decision is not reaching players.

---

## Sources

- [Balatro Wiki — Poker Hands](https://balatrowiki.org/w/Poker_Hands) · [Blinds and Antes](https://balatrowiki.org/w/Blinds_and_Antes) · [Boss Blind](https://balatrowiki.org/w/Boss_Blind) · [Money](https://balatrowiki.org/w/Money) · [Interest](https://balatrowiki.org/w/Interest) · [Shop](https://balatrowiki.org/w/Shop) · [Booster Packs](https://balatrowiki.org/w/Booster_Packs) · [Jokers](https://balatrowiki.org/w/Jokers) · [Enhancement](https://balatrowiki.org/w/Enhancement) · [Edition](https://balatrowiki.org/w/Edition) · [Seals](https://balatrowiki.org/w/Seals) · [Consumables](https://balatrowiki.org/w/Consumables) · [Deck](https://balatrowiki.org/w/Deck) · [Stake](https://balatrowiki.org/w/Stake) · [Tags](https://balatrowiki.org/w/Tags) · [Guide: Scaling](https://balatrowiki.org/w/Guide:_Scaling)
- [Balatro Wiki (Fandom) — Guide: Activation Sequence](https://balatrogame.fandom.com/wiki/Guide:_Activation_Sequence) — scoring order
- [Balatro Wiki (Fandom) — Blinds and Antes](https://balatrogame.fandom.com/wiki/Blinds_and_Antes) — Endless Mode scaling formula
- [Balatro Wiki — Hands](https://balatrowiki.org/w/Hands) · [Discards](https://balatrowiki.org/w/Discards) · [Hand size](https://balatrowiki.org/w/Hand_size)
- [Rogueliker — LocalThunk interview](https://rogueliker.com/balatro-interview/) — "an indie take on solitaire with a poker coat of paint"
- [Mark Brown / GMTK — Balatro's "cursed" design problem](https://gmtk.substack.com/p/balatros-cursed-design-problem)
- [Matt Greer — Balatro score growth](https://www.mattgreer.dev/blog/balatro-score-growth/)
- [Steam guide — score calculation](https://steamcommunity.com/sharedfiles/filedetails/?id=3169032575)
- Design frameworks and the Forbidden Solitaire notes: `.docs/design/design-principles.md` §1–§8
