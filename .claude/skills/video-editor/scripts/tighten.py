"""Cut a tightened vertical short from a master take.

Drops dead air and restarted phrases using Whisper word timings, composes a 9:16 frame
that never slices the webcam, optionally pans the crop across the clip, and re-times the
subtitles onto the new shorter timeline. One ffmpeg pass for the cut, one for the burn.

  python tighten.py <slug> <start> <end> <outdir> [options]

    --json PATH        Whisper word-timestamp JSON (default: <outdir>/work/voice.json)
    --src PATH         master recording
    --crop X[:X2]      game crop left edge; give two to pan across the clip
    --drop A-B[,A-B]   source-time ranges to remove (a restart the matcher can't see)
    --facecam X,Y,S    webcam bubble in the source (default 1598,790,285); "none" to omit

Written against the layout in obs-capture/references/obs-settings.md. Re-measure the
facecam box if the OBS scene changes — it is a source coordinate, not a constant.
"""
import argparse, io, json, os, re, subprocess, sys

FFMPEG = os.environ.get("FFMPEG_EXE", "ffmpeg")

# Whisper reliably mishears this project's vocabulary. These correct the transcriber,
# never the speaker — burned captions are shipped text and have to match what was meant.
FIXES = [(r"\bbelts\b", "bells"), (r"\bBelts\b", "Bells"), (r"\bbelt\b", "bell"),
         (r"\bmoves\b", "Moons"), (r"\bMoves\b", "Moons"),
         (r"\btree\b", "three"), (r"\bTree\b", "Three"),
         (r"\bIfa's\b", "Aoife's"), (r"\bifa's\b", "Aoife's"), (r"\bIfa\b", "Aoife")]
PROFANITY = re.compile(r"\bfuck\w*\b", re.I)
FILLER = {"um", "uh", "erm", "eh", "hmm", "mm", "ah"}

# The developer says one of these to abandon a take and start the point over. Everything
# from the start of that sentence up to the marker goes, and the marker goes with it.
RETAKE_MARKERS = {"again", "scrap", "restart"}

# Talk aimed at the editor, not the audience. Never ships.
META = re.compile(r"i'?m going to (explain|do that|stop|go again)|let me go|start over|"
                  r"i need to do that now|okay,? explain|scrap (all )?that|i forgot to explain",
                  re.I)

MAX_GAP = 0.20   # longest silence left between words
PAD = 0.05       # breathing room at the head of a kept run
TAIL_PAD = 0.22  # breathing room at the tail — a cut on the final consonant sounds clipped
LIST_GAP = 0.40  # a spoken list needs its rhythm; do not close gaps after a comma this hard
SILENCE_DB = -40
MIN_SILENCE = 0.30  # real silence this long is cut even if it sits inside one "word"
W, H = 1080, 1920
GAME_W, GAME_H = 1660, 1010   # region of the source that holds the game
GAME_Y = 60


def run(args):
    p = subprocess.run(args, capture_output=True, text=True)
    if p.returncode != 0:
        sys.stderr.write(p.stderr[-2000:])
        raise SystemExit("ffmpeg failed")


def norm(w):
    return re.sub(r"[^a-z0-9']", "", w.lower())


def load_words(path, a, b):
    data = json.load(io.open(path, encoding="utf-8"))
    out = []
    for seg in data["segments"]:
        for w in seg.get("words", []):
            if w["end"] > a and w["start"] < b:
                out.append({"s": max(w["start"], a), "e": min(w["end"], b),
                            "w": w["word"], "n": norm(w["word"])})
    return out


def drop_restarts(words):
    """A restart is an n-gram repeated soon after itself. Keep the LATER take."""
    keep = [True] * len(words)
    n = [w["n"] for w in words]
    for k in range(8, 2, -1):
        i = 0
        while i + k <= len(n):
            if not keep[i]:
                i += 1; continue
            window = n[i:i + k]
            if any(not x for x in window):
                i += 1; continue
            found = None
            for j in range(i + k, min(i + k + 14, len(n) - k + 1)):
                if n[j:j + k] == window and all(keep[j:j + k]):
                    found = j; break
            # A repeat that spans a completed sentence is not a restart — it is two
            # sentences that happen to share a phrase. Dropping across it splices words
            # into something the speaker never said, which is worse than leaving it in.
            if found is not None and not any(
                    re.search(r"[.!?]$", words[d]["w"].strip()) for d in range(i, found)):
                for d in range(i, found):
                    keep[d] = False
                i = found
            else:
                i += 1
    # "again" / "scrap that" means: that attempt is dead, start the sentence over.
    # Drop back to the previous sentence boundary, and drop the marker itself.
    for idx, w in enumerate(words):
        if w["n"] in RETAKE_MARKERS:
            keep[idx] = False
            j = idx - 1
            # walk back over any trailing fragment to the end of the last full sentence...
            while j >= 0 and not re.search(r"[.!?]$", words[j]["w"].strip()):
                keep[j] = False
                j -= 1
            # ...then drop that whole sentence too: it is the attempt being abandoned.
            if j >= 0:
                keep[j] = False
                j -= 1
                while j >= 0 and not re.search(r"[.!?]$", words[j]["w"].strip()):
                    keep[j] = False
                    j -= 1

    for idx, w in enumerate(words):
        if w["n"] in FILLER:
            keep[idx] = False
    return keep


def drop_meta(words, keep):
    """Remove sentences addressed to the editor rather than to the audience."""
    bounds, start = [], 0
    for i, w in enumerate(words):
        if re.search(r"[.!?]$", w["w"].strip()) or i == len(words) - 1:
            bounds.append((start, i)); start = i + 1
    for a, b in bounds:
        text = "".join(w["w"] for w in words[a:b + 1])
        if META.search(text):
            for i in range(a, b + 1):
                keep[i] = False
    return keep


def detect_silence(ffmpeg, wav):
    """Whisper sometimes stretches a word across a pause, hiding it from the word timings."""
    p = subprocess.run([ffmpeg, "-hide_banner", "-i", wav, "-af",
                        "silencedetect=n=%ddB:d=%.2f" % (SILENCE_DB, MIN_SILENCE),
                        "-f", "null", "-"], capture_output=True, text=True)
    out, starts = [], []
    for line in p.stderr.splitlines():
        m = re.search(r"silence_start:\s*([\d.]+)", line)
        if m:
            starts.append(float(m.group(1)))
        m = re.search(r"silence_end:\s*([\d.]+)", line)
        if m and starts:
            out.append((starts.pop(), float(m.group(1))))
    return out


def subtract_silence(spans, silence):
    """Carve detected silence out of the kept spans, leaving a short natural beat."""
    keepms = 0.12
    result = []
    for s, e in spans:
        pieces = [[s, e]]
        for ss, se in silence:
            nxt = []
            for a, b in pieces:
                if se <= a or ss >= b:
                    nxt.append([a, b]); continue
                if ss > a:
                    nxt.append([a, min(ss + keepms, b)])
                if se < b:
                    nxt.append([max(se - keepms, a), b])
            pieces = [p for p in nxt if p[1] - p[0] > 0.08]
        result.extend(pieces)
    return result


def build_spans(words, keep):
    kept = [w for w, k in zip(words, keep) if k]
    if not kept:
        raise SystemExit("nothing left after tightening")
    spans, cs, ce = [], kept[0]["s"], kept[0]["e"]
    prev = kept[0]
    for w in kept[1:]:
        # a list ("Moons, keys, and bells") needs its beats; closing them hard sounds wrong
        limit = LIST_GAP if prev["w"].strip().endswith(",") else MAX_GAP
        if w["s"] - ce <= limit:
            ce = w["e"]
        else:
            spans.append([cs, ce]); cs, ce = w["s"], w["e"]
        prev = w
    spans.append([cs, ce])
    for sp in spans:
        sp[0] = max(0, sp[0] - PAD); sp[1] += TAIL_PAD
    merged = [spans[0]]
    for sp in spans[1:]:
        if sp[0] <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], sp[1])
        else:
            merged.append(sp)
    return merged, kept


def srt_time(t):
    h = int(t // 3600); m = int((t % 3600) // 60); s = int(t % 60)
    return "%02d:%02d:%02d,%03d" % (h, m, s, int(round((t - int(t)) * 1000)))


def remap(t, spans):
    off = 0.0
    for s, e in spans:
        if t < s:
            return off
        if t <= e:
            return off + (t - s)
        off += e - s
    return off


def write_srt(kept, spans, path, max_chars=32):
    lines, cur, start = [], [], None

    def emit(end):
        text = "".join(cur).strip()
        for pat, rep in FIXES:
            text = re.sub(pat, rep, text)
        text = PROFANITY.sub("[--]", text)
        if text:
            lines.append((start, end, text))

    for w in kept:
        ns, ne = remap(w["s"], spans), remap(w["e"], spans)
        if start is None:
            start = ns
        cur.append(w["w"])
        joined = "".join(cur).strip()
        if (len(joined) >= max_chars and re.search(r"[.,!?]$", w["w"].strip())) \
                or len(joined) >= max_chars * 1.6:
            emit(ne); cur, start = [], None
    if cur:
        emit(remap(kept[-1]["e"], spans))

    with io.open(path, "w", encoding="utf-8") as f:
        for i, (s, e, t) in enumerate(lines, 1):
            f.write("%d\n%s --> %s\n%s\n\n" % (i, srt_time(s), srt_time(max(e, s + 0.6)), t))
    return len(lines)


def style_ass(src, dst):
    s = io.open(src, encoding="utf-8").read()
    s = re.sub(r"PlayResX:\s*\d+", "PlayResX: %d" % W, s)
    s = re.sub(r"PlayResY:\s*\d+", "PlayResY: %d" % H, s)
    style = ("Style: Default,Arial,{fs},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,"
             "100,100,0,0,1,5,0,2,{ml},{ml},{mv},1").format(
        fs=int(H * 0.031), ml=int(W * 0.06), mv=int(H * 0.10))
    io.open(dst, "w", encoding="utf-8").write(re.sub(r"Style: Default,[^\n]*", style, s))


def compose(sel, crop, facecam, dur):
    """Blurred cover, game panel, and the webcam re-placed so a crop can never slice it."""
    x0, x1 = crop
    # linear pan across the finished clip when two positions are given
    xexpr = str(x0) if x0 == x1 else "%d+(%d)*t/%.3f" % (x0, x1 - x0, max(dur, 0.1))
    # The webcam is composited into the recording by OBS, so the game layer contains it too.
    # Paint it out of the game layer before scaling, or it appears twice — once whole in the
    # overlay below, once sliced by the crop.
    mask = ""
    if facecam:
        fx, fy, fs = facecam
        mask = ",drawbox=x=%d:y=%d:w=%d:h=%d:color=0x0E1A13@1:t=fill" % (fx - 6, fy - 6, fs + 12, fs + 12)
    parts = [
        "[0:v]select='%s',setpts=N/FRAME_RATE/TB[cut]" % sel,
        "[cut]split=3[bgsrc][gamesrc0][camsrc]",
        "[gamesrc0]null%s[gamesrc]" % mask,
        "[bgsrc]scale=-2:%d,crop=%d:%d,boxblur=24:6[bg]" % (H, W, H),
        "[gamesrc]crop=%d:%d:x='%s':y=%d,scale=%d:-2[game]" % (GAME_W, GAME_H, xexpr, GAME_Y, W),
        "[bg][game]overlay=(W-w)/2:470[base]",
    ]
    if facecam:
        fx, fy, fs = facecam
        parts += [
            "[camsrc]crop=%d:%d:%d:%d,scale=300:300[cam]" % (fs, fs, fx, fy),
            "[base][cam]overlay=W-320:1180,setsar=1[v]",
        ]
    else:
        parts += ["[camsrc]nullsink", "[base]setsar=1[v]"]
    parts.append("[0:a]aselect='%s',asetpts=N/SR/TB,loudnorm=I=-16:TP=-1.5:LRA=11[a]" % sel)
    return ";".join(parts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug"); ap.add_argument("start", type=float)
    ap.add_argument("end", type=float); ap.add_argument("outdir")
    ap.add_argument("--src", required=True)
    ap.add_argument("--json", default=None)
    ap.add_argument("--crop", default="150")
    ap.add_argument("--drop", default="")
    ap.add_argument("--facecam", default="1598,790,285")
    a = ap.parse_args()

    work = os.path.join(a.outdir, "work"); out = os.path.join(a.outdir, "out")
    os.makedirs(work, exist_ok=True); os.makedirs(out, exist_ok=True)
    jpath = a.json or os.path.join(work, "voice.json")

    crop = [int(v) for v in a.crop.split(":")]
    if len(crop) == 1:
        crop *= 2
    facecam = None
    if a.facecam.lower() != "none":
        facecam = [int(v) for v in a.facecam.split(",")]

    words = load_words(jpath, a.start, a.end)
    keep = drop_restarts(words)
    keep = drop_meta(words, keep)
    for part in filter(None, a.drop.split(",")):
        ds, de = (float(v) for v in part.split("-"))
        for i, w in enumerate(words):
            if w["s"] >= ds - 0.01 and w["e"] <= de + 0.01:
                keep[i] = False

    spans, kept = build_spans(words, keep)

    # Whisper can stretch a word across a pause, so the word timings alone leave dead air.
    # Carve out anything the audio says is actually silent.
    wav = os.path.join(work, "voice.wav")
    if os.path.exists(wav):
        sil = [(s, e) for s, e in detect_silence(FFMPEG, wav)
               if a.start <= s <= a.end or a.start <= e <= a.end]
        if sil:
            spans = subtract_silence(spans, sil)

    total = sum(e - s for s, e in spans)
    sel = "+".join("between(t,%.3f,%.3f)" % (s, e) for s, e in spans)

    tight = os.path.join(work, a.slug + "-tight.mp4")
    run([FFMPEG, "-y", "-loglevel", "error", "-i", a.src,
         "-filter_complex", compose(sel, crop, facecam, total),
         "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "18",
         "-preset", "veryfast", "-c:a", "aac", "-b:a", "192k", tight])

    srt = os.path.join(work, a.slug + ".srt")
    n = write_srt(kept, spans, srt)
    ass = os.path.join(work, a.slug + ".ass"); ass2 = os.path.join(work, a.slug + "-styled.ass")
    run([FFMPEG, "-y", "-loglevel", "error", "-i", srt, ass])
    style_ass(ass, ass2)

    final = os.path.join(out, a.slug + ".mp4")
    cwd = os.getcwd(); os.chdir(work)
    run([FFMPEG, "-y", "-loglevel", "error", "-i", tight, "-vf",
         "subtitles=" + os.path.basename(ass2), "-c:a", "copy",
         "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", final])
    os.chdir(cwd)

    print("%-24s %5.1fs -> %5.1fs  (%d/%d words dropped, %d cuts, %d captions)"
          % (a.slug, a.end - a.start, total, sum(1 for k in keep if not k),
             len(words), len(spans), n))


if __name__ == "__main__":
    main()
