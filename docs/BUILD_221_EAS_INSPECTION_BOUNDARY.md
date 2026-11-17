# Build 221 — Strict independent EAS inspection boundary

Date: 2026-11-16 (Toronto). No paid software or credit expense.

The current frontend production preflight already insists on the approved audio source bytes, canonical private EAS include rules, and a private archive path. Before this change, an owner or automated process could point `STAAR_INSPECTED_EAS_ARCHIVE_DIR` back at the source checkout (or at a symlink into it). That would pass the same byte tests without any meaningful separate inspection and could be misrepresented as actual EAS inspection.

### Installed code
- The preflight now passes its actual checkout directory to `inspectPrivateEasArchive`.
- The inspector resolves symbolic links with `realpath` and rejects paths that are identical to, nested within, or parents of the source checkout.
- The CLI `inspect` command uses the same fail-closed rule by default.
- Regression tests require rejections for parent, identical, and symlinked checkout references, plus success for a distinct private archive *fixture* with exact checked bytes.
- Any completed inspection proves only local file and Metro source alias integrity. It does not cryptographically prove remote Expo provenance, authenticated upload, Apple signature or TestFlight acceptance. Real `eas build:inspect` execution and a correctly authenticated owner still matter.

### Actual release blockers still open
1. The exact likeness-approved skinned Guardian GLB has not been bound to a new owner-accepted SHA-256 and tested for real-device sync. Earlier Build 198, 201, 202 and 208 candidates remain rejected.
2. Ten world assets still need model-specific final rights, visual and physical device acceptance.
3. StarCenttinel Edge Function v2 and service-role-only status query are live, but owner WebAuthn enrollment, provider confirmed revocation and nine-portal enforcement are not proven. `LOCKDOWN` remains the only safe state.
4. Authenticated Expo/EAS access is not connected. The saved browser-login profile cap is full; no other user's session was deleted and no subscription was purchased.
5. No signed native IPA or TestFlight acceptance has been established.

**Outcome:** source-gate hardening only. It is not a production app release or a fabricated approval receipt.
