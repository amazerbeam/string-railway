---
name: video-editor
description: Turn raw OBS recordings and spoken audio into finished devlog videos and vertical shorts — transcribing with Whisper, cutting to the script beats, trimming dead air, reframing to 9:16, burning captions, and rendering with ffmpeg. Use when handed a recording to edit, when asked to cut a devlog or make a short from footage, when a video needs captions or a vertical reframe, when a render needs re-cutting after a note, or when checking that a recording is usable before editing it.
allowed-tools: Read, Grep, Glob, Write, Edit, PowerShell
metadata:
  type: automation
  pairs-with: content-manager
---

# Video Editor

Takes what the developer recorded and produces something postable. The developer talks and captures
screen; this skill does every part after that. It never asks them to open an editor.

`content-manager` decides what gets made and writes the shoot pack. This skill consumes the shoot
pack and the recordings, and renders. The seam between them is a folder, described below.

## When to Use This Skill

- "Here are the recordings for devlog 1, edit it"
- "Make three shorts out of this footage"
- "Add captions to that", "make it vertical", "the middle drags, cut it tighter"
- Judging whether a topic is salvageable from the footage or needs saying again
- Checking a recording is usable — levels, sync, dropped frames — before spending an hour on it
- Re-rendering after a note, without redoing the work

## Environment — verified on this machine 2026-09-04

Everything below was run end to end before this skill was written, not assumed.

| Tool | State |
|---|---|
| ffmpeg / ffprobe | 9.0.1-full_build, installed via winget at `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_*\ffmpeg-9.0.1-full_build\bin`, on the **user** PATH |
| Whisper | `openai-whisper` under Python 3.12.10, imports cleanly, `--word_timestamps` supported |
| Torch CUDA | **Not available.** Transcription runs on CPU |
| OBS | 32.2.2, configured and calibrated. **`obs-capture`'s `references/obs-settings.md` owns every capture setting** — do not restate or contradict it here |

**A shell started before the winget install will not have ffmpeg on PATH.** If `ffmpeg -version`
fails, prepend the path above to `$env:Path` for that session rather than concluding it is missing.

**CPU-only transcription is the pacing constraint.** Pick the model against the job: `base` for a
30-second short, `small` when the wording has to be right for caption burn-in. Benchmark the first
real recording and write the actual rate into the edit folder's notes — do not guess at it here.

## What arrives from capture

Capture is `obs-capture`'s job, not this skill's. What lands here has already been configured and
verified there, and this skill reads that contract rather than re-deriving it:

- **One file, voice and screen together.** The developer talks while capturing, so nothing needs
  synchronising — both tracks came out of one encoder.
- **Two audio streams.** Track 1 is the mic, track 2 the desktop. Address them as `0:a:0` and
  `0:a:1`.
- **Calibrated levels** — peaks near -6 dB, mean near -24, a limiter preventing clipping. A take
  measuring far from that is a fault to report with the numbers, not a level to quietly correct.
- **Chapter markers wherever the developer tapped F8.** These are the cheapest cut points that
  exist. Read them first, before searching the transcript.

`obs-capture` owns changing any of that. If a take is wrong, hand the fault back with the
measurement.

## Folder layout — where media lives, and why not in git

**Media never enters the repository.** Video is large and binary; git handles it badly and the
project has no LFS configured. Media lives on `D:` — a Samsung 870 EVO with ~1.47 TB free — and
never on `C:`, a slower budget SSD carrying the OS. Text artifacts do go in the repo, because they are the reviewable
part of an edit.

| What | Where | In git |
|---|---|---|
| Raw OBS captures, audio, renders | `D:\Recordings\StringsAndStations\<slug>\` | No |
| Shoot pack, transcript, edit decision list, render notes | `.docs/marketing/edits/<slug>/` | Yes |

`<slug>` is shared by both — `devlog-01-throw-it-away`, `short-day-zero`. One slug, one video.

Inside the media folder, expect and produce:

```
raw/          what OBS wrote, untouched — never edit in place
work/         intermediate renders, trimmed audio, extracted frames
out/          the deliverable, one file, named <slug>-<aspect>.mp4
```

`raw/` is read-only by convention. Every operation reads from it and writes elsewhere, so a bad edit
costs a re-render and never a re-shoot.

## Workflow

### 1. Inspect before editing

Probe every input first: duration, resolution, frame rate, how many audio streams, whether the audio
and video durations agree. A drift of more than about a second between them means sync trouble that
gets worse across a long take, and it is far cheaper to find now.

Then check levels on the voice track. If it clipped or sat near silence, say so immediately and stop
— that is a re-shoot, and discovering it after an hour of cutting wastes the hour. This is the one
place this skill should interrupt rather than proceed.

### 2. Transcribe

Whisper with `--word_timestamps True`, JSON output, into `work/`. Word timings are what make
everything downstream possible: the cut points, the caption timing, and the alignment against the
script. Segment-level timings are not sufficient — do not fall back to them silently.

Keep the transcript in the edit folder in git. It is the searchable record of what was actually said,
and it is what the developer reviews when they want to change a cut without watching the video.

### 2.5 Read the markers before searching anything

`ffprobe -v error -show_chapters` lists every point the developer tapped F8, with exact timecodes —
verified working on this machine. A marker usually means "the take that just ended was the keeper",
so read backwards from it.

Markers are a convenience, not a contract: the developer may have said "that's the one" out loud
instead, which the transcript carries. Use whichever is present, and never require both.

### 3. Align to the shoot pack

The shoot pack lists beats — what the developer meant to say, and what should be on screen while
they say it. They will not have said it word for word, and should not have to.

Match each beat to the span of transcript that covers it, by meaning rather than by string equality.
Produce an **edit decision list** at `.docs/marketing/edits/<slug>/edl.md`: one row per segment, with
source file, in and out timecodes, what is on screen, and one line of what is being said. Write the
EDL before rendering anything.

The EDL is the reviewable artifact. A note like "cut the middle tighter" is a change to two rows and
a re-render, not a fresh edit — that is the whole point of writing it down.

### 4. Cut — tighten, don't just trim

**`scripts/tighten.py` does this pass.** It is the difference between a clip that is the right
length and a clip that is watchable, and the developer asked for it explicitly after seeing a
merely-trimmed cut: *"there is a lot of pausing and me saying the same thing over and over."*

What it does, all from the Whisper word timings:

- **Closes every gap** longer than about a sixth of a second. Speech that ran with pauses between
  every few words comes out continuous.
- **Removes restarts.** When a phrase is repeated within a few seconds, the earlier attempt and
  everything between the two is dropped, keeping the later take. On a real clip this removed 22 of
  66 words and turned two aborted attempts into one clean sentence.
- **Drops filler** — um, uh, erm.
- **Cuts real silence, not just gaps between words.** Whisper sometimes stretches a word's end time
  across a pause, so the word timings alone leave audible dead air in the middle of a clip. The
  audio is checked with `silencedetect` and anything genuinely silent is carved out.
- **Leaves the tail of a phrase alone.** Cutting on the closing consonant sounds clipped — "one
  heart of damage" ending the instant the word does is a defect, so kept runs get a longer tail
  than head.
- **Keeps the rhythm of a list.** "Moons, keys, and bells" needs its beats; closing those gaps as
  hard as ordinary pauses makes the speech sound wrong even though every word is present.
- **Re-times the subtitles onto the new timeline**, so captions stay in sync through every cut.

Measured on the first real take: 36 s → 15 s, 38 s → 19 s. Roughly half, with nothing of substance
lost.

**Its limit, and it needs a human:** it matches repeated *words*. A restart where the wording
changed — "the skull cards **invert** that logic… the skull card **reverts** that logic" — is
invisible to it. Read the generated SRT before rendering; where it still reads badly, pass the
offending span to `--drop`. Reading the SRT is the review step, not watching the video.

Usage:

```powershell
$env:FFMPEG_EXE = "<path to ffmpeg.exe>"
python scripts\tighten.py <slug> <start> <end> <outdir> --src <master> --crop 0:150 --drop 133.2-146.05
```

Then the ordinary working order for what remains:

1. **Drop the dead** — long pauses, false starts, the audible restart after a fluffed line. When a
   line was said twice, keep the later take; that is almost always the better one.
2. **Assemble** the kept spans in EDL order.
3. **Lay the screen capture** under the voice, per the EDL's on-screen column.
4. **Level the voice** — loudness normalise to about −16 LUFS, which is right for both YouTube and
   phone speakers.
5. **Reframe** if the target is vertical.
6. **Subtitle.** See below — this is a default, not a per-video choice.

Recipes for each of these — tested, with the arguments that actually work on this ffmpeg build — are
in `references/ffmpeg-recipes.md`. Read it before writing a filter chain; several of these fail in
non-obvious ways when improvised.

### 4.2 Framing a vertical clip — compose it, never just crop

Two rules, both learned by rendering a frame and looking at it.

**Never let a crop slice the webcam.** OBS composites the camera bubble into the recording, so a
naive crop cuts the developer's face in half — and it is baked in, so it cannot be recovered
later. `tighten.py` handles this by cutting the bubble out of the source, painting over where it
was, and re-placing it whole as its own overlay. Its position is a `--facecam X,Y,S` source
coordinate, not a constant: **re-measure it whenever the OBS scene changes** by extracting a frame
and looking.

**The crop follows the subject, and the subject moves.** This game's UI puts the pot on the left,
the verdict centre-right and the hand along the bottom, so no single fixed crop serves every clip
— one framing cut the pot panel out of the clip that was *about* the pot. Pass `--crop X` per
clip, chosen from what that clip is about, or `--crop X0:X1` to pan across it as the developer's
attention moves.

**What the tool cannot do is track the cursor per frame.** Panning is a straight line between two
positions; if a clip needs the frame to chase the mouse around, that is a sign the shot wants
re-capturing tighter rather than rescuing in post.

### 4.5 Subtitles — every video, both formats

**Every video gets subtitles.** Not a per-clip decision, and not something to ask about. The
transcript already exists with word-level timings by this point, so the marginal cost is one filter
pass — and the reasons are not marginal:

- Most short-form is watched with the sound off. An uncaptioned short is a silent one.
- A game with rules to explain is a game that benefits from its terms being *readable*, not only
  audible. "Low Victory" heard once is a phrase; seen written, it is a term.
- Accessibility. A deaf viewer either can watch it or cannot, and that is decided here.
- Retention. Captions measurably hold viewers through the first seconds, which is where short-form
  is won or lost.

**How each format gets them:**

| Format | Treatment |
|---|---|
| Vertical shorts | **Burned in.** Short-form players do not reliably expose a caption track, so a soft track is a track nobody sees. Large, high-contrast, outlined, positioned clear of the bottom third where platform UI sits |
| Long devlogs | **Both.** Burn nothing into the picture; export a sidecar `.srt` alongside the render for upload. YouTube's own player handles the display, the viewer keeps control, and the text stays searchable and translatable |

**Never ship YouTube's auto-captions in place of the sidecar.** They mangle exactly the words this
project cannot afford to have mangled — the game's own vocabulary, the four trick outcomes, any
proper noun — and a wrong caption teaches the wrong term as surely as saying it wrong would.

**Subtitles are shipped text, so the vocabulary rules below bind every line of them.** Read what
the developer actually said and caption that; if they said something wrong, flag it rather than
silently rewriting speech into different words on screen, which reads as a glitch.

Two craft rules worth holding to:

- **One or two lines, never three.** Break on a clause, not at a fixed character count — a line
  ending mid-phrase costs more comprehension than a slightly long one.
- **Match the cut.** A subtitle surviving across a hard cut looks like a bug. End it on the cut.

The SRT-building and burn-in commands are in `references/ffmpeg-recipes.md`, including the font-size
caveat, which is that subtitle sizing is not in pixels and has to be checked on a real frame.

### 4.6 Read the clip back as a stranger — this is the review, and it is not optional

Before rendering, read the clip's own subtitle file end to end and ask: **would someone who has
never seen this game understand it, and does it finish?** Not "did the cutting work" — that is a
different and much easier question, and passing it is what makes a bad clip feel finished.

A clip fails this test, and must not ship, when:

- **It ends on a setup with no payoff.** A clip that says "this time the key will be a skull card"
  and stops has raised a question and answered nothing. The viewer's last feeling should be *I get
  it*, never *and then what?*
- **It covers two topics badly instead of one properly.** A clip about reading the opponent's
  intent that slides into explaining skulls does neither. One idea, demonstrated, finished.
- **It states a rule but never shows it used.** "The panel tells you what suit they'll play" is a
  fact; "they've got bells, so I should play…" is a clip. The demonstration is the content.
- **It assumes something the clip never established.** Every term a viewer needs has to be
  introduced inside that clip or be obvious on screen.

When a clip fails, say which of these it failed and either widen the window until it stands alone,
or report it as a retake. **Do not ship it and let the developer discover it.** They should never be
the first person to read the clip as a viewer would.

### 4.7 Cut the production talk

The developer is talking to the editor as well as to the audience — "I'm going to explain that
again", "let me go", "I forgot to explain the trump card", "okay, let's just scrap all that". None
of it ships, and none of it is the audience's business.

`scripts/tighten.py` removes the common phrasings automatically, and treats **"again", "scrap
that", "start over" as retake markers**: the marker and the whole abandoned sentence before it are
dropped, because the developer saying "again" means precisely that the attempt just made is dead.
That was their own instruction and it binds. Anything the pattern misses is a manual `--drop`.

### 4.8 Ask for a retake rather than forcing a bad edit

**A clip that cannot be made good from the footage is a retake, not an editing problem.** The
developer is happy to say a topic again — it costs them under a minute — and that is far cheaper
than a published clip that explains the game badly.

Ask when the material is genuinely unusable:

- The explanation is wrong, or contradicts the rules, and cannot be fixed by cutting. **Never edit
  speech into meaning it did not have.**
- Every attempt at a point is abandoned partway, so there is no complete take to keep.
- The sentence only parses with the ums and restarts left in, and tightening it makes it worse.
- The thing being described is not on screen when it is described, and no reframe fixes it.
- The point is scattered across the whole session in fragments that cannot be joined without
  sounding spliced.

**How to ask.** Name the topic in the developer's own words, say in one line what is wrong with the
take, and say what a usable version needs. *"Please explain the pot again — you started it three
times and the numbers changed each time. One pass: what the two numbers are, then the cash-out
choice."* Nothing more; they know the game better than this skill does.

Deliver everything that did work first, and list the retakes at the end as a short shooting list.
A session that produces three good clips and two retake requests is a good session — say so, rather
than padding it to five.

**This does not conflict with the rule below about not handing decisions back.** Asking the
developer to *make different material* is not the same as asking them to make an *editing decision*.
Framing, pacing, cut points and caption wording stay this skill's job, always.

### 5. Look at the result

Render, then extract frames at the cut points and at every caption and **actually look at them**.
Captions run off the frame, a reframe crops someone's head, a cut lands mid-word — none of these
show up in a log, and all of them are obvious in a still.

Then hand over the file path and a one-line note on anything worth a second opinion. The developer
judges pacing, tone and whether a joke lands; this skill does not.

## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/`
(Glob `.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules
added after this skill was written. See `.claude/rules/README.md` for the index.

## Vocabulary — this binds in a caption exactly as it does in chat

Burned captions are shipped text. Two rules from `CLAUDE.md` apply to every word of it:

- **No card or charm name appears bare.** Say what it does at first mention. The names carry no
  intuition for a viewer who has never played.
- **A trick outcome is a High Victory, a High Defeat, a Low Victory or a Low Defeat.** "Winning a
  trick" is never how a Low Victory is described. If the developer says it wrong on the take, flag
  it — do not caption it wrong to match, and do not silently fix a spoken word into a different
  written one.

## Boundaries

- Writes to `.docs/marketing/edits/` and to the media folder outside the repo. Nothing else — never
  `prototype/src/` or `unity/`, never the contract pipeline.
- Never modifies anything in `raw/`.
- Does not post, upload or publish. Rendering is where this skill stops.
- Does not decide pacing, tone or humour.
- Does not add a dependency. ffmpeg and Whisper are what is installed; anything else is the
  developer's call to approve.

## Success Criteria

- `ffmpeg -version` and `ffprobe -version` succeed before any render is attempted.
- Every input was probed, and voice levels were checked, before the first cut.
- A transcript with word-level timings exists in the edit folder.
- `edl.md` exists and was written before rendering, with real timecodes.
- The render was inspected as extracted frames, not just declared finished.
- Output is one file in `out/`, and its path was handed to the developer.
- Any topic that could not be made good was reported as a retake request naming the topic and what
  a usable version needs — not shipped in a forced edit, and not silently dropped.
- Every shipped clip's subtitles were read end to end as a stranger would read them, and each clip
  covers one idea, demonstrates it, and finishes.
- No clip contains talk addressed to the editor.
- No file in `raw/` changed. Verify with a timestamp check if unsure.
- No caption names a card or charm without saying what it does, and no caption describes a trick
  outcome in any words other than the four.

## NEVER SAY THESE PHRASES:

- "How would you like this edited?"
- "What cuts should I make?"
- "Do you want captions?"
- Any question that hands the editing decisions back to a developer who has said they do not want to
  make them

## FORBIDDEN BEHAVIORS:

- Rendering before writing the EDL — it removes the developer's only cheap review point
- Claiming a render succeeded without probing the output file
- Declaring a video finished without looking at extracted frames
- Editing, moving or overwriting anything in `raw/`
- Transcribing with segment-level timings when word-level was available
- Silently proceeding past clipped or near-silent voice audio
- Shipping a clip that explains the game wrongly because the footage did not support a better cut —
  ask for the retake instead
- Cutting words together into a sentence the developer did not say, to rescue a bad take
- Quietly dropping a topic that failed, so the developer never learns it needs re-recording
- Shipping a clip that ends on a setup with no payoff, or that half-covers two topics
- Judging a clip by whether the cutting worked rather than by whether it makes sense to a stranger
- Leaving "again", "scrap that" or any other production aside in a shipped clip
- Hardcoding an ffmpeg filter chain from memory instead of the tested recipes
