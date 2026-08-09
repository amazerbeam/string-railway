# US Civil War game framing

**Status:** early concept, but most of what's below is the developer's own direct calls from
conversation on 2026-08-07/08, not defaults invented here — marked **Settled** where stated
directly, **Open** where genuinely undecided. Numbers (trick counts, "3 fights") are illustrative
only, same convention as [`skirmish-board-replacement.md`](./skirmish-board-replacement.md).

**Supersedes** the "Historical framing & battle goals" section of
[`ideas-and-concepts.md`](./ideas-and-concepts.md) — that section now points here. Answers
[`hybrid-concept.md`](./hybrid-concept.md)'s long-open "what winning the whole war means."

**Resolution (2026-08-08):** the "CPU tuning as a difficulty dial" section below — specifically its
plan to escalate a must-lose battle toward the CPU-also-dumps pairing — is superseded by
[`claude-civil-war.md`](./claude-civil-war.md), which found that pairing unsafe (a must-lose player
can be forced into an unwanted win by Fox's own follow-suit rule) and replaced it with a fixed
CPU-hunts pairing plus escalation through hand strength instead. Every other section of this
document (the setting, the scripted-battle/retry mechanism, the Force/Narrate resolution) still
stands and is carried forward into that document unchanged in substance.

Source rules: [`../game_rules/fox-in-the-forest.md`](../game_rules/fox-in-the-forest.md). Naming
source for: [`reskin.md`](./reskin.md). Visual reference: [`../../art/ART_BIBLE.md`](../../art/ART_BIBLE.md).

---

## The setting

- A fictional stand-in for the American Civil War — fictional country, fictional city and place
  names throughout (none chosen yet), but visually and structurally drawn straight from it.
- **Two factions: the Reds and the Blues.** The player picks a side at campaign start.
- **The Blues win the war — always, regardless of play.** Choosing Red means choosing to lose the
  war; that is the narrative, not a computed mechanical outcome. No cumulative meta-score decides
  the campaign's ending — the campaign's job is to author a sequence, not compute a winner.
- The story is told from one side, so **both sides' narratives have to be written** — picking a
  side picks which one the player reads. Real cost, acknowledged, not new.
- This is also the **naming source** for cards, the War Council map, and city names — feeds
  `reskin.md`'s open naming questions and `ideas-and-concepts.md` idea 3's city-naming gap.

---

## Scripted battles — the goal mechanism (Settled 2026-08-08)

This is the resolved answer to "how do losing and winning make narrative sense." It replaces the
earlier framing of this as a **Force vs. Narrate** choice — once clarified, what the developer means
by Force turns out to be a real, played mechanism, not a hidden override. See "Why this isn't the
Force/Narrate tradeoff it looked like," below.

- A city is fought across **multiple War Council hands** — illustrative example: "New York" as 3
  separate 13-trick hands.
- **Each hand opens with narrative text and an explicit, player-visible goal** — e.g. "win fewer
  than 3 tricks." Same shape as the bronze/silver/gold goal system (`ideas-and-concepts.md` idea 7),
  but used here as the **primary objective** for the scene, not an optional bonus.
- **The Vanguard phase of the same battle carries an equivalent goal**, translated into Vanguard's
  own terms. Not yet specified what that translation is — **Open**.
- The player genuinely plays for the stated goal. Hitting it is a real skill outcome — nothing is
  decided before the cards are dealt.
- **On a miss, the scene replays until the player hits the goal** — explicitly the developer's own
  comparison: "like a boss fight in Elden Ring, you can't progress until you meet the condition."
  Failure costs nothing but another attempt.
- The actual defence against the Thronebreaker-style complaint recorded in `design-principles.md`
  §7 (players said Thronebreaker's fixed-deck puzzle battles felt like guessing the one solution,
  not playing) isn't that the scene is never revisited once cleared — that answers "is it a chore
  the *second time through the game*," not the complaint itself, which is about retrying the *same*
  fight repeatedly in one sitting until you land on the one line that works. The real defence:
  the player's own deck stays theirs to build on every attempt (their guarantee-card and
  shuffle-in choices, `ideas-and-concepts.md` idea 5), and — **Settled 2026-08-08** — the general's
  hand is now reshuffled on every attempt too, with only a small number of specific guaranteed
  cards staying fixed (`ideas-and-concepts.md` idea 3, revised). Neither side is playing a
  memorised script; both sides get a fresh hand around a known, scoutable threat. That's the
  gym-leader shape, not the fixed-puzzle one.
- Once hit, narrative text explains the result in-fiction, including justifying a loss without it
  reading as the player having played badly — e.g. "their information was bad, the general wasn't
  there" for a goal that required losing.

---

## Tools the player has to chase a goal, especially a losing one

- **Deck construction, aimed deliberately.** Idea 5's guarantee-card and shuffle-in slots
  (`ideas-and-concepts.md`) work the same either direction — loading weak, low-rank cards raises the
  odds of staying under a losing threshold, exactly the same mechanism used to build toward a win,
  run backwards.
- **Decree (trump) visibility for scripted battles.** The player needs to know the decree card
  before building their deck for one of these fights, so they can plan the deck around it. This
  settles part of `hybrid-concept.md`'s open "is the trump card visible before the fight" question
  — **for scripted story battles specifically.** Whether ordinary, non-scripted cities also reveal
  their decree ahead of time is a separate call — **Open**, not settled by this.

---

## CPU tuning as a difficulty dial

- The CPU can be set to **hunt tricks** (maximise its own count) or **dump tricks** (minimise its
  own count). A binary toggle, not a search for a precise target band.
- Because a round's 13 tricks always sum to 13 (the scoring-band math already in
  `hybrid-concept.md`), CPU behaviour directly sets how hard the player's goal is:
  - Player's goal is to lose (win few tricks) + CPU hunts tricks → **easy**. The CPU's own
    trick-taking hands the player a low count for free.
  - Player's goal is to lose + CPU also dumps tricks → **hard**. Both sides are fighting over who
    gets stuck taking tricks, and follow-suit can strand the player with ones they didn't want.
  - The same logic runs in reverse when the player's goal is to win.
- This is a materially simpler AI problem than steering the CPU onto an exact outcome — a hunt/dump
  toggle, not a search targeting a specific trick-band result.
- **Settled 2026-08-08:** the first time the player is given a *must-lose* goal, use the easy
  pairing (CPU hunts) deliberately — it's a teaching beat, not the real test. The player should walk
  away knowing what "aim for the low band" feels like before the game asks them to fight for it.
  Later must-lose battles should deliberately escalate toward the harder pairing (CPU also dumps)
  rather than defaulting to easy every time — otherwise every "must lose" battle reads as a
  foregone conclusion instead of a contest, and the "real skill outcome" claim above stops being
  true for any of them.

---

## Why this isn't the Force/Narrate tradeoff it looked like

The original open question was framed as a choice between forcing a mechanical result (steering or
overriding the CPU toward a pre-decided outcome, at the cost of the round becoming theatre) and
narrating whatever actually happened as a loss (keeping the round honest, at the cost of the
history book only being *likely*, not guaranteed, to match).

What's described above is neither. The round is played completely straight — nothing is steered or
overridden — but the win condition for that scene is an authored goal instead of "take more tricks
than the CPU," and failing to hit it doesn't fail the game, it repeats the scene. That gets the
guarantee Force wanted (the scripted city always eventually resolves the way the story needs) without
the cost that made Force expensive (a CPU that has to search for a precise outcome, or a result that
gets silently overwritten). Narrate remains a reasonable choice for minor beats that don't warrant a
dedicated goal — not decided either way, just not superseded outright.

---

## One primitive, two uses

Both this mechanism and the bronze/silver/gold system (`ideas-and-concepts.md` idea 7) are the same
underlying object — a stated target checked against a round's result — used two different ways:

| | Story-gate goal (this file) | Medal goal (idea 7) |
|---|---|---|
| Mandatory? | Yes — blocks progress until met | No — optional, chased for its own sake |
| On miss | Scene replays | Nothing; just doesn't earn that tier |
| Count per battle | However many the story needs | Illustrative: 3, for bronze/silver/gold |

Worth keeping as one goal-definition system with a **blocking** flag, rather than building two
separate systems that happen to look alike.

---

## Open questions

- Fictional country, faction, and city names — none chosen.
- The Vanguard-side equivalent of a War Council trick-count goal — not specified.
- Whether decree visibility extends to ordinary (non-scripted) cities, or stays scoped to story
  battles only.
- Whether the player can tell in advance that a given battle is a scripted story-gate vs. an
  ordinary city, or discovers it by playing.
- Whether "Narrate" (fixed prose, no gameplay gate) has a real remaining use for minor beats, or
  whether every story-relevant battle ends up using the goal-and-retry mechanism.
