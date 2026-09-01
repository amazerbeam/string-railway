# DLR-156 — Roll-over damage: a per-trick pot the player cashes or pushes

Replaces `bank × multiplier` with a per-trick roll-over pot, and moves the cash-out off the action
bar onto a second full-viewport resolution screen.

## Sources

All in `.claude/contract/DLR-156-roll-over-damage-model/`:

- [`plan.md`](plan.md) — the implementation plan, its assumptions and its risks
- [`spec.md`](spec.md) — the arithmetic, the rules, and the design questions left open
- [`ui-notes.md`](ui-notes.md) — the approved surface behaviour, and §6's "must carry into `src/`" table
- [`mockup.html`](mockup.html) — the approved article, signed off 2026-08-27
- [`tasks.md`](tasks.md) — the 21-task execution checklist

## What changed

Every **banked** trick now computes its own damage as `(baseDamage + buffDamage) × buffMult`, using
only the buffs fired on that trick, and adds it to a running `total` while `roll` climbs by one. The
pot the player is sitting on is `total × roll`. A trick that **hurts** the player wipes both to zero
and pays the Quarry nothing — the old two-thirds consolation is gone. Buff rewards no longer pool
across a hand: a Blade fired on trick 1 pays into trick 1 and does not survive it, which removes the
dominant line where holding every card back and dumping it on the last trick was strictly better.

The hand boundary now does nothing at all. `total` and `roll` carry into the next hand and clear
only when the fight ends, following DLR-150's `feederCarry` pattern field for field.

The Apply Damage button is gone from the action bar, along with its refusals and the delayed-payout
queue behind it. In its place, **every resolved trick hands off to a second full-viewport screen**
that carries the two played cards across, derives the damage one term at a time in a fixed two-row
ledger, and asks the player to **apply** (deal the pot, reset both) or **roll over** (keep both,
play on). A trick that hurt the player reaches the same screen with nothing to decide and a single
**Onward** exit. The played card also now flies from the hand to the table, with a landing reachable
three ways so a backgrounded tab cannot strand it.

`WarCouncilRound.tsx` was split — it is now a 99-line switch over `WarCouncilTable` and
`TrickResolutionScreen`.

## Decisions you need to make

**The Whetstone reading.** `TrickFacts.baseDamageBonus` (DLR-92's Whetstone) had no home in the new
equation. It is folded into the base, **inside the bracket**, so on a long streak it is worth many
times more than it was — the same character change already accepted for Blade. The alternatives were
to add it outside the bracket, or to leave it unread and quietly retire a shop item. This is a rule
reading the brief does not make.

**The apply choice now costs no action points.** `APPLY_DAMAGE_AP_COST` is deleted. There was no
honest way to keep it: the prompt is mandatory, so an AP charge would tax every banked trick rather
than pricing a choice the player elects to make. This is a balance change in a ticket that forbids
balancing, flagged rather than hidden.

**The simulator's default strategy.** The modelled player now **applies whenever a pot stands** —
never pushes. This is the lowest-variance floor, chosen so the simulator measures something real
again rather than a claim about good play. Since the push is the entire point of the mechanic, this
is worth revisiting: a policy that sometimes rolls is what would actually exercise the new decision.

**Four transcribed placeholder values**, all in `src/app/warCouncil/warCouncilResolve.css`, taken
verbatim from the approved mockup and none of them chosen by anyone:

| Token | Value | What it prices |
|---|---|---|
| `--wc-beat` | `520ms` | one term's beat — about three seconds a trick, six times a hand |
| `--wc-resolve-hold` | `700ms` | how long the screen holds after a choice |
| `--wc-flight` | `380ms` | the card's travel, and now also how long the hand stays disabled |
| `--wc-ledger-row` | `2.5rem` | the pinned row height — two rows is exactly two rows |

`ui-notes.md` §7 calls `--wc-beat` the single number most worth setting from a play-through.

## What only playing will tell you

- **Whether a whole screen six times a hand wears out.** This ships the blocking, always-shown
  version. The candidate fixes — skipping a bare trick, a faster non-blocking variant — are
  deliberately not built.
- **How the payout feels.** It lands roughly 2.5–3× today's for identical cards, with nothing
  capping a streak. That is on purpose; the counterweight (a health penalty staked by firing a buff)
  is a later ticket, and this is the play that sizes it.
- **Whether a total hit feels right.** Losing a nine-trick streak now costs everything.
- **The table's residual overhang.** Below 640px of viewport height the trick well overhangs the
  felt's lip by 7–55px. Not fixed here — `ui-notes.md` §5 records that at 600px the layout wants a
  structural change rather than a tuning one. Your call whether it becomes its own ticket.
- **The screen itself.** No browser pass ran on this ticket. Worth watching: the card flying and
  landing; the ledger building one term at a time and never growing past two rows; the pot and its
  parts legible; Apply and Roll over distinguishable without colour; the hand disabling for the
  flight and focus behaving when it does.

## Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0, 0 warnings |
| `npx vitest run --project node` | 1841 passed, 0 failed |
| `npx vitest run --project dom` | 406 passed, 0 failed |
| `npm test` (unfiltered) | 2247 passed, 0 failed |
| `npm run build` | exit 0, `dist/` written |
| `npx prettier --check src\warCouncil src\hunt src\app src\sim` | clean |

Verification greps: the pure-core trees name no React or DOM global; no deleted name survives;
`BASE_DAMAGE` has exactly one reader in the damage path; `warCouncilResolve.css` uses no `100vh` or
`100vw`.

Two defects were found by review and fixed. The hand was not disabled while a card was in flight, so
tapping a second card mid-flight silently dropped the selection and re-armed the first instead of
playing it. And the simulator could never deal the Quarry any damage at all, because its driver never
dispatched the new apply action — a 2243-test suite did not catch either.

## For future contributors

**The vocabulary is now `total`, `roll` and `pot`.** `bank` and `multiplier` mean nothing in this
codebase any more, and `src/warCouncil/bank.ts` is now `streak.ts`.

**`cashOut` on a `TrickResolution` is always 0.** Only the player's explicit Apply pays the Quarry;
a trick's own resolution never does. That field kept its type while its meaning changed, and it has
already produced one real defect — treat any new reader of it with suspicion.
