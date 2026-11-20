#!/usr/bin/env bash
# Build 220: cryptographic Apple signature inspection on a trusted macOS host.
# NOT executed by Linux CI; acceptance requires real iPhone and App Store Connect.
set -euo pipefail
if [[ $# -ne 1 ]]; then echo "Usage: verify-build220-ipa.sh <signed.ipa>" >&2; exit 2; fi
ipa="$1"
[[ -f "$ipa" ]] || { echo "signed IPA missing" >&2; exit 1; }
for command in codesign security plutil unzip shasum; do
  command -v "$command" >/dev/null || { echo "macOS signing verification tool missing: $command" >&2; exit 1; }
done
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
unzip -qq "$ipa" -d "$tmp"
app_count="$(find "$tmp/Payload" -mindepth 1 -maxdepth 1 -name '*.app' -type d | wc -l | tr -d ' ')"
[[ "$app_count" == "1" ]] || { echo "expected one signed app" >&2; exit 1; }
app="$(find "$tmp/Payload" -mindepth 1 -maxdepth 1 -name '*.app' -type d | head -n 1)"
codesign --verify --deep --strict --verbose=2 "$app" >&2
identity="$(codesign -dv --verbose=4 "$app" 2>&1)"
printf '%s\n' "$identity" | grep -Fq 'TeamIdentifier=R9BPDSU4BW' || {
  echo "Apple team id mismatch" >&2; exit 1;
}
bundle="$(plutil -extract CFBundleIdentifier raw -o - "$app/Info.plist")"
build="$(plutil -extract CFBundleVersion raw -o - "$app/Info.plist")"
version="$(plutil -extract CFBundleShortVersionString raw -o - "$app/Info.plist")"
[[ "$bundle" == "com.emergent.crosslifeai.z79271" ]] || { echo "wrong iOS bundle id" >&2;exit 1; }
[[ "$build" == "109" && "$version" == "1.0.4" ]] || { echo "wrong iOS release build" >&2;exit 1; }
# Cryptographically verifiable local signature and archive hash. Actual App
# Store Connect upload, iPhone install and founder acceptance remain separate.
printf 'SIGNED_IPA_SHA256='
shasum -a 256 "$ipa" | cut -d' ' -f1
printf 'SIGNED_APP_VERIFIED=1\nBUNDLE=%s\nVERSION=%s\nBUILD=%s\n' "$bundle" "$version" "$build"
