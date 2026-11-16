"""Build 192: private, offline Guardian facial-capture intake verification.

Validates file structure and integrity, NOT biometric identity, device provenance,
visual likeness, rights, or final 3D production acceptance. Never unzips files.
"""
from __future__ import annotations
import hashlib, json, re, stat, sys, zipfile
from pathlib import Path

POSES=("front","left45","left90","right45","right90","headturn","viseme")
PHOTOS=set(POSES[:5])
STILLS=("d624c47089583f4bcdc5d9bd8af6edb8e08c92e3242b5a21edd7cef337c4df9a",
 "e3ae18bfe6b93ea441c2057b13cd96fe98f744c6766b18c362b9e6a1696cd0dd",
 "bcc685ea738dabd39985445fe8bd9862913cdbd494dd47acad6686f92be82ff2")
FACES={"primary":"650434c4b2be625852b195c98e47dc25a551e2949ecd7951cd016c933b4d6886",
 "secondary":"35b4ddc162583c034dc1e60c6ab6d0c3db0c391a50f9b6db1be2e567575c68b9"}

def jpeg_dimensions(b):
 if not b.startswith(b"\xff\xd8"):return None
 i=2
 while i+7<len(b):
  if b[i]!=255:return None
  while i<len(b) and b[i]==255:i+=1
  if i>=len(b):return None
  marker=b[i];i+=1
  if marker in (0xd8,0xd9,1) or 0xd0<=marker<=0xd7:continue
  if i+2>len(b):return None
  n=int.from_bytes(b[i:i+2],"big")
  if n<2 or i+n>len(b):return None
  if marker in (0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf):
   return (int.from_bytes(b[i+3:i+5],"big"),int.from_bytes(b[i+5:i+7],"big")) if n>=7 else None
  if marker==0xda:return None
  i+=n
 return None

def inspect_capture_zip(filename):
 errors=[];warnings=[];records={}
 fail=errors.append
 result={"schema":"staar-build192-capture-integrity-v1","integrityPassed":False,
  "manualReviewReady":False,"ownerIdentityVerified":False,"physicalDeviceVerified":False,
  "finalRigApproved":False,"errors":errors,"warnings":warnings,"files":records}
 try:
  if Path(filename).stat().st_size>700*1024**2:fail("Archive exceeds 700 MiB cap");return result
  with zipfile.ZipFile(filename) as z:
   entries=z.infolist();names=[i.filename for i in entries]
   if len(entries)>12 or len(names)!=len(set(names)):fail("Extra or duplicate archive entries")
   if sum(i.file_size for i in entries)>700*1024**2:fail("Uncompressed data exceeds limit")
   for item in entries:
    name=item.filename
    if name.startswith("/") or "\\" in name or ".." in name.split("/") or stat.S_ISLNK(item.external_attr>>16):
     fail("Unsafe path or link: "+name)
    if name not in ("manifest.json","INSTRUCTIONS.txt") and not re.fullmatch(
     r"captures/(front|left45|left90|right45|right90)\.jpg|captures/(headturn|viseme)\.(mov|mp4|video)",name):
     fail("Unexpected file: "+name)
    if item.flag_bits&1:fail("Encrypted file: "+name)
   if "manifest.json" not in names:fail("Manifest missing");return result
   if z.getinfo("manifest.json").file_size>262144:fail("Manifest too large");return result
   m=json.loads(z.read("manifest.json"))
   if m.get("schema")!="staarwardd-build191-identity-source-capture-v1":fail("Incorrect manifest schema")
   if m.get("approvedVisualStillsSha256")!=list(STILLS):fail("Approved portraits mismatch")
   if m.get("realPhotoSourceHashes")!=FACES:fail("Real-face source binding mismatch")
   if m.get("final3DRigAccepted") is not False or m.get("originalPhotosIncluded") is not False:
    fail("Unverified production or source-photo claim")
   files=m.get("files")
   if not isinstance(files,list) or len(files)!=7:fail("Seven record slots required");return result
   by={x.get("pose"):x for x in files if isinstance(x,dict)}
   if set(by)!=set(POSES):fail("Missing or duplicated capture pose")
   for pose in POSES:
    x=by.get(pose)
    if not x or x.get("status")!="provided":fail("Missing pose: "+pose);continue
    name=x.get("filename")
    fmt=(rf"captures/{pose}\.jpg" if pose in PHOTOS else rf"captures/{pose}\.(mp4|mov|video)")
    if not isinstance(name,str) or not re.fullmatch(fmt,name) or name not in names:
     fail("Missing or mismatched binary: "+pose);continue
    item=z.getinfo(name)
    limit=(32 if pose in PHOTOS else 260)*1024**2
    if item.file_size<64 or item.file_size>limit:fail("Size limit: "+pose);continue
    digest=hashlib.sha256();header=bytearray();length=0
    with z.open(name) as stream:
     while True:
      chunk=stream.read(1024*1024)
      if not chunk:break
      length+=len(chunk);digest.update(chunk)
      if len(header)<65536:header.extend(chunk[:65536-len(header)])
    actual=digest.hexdigest()
    if length!=item.file_size or x.get("sizeBytes")!=length:fail("Size mismatch: "+pose)
    if x.get("sha256") is None:warnings.append("Client hash unavailable; locally computed: "+pose)
    elif x.get("sha256")!=actual:fail("SHA mismatch: "+pose)
    if pose in PHOTOS:
     dims=jpeg_dimensions(header)
     if not dims or min(dims)<720:fail("Insufficient JPEG dimensions: "+pose)
    elif len(header)<12 or header[4:8] not in (b"ftyp",b"moov",b"wide",b"mdat",b"free"):
     fail("Unrecognized video container: "+pose)
    records[pose]={"filename":name,"sha256":actual,"bytes":length,
     "inspection":"header and integrity only; not a verified real person or device"}
   if m.get("complete") is not True or m.get("captureCount")!=7:fail("Capture incomplete")
 except (OSError,zipfile.BadZipFile,json.JSONDecodeError,KeyError,TypeError,ValueError) as e:
  fail("Archive could not be inspected: "+e.__class__.__name__)
 result["integrityPassed"]=not errors
 result["manualReviewReady"]=not errors and len(records)==7
 return result

if __name__=="__main__":
 info=inspect_capture_zip(sys.argv[1]) if len(sys.argv)>1 else {"error":"Specify local capture ZIP"}
 print(json.dumps(info,indent=2))
 sys.exit(0 if info.get("manualReviewReady") else 1)
