#!/usr/bin/env python3
"""Read-only Guardian backend smoke probe. No credentials or mutations required."""
import json
import os
import sys
import urllib.error
import urllib.request
from urllib.parse import urlparse

base = os.environ.get("GUARDIAN_BACKEND_URL", "").rstrip("/")
parsed = urlparse(base)
if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
    sys.exit("Set GUARDIAN_BACKEND_URL to an HTTPS backend origin (no credentials).")
if parsed.path not in ("", "/") or parsed.query or parsed.fragment:
    sys.exit("Use an HTTPS origin, not an endpoint URL.")

checks = [
    ("/api/health/live", 200, "alive"),
    ("/api/health/ready", 200, "ready"),
]
failed = False
for path, expected, status in checks:
    try:
        req = urllib.request.Request(base + path, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            payload = json.load(resp)
            ok = resp.status == expected and payload.get("status") == status
            if path.endswith("ready"):
                ok = ok and payload.get("database") == "connected"
            print(f"{path}: {'PASS' if ok else 'FAIL'} (HTTP {resp.status})")
            failed |= not ok
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as exc:
        print(f"{path}: FAIL ({type(exc).__name__})")
        failed = True
if failed:
    sys.exit(1)
print("Read-only health checks passed. Authenticated Guardian execution is NOT certified by this probe.")
