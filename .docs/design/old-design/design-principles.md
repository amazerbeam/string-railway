# Game design principles — a working reference

Research notes gathered from published designer interviews, GDC talks and design essays, organised
so they can be _used_ rather than admired. Sources are listed at the bottom; every claim here is
attributable to one of them.

This is a lens collection, not a rulebook. Applied to the current concept in
[`concept-critique.md`](./concept-critique.md).

---

## 1. Frames for reading a game

### MDA — mechanics → dynamics → aesthetics

Hunicke, LeBlanc and Zubek's model splits a game into three causally linked layers: **mechanics**
(the rules you write), **dynamics** (the behaviour that emerges when players run those rules), and
**aesthetics** (the emotional response). The designer only authors the first layer; the player only
experiences the third. Every design problem is a mismatch somewhere in that chain.

The practical instruction: **read your game from both ends.** Write mechanics forwards, but check
them backwards — name the feeling you want, then ask which dynamic produces it, then which rule
produces that dynamic.

LeBlanc's **8 kinds of fun** exist to stop "fun" being a single undifferentiated goal: _sensation,
fantasy, narrative, challenge, fellowship, discovery, expression, submission_. Name the two or
three you're actually chasing; the rest are not failures when they're absent.

### Schell's elemental tetrad

Mechanics, story, aesthetics, technology — all four equally load-bearing, all four pulling toward
one experience. Schell's other durable contribution is the **rule of the loop**: the more times you
test and revise, the better the game gets, and nothing substitutes for it.

### Koster — fun is learning

_A Theory of Fun_: games are pattern-learning machines, and fun is the sensation of grokking a
pattern. The corollary is brutal and is the single most useful idea in the book: **once the pattern
is mastered, the game is boring — that is the destiny of every game.** So a design has a _depth
budget_. Good games either pick one core lesson and end before it's exhausted, or keep producing
variations that force the learnt skill into new applications.

Use it as a test: _what is the player learning in round five that they weren't learning in round
one?_ If the answer is "nothing," that's not a pacing problem, it's a depth problem.

### Lantz — games as an aesthetic form

Frank Lantz's framing is that games are the aesthetic form of interactive systems, judged the way
literature or music is. It licenses the ambition to make a system that _means_ something, and it
warns against treating elegance as a purely engineering virtue.

---

## 2. The decision is the unit of design

### Sid Meier — "a series of interesting decisions"

Meier's 2012 GDC talk unpacked his own 1989 line, largely by defining the negative. A decision is
**uninteresting** if:

- players almost always pick the same option (**dominant strategy**),
- players pick effectively at random (**meaningless choice**),
- the choice has no consequence, or its consequence is invisible.

A decision is **interesting** when it has:

- **a trade-off** — every option costs something,
- **situational value** — the right answer changes with board state,
- **persistence** — it echoes forward and shapes later decisions,
- **room for expression** — a cautious player and an aggressive player can both play well.

Two operational rules from the same talk: **err on the side of giving the player too much
information** (silence after a decision is "paranoia-inducing"), and expect to cut roughly a third
of everything you try.

### Knizia — design the scoring first

Knizia's method is to find the one scoring principle that reshapes every decision in the game.
"The scoring drives the gameplay." He is a mathematician by training and looks for a general
principle rather than a pile of special cases; the ideal is a system that _self-limits_, where
overreaching players are punished by the system's own arithmetic rather than by a bolted-on rule.

His other line worth keeping: _the goal is to win, but it is the goal that matters, not the
winning._ The victory condition is a design tool for focusing attention, not just an end state.

### Rosewater — ten things every game needs

From the _Making Magic_ two-parter, a serviceable completeness checklist:

|     | Need            | Test question                                                                       |
| --- | --------------- | ----------------------------------------------------------------------------------- |
| 1   | **Goal**        | Can the player state what they're trying to do, and are there several routes to it? |
| 2   | **Rules**       | Do the restrictions create the challenge, rather than merely describing it?         |
| 3   | **Interaction** | Do players have to react to each other, or are they playing solitaire in parallel?  |
| 4   | **Catch-up**    | Can a player who is behind still believe they can win?                              |
| 5   | **Inertia**     | Does the game build momentum toward ending — before players tire?                   |
| 6   | **Surprise**    | Is there something players can't predict?                                           |
| 7   | **Strategy**    | Is there something to get better at?                                                |
| 8   | **Fun**         | (Not a tautology — it's a separate check that the correct play is enjoyable.)       |
| 9   | **Flavour**     | Is the game _about_ something, so the rules feel motivated rather than arbitrary?   |
| 10  | **Hook**        | Is there one sentence that makes someone want to try it?                            |

### Rosewater — twenty lessons (the ones that bite)

- **#5 Don't confuse "interesting" with "fun."** Threshold in _Odyssey_ was intellectually
  fascinating and players hated it. A mechanic can be structurally admirable and emotionally
  miserable, and structural admiration is exactly the trap a systems-minded designer falls into.
- **#6 Know what emotion your game evokes.** Every component either serves that emotion or dilutes
  it, regardless of its individual quality.
- **#13 Make the fun part also the correct winning strategy.** "It's your job to make sure that
  what it takes to succeed at your game is the very thing that makes the game fun." If optimal play
  is boring play, the design is broken, not the players.
- **#11 If everyone likes your game but nobody loves it, it will fail.** Polarising beats bland.
- **#16 Be more afraid of boring your players than challenging them.** Ambition earns forgiveness;
  boredom earns none.
- **#19 Your audience is good at recognising problems and bad at solving them.** Treat playtest
  feedback as diagnosis, never prescription.
- **#18 Restrictions breed creativity.** Constraints force exploration that open briefs don't.
- **#1 Fighting human nature is a losing battle.** If players persistently expect X, give them X
  rather than a rule explaining why they're wrong.
- **#3/#4 Resonance and piggybacking.** Familiar fiction teaches mechanics for free — a rule that
  matches what the theme implies needs less explaining and is remembered better.
- **#15 Design the component for its intended audience.** A card aimed at everyone pleases nobody;
  aim each piece at a specific player psychographic.

### Soren Johnson — the optimisation warning

"Given the opportunity, players will optimise the fun out of a game." This is Rosewater's #13 seen
from the player's side. Players are not obliged to protect your intentions; if a joyless line wins,
they will find it and play it. Design so the joyless line loses.

---

## 3. Luck, skill and drama

### Garfield — luck is a design material, not a defect

Garfield defines an **orthogame** as a finite, competitive, multiplayer game that ranks its
players, and argues luck should be tuned rather than minimised. Randomness widens the set of
opponents you can enjoyably play (it compresses skill differences), generates drama, gives the
weaker player hope and the stronger player something to blame — and it hides information about
skill, which keeps play social rather than merely evaluative. His own designs deliberately layer a
high-luck moment-to-moment game inside a low-luck long-run structure.

### Input vs output randomness

- **Input randomness** happens _before_ the decision — the deal, the tile draw, the map seed. The
  player sees it and plans around it. It preserves agency and supports strategy.
- **Output randomness** happens _after_ — the to-hit roll. It resolves fast and prevents analysis
  paralysis, but it can invalidate a plan the player made correctly.

Engelstein's framing is that input randomness supports strategy while output randomness undercuts
it; the useful caveat (Mark Brown) is that well-tuned output randomness improves plenty of games
and badly designed input randomness ruins others. The real question is not which kind but **whether
the player loses to their own decision or to the system's**.

### Sirlin — slippery slope and perpetual comeback

- **Slippery slope** = positive feedback: being ahead makes you more ahead. Usually bad. It decides
  the game early and makes the remainder a formality.
- **Perpetual comeback** = negative feedback: being behind helps you recover. Usually good, but in
  its extreme form ("almost losing is powerful") it makes leads meaningless.

The recommendation is to blend: **limited, temporary slippery slope** so advantages feel real, plus
**tuned comeback** so a single early lead doesn't end the contest. Sirlin's ideal phrasing —
decisions should _echo forward in time without permanently destabilising the competition_ — is a
good sentence to hold any mechanic against.

Note that Rosewater's #4 (catch-up) and #5 (inertia) are the same dial seen from the two ends: too
little catch-up and the loser disengages; too much and the game never ends.

---

## 4. Structure over time

### Cook — loops and arcs

A **loop** is a cycle of _mental model → action → simulation → feedback → updated model_. Value is
delivered by _exercising_ the loop, so loops carry replay. An **arc** is "a broken loop you exit
immediately" — a cutscene, a story beat, a one-off reveal. Arcs deliver information efficiently and
then are spent; an arc-heavy game needs a content treadmill.

**Skill atoms** are the smallest learnable units; a game is a map of them. Nested, dependent loops
produce complex feedback and emergent dynamics — that nesting is where hybrid designs live or die.

Practical use: draw your loops explicitly, at each frequency (per decision / per round / per
session / per campaign). Every loop should teach something, and each outer loop should change the
conditions of the inner one. If an outer loop doesn't feed back into the inner one, it isn't a
loop — it's a wrapper.

---

## 5. Hybrids specifically — when two games become one

This is the sharpest available literature for a design that bolts a card game to a board game.

### Puzzle Quest — the standard for coupling

The reason the match-3/RPG fusion is still cited: the puzzle mode is the RPG's battle system _and_
the RPG is the puzzle's structure, with **actions and achievements in each mode changing the
player's options in the other**. Two-way traffic. When only one direction carries — mode A produces
a number that mode B consumes — the minigame becomes a toll booth. The known failure mode in the
same game is also instructive: when the board's drops swing hard, players read the loss as the
system's fault, not their own.

### Arcs (Wehrle) — trick-taking as an action economy

Arcs runs an entire 4X-shaped wargame off a trick-taking system instead of an action menu: the
lead's card constrains everyone else, who must follow suit or pivot to a weaker action, and you
spend most of the game unable to do what you'd like. Reviewers consistently make one observation
that should be pinned above any similar design: **the knife-edge tension is inseparable from the
feeling of being punished when behind — you don't get one without the other.** If you sand off the
punishment you lose the tension that justified the structure.

### Friedrich / Maria (Sivél) — cards as combat over a map

Sivél's Seven Years' War games resolve battles with playing cards, and the coupling device is
elegant: **the map's sectors are marked with card suits**, so the geography of where you are
fighting determines which cards are strong. That is a two-way link built out of almost nothing — a
single shared vocabulary between the two systems.

### Wehrle on asymmetry

Balance a high-powered position with **increased strategic liabilities** rather than by shaving
numbers, and make sure the differing roles produce a dynamic that players can _witness and
understand_ in each other. Asymmetry that players can't read is just noise.

---

## 6. A critique checklist

A repeatable pass to run over any mechanic or whole design.

**Decision quality (Meier)**

1. Name the decision. Is there a dominant option? Is any option ever wrong to take?
2. Does its value change with game state, or is it a static ranking?
3. Does the player have the information needed to make it well?
4. Does it persist — will the player still feel this choice in ten minutes?

**Structural soundness (Sirlin, Rosewater)** 5. Where is the positive feedback? Can one event decide the outcome? Is that intended? 6. What does a losing player have to hope for? 7. What makes the game end? Does it accelerate?

**Coupling (Puzzle Quest, Sivél)** 8. For each pair of subsystems: what flows A→B, and what flows B→A? A one-way arrow is a toll booth. 9. Is there a shared vocabulary between the two systems, or only a scalar?

**Experience (Koster, Rosewater #5/#6/#13)** 10. What is the player learning on the fifth repetition that they weren't on the first? 11. Name the emotion. Does every component serve it? 12. Is the optimal line also the enjoyable line? What is the most boring way to win?

**Honesty** 13. Which of these answers is a _theme_ justification standing in for a _structural_ one? 14. What's the cheapest measurement that would tell you you're wrong?

That last pair matters most. Flavour justifications ("thematically that's exactly what an ambush
should feel like") are the most common way a structural risk survives review, because they're true
and they're not answering the question.

---

## 7. Genre neighbours — how comparable games solved this

Section 5 covers hybrid *theory*. This section covers the specific published games sitting in the
genres this project touches, and what each one already learned the hard way. Added 2026-08-06.

The genres in play: two-player trick-taking · abstract connection game · card-driven wargame ·
campaign/territory conquest · roguelike-deckbuilder progression · fixed-encounter JRPG design ·
Metroidvania traversal gating · solo-vs-CPU AI for a two-player competitive game.

### Faeria — the closest structural cousin

A digital card game on a hex board where **you build the land you fight over**. Each turn the
"Power Wheel" forces a single choice between gaining resource, drawing a card, or placing land
tiles (two plain, or one featured: mountain / forest / desert / lake). Creatures may only be
summoned onto land, and coloured cards require a matching terrain type to already be on the board
before they are playable. Both players start at opposite ends and race a path toward the enemy orb;
extra-resource wells sit in the map corners.

Three transferable devices:

- **Terrain type is a shared vocabulary, not a scalar.** Faeria's coupling is Sivél's suited-map-
  sectors trick (§5) in digital form — the geography determines which cards are strong, so the
  board talks back to the hand without any conversion number in between.
- **The board layer is not funded by a separate currency.** Land placement competes with card draw
  and resource *on the same turn dial*, so expanding the board always costs tempo in the card game.
- **The corner wells give a reason to expand sideways**, not straight at the enemy. A pure
  base-to-base race has no such reason; contested off-axis objectives are the standard fix.

### Culdcept — the 30-year warning about hybrid pacing

Magic × Monopoly, running since 1997. Older entries take hours for one match; the 2026 entry
*Culdcept Begins* shipped a 2× speed toggle as an explicit remedy and still drew "suffers a little
from pacing issues." The sharper review line is the structural one: it "fails to fully commit to
any of its identities, and by trying to be everything at once, struggles to find a hook, resulting
in an experience that feels less like a polished hybrid and more like a collection of mechanics in
search of a soul."

The lesson for any design that runs a *complete* game of A inside a *complete* game of B: length
is the first symptom, but the disease is that neither layer is allowed to be the point.

### Thronebreaker — the fixed-encounter design, and its known complaint

A campaign map over Gwent where roughly half the battles are **puzzle battles**: a fixed given deck
and a special win condition. This is the nearest published thing to the gym-city idea, and its
recurring player complaint is precise — *"it's a custom deck, with custom text often, in a single
way to beat the enemy."* Players report trial-and-error and guide-consulting instead of playing the
deck they built, and the rewards make the puzzles effectively mandatory.

The distinction that matters: Thronebreaker fixes **the player's** deck. The gym-city design fixes
**the opponent's** hand and leaves the player's own deck theirs — the better side of that line. But
the complaint lands the moment a city's fixed hand plus fixed trump admits exactly one winning
line. A designed problem with one solution is a puzzle; the second time through, it is a chore.

### Fox in the Forest Duet — the parent game's own spatial coupling, and it landed flat

Foxtrot's co-op sequel couples tricks to a **tug-of-war path**: trick outcomes move a shared pawn
along a track, power cards manipulate direction and distance, and overshooting in either direction
loses ("lost in the forest"). Worth knowing before reinventing it — the reviewed verdict is that
the spatial layer generated no tension (2.5/5). The diagnosis matches the one that killed the lane
draft in `skirmish-board-replacement.md`: a single axis of contest has nowhere to be spread thin.

### Card-driven wargames — the dual-use card

*We the People* (Herman, 1993) founded the genre and its defining device is the **dual-use card**:
each card is either **Ops** (a numeric action budget for the map) *or* an **Event**, and in the
original you must choose one and lose the other. Later CDGs print both on every card and keep the
either/or. The tension is entirely in that choice — the map's action economy and the hand's content
are the same object.

This is the sharpest available contrast with a design where cards are played for tricks and only
the *aggregate round result* becomes map moves. There the individual card never faces the map; in a
CDG it always does.

### Connection-game AI — Hex was not solved by Monte Carlo

Connection games are genuinely hard: Hex is PSPACE-complete (Havannah and TwixT likewise), 11×11
Hex has ~2.4×10^56 legal positions with a branching factor around 100 against chess's ~40, and the
usual heuristics — material, mobility — are meaningless, so alpha-beta with a generic evaluation
does not work.

**But the breakthrough was not rollouts.** Anshelevich's **H-search** deduces *virtual connections*:
start from trivially connected pairs and repeatedly apply an **AND rule** (connections combined in
series) and an **OR rule** (connections combined in parallel) to prove that two points are connected
no matter what the opponent does. A virtual connection is defined **point-to-point** — "each point
could be an empty cell, a group of connected stones or a board side." HEXY then evaluated positions
with a **Shannon-style electrical resistance** function: treat the board as a circuit, your stones
as low resistance and the opponent's as infinite, augment cell adjacency with the virtual
connections H-search found, and the resulting end-to-end resistance is the evaluation. HEXY won
gold at the 2000 Computer Olympiad on that, before MCTS existed.

Why this transfers unusually well to a base-to-base network board: the win condition *is* the
H-search primitive (point-to-point, not edge-to-edge), and a legal one-cell expansion gap is
exactly Hex's **bridge** — the canonical second-order virtual connection. The caveat is real: a
per-round move budget, a 2–3 cost overwrite and a reinforce action all break the strict alternation
H-search's proofs assume, so the deductions weaken from proofs to heuristics. That is still a far
cheaper starting point than rollouts.

### Trick-taking AI — PIMC, and the flaw it survives

**Perfect Information Monte Carlo** remains state of the art for Skat, Bridge and Hearts: sample
hidden hands consistent with what has been seen, solve each sample as a perfect-information game,
average the results. Its known defect is **strategy fusion** — because each sampled world is solved
independently, the search assumes it can act differently in each, and so overvalues plans that
depend on information it does not actually have. IIMC and EPIMC exist to mitigate it; PIMC works
well anyway. For a two-player, 33-card, 13-trick game the sampling space is small compared to
Bridge, so PIMC is cheap here.

### Slay the Spire — a campaign map is a rhythm, not a free-form graph

Each act is 17 floors, up to six nodes wide, every room reachable by 1–3 edges from below and
leading to 1–3 above. The beats are **fixed by depth**, not randomised: floor 1 is an easy combat,
floor 9 is always treasure, floor 15 is always a rest site, and the act ends on a boss drawn from a
pool of three. Elite frequency rises from 8% to 16% after act 1. The player's choice is which risk
profile to take *between* guaranteed beats — the guarantees are what make the choice legible.

### Metroidvania gating — three uses per ability

The rule of thumb from the design literature: every new traversal ability should be bound to **at
least three meaningful uses — one to progress, one to open a shortcut, one to reframe existing
combat or puzzle space**. Backtracking is the point, not a tax, and it only pays if old areas
change meaning. The known late-game failure is the other end of the same dial: once every ability
is unlocked the map is large and the fast-travel network is thin, and traversal stops rewarding.

### Roguebook — the maximalism warning

Garfield's deckbuilder makes exploration a **hex map painted into existence** with brushes and ink
pots, revealing battles, events and card vaults. Two lessons: the exploration currency is kept
distinct from the combat currency, and the consistent reviewer complaint is that the game "lacks
focus" — systems stacked rather than converged. Same failure family as the Culdcept note above.

### Pokémon gym design — the team answers its own counter

Thin research, stated as such: no substantial design writing surfaced, only community analysis. The
one durable point is that a well-built fixed team includes answers to the counter it invites —
Gyarados carrying Ice Fang for Grass, Quagsire's secondary Ground typing shutting down Electric —
so the fight cannot be solo'd by the single obvious answer. The fan design-guide framing is also
worth keeping: decide **what lesson the encounter teaches** first, then build the team and the
arena to teach it.

### Where this research is thin

- No developer postmortem exists (or surfaced) for Thronebreaker's puzzle-battle design; the
  evidence above is player discussion.
- No Slay the Spire designer interview on map generation surfaced — the structure above comes from
  wiki and strategy sources, which are reliable for *what* the map does and silent on *why*.
- The Culdcept criticism is review journalism, not design writing.
- Legacy/campaign trick-taking is barely explored territory; the only substantive item found was a
  designer's unpublished brainstorm, not a shipped game.

---

## 8. Card-game roguelikes and solitaire hybrids

The 2024–2026 wave of single-player card games that took a *familiar* card game and hung a new layer
on it. Directly relevant to any design that puts a known card game underneath something else. Added
2026-08-09.

### Balatro — one equation, and a requirement curve that outgrows any flat build

The entire game is `Score = Chips × Mult`. Every one of its ~150 Jokers, every Tarot, every Planet
card is an intervention on one of those two terms. This is Knizia's "design the scoring first"
(§2) taken to the limit — not a scoring *system*, a scoring *equation*, and all content is
commentary on it.

The load-bearing refinement is that **the two terms belong to different growth classes.** Chips add.
Mult comes in two flavours: `+Mult` adds, `×Mult` multiplies. Two `+30 Mult` Jokers give `+60`; one
`+30 Mult` alongside one `×2` gives `60` and climbs from there. Meanwhile the blind requirement
grows roughly **×2 per ante** — base values on White Stake run 300 · 800 · 2,000 · 5,000 · 11,000 ·
20,000 · 35,000 · 50,000, with Small Blind = base, Big = 1.5×, Boss = 2× (a few bosses differ; The
Wall is 4×). Ante-8's boss therefore asks 100,000 against the 300 you cleared first: a **333× climb
over eight antes.**

A build assembled from flat bonuses grows linearly and is *arithmetically guaranteed* to fail around
ante 5. The game never says this. It teaches it by killing you. That is Koster's "fun is learning"
(§1) with the pattern being literally a rate of growth — and it answers the mastery test cleanly:
what the player learns in round five is a *growth class*, not a card.

**The transferable device:** if the scoring is one equation with terms of differing growth class,
and the requirement escalates, then "which card is good" stops being a static ranking and becomes a
question about the shape of your curve. No extra rules were needed to produce that.

### Balatro — escalation by rule-break, not by bigger number

Boss Blinds do not only raise the target. They break a rule: The Club debuffs every Club card, The
Psychic forces you to play exactly five cards, others flip cards face down, force-select cards, or
change hand size and discard count. So the mandatory test at the end of each ante asks *your specific
engine* whether it still works under a constraint.

Paired with it: Small and Big Blinds are **skippable** for a Tag, but skipping forfeits the shop, the
money, the interest, and a round of Joker/hand scaling. Boss Blinds are never skippable. The shape is
worth naming — **the optional content is the economy, the mandatory content is the test.**

### Balatro — hidden information only shapes play if it is genuinely unobtainable

LocalThunk withholds the score preview on purpose: *"the game is more fun when you set up your Rube
Goldberg machine and watch it go"* before knowing whether it clears. The escalating sound and card
animations are built for that reveal.

Mark Brown's critique is the sharper half, and it generalises well beyond Balatro: **every input to
the calculation is already on screen, so the preview is hidden but not absent — it is merely
tedious.** Committed players compute it with external calculators, which means the designed
experience fails for exactly the players most invested in the game. The cited precedent is *The
Binding of Isaac* hiding item descriptions to force experimentation; McMillen later called it his
biggest flaw.

The rule: withholding information is a legitimate and powerful tool, but if the information is
recoverable by effort, you have not hidden it — you have taxed it, and the most engaged players will
pay the tax and lose the experience you designed.

### Balatro — familiar substrate as a rules-budget subsidy

LocalThunk calls it *"my modern indie take on solitaire with a poker coat of paint"* and is explicit
that it has almost no mechanical relationship to poker; the actual inspiration was **Big Two**, a
Cantonese shedding game. The poker vocabulary is doing one job: a 52-card deck plus "pair / straight
/ flush / full house" hands you ten hand categories, their ranking, and the whole suit-and-rank
concept **for free**. That is Rosewater #3/#4 (resonance and piggybacking, §2) monetised — the
familiar substrate costs nothing to teach, so the entire complexity budget goes to the novel layer.

He is also worth quoting on balance: *"If the picture FEELS level but actually isn't, that is better
than it being technically level but feeling askew."* Balance passes are number tweaks, not mechanic
redesigns.

### Luck be a Landlord — how little game you can keep

Balatro's stated primary inspiration, and useful as the boundary case. It strips the roguelike
deckbuilder to its meta-layer alone: no combat, no HP, no exploration, and **no per-turn decision at
all** — symbols are drawn and placed by the slot machine. The only choice in the game is which of
three offered symbols to add to the pool, and the only skill is reading synergy. It works. Evidence
that the drafting decision can carry a whole design and everything downstream of it can be
spectacle — and a warning that if your inner loop *is* just spectacle, you should know that.

### Forbidden Solitaire — the clear is the damage

Grey Alien Games × Night Signal, April 2026. Tri Peaks solitaire as a combat engine, and the coupling
is as tight as coupling gets: **every card removed from the tableau is attack damage, so a long chain
is simultaneously the puzzle skill and the combat outcome.** There is no conversion number between
the two layers because there is no intermediate currency — the same event is both.

The return arrow is equally direct. Enemies run pre-programmed telegraphed loops (Slay the Spire's
intent system) and their moves attack **the board, not your stats**: they curse, poison and infest
tableau cards, alter a card's value or state, drain mana, steal Jokers. So the RPG layer edits the
puzzle's rules and the puzzle's performance is the RPG layer's damage. Both arrows carry, and neither
is a scalar.

Two upgrade tracks kept cleanly apart: **Gems**, bought from a merchant and embedded in the
protagonist's flesh, are passive (draw-chance, damage multipliers, mana); **Jokers** (~30) are active,
cast like spells to destroy or transmogrify cards. Passive economy vs. active tools.

This is the third generation of one idea — *Regency Solitaire* → *Shadowhand* → *Ancient Enemy* (IGF
Excellence in Design honourable mention) — and Birkett's account of adding turn-based combat to
*Shadowhand* is worth keeping for its shape: *"the idea sprung pretty much fully-formed into my head
and when I coded it and tried it out, it worked very well."* Twenty years on one substrate before the
hybrid landed.

### Forbidden Solitaire — spend the depth budget and stop

The developers state it plainly: 120–180 minutes, and *"a linear narrative experience rather than an
infinitely replayable one."* They declined the roguelike treadmill on purpose.

Reviews split precisely on that decision, and the split is the finding. Shacknews: the game *"has the
good sense to get out while the going is good."* Other reviews: *"the gameplay runs out of steam
quickly due to how shallow and straightforward it is."* **Both are describing the same fact.** The
lesson is Koster's depth budget (§1) as an operational instruction: a small depth budget is not a
defect — stretching it is. Length is where shallowness becomes visible.

### What all four share, and it is the thing to steal

None of them converts between layers. Balatro: the poker hand **is** the score. Forbidden Solitaire:
the cards cleared **are** the damage. Faeria (§7): the terrain **is** the card requirement. Friedrich
(§5): the map sector **is** the suit. In every case the two systems share an object, not an exchange
rate.

The counterexample is already in this document and it is the closest one to home: *Fox in the Forest
Duet* converts trick outcomes into movement on a separate path track, and the spatial layer reviewed
at 2.5/5 for generating no tension. A conversion number is the signature of a toll booth (§6 check 8),
and it is the default thing a hybrid design reaches for.

---

## Sources

- [Sid Meier — "Interesting Decisions", GDC 2012 (report)](https://www.gamedeveloper.com/design/gdc-2012-sid-meier-on-how-to-see-games-as-sets-of-interesting-decisions) · [talk video](https://www.youtube.com/watch?v=WggIdtrqgKg) · [GDC Vault](https://www.gdcvault.com/play/1015756/interesting)
- [Mark Rosewater — Ten Things Every Game Needs, Part 1](https://magic.wizards.com/en/news/making-magic/ten-things-every-game-needs-part-1-2011-10-24) · [Part 2](https://magic.wizards.com/en/news/making-magic/ten-things-every-game-needs-part-1-part-2-2011-12-19)
- [Mark Rosewater — Twenty Years, Twenty Lessons: Part 1](https://magic.wizards.com/en/news/making-magic/twenty-years-twenty-lessons-part-1-2016-05-30) · [Part 2](https://magic.wizards.com/en/news/making-magic/twenty-years-twenty-lessons-part-2-2016-06-06) · [Part 3](https://magic.wizards.com/en/news/making-magic/twenty-years-twenty-lessons-part-3-2016-06-13) · [GDC 2016 video](https://archive.org/details/GDC2016Rosewater)
- [Reiner Knizia — interview on systems, scoring and auctions (Think Like A Game Designer #52)](https://justingarydesign.substack.com/p/reiner-knizia-systems-for-publishing)
- [Richard Garfield — Luck vs Skill (Board Game Design Lab)](https://boardgamedesignlab.com/luck-vs-skill-with-richard-garfield/) · ["Luck in Games" lecture, ITU Copenhagen](https://m.youtube.com/watch?v=av5Hf7uOu-o)
- [David Sirlin — Slippery Slope and Perpetual Comeback](https://www.sirlin.net/articles/slippery-slope-and-perpetual-comeback)
- [Daniel Cook — Loops and Arcs](https://lostgarden.com/2012/04/30/loops-and-arcs/) · [The Chemistry of Game Design](https://lostgarden.com/2021/03/13/the-chemistry-of-game-design-2/)
- [MDA framework overview](https://en.wikipedia.org/wiki/MDA_framework) · [Marc LeBlanc's 8 kinds of fun](https://www.skeletoncodemachine.com/p/the-8-kinds-of-fun)
- [Jesse Schell — The Art of Game Design (full text PDF)](https://www.inventoridigiochi.it/wp-content/uploads/2020/07/art-of-game-design.pdf)
- [Raph Koster — A Theory of Fun (synopsis)](https://tomavison283.wordpress.com/2013/11/29/raph-kosters-a-theory-of-fun-for-game-design-synopsis/)
- [Frank Lantz — The Beauty of Games (MIT Press)](https://mitpress.mit.edu/9780262552950/the-beauty-of-games/) · [Jim Rutt Show interview transcript](https://jimruttshow.blubrry.net/the-jim-rutt-show-transcripts/transcript-of-ep-210-frank-lantz-on-the-beauty-of-games/)
- [Soren Johnson — "players will optimise the fun out of a game" (discussion)](https://indianajonas.substack.com/p/you-will-optimize-the-fun-out-of) · [Think Like A Game Designer interview](https://justingarydesign.substack.com/p/think-like-a-game-designer-49-soren-9d4)
- [Cole Wehrle — interview on asymmetry and design process (Wargamer)](https://www.wargamer.com/board-games/cole-wehrle-interview-conversation) · [Erik Twice interview](https://eriktwice.com/en/2021/12/15/interview-player-cole-wehrle-designer-root/)
- [Input vs output randomness (Skeleton Code Machine)](https://www.skeletoncodemachine.com/p/input-output-randomness-part-1) · [Randomness and Game Design (Game Developer)](https://www.gamedeveloper.com/design/randomness-and-game-design)
- [Puzzle Quest's genre-bending design (Game Developer analysis)](https://www.gamedeveloper.com/game-platforms/analysis-on-i-puzzle-quest-i-s-genre-bending-charm)
- [Arcs (board game) — overview](<https://en.wikipedia.org/wiki/Arcs_(board_game)>) · [review discussing the trick-taking action economy](https://puzzlewick.com/guides/arcs-board-game-review/)
- [Friedrich — cards as battle resolution, suited map sectors](<https://en.wikipedia.org/wiki/Friedrich_(board_game)>) · [rulebook](https://www.histogame.de/friedrich/FriedrichRules.pdf)
- [Josh Buergel on trick-taking design (Breakup Gaming Society ep. 106)](https://www.breakupgamingsociety.com/episodes/josh-buergel-interview-best-trick-taking-games-fox-in-the-forest-deluxe)
- [HexWiki — Handicap (Demer scale)](https://www.hexwiki.net/index.php/Handicap) · [HexWiki — Rules and the swap rule](https://www.hexwiki.net/index.php/Rules)

### Section 7 — genre neighbours

- [Faeria — official site](https://www.faeria.com/) · [PC Gamer on the living board](https://www.pcgamer.com/faerias-living-board-makes-it-stand-out-from-the-card-game-crowd/) · [Big Boss Battle — CCG/strategy hybrid analysis](https://bigbossbattle.com/faeria-is-a-huge-ccg-and-strategy-hybrid-that-goes-as-deep-as-it-does-wide/) · [Wikipedia](https://en.wikipedia.org/wiki/Faeria)
- [Culdcept (series overview)](https://en.wikipedia.org/wiki/Culdcept) · [TheGamer — Culdcept Begins, "mechanics in search of a soul"](https://www.thegamer.com/culdcept-begins-is-brilliant-welcoming-and-occasionally-infuriating/) · [Metacritic — Culdcept Begins](https://www.metacritic.com/game/culdcept-begins/)
- [Thronebreaker: The Witcher Tales](https://en.wikipedia.org/wiki/Thronebreaker:_The_Witcher_Tales) · [Steam discussion — "there are WAY too many puzzle battles"](https://steamcommunity.com/app/973760/discussions/0/3374780959392809341/)
- [The Fox in the Forest Duet — BGG](https://boardgamegeek.com/boardgame/288169/the-fox-in-the-forest-duet) · [There Will Be Games review of the path/tug-of-war coupling](https://therewillbe.games/articles-boardgame-reviews/8367-fox-on-the-run-a-the-fox-in-the-forest-duet-board-game-review) · [Tabletop Bellhop review](https://tabletopbellhop.com/game-reviews/the-fox-in-the-forest-duet/)
- [We the People — the first card-driven wargame](https://en.wikipedia.org/wiki/We_the_People_(boardgame)) · [Meeple Mountain — a brief history of card-driven wargames](https://www.meeplemountain.com/articles/a-brief-history-of-card-driven-wargames/) · [Washington's War (Ellis-Gorman on Ops vs Event)](https://www.stuartellisgorman.com/blog/washingtons-war-by-mark-herman) · [Herman / Ruhnke / Matthews CDG design panel](https://www.youtube.com/watch?v=d_TpfOZ6CrM)
- [Anshelevich — A hierarchical approach to computer Hex (H-search, virtual connections)](https://www.cs.auckland.ac.nz/courses/compsci767s2c/resources/VAnshelevich-ARTINT.pdf) · [The Game of Hex: an automatic theorem proving approach](https://vanshel.com/Hexy/Publications/VAnshelevich-01.pdf) · [van Rijswijck — Search and evaluation in Hex](https://www.cs.cornell.edu/~adith/docs/y_hex.pdf) · [Bonnet et al. — On the complexity of connection games](https://arxiv.org/pdf/1605.04715) · [Havannah and TwixT are PSPACE-complete](https://arxiv.org/pdf/1403.6518)
- [Perfect Information Monte Carlo with postponing reasoning](https://arxiv.org/abs/2408.02380) · [Policy-based inference in trick-taking card games](https://www.researchgate.net/publication/336087110_Policy_Based_Inference_in_Trick-Taking_Card_Games) · [Knowledge-based paranoia search in trick-taking](https://arxiv.org/pdf/2104.05423) · [Learning policies from human data for Skat](https://arxiv.org/pdf/1905.10907)
- [Slay the Spire — map generation (wiki)](https://slaythespire.wiki.gg/wiki/Map_Generation) · [Analysis of uncertainty in procedural maps in Slay the Spire](https://arxiv.org/html/2504.03918v1)
- [Making sense of Metroidvania game design (Game Developer)](https://www.gamedeveloper.com/design/making-sense-of-metroidvania-game-design) · [Metroidvania design pillars](https://allthings.how/metroidvania-explained-design-pillars-history-scope/)
- [Roguebook — Tabletop Bellhop review](https://tabletopbellhop.com/game-reviews/roguebook/) · [NME — "an expansive deck builder that lacks focus"](https://www.nme.com/reviews/game-reviews/roguebook-review-an-expansive-deck-builder-that-lacks-focus-2974742)
- [Pokémon Tabletop RPG — gym design: signature elements](https://pokemontabletop.com/gym-design-signature-elements/) · [gym design: unconventional challenges](https://pokemontabletop.com/gym-design-unconventional-challenges/)
- [Daniel Solis — brainstorming a legacy-style trick-taking game](https://danielsolisblog.blogspot.com/2015/03/brainstorming-legacy-style-trick-taking.html)

### Section 8 — card-game roguelikes and solitaire hybrids

- [Rogueliker — LocalThunk interview, "an indie take on solitaire with a poker coat of paint"](https://rogueliker.com/balatro-interview/) · [TouchArcade — LocalThunk on concept, design and balance](https://toucharcade.com/2024/03/18/balatro-interview-mobile-port-localthunk-dlc-plans-updates-new-jokers-demo-feedback/) · [DayOne — "there is a lot more design to explore within Balatro"](https://playday.one/2024/03/09/there-is-a-lot-more-design-to-explore-within-balatro/) · [Rolling Stone — LocalThunk reflects on 2024's best game](https://www.rollingstone.com/culture/rs-gaming/balatro-localthunk-interview-1235214060/)
- [Mark Brown / GMTK — Balatro's "cursed" design problem (hidden score preview)](https://gmtk.substack.com/p/balatros-cursed-design-problem)
- [Balatro Wiki — Blinds and Antes (requirement scaling, blind multipliers, skipping)](https://balatrowiki.org/w/Blinds_and_Antes) · [Balatro Wiki — Guide: Scaling (additive vs xMult)](https://balatrowiki.org/w/Guide:_Scaling) · [Balatro Wiki — Skip and Tags](https://balatrowiki.org/w/Skip) · [Steam guide — score calculation](https://steamcommunity.com/sharedfiles/filedetails/?id=3169032575) · [Matt Greer — Balatro score growth](https://www.mattgreer.dev/blog/balatro-score-growth/)
- [Luck be a Landlord (TrampolineTales) — Steam](https://store.steampowered.com/app/1404850/Luck_be_a_Landlord/) · [Wikipedia](https://en.wikipedia.org/wiki/Luck_Be_a_Landlord) · [Shacknews — Balatro was largely inspired by Luck Be a Landlord](https://www.shacknews.com/article/139116/balatro-inspiration-luck-be-a-landlord-reddit-ama)
- [Six One Indie — interview with the developers of Forbidden Solitaire](https://www.sixoneindie.com/post/interview-with-the-developer-of-forbidden-solitaire) · [Shacknews review](https://www.shacknews.com/article/149240/forbidden-solitaire-review-score) · [Higher Plain Games review (mechanics detail)](https://higherplaingames.com/pc/forbidden-solitaire-review/) · [So Many Games review](https://somanygames.co.uk/review/forbidden-solitaire-review/) · [Metacritic](https://www.metacritic.com/game/forbidden-solitaire/)
- [Grey Alien Games — about (Regency Solitaire, Shadowhand, Ancient Enemy lineage)](https://greyaliengames.com/blog/about-grey-alien-games/) · [Wikipedia](https://en.wikipedia.org/wiki/Grey_Alien_Games) · [We Love Every Game — Jake Birkett interview](https://www.weloveeverygame.com/articles/spotlights/the-overnight-success-20-years-in-the-making-an-interview-with-grey-alien-game-s-jake-birkett.html)
