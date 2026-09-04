Part of [the headless run simulator](README.md).

# The skilled strategy, and the four defects that made the game look unwinnable

`skilledPolicy` (`skilledPolicy.ts`, with its card decisions in `skilledCardPlay.ts`) is the first
policy assembled from the game's rules rather than from the Quarry's heuristic. It matters beyond
its own figures because of what it changed: **every "0% win rate" this project had on record was
measuring a broken player, not a rigged game.** Played correctly, on numbers nobody tuned, the run
clears 26.6–32.4% of the time.

That is a statement about the simulator's policies, not about the game. No rule, price, health
total or reward value was edited to produce it — see [the winnability
record](../run-winnability-simulation.md) for the dated correction.

## The four defects, each with what fixing it was worth

Measured at `--runs 500`, base seed 1, each fix isolated by a diagnostic policy that differs from
`skilled` in exactly one method and takes every other by reference.

| Defect                                 | Fix                           | Win rate after                 |
| -------------------------------------- | ----------------------------- | ------------------------------ |
| The card heuristic ignored skulls      | `chooseSkilledCard`           | still 0%                       |
| Buffs armed without deciding the trick | `trickIntent` + `canPayUnder` | **20.8%**                      |
| Cheats spent as ordinary buffs         | `RESERVED_KINDS`              | **25.8%** (with the fix below) |
| Plan and play used different card sets | `leadCandidates`              | **25.8%**                      |
| Swap thrown on a fixed rule            | `servesPlan`                  | **28.8%**                      |

### 1. The card heuristic ignored skulls

Every policy before this one took its card from `chooseCpuMove` (`src/warCouncil/cpuPlayer.ts`),
which was written for the Quarry. Its go-low branch filters _its own_ candidate cards for a skull —
correct for the Quarry, which is the only side ever **dealt** one, and a permanent no-op for the
player. Seated on the player it collapses to "always try to go high, else play lowest".

Since a skull inverts a trick, **going high on a skulled one is a High Defeat where going low on it
is a Low Victory** — a point of health against a free bank. `chooseFollow` reads the lead's mark —
which is face up — and picks the cheapest card that reaches the wanted outcome: the lowest loser to
go low under a skull, the lowest winner to take a clean trick. Banked tricks went from 52.1% to
60.8%.

> **Since DLR-167 the player can hold a skull of their own** — a Curse marks a card in their own
> hand. This module's information discipline still holds (a curse is the player's own state), but its
> "the player holds none" premise no longer does. `skilledCardPlay.ts` does not know about Curse, and
> no policy arms one.

### 2. Buffs were armed without deciding the trick — the largest single fix

The buff window opens only while `currentTrick` is empty, which made arming look like a blind bet.
It is not. `state.leader` already says who leads, and when it is the player the suit is entirely
their own choice; when it is the Quarry, `suitShape` posts how many cards it holds per suit, so the
suit it holds most of is the one it most likely leads.

`trickIntent` (`skilledCardPlay.ts`) turns those into a suit and an outcome — go high, or go low —
and `canPayUnder` (`skilledPolicy.ts`) then arms only cards that can pay under it. Three rules fall
out, and every one of them was being broken:

- never arm a suit the trick will not touch;
- never arm Suit High and Suit Low together, since exactly one can fire;
- never arm Skull Low on a trick played to go high, since it pays only on a Low Victory.

Condition cards that actually paid went from **16.6% to 58%**. Suit Low, which the earlier passes had
written off at 9%, pays 52.6% once it is armed only on tricks the player intends to go low on — it
was never a broken card, only a misused one.

When the Quarry leads, the suit is a prediction rather than a choice, so `intent.certain` is false
and the stack is capped at `BLIND_TRICK_CAP`: a blind trick should not eat the pile.

### 3. Cheats were spent as ordinary buffs

A Cheat lifts follow-suit, so its one job is turning a **forced hurt** into a bank — the Quarry leads
a skull, every legal card would take the trick and eat it, and an off-suit card ducks it instead.
`cheatEscape` finds exactly that pair of facts, reading `ignoreFollowSuit` through the engine's own
`legalMoves` so what the Cheat unlocks and what the policy asks for cannot drift.

It fired 0.26 times a run, which read as the card being nearly dead. It was not rare — it was being
armed in the ordinary buff window and gone before the moment arrived. `RESERVED_KINDS` withholds it
from `chooseBuffs`, leaving `wantsCheatPlay` to spend it:

|                                     | spent as a buff | reserved  |
| ----------------------------------- | --------------- | --------- |
| Forced hurts arising                | 8,075           | 12,727    |
| …an off-suit card would have banked | 3,680           | 6,007     |
| …**and a Cheat was actually held**  | **34**          | **5,904** |
| Cheats armed per run                | 0.26            | **8.21**  |

`cheatMoments` on `HandReport` is what makes that table measurable; it counts the situation
independently of whether the seated policy would have found it.

> **A Timebomb was withheld for a different reason**, and the measurement is kept because it says
> something about how this policy plays rather than about that card: it marked the card played next
> and paid its damage to whichever side lost that trick, so a player who deliberately goes low primes
> cards it is about to throw. Withholding it alone took health lost per hand from 3.11 to 1.75.
> **DLR-166 removed the card and `skilledWithTimebombPolicy` with it.**

### 4. The plan and the play used different card sets

`trickIntent` planned over the whole hand while the policy filtered ability-prompt cards out of the
play, so **a third of led tricks were played in a different suit from the one
the buffs were armed for** — every one a wasted stack. Both now lead through `leadCandidates`, which
is the single statement of that exclusion. Mismatch fell to 8 tricks in ~4,900.

A prompt-carrying card can still be _followed_ with when only that card reaches the wanted outcome;
`chooseCard`'s final guard falls back to `chooseCpuMove` there, carrying its matching
`AbilityChoice`, because the driver has no choice to answer with otherwise and the hand would stall.

### The swap, which follows from the plan

A plan names a suit and an outcome, and the hand can only deliver it holding the right _end_ of that
suit — a high card to take, a low one to duck. `servesPlan` tests exactly that, and `chooseDiscard`
throws only when the hand cannot serve the read. A hand that can already play the plan spends
nothing: the budget is three a fight and a blind redraw of a working hand is a downgrade.

## The stopping rule

`wantsApplyPot` states the arithmetic rather than a threshold anybody picked. Cashing `total × roll`
against pushing to `(total + d) × (roll + 1)` is worth it while `p > roll / (roll + 1)` — 0.5 at the
first trick, 0.75 at the third. `p` is estimated by `bestLeadBankOdds`, the same expression the card
play maximises when it picks a lead, so the push and the cards cannot disagree about how good the
hand is. A lethal pot is cashed regardless: overkill is discarded and the streak dies with the
fight, so pushing a lethal pot risks everything to win nothing.

`rollOverPolicy.ts`'s `withRollTarget` wraps any policy with a fixed roll threshold instead, and
`rollTargetPolicies` builds the `ROLL_TARGET_SWEEP` family (`<prefix>Roll1` … `Roll8`) so the curve
can be read off empirically. `Roll1` is the never-push floor stated as a policy, which is what puts
the old modelling default on the same axis as every push above it.

## Information discipline — the rule that makes any of this meaningful

A policy runs inside the engine and could simply read `state.hands[Cpu]`. `skilledCardPlay.ts` may
read only what a player at the screen can see: the cards face up in the current trick and their
skull marks, its own hand, `suitShape` (per-suit counts, no ranks — literally the function
`QuarryShape.tsx` renders), the trump suit and the public counters. `quarrySkullOdds` is the only
route this module has to the Quarry's hand, and `skilledPolicy.test.ts` pins it by asserting that
two Quarry hands with identical shape and totally different ranks produce identical odds.

## The diagnostic policies

Each differs from `skilled` in exactly one method and takes every other by reference, so a gap in
its figures is attributable to that lever alone: `skilledNaiveCards` (the old card heuristic),
`skilledUnaimed` (arm everything, no intent), `skilledNoSwap`,
`skilledNoCheat`, `skilledCardsFirst` (the pre-2026-09-02 shop order), `skilledCombine` and
`skilledCardsCombine` (the upgrade screen), and `skilledCeilingPaced`. (`skilledWithTimebomb` and
`sharpshooterNoTimebomb` went with the card on DLR-166.)

They are declared **after** `skilledPolicy` deliberately: a `const` spread before its initialiser
runs reads the temporal dead zone, which surfaces as an empty report rather than as a type error.

## What it still does not do

- **The Fox and the Woodcutter are never led.** Both open an `AbilityChoice` prompt this policy
  cannot answer, and between them they are the deck's two strongest levers — the Fox changes the
  trump suit outright, the Woodcutter draws and buries.
- **No lookahead.** Every decision is one trick deep, and `leadWinOdds` is rank-against-the-deck
  rather than a real reading of what the Quarry can still hold.
- **36% of tricks get no buff window at all**, because `discardWindowOpen` is false once a card is on
  the table. Whether that is the game's rule or this driver's ordering is unsettled and worth
  establishing before anything is tuned against it.
