# Implementation docs

One living file per `src/` module folder, describing how the code in that folder actually works —
maintained by the `implementation-doc-writer` skill (`.claude/skills/implementation-doc-writer/SKILL.md`),
invoked automatically by `/fb-apply` once a contract's reviewers approve.

This is the third leg alongside `.docs/design/` (design intent, why a mechanic exists) and
`.docs/game_rules/` (rules as designed/transcribed): **implementation-as-built** — what is actually
on disk right now, not what a plan proposed. A doc here should answer "how does X actually work"
without reading the source, and "what's been implemented" without digging through old tickets.

Docs are organized by module, not by ticket, and accumulate across every ticket that touches that
folder — so a mechanic's explanation lives in one place regardless of which ticket last changed it.

| Module                | Doc                                    | Status      | Built by                                                                       |
| --------------------- | -------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| `src/warCouncil/`     | [war-council.md](war-council.md)       | implemented | SCRUM-19, SCRUM-20, SCRUM-26                                                   |
| `src/vanguard/`       | [vanguard.md](vanguard.md)             | partial     | SCRUM-19, SCRUM-21, SCRUM-22, SCRUM-23, SCRUM-24, SCRUM-27, SCRUM-40, SCRUM-42 |
| `src/battle/`         | [battle.md](battle.md)                 | implemented | SCRUM-19, SCRUM-25, SCRUM-26, SCRUM-27                                         |
| `src/app/`            | [app.md](app.md)                       | implemented | SCRUM-37, SCRUM-28, SCRUM-29, SCRUM-34                                         |
| `src/app/warCouncil/` | [war-council-ui.md](war-council-ui.md) | implemented | SCRUM-28                                                                       |
| `src/app/vanguard/`   | [vanguard-ui.md](vanguard-ui.md)       | implemented | SCRUM-29, SCRUM-41, SCRUM-30                                                   |
| `src/app/battle/`     | [battle-ui.md](battle-ui.md)           | implemented | SCRUM-31, SCRUM-34                                                             |

`src/app/warCouncil/`, `src/app/vanguard/`, and `src/app/battle/` each have their own doc rather
than a section inside `app.md`: all three are module folders in their own right, and War Council's
combined doc had already passed this project's 400-line budget by the time it was split. `app.md`
keeps the mount-prop contract, the trick-count validator, and `AppMode` — both game-specific stubs
are gone now that SCRUM-28 and SCRUM-29 have each replaced theirs with a real mount.

Since SCRUM-34 the app has a playable end-to-end battle loop: `src/App.tsx` mounts `BattleHost`
(`src/app/battle/`, see [battle-ui.md](battle-ui.md)), which sequences War Council rounds, round
transitions, The Clash, and the Breach screen. Note that `src/battle/`'s `BattleState` machine
(see [battle.md](battle.md)) is built and tested but **not** on that path — `battle-ui.md` explains
why.

**scaffold** = types/folders only, no runtime logic yet. **partial** = some real logic, incomplete.
**implemented** = the module's stated responsibility is functionally covered (may still grow).
