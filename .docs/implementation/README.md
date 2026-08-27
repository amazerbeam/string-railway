# Implementation docs

One living folder per `src/` module, describing how the code in that folder actually works —
maintained by the `implementation-doc-writer` skill (`.claude/skills/implementation-doc-writer/SKILL.md`),
invoked automatically by `/fb-apply` every run, once review concludes.

This is the third leg alongside `.docs/design/` (design intent, why a mechanic exists) and
`.docs/game_rules/the-hunt.md` (the game's rules as they currently stand):
**implementation-as-built** — what is actually on disk right now, not what a plan proposed. A doc
here should answer "how does X actually work" without reading the source, and "what's been
implemented" without digging through old tickets.

Same skill, same `/fb-apply` step, different question: ask **`the-hunt.md`** what a player may do
and whether a rule is settled; ask **here** how the code does it. `CLAUDE.md`'s three-doc split
states the boundary once. (`.docs/game_rules/fox-in-the-forest.md` is outside that split — it is the
base game's published rulebook, transcribed, and nothing in the pipeline maintains it.)

Docs are organized by module, not by ticket, and accumulate across every ticket that touches that
folder — so a mechanic's explanation lives in one place regardless of which ticket last changed it.

Each module gets its own folder under here (e.g. `war-council/`), not a single flat file. A
module's `README.md` is its spine — Status, Built by, Responsibility, Key types & exports, Rules &
invariants, Deferred — and links out to one file per mechanic once the module has more than a
couple worth a standalone answer. A thin module stays a single `README.md`; nothing forces a split
before it earns one. See the skill's own SKILL.md for the split threshold and per-module template.

| Module                | Doc                                         | Status      | Built by                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/warCouncil/`     | [war-council/](war-council/README.md)       | implemented | SCRUM-19, SCRUM-20, SCRUM-26, DLR-47, DLR-49, DLR-50, DLR-51, DLR-52, DLR-63, DLR-66, DLR-67, DLR-68, DLR-69, DLR-70, DLR-80, DLR-81, DLR-83, DLR-90, DLR-91, DLR-92, DLR-94, DLR-96, DLR-100, DLR-109, DLR-125, DLR-143, DLR-146, DLR-149, DLR-150, DLR-152, PT-001, PT-002                                                                                                                                                                   |
| `src/app/`            | [app/](app/README.md)                       | implemented | SCRUM-37, SCRUM-28, SCRUM-29, SCRUM-34, DLR-47, DLR-53, DLR-63, DLR-67, DLR-71, DLR-80, DLR-81, DLR-82, DLR-83, DLR-84, DLR-85, DLR-90, DLR-91, DLR-92, DLR-93, DLR-95, DLR-100, DLR-114, DLR-116, DLR-118, DLR-125, DLR-131, DLR-132, DLR-145, DLR-150                                                                                                                                                                                        |
| `src/app/warCouncil/` | [war-council-ui/](war-council-ui/README.md) | implemented | SCRUM-28, DLR-47, DLR-53, DLR-63, DLR-66, DLR-67, DLR-68, DLR-71, DLR-80, DLR-81, DLR-82, DLR-83, DLR-84, DLR-86, DLR-90, DLR-91, DLR-92, DLR-94, DLR-95, DLR-97, DLR-100, DLR-101, DLR-108, DLR-109, DLR-114, DLR-115, DLR-117, DLR-125, DLR-132, DLR-141, DLR-142, DLR-143, DLR-145, DLR-146, DLR-148, DLR-149, DLR-150, PT-002                                                                                                              |
| `src/app/run/`        | [run-ui/](run-ui/README.md)                 | implemented | DLR-82, DLR-84, DLR-85, DLR-89, DLR-90, DLR-91, DLR-92, DLR-93, DLR-95, DLR-97, DLR-116, DLR-118, DLR-142, DLR-145                                                                                                                                                                                                                                                                                                                             |
| `src/hunt/`           | [hunt/](hunt/README.md)                     | partial     | DLR-48, DLR-49, DLR-50, DLR-51, DLR-52, DLR-53, DLR-63, DLR-66, DLR-67, DLR-69, DLR-70, DLR-80, DLR-81, DLR-82, DLR-83, DLR-84, DLR-85, DLR-89, DLR-90, DLR-91, DLR-92, DLR-93, DLR-94, DLR-95, DLR-96, DLR-100, DLR-101, DLR-104, DLR-105, DLR-107, DLR-108, DLR-109, DLR-110, DLR-112, DLR-113, DLR-114, DLR-116, DLR-121, DLR-125, DLR-126, DLR-127, DLR-132, DLR-135, DLR-141, DLR-142, DLR-143, DLR-145, DLR-146, DLR-150, PT-001, PT-002 |
| `src/persistence/`    | [persistence/](persistence/README.md)       | implemented | DLR-106                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/vault/`          | [vault/](vault/README.md)                   | implemented | DLR-113, DLR-118, DLR-145                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/app/vault/`      | [vault/](vault/README.md)                   | implemented | DLR-113, DLR-118, DLR-145                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/sim/`            | [sim/](sim/README.md)                       | implemented | DLR-130, DLR-120, DLR-132, DLR-135, DLR-145, DLR-146, DLR-150                                                                                                                                                                                                                                                                                                                                                                                  |

`src/app/warCouncil/` has its own folder rather than a section inside `app/`: it is a module folder
in its own right, and War Council's combined doc had already passed this project's per-file line
budget by the time it was split (SCRUM-28) — and has since been split again, into per-mechanic
files within each of `war-council/` and `war-council-ui/`, for the same reason. `src/app/run/`
(DLR-82) follows the same convention as a sibling screen module: `run-ui/`.

Two files here are not module docs and sit at the top level deliberately:
[run-winnability-simulation.md](run-winnability-simulation.md), the record of what `npm run sim`
has actually played, and
[structure-notes-for-the-port.md](structure-notes-for-the-port.md) — **a running list of structural
improvements this prototype deliberately did not make, and should make when the game is rebuilt in
Unity.** Nothing in that file is a defect; each entry names a place where the prototype hardcodes
something that ought to be data, says why the shortcut was right at this scale, and says what the
port should do instead. Add to it whenever you defer a structural improvement, while you still
remember the reasoning.

DLR-47 retired the Vanguard board engine, the battle-loop orchestrator, and their UIs —
`src/App.tsx` now mounts a single War Council round directly
(`src/app/warCouncil/WarCouncilRound.tsx`), dealing a fresh round and restarting on completion. See
[app/README.md](app/README.md) for the mount itself; the deleted modules' history is recoverable
via `git show` per `CLAUDE.md`'s recovery instructions, not documented here.

DLR-53 turned that round screen into the **Hunt screen** — persistent readouts in a dossier column,
the Quarry's intent telegraphed before every commit (**that telegraph was deleted by DLR-148**), and
an end panel. It is the ticket that gave
`src/hunt/` its first UI consumers and made a Hunt playable end to end; start at
[war-council-ui/hunt-readouts-and-telegraph.md](war-council-ui/hunt-readouts-and-telegraph.md).

DLR-71 put the **duel** on screen — two health bars as a mirrored opposed pair, health carried Hunt
to Hunt, and an encounter that could finally end. **DLR-86 then replaced both bars with rows of
countable hearts** that break as damage lands, and gave the Quarry's row a preview of what the banked
streak would cash for. **DLR-101 added a fifth heart state** so a booked Timebomb hit shows on whichever
bar owes it — the readout the engine had been keeping a booking for since DLR-90 with nothing on the
felt to show it. **DLR-115 added a second pip _type_ rather than a sixth state**: a shield cluster
drawn from `encounter.shieldHearts`, inboard of the red run, and a fix for the ticking-Timebomb
preview that used to show red hearts breaking that blue hearts would in fact absorb. Nothing in the
app layer grants a shield yet, so no player has seen one. See
[war-council-ui/duel-health-bars.md](war-council-ui/duel-health-bars.md).

**DLR-80 replaced the game's entire scoring layer, and it is the largest deletion this project has
taken.** A hand is now **six cards and six tricks** rather than thirteen; roughly a third of the
Quarry's cards carry a **skull** the player can see before committing; the skull **inverts the
trick**, so on a clean trick you want to win and on a skull trick you want to lose; and taking tricks
builds a **bank × streak multiplier** that cashes into the Quarry's health whenever you take damage
and again at the end of the sixth trick. Damage lands **per trick, mid-hand**, so an encounter can
end on trick 3.

It spans all four modules and deletes rather than defers: the Win/Lose declaration and its gate, both
Standing multiplier tables and their four bands, rank inversion, the Lose-path pile swap, Spoils and
the capture piles, damage rounding, pending damage, and the once-per-Hunt damage application with its
confirmation press are all gone from `src/`. In implementation terms it retires most of DLR-63
through DLR-71 — the correct trade for a prototype, with the reasoning banked here and in
`.docs/design/`.

Start at [war-council/bank-and-cash-out.md](war-council/bank-and-cash-out.md) for the four-outcome
loop, [war-council/skulls.md](war-council/skulls.md) for the skulls,
[hunt/hand-and-skull-tunables.md](hunt/hand-and-skull-tunables.md) for the numbers and what was
deleted from configuration, or
[war-council-ui/hunt-readouts-and-telegraph.md](war-council-ui/hunt-readouts-and-telegraph.md) for
the two new readouts. **One figure is deliberately undecided** — the Quarry's health, a labelled
placeholder the developer sets from the first play session.

**DLR-81 removed the Quarry's character power, and it is the one deletion here that undoes a feature
nobody decided to have.** DLR-51 had given the Monarch a _round-long rule-break_: on every lead the
Quarry made, the player narrowed to their Swan or their highest card of that suit, whether or not a
rank 11 was on the table. The five character names were only ever meant as placeholder framing —
"opponent 1, opponent 2" — and powers were intended for a **final boss**, not for every opponent. A
play session measured what it cost: five follows in twelve tricks, **every one with exactly one legal
card**, which made both eaten skulls undodgeable.

`quarryRuleBreak.ts` is gone, along with `monarchFollowApplies`, `RoundState.quarryCharacter`,
`dealRound`'s third parameter, `QuarryCharacterInfo.description`, and the rule line on the dossier
panel. The Quarry now plays by exactly the player's rules; a character is a **name only**. The
`monarchFollowSet` helper survives in `legal-moves-and-abilities.md` as the _printed_ rank-11 rule,
which fires on the led card and binds both sides. Two things worth knowing: a **60-seed soak test**
guards the absence, and the removal incidentally closed the module's highest-value outstanding copy
bug (`MustFollowMonarch`'s message has one trigger again, so its wording is accurate as written).

**Every engine measurement recorded before 2026-08-13 was taken against that power**, including the
play sessions that produced the current design — treat pre-DLR-81 numbers as provisional. Powers
return only when a final-boss ticket designs them; nothing about their shape is decided.

**PT-001 made the skull rank distribution a tunable curve, and it is the first `PT-` (play-test)
contract rather than a Jira-tracked one.** Skulls were drawn uniformly from ranks 2–11; they are now
drawn against a **weight-per-rank table**, and the active curve — **hump** — concentrates them on the
middle ranks, so a 5 or 6 in the Quarry's hand is skulled far more often than a 10 or an 11. **The
game plays differently from the moment it landed**; that is the point of the contract, not a side
effect, and whether hump is right is the developer's to answer by playing.

`SKULL_MIN_RANK` is gone: "never rank 1" is now `1: 0` in every curve, which extends the guarantee to
any curve added later. Three curves ship **exported with no reader on purpose** — they are the
intended per-opponent difficulty lever, so a later boss can differ by its skull curve instead of by a
rule-break — and both the config comments and `ideas.md` say so, because deleting them as dead code
is the likeliest way this work gets undone. Start at
[hunt/hand-and-skull-tunables.md](hunt/hand-and-skull-tunables.md) for the four curves and their
numbers, or [war-council/skulls.md](war-council/skulls.md) for the weighted draw and why it consumes
exactly one `rng` call per skull.

**PT-002 changed what the bank counts, and it is the smallest diff with the largest effect on how the
game plays.** The bank added both cards' **printed ranks** on every trick taken; it now adds **1 per
trick**. Both terms of the cash-out equation are therefore the streak length, so a streak of _n_ cashes
exactly `n × n` — **1, 4, 9, 16, 25, 36** across a six-trick hand. One branch of one function changed;
the four outcomes, the reset, the end-of-hand fold and the damage path are all untouched.

The measurement behind it: per-hand damage regressed against `Σn²` at **R² = 0.938**, so the ranks were
contributing almost nothing structural — but they still swung the payout by roughly **±20%** with no
decision controlling it, and 1,251 hands of identical trick shape paid anywhere between 20 and 93. What
went is variance the player could not act on; what stays is the compounding.

Because a hand now pays a mean of ~7 rather than ~84, **the Quarry's encounter health drops 400 → 10**
— the developer's own figure, set in the same session, and a knowingly easy one (random legal play wins
63.8%, a fight lasts ~1.9 hands, ~37% of damage is discarded as overkill). Start at
[war-council/bank-and-cash-out.md](war-council/bank-and-cash-out.md) for why `n × n` falls out of two
counters, or [hunt/hand-and-skull-tunables.md](hunt/hand-and-skull-tunables.md) for both health totals
and what a 10-health Quarry costs.

Two shapes were deliberately preserved rather than simplified, and both are load-bearing for work not
yet built: `bank` and `multiplier` stay **two independent fields** so a planned one-time-use "+1 ×"
item can move one without the other, and the engine field is still **named `bank`** although it holds
a trick count — a ~20-file rename judged not worth a play-test ticket. Money and the shop were
explicitly out of scope for PT-002 and **arrived at DLR-84** (below); **leftover damage as currency
still has not** — the coin is paid for winning a fight, not for overkill.

**DLR-82 turned one encounter into a run, and it is the first ticket that makes a session something
you can lose rather than merely end.** Three Quarries are fought in order — `QUARRY_ENCOUNTER_HEALTH`
went from `[10]` to **`[10, 14, 18]`** — on **one player health bar that is never restored**. Win a
fight and you carry the health you finished on into a tougher one; your bar emptying at any point
ends the run and offers no further fight; winning the third ends it as a win that reads plainly
differently from winning the first two.

The rules live in a new pure module, `src/hunt/run.ts` — `RunState` and four transitions, inside the
lint-enforced no-React boundary — and `src/App.tsx` became a driver that calls them and does no
arithmetic of its own. `ENCOUNTERS_PER_RUN` stopped being a free-standing `5` sitting beside a
one-entry array and became an alias of that array's length, so run length has one source of truth.
Start at [hunt/run-sequence.md](hunt/run-sequence.md) for the transitions and where a run's end is
decided, or [app/run-driver.md](app/run-driver.md) for the driver and why it holds no effect.

**It also deleted a screen, on the developer's own ruling, in answer to a play session.** The
feedback was that _"the player didn't know when she beat the opponent or lose"_ — and the terminal
state responsible was a `<p role="status">` sentence inside a tally table on the felt, with no
control on it. That branch sat **ahead of** the resolved-trick reveal, so the trick that ended a
fight was never shown at all. Removing it inverted both problems: the deciding trick now gets its
beat, one tap replaces two, and a full-screen verdict — [run-ui/](run-ui/README.md) — states
`FIGHT WON` / `YOU WIN` / `YOU LOSE` with the run position, the carried health and a trick-bar row.
`ENCOUNTER_OUTCOME`, `.wc-terminal` and `RoundOverPanel`'s `winner` prop went with the branch.

**Two things were deliberately not wired, and one of them still is not.**
`ENCOUNTER_PLAYER_RESTORE` remains exported and **unread** — DLR-82 forbade wiring it in until the
flask was designed, DLR-84 did not touch it, and **DLR-93 built the flask and still did not wire it**,
because a restore the game performs for you is not the same mechanic as a charge you choose to spend.
A grep in each of those contracts guards the absence. The currency and the shop it also lacked
**arrived at DLR-84**, and the flask itself **at DLR-93** (both below). The curve's second and third
values are a **documented placeholder**: the ticket predicts the player losing around fight three at
these numbers and calls that the arithmetic working, with the shop and the flask as the answer rather
than a bigger health bar — **both halves of that answer have now shipped, and neither has been played
against the curve.**

**DLR-83 gave the player the first thing they can do that the Quarry cannot.** Follow-suit could not
be broken by anything, at any price — so the worst tricks to lose were the ones there was no legal way
to refuse. The player now holds **two Cheat cards in two slots**; two clicks on one arms it, and while
it is armed **every card in hand is legal**. The next card committed spends it and empties the slot;
a third click gives it back unspent. The slots are run state, carried across fights exactly as health
is, and granted once at the start of a run.

The whole rules half is a **trailing optional parameter** — `legalMoves(state, side, options?)` — and
that shape is what makes two acceptance criteria structural rather than careful. The Monarch narrowing
is untouched because its branch returns before the bypass is reached; the **Quarry can never be handed
one** because it is an argument its call sites simply do not pass, which a grep proves. With both slots
empty the code path is byte-identical to the day before. Start at
[war-council/legal-moves-and-abilities.md](war-council/legal-moves-and-abilities.md) for the bypass,
[hunt/cheats-and-slots.md](hunt/cheats-and-slots.md) for the card and the two-slot cap, or
[war-council-ui/cheat-slots.md](war-council-ui/cheat-slots.md) for the felt-left plate and the
two-click arm.

**One breaking change and two deliberate loose ends.** `recordEncounter` gained a **required** third
parameter so the compiler enumerates every site rather than letting one silently drop a spend. And
`addCheat` and `nextCheatId` both ship **unread by production code** — the first states the cap once,
the second stops a spent id being re-issued as a colliding React key. Both are DLR-84's foundations;
**do not delete them as dead code.** How many Cheats a run starts with is the developer's, and it has
moved: `RUN_STARTING_CHEATS` was 2 when DLR-83 shipped and is **0** since 2026-08-17, so a run opens
empty-handed and every Cheat is bought.

**DLR-84 gave the run an economy, and it is the first ticket where a decision costs something.**
Beating a Quarry now pays **1 coin**, carried across the whole run and shown on the felt beside the
fight counter. Between fights the verdict offers **two** forward controls — `Continue` and `Shop` —
and the shop sells exactly two things at 1 coin each: a **Cheat** into a free slot, or a **Heal** of
4 health applied immediately and clamped to the player's maximum. You may buy nothing, or buy
repeatedly while you can pay, and leaving starts the next fight with every purchase already in
effect. It is the answer DLR-82 predicted for its own fight-three wall, and **the health curve was
deliberately not retuned in response** — whether 4 health a fight is enough of an answer is a play
question.

The shop is **opt-in, on the developer's ruling at the planning gate** — an earlier draft made it a
mandatory step on the path. Because it can be walked past, `Continue` is guarded: pressed while
anything is affordable it warns in place and offers the shop or the fight.

**Its one convention is worth carrying forward.** A single exported predicate, `refusalFor`, is read
by the transition that throws, the button that greys, the driver guard that no-ops, and the warning
that fires — and is **never re-derived at a call site**. That is what makes a greyed control and a
thrown `RangeError` one rule read four times rather than four rules that can disagree. Start at
[hunt/coins-and-the-shop.md](hunt/coins-and-the-shop.md) for the economy,
[run-ui/shop-screen.md](run-ui/shop-screen.md) for the screen and its three-channel refusals, or
[app/run-driver.md](app/run-driver.md) for the three-state between-fights phase and the double-click
race it closes.

**Two things it also closed.** `addCheat` and `nextCheatId` finally have production readers, so the
"do not delete as dead code" warning above is discharged. And `run-ui/` outgrew a single file and was
split into [verdict-panel.md](run-ui/verdict-panel.md) and
[shop-screen.md](run-ui/shop-screen.md). **One thing it left at a hard edge**: `warCouncil.css` was taken to
**exactly 400 lines**, the blocking budget, by merging the coins plate into `.wc-run`'s selector rather
than duplicating the block — and it stayed there with zero headroom until DLR-93's remediation pass
split the decree/draw pile and `.wc-table` rules out into `warCouncilTable.css` (151 lines), leaving
`warCouncil.css` at **258**.

**DLR-85 gave the run a visible shape, and it is the first ticket where the game shows you how far there
is to go.** The app now opens on a **start screen** rather than on fight one: the whole run drawn as a
single horizontal path — twenty thin **ticks** for ordinary opponents and five filled **blocks** for stage
bosses, grouped four-then-a-boss five times over — with all twenty-five names angled below the line, the
goal stated in words ("Beat all 25"), and one button reading **`Fight Aoife`**. The same surface is
reachable between fights from a third `Map` control on the verdict, where beaten opponents are **struck
out and still present** and the next one is marked out from those beyond it. Losing returns you to the
start screen with a fresh path.

**The run grew from three fights to twenty-five**, and opponents got names — Aoife through Oisín, with
Bréanainn, Muireann, Conchobhar, Gráinne and Diarmuid closing the five stages. Naming spread across four
surfaces in one pass, because a named map beside an unnamed verdict reads as two different games: the
verdict headline is `Aoife defeated`, the forward controls read `Fight Cillian`, the shop's leave button
does too, and the felt's band reads `Fight 1 of 25 — Aoife`.

The structural decision is the one worth carrying forward: **`RUN_ENCOUNTERS` is now the run's single
source and `QUARRY_ENCOUNTER_HEALTH` is a projection of it**, which is why growing the run from 3 to 25
required **zero test edits** — and why it must stay declared above that projection, since a forward
reference throws at module init. Stages are **derived from where the bosses actually sit**, so no stage
count appears in the code and the same component renders three ticks and no boss as happily as five
stages. Start at [hunt/run-path-and-the-roster.md](hunt/run-path-and-the-roster.md) for the sequence, the
generated health curve and the path model, or
[run-ui/run-map-and-the-path-screen.md](run-ui/run-map-and-the-path-screen.md) for the two surfaces.

**Two things are worth knowing before playing it.** The run is **not expected to be winnable** — Oisín
holds 86 health and Diarmuid 135 against a player starting on 10 — which is the arithmetic working as
DLR-82 designed it, and makes `YOU WIN` effectively unreachable in play. And **AC11 is not met**: the
restored horizontal path is wider than the viewport below about 1088px, and the shell is
`overflow: hidden`, so it **crops silently** — 21 of 25 nodes at 1024×768, 14 at 500×844. The remedy is a
tuning choice (a smaller name font, a steeper angle, or a scrolling path region) and is the developer's.

**It is also the clearest case yet for QA driving a real browser.** The first implementation left the
per-stage node list unstyled, so the path rendered as a 5×5 vertical grid instead of one line — and
**every one of the 633 tests passed**, because `jsdom` has no layout engine. It was found by reading
`getComputedStyle` and twenty-five bounding boxes in Chrome, and fixing it is what revealed the AC11 crop
that the broken-but-more-compact layout had been hiding.

**DLR-89 gave the shop the shape of the game it is going to be, using only the two items it already
had.** The flat two-item list became a **four-rung persistence-length ladder** — one-time use,
fight-long, run-permanent, game-permanent — drawn as four tabs. The Cheat sits on the first rung;
fight-long and run-permanent are **empty and say so** ("Nothing on this shelf yet."); game-permanent is
**shown and refused** as "Coming soon.", because nothing is designed for it and hiding it would hide
the shape. The heal moved **outside the ladder entirely**, in its own labelled block: it is an instant
transfer with no duration, so no rung is the honest answer for it. Nothing about pricing, refusals or
purchasing changed, and the evidence is that **all eleven pre-existing shop-screen tests pass
unedited**.

The structural point is where the ladder lives. The rungs, the item→rung assignment, the two
groupings and **which rung refuses** are all plain TypeScript in `src/hunt/shop.ts`, inside the
lint-enforced no-React boundary. So adding an item is **one `ShopItem` member, one `priceOf` case and
one `categoryOf` case** — and it appears on the correct shelf with no UI edit at all. That is the
property the three follow-on item tickets were built on, and **all three have now shipped** — Timebomb
(DLR-90), Blast Guard (DLR-91) and the Whetstone (DLR-92), every one at that cost, so the prediction held
three times for three different shelves. The
component asks `isShopCategoryAvailable` rather than naming `GamePermanent`, and "empty" and "refused"
are kept as **two separate facts** — conflating them would have started refusing fight-long until its
item shipped. Start at [hunt/coins-and-the-shop.md](hunt/coins-and-the-shop.md) for the ladder, or
[run-ui/shop-screen.md](run-ui/shop-screen.md) for the tablist and its keyboard contract.

**It is the second contract in a row that a real browser caught and the tests could not**, and this
one took three attempts. The added tab row pushed the shop's content past `100dvh`, and `.run-shell`
is `overflow: hidden` — so **the leave button was clipped off the bottom of the screen**, leaving the
only way out of the shop an undocumented `Escape`. All 671 tests passed throughout. Shaving seven
spacing values closed most of the gap but still clipped at 1024×768 and 1280×720; `max-height: 100%`
on `.shop` was then a **silent no-op**, because that percentage never resolved against a
`place-items: center` grid row — computed style reported the literal string `"100%"`. What worked was a
**definite** cap, `calc(100dvh - 2 * clamp(1rem, 4vmin, 3rem))`, with `.shop-panel` as the only
`flex: 1 1 auto; min-height: 0` child so it absorbs the slack and scrolls. The lesson worth carrying:
a percentage `max-height` is not a viewport cap, and "the mechanism is correct" is not the same claim
as "the mechanism engages".

**DLR-90 gave the player something to do with a card they expected to throw away, and it is the first
effect in this game that resolves later than the thing that caused it.** A third shop item — **Timebomb**,
2 coins, on the one-time-use shelf DLR-89 built — buys a charge you carry across fights. On the felt, a
plate beside the Cheat rail arms it in two taps, and a third tap on a card in your hand **Timebombs** that
card. Play it, and the trick resolves by the normal rules; **damage then lands on whoever won that
trick** — at the deal of the next hand as DLR-90 shipped it, and **at the resolution of the next trick
since DLR-91**. The rule that makes it worth buying is the one the design doc
singles out: **a primed trick the Quarry wins cleanly costs you nothing at all** — no health, and your
bank and multiplier survive uncashed instead of resetting. Win it yourself and the hit lands on **you**
instead — 2 rather than the Quarry's 4 since DLR-91, and it cashes your streak out with it.

Four structural points are worth carrying forward. **The queue lives on `EncounterState` and is shaped
like the damage it will become** — an `IncomingDamage` per-side accumulator, the exact type `applyDamage`
already consumes — so both discard rules are free: `startEncounter` seeds it to zeros, and every fight
and run boundary routes through `startEncounter`. There was **no explicit clear step
anywhere** as DLR-90 shipped it, which was the point, because a clear step is what a later ticket forgets
to call — DLR-91's retiming added one, in the reducer, guarded so the common path allocates nothing.
**DLR-90 paid the hit with one pure function at the run layer**, `beginNextHand`, total and throw-free
alone in that module; **DLR-91 deleted it**, because the payment moved into the resolving trick.
**The player-side case needs no branch**: the hit follows the winner, so the plumbing stays symmetric
even though the amounts no longer are. And **the marker is engine state**, because the
preserved-bank rule is a bank rule — honouring it from the UI layer would mean the reducer re-deriving
rules `resolveTrickBank` owns.

Start at [hunt/timebomb-and-the-delayed-hit.md](hunt/timebomb-and-the-delayed-hit.md) for the queue and its
single payment point, [war-council/the-timebomb-mark.md](war-council/the-timebomb-mark.md) for the marker
and the replaced clean loss, or
[war-council-ui/timebomb-charge-and-the-mark.md](war-council-ui/timebomb-charge-and-the-mark.md) for the
plate, the mark and the reducer split.

**It carried three refactors and fixed one latent defect, none of which an acceptance criterion asked
for.** `resolveTrickBank`'s four positional booleans became a `TrickFacts` object, because a fifth would
have left the call reading `(START, true, false, false, false)` and **a transposed pair type-checks
cleanly** on the function that decides both health bars. `cardAccessibleName`'s `skulled` boolean became a
`marks` object, for the same reason on the surface a player who cannot see the card depends on. And
`roundReducer.ts` — at **382 of its 400-line budget before a line of this work landed** — was split into
`roundUiState.ts` and `roundHint.ts` as pure moves, which incidentally gave `deriveHint` its first unit
test after six branches of living inside a component. The defect: **`buyFromShop` returned the heal as an
unconditional fallback**, so a third item would have healed the player and type-checked cleanly. It is now
an exhaustive `switch` with no `default`.

**DLR-91 moved Timebomb to where it can actually bite, resequenced every damage event in the game, and
sold insurance against the result.** Three changes in one contract, and the middle one is the widest.
**First**, Timebomb stopped being a hit paid quietly at the next deal and became a hit paid at the **next
trick's resolution**, folded into that trick's own damage — 4 to the Quarry, **2** to the player, and for
the player it forces the same cash-out any other hit forces, so a streak in progress is spent at a moment
you did not choose. **Second**, all damage is now applied **Quarry-first**: a cash-out that kills the
Quarry spares the player the hit that would have landed alongside it, so a mutual kill is a **player
win** — which overturned a dated design ruling that the player _loses_ it, and deleted the constant that
ruling had been implemented as. **Third**, the shop's empty **fight-long** shelf got its first item: a
1-coin **Blast Guard**, bought between fights, live for exactly the next fight, that lets you take
Timebomb's 2 health without losing the streak. Spent the first time it fires, gone when the fight ends
either way.

Two structural points are the ones to carry forward. **The payment crossed a module boundary, and the
direction it crossed matters**: the queue is `EncounterState`'s in `src/hunt/`, the streak is
`RoundState`'s in `src/warCouncil/`, and `hunt` may not learn what a `RoundState` is — so the reducer,
which holds both, hands the pending figures _into_ `playCard` through a widened `PlayCardOptions` rather
than anything reaching the other way. And **the new reset is a second trigger on one branch, not a second
rule**: Timebomb owed to the player reaches the same `cashOut = bank × multiplier` statement a lost trick
reaches, which is what makes "Timebomb behaves like any other damage" true in code instead of asserted in a
comment.

**One accepted oddity shipped with it, knowingly.** Because the Guard suppresses the cash-out, a Quarry
that would have died to that cash-out survives — and under Quarry-first sequencing a surviving Quarry
means the player takes the 2 they would otherwise have dodged. **So holding a Guard can cost you
health**, the correct play is sometimes not to hold one, and there is no UI hint. The developer accepted
that as a real decision rather than smoothing it out.

Start at [hunt/blast-guard.md](hunt/blast-guard.md) for the flag and its lifetime,
[hunt/encounter-state-and-end-conditions.md](hunt/encounter-state-and-end-conditions.md) for the
Quarry-first sequencing and the two remaining end conditions,
[war-council/bank-and-cash-out.md](war-council/bank-and-cash-out.md) for the two sources of a hit, or
[war-council-ui/timebomb-charge-and-the-mark.md](war-council-ui/timebomb-charge-and-the-mark.md) for
`applyResolution`'s pay → clear → re-book ordering.

**Three reviewers independently caught the same gap, and it is the one worth remembering.** `DecreePile`'s
`primed` prop was built correctly in one task and **never passed at its mount** in the next — so a
marked card the Fox exchanged into the decree silently lost both its badge and its "primed" accessible
name, on a plate that renders continuously through the hand. Every unit test passed, because the prop
itself was always right. The regression test now drives the **reachable** path — mark, lead the Fox,
exchange, assert the decree still announces it — rather than the prop, which is the only version of that
test that would have failed against the defect. A second reviewer found the mirror of it inside the
reducer: `commit()` cleared `cheatSelection` and not `timebombStage`, so poising Timebomb and playing an
ordinary card left the stage stuck and quietly ate one of the three taps the misclick guard exists to
require.

**DLR-92 made the bank's climb something you can buy, and it is the first purchase that grows a reward
rather than protecting one.** The shop's run-permanent shelf — built empty by DLR-89 and empty ever since —
now sells a **Whetstone** for 4 coins, and each one owned adds 1 to what every taken trick banks, for the
rest of the run. **It stacks**: two of them bank 3 a trick. Because the multiplier still climbs by exactly 1,
a streak of _n_ now cashes `(1 + copies) × n²` — so one copy doubles a full six-trick hand from 36 to 72,
and it is worth most on exactly the hands you were already playing well.

**The interesting part is architectural, not arithmetic.** `resolveTrickBank` is a pure function in
`src/warCouncil/` that must not know what a run is, and the count lives on `RunState` in `src/hunt/`. The
route taken is the one DLR-91 established for the Blast Guard: widen `PlayCardOptions` with a **plain
number**, let the reducer — which holds both halves — assemble it, and name the field `bankClimbBonus`
rather than a Whetstone count so the card layer never learns a shop item's name. A contract-phase grep
enforces that `src/warCouncil/` names neither `Whetstone` nor `RunState` in code. The one crossing is a
single line in `App.tsx`, and it calls `bankClimbBonusFor(run)` rather than passing the count through, so the
rule "+1 per copy" is stated in `src/hunt/run.ts` where a reviewer looks for it instead of in a JSX prop.

**A prediction this documentation made was wrong, and the correction is the useful part.**
`bank-and-cash-out.md` had recorded that "a later item granting bonus bank would add to `bank` rather than
redefine a trick's worth". The item that arrived does the opposite — it redefines a trick's worth, precisely
so the gain scales with the streak rather than being a flat top-up worth the same on a one-trick streak as on
a six-trick one. The old prediction is left in place beside the correction.

**The ladder paid off for the third time, and the DLR-89 obligation it did not discharge is now on record.**
Adding the Whetstone cost one `ShopItem` member, one `priceOf` case, one `categoryOf` case, one
`buyFromShop` case and one purse cell — no item-rendering change at all. But DLR-89 had named a roving
tabindex for shop item cards as an obligation on "the three follow-on item tickets", and **none of the three
discharged it**: each added its item to a _different_ shelf, so no single ticket ever faced a five-card panel.
That is the exact failure DLR-89 predicted, happening as described.

**Not seen in play, and that is the finding.** QA drove the app, confirmed the shelf sells it, the purse
counts it, and the refusal is exact — but **never accumulated the 4 coins to buy one** in two full runs, so
the `+2`-a-trick climb is proven against the engine and has not been watched happening. At 1 coin a fight
against a 4-coin price, the shop's most interesting purchase is currently its least reachable; the design's
answer is the **quick-kill payout** — **built at DLR-95** (below), which is the ticket that should make the
Whetstone reachable. Whether it now over-corrects is a play-session question nobody has answered yet.

Start at [hunt/coins-and-the-shop.md](hunt/coins-and-the-shop.md) for the purchase and
`bankClimbBonusFor`, or [war-council/bank-and-cash-out.md](war-council/bank-and-cash-out.md) for the
arithmetic, the four-layer route, and the floor-to-0 guard that keeps a spoiled figure out of a health bar.

**DLR-93 gave the player a heal they do not have to pay for — 2026-08-20.** The **flask** is one charge
of run state restoring **60% of maximum health** (6 at today's 10), clamped with overheal discarded,
refused with a stated reason at zero charges or at full health, and **refilled to one charge every time
a stage boss is beaten** — never on an ordinary kill. It is drunk from the shop screen, the surface
already reachable only between fights, through a potion-icon button in its own zone above the shelf
ladder and nowhere near the priced Heal. **Engine and screen landed together and QA drove the drink
end to end in a real browser.**

**It is deliberately not a shop item**, and that is the whole design: `priceOf` and `categoryOf` are
total over `ShopItem`, so membership would demand a price it has not got and a shelf it does not sit
on — and would put it on a shelf beside priced cards, which is the confusion its acceptance criteria
exist to prevent. It gets its own reason-code union, its own copy block and its own zone instead.

**Two structural changes are worth knowing beyond the mechanic.** `healedBy` is now **the single writer
that raises player health**, shared by the paid Heal and the flask, so overheal is discarded in exactly
one place and any future healing mechanic goes through it rather than beside it. And **`run.ts` was
split**: the run's transitions moved to `runTransitions.ts` when the file crossed the 400-line ceiling
mid-contract, leaving `run.ts` holding the run's shape and projections, with a deliberate and verified
inert circular import between the two.

**`ENCOUNTER_PLAYER_RESTORE` is still read by nothing**, which is the point rather than an oversight:
DLR-82 forbade wiring it in _until the flask was designed_, and the flask being designed did not change
the answer. Two prose comments in `src/` that asserted no flask existed were corrected, not deleted.

**DLR-93 then paid off the repo's accumulated file-size debt, on the developer's explicit instruction
that anything at 400+ lines be fixed inside the ticket even if it stretched the scope.** No behaviour
changed — it was one deletion and three pure splits, every declaration and every `it(...)` body
preserved verbatim:

- `src/__tests__/sim.test.ts` (464 lines), a self-labelled temporary headless play harness writing to a
  stale scratchpad path, was **deleted**. It was the sole cause of the repo's only three typecheck
  errors and the sole reason `npm run build` failed; both gates are now green. Its removal took its own
  four tests with it (880 → 876) and changed no other count. The design figures it produced are still
  cited in [`.docs/design/…/the-discard.md`](../design/Balatro-Forbidden-Solitaire/the-discard.md),
  which now says the harness is gone.
- `shop.css` 521 → **237**, carving `shopItems.css` (140) and `shopFlask.css` (154).
- `warCouncil.css` 400 → **258**, carving `warCouncilTable.css` (151).
- `WarCouncilRound.test.tsx` 402 → **237**, carving `WarCouncilRound.telegraph.test.tsx` (86) and
  `WarCouncilRound.readouts.test.tsx` (177).

**No file under `src/` is at 400 lines or above.** `src/hunt/config.ts` sat at **399** after this
contract — under budget, and with room for nothing. DLR-94 was the ticket that needed that room and
took the split instead (below).

Start at [hunt/the-flask.md](hunt/the-flask.md) for the rules, the two transcribed tunables and the
boss refill, or [run-ui/the-flask-control.md](run-ui/the-flask-control.md) for the control and how it
is kept unmistakable from the thing you pay for.

**DLR-94, the cash-out the player chooses (2026-08-20)**

Until now the bank cashed on exactly two events, both of them things that _happened_ to the player: a
hit, and the sixth trick arriving. DLR-94 added a third that the player **chooses** — **Apply Damage**
spends the streak into the Quarry in full, at no cost in health, and leaves the trick mid-flight so play
carries on by the ordinary rules. Its counterpart is that the automatic cash-out got **worse**: a hit the
player did not choose now pays only **two-thirds** of `bank × multiplier`, floored. The end-of-hand
cash-out is untouched and still pays in full. That turns a growing bank into a bet rather than a number
the game spends for you at the worst moment.

**Three structural points are worth knowing beyond the mechanic.**

- **This is the codebase's first fractional rule, and the fraction is two constants rather than one
  float.** `2 / 3` is `0.6666666666666666`, so `3 * (2 / 3)` is `1.9999999999999998` and floors to 1
  where the rule says 2 — wrong for every multiple of 3. `forcedCashValue` multiplies by the numerator
  _before_ dividing, keeping the dividend an exact integer at the only division involved. The next
  fractional rule should follow the same pattern; a single float constant reintroduces the bug.
- **Availability is one predicate read twice.** `applyDamageRefusalFor` is the single statement of
  whether the control is live — the reducer asks it before committing and the plate asks it to disable
  itself and print the reason. It is also **re-asked on the confirming second tap**, which is what stops
  a poise made while the control was live from committing after a Timebomb booking has landed under it.
- **Two files were split to make room, both pure moves.** `src/hunt/config.ts` 413 → **324**, carving
  `skullWeights.ts` (93); and `roundReducer.ts` 390 → **352**, carving `quarryAdvance.ts` (96). Neither
  changed a public name or a barrel surface, and every pre-existing spec passed unedited through both.

Start at [war-council/voluntary-cash-out.md](war-council/voluntary-cash-out.md) for the rule and why it
is not a fifth `TrickOutcome`, [war-council/bank-and-cash-out.md](war-council/bank-and-cash-out.md) for
the two rates and the arithmetic, or
[war-council-ui/apply-damage-plate.md](war-council-ui/apply-damage-plate.md) for the control, the
two-tap grammar and the extraction that had to come first. (The plate itself was deleted by DLR-114;
Apply Damage is now the fourth button on the felt's action bar, with the rule unchanged.)

## DLR-96, the integration pass (2026-08-21)

DLR-89 through DLR-95 each built one piece of the run economy — the four-rung shop, Timebomb, Timebomb
Guard, the Whetstone, the flask, Apply Damage and the quick-kill payout — largely in isolation. DLR-96
added no feature: it is a verification ticket that plays the whole economy at once and writes the
composition-level tests the individual tickets had no reason to write, because each spans code two
different tickets touched.

A static audit of every shared interface — `bank.ts`'s three cash-out paths, `RunState`'s fields, the
three refusal unions, `config.ts`'s exported constants — found the composition **already correct**
everywhere the ticket asked it to check. The deliverable is therefore two tests that make that claim
checkable rather than merely asserted in a docblock:
[war-council/README.md](war-council/README.md) covers the Whetstone-plus-forced-hit composition test,
and [hunt/README.md](hunt/README.md) covers the combined `RunState` field-survival test.

A live five-touchpoint browser playthrough (via `chrome-devtools` MCP) additionally confirmed, in the
running app: all four shop categories (Cheat, Timebomb, Blast Guard, Whetstone), a flask drink, a
voluntary Apply Damage, and a quick-kill payout — every one with zero console errors. **One touchpoint
was not reached live**: a stage-boss kill and its flask refill, across two independent play sessions —
the boss holds far more health than an ordinary fight, and neither session's hands were strong enough
to clear it. That branch's logic (`runTransitions.ts`'s `flaskAfter`) is unchanged and not itself
suspected of a defect; it remains an open developer judgement call — accept the static trace, or play
to a boss once by hand — rather than a code defect this ticket could fix.

## DLR-100, the discard (2026-08-22)

**DLR-100 gave the player a between-tricks action, and it is the first control in this codebase
built to be available while the turn gate every other control reads is false.** Before a trick's
first card is laid — including before the Quarry's own lead, so the player can act on "What the
Quarry holds" rather than on a lead already visible — you may now **discard** 1 to 3 cards from hand
and draw the same number blind off the top of the draw pile, with the discarded cards going to the
pile's bottom. Hand size never changes; there is no new discard pile and no reshuffle rule, reusing
the Woodcutter's existing draw-to-bottom convention generalised from one card to n. A fight gives 3
discards, chainable within one gap, carried across the hands within a fight on `RunState`, and the
Quarry gets none.

**The structural point is `discardWindowOpen`.** Cheat, Timebomb and Apply Damage all gate on
`canAct`, which requires it to be the player's own turn. The discard's acceptance criteria ask for a
moment `canAct` cannot reach — the gap where the Quarry is about to lead but the trick has not
started — so `roundUiState.ts` gained a second, deliberately independent gate, and `WarCouncilRound.tsx`
computes a second `interactive` value (`handInteractive`) read by `HandFan` alone, while every other
rail control keeps reading the unchanged one. It is the one predicate in the codebase built this way
on purpose, and the codebase's own note for whoever builds the next consumable that needs the same
reach: read it rather than inventing a second version.

**Two defects were found and closed before this reached review.** A mid-implementation guard-ordering
bug let the rail **open** during the pre-lead gap while silently swallowing every attempt to select a
card inside it, because the new reducer branch sat behind the existing turn guard rather than ahead
of it — the ticket's own headline case looked like it worked while actually being dead on arrival,
caught and fixed in the same implementation pass. A post-review finding closed a second gap: tapping
the felt background while a selection was open used to silently drop it and advance the Quarry's lead
underneath — `handleCarryOn` now refuses to do that while a selection is open.

**Both new tunables are transcribed, not chosen** — `DISCARDS_PER_FIGHT` and `MAX_CARDS_PER_DISCARD`,
both 3, both the developer's provisional values from the design doc's own "ship it, play it, move it"
instruction. Engine and screen landed together, and QA drove the whole loop — opening, chaining, all
three refusals, and the pre-lead window itself — end to end in a real browser.

Start at [hunt/the-discard-budget.md](hunt/the-discard-budget.md) for the third per-fight resource and
the `recordEncounter` widening (and the seven-call-site planning gap it exposed),
[war-council/the-discard.md](war-council/the-discard.md) for the pure swap and its refusal, or
[war-council-ui/discard-plate-and-selection.md](war-council-ui/discard-plate-and-selection.md) for
`discardWindowOpen`, the control, the hand's third mode, and both defects. (The plate itself was
deleted by DLR-114; the discard is now the bar's **Swap** button, with the rules unchanged.)

## Investigation — run-winnability simulation (2026-08-22)

Not tied to a ticket: 900 simulated full runs, driving `src/hunt/**` and `src/warCouncil/**`
directly with no browser, answered "is the run currently winnable, and if not, why not" fresh
rather than trusting the three-ticket-stale full-run data DLR-92 left on record. Result: 0 wins;
roughly half of all runs die on the very first, exactly-matched fight. See
[run-winnability-simulation.md](run-winnability-simulation.md) for what was played, how, and the
full results.

## DLR-104, Action Points (2026-08-23)

**DLR-104 shipped a resource with nothing spending it yet.** A new pure module,
`src/hunt/actionPoints.ts`, adds a starting AP pool (`STARTING_AP`, a developer-chosen placeholder
of 6), a per-hand refresh rule keyed off an enum-shaped `AP_REFRESH_CADENCE` rather than a boolean,
and cost/afford/spend primitives that route every cost through a single toggle-reading function,
`apCostFor`. Its whole design point is that no future consumer will ever write its own
`if (AP_ENABLED) …` branch — flipping `AP_ENABLED` off in `config.ts` makes every AP-gated action
free with zero other code change, the same shape `src/warCouncil/voluntaryCashOut.ts`'s
`applyDamageRefusalFor` already established for Apply Damage.

**Nothing consumes it.** No `RunState`/`EncounterState` field holds a live AP pool, no UI reads it,
and no existing action costs AP — that is explicitly this ticket's scope fence (AC4). Buff
activation (T5) and Apply Damage (T6) are the two tickets that will spend against it, and the field
a consumer needs is theirs to add, not this one's. Start at
[hunt/action-points.md](hunt/action-points.md) for the toggle's single-read-site shape, the
enum-shaped refresh cadence (`PerHand` as shipped; a second, now-live `PerTrick` member landed
2026-08-25 — see that page's own section on it), and the two developer decisions the ticket carries
(`STARTING_AP`, `AP_ENABLED`'s default).

## DLR-105, Buff pile data model (2026-08-23)

**DLR-105 gave the run a second object type owned across its whole life, and it is the shape three
other mechanics will fold into.** A new pure module, `src/hunt/buffs.ts`, adds `Buff` — an identity,
a `bronze`/`silver`/`gold` tier, a `BuffCondition` descriptor, and a `BuffReward` descriptor whose
**axis** varies per card (`magnitude` for the design doc's Bells example, `durationTricks` for
Cheat, `heartCount` for Shield) rather than a fixed "damage" field. That closed union is a direct
answer to the ticket's own stated risk — hard-coding "tier = magnitude" would have forced a rework
the day Cheat's and Shield's tickets tried to fold in.

**`RunState` gained an owned pile and a monotonic id minter, following `whetstones` rather than
`cheats`.** `buffs: readonly Buff[]` and `nextBuffId` are seeded by `seedStartingBuffPile` at
`startRun` (`STARTING_BUFF_COUNT = 4`, transcribed from the ticket and the design doc's §8, all
bronze) and carried through `advanceRun`/`recordEncounter`'s existing `{ ...run, ... }` spreads with
**no explicit parameter** — unlike `cheats`, nothing in this ticket spends or replaces a buff
mid-hand, so there is nothing for a hand to hand back yet. The buff pile also has **no capacity
cap**, unlike Cheat's `CHEAT_SLOT_COUNT` — a deliberate scope decision, not an oversight; nothing in
the ticket or the design doc states one.

**The seeded buffs carry inert placeholder content, on purpose.** `UNASSIGNED_BUFF_CONDITION` /
`UNASSIGNED_BUFF_REWARD` (`{ kind: 'unassigned' }`, `{ axis: magnitude, value: 0 }`) fill every
starting buff's `condition`/`reward`, because the real card catalog was explicitly "TO BE REVIEWED,
not committed" in the design doc (§5) and belonged to a separate ticket. That ticket (DLR-111)
landed on 2026-08-23 — the v1 list is authored at
`.docs/design/Balatro-Forbidden-Solitaire/v1-buff-card-list.md` — but nothing in `src/` read it at
the time. Nothing
in this ticket reads or evaluates a buff's `condition`/`reward` — no activation logic, no UI, no
slot-machine draw, per the ticket's own AC4. Start at [hunt/buff-pile.md](hunt/buff-pile.md) for the
type's four fields, the placeholder-content decision, why the pile follows `whetstones` rather than
`cheats`, and the three axes AC1 named by name.

> **The placeholder content is gone — DLR-135, 2026-08-25.** `startRun` now seeds the pile with four
> distinct **real bronze cards** drawn from `BUFF_TEMPLATES`, and nothing in production mints
> `BuffKind.Unassigned` any more. See [hunt/the-opening-pile.md](hunt/the-opening-pile.md).

## DLR-106, cross-run persistent storage layer (2026-08-23)

**DLR-106 gave the codebase its first shared save mechanism, and shipped it with no consumer.**
A new top-level module, `src/persistence/`, wraps `localStorage` behind a typed
`read()`/`write()`/`clear()` triple scoped to this game's own key namespace
(`strings-and-stations:<section>`), with every stored payload wrapped in a versioned envelope
(`{ version, data }`) from day one. A read never throws: it reports one of five named
outcomes — `Loaded`, `Empty`, `Corrupt`, `VersionMismatch`, `Unavailable` — and returns the
caller's default value alongside every one of them, so a blocked, empty, or foreign-schema store
never looks indistinguishable from a successful read.

**It is new architecture with no precedent in this codebase, and it wrote the project's first
shared rule to hold its shape.** `.claude/rules/save-data-versioning.md` fixes the key grammar
(`saveKeyFor` is the only function allowed to compose one), requires the envelope, requires a
`SAVE_SCHEMA_VERSION` bump on any breaking payload change, and forbids both a bare `localStorage`
call outside `src/persistence/browserStorage.ts` and a cast that bypasses the caller's
`isValidData` guard — the last of those is lint-enforced across the whole `src/` tree via a second
`no-restricted-globals` override in `eslint.config.js`, distinct from the pure-core boundary that
already bans the DOM inside `src/warCouncil/**` and `src/hunt/**`.

**Nothing consumes it yet, on purpose (DLR-106 AC4).** No screen, reducer, or `RunState`/
`EncounterState` field reads or writes through the store; its own 29 specs are its only caller. The
Vault (`version-5-developer-idea.md` §8) is the first intended consumer and is DLR-113's — its
currency, exchange rate and purchase shapes remain open. `.docs/game_rules/the-hunt.md` records no
change: this ticket added a storage _capability_, not a rule — no player-facing procedure, legal
move, or scoring term moved, and a page reload still starts a new run exactly as it did before.
Start at [persistence/](persistence/README.md) for the envelope, the four-check read path, and why
`browserLocalStorage()` is the only function in the codebase allowed to name the global.

**That "nothing consumes it yet" is now two tickets out of date.** DLR-113 built the Vault on top of
it — the game's first persisted state — and **DLR-118 gave the Vault a screen**, which is the ticket
that made any of it reachable. Until DLR-118, `buyOddsBoost` and `buyStartingTier` had no production
caller at all: a player could neither see a balance nor spend one. Now a run that has ended offers
`Open the Vault` beside `Start a new run`, and that screen is also the first surface in this codebase
to render a **save failure as a real UI state** — a corrupt or version-mismatched record says so, in
words, and says that the unreadable bytes were left on disk untouched, rather than showing a silent
zero. A page reload no longer starts wholly fresh, so `.docs/game_rules/the-hunt.md` records a rule
change this time. Start at [the Vault screen](vault/the-vault-screen.md).

## DLR-127, "buying Timebomb also grants a Cheat" — the bug that wasn't (2026-08-23)

**DLR-127 was raised as a shop defect and turned out to be a stale assertion; no production code
changed.** `buyFromShop`'s Timebomb branch is `{ ...paid, timebombCharges: run.timebombCharges + 1 }`
and has never touched `cheats`. What was red was `timebomb.test.ts :: "does NOT add a Cheat"`, whose
`expect(after.cheats).toEqual([])` is an **absolute** assertion built on a fixture that derives from
`startRun()` — so when `RUN_STARTING_CHEATS` moved `0 → 1` in commit `ccc07ec`, the assertion began
failing on the run's _opening grant_ rather than on anything the purchase did. The sibling
`run.shop.test.ts` never went red because its fixtures write `cheats: []` explicitly.

**The fix went into the spec, and made it stronger rather than merely green.** The assertion now
binds `before`/`after` and requires `after.cheats` to be both deep-equal and reference-identical to
`before.cheats` — catching an added Cheat (all the original caught), a removed one, and a needless
rebuild — guarded by a non-vacuity check against `RUN_STARTING_CHEATS` so it cannot silently become
a tautology on the next retune.

**The sibling purchases named in the ticket were checked and none shares the defect, because there
is no defect** — and that answer is now a test rather than a reading of a `switch`.
`src/hunt/__tests__/run.purchaseIsolation.test.ts` asserts the exact `RunState` changed-field set for
every shop item (Cheat, Timebomb, Blast Guard, Whetstone, Heal) and for `drinkFlask`, so "a purchase
quietly grants a second thing" fails for any future branch, not just this one.
`.docs/game_rules/the-hunt.md` records no change: nothing a player may do, must do, or is scored on
moved, and no tunable's value changed. Start at [hunt/README.md](hunt/README.md) →
_Rules & invariants enforced_ for the purchase-isolation rule and the assert-against-the-pre-value
lesson.

## DLR-109, the delayed Apply Damage payout (2026-08-23)

**Apply Damage stopped being a free, instant, risk-free cash-out.** Pressing it now costs
`APPLY_DAMAGE_AP_COST` (3 action points, since moved to 1 — see DLR-141 below) and **queues** the
payout instead of dealing it — the cash lands `APPLY_DAMAGE_DELAY_TRICKS + 1` trick resolutions
later (1 beyond the press's own trick) rather than in the same reducer transition as the press.
~~Taking damage during that window wipes the queued payout to nothing~~ — true until **DLR-141,
2026-08-25**, see below — enforced at `applyDamage`'s single clamp point in `src/hunt/encounter.ts` —
the same discipline that already made an ordinary hit's bank/multiplier reset undodgeable. A new pure
module, `src/hunt/applyDamagePayout.ts`, is this game's **second** effect that resolves later than
the thing that caused it, deliberately reusing Timebomb's queue-on-`EncounterState` shape
(`hunt/timebomb-and-the-delayed-hit.md`) rather than inventing a second mechanism — and it is a
sibling of Timebomb, never a synonym: a payout is _queued_ and _lands_, never _primed_, _ticking_, or
_detonating_.

**The ordering inside `applyResolution` is the ticket's substance.** A trick resolution is now four
steps — the trick's own damage, the Timebomb queue clear, the new prime booking, and the Apply
Damage payout's tick — and the payout settles **last**. Because the on-hit rule lives inside
`applyDamage`, a trick that costs the player health has already acted on `pendingApplyPayout` by the
time the tick runs, so ~~a Timebomb detonating against the player on the trick a payout was due
destroys that payout~~ — see DLR-141 below, it now reduces rather than destroys — a consequence of
the on-hit rule and the order, not a fifth rule. The quick-kill unplayed-card count, previously read
off the live hand at every kill, now has **two sources**: the live hand for an ordinary kill, and the
payout's own frozen `unplayedAtPress` for a delayed one, so a card played during the delay window can
no longer silently under-count the hand that earned a deferred kill.

Availability extends the existing `applyDamageRefusalFor` in `src/warCouncil/voluntaryCashOut.ts`
with two clauses — `PayoutPending` and `InsufficientAp` — rather than adding a second refusal path,
in the order `NotYourMove → TimebombPending → PayoutPending → InsufficientAp → EmptyBank`. The AP
resource DLR-104 shipped with no consumer finally has one: the pool lives on `RoundUiState`, seeded
per hand at mount. **No `.tsx` file changed** — the two new
refusal codes render through the plate's existing total refusal-message map, so nothing on screen
told a player a payout was in the air, which the ticket scoped out by design. **DLR-114 closed that
gap** (the bar now states a queued payout and renders the pool) and collapsed
`RoundUiState.apPool` into `buffActivation.apPool`, so buff activation and Apply Damage spend from
one number rather than two.

**Three design readings behind this mechanic were taken by an agent under an unattended sprint run,
not played or developer-approved**: an outstanding payout lands at the resolution of a hand's final
trick rather than being lost (the hand-end flush); only one payout may be queued at a time; and the
**order** of a detonating Timebomb versus a due payout on the same resolution. `.docs/game_rules/the-hunt.md`
marks those readings `[provisional]` for exactly this reason, and the delay figure is transcribed
from the ticket and has never been played. Start at
[hunt/delayed-apply-damage-payout.md](hunt/delayed-apply-damage-payout.md) for the mechanic and the
ordering rule, [hunt/quick-kill-payout.md](hunt/quick-kill-payout.md#two-sources-of-the-unplayed-count-since-dlr-109)
for the two-source count, or [war-council/voluntary-cash-out.md](war-council/voluntary-cash-out.md)
for the widened refusal predicate.

## DLR-141, the on-hit rule reduces rather than destroys (2026-08-25)

**A queued Apply Damage payout is no longer an all-or-nothing gamble against the player's health
bar.** DLR-109 wiped it entirely on any hit that cost the player health; DLR-141 replaced that with a
developer-confirmed three-outcome table: a hit that costs red health cuts the payout to
`APPLY_DAMAGE_HIT_RETENTION` (60%, rounded down) and it stays queued on its existing countdown; a hit
fully absorbed by blue hearts leaves it untouched at 100% (unchanged since DLR-110); the encounter
ending — either side — still evaporates it in full (unchanged since DLR-109). `winner !== null` is
checked first in `applyDamage`'s payout expression, so a killing blow that also costs the player
health evaporates rather than reduces. The new pure reducer, `reduceApplyPayoutOnHit`
(`src/hunt/applyDamagePayout.ts`), floors the frozen `cashOut` and returns `null` — not a payout of
`0` — once the floor reaches zero.

`PayoutOutcome` widened from two members (`Paid`/`Destroyed`) to three (`Paid`/`Reduced`/`Evaporated`)
— `Destroyed` deleted outright, not aliased — and `TrickPayoutEvent` gained a required
`remaining: number | null`. `commitHandlers.ts`'s `applyResolution` derives the three-way event by
comparing `pendingApplyPayout` across the `applyDamage` call using **reference** inequality, not a
`cashOut` value comparison — a value check would only happen to distinguish "reduced" from "unchanged"
while the retention constant stays below `1`, and would silently misreport if it were ever retuned to
`1.0`. A trick that both reduces and settles a payout the same fold reports it `Paid` at the reduced
figure, since `tick.due.cashOut` is already post-reduction.

The felt's copy in `payoutLabels.ts` was rewritten for the three outcomes, with the risk hint's
percentage derived from `APPLY_DAMAGE_HIT_RETENTION` rather than typed as a literal; `TrickWell.tsx`'s
outcome CSS class was renamed from `wc-is-destroyed` to `wc-is-evaporated`. `.docs/game_rules/the-hunt.md`
was corrected in six passages and its full-wipe reading moved from `[provisional]` (as DLR-109 shipped
it) to `[settled]` for the retention figure specifically — the Timebomb-ordering reading and the AP
cost/delay figures stay `[provisional]`/unplayed, unaffected by this ticket.

**One finding surfaced no code change**: the ticket's audit for `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md`
cited three passages that turned out to live in `.docs/game_rules/the-hunt.md` instead —
`hybrid-design.md` never described this mechanic's on-hit behaviour at all, a pre-existing gap this
ticket's scope did not cover filling. Start at
[hunt/delayed-apply-damage-payout.md](hunt/delayed-apply-damage-payout.md#where-it-lives-and-the-three-fates--ac3--dlr-141)
for the three-fate rule, the reference-inequality derivation, and the tunable, or
[war-council-ui/apply-damage-plate.md](war-council-ui/apply-damage-plate.md) for what changed on the
felt.

## DLR-114, the pre-hand loadout action bar (2026-08-24)

**DLR-114 is the ticket where ten tickets of bottom-up buff engineering finally became something a
player can press.** It replaced the felt rail's four separate plates with **one action bar along the
bottom of the screen** — Apply Buff, Cards, Swap, Apply Damage — added as the shell's own **fourth
grid row**, always mounted and greying with its reason on each control's own face rather than
disappearing. `ApplyDamagePlate.tsx`, `DiscardPlate.tsx` and their two stylesheets and two specs were
deleted; `CheatSlots` and `TimebombCharge` were **relocated unchanged** into a new `BuffLoadoutPanel`
that Apply Buff opens. (**That panel was itself replaced by `BuffGallery` on DLR-148**, and the two
relocated controls had already become ordinary buff cards on DLR-132.)

**The integration it forced is the substantive part.** `RunState.buffs` reaches the card layer for
the first time, as a required mount prop that deliberately does **not** come back on
`WarCouncilRoundResult` — a hand spends action points, not cards. And the felt's **two** competing AP
numbers became one: `RoundUiState.apPool` was **deleted** and replaced by `buffActivation:
BuffActivationState`, so the pool Apply Damage spends from and the pool `activateBuff` spends from
are the same pool. They had never been observed to diverge only because the second had no spender;
this is the first contract that spends from both.

Two interaction rules are genuinely new and are decided. **The panel door is wider than the
activation window** — `loadoutDoorOpen = discardWindowOpen || canAct` gates _opening_ the panel while
`buffActivationRefusalFor` still gates _activating a row_ — because Cheat and Timebomb moved inside
and were reachable mid-trick before, which is exactly when a Cheat has value; that regression was
found and fixed inside the ticket. And **activation is two-tap, reversible until the second tap and
committing after**: there is no un-activate, because the engine ships none and inventing a refund in
the UI would be writing a rule `src/hunt/` does not own.

**Do not read this as "the buff system works now."** A buff's condition is **never evaluated** and its
reward is **never paid** — `buffAccrual.ts` still has no caller, so activating a condition-family buff
spends AP and does nothing else. (**True of DLR-114 and closed by DLR-125**, below.) `startRun` still seeds four `Unassigned` placeholders that
`activatableBuffs` filters out, so a fresh run with an empty Vault shows an **empty** buff list and
only the relocated Cheat and Timebomb controls; real priced buffs arrive only through Vault grants.
(**Also closed — by DLR-135, 2026-08-25**: a fresh run's four cards are real bronze draws, all five
opening cards are activatable, and the loadout list opens full.)
And Cheat and Timebomb were relocated, not migrated — both still run on their own bespoke state, not
on `buffCatalog.ts`. Start at
[war-council-ui/action-bar-and-loadout.md](war-council-ui/action-bar-and-loadout.md) for the bar, the
door-versus-window split and the AP unification,
[hunt/buff-activation-and-ap-costs.md](hunt/buff-activation-and-ap-costs.md) for `isPricedBuff` /
`activatableBuffs` and where the activation state now lives, or
[app/README.md](app/README.md) for the `buffs` mount prop and why it is one-way.

## DLR-125, buffs that actually pay (2026-08-24)

**DLR-125 is the ticket that made the buff system a system.** DLR-124 had settled the stacking rule
and DLR-108 had built the accrual it needs — but `buffAccrual.ts` shipped with **no caller**, so a
player could open the loadout, spend action points on a condition buff, and be paid nothing at all.
That is closed. An activated buff now genuinely changes the damage a cash-out deals, the coins a run
banks, and the action points a hand has.

**The design is three pieces and two seams, and the seam placement is the whole of it.** A new pure
module, `src/hunt/buffEvaluation.ts`, answers "did this buff's condition come true on this trick" for
the **eleven shipping condition families** — Taker, Feeder, Mark of the _R_, Sidestep, Glutton,
Hoarder, Unbloodied, Debt Collector, Keepsake, Miser, Cornered — as a total `switch` behind an
`isConditionFamily` guard, then layers DLR-124 R4's cadence on top: Event families fire every trick,
Threshold families once per hand, Terminal (Keepsake) only at the final trick, and every Activated
consumable never. The **call site is inside `resolveTrickBank`**, which is forced rather than chosen:
Hoarder needs the bank _after_ the climb and Unbloodied needs to know whether the trick was a hit —
figures that only exist inside that function — and R3 puts Momentum **inside** the cash-out product
and Blade **outside** it, and the product is `bank.ts`'s. Steps 1 and 5 (Second Wind into the AP
pool, Purse into the coins) land in a new `src/app/warCouncil/buffRoundState.ts`, folded after the
trick has resolved so a refund can never be re-spent on the trick that generated it.

**One rule reading is the ticket's own, and it is worth knowing.** `hybrid-design.md` R6 caps each
reward axis _per hand_ but never says what happens when a hand has more than one cash-out. New
`multiplierPaid` / `flatDamagePaid` counters make each pool pay **once per hand** — without them a
hand holding a forced cash-out, a voluntary Apply Damage and an end-of-hand fold would pay three full
pools, at which point the cap is not a cap. **That is a plan decision, not a transcription**, and
reversing it is a one-line change.

**DLR-117's AC3 landed for free, and that is a consequence of the seam rather than extra work.** The
per-card `W/L` preview computes no damage — it hands a hypothetical `TrickResolution` to
`applyResolution` and reads the health delta — so threading buffs through the one `playOptions`
assembly the commit, the Quarry's follow and the preview all share made the preview buff-aware in one
line. **DLR-117's AC1**, the "once any buff is active" visibility gate, is **still deferred**; it is a
judgement about what the felt looks like at rest.

**Four defects are recorded and none is fixed.** **`Keepsake` is structurally unfireable** — with
`HAND_SIZE` cards and that many tricks the hand is empty when it ends, so "hold a card of suit S at
hand's end" is false by construction, and **three Purse cards pay nothing**; an assertion pins it.
**`Ward` silver and gold are indistinguishable** at `DAMAGE_PER_HIT = 1` and never reach the
evaluator at all. **`Miser` fights the shop**, and is now live rather than theoretical. And **Long
Fall** (v1 row #8) is still unimplemented, so eleven of twelve rows are evaluated. Start at
[hunt/buff-condition-evaluation.md](hunt/buff-condition-evaluation.md) for the evaluator, the cadence
and the spend model, [war-council/buffs-in-the-cash-out.md](war-council/buffs-in-the-cash-out.md) for
why the call site is where it is, or
[war-council-ui/buff-hand-state-and-the-fold.md](war-council-ui/buff-hand-state-and-the-fold.md) for
the hand's bookkeeping and the two load-bearing orderings.

**One gap it opened by succeeding:** nothing on the felt announces a firing, so a player sees a
larger number with no cause named. That is the developer's to judge and someone's to fix.

## DLR-132, Cheat and Timebomb as drawable buff cards (2026-08-24)

**DLR-132 closed a gap three separate tickets had each correctly left open: the Timebomb was
entirely unobtainable, and a second Cheat was unobtainable past a cap that no longer had a reason to
exist.** `SHOP_ITEMS` had been pared to four items (DLR-116), the buff pool was built with zero
Cheat/Timebomb templates (DLR-112), and a run opened holding exactly one Cheat and zero Timebombs
with no route to another of either. Both are now **ordinary buff cards**: two new templates the reel
can draw (`BUFF_TEMPLATES` 71 → **73**), two rows in the buff panel's roving-tabindex list (cards in
`BuffGallery`'s grid since DLR-148), spent
through the same two-tap poise-then-spend `activateFromPile` flow every other card uses, priced by
the same `apCostOf`.

**The shape fix is a discriminated union, and it is what makes the next extension cheap.**
`BuffTemplate` was one interface whose `kind` was narrowed to eleven condition families and whose
`axis` was narrowed to four priced reward axes — an activated card has neither. It is now
`ConditionBuffTemplate | ActivatedBuffTemplate`, tagged `form`, and `mintFromTemplate` switches on
it, delegating the activated branch to DLR-107's `cheatBuff`/`timebombBuff` — which stops being
"representation nobody reads" and becomes the only minting path either card has. The five remaining
consumables (Ward, Second Thoughts, Puppeteer, Foresight, Spyglass) are now a data edit plus one mint
branch plus ten unchosen slot weights away, and are **deliberately left out of this ticket's scope**.

**Two rules change what a player may do, not just how they reach it.** A Cheat's tier is now honoured
as **duration** — 1/2/3 tricks of no-follow-suit for bronze/silver/gold, where only bronze's one-trick
lift was ever reachable before; a gold Cheat is reachable for the first time, at 7 action points,
above `STARTING_AP`, and `buffCatalog.ts`'s own standing comment already flags that row as not safe
to ship active. A Timebomb's tier is now honoured as **damage** — the bronze pair (4 Quarry / 2
player) is unchanged by construction, and silver/gold scale both sides together (8/4, 12/6). Only one
Timebomb's tier is remembered per hand (`primedTimebombDamage`); priming a second in the same hand
overwrites it — an accepted, recorded limitation, not a defect.

**The deletions are the same size as the additions.** `CheatSlots.tsx`, `TimebombCharge.tsx`, their
stylesheets, `CheatStage`, `TimebombStage`, `CheatSelection`, the whole of `src/hunt/cheats.ts`
(`CheatCard`, `CheatCardId`, `grantCheats`, `addCheat`, `removeCheat`, `hasCheat`) and
`CHEAT_SLOT_COUNT` are gone — along with `RunState.cheats`, `RunState.nextCheatId` and
`RunState.timebombCharges`. Two records of "do you hold a Cheat" become one: a Cheat and a Timebomb
are members of `RunState.buffs`, with no capacity cap of any kind. `RUN_STARTING_CHEATS` keeps its
name and its value (`1`) and now seeds a bronze Cheat straight into the pile rather than granting a
rail slot. The four-ticket-old `timebombDamageFor`/`timebombDamageOf` naming collision is also
closed: `TimebombDamage` is retyped `Readonly<Record<DuelSide, Damage>>`, `timebombDamageFor` is
deleted, and `queueTimebomb` takes the damage pair directly, because the figure now depends on the
tier of the card that primed it — something `encounter.ts` cannot see.

**One genuinely new interaction rule earns its own name: `buffActivationWindowOpen`.** Every ordinary
buff activates only between tricks (`discardWindowOpen`). A Cheat and a Timebomb activate on
`canAct` instead — reachable through the whole trick, including while following a lead the Quarry has
already committed — because that is the only moment either has value: exactly when
`discardWindowOpen` is false. Both the refusal guard and the commit read the one function, so they
cannot disagree.

> **Timebomb was narrowed out of that exception on 2026-08-26 — Cheat is now the only card in it.**
> See [the Timebomb's activation window](hunt/cheat-and-timebomb-buffs.md#the-activation-window-cheat-mid-trick-timebomb-between-tricks-2026-08-26)
> for why the two cards' reasoning was never actually the same one.

**Nothing was retuned, and nothing was played.** This was an unattended sprint run: the plan-approval
gate was auto-approved and the UI mockup gate was skipped, so the redesigned loadout panel — now
carrying a Cheat row and a Timebomb row beside every condition buff — has not been seen. The four new
slot weights (Skirmisher Cheat 3/Timebomb 3, Strongbox Cheat 1/Timebomb 1) are agent-chosen and
unplayed. `npm run sim -- --runs 200 --seed 1` recorded an observation, not a result: mean buff
activations per hand rose from 0.88 to 1.50, mean AP spent per hand from 2.33 to 4.35, and hands
played holding no activatable buff fell from 67.7% to **0.0%** — every hand now opens holding at
least the starting Cheat. Win rate stayed 0.0% (0/200 both times); no faults.

Start at [hunt/cheat-and-timebomb-buffs.md](hunt/cheat-and-timebomb-buffs.md) for the minting path
and the tier tables, [hunt/README.md](hunt/README.md) for the union and the deleted `RunState`
fields, or [war-council-ui/action-bar-and-loadout.md](war-council-ui/action-bar-and-loadout.md) for
where the two effects fire in `handleTapBuff`. `.docs/game_rules/the-hunt.md` records this as a rule
change: both cards move from unreachable/rail-held to reel-drawn pile members.

## DLR-131, the ErrorBoundary (2026-08-24)

**`src/` throws deliberately and often — 98 `throw new` sites across 37 files at this ticket's
start — and until now nothing caught any of them.** DLR-131 adds one class component,
`src/app/ErrorBoundary.tsx`, mounted around `<App />` in `src/main.tsx` inside `<StrictMode>`. Not
one existing `throw` was touched: this is a net under the throws, not a softer floor. The component
is the **only class in `src/`**, because `getDerivedStateFromError`/`componentDidCatch` have no hook
equivalent in React 19 — there is no function-component way to write an error boundary at all.

**Root-only, not per-screen, and the reason is structural rather than a preference.** React runs a
`useState` functional updater during the render of the component that _owns_ that state, and
DLR-116/DLR-118 deliberately moved the shop's and the Vault's spend guards _inside_ those
updaters — so when `buyFromShop` or `buyOddsBoost` throws, it throws while React is rendering
`App`, above every screen. A boundary placed around any one screen sits below `App` in the tree and
cannot catch that throw. A per-screen boundary also could not honestly offer to keep the run: every
piece of run state lives in `App`, the screens are pure views of it, so clearing a screen-level
boundary and re-entering with the same state re-throws at once — the only "recovery" it could offer
is abandoning the fight, the same loss as a root reset dressed up as a rescue. `App.tsx` staying
untouched at its existing line count was a secondary factor, not the deciding one.

**What the fallback promises, and what it deliberately does not.** A full-viewport `role="alert"`
panel states plainly that the in-memory run is lost, that Vault progress is written through
`saveVault` on every `commit` and _should_ still be there — "should", not "is", because a write can
return `SaveWriteOutcome.Rejected` on a quota error or in private browsing, which the Vault screen
already reports separately — and shows the caught error's one-line `message` (never `.stack`) as
technical detail. Two controls: clearing the boundary's `error` state remounts `App` fresh (a new
run, Vault re-read from storage); reloading the page is the fallback for a remount that re-crashes
on the same input.

**What it does not catch, stated so nobody assumes otherwise.** An error boundary catches a throw in
render, in a lifecycle method, or in a constructor beneath it — never a throw inside an event
handler, a `setTimeout`, a rejected promise, or its own fallback render. Those still escape to
`window.onerror` and still blank the screen. That is a second argument for the in-the-updater guard
convention DLR-116 and DLR-118 established: a guard written _outside_ the updater it protects is
exactly the code path this boundary cannot reach. Three docblocks that asserted "no `ErrorBoundary`
exists (DLR-131)" — the reason three functions in `src/hunt/` and `src/warCouncil/` stay
throw-free or keep a guard — were corrected in the same contract to state the boundary's actual
limits instead; the guards themselves are untouched.

Start at [app/error-boundary.md](app/error-boundary.md) for the component, the mount, and the full
root-versus-per-screen argument. `.docs/game_rules/the-hunt.md` is **not** touched: this ticket adds
a recovery mechanism, not a game rule — nothing a player may do, must do, or is scored on moved.

## DLR-135, a fresh run opens with four real bronze cards (2026-08-25)

**The run's opening pile stopped being a scaffold.** `seedStartingBuffPile` had minted
`STARTING_BUFF_COUNT` (4) `BuffKind.Unassigned` stubs since DLR-105, for a reason its own docblock
stated — the real card catalog was not yet authored. DLR-111 authored it and DLR-112 built the reel
that draws from it, and the scaffold outlived that reason by four tickets while `activatableBuffs`
correctly filtered all four cards straight back out. **A player opened a run holding exactly one
usable card.** They now open holding **five, all of them usable**: four distinct real bronze cards
drawn from the then-73-template `BUFF_TEMPLATES` pool, plus the guaranteed bronze Cheat. The _count_
did not change — four of the five were simply inert. (DLR-145 took the draw to **twenty**, with
replacement, from a **thirteen**-template pool — see below.)

**The draw lives in a new pure module, `src/hunt/startingPile.ts`, and that placement was forced.**
It must import `buffTemplates.ts` and `slotWeights.ts`, and both of those import `buffs.ts` — keeping
it where it was would have opened exactly the import cycle `slotWeights.ts`'s docblock refuses to open
for `warCouncil`. The module is deliberately the sibling of `slotMachine.ts`'s `drawReelPool`: derive
a named seed from `runSeed`, weight the pool, draw distinct templates without replacement, throw
`RangeError` on a short draw, mint at a fixed tier with consecutive ids. `startRun` derives
`startingPileSeedFor(runSeed) = mixSeed(runSeed)` — a **one-part** fold, distinct in shape from
`dealSeedFor`'s and `slotSeedFor`'s three-part folds — and the `rng` parameter is **required, never
defaulted**, so no call site can silently drop determinism.

**No tuning value moved, and the weighting is why that was possible.** `openingPileWeightOf` is the
**sum of the existing `templateWeightFor(machineId, template)` across both `SLOT_MACHINE_IDS`** — a
derivation over two shipped tables that contributes no number of its own, and is machine-neutral by
construction because the opening pile is not a slot machine. `STARTING_BUFF_COUNT` is still 4 and
`RUN_STARTING_CHEATS` still 1.

**`BuffKind.Unassigned` was kept, and the distinction is the point.** Nothing in production mints it
any more — the **cause** of the placeholder trap is gone — but the member, `UNASSIGNED_BUFF_CONDITION`
and `UNASSIGNED_BUFF_REWARD` all survive as the codebase's retained **unpriced-kind sentinel**, read
by name in five guard suites. `isPricedBuff` and `activatableBuffs` are **byte-identical**: the
**guard** is preserved intact.

**The simulator says the supply problem is solved and the win rate still is not.**
`npm run sim -- --runs 200 --seed 1` moved mean buff activations per hand from **1.50 to 2.86** with
the win rate unchanged at **0.0%** and AP spent barely moving (4.35 → 4.41), which says the AP pool
rather than the card supply is now the binding constraint. DLR-135 was the last known confound behind
the 0-win result, so it now points at the numbers rather than the supply. **Nothing was retuned.**

Start at [hunt/the-opening-pile.md](hunt/the-opening-pile.md) for the draw, the weighting and the
sentinel decision, [hunt/buff-pile.md](hunt/buff-pile.md) for the superseded scaffold it replaced, or
[run-winnability-simulation.md](run-winnability-simulation.md) for the before/after figures.
`.docs/game_rules/the-hunt.md` **is** touched: what a player holds when a run begins is a rule.

## DLR-143, Apply Damage reworked: leader-only, Timebomb stacks, 1-trick settle, ⅓ retention (2026-08-25)

**DLR-143 corrected three Apply Damage timing/economy rules in the same pass, because all three share
the two files that gate and pay the action.** The press's own availability gate changed shape rather
than merely its value: `ApplyDamageRefusal.TimebombPending` (design decision D6, 2026-08-19) is
**deleted**, not relaxed — a pending Timebomb no longer blocks the press at all, reversing a rule that
was three days old. In its place, `TrickInProgress` makes the press **leader-only**: refused whenever
`state.round.currentTrick.length > 0`, including the Quarry's own lead, independent of Timebomb state
entirely. The two systems may now stack, and settle together in the same trick's resolution fold — no
new fold logic was needed, because `commitHandlers.ts`'s existing four-step order (trick damage →
Timebomb clear → Timebomb book → payout tick) already produced the right answer the moment a state
reaching it became possible.

**Both tunables moved in the same ticket.** `APPLY_DAMAGE_DELAY_TRICKS` went `1 → 0`, so a queued
payout now settles at the resolution of the very next trick after the press rather than the one after
that — DLR-109's "current trick plus the next trick" reading is retired outright.
`APPLY_DAMAGE_HIT_RETENTION` went `0.6 → 1/3` (still floored), so a trick that costs the player red
health while a payout is queued now keeps a third of the frozen figure rather than 60%. Neither the
reduction mechanism nor the fold order changed — only the fraction and the two gating/timing rules
around it.

**A review round caught a real second-order gap an identifier grep could not see.** Two tests in
`roundReducer.applyDamage.test.ts` exercised the reversed D6 rule through the real two-tap press flow
without ever naming the string `timebombPending` — an audit that greps for the removed identifier
alone would have missed both. Both were rewritten to their mirrors, and a new stacked-fold test proves
a Timebomb queued before the press and the payout the press queues both settle in the same trick
resolution — the one scenario the old refusal made unreachable. A separate finding, caught only by the
combined reviewer dispatch, was `src/app/warCouncil/__tests__/actionBarLabels.test.ts` — a file
outside every task's stated file list that hardcoded the pre-change "60%" wording via
`PAYOUT_QUEUE_RISK_HINT` and broke the moment the retention constant changed; fixed in the same
review-fix pass.

Start at [war-council/voluntary-cash-out.md](war-council/voluntary-cash-out.md) for the leader-only
gate and the reason vocabulary swap, or
[hunt/delayed-apply-damage-payout.md](hunt/delayed-apply-damage-payout.md) for the two tunables, the
retuned three-fate table, and why the fold order needed no code change to handle the newly-reachable
stacked case. `.docs/game_rules/the-hunt.md` **is** touched: when Apply Damage may be pressed, whether
it stacks with Timebomb, how long a payout takes to settle, and what fraction survives a hit are all
rules a player acts on.

## DLR-145, Version 6: buff cards you spend, no action points, a thirteen-card pool (2026-08-25)

**The change that makes the rest of it cohere is that a buff card is now something you spend.** Before
this, the eleven condition families were _rented_: a Taker cost action points, fired for the trick,
and stayed in the pile — and because `AP_REFRESH_CADENCE` had moved to `PerTrick`, the pool refilled
at every trick boundary, so the stake was refunded before the next bet. Firing everything every trick
was strictly correct and nothing was ever a decision. `consumables.ts` now carries a third toggle,
`CONDITION_CARD_SINGLE_USE`, over Taker, Feeder and Sidestep — a **sibling** of DLR-142's
`ACTIVATED_CARD_SINGLE_USE`, not an extension of it, because a condition card has a **trigger** where
the five DLR-111 items have a timing window and an effect. `isConsumableItem` is the single reader of
all three toggles, so reverting one card is one `false`.

**Action points were deleted as a resource, and DLR-104's toggle did exactly the job it was built
for.** `AP_ENABLED = false` was one constant: `apCostFor` is still the only reader, so no consumer
needed a bypass written anywhere. Everything AP-gated is free, and both `InsufficientAp` refusals
became **unreachable rather than deleted** — they stay in their unions so their message `Record`s stay
total, the same discipline DLR-132 used for `PurchaseRefusal.SlotsFull`. What the flag could _not_ do
was stop three surfaces rendering zeroes, so the action bar's two figures, the loadout panel's header
and the shop purse's AP cell were removed at source; `buffLine` and `buffRowAccessibleName` lost their
`apCost` parameter entirely rather than being handed a zero, because a control reading "0 AP" still
claims a resource exists. `ShopItem.ApCapacity` came off `SHOP_ITEMS` on DLR-116's precedent, keeping
its price, category and refusal. **None of the machinery was deleted** — `actionPoints.ts`,
`STARTING_AP`, `apCapacityFor`, `apPool`, `capacity`, `RoundUiSeed.apCapacity` and the `apRefund`
reward ladder are all still declared and still tested, which is what keeps this a toggle.

**The mintable pool went from 73 templates to 13, by narrowing types rather than zeroing weights.**
`ConditionBuffTemplate.kind` and `.axis` are now typed by two new exports, `MintableConditionKind`
(Taker, Feeder, Sidestep) and `MintableRewardAxis` (Magnitude, Multiplier), so a cut family or a cut
axis is **unconstructible**, not merely unweighted — and `SLOT_FAMILY_WEIGHTS` and `SLOT_AXIS_WEIGHTS`
genuinely shrink with them rather than carrying dead rows. The composition was 6 Taker + 3 Feeder +
2 Sidestep + Cheat + Timebomb — **16 since DLR-150 put Feeder's Momentum row back**, making it 6
Taker + 6 Feeder + 2 Sidestep + Cheat + Timebomb. **The eight cut families and the two cut axes stay fully declared** —
their `BuffKind` members, `CONDITION_MODIFIER` prices, `buffFires` cases, `BUFF_CADENCE` rows and
`REWARD_BASE` ladders are all untouched — so restoring one is a row in `TEMPLATE_FAMILIES`, and
`templateById` simply answers `undefined` for the rest. That has one real consequence: **a Vault
grant bought against a cut template is now dead**, skipped by `mintGrants` and refused by
`oddsBoostRefusalFor` / `startingTierRefusalFor`. Nothing corrupts, no save is rejected, and
`src/persistence/` did not change — but a developer carrying a populated Vault silently loses those
cards.

**Twenty opening cards, drawn with replacement, and ten coins a fight.** `STARTING_BUFF_COUNT` is
`20` and `COINS_PER_ENCOUNTER_WIN` is `10`, both transcribed. Twenty cards cannot be drawn distinctly
from thirteen templates, so `slotWeights.ts` gained `weightedDrawWithReplacement` as the
without-replacement version's sibling; duplicates are now the point rather than a defect.
`RUN_STARTING_CHEATS` stayed at 1, so a fresh run actually **holds twenty-one cards**. The two
per-hand damage caps (`MAX_MULTIPLIER_BONUS_PER_HAND`, `MAX_FLAT_DAMAGE_BONUS_PER_HAND`) became
`Number.POSITIVE_INFINITY`, because clipping a rented card's contribution was harmless and clipping a
consumed one destroys a card the player cannot get back.

**The load-bearing invention was not in the ticket.** `BuffActivationState.spentThisTrick` exists
because `buffHandInputFor` builds the trick's active set by filtering the _pile_, and
`activateFromPile` has removed a consumed card from it by then — so the instant Taker became
consumable, activating one paid nothing at all, with no throw, no refusal and no log. Three readers
share the fix and must stay in step: `buffHandInputFor` and `firedOncePerHandIds`
(`src/app/warCouncil/buffRoundState.ts`) and the simulator's active-set snapshot
(`src/sim/playHand.ts`). Two files were carved out under the 400-line budget in the same pass:
`src/sim/playHandWindows.ts` (the four between-tricks helpers, split from `playHand.ts`) and
`src/app/run/shopRefusals.ts` (`shopRefusalsFor`, replacing an eight-row literal `App.tsx` had been
maintaining by hand at 410 lines).

**One acceptance criterion was measured and does not hold.** AC10 claimed a fresh run can beat Aoife
on trick 1 or 2 of hand one with a bronze card fired. Across 200 seeded runs at each of seeds 1 and 7,
under a policy activating every legal buff at every window, that is **0.0% at both seeds** — the
earliest observed win is trick 3. The claim's second half does hold: the fight is winnable with
nothing activated 51.0% / 52.5% of the time. Recorded in `.docs/game_rules/the-hunt.md`'s Known
tensions rather than acted on. **No browser pass was run**, and three things are on the developer's
eyes-on list: a loadout panel rendering ~21 rows where it was laid out against 5, a shop purse that is
now a single cell, and whether the two slot machines still feel different now both axis tables are
flat.

Start at [hunt/action-points.md](hunt/action-points.md) for the removal,
[hunt/consumable-items.md](hunt/consumable-items.md) for the consumption toggle,
[hunt/buff-activation-and-ap-costs.md](hunt/buff-activation-and-ap-costs.md) for `spentThisTrick`, and
[hunt/the-opening-pile.md](hunt/the-opening-pile.md) for the twenty-card draw and the measurement.

**DLR-146 refilled the player's hand mid-hand, and its second-order consequence is larger than the
feature.** The player is topped back up to `PLAYER_HAND_FLOOR` (4) cards as each trick resolves, so a
hand's widths run 6, 5, 4, 4, 4, 4 instead of 6, 5, 4, 3, 2, 1 and the last tricks are still choices.
The Quarry never refills, the hand still ends when its sixth trick resolves, and `closeHand` sweeps
whatever the player is still holding. But because a hand now costs 16 cards rather than 13, **the
draw pile can run short inside a hand for the first time in the game's history** — which made
`applyDiscard`'s `RangeError` reachable inside a reducer and let `applyWoodcutterDraw` put an
`undefined` in a hand. One new primitive, `drawCards`, is now the only way a card leaves the draw pile
mid-hand: it folds the spent pile back in under a seeded shuffle when the pile cannot cover a draw,
and five sites route through it. `RoundState` gained one required field, `drawSeed`, which is what
keeps a mid-hand reshuffle reproducible from the run seed.

The floor is **provisional and revertible in one line**: `PLAYER_HAND_FLOOR = 0` restores pre-ticket
behaviour exactly, with no other edit anywhere and the whole suite still green. Two things the ticket
surfaced and deliberately did not resolve: **the quick-kill payout now inflates** (a trick-5 kill in a
fight's first hand pays 8 coins where it paid 2, because "cards to spare" has stopped measuring
speed), and **the mid-hand reshuffle is silent** — nothing on the felt says the deck was rebuilt, and
seen cards can come back inside a hand. **Every simulated baseline recorded before 2026-08-26 is now
stale**, including the tricks-taken and damage-per-hand figures the shop arithmetic is priced against;
re-measuring was out of scope. Start at
[war-council/the-hand-refill.md](war-council/the-hand-refill.md).

## Latest — DLR-152, the two-branch buff projection (2026-08-27)

**A pure-engine contract with no visible surface at all.** One new module,
`src/warCouncil/buffProjection.ts`, answers — for one card the player is considering — which of the
buffs riding this trick would fire and what they would pay, **both if the player takes the trick and
if they do not**. Nothing consumes it yet: the engine half was built deliberately ahead of the
activation UI that will read it.

The whole correctness argument is that it **delegates rather than calculates**. It builds a
`BuffTrickContext` from plain values, hands it to `firedBuffs`, hands the result to
`resolveFiredBuffs`, and returns what comes back — so cadence, the four per-hand caps, the Overlap
Bonus and DLR-150's Feeder carry are inherited, never restated, and the spec pins that as an
assertion against `resolveTrickBuffs` rather than against a hand-computed number. The DLR-147 mockup
re-derived the buff predicates in the view layer and reported +6 damage for a load whose ceiling was
+4; this module exists so a preview cannot disagree with the commit. It contains **no `switch` over
`BuffConditionKind`**, and a grep audit checks that it never gains one.

Two consequences shaped the return type. **A lead makes each branch return two outcomes, not one** —
since DLR-150, `resolveFiredBuffs` takes `trickIsLoss`, and on the "did not take it" branch the
outcome is a Dodge under a skull and a Clean Loss without one, which sends a fired Feeder's reward to
the carry in one case and pays it this hand in the other. Reporting one figure would be right about
the amount and wrong about when it can be spent. And **buffs whose branch cannot be decided are
reported rather than guessed**: they land in a separate `indeterminate` set, derived by diffing the
fired sets across both still-possible skull readings, so the module holds no knowledge of _which_
family reads the skull and a future one needs no edit here. Today that set holds only Sidestep, and
only on a lead — as a test assertion, not as a constant in the code.

A `buffReach` helper counts how many of the caller's **legal** cards could fire a given buff,
deliberately counting a card whose buff only _might_ fire: a reach of 0 for a Sidestep on a lead
would read as "this buff is dead" at exactly the moment the player is deciding whether to activate
it. Legality stays the caller's — the module takes plain values, never a `RoundState`.

Two limits were recorded as deliberate rather than left to drift. `playerHit` and `bankAfterTrick`
are caller-supplied and held constant across both branches, which is inert only because Hoarder and
Unbloodied are cut and unconstructible — the type's docblock names that as the line a ticket
restoring either family must revisit. And no `gain` delta is exposed, so the module keeps exactly one
arithmetic surface.

`buffTrickFacts.ts` gained an exported `targetSuitOf(suit)` so the `Suit → BuffTargetSuit` crossing
stays stated exactly once; `TARGET_SUIT` itself remains module-private and total.

Start at [war-council/buff-projection.md](war-council/buff-projection.md) for the module, or
[war-council/buffs-in-the-cash-out.md](war-council/buffs-in-the-cash-out.md) for the resolution path
it delegates to.

## DLR-148, the buff gallery, the felt re-home, and the trick readout (2026-08-26)

**DLR-148 is the largest change to the Hunt screen's shape since DLR-114, and it is entirely a UI
contract: no engine rule, cost, timing or gate moved.** Fifty-one files changed and every one of
them is under `src/app/warCouncil/`.

Three things landed together because they share the felt's grid. **The buff surface became a
gallery of cards**: `BuffLoadoutPanel`'s one-line-per-buff list is deleted, and `BuffGallery` renders
a `BuffGalleryView` built by a new pure module — runs grouped by target suit with `Suitless` and
`Press` as the fourth and fifth, tier-descending order, **exact duplicates collapsed into one counted
stack**, and everything unusable right now fenced into one tarnished group carrying the count and the
shared reason. That is the direct answer to the crowding DLR-145 created when the opening pile went
to twenty-one cards. **The felt became two grid columns**, `game rail | stage`: an always-mounted
`FeltRail` holding decree, trick and spent, and a `FeltStage` holding the gallery or the felt's
narrative states — so "the buff surface never occludes the decree, the spent pile or the Quarry's
played card" is a **structural guarantee rather than a z-index promise**. And **a consequence readout
replaced the intent telegraph**: `trickConsequence` derives, from the Quarry's _already led_ card
alone, what taking the trick does to the player and what not taking it does, in the rank table's own
terms, and returns `null` — so nothing renders at all — when the trick is empty, when the player led,
or when the card has nothing extra to say.

**The telegraph is gone, both halves.** `IntentTelegraph.tsx`, `intentPreview.ts`,
`previewQuarryIntent`, `intentAccessibleName` and `STANCE_PHRASE` are deleted with their three specs.
The game no longer previews the Quarry's intent, and the speculative "if you lead that" reading went
with it. **`quarryIntent`, `TelegraphFidelity` and `TELEGRAPH_FIDELITY` deliberately remain in the
engine with no production consumer** — a recorded decision, not an oversight, because removing engine
surface is a larger cut than a UI ticket's scope.

Two smaller things worth knowing. **A skulled card now renders a full skull face** in place of the
card art, identical for every rank and suit, with the corner index intact — one shared `<symbol>`, so
N skulled cards cost one path. And the 4.5:1 WCAG contrast floor is now **enforced by a test that
parses the real stylesheet**, keeping the CSS the single owner of every colour; white failed on all
three suits (2.99 / 3.37 / 3.51:1) and both existing project accents failed on the readout's light
ground, so the five inks that ship are contrast-derived rather than chosen. Every other colour and
size the ticket added is a transcribed placeholder the developer owns.

Two pre-existing breaches were fixed in-ticket rather than handed back: `WarCouncilRound.tsx` at 415
lines (the felt's branch chain moved verbatim into `roundControlsProps.ts`, taking it to 352) and
`warCouncilHunt.css` at 417 (the six `.wc-telegraph*` rules went with the component). A third,
quieter defect closed with them: **`.wc-felt-rail` had had no CSS rule at all**, because a comment
pointed its rules at `warCouncilCheats.css`, a file deleted two tickets earlier.

**Nothing here is persisted and `SAVE_SCHEMA_VERSION` is deliberately not bumped.** Start at
[war-council-ui/buff-gallery.md](war-council-ui/buff-gallery.md) for the gallery, its view-model and
the contrast floor, and
[war-council-ui/felt-rail-and-the-trick-readout.md](war-council-ui/felt-rail-and-the-trick-readout.md)
for the re-home, the readout and the skull face.

**DLR-150 let a buff's reward leave the hand that earned it, and it is the first figure in this
codebase that survives a hand boundary without being something the player spends.** A Feeder pays for
_not_ taking a trick, and its reward used to land in the accrual that the loss's own cash-out
immediately spent into a near-empty pot — three deliberate losses in a bad hand paid three points
into three tiny cash-outs and accumulated into nothing. The reward is now split by the trick's
**outcome**: a Feeder firing on a **Loss** (a clean loss, or an eaten skull) diverts into a carry
pool that pays nothing this hand, rides `RunState.feederCarry` across the hand boundary, seeds the
next hand's accrual as an ordinary spendable bonus, and is wiped at the fight boundary whether the
fight was won or lost. A Feeder firing on a **dodge** — a skull trick the player did not take, which
is a Win — pays into the hand exactly as before, Overlap Bonus included.

The architectural point worth carrying forward: **the skull inversion is still stated exactly once**,
in `src/warCouncil/bank.ts`'s `TAKEN` table behind `isTaken`. Everything downstream that needs the
outcome axis **receives it as a parameter** (`trickIsLoss`) rather than re-deriving it — a
`trickWasLoss(ctx)` predicate inside `src/hunt/` was explicitly rejected as a second statement of the
game's most misread rule, and `src/hunt/` learns nothing new about skulls.

Because the carry lets a multiplier bonus escape the reset that used to destroy it, **the Feeder
family got its Momentum row back and the mintable pool went 13 → 16** — three additive template ids,
no slot weight changed, and every slot-draw probability shifted as a result. Both halves of the carry
are on `BankMeter`: what this hand is banking for the next one, and what this hand opened on. Three
extractions rode along, all forced by the 400-line budget and all collapsing real duplication:
`roundResult.ts` (three construction sites of `WarCouncilRoundResult` became one, adopted by the
simulator too), `screenFor.ts` (`App.tsx`'s screen ternary, with `RunPhase` moving there), and
`roundUiSeed.ts` / `warCouncilBankMeter.css`. **Nothing is persisted and `SAVE_SCHEMA_VERSION` is not
bumped.** **No number was chosen** — the carry rides the existing reward ladders, so a bronze Blade
Feeder carries `+1` and a bronze Momentum Feeder `+2`, and whether that is enough to be felt is the
developer's to answer by playing. Start at
[hunt/the-feeder-carry.md](hunt/the-feeder-carry.md).

**scaffold** = types/folders only, no runtime logic yet. **partial** = some real logic, incomplete.
**implemented** = the module's stated responsibility is functionally covered (may still grow).
