# Structure notes for the port

**A running list of structural improvements this prototype deliberately did not make, and should
make when the game is rebuilt in Unity.** Every entry here is a place where the prototype hardcodes
something that ought to be **data** — a field on a definition, a row in a table, a ScriptableObject
— and where doing it properly now would cost more than it saves at this scale.

This file is not a backlog and nothing here is a defect. The prototype's job is to answer design
questions by being played; a hardcoded answer that is *correct* and *lives in exactly one place*
answers those questions just as well as a configurable one, and costs a fraction of the code. The
port's job is different: it will carry many more cards, be edited by someone tuning rather than
someone coding, and outlive every assumption below. **What is a reasonable shortcut at 13 buff
templates is a maintenance problem at 70.**

Each entry states: what the prototype does, why that was the right call *here*, and what the port
should do instead. Add one whenever you catch yourself writing `kind === X || kind === Y` and
thinking "this should really be a property."

> **Read `.docs/design/`, not this file, for what the game should DO.** These notes are about the
> shape of the code, never about a rule. A rule change belongs in `.docs/game_rules/the-hunt.md`.

---

## 1. A buff's timing window is a hardcoded kind check, not a property of the buff

**What the prototype does.** `buffActivationWindowOpen` in `src/app/warCouncil/roundUiState.ts` is
one line:

```ts
return buff.kind === BuffKind.Cheat ? canAct(state) : discardWindowOpen(state)
```

Every buff activates **between tricks**, except a Cheat, which activates at **any moment a card can
be played** — including while following a lead the Quarry has already committed, because breaking
follow-suit is worthless at any other moment. That exception is a name in an expression, not a field
on the Cheat.

**Why that was right here.** There is exactly one exception, one gate function, and two readers of
it (the row's disabled state and the reducer's commit) — and both read the same function precisely so
they cannot disagree. A `Record<BuffKind, TimingWindow>` table would be ~25 lines of scaffolding to
express one boolean's worth of information. When Timebomb was narrowed out of the exception on
2026-08-26, the change was one clause; the table would have made it one row, which is not better.

**What the port should do.** A buff should be a **definition object** — a ScriptableObject, or
whatever the port's equivalent is — carrying its own answers as fields, and the engine should read
the field rather than ask what kind of card it is holding:

```
BuffDefinition
  kind, tier, name, description       // already effectively true in `src/hunt/buffs.ts`
  activationWindow: BetweenTricks | AnyPlayableMoment | AfterQuarryLead
  consumedOnUse: bool                 // today: ACTIVATED_CARD_SINGLE_USE / CONDITION_CARD_SINGLE_USE
  effectImplemented: bool             // today: CONSUMABLE_EFFECT_LIVE
  trigger / effect payload            // today: the `form`-tagged union in `buffs.ts`
```

The payoff is not elegance, it is **who can change it**. Every row above is a question a designer
will want to answer per card, repeatedly, while tuning — and each one is currently a code edit in a
file a designer has no reason to open. The moment two cards want *different* windows for reasons
that are not "because they are that card", the kind check stops being a shortcut and starts being a
lie about how the system works.

**The idiom to carry over is already in this codebase, one folder away.**
`src/hunt/consumables.ts` gets this right twice: `ACTIVATED_CARD_SINGLE_USE` and
`CONDITION_CARD_SINGLE_USE` are `Record`s of booleans, `Record`-typed over a narrow kind union so a
new member **fails to compile** until it is given an answer, each with a docblock naming the single
reader and saying "flip one entry to revert." `CONSUMABLE_TIMING` and `CONSUMABLE_EFFECT_LIVE` do the
same for the five consumables. That pattern — *exhaustive table, one reader, compile error on a
missing row* — is what a buff's whole definition should look like in the port, not just these four
slices of it.

**What to preserve from the prototype while doing it.** The table replaces *where the answer lives*,
never *how many places ask the question*. `buffActivationWindowOpen` has two callers by design —
`roundUiState`'s stock builder for the greyed row and `buffHandlers`'s commit — and `activateBuff`
re-checks the window itself and throws on a refusal, so a caller that asked one question at the
disable and a different one at the commit surfaces as a thrown `RangeError` rather than a silent
mis-play. **Keep that.** A data-driven definition with three call sites reading three different
fields is worse than the hardcoded check it replaced.

---

## 2. How rare a card is has no number — it is the product of two tables, and it never moves

**What the prototype does.** A card's chance of appearing is computed in `templateWeightFor`
(`src/hunt/slotWeights.ts`) as a family weight times a reward-axis weight, both read from
per-machine tables — `SLOT_FAMILY_WEIGHTS` and `SLOT_AXIS_WEIGHTS`. Nothing on a template says how
rare it is. A card's **tier** (bronze, silver, gold) is a separate thing entirely and is not on the
template either: it is decided at draw time by the reel-match rules. So the two questions a designer
actually asks — *how often does this card turn up* and *how strong is it when it does* — are answered
in two different files, and the first one is answered by arithmetic over two tables rather than by a
value anyone can read off a card.

**Why that was right here.** With one live machine and a couple of dozen templates, crossing two
small tables is genuinely less to maintain than a weight per card, and it makes the lean of a machine
("this one favours the in-hand tactical plays") expressible in one number instead of eight. The
family/axis crossing is also how the templates themselves are generated, so weighting along the same
two axes kept one shape rather than two.

**What the port should do instead.** Put a **rarity weight on the card definition**, one number, and
let a machine or a drop table scale it rather than compose it. Keep tier as the separate power axis
it already is — a gold Cheat breaking follow-suit for three tricks where a bronze one breaks it for
one is a power difference, not a rarity difference, and collapsing them into a single "rarity" number
loses the ability to have a common card that is strong at gold.

**The thing the prototype has no answer to at all:** the weight is fixed for the whole run. The
stated design intent is that reaching silver and gold access early should make an early Quarry a
formality, which requires the *distribution* to move as a run progresses. Nothing in the prototype
moves it. Whatever carries that — a per-fight table, a progress multiplier on each card's weight — is
a port decision, and it wants the single per-card number above to exist first.

---

## 3. "Utility card" is not a category — it is three properties the prototype answers by name

**What the prototype does.** Cheat and the wildcard behave unlike a condition card in three ways, and
each way is handled separately by naming the kind: the activation window is a kind check
(entry 1 above), single-use is a `Record` in `consumables.ts`, and "cannot be taken back off the
trick" is decided by which group the card falls in when the riding list is built.

**Why that was right here.** There were one or two exceptions at a time, and three small answers in
three places is less code than a category system. Crucially the three properties have never yet
disagreed — every card that activates mid-trick has also been single-use and un-retractable — so a
single "is it a utility card" test would have been correct so far and nobody has paid for its absence.

**What the port should do instead.** Make them three fields on the card definition, not one category.
The moment a card wants any two of the three but not the third — a between-tricks card that is
consumed, a mid-trick card that can be withdrawn — a category is a lie and every reader of it has to
be found and unpicked. Three booleans (or a small timing enum plus two flags) exhaustively typed over
the card union, so a new card fails to compile until it answers all three, is the same idiom entry 1
recommends and costs almost nothing.

Grouping cards for the *player* — a buff shelf and a utility shelf in the shop, say — is a
presentation choice and can be a tag. It should not be the thing the rules read.

---

## 4. `warCouncil` is a name from a retired design, and it covers two layers at once

**What the prototype does.** `src/warCouncil/` holds the trick-taking core — the deck, the deal,
playing a card, resolving a trick, the Quarry's choice, the mid-hand redraw — and
`src/app/warCouncil/` holds the table screen that draws it, at over a hundred files. There is no war
council anywhere in the game; the name predates the current direction and was never renamed because
renaming a folder buys a prototype nothing.

**Why that was right here.** A misleading folder name costs one developer one moment of confusion.
It is also not free to change: buff template ids are **persisted** (`ConditionBuffTemplate.id`, format
frozen), and the last vocabulary rename in this codebase deliberately bumped `SAVE_SCHEMA_VERSION`
and dropped saved entries rather than shipping a migration map. Renaming inside a prototype means
throwing away saves, and there was no reason to.

**What the port should do instead.** Do not carry the name across, and split the two layers while
renaming so the engine and the screen do not share one. The boundary that actually exists is the run
layer (`hunt/` today — buffs, shop, run structure, the encounter) against the card layer
(`warCouncil/` today — cards, tricks, the deck), and neither current name says so. Two ways to cut it:
name them for what they are to a programmer reading cold, or name them for the fiction the ruleset and
the design docs already use, where a fight is a Hunt and the thing you play on is the table. The
second keeps one vocabulary across the design docs, the ruleset and the code, which is the vocabulary
you will be tuning against. **Whichever is chosen, the UI half gets its own name** — that is half the
reason the current one reads as a single legacy blob when it is really two healthy layers.

---

## 5. (add the next one here)

Entries are cheap. If you defer a structural improvement because the prototype is too small to need
it, write it down while you still remember why — the reasoning is the part that gets lost, not the
observation.
