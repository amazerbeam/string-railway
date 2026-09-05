# The Hunt — new-player session 1, redesign

**2026-08-14.** The first session played by someone who did not build the game and had not read a rule.

---

## Source

| | |
|---|---|
| **Who** | The developer's wife. First time playing. No prior exposure to the rules, the design docs, or *The Fox in the Forest*. |
| **When** | 2026-08-14. |
| **Build** | `Version_2` working tree — post-PT-002 (trick-count bank, both healths at 10). |
| **Channel** | **Observed play, relayed by the developer.** Second-hand for the wording, first-hand for the behaviour — the developer watched her play and intervened ("I had to tell her to ignore it"). |
| **Screen** | The War Council round: `RoundStatusBand` (top), `wc-dossier` rail (side), `wc-table` (centre), `HandFan` (bottom). |
| **Length** | At least two hands. She won the encounter in one hand; on a second hand she beat the Quarry with one card unplayed. |

**How to weight this.** Per `feedback-to-redesign.md`, a note captured while the screen was in front of the player outranks a recollection. These are behavioural observations made during play, which is the strongest channel this project has had — but they arrive through a second person, so **the wording is paraphrase and the behaviour is evidence**. Where a finding below rests on behaviour ("she stopped using it") it is solid; where it rests on a phrase ("damage counter") the referent is flagged as unconfirmed.

**Why this session is different in kind from play-tests 1–4.** Every previous session was played by the person who designed the rules. This is the first evidence about **what the screen teaches someone who does not already know the game** — and that is the axis it is almost entirely about. Six of the seven UX findings below are the same failure wearing different hats.

**What I did not do.** I have not run the app or opened a browser. Every claim about the code cites a file and line and was read from source; no layout claim is made without saying it is unverified. The defect at D1 is read from source, not reproduced.

---

## The structural finding, stated once

`src/` contains **no tutorial, no help screen, no rules text, and no first-run anything** — verified by search across the whole tree. The game teaches its rules exclusively through readouts that are live during play, most of them in a side rail, most of them stating a consequence *after* it has happened.

That is a defensible choice for a game whose rules are already known. This session is the evidence that it does not survive contact with someone who does not know them. It matters here because **it is the reason the individual findings interact**: almost every fix below is a candidate for "tell her this during play", they compete for the same rail and the same moment, and the interaction pass is where that gets resolved rather than by adding seven labels.

It is named here rather than filed as a finding because "add onboarding" is a scope decision, not a UX fix — it is raised in **Open for the developer**.

---

## Findings

Frequency is per **hand** (6 tricks). An encounter currently runs under two hands, so per-encounter figures are roughly double.

| # | Observed | Prescribed (set aside) | Heuristic | Zone | Times per hand |
|---|---|---|---|---|---|
| **F1** | Did not know what the skull is or what it does. Did not know that dodging a skull is good. | — | Recognition over recall; clarity | Hand · trick well · shape rail | **6** — every trick decision turns on it |
| **F2** | Did not notice when she lost health. | — | Signs and feedback | Status band ← → hand | **2–3** — every damage event |
| **F3** | Did not know what her health bar was, or that it was hers. | — | Clarity | Status band | Continuous |
| **F4** | Did not know what the "damage counter" does. *(Referent unconfirmed — reads as `BankMeter`'s `Cashes for N`.)* | — | Recognition over recall | Dossier rail | **6** — updates every trick |
| **F5** | Did not know what "streak climb" means. | — | Consistency | Dossier rail | Up to **6** |
| **F6** | "Their intent" confused her. **She acted on it, it led her badly, then she abandoned it** — the developer told her to ignore it. | *"ignore it"* (the developer's, not hers) | Clarity; consistency | Dossier rail | **6–12** — read before every decision, twice when arming |
| **F7** | Did not understand when she had won. Same for lost. | — | Signs and feedback | Centre table (`RoundOverPanel`) | ~1 per encounter, terminal |

### F6 deserves reading twice

It is the only note where she **engaged with a system, was misled by it, and quit it**. Everything else is a thing she never got into. Per Hodent, that is the largest measured gap between the game in her head and the game being built, and per the frequency rule it is also the most-hit readout on the screen. It ranks first on evidence even though F1 is the more fundamental rule.

---

## Defects — not findings, just wrong

These have no option set. They are bugs in copy or ordering, and they are fixes rather than choices.

**D1 — The telegraph says "If you lead that" when she is following.**
`IntentTelegraph.tsx:31` picks its eyebrow on `speculative` alone. `WarCouncilRound.tsx:131` sets `speculative` whenever **any** card is armed — including a card armed to *follow* a lead already on the table. So arming a follow shows "**If you lead that** → They will lead Moons." The sentence describes an action she is not taking. This is a live candidate cause of F6 and it costs one conditional.

**D2 — The deciding trick is never shown.**
`WarCouncilRound.tsx:174` checks `encounterOver` **before** `ui.resolvedTrick`, deliberately (its own comment says so). The cash-out that empties the Quarry's bar therefore replaces the table with `RoundOverPanel` without the winning trick ever being rendered. She won in one hand — meaning the moment she won, the cards that won it were never on screen. This is a live candidate cause of F7. Unlike D1 it is **not** a free fix; it is F7's option B and it collides with a recorded open question.

**D3 — Both panel outcomes share a headline.**
`RoundOverPanel.tsx:40` prints "The Hunt is over" for a win and for a loss alike; the difference lives in a `<p>` below a four-row statistics table. Straight contributor to F7.

---

## Options

### F1 — The skull inverts the trick, and nothing on screen says so

The rule is `the-hunt.md` §7: on a clean trick you want to win, on a skull trick you want to lose. Today the only places it appears are `TRICK_OUTCOME_MESSAGE` (`labels.ts:92`), which fires **after** the trick, in the side rail; and the skull glyphs in `QuarryShape`, which state a count and no consequence.

**A. State this trick's goal on this trick** — axis: *timing / placement (spatial)*
- **What changes.** While a trick is live and any card in it is skulled, the trick well itself states which way this one pays. `trickIsSkulled` already exists (`skulls.ts`); the predicate is free.
- **Cost.** `TrickWell.tsx` plus one derived boolean in `WarCouncilRound`. One component, no shell change.
- **Risk.** It reads out the answer during the decision, which is the read the design wants her to make — and it may make the shape rail dead weight. It also adds a second live signal during the decision, competing with `deriveHint`'s hint line at the bottom.
- **What would settle it.** Next session, before she plays: *"do you want to win this trick?"* If she can answer without the line, the line is a crutch; if she cannot, it is load-bearing.

**B. Teach it once, before play, and never again** — axis: *timing (before the moment) / non-diegetic*
- **What changes.** A one-screen primer before the first hand: the four outcomes, the skull's inversion, and what the bank does. Nothing changes during play.
- **Cost.** A new screen and an app-shell route. Nothing exists to hang it on — no meta-screen layer at all.
- **Risk.** Read once and forgotten is the standard failure of pre-play text, and it cannot be re-read at the moment of confusion. It is also much the largest scope change in this doc.
- **What would settle it.** A second new player, primed, asked the same question at trick 3.

**The "cut it" option is unavailable and that is worth stating.** `feedback-to-redesign.md` puts removal on the table by default. The skull *is* the game — §7's inversion is what DLR-80 built the whole scoring layer around — so cutting it is not a UX option. Renaming it, however, is live: see **Open for the developer**.

---

### F2 — Damage lands and says nothing where she is looking

Her attention is on `HandFan` at the bottom. Damage moves `wc-hp` at the top edge by one tenth. `BankMeter`'s outcome line (the only sentence that names the four outcomes) is in the side rail. Nothing happens at the centre or the bottom.

**A. Put the consequence on the trick that caused it** — axis: *placement*
- **What changes.** The resolved trick states what it did, in one sentence, in the centre where the cards she just played are sitting — both directions of damage in the same statement. `roundReducer` already holds `lastResolution`; `TRICK_OUTCOME_MESSAGE` already exists and merely renders in the wrong place (`BankMeter.tsx:58`).
- **Cost.** Move the render from `BankMeter` to `TrickWell`. Two components, no new state.
- **Risk.** The resolved trick is already a hold-and-tap beat; adding a thing to read there raises the cost of the most-repeated interaction in the game. And `BankMeter` is left as three bare numbers with no sentence.
- **What would settle it.** Next session: when she takes damage, does she look up?

**B. Make the bar's loss a countable object rather than a width** — axis: *channel (continuous → discrete form)*
- **What changes.** `wc-hp` renders 10 discrete pips instead of a percentage track, so losing 1 is a thing disappearing rather than a 10% width change. The pip that went stays visible as an empty socket.
- **Cost.** `DuelHealthBars.tsx` and `warCouncilHealthBars.css`. `duelHealthBars.ts` already carries `current`/`max`, so no new derivation. The existing `--w` custom-property split (documented as load-bearing at `DuelHealthBars.tsx:42-51`) must be preserved or replaced deliberately.
- **Risk.** Ten pips per side is a lot of small marks in a band the hard floor says to keep quiet, and it does not scale if health totals move — both are `[provisional]` in `the-hunt.md` §8 and have moved three times.
- **What would settle it.** This also answers a **recorded open question**: `the-hunt.md`'s "whether the player's health bar reads well at 10 in 1-point steps". Check it in a browser at the named viewports, then ask her.

---

### F3 — She did not know which bar was hers

The label already exists. `HEALTH_BAR_LABEL[DuelSide.Player]` is literally `'Your health'` (`labels.ts:66`) and it renders as visible text at `DuelHealthBars.tsx:59`. **A text label was present and did not work**, which rules out a whole family of fixes.

The diagnosis is placement, and it is a **hard-floor violation**: `SKILL.md` requires that *your own resources sit adjacent to your own side*. Her hand is at the bottom; her health is at the top, mirrored against the opponent's. The Tekken mirror was a deliberate choice (§6, DLR-71) and it is what puts her own resource at the far edge from her own attention.

**A. Move her bar to her side** — axis: *placement*
- **What changes.** The player's bar leaves `RoundStatusBand` and sits adjacent to `HandFan`. The Quarry's stays in the top band with the opponent plate. The `You · Trick · Them` trio stays where it is.
- **Cost.** `WarCouncilRound.tsx`'s shell, `RoundStatusBand.tsx`, `DuelHealthBars.tsx`, and the grid in `warCouncil.css`. **This touches the shell**, which is the expensive class of change, and it undoes a decided design call.
- **Risk.** It discards the Tekken mirror, which was chosen on purpose and is the reason `DuelHealthBars` owns the mirror geometry at all (`DuelHealthBars.tsx:7-11`). It also adds height to the bottom zone, which is where the hand needs its space.
- **What would settle it.** Browser at the named viewports: does the hand still fit with a bar above it? Then next session: does she notice the loss without being asked?

**B. Bind each bar to an identity already on screen** — axis: *channel (text → recognition)*
- **What changes.** Keep the mirror. The Quarry's bar carries the Quarry's own portrait and name, already rendered in `QuarryDossier`; the player's carries something visibly not-that. Ownership is read by recognition rather than by reading a word.
- **Cost.** `RoundStatusBand.tsx` and `DuelHealthBars.tsx`. No shell change — cheap and reversible.
- **Risk.** **It is the same fix as the one that already failed, at a different volume.** A label did not read; a picture may not either, and this option's whole case is that recognition beats reading. It also duplicates the Quarry's identity in two zones.
- **What would settle it.** Point at the screen cold and ask which bar is hers. Binary answer, no interpretation.

---

### F4 — The cash-out figure never meets the thing it moves

`BankMeter` renders `Cashes for {cash}` (`BankMeter.tsx:55`) in the side rail. The bar it will empty is in the top band. Nothing on screen connects them, and the number's units are never named — it is health, dealt to the Quarry, on the next damage event.

**A. Draw the figure against the bar it empties** — axis: *placement (spatial)*
- **What changes.** The pending cash-out reads against the Quarry's health bar — the number sits on the thing it will take from.
- **Cost.** `RoundStatusBand.tsx` / `DuelHealthBars.tsx`, plus threading `bank * multiplier`. Moderate; no shell change.
- **Risk.** It puts a climbing number in the band the hard floor says to keep quiet, and it may read as damage *already dealt* rather than pending — which is precisely the non-monotonic reading DLR-80 removed when it retired `pendingHuntDamage` (`WarCouncilRound.tsx:90-93`). Reintroducing a pending figure on a bar needs care.
- **What would settle it.** Ask her, mid-hand, what the number will do. It has one right answer.

**B. Say it as a consequence at the moment it fires** — axis: *timing*
- **What changes.** Drop the standing figure; state the cash-out when it lands, as a sentence, folded into F2-A's on-resolve statement.
- **Cost.** Small — it is a deletion plus a string.
- **Risk.** **This changes what the rules say is visible.** `the-hunt.md` §9's visibility table states that the tricks, the multiplier *and* what the streak would cash for are open on screen throughout. Removing the running figure is a rules change, not a UI change. → **routed to `game-designer`**, not decided here.
- **What would settle it.** Whether a player can still plan a streak without it — a design question, not a layout one.

---

### F5 — The readout and the messages use different words for the same thing

`TRICK_OUTCOME_MESSAGE` says *"The streak climbs"* (`labels.ts:93-96`). `BankMeter` labels the same quantity `TRICKS_LABEL` × `MULTIPLIER_LABEL` (`labels.ts:100-101`). The sentence names a thing the readout does not label, so there is nothing on screen for "streak" to point at. `the-hunt.md` §7 uses **all three** words for two quantities.

**A. One word, everywhere** — axis: *scope (fix the pattern)*
- **What changes.** Pick one term for the climbing quantity and use it in the readout's labels, all four outcome messages, and the `aria-label`s. Every one of those strings already lives in `labels.ts`.
- **Cost.** **One file.** The cheapest change in this document, and `labels.ts` is already the single owner of this wording.
- **Risk.** Essentially none structurally. The risk is that **the word itself is a copy decision and is not mine** — see Open for the developer.
- **What would settle it.** Nothing to measure. It is a consistency defect; it is either fixed or it is not.

**B. Show one figure instead of two** — axis: *subtraction*
- **What changes.** `the-hunt.md` records that since PT-002 the bank and the multiplier are **always the same number** — `3 × 3` states one fact twice. Show the streak length and what it cashes for, and drop the product notation.
- **Cost.** `BankMeter.tsx` only.
- **Risk.** The two terms are kept separate **on purpose**: §7 says a "+1 ×" item that pushes one term without the other is intended, and it needs a term to push. Collapsing them removes a designed affordance for an unbuilt feature. → **routed to `game-designer`**.
- **What would settle it.** Whether that item is still intended. A design question.

---

### F6 — She read the telegraph, it led her badly, she abandoned it

Three candidate causes, and they are not exclusive:

1. **D1** — it says "If you lead that" while she is following. A sentence describing an action she is not taking.
2. **The verbs are internal vocabulary.** `STANCE_PHRASE` (`labels.ts:57-61`) gives "lead" / "press with" / "duck with". "Press" and "duck" are not ordinary English for this; nothing defines them.
3. **It names the suit but not what makes the trick invert.** "They will press with Bells" tells her they intend to take the trick. Whether she *wants* them to take it depends on whether a skull is in it — which lives in a **different readout**, in the same rail, in a different vocabulary. She must join two panels to act on either. Acting on the telegraph alone is exactly how you play badly, which is what happened.

**A. Join the two readouts** — axis: *placement (bring the second fact to the first)*
- **What changes.** The telegraph carries the skull state of the suit it is already naming, restated from data already on screen: *"They will press with Bells — 2 of their 4 Bells are skulled."* No new information is revealed; `SuitShape` is already rendered three feet away and carries no rank.
- **Cost.** `IntentTelegraph.tsx` plus passing `shape` through. One component.
- **Risk.** It makes the telegraph the only panel worth reading and `QuarryShape` dead weight. Worse, "they will press with Bells, 2 skulled" invites the reading *"this card is skulled"*, which is more than the design shows — §3 is explicit that the shape readout is by suit and **never** by rank or by card.
- **What would settle it.** Ask her what the telegraph is telling her, in her own words, mid-hand.

**B. State the outcome for her, not the intent for them** — axis: *channel (change what is said)*
- **What changes.** Restate the stance in terms of the consequence: *"they will take this trick"* / *"they will let you have it"* instead of press/duck.
- **Cost.** `STANCE_PHRASE` in `labels.ts`. Trivial, one constant.
- **Risk.** It is a step toward telling her the answer rather than giving her a read, and it flattens the distinction between leading and following stances that §9's telegraph fidelity setting exists to tune (`TELEGRAPH_FIDELITY`, `[provisional]`).
- **What would settle it.** Whether she uses the telegraph again at all next session. That is the direct measure — she quit it once.

---

### F7 — She could not tell she had won

Three contributors, all identified above: **D2** (the deciding trick is never rendered), **D3** (identical headline for both outcomes), and the outcome text sitting below a four-row statistics table.

**A. Lead with the outcome** — axis: *channel*
- **What changes.** The panel's headline states won or lost. The tally follows it instead of preceding it. `ENCOUNTER_OUTCOME` already holds distinct copy per side (`labels.ts:85-88`) — it is simply rendered in the wrong slot.
- **Cost.** `RoundOverPanel.tsx`. One component, no state.
- **Risk.** Almost none. The headline **wording** is a copy call and is not mine.
- **What would settle it.** Show the panel cold and ask: did you win?

**B. Give the ending a beat before the panel** — axis: *timing*
- **What changes.** Fixes **D2**: the deciding trick and the bar emptying are shown, then the panel arrives on a press — the same hold-and-tap grammar every other trick already uses.
- **Cost.** `roundReducer.ts` and the branch order at `WarCouncilRound.tsx:174-236`. **Touches state**, and the current ordering is deliberate and commented; changing it needs the comment rewritten and the existing tests re-read.
- **Risk.** Adds a press to the end of every encounter. And it lands directly on a **recorded open question** — `the-hunt.md`'s "an encounter can end on trick 3, cutting a hand off in the middle… whether it reads as a decisive finish or as an interruption". This fix presumes the answer is "interruption".
- **What would settle it.** That open question, which is the developer's, informed by `game-designer`.

---

## Interaction pass

| Pair | Relation | Shared resource | Resolution |
|---|---|---|---|
| **F2-A × F4-B** | **Redundant** | The on-resolve moment | Both want to state a damage number when the trick resolves. Two sentences is noise. **Merge into one statement covering both directions** — "You took 1. They took 9." One signal, one moment. |
| **F2-A × F3-A** | **Redundant, ordered** | Her attention on the loss | If her bar sits beside her hand, a centre-screen delta is largely surplus. **Ship F3-A first, then re-measure whether F2-A is still needed.** Dependency direction: F3-A → F2-A. |
| **F2-B × F3-A** | **Compounding** | — | Discrete pips adjacent to her hand beat either alone. Ship both; no ordering constraint. |
| **F3-A × F4-A** | **Dependent** | Top-band screen area | F4-A adds a figure to a band that F3-A empties by half. **F3-A must ship first** or the band gains a number while still carrying two bars. |
| **F4-A × F5-B** | **Compounding** | — | One figure anchors to a bar far more cleanly than `3 × 3`. Moot unless `game-designer` releases F5-B. |
| **F1-A × F6-A** | **Clashing** | Her attention during the decision | **The one unresolved clash — see below.** |
| **F1-A × F2-A** | **Neutral** | — | Different moments: during-decision vs on-resolve. |
| **F1-B × all** | **Compounding** | — | A primer reduces the load on every in-play signal. It is also the least verifiable and the largest scope. Not resolved here — it is a scope decision. |
| **F5-A × everything with copy** | **Dependent** | The vocabulary | F5-A settles the word that F1-A, F2-A, F4-A and F6-B all then use. **Ship it first** or four fixes each pick their own term and the consistency defect returns wider than it started. |
| **F6-B × F6-A** | **Redundant** | The telegraph's one line | Both rewrite the same sentence. Ship one. |
| **F7-A × F7-B** | **Compounding** | — | Different problems (headline vs missing beat). B is gated on a design question; A is not. |

### The unresolved clash: F1-A × F6-A

Both tell her, during the decision, which way this trick pays. Two signals for one fact is new noise, so one ships.

Walking `feedback-to-redesign.md`'s resolution order:

1. **Hard floor** — neither violates it. Does not decide.
2. **Frequency** — F6-A fires on all **6** decisions; F1-A on the ~**2** skull tricks per hand. Frequency says F6-A.
3. **Reversibility** — both are one component. Does not decide.

But frequency argues against the behavioural evidence. **She abandoned the rail.** F6-A puts the fix back into the panel she stopped reading, betting that fixing it restores her trust; F1-A puts it on the object she is actually looking at, conceding the rail. Both are defensible and the evidence supports each.

**Per the method, a tie at step 4 is the developer's call.** It is stated in Open for the developer rather than decided here.

---

## The proposed set

Ordered. Earlier entries unblock later ones.

| # | Ships | Closes | Why here |
|---|---|---|---|
| 1 | **D1** — the telegraph's eyebrow respects lead vs follow | F6 | One conditional. A live candidate cause of the worst finding. |
| 2 | **F5-A** — one word for the climbing quantity, across `labels.ts` | F5 | One file, and it settles the vocabulary four later fixes will use. |
| 3 | **D3 + F7-A** — the panel leads with won/lost, tally below | F7 | One component. Distinct copy already exists, in the wrong slot. |
| 4 | **F2-A ⊕ F4-B** *(merged)* — one on-resolve statement, both damage directions, on the resolved trick | F2, part of F4 | Moves an existing string from the rail to the centre. **`game-designer` must confirm** the standing figure survives (F4-B's risk). |
| 5 | **F3-A** — the player's bar moves adjacent to the hand; the Quarry's stays top | F3 | Closes a hard-floor violation. **Touches the shell** — the only shell change proposed, and it undoes a decided call (§6/DLR-71). Needs developer sign-off before it is planned. |
| 6 | **F2-B** — discrete pips | F2, reinforces F3 | Compounds with 5, and answers a recorded open question about the bar at 10. |
| 7 | **F4-A** — the cash-out figure draws against the Quarry's bar | F4 | Gated on 5 freeing band space. Watch the pending-damage reading. |
| 8 | **F6-B** — stance stated as outcome, not as internal verb | F6 | One constant. Independent of the F1/F6 clash. |
| 9 | **F1-A *or* F6-A** | F1 | **Blocked on the developer.** Do not plan both. |

**Not in the set, held:** **D2/F7-B** — the deciding trick's missing beat. It is a real defect and it is very likely why she could not tell she had won, but the fix presumes an answer to a recorded open design question ("does ending mid-hand read as decisive or as an interruption"). It is held pending `game-designer`, not dropped.

### Dropped

| Dropped | Why |
|---|---|
| **F3-B** — bind each bar to an identity | It is the fix that already failed, at a different volume. `'Your health'` is on screen today and did not read. Per the two-option rule, a stronger label is the same option in a louder degree. |
| **F1-B** — a pre-play primer | Not rejected on merit — it compounds with everything. Dropped from *this set* because adding a meta-screen layer where none exists is a scope decision, not a UX fix. Raised in Open for the developer. |
| **F4-B** — drop the standing cash figure *(as a deletion)* | Its sentence half is kept and merged into entry 4. The deletion half changes §9's visibility table, which is a rules change → `game-designer`. |
| **F5-B** — collapse `n × n` to one figure | Removes the second term §7 deliberately preserves for an unbuilt "+1 ×" item → `game-designer`. |
| **F6-A** — skull state in the telegraph | Dropped **only if** the developer resolves the clash toward F1-A. Live otherwise. |
| **Cutting the skull** | Named and rejected: §7's inversion is the scoring layer DLR-80 was built around. Not available as an option. |

---

## Routed to `game-designer`

These are not UX findings. In each, the action was clear and she wanted a different action to exist, or wanted the game to be shaped differently — which is the boundary `SKILL.md` draws. Handing them over rather than patching them with UI.

| Her note | Why it is a design question | Already recorded? |
|---|---|---|
| **"She won in 1 hand — that's too fast, or should be hard to do."** | A first-time player beat the encounter in one hand. `the-hunt.md` §8 already states this outright: *"A 10-health Quarry is a walkover, and that was accepted when it was set"* — a good hand pays 36 against a bar of 10, so about a quarter of hands end the encounter alone. **This is the first outside confirmation of a known tension.** | **Yes** — §8 and Known tensions. Now has evidence. |
| **"As soon as she learned what the poison card was she wanted to be able to use it."** | Rank 8 is named Poison and does nothing (§5). The name promised a mechanic and she went looking for it. This is a **naming** failure producing a design expectation, and the fix is either the name or the ability. | **Yes** — §6 Q3, "Rank 8 is still called Poison and now means nothing at all… it will read as a bug in the play-test." **It read as a bug in the play-test.** |
| **"7 should do something."** | Same shape: Treasure (7) is named and inert. Two of seven named ranks do nothing, and a new player noticed both within one session. Bears on §5's open question about whether abilities survive a six-card hand. | Partly — §5 `[open]`, §6 Q2. |
| **"She wanted a reward for having cards left over — she beat the enemy with 1 card left."** | A request for a new scoring channel: reward for finishing fast. Every card is played in a six-card hand, so "cards left over" means *tricks not needed* — she is asking for an efficiency bonus. Interacts directly with the walkover above: rewarding speed makes a fast win faster. | **No.** New. |

**One observation worth handing over with them.** Three of these four are the same instinct: *she looked for more things to do with her cards.* Named cards that do nothing, a hand that ends before it is spent, an encounter over in one hand. That may be a stronger signal about the six-card hand than any of the three taken alone — but reading it is `game-designer`'s job, not this document's.

---

## Open for the developer

Nothing below is pre-filled. Each is stated with what each answer costs.

1. **The F1 × F6-A clash — teach the inversion on the trick, or restore the telegraph?**
   *On the trick* (F1-A) concedes that she abandoned the rail and puts the fact where she is looking; it fires on ~2 tricks a hand and risks reading out the answer. *In the telegraph* (F6-A) bets that D1 and F6-B restore her trust; it fires on all 6 decisions and risks implying a card-level skull reading the design does not permit. Frequency says the telegraph; her behaviour says the trick. **Do not ship both.**

2. **Does the player's health bar leave the Tekken mirror?** F3-A closes a hard-floor violation and is the only shell change proposed — and it undoes §6/DLR-71's deliberate mirrored-pair design. Keeping the mirror means F3-B, which is the fix that already failed. There may be no cheap answer here.

3. **One word for the climbing quantity.** "Streak", "Tricks", "Multiplier" and "Bank" are all in use across `labels.ts` and `the-hunt.md` for two quantities. Pick the word; F5-A is mechanical once it is picked.

4. **Does rank 8 keep the name "Poison"?** Already yours and already open (§6 Q3). This session is the evidence it costs something.

5. **The bar treatment at 10.** Pip count, socket styling, whether the bar survives a health total that has moved three times. All tuning.

6. **Headline copy for won and lost.** `ENCOUNTER_OUTCOME`'s strings are marked *"Placeholder copy: the wording is the developer's"* in `labels.ts:84` and they are about to become the largest text on the terminal screen.

7. **Does a first-run primer exist at all?** F1-B compounds with every other fix and is the only thing that addresses the structural finding directly. It is also a new screen in an app that has no meta-screen layer. Scope call.

8. **Whether the deciding trick gets its beat (D2/F7-B).** Answering "yes" also answers the recorded open question about mid-hand cutoffs.

---

## Verification

**Browser, at named viewports.** No layout claim in this document has been checked — I did not run the app. `jsdom` has no layout engine, so no Vitest test can settle any of this. Before any shell change (F3-A) is accepted, check **1920×1080, 1440×900 and 1280×720**, plus one short viewport (**1280×720 at 80% zoom**) to confirm the hand still fits with a bar above it. This is QA's, driven through `chrome-devtools` — it is a question with a right answer. Whether the result *feels* right is the developer's.

**Component tests to write.**
- The telegraph's eyebrow reads as a follow when a follow is armed (**D1** — pins the defect).
- `RoundOverPanel`'s heading differs between a win and a loss (**D3/F7-A**).
- The outcome statement renders on the resolved trick, queried by role and accessible name (**entry 4**).
- Each health bar's accessible name still distinguishes the two after any move (**F3-A** — `getByRole('meter', …)` is how the existing specs tell them apart, per `labels.ts:64`).

**Already covered, do not re-litigate.** `HandFan` has a roving tabindex with arrow-key movement (`HandFan.tsx:28, 83, 107`), so the hard floor's collection-navigation rule is met and no finding here touches it.

**The one question for the next session.** Before she plays a trick that has a skull in it, ask: ***"do you want to win this trick?"***

That single question tests F1 directly, tests F6 indirectly (the telegraph is how she would know), and its answer is binary. If she can answer it and could not last time, the set worked.
