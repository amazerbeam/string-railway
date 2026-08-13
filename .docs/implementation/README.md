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

| Module                | Doc                                              | Status      | Built by                                       |
| --------------------- | ------------------------------------------------- | ----------- | ---------------------------------------------- |
| `src/warCouncil/`     | [war-council/](war-council/README.md)             | implemented | SCRUM-19, SCRUM-20, SCRUM-26, DLR-47, DLR-49, DLR-50, DLR-51, DLR-52, DLR-63, DLR-66, DLR-67, DLR-68, DLR-69, DLR-70 |
| `src/app/`            | [app/](app/README.md)                             | implemented | SCRUM-37, SCRUM-28, SCRUM-29, SCRUM-34, DLR-47, DLR-53, DLR-63, DLR-67, DLR-71 |
| `src/app/warCouncil/` | [war-council-ui/](war-council-ui/README.md)       | implemented | SCRUM-28, DLR-47, DLR-53, DLR-63, DLR-66, DLR-67, DLR-68, DLR-71 |
| `src/hunt/`           | [hunt/](hunt/README.md)                           | partial     | DLR-48, DLR-49, DLR-50, DLR-51, DLR-52, DLR-53, DLR-63, DLR-66, DLR-67, DLR-69, DLR-70 |

`src/app/warCouncil/` has its own folder rather than a section inside `app/`: it is a module folder
in its own right, and War Council's combined doc had already passed this project's per-file line
budget by the time it was split (SCRUM-28) — and has since been split again, into per-mechanic
files within each of `war-council/` and `war-council-ui/`, for the same reason.

DLR-47 retired the Vanguard board engine, the battle-loop orchestrator, and their UIs —
`src/App.tsx` now mounts a single War Council round directly
(`src/app/warCouncil/WarCouncilRound.tsx`), dealing a fresh round and restarting on completion. See
[app/README.md](app/README.md) for the mount itself; the deleted modules' history is recoverable
via `git show` per `CLAUDE.md`'s recovery instructions, not documented here.

DLR-53 turned that round screen into the **Hunt screen** — §4's persistent readouts, the Quarry's
intent telegraphed before every commit, and an end panel showing the scoring equation as arithmetic.
It is the ticket that gave `src/hunt/` its first UI consumers and made a Hunt playable end to end;
start at
[war-council-ui/hunt-readouts-and-telegraph.md](war-council-ui/hunt-readouts-and-telegraph.md).

DLR-63 put a decision at the **front** of that Hunt: the player declares **Win or Lose** off the dealt
hand, where Lose inverts every card's value (`12 − rank`). It spans all four modules. Start at
[war-council/declaration-and-lose-path.md](war-council/declaration-and-lose-path.md) for the rules, or
[war-council-ui/declare-gate-and-hand-order.md](war-council-ui/declare-gate-and-hand-order.md) for the
screen.

DLR-66 opened the **DLR-65 duel redesign**, and it is the first ticket that *replaces* rather than
extends. The single transcribed Standing table is gone; in its place are **two mirrored multiplier
tables**, one per declaration, whose band boundaries genuinely differ — and `resolveStanding` now
requires the caller to supply one, so consumers name a *declaration* and never a table. Both health
totals, the ×0.5 rounding rule, the per-declaration card-value accessor, and the
simultaneous-depletion ruling landed in the same module as named data. **Nothing about damage or
health is playable yet.** Start at
[hunt/scoring-tunables.md](hunt/scoring-tunables.md) for the tables, or
[hunt/duel-health-and-damage.md](hunt/duel-health-and-damage.md) for the inert half.

DLR-67 is the redesign's **deletion** ticket, and it is where the old direction actually left the
code. Two whole mechanics went: the **Demand** (its constants, its type, its comparator, and every
screen element showing a target or a cleared/missed verdict) and the **capped Lose-credit mechanic**
(its module, its four guards, its three bookkeeping fields, its reducer action and its on-screen
claim control). What survived is the declaration itself and a single-branch `spoils` that paid each side
for its own captured cards — an interim DLR-69 later replaced with the pile swap, see below; the end
panel now states `Spoils × Standing = Damage` for **both** sides.
`Score` was renamed `Damage` throughout. One caveat worth carrying: the short-viewport layout regressed
during this ticket and is **not** currently in a good state — see
[war-council-ui/README.md](war-council-ui/README.md)'s Deferred section.

DLR-68 gave that damage a **direction** and a **rounding rule**. `huntDamage(finalState)` is now the
single entry point that scores both seats off the one declaration the player made and returns the pair
**keyed by the side each figure depletes** — so the crossing is carried by the data instead of trusted
to whoever reads it next — and it refuses an unfinished or undeclared Hunt by throwing rather than
returning a zero that would be applied as authorised damage. `roundDamage` is applied at exactly one
point, so the ×0.5 bands can no longer produce a fractional total. **Nothing consumes the damage yet**
even so: at the time it landed there was no health at all, and applying the damage was left to DLR-70
(below) and DLR-71.
Mid-planning, the developer also widened the ticket to add the **Standing track** — the whole multiplier
table drawn as a profile in the top bar — which is the only part of DLR-68 a player can see. Start at
[war-council/scoring.md](war-council/scoring.md) for the engine, or
[war-council-ui/hunt-readouts-and-telegraph.md](war-council-ui/hunt-readouts-and-telegraph.md) for the
track.

DLR-69 closed the **last interim in the scoring equation**: the Lose path's two-way pile swap. A side is
now paid for its own capture pile on Win and for the **other side's** on Lose, at `12 − r`, each pile
counted exactly once by the side that did not win it — which is what makes declaring Lose a plan that
can be executed well rather than one that punishes doing it perfectly. The mechanism is a
`CardValueScheme` binding the value function and the paid pile into one declaration-keyed object, so
neither can be read without the other and the half-applied state the interim left reachable is now
unrepresentable. Engine-only, but its numbers surface on screen immediately, and two consequences are
the developer's to settle — the declare gate's Lose copy now states the opposite of the rule, and the
"Spoils" readouts show the Quarry's pile value under the player's heading. Start at
[hunt/scoring-tunables.md](hunt/scoring-tunables.md) for the scheme, or
[war-council/scoring.md](war-council/scoring.md) for the pile resolution.

DLR-70 built the **thing the damage was always for**: health that depletes, and an encounter that
ends. `src/hunt/encounter.ts` is the first state in this codebase that outlives a single `RoundState` —
an immutable `EncounterState` with both bars and an applied-Hunt count, one `applyHunt` transition
that subtracts each side's damage **once**, a single clamp point where health stops at zero and
surplus damage is discarded, and the three end conditions with the both-bars-empty tie read from
configuration rather than paraphrased into an `if`. Two functions on the warCouncil side complete the
join: `pendingHuntDamage`, the same equation evaluated early for a mid-Hunt readout — sharing one
private arithmetic path with `huntDamage`, so there is no second total to drift — and
`duelSideDamage`, the program's only `PlayerSide` → `DuelSide` crossing. There is **deliberately no cap
on Hunts per encounter**; the stall is the evidence a cap is needed. It landed with **nothing in the app
calling any of it** — the duel's rules existed and were enforced while the game as played still had no
ending. **DLR-71 supplied the callers** (below); the encounter sequence is still DLR-73's. Start at
[hunt/encounter-state-and-end-conditions.md](hunt/encounter-state-and-end-conditions.md) for the state
and its transition, or [war-council/scoring.md](war-council/scoring.md) for the shared arithmetic path
and the adapter.

DLR-71 **put the duel on screen, and it is the ticket that made the game winnable and losable by
playing.** Two health bars sit across the top as a mirrored opposed pair — the whole of the mirror is one
`flex-direction: row-reverse` — each carrying its own **pending damage** as a lighter segment carved out
of its own current health, the fighting-game recoverable-damage grammar, so a player distinguishes health
*lost* from health *at risk* inside one bar rather than across two readouts. The end panel gained a
second stage: the two equations, one press, and the bars visibly move as the reducer commits through
`applyHunt`. `App.tsx` now owns a real `EncounterState` and carries it Hunt to Hunt, so health depletes
and an encounter ends.

Its structural achievement is subtractive. `WarCouncilRound`'s two `scoreHunt` calls became **one**
`pendingHuntDamage`, and `HuntLedger`'s own `spoils * band.multiplier` — a second arithmetic path that
bypassed `roundDamage`, correct only because `DAMAGE_ROUNDING` happens to be a no-op on integer products
— was deleted. The bars project post-Hunt health by applying the pending damage to a **copy** of the
encounter, so the figure a player watches climb through thirteen tricks *is* the figure that lands, by
construction rather than by test. It also fixed DLR-67's blocking short-viewport defect, because its own
taller end panel could not ship without it. Start at
[war-council-ui/duel-health-bars.md](war-council-ui/duel-health-bars.md).

**scaffold** = types/folders only, no runtime logic yet. **partial** = some real logic, incomplete.
**implemented** = the module's stated responsibility is functionally covered (may still grow).
