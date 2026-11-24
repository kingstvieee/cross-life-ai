#!/usr/bin/env python3
"""Inspect downloaded EAS IPA contents BEFORE any TestFlight submission.

This checks archive structure, embedded iPhone+Watch code-signature metadata,
provisioning presence and expected bundle/build identities; it is NOT macOS
cryptographic codesign verification and does not certify device acceptance.
"""
from __future__ import annotations

import hashlib
import json
import plistlib
import re
import sys
import zipfile
from pathlib import Path

TEAM = "R9BPDSU4BW"
BUNDLE = "com.emergent.crosslifeai.z79271"
WATCH = BUNDLE + ".watchkitapp"
APP = Path(__file__).resolve().parents[1] / "app.json"

def verify(ipa: Path) -> dict:
    cfg = json.loads(APP.read_text())["expo"]
    expected_build = str(cfg["ios"]["buildNumber"])
    expected_version = str(cfg["version"])
    if not expected_build.isdecimal() or int(expected_build) <= 115:
        raise ValueError("release build number must exceed verified Apple 115")
    if not ipa.is_file() or ipa.suffix.lower() != ".ipa":
        raise ValueError("expected a downloaded iOS .ipa build archive")
    if ipa.stat().st_size < 1_000_000:
        raise ValueError("IPA too small to be a real native app archive")
    with zipfile.ZipFile(ipa) as z:
        members = {i.filename: i for i in z.infolist()}
        roots = sorted({
            p.split("/")[1]
            for p in members
            if p.startswith("Payload/") and len(p.split("/")) >= 3
            and p.split("/")[1].endswith(".app")
        })
        if len(roots) != 1:
            raise ValueError("expected one iPhone app inside Payload/")
        prefix = "Payload/" + roots[0] + "/"
        def read_plist(member: str) -> dict:
            if member not in members or members[member].file_size > 500_000:
                raise ValueError("missing or oversized Info.plist")
            data = plistlib.loads(z.read(member))
            if not isinstance(data, dict):
                raise ValueError("invalid Info.plist")
            return data
        main = read_plist(prefix + "Info.plist")
        if main.get("CFBundleIdentifier") != BUNDLE:
            raise ValueError("iPhone bundle identity mismatch")
        if str(main.get("CFBundleVersion")) != expected_build:
            raise ValueError("iPhone CFBundleVersion mismatch")
        if str(main.get("CFBundleShortVersionString")) != expected_version:
            raise ValueError("iPhone CFBundleShortVersionString mismatch")
        if prefix + "_CodeSignature/CodeResources" not in members:
            raise ValueError("iPhone _CodeSignature/CodeResources absent")
        if prefix + "embedded.mobileprovision" not in members:
            raise ValueError("iPhone embedded.mobileprovision absent")
        watches = sorted(p for p in members
            if p.startswith(prefix + "Watch/") and p.endswith(".app/Info.plist")
            and p.count("/") == prefix.count("/") + 2)
        if len(watches) != 1:
            raise ValueError("exactly one Watch companion app is required")
        watch_path = watches[0]
        winfo = read_plist(watch_path)
        if winfo.get("CFBundleIdentifier") != WATCH:
            raise ValueError("Watch bundle identity mismatch")
        wpref = watch_path[:-len("Info.plist")]
        if wpref + "_CodeSignature/CodeResources" not in members:
            raise ValueError("Watch _CodeSignature/CodeResources absent")
        if wpref + "embedded.mobileprovision" not in members:
            raise ValueError("Watch provisioning profile absent")
    return {
        "schema": "staarhub-ipa-metadata-pre-submit-v1",
        "source": str(ipa.name),
        "sha256": hashlib.sha256(ipa.read_bytes()).hexdigest(),
        "bundle": BUNDLE,
        "watchBundle": WATCH,
        "version": expected_version,
        "build": expected_build,
        "hasIphoneAndWatchCodeSignatureFiles": True,
        "hasIphoneAndWatchProfiles": True,
        "cryptographicCodesignVerified": False,
        "physicalDeviceAcceptanceVerified": False,
        "releaseCertified": False,
    }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: verify-ipa-archive-metadata.py <downloaded-ipa>")
    try:
        print(json.dumps(verify(Path(sys.argv[1])), indent=2))
    except (ValueError, OSError, KeyError, zipfile.BadZipFile, plistlib.InvalidFileException) as exc:
        print("IPA PRE-SUBMISSION CHECK FAILED: " + str(exc), file=sys.stderr)
        sys.exit(1)
