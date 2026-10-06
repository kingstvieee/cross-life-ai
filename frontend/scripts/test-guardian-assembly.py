"""Technical assembly checks use synthetic media, never approved Guardian footage."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name("assemble-guardian-finale.sh")

class GuardianAssemblyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workspace = tempfile.TemporaryDirectory(prefix="guardian-assembly-test-")
        cls.root = Path(cls.workspace.name)
        cls.source = cls.root / "opening.mp4"
        cls.finale = cls.root / "continuation.mp4"
        cls.short = cls.root / "short.mp4"
        cls.landscape = cls.root / "landscape.mp4"
        for path, size, duration, color in (
            (cls.source, "720x1280", 27, "blue"),
            (cls.finale, "720x1280", 15, "gold"),
            (cls.short, "720x1280", 1, "gold"),
            (cls.landscape, "1280x720", 15, "gold"),
        ):
            subprocess.run([
                "ffmpeg", "-v", "error", "-f", "lavfi", "-i",
                f"color=c={color}:s={size}:r=20:d={duration}",
                "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", str(path),
            ], check=True)
        cls.input_hash = hashlib.sha256(cls.source.read_bytes()).hexdigest()

    @classmethod
    def tearDownClass(cls):
        cls.workspace.cleanup()

    def assemble(self, continuation, output):
        return subprocess.run([
            str(SCRIPT), str(continuation), str(output)
        ], env={**os.environ, "GUARDIAN_SOURCE": str(self.source)}, capture_output=True, text=True)

    def test_complete_master_and_input_preservation(self):
        output = self.root / "assembled.mp4"
        result = self.assemble(self.finale, output)
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(subprocess.check_output([
            "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(output)
        ]))
        self.assertAlmostEqual(float(data["format"]["duration"]), 40.5, places=1)
        self.assertEqual((data["streams"][0]["width"], data["streams"][0]["height"]), (720, 1280))
        self.assertEqual(data["streams"][0]["codec_name"], "h264")
        self.assertEqual(data["streams"][0]["r_frame_rate"], "20/1")
        self.assertIn("Visual QA pending", result.stdout)
        self.assertEqual(hashlib.sha256(self.source.read_bytes()).hexdigest(), self.input_hash)
        output_hash = hashlib.sha256(output.read_bytes()).hexdigest()
        self.assertNotEqual(self.assemble(self.finale, output).returncode, 0)
        self.assertEqual(hashlib.sha256(output.read_bytes()).hexdigest(), output_hash)

    def test_missing_short_landscape_and_input_overwrite_rejected(self):
        for continuation in (self.root / "missing.mp4", self.short, self.landscape):
            output = self.root / f"rejected-{continuation.stem}.mp4"
            self.assertNotEqual(self.assemble(continuation, output).returncode, 0)
            self.assertFalse(output.exists())
        self.assertNotEqual(self.assemble(self.finale, self.source).returncode, 0)
        self.assertNotEqual(self.assemble(self.finale, self.finale).returncode, 0)

if __name__ == "__main__":
    unittest.main()
