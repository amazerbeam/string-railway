# Shoot pack — Devlog #1: "I built my whole game in a browser so I could throw it away"

**Slug:** `devlog-01-throw-it-away` · **Target:** wide 16:9 · **Subtitles:** sidecar .srt, not burned
**Length:** 10–14 minutes · **Media folder:** `D:\Recordings\StringsAndStations\devlog-01-throw-it-away\`

**Record this after the four shorts, not before.** The shorts prove the pipeline on thirty seconds of
footage; a twelve-minute take is an expensive place to discover the mic was set wrong. Whisper runs
on CPU here, so this one also takes real time to transcribe.

---

## Capture

Record in sections and stop between them. There is no prize for one continuous take, and a stumble in
minute nine should not cost minute one.

- **Talking head**, for the framing sections — the open, the turn, the close.
- **Prototype gameplay**: a full hand start to finish, the shop, the end-of-run screen. Capture far
  more than you think you need; this footage stops existing once the port replaces it.
- **The rules document**, scrolling.
- **Unity**: the new project dialog, the empty scene, the architecture document.

**Talk continuously and call out the keepers** — "that's the one", "ignore that", "take three".
Whisper transcribes every word with a timestamp, so a spoken marker is how the editor finds the right
span inside a long section. Silent capture gives it nothing to search on.

## The beats

| # | The point | On screen | Rough |
|---|---|---|---|
| 1 | Cold open: this works, and I'm deleting it | prototype mid-trick → empty Unity project | 0:20 |
| 2 | You can't tell if a card game is fun by designing it | you | 1:00 |
| 3 | So it got built twice on purpose — browser first, to answer one question | prototype, playing | 1:30 |
| 4 | What it proved: the skull flip lands, people enjoy losing on purpose | the inversion, in play | 2:00 |
| 5 | What it proved: cash out or push is a real decision | counters climbing, a push | 1:30 |
| 6 | What it got wrong — pick a real one from the play sessions | that screen, deadpan | 1:00 |
| 7 | The rebuild's actual argument: the prototype has no boundaries | prototype code, tangled | 2:00 |
| 8 | Unity version separates rules from screens from data, and the compiler enforces it | the architecture document | 1:30 |
| 9 | Where it stands: an empty project and a plan. Next: one honest screen. | empty Unity scene | 0:45 |

## Wording that is fixed

- **The premise sentence**, close to this: *"I built the whole thing in a browser to answer one
  question — is this fun? It is. So now I throw the code away and build it properly."* Everything
  hangs off it; it wants to be said cleanly.
- **The skull section** — same care as the short. Ducking is the correct play, not a surrender, and
  never "win the trick" about a trick that was deliberately ducked. The game's names for the four
  outcomes are High Victory, High Defeat, Low Victory and Low Defeat; you do not need the terms on
  camera, but do not contradict them.
- **Beats 7 and 8 are the argument**, and it is an architecture argument, not a naming one: in the
  prototype the rules, the screens and the tuning data are separated by convention only. The rebuild
  makes those boundaries something the compiler enforces, and moves hardcoded values into data.
  That is a real, checkable claim and it is the part a developer audience came for.
- **Say nothing about a setting, a fiction, or renaming.** Those live in three uncommitted documents
  as of 2026-09-04 and are not decided. Describe everything mechanically — "the opponent", "a
  skull", "damage", "how many in a row".
- **Beat 6 needs a real example**, chosen from the play-session notes at record time and verified
  against the code first. Do not repeat a fault from an old playtest document without checking it is
  still true — a video is a bad place to be wrong about your own game.

## Notes for the editor

- Cold open under twenty seconds. No greeting, no channel intro, no "in today's video".
- Beat 6 plays straight — no commentary over it. Let the broken thing be funny by itself.
- Beats 7 and 8 are the meat for a developer audience. If the video runs long, cut from 3 and 5, not
  from these.
- Pull at least two shorts out of this footage afterwards. Beat 6 and the boundaries argument are
  both self-contained.
- Transcribe with the `small` model, not `base` — twelve minutes of speech is the cut list, and the
  smaller model mangles too much of it.
