import unittest
from guardian_alignment import convert_alignment


class AlignmentTests(unittest.TestCase):
    def convert(self, cues, duration=1):
        return convert_alignment({'metadata': {'duration': duration}, 'mouthCues': cues}, 'a' * 64)

    def test_gaps_and_shared_boundaries_neutralize_without_duplicate_times(self):
        result = self.convert([{'start': .1, 'end': .2, 'value': 'A'},
                               {'start': .2, 'end': .4, 'value': 'D'},
                               {'start': .6, 'end': .8, 'value': 'F'}])
        self.assertEqual(result['cues'], [
            {'atMs': 0, 'viseme': 'rest', 'weight': 0},
            {'atMs': 100, 'viseme': 'PP', 'weight': 1},
            {'atMs': 200, 'viseme': 'aa', 'weight': 1},
            {'atMs': 400, 'viseme': 'rest', 'weight': 0},
            {'atMs': 600, 'viseme': 'U', 'weight': 1},
            {'atMs': 800, 'viseme': 'rest', 'weight': 0}])
        self.assertFalse(result['identityApproved'])

    def test_invalid_intervals_fail_instead_of_animating_wrong_clip(self):
        for cue in [None, {'start': False, 'end': .2, 'value': 'A'},
                    {'start': 0, 'end': float('nan'), 'value': 'A'},
                    {'start': .5, 'end': .2, 'value': 'A'},
                    {'start': 0, 'end': 2, 'value': 'A'},
                    {'start': 0, 'end': .2, 'value': 'unknown'}]:
            with self.subTest(cue=cue), self.assertRaises(ValueError):
                self.convert([cue])
        with self.assertRaises(ValueError):
            self.convert([{'start': 0, 'end': .5, 'value': 'A'},
                          {'start': .4, 'end': .8, 'value': 'B'}])
        for duration in [True, 0, .0001, float('inf'), 241]:
            with self.assertRaises(ValueError):
                self.convert([], duration)

    def test_all_supported_shapes_and_silence(self):
        self.assertEqual(self.convert([{'start': 0, 'end': 1, 'value': 'X'}])['cues'][0]['weight'], 0)
        for shape in 'ABCDEFGHX':
            self.assertEqual(len(self.convert([{'start': 0, 'end': 1, 'value': shape}])['cues']), 2)
