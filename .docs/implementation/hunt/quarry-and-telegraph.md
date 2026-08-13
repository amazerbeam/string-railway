_Part of [Hunt](README.md)._

Both mechanics here are §4 concerns — who the Quarry is, and how much of what it is about to do the
player is allowed to see.

### Quarry character display data — a name, and nothing more (DLR-51, gutted by DLR-81)

`quarryCharacters.ts` exports `QUARRY_CHARACTERS`, a `Partial<Record<QuarryCharacter,
QuarryCharacterInfo>>` holding **the player-facing name** for each Quarry character. It is
deliberately `Partial`: only the Monarch has an entry, which is all a one-encounter build needs.
`quarryCharacterInfo(character)` is the accessor and returns `undefined` for a character with no
entry, so a caller shows no panel rather than crashing or fabricating one.

**`QuarryCharacterInfo` has no rule field, and that absence is enforced by a test.** It carried a
one-sentence `description` of the character's round-long rule-break until DLR-81 deleted the power
itself; the field went with it, because a sentence here would be a rule on screen that no code
applies — the exact failure the original design of this module was written to prevent, which it then
suffered anyway once the enforcement was removed from under it. `__tests__/quarryCharacters.test.ts`
asserts the object's keys are exactly `['character', 'name']`, so the field cannot quietly return
without a deliberate edit to that assertion.

A future final-boss ticket that gives a character a real power adds its copy **and** its enforcement
in the same change. Nothing about that power's shape is designed yet — see
[../war-council/legal-moves-and-abilities.md](../war-council/legal-moves-and-abilities.md).

This module holds no rule logic. The `warCouncil → hunt` import edge remains (`skulls.ts`/`bank.ts`
read tunables from here); `QuarryCharacter` is no longer part of it, since DLR-81 removed the type
from `src/warCouncil/types.ts` along with the `quarryCharacter` state field. Only `src/App.tsx` and
the UI read the character now.

### Telegraph fidelity — how much of the Quarry's intent the player sees (DLR-52)

`TELEGRAPH_FIDELITY` in `config.ts` decides how much the Quarry's next-move telegraph reveals. It is
a `TelegraphFidelity`, an `as const` union with exactly two levels:

| Value                                                 | Reveals                                                                          |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| `TelegraphFidelity.Suit` (`'suit'`)                   | the lead suit only — the narrowest useful telegraph                              |
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
