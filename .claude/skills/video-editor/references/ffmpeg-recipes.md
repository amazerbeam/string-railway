# ffmpeg recipes

**Scope.** These commands were **run on this machine against ffmpeg 9.0.1 on 2026-09-04** and
produced the stated output. What is structural here — the filter chains, the reasons behind each
flag, the failure modes — holds across versions. What does not: exact encoder names and hardware
encoder availability, which vary by build and GPU. Re-check those, not the chains.

Paths use PowerShell. ffmpeg is on the **user** PATH; a shell older than the install needs:

```powershell
$env:Path = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-full_build\bin;$env:Path"
```

---

## Inspect

Always the first command run against any input.

```powershell
ffprobe -v error -show_entries stream=index,codec_type,codec_name,width,height,r_frame_rate,duration -of csv=p=0 <input>
ffprobe -v error -show_entries format=duration,size,bit_rate -of default=nw=1 <input>
```

Two audio streams means OBS was set to separate tracks — track 0 is the mic, track 1 the desktop.
One stream means they are mixed, and voice processing will hit the game audio too; say so rather
than proceeding as if the levels are separable.

**Check the voice level before editing anything:**

```powershell
ffmpeg -i <input> -map 0:a:0 -af "volumedetect" -f null - 2>&1 | Select-String "max_volume|mean_volume"
```

A `max_volume` at or very near `0.0 dB` means clipping — distortion that no amount of processing
removes. A `mean_volume` below about −40 dB means the mic was barely picking up. Either is a
re-shoot; stop and say so.

## Extract the audio for transcription

Whisper wants mono 16 kHz. Doing the conversion here rather than letting Whisper do it internally
makes the step repeatable and keeps the file for reuse across re-cuts.

```powershell
ffmpeg -y -i <input> -map 0:a:0 -ac 1 -ar 16000 -c:a pcm_s16le work\voice.wav
```

## Transcribe

```powershell
whisper work\voice.wav --model small --language en --output_dir work --output_format json --word_timestamps True --fp16 False
```

`--fp16 False` is required: there is no CUDA on this machine, and without it Whisper warns and falls
back on every run. `--language en` skips the detection pass. Model choice is a speed/accuracy trade —
`base` for a short, `small` when captions get burned in and a wrong word is visible forever.

The JSON carries `segments[].words[]` with `start` and `end` per word. That is the input to every cut
decision.

## Find the dead air

```powershell
ffmpeg -i work\voice.wav -af silencedetect=n=-40dB:d=0.4 -f null - 2>&1 | Select-String "silence_start|silence_end"
```

Verified: on a file with one second of tone followed by one second of silence, this reported
`silence_start: 0.999977` and `silence_end: 2`.

`-40dB` is the threshold for "this is room tone, not speech" and `d=0.4` the shortest gap worth
cutting. Below about 0.3 s the cuts start sounding clipped and unnatural; a real breath is not dead
air and removing every one of them is how an edit ends up sounding robotic.

Prefer the word timings from Whisper for cut points where both are available — silence detection
finds gaps, but word boundaries tell you whether the gap is between sentences or mid-thought.

## Cut segments and assemble

Cut each kept span, then concatenate. Two separate steps, deliberately: a stream copy cannot cut
accurately at an arbitrary point because it can only start on a keyframe, so segments that need
frame accuracy get re-encoded, and only the join is lossless.

```powershell
# one segment, frame-accurate (re-encodes)
ffmpeg -y -i raw\take.mp4 -ss 00:01:12.400 -to 00:01:31.900 -c:v libx264 -crf 18 -preset veryfast -c:a aac -b:a 192k work\seg-03.mp4
```

Then a concat list — one `file '...'` line per segment, in order — and a lossless join:

```powershell
@("file 'work\seg-01.mp4'","file 'work\seg-02.mp4'") | Out-File work\concat.txt -Encoding ascii
ffmpeg -y -f concat -safe 0 -i work\concat.txt -c copy work\assembled.mp4
```

Verified: concatenating a 2-second file with itself produced exactly 4.000000 s.

`-Encoding ascii` matters — a UTF-8 BOM in the list file makes ffmpeg fail to parse the first line,
and the error does not mention the BOM. Every segment must share codec, resolution and frame rate or
`-c copy` produces a file that plays only up to the first mismatch.

## Level the voice

```powershell
ffmpeg -y -i <input> -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 48000 work\levelled.wav
```

Verified working. −16 LUFS with a −1.5 dB true peak ceiling suits both YouTube and phone speakers.
A two-pass loudnorm is more accurate but not worth the extra render for a talking head; single pass
is fine here.

## Reframe to vertical (9:16)

Blurred backdrop, original centred on top. This is the one chain that is easy to get wrong.

```powershell
ffmpeg -y -i <input> -filter_complex "[0:v]scale=-2:1920,crop=1080:1920,boxblur=20:5[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1" -c:a copy work\vertical.mp4
```

Verified: 1920×1080 in, 1080×1920 out.

**The failure to avoid:** scaling the backdrop by *width* (`scale=1080:-1`) gives a 1080×607 image,
and cropping 1080×1920 out of something 607 tall fails with `Invalid too big or non positive size`.
The backdrop must be scaled to *cover* the target — by height here — and only then cropped. This was
hit on the first attempt while testing these recipes.

`-2` rather than `-1` keeps dimensions even, which h.264 requires. `setsar=1` prevents a stretched
result when the source has a non-square pixel aspect ratio.

For gameplay footage where the important part is off-centre, crop to the action instead of centring;
a blurred backdrop around a mis-framed subject is worse than a tight crop.

## Burn captions

**See the Subtitles section at the end of this file** — it supersedes what used to be here. The
short version of why: styling an SRT directly with `force_style` looks like it works and silently
renders at the wrong scale, because the numbers are interpreted in a 384×288 space rather than in
pixels. Convert to ASS and set the real resolution first.

One thing that does carry over: path quoting inside the filter is fragile on Windows. Run from the
working directory with a relative path and the colon-in-`C:\` problem never arises. If an absolute
path is unavoidable, the colon and backslashes both need escaping.

## Look at the output

```powershell
ffmpeg -y -ss 00:00:01.0 -i out\short.mp4 -frames:v 1 work\frame-at-1s.png
```

Then Read the PNGs. Frames at the cut points and over every caption. This catches the things a log
never reports: text running off frame, a head cropped by the reframe, a cut landing mid-word.

**Seek by timestamp, not by frame number.** `-ss 00:00:01.0 -i <file> -frames:v 1` lands where you
meant; a `select='eq(n\,90)'` expression needs you to have done the frame-rate arithmetic correctly
and silently produces nothing when you have not.

**`-vsync` was removed in ffmpeg 9** — it errors with `Unrecognized option 'vsync'`. Use
`-fps_mode passthrough` where a rate mode is genuinely needed. This one is easy to carry in from
older notes and it fails the whole command, not just the flag.

## Hardware encoding

If renders get slow, check what this build offers:

```powershell
ffmpeg -hide_banner -encoders | Select-String "nvenc|qsv|amf"
```

Substitute for `libx264` and drop `-crf` in favour of the encoder's own rate control. Availability
depends on the GPU and the build, so resolve it at the time rather than trusting a note here. Quality
per bit is worse than libx264 — worth it for iteration, not for the final render of a long video.


---

## Subtitles

Every video gets them (`SKILL.md` → *Subtitles*). Two steps: build the file, then either burn it or
ship it alongside.

### Build the subtitle file from the transcript

Whisper writes SRT directly, with line-length control:

```powershell
whisper workoice.wav --model small --language en --output_dir work --output_format srt `
  --word_timestamps True --max_line_width 32 --max_line_count 2 --fp16 False
```

Verified working. **Whisper breaks lines on character count, not on clauses**, so it will happily
split "what's the / another one?" mid-phrase. For a short — where the text is large and every line is
read — rebuild the breaks from the word timings so they land on clause boundaries. For a long devlog
sidecar the automatic breaks are acceptable.

### The trap that wastes an afternoon: subtitle coordinates are not pixels

An SRT carries no styling, so the renderer invents a coordinate space for it — and that space
defaults to **384×288**, regardless of your video's real size. Every `Fontsize`, `Outline` and
`Margin` you set is interpreted in *that* space and then scaled up to the output. Against a 1080×1920
short, that is a ~5× multiplier: a "sensible" `Fontsize=16` renders enormous and runs off the top of
the frame, and a `MarginV` of 260 pushes text out of the picture entirely. **Both of those were hit
while writing this file.**

The fix is to stop letting it be inferred. Convert to ASS, rewrite the resolution header and the
style line to the real output size, then burn that:

```powershell
ffmpeg -y -loglevel error -i work\captions.srt work\captions.ass
# then set PlayResX/PlayResY to the output size and write the Style line in that same space
ffmpeg -y -loglevel error -i workertical.mp4 -vf "subtitles=work\captions-styled.ass" -c:a copy out\short.mp4
```

Proportions that verified legible on a 1080×1920 short, expressed against output height so they
scale to any target:

| Field | Value | |
|---|---|---|
| `Fontsize` | ~3.0% of height | 57 at 1920 |
| `Outline` | ~0.25% of height, minimum 3 | 4 at 1920 |
| `MarginL` / `MarginR` | ~7% of width | 75 at 1080 |
| `MarginV` | ~18% of height | 345 at 1920 — keeps text above the platform's own UI |
| `Bold` | `-1` | ASS uses -1 for true, not 1 |
| `Alignment` | `2` | bottom-centre |

Colours are ASS `&HAABBGGRR` — **blue and red are swapped** relative to HTML hex, and the leading
pair is *alpha inverted* (`00` is opaque). White text is `&H00FFFFFF`; a black outline is
`&H00000000`.

`Read` an extracted frame after burning. Every one of the failures above rendered without a single
warning in the log.

### Long-form: ship the sidecar, don't burn

For a 16:9 devlog, upload the `.srt` next to the video rather than burning it in. The viewer keeps
control, the text stays searchable and translatable, and nothing is baked into the picture. Never
leave it to the platform's auto-captions — they mangle exactly the project-specific vocabulary that
has to stay right.

---

## What the test render taught about framing

The 9:16 blurred-backdrop treatment was verified working, and it also showed its limit: a **full
desktop capture** scaled to 1080 wide inside a 1920-tall frame leaves the actual content as a small
band in the middle, unreadable on a phone.

So the treatment suits a shot that is already visually simple — a card table, a large UI element, a
face. For dense screen content, capture the window rather than the desktop, or crop into the region
that matters and accept the upscale. Deciding that at capture time costs nothing; discovering it at
edit time costs the shoot.
