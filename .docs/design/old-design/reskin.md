# The War Council reskin — replacing the cards

**Status:** early concept, gathered from conversation. Numbers and titles below are the developer's
own calls, not defaults I invented — where something is still genuinely undecided it's marked
**Open**, not quietly resolved. Same convention as
[`skirmish-board-replacement.md`](./skirmish-board-replacement.md).

**Why this exists:** the developer doesn't want the War Council to feel like a card game, and wants
every physical card replaced. This is the first real answer to
[`ideas-and-concepts.md`](./ideas-and-concepts.md)'s idea #2 (that file was renamed from
`campaign-layer-concept.md` on 2026-08-07, same content) — "same trick-taking mechanics
underneath, but presented as a turn-based tactical exchange, not visibly 'playing cards.'" Nothing
in this document changes a rule; it changes what every rule is *made of*. The mechanics themselves
are still [`../game_rules/fox-in-the-forest.md`](../game_rules/fox-in-the-forest.md)'s trick-taking
engine, owned there and in [`hybrid-concept.md`](./hybrid-concept.md). Research that informed
several choices below lives in [`design-principles.md`](./design-principles.md) §7 (added the same
session as this document) — Halo 3's rank ladder, card-driven wargames' dual-use cards, and the
Fox in the Forest Duet lesson about single-axis spatial coupling are all cited from there.

---

## The job list

Whatever replaces a physical card has to keep doing every one of these jobs, or the underlying
rules stop working — this list is what every choice below was checked against:

1. A **suit** — three categories, neutral against each other except one is favoured this round.
2. A **rank** — an 11-step ordinal, compared at a glance.
3. **Odd ranks carry an ability** (the original: Monarch, Witch, Treasure, Woodcutter, Fox, Swan).
4. A **hidden hand of 13**.
5. **Depletion** — played is gone; the endgame is knowing what's left.
6. The **decree** — a public object setting what's favoured, swappable by one specific ability.
7. **A public count of wins, with hidden faces.**

The one rule that resists almost any fiction is **follow-suit** — "if you hold the led suit, you
must play it" is arbitrary in most themes. The fix that made everything else fall into place: suit
isn't a category of card, it's **which arm of your force you're committing**.

---

## Settled

### Suit → the three arms

**Foot, Horse, Siege engines.** Rejected alternative: suits as three battlefield *flanks*
(Left/Centre/Right), which maps geography onto suit directly but risks reading as redundant with
the Vanguard's own spatial hex board rather than reinforcing it. Arms avoid that collision entirely
— they describe *what* you're committing, not *where*, leaving "where" to the Vanguard alone.

### Rank → committed strength

An 11-step troop count, abbreviated on the card face so a 13-piece hand stays legible in a
no-scroll viewport (`game-ux`'s hard floor): **10K, 20K, 30K, 40K, 50K, 60K, 70K, 80K, 90K, 100K**,
then a deliberate break at the top — **rank 11 = 1M**, not 110K. The break isn't an arithmetic
accident: it's "the top command doesn't field a division, it fields the whole army," and it's the
reason rank 11's title (below) still reads as a standout without needing its ability re-explained.

### Odd ranks → military rank titles, not unique characters

First draft used named characters (Forlorn Hope, General, Quartermaster, Pillage, Mercenary, Crown)
— each written to individually justify its ability. **Superseded.** The developer caught the real
problem: a card that can be played, lost, and reshuffled across a whole deck can't be a *singular*
person — you can't lose "the Crown" or "the General" repeatedly and have that still mean anything,
because a kingdom only has one of each. **Military ranks solve this for free**, because a rank is a
role many people hold at once — losing "a Sergeant" doesn't imply the only Sergeant in the army
died.

Pulled from Halo 3's actual multiplayer ladder (Halopedia — cited in `design-principles.md` §7):
Recruit → Apprentice → Private → Corporal → Sergeant → Gunnery Sergeant → Lieutenant → Captain →
Major → Commander → Colonel → Brigadier → General.

| Rank | Value | Title | Original ability (unchanged) |
| --- | --- | --- | --- |
| 1 | 10K | Private *(or Recruit — open, see below)* | Lose with this → you lead the next Gambit |
| 3 | 30K | Corporal | Swap Field Advantage |
| 5 | 50K | Sergeant | Draw 1, bury 1 |
| 7 | 70K | Lieutenant | Winner scores per matching card in the Gambit |
| 9 | 90K | Captain | Alone in a Gambit, counts as favoured |
| 11 | 1M | Brigadier | Forces opponent to answer with their best or their weakest |

Deliberately skipped Major, Commander, and Colonel between Captain and Brigadier — same move as the
10K→1M value break: rank 11 should feel like a full tier up, not the next rung on the same ladder.
Stopped short of General entirely, matching the developer's call to avoid it. **General** is
excluded from the title deliberately, in favor of Brigadier — senior without being singular in the
way General or Crown were (an army has one General but several Brigadiers, one per brigade).

Under this scheme the title is just the rank; each card's ability is separate rules text, not
baked into the name the way the first draft's character titles were.

### The decree card → Field Advantage

The face-up object announcing which arm has the advantage this round — what Corporal's ability
swaps. Chosen over "Standing Orders" (too tied to a chain-of-command metaphor already spent on the
rank titles) and "The Advantage" alone (lost the military framing).

### A trick → Gambit

The single most load-bearing rename here, because it fixes a real mismatch, not just a word.
Combat words (Skirmish, Sortie, Battle Victory — all considered and dropped) frame every exchange
as something you win or lose, and losing reads as bad. But look at the actual scoring curve:

| Tricks won | Points | Band |
| --- | --- | --- |
| 0–3 | 6 | Humble |
| 4–6 | 1–3 | Defeated |
| 7–9 | 6 | Victorious |
| 10–13 | 0 | Greedy |

Restraint (Humble) and aggression (Victorious) score identically; only overreach (Greedy) is
punished. A combat word tells the player "winning this exchange is good" — which is mechanically
false here, not just a flavour mismatch. **Gambit** — a deliberate move, often a considered
sacrifice, valued by the position it buys rather than by whether it was "won" — doesn't presuppose
that. Thirteen Gambits make up a War Council; "you won the Gambit" still reads fine when it happens,
without implying that losing one was a mistake.

### "Battle" stays exactly as it already is

Confirmed, not changed: **Battle** already means the whole fight for one city — potentially many
rounds, until the Breach — matching both `hybrid-concept.md`'s loop diagram and the `src/battle/`
module (`battleState.ts`, `battlePhase.ts`, `startBattle.ts`). Nothing in this reskin touches that
scope. It came up only because an early proposal ("Battle Victory" for a won trick) would have
pulled the word down to mean something far smaller — caught and dropped before it stuck.

### Naming collisions to protect against

A running theme worth stating once so future additions check against it rather than re-colliding:

| Word | Already means | Owner |
| --- | --- | --- |
| **Battle** | The whole fight for one city, many rounds | `hybrid-concept.md`, `src/battle/` |
| **War Council** | The 13-Gambit card round itself | `CLAUDE.md` → Game naming |
| **The Vanguard** | The hex-grid board | `CLAUDE.md`, `skirmish-board-replacement.md` |
| **Muster / The Clash / The Breach** | The Vanguard's move budget / action exchange / win condition | `skirmish-board-replacement.md` |
| **Gambit** | One card exchange within a War Council round | this document |

Notably: **"board" is reserved for the Vanguard's hex grid.** Any visual for the War Council needs
its own word (see Open, below) rather than also being called "a board."

### The individual piece → The Colour, grouped by arm

Four shapes were mocked up and compared side by side (a wargame counter, a torn-paper dispatch
with a wax seal, a regimental banner, and an RTS-style command tile) rendered against the same
three example units so the comparison was fair. **The Colour — a regimental banner, fabric
coloured per arm, icon and value on the fabric face — won**, over Counter (ties well to a possible
Vanguard token aesthetic, but less distinctive), Dispatch (leans bureaucratic), and Order Tile
(safest and most RTS-familiar, and correspondingly the least distinctive).

The layout that follows from it: banners aren't a single fan of 13. They're **grouped into three
stacks, one per arm** (Foot / Horse / Siege engines), sitting in the player's own staging zone.
This does real mechanical work, not just visual tidying — whether a stack is empty is visible at a
glance, which makes the follow-suit constraint ("do I hold anything in the led arm") legible
without scanning all 13 individual pieces the way a flat fan requires.

Two consequences worth recording before they're lost:

- **A stack must open via tap/click, not hover alone.** Hover has no touch equivalent — a hard
  floor `game-ux` already holds every screen to — so a stack that only fans open on mouse-hover
  doesn't exist on a tablet. Tap/click is the universal trigger; hover can additionally preview-open
  a stack for mouse users (`@media (hover: hover)`), but can't be the only way in.
- **A closed stack can show its remaining count through physical thickness**, not just a number —
  a real depletion cue that costs nothing and satisfies "state reads without motion or colour
  alone" for free.

Keyboard navigation becomes two levels once this ships: Tab moves between the (at most three)
stacks, arrow keys move within whichever stack is open. Each stack likely holds well under 13
pieces, so the "more than ~5 siblings needs roving tabindex" threshold is easier to clear than it
was for a flat 13-piece fan.

---

## Open

- **Rank 1: Private, Recruit, or Scout.** Private is a real deployed soldier (my default so far);
  Recruit is Halo's actual bottom rung and arguably fits the "expendable vanguard" flavour of that
  ability (lose with this, you lead next) better, at the cost of implying a unit not yet properly
  deployed. **Scout**, raised in conversation 2026-08-07, is a third candidate worth weighing
  seriously — a scout being first to move and expendable by design fits the ability at least as
  well as either of the first two, arguably better since it's motivated by the *role* rather than
  by rank alone. Undecided among all three.
- **What the hand of 13 is called.** Proposed: **Detachment** — a portion of a larger force split
  off for one specific task, which also does double duty setting up the campaign layer (your hand
  isn't your whole war effort, just what you've committed to this siege). **Army** was considered
  and rejected as overselling it. Not yet confirmed.
- **The "round" tier.** The loop is Battle → *round* (currently just plain English, unbranded) →
  War Council → Gambit, running in parallel with Muster → The Clash → The Breach. Deliberately not
  named yet — the developer asked to stay focused on Gambit first and come back to this.
- **The War Council Map.** Idea stage: replace the hand-fan-plus-panels layout with one continuous
  flat 2D map/table visual — opponent's forces, a contested middle, your own forces (now: three
  arm-stacks of Colours — see Settled, above), all as one image rather than separate UI regions.
  Directly extends `game-ux`'s existing principle that the cards (here, the map) take visual
  precedence and the UI serves them. **Name:** "map," not "board" — satisfies the collision-table
  requirement above without a made-up word; treat as tentative, not final.

  **Developed further in conversation, 2026-08-07 — the important scope boundary first:** this map
  is its **own screen**, not a surface shared with the Vanguard. The two stay separate screens
  joined by the existing transition, and the Vanguard board itself is untouched by any of this — it
  is a separate redesign, not scoped here. That matters for one specific reason: none of what
  follows closes `concept-critique.md`'s Problem 2 (the card phase and the board never talk to each
  other). That finding stays exactly as open as it was — this map is presentation, not a data path
  to the Vanguard, however similar the two might end up looking.

  What was settled about it in that conversation:
  - **Layout matches `game-ux`'s existing shell model directly — no new pattern needed.** The map
    takes the `1fr` play band, where `TrickWell` sits today. Status and the opponent's side anchor
    the top band; the player's own three Colour stacks (Settled, above) occupy the bottom hub band,
    thumb-reachable. A rough wireframe from that conversation: thin top and side margins, a wide
    bottom band for the stacks. Side margins are currently empty in that sketch — whether anything
    besides breathing room belongs there (the decree card itself? a depletion indicator?) is open.
  - **The decree highlights a themed region of the map**, matching whichever arm currently holds
    Field Advantage — "Horses" lights up an open field, and so on for Foot and Siege engines once
    their terrain reading is picked. This is the Friedrich/Faeria device from
    [`design-principles.md`](./design-principles.md) §7 (suit-as-terrain, a shared vocabulary
    instead of a scalar) applied here as pure flavour rather than a rule change — it reuses
    Corporal's existing "Swap Field Advantage" ability for free, which now reads as *redirecting the
    theatre* rather than just changing a printed word.
  - **Per-Gambit resolution:** the winner's token visually lands in the highlighted region, and the
    **aggression meter** — a corner-anchored HUD element, the visual answer to job #7's "public
    count of wins" — ticks up by one. Both are flavour on this screen; neither currently reads from
    or writes to Vanguard state (see the scope boundary above).
  - **Top-down vs. isometric is undecided, developer's call** — but the trade-off is worth stating
    plainly: top-down keeps the highlighted region and the landing token unambiguous at the map's
    actual size (inset, not full-bleed) — no perspective foreshortening, nothing drawn "in front of"
    a token to occlude it. Isometric reads more like a real battlefield but costs more art and care
    to keep the same two things legible when something else on a tile can sit in front of them.

  Carried over from the original idea, still genuinely open:
  - Whether the opponent's side shows abstracted, unrevealed stacks (reads as a real standoff) or
    stays empty until they commit a Gambit (reads closer to today's scoreboard-only public count).
  - What actually happens when a stack fans open — a full spread, a slide, an arc — not designed
    yet, only agreed that tap/click (not hover alone) has to be able to trigger it.
  - This is a materially bigger art/rendering scope than the current flat 2D implementation
    (`HandFan`, `PlayingCard`, `TrickWell` already exist) — flagged honestly, not a blocker to the
    idea, just a real cost for whenever implementation is scoped.

- **Ability and outcome feedback needs its own pass, and it isn't uniform.** Raised alongside the
  map idea, 2026-08-07. A round result and a battle result are rare enough (4–8 rounds a battle, and
  fewer battles than that) that fully authored, varied narrative flavour is cheap and worth having
  — e.g. a 0–3-trick round narrated as a "cunning ambush." A single Gambit is not rare: up to 13 a
  round, so 50-plus a battle, which makes it the single most-repeated event in the game. Giving
  every one of those the same full-sentence treatment stacks a real reading cost on top of
  `concept-critique.md` Problem 3's already-flagged pacing issue — a round's outcome often locks by
  trick 8–9, so several Gambits a round are already mechanical filler; narrating each in full prose
  spends real time on exactly the tricks that were already dead weight. The likely shape, not yet
  built: full authored prose reserved for what's actually rare (an ability firing, the round result,
  the battle result), a compact log-line for the routine Gambit ("Horses — you, 2 vs their 3"), no
  sentence required.
  - **Ability triggers need a visible beat regardless of the above** — Sergeant's draw/bury,
    Lieutenant's per-match scoring, Captain's alone-favoured, Brigadier's forced answer all change
    the outcome in a way a bare score-tick can't communicate; a hidden ability trigger is Meier's
    invisible-consequence trap.
  - **Any dialogue-stitching system should slot from pieces the game already names** — arm, rank
    title, decree, the numeric value — rather than hand-authoring one line per exact combination:
    3 arms × 11 ranks × win/lose × ability-or-not clears a hundred raw combinations fast.
  - **The Colour itself needs to show its own ability, not just arm and rank.** The Settled
    description above only specifies "icon and value on the fabric face." Without the ability on
    the piece, a player has no way to read the odd-rank table from the object in front of them.
- **Tap-to-commit or select-then-confirm.** Once a stack is open, does tapping a specific banner
  play it immediately, or does it just select it, with a separate confirm step after? The tap-cost
  principle favours "opening a stack is free browsing, tapping the banner inside it is the commit"
  — but this is a feel call for the developer, not a structural requirement, and isn't decided.
- **Whether "Forlorn Hope" / "Pillage" survive as ability flavour-text.** Both were dropped as card
  *titles* when the scheme moved to generic ranks, but neither was explicitly re-examined as
  possible *descriptive text* for what rank 1's and rank 7's abilities actually do (e.g. "the
  winner pillages: scores per matching card in the Gambit"). Genuinely unresolved, not assumed.
  Related, raised 2026-08-07: rank 1's ability text ("lose with this, you lead the next Gambit") has
  been drafted informally using the verb "lay first" — flagged by the developer as still card-table
  language, needing a non-card replacement. Whatever's chosen **can't reuse "Clash"**, which the
  collision table above already reserves for the Vanguard's action exchange. Candidates raised,
  undecided: "opens the next Gambit," "advances first," "leads first."
- **Card-to-board coupling (A/B/C from the pre-reskin conversation), still live, still undecided:**
  - **A** — an ability gains a direct Vanguard effect (e.g. Lieutenant's pillage grants an Expand
    to the Gambit's winner instead of, or alongside, points).
  - **B** — a true Ops/Event forfeit, spending a card on the board instead of a Gambit. Considered
    and set aside: discarding a card breaks the 13-Gambit band table Gambit's own reasoning depends
    on, so this one is probably out rather than genuinely open.
  - **C**, updated for Arms — since suit is now *which arm*, not *which flank*, this option becomes
    "arm maps to Vanguard action type" rather than "suit maps to board geography": Foot → Expand,
    Horse → Overwrite, Siege engines → Reinforce. Not decided whether to pursue.
