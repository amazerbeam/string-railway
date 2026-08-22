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

| Module                | Doc                                         | Status      | Built by                                                                                                                                     |
| --------------------- | ------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/warCouncil/`     | [war-council/](war-council/README.md)       | implemented | SCRUM-19, SCRUM-20, SCRUM-26, DLR-47, DLR-49, DLR-50, DLR-51, DLR-52, DLR-63, DLR-66, DLR-67, DLR-68, DLR-69, DLR-70, DLR-80, DLR-81, DLR-83, DLR-90, DLR-91, DLR-92, DLR-94, DLR-96, DLR-100, PT-001, PT-002 |
| `src/app/`            | [app/](app/README.md)                       | implemented | SCRUM-37, SCRUM-28, SCRUM-29, SCRUM-34, DLR-47, DLR-53, DLR-63, DLR-67, DLR-71, DLR-80, DLR-81, DLR-82, DLR-83, DLR-84, DLR-85, DLR-90, DLR-91, DLR-92, DLR-93, DLR-95, DLR-100 |
| `src/app/warCouncil/` | [war-council-ui/](war-council-ui/README.md) | implemented | SCRUM-28, DLR-47, DLR-53, DLR-63, DLR-66, DLR-67, DLR-68, DLR-71, DLR-80, DLR-81, DLR-82, DLR-83, DLR-84, DLR-86, DLR-90, DLR-91, DLR-92, DLR-94, DLR-95, DLR-97, DLR-100, PT-002 |
| `src/app/run/`        | [run-ui/](run-ui/README.md)                 | implemented | DLR-82, DLR-84, DLR-85, DLR-89, DLR-90, DLR-91, DLR-92, DLR-93, DLR-95, DLR-97 |
| `src/hunt/`           | [hunt/](hunt/README.md)                     | partial     | DLR-48, DLR-49, DLR-50, DLR-51, DLR-52, DLR-53, DLR-63, DLR-66, DLR-67, DLR-69, DLR-70, DLR-80, DLR-81, DLR-82, DLR-83, DLR-84, DLR-85, DLR-89, DLR-90, DLR-91, DLR-92, DLR-93, DLR-94, DLR-95, DLR-96, DLR-100, PT-001, PT-002 |

`src/app/warCouncil/` has its own folder rather than a section inside `app/`: it is a module folder
in its own right, and War Council's combined doc had already passed this project's per-file line
budget by the time it was split (SCRUM-28) — and has since been split again, into per-mechanic
files within each of `war-council/` and `war-council-ui/`, for the same reason. `src/app/run/`
(DLR-82) follows the same convention as a sibling screen module: `run-ui/`.

DLR-47 retired the Vanguard board engine, the battle-loop orchestrator, and their UIs —
`src/App.tsx` now mounts a single War Council round directly
(`src/app/warCouncil/WarCouncilRound.tsx`), dealing a fresh round and restarting on completion. See
[app/README.md](app/README.md) for the mount itself; the deleted modules' history is recoverable
via `git show` per `CLAUDE.md`'s recovery instructions, not documented here.

DLR-53 turned that round screen into the **Hunt screen** — persistent readouts in a dossier column,
the Quarry's intent telegraphed before every commit, and an end panel. It is the ticket that gave
`src/hunt/` its first UI consumers and made a Hunt playable end to end; start at
[war-council-ui/hunt-readouts-and-telegraph.md](war-council-ui/hunt-readouts-and-telegraph.md).

DLR-71 put the **duel** on screen — two health bars as a mirrored opposed pair, health carried Hunt
to Hunt, and an encounter that could finally end. **DLR-86 then replaced both bars with rows of
countable hearts** that break as damage lands, and gave the Quarry's row a preview of what the banked
streak would cash for. See
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
property the three follow-on item tickets were built on, and **all three have now shipped** — Envenom
(DLR-90), Poison Guard (DLR-91) and the Whetstone (DLR-92), every one at that cost, so the prediction held
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
effect in this game that resolves later than the thing that caused it.** A third shop item — **Envenom**,
2 coins, on the one-time-use shelf DLR-89 built — buys a charge you carry across fights. On the felt, a
plate beside the Cheat rail arms it in two taps, and a third tap on a card in your hand **poisons** that
card. Play it, and the trick resolves by the normal rules; **damage then lands on whoever won that
trick** — at the deal of the next hand as DLR-90 shipped it, and **at the resolution of the next trick
since DLR-91**. The rule that makes it worth buying is the one the design doc
singles out: **a poisoned trick the Quarry wins cleanly costs you nothing at all** — no health, and your
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

Start at [hunt/envenom-and-the-delayed-hit.md](hunt/envenom-and-the-delayed-hit.md) for the queue and its
single payment point, [war-council/the-envenom-mark.md](war-council/the-envenom-mark.md) for the marker
and the replaced clean loss, or
[war-council-ui/envenom-charge-and-the-mark.md](war-council-ui/envenom-charge-and-the-mark.md) for the
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

**DLR-91 moved poison to where it can actually bite, resequenced every damage event in the game, and
sold insurance against the result.** Three changes in one contract, and the middle one is the widest.
**First**, poison stopped being a hit paid quietly at the next deal and became a hit paid at the **next
trick's resolution**, folded into that trick's own damage — 4 to the Quarry, **2** to the player, and for
the player it forces the same cash-out any other hit forces, so a streak in progress is spent at a moment
you did not choose. **Second**, all damage is now applied **Quarry-first**: a cash-out that kills the
Quarry spares the player the hit that would have landed alongside it, so a mutual kill is a **player
win** — which overturned a dated design ruling that the player *loses* it, and deleted the constant that
ruling had been implemented as. **Third**, the shop's empty **fight-long** shelf got its first item: a
1-coin **Poison Guard**, bought between fights, live for exactly the next fight, that lets you take
poison's 2 health without losing the streak. Spent the first time it fires, gone when the fight ends
either way.

Two structural points are the ones to carry forward. **The payment crossed a module boundary, and the
direction it crossed matters**: the queue is `EncounterState`'s in `src/hunt/`, the streak is
`RoundState`'s in `src/warCouncil/`, and `hunt` may not learn what a `RoundState` is — so the reducer,
which holds both, hands the pending figures *into* `playCard` through a widened `PlayCardOptions` rather
than anything reaching the other way. And **the new reset is a second trigger on one branch, not a second
rule**: poison owed to the player reaches the same `cashOut = bank × multiplier` statement a lost trick
reaches, which is what makes "poison behaves like any other damage" true in code instead of asserted in a
comment.

**One accepted oddity shipped with it, knowingly.** Because the Guard suppresses the cash-out, a Quarry
that would have died to that cash-out survives — and under Quarry-first sequencing a surviving Quarry
means the player takes the 2 they would otherwise have dodged. **So holding a Guard can cost you
health**, the correct play is sometimes not to hold one, and there is no UI hint. The developer accepted
that as a real decision rather than smoothing it out.

Start at [hunt/poison-guard.md](hunt/poison-guard.md) for the flag and its lifetime,
[hunt/encounter-state-and-end-conditions.md](hunt/encounter-state-and-end-conditions.md) for the
Quarry-first sequencing and the two remaining end conditions,
[war-council/bank-and-cash-out.md](war-council/bank-and-cash-out.md) for the two sources of a hit, or
[war-council-ui/envenom-charge-and-the-mark.md](war-council-ui/envenom-charge-and-the-mark.md) for
`applyResolution`'s pay → clear → re-book ordering.

**Three reviewers independently caught the same gap, and it is the one worth remembering.** `DecreePile`'s
`envenomed` prop was built correctly in one task and **never passed at its mount** in the next — so a
marked card the Fox exchanged into the decree silently lost both its badge and its "poisoned" accessible
name, on a plate that renders continuously through the hand. Every unit test passed, because the prop
itself was always right. The regression test now drives the **reachable** path — mark, lead the Fox,
exchange, assert the decree still announces it — rather than the prop, which is the only version of that
test that would have failed against the defect. A second reviewer found the mirror of it inside the
reducer: `commit()` cleared `cheatSelection` and not `envenomStage`, so poising Envenom and playing an
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
route taken is the one DLR-91 established for the Poison Guard: widen `PlayCardOptions` with a **plain
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
discharged it**: each added its item to a *different* shelf, so no single ticket ever faced a five-card panel.
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
DLR-82 forbade wiring it in *until the flask was designed*, and the flask being designed did not change
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

Until now the bank cashed on exactly two events, both of them things that *happened* to the player: a
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
  *before* dividing, keeping the dividend an exact integer at the only division involved. The next
  fractional rule should follow the same pattern; a single float constant reintroduces the bug.
- **Availability is one predicate read twice.** `applyDamageRefusalFor` is the single statement of
  whether the control is live — the reducer asks it before committing and the plate asks it to disable
  itself and print the reason. It is also **re-asked on the confirming second tap**, which is what stops
  a poise made while the control was live from committing after a poison booking has landed under it.
- **Two files were split to make room, both pure moves.** `src/hunt/config.ts` 413 → **324**, carving
  `skullWeights.ts` (93); and `roundReducer.ts` 390 → **352**, carving `quarryAdvance.ts` (96). Neither
  changed a public name or a barrel surface, and every pre-existing spec passed unedited through both.

Start at [war-council/voluntary-cash-out.md](war-council/voluntary-cash-out.md) for the rule and why it
is not a fifth `TrickOutcome`, [war-council/bank-and-cash-out.md](war-council/bank-and-cash-out.md) for
the two rates and the arithmetic, or
[war-council-ui/apply-damage-plate.md](war-council-ui/apply-damage-plate.md) for the plate, the two-tap
grammar and the extraction that had to come first.

## DLR-96, the integration pass (2026-08-21)

DLR-89 through DLR-95 each built one piece of the run economy — the four-rung shop, Envenom, Poison
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
running app: all four shop categories (Cheat, Envenom, Poison Guard, Whetstone), a flask drink, a
voluntary Apply Damage, and a quick-kill payout — every one with zero console errors. **One touchpoint
was not reached live**: a stage-boss kill and its flask refill, across two independent play sessions —
the boss holds far more health than an ordinary fight, and neither session's hands were strong enough
to clear it. That branch's logic (`runTransitions.ts`'s `flaskAfter`) is unchanged and not itself
suspected of a defect; it remains an open developer judgement call — accept the static trace, or play
to a boss once by hand — rather than a code defect this ticket could fix.

## Latest — DLR-100, the discard (2026-08-22)

**DLR-100 gave the player a between-tricks action, and it is the first control in this codebase
built to be available while the turn gate every other control reads is false.** Before a trick's
first card is laid — including before the Quarry's own lead, so the player can act on "What the
Quarry holds" rather than on a lead already visible — you may now **discard** 1 to 3 cards from hand
and draw the same number blind off the top of the draw pile, with the discarded cards going to the
pile's bottom. Hand size never changes; there is no new discard pile and no reshuffle rule, reusing
the Woodcutter's existing draw-to-bottom convention generalised from one card to n. A fight gives 3
discards, chainable within one gap, carried across the hands within a fight on `RunState`, and the
Quarry gets none.

**The structural point is `discardWindowOpen`.** Cheat, Envenom and Apply Damage all gate on
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
`discardWindowOpen`, the rail control, the hand fan's third mode, and both defects.

## Investigation — run-winnability simulation (2026-08-22)

Not tied to a ticket: 900 simulated full runs, driving `src/hunt/**` and `src/warCouncil/**`
directly with no browser, answered "is the run currently winnable, and if not, why not" fresh
rather than trusting the three-ticket-stale full-run data DLR-92 left on record. Result: 0 wins;
roughly half of all runs die on the very first, exactly-matched fight. See
[run-winnability-simulation.md](run-winnability-simulation.md) for what was played, how, and the
full results.

**scaffold** = types/folders only, no runtime logic yet. **partial** = some real logic, incomplete.
**implemented** = the module's stated responsibility is functionally covered (may still grow).
