#!/usr/bin/env python3
"""Stage owner-approved QA-corrected DIGGITSTAAR cinematic media into the native Expo route.
This requires the exact ZIP artifact. Never use substitutes or spend EAS slots.
"""
import argparse,hashlib,os,sys,tempfile,zipfile
from pathlib import Path
HERE=Path(__file__).resolve().parent.parent
FRONT=HERE/'frontend'
SOURCES=FRONT/'lib/staarwardd/diggitstaar-cinematic-sources.ts'
MEDIA={
 'diggitstaar-workstation-wide.mp4':('media/diggitstaar-workstation-wide.mp4','ae332c06259a1a6b2ee88621b54da27053914722152063989513c38d84d27f3e'),
 'diggitstaar-workstation-portrait.mp4':('media/diggitstaar-workstation-portrait.mp4','fa76692e436d31441e146b546e02b4f8bd452cbe8a32a3df41f4bab555d78811')
}
STUB="""/** Fail-closed: staging the owner-approved ZIP populates these require() sources. */
export const DIGGITSTAAR_MEDIA_WIDE: number | null = null;
export const DIGGITSTAAR_MEDIA_PORTRAIT: number | null = null;
export const DIGGITSTAAR_MEDIA_READY = DIGGITSTAAR_MEDIA_WIDE !== null && DIGGITSTAAR_MEDIA_PORTRAIT !== null;
"""
READY="""/** Exact approved cinematic masters; verify hashes with stage_diggitstaar_cinematic.py --check. */
export const DIGGITSTAAR_MEDIA_WIDE: number | null = require('@/assets/videos/diggitstaar-workstation-wide.mp4');
export const DIGGITSTAAR_MEDIA_PORTRAIT: number | null = require('@/assets/videos/diggitstaar-workstation-portrait.mp4');
export const DIGGITSTAAR_MEDIA_READY = DIGGITSTAAR_MEDIA_WIDE !== null && DIGGITSTAAR_MEDIA_PORTRAIT !== null;
"""
def sha(b):return hashlib.sha256(b).hexdigest()
def die(x):raise SystemExit('BLOCKED (no changes): '+x)
def main():
 p=argparse.ArgumentParser()
 p.add_argument('zip',nargs='?',help='Exact owner-approved DIGGITSTAAR_HOLOGRAPHIC_QA_FIXED_STAR_HUB_INSTALLER.zip')
 p.add_argument('--check',action='store_true',help='Verify current Expo source and installed media')
 a=p.parse_args()
 if not SOURCES.is_file():die('source gate missing')
 source=SOURCES.read_text()
 if a.check:
  if source!=READY:die('approved media not activated')
  for filename,(_,digest) in MEDIA.items():
   target=FRONT/'assets/videos'/filename
   if not target.is_file() or sha(target.read_bytes())!=digest:die('missing/modified media: '+filename)
  print('PASS: exact media hashes, source declarations, and two playable file paths present. No EAS build run.')
  return
 if not a.zip:die('provide full corrected production ZIP')
 if source not in (STUB,READY):die('source file differs from safe staging revision')
 zip_path=Path(a.zip)
 if not zip_path.is_file():die('ZIP does not exist')
 payloads={}
 with zipfile.ZipFile(zip_path,'r') as z:
  for filename,(member,digest) in MEDIA.items():
   if member not in z.namelist():die('missing required media: '+member)
   b=z.read(member)
   if sha(b)!=digest:die('incorrect or modified media hash: '+filename)
   payloads[filename]=b
 for filename,b in payloads.items():
  target=FRONT/'assets/videos'/filename
  if target.exists() and sha(target.read_bytes())!=sha(b):die('refusing to overwrite an unrelated local asset: '+filename)
 if source==READY:
  for filename,b in payloads.items():
   if not (FRONT/'assets/videos'/filename).is_file():die('source activated but asset missing: '+filename)
  print('PASS: already staged; no changes made.')
  return
 # Pre-validate permissions before writing; all media known-good at this point.
 video_dir=FRONT/'assets/videos'
 video_dir.mkdir(parents=True,exist_ok=True)
 for filename,b in payloads.items():
  target=video_dir/filename
  if not target.exists():
   with tempfile.NamedTemporaryFile(dir=video_dir,delete=False) as f:
    tmp=Path(f.name);f.write(b);f.flush();os.fsync(f.fileno())
   os.replace(tmp,target)
 SOURCES.write_text(READY)
 print('STAGED: 2 exact SHA-256-verified video masters. Existing 3D workstation, nine portal artwork and Guardian film unchanged.')
 print('Next: run node tests and TypeScript; physical device playback remains required before TestFlight.')
if __name__=='__main__':main()
