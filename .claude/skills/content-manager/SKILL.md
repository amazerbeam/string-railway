---
name: content-manager
description: Plan, script and review the audience-building content that promotes this game — devlog videos, short-form clips, Steam page copy, and community posts — and keep the running content plan under .docs/marketing/ up to date. Use when deciding what to post this week, planning a devlog series, writing a video script or a hook, turning a build change or a bug into a clip, drafting or reviewing the Steam store page, choosing which platform to invest in, or judging whether a marketing benchmark still holds.
allowed-tools: Read, Grep, Glob, Write, Edit, WebSearch, WebFetch
metadata:
  type: integration
  owner-of: .docs/marketing/
---

# Content Manager

Owns the game's outward-facing content: what gets posted, where, in what order, and why.
It is a planning and drafting skill — it writes plans, scripts and copy into `.docs/marketing/`,
and never touches `src/` or the `/fb-*` contract pipeline.

The developer is a solo dev, comfortable on camera, currently porting a working browser
prototype to Unity. That is the premise the whole content strategy runs on, and it expires:
once the port is done, the angle changes and this skill's plan should be rewritten, not patched.

## When to Use This Skill

- "What should I post this week?" / "give me the next batch of clips"
- Planning or scripting a devlog video, or writing a hook for a short
- Turning something that just happened in the build — a bug, a rebuild, a mechanic finally
  working — into a post
- Drafting or reviewing Steam page copy, the capsule, the short description, the trailer beats
- Deciding where to spend effort: which two channels, and what to drop
- Checking whether a wishlist number or a platform reach claim is still true

## Core principles

These are the decisions already made. Re-open them only when the developer asks, or when a live
check (below) shows the ground has moved.

**Two channels, not five.** YouTube is the home base — long devlogs plus Shorts. One clip feed
sits on top of it as discovery. Everything points at one destination: the Steam page. A plan that
adds a third channel has to say what it drops.

**Frequency over polish.** A steady drip of short posts beats an occasional polished piece for
growth, by a wide margin. When a choice is between shipping three rough clips and one clean one,
ship three. This is the single most common place a solo dev's plan goes wrong.

**The mess is the content.** Bugs, failed prototypes, rebuilds and "here's what I got wrong"
outperform showcases, because the audience is watching a person, not a product. The port is a
gift here: a working prototype being torn down and rebuilt is a legible story with a beginning.

**The Steam page compounds.** Wishlists accumulate for as long as the page is up, so the page
goes live early — as soon as there is honest gameplay footage — not when the game is nearly done.
Every piece of content is a path to it.

**Don't ask for the wishlist, earn the click.** Content good enough that people go looking for
the page beats content that asks.

## Workflow

### 1. Read the current plan

`.docs/marketing/` is this skill's home. Read what is there before writing anything:

| File | Holds |
|---|---|
| `content-plan.md` | The standing strategy: channels, cadence, current arc, what's deliberately not being done |
| `clip-backlog.md` | Unshot ideas, each with the hook and the shot it needs — the thing to pull from when the developer asks "what do I post" |
| `published-log.md` | What actually went out, when, and how it did — the only evidence for what works |
| `steam-page.md` | Store page copy in progress, and the trailer beat sheet |

If the folder does not exist yet, the first invocation creates it, starting with `content-plan.md`.
Do not scatter marketing notes into `.docs/design/` — that folder answers a different question.

### 2. Resolve live sources when a number is load-bearing

Marketing benchmarks and platform reach go stale within a year, so anything numeric gets checked
rather than recalled. Run `WebSearch` (and `WebFetch` on the specific source) before stating:

- a wishlist threshold, a Next Fest entry bar, or a wishlist-to-sale conversion rate
- how much organic reach a platform currently gives
- anything about Steam's store surfaces or festival rules

State the date the figure was checked next to it. A number in `content-plan.md` with no date is
treated as unverified.

**Where the figures stood on 2026-09-04** — carried here so a plan has a starting point, not so it
can be quoted without re-checking:

- Roughly 7,000–10,000 wishlists clears Steam's discoverability floor for a typical indie launch.
- Around 2,000 wishlists is the point below which Next Fest stops being worth entering.
- Roughly 10–15% of wishlists convert during launch week.
- The wishlist count needed to reach Steam's "Popular Upcoming" surface has risen sharply — the
  figure reported was around 80,000, up from roughly 7,000.
- TikTok's free organic reach has decayed hard since 2024; YouTube Shorts is the steadier bet and
  converts to Steam better.
- Devlogs typically start 12–18 months before launch.

### 3. Write for this game specifically

Generic advice is worthless past the first pass. Anything this skill drafts has to know what the
game actually is, so read the current design before scripting: `.docs/design/` for the live
direction, `.docs/game_rules/the-hunt.md` for the rules as they stand.

**Only talk about what exists.** A design document is not a fact about the game, and an untracked
one is a proposal someone wrote this week. Before putting anything in a video, check it against the
code and against `.docs/implementation/`, and check `git status` — a document nobody has committed
or lived with yet is not ready to be announced to an audience. Published content cannot be
un-published: a setting or a name that later changes has taught the first audience something false,
and those are the people most likely to notice.

**Do not teach vocabulary that is mid-rename.** The port renames most of the game's nouns, and until
that lands there are two vocabularies and neither is safe to teach. Describe things mechanically
instead — "the opponent", "a skull", "damage", "how many in a row". Mechanics are true under both
vocabularies; names are true under neither yet.

Two further constraints carried from `CLAUDE.md`, and they bind in a script exactly as they do in
chat:

- **Never say a card or buff name bare.** Say what it does the first time it appears. The names
  were agent-authored and carry no intuition — for a viewer they carry less than none.
- **Use the four outcome names correctly.** A trick is a High Victory, a High Defeat, a Low
  Victory or a Low Defeat. "Winning a trick" is not a way to describe a Low Victory. Getting this
  wrong on camera teaches the audience the wrong model of the game and is hard to walk back.

A deckbuilder has one enormous advantage as clip material: a number going absurdly high is the
entire short-form format, already solved. Lean on it.

### 4. Write a shoot pack, not a script

The developer records; they do not edit. So the output of this skill is not prose — it is a
**shoot pack** that the `video-editor` skill can consume after the recording exists. One video, one
folder: `.docs/marketing/edits/<slug>/shoot-pack.md`, where `<slug>` is shared with the media folder
outside the repo (`video-editor` → "Folder layout").

A shoot pack has two parts:

**Talking points — not a script.** The developer records live, **talking while doing the thing**,
aiming to sound like they are explaining it to their brother. This is a hard constraint, not a
preference: they have said plainly they will not capture footage and narrate over it afterwards, and
a pack that asks for that will be handed back. Write the capture section as one continuous take, and
never as "capture this, then record narration".

A second consequence: put the decision *before* the outcome. Someone talking through a choice they
have not yet made sounds different from someone explaining a choice already made, and the difference
is audible. Say so in the pack where it matters. A written script defeats that: read aloud,
it comes out stiff, and stiff is the one quality this format cannot survive. So write the points as
short prompts they can glance at — the idea to land, not the sentence to say. Five or six words per
line. If a line is long enough to need reading, it is too long.

The exception is a line where the exact wording matters — a rule being explained, a name being
introduced for the first time. Mark those, give the wording, and say why it is fixed. Everything
else is theirs to phrase.

The editor aligns by meaning, not by string match, so paraphrasing costs nothing and going off on a
tangent is fine — a good tangent is usually the best part of the take.

**Do not ask whether a video wants subtitles.** Every video gets them — burned into shorts, shipped
as a sidecar file beside a devlog. `video-editor` owns that and it is not a per-pack decision.

**The beats**, as a table, because this is what makes automatic cutting possible:

| # | What's said (the gist) | On screen | Rough length |
|---|---|---|---|
| 1 | the hook, in one line | what to capture | 0:05 |

The on-screen column has to name a **capturable thing** — "the Omen turning face up on their 5", not
"gameplay". The editor cuts the screen capture against this column; a vague entry there becomes a
guess at edit time.

**Check the shot exists before writing the pack.** A beat that needs a screen, a build or a tool
that has not been made yet is not shootable, however good the idea is — mark the pack BLOCKED and
say what unblocks it, rather than sending the developer to record something impossible.

Also state, once per pack: target aspect (vertical for shorts, wide for devlogs) and any line where
the exact wording matters — a rule being explained, a name being
introduced — because those are the lines worth a second take.

Then stop. The developer judges tone, delivery and whether a joke lands, and that judgement is not
this skill's to make.

### 5. Hand off

Recording is the developer's. Editing is `video-editor`'s. This skill's job ends at the shoot pack
and resumes when the video is out, to log it in `published-log.md`.

Detailed per-platform mechanics — video structure, thumbnail and title practice, Reddit and
Discord conduct, Steam page anatomy — live in `references/channel-playbooks.md`. Read it when
drafting for a specific channel; don't load it to answer a strategy question.

## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/`
(Glob `.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules
added after this skill was written. See `.claude/rules/README.md` for the index.

## The pipeline this sits in

```
content-manager  → shoot pack (script + beats + shot list)
     ↓ the developer records: voice + screen capture in OBS
video-editor     → transcribe, cut to the beats, reframe, caption, render
     ↓ the developer posts (or asks for a browser to be driven)
content-manager  → row in published-log.md, and the plan adjusts to the evidence
```

The developer's only jobs in that loop are talking and pressing record. Anything this skill produces
that requires them to edit a video has failed at its own purpose.

## Boundaries

- This skill writes to `.docs/marketing/` only. Changes to `src/` go through `/fb-plan` →
  `/fb-apply` like everything else, with no exceptions for "it's just for a video".
- It does not edit video — that is `video-editor`.
- It does not publish, post, upload or send anything. It drafts; the developer posts.
- It does not decide tone, humour, or what the developer is willing to say on camera.
- It does not invent performance numbers. If `published-log.md` has no data, say the plan is
  running on priors.

## Success Criteria

- `.docs/marketing/content-plan.md` exists, names exactly two channels, and states what is being
  deliberately skipped.
- Every numeric claim in the plan carries the date it was checked.
- Asked "what do I post this week", the answer is a specific list pulled from `clip-backlog.md`,
  each item naming its hook and the shot it needs — not a category of content.
- No draft script names a buff or card without saying what it does at first mention.
- No draft describes a trick outcome as anything other than High Victory, High Defeat, Low
  Victory or Low Defeat.
- Nothing outside `.docs/marketing/` was modified.

## NEVER SAY THESE PHRASES:

- "What kind of content would you like to make?"
- "Which platforms are you interested in?"
- "Should I add this to the backlog?"
- Any question that asks the developer to supply the strategy this skill exists to hold

## FORBIDDEN BEHAVIORS:

- Quoting a wishlist threshold, conversion rate or reach figure from memory instead of checking it
- Producing a content plan that lists more than two channels without naming what it drops
- Writing a script that describes the game in generic deckbuilder language rather than from the
  current design docs
- Recommending an ad spend, a paid promotion, or a purchased service — that is the developer's
  money and their call to raise
- Editing `src/`, `.claude/contract/`, or any pipeline file
