# Content plan

**What this document is.** The standing strategy for building an audience before launch: which
channels, what cadence, what story the content is telling right now, and what is being deliberately
skipped. `clip-backlog.md` holds the unshot ideas, `published-log.md` holds what actually went out,
`steam-page.md` holds store copy in progress.

**Written 2026-09-04.** Every number below carries the date it was checked; a number with no date is
unverified.

---

## 1. Where the project actually is

A complete, playable browser prototype exists and has been through several play sessions. The Unity
project has **not been created yet** — the port has an architecture document, a feature inventory and
a rename table, and nothing on disk. `.docs/implementation/unity-port-architecture.md` and
`feature-inventory-for-the-port.md` own that detail.

This is the single most valuable content moment the project will ever have, and it is about to pass.
The prototype is the only "before" that will ever exist, and once the port starts it stops being
the game. **Capture footage of the browser prototype this week, before anything else** — full runs,
the fight screen, the shop, the end-of-run screen, the ugly bits especially. It is unrecoverable
later.

## 2. The story being told

The port is the arc, and it has a real beginning, middle and end:

> I built a whole card game in a browser to find out whether it was fun. It is. Now I'm throwing the
> code away and rebuilding it properly in Unity.

That is the whole premise, and it is enough. It is honest, it is happening now, and every week of
the port supplies another episode of it.

**The setting is not part of the story yet, and must not be.** There are port documents proposing a
setting drawn from Irish myth, with a rename of nearly every noun in the game. As of 2026-09-04 all
three of those documents are **untracked** — written, not committed, not lived with, and not the
developer's settled decision. Content that announces a setting is unrecallable; if it changes, the
first and most attentive part of the audience has been taught something false. So:

- Say nothing about the setting, the fiction, or what the player is supposed to *be*.
- Do not use either vocabulary. The prototype's words are being retired and the port's words are not
  decided, so both are wrong to teach. Describe things mechanically — "the opponent", "a skull",
  "damage", "how many in a row".
- When the developer settles the setting and commits it, that is its own content moment and a good
  one. It is not this week's.

**What can be said is what the game does**, and that is plenty: a trick-taking card game where a
skull inverts a trick so that sometimes you are trying to lose, wrapped in a run of fights where
your score compounds until you cash it out or lose the lot. None of that depends on a setting.

The arc expires when the port lands. Rewrite this document then; do not patch it.

## 3. Channels

**Two, per the standing rule.**

| Channel | Role | Cadence |
|---|---|---|
| **YouTube** — long devlogs plus Shorts | Home base. Where someone decides they like the developer, not just the game. | 3–4 Shorts a week, one 8–20 min devlog every 2–3 weeks |
| **Reddit** — genre subreddits | Discovery into a pre-qualified audience. Costs no extra production; the assets already exist. | One post a week, plus real participation on other people's threads |

Shorts get **cross-posted to TikTok and Reels**. That is not a third channel — it is the same asset
uploaded twice more, at no production cost. Do not make anything bespoke for either.

Why Reddit and not a second video feed: this is a trick-taking roguelike deckbuilder set in Irish
myth. It is a niche with named homes — the roguelike, deckbuilder, indie game and trick-taking
communities are all on Reddit and all reachable. Genre-specific subs convert better than broad
gaming ones, and Screenshot Saturday is a reliable recurring slot. `references/channel-playbooks.md`
in the skill folder holds the conduct rules; read them before the first post, because the
self-promotion rules differ per sub and are enforced.

**Deliberately skipped, and why:**

- **X / Twitter as a daily channel** — the gamedev community is there, but it is other developers,
  and it converts to wishlists poorly. Reposting a Short costs nothing; a posting habit does.
- **Discord, for now** — an empty server reads as abandoned and is hard to recover from. Open one
  when there is something to be in it for: a playable Unity build to hand out.
- **Instagram, Bluesky, Threads** — nothing here that Shorts and Reddit do not already reach.
- **Anything paid.** Not this skill's call to make, and not needed at this stage.

## 4. Cadence, and the one rule that matters

**Frequency beats polish.** Three rough clips out beats one clean clip out. The standing consensus
(checked 2026-09-04) is that 3–4 short posts a week outperform one polished monthly video for
audience growth by a wide margin, and that bugs, failures and messy prototypes engage more than
finished showcases because the audience is watching a person work.

The practical failure mode for this developer is obvious and should be named: the prototype is
documented to an unusual standard, and the temptation will be to make each video as thorough as the
docs. Do not. A 12-minute devlog that took a week to edit is worse than four clips that took an hour.

## 5. The Steam page

**Not yet — but soon, and this is a deadline, not a maybe.**

The page compounds: wishlists accumulate for the entire time it is live, so an 18-month-old page
beats a 3-month-old one. Against that, the page needs honest footage that represents the game, and
the browser prototype's look is about to be replaced wholesale.

**Trigger: put the page up as soon as the Unity build has one screen that looks like the real game.**
Not a finished game — one honest screen. Waiting past that point is lost wishlists.

Benchmarks, all checked 2026-09-04, to be re-checked before they are relied on:

- ~7,000–10,000 wishlists clears Steam's discoverability floor for a typical indie launch.
- ~2,000 wishlists is the floor below which entering Next Fest is not worth it.
- ~10–15% of wishlists convert during launch week.
- The wishlist count needed to reach "Popular Upcoming" has risen to roughly 80,000, from about
  7,000 — treat that surface as unreachable and do not plan around it.
- Devlogs conventionally start 12–18 months before launch.

## 6. What we do not know yet

`published-log.md` is empty. **Everything in this document is running on priors, not on evidence
from this game.** After roughly a month of posting there will be real numbers — which clip formats
land, which subreddits convert — and those override anything written here.

The first thing to look for is not view count. It is which clips drove people to look at *another*
clip, because that is the number that turns into an audience rather than an afternoon.
