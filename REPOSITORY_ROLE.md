# Repository Role — STAARWAARDD Product

This is the canonical production repository for STAARWAARDD / STAAR Hub.

## Canonical lanes

- `main` — stable product branch and the only production source for the STAARWAARDD Vercel project.
- `guardian-core-product` — active Guardian Core product integration work. It must be reviewed and tested before merging to `main`.
- `amazon-2026` — competition-only Amazon/BuilderFest work. Never merge competition-specific runtime, credentials, judge flows, or demo-only behavior into `main` without an explicit product review.
- `codex/*` branches — temporary feature/demo work. These are not production deployment sources.

## Product ownership

This repository owns the real STAAR Hub application, its Expo frontend, backend, Guardian product runtime, seven portals, mobile/web product behavior, and product deployment configuration.

The separate `kingstvieee/staarwardd` repository is a prototype/specification laboratory only. New production Guardian work belongs here, not there.

## Deployment rule

The canonical Vercel production project is `staarwardd`, connected to `kingstvieee/cross-life-ai`. Production deployments must originate from this repository's `main` branch. Preview/competition deployments may use explicitly named non-main branches.

Do not connect Fixwise or Rising Staarform projects to this repository.
