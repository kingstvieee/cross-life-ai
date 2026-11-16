"""All fixtures are synthetic, not actual Guardian photographs or captured videos."""
import hashlib, io, json, sys, tempfile, unittest, zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from guardian_capture_intake import inspect_capture_zip, STILLS, FACES, POSES

def jpeg(n=800):
 return (b"\xff\xd8\xff\xe0\x00\x04JF\xff\xc0\x00\x11\x08"+n.to_bytes(2,"big")*2+
 b"\x03\x01\x11\x00\x02\x11\x00\x03\x11\x00"+b"X"*100+b"\xff\xd9")

def make_zip(path,mode=""):
 manifest={"schema":"staarwardd-build191-identity-source-capture-v1",
 "approvedVisualStillsSha256":list(STILLS),"realPhotoSourceHashes":FACES,
 "final3DRigAccepted":False,"originalPhotosIncluded":False,
 "captureCount":7,"complete":True,"files":[]}
 files={}
 for pose in POSES:
  photo=pose not in ("headturn","viseme")
  name="captures/"+pose+(".jpg" if photo else ".mp4")
  data=jpeg(640 if mode=="small" and pose=="front" else 800) if photo else b"\x00\x00\x00\x18ftypisom"+b"x"*100
  files[name]=data
  claimed=hashlib.sha256(data).hexdigest()
  if mode=="tamper" and pose=="front":claimed="0"*64
  manifest["files"].append({"pose":pose,"status":"provided","filename":name,
   "sizeBytes":len(data),"sha256":claimed})
 if mode=="missing":files.pop("captures/left90.jpg")
 if mode=="incomplete":manifest["files"][0]["status"]="missing";manifest["complete"]=False
 if mode=="traversal":files["../malicious.txt"]=b"reject"
 files["manifest.json"]=json.dumps(manifest).encode()
 with zipfile.ZipFile(path,"w") as z:
  for name,data in files.items():z.writestr(name,data)

class TestCapture(unittest.TestCase):
 def verify(self,mode=""):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"capture.zip";make_zip(p,mode);return inspect_capture_zip(p)
 def test_complete_archive_is_review_only(self):
  r=self.verify()
  self.assertTrue(r["integrityPassed"],r["errors"])
  self.assertTrue(r["manualReviewReady"])
  self.assertFalse(r["ownerIdentityVerified"])
  self.assertFalse(r["finalRigApproved"])
  self.assertEqual(len(r["files"]),7)
 def test_reject_tampered_hash(self):
  self.assertIn("SHA mismatch: front",self.verify("tamper")["errors"])
 def test_reject_missing_profile(self):
  self.assertTrue(any("Missing" in x for x in self.verify("missing")["errors"]))
 def test_reject_insufficient_photo(self):
  self.assertIn("Insufficient JPEG dimensions: front",self.verify("small")["errors"])
 def test_reject_path_traversal(self):
  self.assertTrue(any("Unsafe path" in x for x in self.verify("traversal")["errors"]))
 def test_reject_incomplete(self):
  self.assertFalse(self.verify("incomplete")["manualReviewReady"])

if __name__=="__main__":unittest.main()
