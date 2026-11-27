import unittest
from datetime import datetime
from zoneinfo import ZoneInfo
from guardian_cognition import initial_state, transition

class CognitiveTests(unittest.TestCase):
    def test_interrupt_stops_audio_and_visemes(self):
        s, _ = transition(initial_state(), {"type":"SPEECH_START","speechId":"a"})
        s, effects = transition(s, {"type":"INTERRUPT"})
        self.assertEqual(s["mode"], "listening")
        self.assertIsNone(s["speech"])
        self.assertEqual(effects[0]["type"], "STOP_AUDIO_AND_VISEMES")
        self.assertEqual(effects[0]["epoch"], s["speechEpoch"])

    def test_cross_portal_preserves_task(self):
        s, _ = transition(initial_state(), {"type":"VERIFIED_UPDATE","trustedVerified":True,"taskId":"stellar","evidence":{"source":"approved"}})
        s, _ = transition(s, {"type":"PORTAL_CHANGE","portal":"Work"})
        self.assertEqual(s["activeTask"], "stellar")
        self.assertEqual(s["portal"], "Work")

    def test_defer_preserves_evidence(self):
        s, _ = transition(initial_state(), {"type":"VERIFIED_UPDATE","trustedVerified":True,"taskId":"stellar","evidence":{"date":"2026-11-21"}})
        now = datetime(2026,11,21,23,30,tzinfo=ZoneInfo("America/Toronto"))
        s, effects = transition(s, {"type":"DEFER","until":"tomorrow"},now=now)
        self.assertEqual(s["deferredTasks"]["stellar"]["until"],"2026-11-22T00:00:00-05:00")
        self.assertEqual(s["evidence"][0]["taskId"],"stellar")
        self.assertEqual(effects[0]["type"],"PERSIST_DEFERRAL")

    def test_unverified_rejected(self):
        with self.assertRaises(ValueError):
            transition(initial_state(),{"type":"VERIFIED_UPDATE","trustedVerified":False,"taskId":"x","evidence":{"x":1}})

    def test_muted_cannot_speak(self):
        s, _ = transition(initial_state(), {"type":"MUTE"})
        with self.assertRaises(ValueError):
            transition(s, {"type":"SPEECH_START","speechId":"a"})

if __name__ == "__main__":
    unittest.main()
