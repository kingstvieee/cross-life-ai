#!/usr/bin/env bash
# Assemble a visually approved continuation. This does NOT grant visual approval
# or switch web/native startup assets. The persistent app soundtrack owns audio.
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
export GUARDIAN_DEFAULT_SOURCE="$script_dir/../public/video/guardian-launch-synced-v4.mp4"
exec python3 - "$@" <<'PY'
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

def fail(message):
    raise SystemExit(f"Guardian assembly blocked: {message}")

if len(sys.argv) != 3:
    fail("usage: assemble-guardian-finale.sh approved-continuation.mp4 output.mp4")
for tool in ("ffmpeg", "ffprobe"):
    if not shutil.which(tool):
        fail(f"{tool} is required")
source = Path(os.environ.get("GUARDIAN_SOURCE", os.environ["GUARDIAN_DEFAULT_SOURCE"])).resolve()
continuation = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2]).resolve()
if output in (source, continuation):
    fail("output must not replace either input")
if output.suffix.lower() != ".mp4":
    fail("output must be an MP4")
if output.exists():
    fail("output already exists; choose a new path for review")

def probe(path):
    if not path.is_file():
        fail(f"missing input: {path.name}")
    result = subprocess.run([
        "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)
    ], capture_output=True, text=True)
    if result.returncode:
        fail(f"cannot decode {path.name}")
    data = json.loads(result.stdout)
    video = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    if not video:
        fail(f"no video stream in {path.name}")
    duration = float(video.get("duration", data["format"].get("duration", 0)))
    if not math.isfinite(duration) or duration <= 0:
        fail(f"invalid duration in {path.name}")
    return video, duration

opening, opening_duration = probe(source)
finale, finale_duration = probe(continuation)
handoff = 25.50
if opening_duration <= handoff:
    fail("opening must extend beyond the audited 25.50s handoff")
if not 15 <= finale_duration <= 20.1:
    fail("continuation must match the locked 15–20s target")
for name, stream in (("opening", opening), ("continuation", finale)):
    width, height = stream["width"], stream["height"]
    if width < 720 or height < 1280 or abs(width / height - 9 / 16) > 0.005:
        fail(f"{name} must be portrait 9:16 at 720×1280 or better")
    if stream.get("tags", {}).get("rotate") not in (None, "0") or any(
        s.get("rotation", 0) != 0 for s in stream.get("side_data_list", [])
    ):
        fail(f"{name} has rotation metadata; normalize it before assembly")

output.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix=".guardian-assembly-", dir=output.parent) as work:
    temporary = Path(work) / "master.mp4"
    filters = (
        f"[0:v:0]trim=end={handoff},setpts=PTS-STARTPTS,"
        "scale=720:1280,setsar=1,fps=20,format=yuv420p[opening];"
        "[1:v:0]setpts=PTS-STARTPTS,scale=720:1280,setsar=1,fps=20,format=yuv420p[finale];"
        "[opening][finale]concat=n=2:v=1:a=0[master]"
    )
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-n",
        "-i", str(source), "-i", str(continuation), "-filter_complex", filters,
        "-map", "[master]", "-an", "-c:v", "libx264", "-crf", "18",
        "-preset", "medium", "-movflags", "+faststart", str(temporary)
    ], check=True)
    master, duration = probe(temporary)
    expected = handoff + finale_duration
    if abs(duration - expected) > 0.15:
        fail(f"assembled duration {duration:.2f}s does not match expected {expected:.2f}s")
    # Link atomically without ever overwriting a file created during the render.
    os.link(temporary, output)
print(f"Assembled {output.name}: {duration:.2f}s, 720×1280, 20fps, H.264.")
print("Visual QA pending: identity, Toronto/CN Tower, seven summoned portals, seam and Hub handoff.")
print("Web/native launch sources were not switched. Audio remains the app soundtrack.")
PY
