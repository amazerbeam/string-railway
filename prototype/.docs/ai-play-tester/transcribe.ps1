# Transcribe a play-session recording to text.
#
#   .\transcribe.ps1 .\session-1.m4a
#   .\transcribe.ps1 .\session-1.m4a -Model medium
#
# Writes <name>.txt and <name>.srt beside the recording. The .srt carries timestamps,
# which is what makes "I got bored around here" locatable.
#
# Models, smallest to largest: tiny, base, small, medium, large-v3.
# "small" is the sweet spot for one person narrating in a quiet room; step up to
# "medium" if game audio is bleeding into the mic.

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string] $Path,

    [string] $Model = "small",

    [string] $OutDir
)

$ErrorActionPreference = "Stop"

# ffmpeg was installed by winget, which puts it on the user PATH. A terminal that was
# already open when it was installed will not see it, so top the PATH up here.
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    $links = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links"
    $pkg = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
    $bin = Get-ChildItem -Path $pkg -Filter "ffmpeg.exe" -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($bin) { $env:Path = "$($bin.DirectoryName);$env:Path" }
    elseif (Test-Path $links) { $env:Path = "$links;$env:Path" }

    if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
        Write-Error "ffmpeg is not on PATH. Install it with: winget install Gyan.FFmpeg"
    }
}

if (-not (Test-Path -LiteralPath $Path)) {
    Write-Error "No file at $Path"
}

$file = (Resolve-Path -LiteralPath $Path).Path
if (-not $OutDir) { $OutDir = Split-Path -Parent $file }

Write-Host "Transcribing $(Split-Path -Leaf $file) with the '$Model' model..."
Write-Host "The first run of a model downloads it (a few hundred MB) and then caches it."

# Whisper writes its progress bar to stderr. PowerShell turns a native command's stderr
# into error records, which would abort the run under "Stop" even on a clean exit — so
# judge success by the exit code instead.
$prev = $ErrorActionPreference
$ErrorActionPreference = "Continue"
python -m whisper $file `
    --model $Model `
    --language en `
    --output_dir $OutDir `
    --output_format all `
    --fp16 False
$code = $LASTEXITCODE
$ErrorActionPreference = $prev

if ($code -ne 0) { Write-Error "Whisper exited with code $code" }

$base = [System.IO.Path]::GetFileNameWithoutExtension($file)
Write-Host ""
Write-Host "Done. Text: $(Join-Path $OutDir "$base.txt")"
Write-Host "      Timestamped: $(Join-Path $OutDir "$base.srt")"
