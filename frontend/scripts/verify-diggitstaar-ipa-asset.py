"""Verify the exact approved artwork in the main app's native resource tree.

Separately run Apple signature verification; this script checks bytes and placement,
not signatures or device display. Never unpack or print the private image.
"""
import hashlib
import re
import stat
import sys
from pathlib import Path
from zipfile import BadZipFile, ZipFile

ASSET = "assets/generated/private-portal-art/diggitstaar-studio.jpeg"
APPROVED_BYTES = 757337
APPROVED_SHA256 = "b5a55b64631127e657c50b898be5102f1cb8cce307d5296d156110ee67ac75aa"


def verify(ipa, expected_sha=APPROVED_SHA256, expected_size=APPROVED_BYTES):
    with ZipFile(ipa) as archive:
        entries = archive.infolist()
        roots = [item.filename.removesuffix("Info.plist") for item in entries
                 if re.fullmatch(r"Payload/[^/]+\.app/Info\.plist", item.filename)]
        if len(roots) != 1:
            raise ValueError("expected one main iPhone app Info.plist")
        matches = [item for item in entries if item.filename == roots[0] + ASSET]
        if len(matches) != 1:
            raise ValueError("missing or duplicate locked artwork in the main iPhone resource tree")
        item = matches[0]
        if item.is_dir() or stat.S_IFMT(item.external_attr >> 16) not in (0, stat.S_IFREG):
            raise ValueError("locked artwork resource must be a regular file")
        if item.file_size != expected_size:
            raise ValueError("locked artwork size does not match")
        with archive.open(item) as file:
            digest = hashlib.sha256(file.read(expected_size + 1)).hexdigest()
        if digest != expected_sha:
            raise ValueError("locked artwork checksum does not match")
        return digest


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: verify-diggitstaar-ipa-asset.py <signed IPA>")
    try:
        print("DIGGITSTAAR_NATIVE_ART_SHA256=" + verify(Path(sys.argv[1])))
    except (BadZipFile, OSError, RuntimeError, ValueError) as exc:
        sys.exit("DIGGITSTAAR IPA verification failed: " + str(exc))
