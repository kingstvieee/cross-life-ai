"""Assemble existing Guardian footage; no generation, interpolation or face edits.
Usage: python frontend/scripts/assemble-guardian-startup.py /path/to/magnific-s7cD1fLl8e.mp4
Requires ffmpeg. The supplied finale is the existing Do5NoNJpcl clip retimed to 0.8x.
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/video'
finale = Path(sys.argv[1]).resolve()
# 5s is the original frame used as Magnific's first-frame reference. Continuing
# after 25.5s instead jumps back to a different camera position and scene.
subprocess.run([
    'ffmpeg', '-y', '-v', 'error',
    '-i', str(OUT / 'guardian-launch-synced-v4.mp4'), '-i', str(finale),
    '-filter_complex',
    '[0:v]trim=duration=5,setpts=PTS-STARTPTS,fps=24,setsar=1[a];'
    '[1:v]setpts=PTS-STARTPTS,scale=720:1280:force_original_aspect_ratio=decrease,'
    'pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24[b];'
    '[a][b]concat=n=2:v=1:a=0,tpad=stop_mode=clone:stop_duration=1[v]',
    '-map', '[v]', '-an', '-c:v', 'libx264', '-profile:v', 'baseline',
    '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart',
    str(OUT / 'guardian-launch-continuous-v5.mp4'),
], check=True)
subprocess.run([
    'ffmpeg', '-y', '-v', 'error', '-i', str(OUT / 'guardian-launch-continuous-v5.mp4'),
    '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '30', '-row-mt', '1',
    str(OUT / 'guardian-launch-continuous-v5.webm'),
], check=True)
subprocess.run([
    'ffmpeg', '-y', '-v', 'error', '-i', str(OUT / 'guardian-launch-continuous-v5.mp4'),
    '-frames:v', '1', str(OUT / 'guardian-launch-continuous-v5-poster.jpg'),
], check=True)
