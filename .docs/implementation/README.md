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
| `src/warCouncil/`     | [war-council/](war-council/README.md)       | implemented | SCRUM-19, SCRUM-20, SCRUM-26, DLR-47, DLR-49, DLR-50, DLR-51, DLR-52, DLR-63, DLR-66, DLR-67, DLR-68, DLR-69, DLR-70, DLR-80, DLR-81, DLR-83, PT-001, PT-002 |
| `src/app/`            | [app/](app/README.md)                       | implemented | SCRUM-37, SCRUM-28, SCRUM-29, SCRUM-34, DLR-47, DLR-53, DLR-63, DLR-67, DLR-71, DLR-80, DLR-81, DLR-82, DLR-83                                       |
| `src/app/warCouncil/` | [war-council-ui/](war-council-ui/README.md) | implemented | SCRUM-28, DLR-47, DLR-53, DLR-63, DLR-66, DLR-67, DLR-68, DLR-71, DLR-80, DLR-81, DLR-82, DLR-83, DLR-86, PT-002                                     |
| `src/app/run/`        | [run-ui/](run-ui/README.md)                 | implemented | DLR-82                                                                                                                                               |
| `src/hunt/`           | [hunt/](hunt/README.md)                     | partial     | DLR-48, DLR-49, DLR-50, DLR-51, DLR-52, DLR-53, DLR-63, DLR-66, DLR-67, DLR-69, DLR-70, DLR-80, DLR-81, DLR-82, DLR-83, PT-001, PT-002               |

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
a trick count — a ~20-file rename judged not worth a play-test ticket. Money, the shop, and leftover
damage as currency are all explicitly out of scope; there is nothing to spend it on yet.

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

**Two things are deliberately still not wired.** `ENCOUNTER_PLAYER_RESTORE` remains exported and
**unread** — DLR-82 forbade wiring it in, and a grep guards the absence — and there is no currency,
shop, or purchase. The curve's second and third values are a **documented placeholder**: the ticket
predicts the player losing around fight three at these numbers and calls that the arithmetic
working, with the shop and the flask as the answer rather than a bigger health bar.

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
**do not delete them as dead code.** How many Cheats a run starts with is a labelled placeholder and
the developer's.

**scaffold** = types/folders only, no runtime logic yet. **partial** = some real logic, incomplete.
**implemented** = the module's stated responsibility is functionally covered (may still grow).
