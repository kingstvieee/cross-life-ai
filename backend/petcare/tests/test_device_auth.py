import unittest
from petcare.device_auth import issue_token,valid_token
class DeviceAuth(unittest.TestCase):
    def test_valid(self):
        token,hashed=issue_token(); self.assertTrue(valid_token(token,hashed)); self.assertNotEqual(token,hashed)
    def test_wrong(self):
        token,hashed=issue_token(); self.assertFalse(valid_token('wrong',hashed))
    def test_revoked(self): self.assertFalse(valid_token('x',None))
    def test_unique(self): self.assertNotEqual(issue_token()[0],issue_token()[0])
