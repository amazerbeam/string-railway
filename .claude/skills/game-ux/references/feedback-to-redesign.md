# Feedback → redesign — Reference

Detail behind `SKILL.md` → *When responding to feedback*. How to turn a pile of playtest notes into a
redesign document: read each note for what it is evidence of, generate two genuinely different fixes,
work out how those fixes interact, and write down the set that ships.

## Scope

**Structural — permanent, safe to rely on.** The classification vocabulary, the two-option rule and
its divergence axes, the interaction pass, the redesign-doc template and its reject conditions.

**Dated — re-check before relying on it.** Nothing here is a browser-support fact, but the case
studies are secondhand accounts of shipped games and the practitioner quotes are from articles, not
from the people. Follow the source link before quoting any of it back at someone.

**Not owned here.** Whether a *mechanic* is good, whether a scoring curve is flat, what a rule should
be — `.claude/skills/game-designer/SKILL.md`. Layout, zoning and tap-cost standards —
`SKILL.md` and `references/full-viewport-layout.md`. React and CSS — `react-frontend`.

## What the practitioners actually think

### The job is verification, not taste

Celia Hodent — Ubisoft, LucasArts, then Director of UX at Epic through Fortnite — frames UX as sitting
at the intersection of three disciplines: **design**, who define the experience intended; **business
intelligence**, who define who the audience is; and **UX**, who *verify that the experience designed
is the experience the target audience actually has*. That third seat is the one this skill occupies.
Her framing of the discipline is blunt about why it is hard: "UX is a philosophy more than anything
else, it's all about shifting from our ego-centered perspective by using a scientific approach."

Jaime Griesemer's version of the same question, from his GDC talk on balancing, is the one worth
holding in your head while reading feedback: **"Is the game in the player's head the same as the game
I'm making?"**

The consequence for this repo: a feedback note is not a complaint to be satisfied or refuted. It is
evidence about the size of that gap. The fix closes the gap — sometimes by changing the screen,
sometimes by changing what the screen teaches, occasionally by removing the thing that could not be
taught.

### Clarity outranks cleverness, and removal is a fix

Subset Games hit exactly this on *Into the Breach*: the dev team could read the board's damage
telegraphs perfectly and external testers could not. Their stated principle — "As a game design
principle, we would sacrifice cool ideas for the sake of clarity every time" (Justin Ma) — cashed out
as *cutting weapons and firing patterns that could not be communicated*, not as adding explanatory
text to them.

The transferable move: **"remove it" and "cut the case that causes the confusion" belong in the option
set.** They are usually the cheapest fix on the table and they almost never get written down, because
generating options feels like it should mean generating additions.

### The seven usability heuristics — the vocabulary for naming a failure

Hodent's usability checklist, developed at Epic. Use it to say *which* thing broke before proposing
anything, because the layer the note lands on determines the shape of the fix.

| Heuristic | What the note sounds like | Shape of the fix |
|---|---|---|
| **Signs and feedback** | "I clicked it and nothing happened" · "did that work?" | The system acted and said nothing. Add the response, on the object, at the moment. |
| **Clarity** | "I couldn't tell what that icon was" · "I didn't see it" | Perceived, but not as intended. Change the signifier — not the tutorial. |
| **Consistency** | "why does this one work differently?" | Two similar things behave differently. Make them match, or make them look different. |
| **Minimum workload** | "this is fiddly" · "too many clicks" | Physical or cognitive cost per repetition. Count the repetitions before sizing the fix. |
| **Error prevention and recovery** | "I misclicked and lost the round" | No undo, no confirm, or a confirm in the wrong place. |
| **Flexibility** | "I can't read that at this size" | No accommodation for how this player plays. |
| **Recognition over recall** | "I forgot what that meant" · "what's the trump again?" | Information the player must hold in memory that could be on screen. Fortnite keeps the ammo type on the gun icon for exactly this reason. |

Two notes on using it. First, **more than one heuristic can be implicated by one note**, and that is
usually the signal that you are looking at the real problem rather than a symptom. Second, a note that
does not land on any of them is often not a UX note at all — see Step 2.

### Where the information could live

The four-type taxonomy consolidated from Anthony Stonehouse, Marcus Andrews, Erik Fagerholt and
Magnus Lorentzon answers two questions: does this element belong to the game's fiction, and is it in
the game space or only on the screen?

| Type | In the fiction | In the space | Example |
|---|---|---|---|
| **Diegetic** | yes | yes | Isaac's spine-mounted health bar in *Dead Space* |
| **Spatial** | no | yes | A highlight ring on a targetable tile |
| **Meta** | yes | no | Blood spatter on the screen edge |
| **Non-diegetic** | no | no | A score counter in the corner |

This is a **divergence axis**, not a style guide: when one option restyles a thing where it stands,
the second option worth writing is usually the one that moves the information to a different type.

Be honest about this project's range, though. A trick-taking card screen has a thin fiction — a card
is a card. The live axes here are mostly **spatial** (the information rides on the card itself) versus
**non-diegetic** (it lives in the status band). Diegetic and meta options are mostly unavailable, and
proposing one to satisfy a quota is padding.

## Case studies: the note, and what the fix actually was

### *Into the Breach* — telegraphs the team could read and testers could not

**The note.** Early builds scattered damage indicators across the map. The developers parsed every
unit's intent instantly; external testers could not.

**The fix.** Animated tooltips that show a weapon *being used* by the player's most relevant unit,
rather than describing it. Ma: "Showing that little animation of them moving is a thousand times more
effective" than written explanations. Plus the cuts described above.

**What transfers.** The fix landed one layer up from the complaint. Nobody tidied the indicators —
they changed the *channel* the explanation arrives through. When a note says "I couldn't understand
X", one of your two options should always change the channel rather than the contents.

### Fortnite's trap icon — perception is not universal

**The note.** Playtesters read the trap symbol as ammunition, or as trees.

**The fix.** Redraw it as a literal bear trap. Everyone then read it correctly.

**What transfers.** A symbol is only as good as the population reading it; there is no arguing a
player into perceiving something. The fix is in the signifier, and the test is "did the target
audience read it as intended", which is a question with a right answer and therefore not a taste call.

### *Dead Space* — a failed element indicating the wrong category

**The note.** The ambitious holographic 3D map did not serve players.

**The fix.** Per Glen Schofield, this fed the decision to push the whole interface into the world —
the diegetic suit-mounted UI, no HUD, which he later described as one of the ideas that was "crazy
back then, but now they're kind of normal."

**What transfers.** Sometimes the failing element is not badly executed, it is in the wrong category
entirely. Cross-check every note against the taxonomy table before assuming the fix is a restyle.

### *The Fox in the Forest* digital — the one time the players' prescription was right

**The note.** Reviewers of Dire Wolf's app said dragging cards into place made the game feel slow, and
asked for double-tap.

**Why their prescription held up.** Because it was about the **most-repeated action's cost**, which is
a countable thing, not a preference. Players are unreliable at prescribing fixes in general (below) —
but a note that names a repetition count is naming a measurement, and measurements survive
translation. This is the exception that tells you which notes to trust literally.

### Mega Crit and Riot — the channel changes the signal

Mega Crit on *Slay the Spire 2*: changes come from "a mix of player feedback, collected metrics, and
our own design philosophies," and the highest-value channel is **the in-game reporter — feedback
captured in context, at the moment it happened**, ahead of forum posts. Riot stages exposure
deliberately: internal player labs, then PBE with thousands of players, then forums and surveys.

**What transfers.** Weight a note by where it was captured. Something written down mid-session while
the screen was in front of the player outranks the same person's recollection afterwards, which
outranks a forum thread. Record the channel in the redesign doc, because it is the main reason two
notes about the same screen deserve different weight.

## The method

### Step 1 — Split each note into observation and prescription

Players are reliable about **what went wrong** and unreliable about **how to fix it** — they do not
hold the system in their heads. Alexia Mandeville's rule: "Don't worry about the solution that has
been proposed by the player. Why are they proposing that?"

Write each note as two lines:

- **Observed** — what they did, what they said, where they hesitated, what they missed. Evidence.
- **Prescribed** — the fix they asked for, quoted, and then set aside. It is a clue about the
  observation, not an instruction.

The trap Mandeville names: a note like "the game is too hard" paired with an observation that they
never used a mechanic points at **onboarding**, not difficulty. Fixing the stated complaint fixes
nothing and you meet the same problem again next session wearing a different hat.

**Exception, per the *Fox in the Forest* case:** when the prescription is about the cost of a repeated
action, take it more seriously — it is closer to a measurement than an opinion.

### Step 2 — Locate the failure, and check it is yours

Name the heuristic from the table above, and name the zone or object it lives on. Then check the
boundary, because roughly a third of "UX feedback" is not:

| If the real problem is | Then it belongs to |
|---|---|
| The player could not see, read, reach, or afford the action | **This skill.** Continue. |
| The action was clear and the player did not want to take it | `game-designer` — that is a rules or incentive problem |
| The value is wrong — too slow, too small, too many | The developer. Surface it as an open decision; never pick it |
| It only reproduces at one viewport | This skill, but verify it in a browser before proposing anything |

Then record **frequency**: how many times per round does a player hit this? That number, not the
strength of the complaint, sets the ranking — the same rule `SKILL.md` gives for reviewing.

### Step 3 — Two options that differ in kind

Two, always, and generated **before either is evaluated**. This is not a formality. Dow et al.'s
Stanford study had novice designers produce web ads either in parallel (multiple prototypes, then
critique) or in series (critique after each). By both click-through data and expert rating, the
parallel condition's work outperformed the serial condition's; independent raters judged the parallel
prototypes more diverse, and those participants gained more task-specific confidence. The authors'
explanation is the useful part: **serial iteration invites fixation** — you refine one idea instead of
considering others — while producing alternatives first invests you in the process rather than in a
particular answer.

So the two options must differ in **kind**, not in degree. Force divergence by picking two different
axes:

| Axis | Option A | Option B |
|---|---|---|
| **Channel** | Change what is said | Change how it is said — animate it, show it in use |
| **Placement** | Restyle it where it stands | Move it to another interface type (taxonomy table) |
| **Timing** | Show it during the decision | Show it at the moment before, or in the round-end summary |
| **Addition vs subtraction** | Add the missing signal | Remove the signal it is competing with |
| **Interaction** | Change the affordance | Change the number of steps the action takes |
| **Scope** | Fix this instance | Fix the pattern, everywhere it appears |
| **Existence** | Fix it | Cut it — the *Into the Breach* move |

Each option carries four lines and no more:

- **What changes** — concretely, which zone, object, or interaction.
- **Cost** — which files, and whether it touches the shell (expensive) or one component (cheap).
- **Risk** — what it makes worse, named specifically. "None" means you have not thought about it.
- **What would settle it** — the measurement or the check. A browser at named viewports, a tap count,
  a component test, or a specific question for the next play session.

**Reject conditions.**

- Two options that differ only by a number are **one option**, and the number is the developer's
  anyway. Rewrite.
- An option with no risk line is not finished.
- An option whose settling test is "see if it feels better" is a developer decision wearing a
  disguise — say so, and route it.
- Never present option A and option B when you have already decided; if there is genuinely one
  answer, write one and say *why the alternatives were rejected*. A fake choice wastes the reader's
  time and hides the reasoning.

### Step 4 — The interaction pass

This is the part that makes a redesign doc more than a list. Take every option produced in Step 3 and
walk the pairs. Options that read fine alone routinely collide, because they compete for four scarce
things:

1. **Screen area** — the play area is `1fr`; anything added to a band steals from it.
2. **The player's attention at a given moment** — two new signals during the same decision is one
   signal and one distraction, and Hodent's *minimum workload* heuristic starts working against you.
3. **The tap budget of the repeated action** — a fix that adds a confirm step and a fix that reduces
   clicks are pulling opposite ways on the same lever, even if they came from unrelated notes.
4. **The moment in the loop** — during-decision, on-resolve, and between-rounds are three different
   budgets. Two fixes that both want the round-end summary clash even when their topics are unrelated.

Classify each pair as one of:

| Relation | Meaning | What to do |
|---|---|---|
| **Compounding** | B is cheaper or works better because A shipped | Ship both; note the dependency direction |
| **Redundant** | A already resolves what B addresses | Ship one. Two signals for one problem is new noise |
| **Clashing** | Same pixels, same tap, same moment, or opposite directions on one heuristic | Pick one, and record what the loser was and why |
| **Dependent** | B is incoherent unless A ships first | Ship both, in that order — state the order |
| **Neutral** | No shared resource | Note it and move on |

Resolve clashes in this order, stopping at the first that decides it:

1. **The hard floor** in `SKILL.md`. A fix that introduces hover-only information, a `100vh`, or a
   thirteenth tab stop loses regardless of how good it is otherwise.
2. **Frequency.** The fix on the more-repeated action wins. State both numbers.
3. **Reversibility.** A change to one component beats a change to the shell when they are otherwise
   equal, because it is cheaper to undo after the next play session.
4. **Still tied?** It is a developer decision. Present both with the clash named and stop.

### Step 5 — Write the set, not the list

The output is a set of changes that hold together: what ships, in what order, and — the part that
makes it a decision — **what was dropped and why**. A redesign doc that drops nothing has not chosen
anything; it has renamed the feedback list.

## The redesign doc

Write it to `.docs/design/<project>/` alongside the design docs, or to the contract folder if it is
feeding a `/fb-plan`. Sections, in order:

```markdown
# <Screen> redesign — <session or source>, <date>

## Source
Where the feedback came from, when, who was playing, which build, and the channel
(in-session note / recollection / review / observation). Channel sets the weight.

## Findings
| # | Observed | Prescribed (set aside) | Heuristic | Zone | Times per round |

## Options
### F1 — <one-line restatement of the finding>
**A. <name>** — axis: <divergence axis>
- What changes / Cost / Risk / What would settle it
**B. <name>** — axis: <a different axis>
- What changes / Cost / Risk / What would settle it

## Interaction pass
| Pair | Relation | Shared resource | Resolution |

## The proposed set
Ordered. Each entry names the finding it closes and the option chosen.
**Dropped:** each rejected option, one line, with the reason.

## Open for the developer
Every tuning value, feel call, glyph and copy decision, stated as a question with the
consequence of each answer. Never pre-filled.

## Verification
Browser viewports to check, component tests to write, and the one question to ask at the
next play session that would tell you whether this worked.
```

**Reject conditions for the doc.**

- A finding with one option, presented as if it were the only possibility.
- A doc with an empty **Dropped** list.
- A tuning value chosen inside the doc rather than raised in **Open for the developer**.
- A rules or incentive problem quietly patched with a UI change instead of being handed to
  `game-designer`.
- A layout claim asserted without a named viewport size, per `SKILL.md` → *Verification*.
- Options that differ only in degree.

## Where this research is thin

Stated plainly rather than dressed up:

- **Fetched in full and quoted directly:** Mandeville on interpreting playtest feedback, the Game
  Developer article on *Into the Breach*'s UI, Hodent's own write-up of UX practices at Epic, and
  Hodent's Fortnite article (the trap icon).
- **Read only via search summaries, not primary text:** the Dow et al. parallel-prototyping study
  (paywalled at ACM; the Stanford PDF did not extract), Schofield on *Dead Space*, Mega Crit's
  patching-methodology posts, Riot's testing pipeline, the Stonehouse taxonomy, and the Griesemer
  quote. The claims are consistent across sources but the statistics and exact wording are not
  verified here — follow the links before leaning on a number.
- **Genuinely missing:** a primary-source teardown of a *card-game* UI redesign driven by logged
  feedback. The digital-board-game complaint material is aggregated player reviews, not a designer's
  account of what they changed and why. The closest thing this repo has to that is its own
  `prototype/.docs/design/Balatro-Forbidden-Solitaire/balatro-play-notes.md`. If a good card-game teardown
  turns up, it belongs here.

## Sources

Practitioner frameworks — [Developing UX Practices at Epic Games, Celia
Hodent](https://celiahodent.com/ux-practices-epic-games/), [Understanding the success of Fortnite: a
UX and psychology perspective, part
1](https://medium.com/ironsource-levelup/understanding-the-success-of-fortnite-a-ux-user-experience-psychology-perspective-208cee587dc6),
[The Game UX Twist: Usability Principles for Games,
IxDF](https://ixdf.org/literature/article/the-game-ux-twist-usability-principles-for-games).

Interpreting feedback — [How to Ignore Playtesting Feedback to Improve Your Game, Alexia
Mandeville](https://alexiamandeville.medium.com/how-to-ignore-playtesting-feedback-to-improve-your-game-f7238af55c3f),
[10 Insightful Playtest Questions, Game
Developer](https://www.gamedeveloper.com/business/10-insightful-playtest-questions).

Why two options — [Parallel Prototyping Leads to Better Design Results, More Divergence, and
Increased Self-Efficacy, Dow et al., Stanford HCI / ACM ToCHI
2010](https://hci.stanford.edu/publications/2010/parallel-prototyping/ParallelPrototyping2010-final.pdf).

Case studies — [Into the Breach dev on UI design: 'Sacrifice cool ideas for the sake of clarity every
time', Game
Developer](https://www.gamedeveloper.com/design/-i-into-the-breach-i-dev-on-ui-design-sacrifice-cool-ideas-for-the-sake-of-clarity-every-time-),
[Into the Breach Design Postmortem, GDC Vault](https://gdcvault.com/play/1026333/-Into-the-Breach-Design),
[Game UI Discoveries: What Players Want, Game
Developer](https://www.gamedeveloper.com/design/game-ui-discoveries-what-players-want) (Dead Space's
map), [Mega Crit on their patching methodology](https://x.com/MegaCrit/status/2035125930876678627),
[UX Design in the Games Industry, Riot Games UX
Design](https://medium.com/riot-games-ux-design/ux-design-in-the-games-industry-50b0572631c3).

Interface taxonomy — [Using the narrative when designing the user interface for video games, Anthony
Stonehouse](https://medium.com/@thewanderlust/considering-the-narrative-in-user-interface-design-for-video-games-c45953c22760),
[User interface design in video games, Game
Developer](https://www.gamedeveloper.com/design/user-interface-design-in-video-games).
