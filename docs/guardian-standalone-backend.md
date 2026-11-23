# Standalone Guardian backend deployment

This backend is independent of frontend hosting services. The container definition is `backend/Dockerfile`. Build from the **repository root**:

```sh
docker build -f backend/Dockerfile -t staarwardd-guardian:integration .
```

Do not place secrets in images, GitHub commits, mobile environment variables, or frontend builds. The backend requires `MONGO_URL` and `DB_NAME`; the GitHub read adapter additionally requires `GUARDIAN_GITHUB_REPO`, `GUARDIAN_GITHUB_ALLOWED_USER_IDS`, and `GUARDIAN_GITHUB_READ_TOKEN` (read-only, single repository). Set these only in the chosen backend host's secret manager.

The host must provide outbound access to MongoDB and GitHub, HTTPS ingress, restart management, persistent database availability, and logs. Configure the actual backend URL in the mobile client only after deployment verification.

Deployment is NOT complete merely because the Dockerfile exists. Before production, confirm that dependencies build, server starts, authentication works, `POST /api/guardian/tools/execute` returns a verified GitHub receipt for an allowed account, denial/replay checks pass, and physical-device acceptance is signed off. Do not trigger a paid build or production rollout without these gates.
