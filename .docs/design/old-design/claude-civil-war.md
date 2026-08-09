# Claude Civil War — the fixed war outcome and how scripted battles work

**Read "The rules as they stand" (immediately below) if you want the ruleset. Everything after it is
the reasoning and the 41-round audit log that produced it.**

**Status:** working draft, on its forty-first revision. This is a rewrite of
[`us-civil-war-game-framing.md`](./us-civil-war-game-framing.md) (which now carries a Resolution
banner pointing here for its superseded section), fixed against forty-one rounds of fresh
`game-designer` critiques plus a manual play-through and three rounds of actual simulation against
the shipped engine (round 33's per-hand hit rates, round 34's 500-battle compounding/stalemate
measurement — recorded in `skirmish-board-replacement.md` — and round 35's authored-schedule
Breach-rate measurement). Round 20 found and fixed a real, exploitable bug in the shipped Vanguard
engine itself (`src/vanguard/overwrite.ts`), regression-tested directly in the codebase. Full detail
on every round's findings is in "What changed and why," bottom of file — that log, not this
paragraph, is the record of what's been checked. Still being checked and fixed until a fresh pass
finds nothing real left open. Numbers are illustrative only, same convention as
[`skirmish-board-replacement.md`](./skirmish-board-replacement.md).

Source: [`../game_rules/fox-in-the-forest.md`](../game_rules/fox-in-the-forest.md) ·
[`ideas-and-concepts.md`](./ideas-and-concepts.md) · [`hybrid-concept.md`](./hybrid-concept.md)

---

## The rules as they stand — read this first

Everything below this section is the reasoning, the measurements, and the 41-round log of how each
rule got here. This is the ruleset itself, current as of the latest revision. Where a rule was
revised more than once, this states the final version only.

**The retry mechanism**
- A scripted hand's goal is checked the instant the 13th trick resolves — *before* Muster is granted
  or any Vanguard action is taken. A miss therefore cannot leave board state behind.
- A miss redeals that same hand-slot: same dealer, no round advance, both hands reshuffled.
- A battle resolves either by a Breach (possible as early as its first hand — later hands then never
  play, so each hand's narrative must stand alone) or by the round cap. Either way counts as the
  city being taken.

**Goals**
- Three uses of one object — a stated target checked against a round's result: **story-gate**
  (mandatory, redeals on miss), **medal** (optional), **decisive-result** (mandatory, accepts either
  winning band). One per hand, never two.
- Must-lose threshold fixed at "fewer than 4." Difficulty escalates through hand strength, never by
  moving the number. Must-win threshold deliberately open-ended at the top.

**CPU**
- A must-lose goal never pairs with a trick-dumping CPU — that pairing can force an unwanted win
  through Fox's own follow-suit rule. The ban follows the goal object, so it covers medal goals too.
- Ties between equally-good legal cards break randomly, so the CPU's line isn't memorizable.

**Muster in a scripted hand**
- Only the *bonus* is authored. The baseline both sides always receive is untouchable.
- The authored bonus goes to at most one side per hand, capped at `MUSTER_BONUS` — mirroring what an
  ordinary round already guarantees.
- The Vanguard has no blocking goal of its own. It keeps "reach the Breach"; the story comes through
  the authored bonus, plus a soft round cap resolved by a coarse board-position proxy → bonus tilt →
  the battle's authorial intent.
- A scripted hand's Clash opener is whichever side did *not* receive that hand's bonus.

**Visibility — all revealed before the one deck commitment**
- The decree, fixed for the whole battle rather than redrawn each hand.
- The enemy general's guaranteed card.
- Every hand's goal direction for the whole battle.

**Card pinning (all pre-shuffle, which is why "played straight" still holds)**
- Decree, CPU guarantee card, and player guarantee card must be three distinct cards.
- A guaranteed Monarch may not share a suit with the decree — that combination is an unconditional,
  zero-counterplay trick loss.
- The trump suit's own Monarch is pinned out of the CPU's dealt hand on any hand the player can win.

**Measured, against the shipped engine**
| What | Number |
|---|---|
| Must-lose "fewer than 4" hit rate (floor, no deck-building) | 24.5% (≈4.1 attempts to clear) |
| Same goal widened to either winning band | 44.9% |
| Player turns per hand that are a real decision | 46.6% |
| Dead tricks per attempt | 3.95 of 13 (30.4%) |
| Ordinary battles hitting the round cap with no Breach | **58.4%** |
| Battles won by whoever won the first War Council hand | **87.5%** |
| Disadvantaged side reaching the Breach in a scripted battle | **0 of 500** |

The last three are the ones to worry about. See "The two structural proposals" below.

---

## The two structural proposals — not yet adopted, not yet tested

Added at the end of the 41-round pass, after a critique correctly pointed out that the rounds had
been auditing this document's internal consistency rather than the game's design. These are the
answer to the design-level flaw, and they are proposals only — the developer's call, untested.

**The diagnosis they respond to.** Three things are currently decoupled from each other: the war's
outcome is fixed by faction choice, a scripted battle's outcome is fixed by retry-until-hit, and the
Vanguard's own result only selects narration. Stack them and almost nothing that happens in play
determines anything — the trick count of a single hand is the only live input in the game, with the
board, the Muster economy and the overworld arranged around it as scaffolding. That also leaves
`concept-critique.md`'s Problem 2 (cards fund the board, the board tells the cards nothing) open, and
it's why the 87.5% and 58.4% numbers above have no mechanism pushing back on them.

**Proposal 1 — the stake is what survives, not who wins.** Keep "the Blues always win." Change the
question from *who wins the war* to *what comes out of it*. A battle's result decides what persists:
veterans lost from the deck, a city held or burned, whether a named general reaches the next chapter.
The campaign always advances — the war grinds on regardless, which is the premise — but the Vanguard
result finally decides something, without ever threatening the fixed ending. This is also the first
real answer to "what does a player who picked the losing faction play for": not victory, but getting
people out.

**Proposal 2 — the board sets the next hand's trump.** `reskin.md` already has map regions carrying
suits, as flavour. Make it a rule: whichever region a side holds when a Clash ends sets the decree for
the next War Council hand. That is the missing board→card arrow. It costs almost nothing (the art and
vocabulary exist), it makes early board play echo forward, and it gives a trailing side a reason to
contest ground it can't win — take the terrain that makes its hand strong next round.

**What they'd need to clear before adoption:** proposal 2 should be simulated against the 87.5% and
58.4% figures, using the harness that produced them. Proposal 1 is a scope decision about the
campaign layer (`ideas-and-concepts.md`), not a rules change this document can settle alone.

---

## The setting

- A fictional stand-in for the American Civil War — fictional country, city, and faction names
  (none chosen yet), but visually and structurally drawn from the real thing.
- **Two factions: the Reds and the Blues.** The player picks a side at campaign start.
- **The Blues win the war — always, no matter how the player plays.** Picking Red means picking to
  lose. That's a story choice, not something the game calculates from battle results.
- Because the story is told from one side, both sides need their own version written — picking a
  side picks which one you read.
- **Neither faction is only-win or only-lose battles.** The Blues winning the war doesn't mean every
  Blue battle is a foregone win, or every Red battle a foregone loss — the historically accurate and
  more interesting shape is the eventual winner still losing plenty of individual engagements along
  the way. Worth stating on purpose once city content is actually authored, so picking Red doesn't
  read as "every fight is scripted to be lost."

---

## Scripted battles — how a "must win" or "must lose" fight works

- A city is fought across several War Council hands — example: a city is 3 separate 13-trick
  rounds.
- **Each hand opens with a stated goal**, shown to the player plainly: e.g. "win fewer than 4
  tricks." Everywhere in this document, that goal describes the **player's** side — the CPU doesn't
  carry a goal of its own, just a hunt/dump behaviour setting. A battle that wanted to gate both
  sides individually (a dual story climax) isn't designed here and would need its own pass; nothing
  below assumes it.
- The Vanguard half of the same battle doesn't get a matching goal object of its own — see "How the
  Vanguard side actually gets what the story needs," below, for why, and what it gets instead.
- **The hand is played completely straight.** Nothing is rigged. Hitting the goal is a real result
  of how the player played, not a hidden override. **The exact line, named explicitly on a
  forty-first pass since four separate fixes have converged on it without ever stating it:** shaping
  *what a hand can be dealt* — the fixed decree, the CPU's guaranteed card, the player's own chosen
  guarantee card, and (for must-win hands) pinning the trump-suit Monarch out of the CPU's pool — is
  fair game and stays "played straight," because it's all input randomness (Engelstein's term: shaping
  what's dealt before a decision, not touching a card's face-up behavior or a trick's outcome after
  the fact). What would cross the line is anything touching a card's printed behavior or a trick's
  resolution once the shuffle is done — nothing in this document does that. Worth a future contributor
  checking a fifth proposed pin against this sentence rather than reverse-engineering the pattern from
  four precedents.
- **Miss it, and the whole hand is redealt on the spot — before Muster or the Clash ever happen.**
  A scripted hand's goal is checked the moment the 13th trick resolves. On a miss, the hand never
  proceeds any further: no Muster is granted, no Vanguard action is taken, nothing changes on the
  board. Only a **hit** hand goes on to fund Muster and the Clash. That's what makes "costs nothing"
  literally true rather than just a feeling — there is no partial board state a failed attempt could
  leave behind, because a failed attempt never reaches the board at all. (For a city fought across
  several hands, only the failed hand redeals; earlier hands in the same battle that already hit
  their goal keep whatever they already funded on the board — nothing about them is touched.)
- Same shape as an Elden Ring boss: you don't lose progress, you just haven't cleared it yet.
- **Not yet true of the shipped code, and this is the biggest of the three gaps this document
  flags, not the smallest.** `submitWarCouncilCard` currently advances unconditionally the moment a
  round completes — no `goal` field exists on `WarCouncilRound`, no check against one, no redeal
  branch. The only place a fresh round ever gets dealt is inside `submitClashAction`'s `Complete`
  branch, which always increments `round` and always flips `dealer` — the exact opposite of what a
  redeal needs (same hand-slot, same dealer, no increment). Building this needs a new field and a
  new branch, not a tweak to the branch that already exists: `WarCouncilRound` gains a `goal`, and
  `submitWarCouncilCard` gains a third outcome alongside its current two — goal met (proceed exactly
  as now) or goal missed (redeal via the same dealing logic `startBattle`/the Clash-Complete branch
  already use, but keeping this hand-slot's dealer and `round` number unchanged). This is the
  mechanism the whole document is about — worth scoping first, not discovered mid-build the way the
  two smaller gaps above were specifically written down to avoid.
- **Neither side plays the same hand twice.** Both hands reshuffle on every attempt. Only a couple
  of specific cards are guaranteed to appear in the enemy general's hand — that's the piece that
  survives a retry, and it's what makes a repeat attempt "the same fight, learned better" rather
  than "an unrelated new deal." Currently set at **one** specific card per general
  (`ideas-and-concepts.md` idea 3) — worth remembering that number when judging how scoutable a
  fight actually is. If that count is raised later, this defense gets stronger; if it stays at one,
  treat "scoutable" as a modest claim, not a strong one. **Stated explicitly, unlike the decree:**
  the guaranteed card holds for every hand of a battle without needing a fix the way the decree did —
  it's a trait of the general/region, not something Fox's own rules redraw per round the way the
  decree is, so there's no equivalent silent-reset risk to correct here.
- After the goal is hit, narrative text explains the result in-fiction — including making a
  required loss make sense in the story ("their information was bad, the general wasn't there"),
  never reading as the player having played badly.
- **This same narrative text needs to cover the routine case, not just the surprising one — corrected
  once already: "every single hand" overstated a rule that explicitly allows an exception.** By
  design, a successful must-lose hand *typically* hands the CPU that hand's authored Muster bonus —
  the CPU is usually the side the story needs pressing toward the Breach. That means the expected,
  designed feedback loop for most won must-lose hands is "I just hit my goal" immediately followed by
  "the enemy just got stronger." That's not a surprise the narrative absorbs after the fact (the
  "their information was bad" tool was written for surprises); it's the routine result of most
  successful attempts, and it needs its own line most of the time, not only when something unexpected
  happens. **This isn't universal, though: the Muster rule itself explicitly allows a hand's bonus to
  go to neither side ("a deliberately even fight"), a case this document's own round-cap tiebreak and
  Clash-opener sections both already build fallbacks for** — a must-lose hand authored that way has
  no bonus for the "enemy got stronger" beat to attach to. Costs nothing new to fix — it's the same
  narrative-text commitment already made above, just correctly scoped: **typical, not universal**,
  and only fires when the scene actually routed the bonus to the CPU. Whoever writes battle narrative
  should still plan a family of lines for this beat, since it's still the common case, not one
  copy-pasted sentence, since this is the one that gets noticed first from sheer repetition, not the
  rare ones this document has spent the most words on.
- **Settled 2026-08-08: a redeal doesn't change who leads first.** Leading matters here more than in
  an ordinary hand — it's the lever behind several of this document's own mitigations (the Swan's
  lead-control, choosing when to test a suit) — so who deals a given hand can't be left undecided
  without quietly handicapping whichever side it disadvantages for the entire life of that scene.
  The minimal, existing-rule answer: each hand-*slot* in a scripted battle gets its dealer the same
  way an ordinary battle already does (Fox's own per-round alternation, `hybrid-concept.md`), and a
  redeal replays that same hand-slot — it doesn't advance to a new one, so it doesn't get a new
  dealer either. This is a structural default (which existing rule applies), not a tuning value; the
  battle's actual first dealer stays whatever `WAR_COUNCIL_FIRST_DEALER` is configured to.

---

## CPU behaviour, and the one pairing that isn't safe to use

The CPU can be set to **hunt tricks** (try to win as many as possible) or **dump tricks** (try to
win as few as possible). That's the whole difficulty dial — a switch, not a search for a precise
outcome.

**Not yet true of the shipped code — and unlike the other gaps flagged in this document, there's no
partial version of this to extend.** `chooseCpuCard` has exactly one behaviour today: when following,
play the cheapest legal card that would win the trick, or the cheapest legal card at all if none
would; when leading, play the cheapest legal card. That's closer to "play efficiently while trying to
win" than the aggressive "maximise tricks" this document calls hunt, and there's no code path
anywhere that would make the CPU prefer a losing play when a winning one is available — "dump" isn't
a weaker version of something that exists, it doesn't exist at all. Building this toggle means
writing a genuine second decision policy (among legal cards, prefer ones that would *not* win,
ducking with the highest safe card rather than the lowest — the mirror of the existing "prefer the
cheapest winning card" logic), plus a mode value threaded in from wherever a hand's goal is
authored — not flipping a switch that's merely unwired. Every claim in this section (the teaching-
beat pairing, the banned pairing, the escalation plan) describes a mechanism that doesn't exist yet;
it happens to already match the one behaviour the CPU does have (hunting, by the loose definition
above) purely by luck of sequencing, not by a check anyone ran.

**Settled 2026-08-08: whichever hunt/dump policy gets built, ties between equally-good legal cards
break by the same `rng` already threaded through every deal, not a fixed ordering.** Found on a
twenty-first pass: with the decree, the goal direction, and the CPU's one guaranteed card all
settled as visible before the hand starts, and the CPU's card-by-card policy a fixed, public,
memorizable rule either way (hunt or its planned dump mirror), the only thing left unknown at the
table is shuffle order — which shrinks fast once a player has learned the toolkit this document
hands them. That's the Thronebreaker complaint this document already defended against at the hand
layer (no fixed hand to memorize, because both hands reshuffle) resurfacing one layer up: a
deterministic opponent policy is just as solvable as a fixed hand, only it's solved once, by learning
an algorithm, not once per hand. Breaking ties on the CPU's own decision rule reuses the RNG already
in the pipeline for exactly this kind of thing, and it costs nothing else: the *aggregate*
hunt-more/dump-less behaviour every prior round's Muster and threshold math was built on doesn't
change, only which of several equally-good legal cards gets played on a given trick. This doesn't
make the CPU smarter or less fair — it makes it not a lookup table.

**What this doesn't fix, named honestly rather than left implicit: several costs this document has
called separately "bounded" are actually compounding, and the tie-break above only closes part of
it — corrected on a thirty-ninth pass to scope which costs actually apply to which goal direction.**
The trick-threshold is permanently fixed (removes decision-branching *within* a hand, both
directions); full pre-battle visibility onto a deterministic CPU converges the hand *and the deck
built for it* toward one learned-once answer (removes decision-branching *from the opponent's side,
and possibly from deck construction itself*, both directions). **The guarantee-card ladder's six-rung
ceiling belongs only to the must-win count** — round 30 found the ladder isn't a must-lose lever at
all (none of its three rungs make a must-lose goal harder), so a must-lose hand compounds two factors,
not three, while a must-win hand — where the ladder is confirmed live — compounds all three.
**The ladder's ceiling specifically is only a live cost for must-win if the campaign actually runs a
must-win battle through six-plus regions** — `hybrid-concept.md`'s still-open two-tier question
(whether every city gets full scripted treatment, or only some escalate to it) directly gates whether
this ceiling is ever reached in practice; worth remembering it's bounded by a number nobody has set
yet, not treating it as automatically severe.
Whether the relevant sum (two factors for must-lose, three for must-win) is still acceptable —
whether the scripted format, once technique is learned, still plays as a decision rather than an
execution check — is a real question this document hasn't weighed
as a sum, only as separate line items. Not resolved here: it's a feel judgement about the whole
format, not a rule to fix.

| Player's goal | CPU hunts | CPU dumps |
|---|---|---|
| Must win | Hard — both want the same tricks | Easy — CPU hands tricks away |
| Must lose | Easy — CPU takes the tricks the player doesn't want | **Not used — see below** |

**Settled 2026-08-08: a must-lose goal never pairs with a CPU that also dumps.** Here's the actual
reason. Fox's own rule is that if you can't follow the lead suit, you may play any card — including
trump, which usually wins the trick outright. That means a player deliberately trying to lose can be
forced to win a trick anyway, purely by what they happened to be holding, not by a bad decision.
That's harmless for a player trying to **win** — an accidental win from a forced play is still a win
they wanted. It only becomes "the system decided this, not me" when the player's actual goal is to
avoid winning. Pairing a must-lose goal with a CPU that's also dumping doubles that risk: both sides
are trying to avoid the same 13 tricks, so whoever runs out of the lead suit first can be forced into
an unwanted win by the rules alone.

The mirror case doesn't need the same fix. A must-win goal against a hunting CPU (both sides trying
to take tricks) doesn't have this problem, because being forced into an outcome you didn't plan for
is never against a trick-hunter's goal — only against a trick-avoider's. So the restriction only
needs to run one direction.

**Tightening the number doesn't, by itself, make a must-lose battle harder — and this document
almost shipped that claim unchecked.** Hunt (CPU) and dump (player) are aligned incentives: both
want the same tricks to end up with the CPU. Whether "fewer than 7" is actually easier than "fewer
than 4" depends on how strong the player's hand is relative to the CPU's — and that's set entirely
by a lever this document doesn't own: `ideas-and-concepts.md`'s leftover-pool strength (deliberately
weak for an easy city, presumably stronger for a hard one) and its guarantee-card ladder idea
(illustrative: 7 Treasure → 9 Witch → 11 Monarch, mildest to nastiest). The threshold defines what
counts as passing; it doesn't generate difficulty on its own.

**Settled 2026-08-08: the trick threshold stays fixed at "fewer than 4" (Humble) for every must-lose
goal, and difficulty escalates through a lever that already exists — not the threshold.** This also
resolves the "band-edge justification runs out at 4" problem the honest version of this section used
to flag — there's no longer a temptation to invent a sub-band cutoff like "fewer than 1," because the
threshold isn't the escalation dial at all.

**Which lever, though, needs its own honesty check, and this document initially skipped it.** Two
candidates already exist in `ideas-and-concepts.md`: leftover-pool strength (weaker or stronger, more
or less suit-concentrated) and the guarantee-card ladder (illustrative: 7 Treasure → 9 Witch → 11
Monarch, mildest to nastiest). They are not equally trustworthy right now. `ideas-and-concepts.md`
itself, in the section it titles "Reopened by idea 3's 2026-08-08 revision," already flagged the
leftover-pool argument as unverified, not wrong outright (its own words: "none of those arguments
are wrong, they're just unverified against the new mechanism"): it was reasoned out when a city's
hand was still fully fixed, and now that the hand reshuffles from a shared pool every attempt (the
same reshuffle this document leans on to answer the Thronebreaker complaint), that document says
explicitly the pool-strength argument
"needs re-deriving... not guessed here." Leaning on it again here, for a second purpose, without
saying so, would repeat exactly the mistake round 6 fixed for the trick threshold itself — citing a
lever without checking that it still moves the needle.

**This document initially settled the guarantee-card ladder as the primary lever without checking
its own citation the same way it had just checked the leftover pool's — an honesty gap caught on the
next pass, corrected here.** The 7 Treasure → 9 Witch → 11 Monarch ladder isn't this document's own
mechanism; `ideas-and-concepts.md` idea 3 states it outright as "**Proposed, not yet decided**...
it's a suggestion from critique conversation, not a developer call yet." Citing it as "Settled" here
was the identical mistake this document had just finished catching itself making for the leftover
pool one paragraph earlier — trusting that a lever named in a sibling document is available for use,
without checking whether that document still (or yet) stands behind it.

**Corrected: neither escalation lever is settled by this document, and — corrected again below —
the ladder turns out not to be the must-lose lever at all once checked against this document's own
card-by-card findings.** Both were originally framed as contingent on a decision that belongs to
`ideas-and-concepts.md` idea 3; that's still true of leftover-pool strength, but the ladder's
suitability for *must-lose* specifically doesn't survive the check below — see "Correction, found on
a thirtieth pass." Until idea 3 settles the pool-strength re-derivation, this document has a
threshold ("fewer than 4," fixed) and no confirmed dial to escalate it with for must-lose goals —
worth surfacing plainly rather than papering over with a premature "Settled." The first must-lose
battle still uses "fewer than 4" as a teaching beat; what makes a later one harder remains an open
dependency this document doesn't own, exactly like the `CLASH_FIRST_ROUND_OPENER` note above.

**Correction, found on a thirtieth pass: the argument above doesn't survive being checked against
this document's own already-established mechanics, for must-lose specifically.** Enumerating what
each of the ladder's three illustrative rungs actually does to a *must-lose* player, using only
findings already in this document:
- **7 Treasure** has no implementation anywhere in the shipped code (`abilities.ts`, `legalMoves.ts`,
  `resolveTrick.ts` — checked directly) and, even built, its point bonus would have nowhere to feed
  into a scripted hand's Muster regardless, per this document's own settlement that a scripted hand's
  bonus is authored, never derived from trick score. (`hybrid-concept.md`'s own open question "do the
  Treasure 7s feed the Muster?" currently has a concrete, if unsatisfying, answer: nothing happens,
  because nothing reads it — worth folding into whenever that question actually gets resolved.)
- **9 Witch** doesn't increase the trump-independent forced-win risk this section names — that risk
  comes from *the player's own* lone 9, not the CPU's guaranteed card. Pinning one specific 9 to the
  CPU actually *removes* it from the shared pool, a small reduction, not an escalation, of the risk
  this rung is supposedly aimed at.
- **11 Monarch** is, per this document's own finding #46, *usually* helpful or neutral for
  must-lose — "a CPU-led Monarch hands the CPU a trick" — with a real, non-tail exception found on a
  31st pass: see below.

**None of the three rungs make a must-lose goal harder.** "Mildest to nastiest" describes an
escalation in raw card power, not in anything a must-lose player experiences — and this document had
already independently proven the third rung's case nine rounds earlier without tracing back to
re-check the argument it undermined. That's the identical shape of gap round 9 fixed once already
("citing a lever without checking it still moves the needle"), recurring one level more specific:
checked for existence and citation-trustworthiness, never re-checked against the card-by-card
mechanism already worked out for two of its three cases. **Settled 2026-08-08 (revised): the ladder's
"nastiest rung" framing is re-scoped to must-win goals, where finding #46 already shows it's a real,
unconditional threat.** For must-lose specifically, neither ladder-based escalation nor leftover-pool
strength is currently a confirmed lever — both are honestly open, contingent on `ideas-and-concepts.md`
re-deriving the pool-strength argument, with the guaranteed card's remaining, real value for a
must-lose hand being what it always was independent of difficulty: a scoutable fact worth building
around, not a harder one.

**A headwind against must-lose escalation that belongs to a different document, flagged here because
it bites hardest at exactly this discussion.** `ideas-and-concepts.md` idea 5's own progression hook
grows the player's guarantee-card slot count as the campaign advances (1 slot at the start, more
later) — and a guarantee slot's entire point is "always hold your best, most relevant card," the
opposite of the only tool this document names for a must-lose hand (loading weak, low-rank cards).
Illustratively, a hand that's ~8% guarantee-locked cards early can become ~30%+ locked later — cards
the player deliberately can't build around for a must-lose goal, no matter how much pre-battle
visibility they're given (round 21's fix doesn't help here, since the constraint isn't missing
information, it's the reward system itself filling slots with exactly the wrong cards for this goal
type). Same honest hand-off as round 26's overworld-consequence gap: this is `ideas-and-concepts.md`
idea 5's design to weigh, not this document's, but whichever lever eventually escalates must-lose
difficulty will be escalating against a campaign-wide trend nobody has sized yet.

**The mirror case (must-win goals) gets the same fix, stated once rather than re-derived later —
correcting a stale example this document caught itself leaving behind.** A must-win threshold is
exactly as vulnerable to the same mistake as the must-lose one: tightening the number while the CPU
stays on one fixed setting doesn't generate difficulty by itself. The fix is the same, singular one
already applied to must-lose — **hold the threshold fixed at one real band edge** (illustrative:
"win more than 6," the Victorious/Defeated boundary), not two values escalating between each other.
**Deliberately left open-ended at the top, not bounded to Victorious (7–9) the way the must-lose
side is bounded to Humble (0–3), and stated on purpose rather than left to be assumed:** a must-win
goal already doesn't use Fox's own scoring table for anything else in a scripted hand — the Muster
this hand produces is authored, not derived from which band the trick count lands in (see the Muster
section below) — so there's no reason to import Fox's separate "don't take too many" nuance into the
goal's own definition either. "Took control of the engagement" is the intent, however many tricks
that took; a player who dominates into the Greedy range hasn't failed the story goal, even though
that same trick count would score zero in the base game's own, unrelated point race.
An earlier draft of this paragraph described "escalating toward" a second, tighter value, which both
contradicted the fixed-threshold conclusion it was supposed to be citing and had the two illustrative
numbers backwards (a narrower band is the harder target, not the easier one). **Unlike the must-lose
side, the guarantee-card ladder is a confirmed escalation lever here, not an open one** — finding #46
already established the Monarch rung as a real, unconditional trick-loss threat specifically for a
must-win player, and the Witch/Treasure rungs' must-lose-side problems (no effect, or a slight
reduction of an unrelated risk) don't apply in this direction either, since neither rung was ever
claimed to hinge on a risk that's still must-lose-specific. Leftover-pool strength remains the
secondary, still-open lever, contingent on `ideas-and-concepts.md`'s re-derivation, same as before.

**Banning the CPU-dumps pairing halves this risk — it doesn't remove it.** Being forced to play
trump because a player has run out of the lead suit is a property of *that player's own hand*, not
of what the CPU happens to be doing. A hunting CPU doesn't create the risk, but it doesn't prevent
it either — a must-lose player can still be forced into an unwanted win by voidness alone, with any
CPU setting. This is smaller than the doubled version (only one side's hand shape is in play, not
both sides colliding on the same instinct), but it's real, and tightening the cutoff toward 0 as
battles escalate leaves less room to absorb one unlucky forced win.

The mitigation that already exists in this design, rather than a new one: **decree visibility for
scripted battles** (see "Tools the player has," below) means the player knows the trump suit before
building the deck for one of these fights. A deck built deliberately light on that suit lowers the
odds of ever being void-and-holding-only-trump in the first place. It doesn't remove the risk —
the shared draw pile can still hand the player a trump card despite their choices — but it turns
"hope I don't get stuck" into a real deck-building decision, the same way the rest of this document
treats a losing goal as something to build toward, not something to survive on luck. **Open:** how
often this actually bites hasn't been measured — worth a quick simulation before this goal type is
paired with the stronger, more suit-concentrated leftover pools a later must-lose battle is meant to
escalate with (see "Tightening the number doesn't..." below) — a concentrated hand is exactly what
makes running void, and this risk, more likely.

---

## A scripted hand's Muster is authored for both sides, not read off the raw trick count

**Grounded against the actual shipped rule, not just the design doc's illustrative table — and
corrected once already: the collapsed "1–3" framing belongs to `reskin.md`, not `hybrid-concept.md`.**
`hybrid-concept.md`'s own scenario table lists four distinct trick-split rows, each with its own
specific point value (0–3/10–13 → 6/0 Ambush; 4/9 → 1/6; 5/8 → 2/6; 6/7 → 3/6 Pitched Battle), not a
collapsed range — `reskin.md` is where the "1–3" shorthand actually comes from. The substance survives
either citation (the asymmetric-payout point is the same), but the code that actually ships it
(`src/vanguard/musterConversion.ts`) simplifies either version to a flat
rule — both sides always get a baseline (`MUSTER_BASELINE`), and whichever side scored higher under
Fox's own point bands (`tricksToPoints` — 0–3 and 7–9 both score 6, 4/5/6 score 1/2/3, 10–13 scores
0) gets one flat bonus (`MUSTER_BONUS`) on top; the other side gets none. The shape this document
cares about survives that simplification intact: **whoever lands in 0–3 still outscores whoever
lands in 10–13**, so the paired, zero-sum problem below is exactly as real under the shipped rule as
under the illustrative one — it's just a flat bonus-or-nothing now, not a graduated 1–6.

The normal Fox → Muster rule pays the trick bands that land at 0–3 or 10–13 in a paired, zero-sum
way: the side that lands on 0–3 outscores the side that lands on 10–13, so it gets the bonus, and
**whichever side that leaves on 10–13 gets nothing.** That rule was built for an ordinary, contested
hand, where both sides are genuinely trying to win. A scripted hand breaks that assumption on
purpose, and running the actual numbers through it shows it breaks in two places, not one:

- **The narrative/reward contradiction already found:** this document's own must-lose example
  ("win fewer than 4 tricks") lands in 0–3 — the *Ambush* band. Played straight, a required defeat
  would hand that side the single best tactical position in the game, the moment it succeeds.
- **A second, symmetrical problem the first fix didn't catch:** whoever is on the other side of that
  hand — the CPU, set to hunt tricks specifically because the story needs it to — necessarily lands
  in 10–13, the *Greedy* band, which the same table pays **zero bonus**. So the side doing exactly
  what the scene asks of it (hunting, to help the player's must-lose goal land) earns no bonus for
  succeeding at its assigned role, on top of whatever baseline it already gets. Tracing this through
  a full example makes it concrete: if the CPU's only *bonus* for correctly hunting is 0 every time,
  it's left pressing toward the Breach on baseline moves alone — which might still be enough given
  enough hands, but it's clearly not what the story intends when it specifically set the CPU to hunt
  in order to help this side advance. A fix that only touched the player's own bonus leaves the side
  that's supposed to be *winning* the city under-resourced relative to its story role.

**Settled 2026-08-08 (revised twice): a scripted hand only replaces the *bonus* half of Muster — the
baseline stays exactly what it already is everywhere else.** `hybrid-concept.md` and
`skirmish-board-replacement.md` already split Muster into two pieces on purpose: a **baseline both
sides always get, regardless of the War Council's result**, plus a **bonus** for whoever won that
round's trick count. That baseline exists specifically to prevent a Hex-style wipeout — the exact
failure this whole board replaced Hex to fix (`concept-critique.md` Problem 1) was one side getting
zero moves outright. The first version of this fix authored *both* pieces for a scripted hand, which
quietly threw that floor away — nothing stopped a scene from writing "1 Muster total" for a
disadvantaged side, which a multi-hand battle could turn into a mathematical inability to ever reach
the Breach, not just a low chance of it. That's not a smaller version of the story-forcing problem
this document keeps fixing — it's the same one, just moved to a number instead of a table.

**The corrected version: the trick count keeps exactly one job in a scripted hand — deciding whether
the goal is hit, which gates the redeal — and only the *bonus* is authored, never the baseline.**
Both sides still receive their full, always-guaranteed baseline Muster every hand, exactly as in an
ordinary city fight. What the scene's writer sets directly, instead of reading it off the trick band,
is each side's bonus on top of that floor. This reuses the baseline+bonus shape the design already
has rather than replacing it, and it means the numeric failure mode above is no longer possible by
construction: the floor is the same floor every ordinary round already guarantees, not a new number
an author could accidentally set to nothing.

**Settled 2026-08-08 (revised): an authored bonus goes to at most one side per hand, capped at
`MUSTER_BONUS` — mirroring the actual invariant the shipped code already guarantees, not a weaker
paraphrase of it.** The first version of this fix only capped each side's value independently, which
missed what `convertScoreToMuster` actually does: because Fox's 13 tricks always split into two
counts that sum to an odd number, an ordinary round's two scores are never equal either, so **exactly
one side ever receives `MUSTER_BONUS` — never both, never neither.** A per-side cap doesn't reuse
that invariant, it only echoes half of it — nothing stopped a scene from writing `+3` for *both*
sides in the same hand (a plausible, even natural, choice for "an intense, evenly matched clash"),
which would hand out about 18% more total Muster than any ordinary round can ever produce
(`2×MUSTER_BASELINE + 2×MUSTER_BONUS` vs. the ordinary ceiling of `2×MUSTER_BASELINE + MUSTER_BONUS`)
— pushing the board's pacing and evaluation difficulty in exactly the direction
`hybrid-concept.md` and `skirmish-board-replacement.md` already flag as the harder, still-open
problem. It would also have quietly broken the round-cap tiebreak two sections below, which resolves
a tie by favoring whichever side the battle's bonuses tilted toward — a battle authored with
symmetric bonuses in every hand has no tilt to break a tie with. The corrected rule closes both at
once: a scripted hand's authored bonus may go to one side, capped at `MUSTER_BONUS`, or to neither —
never to both. Both sides can still be pointed in different directions across a battle's hands (the
gated side earning the bonus less often, the side the story favors earning it most hands), but no
single hand can hand out more total Muster than an ordinary, unscripted round already can.

**What this costs, honestly:** the rest of this design's hybrid identity leans on the card game and
the board genuinely talking to each other — a hand's real trick count driving the board's real
resources, the two-way coupling the whole concept is built around. Decoupling the *bonus* from trick
count for scripted hands trades a slice of that coupling for a guarantee the story needs, while
leaving the baseline (the part doing the actual safety-net work) untouched. That trade is bounded on
purpose: it only touches the bonus half of Muster, only in the handful of authored, blocking story
beats, never the ordinary city fights that make up most of the game, where the raw rule keeps running
exactly as `musterConversion.ts` already implements it.

**Not yet true of the shipped code, and worth flagging so a future implementation task doesn't
discover it mid-build:** `beginClash` currently runs a fixed pipeline — `scoreRound(tricksWon)` then
`convertScoreToMuster(score)`, with no place for a scene to inject an authored bonus instead of the
computed one. Building this mechanism needs a new parameter path into that step (or an equivalent),
not just a design decision — a small, concrete piece of scope for whichever contract implements
scripted battles, not something this document can resolve on its own.

---

## What actually makes a scripted battle matter, if failing costs nothing

Missing a goal costs nothing — the player just tries again. The war's ending is fixed by which side
was picked, not by anything done in a fight. So nothing about a scripted battle can be permanently
lost. **That's on purpose, not an oversight** — worth writing down what it does and doesn't cost:

- **What doesn't create stakes:** losing a specific attempt. That's deliberately free, the same way
  an Elden Ring boss doesn't punish a death — no build is lost, the player just hasn't won yet.
- **What does create stakes:** the hand actually in front of the player, right now. Hidden
  information means a single wrong lead can cost the goal for this attempt, even though nothing
  permanent is on the line. The tension lives in the moment, not in the consequence.
- **What actually moves the campaign forward:** clearing cities and travelling the map
  (`ideas-and-concepts.md` idea 4 — shorthand here for what that idea actually describes: a navigable
  overworld where reaching *any* node triggers a fight, and progress is gated by car attachments
  unlocking new terrain, not literally a "cities cleared" counter). That's what gives the game a
  sense of progress and an eventual end — not battle attrition. A costless retry doesn't remove
  pacing pressure from the game overall;
  it just means that pressure lives in "how many cities are left," not in "did this attempt cost me
  something."

---

## Tools the player has to chase a goal, especially a losing one

- **Deck construction, aimed deliberately.** The guarantee-card and shuffle-in slots
  (`ideas-and-concepts.md` idea 5) work the same either direction — loading weak, low-rank cards
  raises the odds of staying under a losing threshold, the same mechanism used to build toward a
  win, run backwards.
- **Voiding a scouted guaranteed suit specifically, not just going light on trump.** Since the
  guaranteed card is visible before the fight, a deck built with zero cards of that specific suit
  defeats the Monarch's forcing clause outright ("if your opponent has a card of this suit" — a void
  hand never triggers it) — a sharper, free-standing technique alongside the general trump-avoidance
  one below, for whichever hand actually faces that guaranteed card.
- **Decree (trump) visibility for scripted battles.** The player needs to see the trump suit before
  building a deck for one of these fights, so they can plan around it. Whether ordinary,
  non-scripted cities also reveal trump ahead of time is a separate, still-open call. **This
  protects against a bad draw, not against a live opponent decision — worth stating exactly that
  strongly and no stronger, per the finding right below.**
- **Settled 2026-08-08: that one visible decree covers the whole battle, not just its first hand.**
  A scripted battle is several hands (illustrative: 3), and deck construction is a once-per-battle
  setup step — but base Fox draws a fresh decree every round, which would mean a deck built around
  hand 1's trump is flying blind for hands 2 and 3, quietly breaking the mitigation this document
  leans on hardest. The fix costs nothing new: `ideas-and-concepts.md`'s existing rule that a city's
  decree is "static per city, not drawn from the leftover pile" already covers this — it just needed
  saying explicitly here too. One trump, revealed once, holds for every hand of the battle it's set
  for. (The Fox (3) card can still swap the decree mid-hand per its own printed ability — that swap
  only lasts "the rest of the round," i.e. that one hand; the next hand of the same battle reverts to
  the battle's canonical decree, not the swapped one.)
- **Settled 2026-08-08: the player also sees every hand's goal direction for the whole battle before
  building the one deck they're locked into, not just the first hand's.** This is the same visibility
  principle already applied twice (the decree, the guaranteed card) missing a third variable it
  governs just as directly. A once-per-battle deck is a single commitment; nothing stops a battle
  from mixing a must-lose hand and a must-win hand (the campaign explicitly wants this variety —
  "the eventual winner still losing plenty of individual engagements along the way" — so this isn't
  a contrived case, it's the shape the narrative ambition points straight at). The two goal
  directions want opposite trump counts: a deck built light on trump to survive a must-lose hand
  raises exactly the zero-trump probability that causes a forced-loss risk on a must-win hand later
  in the same battle (illustrative, using the base 33-card deck's own math since idea 5's actual pool
  numbers are still open: an ordinary hand's chance of holding zero trump is roughly 0.14% (the
  decree itself accounts for one trump card, leaving a 32-card pool of 10 trump/22 non-trump to deal
  the hand from); shrinking the deck's controllable trump down to a few remaining cards raises that
  by roughly two orders of magnitude, to the high-teens percent). Without this settlement, a player
  who follows this document's own must-lose advice correctly could walk into a
  must-win hand they didn't know was coming, sabotaged by their own correct play on the hand before
  it — precisely the "the system decided this, not me" failure this document works hardest to keep
  out of the must-lose case, reached from the direction nobody had checked.
- **The same full pre-battle visibility may leave deck construction itself with little room for
  Meier's "expression" test — a cautious build and an aggressive build converging on the same
  answer.** With decree, goal direction, and the guaranteed card all known, and this document's own
  must-lose technique already single-axis (minimize trump, load low ranks, watch the guaranteed
  card's suit for a lone 9), there may not be more than one good deck to build against a given
  scripted hand. Same root cause as the CPU-determinism finding below, not sized separately — named
  here so the two aren't mistaken for independent costs.
- **Open, found on a twenty-eighth pass: which side a hand's authored Muster bonus favors is a
  fourth variable this same visibility pattern governs, and it's the one left unexamined.** Decree,
  guaranteed card, and goal direction are all revealed before the once-per-battle deck commitment,
  for the same reason each time — a decision made blind on a fact the design already knows is a
  Meier failure. The bonus destination is the identical shape of fact, and it now has a real
  downstream consequence (it decides the Clash opener, per the settlement below). Left unrevealed,
  a player learns it only at Muster-conversion time — after the trick-count decision that mattered is
  already over, an invisible consequence by the same test the other three variables were fixed
  against. Unlike those three, though, this isn't a free fix: extending full pre-battle visibility a
  fourth time deepens the exact cost the CPU-determinism finding below already names — every
  additional pre-revealed variable pushes a scripted hand further toward a solvable, memorizable
  line rather than a played decision. Whether to reveal it, or deliberately leave it as the one thing
  that stays a surprise, is a real trade either way — not decided here.
- **Not yet true of the shipped code, and this one is actively contradicted by a line that already
  runs, not just missing.** `dealRound` always shuffles a fresh 33-card deck and takes an independent
  random decree — there's no parameter to pin it to a prior value. Worse, the one place a multi-hand
  battle already deals its next round (`submitClashAction`'s `Complete` branch) already calls
  `dealRound(dealer, rng)` with no decree override, today — run any multi-hand battle through the
  current orchestrator and hand 2's trump is unrelated to hand 1's, every time, no scripted-battle
  machinery required to see it. This isn't a hypothetical gap alongside the others; it's the one
  piece of this document's mitigation toolkit that's actively false the moment more than one hand is
  played. Fixing it needs a fixed-decree value threaded through every deal in a battle, the same
  shape of missing plumbing as the redeal mechanism and the authored Muster bonus (see the note
  below).

**In-hand technique, not just deck-building — three of Fox's own cards already answer the residual
forced-win risk (see the CPU section above), found by actually playing a must-lose hand out card by
card rather than reasoning about it in the abstract:**

- **Count the trump, and lead your own only when a bigger one is still out there.** Leading trump
  doesn't reliably shed it — trump usually *wins* whatever's on the table, so leading it blind would
  hand a must-lose player exactly the win they're trying to avoid. The card is visible face-up during
  every trick before it's collected, so a player who's been tracking which trump ranks have already
  appeared can identify a point late in the hand where they're fairly confident the opponent still
  holds a higher one — and lead their own trump *then*, expecting to lose it on purpose to a bigger
  card, rather than waiting to be forced into an unwanted win by voidness elsewhere. This is ordinary
  trick-taking card-counting, not a new rule; it's worth naming because it's the one technique here
  that actually gets rid of trump on the leader's own terms, on a trick they chose, instead of one the
  rules chose for them.
- **The Swan (1)'s "penalty" is a benefit here.** Its ability — "if you play this and lose the
  trick, you lead the next trick" — is written as a downside in the ordinary game (leading is often
  the weaker position). For a must-lose player, losing the trick is the goal, and leading next means
  choosing which suit gets tested next, letting the player steer *away* from a suit they're about to
  run out of, instead of waiting to be forced off it. Worth calling out in-fiction and in any tutorial
  text for a must-lose scene, since it's an existing card doing new work for free.
- **The Woodcutter (5) lets a player discard a drawn trump card before it becomes a liability** —
  draw one, discard any one to the bottom of the deck. A must-lose player who draws an unwanted trump
  mid-hand has an existing, in-game way to get rid of it rather than being stuck holding it.
- **The Fox (3) can detrump a player's own overloaded suit.** Its ability exchanges the face-up
  decree card with a card from hand — which changes the *trump suit itself* for the rest of the
  round. A player who ends up holding more trump than planned can swap the decree for a card of a
  suit they barely hold, making their excess cards ordinary again (at the cost of revealing that card
  to the opponent). This is a real, played choice, not a guarantee — but it's a genuine second lever
  beyond deck construction, and it was already sitting in the base game's card list. **The one way to
  misuse this for a must-lose player, worth a warning rather than its own trigger:** exchanging
  toward the suit of the Fox card *currently being led* (not just any suit in hand) turns that lead
  into trump immediately, per the rulebook's own before-the-follow timing — a must-lose player should
  never detrump toward their own led suit specifically, or they'll hand themselves the exact unwanted
  win this whole section exists to avoid.

**A second, independent cause of the same problem, found the same way — the Witch (9) doesn't need
trump at all.** Its ability treats a *single* Witch in a trick as if it were trump, whether or not
its actual suit is trump that round. That means a must-lose player can be handed an unwanted win by
playing their last card of an ordinary suit and having it turn out to be that suit's own 9 — no
voidness, no trump, nothing about the CPU pairing involved. The same discipline that manages trump
(track it, don't get stuck holding a suit's last card unmanaged) applies here too, and Woodcutter is
the cleaner tool for shedding a lone dangerous 9 specifically — discarding it outright, rather than
Fox's swap, which would also hand the 9's own suit the trump role for the rest of the round and could
reintroduce the same problem somewhere else in the hand.

**A fourth trigger, structurally different from the other three — a decision trap, not a legality
one, found on a thirty-third pass.** Voidness, the lone Witch, and the Monarch's constrained response
are all *legality* traps: the player has no legal alternative. Leading has no such constraint (any
card may be led), but late in a hand a trump-light, low-rank-loaded deck can be exhausted down to a
remainder where every remaining card is an objectively strong lead — nothing forces a specific card,
but nothing safe is left either. Narrower than the other three (a player tracking cards, per the
technique already catalogued, can usually see it coming and time around it), so it's named alongside
them rather than given its own fix.

None of this makes the residual risk (see the CPU section, above) zero. It does mean a must-lose hand
has real, learnable technique behind it rather than being "build a deck light on trump and hope" —
worth remembering when judging how much of a Koster-style skill ceiling this goal type actually has.

**Open — the shipped CPU can retrump the decree mid-hand, and that's a bigger hole in "decree
visibility" than a residual risk; it's a live opponent decision, not bad luck.** Checked directly
against `src/warCouncil/cpuPlayer.ts`: `chooseCpuFoxChoice` has the CPU exchange the decree for the
lowest card of *its own* strongest suit, every time that suit isn't already trump. That's not rare —
a 13-card CPU hand has roughly a 79% chance of holding at least one Fox out of a ~33-card pool, and
the CPU's strongest suit not already matching the scouted decree is plausible on most reshuffled
hands. So a player who built a deck deliberately light on the scouted trump suit can have trump
redefined mid-hand to whatever suit the CPU happens to be heaviest in — almost certainly not the
suit they planned around — with no warning. Decree visibility was written as "a real deck-building
decision"; against this, it's closer to "protects against the deal, not against the opponent," which
is a real but weaker guarantee than the document originally claimed.

**This is a behavior/tuning call, not a rules bug, and it isn't decided here:**
- **Make the scripted battle's canonical decree immune to a Fox exchange.** Cleanest guarantee, but
  Fox would behave differently in a scripted hand than an ordinary one — a rule players have to learn
  twice.
- **Leave the rule as shipped, and be honest that decree visibility is a partial mitigation**, not a
  lock — matching how this document already treats the trump/Witch forced-outcome risk itself
  (named, not eliminated). If left this way, it's at least partly learnable: `chooseCpuFoxChoice`'s
  retrump target is deterministic (the CPU's own most-held suit), not random, so a player who's been
  counting cards can read whether the CPU is sitting on a suit-heavy hand and anticipate the swap —
  worth adding to this section's technique list if this is the direction taken.
- **Change only the CPU heuristic** so it doesn't retrump away from a scripted battle's canonical
  decree specifically — cheapest code change, but only right if the CPU is meant to always play
  "fair" in this one specific sense, which is itself a design opinion.

Which of these — if any — is worth doing is the developer's call.

**The must-win side has the exact mirror risk, found on a ninth pass, and this document had only
ever walked one direction of it.** Fox's own resolution rule cuts both ways: a follower void in the
lead suit who *also holds zero trump* cannot win that trick no matter what they play — their card is
neither trump nor in the lead suit, so the rule ("if neither card is trump, the higher-ranked card in
the lead suit wins") hands it to the leader automatically. That's a guaranteed, forced loss, purely
from hand shape, at potentially the worst possible moment for a must-win player running out of tricks
to reach their target — the structural twin of the forced-win risk the rest of this section spent
three rounds solving, just running in the opposite direction. The existing toolkit was built pointing
the wrong way for it (every technique above solves *too much* trump); it extends cleanly rather than
needing a new one:

- **Fox (3) can retrump instead of detrump.** A must-win player worried about going trump-dry can
  swap the decree toward a suit they still hold plenty of, importing trump into their own hand
  instead of removing it.
- **Leading the Fox and exchanging toward its own suit turns that same lead into trump immediately,
  not just a setup move for later tricks — checked against `fox-in-the-forest.md`'s own FAQ timing
  rule** ("a 3's decree change happens before the winner is determined, and the new trump suit
  decides the current trick"). A follower with none of that suit may play anything, but anything
  outside it auto-loses to trump; a follower who does hold that suit must follow with it, and since
  both cards are now trump, only rank decides — the Fox (rank 3) still loses to most replies, but it
  denies the follower any of their strength in every *other* suit for that trick either way. A more
  aggressive option than the retrump entry above, not a restatement of it.
- **Woodcutter (5) can fish instead of shed.** Drawing a card on the chance it's trump, and discarding
  something else instead, is the same ability aimed at the opposite need.
- **The Swan (1) still lets a must-win player steer**, by choosing to lose (on a trick that doesn't
  cost the goal) specifically to lead next and avoid testing a suit they're about to run void in.
- **The Witch (9) mirror exists here too:** a single *opposing* Witch can deny a must-win player a
  trick they were otherwise positioned to win, the same ability that can hand a must-lose player an
  unwanted one.

This is named rather than fixed, matching the treatment already given to the must-lose analog: real,
learnable technique exists, and it doesn't make the risk zero.

**The escalation ladder's own "nastiest" rung was never played out, unlike every other odd card in
this section — and it turns out to be categorically worse than the trump/Witch risks above, in the
opposite direction.** The Monarch (11)'s printed ability, checked directly against
`fox-in-the-forest.md` and the shipped `legalMoves.ts` (which implements it exactly as printed,
today, not a future gap): leading it forces the opponent to play either their Swan of that suit or
their highest card of that suit — at most rank 10, since only one 11 exists per suit. Tracing both
resolution branches: if the suit is trump, both cards are trump and the 11 outranks anything the
response can be; if the suit isn't trump, neither card is trump either (the response is confined to
that one suit, not "any card"), so the higher card in the lead suit wins — still the 11. **The
responder only escapes if their forced "highest of suit" happens to itself be the Witch (9) and the
suit isn't already trump** — the Witch's own single-card-as-trump rule would then flip the result in
the responder's favor, the one narrow out. Absent that, leading a guaranteed Monarch against a
holder of that suit isn't a probability to manage, the way the trump-voidness and lone-Witch risks
above are — it's a certainty.

**The response is a real choice, not a forced pick, checked directly against `legalMoves.ts` — the
responder plays whichever of Swan-of-suit or highest-of-suit they hold, both offered as legal
whenever both are held.** Swan (rank 1) can never outrank the led 11 under either resolution branch,
so this never changes who wins the trick — but Swan's own printed ability ("if you play this and
lose the trick, you lead the next trick") still fires, since the loss is guaranteed. A responder
holding that suit's Swan gets to choose it: a card they were going to lose with anyway, in exchange
for controlling the next lead — close to a dominant choice whenever it's available.

**Why this belongs in the escalation-ladder discussion, not a new residual-risk section:** the
harm runs in the opposite direction from every other risk in this section. A CPU-led Monarch hands
the CPU a trick — usually helpful or neutral for a must-lose goal, since that's exactly what the goal
wants (the exception below). For a must-win goal, the identical mechanic hands the CPU an uncontested
trick at a moment of its choosing, with no defense but the narrow Witch-response escape above and the
Swan-choice above (which helps positioning, not the trick's outcome), for as long as the player
holds that suit.

**The exception: "helpful or neutral for must-lose" isn't quite universal either, once the
Swan-choice above is traced against the lone-Witch risk found in rounds 2–3.** If a must-lose
responder's forced "highest of suit" is that suit's own Witch (9), and they *don't* also hold that
suit's Swan (so there's no alternative to choose instead), playing the forced Witch flips the trick
to the responder — an unwanted win, the same trump-independent risk this document already devotes a
full section to, arriving through a third trigger (a Monarch's forcing clause) that section never
enumerated alongside voidness and holding a suit's last card unmanaged. Roughly one in seven hands
holding that suit will land in exactly this shape (holding the Witch as highest-of-suit, without the
Swan) — a real, non-tail rate, not a corner case, worth an exact recomputation once the pinned-card
dealing algorithm (this document's own still-open seventh gap) exists and changes the pool this draws
from. The mitigation is the one already catalogued: a must-lose deck built light on that suit, or a
player who's discarded the risky Witch via Woodcutter before the Monarch is ever led, closes it the
same way it closes the original lone-Witch risk. Since idea 3 frames the guarantee as a *regional* trait — the same card across every
battle a region's generals fight — and round 21 already established that a region mixing must-win
and must-lose hands is the intended shape, not an edge case, the ladder's advertised "nastiest" rung
would land almost harmlessly on the must-lose hands it's meant to escalate and land hardest on
must-win hands nothing in this document ever pointed it at.

**A second, more severe exception, found on a thirty-sixth pass — this one has no escape at all, in
either direction, and needs a rule, not a caveat.** Everything above assumes the Monarch's suit isn't
trump. When it is, both cards in the trick are trump by the ordinary rule, not the Witch's special
case, and rank alone decides: the forced response (Swan or highest-of-suit) can be at most rank 10,
so the led Monarch (11) always wins. Being void of that suit doesn't escape it either — trump beats
any non-trump card outright, so a void responder loses to the led trump just as surely. **Every other
forced-outcome risk in this document — trump-voidness, the lone Witch, the ordinary Monarch case — is
at minimum probabilistic and has a real, playable countermeasure.** This one doesn't: no deck built,
no card counted, no suit avoided changes the result, because avoiding the suit means avoiding trump,
which loses to the same led card by the ordinary rule instead of the forcing clause. This can only
happen if an author pairs a region's guaranteed Monarch with a battle whose fixed decree is that same
suit — two facts owned by different authoring moments (the guarantee is region-scoped, per idea 3;
the decree is battle-scoped, per round 30) that the existing pairwise-distinctness rule (rounds 15,
18) never checked against each other, because that rule stops at *card identity*, not *suit*. It cuts
the other way for must-lose (it closes the one-in-seven Witch-escape risk above entirely, since that
escape needs the suit to *not* already be trump), but for a must-win hand it is the one truly
zero-counterplay outcome in the whole design. **Settled 2026-08-08: extended the existing
pairwise-distinctness rule one level — a region's guaranteed card, if it's the Monarch, may not share
a suit with a battle's fixed decree.** Same shape of authoring-time check already in place for card
identity, one more field, no new mechanism. **Free, added regardless of the rule above:** "build the
deck void of a scouted region's guaranteed suit specifically" belongs in "Tools the player has" next
to the trump-avoidance technique — it defeats the ordinary (non-trump-suit) Monarch case outright and
costs nothing to state now, since it reuses the guarantee-card-visibility settlement already made.

**That fix only closed the version an author would deliberately create — the version that happens by
ordinary chance is roughly six times more likely, and this document hadn't considered it (fortieth
pass).** The Monarch of the trump suit doesn't need to be anyone's guarantee to end up in the CPU's
hand — it's an ordinary card, redealt fresh every hand along with the rest of the deck (round 30
pins only the specific *decree card* for the whole battle; every other card of that suit, including
its Monarch, reshuffles normally each hand). Any single non-pinned card lands in the CPU's 13-card
hand with probability 13/32 ≈ 40.6% (32 cards remain once the decree itself is set aside). Across a
battle's independently-redealt hands (illustrative: 3), the chance the CPU holds the trump-suit
Monarch in at least one of them is `1 − (19/32)³ ≈ 79.1%` — a battle-wide exposure roughly six times
the near-zero rate the authored-collision fix above actually addresses, and one the fixed-decree
persistence (round 30's own fix for the must-lose case) directly causes: pinning one decree across
several hands gives the natural Monarch three independent chances to land somewhere dangerous instead
of one. It's also invisible where the authored case at least was scoutable — nothing marks this
suit's Monarch as a threat the way a declared guarantee card would, and voiding the suit doesn't help
here either, per the same resolution trace above (a void responder still loses to trump). **Settled
2026-08-08: the fixed-decree-suit's own Monarch is pinned out of the CPU's dealt hand for must-win
hands specifically**, reusing the exact "remove a card from the pool before shuffling the remainder"
primitive the seventh-gap dealing fix already has to build for the decree and the two guarantee
cards — one more entry in a list already being threaded through, not a new mechanism. Must-lose hands
need no such pin, since finding #61 already shows this exact combination is harmless-to-helpful in
that direction. **Worth checking once decisive-result goals (finding #67) are actually authored:**
that third goal type is neither must-win nor must-lose by this document's own three-way split, so
nothing currently states whether it inherits the Monarch pin — a decisive-result hand still lets a
player win via the Victorious band, so the same must-win risk applies; the pin should probably travel
with "can be won," not with the must-win label specifically.

**Currently quiet, not currently safe:** the shipped CPU always leads its single lowest-ranked card,
so it will almost never voluntarily lead an 11 today except as a last resort. The moment the
hunt/dump policy this document already calls "not yet built" actually gets built, leading a
guaranteed, unconditional trick-winner is close to the single best move a genuinely hunting policy
could make — finishing an already-acknowledged gap in this design is what turns this from a quiet
fact into a live one.

**Options, not a pick — this is a content choice about the ladder itself, the same authority this
document has already declined to exercise for which lever escalates difficulty at all:**
- Accept it as a bounded cost specific to the ladder's top rung, the same shape of trade accepted
  elsewhere in this document.
- Extend the pairwise-distinctness pattern already used for the decree/guarantee-card collision
  (a rule, not a new mechanism): a region's guaranteed card may not be paired with a must-win hand if
  it's severe enough to be an unconditional trick-winner when led — currently only the Monarch.
- Exclude the Monarch from the must-win side of the ladder specifically, keeping it only where it's
  already harmless (must-lose hands).

Which of these — if any — is right depends on a fact this document doesn't own: whether idea 3's
"regional trait" is fixed per region (forcing every hand in that region to share it, must-win and
must-lose alike) or can vary per battle. That single decision settles whether this needs a fix at
all, or is already tunable away for free once made.

**One more free lever, cross-referenced rather than re-solved — but it leans on a question this
document hadn't actually settled.** The enemy general's single guaranteed card
(`ideas-and-concepts.md` idea 3) can itself be set to a trump card or a suit's own 9. Done
deliberately, that turns this section's "residual risk" into an intentional, scoutable teaching beat
— *if* the player can actually see that card before the fight. `ideas-and-concepts.md` lists that as
open ("is a city's guaranteed card(s) visible to the player before the fight ... or discovered only
by fighting them?"), and this section was quietly assuming the answer instead of stating it — the
same silent-borrow this document already caught itself doing once, with decree visibility.
**Settled 2026-08-08, matching that precedent exactly: for scripted battles specifically, the
guaranteed card is visible before the fight, same as the decree.** Ordinary, non-scripted cities are
left exactly as open as `ideas-and-concepts.md` already has them. With that stated on the record
rather than assumed, the teaching-beat lever above is real: the player who scouts the guarantee card
does learn which forced-win trap that fight is built around. **Small authoring note, not a fix:** if
a battle mixes goal directions across its hands (see the deck-lock-in settlement above), a
guarantee card chosen to teach the must-lose trump lesson persists into a later must-win hand too,
where it may not teach anything relevant — worth a line in whatever authoring guidance eventually
covers mixed-direction battles, not its own resolution here.

---

## One system, three jobs

A story-gate goal, the bronze/silver/gold medal goal (`ideas-and-concepts.md` idea 7), and a
decisive-result goal (added on a thirty-ninth pass, see the pivot-lock section below) are the same
object — a stated target checked against a round's result — used three ways:

| | Story-gate goal | Medal goal | Decisive-result goal |
|---|---|---|---|
| Mandatory? | Yes — blocks progress until met | No — chased for its own sake | Yes — blocks progress until met |
| On miss | Scene replays | Nothing; just doesn't earn that tier | Scene replays |
| Accepted range | One band only (a specific side must lose or win) | Whatever idea 7 settles | Either winning band (0–3 or 7–9) |

**Why the third row exists, and why a story-gate goal never gets it:** widening a must-lose goal to
accept both winning bands was tried once (round 24) and found to quietly stop guaranteeing a defeat —
a player taking 8 tricks (Victorious) satisfies the same mandatory pass a player taking 2 tricks
would, which is fine for a scene that only needs *some* decisive outcome and wrong for a scene that
specifically needs this engagement to read as a loss. Splitting the two into separate uses of the
same object, rather than widening the story-gate object itself, keeps the guarantee intact for
whichever scenes actually need it. **A side benefit worth crediting, found on a fortieth pass:** any
hand authored as a decisive-result goal needs no directional trump bias at all, so a battle that uses
one in place of a must-win or must-lose hand doesn't compound round 21's deck-conflict problem (a
must-lose hand and a must-win hand in the same battle wanting opposite trump counts) the way a pure
must-lose/must-win mix does — not a fix for that problem on its own, but a real mitigation this
document hadn't noticed it was getting for free.

**A hand carries one or the other, not both — and the contradiction example is this document's own
illustration, not a fact inherited from idea 7.** Idea 7 (`ideas-and-concepts.md`) only specifies the
mandatory/optional shape of a medal goal; no document anywhere has actually specified what bronze,
silver, or gold require. "A medal goal typically rewarding a high trick count would contradict a
story-gate demanding 'fewer than 4'" is a plausible illustration, not a settled fact about idea 7's
content — worth labeling as this document's own extrapolation, the same distinction already drawn
for the escalation levers, rather than something idea 7 already established. The underlying rule
(one or the other, not both) is worth stating regardless of what a medal goal turns out to require.
Whoever eventually specifies bronze/silver/gold's actual thresholds should check the same band-edge
arithmetic explicitly (`tricksToPoints`'s bands don't line up with round numbers the way they might
look) — this document caught itself getting exactly that arithmetic wrong once already (see the
Vanguard pivot-lock section's "widen the goal" option), which is reason enough to check numbers, not
just structure, when medal thresholds are actually written.
(This is a per-hand rule, so a multi-hand scripted battle mixing a story-gated hand and a
medal-chasing hand — one on each of its hands — is already allowed by it; worth noting only because
this document walks every other combination out by example and hadn't walked this one.)

**Settled 2026-08-08: the CPU-pairing ban above travels with the goal object, not with "scripted
battles" as a file section.** It's written under a scripted-battle heading, but the risk it fixes
(a trick-minimizing goal, paired with a CPU also minimizing, can strand a player void-of-lead-suit
holding only trump) is a property of *any* low-trick-count goal, mandatory or not — including a
gold-medal chase on an ordinary city's hand. (This example is this document's own extrapolation, not
a fact `us-civil-war-game-framing.md` already established — that document's CPU-tuning section only
ever discusses story-gate goals, the same distinction round 17 already draws for a different medal-
goal example.) Since this document's own table above says a story-gate goal and
a medal goal are the same object used two ways, a safety rule that only checked one of those two uses
would leave the door open on the other. The ban applies to every use of this goal object, on every
hand, scripted or not, whenever the goal asks for a low trick count.

---

## How the Vanguard side actually gets what the story needs

An earlier version of this document tried to give the Vanguard a third use of the same object — a
battle-level goal like "reach the Breach within N rounds," blocking and re-playable the same way a
hand's trick-count goal is. Playing that through against an actual multi-hand battle breaks it: the
Vanguard board is explicitly *never reset between hands* in the same battle (`hybrid-concept.md`),
so "replay on miss" — the thing that makes a hand-level goal costless — doesn't have anywhere cheap
to reset *to* once several hands' worth of Clash actions are already sitting on the board. Redealing
the whole battle to fix one late miss is a much bigger retry than "costs nothing" describes anywhere
else in this document, and a snapshot/rollback system built just to avoid that is exactly the kind of
new subsystem this design otherwise goes out of its way not to add.

**Settled 2026-08-08: the Vanguard doesn't get its own blocking goal object. It keeps its existing
win condition — reach the Breach — and the story gets what it needs from the lever that already
exists: the authored bonus above.** But that lever can only tilt the board, not lock it, and this
document said so ambiguously the first time — it asked the disadvantaged side's Muster to both "make
a real fight of it" *and* "never threaten to win outright" in the same sentence. Those contradict
once real numbers are chosen: either the smaller budget leaves a genuine chance to breach first, or
it doesn't. **Settled 2026-08-08 (revised): only the trick-count layer is a hard, mandatory
guarantee. The Vanguard's own result is not.** The authored bonus gives one side a real advantage,
not a rigged one — the baseline underneath it is never touched, so neither side can be starved to
zero the way the earlier, uncorrected version of this fix would have allowed. The Clash is still
played straight, both sides still make real tactical choices, and it stays possible (just unlikely)
for the disadvantaged side to actually reach the Breach first.

**"Just unlikely" was never measured, and measuring it (thirty-fifth pass) found something closer to
"not observed at all" under the current shipped AI, in either direction.** Simulated the exact
schedule this document uses as its own illustrative example — the story-favored side (CPU) gets the
bonus in 2 of a battle's 3 hands, the Clash opener anchored per the settled rule above, both sides
using the real shipped `chooseCpuClashAction`: **the CPU reached the Breach first in 500 of 500
trials; the disadvantaged player, 0 of 500** — stated fully on both sides, not left to be inferred.
Flipping the schedule to favor the player instead didn't hand the CPU those wins either — it produced
**0 breaches for either side in 500 trials**, every one resolving to the round cap. Both outcomes
trace to the same cause: the deterministic AI's minimal path to a Breach costs more than the baseline
Muster alone (7) but less than baseline-plus-bonus (10) — so whichever side gets the bonus wins
outright within a hand, or (schedule 2's board-position asymmetry) nobody does, with no observed
middle case in 1,000 combined trials. **This is a measurement of the current deterministic heuristic,
not a provable law of the design** — round 22 already flagged that this exact determinism (no
tie-break randomization yet) is itself an open problem, and a smarter or randomized Clash AI could
easily produce a different, more graduated distribution. But as shipped today, "stays possible, just
unlikely" is not an honest description of what was measured — "not observed" is closer, and the
gap between those two claims is large enough that this needs re-measuring once the Clash AI's own
open items (tie-break randomization, a real dump policy) are built, not treated as settled now.

**The two schedules aren't mirror images of each other, and isolating why (thirty-eighth pass) rules
out the obvious suspect.** If "whoever has 10 Muster wins, whoever has 7 doesn't" were the whole
story, flipping which side is favored should just swap the winner — 500/500 for the player instead
of the CPU. It doesn't; it collapses to 0/0/500 (every trial hits the round cap). Re-ran the
player-favored schedule a second way, with flat round-parity alternation instead of the opener-anchor
rule (rounds 12/17) anchoring the opener to the non-bonus side: **identical result, 0/0/500 either
way** — ruling out the opener-anchor rule as the cause. What's left is the AI's own tie-break
(`chooseCpuClashAction` ranks candidates by `cellKey` string comparison, not a hex-geometric rule) or
some other asymmetry between the two mirrored bases that a side-generic heuristic doesn't actually
treat symmetrically. Not fully diagnosed here — the next cheap step is instrumenting which candidate
the tie-break picks across a batch of mirrored positions — but the finding stands regardless of the
exact cause: **a player-favored scripted battle, tested twice under the shipped AI, has never once
produced a real player Breach — only the round-cap's narrated fallback.** Any future content that
wants a battle to resolve as "the player broke through," mechanically, currently has no observed path
to that outcome; it can only be told through the round-cap's proxy. When that happens, the narrative
absorbs it with the same tool already used for a trick-count outcome — "their information was bad,
the general wasn't there" was always written to cover a mechanical result the story didn't originally
plan for; it covers this one too. That's the honest trade this design already makes at the card
layer, extended one level up instead of solved differently: a hard, retried guarantee where the
story truly cannot bend (the trick-count goal), and an authored-but-real tilt everywhere the story
can absorb the occasional surprise (the board).

This answers the original open question ("what's the Vanguard-side equivalent of a trick-count
goal?") with a different shape than expected twice over: not a parallel goal object, and not a second
hard guarantee either — just an authored tilt on top of an untouched floor, plus the same
narrative-flex tool the card layer already relies on. No new rule, no new object.

**One real gap this doesn't paper over: the Vanguard has no guaranteed end.**
`skirmish-board-replacement.md` already flags this honestly and defers it on purpose — a base-to-base
connection isn't guaranteed the way edge-to-edge Hex is, so it's possible for many rounds to pass
with neither side reaching the Breach. Ordinary cities can afford to defer that; a scripted story
beat can't stall indefinitely without breaking pacing. **Settled 2026-08-08: a scripted battle gets a
soft round cap** (illustrative: the same hand count the battle was scoped at, e.g. 3; "once every
hand has resolved" means every hand-*slot*, however many redeals each one took to get there — the
same vocabulary the redeal rule above already uses, made explicit here since this document states
things explicitly once it's noticed them ambiguous) — if neither side has reached the Breach, the story is told from whichever side holds
the stronger board position at that point, using the narrative-interprets-the-result tool this
document already relies on ("their information was bad, the general wasn't there"). This inherits
the deferred stalemate risk rather than re-solving it — it just stops a scripted beat from being the
place that risk turns into an unbounded wait.

**One number worth noting, not fixing here:** the shipped board is 11×11 (`src/vanguard/config.ts`),
not the 7×7 `concept-critique.md` used when it first sized the ambush-lethality problem this whole
board replaced Hex to fix. Doesn't change anything this document settles, but whoever next measures
"how often a Clash decides itself in the first exchange" should measure it against 11×11, not the
smaller board the original problem statement assumed.

**"Stronger board position" is a coarse proxy here, deliberately, not a claim that the general
evaluation problem is solved.** `skirmish-board-replacement.md` already flags evaluating a partial
network's chance of reaching the Breach as "a similar class of problem to evaluating a partial Hex
board" — the same class of problem `design-principles.md` §7 calls genuinely hard and describes Hex
needing real search machinery for (H-search's virtual connections) rather than a simple heuristic. This tiebreak doesn't need that machinery: it only has to pick which pre-written
line of narration plays, it never feeds back into the war's outcome (fixed regardless of any battle's
result) or into anything a CPU has to act on. A cheap stand-in — token count, or raw hex-distance
from each network to completing the Breach — is enough here. The moment anything needs to actually
*play* the Vanguard well (a real opponent making move choices), that's the unsolved problem
`skirmish-board-replacement.md` already owns, and this document doesn't pretend to have answered it.
(`reskin.md`'s decree-highlighted map region is the identical design choice made a second time —
presentation-only, explicitly not a data path — worth confirming the two are meant to move together
if either one is ever promoted to a real rule, per the Problem 2 correction above.)

**Not yet true of the shipped code, same as the authored-bonus injection point above.** `battle.md`
confirms the current orchestrator has exactly one way to reach a resolved battle —
`submitClashAction`'s `Breached` branch, reading `winner` off an actual `ClashState.winner` — and
ordinary battles deliberately have no round cap at all ("no upper-bound check anywhere in this
module... an explicit non-requirement, not an oversight"). A round-cap resolution needs a second path
into that same `Resolved` shape (`{ phase: Resolved; vanguard; winner }` already has exactly the
fields this needs), triggered by the hand-cap instead of a real Breach — a new call path, not a new
type. Whoever builds it should also decide, explicitly, whether a round-cap `winner` means the same
thing downstream (for campaign progress — see "clearing cities... is what moves the campaign
forward," above) as a `winner` from an actual Breach, since nothing here currently distinguishes them
once they're both sitting in the same field. **Settled 2026-08-08 (revised twice): they share a
`winner` field, and the previous revision overclaimed what "the campaign always advances" actually
depends on.** The real guarantee is narrower than "once a scripted battle's hand-goals are all hit" —
it's "once a scripted battle *resolves*," and a battle can resolve without every authored hand ever
being played. `submitClashAction`'s `Breached` branch is unconditional — checked directly, it has no
concept of how many hands a battle was scoped for, and ends the battle the instant a Breach occurs,
possibly during hand 1. **An early Breach is accepted as a valid resolution, the temporal mirror of
the round cap being one** — "the city fell faster than planned" is as legitimate a story shape as
"the fight ran the full length," rather than gated behind new state that holds a Vanguard win open
until every authored hand plays out. The real cost this creates, stated honestly: a battle's later
hands need their own narrative content to stand alone, since nothing guarantees they're ever reached.
What stays genuinely mandatory is each *individual* hand's own trick-count goal while it's being
played — never skipped or shortcut — not a promise that every authored hand in a battle gets played.
The Vanguard's `winner`, whichever way it resolves, still only selects which pre-written line of
narration plays. This is what makes "stays possible, just
unlikely, for the disadvantaged side to reach the Breach first" an honest claim rather than an
overclaim: the Vanguard is real in that nothing rigs which side actually wins it, but it's genuinely
Narrate-shaped, not Force-shaped, precisely because the campaign was never waiting on the answer.

**"Uneven" undersells how the Clash's own existing turn-passing rule converts a Muster gap into a
run, not just an edge — and this isn't a new mechanic, it's one the Vanguard already had.** Checked
directly against `applyClashAction`: once one side's Muster hits zero, every remaining turn goes to
the other side alone, consecutively, uncontested. `skirmish-board-replacement.md` already names this
as deliberate — "the tangible payoff for winning the War Council" — for ordinary rounds, where it's
usually a small, trick-count-driven edge. A scripted hand's authored bonus feeds the same mechanism,
and this document allows authoring the same side's bonus across most or all of a battle's hands ("the
side the story favors earning it most hands"). Combined, a deliberate, repeated authorial choice can
turn into several hands' worth of free, unanswered late-Clash advances for the same side — closer to
a guaranteed endgame than a probabilistic tilt, in the cases where an author leans hard on the bonus
in one direction. This doesn't need a new rule of its own to fix — it's the existing Vanguard payoff
mechanic doing exactly what it was built to do, just fed a more deliberate input than an ordinary
round's trick count.

**That comparison treated "an ordinary round's trick count" as a safe, already-verified baseline —
it wasn't, and checking it (found on a thirty-fourth pass) confirms the concern is real even outside
scripted battles.** Simulated directly: 500 full ordinary battles, symmetric shipped AI on both sides
(`chooseCpuMove`, `chooseCpuClashAction`), no scripted authoring involved at all. Of the battles that
reached a Breach, whichever side won the very first War Council round won the overall battle **87.5%
of the time**, and the average token-count gap between sides nearly tripled from round 1 to the
battle's end (3.00 → 8.82) — a real, measured Sirlin-style slippery slope, not a hypothetical one.
This means the scripted-hand risk this section names isn't a new problem the authored bonus
introduces; it's the same mechanic's existing behavior in the ordinary game, now given words. Detail
(and an even bigger, previously unquantified sibling finding — 58.4% of the same 500 battles never
reached a Breach at all within a 20-round cap) recorded in `skirmish-board-replacement.md`'s own
open-questions list, since both belong to the Vanguard's core rules, not to this document's scope.
Worth leaning on "real, if uneven, chance" no more confidently for the scripted case than for the
ordinary one this data now describes — neither is currently self-correcting.

**A coarse proxy can tie, and this needs a fallback too — and the first attempt at that fallback had
a hole a previous round's changelog claimed was closed when it wasn't.** Equal token count or equal
hex-distance to completing the Breach is a plausible outcome for a proxy this cheap. The first fix
was: on a tie, favor whichever side the battle's authored bonuses tilted toward more often across its
hands. That breaks down exactly when it's needed least visibly — a battle authored with no bonus for
either side in any hand (a deliberately even fight, which the corrected Muster rule above explicitly
allows) has a 0–0 tilt to sum, so this fallback has nothing to break the tie with either.

**Small imprecision in the middle tier, not worth its own fix:** "whichever side the bonuses tilted
toward more often" counts hands, not weight — an early, minor bonus and a late, climactic one count
the same. Since this document allows a battle's bonus to shift which side it favors across hands
("the gated side earning it less often, the side the story favors earning it most hands"), a
majority-of-hands count could in principle land on the side meant as the setup, not the payoff.
Same low-stakes bucket as the rest of this cascade — a note, not a fix.

**Worth weighing, not resolved here: this cascade now has three tiers (coarse proxy → bonus tilt →
authorial intent) for a decision with zero mechanical stakes** — per the settlement above, it only
ever picks a line of narration. More tiers give richer texture on a genuine near-tie; fewer tiers is
less machinery to keep consistent for something this low-stakes. A proportionality call for the
developer, not a defect. **Re-weigh this against round 35's measurement, though: for a player-favored
battle specifically, this cascade isn't resolving a rare edge case — it's the sole resolution path
observed (0/500 real breaches, 500/500 round-cap resolutions).** The "rare tie" framing this
proportionality question was written against doesn't hold for every schedule; worth knowing before
deciding how much machinery a decision that's actually load-bearing in some configurations deserves.

**One more reason not to over-trust the exact 7-vs-10 arithmetic behind these measurements:**
`.docs/implementation/vanguard.md` flags `MUSTER_BONUS = 3` itself as "an invented placeholder with
no design-document figure — the least-grounded number in the module," awaiting first-playtest
retuning. Every simulation result in this section is real against the code as shipped today, but the
underlying 7-vs-10 gap it measures is built on the single least-trusted constant in the engine — it
will need re-running once that placeholder is actually tuned, not treated as a fixed target.

**The middle tier assumes the bonus-favored side is also the board-advantaged one, which the
Clash-opener correction above shows isn't guaranteed once action-cost mix is in play.** Same low
stakes as the rest of this cascade (still only narration), so not worth its own fix — just worth
knowing this tier isn't the tie-breaking guarantee it reads as, for the same reason the opener anchor
isn't the endgame-run mitigation it reads as.

**Settled 2026-08-08 (revised): if the bonus tilt is also tied, fall back to the battle's own
authorial intent — the side the scene was written to favor is a fact that exists independently of
any single hand's bonus values, since it's the reason the battle was written as a scripted (not
ordinary) fight in the first place.** Every scripted battle has a "why" before it has numbers; use
that, not a new comparison. This closes the chain with something that must already exist rather than
adding a mechanic, and it means a maximally symmetric battle — the case designed to feel like a fair
fight — still resolves according to the story it was written to tell, exactly once, only when both
the coarse proxy and the bonus tilt agree there's nothing else to go on.

---

## Open — does locking to one band remove a decision Fox's own scoring table creates?

Found on an eighth pass, and deliberately left open rather than resolved here, because it's a feel
judgement, not a rules bug.

`concept-critique.md` already noticed something sharp about ordinary Fox: 0–3 and 7–9 both pay the
same 6 points, and because tricks always sum to 13, an ordinary round is really a live, two-sided
race over which of those two bands each side ends up in — a race that can flip mid-hand as tricks are
won. Reading the hand as it develops and pivoting which band to chase is a real, central Fox
decision, not incidental to it.

A scripted must-lose goal locks that decision shut before the first card is played: "win fewer than
4" recognizes exactly one of Fox's two winning bands as a hit. A player who's clearly not going to
land under 4 by trick 7 has nowhere to pivot to — landing in 7–9 is exactly as much a miss as 10–13,
even though it's a "win" by the base game's own scoring. The rest of that hand stops being a decision
and becomes a wait for the redeal.

**Two honest options, not a pick:**
- **Widening the must-lose goal itself was the wrong shape of fix, found on a thirty-ninth pass —
  it quietly deletes the guarantee a must-lose gate exists to provide.** "Fewer than 4, or 7 through
  9 tricks" restores the pivot decision, but 7–9 (Victorious) is a genuinely strong tactical result by
  Fox's own scoring table — a player who takes 8 tricks satisfies the identical mandatory, blocking
  pass flag as a player who took 2, and only one of those outcomes can honestly be narrated as
  "the general wasn't there." A scripted must-lose battle exists specifically because the story needs
  *this* engagement to read as a defeat; widening it stops delivering that guarantee for the case it
  was built to guarantee, turning a must-lose gate into a different, weaker tool (reward either
  extreme) without ever naming that it had changed jobs.
- **Fixed by splitting it into a separate, third use of the same object, instead of widening the
  must-lose one.** "One system, several jobs" already treats a story-gate goal and a medal goal as
  the same target-checked-against-a-result primitive, used two ways. Add a third: a **decisive-result
  goal** — either winning band counts as a hit — for scenes where the story only needs some clear
  outcome, not specifically a loss. Reserve the single-band must-lose object, unwidened, for scenes
  that genuinely require this engagement to read as a defeat. Costs nothing new to check (the object,
  the redeal, the visibility rules all already generalize); costs one more named category and an
  authoring rule about which scenes use which. This also answers the still-open bonus-per-band
  question for free: a genuine must-lose object never needs two bonus values (it only ever hits one
  band), while a decisive-result object naturally wants different bonuses per band, since a decisive
  win and a decisive loss should tilt the Vanguard differently — the dead-trick arithmetic already
  computed for "the widened case" (23% worst case) belongs to this new object, not a modified
  must-lose one.
- **Accept the single-band must-lose goal, permanently, as a deliberate, bounded cost** — same shape
  of trade this document already makes elsewhere (the Muster bonus, the Vanguard's coarse tiebreak
  proxy): a genuine must-lose beat is allowed to cost a little of what makes an ordinary hand rich, in
  exchange for the one guarantee that can't be diluted. The right answer once a decisive-result object
  exists for the cases that don't need a specific side to win.

Which of the second two options is worth adopting is a feel/content call about how many scripted
beats actually need "some clear outcome" versus "this specific side must lose" — not decided here.

**These two costs weren't just similar — they partly answer each other, found by running the same
arithmetic on both.** The certainty-timing finding below computes the single-band goal's worst case
exactly: failure locks in as early as trick 4, leaving up to **9 of 13 tricks (69%) dead**. Run the
identical computation against the *widened* goal (accepting either {0–3} or {7–9}): failure only
becomes certain once the reachable range is entirely outside both bands, which the fastest route
(winning ten straight) doesn't hit until trick 10 — **at most 3 of 13 tricks (23%) dead**, roughly a
threefold cut. Widening the goal was already on the table for restoring the pivot decision; it turns
out to also substantially shrink the dead-trick cost the next section prices as a separate problem.
Doesn't change that either choice is still the developer's — it changes what's actually being traded
against what.

## Open — this format's own campaign-scale table-time was never priced, and a precedent already in this project's framework says to check

Found on a forty-first pass, left open because it's a scope/feel question, not a rules gap.

`design-principles.md` §7 already carries the relevant precedent: Culdcept, a card-and-board hybrid
whose repeated, decades-long critique is that running a *complete* game of one system inside a
*complete* game of another means "length is the first symptom, but the disease is that neither layer
is allowed to be the point." This document has already computed the number that lens needs (finding
#66): clearing one scripted battle at the measured floor costs ≈12.3 hand-attempts, ≈160 tricks — for
a single story beat, not a whole city or region. `hybrid-concept.md`'s still-open two-tier question
(how many cities get full scripted treatment) directly multiplies that number into a campaign total
nobody has run: even a modest handful of scripted battles puts the story-gated fights alone in the
neighborhood of a thousand tricks of Fox, before counting ordinary cities or the Vanguard exchanges
layered on top of every one of those hands.

**Three honest options, not a pick:**
- Resolve the two-tier question with this number in hand, deliberately keeping the scripted count low.
- Adopt the "cut the hand short at certainty" presentation option (already on the table, never chosen)
  specifically to cut the campaign-total cost, not just the per-hand dead-trick cost it was proposed
  for.
- Accept the cost as this game's actual identity — a card-and-board campaign is allowed to run long —
  but say so on purpose, the way this document states every other accepted cost on the record.

## Measured — how much of a must-lose hand is a real decision versus autopilot

Found on the same pass: this document credits the must-lose toolkit with a "skill ceiling," but never
checked what fraction of a hand's turns that ceiling actually touches versus a single obviously-
correct play. Measured directly, extending the same harness used for findings #57/#66 (20,000 hands,
duck policy, shipped CPU): counting a follow turn as a real decision when more than one legal card
avoids winning the trick, and a lead turn as a decision whenever more than one card could be led —
**46.6% of the player's 13 turns per hand qualify as a real decision, not autopilot.** That's higher
than a skim of the toolkit's "concentrated at a handful of specific moments" framing would suggest —
roughly half the hand, not 2–4 turns out of 13. Stated with its exact operationalization rather than
as a vague reassurance, since a different definition (e.g., requiring the multiple options to lead to
meaningfully different downstream outcomes, not just multiple legal non-winning cards) could move
this number; a natural follow-up once real technique — not just duck — is modeled.

---

## Open — a scripted hand's outcome can be mathematically certain long before trick 13, and the check only fires at the end

Found on a twenty-third pass, and left open for the same reason as the section above: the fix is
cheap and mechanical, but which presentation to give it is a feel call.

Trick counts are public and can only go up, so a fixed-threshold goal's pass/fail state can become
provably certain using only information both players already have, well before the last trick:

- **Must-lose ("fewer than 4"):** the instant the player's own count reaches 4, the goal is
  unrecoverably failed — as early as trick 4, leaving up to **9 of 13 tricks (69%)** with no possible
  effect on anything. Nothing else in a scripted hand reads trick-by-trick play once the goal is
  fixed (the bonus is authored, not derived from trick count; a hand carries one goal type, not two).
  This worst case drops to 3 of 13 (23%) under the widened, two-band version of this goal — see the
  connection drawn in the pivot-lock section above. **Measured, not just bounded, on a thirty-eighth
  pass: the worst case is not the common case.** Simulating a full clear (repeated attempts under the
  duck policy until success, the same harness as finding #57) gives an average of **3.95 of 13 tricks
  (30.4%) dead per attempt**, not 69% — the common failure shape is a near-miss (most failed attempts
  land at 4–6 tricks, just over the line, not an early blowout at trick 4), not the worst case
  repeated. Across a full clear (≈4.1 expected attempts, matching the 24.5% hit rate), that's roughly
  16 dead tricks out of about 53 played in total. Worth knowing the actual number before deciding
  whether the presentation question above is worth its cost — the common case is meaningfully better
  than the worst-case framing implies. **One more cheap multiplication, found on a fortieth pass:
  this document had computed the per-hand cost but never extended it across a full battle.** At ≈4.1
  expected attempts per hand-slot and this document's own illustrative 3-hand battle length, clearing
  one scripted battle at the measured floor costs roughly **12.3 hand-attempts, ≈160 tricks played** —
  the number Rosewater's inertia test (does the game build momentum toward ending, before players
  tire?) should actually be judged against, not the per-hand figure alone. Pure arithmetic on numbers
  already measured, no new simulation needed.
- **Must-win ("more than 6"):** success can lock in as early as trick 7 (win the first seven), and
  failure can lock in exactly as early in the other direction (lose the first seven, so the maximum
  reachable total is already short of the threshold) — up to **6 of 13 tricks (46%)** dead either way.
- **The two aren't symmetric in which direction locks early.** Must-lose can only be confirmed
  *failed* early (a won trick can never be undone); must-win can lock in *either* direction. That's
  why must-lose's worst case (9 dead tricks) is structurally worse than must-win's (6) — 4 sits
  closer to 0 than 6 sits to 13.

**The fix costs nothing new: check for certainty after every trick, the same comparison already made
at trick 13, just run earlier.** It can never remove a genuine decision from a salvageable attempt —
it only shortens ones that already have nothing left to decide. What it costs is presentation, and
that's the open part:
- **Cut the hand short the moment certainty hits** — removes the dead-trick cost entirely, but a hand
  that visibly stops mid-play needs its own "this is already decided" beat, or it reads as a bug.
- **Leave it exactly as drafted, always play to trick 13, and name the dead-trick cost as an accepted
  one** — cheapest to build, at the price of the worst case above.
- **Surface the certainty without changing the rule** — a signal the moment it's known, while the
  remaining tricks still play out physically. Matches Meier's "err toward too much information"
  without touching the mechanic.

Worth noting alongside this, not a reason to decide it either way: the shipped CPU heuristic leads
its single lowest-ranked card first, so a guaranteed high-rank teaching card (per the escalation
ladder, if adopted) tends to appear late in a hand, if at all before an early exit — the ladder's
teaching value already comes from pre-battle visibility, not from watching the card get played, so
this doesn't undercut it, but it's a real interaction the two mechanisms should be built with
knowledge of, not discover the way round 20's bug was found.

Which presentation is worth its cost is the developer's call — not decided here.

**A shelved proposal aimed at the same symptom, worth checking against this before building
something new.** `concept-critique.md`'s Fill 2 ("Treasures buy where, tricks buy how many")
proposed using the Treasure 7s' point bonus to keep late tricks meaningful — the identical symptom
this dead-trick finding is about, tricks that stop mattering before the hand ends. It was never
retired, but round 30 confirms Treasure has zero implementation and, structurally, no injection point
into a scripted hand's authored Muster even if built. Not a substitute for the fix above — a scripted
hand's Muster doesn't read trick count at all, so Treasure would need its own path in regardless —
just worth having the connection on record before something new gets built to solve what an existing,
shelved idea was already aimed at.

**A smaller version of the same lock applies to medal goals too**, following the same generalization
already made once for the CPU-dump ban (this document's "one system, two jobs" table says a
story-gate goal and a medal goal are the same object). A gold-medal chase on an ordinary city's hand
locks out the same pivot once it's clearly out of reach — the stakes are lower here, since missing a
medal tier doesn't void the hand's ordinary Muster consequences the way a missed story-gate voids the
whole hand, so this doesn't need its own resolution, just the same honest note.

---

## Open — a scripted battle's Vanguard phase has no consequence beyond narration, and that's the exact coupling failure the Vanguard was built to fix

Found on an eighteenth pass, and deliberately left open rather than resolved here, because fixing it
costs real authoring or engineering work and not-fixing it is a legitimate, bounded choice — this is
a cost/benefit call, not a correctness bug.

Trace what a scripted battle's Vanguard result actually touches: campaign progress is gated by the
hand-goal layer and by the battle *resolving* (Breach or round-cap), never by which side's tokens
end up ahead; the war's outcome is fixed by faction choice regardless; the round-cap tiebreak's coarse
proxy exists, by this document's own words, only to pick "which pre-written line of narration
plays... it never feeds back into the war's outcome... or into anything a CPU has to act on." A
player can play a scripted battle's Clash portion arbitrarily badly — waste every Expand, ignore an
Overwrite opportunity, never Reinforce — and the only consequence is a different flavor-text line.

**Correction, found on a thirty-seventh pass: this was mis-cited as a scripted-battle problem "the
board replaced Hex to fix" — checked directly against the governing documents, that fix was never
built, for any battle.** `concept-critique.md` Problem 2 names the one-way coupling failure
(card→board only, nothing flows back); `skirmish-board-replacement.md`'s "What this fixes" section,
checked directly, only ever claims the non-zero-floor fix and spatial decision variety — never a
card↔board channel. `reskin.md` (2026-08-07, one day before this document's own first settlements)
says so explicitly, discussing the same Friedrich/Faeria suit-as-terrain device this critique
independently proposed below: it's adopted as "pure flavour rather than a rule change," and the
document states outright "none of what follows closes `concept-critique.md`'s Problem 2... that
finding stays exactly as open as it was." So this is the base game's unfixed condition, not something
scripted battles specifically reopen — the Muster section's "decoupling the bonus... trades a slice
of that coupling" cost is real, but it's a marginal cost on top of a channel that was never open in
the first place, not a fresh decoupling of something that otherwise talks back. Restated accordingly:
scripted battles inherit this cost, they don't introduce it.

**Three honest options, not a pick — one of them belongs to a different document, flagged here since
this section is what noticed it:**
- **Accept it as a bounded, deliberate cost of the scripted format** — the same shape of trade this
  document already accepts elsewhere (the pivot-lock cost of a fixed trick-count band). This no
  longer buys "the ordinary-city coupling stays intact everywhere else" (it doesn't — Problem 2 is
  base-game-wide, corrected above), only that scripted battles don't make an already-open cost worse
  in a way worth fixing here specifically.
- **Reuse a number that already exists rather than adding a subsystem**: the round-cap tiebreak's
  coarse proxy (token count or hex-distance) is already computed every scripted battle. Feed that
  same number into something with a real, if minor, consequence — a reward tier off
  `ideas-and-concepts.md` idea 4's existing item/card system, scaled by how well the Vanguard was
  actually played — while leaving campaign progress and the war's outcome exactly as gated as they
  are now. Costs zero new subsystems (only the proxy's destination changes), but is real authoring
  and engineering work, and it would need the escalation-lever discussion above to say explicitly
  whether the Vanguard phase escalates too, or stays flat while everything else in a scripted battle
  ramps up.
- **Not this document's fix, but the cheapest one available:** `reskin.md` already built the device
  that would close Problem 2 for real, as pure presentation — the decree highlights a themed map
  region matching whichever side holds the in-fiction advantage, explicitly stated as flavour only,
  reusing the Fox/Corporal card's decree-swap ability for free. Promoting that from decoration to an
  actual Clash rule (the highlighted region gets a real effect — unrestricted placement, a Muster
  discount) would give the card layer something to say back to the board for the first time, using a
  fact (the fixed-per-battle decree) this document's own round 30 already mandated for an unrelated
  reason. Whether to make that promotion belongs to `skirmish-board-replacement.md`/`reskin.md`, not
  here — flagged because this section is what found the connection.

Which is worth the cost is the developer's call — not decided here.

---

## Fixed — a real exploit in the shipped Vanguard engine, not a design doc gap

Found on a twentieth pass, and unlike this document's other "not yet true of shipped code" notes,
this one was a genuine bug in code that already existed and already shipped with passing tests —
fixed directly in `src/vanguard/overwrite.ts`, not just documented here.

**The bug.** `createVanguardBoard` surrounds each base with its own token cluster from the start, so
there's never an empty cell directly adjacent to a base to `Expand` into — the only way to reach one
is to `Overwrite` a buffer cell first. `applyOverwrite` checked legality against `ownedCells`
(SCRUM-40's deliberately gap-tolerant set — any owned cell, chain-connected or not, so a scouted
outpost can strike where it lands). That's correct for an ordinary token, but a base isn't one:
`connectedNetwork`'s BFS starts at the base cell and gates entry there first — the moment a base
stops being owned by its side, the BFS returns nothing at all, not "everything except the base." A
side could rush a narrow, disconnected lance at the enemy base (roughly one hand's baseline Muster,
by the rough arithmetic worked out in critique) and zero the victim's entire Breach eligibility
without building anything resembling a real connection themselves — cheaper than an honest Breach,
and it broke exactly the guarantee the non-zero Muster floor (this document's own earlier fix) exists
to protect: that no side can be mathematically prevented from a Breach.

**The fix.** `applyOverwrite` now requires a base-cell target specifically to be reached from the
mover's own `connectedNetwork`, not merely `ownedCells` — one conditional, reusing the distinction
`network.ts` already draws between the two sets rather than adding a new one. Every other Overwrite
target (ordinary tokens, including via a gapped outpost) keeps its original, unrestricted reach. Two
new regression tests cover it (base capture from a disconnected outpost is now illegal; from an
actually connected network it's still legal) alongside the existing SCRUM-40 gap-tolerance test,
which still passes unchanged. Full suite (410 tests) and typecheck both pass clean.

---

## Open — this document's own opening line promises something only ordinary city fights can deliver, and nothing anywhere says what losing one costs

Found on a twenty-sixth pass. This is a real gap, but it belongs to a different document's scope —
named honestly here because this document's own opening sentence is what creates the promise, not
resolved here because ordinary (non-scripted) city fights and the overworld campaign layer belong to
`hybrid-concept.md` and `ideas-and-concepts.md` idea 4, not to this one.

**The gap.** This document opens with "the eventual winner still losing plenty of individual
engagements along the way." A scripted battle can't be the thing that claim is about — by this
document's own construction, a scripted battle's miss just redeals; nothing about it persists as a
loss. So the claim can only be about ordinary city fights, and round 15's own reasoning (campaign
progress is gated by the hand-goal layer specifically *because* that layer exists to do the gating,
never by the Vanguard's raw result) doesn't transfer to ordinary cities, which have no hand-goal
layer at all. Checked directly: none of `hybrid-concept.md`, `skirmish-board-replacement.md`,
`ideas-and-concepts.md`, or `concept-critique.md` states what happens when the CPU reaches the Breach
in an ordinary city. Every Clash decision in the majority of the game's fights currently has an
unstated — possibly absent — consequence, which is exactly the invisible-consequence failure Meier's
test calls uninteresting.

**The cheap fill, pointed at rather than adopted:** `ideas-and-concepts.md` idea 4's overworld
already assumes nodes can be revisited once the car gains a new attachment — a CPU-won ordinary city
could simply mean the node stays contested (no reward, no city control) until the player returns and
re-fights it, the exact revisit shape idea 4 already needs for its own reason. That costs nothing new
to build beyond what idea 4 already assumes, and it gives ordinary Clash decisions a real consequence
without touching the fixed-war-outcome guarantee — only which cities are currently held would be
real, never the war's ending. The risk to watch, if this is the direction taken: a "contested,
revisit later" node must not quietly become as costless as a scripted redeal, or the stakes evaporate
the same way an unconsequential loss would.

Whether to adopt this, and how, is `ideas-and-concepts.md`/`hybrid-concept.md`'s call, not this
document's — flagged here because this document's own opening line is the thing making the promise.

---

## Open — what does a player who picks the losing faction actually play for, and is the must-lose goal type itself enjoyable to execute?

Found on a thirty-second pass, across 31 rounds that never asked it. Both halves are feel questions,
not correctness ones — named honestly, not resolved here.

**The hope question.** This document's only stated payoff for picking Red is "you read the other
faction's version of the story" — a real answer, but untested against why a player keeps playing an
arc authored to end in defeat from minute one. Compare the Elden Ring boss comparison this document
already leans on for the redeal design: clearing that boss is real progress toward eventually
*winning* the game. A Red campaign's battles clear the same way, but the campaign itself is authored
to conclude in defeat regardless. Nothing anywhere in this document or its siblings states what a Red
player is actually rooting for across that arc — a specific general's survival, a city held longer
than history says it should be, some thread scoped below the fixed war outcome. Without one, "both
sides get their own story" risks being a slogan rather than a hook.

**The fun question, which compounds with it.** Ordinary Fox trains a two-sided squeeze (win tricks,
but not too many). A must-lose scripted goal collapses that to one side only — get as low as
possible, full stop — asking the player to spend a whole hand working against the instinct the base
game spent its whole design teaching them. This document has catalogued that goal type's *fairness*
costs across a dozen findings (forced-win risk, dead tricks, the pivot-lock) without ever asking
whether deliberately trying to lose at cards is the enjoyable half of the format. If a Red campaign
leans more must-lose than a Blue campaign leans must-win (unstated either way), the faction with the
weaker stated hook would also be the one handed the more mechanically friction-prone goal type — the
same asymmetry twice, unconnected until named together here.

**Three honest options, not a pick:**
- State explicitly what a Red campaign's stakes are below the war level (a character arc, a city that
  stays held regardless of the war's ending) — a writing decision, not an engine change.
- Deliberately balance the must-lose/must-win ratio per faction so the losing side isn't also the
  side fighting its own trained instincts more often — a content-authoring guideline.
- Accept the asymmetry as a bounded, known cost, matching this document's own habit elsewhere — but
  say so on the record rather than leaving it undiscovered.

**Cheapest ways to find out, once there's anything playable:** ask a Red playtester directly what
made them want to keep going, knowing the ending; count the actual authored must-lose/must-win ratio
per faction once city content exists; and hand the same playtester a must-win and a must-lose
scripted hand back to back and ask which felt more like playing Fox versus doing a chore.

**Two edges of this same asymmetry, found separately and connected on a forty-first pass:** a won
must-lose hand routinely hands the CPU that hand's Muster bonus (findings #35/#54 — "I won, and my
inevitable conqueror is stronger") and this section's own question (what is Red actually playing
for). If a Red campaign leans must-lose more than a Blue campaign leans must-win, the faction with the
weaker stated hook is also the one whose routine success beat is arming its own eventual conqueror —
not a new problem, just two findings 22 rounds apart that describe the same asymmetry from opposite
sides.

---

## Measured — the base hit rate the whole "costs nothing, just retry" design rests on

Found missing on a thirty-third pass: every narrower risk in this document got a computed number
(the trump-void rate, the Fox-retrump rate, the Monarch/Witch rate) — the one number the entire
redeal metaphor actually depends on, how often a single attempt succeeds at all, had never been
run. Simulated directly against the shipped engine rather than left as "worth measuring": 20,000
hands dealt via the real `dealRound`, played out with the real `chooseCpuMove` (hunt) on the CPU
side and a simple duck policy on the player side (never win a trick you don't have to — lead low,
follow with the lowest legal card that wouldn't win, or the lowest legal card if none would).

**Result: "fewer than 4" (the single-band must-lose goal) hits on 24.5% of attempts — roughly one
success every four hands.** The full distribution: 0–3 tricks landed 24.5% of the time, 4–6 landed
53.9%, 7–9 landed 20.4%, 10–13 landed 1.2%. The widened goal from the pivot-lock section above
(accept either 0–3 or 7–9) hits on **44.9%** — nearly double, confirming that option's benefit with
a real number instead of an argument. **One honest caveat on that 44.9%, found on a thirty-fourth
pass:** it's measured under the same duck-only policy used for the narrow goal, which never actually
takes the pivot the widened goal is designed to restore (ducking until it's clearly hopeless, then
switching to taking tricks toward 7–9). The gap between this number and a real player's is larger for
the widened goal specifically, since the widened goal's entire benefit is a strategic option this
policy doesn't exercise — 44.9% likely understates it more than 24.5% understates the narrow case.

**What this does and doesn't establish, stated honestly:** this is the floor, not the ceiling — no
deck-construction bias is simulated (that mechanism's dealing algorithm doesn't exist yet, per the
seventh-gap section above), and the duck policy is simpler than the full technique catalog this
document teaches (it doesn't time a trump lead by counting cards, doesn't use the Swan/Woodcutter/Fox
mitigations, doesn't avoid a lone dangerous 9). The real, deck-built, technique-applying hit rate is
almost certainly higher than 24.5% — this number is a lower bound, not the expected player
experience. But it settles the shape of the open question from the previous section: at the *floor*,
"fewer than 4" already succeeds roughly one attempt in four, an expected ~4 attempts to clear — closer
to the Elden-Ring-boss framing this document uses than to a punishing grind, even before any of the
document's own deck-building or in-hand technique is applied. Re-running this once the pinned-card
dealing mechanism and a real dump policy exist would tighten the estimate; it isn't needed to know
the metaphor currently holds at the floor.

---

## Why this isn't the Force/Narrate tradeoff it looked like

The original open question was a choice between forcing a result (steering the CPU to a decided
outcome, at the cost of the round becoming theatre) and narrating a loss freely (keeping the round
honest, at the cost of the story only being likely — not guaranteed — to match). What's here is
neither: the round is played straight, but the win condition for the scene is an authored goal
instead of "more tricks than the opponent," and missing it repeats the scene instead of failing the
game. That gets the guarantee Force wanted without the cost that made Force expensive.

**This claim only covers the card layer on its own — the Vanguard needs its own version of it, and
gets a different one.** The Vanguard has no retry (see above), so it can't earn its guarantee the
same way. It doesn't try to: its authored Muster tilt is closer to Narrate than Force, honestly — the
board is played straight with a real, if uneven, chance either way, and a surprise result is folded
into the story after the fact rather than prevented beforehand. That's the trade this whole document
already accepts for one specific reason: the trick-count goal is the one thing the story genuinely
cannot bend on (it's the visible, played contract with the player), while which side's tokens happen
to reach the Breach first is exactly the kind of detail Narrate was always fine for.

---

## A seventh gap, and it isn't shaped like the other six

**The guaranteed-card mechanism — the single most-cited lever in this document (the Thronebreaker
defense, the difficulty ladder, the scoutable teaching beat, and its mirror on the player's own deck
via `ideas-and-concepts.md` idea 5) — has no dealing algorithm anywhere, in any document or in the
shipped code.** `dealRound` shuffles the full deck and slices it into hands:

```ts
const shuffled = shuffle(createDeck(), rng)
const playerHand = shuffled.slice(0, 13)
```

Shuffle-then-slice cannot force a specific card into a specific hand — that's not a missing
parameter to thread through, it's the wrong shape of function. Every use of "the guarantee card" in
this document (and in `ideas-and-concepts.md`) has assumed the mechanism exists and only needs
tuning; nothing has ever specified how a card gets pinned while the rest of the hand still shuffles.

**This also surfaces a concrete collision, found by trying to actually author an example the way
round 3 found the trump/Witch risk — by playing it out, not just reasoning abstractly.** The battle's
fixed decree (round 14's most urgent gap) is a specific physical card, not just a suit. If a scene
author ever guarantees the CPU holds the *same* card the battle's decree is pinned to — plausible,
since both are "a specific card someone chose for a reason" — the two mechanisms contradict outright:
one card can't be face-up as the decree and concealed in a hand at the same time. **Settled
2026-08-08 (broadened): every pinned card in a single deal — the fixed decree, the CPU's guaranteed
card, and the player's own chosen guarantee card (idea 5) — must be pairwise distinct.** The original
version of this rule only checked the CPU guarantee against the decree, because both are set by the
same author at the same time, so a single writing-time check catches it. It missed the pairing that's
actually more likely to collide: the player's own guarantee slot against the CPU's regional trait,
set by two different parties at two different times, with no shared authoring pass to check them
against each other — and the small pool both draw from (the deck's six odd, ability-bearing ranks
are the obvious pick for either purpose) makes an accidental match plausible, not a contrived edge
case. Checking one pair and not the other was the same mistake in miniature that round 7 made citing
one lever's trustworthiness without checking the other's.

**The fix, sketched at the same depth the other six gaps got — corrected twice now: not every pin is
a hand pin, and the slice sizes have to shrink by the pin count or the hand-size invariant breaks.**
Extend `dealRound` to accept an optional list of pinned `(side, card)` pairs for the two guarantee
cards — remove them from the pool before shuffling the remainder, then insert them into their
assigned hands after slicing — but the fixed decree isn't a hand pin at all; it has to land in the
decree slot specifically, not in either player's 13, so it needs its own parameter and its own
insertion point, sharing only the "removed from the pool before the random part runs" step with the
other two. **The one thing a literal reading of "shuffle the remainder, then insert" misses: each
hand's slice must shrink by exactly its own pin count first.** With 3 cards pinned (1 decree, 2
guarantees), the remaining 30-card shuffle slices at 12 and 12 (not 13 and 13) before each guarantee
card is inserted back in, landing on Fox's required 13-card hands with 6 left for the draw pile
(30 − 24 = 6, matching today's pile size) — a 13-then-insert reading would silently deal 14-card
hands instead. Whichever function ends up threading all three through should reject (or have the
authoring/selection UI reject earlier) any set of pins that isn't pairwise distinct. This is a
wrapper around the existing `shuffle`/`slice` primitives plus one collision check, not a new
subsystem. Whether the
player-vs-CPU collision is caught by rejecting the player's selection outright, silently falling back
to an ordinary shuffle-in slot, or banning the overlap as a region-content rule is a design-ownership
question tangled up with `ideas-and-concepts.md` idea 3's still-open guarantee-card-visibility
question — worth deciding together, not separately, the same way this document already treats
decree-visibility and scriptability as coupled. Until this exists, every place in this document (and
`idea 3`/`idea 5`) that treats "the guarantee card" as a settled primitive should be read as
contingent on it, the same way the escalation levers are already marked contingent on
`ideas-and-concepts.md` idea 3 being decided.

---

## The six shipped-code gaps this document flags are one gap, not six

Scattered through this document are six separate "not yet true of the shipped code" notes: the
redeal-on-miss `goal` and its branch, the authored Muster bonus, the round-cap resolution path, the
tie-of-ties authorial-intent flag, a battle-fixed decree, and a CPU hunt/dump mode. `battle.md`
confirms `BattleState` currently carries nothing beyond `round`, `dealer`, the engine states, and (at
`Resolved`) a `winner` — every one of the six is the identical shape of missing thing: a per-hand or
per-battle authored value that nothing in the current orchestrator has anywhere to put.

**Worth scoping as one type, not six separate patches discovered piecemeal by whichever contract
picks each one up first** — something like a battle-scoped list of per-hand definitions (goal,
which side's bonus, the fixed decree, the CPU mode) plus battle-level values (the round cap, the
tie's authorial-intent fallback), threaded once into `startBattle`/`submitWarCouncilCard`/
`beginClash`/`submitClashAction`. That's one type and one plumbing pass instead of six. Since that
per-hand `goal` value is exactly what a player now needs to see in full, for every hand of the
battle, before committing to a deck (the settlement above) — the same battle-scoped list this
consolidation already proposes is also the natural source for that pre-battle display, a read, not a
second value to invent. The one thing that has to hold regardless of how it's shaped: an ordinary,
non-scripted city has none of these values and must keep working exactly as it does today — "no
scripted hand active" needs to be the
cheap, obviously-correct default, not a null-check at every call site.

One piece of this is already cheaper than it looks: the round-cap tiebreak's coarse proxy (token
count or hex-distance) doesn't need new code — `src/vanguard/`'s existing Clash-CPU heuristic already
has both ingredients built.

---

## Open questions

- Fictional country, faction, and city names — none chosen.
- **Decree visibility and "can you tell it's scripted" are the same question, not two — and,
  corrected on a thirty-seventh pass, this document had asked it about only one of three identically-
  shaped tells.** If trump visibility stays scoped to scripted battles only (the current default),
  then *being shown the decree before the fight* is itself the tell — the player learns "this one's
  scripted" from a UI side-channel before ever reading the goal text. But two other variables are
  scoped the identical way, for the identical reason (a once-per-battle deck commitment needs full
  information), and were never asked the same question: the guaranteed card ("for scripted battles
  specifically, the guaranteed card is visible... ordinary cities left exactly as open") and the full
  per-hand goal-direction list (round 21's fix, scoped the same way). Closing one of the three doors
  doesn't close the room — a player who sees either of the other two revealed pre-fight still learns
  "this one's scripted" through a channel the decree fix never touched. Resolve this once, for the
  set: either all three extend to ordinary cities together, or accept that a scripted battle can
  already be told apart before it starts as a settled non-problem (plausible, since the player is
  shown the stated goal itself one screen later regardless) — not three separate answers arrived at
  by accident, one per variable.
- Whether "Narrate" (fixed prose, no gameplay gate) has a real use left for minor beats, now that the
  goal-and-retry mechanism exists.
- **Corrected citation, then a real gap underneath it.** The shipped code doesn't fix
  `CLASH_FIRST_ROUND_OPENER` flat — `clashOpener.ts` already alternates it (odd rounds to the
  configured side, even rounds to the other), which is `concept-critique.md`'s own recommendation,
  already implemented. But alternation only cancels out over an *even* number of rounds, and this
  document's own running example — a city fought across 3 hands — is odd: the configured side opens
  2 of 3 Clashes, and that gap never closes for any odd battle length. **Settled 2026-08-08: a
  scripted hand's Clash opener is whichever side did *not* receive that hand's authored Muster
  bonus**, not the flat alternating constant. This reuses a decision the scene already made (who the
  bonus favors) instead of adding a new one, and it specifically stops the two edges from stacking in
  the same direction — under the shipped constant (CPU-first), a must-lose battle's authored bonus
  already favors the CPU most hands, and the un-adjusted opener parity would have handed that same
  side 2 of 3 Clash opens too, for free, in exactly the battle type this document works hardest to
  keep genuinely contestable. An ordinary, unscripted city has no authored bonus to anchor to and
  keeps the existing flat alternation unchanged.
- **This rule had no defined output for the exact hand type this document names as the natural
  choice for an even fight, and it needed one.** "Whichever side did not receive the bonus" has two
  candidates, not one, on a hand where the Muster rule sends the bonus to *neither* side — which this
  document explicitly calls out as the right choice for "a deliberately even fight," the same worked
  example used to motivate the round-cap tiebreak's own fallback. **Settled 2026-08-08: on a
  bonus-to-neither hand, the Clash opener falls back to the same authorial-intent fact the round-cap
  tiebreak's third tier already needs to exist** — reusing that fallback rather than inventing a
  second one for the identical shape of gap (an authored-bonus-derived rule with nothing to anchor to
  when the bonus is symmetric).
- **Correction, found on a twenty-eighth pass: this opener rule addresses first-move tempo across a
  battle's hands, and nothing else — in particular, it does *not* mitigate the uncontested-leftover-
  run risk named separately, above.** Checked directly against `applyClashAction`: turns alternate
  strictly one-for-one between sides regardless of who opened, for as long as both still have Muster
  left; the side that ends up spending its budget last gets every remaining turn consecutively. Under
  uniform-cost spending, who opens changes only which early cells get contested first, never which
  side ends up with the leftover run — that's a function of total Muster (and, once real action costs
  differ, of *spend rate per turn*, not even total Muster reliably). A side with more Muster but a
  habit of spending it on costlier Overwrites can run dry in fewer turns than a side with less Muster
  spending only on cheap Expands, handing the *disadvantaged* side the uncontested endgame run —
  exactly backwards from what an opener-anchoring rule can address, because opener choice never
  changes either side's own spend rate. This rule is worth keeping for the smaller, real thing it
  does fix (tempo, first pick of a contested cell); it should not be read as mitigating the endgame-
  run risk named above, which remains exactly as unmitigated as when it was first found.

---

## What changed and why

**Round 1**, revised from `us-civil-war-game-framing.md` after a critique found two problems:

1. **The "must-lose, CPU-dumps" pairing risked being decided by the deal, not by skill** — a
   minimizing player can be forced into an unwanted win by Fox's own follow-suit rule. Fixed by
   never using that pairing; must-lose difficulty now escalates by tightening the trick-count
   threshold instead.
2. **Nothing in the design could ever be permanently lost** (free retries, a fixed war outcome), and
   the original document didn't say what that trade bought. Fixed by writing down, on purpose, that
   stakes live in the moment-to-moment hand, not in permanent consequence, and that campaign
   pressure comes from the map layer, not from battle failure.

**Round 2**, after a fresh `game-designer` pass found three more, all from not checking round 1's
fixes against `hybrid-concept.md`'s Muster pipeline and the Vanguard's persistent board:

3. **A required in-fiction defeat could hand that side the single strongest tactical position on
   the board**, because the must-lose example (0–3 tricks) is also the maximum-payout band in the
   existing score→Muster table. Fixed by making a scripted hand's Muster bonus depend on the goal's
   tier, not the raw trick band.
4. **It wasn't stated whether a missed hand could leave partial Vanguard board changes behind**,
   since the board normally persists across hands in the same battle. Fixed by moving the goal check
   before Muster/Clash: a miss redeals the hand immediately, so a failed attempt never reaches the
   board at all.
5. **Banning the CPU-dumps pairing only removed the doubled version of the forced-trump-win risk**,
   not the baseline version, which is a property of the player's own hand shape regardless of CPU
   setting. Named honestly as a residual, measurable risk, with the existing decree-visibility tool
   pointed at as the real (partial) mitigation.

**Round 3**, after actually playing hands out card-by-card and running real numbers through
`hybrid-concept.md`'s Muster table instead of reasoning about it abstractly — a fresh `game-designer`
pass had also flagged that round 2's fixes weren't checked against the Vanguard's persistent board:

6. **The must-lose Muster fix only covered the player's side.** Running an actual hand through the
   table showed the CPU has its own problem: hunting tricks specifically to serve a must-lose scene
   lands it in the Greedy band, which the ordinary table pays zero — punishing the CPU for correctly
   doing what the story asked, and starving the side that's supposed to be pressing toward the
   Breach. Fixed by making a scripted hand's Muster a fully authored pair for both sides, not derived
   from either side's trick count at all.
7. **The Vanguard-level goal this document had just added didn't survive contact with an actual
   multi-hand battle** — the board can't be cheaply "redealt" the way a hand can, since it never
   resets between hands. Fixed by removing that goal object entirely: the Vanguard keeps its
   ordinary win condition (reach the Breach), and the story gets its outcome through the authored
   Muster pair instead. Added a soft round cap with a narrative tiebreaker, since a scripted beat
   can't be allowed to inherit the Vanguard's already-known, deliberately-deferred stalemate risk
   without a pacing backstop.
8. **The residual forced-trump-win risk (see round 2, item 5) had a real, playable mitigation this
   document hadn't looked for.** Playing a must-lose hand out card by card surfaced three of Fox's
   own odd-card abilities (Swan, Woodcutter, Fox) that already answer the risk in play, plus a named
   technique (shed trump early). Added to "Tools the player has" so the residual risk reads as a
   skill ceiling, not a luck floor.

Smaller fixes from the same round: named on purpose that neither faction is only-win or only-lose
across the whole campaign; noted that decree visibility and "can the player tell it's scripted" are
coupled questions, not independent ones; caught and corrected an error in the first draft of the
"shed trump early" technique (leading trump doesn't reliably lose a trick — fixed to the accurate
card-counting version); found a second, trump-independent cause of the same forced-win problem (the
Witch's single-card ability) by tracing individual card abilities rather than stopping at the trump
case; and scoped the whole document to single-sided (player-only) goals explicitly, rather than
leaving it ambiguous whether a battle could gate both sides at once.

**Round 4**, after a fourth fresh `game-designer` pass on the play-tested Round 3 version:

9. **Decree visibility was never pinned to the battle's own multi-hand shape.** Deck construction
   happens once, before a battle that's several hands — but base Fox draws a new decree every round,
   which would leave a deck built around hand 1's trump flying blind for hands 2 and 3. Fixed by
   extending `ideas-and-concepts.md`'s existing "decree is static per city" rule explicitly to a
   scripted battle's hands: one trump, revealed once, for the whole battle.
10. **The Vanguard's authored Muster pair was asked to do two contradictory things** — give the
    disadvantaged side "a real fight" while also guaranteeing it "never threatens to win outright."
    Fixed by deciding which one actually governs: only the trick-count goal is a hard, retried
    guarantee; the Vanguard's own result is an honest, tilted-but-real outcome, with a surprise
    absorbed by the same narrative-interpretation tool already used for trick-count results. The
    Force/Narrate section now says explicitly that it only proved its claim for the card layer, and
    extends a (different, weaker, Narrate-shaped) version of the same claim to the board.

Smaller fixes from the same round: admitted that the band-edge justification for tightening a
must-lose goal runs out at "fewer than 4" — anything stricter is an invented cutoff, not a reused
one, and it's also where the residual forced-win risk is tightest, so it's the case most worth
simulating first; cross-referenced the single guaranteed-CPU-card mechanism with the trump/Witch
risk, since a scene author can deliberately point that one guaranteed card at the risk to turn it
into an intentional, scoutable teaching beat.

**Round 5**, after a fifth fresh `game-designer` pass on the Round 4 version:

11. **Round 3's Muster fix had over-corrected: it replaced Muster's baseline as well as its bonus,
    quietly deleting the non-zero-floor rule `hybrid-concept.md` already relies on to prevent a
    Hex-style wipeout.** Nothing stopped a scene author from writing a disadvantaged side's Muster
    low enough to make the Breach *mathematically* unreachable in the hands available — not a low
    chance, an impossible one, which is Force wearing the "authored tilt" costume the very next
    section argues this design avoided. Fixed at the root: a scripted hand now only authors the
    *bonus* half of Muster; the baseline both sides always get is untouched, exactly as in an
    ordinary city fight. The numeric failure mode is now impossible by construction, not just
    unlikely by convention.
12. **The "scoutable teaching beat" lever for the guaranteed CPU card silently assumed an answer to
    a question this document hadn't actually settled** — `ideas-and-concepts.md` lists guarantee-card
    visibility as open. Fixed by settling it the same way decree visibility was already settled: for
    scripted battles specifically, the guaranteed card is visible before the fight; ordinary cities
    stay exactly as open as they already were.

Smaller fix from the same round: stated explicitly that the Fox (3) card's mid-hand decree swap only
lasts that one hand — the next hand of the same battle reverts to the battle's canonical decree.

**Round 6**, after a sixth fresh `game-designer` pass on the Round 5 version:

13. **Tightening the trick-count threshold was assumed to make a must-lose battle harder, without
    checking that the threshold is what actually controls difficulty.** Hunt (CPU) and dump (player)
    are aligned incentives, so how hard a must-lose goal actually is depends on hand strength — a
    lever `ideas-and-concepts.md` owns (the leftover pool's strength, the guarantee-card ladder), not
    on which number the goal is checked against. Fixed by fixing the threshold at "fewer than 4"
    (Humble) for every must-lose goal and moving escalation entirely onto the lever that actually
    owns it — which also retires the earlier "band-edge justification runs out at 4" problem, since
    there's no more reason to invent a sub-band cutoff at all.
14. **The soft round-cap tiebreak's "stronger board position" silently assumed an evaluator this
    project has already, explicitly, left unsolved** (`skirmish-board-replacement.md`'s own
    Hex-style partial-network evaluation problem). Fixed by naming it as a deliberately coarse proxy
    that only has to pick a line of pre-written narration, not play the Vanguard well — and stating
    plainly that the real evaluation problem stays open for anything that actually has to act on it
    (a CPU opponent), which this doesn't.

**Round 7**, after a seventh fresh `game-designer` pass — the first to check this document against
the actual shipped code (`src/vanguard/musterConversion.ts`, `src/battle/beginClash.ts`) instead of
only the design docs it was derived from:

15. **The authored Muster bonus had a floor (round 5) but no ceiling.** Two independently-chosen
    bonus values could still open a gap wide enough to make "stays possible, just unlikely"
    false in practice — the same failure the floor fix closed, rebuilt one level up. Fixed by
    capping either side's authored bonus at `MUSTER_BONUS`, the same value the shipped code already
    hands an ordinary round's winner — reusing a real constant instead of inventing a policy. This
    pass also grounded the whole Muster discussion in the actual shipped rule (a flat bonus-or-
    nothing off `tricksToPoints`) rather than only `hybrid-concept.md`'s illustrative graduated
    table — the shape of the problem holds under both, but the numbers now match what's really built.
16. **This document's CPU-pairing ban directly contradicted still-live, un-superseded guidance in
    `us-civil-war-game-framing.md`**, which recommended escalating toward the exact pairing this
    document banned — and `ideas-and-concepts.md` still points readers at that document for CPU
    tuning. Fixed by adding a dated Resolution banner to `us-civil-war-game-framing.md`, the same
    pattern `concept-critique.md` already uses, pointing its CPU-tuning section at this document.

Smaller fixes from the same round: noted that `beginClash`'s current pipeline has no injection point
for an authored bonus yet — a concrete scope item for whichever contract implements this, not a
design gap; applied the threshold-isn't-the-difficulty-lever fix to must-win goals too, instead of
leaving it to be re-derived; gave the soft round-cap's coarse-proxy tiebreak an explicit tie-of-ties
fallback.

**Round 8**, after an eighth fresh `game-designer` pass — the first to check this document's
cross-references against whether their *owning* documents still stand behind them, not just whether
they exist:

17. **The escalation plan (rounds 6–7) cited `ideas-and-concepts.md`'s leftover-pool-strength lever
    without noticing that document had already retracted it** for exactly the mechanism this
    document relies on elsewhere (hand reshuffling) — the same mistake round 6 fixed once already,
    recurring one level up. Fixed by making the guarantee-card ladder the primary escalation lever
    (it survives reshuffling by construction, being a fixed card rather than a distribution) and
    demoting leftover-pool strength to secondary, explicitly contingent on the still-open
    re-derivation.
18. **The authored-bonus cap (round 7) bounded each side's value independently, which missed the
    actual invariant the shipped code guarantees** — exactly one side ever receives `MUSTER_BONUS`
    in an ordinary round, never both. A per-side cap alone still allowed both sides to be authored a
    bonus in the same hand, inflating a single scripted hand's total Muster past anything an ordinary
    round can produce, and leaving the round-cap tiebreak with nothing to break a tie on if a scene
    used symmetric bonuses throughout. Fixed by capping the bonus to at most one side per hand,
    mirroring the real invariant instead of a weaker paraphrase of it.

Smaller fix from the same round: flagged (without deciding — not this document's call) that the
shipped `CLASH_FIRST_ROUND_OPENER` constant is fixed CPU-first while a sibling document recommends
alternating it, which is exactly the kind of compounding edge a scripted battle's fairness claims
would be most exposed to.

**Round 9**, after a ninth fresh `game-designer` pass, checking this document's own citations against
whether their owners actually stand behind them, and its own changelog against its actual body text:

19. **Round 8 promoted the guarantee-card ladder to "primary escalation lever" without applying the
    citation check it had just applied to the leftover pool one paragraph earlier** —
    `ideas-and-concepts.md` idea 3 states that ladder is "proposed, not yet decided... not a
    developer call yet," not settled. Fixed by admitting neither escalation lever is settled by this
    document; both are contingent on a decision `ideas-and-concepts.md` owns, stated plainly instead
    of papered over with a premature "Settled."
20. **Round 7's changelog claimed the round-cap tiebreak got a tie-of-ties fallback; the body text
    never actually got one.** Traced to a concrete case (a battle authored with no bonus for either
    side — explicitly allowed by the corrected Muster rule) where the bonus-tilt tiebreak has nothing
    to break a tie with either. Fixed by adding the fallback that was missing: a compound tie resolves
    to the battle's own authorial intent, a fact that exists independently of any hand's bonus values.
21. **A scripted must-lose goal locks out the live pivot-between-winning-bands decision
    `concept-critique.md` already identified as central to ordinary Fox.** This is a genuine feel
    question, not a bug — documented as an open, undecided tradeoff (widen the goal to accept either
    winning band, vs. accept the narrower loop as a bounded cost) rather than resolved on this
    document's own authority.

**Round 10**, after a tenth fresh `game-designer` pass found the must-lose/must-win mirror-case
habit hadn't actually crossed all the way over in two places:

22. **The residual forced-outcome risk was only ever walked in the must-lose direction.** Fox's
    follow-suit rule cuts both ways: a follower void in the lead suit who also holds zero trump is
    guaranteed to *lose* that trick, the structural twin of the guaranteed-*win* risk this document
    spent three rounds solving. Fixed by extending the existing toolkit (Fox, Woodcutter, Swan, the
    Witch) in the direction it hadn't pointed yet — retrump instead of detrump, fish for trump
    instead of shedding it — and naming it as an equally real, equally unremoved residual risk.
23. **The must-win threshold paragraph had gone stale.** It still described "escalating toward" a
    second, tighter value after round 6 fixed the must-lose threshold at one value for exactly the
    opposite reason, and its two illustrative numbers were backwards besides (a narrower band is
    harder, not easier). Fixed to match the singular-fixed-threshold shape the must-lose side
    already uses correctly.

**Round 11**, after an eleventh fresh `game-designer` pass found the document's own "flag code gaps
explicitly" habit hadn't reached its own round-cap section, and one load-bearing lever had never
been asked about at all:

24. **The round cap has no path in the shipped `BattleState` machine** — only an actual Breach can
    reach `Resolved`, and ordinary battles deliberately have no round cap at all. Fixed by flagging
    the same way the authored-bonus injection point already is (a new call path into the existing
    `Resolved` shape, not a new type), and settling that a round-cap resolution counts as the city
    being taken, the same as a real Breach — otherwise the mechanism built specifically to keep the
    campaign moving wouldn't actually move it.
25. **Who leads first on a redealt scripted hand was never decided**, despite lead order being the
    lever behind several of this document's own mitigations (the Swan's lead-control, choosing when
    to test a suit). Fixed with the minimal existing-rule answer: a redeal replays the same hand-slot,
    so it keeps that hand-slot's dealer rather than getting a new one.

Smaller fix from the same round: stated explicitly that a hand carries a story-gate or a medal goal,
not both at once, rather than leaving that as an implied inference. Also checked, per this round's
own citation-discipline habit, whether the guarantee-card mechanism itself (not just its escalation
ladder) is actually settled elsewhere — confirmed it is (`ideas-and-concepts.md` idea 3: a specific
guaranteed card per general is Settled, only the region-escalation *use* of it is still proposed), so
no fix was needed there.

**Round 12**, after a twelfth fresh `game-designer` pass read the actual CPU heuristic and Clash-
opener code this document had only cited secondhand until now:

26. **The shipped CPU can retrump the decree mid-hand** (`chooseCpuFoxChoice`; the hand holds at
    least one Fox roughly 79% of the time by exact hypergeometric calculation, confirmed against the
    real 33-card deck), directly undercutting "decree visibility" — a live opponent decision
    defeating a mitigation the document had described as protecting against
    bad luck. Named honestly as a behavior/tuning call with three options laid out, none picked here;
    downgraded the mitigation's claimed strength to match what it actually guarantees.
27. **The Clash-opener alternation this document cited as "fixed CPU-first" was stale — it already
    alternates — but alternation only cancels out over an even number of rounds, and this document's
    own 3-hand example is odd**, leaving the configured side 2-of-3 opens for free, stacking with the
    authored-bonus tilt in the same direction for a must-lose battle specifically. Fixed by anchoring
    a scripted hand's opener to whichever side didn't get that hand's authored bonus, reusing the
    scene's own existing decision instead of the flat constant.

**Round 13**, after a thirteenth fresh `game-designer` pass found the document's central mechanism
was the one gap it hadn't flagged, and one safety rule was scoped to a file section instead of the
object it actually protects:

28. **The redeal-on-miss machinery — this document's own central subject — has zero code path in
    the shipped orchestrator, and unlike the two smaller gaps already flagged, this one was never
    called out.** `submitWarCouncilCard` advances unconditionally; no `goal` field, no check, no
    redeal branch exists anywhere. Fixed by adding the same "not yet true of shipped code" flag
    already given twice, naming the actual new field and branch needed.
29. **The CPU-dump ban was scoped to "scripted battles" as a file section, not to the goal object
    the risk actually attaches to** — and this document's own table says a story-gate goal and a
    medal goal are the same object, used two ways. A medal-goal chase on an ordinary city's hand
    could reopen the identical forced-win risk through the door the fix's original scoping left
    open. Fixed by restating the ban at the point the two uses are unified, binding it to the object
    itself.

Smaller addition from the same round: gave the guarantee-card-ladder-vs-leftover-pool escalation
question a second, independent argument (what each lever teaches, not just which is confirmed),
without deciding which lever `ideas-and-concepts.md` idea 3 should adopt.

**Round 14**, after a fourteenth fresh `game-designer` pass read the actual dealing and CPU-decision
code rather than only the pieces earlier rounds had already quoted:

30. **The battle-fixed decree — the centerpiece mitigation for the forced-trump-win risk — has no
    code behind it and is actively contradicted by a line that already runs.** `dealRound` always
    draws an independent random decree, and the one place a multi-hand battle already deals its next
    round (`submitClashAction`'s `Complete` branch) already calls it with no override — hand 2's
    trump is unrelated to hand 1's today, no scripted-battle machinery required to see it. Fixed by
    flagging this as the most urgent of the shipped-code gaps, not just another item on the list.
31. **The entire hunt/dump CPU toggle this section is built around doesn't exist in any form** —
    unlike the other flagged gaps, there's no partial version to extend. The shipped `chooseCpuCard`
    has exactly one policy (cheapest winning card, or cheapest legal card otherwise) and no code path
    that would ever prefer a losing play. Fixed by naming this plainly: every claim in the CPU section
    describes a mechanism that doesn't exist yet, and it happens to match the one behaviour that does
    exist purely by luck of sequencing.

Added a consolidating section: all six shipped-code gaps flagged across this document (redeal `goal`,
authored Muster bonus, round-cap resolution path, tie-of-ties fallback, fixed decree, CPU mode) are
the same shape of missing thing — one battle-scoped type, not six separate patches — worth scoping
once rather than discovered piecemeal. Smaller fix: noted the shipped board is 11×11, not the 7×7
`concept-critique.md` used to size the original ambush problem.

**Round 15**, after a fifteenth fresh `game-designer` pass verified every prior "not yet true of
shipped code" claim exactly and found two the document had missed entirely:

32. **The guaranteed-card mechanism — the document's single most-cited lever — has no dealing
    algorithm anywhere, in any document or in code, and it's not shaped like the other six gaps.**
    `dealRound` shuffles then slices, which structurally cannot pin a specific card into a specific
    hand. Fixed by flagging it as a seventh, differently-shaped gap (an algorithm rewrite in
    `deal.ts`, not a threaded parameter), sketching the fix (pin cards out of the pool before
    shuffling the remainder), and catching a concrete collision it was hiding: a guaranteed card and
    a battle's fixed decree could be authored as the same physical card, which is a contradiction —
    fixed with an authoring-time rule that they may never match.
33. **Whether a CPU-favored round-cap result costs the player anything was never stated**, which
    quietly let "the Vanguard's result is real, if uneven" and "nothing about a scripted battle can
    be permanently lost" sit in unexamined tension. Fixed by settling that the two `winner` values
    (Breach vs. round-cap proxy) share a field but not a meaning: campaign progress is gated entirely
    by the hand-goal layer, never by the Vanguard's own result, which only ever selects narration.

**Round 16**, after a sixteenth fresh `game-designer` pass traced the round-cap fix and the redeal
mechanism forward across hand boundaries together, rather than each in isolation:

34. **An early Breach can end a scripted battle before all its authored hands are ever played, and
    the document had overclaimed the opposite** — `submitClashAction`'s `Breached` branch is
    unconditional, with no concept of how many hands a battle was scoped for. This is the exact
    temporal mirror of the round cap (which handles a battle running *too long*) with nothing
    handling one running *too short*. Fixed by accepting an early Breach as a valid resolution rather
    than gating it behind new state, and correcting the overclaim: the real guarantee is "the battle
    resolves," not "every hand-goal gets played" — with the honest cost stated plainly (later hands
    need narrative content that stands alone, since they're not guaranteed to be reached).
35. **The routine emotional beat of a successful must-lose hand was unscripted.** By design, hitting
    a must-lose goal hands the CPU that hand's Muster bonus — "I just won" immediately followed by
    "the enemy got stronger" is the *expected* result of every successful attempt, not a surprise.
    Fixed by extending the existing narrative-text commitment to cover the routine case explicitly,
    not just the ones this document already covered (a miss, or the rare wrong-side Breach).

Smaller notes from the same round: flagged the round-cap tiebreak's three-tier cascade as a
proportionality question for the developer (real stakes are zero — it only picks narration); noted
the pivot-lock question already raised for story-gate goals applies in smaller form to medal goals
too, following the same object-not-context generalization already used for the CPU-dump ban.

**Round 17**, after a seventeenth fresh `game-designer` pass found two of the document's own
"Settled" rules didn't agree with each other, and one arithmetic claim needed tracing through an
engine mechanic the document hadn't checked yet:

36. **The Clash-opener rule ("whichever side didn't get the bonus") had no defined value for a
    bonus-to-neither hand** — exactly the configuration this document names as the natural choice for
    a deliberately even fight. Fixed by reusing the round-cap tiebreak's own authorial-intent
    fallback for the identical shape of gap, instead of inventing a second one.
37. **"A real, if uneven, chance" undersold what the Clash's own existing turn-passing rule does with
    an authored tilt.** Checked directly against `applyClashAction`: once one side's Muster runs out,
    every remaining turn goes to the other side alone, uncontested — an existing Vanguard mechanic
    (`skirmish-board-replacement.md` already calls it "the tangible payoff for winning"), not a new
    one. Fed a deliberately repeated authorial bonus across a battle's hands, it can produce several
    hands' worth of free late-Clash advances for the same side — closer to a guaranteed endgame than
    a probabilistic tilt in that case. Named honestly rather than fixed, since the underlying
    mechanic belongs to a different document; left as a developer call whether that's an accepted
    cost of authorial control.

Smaller fixes from the same round: corrected the round-12 changelog's stale "roughly half" figure to
match the body text's exact 79% calculation; fixed a citation crediting `skirmish-board-replacement.md`
with a phrase that's actually `design-principles.md` §7's; labeled the medal-goal contradiction
example as this document's own illustration, not a fact idea 7 already established.

**Round 18**, after an eighteenth fresh `game-designer` pass found the guarantee-card collision fix
had checked one pairing and not the other:

38. **The decree/guarantee-card collision rule only checked one of two possible collisions.** Both
    the CPU's guarantee card and the player's own chosen guarantee card (idea 5) pin a specific
    physical card out of the same 33-card pool, and the small set of attractive picks for either
    purpose (the deck's six odd, ability-bearing ranks) makes an accidental match plausible, not
    contrived. Fixed by broadening the rule to pairwise-distinctness across all three pinned values
    (decree, CPU guarantee, player guarantee), matching the same pattern round 9's citation-discipline
    fix already established — checking one pairing and not its sibling was the identical mistake in
    miniature.

Smaller fix from the same round: stated explicitly that the guaranteed card, unlike the decree, needs
no per-battle persistence fix — it's a trait of the general, not something Fox's own rules redraw
each round.

**Round 19**, after a nineteenth fresh `game-designer` pass found the design's central coupling
promise was quietly absent from its highest-stakes moments:

39. **A scripted battle's Vanguard phase has zero mechanical consequence beyond narration** —
    campaign progress and the war's outcome never depend on it, and the round-cap proxy exists only
    to pick a line of pre-written text. That's the same one-way-coupling failure the whole board
    replaced Hex to fix, reopened exactly in the campaign's most memorable fights. Documented as an
    open cost/benefit call rather than resolved: accept it as bounded (matching the pivot-lock cost
    already accepted elsewhere), or feed the already-computed round-cap proxy into a real reward tier
    off `ideas-and-concepts.md` idea 4 — not decided here, since both are legitimate and the choice
    is authoring/engineering cost the developer should weigh.

Smaller notes from the same round: flagged that the escalation-lever discussion never addresses
whether the Vanguard phase itself escalates, contingent on how the above is resolved; noted a
multi-hand battle mixing a story-gated hand and a medal-chasing hand is already allowed by the
existing per-hand rule, just never walked out as an example before.

**Round 20**, after a twentieth fresh `game-designer` pass found a real, exploitable bug in the
shipped Vanguard engine, not just a documentation gap — checked, fixed, and tested in the actual
codebase rather than only in this document:

40. **A base cell was an ordinary, undefended `TokenCell`, capturable via any owned cell (even a
    disconnected outpost) for about one hand's baseline Muster — cheaper than a real Breach — and
    doing so zeroed the victim's entire `connectedNetwork` query outright**, because that BFS starts
    at, and gates on, the base cell itself. This broke the exact guarantee the non-zero Muster floor
    (finding #11) exists to protect. Fixed directly in `src/vanguard/overwrite.ts`: capturing a base
    now requires the mover's actual `connectedNetwork`, not merely `ownedCells` — one conditional,
    reusing a distinction the engine already draws rather than adding a new one. Two regression tests
    added; full suite (410 tests) and typecheck both pass clean.

Smaller notes from the same round: flagged the round-cap tiebreak's bonus-tilt tier as counting
hands, not weight (a note, not a fix, given the tier's own already-acknowledged low stakes); made the
round cap's "every hand has resolved" explicitly mean every hand-slot, however many redeals it took.

**Round 21**, after a twenty-first fresh `game-designer` pass found the visibility principle already
applied twice had a third variable it governed just as directly:

41. **A once-per-battle deck commitment can be asked to serve a must-lose hand and a must-win hand
    in the same battle — goals that want opposite trump counts — and the player was never shown the
    later hand's goal in time to plan for it.** The campaign's own stated ambition (a faction losing
    individual engagements along the way) points straight at this scenario, not a contrived edge
    case. Fixed by extending the same visibility principle already settled twice (decree, guaranteed
    card) to a third variable: the player sees every hand's goal direction for the whole battle
    before building the one deck they're locked into, not just discovering them hand by hand.

Smaller note from the same round: flagged that a guarantee card chosen to teach a must-lose lesson
may not still make sense if it persists into a later must-win hand in a mixed-direction battle —
an authoring note, not resolved here.

**Round 22**, after a twenty-second fresh `game-designer` pass connected three previously-separate
"bounded costs" into one compounding one:

42. **Stacking every visibility settlement (decree, goal direction, guaranteed card) onto a
    permanently deterministic CPU policy converges a scripted hand toward a solvable, memorizable
    line rather than a played decision** — the Thronebreaker complaint this document defended against
    at the hand layer (via reshuffling), resurfacing one layer up at the policy layer. Fixed the
    mechanism-shaped third of this: whichever hunt/dump policy gets built, ties between equally-good
    legal cards now break by the same `rng` already threaded through every deal, not a fixed
    ordering — the aggregate hunt/dump math nothing changes, only whether the CPU's exact line is
    memorizable. Named, not fixed, the larger point: the trick-threshold lock, the six-rung ladder
    ceiling, and CPU/deck predictability are three costs this document reasoned about separately that
    are actually one compounding cost, and whether their sum is still acceptable is a feel judgement
    about the whole scripted format, not resolved here.

Smaller notes from the same round: flagged that full pre-battle visibility may also leave deck
construction itself with little room for a genuinely different build, same root cause as the CPU
finding; flagged that the routine must-lose narrative beat (finding #35) fires on literally every
successful attempt and needs a family of lines, not one copy-pasted sentence.

**Round 23**, after a twenty-third fresh `game-designer` pass found a scripted hand's own goal check
fires too late to catch a result that's often already decided:

43. **A scripted hand's pass/fail can become mathematically certain well before trick 13** — as
    early as trick 4 for a must-lose goal (up to 9 of 13 tricks dead), trick 7 either way for a
    must-win goal (up to 6 dead) — using only public, monotonic trick counts. Documented as an open
    presentation question rather than resolved: the underlying fix (check for certainty after every
    trick, not just the last) is cheap and mechanical, but how to present an early-decided hand (cut
    it short, play it out and accept the dead tricks, or surface a signal without changing the rule)
    is a feel call, not decided here. Noted alongside it: the shipped CPU's lowest-card-first lead
    order means a guaranteed high-rank teaching card tends to appear late, a real interaction worth
    building the two mechanisms with knowledge of.

**Round 24**, after a twenty-fourth fresh `game-designer` pass found a genuine arithmetic error the
document's own mirror-case habit had missed exactly once:

44. **The "widen the goal" option for the must-lose pivot-lock was arithmetically wrong** — "fewer
    than 4, or more than 9 tricks" opens Greedy (10–13, the worst score in the base game), not
    Victorious (7–9), the band the surrounding paragraph correctly identifies as locked out. Fixed to
    "7 through 9 tricks," the actual second winning band.
45. **The must-win threshold's own open-endedness (">6," silently including Greedy) was never
    checked against the same question, and the CPU-pairing table's "easy" must-win pairing
    (CPU-dumps) makes landing in Greedy the likely result of the intended-easiest line of play.**
    Rather than bound it to match the must-lose side, stated the asymmetry as a deliberate choice:
    a must-win goal already doesn't use Fox's scoring table for anything else in a scripted hand
    (Muster is authored, not derived), so there's no reason to import its "don't take too many"
    nuance into the goal's own definition — "took control," however many tricks, is the actual
    intent. Chosen over bounding it specifically to avoid reworking round 23's already-correct
    dead-trick arithmetic, which assumed the open-ended reading.

Smaller fix from the same round: noted that whoever specifies medal-goal thresholds should check the
same band-edge arithmetic explicitly, since this document just demonstrated it's easy to get wrong
even when checking carefully.

**Round 25**, after a twenty-fifth fresh `game-designer` pass traced the one odd-card ability this
document had named three times but never actually played out:

46. **The guarantee-card ladder's own advertised "nastiest" rung (the Monarch) is a live, already-
    shipped mechanic that forces an unconditional — not probabilistic — trick loss on whoever
    receives its constrained response, verified directly against `legalMoves.ts`.** Unlike every
    other risk this document worked out card by card, this one doesn't need voidness or an unlucky
    hand shape, and it cuts in the opposite direction from the ladder's stated purpose: harmless or
    helpful for a must-lose goal, an uncontested CPU trick for a must-win one. Currently quiet only
    because the shipped CPU never voluntarily leads its highest card; would become load-bearing the
    moment the hunt policy this document already calls "not yet built" actually gets built. Named with
    three options (accept it, ban the pairing via the same pairwise-distinctness pattern already used
    for the decree/guarantee-card collision, or exclude Monarch from the must-win side specifically) —
    not decided here, since which card an author picks for the ladder's top rung is a content choice.

Smaller fix from the same round: corrected a citation that compressed `ideas-and-concepts.md` idea 4
into "cities cleared" when it actually describes any node on a navigable overworld, gated by car
attachments, not a city count.

**Round 26**, after a twenty-sixth fresh `game-designer` pass found this document's own opening
sentence makes a promise no document anywhere fulfills:

47. **"The eventual winner still loses plenty of individual engagements" can only be a claim about
    ordinary (non-scripted) city fights — a scripted battle's miss just redeals, it never persists as
    a loss — and no document anywhere states what losing an ordinary city's Vanguard fight actually
    costs.** Named honestly as a gap belonging to a different document's scope
    (`hybrid-concept.md`/`ideas-and-concepts.md` idea 4), not resolved here, since it's about the
    overworld campaign layer this document doesn't own. Pointed at the cheap fill already available:
    idea 4's node-revisit shape (already needed for its own Metroidvania-gating reason) could make a
    CPU-won ordinary city mean "contested, come back later" rather than requiring either a new
    permanent-loss state or a new retry mechanism.

Smaller fixes from the same round: corrected two worked probabilities that were off by roughly a
third to a half despite pointing the right direction (0.14%, not "under 0.1%"; high-teens percent,
not "roughly 21%"); corrected the pinned-card dealing sketch, which had conflated the fixed decree
(which needs its own slot, not a hand) with the two hand-guarantee pins.

**Round 27**, after a twenty-seventh fresh `game-designer` pass found this document had correctly
used a decided fact without noticing its owning document still called it undecided:

48. **`skirmish-board-replacement.md` still listed "who opens The Clash" as undecided, while the
    shipped `clashOpener.ts` and two rounds of this document's own reasoning (rounds 12, 17) already
    depend on it being settled** (round-parity alternation, confirmed a real default rather than a
    placeholder by `config.ts`'s own comment). The citation direction was reversed from this
    document's usual self-check: it used the current, correct fact without flagging that the fact's
    nominal owner hadn't caught up. Fixed by updating `skirmish-board-replacement.md`'s open-questions
    list to point at the shipped default and at this document's scripted-battle refinement on top of
    it, closing the single-source-of-truth drift.

**Round 28**, after a twenty-eighth fresh `game-designer` pass found one fairness fix doesn't reach
the risk it reads as solving, and one visibility variable was left out of an established pattern:

49. **The Clash-opener anchor (rounds 12, 17) mitigates first-move tempo only — it does not touch
    the uncontested-leftover-run risk (finding #37) it could be read as addressing.** Verified
    directly against `applyClashAction`: turns alternate strictly regardless of who opened, so who
    ends up with the leftover run is a function of total Muster and, once real action costs differ,
    of spend rate per turn — never of starting position. A side with more Muster spent on costlier
    actions can run dry before a side with less Muster spent cheaply, handing the *disadvantaged*
    side the endgame run, which opener order cannot prevent either way. Corrected in place: the
    opener rule is worth keeping for the smaller thing it actually does, but finding #37 remains
    exactly as unmitigated as when it was found.
50. **The authored Muster bonus's destination is a fourth variable the established visibility
    pattern (decree, guaranteed card, goal direction) governs just as directly, and it was the one
    left unexamined** — it now has a real downstream consequence (deciding the Clash opener) a
    player currently only learns after the trick-count decision is over. Documented as open rather
    than settled: revealing it completes the pattern, but doing so deepens the exact solvability cost
    the CPU-determinism finding already names, so this is a real trade either way, not a free fix.

Smaller fix from the same round: noted the round-cap tiebreak's bonus-tilt tier inherits the same
mismatch as the opener anchor, for the same reason — worth knowing, not worth its own fix given the
tier's already-acknowledged zero mechanical stakes.

**Round 29**, after a twenty-ninth fresh `game-designer` pass found a real precision gap in an
already-flagged sketch and a connection between two of the document's own open questions:

51. **The guarantee-card dealing sketch's "slice, then insert" wording didn't say the slices have to
    shrink by the pin count first** — a literal reading would deal 14-card hands instead of Fox's
    required 13. Fixed by spelling out the arithmetic (30-card pool after 3 pins, slice at 12 and 12,
    insert the two guarantee cards back in, 6 left for the draw pile) — the same class of
    off-by-the-pin-count slip this section had already been corrected for once.
52. **The must-lose pivot-lock's "widen the goal" option and the certainty-timing finding's
    worst-case dead-trick cost were priced as two separate, unrelated costs of the scripted format —
    they aren't.** Running the certainty arithmetic against the widened (two-band) goal instead of
    the single-band one cuts the worst case from 9 of 13 dead tricks (69%) to 3 of 13 (23%),
    roughly threefold. Doesn't decide either open question — still the developer's calls — but
    connects them so the widen/accept trade-off is weighed against its full benefit, not just the
    pivot-decision one.

**Round 30**, after a thirtieth fresh `game-designer` pass checked an earlier "settled" endorsement
against findings this document had already made and never traced back to it:

53. **The guarantee-card ladder, endorsed as the better must-lose escalation lever back in round 8,
    doesn't actually make a must-lose goal harder at any of its three illustrative rungs** — Treasure
    has no implementation anywhere in the shipped code; Witch removes, rather than adds to, the
    trump-independent risk it was cited for (pinning one dangerous 9 to the CPU takes it out of the
    shared pool); and Monarch is explicitly *helpful* for must-lose per this document's own finding
    #46, discovered nine rounds after the ladder was endorsed and never checked against it. Fixed by
    re-scoping the ladder's "nastiest rung" framing to must-win goals, where finding #46 already
    confirms it's real, and marking must-lose escalation as fully open again — neither lever
    currently confirmed, exactly the honesty this document already gives other open dependencies.

Smaller notes from the same round: flagged a campaign-wide headwind against must-lose escalation
owned by `ideas-and-concepts.md` idea 5 (guarantee-slot growth fills a hand with exactly the cards a
must-lose deck wants absent, a constraint pre-battle visibility can't fix) — named, not resolved,
same hand-off pattern as round 26; connected Treasure's non-implementation to `hybrid-concept.md`'s
own still-open "do the Treasure 7s feed the Muster" question.

**Round 31**, after a thirty-first fresh `game-designer` pass found two of the document's own
"Settled" rules disagreeing, and an already-shipped mechanic nobody had traced to its consequence:

54. **The must-lose narrative beat ("the enemy got stronger") was stated as firing on every
    successful attempt, contradicting the Muster rule's own explicit allowance for a bonus-to-neither
    hand** — a case two other sections (the round-cap tiebreak, the Clash-opener fallback) already
    build handling for. Fixed by re-scoping the claim to "typical, not universal": the beat fires
    only when the scene actually routed the bonus to the CPU.
55. **The Monarch's shipped response mechanic offers a real choice (Swan-of-suit or highest-of-suit,
    whichever the responder holds) that neither the ladder finding nor the must-win mitigation list
    had traced to its consequence.** Checked directly against `legalMoves.ts`: Swan never changes who
    wins the Monarch's trick, but its own "lose and lead next" ability still fires, handing a
    responder real positioning even in a trick they were always going to lose — added to the must-win
    toolkit. The same trace also narrows round 30's "helpful or neutral for must-lose" claim: a
    responder forced into that suit's Witch as their highest card, *without* also holding the Swan,
    still takes an unwanted win — a third trigger for the lone-Witch risk (alongside voidness and an
    unmanaged last card of a suit) at a real, non-tail rate (roughly one in seven), not the tail case
    the "helpful or neutral" framing implied.

**Round 32**, after a thirty-second fresh `game-designer` pass asked a question none of the prior 31
had: not whether the mechanics are correct, but whether the format is enjoyable and the losing
faction has something to play for:

56. **No document anywhere states what a Red player is actually playing for, or whether the
    must-lose goal type — collapsing Fox's two-sided trick squeeze to one side only — is itself fun
    to execute, and the two may compound** (a weaker stated hook paired with a more friction-prone
    goal type, if Red leans must-lose more often, unstated either way). Documented as an open feel
    question with three honest options (state Red's below-war-level stakes explicitly, balance the
    must-lose/must-win ratio per faction, or accept the asymmetry as a named, bounded cost) — not
    decided here, since this is exactly the kind of judgment reserved for the developer.

Smaller fix from the same round: the still-open "widen the goal" option now carries the one scoping
question it needed before adoption — whether a widened hand's two winning bands ever need different
authored Muster bonuses, or one value serves both.

**Round 33**, after a thirty-third fresh `game-designer` pass found the one number the entire redeal
metaphor rests on had never been computed — fixed by actually running it, not just flagging it:

57. **No document anywhere estimated the base hit rate for a single attempt at a scripted goal, and
    the whole "costs nothing, retry like an Elden Ring boss" design implicitly bets on that number
    being small.** Simulated directly against the shipped engine (20,000 hands, real `dealRound` and
    `chooseCpuMove`, a simple duck policy on the player side): "fewer than 4" hits **24.5%** of
    attempts (≈4 expected tries) at the floor — no deck-building bias, since that mechanism doesn't
    exist in code yet — and the widened two-band goal from the pivot-lock section hits **44.9%**,
    confirming that option's benefit with a real number. Stated honestly as a lower bound, not the
    expected player experience once deck-building and in-hand technique are actually applied.

Smaller notes from the same round: connected `concept-critique.md`'s shelved Treasure-based proposal
to the dead-trick finding, since both target the same symptom and neither has been checked against
the other; named a fourth, narrower forced-win trigger (a leader-side decision trap when a duck deck
runs out of safe cards late in a hand) alongside the three legality-trap triggers already catalogued.

**Round 34**, after a thirty-fourth fresh `game-designer` pass questioned a throwaway comparison in
finding #37 — and simulating it turned up a bigger, previously unquantified sibling finding:

58. **Finding #37 compared the scripted-hand Muster risk to "an ordinary round's trick count" as a
    safe baseline, without that baseline ever being checked.** Simulated 500 full ordinary battles
    with symmetric shipped AI on both sides, no scripted authoring involved: of battles reaching a
    Breach, the round-1 War Council winner won the overall battle **87.5%** of the time, and the
    average token gap between sides nearly tripled from round 1 to the battle's end (3.00 → 8.82) — a
    real, measured Sirlin-style slippery slope already present in the ordinary game, not something
    the scripted-hand authoring introduces. Recorded the full detail in
    `skirmish-board-replacement.md`'s own open-questions list, since the Vanguard's core rules aren't
    this document's scope — including a bigger, previously unquantified sibling result from the same
    run: **58.4%** of the 500 battles never reached a Breach at all within a 20-round safety cap,
    turning "no stalemate rule yet, deliberately deferred" from a hedge into a measured, common-case
    problem.

Smaller fix from the same round: caveated round 33's widened-goal hit rate (44.9%) as likely
understating the real number more than the narrow goal's does, since the simulated policy never
exercises the pivot decision the widened goal exists to restore.

**Round 35**, after a thirty-fifth fresh `game-designer` pass pointed out that the Vanguard's one
load-bearing hedge phrase had never been checked against numbers the document itself went on to
compute — and measuring it directly turned up something more severe than the hedge implied:

59. **"Stays possible, just unlikely" for the disadvantaged side reaching the Breach first was never
    measured.** Simulated the document's own worked schedule (CPU favored 2 of 3 hands) with the real
    shipped Clash AI on both sides: the disadvantaged player reached the Breach first in **0 of 500
    trials**. Flipping the schedule didn't hand the other side those wins either — it produced 0
    breaches for *either* side in 500 trials, all resolving to the round cap. Both trace to the same
    cause: the deterministic AI's minimal Breach route costs more than the baseline Muster alone but
    less than baseline-plus-bonus, so whichever side gets the bonus wins outright or nobody does, with
    no graduated middle observed in 1,000 combined trials. Reported honestly as a measurement of
    *today's deterministic heuristic* — round 22 already flagged that determinism as its own open
    problem — not a provable property of the design; needs re-measuring once tie-break randomization
    and a real dump policy exist, but "just unlikely" is not what was actually observed.
60. **The Fox (3)'s own timing rule enables an aggressive must-win technique the toolkit was missing,
    and its mirror is a trap the must-lose toolkit hadn't named.** Checked against
    `fox-in-the-forest.md`'s FAQ (a Fox's decree change resolves before the trick winner is
    determined): leading the Fox while exchanging toward its own suit turns that same lead into trump
    immediately, not just a setup for later tricks. Added to the must-win catalogue as a distinct,
    more aggressive option; added a one-line warning to the existing must-lose Fox entry against ever
    detrumping toward the suit currently being led.

**Round 36**, after a thirty-sixth fresh `game-designer` pass found the one genuinely zero-counterplay
outcome in the whole design, and an incompletely-reported simulation result:

61. **A region's guaranteed Monarch sharing a suit with a battle's fixed decree produces a must-win
    trick loss with no possible counter — the only unconditional, unmitigated forced outcome in 60+
    numbered findings.** Traced both branches: when the Monarch's suit is trump, the forced response
    (Swan or highest-of-suit, both ≤10) always loses to the trump-11 by ordinary rank comparison, not
    the Witch's special case — and being void of that suit doesn't escape it either, since a non-trump
    response loses to any trump card regardless. No deck, no card count, no avoided suit changes the
    result. Existed only because the pairwise-distinctness rule (rounds 15, 18) checked card identity
    but never suit. Fixed by extending that rule one level: a region's guaranteed Monarch may not
    share a suit with a paired battle's fixed decree. Added "void the guaranteed suit specifically"
    to the tools catalogue regardless, since it defeats the ordinary (non-trump) case outright.
62. **Round 35's simulation report left the favored side's own breach count inferable rather than
    stated**, unlike its fully-qualified report of the flipped schedule. Fixed by stating it
    explicitly: 500/500 for the favored side in the original schedule, closing the ambiguity about
    whether the board layer ever produces a real result at all.

Smaller fix from the same round: softened a citation that credited `us-civil-war-game-framing.md`
with a medal-goal example it never actually makes, matching the same distinction already drawn once
for a different medal-goal citation.

**Round 37**, after a thirty-seventh fresh `game-designer` pass cross-checked a claim against a
sibling document this document had never read (`reskin.md`), and generalized a question that had
only been asked about one of three identically-shaped cases:

63. **Finding #39 claimed the Vanguard "replaced Hex to fix" the one-way card↔board coupling problem
    and that scripted battles alone "reopen" it — checked directly, that fix was never built, for
    any battle.** `skirmish-board-replacement.md`'s own "what this fixes" section only ever claims
    the non-zero floor and spatial variety; `reskin.md` (one day before this document's own first
    settlements) states outright, discussing the same Friedrich/Faeria device this document
    independently proposed as a fix, that adopting it as flavour-only "closes nothing... that finding
    stays exactly as open as it was." Corrected: this is the base game's unfixed condition, not
    something scripted battles specifically reopen. Added a third option to the section's existing
    two — promoting `reskin.md`'s already-built flavour device to a real Clash rule — flagged as
    belonging to a different document, not decided here.
64. **The "decree visibility is itself the tell that a battle is scripted" question had only been
    asked about the decree, when two other variables are scoped identically for the identical
    reason** (the guaranteed card, round 5; the full per-hand goal list, round 21). Generalized: all
    three need resolving together, or the question needs to be "does it matter that a scripted battle
    can already be told apart" rather than three separate answers arrived at by accident.

Smaller fixes from the same round: noted the guarantee-card ladder's six-rung ceiling is only a live
cost if `hybrid-concept.md`'s still-open two-tier question lands on many scripted regions per
campaign; connected `reskin.md`'s presentation-only map highlight to the round-cap tiebreak's own
narration-only framing as the same design choice made twice.

**Round 38**, after a thirty-eighth fresh `game-designer` pass questioned round 35's own explanation
for its numbers, and asked for two measured findings to be combined into a real answer:

65. **Round 35's two schedules should have mirrored each other and didn't, and the stated model
    didn't explain why.** Isolated by re-running the player-favored schedule with flat round-parity
    alternation instead of the opener-anchor rule: identical 0/0/500 result either way, ruling out
    the opener-anchor rule as the cause. What's left is the AI's own `cellKey`-based tie-break or some
    other asymmetry between the mirrored bases — not fully diagnosed, but the finding stands
    regardless: a player-favored scripted battle has never once produced a real player Breach across
    both tested configurations, only the round-cap's narrated fallback. Re-weighed the round-cap
    cascade's "rare tie" framing accordingly, since for this schedule it's the *sole* resolution path,
    not an edge case.
66. **Findings #43 (worst-case dead-tricks) and #57 (hit-rate distribution) had never been combined
    into the number the retry loop actually produces.** Simulated a full clear (repeated attempts to
    success): the common case is 3.95 of 13 tricks dead per attempt (30.4%), not the 69% worst case —
    most failures are near-misses landing at 4–6 tricks, not early blowouts. About 16 dead tricks
    across a full ≈4.1-attempt clear, not the worst case repeated.

Smaller fix from the same round: flagged that `MUSTER_BONUS` is documented elsewhere as "the
least-grounded number in the module" — every simulation in this section is real against shipped code,
but the 7-vs-10 gap they measure will move once that placeholder is actually tuned.

**Round 39**, after a thirty-ninth fresh `game-designer` pass found the pivot-lock fix quietly broke
the guarantee it was patching around, and a stale cross-reference that had survived five rounds:

67. **Widening the must-lose goal to accept both winning bands was the wrong shape of fix — it lets
    a player satisfy a mandatory "must lose" gate by winning decisively (Victorious, 7–9 tricks),
    which no longer guarantees the defeat the gate exists to guarantee.** Fixed by not widening the
    must-lose object at all: split off a third use of the same goal-checking primitive — a
    decisive-result goal, accepting either winning band, for scenes that only need some clear outcome
    — and reserved the single-band must-lose object, unwidened, for scenes that genuinely require a
    defeat. "One system, two jobs" became "one system, three jobs" to record it. This also answers the
    still-open bonus-per-band question for free: only the new decisive-result object ever needs two
    bonus values.
68. **Round 22's "three costs compound" finding cited the guarantee-card ladder's six-rung ceiling
    as a must-lose cost five rounds after round 30 proved the ladder isn't a must-lose lever at
    all.** Fixed by re-scoping: a must-lose hand compounds two factors (threshold lock, CPU/deck
    determinism), not three; a must-win hand, where the ladder is confirmed live, still compounds all
    three. Corrected the "closes one third" fraction to match.

**Round 40**, after a fortieth fresh `game-designer` pass found the Monarch fix from round 36 only
closed the deliberately-authored version of its risk, leaving the ordinary, far-more-likely version
untouched:

69. **The pairwise-distinctness fix for a guaranteed Monarch sharing its suit with the battle's
    decree only prevents an author from *deliberately* creating that collision — but the same
    Monarch doesn't need to be anyone's guarantee to land in the CPU's hand, since only the decree
    card itself is pinned across a battle's hands, not every other card of that suit.** Computed
    directly: any single non-pinned card has a 13/32 ≈ 40.6% chance per hand of landing in the CPU's
    hand, and across a 3-hand battle the chance the CPU holds the trump-suit Monarch at least once is
    `1 − (19/32)³ ≈ 79.1%` — roughly six times the near-zero rate the authored-collision fix actually
    addresses, and invisible where the authored case was at least scoutable. Directly caused by round
    30's own fix (pinning the decree for the whole battle to protect must-lose players gives the
    natural Monarch three independent chances instead of one). Fixed by extending the same removal
    primitive the seventh-gap dealing fix already needs: the fixed-decree-suit's own Monarch is now
    pinned out of the CPU's dealt hand for must-win hands specifically.

Smaller fixes from the same round: corrected a citation crediting `hybrid-concept.md` with a
collapsed scenario-table range that's actually `reskin.md`'s; softened "already retracted the
leftover-pool argument" to match `ideas-and-concepts.md`'s actual, weaker wording ("unverified," not
wrong outright); credited the decisive-result goal (round 39) with incidentally weakening round 21's
deck-conflict problem; extended the per-hand dead-trick measurement across a full battle (≈12.3
hand-attempts, ≈160 tricks to clear one scripted battle at the measured floor).

**Round 41**, after a forty-first fresh `game-designer` pass asked two questions the mechanism-level
rigor had never been pointed at — how long this actually takes, and how much of it is a real
decision — and one was answered by measurement:

70. **This format's own campaign-scale table-time cost was never priced against a precedent already
    in this project's framework** (Culdcept's "neither layer is allowed to be the point," cited in
    `design-principles.md` §7). Multiplying already-computed numbers (≈160 tricks per scripted
    battle) against `hybrid-concept.md`'s still-open scripted-city-count question puts a modest
    campaign in the range of a thousand tricks of Fox for story beats alone. Documented as an open
    scope/feel question with three options, not decided here.
71. **Measured whether the must-lose "skill ceiling" is real or concentrated in a few moments**:
    extending the existing simulation harness, 46.6% of a must-lose hand's player turns qualify as a
    real decision (more than one legal option that doesn't strictly worsen the outcome) — notably
    higher than a skim of the toolkit's "concentrated at specific moments" framing implied. Stated
    with its exact operationalization, since a stricter definition could move the number.

Also added on this pass: named explicitly, for the first time, the line four separate fixes have
converged on without stating it — shaping what a hand can be dealt (decree, both guarantee cards, the
must-win Monarch pin) is fair game and stays "played straight," since it's input randomness, not a
touched trick outcome. Smaller fixes: connected findings #35/#54 and #56 as two edges of one
asymmetry; flagged that the Monarch pin's must-win-only scoping needs checking against decisive-result
goals, which can also be won.

Whether this document should replace `us-civil-war-game-framing.md` outright, or the two stay
separate, is the developer's call once this one is settled.
