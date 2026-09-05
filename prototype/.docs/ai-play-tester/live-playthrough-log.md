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

---

## Session 2 — 2026-08-26

**Build:** `Version-5.1` branch, commit `ce20325` plus the **uncommitted DLR-145 working tree**
(Version 6: consumable buff cards, action points removed, the mintable pool cut to 13 templates,
20 opening bronze cards, 10 coins a win). Nobody had browser-tested any of it — the contract's own
tasks file says so.

**Method:** `strategy-engine.md`'s 1-ply exact lookahead for card selection, plus two additions that
Session 1 flagged as gaps and this session wired in: **proactive `Apply Damage`** before any lead the
lookahead predicts losing, and **buff activation** driven by the same prediction — for the trick about
to be played, every held `taker`/`feeder`/`sidestep` whose condition `buffFires` will satisfy is
scored (`multiplier` rewards valued at `bank × value`, `magnitude` at face value) and the best up to
five are spent. The shop was also driven for the first time: heal to full, then spend every remaining
coin on slot pulls.

**Reached: fight 8 of 25.** Won fights 1–7, died on fight 8 (Quarry still on 16 of 34).

### What happened

| Fight | Quarry HP | Result   | Player HP entering | Player HP leaving | Buff pile entering |
| ----- | --------- | -------- | ------------------ | ----------------- | ------------------ |
| 1     | 10        | **Won**  | 10                 | 10                | 21                 |
| 2     | 14        | **Won**  | 10                 | 10                | 41                 |
| 3     | 18        | **Won**  | 10                 | 2                 | 64                 |
| 4     | 22        | **Won**  | 10                 | 7                 | 72                 |
| 5     | 39 (boss) | **Won**  | 10                 | 9                 | 78                 |
| 6     | 26        | **Won**  | 10                 | 10                | 89                 |
| 7     | 30        | **Won**  | 10                 | 6                 | 117                |
| 8     | 34        | **Lost** | 10                 | 0                 | 123                |

Session totals: 13 `Apply Damage` presses, 117 buff cards spent, 74 slot pulls, 5 heals bought.
No console errors at any point; the debug mirror was available for the whole run.

### Three patterns worth flagging

**1. `Apply Damage` is load-bearing to the point of being the whole game.** Two control runs on this
same build, same method, differing only in this lever: with no proactive cash-out and no buffs, the
run **died on fight 1** (10→0 while dealing 7); adding buffs and `Apply Damage` reached fight 4. The
reason is arithmetic in `the-hunt.md` §7 — a caught streak pays two-thirds *rounded down*, so a streak
of 1 pays literally **nothing**, and alternating win/lose banks zero all hand. A player who has not
found the button is not playing a harder game; they are playing one where most tricks they win are
worth nothing.

**2. Session 1's "one shared health bar" pressure has been erased by the shop, not by play.** That
finding — carried health compounding across fights until the run dies for structural reasons — did not
reproduce here at all: **every fight after the first was entered at 10/10.** `HEAL_PRICE` is 1 coin
for `HEAL_HEALTH_RESTORED` = 4 HP, against `COINS_PER_ENCOUNTER_WIN` = 10. Coming out of fight 3 on
2 HP cost **2 coins** to undo completely. Health is not currently a run-level resource; it is a
per-fight resource that a fifth of one fight's winnings fully restores.

**3. Card scarcity — DLR-145's central premise — does not hold.** The ticket's stated intent is that
twenty cards is "about one fight's ammunition" and that you "reach the first shop nearly empty with
coins to restock". Observed instead: fight 1 was won **without spending a single buff card**, arriving
at the shop with 21 of 21. From there the pile only ever grew — 21 → 41 → 64 → 72 → 78 → 89 → 117 →
123 — while 117 cards were spent across the run. A slot pull is 1 coin and yields more than one card
in practice (12 coins bought 8 pulls and took the pile from 21 to 41), so 10 coins a fight outruns any
spend rate the fight itself can sustain. Whatever the limit on how hard a hand can be pushed currently
is, it is not how many cards you own.

### Two things a browser pass was specifically owed, now seen

- **The loadout panel at scale is a real problem.** DLR-145's tasks file predicted 21 rows against a
  layout built for 5; by fight 8 it was rendering **123**. It stays functional and every row keeps its
  accessible name, but each activation re-renders the whole list, and spending five cards on one trick
  became visibly the slowest thing in the run. It also has **no close control** — `Escape` works and
  the bar button toggles it, but there is no visible dismiss affordance in the dialog.
- **The shop poses no choice**, exactly as the contract predicted. Nothing competes with a 1-coin heal
  and a 1-coin pull; `Swan` and `Witch` at 5 coins were never worth buying over 5 more cards, and the
  driver never bought one across the whole run.

### Engine notes for next session

- **Chrome throttles and then freezes a backgrounded tab**, which stalls the detached driver loop hard
  — the run degraded to ~13s per step and once froze the renderer outright. `setTimeout` sleeps inside
  the driver must be replaced with a `MessageChannel` spin (unthrottled), *and* the app's own
  transition timers need the same treatment via a `window.setTimeout` shim for short delays. Poll from
  the agent side with a single long-lived `await new Promise(r => setTimeout(r, 30000))` inside one
  `javascript_exec` — the open CDP evaluation is what keeps the renderer unfrozen. Do **not** hold two
  `MessageChannel` spin loops open at once; that combination froze the renderer and reloaded the page,
  losing every installed global mid-run.
- The loadout dialog is dismissed by dispatching `Escape` **on the dialog element**, not on `document`.
- On the post-win verdict screen, `Next fight` and `Visit the shop` both match a naive "advance"
  regex — matching `Next` first silently skips the shop for the entire run, which is what produced the
  fight-4 control result above.
