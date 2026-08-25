# Round driver script

**Scope note:** the timing/timeout workarounds and the overall pattern (install a page-global step function, kick it off as a detached loop, poll from separate calls) are structural — they come from how the `javascript_tool` RPC and React's effect timing behave, not from this game. The DOM landmarks in the table below (button text, class names, selectors) are owned by the current UI source — re-verify them with a quick `document.querySelectorAll('button')` dump if a run behaves unexpectedly, since wording and classes drift with UI work this reference doesn't track.

## Why this shape

A driving loop needs to run many click-wait-read cycles unattended. Two behaviors of this environment shape how: `javascript_tool` waits for the whole script to finish before returning, and a script `await`ing several hundred-ms delays in a loop reliably blows past that call's ~45s timeout even though the delays alone don't add up to 45s — the page keeps running server-side but the RPC response is lost. And a state read taken in the same statement as the click that caused it sees the pre-click value, because the dev-only `useEffect` mirroring state onto `window.__DEBUG_STATE__` flushes after a `setTimeout`/microtask gap, not synchronously with the click.

The fix for both: install the step function once, kick off its loop as a **detached async IIFE** (the outer `javascript_exec` call returns immediately, the loop keeps running in the page), and poll `window.__trace`/`window.__DEBUG_STATE__` from separate short calls.

## Install the driver

One `javascript_tool` call, early in the session, after the debug dump is confirmed present:

```js
window.__autoStep = async function() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = () => window.__DEBUG_STATE__;
  const state = s();
  if (state.app.screen !== 'warCouncil') return { screen: state.app.screen, phase: state.app.phase };
  const r = state.round;
  if (!r) { await sleep(200); return { note: 'no round yet' }; }

  // Ability prompt (e.g. Fox/Woodcutter choice) — first non-disabled option, when judgement
  // isn't the point of the run being driven. For a real decision, read `r.ui.prompt` and choose
  // deliberately instead of calling this generic step.
  const promptGroup = document.querySelector('[aria-label="Choose what the card does"]');
  if (promptGroup) {
    const btn = promptGroup.querySelector('button:not([disabled])');
    if (btn) { btn.click(); await sleep(300); return { action: 'chose-ability', label: btn.getAttribute('aria-label') || btn.textContent }; }
  }

  if (r.ui.cpuFault) return { fault: r.ui.cpuFault }; // a real engine bug — stop and report, don't retry

  // A hand cycles through FOUR different literal texts for "nothing more to decide, move on" —
  // the Quarry's telegraphed lead, a resolved trick, a finished hand, and the encounter ending —
  // and none of them share a stable class or aria-label. Matching on text is the reliable option.
  const advanceBtn = [...document.querySelectorAll('button')]
    .find(b => /let them lead|carry on|tap the table|deal the next hunt|finish/i.test(b.textContent));
  if (advanceBtn) { advanceBtn.click(); await sleep(400); return { action: 'advance-click', label: advanceBtn.textContent.trim() }; }

  if (r.interactive) {
    const hand = document.querySelector('[aria-label="Your hand"]');
    const allCards = [...hand.querySelectorAll('button, [role="button"]')];
    // A card is a two-tap gesture: first tap arms it, second tap on the SAME card commits it.
    // Match the already-armed card by its label prefix rather than re-picking "the first legal
    // card" — the legal/illegal set can shift between the two taps (e.g. leading has no
    // follow-suit constraint), so a naive re-pick can arm a DIFFERENT card instead of committing.
    if (r.ui.armed) {
      const prefix = `${r.ui.armed.rank} of ${r.ui.armed.suit[0].toUpperCase()}${r.ui.armed.suit.slice(1)}`;
      const target = allCards.find(c => (c.getAttribute('aria-label') || '').startsWith(prefix));
      if (target) { target.click(); await sleep(300); return { action: 'commit-card', label: target.getAttribute('aria-label') }; }
    }
    // Illegal cards carry BOTH `disabled` and the `wc-is-illegal` class — check both, since a
    // control can read as clickable in the accessibility tree while still being a no-op.
    const legalCards = allCards.filter(c => !c.disabled && !c.className.includes('wc-is-illegal'));
    if (legalCards.length === 0) { await sleep(300); return { note: 'no legal cards visible' }; }
    const target = legalCards[0]; // first-legal, not a real strategy — see note below
    target.click();
    await sleep(300);
    return { action: 'tap-card', label: target.getAttribute('aria-label') };
  }

  await sleep(400);
  return { note: 'waiting', interactive: r.interactive }; // Quarry's async move is still resolving
}
```

## Run it as a detached loop

```js
window.__trace = [];
window.__loopDone = false;
(async () => {
  for (let i = 0; i < 200; i++) {
    const step = await window.__autoStep();
    window.__trace.push(step);
    if (window.__DEBUG_STATE__.app.screen !== 'warCouncil') break; // left the round entirely
    // Genuinely-stuck guard — several REAL "waiting" steps in a row (the Quarry's move resolving)
    // is normal; only bail if the streak is long enough that it can't be that.
    if (window.__trace.length >= 25 && window.__trace.slice(-20).every(t => t.note === 'waiting')) break;
  }
  window.__loopDone = true;
})();
'kicked-off'
```

That call returns `'kicked-off'` immediately. Poll from a separate call after a `computer` `wait` of a few seconds:

```js
JSON.stringify({ done: window.__loopDone, len: window.__trace.length, last: window.__trace.slice(-4), screen: window.__DEBUG_STATE__.app.screen })
```

`done: true` with the screen unchanged from the last poll means the loop's stuck-guard fired for real — read `window.__trace.slice(-10)` and the full round state to see what condition the driver doesn't handle yet, fix `__autoStep`, and re-run the install step.

## First-legal-card is not a strategy

The snippet above always plays the first legal card — enough to prove screens transition, state stays consistent, and no console error appears, but it is not trying to win. It lost its first live run. If the task actually needs a completed or won run, read `r.ui.round.hands`/`legalMoves` in the state dump and choose deliberately per step rather than trusting this default.
