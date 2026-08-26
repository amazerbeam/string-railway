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

## 2. (add the next one here)

Entries are cheap. If you defer a structural improvement because the prototype is too small to need
it, write it down while you still remember why — the reasoning is the part that gets lost, not the
observation.
