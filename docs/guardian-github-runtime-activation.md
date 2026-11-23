# Guardian GitHub adapter deployment configuration

Target branch: `integration/final-3d-hub`
Backend: FastAPI in `backend/server.py`; endpoint `POST /api/guardian/tools/execute`.
This configuration belongs on the **backend runtime**, not automatically on the Vercel frontend project.

Required backend environment:
- `GUARDIAN_GITHUB_REPO=kingstvieee/cross-life-ai` (non-secret)
- `GUARDIAN_GITHUB_ALLOWED_USER_IDS=<exact authenticated Guardian user_id>` (server-side account allowlist)
- `GUARDIAN_GITHUB_READ_TOKEN=<fine-grained GitHub token>` (secret, server-side only, repository metadata read-only)

The GitHub connector's own authorization does not supply a transferable runtime token. Never copy a token from the client, commit it, or infer the Guardian user ID. Restrict token access to the single repository. Rotate and revoke through GitHub as needed.

Before enabling, confirm the active backend deployment and MongoDB environment. Ensure `MONGO_URL` and `DB_NAME` are set there. Deploy the integration branch to an isolated backend preview, not production. The current Vercel project is Git-linked to `kingstvieee/cross-life-ai`, but that alone does not establish it hosts FastAPI.

Acceptance check:
1. Authenticate to Guardian with an allowed non-demo account.
2. POST `{"request_id":"guardian_github_read_20261123_01","tool":"github.repository.read","arguments":{}}` to `/api/guardian/tools/execute`.
3. Require `verified:true`, `verificationType:"github_api_second_read"`, and `result.full_name:"kingstvieee/cross-life-ai"`.
4. Repeat the same request ID: return the same receipt; change actor/payload with same ID: reject 409.
5. Disallowed actor: 403. Missing credentials: fail closed; never report success.
6. Record the deployment URL, commit SHA, response status, redacted receipt, and timestamp in the evidence ledger.

No Codemagic/TestFlight build until backend proof and iPhone gates pass.
