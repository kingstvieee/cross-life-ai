import unittest
from datetime import timedelta
from petcare.policy import device_status, feeding_allowed, distress_level, utcnow
from petcare.adapters import normalize
class Safety(unittest.TestCase):
    def test_offline(self): self.assertEqual(device_status(None),'unavailable')
    def test_unverified(self): self.assertEqual(device_status({'received_at':utcnow()}),'unavailable')
    def test_stale(self): self.assertEqual(device_status({'verified':True,'received_at':utcnow()-timedelta(seconds=31)}),'stale')
    def test_live(self): self.assertEqual(device_status({'verified':True,'received_at':utcnow()}),'live')
    def test_future(self): self.assertEqual(device_status({'verified':True,'received_at':utcnow()+timedelta(seconds=60)}),'stale')
    def test_limit(self): self.assertFalse(feeding_allowed(20,90,100))
    def test_uncertain(self): self.assertFalse(feeding_allowed(10,0,100,True))
    def test_valid(self): self.assertTrue(feeding_allowed(10,90,100))
    def test_emergency(self): self.assertEqual(distress_level('emergency',0),'urgent_human_review')
    def test_climate(self): self.assertRaises(ValueError,normalize,'climate',{'temperature_c':20,'humidity_pct':101})
