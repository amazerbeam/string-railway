# Feature inventory for the port

**Every feature the prototype contains, one heading and a sentence or two each.** Written as a port
checklist: read down it, and you have the whole game.

**A heading starting with `X` is dead — do not port it.** Dead here means one of two things, and
each entry says which: either the feature was **removed from the code**, or it is **still in the
code and enforced but nothing in play can reach it** (no card mints it, no shop sells it, no draw
produces it). The second kind is the dangerous one — it type-checks, it has tests, and porting it
would carry a mechanic the game does not actually have.

Compiled 2026-09-04 from the code and from `.docs/game_rules/the-hunt.md`, which is the authority on
the rules themselves. This file says **what exists**; that file says **how each rule works**; and
`structure-notes-for-the-port.md` says **what to build differently in Unity**.

---

## Names the port changes

The prototype's vocabulary was written before the game had a setting. **The port is set in Tech
Duinn** — the house of Donn in Irish myth, where the dead gather before passing onward — and the
names below change with it. Some were borrowed wholesale from *The Fox in the Forest*; the rest were
placeholder game-development words that named nothing inside any fiction.

**This table is the authority for the port.** The rest of this document still uses the prototype's
words, because it is compiled from the prototype's code and must keep describing it accurately. When
the two disagree, the port takes the right-hand column.

**The myth behind every name is in [`../design/tech-duinn-lore.md`](../design/tech-duinn-lore.md)** —
which figure, why that one and not another, what was invented rather than inherited, and the spec for
the in-game codex that shows the player all of it. This file says *what* a thing is called; that file
says *why*. Do not restate its reasoning here.

| Prototype | Port | Why it changes |
| --- | --- | --- |
| Bells, Keys, Moons | **Raven, Salmon, Hound** | All three suit names lifted whole from *Fox in the Forest*. See the deck section below for the full note. |
| The Quarry | **the Shade** | Quarry means something being hunted down. Nobody is hunted here — both sides are sitting at a table waiting to pass onward, and a shade is a soul that has not gone yet. |
| The Hunt | **the Wake** | An Irish wake is a night spent around the dead, drinking and playing games. That is what this encounter already is. |
| Buff, buff card | **Charm** | "Buff" is a bare game-development word with no fiction behind it. A charm is a small carried object that does one thing under one condition — exactly what these cards are. |
| The slot machine | **Dagda's Cauldron** | The Dagda's cauldron is the vessel that never empties and sends nobody away unsatisfied. The three-reel mechanism is untouched; the player draws from the pot rather than pulling a lever. |
| The Vault | **the Cairn** | A cairn is a pile of stones over the dead that every passer-by adds one stone to — cross-run progression described literally. Each finished run leaves a stone, and the pile outlives the run. |
| Cheat | **Oathbreak** | Following the lead suit is framed as an oath the player is bound by, stated as such in the tutorial. The card is then not cheating but breaking that oath, which is a thing a character in this setting does knowingly and at a cost. |
| Momentum | **Surge** | Momentum is physics vocabulary sitting beside Blade and Guard, which are not. |
| The decree | **the Omen** | The card turned face up to rule the hand. |
| The flask | **Goibniu's Ale** | The ale at Goibniu's Otherworld feast is what keeps the gods from ageing, so it is a healing draught by inheritance rather than invention. It also ties the shop back to a face the player already knows from the 5. |
| War Council | **the fight** | Left over from an earlier design direction the game no longer has. See the fight-screen entry near the end of this document. |

### No leakage — the old words appear nowhere in the Unity project

**This is a hard rule, not a tidiness preference.** A rename that only reaches the strings a designer
happened to look at leaves the old vocabulary alive in class names, scene names, asset filenames,
enum members, serialised fields and log lines — and from there it climbs back out into the UI, months
later, through a debug readout or a tooltip nobody re-read. The prototype already demonstrates the
failure: its fight screen's dossier still calls every opponent "The Monarch" while four other
surfaces show the real name, which is exactly this, caught late.

**Nothing in the Unity project may carry any of these words**, in any casing or compounding:

`Bell` · `Key` · `Moon` · `Quarry` · `Hunt` · `buff` · `Cheat` · `Momentum` · `decree` · `Vault` ·
`flask` · `slot machine` · `WarCouncil` / `warCouncil` · `Swan` · `Fox` · `Woodcutter` · `Treasure` ·
`Witch` · `Monarch`

That covers all of the following, not just the first:

- **Player-visible text** — every button, label, tooltip, heading, refusal reason, verdict line and
  tutorial string. "Apply Buff" must not exist; the button is **Apply Charm**, and the screen behind
  it is **Manage Charms**.
- **Code identifiers** — class, method, field, property, enum and enum-member names, including
  private ones.
- **Serialised names** — ScriptableObject asset names, serialised field names, save keys, and
  anything else bound by string. These are the ones that silently survive a rename, because the
  compiler cannot see them.
- **Project files** — folder, scene, prefab, sprite, animation and audio filenames.
- **Everything written down** — comments, log messages, analytics event names, and test names.

**How to check.** One case-insensitive search of the Unity project for the word list above should
return nothing. Run it before any milestone, not once at the end: the words re-enter one at a time,
usually by someone copying a line out of this document or out of the prototype.

**Two deliberate exceptions, and only two.** *The Fox in the Forest* may be named as the parent game
in credits and in design documentation — that is provenance, not vocabulary. And `.docs/` in this
repository keeps the old words throughout, because these documents describe the prototype and must
keep describing it accurately. The rule is scoped to the Unity project.

Two consequences worth stating, because both are easy to get wrong later:

- **The skull keeps its name and its icon — this was decided, not overlooked.** A geas, the binding
  taboo of Irish myth, is the more authentic word and was rejected on purpose: a skull tells a player
  to avoid the thing on sight, with no teaching required, and that legibility is worth more than the
  accuracy. Everything built on it keeps the word too — Skull Low, Skull Helmet, Skull Tether, and
  the Curse that puts a skull on the player's own card.
- **Total, roll, pot, coins, hearts and the bronze/silver/gold tiers do not change.** Gambling
  vocabulary is correct at a wake rather than wrong, and the rest is doing plain mechanical work that
  dressing up would only obscure.

### The named ranks — the cast

Swan, Fox, Woodcutter, Treasure, Witch and Monarch were the *Fox in the Forest* cast almost entire.
The port replaces all six with figures from Irish myth, chosen so that **the figure's story is
already the card's rule** — the name teaches the mechanic, so the rule needs less explaining.

**Every name leads with a word the player already knows, then gives the mythological name.** That
ordering is the rule, not a stylistic preference: it means a player who knows no Irish myth still
reads something useful off every card, and it quietly solves the pronunciation problem on the harder
names, because nobody has to say "Goibniu" to know he is a smith.

| Rank | Port name | Its rule | Why this figure |
| --- | --- | --- | --- |
| 1 | **Banshee Clíodhna** | If it is in a trick and belongs to the side that lost, that side leads next. | Banshee is the one word of Irish myth every player already knows without teaching. The banshee attends the side about to lose, so a card handing the lead to the loser is her doing what she is for. Clíodhna is named in Munster tradition as a queen of the banshees. |
| 3 | **Shapeshifter Púca** | Name any suit; it becomes trump immediately. | The Púca changes what it is, mischievously and at your expense. A card whose function is changing what trump *is* has no better match. |
| 5 | **The Smith Goibniu** | Swaps a card for a fresh draw; raises the swap budget. | Goibniu forges the weapons of the Tuatha Dé. Taking a thing and handing back another is what a smith does and what this card does. |
| 7 | **Graverobber Bres** | A victorious trick carrying it pays +1 base damage for the fight; a losing one costs 2 health instead of 1. | Bres was the king who bled his own people for tribute and was thrown out for it — a bargain that turns bad. Graverobbing is also pointed in the house of the dead. |
| 9 | **War Goddess Morrígan** | A lone one counts as trump; two cancel. | She decides battles by showing up, which is what counting as trump means. She is a triple goddess whose aspects are separate figures, so two of her cancelling reads as who she is rather than an arbitrary rule. |
| 11 | **First King Nuada** | When led, the follower may play only their lowest of that suit or their highest. | Nuada's whole story is that a king with a blemish cannot rule — the rule binds him as much as anyone. This card binds both sides equally, and the myth supplies the symmetry rather than the designer having to justify it. |

Three things that follow:

- **The card face carries only the leading word.** Banshee, Shapeshifter, Smith, Graverobber, War
  Goddess, First King — the mythological name is dropped at pixel resolution, where it would not fit
  and would not be read. **Hovering the card shows the full name**, and the codex holds the full
  entry. So the card is "the Banshee of the Raven" in play, and Clíodhna is something the player
  meets on hover and in the codex rather than on the felt.
- **Cú Chulainn is unavailable.** The Hound is a suit now, and the collision would be constant.
- **Rank 8 stays nameless.** It is called Poison in the prototype's code, shows nothing on screen and
  has no effect. It is a plain number and the port should not give it a character.

**The twenty-five opponents are a separate list and are not decided.** An opponent is one of these
characters made flesh, so the cast constrains it but does not fill it. Diarmuid, the current final
boss, is already in the right mythology.

---

## The deck and the deal

### The 33-card deck

Three suits — Raven, Salmon, Hound — ranked 1 to 11. That is the entire deck; there are no other
cards of any kind.

**The suits are renamed in the port.** The prototype's code, tests and asset names still say Bells,
Keys and Moons, which are the three suit names of *The Fox in the Forest* lifted whole. The port
takes the Morrígan's raven, the Salmon of Knowledge and Cú Chulainn's hound instead — three named
creatures of Irish myth, matching the setting the port adopts. Nothing about the suits' behaviour
changes: they are still three interchangeable suits with no asymmetry between them, and every rule
below that names a suit is unaffected.

**A card is named "the Nine of the Hound" — singular, with the article.** The suits are specific
individual creatures rather than categories of object, so they never pluralise: there is no "Nine of
Hounds". In the terse forms the buff cards and the code use, the bare singular carries it —
`Raven High`, `Hound Low`, `Blade of the Salmon`.

### The six named ranks

Ranks 1, 3, 5, 7, 9 and 11 are named Swan, Fox, Woodcutter, Treasure, Witch and Monarch, and each
name carries a rule. Ranks 2, 4, 6, 8 and 10 are plain numbers with no rule.

**All six are renamed in the port** — see the cast table above. The rules below are unchanged; only
the names are. Where an entry below says "Swan" or "Witch", read Clíodhna and the Morrígan.

### The hand — six cards, six tricks

Each side is dealt six, and a hand runs six tricks. Another hand is dealt immediately unless a
health bar has emptied.

### The decree and the trump suit

The 13th card is turned face up and its suit is trump for the hand. Playing a 3 can replace it with
a bare suit rather than a card.

### The draw pile, and its silent rebuild

The 20 cards left after the deal form the draw pile. When it cannot cover a draw, the pile of
already-resolved cards is shuffled back in with nothing said on screen.

### Refill to a floor of four cards

As each trick resolves, the player's hand is topped back up to four cards. The Quarry never refills,
which is why a hand is still six tricks long.

### Cards left in hand at the hand's end are lost

Because the player refills and the Quarry does not, a hand ends with about three cards still held.
They go to the resolved pile and are not carried over.

### Alternating deal, non-dealer leads

The player deals the first hand and the deal alternates thereafter; the side that did not deal leads
the first trick.

---

## Skulls

### A skull inverts the trick

A trick containing any skulled card is one the player wants to go **low** on. This is the game's only
inversion, and the whole outcome table depends on it.

### Roughly 30% of the Quarry's dealt cards carry a skull

Two of six in a typical hand, re-rolled every deal and never remembered between hands.

### Skulls are weighted toward the middle ranks

Each rank carries a weight deciding how likely a card of that rank is to be the skulled one. Rank 1
has weight zero, so a dealt skull is never on a 1, and the curve peaks at ranks 5 and 6.

### The shape readout — suit counts, never ranks

For each suit the player sees how many cards the Quarry holds and how many of those are skulled.
Never which cards.

### The skull face on a played card

A skulled card renders with a skull replacing its picture, rank and suit still readable in the
corner. It holds wherever the card is — in a trick, on the decree, or in a hand.

### The Quarry's 5 can mint a skull mid-hand

When the Quarry plays a 5 it swaps a card, and the card it draws arrives skulled with probability
0.4, subject to the same never-rank-1 rule.

### X Three unused skull rank curves

An even curve, one rising with rank and one falling are all shipped and tested, intended as
per-opponent difficulty settings. Nothing wires any of them to an opponent — the game has one curve
for everyone.

---

## Playing a trick

### Follow suit

The follower must play the lead suit if they hold it. Holding none, they may play anything.

### The led Monarch narrows the follow

If an 11 is led and the follower holds that suit, they may play only their Swan of it or their
highest of it. It binds both sides equally.

### Deciding the trick

A card is effectively trump if its suit is trump or it is the sole Witch. Higher effective trump
wins; failing that, the higher card of the lead suit; failing that, the leader wins.

### The winner leads next, unless a Swan says otherwise

Standard trick-taking, with the Swan's rule as the one exception.

### The action bar — Apply Buff, Cards, Swap

Three buttons, always in the same place for the whole hand. A button that cannot be used is greyed
with its reason printed on its own face rather than removed.

### Per-card win/lose readout

Under every card in hand sit two numbers: the damage the Quarry takes if that card wins its trick,
and the damage the player takes if it loses. While the player is leading they are marked as
estimates, because a skull the Quarry has not played yet would flip the reading.

### The consequence readout

Once the Quarry has led, a line beside the table states what its card does if the player wins the
trick and what it does if they lose — or the rule it puts on the follow. It never says which branch
will happen.

### The lead-suit telegraph

While the Quarry's lead is held uncommitted, the shape readout marks and names the suit it is about
to lead with. Only the suit, and only on their lead.

### Swap — throwing cards between tricks

Before a trick's first card is laid, throw 1 to 3 cards and draw the same number blind off the pile.
A fight gives three throws, the budget resets each fight, and thrown cards go to the bottom of the
pile unseen.

### X Any preview of a card the player has merely selected

A speculative readout showing what would happen against a card only selected, not played, existed
and was deleted. Nothing anywhere previews an uncommitted player card.

### X The Quarry's stance readout

The engine still computes whether the Quarry is pressing or ducking and no surface shows it. The
telegraph reads the suit and throws the stance away.

---

## Card abilities

### Swan (1) — the loser leads next

If a Swan is in a trick and belongs to the side that lost it, that side leads the next trick. Two
Swans and the loser leads either way.

### Fox (3) — name the trump suit

On playing it you may name any suit, which becomes trump immediately and decides the current trick.
You may decline, and you may back out entirely without playing the card at all.

### Woodcutter (5) — two different rules per side

Your 5 raises the Swap budget and its cap by one for the rest of the fight and does nothing to the
trick. The Quarry's 5 swaps its lowest card for a draw that may arrive skulled.

### Treasure (7) — pays and costs

A trick you were victorious on that carried a 7 adds 1 to base damage for the rest of the fight, and
it stacks. A trick that hurt you and carried one costs 2 health instead of 1.

### Witch (9) — counts as trump

A lone Witch in a trick counts as trump when the winner is decided. Two Witches cancel.

### Monarch (11) — narrows the follow

See the trick rules above.

### Rank 8 — no rule at all

Named Poison in the code, nothing on screen, and no effect. It draws exactly like a 2 or a 4.

### X The bronze/silver/gold ladder for named ranks

A three-rung ladder exists for the Swan and the Witch — the Swan's rungs let the roll, and at gold
the total, survive a Low Defeat; the Witch's stop two Witches cancelling and at gold beat every
trump. Both are fully built, enforced and tested, and the shop stopped selling them on 2026-09-01,
so nothing can buy one.

### X The unbuilt rungs for the other five ranks

Fox, Woodcutter, Treasure, rank 8 and Monarch have ladder rows reserved and no rules written for
them. Nothing to port.

---

## The four outcomes and the pot

### High Victory, High Defeat, Low Defeat, Low Victory

Two independent axes: **high/low** is whether you physically took the cards, **victory/defeat** is
whether the trick banked or hurt you. A skull inverts the trick, so going low on a skulled trick is a
Low Victory and going high on one is a High Defeat.

### The two figures — total and roll

The **total** is the damage every banked trick has added up; the **roll** is how many tricks in a row
have banked. What you are sitting on — the pot — is `total × roll`.

### The per-trick damage equation

A banked trick is worth `(1 + Whetstones + this fight's Treasure bonus + flat buff damage) × (1 +
buff multiplier points + overlap bonus)`, added to the total, with the roll going up by one.

### The overlap bonus

When two or more buffs pay on one trick, the multiplier gains one less than the number that paid.

### Apply or roll over

Every banked trick stops play and asks. **Apply** deals the pot to the Quarry now and zeroes both
figures; **roll over** keeps both standing. This is the only place the pot can be cashed.

### The prompt states what the trick was

It names which of the four outcomes it was and why, lists the buffs that paid and — struck through —
the ones that paid nothing with what they needed, shows the decree in force, and marks whether
applying would end the fight.

### Being hurt takes everything

A Defeat costs 1 health, or 2 with a 7 in the trick, zeroes both figures, and pays the Quarry nothing
at all. There is no consolation payout.

### The streak crosses hands and dies with the fight

A hand's end does nothing to the total or the roll. Beating the Quarry clears both.

### X The end-of-hand forced cash-out

The sixth trick used to force the bank out whether you wanted it or not. Removed 2026-09-01; the
sixth trick is now an ordinary trick.

### X The Apply Damage button and the queued payout

Cashing was a button in the action bar with a two-tap commit and five refusal reasons, and from
2026-08-23 the payout landed a trick later and could be destroyed in flight. All of it is gone — the
prompt above replaced it.

### X The two-thirds consolation rate

A hit used to pay the Quarry two-thirds of the streak. Removed; a hit pays nothing.

### X Per-hand reward ceilings

Four ceilings existed — 6 multiplier, 12 damage, 10 coins, 6 refunded action points. The first two
were removed outright. The coin and refund ceilings are still in the code and still enforced, and no
card pays on either axis, so nothing is ever clipped.

---

## Buffs — the card layer

### The buff pile and the Apply Buff panel

The player owns a pile of buff cards, shown as a grid of card faces. Identical copies stack into one
with a count, cards group by the suit they want, and anything unusable right now moves to the end in
one group carrying its reason.

### Tier filters and suit filters

Two rows of filters above the grid, narrowing together, with a "nothing matches" message rather than
an empty grid.

### Two-tap activation

The first tap poises a card, the second activates it for the coming trick and spends it. `Escape`
unwinds one step at a time.

### A buff is activated for the trick, never for a card

The player is never asked to pick a card. Every card in hand the buff could fire on lights up
instead.

### The lit-card signals

A lit card carries a glow, a bright cell travelling its edge, and a number saying how many buffs
could fire on it — three signals, so the state reads without colour, without motion, and in
greyscale.

### The per-card breakdown

Point at a lit card and it is broken down in full: which buffs fire if you take the trick and which
if you do not, listed separately with neither presented as better, the overlap bonus on its own line,
and struck through, the buffs that cannot fire with the reason why.

### The riding-this-trick list

Names each activated buff and how many of your cards it reaches, saying so in words when it reaches
none.

### Taking a buff back off the trick

The three condition cards can be returned to the pile before the trick resolves. A Cheat, a Curse, a
Ward and a Shield cannot — each has already changed the felt.

### Every card is spent when used

Using a card removes it from the pile for the rest of the run. It still pays out on the trick it was
spent on.

### Only between tricks, except a Cheat

Activation takes the same window the Swap uses. A Cheat stays live mid-trick, because mid-trick is
exactly when follow-suit is binding you.

### The five live condition families

**Suit High** (go high having played a named suit), **Suit Low** (go low having played it, with no
skull term at all, so it pays on a Low Victory and a Low Defeat alike), **Skull Low** (the trick
carried a skull and you did not take it), and the two protecting cards below. Nineteen templates in
total once the three activated cards are counted.

### Blade and Momentum — the two live reward axes

Flat damage of 1/3/5 and a multiplier bonus of 2/3/5, at bronze/silver/gold.

### Skull Helmet and Skull Tether

Two cards that keep a streak figure through a trick that hurt you — the Helmet keeps the total, the
Tether keeps the roll. Bronze fires only on a High Defeat, silver on any Defeat, gold on any Defeat
and adds 1 to the figure that survived. They do not stack.

### The go-low carry

When a Suit Low card fires on a trick that hurt you, its reward is banked for the **next** hand
rather than paid into the hand that lost it. It compounds across a fight and dies with the fight.

### Cheat — refusing follow-suit

An ordinary card in the pile. Spending it lifts follow-suit for one, two or three tricks by tier,
counting down on each card successfully committed. The Quarry can never break follow-suit.

### The guaranteed starting Cheat

Every run is seeded exactly one bronze Cheat on top of its opening draw.

### Curse — putting a skull on your own card

Spending it arms it; the next tap on a card in your own hand marks it, including a card it would be
illegal to play. The mark lasts one trick, it pays into that trick's damage by tier, and the Swap and
carry-on controls are locked out while it is armed.

### The wildcard

A card with no use on the felt at all. It is spent on the Manage Buffs screen to strip a suited
card's suit condition, and wildness absorbs when combining, so one wildcard can seed a whole wild
line.

### The fired-buff announcement

The trick well names which card fired and what it paid.

### X Eight cut condition families

Mark of the Rank (go high on a named rank), Glutton (reach a streak figure), Unbloodied (survive
unhurt tricks), Debt Collector (cash your pot this hand), Keepsake (hold a suit at the hand's end),
Hoarder and Miser (hold coins), and Cornered (be below a share of maximum health). Every one keeps
its kind, its price, its firing rule and its cadence row, and none has a template, so nothing can
mint one. **Keepsake could never fire anyway** — the hand is empty when it ends.

### X Two cut reward axes

Purse (coins) and Second Wind (refunded action points). Both ladders are intact and no card pays on
either.

### X The five one-shot items

**Ward** (absorbs the next hit, then breaks), **Second Thoughts** (more Swaps this fight),
**Foresight** (look at the top of the draw pile), **Spyglass** (rule out cards of a named suit) and
**Puppeteer** (choose which legal card the Quarry must play). Nothing mints any of them. Ward and
Second Thoughts are fully implemented; the other three are refused with "Not usable yet." because
each needs a screen that does not exist.

### X Shield — the card that grants blue hearts

An activated card granting 1/2/3 blue hearts by tier. It is on no strip and in no opening pool, so
no player has ever held one.

### X Action points

A per-hand pool of 6 that every buff activation was priced against, with a formula deriving each
card's price from its reward, its magnitude and how reliably its condition fires, clamped between 1
and 6. The toggle is off; the whole model, its price tables and the shop item that topped it up are
all still in the code and completely inert.

### X Timebomb and Blast Guard

A card you marked before playing it, whose damage landed a trick later, and an item you bought to
insure against your own copy of it. Both deleted outright on 2026-09-03 along with the fuse, the
queue and the readouts they needed.

### X Long Fall

The twelfth condition the v1 card list names. It has no card and no rule in the app.

### X Apply-to-card buffs

The v1 card list describes buffs that attach to a specific card. No buff attaches to a card — a buff
is activated for a trick and checked when that trick resolves.

---

## Damage and health

### Two health bars, drawn as hearts

The player starts a run at 10 health and every opponent has its own total. The hearts a trick just
took break as it resolves.

### Damage lands per trick, and a fight can end mid-hand

The player's bar moves as each Defeat resolves; the Quarry's moves only on **apply**. When a bar
empties, the hand stops where it is.

### The Quarry's bar settles first

If the damage empties the Quarry, the fight is over and the player takes no damage from that event at
all — so a killing blow is its own protection. Both bars cannot be empty at once.

### Surplus damage is discarded

Cashing 36 into a bar with 4 left is exactly the same as cashing 4.

### The pot preview on the Quarry's bar

While a streak is banked, the hearts the pot would take flash as a preview of what cashing right now
would do.

### X Blue hearts

A second kind of heart, taken before red ones, spent one point per point of damage, set rather than
added, dying at the fight's end and never restored by a heal. The rule is enforced everywhere damage
is applied and the health bar draws them — and nothing grants one, because the only source was the
Shield card above.

### X Automatic health restore between fights

The tunable exists and nothing reads it. Winning a fight restores nothing; the heal and the flask are
both things you choose.

---

## The Quarry

### It plays by the player's rules

It follows suit, holds six cards, plays one per trick, and has no power, no gimmick and nothing it
may do that the player may not.

### It plays its skulls against you

When following, it prefers to play a skulled card into a trick it is losing, so you take the trick and
eat the skull. Among those it plays the lowest; otherwise it plays the lowest card that would win, or
failing that the lowest legal card.

### Twenty-five named opponents

Twenty ordinary and five stage bosses, fought in a fixed order. A name and a health total are the only
things separating one from another.

### X Character powers

The Monarch carried a round-long follow-suit rule-break. Removed 2026-08-13 and deferred to a
final-boss ticket that has not been written — nothing about their shape is decided.

### X Diarmuid ignoring follow-suit

The final boss is intended to break the rule the player's Cheat breaks. Nothing enforces it; he is a
block on the map with 135 health.

### X The dossier's deck-rank opponent names

The fight screen's dossier still calls every opponent "The Monarch" while the health bar, map, verdict
and fight counter all use the real name. A known seam, not a feature.

---

## The run

### Twenty-five fights on one health bar

Four ordinary opponents then a stage boss, five times over. Health carries from fight to fight and
nothing restores it on its own.

### Opponent health from three numbers

First opponent 10, +4 for each ordinary opponent already fought, ×1.5 for a boss over the step it sits
on — giving 10, 14, 18, 22, then 39, up to Diarmuid at 135.

### A stage is legibility, not a rule

No stage gimmick, no reward for closing one, and nothing happens between stages that does not happen
between any two fights.

### The run map

One horizontal path with every opponent on it: ordinary opponents are ticks, bosses are filled blocks,
beaten opponents are struck through and stay on the path. Nothing on it is clickable.

### The start screen

Shown before the first fight: the whole path, the goal in words, and one control naming the first
opponent.

### The verdict screen

A full-screen report naming the opponent beaten, which fight of the run it was, the health you carry,
and the deciding hand's tricks. It offers going on, the shop, or the map.

### The pre-fight stop

Going on from the verdict, or leaving the shop, lands on a read-only screen showing the path, the
fight ahead, and the cards you are carrying. One control starts the fight.

### The walk-past-money warning

Choosing to continue while at least one purchase is affordable stops you and names what you are
holding, offering the shop or the fight again.

### Twenty-one opening cards

A run opens with twenty cards drawn with repeats from the machine's pool, all at bronze, plus the
guaranteed Cheat. The draw is seeded by the run, so the same run deals the same opening hand.

### Coins

Winning a fight pays 10 coins flat. Coins carry for the whole run and do not survive a new one.

### The quick-kill payout

A coin for every card still unplayed at the instant the Quarry dies, multiplied by which hand of the
fight you killed them in — twice in the first hand, once in the second, half in the third, nothing
after. Always rounded down, and paid on top of the flat coin.

### X Forage — editing the deck between hands

The only thing you would do between hands: edit a card's value, its ability, its suit, or the decree,
on a budget of four edits per encounter. Nothing reads the budget.

### X Snare — an in-hand edit layer

Explicitly blocked in design, because "raise the value of the card I am about to win with" is dominant
until it has a cost. Nothing exists.

### X Surplus damage paid back as currency

The intention was that overkill becomes money. Nothing reads overkill; the quick-kill payout rewards
speed instead and is a different mechanic.

---

## The shop

### Heal — 1 coin

Restores 4 health immediately, never above your maximum, and is refused at full health because it
would take a coin for provably nothing.

### Max health — 3 coins, then 5, 7, 9…

Raises your maximum by 2 for the rest of the run and leaves you at full at the raised maximum. No cap;
the climbing price is the only limiter.

### The flask

A free heal you carry, restoring 60% of your maximum. You hold one charge, drinking spends it, and
beating a stage boss refills it to one — five flasks across a full run. Refused when empty or at full
health.

### The slot machine

One machine, three reels, all running the same posted strip of eight buff cards. The strip is fixed
for a visit; the first pull is free and every pull after costs a coin.

### The pull outcomes

Three matching pays one gold of that kind (1.6%); two matching pays a silver of the matched kind and a
bronze of the odd one (32.8%); all different pays three bronzes (65.6%). Averaging 2.64 cards a pull,
all of which go straight into the pile.

### Manage Buffs — combining

A second shop screen laying out every card you own, with identical copies gathered into counted piles.
Two of the same card at the same tier combine into one of the next tier: free, unlimited, confirmed
before anything is destroyed, and never reversible.

### Manage Buffs — spending a wildcard

The same screen is where a wildcard is spent on a suited card to strip its suit condition. Refused on a
card with no suit and on a card already wild, each with its reason on the tile.

### Refusals carry their reason on screen

Never silent, and when more than one applies the shop names the one that will still be true when the
money arrives.

### X The Whetstone

Adds 1 to the base damage of every banked trick for the rest of the run, stacking without limit and
sitting inside the multiplication, so one copy doubles a bare six-trick pot. Fully built, priced at 4
coins, and off the shelf since 2026-08-24 — nothing sells it.

### X The four shop shelves

The shop was browsed as four tabs named for how long a purchase lasts — one-time use, fight-long,
run-permanent, and a game-permanent one shown and refused as "Coming soon". Removed 2026-08-24; the
category vocabulary survives in code as the way a purchase would be sorted.

### X The Strongbox — the second slot machine

Meant to be the run-permanent machine, leaning toward coin and action-point rewards. Both those reward
kinds were cut, leaving it stocking within a percentage point of the other machine on every family, so
it came off the machine list on 2026-09-01. Its weights and prices are all still in the code.

### X The Cheat purchase

The shop sold a Cheat for a coin until 2026-08-24, into a capped two-slot rail. Both the purchase and
the rail are gone; every Cheat comes from the machine now.

### X The action-point purchase

3 coins for +5 action points a hand, stacking without limit. Still priced and still buyable by the
code, on no shelf.

### X A rotating shelf, a price curve, or rerolls

The shop shows the same things at the same prices on every visit. Only the maximum-health raise has a
climbing price.

### X The game-permanent shelf's contents

Nothing was ever designed for it. The shelf existed to make the gap visible.

---

## Cross-run persistence

### The Vault

The only thing in this game that is saved and survives closing the tab. Reached only from a finished
run's verdict, and leaving it starts the next run.

### Leftover coin converts on a loss

Only a lost run pays in: 10 leftover coins become 1 unit of Vault currency, remainder discarded. A won
run pays in nothing, and the screen says so.

### Raise a card's odds — 1 unit

That card turns up more often on the machine's strip. Permanent, stacks up to three times, and nothing
removes a stack.

### Buy a starting card — 2, 5 or 10 units

Queued for the next run and consumed when that run starts. A card of a type that is no longer dealt
does not arrive at all, and the currency spent on it is gone.

### The unreadable-save path

A save this build cannot read is left on disk untouched and reported, rather than silently replaced by
a zero. A storage-denied browser is reported too, as is a count of entries dropped for naming cards
this version no longer has.

### The save envelope

Everything persisted goes through one module as a `{ version, data }` envelope stamped with a schema
version, keyed by a single composer, and a reader meeting a version it does not know returns its
default and reports why. Browser storage is lint-forbidden everywhere else.

### X Coins, health, buffs and run progress carrying between sessions

None of it is saved. Reloading the page starts a new run.

---

## Screens

### The fight screen

The felt, both hands, the decree, the resolved pile, both health bars, the status band and the
action bar.

**"War Council" does not carry over.** The prototype calls this screen's module, its component, its
stylesheets and its state `warCouncil` — a name left over from an earlier design direction that the
game no longer has. It names nothing the player ever sees. The port calls the screen and everything
under it **the fight**, and no file, class, scene or asset in the Unity project should carry the old
word.

### Card motion

Every card movement animates — dealing, playing, resolving, drawing, and buff cards moving within the
loadout.

### The trick resolution screen

Raised after every trick, in a corner of the table rather than replacing it, carrying the
apply-or-roll decision and the outcome readout.

### The hand-close panel

When the sixth trick resolves, a panel states that hand's tally — tricks each side took, health lost,
health dealt. One press deals the next hand.

### Keyboard navigation

A roving tab index across the hand and the buff grid, with `Escape` unwinding one step at a time.

### The error boundary

A React error boundary wrapping the app, so a render fault shows a message rather than a white screen.

### X Scrolling anywhere

Every screen is full-viewport and no-scroll by design. The run map crops below about 1088px of width
rather than scrolling, which is a known defect and not a feature.

---

## Development tooling — not game features

### The headless run simulator

A pure module that plays whole runs with no UI, carrying several strategy policies — baseline,
card-aware, skilled, survivalist, roll-over — and a reachability audit. This is how the 26.6–32.4% win
rate was measured.

### The debug state mirror

A dev-only window mirror of the app's state, used to drive browser playthroughs by reading state
rather than parsing screenshots.

### The executable unreachability audit

A test asserting exactly which decided-and-enforced features cannot be reached in play. Every `X`
entry above marked "still in the code" is covered by it, so one leaving or joining the list turns a
test red.
