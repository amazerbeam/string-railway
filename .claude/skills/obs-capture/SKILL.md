---
name: obs-capture
description: Configure and drive OBS Studio to capture devlog footage on this machine — setting the encoder and audio tracks, starting and stopping recordings from chat, grabbing a bug with the replay buffer, and verifying a take landed before the developer moves on. Use when asked to record something, to start or stop OBS, to check OBS settings are right before a shoot, to capture a bug that just happened, to confirm a recording is usable, or when a take came out with dropped frames, bad audio levels, or a missing track.
allowed-tools: Read, Grep, Glob, Write, Edit, PowerShell, ToolSearch
metadata:
  type: automation
  pairs-with: video-editor, content-manager
---

# OBS Capture

Everything up to the moment a usable file exists on disk. `content-manager` decides what gets shot,
this skill shoots it, `video-editor` cuts it. The seam on both sides is a folder, and the handoff
downstream is a raw file plus a one-line verdict on whether it is worth editing.

The point of this skill is that a re-shoot is the most expensive failure in the whole content
pipeline — the developer has to set up, perform, and play again. Almost everything here exists to
catch a bad take within seconds of it ending rather than an hour into the edit.

## When to Use This Skill

- "Record this", "start recording", "stop and save that"
- "Grab that, it just did the bug" — the replay buffer, after the fact
- Checking OBS is configured correctly before a shoot, or after a Windows or driver update
- "Is that take usable?" — levels, dropped frames, track count, duration
- Diagnosing a bad recording: stutter, silent mic, one audio track instead of three, tiny file
- Setting up or changing scenes for a new kind of shot

Not this skill: cutting, captions, transcription, vertical reframes, renders — all `video-editor`.

## This machine — verified 2026-09-04

| | |
|---|---|
| CPU / GPU | Ryzen 7 9800X3D (8c/16t) · RTX 4070, 11.7 GB, 8th-gen NVENC (H.264, HEVC, AV1) |
| RAM | 32 GB DDR5-4800 |
| Displays | Two 1080p; primary is a Dell AW2521H |
| OBS | 32.2.2, single profile `Untitled`, HAGS enabled |
| Capture target | `D:\` (Samsung 870 EVO, ~1.4 TB free). **Not `C:`** — Kingston A400 boot drive, ~266 GB |
| Control | `obs` MCP server (`obs-mcp` over obs-websocket v5), user scope, port 4455 |

**The settings this skill applies, and the reasoning for each, live in
`references/obs-settings.md`.** That file is the single source of truth for capture configuration —
`video-editor`'s recording notes defer to it rather than restating it.

Written against OBS 32.2.2. OBS moves its Settings panels between majors; if a named checkbox is not
where this skill says it is, find it rather than concluding the setting is gone.

## Preflight — run this before every shoot, it takes seconds

Four things, in this order, because each one makes the next meaningful:

1. **Is the OBS WebSocket server actually on?** `server_enabled` in
   `%APPDATA%\obs-studio\plugin_config\obs-websocket\config.json`. This is off by default and
   nothing else in this skill works without it. It is a checkbox in *Tools → WebSocket Server
   Settings* that only the developer can tick — say so plainly and stop, rather than retrying.
2. **Are the OBS MCP tools reachable this session?** They are deferred, so resolve them before
   calling anything: `ToolSearch` with `select:` and the OBS tool names, or a keyword search for
   `obs record scene`. A server that is configured but unreachable reports as a connection failure,
   not as a missing feature — report which of the two it is.
3. **Do the settings match?** Read the profile at
   `%APPDATA%\obs-studio\basic\profiles\<profile>\basic.ini` and compare against
   `references/obs-settings.md`. Report drift; do not silently correct it mid-shoot.
4. **Is there room?** Roughly 1 GB per 10 minutes at the settings this skill uses. Check free space
   on the capture drive against the planned take length, with headroom.

**OBS rewrites its whole config on exit.** Any edit to `basic.ini` made while OBS is running is lost
the moment it closes. Change settings through the running app — via the MCP where it can, otherwise
by telling the developer the exact clicks — or have them close OBS first and edit the file then.
There is no third option, and writing the file under a live OBS is the most common way to lose an
afternoon's configuration.

## Capturing

### An ordinary take

Start recording, confirm the state actually changed, then get out of the way. Do not narrate during
a take — the developer is talking, and a wall of chat output is the thing they have to edit around.

Two habits that cost nothing and save re-shoots:

- **Mark the keepers.** F8 is bound to `Add Chapter Marker`; hybrid MP4 carries the markers and
  `ffprobe -show_chapters` reads them back with exact timecodes. One tap after a good take saves
  `video-editor` a search. Saying "that's the one" out loud works too, since Whisper timestamps
  every word — either is enough, never ask for both.
- **Roll before the first word and stop after the last.** A couple of seconds of handle on each end
  gives `video-editor` room to cut on a breath instead of on a syllable. Trimming is free; a clipped
  first word is a re-shoot.
- **Confirm the state, don't assume it.** Ask OBS whether it is recording rather than inferring it
  from the fact that the start call returned. A take that never started is only discovered when the
  developer goes looking for the file.

### A bug, after it happened

This is what the replay buffer is for, and it is the one capture that cannot be planned. The buffer
holds a rolling window in RAM; saving it writes the window that already elapsed. If the buffer is
not running, it cannot retroactively be — start it at the beginning of a play session, not when
something interesting happens.

When the developer says "grab that", save the buffer first and ask questions second. The window is
finite and every turn of conversation eats into it.

### Scenes

Keep the set small enough to switch without thinking. For this project's shots that is roughly: the
prototype in a browser window, the editor, a full-desktop fallback, and something to cut away to.
Capture the browser or editor by window rather than by display where possible — a window capture
survives the developer alt-tabbing, and does not leak notifications or a second monitor into frame.

Record 16:9 by default — vertical shorts are made in post by `video-editor`, which downscales the
full frame over a blurred backdrop and stays sharp.

**One exception, and it is arithmetic rather than taste:** a tight crop on a face. A 9:16 region cut
from a 1920×1080 frame is at most 607 px wide, so filling a vertical short means upscaling ~1.8× —
visibly soft on a talking head. For an on-camera clip, set the canvas to 1080×1920 and frame in it
directly. `references/obs-settings.md` holds the rule and the threshold.

## Verifying a take — the part that earns the skill

Do this immediately after every stop, before the developer moves on. It is fast, and it is the only
cheap moment to catch a problem.

Check, in this order — each one is a re-shoot if it fails, so stop at the first failure:

1. **The file exists and is plausibly sized.** A near-zero file means the encoder failed to start.
2. **Duration matches what was just recorded.** A file much shorter than the take means OBS stopped
   early, usually the disk or the encoder.
3. **Both audio tracks are there.** Two streams, not one — track 1 the mic, track 2 the desktop. A
   take mixed to a single track cannot have the voice cleaned without cleaning the game audio with
   it, which is the whole reason the tracks are split. Two tracks that measure *identically* is the
   other failure: tracks were enabled but sources were never routed.
4. **The voice track has signal and did not clip.** Measure it — `max_volume` and `mean_volume` from
   `volumedetect`. The calibrated target is peaks near −6 dB and mean near −24, with nothing at 0.
   Silence means a muted or wrong input device; clipping cannot be undone. Either one, say so at
   once and stop. Before concluding a mic is set too low, check whether the developer was actually
   speaking — transcribing ten seconds settles it, and a quiet room reads the same as a dead mic.
5. **OBS did not drop frames.** The tail of the newest log in `%APPDATA%\obs-studio\logs` reports
   skipped frames from encoding lag and lost frames from rendering lag. A handful across a long take
   is noise; a steady rate is a real problem and the log names which stage caused it.

`ffprobe` answers 1–4 and is already on this machine for `video-editor` — see that skill for the
PATH caveat if it appears to be missing. Report the verdict as one line: usable, or the specific
thing that is wrong and whether it needs a re-shoot.

## Where the files go

The same convention `video-editor` reads from, so the handoff is a path and nothing else:

```
D:\Recordings\StringsAndStations\<slug>\raw\      what OBS wrote, never edited in place
D:\Recordings\StringsAndStations\<slug>\work\     intermediates, transcripts, extracted frames
D:\Recordings\StringsAndStations\<slug>\out\      the deliverable
.docs/marketing/edits/<slug>/                     text artifacts, in git
```

`D:\Recordings\StringsAndStations\_calibration\` holds the microphone test takes from 2026-09-04.
Keep them — they are the reference for what a correctly levelled file measured like.

One slug per video, shared by both folders. **Media never enters the repository** — it is large and
binary and there is no LFS here. If OBS is still writing to its default path under `C:\Users\jossd\
Videos`, that is drift from `references/obs-settings.md`; report it.

## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/` (Glob
`.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules added
after this skill was written. See `.claude/rules/README.md` for the index.

## Success Criteria

- Preflight reports WebSocket state, MCP reachability, settings drift and free space before a shoot
  starts — never mid-take
- A recording is confirmed started by querying OBS, not by assuming a call succeeded
- Every stopped take gets the five verification checks, with a one-line usable / not-usable verdict
- A failure that needs a re-shoot is reported the moment it is found, not after further work
- No edit is made to `basic.ini` while OBS is running
- Capture settings are read from `references/obs-settings.md`, and any change to them is made there
  rather than in this file or in `video-editor`
