# Game design principles — a working reference

Research notes gathered from published designer interviews, GDC talks and design essays, organised
so they can be *used* rather than admired. Sources are listed at the bottom; every claim here is
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

LeBlanc's **8 kinds of fun** exist to stop "fun" being a single undifferentiated goal: *sensation,
fantasy, narrative, challenge, fellowship, discovery, expression, submission*. Name the two or
three you're actually chasing; the rest are not failures when they're absent.

### Schell's elemental tetrad

Mechanics, story, aesthetics, technology — all four equally load-bearing, all four pulling toward
one experience. Schell's other durable contribution is the **rule of the loop**: the more times you
test and revise, the better the game gets, and nothing substitutes for it.

### Koster — fun is learning

*A Theory of Fun*: games are pattern-learning machines, and fun is the sensation of grokking a
pattern. The corollary is brutal and is the single most useful idea in the book: **once the pattern
is mastered, the game is boring — that is the destiny of every game.** So a design has a *depth
budget*. Good games either pick one core lesson and end before it's exhausted, or keep producing
variations that force the learnt skill into new applications.

Use it as a test: *what is the player learning in round five that they weren't learning in round
one?* If the answer is "nothing," that's not a pacing problem, it's a depth problem.

### Lantz — games as an aesthetic form

Frank Lantz's framing is that games are the aesthetic form of interactive systems, judged the way
literature or music is. It licenses the ambition to make a system that *means* something, and it
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
principle rather than a pile of special cases; the ideal is a system that *self-limits*, where
overreaching players are punished by the system's own arithmetic rather than by a bolted-on rule.

His other line worth keeping: *the goal is to win, but it is the goal that matters, not the
winning.* The victory condition is a design tool for focusing attention, not just an end state.

### Rosewater — ten things every game needs

From the *Making Magic* two-parter, a serviceable completeness checklist:

| | Need | Test question |
|---|---|---|
| 1 | **Goal** | Can the player state what they're trying to do, and are there several routes to it? |
| 2 | **Rules** | Do the restrictions create the challenge, rather than merely describing it? |
| 3 | **Interaction** | Do players have to react to each other, or are they playing solitaire in parallel? |
| 4 | **Catch-up** | Can a player who is behind still believe they can win? |
| 5 | **Inertia** | Does the game build momentum toward ending — before players tire? |
| 6 | **Surprise** | Is there something players can't predict? |
| 7 | **Strategy** | Is there something to get better at? |
| 8 | **Fun** | (Not a tautology — it's a separate check that the correct play is enjoyable.) |
| 9 | **Flavour** | Is the game *about* something, so the rules feel motivated rather than arbitrary? |
| 10 | **Hook** | Is there one sentence that makes someone want to try it? |

### Rosewater — twenty lessons (the ones that bite)

- **#5 Don't confuse "interesting" with "fun."** Threshold in *Odyssey* was intellectually
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

- **Input randomness** happens *before* the decision — the deal, the tile draw, the map seed. The
  player sees it and plans around it. It preserves agency and supports strategy.
- **Output randomness** happens *after* — the to-hit roll. It resolves fast and prevents analysis
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
decisions should *echo forward in time without permanently destabilising the competition* — is a
good sentence to hold any mechanic against.

Note that Rosewater's #4 (catch-up) and #5 (inertia) are the same dial seen from the two ends: too
little catch-up and the loser disengages; too much and the game never ends.

---

## 4. Structure over time

### Cook — loops and arcs

A **loop** is a cycle of *mental model → action → simulation → feedback → updated model*. Value is
delivered by *exercising* the loop, so loops carry replay. An **arc** is "a broken loop you exit
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

The reason the match-3/RPG fusion is still cited: the puzzle mode is the RPG's battle system *and*
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
numbers, and make sure the differing roles produce a dynamic that players can *witness and
understand* in each other. Asymmetry that players can't read is just noise.

---

## 6. A critique checklist

A repeatable pass to run over any mechanic or whole design.

**Decision quality (Meier)**
1. Name the decision. Is there a dominant option? Is any option ever wrong to take?
2. Does its value change with game state, or is it a static ranking?
3. Does the player have the information needed to make it well?
4. Does it persist — will the player still feel this choice in ten minutes?

**Structural soundness (Sirlin, Rosewater)**
5. Where is the positive feedback? Can one event decide the outcome? Is that intended?
6. What does a losing player have to hope for?
7. What makes the game end? Does it accelerate?

**Coupling (Puzzle Quest, Sivél)**
8. For each pair of subsystems: what flows A→B, and what flows B→A? A one-way arrow is a toll booth.
9. Is there a shared vocabulary between the two systems, or only a scalar?

**Experience (Koster, Rosewater #5/#6/#13)**
10. What is the player learning on the fifth repetition that they weren't on the first?
11. Name the emotion. Does every component serve it?
12. Is the optimal line also the enjoyable line? What is the most boring way to win?

**Honesty**
13. Which of these answers is a *theme* justification standing in for a *structural* one?
14. What's the cheapest measurement that would tell you you're wrong?

That last pair matters most. Flavour justifications ("thematically that's exactly what an ambush
should feel like") are the most common way a structural risk survives review, because they're true
and they're not answering the question.

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
- [Arcs (board game) — overview](https://en.wikipedia.org/wiki/Arcs_(board_game)) · [review discussing the trick-taking action economy](https://puzzlewick.com/guides/arcs-board-game-review/)
- [Friedrich — cards as battle resolution, suited map sectors](https://en.wikipedia.org/wiki/Friedrich_(board_game)) · [rulebook](https://www.histogame.de/friedrich/FriedrichRules.pdf)
- [Josh Buergel on trick-taking design (Breakup Gaming Society ep. 106)](https://www.breakupgamingsociety.com/episodes/josh-buergel-interview-best-trick-taking-games-fox-in-the-forest-deluxe)
- [HexWiki — Handicap (Demer scale)](https://www.hexwiki.net/index.php/Handicap) · [HexWiki — Rules and the swap rule](https://www.hexwiki.net/index.php/Rules)
