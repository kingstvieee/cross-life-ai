#!/usr/bin/env bash
# Verify an ACTUAL signed Apple IPA on a trusted macOS host.
# Never treat source tests, review GLBs, or CI green as a signed artifact.
set -euo pipefail
if [[ $# -ne 1 ]]; then echo "Usage: verify-build220-ipa.sh <signed.ipa>" >&2; exit 2; fi
ipa="$1"
[[ -f "$ipa" ]] || { echo "signed IPA missing" >&2; exit 1; }
for command in codesign security plutil unzip shasum node; do
  command -v "$command" >/dev/null || { echo "macOS verifier missing: $command" >&2; exit 1; }
done
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
expected_build="$(node -e 'const fs=require("fs"); console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).expo.ios.buildNumber)' "$script_dir/../app.json")"
expected_version="$(node -e 'const fs=require("fs"); console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).expo.version)' "$script_dir/../app.json")"
[[ "$expected_build" =~ ^[0-9]+$ && "$expected_build" -gt 115 ]] || {
  echo "candidate must exceed Codemagic verified build 115" >&2; exit 1;
}
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
unzip -qq "$ipa" -d "$tmp"
[[ -d "$tmp/Payload" ]] || { echo "IPA Payload missing" >&2; exit 1; }
app_count="$(find "$tmp/Payload" -mindepth 1 -maxdepth 1 -name '*.app' -type d | wc -l | tr -d ' ')"
[[ "$app_count" == "1" ]] || { echo "expected exactly one signed app" >&2; exit 1; }
app="$(find "$tmp/Payload" -mindepth 1 -maxdepth 1 -name '*.app' -type d | head -n 1)"
codesign --verify --deep --strict --verbose=2 "$app" >&2
identity="$(codesign -dv --verbose=4 "$app" 2>&1)"
printf '%s\n' "$identity" | grep -Fq 'TeamIdentifier=R9BPDSU4BW' || {
  echo "Apple team id mismatch" >&2; exit 1;
}
bundle="$(plutil -extract CFBundleIdentifier raw -o - "$app/Info.plist")"
build="$(plutil -extract CFBundleVersion raw -o - "$app/Info.plist")"
version="$(plutil -extract CFBundleShortVersionString raw -o - "$app/Info.plist")"
[[ "$bundle" == "com.emergent.crosslifeai.z79271" ]] || { echo "wrong iOS bundle id" >&2; exit 1; }
[[ "$build" == "$expected_build" && "$version" == "$expected_version" ]] || {
  echo "IPA version/build does not match current approved source configuration" >&2; exit 1;
}
profile="$app/embedded.mobileprovision"
[[ -f "$profile" ]] || { echo "Apple provisioning profile absent from IPA" >&2; exit 1; }
security cms -D -i "$profile" > "$tmp/iphone-profile.plist"
profile_appid="$(plutil -extract 'Entitlements.application-identifier' raw -o - "$tmp/iphone-profile.plist")"
[[ "$profile_appid" == "R9BPDSU4BW.$bundle" ]] || {
  echo "iPhone signing profile has a different team or bundle id" >&2; exit 1;
}
watch_count=0
if [[ -d "$app/Watch" ]]; then
  watch_count="$(find "$app/Watch" -mindepth 1 -maxdepth 1 -name '*.app' -type d | wc -l | tr -d ' ')"
fi
[[ "$watch_count" -le 1 ]] || { echo "unexpected number of embedded Watch apps" >&2; exit 1; }
if [[ "$watch_count" == 1 ]]; then
  watch_app="$(find "$app/Watch" -mindepth 1 -maxdepth 1 -name '*.app' -type d | head -n 1)"
  codesign --verify --deep --strict --verbose=2 "$watch_app" >&2
  watch_identity="$(codesign -dv --verbose=4 "$watch_app" 2>&1)"
  printf '%s\n' "$watch_identity" | grep -Fq 'TeamIdentifier=R9BPDSU4BW' || {
    echo "Watch app signing team mismatch" >&2; exit 1;
  }
  [[ -f "$watch_app/embedded.mobileprovision" ]] || {
    echo "embedded Watch provisioning profile missing" >&2; exit 1;
  }
  security cms -D -i "$watch_app/embedded.mobileprovision" > "$tmp/watch-profile.plist"
  watch_bundle="$(plutil -extract CFBundleIdentifier raw -o - "$watch_app/Info.plist")"
  watch_appid="$(plutil -extract 'Entitlements.application-identifier' raw -o - "$tmp/watch-profile.plist")"
  [[ "$watch_appid" == "R9BPDSU4BW.$watch_bundle" ]] || {
    echo "Watch provisioning profile team or bundle mismatch" >&2; exit 1;
  }
fi
# Production release requires the Watch target; iPhone-only internal QA is separate.
if [[ "${STAAR_REQUIRE_WATCH_APP:-1}" == "1" && "$watch_count" != 1 ]]; then
  echo "signed production IPA is missing the Watch companion app" >&2; exit 1;
fi
printf 'SIGNED_IPA_SHA256='
shasum -a 256 "$ipa" | cut -d' ' -f1
printf 'SIGNED_APP_VERIFIED=1\nBUNDLE=%s\nVERSION=%s\nBUILD=%s\nWATCH_APP_SIGNED=%s\n' "$bundle" "$version" "$build" "$watch_count"
echo "Signature and Apple identity verified locally; App Store Connect processing and physical owner acceptance remain independent."
