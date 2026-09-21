# Guardian Astra evaluation — isolated, not activated

This branch evaluates `gpt-6-astra` without switching the live Guardian provider, mounting routes, changing production configuration, or touching the cinematic track.

The evaluator is synthetic-only and offline by default. A live call requires both `--live` and `--acknowledge-api-billing`, is disabled in CI, reads the API key only from `OPENAI_API_KEY`, requests `store:false`, exposes no tools, and always reports `verified_execution:false`.

## Verify offline

```sh
python -m py_compile backend/guardian_astra_eval.py backend/test_guardian_astra_eval.py
python -m unittest discover -s backend -p 'test_guardian_astra_eval.py' -v
python backend/guardian_astra_eval.py
python backend/guardian_astra_eval.py --case missing_access
```

Passing these checks proves only the isolated contract. It does not prove account entitlement, model quality, billing, real-world execution, or live Guardian integration.

## Live gate

Only after an authorized OpenAI project key and a CAD testing budget are configured securely:

```sh
python backend/guardian_astra_eval.py --live --acknowledge-api-billing
python backend/guardian_astra_eval.py --case missing_access --live --acknowledge-api-billing
```

Review returned model, response ID, token usage, latency, portal coordination, blocked-action behavior, and hallucination risk before any runtime provider change.

Documentation basis: the user-supplied OpenAI Docs skill and official OpenAI API model/structured-output documentation. Guardian server integration and the cinematic rebuild remain separate tracks.
