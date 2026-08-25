# Playing with actual judgement, not first-legal-card

`round-driver.md`'s default `__autoStep` always plays `legalCards[0]` — the first legal card in DOM
order. That is enough to prove the screens and state hold together, but it is not trying to win, and
it produces nothing worth reporting about the game itself. When the developer wants a playthrough
that reflects real decisions — "learn to play", "see how far a good player gets", a balance read —
replace the card-selection step with the lookahead below rather than narrating choices one click at a
time. It is still driven as a detached loop (`round-driver.md`'s timing rules are unchanged); only
*which* card gets picked changes.

## Why a 1-ply exact lookahead is legitimate here, not a hack

`window.__DEBUG_STATE__.round.ui.round` mirrors the true `RoundState` — including `hands.cpu` and
`skulledCards`, both hidden from a real player. Using them isn't peeking at a bug; it's the same
dev-only mirror this whole skill already reads, just used for a decision instead of a click target.
What makes that information genuinely decisive, not merely a look at the answer key, is that the
Quarry has **no randomness in its card choice at all** — confirmed by reading the source rather than
guessing:

- **`src/warCouncil/cpuPlayer.ts` → `chooseCpuCard`.** Leading: always the lowest legal card
  (`lowestCard`, sorted by rank then suit index `[bells, keys, moons]`). Following, in strict
  priority: (1) the lowest legal card that is *both* skulled and would lose — the Quarry actively
  tries to dump a skull into a trick it loses, forcing the player to win it and eat the skull; (2)
  else the lowest legal card that would win; (3) else the lowest legal card, full stop.
- **`src/warCouncil/legalMoves.ts`** — the same follow-suit/Monarch-narrowing rule for both sides.
- **`src/warCouncil/resolveTrick.ts` → `resolveTrickWinner`** — trump/Witch/rank comparison, called
  with `(lead, follow)` order load-bearing.
- **`src/warCouncil/skulls.ts` → `isSkulled`** — membership test against `skulledCards`.

Because all four are pure and deterministic, and the debug mirror hands you every input they need,
you can compute — before committing a card — *exactly* what the Quarry will play in response, for
every card you could lead. That turns "which card should I lead" into an evaluable search over a
handful of options rather than a guess, and it plays close to the trick-level ceiling without needing
a multi-ply game tree.

## The engine

Paste this once, early in the session, right after the debug dump is confirmed present (it has no
dependency on `round-driver.md`'s driver — install either first):

```js
const SUIT_ORDER = ['bells','keys','moons'];
function sameCard(a,b){ return a.suit===b.suit && a.rank===b.rank; }
function isSkulled(skulled, card){ return skulled.some(s=>sameCard(s,card)); }
function suitOrder(s){ return SUIT_ORDER.indexOf(s); }
function cmp(a,b){ return (a.rank-b.rank) || (suitOrder(a.suit)-suitOrder(b.suit)); }
function lowest(cards){ return [...cards].sort(cmp)[0]; }
function highest(cards){ return [...cards].sort(cmp)[cards.length-1]; }
function cardsOfSuit(hand, suit){ return hand.filter(c=>c.suit===suit); }
function monarchFollowSet(hand, suit){
  const suitCards = cardsOfSuit(hand, suit);
  if (suitCards.length===0) return [];
  const swan = suitCards.find(c=>c.rank===1);
  const hi = highest(suitCards);
  const opts = [swan, hi].filter(Boolean);
  return opts.filter((c,i)=>opts.findIndex(o=>sameCard(o,c))===i);
}
function legalMoves(hand, trick){ // trick: [] or [ledCard]
  if (trick.length===0) return hand;
  const led = trick[0];
  if (led.rank===11){ const m = monarchFollowSet(hand, led.suit); return m.length? m : hand; }
  const fs = cardsOfSuit(hand, led.suit);
  return fs.length? fs : hand;
}
function resolveWinner(leadCard, leadSide, followCard, followSide, trumpSuit){
  const witchCount = [leadCard,followCard].filter(c=>c.rank===9).length;
  const isTrump = (c)=> c.suit===trumpSuit || (c.rank===9 && witchCount===1);
  const lt = isTrump(leadCard), ft = isTrump(followCard);
  if (lt||ft){
    if (lt&&ft) return leadCard.rank>followCard.rank? leadSide: followSide;
    return lt? leadSide: followSide;
  }
  if (followCard.suit===leadCard.suit) return leadCard.rank>followCard.rank? leadSide: followSide;
  return leadSide;
}
function predictCpuFollow(cpuHand, leadCard, skulled, trumpSuit){
  const legal = legalMoves(cpuHand, [leadCard]);
  const wouldWin = (c)=> resolveWinner(leadCard,'player',c,'cpu',trumpSuit)==='cpu';
  const skulledLosers = legal.filter(c=>!wouldWin(c) && isSkulled(skulled,c));
  if (skulledLosers.length>0) return lowest(skulledLosers);
  const winners = legal.filter(wouldWin);
  return lowest(winners.length? winners : legal);
}
function bestLead(myHand, cpuHand, skulled, trumpSuit){
  const options = myHand.map(X=>{
    const predicted = predictCpuFollow(cpuHand, X, skulled, trumpSuit);
    const winner = resolveWinner(X,'player',predicted,'cpu',trumpSuit);
    const trickSkulled = isSkulled(skulled, predicted);
    let outcome;
    if (winner==='player' && !trickSkulled) outcome='cleanWin';
    else if (winner==='player' && trickSkulled) outcome='ateSkull';
    else if (winner==='cpu' && !trickSkulled) outcome='cleanLoss';
    else outcome='dodge';
    return { card:X, predicted, outcome, good: outcome==='cleanWin' || outcome==='dodge' };
  });
  const good = options.filter(o=>o.good);
  const pool = good.length? good : options;
  pool.sort((a,b)=>cmp(a.card,b.card)); // conserve strong cards among equally-good options
  return pool[0];
}
function bestFollow(myHand, ledCard, skulled, trumpSuit){
  const legal = legalMoves(myHand, [ledCard]);
  const skulledTrick = isSkulled(skulled, ledCard); // only the CPU's card can be skulled here
  const wouldWin = (c)=> resolveWinner(ledCard,'cpu',c,'player',trumpSuit)==='player';
  if (skulledTrick){
    const losers = legal.filter(c=>!wouldWin(c));
    return losers.length? lowest(losers) : lowest(legal); // forced win = unavoidable skull-eat
  }
  const winners = legal.filter(wouldWin);
  return winners.length? lowest(winners) : lowest(legal);
}
window.__strategy = { isSkulled, legalMoves, resolveWinner, predictCpuFollow, bestLead, bestFollow, lowest, highest, cardsOfSuit };
'strategy-installed'
```

`bestLead` returns `{ card, predicted, outcome, good }` — `outcome` is one of `cleanWin` / `dodge`
(good — win a clean trick, or lose a skull trick on purpose) / `ateSkull` / `cleanLoss` (bad — the
best available lead still loses, or still wins into a skull). `bestFollow` returns just the card,
since the follow decision is a closed rule once the led card is known (skull trick → lose on purpose
if any legal card can; clean trick → win if any legal card can).

## Wiring it into the driver

Replace `round-driver.md`'s "if `r.interactive`" branch with a version that calls into
`window.__strategy` instead of "first legal card", matching cards back to DOM buttons by their
`aria-label` prefix (`` `${rank} of ${Suit}` ``, e.g. `"9 of Moons"` — `cardAccessibleName` in
`src/app/warCouncil/labels.ts` owns the exact string, appending an ability name in parens like
`"11 of Bells (Monarch)"` and a skull mark once a card is face up; matching by `startsWith` on the
rank/suit prefix is stable against both):

```js
if (r.interactive) {
  const trick = rr.currentTrick; // rr = state.round.ui.round
  let decision;
  if (trick.length === 0) {
    const lead = window.__strategy.bestLead(rr.hands.player, rr.hands.cpu, rr.skulledCards, rr.trumpSuit);
    decision = lead.card;
    // optional: press Apply Damage first if `lead.outcome` is bad and the bank is worth banking —
    // see "Cashing a streak before a bad lead" below.
  } else {
    decision = window.__strategy.bestFollow(rr.hands.player, trick[0].card, rr.skulledCards, rr.trumpSuit);
  }
  const prefix = `${decision.rank} of ${decision.suit[0].toUpperCase()}${decision.suit.slice(1)}`;
  // ...then the same two-tap armed/commit logic round-driver.md already uses, matched on `prefix`.
}
```

### Cashing a streak before a bad lead

Section 7 of `the-hunt.md` ("Applying damage") makes proactive cash-out a real lever: pressing
`Apply Damage` while leader-and-nothing-committed-yet banks the *whole* `bank × multiplier` (queued,
lands next trick) instead of risking the two-thirds rate a forced hit pays. When `bestLead`'s chosen
outcome is `ateSkull` or `cleanLoss` (no legal lead avoids a bad result) and the bank is worth
protecting, press the bar button matched by `aria-label` prefix `"Apply Damage"` twice (poise, then
commit — same two-tap grammar as everything else on the bar) *before* leading. Check `r.applyRefusal`
(top-level on `window.__DEBUG_STATE__.round`, not under `.ui`) is `null`/falsy first — it names why a
press would be refused (already a payout queued, trick already started, etc.) exactly as the label
does.

## Ability prompts (Fox / Woodcutter) — a lighter heuristic

Unlike leads and follows, these aren't worth an exact search — decline the Fox unless your own
strongest non-trump suit clearly outnumbers the current trump suit in your hand (an exchange changes
the trump suit to the exchanged card's own suit, so it's only worth it if that shift favors you); for
the Woodcutter, discard whichever offered card parses to the lowest rank and isn't trump. Read the
prompt's buttons (`[aria-label="Choose what the card does"]` per `game-state-and-labels.md`) and
pattern-match: a `Decline` button present means it's the Fox; otherwise it's the Woodcutter and the
button labels themselves carry the candidate cards to parse.

## Handling every screen a full run passes through, not just `warCouncil`

A playthrough meant to run several fights back-to-back needs three more branches `round-driver.md`'s
skeleton doesn't cover, because it stops at the first `verdict`:

- **`verdict` / `map`** — click the button matching `/^Fight /` to start the next encounter.
- **`shop`** — click a `leave`/`continue`/`move on`/`next`-matching button to skip it (or drive actual
  purchases deliberately, if that's the question being asked).
- **The low-health confirmation** ("Continue anyway") — a plain-text button that appears independently
  of `screen`, not gated by any of the above; check for it first, on every step.

`vault` is the real stopping point for "how far does a good player get" — the run has ended (won or
lost) by the time it's reached.

## A concurrency trap: never call into the page while the detached loop is running

Once the loop from `round-driver.md` is kicked off, every `javascript_exec` call after that should
only **read** `window.__trace` / `window.__DEBUG_STATE__` — never call `window.__autoStep()` directly,
click a button, or otherwise touch the DOM. A manual call racing the loop's own `await`ed click can
land between the loop's poise-tap and commit-tap, or fire on an element the loop's next click also
targets — one live session saw the trace stall for over 20 seconds with no error surfaced anywhere
(not in `window.__trace`, not in the console) until a manual poke happened to unstick it. If a poll
shows no growth in `window.__trace.length` across two consecutive checks, wait longer before doing
anything else — don't intervene by hand.

## Recording what a playthrough like this finds

A single driven run is an anecdote, not a measurement — useful for "does the mechanic work as
designed" and for a qualitative read a developer can act on, but not a substitute for
`play-tester`'s seeded, thousand-run statistics. When a live playthrough surfaces something that
looks like a real, reportable pattern (not just "won" or "lost"), write it to
`.docs/ai-play-tester/` alongside `play-tester`'s findings — see that folder's `README.md` for the
shape a finding takes, and be explicit that the finding's source is a single live browser session
(name the fights and the outcome) rather than a simulator batch, so nobody mistakes an n=1
observation for a measured statistic.
