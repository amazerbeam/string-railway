# The deck is your army — attrition as the campaign layer

**Status:** early concept, designed conversationally with the developer on 2026-08-09. Nothing here
is committed to code. Numbers (battle counts, casualty counts) are illustrative only, same convention
as [`skirmish-board-replacement.md`](./skirmish-board-replacement.md).

**What this is:** a proposed replacement for **The Vanguard** — the hex-board network-growth layer.
Same job (give a War Council hand consequence beyond itself, and give the campaign something to
track), radically less machinery. Whether to adopt it is the developer's call; this document only
states the design.

Source rules: [`../game_rules/fox-in-the-forest.md`](../game_rules/fox-in-the-forest.md) ·
related: [`claude-civil-war.md`](./claude-civil-war.md) ·
[`ideas-and-concepts.md`](./ideas-and-concepts.md) ·
[`skirmish-board-replacement.md`](./skirmish-board-replacement.md)

---

## Why replace the Vanguard at all

Three problems, all measured against the shipped engine (detail and method in
[`claude-civil-war.md`](./claude-civil-war.md)):

- **58.4%** of ordinary battles hit a 20-round cap without either side ever reaching the Breach.
- **87.5%** of the battles that *did* resolve were won by whoever won the very first War Council hand —
  a runaway with no comeback mechanism opposite it.
- The card→board coupling only ever ran one way. `concept-critique.md`'s Problem 2 (the board never
  tells the cards anything) was never actually closed, by the Vanguard or anything else.

Plus two design-level costs: the Vanguard's AI is a connection-game evaluation problem (the class of
problem that made Hex need purpose-built search machinery), and running a complete board game inside
a complete card game is the exact shape `design-principles.md` §7 records Culdcept failing at for
thirty years — *"length is the first symptom, but the disease is that neither layer is allowed to be
the point."*

This proposal doesn't fix the Vanguard. It removes the second complete game.

---

## The core rule

**Your deck is your army. Each card is a unit of soldiers.**

Not "a card represents a unit." The 9 of Bells *is* Doyle's Scouts — one object, showing a rank and
suit for play and a unit name for flavour.

A battle is a single 13-trick War Council hand. **How many tricks you took decides what the battle
costs you.**

| Tricks | What happened | Ground | Army |
|---|---|---|---|
| **0–3** | Withdrew in good order | Lost | **Intact** |
| **4–6** | Indecisive slog | Lost | Casualties |
| **7–9** | Decisive win | Held | **Intact** |
| **10–13** | Overran them | Held | **Heaviest casualties** |

**Casualties are cards removed from the deck permanently.** Not discarded for the round — gone for
the rest of the campaign.

### Why the bands mean this

This isn't a theme bolted onto Fox's scoring — it's a reading of the scoring Fox already has.
`tricksToPoints` pays 0–3 and 7–9 six points each, 4/5/6 one/two/three, and 10–13 **zero**. The two
winning bands are already two different good outcomes, and the greedy band is already the worst
result in the game.

Naming them: 0–3 is a clean withdrawal, 7–9 is a clean win, 4–6 is the muddle, and 10–13 is a pyrrhic
victory — you took the field and paid more than the ground was worth.

**That last one matters most in this setting.** The war's outcome is fixed (see
[`claude-civil-war.md`](./claude-civil-war.md)). Spending irreplaceable veterans to hold a town you
will surrender three chapters later is the worst trade available. The card game's own scoring curve
becomes the war's own strategic lesson: **win, but don't win too hard.**

### Who chooses the casualties

Proposed, not settled: the two *controlled* bands (0–3, 7–9) cost nothing, so the question only
arises for the two uncontrolled ones — and in both of those the player had no grip on the engagement,
so **casualties are not chosen.** Losing control is what the band means.

---

## What losing cards actually does

You always play a 13-card hand. The deck isn't your hand — it's the pool of cards you *own*. Any
slot your army can't fill is filled with a **conscript**: a card pulled from the leftover pool.

**Conscripts are even-ranked cards.** This is the important detail, and it's why attrition bites the
way it should.

In Fox, every **odd** card carries an ability — Swan (1) trades a lost trick for the lead, Fox (3)
swaps the decree mid-hand, Woodcutter (5) draws and buries, Witch (9) counts as trump alone, Monarch
(11) dictates the opponent's response. Every **even** card is a blank number.

So losing veterans doesn't cost you the ability to *win tricks*. It costs you the ability to
**steer**. A late-campaign hand of mostly conscripts still plays — you just have no lead control, no
trump swap, no way to dig for a card you need. You put cards down and hope the shape works out.

That is what a regiment of raw replacements plays like. It still has a name and a number. It won't do
anything clever.

**Illustrative curve:** chapter one you might be dealt 11 of your own and 2 conscripts; late in a bad
campaign, 5 and 8.

---

## How the campaign ends

**The war runs to a schedule.** An illustrative fifteen battles from first shot to surrender, fought
in order. The war ends when the script says — not when someone wins. Which side the surrender
favours was decided when the player picked a faction, per
[`claude-civil-war.md`](./claude-civil-war.md).

**You lose if your army is destroyed before the war ends.** Roster empty, nothing but conscripts —
your force was wiped out somewhere in the middle chapters and the story continued without you. This
is the real fail state, and the attrition table above is the mechanism that produces it.

**You "win" by reaching the last battle with people still standing**, and *how many* selects the
ending:

- Roster largely intact → your people went home.
- Roster gutted → you arrived, and there's almost nobody left to see it.

**Both factions use the identical rule, which is what makes it work:**

- **Blue can win the war and get the bad ending** — steamroll every engagement into the 10–13 band,
  take every town, reach the surrender commanding strangers.
- **Red can lose the war and get the good ending** — refuse engagements, live in the 0–3 band, lose
  every town and bring everyone home.

One line: **you don't choose whether you win. You choose what it costs.**

### The thing that stops it being a pure death spiral

Recruitment. `ideas-and-concepts.md` idea 4 already has exploration yielding cards; that becomes the
other half of this economy. New units replace losses.

So the campaign's real tension is a race: **are you losing veterans faster than you can replace
them?** Early on, no. Later the replacements thin out. The chapter where you first notice the roster
has stopped growing back is the chapter the war turns — which, for a player who picked the losing
side, is the whole point.

---

## What this fixes

- **The one-way coupling closes, in one system.** The army *is* the deck, so a battle's outcome
  directly determines what the next hand can do. No conversion number, no second game, no toll booth.
- **The runaway loses its engine.** There is no Muster snowball, because there is no board to
  accumulate position on. Each battle's cost lands on the deck, and recruitment pushes back.
- **The stalemate disappears** — there is no Breach to fail to reach.
- **The Vanguard's AI problem disappears** with it.
- **Must-lose scripted goals stop being a bolted-on inversion.** "Withdraw in good order" *is* the
  0–3 band — one of the game's two native winning modes, not a puzzle running against the grain of
  its own card game. The retry mechanism in `claude-civil-war.md` still applies unchanged.
- **Failure finally costs something**, which `claude-civil-war.md` flagged (round 26) as missing
  everywhere in the design and belonging to a document that didn't exist yet. This is that document.

---

## Open, not yet decided

- **How many battles a campaign runs**, and how casualties scale across it — the whole attrition
  curve is unset.
- **How many cards a casualty result removes**, per band. The pyrrhic band must cost more than the
  muddle; nothing else is fixed.
- **Whether conscripts are drawn from a fixed pool or generated**, and whether they can ever be
  promoted into real units.
- **The recruitment rate** — the single most load-bearing unset number here, since it alone decides
  whether the campaign is a slow decline or a death spiral.
- **Whether towns held supply specific cards** (a town that supplies low cards is worth holding
  precisely *because* it makes future withdrawals easier). Attractive, unexamined.
- **What replaces the Vanguard's screen time.** This removes a whole interactive surface; whether the
  campaign map, the roster screen, or something else takes that space is a UX question this document
  doesn't answer.

## What it costs to adopt

- **The hex board goes.** It is the most *game*-looking thing in the design and some players want a
  map. This ships a card game with a strong campaign, not a strategy hybrid.
- **Work already done on the Vanguard is stranded** — the board engine, the Clash, the CPU heuristic,
  the UI.
- **The roster needs enough texture to carry the weight the board was carrying.** If losing cards is
  the only consequence in the game, the deck-building around it has to be rich enough to make each
  loss a real decision rather than a number going down. That is where the design effort saved on
  connection-game AI would need to be spent instead.

---

## What would prove this wrong

1. **Simulate the attrition curve before building anything.** The band frequencies are already
   measured (`claude-civil-war.md`: 0–3 lands 24.5% of hands under a duck policy, 4–6 lands 53.9%,
   7–9 lands 20.4%, 10–13 lands 1.2%). Those are for a player *trying* to lose; the equivalent
   distribution for a player trying to win is unmeasured and decides whether the muddle band is so
   common that every campaign death-spirals regardless of skill.
2. **Check the pyrrhic band is actually reachable enough to matter.** At 1.2% under a duck policy it
   may be too rare to teach its own lesson — the whole "don't win too hard" tension depends on players
   hitting it often enough to learn from.
3. **Play a mock campaign on paper**, fifteen battles, tracking the roster by hand. Cheapest possible
   test of whether the decline feels like a story or a chore.
