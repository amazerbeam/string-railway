# Clip backlog

Unshot ideas. Each carries **the hook** (the first second, which is the whole clip) and **the shot**
(what has to be on screen). Pull from here when the question is "what do I post this week"; move an
item to `published-log.md` when it goes out.

Ordering is rough priority. Anything marked **⏳ expiring** needs the browser prototype on screen and
becomes unshootable once the port replaces it — shoot those first.

---

## Week of 2026-09-04 — scheduled

These four are this week's picks. Detail is in the entries below.

1. **Day zero of the port** — Short — ⏳ expiring
2. **Sometimes winning is how you lose** — Short — ⏳ expiring
3. **Six in a row is thirty-six** — Short — ⏳ expiring
4. **Why I'm rebuilding a game that already works** — Short, on camera
5. **Devlog #1** — long video, record this week, publish next week

**Nothing this week names the setting or any noun that is mid-rename.** The port's fiction and
vocabulary live in three uncommitted documents and are not settled; announcing either is
unrecallable. Everything below is described mechanically for the same reason.

---

## ⏳ Expiring — needs prototype footage

### Day zero of the port
- **Hook:** a full trick playing out in the browser prototype, mid-motion, no context.
- **Shot:** ~8 seconds of real play, hard cut to the Unity "Create new project" dialog, cut to the
  empty scene. Text on screen: *"I finished my card game. Now I'm deleting it."*
- **Why it works:** it is the arc of the whole channel in fifteen seconds, and the cut does the
  explaining. Pin this — it is the video new viewers should land on.

### Sometimes winning is how you lose
- **Hook:** the skull that inverts a trick, turning face up on the opponent's card.
- **Shot:** the opponent leads a skulled 5. Show the hand. Play a 2 *under* it. Health does not
  drop; the score banks. Text: *"I just lost that on purpose. It was the right play."*
- **Why it works:** it is the one rule that makes this game not a normal trick-taker, it is visual,
  and it needs no audio. Name it correctly on screen — that is a **Low Victory**, not a loss.
- **Care:** do not say "winning a trick" anywhere in this clip. The whole point is that taking the
  cards and winning are different things.

### Six in a row is thirty-six
- **Hook:** the running total and the streak counter, already climbing.
- **Shot:** a chain of banked tricks with the two numbers rising, the roll-over decision taken each
  time, then the pot applied. Land on the biggest single number the run produced.
- **Why it works:** a number going absurdly high is the entire short-form format, already solved.
  This is the most repeatable clip type the game has — shoot a new one whenever a run goes silly.

### One health left
- **Hook:** a single health point remaining, opponent leading.
- **Shot:** a near-death reversal from a real run. No narration.
- **Why it works:** stakes are legible with zero rules knowledge.

---

## Not expiring

### Why I'm rebuilding a game that already works
- **Hook:** "My card game works. I'm rebuilding it from scratch."
- **Shot:** talking head, with short cutaways to the prototype running.
- **Why it works:** it is the channel's thesis and it needs no fiction, no naming and no promises.
  A prototype answers one question — is this fun — and throwing it away afterwards is the plan, not
  a failure.

### A game where the deck knows things
- **Hook:** the 3 — the card that swaps a card from your hand with the face-up card ruling the hand,
  changing which suit is trump mid-trick.
- **Shot:** play it. Show trump change and the trick's outcome flip with it.
- **Why it works:** the most obviously clever moment in the ruleset, and true under any vocabulary.

### The panel that tells you what they're holding
- **Hook:** the panel showing, per suit, how many the opponent holds and how many carry a skull.
- **Shot:** read the panel, lead into the suit they cannot answer safely, show it pay off.
- **Why it works:** it proves there is real information to reason about, which is the answer to
  "it's just a card game".

### I wrote the whole ruleset down before porting it
- **Hook:** a very long rules document scrolling past at speed.
- **Shot:** talking head on why a solo dev writes the rules down before a rebuild, and what doing it
  caught.
- **Why it works:** process content for the developer audience. Reads better as a Reddit post than a
  Short.

### Held until decided — do not shoot
- **The rename, and the setting behind it.** Both are proposals in uncommitted documents. When the
  developer settles and commits them, this becomes a strong series — one clip per name, each with
  the story behind it. Until then it is unrecallable content about a decision that has not been
  made.
- **"The screen that makes you weaker."** A play-session note says the shop's combining screen
  produces a worse result than its inputs. The feature inventory does not corroborate it and it may
  since have been fixed. Verify against the code before shooting; being wrong about your own game on
  camera is expensive.

## Long-form queue

### Devlog #1 — "I built my whole game in a browser so I could throw it away"
- **Cold open:** the prototype playing, then the empty Unity project.
- **The stakes:** you cannot tell whether a card game is fun by designing it. It had to be playable
  before it was worth building properly — so it got built twice on purpose.
- **The work:** what the prototype proved (the skull inversion lands, the cash-out-or-push bet is a
  real decision), and one thing it got wrong — picked from the play sessions and verified against the
  code before it is said on camera.
- **The turn:** the rebuild's architecture argument. In the prototype the rules, the screens and the
  tuning data are separated by convention only; the Unity version makes those boundaries something
  the compiler enforces and moves hardcoded values into data.
- **Where it stands:** an empty Unity project and an architecture document. Next: one honest screen.
- **Length:** 10–14 minutes. Record this week, publish next.

### Devlog #2 — the first Unity screen
Hold until there is a felt table on screen in Unity. This is also the Steam page trigger.
