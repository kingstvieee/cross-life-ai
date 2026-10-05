#!/usr/bin/env bash
set -euo pipefail

# Assemble one uninterrupted video from the approved Toronto opening and a
# separately reviewed moving continuation. The continuation must begin on the
# frame exported at 26.0 seconds from guardian-launch-synced-v4.mp4.
# Usage: ./scripts/assemble-guardian-finale.sh continuation.mp4 output.mp4

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 approved-continuation.mp4 output.mp4" >&2
  exit 2
fi

continuation=$1
output=$2
opening="$(cd "$(dirname "$0")/.." && pwd)/public/video/guardian-launch-synced-v4.mp4"

if [[ ! -f "$continuation" || ! -f "$opening" ]]; then
  echo "Both the opening and approved continuation must exist." >&2
  exit 2
fi

duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$continuation")
awk -v d="$duration" 'BEGIN { exit !(d >= 5 && d <= 30) }' || {
  echo "Continuation must run between 5 and 30 seconds." >&2
  exit 2
}

dimensions=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$continuation")
awk -F, 'BEGIN { ok=0 } { ok=($1 > 0 && $2 > 0 && $2/$1 > 1.6 && $2/$1 < 1.9) } END { exit !ok }' <<< "$dimensions" || {
  echo "Continuation must be portrait video close to 9:16; got $dimensions." >&2
  exit 2
}

# Cut on the exact 26.0-second source frame used to start the continuation.
# A dissolve would superimpose two Guardian poses and break the single-shot illusion.
ffmpeg -hide_banner -loglevel error -y -i "$opening" -i "$continuation" \
  -filter_complex '[0:v]trim=duration=26.0,setpts=PTS-STARTPTS,fps=24,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,format=yuv420p[opening];[1:v]setpts=PTS-STARTPTS,fps=24,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,format=yuv420p[finale];[opening][finale]concat=n=2:v=1:a=0,format=yuv420p[v]' \
  -map '[v]' -an -c:v libx264 -crf 18 -preset medium -movflags +faststart "$output"

echo "Wrote $output"
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 "$output"
