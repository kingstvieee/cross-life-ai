# Direct Guardian chat continuation — November 15, 2026

Both `/api/guardian/chat` and `/api/guardian/chat-once` now use the server-owned
chat transport. With `OPENAI_API_KEY` set, requests go directly to OpenAI's
Responses API. `OPENAI_CHAT_MODEL` selects the model (default: existing chat-once
model `gpt-5.2`). `GUARDIAN_CHAT_PROVIDER=openai` forces the direct transport;
`emergent` explicitly retains the old relay. With neither a direct key nor an
explicit provider, the existing relay is retained for compatibility.

Do not configure these keys as Expo public variables. Use the existing backend
secret configuration; no key was copied from the previous workspace or created
by this change. Deployment configuration and live account/model access have not
been verified in this continuation.

Direct requests disable response storage, cap output at 2048 tokens, use a fixed
HTTPS provider endpoint, reject redirects, and have bounded connection/read
timeouts. There are no tools, provider-side history IDs, automatic retries or
post-failure provider failover. Existing per-account history and dispatch-time
privacy checks remain in place. Failed, malformed, incomplete and severed streams
cannot emit a completion event or be stored by chat-once as a finished reply.
Provider response bodies and credentials are not included in client errors.

The relay imports are deferred: the direct chat and companion-speech paths do
not require loading Emergent's chat/TTS SDK at server import. Legacy general
Guardian TTS endpoints still use their existing relay; this change does not
migrate those endpoints or replace companion speech with Realtime.

## Validation

403 backend regression tests passed, including 10 new direct-transport tests.
Tests use fake HTTP transport and dummy credentials; they make no paid requests.
Backend Python compilation and `git diff --check` passed.

## Outstanding full-build requirements

- No rigged Guardian model or 3D scene assets (`glb`, `gltf`, `blend`, `fbx`,
  `vrm`, `usdz`) were found in the canonical repository. Approved image masters
  are preserved. A speaking facial rig and nine finished navigable scenes remain
  unimplemented; artwork and looping video are not those deliverables.
- Durable background execution, native proactive activation and direct OAuth/API
  adapters for the listed external creative/work/music tools remain unfinished.
- The old supplied Emergent workspace URL redirects to a preview-not-available
  page. Source recovery used the canonical GitHub repository instead.
- This branch has not produced or uploaded a new signed IPA, deployed a backend,
  established device connections or demonstrated a complete live conversation.

The build is not declared complete. Physical-device acceptance remains deferred
as requested until the development requirements are finished.
