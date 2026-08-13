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
| `src/warCouncil/`     | [war-council/](war-council/README.md)             | implemented | SCRUM-19, SCRUM-20, SCRUM-26, DLR-47, DLR-49, DLR-50, DLR-51, DLR-52, DLR-63, DLR-66, DLR-67, DLR-68, DLR-69, DLR-70, DLR-80 |
| `src/app/`            | [app/](app/README.md)                             | implemented | SCRUM-37, SCRUM-28, SCRUM-29, SCRUM-34, DLR-47, DLR-53, DLR-63, DLR-67, DLR-71, DLR-80 |
| `src/app/warCouncil/` | [war-council-ui/](war-council-ui/README.md)       | implemented | SCRUM-28, DLR-47, DLR-53, DLR-63, DLR-66, DLR-67, DLR-68, DLR-71, DLR-80 |
| `src/hunt/`           | [hunt/](hunt/README.md)                           | partial     | DLR-48, DLR-49, DLR-50, DLR-51, DLR-52, DLR-53, DLR-63, DLR-66, DLR-67, DLR-69, DLR-70, DLR-80 |

`src/app/warCouncil/` has its own folder rather than a section inside `app/`: it is a module folder
in its own right, and War Council's combined doc had already passed this project's per-file line
budget by the time it was split (SCRUM-28) — and has since been split again, into per-mechanic
files within each of `war-council/` and `war-council-ui/`, for the same reason.

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
to Hunt, and an encounter that could finally end. See
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

**scaffold** = types/folders only, no runtime logic yet. **partial** = some real logic, incomplete.
**implemented** = the module's stated responsibility is functionally covered (may still grow).
