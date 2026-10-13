"""Check real encoded masters, fallback parity, and final-frame retention."""
import json
import subprocess
import unittest
from pathlib import Path

VIDEO = Path(__file__).resolve().parents[1] / 'public/video'

def probe(name):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(VIDEO / name)
    ]))

def frame(name, time):
    return subprocess.check_output([
        'ffmpeg', '-v', 'error', '-ss', str(time), '-i', str(VIDEO / name),
        '-frames:v', '1', '-vf', 'scale=90:160', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'
    ])

def error(a, b):
    assert len(a) == len(b) == 90 * 160 * 3
    return sum((x - y) ** 2 for x, y in zip(a, b)) / len(a)

class LaunchMediaTest(unittest.TestCase):
    def test_encodings_fit_the_same_complete_timeline(self):
        for ext, codec in [('mp4', 'h264'), ('webm', 'vp9')]:
            p = probe(f'guardian-launch-continuous-v5.{ext}')
            self.assertAlmostEqual(float(p['format']['duration']), 16, delta=0.06)
            v = p['streams'][0]
            self.assertEqual((v['width'], v['height']), (720, 1280))
            self.assertEqual(v['codec_name'], codec)
            self.assertEqual(v['pix_fmt'], 'yuv420p')
            self.assertEqual(len(p['streams']), 1)  # one independent score, no doubled video audio

    def test_webm_fallback_is_the_same_film(self):
        for time in [0, 2, 4.95, 5, 8, 11, 14, 15.9]:
            self.assertLess(error(frame('guardian-launch-continuous-v5.mp4', time),
                                  frame('guardian-launch-continuous-v5.webm', time)), 30)

    def test_original_flight_and_final_hold(self):
        for time in [0, 1, 2, 3, 4]:
            self.assertLess(error(frame('guardian-launch-synced-v4.mp4', time),
                                  frame('guardian-launch-continuous-v5.mp4', time)), 30)
        self.assertLess(error(frame('guardian-launch-continuous-v5.mp4', 15.1),
                              frame('guardian-launch-continuous-v5.mp4', 15.9)), 2)

if __name__ == '__main__':
    unittest.main()
