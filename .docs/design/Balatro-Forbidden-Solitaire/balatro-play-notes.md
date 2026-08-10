# Balatro — play-through notes (presentation, onboarding, feel)

Recorded from a developer play session, 2026-08-10. Sixteen observations, taken while playing rather
than while reading a wiki.

**Scope and ownership.** [`balatro.md`](./balatro.md) owns Balatro's *rules* and the structural
design reading of them; `../design-principles.md` §8 owns its *transferable design lessons*. Neither
covers what this file covers: how the game **presents** itself to a player in a first session — what
it says out loud, what it puts on screen, what it lets you rearrange, and where it loses you. That is
the game-UX layer, and it is where these notes live. Nothing from those two files is restated here.

**What this file is for.** Part 1 is the session, as observed. Part 2 maps each note onto
[`hybrid-design.md`](./hybrid-design.md) — The Hunt — and says for each one whether it is already
shipped, structurally unavailable, an open question, or a copy/tuning call. Part 3 ranks the
transfers by how often a player would hit them, per `.claude/skills/game-ux/SKILL.md`.

**Nothing here is a decision.** Several notes land on values, copy, and pacing, all of which
`CLAUDE.md` reserves for the developer. Where a note implies a number or a phrasing, it is named as
an open question, not answered.

---

## Part 1 — the session, as observed

### Onboarding: the game says what it wants, out loud

1. **A Joker character talks you through the game the moment you press play.** It states the goal
   outright, and it states the reward in the same breath — the money is named, not discovered.
2. **A Run Info panel lists every poker hand**, so the full scoring table is a panel away at any
   point, not something to be remembered or looked up externally.
10. **The tutorial shop forces the purchase of one specific card.** Being made to buy a thing is what
    made the shop legible — the point of the screen arrived before any freedom to misuse it.

### Information: the numbers are reachable, mostly

3. **Hovering a card tells you the chips it earns.** The per-card contribution is available, on
   demand, per card.
7. **The round ends on a scoreboard that reports what you did not do.** "Best hand 60 chips,
   0 purchased, 0 rerolled" — the zeros were the useful part. They named two options that existed and
   went unused, which is how the session learned they were options at all.
15. **The rising numbers are the payoff.** `+11`, `+10`, `×17` landing one after another is the thing
    that feels good — the arithmetic performed rather than reported.

### Agency over the hand

4. **Eight cards held, and the player chooses which to play.** Selection from a held hand is the
   moment-to-moment decision. (The session's own note against this — "I deal the cards out to the
   player with no choice, I think this could be good" — reads two ways; §2.4 below takes both.)
5. **The player can also discard**, which is a second, separate lever on the same hand.
6. **The hand can be sorted by suit or by rank.** A one-tap reorder of held cards.

### Economy, progression, cosmetics

11. **Consumables are on sale**, alongside the persistent cards.
12. **Winning early pays.** Each unused hand at round end returns $1 — clearing a round efficiently is
    paid for directly.
13. **Permanent upgrades are purchasable within a run** — more discards was the first one taken, and
    `+1` hand size (nine cards) read as strong. Neither carries into the next run; a new run starts
    over.
14. **The Jokers are great when they work** — conditional on the build coming together.
9. **Deck art is selectable.**

### The one complaint

16. **Cards arriving are hard to see.** After a discard, the replacement cards enter without the
    arrival being legible — waiting on a 6, the 6 can land and go unnoticed. The state changed and the
    change did not register.

---

## Part 2 — what transfers to The Hunt

The Hunt's shipped surface, for reference: `src/app/warCouncil/` renders a 13-trick round with a
persistent ledger (`HuntLedger` — running Spoils, the current Standing band and its multiplier, the
running product, the Demand), the Quarry's character and rule-break always on screen
(`QuarryDossier`), the next-trick intent telegraphed at suit-and-stance fidelity
(`IntentTelegraph`), and an end panel that shows `Spoils × Standing = Score` as arithmetic before its
cleared/missed verdict (`RoundOverPanel`). See
[`../../implementation/war-council-ui/hunt-readouts-and-telegraph.md`](../../implementation/war-council-ui/hunt-readouts-and-telegraph.md).

| # | Note | Where it lands in The Hunt | Status |
|---|---|---|---|
| 1 | Character states goal + reward on press-play | Nothing states the goal in words; the Demand is on screen as a number. **No reward is stated because clearing a Demand pays nothing** | Open — sharpens `hybrid-design.md` §7's "a run has no defeated opponent" and §12's "no named target emotion" |
| 2 | Run Info lists every poker hand | The **Standing band table** is the direct analogue. The ledger shows the band you are in; nothing shows what the other bands pay or which trick count moves you between them | Gap, and load-bearing — see §3.1 |
| 3 | Hover a card → its chips | A card's Spoils value **is** its rank under `cardBaseValue` (`src/hunt/config.ts`), and the rank numeral is already on the face. Nothing labels it as the value | Cheap on-face fix; hover would be the wrong answer here (touch has no hover) |
| 4 | Choose which of 8 held cards to play | A trick-taker already chooses which card to play, every trick. What the player never chooses is **which cards they hold** — the analogue of that is Forage / Snare (§3, §2.4 below) | Partly shipped, partly the Snare proposal |
| 5 | Discards as a second lever | **The Hunt has no deck-search resource at all.** `balatro.md` §2.7 already warns that a hybrid keeping the scoring layer and dropping discards "loses more play than it looks like" — this note is first-hand evidence for that warning | Open gap; the base game's Woodcutter draw and Fox decree swap are the only existing verbs that reach the undealt cards |
| 6 | Sort hand by suit or rank | The hand renders in dealt order; no reorder control ships | Small, real win — 13 cards across three suits is exactly where sorting pays |
| 7 | Round-end scoreboard reports unused options | `RoundOverPanel` reports the arithmetic and the verdict. It reports nothing about **options left unused** — and §9's own test for the Forage budget is literally "whether the player ever leaves an edit unspent" | Strongest transfer — see §3.4 |
| 9 | Deck art options | Cosmetic; no structural bearing | Out of scope, developer's call |
| 10 | Tutorial forces one purchase | The Hunt has no shop by construction (§3). The teachable equivalent is a **first Forage that is chosen for you** | Open, only if Forage ships with onboarding |
| 11 | Consumables for sale | Closest analogue is **Snare** — in-round, spent on use (§3, still a blocked proposal) | Blocked on §3's dominant-strategy problem |
| 12 | Unused hands pay $1 each | No economy and no currency exist here (§3 rejects a shop deliberately). The adjacent live question is §12's "no stated consequence for clearing the Demand with surplus Spoils" | Structurally unavailable as written; the underlying want — efficiency paid for — is open |
| 13 | Permanent upgrades within a run; nothing across runs | **This is already the chosen model** — §7: Forage persists within a run, nothing persists across one. Note that `+1 hand size` has no analogue: 13 tricks is the round's fixed shape (§8), so hand size cannot grow, only shrink (the Woodcutter Quarry) | Confirms an existing decision; the banked-progress question in §7 stays open |
| 14 | Jokers are great when they work | The Hunt has **no Joker layer by construction** — §1's component table forbids a device that is not an intervention on Spoils or Standing, and §7 names running one progression system against Balatro's four as its accepted risk | Not a gap to fill; a risk already accepted in writing |
| 15 | Rising numbers feel great | The ledger updates Spoils and the band as tricks resolve, so the running product does move. What does not exist is the **performed** version — the count-up, the beat between terms | Open, and a pacing call (developer's) |
| 16 | Cards arriving are hard to see | Every state that arrives unbidden here: the Quarry's played card in the trick well, a decree swapped by the Fox, a Woodcutter draw. §4 already *requires* the decree swap be "shown the instant it lands" — this note is the same requirement arriving from the player's side | Open; the requirement is written but its legibility is unverified |

### 2.4 — Note 4 read both ways, because it reads both ways

The note says the player choosing from eight held cards is Balatro's core decision, then adds "I deal
the cards out to the player with no choice, I think this could be good." Both readings are worth
having:

- **If it means "our forced deal is fine"** — it is, and it is already load-bearing. The 13-card deal
  is the round's fixed shape (§8), and the whole quantitative spine of the design (§3's `2k × f(k)`,
  the 108 ceiling) rests on it. A hand you choose the *contents* of would move all of it.
- **If it means "choosing what you hold could be good here too"** — that is exactly what Forage and
  the Snare proposal are for. Forage chooses the deck's contents with **no** information (§3), which
  is the criticism §3 makes of itself; the Snare layer is the only thing proposed anywhere that
  chooses with the board visible. Note 4 is a data point in favour of that layer existing.

They are not in conflict: Balatro's eight-card hand does two jobs — pick a play, and shape what you
hold — and The Hunt splits them across two layers rather than one.

---

## Part 3 — the transfers, ranked by how often a player hits them

Per `game-ux`'s ranking rule: cost compounds with frequency, so a thing touched every trick outranks
a thing touched once per run.

### 3.1 The whole Standing band table, always visible — hit on every one of 13 tricks

Note 2's Run Info panel, applied. This is not a nice-to-have here for a reason specific to this
design: **the decision The Hunt asks every trick is which band to land in.** §3's score curve is
bimodal, §6 shows the bands are not intuitively ordered (three tricks can beat four), and §9 has the
multiplier column as an open decision — so the player cannot infer the table and cannot be assumed to
remember it. The ledger currently shows the band they are in, which answers "where am I" but not
"where else could I go, and what does it pay."

`game-ux`'s hard floor also applies directly: anything the current decision needs is on the face of
the thing, always visible — never behind hover, and by the same argument never behind a panel toggle
if the decision is live every trick.

### 3.2 A card's value named on its face — 13 cards, read continuously

Note 3, corrected for touch. Under `cardBaseValue`, rank *is* Spoils value, so the number is already
printed — what is missing is that the player is never told the rank they are reading is the number
they are collecting. This is the cheapest item on this list and it is the one Balatro pays a hover
for.

If §9's card-value row ever moves to flat-1, this reverses completely: the face would then carry a
rank that is *not* the value, which is worse than saying nothing. The fix and that open decision are
one item.

### 3.3 Legibility of state that arrives unbidden — several times per trick

Note 16, which is the sharpest note in the session because it is a complaint about a game the player
otherwise liked. The general shape: **a state change the player is actively waiting for can happen
and not register.** `balatro.md` §2.5 documents Balatro's other version of this (a consequential
rule whose effect is never shown); this is the presentational version.

In The Hunt the candidates are the Quarry's card landing in the trick well, a Fox decree swap, and a
Woodcutter draw. §4 already commits to the decree swap being "shown the instant it lands" — that
commitment is written but nothing has verified a player registers it. How long an arrival holds the
eye is a pacing value, so it is the developer's; that it needs checking in a browser rather than in a
test is QA's, per `game-ux`.

### 3.4 A round-end report of what went unused — once per Hunt

Note 7, and the most valuable transfer in the list because it does two jobs at once.

As **UX**, the zeros taught the player that options existed. As **instrumentation**, §9's Forage
budget row already states its own test in these words: *"whether the player ever leaves an edit
unspent or regrets how one was spent. If that never happens, 4 is too many."* A round-end line
reporting unspent Forage edits is that measurement, surfaced to the player instead of logged for the
developer — the same number settling a design question and teaching the player in one place.

`RoundOverPanel` already exists and already shows arithmetic, so this is an addition to a panel
rather than a new surface. What it should report is only meaningful once Forage ships; the shipped
slice has no unspent resource to report.

### 3.5 The goal and the payoff stated in words — once per run

Note 1. The Demand is on screen as a number from the first trick, so the *goal* is present but never
stated. The *payoff* is a different matter and is not a UX gap: **there is nothing to state**,
because §7 records that a run has no defeated opponent and §12 records that nothing rewards clearing
a Demand with surplus Spoils. Balatro names the money before you play. The Hunt cannot name anything
yet, and that is a design gap surfacing as a copy gap.

---

## What does not transfer, and why — stated plainly

Four notes are structurally unavailable rather than unbuilt, and it is worth having the reasons on
record so they are not re-proposed:

- **Note 12 (unused hands pay $1)** and **note 11 (consumables for sale)** need a currency. §3
  rejects a shop on the grounds that a flat bonus cannot keep pace with a rising Demand.
- **Note 13's `+1` hand size** needs a variable hand. 13 tricks is fixed by §8 and everything
  quantitative in §3 is derived from it.
- **Note 14 (Jokers)** needs a third scoring channel, which §1's component table forbids by
  construction.

Recording the want anyway: three of these four are the player asking for **more levers on the hand**,
which is the same want note 5 expresses as discards. That the design has one editing verb and no
deck-search resource is §7's accepted risk, and this session hit it from four directions in sixteen
notes.

---

## Open questions this session raises, all the developer's

None of these is answered here.

- Whether the Standing band table is a persistent panel, a hover-free reveal, or on-screen at all
  times — a layout and copy call (§3.1).
- How long an arriving card holds the eye, and whether it needs motion, a hold, or a mark (§3.3) —
  a pacing value, checked in a browser.
- What clearing a Demand with surplus Spoils should be worth, if anything — the missing payoff behind
  note 1 and §12's smaller finding.
- Whether The Hunt gets a deck-search resource at all, given note 5 and `balatro.md` §2.7's warning.
- Whether a first Forage is chosen for the player, tutorial-style, per note 10.

---

## Sources

Developer play session of Balatro, 2026-08-10 — the sixteen notes in Part 1 are that session's own
record and are not sourced from documentation.

Cross-references: [`balatro.md`](./balatro.md) (rules and design reading, §2.5 and §2.7 cited above) ·
[`hybrid-design.md`](./hybrid-design.md) (§1, §3, §4, §6, §7, §8, §9, §12) ·
[`../design-principles.md`](../design-principles.md) ·
`.claude/skills/game-ux/SKILL.md` and its `references/full-viewport-layout.md` ·
[`../../implementation/war-council-ui/`](../../implementation/war-council-ui/) for what the Hunt
screen currently ships.
