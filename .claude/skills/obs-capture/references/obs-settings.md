# OBS capture settings — the owned configuration

## Scope

**Structural (permanent).** The reasoning in each row: why constant-quality beats fixed bitrate for
screen capture, why the audio tracks are split, why capture goes on `D:`, why the container is
crash-safe, where the microphone level is controlled. These outlive any OBS version.

**Owned by the machine and the app.** Exact panel names, encoder option labels, preset letters, and
which codecs the GPU offers. **Every value below was read back from the running OBS on 2026-09-04**,
not proposed — where a setting was changed, it was verified by re-reading it, and the audio chain
was verified by measuring six real test recordings. OBS moves its settings between majors and NVIDIA
adds encoder presets between driver branches; if a label below does not exist, find its replacement
rather than assuming the setting was removed.

**Not owned here.** Anything about cutting, transcoding, subtitles, or delivery — that is
`video-editor`.

## The settings — as actually configured

| Setting | Value | Why |
|---|---|---|
| Output mode | **Simple** | Verified sufficient. Simple mode on OBS 32 exposes `RecTracks`, which is the only thing Advanced was wanted for. Advanced buys finer rate control that this workload does not need, and switching modes risks the audio routing below, which is calibrated and working |
| Video encoder | **NVENC H.264** | Not HEVC and not AV1. This pipeline decodes far more often than it records — every re-cut, every frame extraction, every transcode reads the file again — and H.264 is the fastest and most universally accepted of the three. Disk space is not the constraint: `D:` has ~1.4 TB free |
| Recording quality | **HQ** ("Indistinguishable quality, large file size") | This is a master to cut from, not a delivery file. Spend the bitrate |
| Container | **hybrid MP4** | Survives an OBS or machine crash mid-record; plain MP4 does not, and a crashed take is a re-shoot. Also the container that carries chapter markers |
| Resolution / fps | **1920×1080, 60** | Both displays are 1080p, so this is the ceiling — capturing at 1440p or 4K would upscale and gain nothing but disk |
| Capture path | **`D:\Recordings\StringsAndStations\<slug>\raw\`** | Space and drive quality. `D:` is a Samsung 870 EVO, ~1.47 TB free; `C:` is a Kingston A400 — a DRAM-less budget SSD — with ~267 GB and the OS on it |
| Audio tracks | **2. Track 1 = mic, track 2 = desktop** | Not three. A third "full mix" track is reconstructable from the other two in one ffmpeg command, so it is storage spent on something derivable. Two is what is routed and verified |
| Audio sample rate | 48 kHz | What Whisper and every delivery target expect; anything else is a resample for no gain |
| Mic device | `default` | **Known weakness, not a decision.** If Windows ever changes default — a headset connecting, a monitor waking — OBS silently follows and records the wrong microphone. Worth pinning to the named device |
| Replay buffer | On, ~60 s | The only way to capture a bug that already happened |
| Windows Game DVR | Off | A second capture pipeline running alongside OBS, for no benefit |

## The microphone chain — calibrated, do not re-tune by ear

This was the one thing that took real work, and it is the thing most likely to be undone by
accident. Measured across six test takes on 2026-09-04.

**Windows input volume is at 100% and must stay there.** The Windows slider is not calibrated in dB
and its response is wildly non-linear at this device: an attempt to come down 6 dB from a clipping
take produced a **39 dB** drop. It is unusable as a fine control. Level is controlled in OBS
instead, where it is set in real decibels.

Two filters on `Mic/Aux`, in this order:

| Filter | Setting | Job |
|---|---|---|
| `Gain (calibrated)` | 0 dB | The adjustment point. If the level ever needs to move, move it here, in dB, not in Windows |
| `Peak safety limiter` | threshold −6 dB, release 60 ms | A ceiling. A laugh, a cough or a desk thump cannot clip the take |

**The verified result at these settings: peaks −6.0 dB, mean −24.0 dB, zero clipped samples**, with
a clean Whisper transcript off the same file. That is the target to return to.

**Target band for any future re-check:** peaks between −12 and −6 dB, never touching 0; mean around
−20 to −24. Mean matters least — `video-editor` normalises loudness in post. Peak headroom is what
cannot be recovered, because clipped samples are gone.

**Do not "fix" a quiet-sounding take by raising Windows.** Measure it first; the fix is almost
always the gain filter.

## The webcam bubble — keep it off the game

The camera is composited into the recording by OBS, so wherever it sits is **baked in** and cannot
be undone downstream. On the 2026-09-04 take it sat bottom-right, on top of the game's resolved-trick
row — which meant every vertical crop either sliced the developer's face or had to paint the bubble
out and re-place it, leaving a visible patch.

**Put the bubble somewhere it overlaps no game content.** The felt has a large empty area; anywhere
there costs nothing. If a shot genuinely needs the full board, turn the camera off for that take and
record the talking-head separately — two clean sources always beat one baked composite.

Its position is a source coordinate `video-editor` needs (`--facecam X,Y,S`). **When the scene
changes, the number changes**, so say so rather than letting the editor discover it by rendering a
face cut in half. Measured 2026-09-04: a 285 px circle at x 1598, y 790.

## Aspect ratio — 16:9, with one measured exception

Record 16:9. Vertical shorts are made in post by `video-editor`, which scales the full 1920-wide
frame down to 1080 and centres it over a blurred backdrop — a downscale, so it stays sharp.

**The exception is a tight crop on a face.** A 9:16 region cut out of a 1920×1080 frame is at most
607×1080, so filling a 1080×1920 short means upscaling about 1.8×, which is visibly soft on a
talking head. For an on-camera clip, set the canvas to **1080×1920** and frame in it directly — the
webcam is 1080p native and fills that frame with no upscaling at all.

This is a resolution fact, not a preference: it applies to any shot whose final framing is a crop
into less than 60% of the frame width, including a hard push-in on a small on-screen counter.

## Chapter markers — the capture-side half of the edit

OBS 32.2.2 exposes `OBSBasic.AddChapterMarker`, bound to **F8** on this machine. Hybrid MP4 carries
the markers, and `ffprobe -show_chapters` reads them back with titles and exact timecodes —
**verified end to end**, including two markers placed in a live test take.

This is what makes a long, rambling capture editable. A marker after a good take gives
`video-editor` a frame-accurate pointer instead of a search through the transcript. Saying "that's
the one" out loud still works as a fallback, since Whisper timestamps every word — use whichever the
developer remembers in the moment, and never require both.

## Applying them

OBS rewrites its entire config on exit, so anything written to `basic.ini` under a running OBS is
discarded. Either drive the change through the running app — the `obs` MCP can set profile
parameters, the record directory, input volumes and filters — or have the developer close OBS first.

**Two things the MCP cannot do**, and both need the developer:

- **Routing sources to tracks.** `SetInputAudioTracks` exists in obs-websocket but is not wrapped by
  this MCP server. Enabling two tracks in *Output → Recording* is not the same as routing different
  sources to them; the routing lives in **Advanced Audio Properties**, per source. A file whose two
  tracks measure identically is the symptom of doing only the first half.
- **Binding a hotkey.** *Settings → Hotkeys*, and only from the app.

## Bugs this configuration is meant to prevent

- A crashed take being unrecoverable — the container choice
- A voice that cannot be cleaned without wrecking the game audio — the track split
- Filling the OS drive mid-shoot, on the slowest disk in the machine — the capture path
- A clipped take, which cannot be repaired at all — the limiter
- Someone "helpfully" adjusting Windows and losing the calibration — the gain filter as the single
  adjustment point
- Discovering hours later that the interesting moment was never captured — the replay buffer
- A soft, upscaled talking-head short — the vertical canvas exception
