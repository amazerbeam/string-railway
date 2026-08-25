# Live playthrough log

A running log of playthroughs driven through the real browser UI by the `ai-play-tester` skill, using
actual card-selection judgement (`references/strategy-engine.md`'s lookahead against the Quarry's
deterministic AI) rather than the skill's mechanical first-legal-card default. Each entry is one
session: what was played, what happened, and anything that looks like a pattern rather than noise.

**Read this against `buffs-weak-at-run-start.md`'s methodology note, not against its rigor.** That
file's numbers come from thousands of seeded simulator runs; this file's come from single live runs —
useful for "does this mechanic actually behave the way the rules say", not for "how often does this
happen." A pattern that shows up here is a hypothesis for `play-tester` to confirm at scale, not a
measured fact on its own.

---

## Session 1 — 2026-08-25

**Build:** `Version-5` branch, commit `620afd9`. **Opponent path:** Aoife → Cillian → Niamh (path's
first three fights). **Method:** `strategy-engine.md`'s 1-ply exact lookahead — for every leadable
card, the Quarry's deterministic response was computed exactly (`chooseCpuCard`'s own rule) and the
lead that produced the best of {clean win, dodge} over {ate skull, clean loss} was chosen; following a
led card used the closed rule (lose on purpose if a skull trick and any legal card loses, else win if
any legal card can).

### What happened

| Fight   | Result   | Player HP entering | Player HP leaving | Quarry HP     |
| ------- | -------- | ------------------ | ----------------- | ------------- |
| Aoife   | **Won**  | 10                 | 5                 | 0             |
| Cillian | **Won**  | 5                  | 3                 | 0             |
| Niamh   | **Lost** | 3                  | 0                 | 18 (undented) |

Tracked trick outcomes across the session: 7 clean wins, 6 dodges, 3 clean losses, 1 forced skull-eat
(no legal card could avoid it that trick). One proactive Apply Damage press banked a streak ahead of a
predicted bad lead, per `the-hunt.md` §7's "Applying damage" rule.

For contrast: the same three fights driven with the skill's first-legal-card default (no judgement at
all) lost the very first fight, Aoife, 10–0 — the run never got past fight 1. This is a single
comparison, not a controlled one (different seeds, different hands dealt), but the direction is the
expected one: judged card selection at the trick level visibly changes fight outcomes, at least by
enough to turn two losses into two wins in this session.

### The pattern worth flagging

**Health does not reset between fights — one shared bar for the whole 25-fight run**
(`the-hunt.md` §10, "A run is twenty-five fights on one health bar"). Watched directly here: entering
Cillian at 5/10 (not 10/10) because Aoife had already cost 5, then entering Niamh at 3/10 because
Cillian cost 2 more. Niamh's own health pool read 18 — nearly double Aoife's 10 — and was never dented
before the player's carried-over 3 HP ran out.

That means **winning two fights well can still lose the run on the third for a structural reason, not
a tactical one**: trick-level play quality determines how much health a fight costs, but the run's
survivability also depends on how that cost compounds against opponents whose own health is scaling up
(`the-hunt.md` §10 marks the opponent-health curve **[provisional]** — this session is one data point
suggesting it climbs quickly relative to the player's fixed 10 starting HP, not a measurement of the
curve itself). Worth a `play-tester` batch specifically tracking cumulative player HP entering each
fight index, to see whether "good early play, dead by fight 3" is common or this session's hands were
simply unlucky.

### Engine notes for next session

- The concurrency trap in `strategy-engine.md` was hit live: a manual state poll issued while the
  detached loop was mid-click stalled `window.__trace` for over 20 seconds with nothing in the console
  or the trace explaining why. Recovered on its own once manual calls stopped. Next session: poll-only
  discipline from the start, not learned mid-run.
- Ability-prompt handling (Fox/Woodcutter) used the lighter heuristic `strategy-engine.md` describes,
  not a lookahead — worth revisiting if a session's outcome seems to hinge on a Fox exchange or a
  Woodcutter discard specifically.
- No buff activation logic was wired in this session (`Apply Buff` was never pressed opportunistically,
  only `Apply Damage`) — a genuine gap, not a deliberate scope cut. A held buff whose condition matches
  a predicted-good lead (e.g. a `taker` for the suit about to be won) is a free addition to
  `bestLead`'s evaluation next time.
