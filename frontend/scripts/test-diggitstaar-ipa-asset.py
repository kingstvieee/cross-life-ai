import hashlib
import importlib.util
import io
import stat
import unittest
import warnings
from pathlib import Path
from zipfile import ZipFile, ZipInfo

spec = importlib.util.spec_from_file_location("verify", Path(__file__).with_name("verify-diggitstaar-ipa-asset.py"))
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)

ROOT = "Payload/Fixture.app/"
IMAGE = b"test only, not the owner artwork"


def mock_archive(entries):
    target = io.BytesIO()
    with warnings.catch_warnings(), ZipFile(target, "w") as output:
        warnings.simplefilter("ignore", UserWarning)
        output.writestr(ROOT + "Info.plist", b"fixture")
        for name, data in entries:
            output.writestr(name, data)
    return target


class Tests(unittest.TestCase):
    def check(self, items):
        return verify.verify(mock_archive(items), hashlib.sha256(IMAGE).hexdigest(), len(IMAGE))

    def test_exact_file_in_expected_resource(self):
        digest = self.check([(ROOT + verify.ASSET, IMAGE)])
        self.assertEqual(digest, hashlib.sha256(IMAGE).hexdigest())

    def test_wrong_bytes_duplicate_and_watch_only_rejected(self):
        for entries in [[(ROOT + verify.ASSET, b"x" * len(IMAGE))],
                        [(ROOT + verify.ASSET, IMAGE)] * 2,
                        [(ROOT + "Watch/Watch.app/" + verify.ASSET, IMAGE)]]:
            with self.subTest(entries=len(entries)), self.assertRaises(ValueError):
                self.check(entries)

    def test_symlink_rejected_even_with_expected_payload(self):
        info = ZipInfo(ROOT + verify.ASSET)
        info.create_system = 3
        info.external_attr = (stat.S_IFLNK | 0o777) << 16
        with self.assertRaises(ValueError):
            self.check([(info, IMAGE)])


if __name__ == "__main__":
    unittest.main()
