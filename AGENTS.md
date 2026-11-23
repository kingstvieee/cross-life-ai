# STAARWAARDD repository boundaries (owner directive: 2026-11-23)

This repository, `kingstvieee/cross-life-ai`, is the **ongoing STAARWAARDD production application**. Keep its development, design, 3D worlds, Guardian, integrations, fixes, QA, and release preparation separate from competition submissions.

## Authorized destinations

- **Production source:** `kingstvieee/cross-life-ai`
- **Current active STAARHUB development branch:** `fix/locked-hub-home`
- Changes to production source must go to an explicitly identified production branch; do not silently merge into `main` or trigger a release.

## Competition repositories: no writes or synchronization

- **Amazon Developer Hackathon (judging freeze):** `kingstvieee/staarwaardd-guardian-amazon-demo`. Do not edit its files or history, force-push, merge, cherry-pick, sync, alter its demo deployment, replace its demo video, or modify its Devpost submission at `https://devpost.com/software/staarwaardd-guardian-for-alexa` before the announced December 3, 2026 winners date unless the organizer explicitly authorizes changes. Read-only checks are okay.
- **OpenAI Build Week prototype:** `kingstvieee/staarwardd`. This is another distinct competition/prototype codebase. Do not send production app changes here unless the owner expressly requests it.
- An Amazon-themed directory or demonstration inside this production repository is not permission to deploy or copy changes to the Amazon hackathon submission.

## Mandatory pre-write checks for assistants, CI jobs and integrations

1. Confirm the destination GitHub owner, repository, branch, and deployment target **before** each Git write, merge, deploy or artifact upload.
2. If the target is a competition submission, an unknown remote, or an unverified deployment, **stop without writing**. Report the target conflict.
3. Do not configure automated mirroring, subtree pushes, file-copy jobs, Git remotes, Devpost updates or deployment synchronization that transfers production changes to competition artifacts.
4. Do not initiate paid Expo/EAS/CodeMagic builds, Apple signing, TestFlight delivery, production publication, or spending without explicit owner approval.
5. Keep the product implementation separate from the hackathon demo; competition snapshots are not a general-purpose production branch.

This file is a repository guidance safeguard, not GitHub branch protection. Administrators should additionally review GitHub repository access, automation credentials, deployment sources and branch protection rules before relying on enforcement.
