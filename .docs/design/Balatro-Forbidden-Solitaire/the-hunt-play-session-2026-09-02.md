# Play session, 2026-09-02 — developer, two fights, thinking aloud

**Source:** two narrated recordings (13.6 min and 19.5 min) transcribed with Whisper, plus four
screenshots. Fight 1 against Aoife, a shop visit, and most of fight 2 against Cillian. First
recorded session of the current build.

**A note on the transcript.** It is machine-transcribed and mishears a few words consistently:
*tree* is "three", *carrot* is "card", *poison* is "skull", *tricks* is "trumps", *red wheel* is the
slot machine's strip. Quotes below are cleaned only where the mishearing is certain.

---

## The headline

**The core loop is working, and the evidence is that almost the entire transcript is real
deduction.** Not "I'll play this one" — actual reasoning about voids, skull counts, who can still
beat what, and what the opponent is forced to do:

> "They have two bells and three keys and the two bells they have are skulled, so if I play my ten
> of bells to their six of bells I'll win."

> "I think I'm forced to lose this hand no matter what I play. If I play a key he's going to play
> the skulled card which is going to stop my multiplier."

> "I feel like having my bells is completely dangerous… I got rid of the bells."

That is the game being played the way the design intends, unprompted, in the first session. Nothing
below should be read as outweighing it.

**Everything that went wrong went wrong in the interface, not in the rules.** Not one complaint in
33 minutes is about a rule being bad. Every frustration is about not being able to see something,
not being able to reach something, or losing an action to a misclick.

---

## The five things that cost the session most

### 1. He loses the buff window to a click, over and over, and it is the loudest complaint in the recording

> "There's a problem here where when he has to lead, I click on the thing to get the screen to go
> away — the one where I just saw the score being calculated — and I accidentally click and it's
> started the round now and I have no buffs applied and I can't go back and do anything about that."

> "It's happened again. I can't actually put the buffs on now, because every time I click onto the
> screen to move on, he's just playing the cards."

> "That's a really big bug and it's very annoying. That keeps happening. **I can't actually play the
> game.**"

Two separate things are fusing into one experience. The click that dismisses the resolution screen
falls through and advances into the next trick; and once the Quarry has led, the arming window is
shut. So a single stray click permanently costs him that trick's whole card layer.

**This is the structural problem the simulator already measured** — 36% of tricks with no arming
window at all — arriving as a usability complaint rather than a design one. It is no longer a
question of whether that measurement was a simulator artefact. It is not.

**Cheapest fixes, in order:** make the resolution screen's dismissal require its own control rather
than any click; then give the arming window a defined close — either it stays open until you commit
a card, or the screen states plainly that it has shut and why.

### 2. He cannot tell whether a trick was skulled, during or after

> "I can't tell on the banking screen or the calculation screen whether the CPU has played a skull
> card or not. So I'm kind of confused as to why I won that."

> "I actually can't tell why I won this. Pretty sure because he had a skull… but I can't tell there's
> a skull in this one. **So that's not good.**"

The screenshot he took confirms it: `TRICK 3 OF 6 · BANKED`, `THEY TOOK IT`, and nothing anywhere on
the screen names a skull. The card is drawn small and the outcome line describes who physically took
the trick, which is the axis that does *not* determine what happened to him.

This is the single most important thing on the screen and it is absent. If the player cannot see the
skull at the moment it pays off, the inversion never teaches itself — which is exactly the mechanic
the whole design rests on.

### 3. The resolution screen sets the least important number in the largest type

Both screenshots show it. On trick 4 the giant figure is **1** — that trick's own contribution — and
the pot, **12**, sits beside it at a third the size. On trick 3 a giant **2** against a pot of 6.

He also can't see what he needs there:

> "Now I'm on the score screen and I can't see what's trumps… you don't have the full vision of what
> the outcome of the hand was. I forget what the decree is."

And the omission that cost him a whole fight's worth of attention:

> "I could have killed him. I have enough damage. **I didn't actually realise that I had enough
> damage to win the fight.** Maybe the screen where it's asking you to apply the damage should show
> the damage that will be done and that you would actually kill the CPU."

Three cheap changes: swap the type hierarchy so the pot is the big number; keep the trump suit on
screen; and mark a lethal pot as lethal.

### 4. He thinks he found a damage bug. He did not — a tooltip hid the sentence that explains it

He armed a +3 damage card and a +2 multiplier card, expected a large trick, and got 3:

> "I added plus 3 damage and I added 2 multipliers on top of that… however it only gave me 3 damage.
> It should have given me way more. **So it looks like a bug.**"

The breakdown he pasted lists only `Key-Taker (Momentum) +2 MULT`, giving `1 × 3 = 3`.

**The +3 card was a Key-*Feeder*, which pays only when you *lose* a trick with Keys.** He won the
trick with his Witch, so it correctly paid nothing. His own fourth screenshot proves it — the panel
reads, in as many words, `IF YOU DO NOT TAKE THIS TRICK · Key-Feeder (Blade) lose a trick with Keys
+3 damage`.

**And it proves why he didn't read it.** In the same screenshot, the Witch's rules tooltip is sitting
directly on top of that panel, covering the take-it / don't-take-it split he needed. He said so
himself a minute earlier:

> "When I hover over the Witch card, the tooltip telling me what the Witch does is blocking… it's
> covering the information on the trick. Which is a problem."

So one z-index collision cost him a trick, cost him his confidence in the numbers, and produced a bug
report about the engine's arithmetic — which is sound. Two fixes, and both are worth doing: stop the
rules tooltip overlapping the breakdown, and **list the buffs that did *not* fire, with the reason,
on the resolution screen.** The second closes this class of confusion permanently.

### 5. Splitting every card by suit makes most of his pile dead weight — and he worked that out on his own

> "Looking at these Moon-Takers, Moon-Feeders per different suits — it's probably not a good idea. It
> should just be a Taker and a Feeder, condense that into one card. Because I have two Moon-Takers
> and I have one moon… **the rest of them are not useful to me at all.**"

Three suits × two families means that on any given trick most of what he owns cannot legally pay.
That is the mechanism behind the "I have 21 cards and nothing to do with them" feeling, and it is why
the pile reads as clutter rather than as a build.

**The tension worth naming before acting on it:** the suit is also what creates the aiming decision.
Deciding which suit the trick will be played in and arming only cards that match it is the single
biggest measured skill in the game — worth taking the win rate from nothing to one in five. Collapse
the suits and that decision goes with them.

So the question is not "remove the suit" but "what replaces the aiming decision if it goes" — or,
cheaper, **let the player filter the pile by suit**, which he asked for twice:

> "I'd like to be able to pull up my buffs now and filter out everything that's not Keys. We have a
> bronze / silver / gold filter but we can't filter by suit."

---

## The shop

**It is tedium, not decision.** He arrived at fight 2's shop with enough coins for eighteen pulls.

> "I have 18 pulls as well, which is just ridiculous."

> "I have to click through all of them, which is kind of annoying."

> "It took me a long time in the shop."

His own suggestions: a pull-all, or a more expensive pull with better odds. Both are real, and both
are downstream of prices that were never repriced when a fight's payout went from 1 coin to 10.

**The machine does not tell him what tier he is winning.** Confirmed in his shop screenshot — the
strip reads `Taker MOMENTUM` with no tier anywhere on it:

> "I got three Takers, but I don't actually know what… I must have got a gold one, but it just says
> Taker Momentum. So I don't actually know what I've gotten. **That's actually a problem.**"

**He combined everything, on the assumption that upgrading must be better.**

> "I think I'll just upgrade them all, because I assume upgrading them all is better than not."

That is the trap working exactly as predicted, on the first player to meet it, and he even asked for
an "upgrade all" button to do it faster. Two bronze cards fired together beat the one silver they
merge into, so his natural assumption is the losing play and nothing on the screen says so. This is
no longer a theoretical known tension.

**He can't review what he owns before a fight.**

> "There's no real way for me to look at my inventory… it would be nice to see the cards I currently
> have before I go on to the next fight."

---

## Smaller findings, each with its quote

**The trick resolves faster than he can read it.**
> "It happens so fast — I see my card and then they put their card, and the transition is so fast
> that I don't get a chance to read what's happening, and I don't even get to enjoy the fact that I
> just won."

**And the resolution screen is too heavy for the same reason.**
> "I don't think it coming up in a full screen is a good idea. Just put it into the corner somewhere."

Those two go together: the part he wants to linger on is over instantly, and the part he wants over
instantly takes the whole viewport. That is the whole pacing note, in his own words.

**A multiplier card is worthless in the first hand and he spotted it.**
> "The multiplier is no use to me in the first hand, because the multiplier is only going to be a ×5
> on 1 damage, which is no good. So I can't really use it in the first hand — which is kind of shit."

A multiplier with nothing to multiply is dead, so half the reward pool is dead until a streak exists.

**The Fox is a card he never wants to use, for a reason he can state.**
> "I don't like that I have to change the decree card with one of my cards. I feel like I always have
> to give up a good card that I don't want to give up… I usually just keep the decree, because it
> doesn't seem all that beneficial."

Independent human confirmation of what the simulator says by never choosing it. The cost is always a
card you wanted; the benefit rarely clears it.

**The Woodcutter is read as redundant with Swap, and threw it away for that reason.**
> "I don't think the 5 is really good to keep, because I can just swap cards out from the deck, so
> that power's pointless."

> "I don't want the 5 because I don't think it's any use."

> "I get rid of the 2, the 5, because I don't think the 5 is any good at all."

He discarded it in the first hand he was offered one, reasoning that the Swap control on the action
bar already exchanges cards with the pile. **It is not redundant, and the difference is the whole
point of the card.** Swap throws cards and draws **blind**; the Woodcutter draws **first** and then
buries any card in hand, including the one it just drew. It is the only look-then-choose exchange in
the game, against a control that is a bet every time — and the Swap budget is three a fight, where a
Woodcutter is one per copy dealt.

None of that reaches the player. Two fights in, the card reads as a worse version of a button he
already has. So this is a legibility failure rather than a design one, and the levers are the card's
own wording and how its prompt presents the drawn card against the hand — neither is a rules change.
**Whose decision:** the developer's.

This is a **different complaint from the Fox's**, and the two should not be merged. The Fox is
rejected for costing too much; the Woodcutter is rejected for appearing to do nothing. Between them
they are the two strongest levers in the deck — one changes trump outright, the other is the only
non-blind card exchange — and the headless simulator has never chosen either, so neither has ever
been measured.

**Playing the Fox is a one-way door with no cancel.**
> "I clicked the three twice. Now it's choosing a decree. Actually I don't want to do that. I want to
> go back. But now I can't go back."

**He asked for the Swan rung by name, without knowing it exists.**
> "It'd be nice if there was some way for me to protect my streak. Just like a streak protector."

Built, tested, and off the shop's shelf since 2026-09-01.

**He noticed the removed telegraph.**
> "Oh yeah, the intention thing is gone."

**Analysis paralysis is real, at least on a first session.**
> "There's a lot of thinking involved here before even moving. Five minutes in and I'm still
> thinking — I'm not playing the game at all."

**One thing to verify in the engine.** He believed the Quarry led a suit its readout said it did not
hold:
> "They led a seven of moons, but I said they had two bells. How did they lead with a moon if they
> had two bells?"

He uses "bells" throughout to mean *skulled* bells, so the likely cause is that the panel's two
numbers — how many held, how many skulled — are being read as one. Worth confirming against the code
before treating it as an engine fault, but either way it is a readout that can be misread.

**Damage surplus, confirmed by a human rather than a simulation.** Both fights ended with far more
damage available than needed: *"I could have killed him"*, *"all I really need is one good hand"*,
*"I'm going to apply the damage, which is absolutely unnecessary."*

---

## What I would fix first, and why

Ranked by cost against how much of the session each one damaged.

1. **The stray click that eats the arming window.** It is the loudest complaint, it recurred at least
   three times in one fight, and it produced the only sentence in 33 minutes that says he could not
   play the game.
2. **Show the skull on the resolution screen**, and say which side of the four outcomes the trick
   landed on in the game's own terms rather than who physically took it.
3. **List the buffs that did not fire, and why.** One line each. It removes an entire class of
   "is this a bug" and it teaches the win/lose condition split at the moment it matters.
4. **Stop the rules tooltip covering the breakdown panel**, and swap the resolution screen's type
   hierarchy so the pot is the big number, with lethal marked as lethal.
5. **Filter the buff pile by suit.** Asked for twice, and it takes most of the sting out of finding 5
   without touching the card pool.

Everything else — the shop's pacing, the combine trap, the Fox's cost, the multiplier's dead first
hand — is a design decision rather than a repair, and belongs in its own pass.
