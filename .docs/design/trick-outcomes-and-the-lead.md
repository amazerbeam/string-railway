# Trick outcomes and who leads next

Decided 2026-09-05. First design entry for the Unity build.

## The two facts a trick produces

A trick produces two separate facts, and a skull is what pulls them apart.

The first is **what you did**: did you take the cards, or not. That is the contest — highest card of
the led suit, trump beating it, and it has nothing to do with skulls.

The second is **what you got**: did the trick bank damage into your pot, or did it hurt you. On an
ordinary trick these agree — take the cards and you bank. A skull inverts the second fact without
touching the first, so taking the cards on a skulled trick banks nothing and costs you health.

That gives four outcomes, and each now has a name:

| | Straight trick (no skull) | Skulled trick |
|---|---|---|
| **You took the cards** | **Straight Victory** — banks | **Skulled Loss** — you ate the skull |
| **You did not** | **Straight Loss** — it hurts | **Skulled Victory** — the dodge |

The names changed from the prototype's High Victory / High Defeat / Low Victory / Low Defeat.
Those named the first fact — what you did — which meant the good outcome on a skulled trick was
called a "Low Victory", and nobody reading it cold could tell whether that was good, bad, or a
contradiction. Straight and Skulled name the trick instead, so the name says what kind of trick it
was and how it went, which is the pair a player actually needs.

## What is wrong

**The lead follows the contest, not the outcome.** Whoever takes the cards leads the next trick,
regardless of what the trick paid. That is inherited from the parent trick-taking game, where
taking the cards is unambiguously good, and it stops making sense the moment a skull can invert
the payout.

The consequence is a Skulled Loss that punishes and rewards in the same breath. You went high into
a skull: you lose health, your banked total and your roll go to zero, and the Quarry is paid
nothing — and then you are handed the lead. The worst thing that can happen in a trick comes with
the trick's positional advantage attached.

A Skulled Victory has the mirror problem. You read the skull, played under it, banked the damage —
and the lead goes to the Quarry, because they physically took cards nobody keeps.

**And "who took the cards" barely means anything.** Both cards go face-down to a single shared
spent pile as the trick resolves. Neither side keeps a pile. Taking the cards drives the lead, a
tricks-taken counter shown on the status band, and which way the cards animate. Nothing else.

## What we are changing

**The lead follows the outcome.** A Victory takes the lead; a Loss gives it up.

| Outcome | Leads next |
|---|---|
| Straight Victory | Player |
| Skulled Victory | Player |
| Straight Loss | Quarry |
| Skulled Loss | Quarry |

Winning a trick earns the lead. Losing one costs it. That holds whichever way the skull sent you,
so the lead becomes a consistent reward rather than something you can collect by eating a skull.

It also means the lead comes apart from the cards: on a Skulled Victory the Quarry took the cards
and you still lead. That is fine while the lead is only turn order — but it is the thing to check
against, if anything later keys off who physically took a trick.

## What this leaves open

**High and low lose their last mechanical job.** Once the lead moves onto the outcome axis, whether
you went high or low drives a display counter and an animation. In the prototype the axis mattered
because every buff condition read it — the whole Suit High / Suit Low family keyed on it — and that
buff design is not being inherited. So the words stay useful for describing a play, but nothing in
the rules currently depends on them. If the new buff design gives the axis no job either, the four
outcomes collapse to two: Victory and Loss, with a skull deciding which play earns which.

**Who deals first has never been decided.** The prototype alternates the dealer by hand parity and
seeds it with the player, from a placeholder carried out of deleted code and never confirmed. It is
an open choice for this build, not something to inherit.

**The Swan override is not carried forward by default.** In the prototype, a Swan played by the
side that lost the contest takes the lead back. Whether the new build wants a card that overrides
the lead rule is its own decision, and it is easier to answer once the lead rule itself is settled.
