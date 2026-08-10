_Part of [Hunt](README.md)._

Both mechanics here are §4 concerns — who the Quarry is, and how much of what it is about to do the
player is allowed to see.

### Quarry character display data (DLR-51)

`quarryCharacters.ts` exports `QUARRY_CHARACTERS`, a `Partial<Record<QuarryCharacter,
QuarryCharacterInfo>>` holding the player-facing name and one-sentence description for each Quarry
character whose round-long rule-break is actually enforced. It is deliberately `Partial`: only the
Monarch has an entry today, because its rule-break is the only one implemented (see
[../war-council/legal-moves-and-abilities.md](../war-council/legal-moves-and-abilities.md)). Adding
a description here for a character with no matching enforcement in
`src/warCouncil/quarryRuleBreak.ts` would put a rule on screen that no code applies, so a future
ticket must add both together. `quarryCharacterInfo(character)` is the accessor — it returns
`undefined` for an unimplemented character rather than a fabricated description, so a caller shows
no panel rather than crashing or lying. This module holds no rule-break logic itself; enforcement
lives entirely in `src/warCouncil/`, one edge already established before this ticket
(`spoils.ts`/`scoring.ts`'s `warCouncil → hunt` imports) and now joined by a second: `QuarryCharacter`
itself, imported by `src/warCouncil/types.ts` and `quarryRuleBreak.ts`.

### Telegraph fidelity — how much of the Quarry's intent the player sees (DLR-52)

`TELEGRAPH_FIDELITY` in `config.ts` decides how much the Quarry's next-move telegraph reveals. It is
a `TelegraphFidelity`, an `as const` union with exactly two levels:

| Value | Reveals |
|---|---|
| `TelegraphFidelity.Suit` (`'suit'`) | the lead suit only — the narrowest useful telegraph |
| `TelegraphFidelity.SuitAndStance` (`'suitAndStance'`) | the suit plus whether the Quarry is pressing to win or ducking — **the default** |

The constant lives here rather than in `src/warCouncil/cpuPlayer.ts` (where the telegraph is
computed) for the same reason every other §9/§4 tunable does: so the value can be widened or
narrowed without a code change. §4's visibility table keeps the Quarry's hand hidden, so neither
level ever includes the exact card — that restriction is structural in the consumer, not a matter of
which fidelity is selected. See
[../war-council/cpu-heuristic.md](../war-council/cpu-heuristic.md) for how `quarryIntent` reads this
constant and what it returns at each level.

`SuitAndStance` is the conservative default named at DLR-52's planning gate, not a playtested
choice — its own comment in `config.ts` flags it as the single value in this file most likely to move
once T8's playtest happens. Narrowing it to `Suit` removes the `stance` key from the telegraph's
shape entirely, which is a real behavioural change a consumer will see, not a cosmetic one.
